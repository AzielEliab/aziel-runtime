import { HINTS_STYLE } from "./lockstep/tokens-css.js";
/**
 * MESH-ONBOARD-1.0 (one-click install, every app version a mesh node, new-user hints) and
 * MESH-BOOTSTRAP-1.0 (Phase E public bootstrap list).
 *
 * GET /v1/mesh/install?slug=<slug>&version=<v>  -> one-click plan: download, install, then join.
 * GET /v1/mesh/install.sh?slug=<slug>&version=<v> -> the same plan as a POSIX shell script.
 * GET /v1/mesh/bootstrap                         -> starting address plus live roster handles.
 *
 * Registration uses the existing POST /v1/mesh/join (presence-only, sealed session, heartbeat
 * classes). Each install gets its own node id <slug>-<version>-<random>, so every app version is
 * its own node. Security model: single-node isolation plus the phoenix reboot loop. A node can
 * join as isolated, and a node that is wiped rejoins with a new id; nothing is shared between nodes.
 * Honest flags: live:false, alt_internet_live:false, needs_starting_address:true,
 * live_multi_provider:false (one provider until nodes B-D exist).
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */

export const ONBOARD_SPEC = "MESH-ONBOARD-1.0";
export const BOOTSTRAP_SPEC = "MESH-BOOTSTRAP-1.0";

export const NEW_USER_HINTS = Object.freeze([
  Object.freeze({ id: "welcome", when: "first_run", title: "Welcome", text: "This app is now a mesh node. It shares presence only, not your files." }),
  Object.freeze({ id: "isolated", when: "first_run", title: "Stay private", text: "Pick isolated to keep this node to itself. You can change it any time." }),
  Object.freeze({ id: "heartbeat", when: "first_run", title: "Battery", text: "Idle checks in every few minutes. Asleep checks in less often to save battery." }),
  Object.freeze({ id: "not_live", when: "first_run", title: "Honest status", text: "The alternate internet is not live yet. This node is ready for it." }),
  Object.freeze({ id: "agents", when: "first_run", title: "Your AI agents", text: "This is designed to let your agents talk to other agents. Messages are designed to be sealed and signed, with a hash-only receipt (hashed, not encrypted). Nothing links without your OK. Not live yet." }),
  Object.freeze({ id: "leave", when: "settings", title: "Leave any time", text: "Leaving removes this node. Reinstalling makes a new one." }),
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;
const VER_RE = /^[0-9A-Za-z.+-]{1,24}$/;

function honest() {
  return { live: false, alt_internet_live: false, packet_path_live: false, second_device: false, live_multi_provider: false };
}

/** Same host rule as the catalog (index.js workerHost). */
export function productHost(product) {
  if (!product) return null;
  if (product.slug === "aziel-corpus") return "https://www.azielcorpuslibrary.net";
  if (!product.worker) return null;
  const w = String(product.worker).replace(/\/$/, "");
  if (/^https:\/\//.test(w)) return w;
  if (!/^[a-z0-9-]{1,63}$/.test(w)) return null;
  return `https://${w}.vibelock.workers.dev`;
}

export const NODE_SOURCE_REPO = "https://github.com/AzielEliab/aziel-runtime";
const SHA_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
export const NODE_LOG_MAX_BYTES = 1048576;

/**
 * Pinned source for the local FED-MESH node: the deployed commit (40-hex GIT_SHA) or null.
 * B352-2: there is no fallback to main. Without a pinned commit the install starts no node.
 */
export function nodeSourceRef(sourceRef) {
  const ref = String(sourceRef || "").trim().toLowerCase();
  return SHA_RE.test(ref) ? ref : null;
}

/** Optional sha256 of the pinned commit's tarball (64-hex), checked before extraction. */
export function nodeSourceSha256(value) {
  const v = String(value || "").trim().toLowerCase();
  return SHA256_RE.test(v) ? v : null;
}

export function installPlan({ origin, slug, version, products = [], sourceRef = "", sourceSha256 = "" }) {
  const s = String(slug || "").toLowerCase();
  if (!SLUG_RE.test(s)) return { ok: false, spec: ONBOARD_SPEC, code: "ONBOARD-BAD-SLUG", message: "GET /v1/mesh/install?slug=<slug>&version=<v>.", fail_closed: true };
  const product = products.find((p) => p && p.slug === s) || null;
  if (!product) return { ok: false, spec: ONBOARD_SPEC, code: "ONBOARD-UNKNOWN-SLUG", message: "That slug is not in the catalog.", fail_closed: true };
  const v = VER_RE.test(String(version || "")) ? String(version) : "latest";
  const base = String(origin || "").replace(/\/$/, "");
  const host = productHost(product);
  const ref = nodeSourceRef(sourceRef);
  const tarSha = ref ? nodeSourceSha256(sourceSha256) : null;
  return {
    ok: true,
    spec: ONBOARD_SPEC,
    slug: s,
    version: v,
    one_click: `curl -fsSL '${base}/v1/mesh/install.sh?slug=${s}&version=${encodeURIComponent(v)}' | sh`,
    steps: [
      { n: 1, id: "download", url: host ? `${host}/download` : `${base}/v1/pull/${s}` },
      { n: 2, id: "install", url: host ? `${host}/install.sh` : null, note: host ? null : "Runtime-hosted product: no separate installer." },
      { n: 3, id: "join", method: "POST", url: `${base}/v1/mesh/join`, body: { product: s, node_id: `${s}-${v.toLowerCase().replace(/[^a-z0-9.-]/g, "-")}-<random>`, presence: "live", heartbeat_mode: "idle" }, note: "Every app version is its own node: a new random suffix per install." },
      { n: 4, id: "heartbeat", method: "POST", url: `${base}/v1/mesh/heartbeat`, note: "idle every 2-5 min; miss 3 beats and the node is stale, not deleted." },
      {
        n: 5,
        id: "node",
        source: ref ? `${NODE_SOURCE_REPO.replace("https://github.com/", "https://codeload.github.com/")}/tar.gz/${ref}` : null,
        source_ref: ref,
        source_pinned: Boolean(ref),
        source_sha256: tarSha,
        ...(ref ? {} : { refused: "ONBOARD-NODE-UNPINNED" }),
        relay: `${base}/v1/mesh/relay`,
        run: `node qnm-node/fed-instance.mjs --data <dir> --relay <relay> --product <slug> --heartbeat-sec 180 --log-file <dir>/node.log --log-max-bytes ${NODE_LOG_MAX_BYTES}`,
        requires: tarSha ? "node >= 20, curl, tar, sha256sum or shasum" : "node >= 20, curl, tar",
        key_files: "identity.json 0600 in a 0700 data dir",
        err_file: `<dir>/node.err via qnm-node/capped-run.mjs: 0600, capped at ${NODE_LOG_MAX_BYTES} bytes, rotates to node.err.1`,
        note: ref
          ? "Starts a local FED-MESH node with its own Ed25519 key and data directory, registers it on the relay with a signed statement, and keeps a signed heartbeat. The source is the deployed commit only" + (tarSha ? ", and its tarball sha256 is checked before extraction." : " (commit-pinned over TLS; no tarball sha256 is pinned on this server yet).") + " Without node 20, or if the download fails, the install says this app is not a mesh node yet."
          : "This server has no pinned deployed commit, so the install starts no local node and says this app is not a mesh node yet. It never falls back to main.",
      },
    ],
    node_per_version: true,
    hints: NEW_USER_HINTS,
    security_model: "single-node isolation + phoenix reboot loop",
    ...honest(),
  };
}

/**
 * POSIX awk program: reads one JSON reply on stdin and prints its TOP-LEVEL "code" string only when
 * the reply is a single well-formed-enough object with exactly one top-level "code" whose value is a
 * plain string (escaped strings are not decoded and so never equal MESH-OK). Anything else prints
 * nothing (fail closed). Nested objects and arrays are skipped, so {"code":"X","d":{"code":"MESH-OK"}}
 * prints X, not MESH-OK.
 */
// Follow-up to #357 (AZBot LOWs): a strict, linear JSON check, fail closed.
// RS is the double quote, so records alternate between text outside strings and string pieces
// (an odd run of trailing backslashes means the quote was escaped). No string is built up char by
// char, so a 256 KB reply stays well under a few seconds on busybox awk.
// - The whole reply must be one JSON object: matched {} and [], no trailing comma, no bareword,
//   literals must be true/false/null or a JSON number, nothing but whitespace after the object.
// - A raw control character (< 0x20) inside a string, or an invalid escape, refuses the reply.
// - A TOP-LEVEL key with any backslash escape refuses the reply ("co\u0064e" could be "code").
// - Exactly one top-level "code", a string, byte-for-byte MESH-OK (no escapes, no extra chars);
//   awk compares itself and prints MESH-OK only then.
// The join reply is capped at 256 KB (curl --max-filesize); the live MESH-OK reply is ~105 KB.
export const JOIN_MAX_BYTES = 262144;
export const JOIN_TOP_CODE_AWK = String.raw`BEGIN {
  RS = "\""; d = 0; ex = "T"; ins = 0; esc = 0; bad = 0; cnt = 0; got = ""; key = ""; lit = ""
  sv = ""; sl = 0; hb = 0; isk = 0; sd = 0
  WS = " \t\n\r"; LC = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-."
  CC = "[" sprintf("%c", 1) "-" sprintf("%c", 31) "]"
}
function litend() {
  if (lit !~ /^(true|false|null|-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?)$/) { bad = 1; return }
  if (d == 1 && key == "code") { cnt++; got = "" }
  lit = ""; ex = "A"
}
function quote() {
  if (ins) {
    if (esc) { esc = 0; sl++; if (sl <= 64) sv = sv "\""; return }
    ins = 0
    if (isk) { if (d == 1) { if (hb) { bad = 1; return } key = (sl <= 64) ? sv : "" } ex = ":" }
    else { if (sd == 1 && key == "code") { cnt++; got = (hb || sl > 64) ? "" : sv } ex = "A" }
    return
  }
  if (lit != "") { bad = 1; return }
  if (ex == "K" || ex == "KE") isk = 1
  else if (ex == "V" || ex == "VE") isk = 0
  else { bad = 1; return }
  ins = 1; esc = 0; sv = ""; sl = 0; hb = 0; sd = d
}
function instr(p,   n, t) {
  if (p ~ CC) { bad = 1; return }
  n = 0; if (match(p, /\\+$/)) n = RLENGTH
  t = p; if (n % 2) { esc = 1; t = substr(p, 1, length(p) - 1) }
  if (index(t, "\\")) {
    hb = 1
    gsub(/\\(["\\\/bfnrt]|u[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f])/, "", t)
    if (index(t, "\\")) { bad = 1; return }
  }
  if (sl <= 64) sv = sv substr(p, 1, 65)
  sl += length(p)
}
function outside(p,   i, n, c) {
  n = length(p)
  for (i = 1; i <= n; i++) {
    c = substr(p, i, 1)
    if (index(WS, c)) { if (lit != "") { litend(); if (bad) return } continue }
    if (index(LC, c)) {
      if (lit == "" && ex != "V" && ex != "VE") { bad = 1; return }
      lit = lit c; if (length(lit) > 64) { bad = 1; return }
      continue
    }
    if (lit != "") { litend(); if (bad) return }
    if (c == "{" || c == "[") {
      if (c == "{" && ex == "T") { d = 1; st[1] = "{"; ex = "KE"; continue }
      if (ex != "V" && ex != "VE") { bad = 1; return }
      if (d == 1 && key == "code") { cnt++; got = "" }
      d++; st[d] = c; ex = (c == "{") ? "KE" : "VE"; continue
    }
    if (c == "}" || c == "]") {
      if (d < 1 || st[d] != ((c == "}") ? "{" : "[")) { bad = 1; return }
      if (ex != "A" && ex != ((c == "}") ? "KE" : "VE")) { bad = 1; return }
      d--; ex = (d == 0) ? "E" : "A"; continue
    }
    if (c == ":") { if (ex != ":") { bad = 1; return } ex = "V"; continue }
    if (c == ",") { if (ex != "A" || d < 1) { bad = 1; return } ex = (st[d] == "{") ? "K" : "V"; continue }
    bad = 1; return
  }
}
bad { next }
{
  if (NR > 1) { quote(); if (bad) next }
  if (ins) instr($0); else outside($0)
}
END {
  if (!bad && !ins && lit != "") litend()
  if (!bad && !ins && ex == "E" && cnt == 1 && got == "MESH-OK") print "MESH-OK"
}
`;

function shq(v) {
  return "'" + String(v).replace(/'/g, "'\\''") + "'";
}

export function installScript(plan) {
  if (!plan || !plan.ok) return `#!/bin/sh\necho ${shq((plan && plan.code) || "ONBOARD-REFUSED")} >&2\nexit 1\n`;
  const join = plan.steps[2];
  const install = plan.steps[1];
  const nodeStep = plan.steps.find((s) => s.id === "node");
  const welcome = plan.hints.find((h) => h.id === "welcome");
  // INFO :124 on #352: say "did not register" only when a node was actually started.
  const NOT_YET = `if [ "$NODE_STARTED" = 1 ]; then echo 'The local mesh node did not register, so this app is not a mesh node yet.'; else echo 'No local mesh node was started, so this app is not a mesh node yet.'; fi`;
  const pin = nodeStep.source_sha256 || "";
  const lines = [
    "#!/bin/sh",
    `# ${ONBOARD_SPEC}: install ${plan.slug} ${plan.version}, then start a local FED-MESH node for it. Author: Aziel Eliab.`,
    "set -eu",
    install.url ? `curl -fsSL ${shq(install.url)} | sh` : `echo ${shq("No separate installer for " + plan.slug + ".")}`,
    'RND=$(od -An -N4 -tx1 /dev/urandom | tr -d " \\n")',
    `NODE=${shq(join.body.node_id.replace("-<random>", ""))}-$RND`,
    // "Joined" only when the mesh accepted the join: HTTP 2xx (curl -f) and the reply's TOP-LEVEL
    // code is exactly "MESH-OK" (JOIN_TOP_CODE_AWK: a strict top-level JSON scan, no node needed).
    // A nested MESH-OK inside a refusal, a duplicate code key, or a malformed reply is not a join.
    `JOIN_OUT=$(curl -fsS --max-filesize ${JOIN_MAX_BYTES} -X POST ${shq(join.url)} -H 'content-type: application/json' -d "{\\"product\\":\\"${plan.slug}\\",\\"node_id\\":\\"$NODE\\",\\"presence\\":\\"live\\",\\"heartbeat_mode\\":\\"idle\\"}" 2>/dev/null || true)`,
    `if [ "$(printf '%s' "$JOIN_OUT" | awk ${shq(JOIN_TOP_CODE_AWK)} 2>/dev/null)" = MESH-OK ]; then echo "Joined the mesh as $NODE."; else echo "The mesh did not accept the join, so $NODE has not joined the mesh. Continuing."; fi`,
    // Step 5: a real local node (own key, own data dir, signed register + signed heartbeats on the relay).
    // B352-1: owner-only files for the node's key material while the node is set up and started.
    'OLD_UMASK=$(umask)',
    "umask 077",
    // Every failure below must reach the honest not-yet line and exit 0, so no set -e here.
    "set +e",
    'MESH_HOME="${AZIEL_MESH_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/aziel-mesh}"',
    'DIR="$MESH_HOME/$NODE"',
    "NODE_OK=0",
    "NODE_STARTED=0",
    'SRC=""',
    'if command -v node >/dev/null 2>&1 && [ "$(node -p "process.versions.node.split(\'.\')[0]" 2>/dev/null || echo 0)" -ge 20 ]; then',
    '  if [ -n "${AZIEL_MESH_SRC_DIR:-}" ]; then SRC="$AZIEL_MESH_SRC_DIR"; else',
    ...(nodeStep.source_ref
      ? [
          // B352-2: the deployed commit only (cache keyed by commit, and by tarball sha256 when pinned).
          `    SRC="$MESH_HOME/src-${nodeStep.source_ref}${pin ? "-" + pin.slice(0, 16) : ""}"`,
          '    if [ ! -f "$SRC/qnm-node/fed-instance.mjs" ]; then',
          '      mkdir -p "$MESH_HOME"',
          '      TMP="$MESH_HOME/.src-tmp-$RND"',
          '      rm -rf "$TMP"; mkdir -p "$TMP/x"',
          '      GOT=""',
          `      if curl -fsSL -o "$TMP/src.tgz" ${shq(nodeStep.source)} 2>/dev/null; then`,
          ...(pin
            ? [
                '        if command -v sha256sum >/dev/null 2>&1; then GOT=$(sha256sum "$TMP/src.tgz" | cut -d" " -f1);',
                '        elif command -v shasum >/dev/null 2>&1; then GOT=$(shasum -a 256 "$TMP/src.tgz" | cut -d" " -f1); fi',
                `        if [ "$GOT" != ${shq(pin)} ]; then echo 'The node source did not match its pinned sha256 (or no sha256 tool), so it was not used.'; rm -f "$TMP/src.tgz"; fi`,
              ]
            : []),
          '        if [ -f "$TMP/src.tgz" ] && tar -xzf "$TMP/src.tgz" -C "$TMP/x" --strip-components=1 2>/dev/null && [ -f "$TMP/x/qnm-node/fed-instance.mjs" ]; then',
          '          rm -rf "$SRC" && mv "$TMP/x" "$SRC"',
          "        fi",
          "      else",
          "        echo 'The node source could not be downloaded.'",
          "      fi",
          '      rm -rf "$TMP"',
          "    fi",
        ]
      : ["    echo 'This server has no pinned deployed commit for the node source, so no local mesh node was started.'"]),
    "  fi",
    '  if [ -n "$SRC" ] && [ -f "$SRC/qnm-node/fed-instance.mjs" ]; then',
    '    mkdir -p "$DIR"',
    // Log cap: the node writes its own JSON log, rotating at the cap to node.log.1 (two files max).
    // node.err cap: the node's stdout/stderr go through qnm-node/capped-run.mjs (0600, 1 MiB, rotates
    // to node.err.1), never a raw shell redirect. The pid file holds the wrapper, which forwards SIGTERM.
    `    nohup node "$SRC/qnm-node/capped-run.mjs" --err-file "$DIR/node.err" --err-max-bytes ${NODE_LOG_MAX_BYTES} -- "$SRC/qnm-node/fed-instance.mjs" --data "$DIR/data" --relay ${shq(nodeStep.relay)} --product ${shq(plan.slug)} --heartbeat-sec 180 --log-file "$DIR/node.log" --log-max-bytes ${NODE_LOG_MAX_BYTES} > /dev/null 2>&1 &`,
    '    echo $! > "$DIR/node.pid"',
    "    NODE_STARTED=1",
    "    i=0",
    "    while [ $i -lt 30 ]; do",
    '      if grep -q \'"registered":true\' "$DIR/node.log" 2>/dev/null; then NODE_OK=1; break; fi',
    '      if ! kill -0 "$(cat "$DIR/node.pid")" 2>/dev/null; then break; fi',
    "      i=$((i+1)); sleep 1",
    "    done",
    "  fi",
    "else",
    "  echo 'Node 20 or newer is not installed, so no local mesh node was started. Presence only.'",
    "fi",
    'umask "$OLD_UMASK"',
    "set -e",
    'if [ "$NODE_OK" = 1 ]; then',
    `  HANDLE=$(grep -o '"handle":"[^"]*"' "$DIR/node.log" | tail -1 | cut -d'"' -f4)`,
    '  echo "Mesh node $HANDLE is running (pid $(cat "$DIR/node.pid"), data $DIR). Stop: kill $(cat "$DIR/node.pid")"',
    `  echo ${shq("Tip: " + welcome.text)}`,
    "else",
    '  if [ -f "$DIR/node.pid" ]; then kill "$(cat "$DIR/node.pid")" 2>/dev/null || true; fi',
    `  ${NOT_YET}`,
    "fi",
    ...plan.hints.filter((h) => h.when === "first_run" && h.id !== "welcome").map((h) => `echo ${shq("Tip: " + h.text)}`),
    "echo 'The alternate internet is not live yet. This node is ready for it.'",
    "",
  ];
  return lines.join("\n");
}

export function bootstrapList({ origin, nodes = [] }) {
  const base = String(origin || "").replace(/\/$/, "");
  const peers = (nodes || [])
    .filter((n) => n && n.node_id && (n.presence_class === "live" || n.presence === "live"))
    .slice(0, 200)
    .map((n) => ({ node_id: n.node_id, product: n.product || null, plane: n.plane || n.kind || null }));
  return {
    ok: true,
    spec: BOOTSTRAP_SPEC,
    phase: "E",
    starting_addresses: [{ url: base, provider: "cloudflare-workers", role: "runtime-origin" }],
    starting_address_count: 1,
    peers,
    peer_count: peers.length,
    needs_starting_address: true,
    only_source: true,
    signed: false,
    note: "One starting address on one provider. Nodes B-D (other providers) are blocked on VPS details, so this list cannot survive the loss of this origin yet.",
    ...honest(),
  };
}

/**
 * MESH-HINTS-UI-1.0: the first-run hints as a dismissible popup. Remembered only in this
 * browser (localStorage "azrt.hints.v1"); nothing is sent to the server. No tracking.
 */
export function newUserHintsHtml({ when = "first_run" } = {}) {
  const hints = NEW_USER_HINTS.filter((h) => h.when === when).map((h) => ({ id: h.id, title: h.title, text: h.text }));
  const data = JSON.stringify(hints).replace(/</g, "\\u003c");
  return `<div id="azrt-hints" role="dialog" aria-modal="false" aria-labelledby="azrt-hints-title" hidden style="${HINTS_STYLE}">
<strong id="azrt-hints-title"></strong><p id="azrt-hints-text" style="margin:.4rem 0 .7rem"></p>
<button type="button" id="azrt-hints-next">Next</button> <button type="button" id="azrt-hints-close">Got it</button>
<small id="azrt-hints-n" style="float:right;opacity:.7"></small></div>
<script>(function(){var K="azrt.hints.v1",H=${data},s={};try{s=JSON.parse(localStorage.getItem(K)||"{}")||{}}catch(e){s={}}
var left=H.filter(function(h){return !s[h.id]});if(!left.length)return;var i=0,el=document.getElementById("azrt-hints");
function save(){try{localStorage.setItem(K,JSON.stringify(s))}catch(e){}}
function show(){var h=left[i];document.getElementById("azrt-hints-title").textContent=h.title;document.getElementById("azrt-hints-text").textContent=h.text;document.getElementById("azrt-hints-n").textContent=(i+1)+" / "+left.length;document.getElementById("azrt-hints-next").hidden=i>=left.length-1;el.hidden=false}
document.getElementById("azrt-hints-next").onclick=function(){s[left[i].id]=1;save();i++;show()};
document.getElementById("azrt-hints-close").onclick=function(){left.forEach(function(h){s[h.id]=1});save();el.hidden=true};
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!el.hidden){document.getElementById("azrt-hints-close").click()}});show()})();</script>`;
}

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

export function installPlan({ origin, slug, version, products = [] }) {
  const s = String(slug || "").toLowerCase();
  if (!SLUG_RE.test(s)) return { ok: false, spec: ONBOARD_SPEC, code: "ONBOARD-BAD-SLUG", message: "GET /v1/mesh/install?slug=<slug>&version=<v>.", fail_closed: true };
  const product = products.find((p) => p && p.slug === s) || null;
  if (!product) return { ok: false, spec: ONBOARD_SPEC, code: "ONBOARD-UNKNOWN-SLUG", message: "That slug is not in the catalog.", fail_closed: true };
  const v = VER_RE.test(String(version || "")) ? String(version) : "latest";
  const base = String(origin || "").replace(/\/$/, "");
  const host = productHost(product);
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
    ],
    node_per_version: true,
    hints: NEW_USER_HINTS,
    security_model: "single-node isolation + phoenix reboot loop",
    ...honest(),
  };
}

function shq(v) {
  return "'" + String(v).replace(/'/g, "'\\''") + "'";
}

export function installScript(plan) {
  if (!plan || !plan.ok) return `#!/bin/sh\necho ${shq((plan && plan.code) || "ONBOARD-REFUSED")} >&2\nexit 1\n`;
  const join = plan.steps[2];
  const install = plan.steps[1];
  const lines = [
    "#!/bin/sh",
    `# ${ONBOARD_SPEC}: install ${plan.slug} ${plan.version}, then join the mesh as its own node. Author: Aziel Eliab.`,
    "set -eu",
    install.url ? `curl -fsSL ${shq(install.url)} | sh` : `echo ${shq("No separate installer for " + plan.slug + ".")}`,
    'RND=$(od -An -N4 -tx1 /dev/urandom | tr -d " \\n")',
    `NODE=${shq(join.body.node_id.replace("-<random>", ""))}-$RND`,
    `curl -fsS -X POST ${shq(join.url)} -H 'content-type: application/json' -d "{\\"product\\":\\"${plan.slug}\\",\\"node_id\\":\\"$NODE\\",\\"presence\\":\\"live\\",\\"heartbeat_mode\\":\\"idle\\"}" >/dev/null && echo "Joined the mesh as $NODE."`,
    ...plan.hints.filter((h) => h.when === "first_run").map((h) => `echo ${shq("Tip: " + h.text)}`),
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
  return `<div id="azrt-hints" role="dialog" aria-modal="false" aria-labelledby="azrt-hints-title" hidden style="position:fixed;right:1rem;bottom:1rem;max-width:22rem;z-index:50;background:#fff;color:#111;border:1px solid #888;border-radius:10px;padding:.9rem 1rem;box-shadow:0 4px 18px rgba(0,0,0,.25);font:14px/1.4 system-ui,sans-serif">
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

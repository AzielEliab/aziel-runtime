/**
 * Aziel Eliab Runtime — Quantum Node Mesh suite rollup (QNM-BUILD-1.0).
 *
 * Companion to AIH-WP-1.1. Public surface is rollup + operator enable only.
 * Parent rolls the full local `qnm-node/` package. This repo hosts
 * radio bearer hooks only (`qnm-node/bearers/radio.js`).
 * This Worker must not invent a login mesh, IP panel,
 * login-recovery, upload proxy, or account resurrection.
 * OPERATOR-OVERRIDE 2026-09-17 armed node_gate / get_is_node_gate as
 * public mesh cites (not a login-recovery panel).
 *
 * Law (must not violate):
 * - Bulletproof: local modules run radios off; receipts to disk; poison
 *   refused not interpreted; tamper isolates; PHOENIX-LOCK waits locally
 *   (no controller hunt); wait/re-seal only — not public hostname
 *   resurrection and not “bring the .uk node back”; tethers drop clean
 *   (no implicit heal); no account resurrection; pulled sites die with
 *   the pull (token / Worker / DNS gone → public rollup on that hostname
 *   down; local node may keep verifying/appending; mesh does not climb
 *   back onto the public hostname by itself); a process supervisor
 *   restarting cloudflared is operator kit, not this contract; it fails
 *   if credential or hostname is gone; anon-broadcast is never a publish path.
 * - Split the wires: 0.5–1s tick is presence + tip hash only (fixed-size;
 *   no body, no diff, no file). Payload is a second plane the receiver
 *   pulls — never a push fan-out. Update is a proof, not a timer. 777s is
 *   dwell after a valid cite, not wait-then-take. Clock desync is not a
 *   yes. Ambiguous tip is isolate, not merge. Equivocation ends that peer.
 *   Quorum cannot outvote a broken hash. Emit last, locally. Neighbors do
 *   not phoenix because a neighbor phoenix’d. Split brain does not
 *   auto-splice. Heartbeat loss ≠ poison and ≠ apply last packet. The 1s
 *   loop and the 777s gate never share a socket.
 * - Cold-copy survival: multiply cold copies; refuse live body sync
 *   across the network; tip expensive to erase; unkillable by
 *   single-server pull (hostname dies; vaults that already hold the
 *   hashes keep verifying/appending); hash-absolute poison refuse
 *   (equivocation isolates that peer); data outlives creators via
 *   content-addressed tips + local verify/append; payloads pull-only
 *   cold; named hosts only.
 * - Re-expand-from-archive: bytes survive, not summaries. Restore from
 *   archive after prev-hash verify. Not mesh from index. Crawlers are
 *   extra shelves only. Training residue is rumor.
 * - REHEAL: isolation is the cure. Heal from own last good tip +
 *   verified trusted pull, or phoenix-WAIT. Never by listening to
 *   neighbors. Allowed: live / locked / isolated / tip-hash.
 *   Forbidden: bodies / diffs / vote-to-fix.
 * - CROSS-NETWORK-SURVIVAL-1.0: if network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault). All prior laws sit under that sentence. The live mesh is not a shelf.
 * - azieleliab.com hosts published software/runtime — NOT login-recovery,
 *   NOT Node Gate/IP panel, NOT upload proxy.
 * - Suite public surface may expose mesh rollup only: live / locked /
 *   isolated counts (no average-of-nodes leaderboard). Views / MCP /
 *   downloads do not enter QNM-S.
 * - Default: read-only suite-presence ON (bearer suite-presence).
 *   GET /v1/mesh never enables radios beyond that read-only presence.
 *   Do not require POST /v1/mesh/enable for public Live Nodes.
 * - Public disable of suite-presence is refused. POST /v1/mesh/disable / mesh_disable
 *   must refuse — they cannot turn suite-presence off.
 * - While suite-presence is LIVE, this Worker fans out join/heartbeat
 *   for every live Softwares product Worker (`{slug}-worker`) on cron
 *   or request-path. That roster is software_nodes — it must not be
 *   used alone as the public Live Nodes number. Public live_nodes is
 *   mesh size: every join/heartbeat node that is active (presence
 *   live) or inactive (presence locked), excluding isolated.
 *   Downloads and catalog size are not live. Product Workers proxy
 *   /v1/mesh/* via AZIEL_RUNTIME — do not invent a second mesh.
 * - NO-LIE / NO-REWRITE (NO-LIE-NO-REWRITE-1.0): receipts that still
 *   hash; copies not all on one tunnel; rules simple enough others
 *   verify without the author's voice; no rewrite key. The network is
 *   never allowed to lie — even to self-preserve, sustain, stay alive,
 *   adapt, or prevent death. Companion under
 *   docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md. Law paper:
 *   docs/designs/NO-LIE-NO-REWRITE-1.0.md. Does not replace the
 *   CROSS-NETWORK-SURVIVAL-1.0 machine tip.
 *
 * Keep /v1/mesh status/nodes/enable plus a refused disable route.
 * Frame as QNM rollup + read-only suite presence — not account mesh.
 *
 * Full node process is local `qnm-node/` (boot/chain/apg/bearers/outbox/
 * phoenix/score/memorial/tethers). Anon-broadcast is a sibling loopback
 * module of that local process only. Packet-transfer coding design is
 * QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; Worker cites only).
 *
 * Not a Softwares-tab product. Not AZMail's product-local ring.
 * Do not invent arming / wipe / VPN-hop internals.
 * Public identity: Aziel Eliab only.
 */

import { MESH_NO_LIE_REWRITE_OPS, meshNoLieRefuse, noLieFrame, noLieHint } from "./no-lie.js";
import { qnsCiteField, qnsHint } from "./qns.js";
import {
  DWELL_S,
  FORBIDDEN_TICK_KEYS,
  SPLIT_WIRES,
  SPLIT_WIRES_SHORT,
  TICK_MS_MAX,
  TICK_MS_MIN,
  TICK_PLANE,
  clocksShareSocket,
  heartbeatLossMeaning,
  judgeEquivocation,
  tickAccepts,
} from "./split-wires.js";
import { COLD_COPY, COLD_COPY_SHORT, refuseLiveBodySync } from "./cold-copy.js";
import { RE_EXPAND, RE_EXPAND_SHORT, meshFromIndex } from "./re-expand.js";
import { REHEAL, REHEAL_SHORT, neighborTalkHeal } from "./reheal.js";
import {
  CROSS_NETWORK_SURVIVAL,
  CROSS_NETWORK_SURVIVAL_SHORT,
  SURVIVAL_SHELVES,
  SURVIVAL_TIP,
  citePriorLaws,
  networkDataDie,
  survivalCiteField,
  survivalHint,
} from "./cross-network-survival.js";
import { meshGetEnableRefuse, meshGetLooksLikeEnable } from "./redline.js";
import { dispatchAzGeneratorHttp, semanticBridgeCiteField } from "./semantic-bridge.js";
import { durabilityLabels } from "./durability-labels.js";
import { nineLawsFrame, nineLawsHint, nineLawsLaunchCite, refuseNineLawGet, refuseNineLawViolation } from "./mesh-nine-laws.js";
import { CHANNEL_PLANE_NOTE, CHANNEL_PLANE_SPEC, channelPlaneFrame, channelPlaneHint } from "./mesh-channel-plane.js";
import { publicVpnCite } from "./public-vpn.js";
import { ensureDefaultVpnSession, vpnAutoCite } from "./azvpn-auto.js";

export const MESH_SLUG = "mesh";
export const MESH_NAME = "Quantum Node Mesh";
export const MESH_SPEC = "QNM-BUILD-1.0";
export const MESH_COMPANION = "AIH-WP-1.1";
export const MESH_AUTHOR = "Aziel Eliab";
export const MESH_DEFAULT = "on";
export const MESH_DEFAULT_ENABLED = true;
export const SUITE_PRESENCE = "on";
export const PRESENCE_TTL_MS = 5 * 60 * 1000;
export const ENABLE_COOLDOWN_MS = 60_000;
export const RECEIPT_CAP = 32;
export const NODE_CAP = 256;
export const LABEL_CAP = 80;
export const TITLE_CAP = 160;
export const PRESENCE_STATES = Object.freeze(["live", "locked", "isolated"]);
export const EXAMPLE_BEARER = "suite-presence";
export const FANOUT_CRON = "*/2 * * * *";
export const FANOUT_NODE_SUFFIX = "-worker";

/** Public Live Nodes = mesh size: active + inactive, excluding isolated. */
export const LIVE_NODES_NOTE =
  "Public Live Nodes (live_nodes / rollup.mesh) count mesh size — how big the node mesh is: every join/heartbeat node that is active (presence live) or inactive (presence locked). Isolated nodes are excluded (see isolated_nodes). Not catalog size. Not cumulative downloads. software_nodes is the {slug}-worker roster and must not be used alone as this pill. Zero is honest when the roster is empty.";

export const SOFTWARE_NODES_NOTE =
  "software_nodes / rollup.software count Softwares product Workers ({slug}-worker) from suite-presence fan-out. They may appear in the mesh roster; they must not be used alone as the public Live Nodes number.";

export function isLiveMeshPresence(presence) {
  return presence === "live" || presence === "locked";
}

export function meshSizeFromPresence(counts) {
  const src = counts && typeof counts === "object" ? counts : {};
  return (Number(src.live) || 0) + (Number(src.locked) || 0);
}

/** Live Softwares catalog used by suite-presence fan-out. Set from index.js (avoids a cycle). */
let suitePresenceCatalog = [];

export const QNM_HOST_NOTE =
  "azieleliab.com hosts published software/runtime — not login-recovery, not IP panel, not upload proxy. Node Gate / get_is_node_gate is an operator-armed public mesh cite (2026-09-17), not a login-recovery panel.";

export const QNM_LOCAL_NODE =
  "Full node process is local qnm-node/ (boot/chain/apg/bearers/outbox/phoenix/score/memorial/tethers). Packet-transfer coding design is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; Worker cites only). Channel plane (wifi / bluetooth / rf / photon) is operator-armed cite — live OS/hardware bearers run on that local process, not Worker-proxied VPN. Parent will roll that package. This runtime is suite rollup + operator enable only.";

export const QNM_S_NOTE = "Views, MCP, and downloads do not enter QNM-S.";

export const ANON_BROADCAST_NOTE =
  "Anon-broadcast is a sibling loopback module of local qnm-node/ only (text→TTS→desk MP4→metadata-culled file + SHA-256). Style tool. Never a publish path. Not an upload proxy. Not origin-hiding. Operator keeps the file. Not a Softwares-tab product. Not a QNM publish channel.";

export const MESH_LIMITATION =
  "THIS IS: QNM-BUILD-1.0 suite rollup on aziel-runtime — companion to AIH-WP-1.1. Packet-transfer coding design is QNS-CD-1.0 (companion to QNM-BUILD-1.0 / AIH-WP-1.3; photon QNS1 1.3 on local qnsd; Worker cites only). Public surface is live/locked/isolated counts plus read-only suite-presence ON by default (bearer suite-presence). GET /v1/mesh never enables radios beyond that read-only presence. POST /v1/mesh/disable refuses MESH-DISABLE-REFUSED — public disable of suite-presence is refused. While LIVE, cron or request-path fans out join/heartbeat for live Softwares product Workers (node_id {slug}-worker; no '|'; TTL 5 min). Product Workers proxy /v1/mesh/* via AZIEL_RUNTIME. Phoenix is wait/re-seal after tamper or isolation, not public hostname resurrection. Sites pulled (token revoked, Worker dropped, DNS killed) die with the pull — public rollup on that hostname is down; local node may keep verifying/appending; mesh does not climb back onto the public hostname by itself. A process supervisor restarting cloudflared is operator kit, not this contract. Split the wires: 0.5–1s tick is presence + tip hash only (fixed-size; no body, no diff, no file). Payload is receiver-pull, never a sender fan-out. Update is a proof, not a timer. 777s is dwell after a valid cite, not wait-then-take. Clock desync is not a yes. Ambiguous tip is isolate, not merge. Equivocation ends that peer. Quorum cannot outvote a broken hash. Emit last, locally. Neighbors do not phoenix because a neighbor phoenix’d. Split brain does not auto-splice. Heartbeat loss is not isolate-by-timer and does not apply last packet. The 1s loop and the 777s gate never share a socket. " +
  SPLIT_WIRES_SHORT +
  " Cold-copy survival: " +
  COLD_COPY_SHORT +
  " Re-expand-from-archive: " +
  RE_EXPAND_SHORT +
  " REHEAL: " +
  REHEAL_SHORT +
  " CROSS-NETWORK-SURVIVAL-1.0: " +
  CROSS_NETWORK_SURVIVAL_SHORT +
  " NO-LIE-NO-REWRITE-1.0: receipts that still hash; copies not all on one tunnel; no rewrite key; the network is never allowed to lie even to self-preserve. Companion under the umbrella; does not replace the machine tip. " +
  " COLD-MULTI-SHELF-1.0: GET /shelves cites corpus#96 honesty — Plane A one CF/GitHub tunnel (5 published surfaces / 2 family radii / 1 independent live); Plane B alt-forge SLOT (Codeberg + archive.org PASS still SLOT at https://archive.org/details/aziel-lockset-tip + https://archive.org/details/aziel-lockset-tip_202609, same blast_radius; Framagit URL null; GitFlic CNS-GITFLIC-EMAIL; GitLab CNS-GITLAB-CF-LOOP; Zenodo refused CNS-ZENODO-IP-BAN; doi null); Plane C USB SLOT until CNS-OPERATOR-ATTEST. Runtime is the same Plane A tunnel, not a sixth surface. " +
  " Nine QNM laws are HARD TRUE on GET /v1/mesh (and status): split-wires, cold-copy, REHEAL isolation, phoenix local-only, die-with-pull (no godlock.uk back). OPERATOR-OVERRIDE 2026-09-17 flipped auto_heal / implicit_heal, node_gate / get_is_node_gate, neighbor_heal, network, and anonymity_network (mode flag only — not Tor/VPN/origin-hiding) from hard-false to ON. Each remaining refuse still uses a published code. GodLock is a product name, not identity. " +
  " Channel plane (QNM-CHANNEL-PLANE-1.0): operator-armed wifi / bluetooth / rf / photon cites are ON. Live OS/hardware bearers run on local qnm-node / qnsd. Worker channel_plane stays cite-only (worker_hardware:false). Worker does not invent RF/BT hardware and does not proxy those vias. suite-presence remains the Worker rollup bearer. Channel plane ≠ VPN. AZNet ↔ AZBrowser pairing is order/token only — pairing ≠ tunnel. " +
  " Public Live Nodes (live_nodes) count mesh size: active + inactive join/heartbeat nodes, excluding isolated. Not catalog size. Not downloads. software_nodes is the {slug}-worker roster and must not be used alone as Live Nodes. Zero is honest when the roster is empty. " +
  " THIS IS NOT: a login mesh; login-recovery; IP panel; upload proxy; account resurrection; public hostname resurrection; bringing the .uk node back; average-of-nodes leaderboard; QNM-S; the local qnm-node process (boot/chain/apg/bearers/outbox/phoenix/score/memorial/tethers); AnonBroadcast as a catalog product or publish path; AZMail's product-local ring; arming; wipe; controller hunt; a public qnsd proxy; a payload push plane; vote-to-reconcile; live body sync; mesh from index; summary-as-archive; vote-to-fix; live network as a shelf; a rewrite key; a lie to stay alive; a kernel UDP VPN / WireGuard concentrator (public VPN is AZVPN HTTPS/WS REAL; GET cites only); a live Tor/origin-hiding anonymity fabric (anonymity_network is an operator-armed mode flag only); Worker-proxied radios. Author: Aziel Eliab only.";

export const MESH_CANONICAL_OPS = Object.freeze([
  "status",
  "enable",
  "disable",
  "join",
  "heartbeat",
  "leave",
  "nodes",
  "broadcast",
  "health",
  "skill",
  "vpn",
]);

export const MESH_OP_ALIASES = Object.freeze({
  mesh_status: "status",
  mesh_enable: "enable",
  mesh_disable: "disable",
  mesh_join: "join",
  mesh_heartbeat: "heartbeat",
  mesh_leave: "leave",
  mesh_nodes: "nodes",
  mesh_broadcast: "broadcast",
});

export const MESH_LIVE_OPS = Object.freeze([...MESH_CANONICAL_OPS, ...Object.keys(MESH_OP_ALIASES)]);

export const MESH_STUB_OPS = Object.freeze([
  "arm",
  "wipe",
  "hop",
  "tunnel",
  "scorch",
  "login",
  "recover",
  "recovery",
  "resurrection",
  "resurrect",
  "account",
  "gate",
  "ip-panel",
  "ippanel",
  "publish",
  "phoenix-hunt",
  "phoenix_hunt",
  "heal",
  "controller",
  ...MESH_NO_LIE_REWRITE_OPS,
]);

export const MESH_MCP_TOOLS = Object.freeze([
  "mesh_status",
  "mesh_enable",
  "mesh_disable",
  "mesh_join",
  "mesh_heartbeat",
  "mesh_leave",
  "mesh_nodes",
  "mesh_broadcast",
]);

const SHA256_RE = /^[a-f0-9]{64}$/;
const PRODUCT_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** Full-string node_id: exactly 8–80 chars of [a-z0-9._-]. No uppercase. */
export const NODE_ID_RE = /^[a-z0-9._-]{8,80}$/;
const NODE_RE = NODE_ID_RE;
const BEARER_RE = /^[a-z][a-z0-9-]{1,39}$/;
const FORBIDDEN_BEARER_TOKENS = Object.freeze([
  "login",
  "recover",
  "recovery",
  "account",
  "resurrection",
  "resurrect",
  "gate",
  "ip",
  "ip-panel",
  "ippanel",
  "publish",
  "phoenix",
  "heal",
  "controller",
  "password",
  "session",
  "restore",
]);
const FORBIDDEN_BROADCAST_KEYS = Object.freeze([
  "video",
  "bytes",
  "file",
  "body",
  "mp4",
  "media",
  "blob",
  "content",
  "upload",
  "data",
  "payload_b64",
  "file_b64",
  "publish",
  "public",
  "announce",
  "stream",
]);
const POISON_KEY_RE = /poison/i;

const memory = {
  enabled: MESH_DEFAULT_ENABLED,
  last_enable_ms: 0,
  bearers: MESH_DEFAULT_ENABLED ? [EXAMPLE_BEARER] : [],
  nodes: {},
  receipts: [],
  seq: 0,
};

/** Test / time-travel clock. Null means Date.now(). */
let injectedNowMs = null;
/** Test / HW radio override. null = derive from bearers + env; false = TX off. */
let radiosOverride = null;

export function setMeshNowMs(ms) {
  if (ms == null || ms === "") {
    injectedNowMs = null;
    return null;
  }
  const n = Number(ms);
  injectedNowMs = Number.isFinite(n) ? n : null;
  return injectedNowMs;
}

export function resetMeshClock() {
  injectedNowMs = null;
  return null;
}

/**
 * Force TX radios on/off for tests or a localized hardware toggle.
 * Public mesh_disable still refuses — this is not a public kill switch.
 * When off, mesh_join / heartbeat / broadcast refuse MESH-OFF.
 */
export function setMeshRadiosEnabled(on) {
  radiosOverride = on === true;
  if (radiosOverride) {
    memory.enabled = true;
    if (!memory.bearers.length) memory.bearers = [EXAMPLE_BEARER];
  } else {
    memory.enabled = false;
    memory.bearers = [];
  }
  return radiosOverride;
}

/** Honest HW / operator radio env. Missing = no hardware claim (do not invent radios). */
export function readMeshRadioEnv(env) {
  if (!env || typeof env !== "object") return null;
  const raw = env.MESH_RADIOS != null && env.MESH_RADIOS !== "" ? env.MESH_RADIOS : env.QNM_RADIOS;
  if (raw == null || raw === "") return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "off" || s === "0" || s === "false" || s === "disabled") return false;
  if (s === "on" || s === "1" || s === "true" || s === "enabled") return true;
  return null;
}

export function resetMeshStore() {
  memory.enabled = MESH_DEFAULT_ENABLED;
  memory.last_enable_ms = 0;
  memory.bearers = MESH_DEFAULT_ENABLED ? [EXAMPLE_BEARER] : [];
  memory.nodes = {};
  memory.receipts = [];
  memory.seq = 0;
  injectedNowMs = null;
  radiosOverride = null;
}

export function setSuitePresenceCatalog(products) {
  suitePresenceCatalog = Array.isArray(products) ? products.slice() : [];
  return suitePresenceCatalog.length;
}

export function getSuitePresenceCatalog() {
  return suitePresenceCatalog.slice();
}

export function suitePresenceNodeId(slug) {
  const product = sanitizeProduct(slug);
  if (!product) return "";
  return `${product}${FANOUT_NODE_SUFFIX}`;
}

export function isMeshReadPath(pathname) {
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase() || "/";
  return path === "/v1/mesh" || path === "/v1/mesh/status" || path === "/v1/mesh/nodes";
}

export function suitePresenceTargets(products) {
  const src = Array.isArray(products) && products.length ? products : suitePresenceCatalog;
  const out = [];
  const seen = new Set();
  for (const item of src || []) {
    const product = sanitizeProduct((item && (item.slug || item.product)) || "");
    if (!product || seen.has(product)) continue;
    const node_id = suitePresenceNodeId(product);
    if (!node_id) continue;
    seen.add(product);
    out.push({
      product,
      node_id,
      label: sanitizeLabel((item && (item.name || item.label)) || product),
      presence: "live",
    });
  }
  return out;
}

export function resolveMeshOp(raw) {
  const op = String(raw || "")
    .trim()
    .toLowerCase();
  if (!op) return "";
  if (MESH_OP_ALIASES[op]) return MESH_OP_ALIASES[op];
  return op;
}

export function isMeshMcpTool(name) {
  return MESH_MCP_TOOLS.includes(String(name || "").trim());
}

export function meshHint(path = "/v1/mesh") {
  return {
    path: String(path || "/v1/mesh"),
    enabled_default: MESH_DEFAULT_ENABLED,
    mesh_default: MESH_DEFAULT,
    spec: MESH_SPEC,
    companion: MESH_COMPANION,
    rollup_only: true,
    qnm_s: false,
    suite_presence: SUITE_PRESENCE,
    get_never_enables: true,
    fanout: "cron-or-request-path",
    live_nodes_plane: "mesh-size",
    software_nodes_plane: "software-worker-fanout",
    live_nodes_note: LIVE_NODES_NOTE,
    software_nodes_note: SOFTWARE_NODES_NOTE,
    presence_ttl_ms: PRESENCE_TTL_MS,
    qns_cd: qnsHint(),
    survival: survivalHint(),
    ...noLieFrame(),
    no_lie_hint: noLieHint(),
    nine_laws: nineLawsHint(),
    ...nineLawsLaunchCite(),
    clocks_share_socket: false,
    live_body_sync: false,
    node_gate: true,
    get_is_node_gate: true,
    anonymity_network: true,
    die_with_pull: true,
    phoenix_local_only: true,
    implicit_heal: true,
    auto_heal: true,
    neighbor_heal: true,
    network: true,
    network_cite: "on",
    ...channelPlaneFrame(),
    channel_plane_hint: channelPlaneHint(),
  };
}

export function meshCiteField(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    ...meshHint("/v1/mesh"),
    ...nineLawsLaunchCite(origin),
    name: MESH_NAME,
    identity: MESH_AUTHOR,
    status: base ? `${base}/v1/mesh/status` : "/v1/mesh/status",
    nodes: base ? `${base}/v1/mesh/nodes` : "/v1/mesh/nodes",
    enable: base ? `${base}/v1/mesh/enable` : "/v1/mesh/enable",
    example_bearer: EXAMPLE_BEARER,
    login_mesh: false,
    node_gate: true,
    get_is_node_gate: true,
    qnm_s: false,
    nine_laws: nineLawsHint(),
    note: "Read-only suite-presence is ON by default. GET /v1/mesh never enables radios beyond that. Public Live Nodes (live_nodes) are mesh size: active + inactive, not isolated. {slug}-worker fan-out is software_nodes and must not be used alone as that pill. Downloads are not live. Channel plane (wifi / bluetooth / rf / photon) is an operator-armed cite — live hardware runs on local qnm-node. Channel plane ≠ kernel VPN. Public VPN auto-binds AZVPN (cite-only on GET; no session open). Pairing ≠ tunnel. Not a login mesh. Not a login-recovery IP panel. OPERATOR-OVERRIDE 2026-09-17 armed node_gate / get_is_node_gate, auto_heal / implicit_heal, neighbor_heal, network, anonymity_network (mode flag), and public VPN. Nine QNM laws are hard-true (fields + published refuse codes). Worker-launch cite: hashtag parts #aziel / #runtime and always About Aziel (/about). NO-LIE / NO-REWRITE: no rewrite key; never lie to survive. COLD-MULTI-SHELF-1.0: GET /shelves cites corpus#96 honesty.",
    survival: survivalCiteField(),
    semantic_bridge: semanticBridgeCiteField(base),
  };
}

export function meshKernelEntry() {
  return {
    name: MESH_NAME,
    slug: MESH_SLUG,
    digest: null,
    status: "live",
    ops: MESH_LIVE_OPS.slice(),
    catalog_ops: MESH_CANONICAL_OPS.slice(),
    stub_ops: MESH_STUB_OPS.slice(),
    op_aliases: { ...MESH_OP_ALIASES },
    description:
      "QNM-BUILD-1.0 suite rollup (companion to AIH-WP-1.1). Packet-transfer coding design QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; Worker cites only). Channel plane QNM-CHANNEL-PLANE-1.0: operator-armed wifi / bluetooth / rf / photon cites ON; live hardware on local qnm-node. Public VPN auto-binds AZVPN (HTTPS/WS REAL; WireGuard/OpenVPN SLOT; GET cites only). live/locked/isolated counts. Read-only suite-presence is ON by default. GET /v1/mesh never enables radios beyond that. Public disable of suite-presence is refused. Nine QNM laws are hard-true on GET /v1/mesh. OPERATOR-OVERRIDE 2026-09-17 armed auto_heal / node_gate / neighbor_heal / network / anonymity_network (mode flag) / public VPN. Phoenix is wait/re-seal, not public hostname resurrection. Pulled sites die with the pull — godlock.uk does not come back. Split the wires: presence + tip hash on the 1s tick; pull-only payloads; hash-absolute ingest; equivocation isolates that peer. Cold-copy survival: multiply cold copies; no live body sync; named hosts only. REHEAL: isolation is the cure. Not a login-recovery IP panel. Not a live Tor fabric. Channel plane ≠ kernel VPN. Pairing ≠ tunnel. CROSS-NETWORK-SURVIVAL-1.0: if network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault). NO-LIE-NO-REWRITE-1.0: no rewrite key; never lie to survive. COLD-MULTI-SHELF-1.0: GET /shelves cites corpus#96 honesty. Not a login mesh. Not a Softwares-tab product.",
    note: MESH_LIMITATION,
    kind: "kernel",
    engine: false,
    true_engine_runtime: false,
    local_not_hosted: false,
    companion: MESH_COMPANION,
    spec: MESH_SPEC,
    qns_cd: qnsHint(),
  };
}

export function nodeMeshHubCard(origin) {
  const base = String(origin || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  return {
    slug: MESH_SLUG,
    name: MESH_NAME,
    kind: "kernel",
    spec: MESH_SPEC,
    companion: MESH_COMPANION,
    engine: false,
    true_engine_runtime: false,
    version: MESH_SPEC,
    door: "fraggate",
    one_line:
      "THIS IS: QNM-BUILD-1.0 suite rollup (live/locked/isolated). Read-only suite-presence is ON by default. GET never enables radios beyond that. Channel plane: wifi / bluetooth / rf / photon cites ON (local qnm-node hardware). Worker channel_plane stays cite-only (worker_hardware:false) — not live Worker RF. THIS IS NOT: a Softwares-tab product, a login mesh, a VPN, or Worker radio hardware. Public disable of suite-presence is refused. Nine QNM laws are hard-true on GET /v1/mesh. OPERATOR-OVERRIDE 2026-09-17 armed auto_heal / node_gate / neighbor_heal / network / anonymity_network (mode flag only). Phoenix is wait/re-seal, not public hostname resurrection. Pulled sites die with the pull. Split the wires: tick is presence + tip hash; payloads are pull-only. Cold-copy survival: no live body sync; named hosts only. REHEAL: isolation is the cure. Channel plane ≠ VPN. Pairing ≠ tunnel. CROSS-NETWORK-SURVIVAL-1.0: chain survives on cold shelves (hosts / DOI / git / vault). NO-LIE / NO-REWRITE. COLD-MULTI-SHELF-1.0: GET /shelves cites corpus#96 honesty. Full node is local qnm-node/. Packet transfer: QNS-CD-1.0 on local qnsd (Worker cites only).",
    path: "/v1/mesh",
    enabled_default: MESH_DEFAULT_ENABLED,
    rollup_only: true,
    qnm_s: false,
    status: `${base}/v1/mesh/status`,
    nodes: `${base}/v1/mesh/nodes`,
    enable: `${base}/v1/mesh/enable`,
    mcp: `${base}/mcp`,
    fraggate_describe: `${base}/v1/fraggate/describe?slug=mesh`,
    fraggate_call: `${base}/v1/fraggate/call`,
    docs: "docs/NODE_MESH.md",
    no_lie: noLieHint(),
    local_node: "qnm-node/",
    qns: `${base}/v1/qns`,
    qns_cd: qnsHint(),
    survival: survivalHint(),
    note: MESH_LIMITATION,
    author: MESH_AUTHOR,
  };
}

function nowMs() {
  return injectedNowMs == null || !Number.isFinite(injectedNowMs) ? Date.now() : injectedNowMs;
}

function nowIso(ms = nowMs()) {
  return new Date(ms).toISOString();
}

function clip(raw, cap) {
  return String(raw == null ? "" : raw).trim().slice(0, cap);
}

export function sanitizeProduct(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!PRODUCT_RE.test(s)) return "";
  if (s === "anon-broadcast" || s === "anonbroadcast") return "";
  return s;
}

export function sanitizeNodeId(raw) {
  const s = String(raw || "").trim();
  if (!NODE_RE.test(s)) return "";
  return s;
}

/** Auto-minted join ids (`mesh_${seq}_…`). Instance plane (downloaded Softwares). */
export function isEphemeralMeshNodeId(nodeId) {
  return /^mesh_/.test(String(nodeId || ""));
}

/** Suite-presence fan-out ids (`{slug}-worker`). Counted on software_nodes; not the Live Nodes definition by itself. */
export function isSoftwareWorkerNodeId(nodeId) {
  const id = String(nodeId || "");
  return id.endsWith(FANOUT_NODE_SUFFIX) && !isEphemeralMeshNodeId(id);
}

/** Non-worker join/heartbeat ids (downloaded Softwares instances / named extras). */
export function isInstanceMeshNodeId(nodeId) {
  const id = String(nodeId || "");
  if (!id) return false;
  return !isSoftwareWorkerNodeId(id);
}

export function meshNodePlane(nodeId) {
  return isSoftwareWorkerNodeId(nodeId) ? "software" : "instance";
}

export function sanitizeLabel(raw) {
  return clip(raw, LABEL_CAP);
}

export function isSha256Hex(raw) {
  return SHA256_RE.test(String(raw || "").trim().toLowerCase());
}

export function sanitizeBearer(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!BEARER_RE.test(s)) return "";
  const parts = s.split("-").filter(Boolean);
  for (const tok of FORBIDDEN_BEARER_TOKENS) {
    if (s === tok || parts.includes(tok)) return "";
  }
  return s;
}

export function sanitizePresence(raw, fallback = "live") {
  if (raw == null || raw === "") return fallback;
  const s = String(raw).trim().toLowerCase();
  if (PRESENCE_STATES.includes(s)) return s;
  return "";
}

function newNodeId(ms = nowMs()) {
  memory.seq += 1;
  const rand = Math.random().toString(36).slice(2, 10);
  return `mesh_${memory.seq.toString(36)}_${ms.toString(36)}_${rand}`;
}

function newSessionId(nodeId) {
  return `msess_${String(nodeId || "node").replace(/[^a-z0-9]/gi, "").slice(0, 24)}_${Math.random().toString(36).slice(2, 10)}`;
}

function meshKv(env) {
  if (env && env.MESH && typeof env.MESH.get === "function" && typeof env.MESH.put === "function") {
    return { kv: env.MESH, prefix: "", binding: "MESH" };
  }
  if (env && env.USES && typeof env.USES.get === "function" && typeof env.USES.put === "function") {
    return { kv: env.USES, prefix: "mesh|", binding: "USES" };
  }
  return null;
}

async function kvGetJson(kv, key, fallback) {
  try {
    const raw = await kv.get(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function pruneNodes(nodes, now = nowMs()) {
  const live = {};
  for (const [id, node] of Object.entries(nodes || {})) {
    if (!node || typeof node !== "object") continue;
    const seen = Date.parse(node.last_seen || node.joined_at || "") || 0;
    if (seen && now - seen <= PRESENCE_TTL_MS) live[id] = node;
  }
  return live;
}

function liveList(nodes) {
  return Object.values(nodes || {})
    .slice()
    .sort((a, b) => String(b.last_seen || "").localeCompare(String(a.last_seen || "")));
}

function productsPresent(nodes) {
  const set = new Set();
  for (const node of liveList(nodes)) {
    if (node && node.product) set.add(node.product);
  }
  return [...set].sort();
}

function emptyPresence() {
  return { live: 0, locked: 0, isolated: 0 };
}

function rollupCounts(nodes) {
  const software = emptyPresence();
  const ephemeral = emptyPresence();
  const named = emptyPresence();
  const instances = emptyPresence();
  const all = emptyPresence();
  for (const node of liveList(nodes)) {
    const p = node && PRESENCE_STATES.includes(node.presence) ? node.presence : "live";
    all[p] += 1;
    const id = node && node.node_id;
    if (isEphemeralMeshNodeId(id)) ephemeral[p] += 1;
    else if (isSoftwareWorkerNodeId(id)) software[p] += 1;
    else named[p] += 1;
    if (isInstanceMeshNodeId(id)) instances[p] += 1;
  }
  return {
    live: all.live,
    locked: all.locked,
    isolated: all.isolated,
    mesh: meshSizeFromPresence(all),
    active: all.live,
    inactive: all.locked,
    software,
    instances,
    ephemeral,
    named,
    all,
  };
}

function normalizeBearers(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const b = sanitizeBearer(item);
    if (b && !out.includes(b)) out.push(b);
  }
  return out;
}

function withDefaultBearers(raw) {
  const bearers = normalizeBearers(raw);
  if (bearers.length >= 1) return bearers;
  return MESH_DEFAULT_ENABLED ? [EXAMPLE_BEARER] : [];
}

function storeHonesty(binding) {
  if (binding === "MESH") return "Dedicated MESH KV.";
  if (binding === "USES") return "USES KV under mesh| keys (no placeholder namespace ids).";
  return "In-process memory (tests / unbound).";
}

function radiosOn(bearers) {
  return Array.isArray(bearers) && bearers.length >= 1;
}

/**
 * TX radios for join/heartbeat/broadcast.
 * HW env off or test override off → MESH-OFF.
 * HW absent: do not invent a radio. Suite software presence follows declared bearers.
 */
function txRadiosLive(bearers, env) {
  if (radiosOverride === false) return false;
  const hw = readMeshRadioEnv(env);
  if (hw === false) return false;
  if (radiosOverride === true) return true;
  return radiosOn(bearers);
}

function withBearersForLoad(raw) {
  if (radiosOverride === false) return normalizeBearers(raw);
  return withDefaultBearers(raw);
}

async function loadState(env) {
  const bound = meshKv(env);
  if (!bound) {
    memory.nodes = pruneNodes(memory.nodes);
    const bearers = withBearersForLoad(memory.bearers);
    memory.enabled = txRadiosLive(bearers, env);
    memory.bearers = bearers;
    return {
      enabled: memory.enabled === true,
      last_enable_ms: memory.last_enable_ms || 0,
      bearers,
      nodes: { ...memory.nodes },
      receipts: Array.isArray(memory.receipts) ? memory.receipts.slice() : [],
      store: "memory",
    };
  }
  const lastRaw = await bound.kv.get(`${bound.prefix}last_enable_ms`);
  const bearers = withBearersForLoad(await kvGetJson(bound.kv, `${bound.prefix}bearers`, []));
  const nodes = pruneNodes(await kvGetJson(bound.kv, `${bound.prefix}nodes`, {}));
  const receipts = await kvGetJson(bound.kv, `${bound.prefix}receipts`, []);
  return {
    enabled: txRadiosLive(bearers, env),
    last_enable_ms: Number(lastRaw) || 0,
    bearers,
    nodes: nodes && typeof nodes === "object" && !Array.isArray(nodes) ? nodes : {},
    receipts: Array.isArray(receipts) ? receipts : [],
    store: bound.binding,
  };
}

async function saveState(env, state) {
  const bound = meshKv(env);
  const bearers = normalizeBearers(state.bearers);
  const enabled = radiosOn(bearers);
  const nodes = pruneNodes(state.nodes);
  const receipts = Array.isArray(state.receipts) ? state.receipts.slice(0, RECEIPT_CAP) : [];
  if (!bound) {
    memory.enabled = enabled;
    memory.last_enable_ms = state.last_enable_ms || 0;
    memory.bearers = bearers;
    memory.nodes = nodes;
    memory.receipts = receipts;
    return "memory";
  }
  await bound.kv.put(`${bound.prefix}enabled`, enabled ? "1" : "0");
  await bound.kv.put(`${bound.prefix}last_enable_ms`, String(state.last_enable_ms || 0));
  await bound.kv.put(`${bound.prefix}bearers`, JSON.stringify(bearers));
  await bound.kv.put(`${bound.prefix}nodes`, JSON.stringify(nodes));
  await bound.kv.put(`${bound.prefix}receipts`, JSON.stringify(receipts));
  return bound.binding;
}

function qnmFrame() {
  return {
    spec: MESH_SPEC,
    companion: MESH_COMPANION,
    name: MESH_NAME,
    qnm_s: false,
    qnm_s_note: QNM_S_NOTE,
    scores: false,
    leaderboard: false,
    phoenix_lock: "local wait / re-seal — no controller hunt; not public hostname resurrection",
    split_wires: SPLIT_WIRES,
    tick_plane: TICK_PLANE,
    tick_ms: { min: TICK_MS_MIN, max: TICK_MS_MAX },
    dwell_s: DWELL_S,
    clocks_share_socket: clocksShareSocket(),
    split_wires_short: SPLIT_WIRES_SHORT,
    cold_copy: COLD_COPY,
    cold_copy_short: COLD_COPY_SHORT,
    live_body_sync: false,
    named_hosts_only: true,
    re_expand: RE_EXPAND,
    re_expand_short: RE_EXPAND_SHORT,
    mesh_from_index: false,
    summaries_survive: false,
    reheal: REHEAL,
    reheal_short: REHEAL_SHORT,
    isolation_is_the_cure: true,
    neighbor_heal: true,
    vote_to_fix: false,
    cross_network_survival: CROSS_NETWORK_SURVIVAL,
    cross_network_survival_short: CROSS_NETWORK_SURVIVAL_SHORT,
    survival_shelves: SURVIVAL_SHELVES.slice(),
    live_network_is_shelf: false,
    survival: survivalHint(),
    survival_tip: SURVIVAL_TIP,
    local_node: "qnm-node/",
    local_node_note: QNM_LOCAL_NODE,
    host_note: QNM_HOST_NOTE,
    qns_cd: qnsCiteField(),
    ...noLieFrame(),
    ...nineLawsFrame(),
    ...channelPlaneFrame(),
    channel_plane_spec: CHANNEL_PLANE_SPEC,
  };
}

function baseResult(extra) {
  return {
    ok: true,
    code: "MESH-OK",
    author: MESH_AUTHOR,
    identity: "Aziel Eliab",
    kernel: MESH_SLUG,
    mesh_default: MESH_DEFAULT,
    presence_ttl_ms: PRESENCE_TTL_MS,
    ...qnmFrame(),
    ...extra,
  };
}

function refuse(code, message, extra = {}) {
  return {
    ok: false,
    code,
    author: MESH_AUTHOR,
    identity: "Aziel Eliab",
    kernel: MESH_SLUG,
    mesh_default: MESH_DEFAULT,
    message,
    ...qnmFrame(),
    ...extra,
  };
}

function statusFields(state) {
  const nodes = pruneNodes(state.nodes);
  const list = liveList(nodes);
  const products = productsPresent(nodes);
  const rollup = rollupCounts(nodes);
  const bearers = normalizeBearers(state.bearers);
  const enabled = state.enabled === true;
  return {
    enabled,
    radios: enabled ? "on" : "off",
    network: true,
    network_cite: "on",
    bearers,
    rollup,
    live_nodes: rollup.mesh,
    active_nodes: rollup.active,
    inactive_nodes: rollup.inactive,
    locked_nodes: rollup.locked,
    isolated_nodes: rollup.isolated,
    live_nodes_note: LIVE_NODES_NOTE,
    software_nodes_note: SOFTWARE_NODES_NOTE,
    ephemeral_nodes: rollup.ephemeral.live + rollup.ephemeral.locked + rollup.ephemeral.isolated,
    ephemeral_live_nodes: rollup.ephemeral.live,
    software_nodes: rollup.software.live + rollup.software.locked + rollup.software.isolated,
    software_live_nodes: rollup.software.live,
    software_locked_nodes: rollup.software.locked,
    software_isolated_nodes: rollup.software.isolated,
    instance_nodes: rollup.instances.live + rollup.instances.locked + rollup.instances.isolated,
    instance_live_nodes: rollup.instances.live,
    instance_locked_nodes: rollup.instances.locked,
    instance_isolated_nodes: rollup.instances.isolated,
    products_present: products,
    products,
    store: state.store,
    store_note: storeHonesty(state.store),
    anon_broadcast: ANON_BROADCAST_NOTE,
    azmail_note:
      "AZMail mesh_* stays product-local (anonymous mail ring). This surface is QNM rollup + read-only suite-presence, not that ring and not an account mesh.",
    suite_presence: SUITE_PRESENCE,
    get_never_enables: true,
    fanout: "cron-or-request-path",
  };
}

export async function meshFanoutSuitePresence(env, extra = {}) {
  const source = String((extra && extra.source) || "fanout").trim() || "fanout";
  const state = await loadState(env);
  if (!state.enabled) {
    return {
      ok: true,
      skipped: true,
      reason: "off",
      enabled: false,
      fanout: false,
      joined: 0,
      refreshed: 0,
      source,
      get_never_enables: true,
      suite_presence: SUITE_PRESENCE,
      note: "GET /v1/mesh never enables radios beyond read-only suite-presence. Fan-out runs when suite-presence is LIVE.",
    };
  }
  const targets = suitePresenceTargets(extra.products);
  const now = nowMs();
  const ts = nowIso(now);
  let joined = 0;
  let refreshed = 0;
  for (const target of targets) {
    const existing = state.nodes[target.node_id];
    const session_id = (existing && existing.session_id) || newSessionId(target.node_id);
    state.nodes[target.node_id] = {
      node_id: target.node_id,
      product: target.product,
      label: existing && existing.label ? existing.label : target.label,
      presence: "live",
      session_id,
      joined_at: (existing && existing.joined_at) || ts,
      last_seen: ts,
    };
    if (existing) refreshed += 1;
    else joined += 1;
  }
  const ids = Object.keys(state.nodes);
  if (ids.length > NODE_CAP) {
    const sorted = liveList(state.nodes);
    state.nodes = Object.fromEntries(sorted.slice(0, NODE_CAP).map((n) => [n.node_id, n]));
  }
  const store = await saveState(env, state);
  return baseResult({
    op: "fanout",
    skipped: false,
    fanout: true,
    source,
    joined,
    refreshed,
    targets: targets.length,
    node_ids: targets.map((t) => t.node_id),
    get_never_enables: true,
    suite_presence: SUITE_PRESENCE,
    ...statusFields({ ...state, store }),
    note: "Suite-presence refresh of live Softwares product Workers ({slug}-worker → software_nodes). Those nodes are real mesh presence (non-isolated) so they add to mesh-size Live Nodes; software_nodes must not be used alone as that pill. GET never enables radios beyond read-only suite-presence. Not a login mesh.",
  });
}

export function scheduleSuitePresenceFanout(ctx, env, extra = {}) {
  const work = meshFanoutSuitePresence(env, extra);
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(work);
    return { scheduled: true, source: (extra && extra.source) || "request-path" };
  }
  return work;
}

export async function meshVpnCite(payload, env) {
  const state = await loadState(env);
  const auto = await ensureDefaultVpnSession(payload, env);
  if (!auto || auto.ok === false) {
    return {
      ...baseResult({
        op: "vpn",
        ...statusFields(state),
        ...publicVpnCite(),
      }),
      ok: false,
      refused: true,
      code: (auto && auto.code) || "AZVPN-AUTO-FAIL",
      error: (auto && auto.error) || "AZVPN auto-bind could not start.",
      connected: false,
      fake_connected: false,
      vpn_auto: vpnAutoCite({ open: true }),
      auto,
      note: "Public VPN auto-bind refused honestly. No fake connected. Explicit FragGate azvpn/* still exist.",
    };
  }
  return baseResult({
    op: "vpn",
    ...statusFields(state),
    ...publicVpnCite(),
    vpn_auto: vpnAutoCite({ open: true, already: auto.already === true }),
    auto: true,
    already: auto.already === true,
    connected: true,
    fake_connected: false,
    tunnel_id: auto.tunnel_id,
    session: auto.session || null,
    concentrator: {
      slug: "azvpn",
      name: "AZVPN",
      door: "fraggate",
      ops: ["describe", "open", "status", "list", "close", "send", "recv", "pull", "peers", "attach"],
    },
    note: "Public VPN auto-bind. REAL concentrator is AZVPN (HTTPS/WS). WireGuard/OpenVPN/L3 stay SLOT. FragGate only. Callers did not name software=azvpn.",
  });
}

export async function meshStatus(payload, env) {
  const state = await loadState(env);
  return baseResult({
    op: "status",
    ...statusFields(state),
    note: state.enabled
      ? "QNM suite rollup is LIVE. Read-only suite-presence is ON by default. live_nodes is mesh size (active + inactive, not isolated). software_nodes is the {slug}-worker roster and must not be used alone as Live Nodes. Counts only — no QNM-S, no leaderboard. Downloads are not live."
      : "QNM suite-presence is not LIVE. GET /v1/mesh never enables radios beyond read-only suite-presence.",
  });
}

export async function meshHealth(payload, env) {
  const status = await meshStatus(payload, env);
  return {
    ...status,
    op: "health",
    product: MESH_SLUG,
    name: MESH_NAME,
  };
}

export function meshSkillText() {
  return `# Quantum Node Mesh (QNM-BUILD-1.0)

Companion to **AIH-WP-1.1**. Suite public surface is **rollup + operator enable** only.

${MESH_LIMITATION}

Read-only **suite-presence is ON by default**. A site ping of \`GET /v1/mesh\` never enables radios beyond that read-only presence. Public \`POST /v1/mesh/disable\` / \`mesh_disable\` refuses \`MESH-DISABLE-REFUSED\` — it cannot turn suite-presence off.

\`mesh_join\` / \`POST /v1/mesh/join\` requires \`product\` (catalog slug). Optional \`node_id\` must be exactly 8–80 chars matching \`[a-z0-9._-]\` (full string). \`presence\` must be \`live\` (default), \`locked\`, or \`isolated\`. Join is additive presence with a **strict 5-minute TTL**. \`mesh_heartbeat\` refreshes that TTL. If no heartbeat (or fan-out refresh) arrives inside the window, the node is **dropped** from the live roster. When transmission radios are powered down or suite radios are not enabled, join/heartbeat/broadcast refuse **\`MESH-OFF\`**. Read paths stay honest. Do not invent a second refuse spelling.

While radios are LIVE, this Worker fans out join/heartbeat for every live Softwares product Worker (\`node_id\` \`{slug}-worker\`, no \`|\`) on cron (\`*/2 * * * *\`) or request-path. That roster is **software_nodes** — it must not be used alone as public Live Nodes. Public **live_nodes** is mesh size: every join/heartbeat node that is **active** (presence \`live\`) or **inactive** (presence \`locked\`). Isolated nodes are excluded. Downloads and catalog size are not live. Zero is honest when the roster is empty. Product Workers proxy \`/v1/mesh/*\` via \`AZIEL_RUNTIME\`. Not a second mesh. Fan-out does not restore godlock.uk or reattach a pulled public hostname.

Phoenix is wait / re-seal after tamper or isolation. It is not “bring the .uk node back.” Sites pulled (token revoked, Worker dropped, DNS killed) die with the pull: public rollup on that hostname is down; a local node may keep verifying and appending. Mesh does not climb back onto the public hostname by itself. A process supervisor restarting cloudflared is operator kit, not this contract.

**Split the wires.** Fast 0.5–1s tick: presence + tip hash only. Fixed-size. No body, no diff, no “also here’s the file.” Payload on a second plane the receiver pulls, never a push the sender fans out. Update is a proof, not a timer. 777s is dwell after a valid cite, not wait-then-take. Clock desync is not a yes. Ambiguous tip is isolate, not merge. Equivocation ends that peer. Quorum cannot outvote a broken hash. Emit last, locally. Neighbors do not phoenix because a neighbor phoenix’d. Split brain does not auto-splice. Heartbeat loss is not isolate-by-timer and does not apply last packet. The 1s loop and the 777s gate never share a socket. ${SPLIT_WIRES_SHORT}

**Cold-copy survival.** ${COLD_COPY_SHORT} A single-server pull kills that named hostname. It does not kill cold copies. Live body sync across the network is refused.

**Re-expand-from-archive.** ${RE_EXPAND_SHORT}

**REHEAL.** ${REHEAL_SHORT}

**CROSS-NETWORK-SURVIVAL-1.0.** ${CROSS_NETWORK_SURVIVAL_SHORT}

Public **live_nodes** is mesh size (\`active_nodes\` + \`inactive_nodes\`, exclude isolated). Presence buckets stay on \`rollup.live\` / \`locked\` / \`isolated\` (all planes). Softwares product Workers stay labeled on \`software_nodes\` / \`rollup.software\`. No average-of-nodes leaderboard. Views / MCP / downloads do not enter QNM-S.

Full node process is local \`qnm-node/\` (boot / chain / apg / bearers / outbox / phoenix / score / memorial / tethers). Packet-transfer coding design is **QNS-CD-1.0** (photon QNS1 1.3 on local \`qnsd\`; companion to QNM-BUILD-1.0 / AIH-WP-1.3). This Worker cites only — \`GET /v1/qns\`. It does not proxy local via emit. **Channel plane (${CHANNEL_PLANE_SPEC}):** operator-armed wifi / bluetooth / rf / photon cites are ON. Live OS/hardware bearers run on local qnm-node / qnsd. ${CHANNEL_PLANE_NOTE} Parent will roll that package. Anon-broadcast is a sibling loopback module of that local process only — never a publish path.

HTTP: \`GET /v1/mesh\` · \`GET /v1/mesh/status\` · \`POST /v1/mesh/enable\` (optional extra bearer) · \`POST /v1/mesh/disable\` (refused) · \`POST /v1/mesh/join|heartbeat|leave\` · \`GET /v1/mesh/nodes\` · \`POST /v1/mesh/broadcast\` (hash receipt only; not a publish path)

FragGate: \`fraggate_list\` → \`fraggate_describe\` slug=mesh → \`fraggate_call { slug: "mesh", op }\`

MCP tools: ${MESH_MCP_TOOLS.join(", ")}

${QNM_HOST_NOTE}

${ANON_BROADCAST_NOTE}

**Nine laws (hard-true).** \`GET /v1/mesh\` and status carry machine fields for all nine: split-wires (\`clocks_share_socket: false\`), cold-copy (\`live_body_sync: false\`), REHEAL isolation (\`isolation_is_the_cure: true\`), phoenix local-only, die-with-pull (\`restore_godlock_uk: false\`). **OPERATOR-OVERRIDE 2026-09-17** flipped \`auto_heal\` / \`implicit_heal\`, \`node_gate\` / \`get_is_node_gate\`, \`neighbor_heal\`, \`network\`, and \`anonymity_network\` (mode flag only — not Tor/VPN/origin-hiding) from hard-false to ON. Vote-to-fix, apply-last-packet, login-recovery / IP panel, VPN claims, and godlock.uk resurrection still refuse published codes (\`MESH-NO-BYTES\`, \`MESH-NO-NEIGHBOR-HEAL\`, \`MESH-STUB\`, \`MESH-BAD-INPUT\`). GodLock is a product name, not identity. Papers: NODE_MESH / SEC-FEAT / NODE-OPS / QNM-WP.

NO-LIE / NO-REWRITE (**NO-LIE-NO-REWRITE-1.0**): receipts that still hash; copies not all on one tunnel; rules simple enough others verify without the author's voice; no rewrite key. The network is never allowed to lie — even to self-preserve, sustain, stay alive, adapt, or prevent death. Companion under **CROSS-NETWORK-SURVIVAL-1.0** (does not replace the machine tip). See \`docs/designs/NO-LIE-NO-REWRITE-1.0.md\`. Rewrite / lie verbs refuse \`MESH-NO-REWRITE\` / \`MESH-NO-LIE\`.

Author: Aziel Eliab only.
`;
}

export async function meshSkill() {
  return baseResult({
    op: "skill",
    text: meshSkillText(),
    note: "QNM suite rollup skill. Not a catalog Software engine. Not a login mesh.",
  });
}

function collectDeclaredBearers(src) {
  const raw = [];
  if (src && src.bearer != null && src.bearer !== "") raw.push(src.bearer);
  if (src && Array.isArray(src.bearers)) raw.push(...src.bearers);
  const accepted = [];
  const rejected = [];
  for (const item of raw) {
    const clean = sanitizeBearer(item);
    if (clean) {
      if (!accepted.includes(clean)) accepted.push(clean);
    } else {
      rejected.push(String(item == null ? "" : item).trim());
    }
  }
  return { accepted, rejected, raw };
}

export async function meshEnable(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  const { accepted, rejected, raw } = collectDeclaredBearers(src);
  if (!raw.length) {
    return refuse(
      "MESH-NEED-BEARER",
      "Pass { bearer: \"suite-presence\" } to declare a bearer. Empty enable is refused. GET /v1/mesh never enables radios beyond read-only suite-presence.",
      {
        op: "enable",
        mesh_enabled: state.enabled === true,
        ...statusFields(state),
        example_bearer: EXAMPLE_BEARER,
      },
    );
  }
  if (rejected.length) {
    return refuse(
      "MESH-BAD-BEARER",
      "Bearer refused. Login / account / recover / gate / IP / publish / phoenix / heal names are not suite bearers. This is not a login mesh.",
      {
        op: "enable",
        mesh_enabled: state.enabled === true,
        refused_bearers: rejected.slice(0, 8),
        example_bearer: EXAMPLE_BEARER,
      },
    );
  }
  const now = nowMs();
  if (state.last_enable_ms && now - state.last_enable_ms < ENABLE_COOLDOWN_MS) {
    const retry_ms = ENABLE_COOLDOWN_MS - (now - state.last_enable_ms);
    return refuse("MESH-ENABLE-RATE", "mesh enable is rate-limited. Public disable of suite-presence is refused.", {
      op: "enable",
      mesh_enabled: state.enabled === true,
      retry_ms,
    });
  }
  const bearers = [...state.bearers];
  for (const b of accepted) {
    if (!bearers.includes(b)) bearers.push(b);
  }
  state.bearers = bearers;
  state.enabled = radiosOn(bearers);
  state.last_enable_ms = now;
  await saveState(env, state);
  const fanout = await meshFanoutSuitePresence(env, { source: "enable" });
  const after = await loadState(env);
  return baseResult({
    op: "enable",
    ...statusFields(after),
    fanout: fanout.skipped ? false : true,
    fanout_joined: fanout.joined || 0,
    fanout_refreshed: fanout.refreshed || 0,
    note: "Operator declared a bearer. Radios LIVE for suite rollup only. Live Softwares product Workers are joined as software_nodes (TTL 5 min). Non-isolated workers count toward mesh-size Live Nodes; software_nodes must not be used alone as that pill. Read-only suite-presence stays ON by default. GET never enables radios beyond that. Not a login mesh.",
  });
}

export async function meshDisable(payload, env) {
  const state = await loadState(env);
  return refuse(
    "MESH-DISABLE-REFUSED",
    "Read-only QNM suite-presence stays ON. Public disable of suite-presence is refused. POST /v1/mesh/disable cannot turn suite presence off. AZMail mesh_disable is a separate product-local mail ring.",
    {
      op: "disable",
      mesh_enabled: true,
      ...statusFields(state),
    },
  );
}

function offRefuse(op, state) {
  return refuse(
    "MESH-OFF",
    "MESH-OFF: transmission radios are powered down or suite radios are not enabled. Software presence is blocked. GET /v1/mesh never enables radios. Read-only suite-presence remains a rollup read.",
    {
      op,
      mesh_enabled: false,
      radios: "off",
      ...statusFields({ ...state, enabled: false }),
    },
  );
}

export async function meshJoin(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  if (!state.enabled) return offRefuse("join", state);
  if (!Object.prototype.hasOwnProperty.call(src, "product") || src.product == null || String(src.product).trim() === "") {
    return refuse("MESH-BAD-INPUT", "Pass { product } as a catalog slug (a-z0-9-). product is required. AnonBroadcast is not a product.", {
      op: "join",
      mesh_enabled: true,
    });
  }
  const product = sanitizeProduct(src.product);
  if (!product) {
    return refuse("MESH-BAD-INPUT", "Pass { product } as a catalog slug (a-z0-9-). AnonBroadcast is not a product.", {
      op: "join",
      mesh_enabled: true,
    });
  }
  const presence = Object.prototype.hasOwnProperty.call(src, "presence")
    ? sanitizePresence(src.presence, "")
    : "live";
  if (!presence) {
    return refuse("MESH-BAD-INPUT", "presence must be live, locked, or isolated (rollup only; no scores).", {
      op: "join",
      mesh_enabled: true,
    });
  }
  const rawId = Object.prototype.hasOwnProperty.call(src, "node_id") ? src.node_id : src.id;
  let node_id = "";
  if (rawId != null && String(rawId).trim() !== "") {
    node_id = sanitizeNodeId(rawId);
    if (!node_id) {
      return refuse("MESH-BAD-INPUT", "node_id must be 8–80 chars matching [a-z0-9._-].", { op: "join", mesh_enabled: true });
    }
  }
  const now = nowMs();
  const ts = nowIso(now);
  const existing = node_id ? state.nodes[node_id] : null;
  if (!node_id) node_id = newNodeId(now);
  const label = sanitizeLabel(src.label || (existing && existing.label) || product);
  const session_id = (existing && existing.session_id) || newSessionId(node_id);
  const node = {
    node_id,
    product,
    label,
    presence,
    session_id,
    joined_at: (existing && existing.joined_at) || ts,
    last_seen: ts,
  };
  state.nodes[node_id] = node;
  const ids = Object.keys(state.nodes);
  if (ids.length > NODE_CAP) {
    const sorted = liveList(state.nodes);
    state.nodes = Object.fromEntries(sorted.slice(0, NODE_CAP).map((n) => [n.node_id, n]));
  }
  const store = await saveState(env, state);
  return baseResult({
    op: "join",
    ...statusFields({ ...state, store }),
    session: {
      session_id,
      node_id,
      product,
      label,
      presence,
      plane: meshNodePlane(node_id),
      counts_as_live_nodes: isLiveMeshPresence(presence),
      joined_at: node.joined_at,
      presence_ttl_ms: PRESENCE_TTL_MS,
    },
    plane: meshNodePlane(node_id),
    counts_as_live_nodes: isLiveMeshPresence(presence),
    node,
    note: isLiveMeshPresence(presence)
      ? "Presence registered on the QNM roster. Non-isolated nodes (active live or inactive locked) count toward public Live Nodes (mesh size). Isolated nodes do not. Heartbeat within 5 minutes or the count drops. Downloads are not live. Not an account session."
      : "Isolated presence registered. Isolated nodes stay out of public Live Nodes (mesh size). See isolated_nodes. Heartbeat within 5 minutes or the count drops. Not an account session.",
  });
}

export async function meshHeartbeat(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  if (!state.enabled) return offRefuse("heartbeat", state);
  const tick = tickAccepts(src);
  if (!tick.ok) {
    return refuse(tick.code, tick.reason === "tip_hash-not-fixed-size" || tick.reason === "prev-not-fixed-size"
      ? "Heartbeat tick is presence + tip hash only. tip_hash/prev must be 64 hex. No body, no diff, no file."
      : "Heartbeat tick is presence + tip hash only. Fixed-size. No body, no diff, no “also here’s the file.” Payload is a pull plane, never a fan-out.", {
      op: "heartbeat",
      mesh_enabled: true,
      refused_keys: tick.refused_keys || FORBIDDEN_TICK_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(src, k)),
      split_wires: SPLIT_WIRES,
      tick_plane: TICK_PLANE,
    });
  }
  const node_id = sanitizeNodeId(src.node_id || src.id);
  if (!node_id) {
    return refuse("MESH-BAD-INPUT", "Pass { node_id }.", { op: "heartbeat", mesh_enabled: true });
  }
  const node = state.nodes[node_id];
  if (!node) {
    return refuse("MESH-UNKNOWN-NODE", "Unknown or expired node. Join again. No account resurrection.", {
      op: "heartbeat",
      mesh_enabled: true,
      node_id,
    });
  }
  if (Object.prototype.hasOwnProperty.call(src, "presence")) {
    const presence = sanitizePresence(src.presence, "");
    if (!presence) {
      return refuse("MESH-BAD-INPUT", "presence must be live, locked, or isolated.", {
        op: "heartbeat",
        mesh_enabled: true,
      });
    }
    node.presence = presence;
  }
  if (tick.prev && tick.tip_hash) {
    const judged = judgeEquivocation({
      node_id,
      prev: tick.prev,
      tips: [node.tip_hash, tick.tip_hash].filter(Boolean),
      presence: node.presence,
    });
    if (node.prev === tick.prev && judged.equivocated) {
      node.presence = "isolated";
      node.prev = tick.prev;
      node.tip_hash = tick.tip_hash;
      node.last_seen = nowIso();
      state.nodes[node_id] = node;
      const store = await saveState(env, state);
      return refuse(
        "MESH-EQUIVOCATION",
        "Same prev, two different tips from one node. That node is isolated. No vote-to-reconcile. Quorum cannot outvote a broken hash.",
        {
          op: "heartbeat",
          mesh_enabled: true,
          node,
          ...statusFields({ ...state, store }),
          split_wires: SPLIT_WIRES,
        },
      );
    }
    node.prev = tick.prev;
    node.tip_hash = tick.tip_hash;
  } else if (tick.tip_hash) {
    node.tip_hash = tick.tip_hash;
  }
  node.last_seen = nowIso();
  state.nodes[node_id] = node;
  const store = await saveState(env, state);
  const loss = heartbeatLossMeaning({ missed: false });
  return baseResult({
    op: "heartbeat",
    ...statusFields({ ...state, store }),
    node,
    split_wires: SPLIT_WIRES,
    tick_plane: TICK_PLANE,
    heartbeat_loss_isolates: loss.poison,
    apply_last_packet: loss.apply_last_packet,
    note: "Presence + optional tip hash only. 5-minute rollup TTL. No body on this plane. No implicit heal. Isolation is the cure. Heartbeat loss is not isolate-by-timer and does not apply last packet.",
  });
}

export async function meshLeave(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  const node_id = sanitizeNodeId(src.node_id || src.id);
  if (!node_id) {
    return refuse("MESH-BAD-INPUT", "Pass { node_id }.", { op: "leave", mesh_enabled: state.enabled === true });
  }
  const existed = Boolean(state.nodes[node_id]);
  delete state.nodes[node_id];
  const store = await saveState(env, state);
  return baseResult({
    op: "leave",
    ...statusFields({ ...state, store }),
    node_id,
    left: existed,
    note: existed
      ? "Presence dropped. OPERATOR-OVERRIDE 2026-09-17 armed implicit_heal / auto_heal cites; leave does not invent a packet replay."
      : "Node was not in the rollup; leave is idempotent.",
  });
}

export async function meshNodes(payload, env) {
  const state = await loadState(env);
  const nodes = liveList(pruneNodes(state.nodes)).map((n) => ({
    node_id: n.node_id,
    product: n.product,
    label: n.label,
    presence: PRESENCE_STATES.includes(n.presence) ? n.presence : "live",
    last_seen: n.last_seen,
    joined_at: n.joined_at,
  }));
  return baseResult({
    op: "nodes",
    ...statusFields(state),
    nodes,
    note: "QNM rollup roster (live/locked/isolated). No scores. No leaderboard. Views/MCP/downloads do not enter QNM-S.",
  });
}

function forbiddenBroadcastKeys(obj) {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj).filter((k) => FORBIDDEN_BROADCAST_KEYS.includes(String(k).toLowerCase()));
}

function poisonKeys(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.keys(obj).filter((k) => POISON_KEY_RE.test(String(k)));
}

export async function meshBroadcast(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  if (!state.enabled) return offRefuse("broadcast", state);
  if (src.publish === true || String(src.mode || "").toLowerCase() === "publish") {
    return refuse("MESH-NO-PUBLISH", "Anon-broadcast is never a publish path. Local qnm-node/ loopback only.", {
      op: "broadcast",
      mesh_enabled: true,
      anon_broadcast: ANON_BROADCAST_NOTE,
    });
  }
  const liveBody = refuseLiveBodySync(src);
  const banned = [...new Set([...(liveBody.refused_keys || []), ...forbiddenBroadcastKeys(src)])];
  if (banned.length) {
    return refuse(
      "MESH-NO-BYTES",
      "Live body sync is refused. Cold copies are pull-only. Never a publish path. Do not send video / file / bytes / publish fields. Operator keeps the file on disk.",
      {
        op: "broadcast",
        mesh_enabled: true,
        refused_keys: banned,
        live_body_sync: false,
        cold_copy: COLD_COPY,
        anon_broadcast: ANON_BROADCAST_NOTE,
      },
    );
  }
  const sha = String(src.sha256 || src.hash || src.digest || "")
    .trim()
    .toLowerCase();
  if (!isSha256Hex(sha)) {
    return refuse("MESH-BAD-INPUT", "Pass { sha256 } as 64 hex chars. Hash receipt only — not a publish path.", {
      op: "broadcast",
      mesh_enabled: true,
      anon_broadcast: ANON_BROADCAST_NOTE,
    });
  }
  const title = clip(src.title, TITLE_CAP);
  const receipt = {
    sha256: sha,
    title: title || undefined,
    at: nowIso(),
    product: sanitizeProduct(src.product) || undefined,
    publish: false,
  };
  state.receipts.unshift(receipt);
  if (state.receipts.length > RECEIPT_CAP) state.receipts.length = RECEIPT_CAP;
  const store = await saveState(env, state);
  return baseResult({
    op: "broadcast",
    ...statusFields({ ...state, store }),
    receipt,
    receipts: state.receipts.slice(0, 8),
    render: "local-qnm-node-loopback",
    publish: false,
    anon_broadcast: ANON_BROADCAST_NOTE,
    note: "Local hash receipt only. Never a publish path. File stays on the operator disk.",
  });
}

export async function runMeshOp(op, payload, env) {
  const resolved = resolveMeshOp(op);
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const poisoned = poisonKeys(src);
  if (poisoned.length) {
    return refuse("MESH-POISON", "Poison refused, not interpreted.", {
      op: resolved || op || null,
      refused_keys: poisoned,
    });
  }
  const nineRefuse = refuseNineLawViolation(src, resolved);
  if (nineRefuse) {
    return refuse(nineRefuse.code, nineRefuse.message, {
      op: resolved || op || null,
      reason: nineRefuse.reason,
      law: nineRefuse.law,
      nine_laws: nineRefuse.nine_laws,
    });
  }
  if (src.from_index === true || src.mesh_from_index === true || src.summary === true) {
    const idx = meshFromIndex();
    return refuse("MESH-NO-INDEX", "Re-expand restores from archive after prev-hash verify. Not mesh from index. Bytes survive, not summaries.", {
      op: resolved || op || null,
      reason: idx.reason,
      re_expand: RE_EXPAND,
      mesh_from_index: false,
    });
  }
  if (src.training_residue === true || src.training === true) {
    return refuse("MESH-NO-INDEX", "Training residue is rumor. It is not an archive restore.", {
      op: resolved || op || null,
      reason: "training-residue-is-rumor",
      re_expand: RE_EXPAND,
    });
  }
  if (src.vote_to_fix === true || src.majority_vote === true) {
    const hug = neighborTalkHeal();
    return refuse(
      "MESH-NO-NEIGHBOR-HEAL",
      "Vote-to-fix stays refused. Operator 2026-09-17 armed neighbor_heal; majority vote is still not truth.",
      {
        op: resolved || op || null,
        reason: hug.reason,
        reheal: REHEAL,
        isolation_is_the_cure: true,
        neighbor_heal: true,
        vote_to_fix: false,
      },
    );
  }
  if (src.survive_on_network === true || src.live_shelf === true || src.live_network_is_shelf === true) {
    const dead = networkDataDie({ live_network_is_shelf: true });
    return refuse(
      "MESH-NO-LIVE-SHELF",
      "If network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault). The live mesh is not a shelf.",
      {
        op: resolved || op || null,
        reason: dead.reason,
        cross_network_survival: CROSS_NETWORK_SURVIVAL,
        shelves: SURVIVAL_SHELVES.slice(),
        live_network_is_shelf: false,
        prior: citePriorLaws().prior.map((p) => p.spec),
      },
    );
  }
  const noLie = meshNoLieRefuse(resolved);
  if (noLie) {
    return { ...refuse(noLie.code, noLie.message, { op: resolved }), ...noLie };
  }
  if (MESH_STUB_OPS.includes(resolved)) {
    return refuse(
      "MESH-STUB",
      `${resolved} is stub on the suite QNM rollup. No login mesh, recovery, resurrection, Node Gate, publish, controller hunt, heal, arming, wipe, hop internals, rewrite key, or lie-to-survive.`,
      { op: resolved },
    );
  }
  if (resolved === "status") return meshStatus(payload, env);
  if (resolved === "vpn") return meshVpnCite(payload, env);
  if (resolved === "health") return meshHealth(payload, env);
  if (resolved === "skill") return meshSkill();
  if (resolved === "enable") return meshEnable(payload, env);
  if (resolved === "disable") return meshDisable(payload, env);
  if (resolved === "join") return meshJoin(payload, env);
  if (resolved === "heartbeat") return meshHeartbeat(payload, env);
  if (resolved === "leave") return meshLeave(payload, env);
  if (resolved === "nodes") return meshNodes(payload, env);
  if (resolved === "broadcast") return meshBroadcast(payload, env);
  return refuse("MESH-UNKNOWN-OP", `Unknown mesh op ${JSON.stringify(op || "")}.`, {
    op: resolved || op || null,
    ops: MESH_CANONICAL_OPS.slice(),
  });
}

async function dispatchMeshHttpCore(method, pathname, payload, env, origin, searchParams) {
  const m = String(method || "GET").toUpperCase();
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase() || "/";
  if (path === "/v1/mesh/az-generator") {
    return dispatchAzGeneratorHttp(m, path, origin, payload, searchParams);
  }
  if (path === "/v1/mesh" || path === "/v1/mesh/status") {
    if (m === "GET" || m === "HEAD") {
      if (meshGetLooksLikeEnable(searchParams, payload)) {
        return { status: 405, body: meshGetEnableRefuse({ path, method: m }) };
      }
      const nineGet = refuseNineLawGet(searchParams, payload);
      if (nineGet) {
        return { status: 405, body: refuse(nineGet.code, nineGet.message, { path, method: m, law: nineGet.law, reason: nineGet.reason }) };
      }
      const body = await meshStatus(payload, env);
      return { status: 200, body };
    }
    return {
      status: 405,
      body: refuse("MESH-METHOD", "GET /v1/mesh or GET /v1/mesh/status. GET never enables radios.", {
        hint: "GET /v1/mesh/status",
      }),
    };
  }
  if (path === "/v1/mesh/nodes") {
    if (m === "GET" || m === "HEAD") {
      const body = await meshNodes(payload, env);
      return { status: 200, body };
    }
    return { status: 405, body: refuse("MESH-METHOD", "GET /v1/mesh/nodes.", { hint: "GET /v1/mesh/nodes" }) };
  }
  const postOps = {
    "/v1/mesh/enable": "enable",
    "/v1/mesh/disable": "disable",
    "/v1/mesh/join": "join",
    "/v1/mesh/heartbeat": "heartbeat",
    "/v1/mesh/leave": "leave",
    "/v1/mesh/broadcast": "broadcast",
  };
  if (postOps[path]) {
    if (m !== "POST") {
      return {
        status: 405,
        body: refuse("MESH-METHOD", `POST ${path}.`, { hint: `POST ${path}` }),
      };
    }
    const body = await runMeshOp(postOps[path], payload, env);
    return { status: body.ok === false ? 400 : 200, body };
  }
  return {
    status: 404,
    body: refuse("MESH-NOT-FOUND", "Unknown mesh path.", {
      hint: "GET /v1/mesh /status /nodes /az-generator  POST /v1/mesh/enable|join|heartbeat|leave|broadcast  POST /v1/mesh/disable (refused)",
    }),
  };
}

export async function dispatchMeshHttp(method, pathname, payload, env, origin, searchParams) {
  const out = await dispatchMeshHttpCore(method, pathname, payload, env, origin, searchParams);
  if (out && out.body && typeof out.body === "object") {
    return { ...out, body: { ...out.body, durability: durabilityLabels(env) } };
  }
  return out;
}

/** In-memory KV stand-in for tests (same shape as USES / MESH). */
export function memoryMeshKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async list({ prefix = "", limit = 1000, cursor } = {}) {
      const names = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) || 0 : 0;
      const slice = names.slice(start, start + limit);
      return {
        keys: slice.map((name) => ({ name })),
        list_complete: start + slice.length >= names.length,
        cursor: start + slice.length < names.length ? String(start + slice.length) : undefined,
      };
    },
    _store: store,
  };
}

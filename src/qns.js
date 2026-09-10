/**
 * QNS-CD-1.0 — Quantum Node Signal packet-transfer coding design.
 *
 * Photon QNS1 1.3 frames. Local process `qnsd` lives in AzielEliab/qnm-node.
 * This Worker cites only. It does not host qnsd, does not proxy 127.0.0.1,
 * and does not expose a remote wipe / control plane.
 *
 * Companion to QNM-BUILD-1.0 / AIH-WP-1.3 (pair-bind lives on qnm-node).
 * Hub / Interface law remains AIH-WP-1.1. AZPIPE / SweepGate / APG /
 * ChainLock remain the Worker-side hop / airlock / ledger; qnsd uses the
 * same laws locally.
 *
 * Not a Softwares-tab product. Not a FragGate slug.
 * GET /v1/mesh never enables. No Node Gate. EmbryoLock is live-with-local-destructive-boundary.
 * Author: Aziel Eliab only.
 */

export const QNS_SPEC = "QNS-CD-1.0";
export const QNS_PHOTON = "QNS1 1.3";
export const QNS_MAGIC = "QNS1";
export const QNS_PHOTON_VERSION = "1.3";
export const QNS_PROCESS = "qnsd";
export const QNS_LOCAL = "https://github.com/AzielEliab/qnm-node";
export const QNS_AUTHOR = "Aziel Eliab";
export const QNS_BIND = "127.0.0.1";
export const QNS_NOTE = "Photon vias on local qnsd; Worker cites only";
export const QNS_COMPANION = Object.freeze(["QNM-BUILD-1.0", "AIH-WP-1.3"]);
export const QNS_HUB_COMPANION = "AIH-WP-1.1";
export const QNS_PAPER = "docs/designs/QNS-CD-1.0.md";

export const QNS_LIMITATION =
  "THIS IS: QNS-CD-1.0 coding design for Quantum Node Signal packet transfer (photon QNS1 1.3). Local process qnsd lives in AzielEliab/qnm-node and binds 127.0.0.1 only. This Worker cites the paper, the local API paths, and a stable qns_cd pointer on every software card plus the mesh kernel extra. qnsd uses the same laws as AZPIPE / SweepGate / APG / ChainLock locally. THIS IS NOT: a Softwares-tab product; a FragGate slug; a public proxy of local via emit; a remote wipe or control plane; Node Gate; qubit hardware; Bell-pair physics; a login mesh. GET /v1/mesh never enables. EmbryoLock is live-with-local-destructive-boundary (wipe/unlock stay local-only). Author: Aziel Eliab only.";

/** Loopback paths on local qnsd / qnm-node. Cited only — never fetched from this Worker. */
export const QNS_LOCAL_PATHS = Object.freeze([
  { method: "GET", path: "/local/qns/status", act: "Photon via posture (not completeness)" },
  { method: "GET", path: "/local/qns/cite", act: "QNS-CD-1.0 + QNS1 1.3 cite" },
  { method: "GET", path: "/local/qns/outbox", act: "Visible queue" },
  { method: "POST", path: "/local/qns/admit", act: "APG then admit inbound QNS1 frame" },
  { method: "POST", path: "/local/qns/via", act: "Emit along an existing pair edge (APG; hop bearer; hop_max)" },
  { method: "POST", path: "/local/qns/cut", act: "Drop one outbox item" },
]);

export const QNS_REFUSE_OPS = Object.freeze([
  "emit",
  "via",
  "wipe",
  "scorch",
  "arm",
  "control",
  "proxy",
  "forward",
  "admit",
]);

const FORBIDDEN_PUBLIC_KEYS = Object.freeze([
  "emit",
  "via",
  "wipe",
  "scorch",
  "arm",
  "control",
  "proxy",
  "forward",
  "admit",
  "bytes",
  "payload_b64",
  "file",
]);

export function qnsHint() {
  return {
    spec: QNS_SPEC,
    local: QNS_LOCAL,
    note: QNS_NOTE,
  };
}

export function qnsCiteField() {
  return {
    ...qnsHint(),
    photon: QNS_PHOTON,
    magic: QNS_MAGIC,
    process: QNS_PROCESS,
    bind: QNS_BIND,
    companion: QNS_COMPANION.slice(),
    hub_companion: QNS_HUB_COMPANION,
    software_tab: false,
    fraggate_slug: false,
    public_proxy: false,
    emit: false,
    wipe: false,
    control_plane: false,
    loopback_only: true,
    paper: QNS_PAPER,
    path: "/v1/qns",
  };
}

export function qnsLocalApi() {
  return {
    bind: QNS_BIND,
    process: QNS_PROCESS,
    repo: QNS_LOCAL,
    public: false,
    note: "Cited only. This Worker never fetches or proxies these paths. Public Worker must not proxy arbitrary local via emit.",
    paths: QNS_LOCAL_PATHS.map((row) => ({ ...row })),
  };
}

export function qnsStatus() {
  return {
    ok: true,
    code: "QNS-OK",
    author: QNS_AUTHOR,
    identity: "Aziel Eliab",
    spec: QNS_SPEC,
    photon: QNS_PHOTON,
    magic: QNS_MAGIC,
    process: QNS_PROCESS,
    local: QNS_LOCAL,
    bind: QNS_BIND,
    paper: QNS_PAPER,
    software_tab: false,
    fraggate_slug: false,
    public_proxy: false,
    emit: false,
    wipe: false,
    control_plane: false,
    loopback_only: true,
    companion: QNS_COMPANION.slice(),
    hub_companion: QNS_HUB_COMPANION,
    note: QNS_NOTE,
    limitation: QNS_LIMITATION,
    laws: {
      mesh_get_never_enables: true,
      node_gate: false,
      embryolock: "live_local_destructive",
      ui_mcp: true,
      identity: "Aziel Eliab",
      rl_packed_catalog: true,
      soft_caps_fanout_only: true,
    },
    worker_fabric: {
      azpipe: "AP-WP-0.2",
      sweepgate: "SG-WP-0.1",
      chainlock: "CL-WP-0.4",
      apg: "local qnm-node (same laws on qnsd)",
      note: "AZPIPE / SweepGate / APG / ChainLock remain the Worker-side hop / airlock / ledger. qnsd uses the same laws locally.",
    },
    local_api: qnsLocalApi(),
    qns_cd: qnsHint(),
  };
}

function payloadHasForbidden(payload) {
  if (!payload || typeof payload !== "object") return false;
  return Object.keys(payload).some((key) => FORBIDDEN_PUBLIC_KEYS.includes(String(key).toLowerCase()));
}

export function qnsRefuse(code, message, extra = {}) {
  return {
    ok: false,
    code,
    author: QNS_AUTHOR,
    identity: "Aziel Eliab",
    spec: QNS_SPEC,
    process: QNS_PROCESS,
    local: QNS_LOCAL,
    public_proxy: false,
    emit: false,
    wipe: false,
    control_plane: false,
    message,
    note: QNS_NOTE,
    ...extra,
  };
}

/**
 * Public door. GET/HEAD cite only. Any mutate / emit / wipe / proxy is refused.
 * Never contacts 127.0.0.1.
 */
export function dispatchQnsHttp(method, pathname, payload) {
  const verb = String(method || "GET").toUpperCase();
  const path = String(pathname || "/v1/qns").split("?")[0].replace(/\/+$/, "") || "/v1/qns";
  const tail = path === "/v1/qns" ? "" : path.replace(/^\/v1\/qns\/?/, "").toLowerCase();

  if (verb === "GET" || verb === "HEAD") {
    if (tail && QNS_REFUSE_OPS.includes(tail)) {
      return {
        status: 404,
        body: qnsRefuse(
          "QNS-CITE-ONLY",
          "Local qnsd paths are not on this Worker. GET /v1/qns cites QNS-CD-1.0 only.",
          { path, local_api: qnsLocalApi() },
        ),
      };
    }
    return { status: 200, body: qnsStatus() };
  }

  if (payloadHasForbidden(payload) || QNS_REFUSE_OPS.includes(tail)) {
    return {
      status: 403,
      body: qnsRefuse(
        "QNS-NO-PROXY",
        "Public Worker must not proxy arbitrary local via emit. Photon vias stay on local qnsd (127.0.0.1). Not a wipe or control plane.",
        { path, refused: tail || Object.keys(payload || {}) },
      ),
    };
  }

  return {
    status: 405,
    body: qnsRefuse(
      "QNS-CITE-ONLY",
      "GET /v1/qns cites QNS-CD-1.0 and local qnsd paths. POST/PUT/PATCH/DELETE are refused. Implementation is local qnsd.",
      { path, method: verb, hint: "GET /v1/qns" },
    ),
  };
}

export function qnsSkillText() {
  return `# Quantum Node Signal (QNS-CD-1.0)

Coding design for **Quantum Node Signal** packet transfer (**photon QNS1 1.3**).

Companion to **QNM-BUILD-1.0** / **AIH-WP-1.3**. Hub / Interface law remains **AIH-WP-1.1**.

${QNS_LIMITATION}

Implementation is local \`qnsd\` in [${QNS_LOCAL}](${QNS_LOCAL}). Binds **${QNS_BIND}** only.

Public Worker: \`GET /v1/qns\` cites the paper and the loopback API. It does **not** proxy emit / via / wipe / control.

Every \`GET /v1/software\` card and the mesh kernel extra carry:

\`qns_cd: { spec: "${QNS_SPEC}", local: "${QNS_LOCAL}", note: "${QNS_NOTE}" }\`

Do **not** add QNS as a Softwares-tab product slug.

Worker-side hop / airlock / ledger stay **AZPIPE / SweepGate / APG / ChainLock**. \`qnsd\` uses those same laws locally.

\`GET /v1/mesh\` never enables. No Node Gate. EmbryoLock is live-with-local-destructive-boundary (wipe/unlock stay local-only). UI=MCP. Identity Aziel Eliab only.

Author: Aziel Eliab only.
`;
}

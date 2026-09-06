/**
 * Aziel Eliab Runtime — suite-wide decentralized node mesh kernel.
 *
 * Presence + hash-receipt layer shared by every product Worker.
 * Default OFF (GodLock law: mesh off until Aziel adds it — this is the add).
 * Not a Softwares-tab product. Not AnonBroadcast. Not AZMail's product-local ring.
 *
 * Broadcast accepts a SHA-256 receipt only — never video bytes.
 * Anon-broadcast stays a local communique renderer (text→TTS→desk MP4→
 * metadata-culled file + SHA-256). Style tool; not an upload proxy;
 * not origin-hiding. Operator moves the file.
 *
 * Do not invent arming / wipe / VPN-hop internals.
 * Public identity: Aziel Eliab only.
 */

export const MESH_SLUG = "mesh";
export const MESH_NAME = "Node Mesh";
export const MESH_SPEC = "NM-0.1";
export const MESH_AUTHOR = "Aziel Eliab";
export const MESH_DEFAULT = "off";
export const MESH_DEFAULT_ENABLED = false;
export const PRESENCE_TTL_MS = 5 * 60 * 1000;
export const ENABLE_COOLDOWN_MS = 60_000;
export const RECEIPT_CAP = 32;
export const NODE_CAP = 256;
export const LABEL_CAP = 80;
export const TITLE_CAP = 160;

export const ANON_BROADCAST_NOTE =
  "Anon-broadcast is a local communique renderer (text→TTS→desk MP4→metadata-culled file + SHA-256). Style tool only. Not an upload proxy. Not origin-hiding. Operator moves the file. Not a Softwares-tab product. Mesh networking is this suite kernel.";

export const MESH_LIMITATION =
  "THIS IS: the aziel-runtime suite node mesh — optional presence (5-minute live nodes) plus hash receipts of local communiques. Default OFF. Product Workers proxy /v1/mesh/* via the AZIEL_RUNTIME binding. THIS IS NOT: AnonBroadcast as a catalog product; an upload proxy; origin-hiding; a VPN; MirageGrid hop; AZMail's product-local anonymous ring; arming; wipe. Author: Aziel Eliab only.";

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

export const MESH_STUB_OPS = Object.freeze(["arm", "wipe", "vpn", "hop", "tunnel", "scorch"]);

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
const NODE_RE = /^[a-z0-9][a-z0-9._-]{7,79}$/i;
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
]);

const memory = {
  enabled: MESH_DEFAULT_ENABLED,
  last_enable_ms: 0,
  nodes: {},
  receipts: [],
  seq: 0,
};

export function resetMeshStore() {
  memory.enabled = MESH_DEFAULT_ENABLED;
  memory.last_enable_ms = 0;
  memory.nodes = {};
  memory.receipts = [];
  memory.seq = 0;
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
    enabled_default: false,
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
      "Suite-wide decentralized node mesh. Presence + hash receipts. Default OFF. Not a Softwares-tab product.",
    note: MESH_LIMITATION,
    kind: "kernel",
    engine: false,
    true_engine_runtime: false,
    local_not_hosted: false,
  };
}

export function nodeMeshHubCard(origin) {
  const base = String(origin || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  return {
    slug: MESH_SLUG,
    name: MESH_NAME,
    kind: "kernel",
    spec: MESH_SPEC,
    engine: false,
    true_engine_runtime: false,
    version: MESH_SPEC,
    door: "fraggate",
    one_line:
      "Suite-wide node mesh (presence + hash receipts). Default OFF. Not a Softwares-tab product. Anon-broadcast stays local-only.",
    path: "/v1/mesh",
    enabled_default: false,
    status: `${base}/v1/mesh/status`,
    nodes: `${base}/v1/mesh/nodes`,
    enable: `${base}/v1/mesh/enable`,
    mcp: `${base}/mcp`,
    fraggate_describe: `${base}/v1/fraggate/describe?slug=mesh`,
    fraggate_call: `${base}/v1/fraggate/call`,
    docs: "docs/NODE_MESH.md",
    note: MESH_LIMITATION,
    author: MESH_AUTHOR,
  };
}

function nowMs() {
  return Date.now();
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

export function sanitizeLabel(raw) {
  return clip(raw, LABEL_CAP);
}

export function isSha256Hex(raw) {
  return SHA256_RE.test(String(raw || "").trim().toLowerCase());
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

function storeHonesty(binding) {
  if (binding === "MESH") return "Dedicated MESH KV.";
  if (binding === "USES") return "USES KV under mesh| keys (no placeholder namespace ids).";
  return "In-process memory (tests / unbound).";
}

async function loadState(env) {
  const bound = meshKv(env);
  if (!bound) {
    memory.nodes = pruneNodes(memory.nodes);
    return {
      enabled: memory.enabled === true,
      last_enable_ms: memory.last_enable_ms || 0,
      nodes: { ...memory.nodes },
      receipts: Array.isArray(memory.receipts) ? memory.receipts.slice() : [],
      store: "memory",
    };
  }
  const enabledRaw = await bound.kv.get(`${bound.prefix}enabled`);
  const lastRaw = await bound.kv.get(`${bound.prefix}last_enable_ms`);
  const nodes = pruneNodes(await kvGetJson(bound.kv, `${bound.prefix}nodes`, {}));
  const receipts = await kvGetJson(bound.kv, `${bound.prefix}receipts`, []);
  return {
    enabled: enabledRaw === "1" || enabledRaw === "true",
    last_enable_ms: Number(lastRaw) || 0,
    nodes: nodes && typeof nodes === "object" && !Array.isArray(nodes) ? nodes : {},
    receipts: Array.isArray(receipts) ? receipts : [],
    store: bound.binding,
  };
}

async function saveState(env, state) {
  const bound = meshKv(env);
  const nodes = pruneNodes(state.nodes);
  const receipts = Array.isArray(state.receipts) ? state.receipts.slice(0, RECEIPT_CAP) : [];
  if (!bound) {
    memory.enabled = state.enabled === true;
    memory.last_enable_ms = state.last_enable_ms || 0;
    memory.nodes = nodes;
    memory.receipts = receipts;
    return "memory";
  }
  await bound.kv.put(`${bound.prefix}enabled`, state.enabled ? "1" : "0");
  await bound.kv.put(`${bound.prefix}last_enable_ms`, String(state.last_enable_ms || 0));
  await bound.kv.put(`${bound.prefix}nodes`, JSON.stringify(nodes));
  await bound.kv.put(`${bound.prefix}receipts`, JSON.stringify(receipts));
  return bound.binding;
}

function baseResult(extra) {
  return {
    ok: true,
    code: "MESH-OK",
    author: MESH_AUTHOR,
    identity: "Aziel Eliab",
    kernel: MESH_SLUG,
    spec: MESH_SPEC,
    mesh_default: MESH_DEFAULT,
    presence_ttl_ms: PRESENCE_TTL_MS,
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
    spec: MESH_SPEC,
    mesh_default: MESH_DEFAULT,
    message,
    ...extra,
  };
}

function statusFields(state) {
  const nodes = pruneNodes(state.nodes);
  const list = liveList(nodes);
  const products = productsPresent(nodes);
  return {
    enabled: state.enabled === true,
    live_nodes: list.length,
    products_present: products,
    products: products,
    store: state.store,
    store_note: storeHonesty(state.store),
    anon_broadcast: ANON_BROADCAST_NOTE,
    azmail_note:
      "AZMail mesh_* stays product-local (anonymous mail ring). This suite mesh is the shared presence layer.",
  };
}

export async function meshStatus(payload, env) {
  const state = await loadState(env);
  return baseResult({
    op: "status",
    ...statusFields(state),
    note: state.enabled
      ? "Suite mesh is on. Nodes join / heartbeat / leave. Broadcast is a hash receipt only."
      : "Suite mesh is OFF (default). Enable before join / heartbeat / broadcast.",
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
  return `# Node Mesh (suite kernel)

${MESH_LIMITATION}

Default **OFF**. Presence TTL is 5 minutes (GodLock Live Nodes style).

HTTP: \`GET /v1/mesh\` · \`GET /v1/mesh/status\` · \`POST /v1/mesh/enable|disable|join|heartbeat|leave\` · \`GET /v1/mesh/nodes\` · \`POST /v1/mesh/broadcast\`

FragGate: \`fraggate_list\` → \`fraggate_describe\` slug=mesh → \`fraggate_call { slug: "mesh", op }\`

MCP tools: ${MESH_MCP_TOOLS.join(", ")}

${ANON_BROADCAST_NOTE}

Author: Aziel Eliab only.
`;
}

export async function meshSkill() {
  return baseResult({
    op: "skill",
    text: meshSkillText(),
    note: "Suite mesh skill. Not a catalog Software engine.",
  });
}

export async function meshEnable(payload, env) {
  const state = await loadState(env);
  const now = nowMs();
  if (state.last_enable_ms && now - state.last_enable_ms < ENABLE_COOLDOWN_MS) {
    const retry_ms = ENABLE_COOLDOWN_MS - (now - state.last_enable_ms);
    return refuse("MESH-ENABLE-RATE", "mesh enable is rate-limited. disable is always allowed.", {
      op: "enable",
      mesh_enabled: state.enabled === true,
      retry_ms,
    });
  }
  state.enabled = true;
  state.last_enable_ms = now;
  const store = await saveState(env, state);
  return baseResult({
    op: "enable",
    ...statusFields({ ...state, store }),
    note: "Suite mesh enabled. Default remains off on a fresh isolate / empty KV.",
  });
}

export async function meshDisable(payload, env) {
  const state = await loadState(env);
  state.enabled = false;
  const store = await saveState(env, state);
  return baseResult({
    op: "disable",
    ...statusFields({ ...state, store }),
    note: "Suite mesh disabled. Live nodes expire in 5 minutes. No wipe / arming.",
  });
}

function offRefuse(op, state) {
  return refuse("MESH-OFF", "Suite mesh is off. Default OFF. Call enable first.", {
    op,
    mesh_enabled: false,
    ...statusFields(state),
  });
}

export async function meshJoin(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  if (!state.enabled) return offRefuse("join", state);
  const product = sanitizeProduct(src.product);
  if (!product) {
    return refuse("MESH-BAD-INPUT", "Pass { product } as a catalog slug (a-z0-9-). AnonBroadcast is not a product.", {
      op: "join",
      mesh_enabled: true,
    });
  }
  let node_id = sanitizeNodeId(src.node_id || src.id);
  if (src.node_id && !node_id) {
    return refuse("MESH-BAD-INPUT", "node_id must be 8–80 chars [a-z0-9._-].", { op: "join", mesh_enabled: true });
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
      joined_at: node.joined_at,
      presence_ttl_ms: PRESENCE_TTL_MS,
    },
    node,
    note: "Node joined the suite mesh. Heartbeat within 5 minutes or presence drops.",
  });
}

export async function meshHeartbeat(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  if (!state.enabled) return offRefuse("heartbeat", state);
  const node_id = sanitizeNodeId(src.node_id || src.id);
  if (!node_id) {
    return refuse("MESH-BAD-INPUT", "Pass { node_id }.", { op: "heartbeat", mesh_enabled: true });
  }
  const node = state.nodes[node_id];
  if (!node) {
    return refuse("MESH-UNKNOWN-NODE", "Unknown or expired node. Join again.", {
      op: "heartbeat",
      mesh_enabled: true,
      node_id,
    });
  }
  node.last_seen = nowIso();
  state.nodes[node_id] = node;
  const store = await saveState(env, state);
  return baseResult({
    op: "heartbeat",
    ...statusFields({ ...state, store }),
    node,
    note: "Presence refreshed. 5-minute TTL.",
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
    note: existed ? "Node left the suite mesh." : "Node was not live; leave is idempotent.",
  });
}

export async function meshNodes(payload, env) {
  const state = await loadState(env);
  const nodes = liveList(pruneNodes(state.nodes));
  return baseResult({
    op: "nodes",
    ...statusFields(state),
    nodes,
    note: "Live nodes with last_seen within 5 minutes. Same presence window as GodLock Live Nodes.",
  });
}

function forbiddenBroadcastKeys(obj) {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj).filter((k) => FORBIDDEN_BROADCAST_KEYS.includes(String(k).toLowerCase()));
}

export async function meshBroadcast(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  if (!state.enabled) return offRefuse("broadcast", state);
  const banned = forbiddenBroadcastKeys(src);
  if (banned.length) {
    return refuse(
      "MESH-NO-BYTES",
      "Broadcast is a hash receipt only. Do not send video / file / bytes. Operator keeps the file local. Use local anon-broadcast to render.",
      {
        op: "broadcast",
        mesh_enabled: true,
        refused_keys: banned,
        anon_broadcast: ANON_BROADCAST_NOTE,
      },
    );
  }
  const sha = String(src.sha256 || src.hash || src.digest || "")
    .trim()
    .toLowerCase();
  if (!isSha256Hex(sha)) {
    return refuse("MESH-BAD-INPUT", "Pass { sha256 } as 64 hex chars. No video bytes.", {
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
  };
  state.receipts.unshift(receipt);
  if (state.receipts.length > RECEIPT_CAP) state.receipts.length = RECEIPT_CAP;
  const store = await saveState(env, state);
  return baseResult({
    op: "broadcast",
    ...statusFields({ ...state, store }),
    receipt,
    receipts: state.receipts.slice(0, 8),
    render: "local-anon-broadcast",
    anon_broadcast: ANON_BROADCAST_NOTE,
    note: "Hash receipt registered. File stays with the operator. Not an upload.",
  });
}

export async function runMeshOp(op, payload, env) {
  const resolved = resolveMeshOp(op);
  if (MESH_STUB_OPS.includes(resolved)) {
    return refuse("MESH-STUB", `${resolved} is stub on the suite mesh. No arming / wipe / hop internals.`, {
      op: resolved,
    });
  }
  if (resolved === "status") return meshStatus(payload, env);
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

export async function dispatchMeshHttp(method, pathname, payload, env) {
  const m = String(method || "GET").toUpperCase();
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase() || "/";
  if (path === "/v1/mesh" || path === "/v1/mesh/status") {
    if (m === "GET" || m === "HEAD") {
      const body = await meshStatus(payload, env);
      return { status: 200, body };
    }
    return {
      status: 405,
      body: refuse("MESH-METHOD", "GET /v1/mesh or GET /v1/mesh/status.", { hint: "GET /v1/mesh/status" }),
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
      hint: "GET /v1/mesh /status /nodes  POST /v1/mesh/enable|disable|join|heartbeat|leave|broadcast",
    }),
  };
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

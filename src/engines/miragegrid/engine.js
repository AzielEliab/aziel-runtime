/**
 * MirageGrid engine (port of workers/download-tracker/src/runtime.js control-plane).
 * Ephemeral session node assignment. Not a live VPN. Author: Aziel Eliab.
 */
export const PRODUCT = "miragegrid";
export const VERSION = "0.2.0";
export const MOTTO = "You enter the booth. The mesh selects a booth and builds a circuit. You leave with no persistent booth identity.";
export const BANNER = "MirageGrid is a true node-mesh VPN and anonymity network. Persistent 25-node peer mesh, onion circuits, userspace SOCKS5. Lawful privacy tool. Author Aziel Eliab.";
export const LIMITATION = "THIS IS: ephemeral control-plane node/circuit assignment. THIS IS NOT: a hosted VPN hop, a guarantee against a global adversary, or packet forwarding. Packet forwarding runs in the local package.";
const POOL_SIZE = 25;
const PEER_OFFSETS = [1, 2, 5, 20, 23, 24];
function nodeIdFor(index) {
  return `node-${String(index + 1).padStart(2, "0")}`;
}
function nodeLabelFor(index) {
  return `Node${String(index + 1).padStart(2, "0")}`;
}

export function makePool(endpoints) {
  const eps = endpoints && typeof endpoints === "object" ? endpoints : {};
  const nodes = [];
  for (let index = 0; index < POOL_SIZE; index++) {
    const id = nodeIdFor(index);
    const label = nodeLabelFor(index);
    let endpoint = eps[id] || eps[label] || `127.0.0.1:${19000 + index + 1}`;
    if (endpoint != null) endpoint = String(endpoint);
    nodes.push({ id, label, index, number: index + 1, endpoint });
  }
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return {
    nodes,
    byId,
    contains(id) { return Boolean(byId[id]); },
    containsNumber(n) { return Number.isInteger(n) && n >= 1 && n <= POOL_SIZE; },
    byIndex(i) {
      if (i < 0 || i >= POOL_SIZE) throw new Error(`node index ${i} out of range 0..24`);
      return nodes[i];
    },
    byNumber(n) {
      if (n < 1 || n > POOL_SIZE) throw new Error(`mirage_node ${n} out of range 1..25`);
      return nodes[n - 1];
    },
    byId(id) {
      if (!byId[id]) throw new Error(`unknown node ${id}`);
      return byId[id];
    },
  };
}

function neighbors(index) {
  const seen = [];
  for (const off of PEER_OFFSETS) {
    const n = (index + off) % POOL_SIZE;
    if (n !== index && !seen.includes(n)) seen.push(n);
  }
  seen.sort((a, b) => a - b);
  return seen;
}

function shortestNextHop(src) {
  const parent = Array(POOL_SIZE).fill(-1);
  parent[src] = src;
  const q = [src];
  while (q.length) {
    const cur = q.shift();
    for (const n of neighbors(cur)) {
      if (parent[n] === -1 && n !== src) {
        parent[n] = cur;
        q.push(n);
      }
    }
  }
  const nxt = Array(POOL_SIZE).fill(-1);
  for (let dst = 0; dst < POOL_SIZE; dst++) {
    if (dst === src) {
      nxt[dst] = src;
      continue;
    }
    if (parent[dst] === -1) {
      nxt[dst] = -1;
      continue;
    }
    let walk = dst;
    while (parent[walk] !== src) walk = parent[walk];
    nxt[dst] = walk;
  }
  return nxt;
}

function pathIndices(src, dst) {
  if (src === dst) return [src];
    const hops = [src];
    let cur = src;
    let guard = 0;
    while (cur !== dst) {
      const hop = shortestNextHop(cur)[dst];
    if (hop < 0 || hop === cur) throw new Error("no mesh path");
    hops.push(hop);
    cur = hop;
    guard += 1;
    if (guard > POOL_SIZE + 2) throw new Error("path too long");
  }
  return hops;
}

function expandCircuitPath(hopIndices) {
  if (!hopIndices.length) return [];
  const walk = [hopIndices[0]];
  for (let i = 0; i < hopIndices.length - 1; i++) {
    const seg = pathIndices(hopIndices[i], hopIndices[i + 1]);
    walk.push(...seg.slice(1));
  }
  return walk;
}

function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function sortedJson(obj) {
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(obj[k])).join(",") + "}";
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function digestReceipt(session_id, mirage_node, timestamp, integrity) {
  const payload = {
    integrity,
    mirage_node: Number(mirage_node),
    session_id,
    timestamp,
  };
  return sha256Hex(sortedJson(payload));
}

function evaluateIntegrity(nodeId, pool, closed) {
  if (closed || nodeId == null) return "FAIL";
  if (!pool.contains(nodeId)) return "FAIL";
  return "PASS";
}

function integrityForNumber(mirageNode, pool) {
  if (!Number.isInteger(mirageNode) || !pool.containsNumber(mirageNode)) return "FAIL";
  try {
    const node = pool.byNumber(mirageNode);
    if (!pool.contains(node.id)) return "FAIL";
  } catch {
    return "FAIL";
  }
  return "PASS";
}

async function mintReceipt(sessionId, node, timestamp, pool, closed = false) {
  const integrity = evaluateIntegrity(node.id, pool, closed);
  const hash = await digestReceipt(sessionId, node.number, timestamp, integrity);
  return { session_id: sessionId, mirage_node: node.number, timestamp, integrity, hash };
}

async function receiptFromDict(data) {
  const required = ["session_id", "mirage_node", "timestamp", "integrity"];
  const missing = required.filter((k) => !(k in data));
  if (missing.length) throw new Error(`receipt missing fields: ${missing}`);
  const mirage_node = Number(data.mirage_node);
  if (!Number.isInteger(mirage_node)) throw new Error("mirage_node must be an integer 1–25");
  const session_id = String(data.session_id);
  const timestamp = String(data.timestamp);
  const integrity = String(data.integrity);
  let stored = data.hash;
  if (stored == null) stored = await digestReceipt(session_id, mirage_node, timestamp, integrity);
  return { session_id, mirage_node, timestamp, integrity, hash: String(stored) };
}

async function hashOk(rec) {
  return (await digestReceipt(rec.session_id, rec.mirage_node, rec.timestamp, rec.integrity)) === rec.hash;
}

export async function verifyReceipt(rec, pool) {
  if (!(await hashOk(rec))) return "FAIL";
  const live = integrityForNumber(rec.mirage_node, pool);
  if (live === "FAIL") return "FAIL";
  if (rec.integrity !== "PASS") return "FAIL";
  return "PASS";
}

async function selectIndex(entropy, timestamp) {
  const tsBytes = new TextEncoder().encode(timestamp);
  const seed = new Uint8Array(entropy.length + tsBytes.length);
  seed.set(entropy, 0);
  seed.set(tsBytes, entropy.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", seed));
  let n = 0n;
  for (const b of digest) n = (n << 8n) + BigInt(b);
  return Number(n % BigInt(POOL_SIZE));
}

async function selectCircuitIndices(entropy, timestamp, hops = 3) {
  const chosen = [await selectIndex(entropy, timestamp)];
  const used = new Set(chosen);
  let salt = 0;
  const enc = new TextEncoder();
  while (chosen.length < hops) {
    const extra = enc.encode("|hop|");
    const saltB = new Uint8Array(4);
    new DataView(saltB.buffer).setUint32(0, salt);
    const seed = new Uint8Array(entropy.length + enc.encode(timestamp).length + extra.length + 4);
    let o = 0;
    seed.set(entropy, o); o += entropy.length;
    seed.set(enc.encode(timestamp), o); o += enc.encode(timestamp).length;
    seed.set(extra, o); o += extra.length;
    seed.set(saltB, o);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", seed));
    let n = 0n;
    for (const b of digest) n = (n << 8n) + BigInt(b);
    const idx = Number(n % BigInt(POOL_SIZE));
    if (!used.has(idx)) {
      chosen.push(idx);
      used.add(idx);
    }
    salt += 1;
    if (salt > 10000) throw new Error("unable to select distinct circuit hops");
  }
  return chosen;
}

function hex32() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function buildCircuit(entropy, timestamp, hops = 3) {
  const indices = await selectCircuitIndices(entropy, timestamp, hops);
  const path = expandCircuitPath(indices);
  const roles = indices.length === 1
    ? ["entry-exit"]
    : ["entry", ...Array(Math.max(0, indices.length - 2)).fill("middle"), "exit"];
  return {
    hops: indices.map((idx, i) => ({
      index: idx,
      node_id: nodeIdFor(idx),
      role: roles[i],
    })),
    path: path.map(nodeIdFor),
    entry: nodeIdFor(indices[0]),
    exit: nodeIdFor(indices[indices.length - 1]),
  };
}

export async function assign(body) {
  const pool = makePool(body && body.endpoints);
  const session_id = (body && body.session_id) || hex32();
  const timestamp = (body && body.timestamp) || utcNow();
  const entropy = crypto.getRandomValues(new Uint8Array(32));
  const hops = Number.isInteger(body && body.hops) ? body.hops : 3;
  const index = await selectIndex(entropy, timestamp);
  const node = pool.byIndex(index);
  const receipt = await mintReceipt(session_id, node, timestamp, pool, false);
  const circuit = await buildCircuit(entropy, timestamp, hops);
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    banner: BANNER,
    kind: "mesh-vpn-circuit",
    session_id,
    node_id: node.id,
    node_label: node.label,
    mirage_node: node.number,
    timestamp,
    circuit,
    receipt,
    note: "Control-plane assignment. Circuit mapping is in-request only. Packet forwarding runs in the local package (miragegrid vpn).",
  };
}

export function listNodes() {
  const pool = makePool();
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    banner: BANNER,
    nodes: pool.nodes.map((n) => ({ id: n.id, label: n.label, number: n.number, endpoint: n.endpoint })),
  };
}

export function meshView() {
  const pool = makePool();
  const adjacency = {};
  for (let i = 0; i < POOL_SIZE; i++) {
    adjacency[nodeIdFor(i)] = neighbors(i).map(nodeIdFor);
  }
  return {
    product: PRODUCT,
    version: VERSION,
    banner: BANNER,
    pool_size: POOL_SIZE,
    topology: "circulant-25-1-2-5",
    connected: true,
    peers: pool.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      index: n.index,
      number: n.number,
      endpoint: n.endpoint,
    })),
    adjacency,
  };
}

export function routeView(srcId, dstId) {
  const pool = makePool();
  const src = pool.byId(srcId).index;
  const dst = pool.byId(dstId).index;
  const path = pathIndices(src, dst).map(nodeIdFor);
  return {
    product: PRODUCT,
    version: VERSION,
    banner: BANNER,
    from: srcId,
    to: dstId,
    path,
  };
}

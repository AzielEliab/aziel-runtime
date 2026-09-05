/**
 * AzielTether engine (port of workers/download-tracker/src/runtime.js hash-chain).
 * Stateless prefer-central / peer-sync / reconcile. Not a VPN. Author: Aziel Eliab.
 */

export const PRODUCT = "azieltether";
export const VERSION = "0.1.0";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Prefer central. Peer when down. Reconcile on restore.";
export const ROLE = "central×decentral software tether";
export const GENESIS_PREV = "0".repeat(64);
export const LIMITATION =
  "THIS IS: a central×decentral node-mesh software tether. Prefer the Worker when up. Peer-sync hash-chained work when down. Reconcile on restore. Dual-chain on same-hash conflict. Lattice tips survive across GodLock, Aziel Digital Library, and product Workers. THIS IS NOT: a VPN, MirageGrid, a kernel, a truth score, a backdoor, or a mesh on godlock.uk. Public HTTPS boards stay mesh-free. The tether lives in the downloaded software. Author Aziel Eliab.";

export function canonicalJson(obj) {
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(obj[k])).join(",") + "}";
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bodyWithoutHash(item) {
  const out = {};
  for (const [k, v] of Object.entries(item || {})) {
    if (k !== "hash") out[k] = v;
  }
  return out;
}

export async function digestItem(item) {
  return sha256Hex(canonicalJson(bodyWithoutHash(item)));
}

export function asItems(body) {
  if (!body) return [];
  if (Array.isArray(body)) return body.filter((x) => x && typeof x === "object");
  if (typeof body === "string") {
    try {
      return asItems(JSON.parse(body));
    } catch {
      return [];
    }
  }
  if (Array.isArray(body.items)) return body.items.filter((x) => x && typeof x === "object");
  if (Array.isArray(body.chain)) return body.chain.filter((x) => x && typeof x === "object");
  if (body.hash || body.prev_hash) return [body];
  return [];
}

export function detectDualChain(items) {
  const byPrev = {};
  for (const item of items) {
    const prev = String(item.prev_hash || "");
    const digest = String(item.hash || "");
    if (!prev || !digest) continue;
    if (!byPrev[prev]) byPrev[prev] = [];
    if (!byPrev[prev].includes(digest)) byPrev[prev].push(digest);
  }
  const forks = [];
  for (const [prev, children] of Object.entries(byPrev)) {
    if (children.length > 1) forks.push({ prev_hash: prev, child_hashes: children });
  }
  return forks;
}

export async function verifyItems(items) {
  const errors = [];
  const known = {};
  const order = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const digest = item && item.hash;
    if (!digest) {
      errors.push("item " + i + ": missing hash");
      continue;
    }
    const recomputed = await digestItem(item);
    if (recomputed !== digest) errors.push("item " + i + ": hash mismatch");
    known[digest] = item;
    order.push(digest);
  }
  for (const [digest, item] of Object.entries(known)) {
    const prev = String(item.prev_hash || "");
    if (prev && prev !== GENESIS_PREV && !known[prev]) {
      errors.push(digest.slice(0, 12) + ": prev_hash not in store");
    }
  }
  const usedAsPrev = new Set(Object.values(known).map((it) => String(it.prev_hash || "")));
  const tips = order.filter((h) => !usedAsPrev.has(h));
  return {
    ok: errors.length === 0,
    items: Object.keys(known).length,
    errors,
    first_hash: order[0] || null,
    last_hash: order.length ? order[order.length - 1] : null,
    tip_hashes: tips.length ? tips : order.slice(-1),
    dual_chain: detectDualChain(items),
    winner: null,
    product: PRODUCT,
    version: VERSION,
    true_engine_runtime: true,
    stored: false,
    limitation: LIMITATION,
  };
}

export async function ingestOne(item) {
  const hasHash = Boolean(item && item.hash && item.prev_hash);
  let hashOk = false;
  if (hasHash) {
    hashOk = (await digestItem(item)) === item.hash;
  }
  return {
    product: PRODUCT,
    version: VERSION,
    author: AUTHOR,
    ok: hasHash && hashOk,
    accepted: hasHash && hashOk,
    stored: false,
    kv_increment: false,
    true_engine_runtime: true,
    hash: item && item.hash ? item.hash : null,
    scope: item && item.scope ? item.scope : null,
    note: "Zero retention ingest. Hash-chain item acknowledged only. Not a VPN.",
    limitation: LIMITATION,
  };
}

export async function ingest(body) {
  const items = asItems(body);
  if (!items.length) return { ...await ingestOne(body && typeof body === "object" ? body : {}), note: "Zero retention ingest. Empty or single item." };
  const results = [];
  for (const item of items) results.push(await ingestOne(item));
  return {
    product: PRODUCT,
    version: VERSION,
    ok: results.every((r) => r.ok),
    stored: false,
    true_engine_runtime: true,
    items: results,
    limitation: LIMITATION,
  };
}

export async function dualChain(body) {
  const items = asItems(body);
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    true_engine_runtime: true,
    stored: false,
    forks: detectDualChain(items),
    limitation: LIMITATION,
  };
}

export async function tip(body) {
  const verified = await verifyItems(asItems(body));
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    role: ROLE,
    true_engine_runtime: true,
    stored: false,
    tip_hashes: verified.tip_hashes,
    last_hash: verified.last_hash,
    dual_chain: verified.dual_chain,
    limitation: LIMITATION,
  };
}

export async function reconcile(body) {
  const verified = await verifyItems(asItems(body));
  return {
    ...verified,
    action: "reconcile",
    note: "Zero-retention reconcile of posted items. Central store is the hosted Worker, not this isolate.",
  };
}

export async function pulse(body) {
  const items = asItems(body);
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    true_engine_runtime: true,
    stored: false,
    items: items.length,
    dual_chain: detectDualChain(items),
    limitation: LIMITATION,
    note: "Pulse is a liveness / tip check. Not a VPN heartbeat.",
  };
}

export async function peerPreview(body) {
  const items = asItems(body);
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    true_engine_runtime: true,
    stored: false,
    peer_items: items.length,
    hashes: items.map((it) => it.hash || null),
    note: "Peer-preview only. Public HTTPS boards stay mesh-free. Not a VPN.",
    limitation: LIMITATION,
  };
}

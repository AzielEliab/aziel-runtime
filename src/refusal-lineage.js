/**
 * AZRT-REFUSAL-LINEAGE-1.0 — walk a refusal back through its upstream receipts.
 *
 * Twitter backlog RIB-057 (@read__the__diff). A refusal already stores at most
 * one hop (`follows.h` on a refusals stamp, `parent_receipt_id` on a session
 * receipt). This query walks every hop: refusal, then the receipts that one
 * names, then the receipts those name. `correlation_id` is recorded and is not
 * a hop. `prev_hash` / ChainLock `prev` is chain order and is not a hop.
 *
 * AZRT-ANCHOR-COVERAGE-1.0 also uses the label RIB-057 for per-refusal anchor
 * publish. That path is a different module. This walk does not publish anchors,
 * does not read COVERAGE_LIVE, and does not write.
 *
 * Cycle-safe. Bounded. Each visited receipt is checked against its hash.
 * Not signed. Not live. Cap-7 is not ICANN. Paid satellite stays HELD.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */
import { canonicalize, sha256Hex } from "./session-core.js";
import { stampSha256 } from "./chainlock/ops.js";
import { CAP7_LOCKS, PAID_SATELLITE_HELD } from "./qnm-honesty.js";

export const LINEAGE_SPEC = "AZRT-REFUSAL-LINEAGE-1.0";
export const LINEAGE_BACKLOG = "RIB-057";
export const LINEAGE_SOURCE = "@read__the__diff";
export const DEFAULT_MAX_HOPS = 32;
export const MAX_HOPS_CAP = 256;
export const LINEAGE_LIVE = false;
export const LINEAGE_SIGNED = false;

const HEX = /^[a-f0-9]{64}$/;
const ZERO = "0".repeat(64);
const ARRAY_KEYS = Object.freeze(["upstream", "upstream_receipts", "depends_on"]);
const NOTE =
  "Walk is refusal to upstream receipts by follows, parent_receipt_id, and explicit upstream hashes. correlation_id is recorded and is not a hop. prev_hash is chain order and is not a hop. The walk is cycle-safe and bounded. Each visited receipt is checked against its hash. Not signed. Not live. Cap-7 is not ICANN. Paid satellite stays HELD.";

function isHex(value) {
  return typeof value === "string" && HEX.test(value) && value !== ZERO;
}

function idOf(rec) {
  if (!rec || typeof rec !== "object") return null;
  if (isHex(rec.stamp_sha256)) return rec.stamp_sha256;
  if (isHex(rec.hash)) return rec.hash;
  if (isHex(rec.h)) return rec.h;
  return null;
}

function refusalCode(rec) {
  const raw =
    rec && rec.refusal && typeof rec.refusal === "object"
      ? rec.refusal.code
      : rec && rec.payload && rec.payload.refusal && typeof rec.payload.refusal === "object"
        ? rec.payload.refusal.code
        : null;
  return typeof raw === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : null;
}

export function isRefusalReceipt(rec) {
  if (!rec || typeof rec !== "object") return false;
  if (rec.k === "refusal" || rec.kind === "refusal" || rec.event === "refused") return true;
  if (rec.refusal && typeof rec.refusal === "object") return true;
  if (rec.payload && rec.payload.refusal && typeof rec.payload.refusal === "object") return true;
  return false;
}

function followsId(rec) {
  if (!rec || rec.follows == null) return null;
  if (typeof rec.follows === "string") return isHex(rec.follows) ? rec.follows : null;
  if (typeof rec.follows === "object" && isHex(rec.follows.h)) return rec.follows.h;
  return null;
}

function upstreamRefs(rec) {
  const out = [];
  const seen = new Set();
  const push = (id, via) => {
    if (!isHex(id)) return;
    const key = via + "\0" + id;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ id, via });
  };
  push(followsId(rec), "follows");
  if (isHex(rec.parent_receipt_id)) push(rec.parent_receipt_id, "parent_receipt_id");
  if (rec.payload && typeof rec.payload === "object" && isHex(rec.payload.parent_receipt_id)) {
    push(rec.payload.parent_receipt_id, "parent_receipt_id");
  }
  for (const key of ARRAY_KEYS) {
    const list = rec[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === "string") push(item, key);
      else if (item && typeof item === "object") push(item.h || item.hash || item.id, key);
    }
  }
  return out;
}

async function hashCheck(rec) {
  try {
    if (isHex(rec.stamp_sha256)) {
      const recomputed = await stampSha256(rec);
      return { ok: recomputed === rec.stamp_sha256, scheme: "chainlock" };
    }
    if (isHex(rec.hash)) {
      const unsigned = { ...rec };
      delete unsigned.hash;
      delete unsigned.signature;
      const recomputed = await sha256Hex(canonicalize(unsigned));
      return { ok: recomputed === rec.hash, scheme: "receipt" };
    }
  } catch {
    return { ok: false, scheme: "unreadable" };
  }
  return { ok: false, scheme: "absent" };
}

function chainPrev(rec) {
  if (isHex(rec.prev_hash)) return rec.prev_hash;
  if (isHex(rec.prev)) return rec.prev;
  return null;
}

function correlationOf(rec) {
  if (typeof rec.correlation_id !== "string") return null;
  const text = rec.correlation_id.trim();
  if (!text || text.length > 128) return null;
  return text;
}

function honesty() {
  return {
    spec: LINEAGE_SPEC,
    backlog_id: LINEAGE_BACKLOG,
    backlog_source: LINEAGE_SOURCE,
    distinct_from: "AZRT-ANCHOR-COVERAGE-1.0",
    live: LINEAGE_LIVE,
    signed: LINEAGE_SIGNED,
    cap7_is_icann: CAP7_LOCKS.public_icann === true || CAP7_LOCKS.cap7_public_icann === true,
    paid_sat: "HELD",
    paid_satellite_live: PAID_SATELLITE_HELD.live === true,
    correlation_id_is_hop: false,
    prev_hash_is_hop: false,
    writes: false,
  };
}

function finish(code, extra) {
  const ok = code === "LINEAGE-OK";
  return {
    ...honesty(),
    ok,
    verified: ok,
    code,
    note: NOTE,
    ...extra,
  };
}

/**
 * Walk upstream from one refusal. `receipts` is the corpus (session rows,
 * ChainLock stamps, or both). The query names `receipt_id` (hash) or `seq`.
 * @param {object[]} receipts
 * @param {{ receipt_id?: string, hash?: string, h?: string, seq?: number, chain?: string, max_hops?: number }} query
 */
export async function walkRefusalLineage(receipts, query = {}) {
  const list = Array.isArray(receipts) ? receipts : [];
  const maxHops = query.max_hops == null ? DEFAULT_MAX_HOPS : query.max_hops;
  if (!Number.isInteger(maxHops) || maxHops < 1 || maxHops > MAX_HOPS_CAP) {
    return finish("LINEAGE-BAD-BOUND", {
      max_hops: null,
      hops: 0,
      lineage: [],
      nodes: [],
      edges: [],
      unresolved: [],
      truncated: [],
      cycles: [],
      duplicates: [],
    });
  }

  const index = new Map();
  const duplicates = [];
  for (const rec of list) {
    const id = idOf(rec);
    if (!id) continue;
    if (index.has(id)) duplicates.push(id);
    else index.set(id, rec);
  }
  duplicates.sort();

  const asked =
    typeof query.receipt_id === "string"
      ? query.receipt_id
      : typeof query.hash === "string"
        ? query.hash
        : typeof query.h === "string"
          ? query.h
          : null;

  let startId = null;
  let startRec = null;
  if (asked) {
    if (!HEX.test(asked) || !index.has(asked)) {
      return finish("LINEAGE-NOT-FOUND", emptyWalk(maxHops, duplicates));
    }
    startId = asked;
    startRec = index.get(asked);
  } else if (query.seq != null) {
    if (!Number.isInteger(query.seq) || query.seq < 1) {
      return finish("LINEAGE-NOT-FOUND", emptyWalk(maxHops, duplicates));
    }
    const matches = [];
    for (const rec of list) {
      if (!rec || rec.seq !== query.seq || !idOf(rec)) continue;
      if (query.chain && rec.c !== query.chain && rec.chain !== query.chain) continue;
      matches.push(rec);
    }
    if (matches.length === 0) return finish("LINEAGE-NOT-FOUND", emptyWalk(maxHops, duplicates));
    if (matches.length > 1) {
      return finish("LINEAGE-AMBIGUOUS", {
        ...emptyWalk(maxHops, duplicates),
        candidates: matches.map((rec) => idOf(rec)).sort(),
      });
    }
    startRec = matches[0];
    startId = idOf(startRec);
  } else {
    return finish("LINEAGE-NO-QUERY", emptyWalk(maxHops, duplicates));
  }

  if (!isRefusalReceipt(startRec)) {
    const check = await hashCheck(startRec);
    return finish("LINEAGE-NOT-REFUSAL", {
      max_hops: maxHops,
      hops: 0,
      bound_hit: false,
      start: { id: startId, seq: startRec.seq ?? null },
      lineage: [startId],
      nodes: [nodeOf(startRec, { id: startId, depth: 0, via: null, hash_ok: check.ok, hash_scheme: check.scheme })],
      edges: [],
      unresolved: [],
      truncated: [],
      cycles: [],
      duplicates,
    });
  }

  const nodes = [];
  const edges = [];
  const unresolved = [];
  const truncated = [];
  const cycles = [];
  const seen = new Set();
  let hashFail = false;
  let boundHit = false;

  async function visit(id, via, depth, path) {
    if (depth > maxHops) {
      boundHit = true;
      truncated.push({ id, via, depth });
      return;
    }
    if (path.includes(id)) {
      cycles.push({ from: path[path.length - 1] || id, to: id, via, path: path.slice() });
      return;
    }
    if (seen.has(id)) return;
    const rec = index.get(id);
    if (!rec) {
      unresolved.push({ id, via, depth });
      return;
    }
    seen.add(id);
    const check = await hashCheck(rec);
    if (!check.ok) hashFail = true;
    nodes.push(nodeOf(rec, { id, depth, via, hash_ok: check.ok, hash_scheme: check.scheme }));
    const nextPath = path.concat(id);
    for (const edge of upstreamRefs(rec)) {
      edges.push({ from: id, to: edge.id, via: edge.via });
      if (edge.id === id) {
        cycles.push({ from: id, to: id, via: edge.via, path: nextPath });
        continue;
      }
      await visit(edge.id, edge.via, depth + 1, nextPath);
    }
  }

  await visit(startId, null, 0, []);

  let code = "LINEAGE-OK";
  if (hashFail) code = "LINEAGE-HASH";
  else if (cycles.length) code = "LINEAGE-CYCLE";
  else if (unresolved.length) code = "LINEAGE-MISSING";
  else if (duplicates.length) code = "LINEAGE-DUPLICATE";
  else if (boundHit) code = "LINEAGE-BOUND";

  const correlationIds = [];
  for (const node of nodes) {
    if (node.correlation_id && !correlationIds.includes(node.correlation_id)) correlationIds.push(node.correlation_id);
  }
  correlationIds.sort();

  return finish(code, {
    max_hops: maxHops,
    hops: nodes.length ? nodes.length - 1 : 0,
    depth: nodes.reduce((max, node) => Math.max(max, node.depth), 0),
    bound_hit: boundHit,
    start: { id: startId, seq: startRec.seq ?? null, refusal: true },
    lineage: nodes.map((node) => node.id),
    nodes,
    edges,
    unresolved,
    truncated,
    cycles,
    duplicates,
    correlation_ids: correlationIds,
  });
}

function emptyWalk(maxHops, duplicates) {
  return {
    max_hops: maxHops,
    hops: 0,
    bound_hit: false,
    lineage: [],
    nodes: [],
    edges: [],
    unresolved: [],
    truncated: [],
    cycles: [],
    duplicates,
  };
}

function nodeOf(rec, { id, depth, via, hash_ok, hash_scheme }) {
  return {
    id,
    depth,
    via,
    seq: Number.isInteger(rec.seq) ? rec.seq : null,
    refusal: isRefusalReceipt(rec),
    code: refusalCode(rec),
    hash_ok,
    hash_scheme,
    k: typeof rec.k === "string" ? rec.k : null,
    event: typeof rec.event === "string" ? rec.event : null,
    parent_receipt_id: isHex(rec.parent_receipt_id) ? rec.parent_receipt_id : null,
    follows: followsId(rec),
    correlation_id: correlationOf(rec),
    chain_prev: chainPrev(rec),
    chain_prev_is_hop: false,
  };
}

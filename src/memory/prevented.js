/**
 * RIB-053 / AKM-PREVENTED-EDGE-1.0: refusals as recallable "prevented" memory edges.
 *
 * - memory_observe { kind: "prevented", refusal_receipt_hash } reads the sealed refusal row on the
 *   internal `refusals` chain and stamps one learn-chain edge k=memory_prevented carrying only
 *   goal_hash, the refusal code and the refusal receipt hash (all taken from the sealed row; no caller
 *   text). The goal_hash is sha256(canonical({ spec, goal_key })) of the row's goal_key.
 * - memory_recall { goal_hash | goal_id } adds `prevented`: active edges for that goal, flagged
 *   prevented:true with the receipt hash so the caller can check it on the refusals chain.
 * - Retiring an edge is the existing additive memory_supersede / memory_revoke stamp naming the
 *   edge memory_id; it sets valid_to. The row is never deleted; history:true still returns it.
 * - verifyPreventedEdges fails closed when an edge cites a receipt hash that is not a refusal row on
 *   the refusals chain (or whose code / goal_hash differ). Wired into chainlock verify for `learn`.
 * - authorizes_action stays false: an edge informs recall; DecisionGATE / FragGate still decide.
 * Rows are hash-linked and sealed, not signed. Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "../session-core.js";

export const PREVENTED_SPEC = "AKM-PREVENTED-EDGE-1.0";
export const PREVENTED_KIND = "memory_prevented";
export const RETIRE_KINDS = Object.freeze(["memory_supersede", "memory_revoke"]);
const HEX64 = /^[a-f0-9]{64}$/;
const GOAL_RE = /^[A-Za-z0-9._:-]{1,80}$/;

export async function goalHashOfKey(goalKey) {
  return sha256Hex(canonicalize({ spec: PREVENTED_SPEC, goal_key: String(goalKey) }));
}

/** goal_hash from a recall request: goal_hash (64 hex) or goal_id (hashed like the refusal door; never stored). */
export async function recallGoalHash(src) {
  if (!src || typeof src !== "object") return null;
  if (src.goal_hash != null) {
    const h = String(src.goal_hash).toLowerCase();
    return HEX64.test(h) ? h : null;
  }
  const raw = typeof src.goal_id === "string" ? src.goal_id.trim() : "";
  if (raw && GOAL_RE.test(raw)) return goalHashOfKey("goal:" + (await sha256Hex(raw)).slice(0, 16));
  return null;
}

/** memory_id bound to receipt hash + goal_hash + code (AZBot B317-1: no squatting by receipt hash alone). */
export async function edgeMemoryId(receiptHash, goalHash, code) {
  return "mem_prev_" + (await sha256Hex(canonicalize({ spec: PREVENTED_SPEC, refusal_receipt_hash: String(receiptHash), goal_hash: String(goalHash), refusal_code: String(code) }))).slice(0, 32);
}

export function findRefusal(refusalRows, receiptHash) {
  return (refusalRows || []).find((r) => r && !r._broken && r.stamp_sha256 === receiptHash && r.k === "refusal" && r.refusal) || null;
}

/** Build the edge packet from the sealed refusal row. */
export async function preventedEdgeFrom(refusalRows, raw) {
  const hash = String((raw && raw.refusal_receipt_hash) || "").toLowerCase();
  if (!HEX64.test(hash)) return { ok: false, code: "AKM-PREVENTED-INVALID", message: "kind=prevented needs refusal_receipt_hash (64 hex, the stamp_sha256 of a refusals-chain row)." };
  const row = findRefusal(refusalRows, hash);
  if (!row) return { ok: false, code: "AKM-PREVENTED-NO-RECEIPT", message: "No sealed refusal row with that hash on the refusals chain. Nothing written." };
  if (!row.goal_key) return { ok: false, code: "AKM-PREVENTED-NO-GOAL", message: "That refusal row names no goal; a prevented edge needs a goal to be recalled by. Nothing written." };
  const goal_hash = await goalHashOfKey(row.goal_key);
  const refusal_code = String(row.refusal.code || "").slice(0, 80);
  if (raw.goal_hash != null && String(raw.goal_hash).toLowerCase() !== goal_hash) {
    return { ok: false, code: "AKM-PREVENTED-GOAL-MISMATCH", message: "goal_hash does not match the refusal row's goal. Nothing written." };
  }
  return {
    ok: true,
    edge: {
      memory_id: await edgeMemoryId(hash, goal_hash, refusal_code),
      kind: PREVENTED_KIND,
      edge_spec: PREVENTED_SPEC,
      goal_hash,
      refusal_code,
      refusal_receipt_hash: hash,
      refusal_chain: "refusals",
      authorizes_action: false,
    },
  };
}

/** Walk learn rows: every prevented edge with valid_from / valid_to (from the first retire stamp). */
export async function preventedEdges(learnRows) {
  const edges = new Map();
  for (const r of learnRows || []) {
    if (!r || r._broken) continue;
    const m = r.memory || {};
    // A row whose memory_id is not bound to its own (hash, goal, code) is never an edge (and fails verify).
    if (r.k === PREVENTED_KIND && m.edge_spec === PREVENTED_SPEC && !edges.has(m.memory_id) && m.memory_id === (await edgeMemoryId(m.refusal_receipt_hash, m.goal_hash, m.refusal_code))) {
      edges.set(m.memory_id, {
        memory_id: m.memory_id,
        prevented: true,
        goal_hash: m.goal_hash,
        refusal_code: m.refusal_code,
        refusal_receipt_hash: m.refusal_receipt_hash,
        stamp_sha256: r.stamp_sha256,
        valid_from: r.t || null,
        valid_to: null,
        retired_by: null,
        active: true,
        authorizes_action: false,
      });
    } else if (RETIRE_KINDS.includes(r.k) && edges.has(m.memory_id)) {
      const e = edges.get(m.memory_id);
      if (e.valid_to == null) {
        e.valid_to = r.t || null;
        e.retired_by = { k: r.k, stamp_sha256: r.stamp_sha256 };
        e.active = false;
      }
    }
  }
  return [...edges.values()];
}

export async function preventedFor(learnRows, goalHash, { history = false } = {}) {
  return (await preventedEdges(learnRows)).filter((e) => e.goal_hash === goalHash && (history || e.active));
}

/** Fail closed: each edge must cite a refusal row on the refusals chain with the same code and goal. */
export async function verifyPreventedEdges(learnRows, refusalRows) {
  const errors = [];
  const list = (learnRows || []).filter((r) => r && !r._broken);
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r.k !== PREVENTED_KIND) continue;
    n++;
    const m = r.memory || {};
    const row = HEX64.test(String(m.refusal_receipt_hash || "")) ? findRefusal(refusalRows, m.refusal_receipt_hash) : null;
    if (!row) {
      errors.push({ seq: i, code: "PREVENTED-RECEIPT-MISSING" });
      continue;
    }
    const want = row.goal_key ? await goalHashOfKey(row.goal_key) : null;
    if (m.goal_hash !== want || m.refusal_code !== String(row.refusal.code || "").slice(0, 80) || m.memory_id !== (await edgeMemoryId(m.refusal_receipt_hash, m.goal_hash, m.refusal_code)) || m.authorizes_action !== false) {
      errors.push({ seq: i, code: "PREVENTED-RECEIPT-MISMATCH" });
    }
  }
  return { spec: PREVENTED_SPEC, ok: errors.length === 0, edges: n, errors };
}

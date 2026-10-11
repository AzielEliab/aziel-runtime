/**
 * Store durability for AzNewsStore ("aznews-v1") and the 4DMap store ("4dmap-v1").
 *
 * AZRT-STORE-CHECKPOINT-1.0: every CP_EVERY rows, once the full walk from genesis
 * (AZNEWS-WALK-1.0) has verified them, the store signs a checkpoint with the tether
 * Ed25519 key: { chain, n, to_seq, tips at to_seq, prev_hash (previous checkpoint's
 * cp_hash; genesis for n=1), cp_hash }. Checkpoints link into their own chain and are
 * kept in the store forever (seen table, key cp:<n>). They ride every tether packet to
 * the copies, which check the signature, the chain link and that their own row at
 * to_seq carries the same tips, then re-walk their rows from genesis through each one.
 *
 * AZRT-STORE-SHARD-1.0 (checkpointed rollover): the ledger is cut into segments of
 * SEG_ROWS rows. A segment is relocated (never deleted) to its own Durable Object
 * instance "<store>~seg-<k>" only when all of it is inside the verified walk, a signed
 * checkpoint sits on its last row, and the head keeps at least SEG_MARGIN newer rows.
 * Relocation is bounded (SEG_BATCH rows per tick). The segment object re-checks every
 * row link and document hash as it receives them; only when its tip equals the signed
 * checkpoint tips does the head drop its own copy of those rows. Reads of relocated
 * rows are routed to the segment object, so no seq ever disappears.
 * No KV, no D1. Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "./session-core.js";
import { LATTICE_GENESIS } from "./dual-lattice.js";
import { tetherKey, signTetherPacket, tetherStatement } from "./azos-tether.js";

export const CP_SPEC = "AZRT-STORE-CHECKPOINT-1.0";
export const SHARD_SPEC = "AZRT-STORE-SHARD-1.0";
export const CP_EVERY = 1000;
export const CP_PER_TICK = 10;
export const SEG_ROWS = 10000;
export const SEG_MARGIN = 2000;
export const SEG_BATCH = 1000;

function b64urlBytes(text) {
  const s = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  try {
    const bin = atob(s + pad);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function cpHashOf(cp) {
  const { sig: _s, cp_hash: _h, ...body } = cp || {};
  return sha256Hex(canonicalize(body));
}

/** Verify one signed checkpoint against a public key (base64url raw Ed25519). */
export async function verifyCheckpointSig(publicKey, cp) {
  const raw = b64urlBytes(publicKey);
  const sig = b64urlBytes(cp && cp.sig);
  if (!raw || raw.length !== 32 || !sig || sig.length !== 64) return false;
  try {
    const key = await crypto.subtle.importKey("raw", raw, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, sig, new TextEncoder().encode(tetherStatement(cp)));
  } catch {
    return false;
  }
}

/**
 * Check a run of checkpoints: signature, hash, chain link, n and to_seq order, and
 * (when rowAt is given) that the row at to_seq carries the signed tips.
 * prev = { n, cp_hash, to_seq } of the last accepted checkpoint, or null.
 */
export async function checkCheckpoints(cps, { publicKey, prev = null, rowAt = null, every = CP_EVERY } = {}) {
  let last = prev || { n: 0, cp_hash: LATTICE_GENESIS, to_seq: 0 };
  for (const cp of cps || []) {
    if (!cp || cp.spec !== CP_SPEC) return { ok: false, reason: "checkpoint spec", n: cp && cp.n };
    if (cp.public_key !== publicKey) return { ok: false, reason: "checkpoint key is not the pinned key", n: cp.n };
    if (!(await verifyCheckpointSig(publicKey, cp))) return { ok: false, reason: "checkpoint signature does not verify", n: cp.n };
    if ((await cpHashOf(cp)) !== cp.cp_hash) return { ok: false, reason: "checkpoint hash does not recompute", n: cp.n };
    if (cp.n !== last.n + 1) return { ok: false, reason: "checkpoint n out of order", n: cp.n };
    if (cp.prev_hash !== last.cp_hash) return { ok: false, reason: "checkpoint does not link to the previous checkpoint", n: cp.n };
    if (cp.to_seq !== last.to_seq + every) return { ok: false, reason: "checkpoint to_seq out of order", n: cp.n };
    if (rowAt) {
      const row = await rowAt(cp.to_seq);
      if (row && (row.lattice.primary !== cp.tips.primary || row.lattice.secondary !== cp.tips.secondary)) return { ok: false, reason: "row at to_seq does not carry the signed tips", n: cp.n };
    }
    last = { n: cp.n, cp_hash: cp.cp_hash, to_seq: cp.to_seq };
  }
  return { ok: true, last };
}

/** Sign checkpoints up to the walk's verified_through. Bounded by CP_PER_TICK. */
export async function makeCheckpoints(repo, { chain, key, now = Date.now(), max = CP_PER_TICK } = {}) {
  if (!key) return { ok: false, code: "CP-KEY-ABSENT", made: 0 };
  const walk = await repo.metaGet("walk");
  if (!walk || (walk.breaks || []).length || !walk.from_genesis) return { ok: false, code: "CP-WALK-NOT-CLEAN", made: 0 };
  let tip = (await repo.metaGet("cp_tip")) || { n: 0, cp_hash: LATTICE_GENESIS, to_seq: 0 };
  const seen = {};
  let made = 0;
  while (made < max && tip.to_seq + CP_EVERY <= walk.verified_through) {
    const to = tip.to_seq + CP_EVERY;
    const row = await repo.rowGet(to);
    if (!row) return { ok: false, code: "CP-ROW-MISSING", at: to, made };
    const body = { spec: CP_SPEC, chain, n: tip.n + 1, to_seq: to, tips: { primary: row.lattice.primary, secondary: row.lattice.secondary }, prev_hash: tip.cp_hash, t: new Date(now).toISOString(), public_key: key.public_key, author: "Aziel Eliab" };
    const cp_hash = await cpHashOf(body);
    const signed = await signTetherPacket(key, { ...body, cp_hash });
    seen["cp:" + signed.n] = signed;
    tip = { n: signed.n, cp_hash, to_seq: to, t: signed.t };
    made += 1;
  }
  if (made) await repo.commit({ meta: { cp_tip: tip }, seen });
  return { ok: true, made, cp_tip: tip };
}

export async function checkpointsAfter(repo, n, { max = 20, throughSeq = Infinity } = {}) {
  const tip = await repo.metaGet("cp_tip");
  const out = [];
  if (!tip) return out;
  for (let i = n + 1; i <= tip.n && out.length < max; i++) {
    const cp = await repo.seenGet("cp:" + i);
    if (!cp || cp.to_seq > throughSeq) break;
    out.push(cp);
  }
  return out;
}

/* ------------------------------------------------------------ segments */

export function segName(base, k) {
  return `${base}~seg-${String(k).padStart(4, "0")}`;
}

export function segOf(seq) {
  return Math.floor((seq - 1) / SEG_ROWS) + 1;
}

/** Segment object side: accept contiguous rows, re-checking every link and document hash. */
export async function segPut(repo, { rows = [], anchor = null, k }, { verifyRows }) {
  const have = await repo.count();
  const start = (k - 1) * SEG_ROWS + 1;
  const expectSeq = have ? have + 1 : start;
  if (!rows.length) return { ok: false, code: "SEG-EMPTY" };
  if (rows[0].seq !== expectSeq) return { ok: false, code: "SEG-SEQ", expect: expectSeq, got: rows[0].seq, tip_seq: have };
  if (rows[rows.length - 1].seq > k * SEG_ROWS) return { ok: false, code: "SEG-RANGE" };
  let prev = anchor;
  if (have) {
    const last = await repo.rowGet(have);
    prev = { primary: last.lattice.primary, secondary: last.lattice.secondary };
  }
  if (!prev) return { ok: false, code: "SEG-ANCHOR" };
  const res = await verifyRows(rows, prev);
  if (!res.ok) return { ok: false, code: "SEG-VERIFY", reason: res.reason, seq: res.seq };
  await repo.commit({ rows, meta: { seg: { spec: SHARD_SPEC, k, from_seq: start, to_seq: k * SEG_ROWS } } });
  const tip = rows[rows.length - 1];
  return { ok: true, tip_seq: tip.seq, tips: { primary: tip.lattice.primary, secondary: tip.lattice.secondary } };
}

/**
 * Head side: one bounded relocation step. call(k, op, payload) reaches segment k.
 * dropRange(from, to) removes head rows only after the segment proved the signed tips.
 */
export async function relocateStep(repo, { call, dropRange, now = Date.now() } = {}) {
  const st = (await repo.metaGet("shard")) || { spec: SHARD_SPEC, floor: 0, segments: [], current: null };
  const walk = await repo.metaGet("walk");
  const cpTip = await repo.metaGet("cp_tip");
  const total = await repo.count();
  const k = segOf(st.floor + 1);
  const segEnd = k * SEG_ROWS;
  const ready = walk && !(walk.breaks || []).length && walk.verified_through >= segEnd && cpTip && cpTip.to_seq >= segEnd && total - segEnd >= SEG_MARGIN;
  if (!ready) return { ok: true, moved: 0, state: "waiting", floor: st.floor, next_segment: k };
  const cp = await repo.seenGet("cp:" + segEnd / CP_EVERY);
  if (!cp || cp.to_seq !== segEnd) return { ok: false, code: "SEG-CP-MISSING", floor: st.floor };
  const cur = st.current && st.current.k === k ? st.current : { k, sent_through: st.floor };
  if (cur.sent_through < segEnd) {
    const from = cur.sent_through + 1;
    const to = Math.min(segEnd, from + SEG_BATCH - 1);
    const rows = await repo.rowRange(from, to);
    let anchor = null;
    if (from === (k - 1) * SEG_ROWS + 1) {
      if (from === 1) anchor = { primary: LATTICE_GENESIS, secondary: LATTICE_GENESIS };
      else {
        const before = await repo.rowGet(from - 1);
        anchor = before ? { primary: before.lattice.primary, secondary: before.lattice.secondary } : null;
      }
    }
    const res = await call(k, "seg_put", { rows, anchor, k });
    if (!res || !res.ok) {
      // The segment may already hold these rows (a retried step): resume from its tip.
      if (res && res.code === "SEG-SEQ" && Number.isFinite(res.tip_seq) && res.tip_seq >= cur.sent_through) cur.sent_through = res.tip_seq;
      await repo.commit({ meta: { shard: { ...st, current: cur } } });
      return { ok: false, code: (res && res.code) || "SEG-CALL", floor: st.floor, current: cur };
    }
    cur.sent_through = res.tip_seq;
    if (cur.sent_through < segEnd) {
      await repo.commit({ meta: { shard: { ...st, current: cur } } });
      return { ok: true, moved: rows.length, state: "copying", floor: st.floor, current: cur };
    }
    if (res.tips.primary !== cp.tips.primary || res.tips.secondary !== cp.tips.secondary) {
      await repo.commit({ meta: { shard: { ...st, current: cur, mismatch: { k, at: new Date(now).toISOString() } } } });
      return { ok: false, code: "SEG-TIPS-MISMATCH", floor: st.floor };
    }
  }
  // Segment holds every row and its tip equals the signed checkpoint: drop the head copy.
  await dropRange((k - 1) * SEG_ROWS + 1, segEnd);
  const next = { ...st, floor: segEnd, current: null, segments: [...st.segments, { k, from_seq: (k - 1) * SEG_ROWS + 1, to_seq: segEnd, cp_n: cp.n, tips: cp.tips, sealed_at: new Date(now).toISOString() }] };
  await repo.commit({ meta: { shard: next } });
  return { ok: true, moved: 0, state: "sealed", segment: k, floor: segEnd };
}

/** Wrap a head repo so relocated seqs (<= floor) are read from their segment objects. */
export function routedRepo(repo, call) {
  const floorOf = async () => ((await repo.metaGet("shard")) || { floor: 0 }).floor || 0;
  return {
    ...repo,
    async rowGet(seq) {
      const floor = await floorOf();
      if (Number(seq) > floor) return repo.rowGet(seq);
      const out = await call(segOf(Number(seq)), "seg_rows", { from: Number(seq), to: Number(seq) });
      return out && out.ok && out.rows.length ? out.rows[0] : null;
    },
    async rowRange(from, to) {
      const floor = await floorOf();
      const out = [];
      let s = Number(from);
      while (s <= to && s <= floor) {
        const k = segOf(s);
        const end = Math.min(to, floor, k * SEG_ROWS);
        const r = await call(k, "seg_rows", { from: s, to: end });
        if (!r || !r.ok) return out;
        out.push(...r.rows);
        s = end + 1;
      }
      if (s <= to) out.push(...(await repo.rowRange(s, to)));
      return out;
    },
  };
}

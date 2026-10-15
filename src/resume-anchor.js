/**
 * RIB-044 / AZRT-RESUME-ANCHOR-1.0 (idea from @Madeactual): anchor-gated resume.
 *
 * Freeze (pause, or close) records freeze_head { chain:"session:<id>", seq, hash } and queues it as a
 * stamp on the ChainLock "session" chain, which the outside witness (AzielEliab/aziel-anchors) already
 * anchors on its next run. The runtime has no write path to the witness; it only reads the signed log.
 *
 * Resume (POST /resume, or the first exec in a cold isolate) recomputes the session chain and compares it
 * to the freeze head read back from the queued ChainLock row. A changed row or a missing tail refuses
 * RESUME-ANCHOR-MISMATCH and seals a `refused` receipt. Witness coverage is reported honestly:
 * anchor.level "witnessed" only when the newest witness statement covering the "session" chain reaches
 * the freeze stamp and still matches that ChainLock row; otherwise "not_checked" (never a pass). Strict
 * mode (policy resume_strict:true or body strict:true) refuses RESUME-ANCHOR-NOT-CHECKED.
 * Receipts are hash-linked and sealed, not signed. Author: Aziel Eliab.
 */
import { appendReceipt, canonicalize, sessionError, verifyChainStrict } from "./session-core.js";
import { anchoredThrough, loadAnchors } from "./anchor.js";

export const RESUME_SPEC = "AZRT-RESUME-ANCHOR-1.0";
export const FREEZE_CL_CHAIN = "session";
const FACT_RE = /^AZRT-RESUME-ANCHOR-1\.0 freeze (session:\S+) seq=(\d+) h=([0-9a-f]{64})$/;

export function freezeHeadOf(session) {
  const rs = (session && session.receipts) || [];
  const last = rs[rs.length - 1];
  if (!last) return null;
  return { chain: `session:${session.id}`, seq: Number(last.seq ?? rs.length), hash: last.hash };
}
export function freezeFact(fh) {
  return `${RESUME_SPEC} freeze ${fh.chain} seq=${fh.seq} h=${fh.hash}`;
}
export function parseFreezeFact(f) {
  const m = FACT_RE.exec(String(f || ""));
  return m ? { chain: m[1], seq: Number(m[2]), hash: m[3] } : null;
}

/** Session-keyed index in the ChainLock store: newest freeze stamp for session:<id>. */
export const RESUME_INDEX_PREFIX = "resume-anchor|";
export function resumeIndexKey(sessionId) {
  return `${RESUME_INDEX_PREFIX}session:${sessionId}`;
}

/**
 * Queue the freeze head for the next witness statement (ChainLock "session" stamp), then record it in
 * the session-keyed index (ChainLock store, not session storage). If either write fails, queued:false;
 * a later resume with CHAINLOCK bound treats that as RESUME-ANCHOR-MISMATCH (fail closed).
 */
export async function queueFreeze(env, freeze_head, { append, storeFor, reason = "pause" } = {}) {
  if (!env || !env.CHAINLOCK || typeof append !== "function") {
    return { queued: false, reason: "CHAINLOCK binding absent; freeze head not queued for the witness" };
  }
  try {
    const out = await append(env, { c: FREEZE_CL_CHAIN, s: "session freeze", f: freezeFact(freeze_head), k: "freeze" });
    if (!out || !out.ok) return { queued: false, reason: (out && (out.refuse || out.code)) || "append-failed" };
    const q = { queued: true, cl_chain: FREEZE_CL_CHAIN, cl_seq: Number(out.seq) + 1, stamp_sha256: out.stamp && out.stamp.stamp_sha256 };
    const store = typeof storeFor === "function" ? storeFor(env) : null;
    if (!store || typeof store.put !== "function") return { queued: false, reason: "ChainLock store absent; session-keyed index not written" };
    const sid = String(freeze_head.chain || "").replace(/^session:/, "");
    await store.put(resumeIndexKey(sid), { spec: RESUME_SPEC, cl_chain: FREEZE_CL_CHAIN, cl_seq: q.cl_seq, stamp_sha256: q.stamp_sha256, freeze_head, reason });
    return q;
  } catch (err) {
    return { queued: false, reason: String((err && err.message) || err).slice(0, 120) };
  }
}

/** The chain's own newest freeze/close row (the freeze truth when no ChainLock store is bound). */
export function chainFreezeOf(session) {
  const rs = (session && session.receipts) || [];
  for (let i = rs.length - 1; i >= 0; i--) {
    const r = rs[i];
    if (r && (r.event === "freeze" || r.event === "close")) return { chain: `session:${session.id}`, seq: Number(r.seq ?? i + 1), hash: r.hash, reason: r.event === "close" ? "close" : "pause" };
  }
  return null;
}

/** Caps for sealed resume-refusal rows after a freeze row (AZBot #291 review 2). */
export const RESUME_REFUSAL_MAX_ROWS = 16;
export const RESUME_REFUSAL_MAX_BYTES = 2048;
const REFUSAL_KEYS = ["code", "executed", "op", "resume", "spec", "status"];
const RESUME_KEYS = ["freeze_head", "reason", "spec"];
const sameKeys = (o, keys) => o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).sort().join(",") === keys.join(",");
export const NEWER_STAMP_SCAN_MAX = 256;
async function scanNewerStamp(store, fromSeq, chainName) {
  const meta = await store.chainMeta(FREEZE_CL_CHAIN).catch(() => null);
  if (!meta || !meta.ok) return { complete: false, reason: "ChainLock session meta unreadable; newer-stamp scan not done" };
  const head = Number(meta.seq) || 0;
  const to = Math.min(head, fromSeq + NEWER_STAMP_SCAN_MAX);
  let seq = fromSeq + 1;
  while (seq <= to) {
    const got = await store.chainRows(FREEZE_CL_CHAIN, seq, Math.min(100, to - seq + 1)).catch(() => null);
    if (!got || !got.ok || !Array.isArray(got.rows) || !got.rows.length) return { complete: false, reason: `ChainLock rows unreadable at seq ${seq}` };
    for (const { seq: rs, row } of got.rows) {
      const p = row ? parseFreezeFact(row.fact) : null;
      if (p && p.chain === chainName) return { complete: true, found: rs };
      seq = rs + 1;
    }
  }
  if (head > to) return { complete: false, reason: `more than ${NEWER_STAMP_SCAN_MAX} ChainLock rows after the freeze stamp; newer-stamp scan incomplete` };
  return { complete: true, found: null };
}
const isResumeRefusal = (r) => r && r.event === "refused" && r.payload && r.payload.refusal && r.payload.refusal.op === "resume";
/** Strict shape of a sealed resume refusal bound to this freeze head. */
export function resumeRefusalShapeOk(r, fh) {
  if (!r || r.event !== "refused" || !sameKeys(r.payload, ["refusal"])) return false;
  const f = r.payload.refusal;
  if (!sameKeys(f, REFUSAL_KEYS)) return false;
  if (f.spec !== "AZRT-REFUSAL-RECEIPT-1.0" || f.op !== "resume" || f.executed !== false || f.status !== 409) return false;
  if (f.code !== "RESUME-ANCHOR-MISMATCH" && f.code !== "RESUME-ANCHOR-NOT-CHECKED") return false;
  const x = f.resume;
  if (!sameKeys(x, RESUME_KEYS) || x.spec !== RESUME_SPEC || typeof x.reason !== "string" || x.reason.length > 160) return false;
  const h = x.freeze_head;
  if (!sameKeys(h, ["chain", "hash", "seq"]) || !fh || h.chain !== fh.chain || h.seq !== fh.seq || h.hash !== fh.hash) return false;
  return new TextEncoder().encode(canonicalize(r.payload)).length <= RESUME_REFUSAL_MAX_BYTES;
}
function trailingResumeRefusals(session) {
  const rs = (session && session.receipts) || [];
  let k = 0;
  for (let i = rs.length - 1; i >= 0 && isResumeRefusal(rs[i]); i--) k++;
  return k;
}

/** ChainLock rows from..to must recompute and link by prev; first must equal firstHash, last lastHash. */
async function walkLinks(store, from, to, firstHash, lastHash) {
  const { recomputeRowHash, rowHash, rowPrev, ROW_WALK_MAX } = await import("./anchor.js");
  if (to - from + 1 > ROW_WALK_MAX) return { ok: false, reason: `witnessed head is more than ${ROW_WALK_MAX} rows past the freeze stamp; walk not attempted` };
  let prev = null;
  let seq = from;
  while (seq <= to) {
    const got = await store.chainRows(FREEZE_CL_CHAIN, seq, Math.min(100, to - seq + 1)).catch(() => null);
    if (!got || !got.ok || !Array.isArray(got.rows) || !got.rows.length) return { ok: false, broken: true, reason: `ChainLock rows unreadable at seq ${seq}` };
    for (const { seq: rseq, row } of got.rows) {
      if (rseq !== seq) return { ok: false, broken: true, reason: `ChainLock row gap at seq ${seq}` };
      const h = rowHash(row);
      if (!h || (await recomputeRowHash(row)) !== h) return { ok: false, broken: true, reason: `ChainLock row ${seq} does not recompute` };
      if (prev === null ? h !== firstHash : rowPrev(row) !== prev) return { ok: false, broken: true, reason: `ChainLock link broken at seq ${seq}` };
      prev = h;
      seq++;
      if (seq > to) break;
    }
  }
  if (prev !== lastHash) return { ok: false, broken: true, reason: "walked head does not equal the witnessed head" };
  return { ok: true, rows: to - from + 1 };
}

/** Pause = freeze without closing. Appends a `freeze` receipt carrying freeze_head of the row before it. */
export async function applyPause(session, nowIso) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  if (session.closed) throw sessionError(409, "session_closed", "session is sealed; no further exec or policy");
  if (session.paused) throw sessionError(409, "SESSION-PAUSED", "session is already paused; POST /resume first");
  const prior = freezeHeadOf(session);
  const receipt = await appendReceipt(session, "freeze", { spec: RESUME_SPEC, reason: "pause", freeze_head: prior }, nowIso);
  session.paused = true;
  session.freeze = { spec: RESUME_SPEC, reason: "pause", freeze_head: freezeHeadOf(session), frozen_at: nowIso };
  session.updated_at = nowIso;
  return { session, receipt };
}

/**
 * Seal a minimal, fixed-shape resume refusal. While paused with CHAINLOCK bound, its hash is appended to
 * the session-keyed ChainLock index entry (refusals[]), so later checks accept exactly those rows.
 */
async function sealResumeRefusal(session, code, status, freezeHead, reason, nowIso, { store = null, idx = null } = {}) {
  if (session.closed) return { sealed: false, reason: "session is closed; the chain takes no further rows" };
  if (!freezeHead) return { sealed: false, reason: "no freeze head to bind the refusal to" };
  if (session.paused && trailingResumeRefusals(session) >= RESUME_REFUSAL_MAX_ROWS) return { sealed: false, reason: `resume refusal cap (${RESUME_REFUSAL_MAX_ROWS}) reached while paused` };
  const r = await appendReceipt(session, "refused", {
    refusal: { spec: "AZRT-REFUSAL-RECEIPT-1.0", code, status, op: "resume", executed: false, resume: { spec: RESUME_SPEC, freeze_head: { chain: freezeHead.chain, seq: freezeHead.seq, hash: freezeHead.hash }, reason: String(reason || "").slice(0, 160) } },
  }, nowIso, { attempt_link: { outcome: "failed" } });
  let indexed = false;
  if (session.paused && store && idx && typeof store.put === "function") {
    try {
      idx.refusals = [...(Array.isArray(idx.refusals) ? idx.refusals : []), r.hash];
      await store.put(resumeIndexKey(session.id), idx);
      indexed = true;
    } catch { indexed = false; }
  }
  return { sealed: true, seq: r.seq, hash: r.hash, indexed };
}

/**
 * Check a frozen session before it runs again. Returns { ok, anchor, ... } or throws a 409 after sealing
 * a refusal receipt (err.sessionDirty = true so the caller saves).
 *
 * Freeze truth (AZBot #291 review): with CHAINLOCK bound, the session-keyed ChainLock index
 * (resume-anchor|session:<id>) and the stamp row it names; without it, the chain's own last
 * freeze/close row. session.freeze and session.paused are session storage and are only cross-checked.
 */
export async function resumeCheck(session, env, { strict = false, allowNoFreeze = false, fetchImpl, storeFor, nowIso = new Date().toISOString() } = {}) {
  let sealHead = null;
  let store = null;
  let idx = null;
  const fail = async (code, detail, status = 409) => {
    const refused_receipt = await sealResumeRefusal(session, code, status, sealHead, detail && detail.reason, nowIso, { store, idx });
    const err = sessionError(status, code, code === "RESUME-ANCHOR-MISMATCH"
      ? "The session chain no longer matches its frozen head. Nothing ran."
      : "Strict resume: no witness statement covers this freeze head yet. Nothing ran.", { ok: false, spec: RESUME_SPEC, executed: false, ...detail, refused_receipt });
    err.sessionDirty = refused_receipt.sealed;
    throw err;
  };
  const rs = (session && session.receipts) || [];
  const fz = (session && session.freeze) || null;
  const chainFz = chainFreezeOf(session);
  store = env && env.CHAINLOCK && storeFor ? storeFor(env) : null;
  sealHead = fz && fz.freeze_head && typeof fz.freeze_head === "object" ? fz.freeze_head : null;
  if (store) {
    try { idx = (await store.get(resumeIndexKey(session.id))) || null; } catch { await fail("RESUME-ANCHOR-MISMATCH", { reason: "session-keyed ChainLock index unreadable" }); }
    if (idx && typeof idx !== "object") { idx = null; await fail("RESUME-ANCHOR-MISMATCH", { reason: "session-keyed ChainLock index malformed" }); }
  }
  if (!fz && !chainFz && !idx) {
    // Never frozen. Strict resume never accepts no_freeze; a cold exec of a never-frozen session may.
    if (strict && !allowNoFreeze) await fail("RESUME-ANCHOR-NOT-CHECKED", { reason: "strict resume: no freeze to check", anchor: { level: "no_freeze" } });
    return { ok: true, spec: RESUME_SPEC, checked: false, anchor: { level: "no_freeze" } };
  }
  // Fix 3: the chain (or ChainLock) has a freeze but session.freeze is gone -> mismatch.
  if (!fz) await fail("RESUME-ANCHOR-MISMATCH", { reason: idx ? "ChainLock has a freeze stamp for this session but session.freeze is missing" : "chain has a freeze row but session.freeze is missing" });
  if (!fz.freeze_head) await fail("RESUME-ANCHOR-MISMATCH", { reason: "session.freeze has no freeze_head" });
  let fh;
  let source;
  if (store) {
    // Fix 2: CHAINLOCK bound -> the freeze must have been queued.
    if (!fz.queue || fz.queue.queued !== true) await fail("RESUME-ANCHOR-MISMATCH", { reason: "CHAINLOCK is bound but the freeze queue is missing or queued:false", freeze_queue: fz.queue || null });
    // Fix 1: the session-keyed index is the truth.
    if (!idx) await fail("RESUME-ANCHOR-MISMATCH", { reason: "no session-keyed ChainLock stamp for this frozen session" });
    const got = await store.chainRow(FREEZE_CL_CHAIN, idx.cl_seq).catch(() => null);
    const row = got && got.row;
    const parsed = row ? parseFreezeFact(row.fact) : null;
    let rowOk = false;
    if (row && row.stamp_sha256 && row.stamp_sha256 === idx.stamp_sha256) {
      const { recomputeRowHash } = await import("./anchor.js");
      rowOk = (await recomputeRowHash(row)) === row.stamp_sha256;
    }
    if (!rowOk || !parsed || parsed.chain !== `session:${session.id}`) {
      await fail("RESUME-ANCHOR-MISMATCH", { reason: "queued freeze stamp missing or altered", freeze_queue: fz.queue });
    }
    if (fz.queue.cl_seq !== idx.cl_seq || fz.queue.stamp_sha256 !== idx.stamp_sha256) {
      await fail("RESUME-ANCHOR-MISMATCH", { reason: "session freeze queue differs from the session-keyed ChainLock index" });
    }
    if (parsed.seq !== fz.freeze_head.seq || parsed.hash !== fz.freeze_head.hash) {
      await fail("RESUME-ANCHOR-MISMATCH", { reason: "session freeze head differs from the queued stamp", freeze_head: parsed, session_freeze_head: fz.freeze_head });
    }
    fh = { ...parsed, reason: idx.reason || fz.reason };
    source = "chainlock";
  } else {
    if (!chainFz) await fail("RESUME-ANCHOR-MISMATCH", { reason: "session.freeze names a freeze row the chain does not have" });
    if (chainFz.seq !== fz.freeze_head.seq || chainFz.hash !== fz.freeze_head.hash) {
      await fail("RESUME-ANCHOR-MISMATCH", { reason: "session freeze head differs from the chain's last freeze row", freeze_head: chainFz, session_freeze_head: fz.freeze_head });
    }
    fh = chainFz;
    source = "chain";
  }
  sealHead = { chain: fh.chain, seq: fh.seq, hash: fh.hash };
  const v = await verifyChainStrict(rs);
  if (rs.length < fh.seq) await fail("RESUME-ANCHOR-MISMATCH", { reason: "missing tail", freeze_head: fh, rows: rs.length });
  const frow = rs[fh.seq - 1];
  if (!frow || frow.hash !== fh.hash || (frow.event !== "freeze" && frow.event !== "close")) await fail("RESUME-ANCHOR-MISMATCH", { reason: "row at freeze seq changed", freeze_head: fh });
  if (!v.ok) await fail("RESUME-ANCHOR-MISMATCH", { reason: "chain recompute failed", freeze_head: fh, errors: v.errors.slice(0, 5) });
  if (chainFz && chainFz.seq !== fh.seq) await fail("RESUME-ANCHOR-MISMATCH", { reason: "chain has a newer freeze row than the stamped freeze head", freeze_head: fh, chain_freeze: chainFz });
  // Fix 4: rows after the freeze row. Closed: none. Paused: none except sealed resume refusals.
  // Resumed: only resume refusals, then a `resume` receipt naming this freeze head, then normal rows.
  const tail = rs.slice(fh.seq);
  if (frow.event === "close") {
    if (tail.length) await fail("RESUME-ANCHOR-MISMATCH", { reason: "rows after the close freeze head", freeze_head: fh, extra_rows: tail.length });
  } else {
    let k = 0;
    while (k < tail.length && isResumeRefusal(tail[k])) k++;
    // Resume-refusal rows between the freeze and the resume: strict shape + caps always; with CHAINLOCK
    // their hashes must equal the index's refusals[] exactly (session storage cannot forge them).
    const refusalRows = tail.slice(0, k);
    if (refusalRows.length > RESUME_REFUSAL_MAX_ROWS) await fail("RESUME-ANCHOR-MISMATCH", { reason: "too many resume refusal rows after the freeze head" });
    if (refusalRows.some((x) => !resumeRefusalShapeOk(x, fh))) await fail("RESUME-ANCHOR-MISMATCH", { reason: "a resume refusal row after the freeze head is not a sealed refusal shape" });
    if (store) {
      const want = Array.isArray(idx.refusals) ? idx.refusals : [];
      const got = refusalRows.map((x) => x.hash);
      if (want.length !== got.length || want.some((h, i) => h !== got[i])) await fail("RESUME-ANCHOR-MISMATCH", { reason: "resume refusal rows differ from the ChainLock index" });
    }
    const resumeRow = tail[k] && tail[k].event === "resume" ? tail[k] : null;
    const names = resumeRow && resumeRow.payload && resumeRow.payload.freeze_head && resumeRow.payload.freeze_head.seq === fh.seq && resumeRow.payload.freeze_head.hash === fh.hash;
    if (session.paused) {
      if (k !== tail.length) await fail("RESUME-ANCHOR-MISMATCH", { reason: "rows appended while paused", freeze_head: fh, rows: rs.length, expected_rows: fh.seq + k });
    } else {
      if (!resumeRow || !names) await fail("RESUME-ANCHOR-MISMATCH", { reason: "session not paused but no resume receipt follows the freeze head", freeze_head: fh });
    }
  }
  // Should-fix: the index must name the NEWEST freeze stamp for this session. Scan ChainLock "session"
  // rows after it (bounded) for a newer stamp naming session:<id>.
  let newer_stamp_scan = null;
  if (store) {
    newer_stamp_scan = await scanNewerStamp(store, idx.cl_seq, `session:${session.id}`);
    if (newer_stamp_scan.found) await fail("RESUME-ANCHOR-MISMATCH", { reason: `index names an older freeze stamp; newer stamp at ChainLock seq ${newer_stamp_scan.found}` });
  }
  // Witness coverage (newest statement covering the session ChainLock chain).
  let anchor = { level: "not_checked", reason: "freeze head not queued to the witness" };
  if (store) {
    const st = await loadAnchors(fetchImpl).catch(() => null);
    const best = st && st.ok ? anchoredThrough(st.entries, FREEZE_CL_CHAIN) : null;
    if (!best) anchor = { level: "not_checked", reason: st && st.ok ? "no witness statement covers the session chain" : "witness log not readable" };
    else if (best.seq < idx.cl_seq) anchor = { level: "not_checked", reason: "newest witness statement predates the freeze head", anchored_seq: best.seq, freeze_cl_seq: idx.cl_seq, n: best.n };
    else {
      // Fix 5: walk every ChainLock link from the freeze stamp up to the witnessed head.
      const walk = await walkLinks(store, idx.cl_seq, best.seq, idx.stamp_sha256, best.h);
      if (!walk.ok && walk.broken) await fail("RESUME-ANCHOR-MISMATCH", { reason: `witnessed ChainLock path broken: ${walk.reason}`, anchored_seq: best.seq, n: best.n });
      if (!walk.ok) anchor = { level: "not_checked", reason: walk.reason, anchored_seq: best.seq, freeze_cl_seq: idx.cl_seq, n: best.n };
      else anchor = { level: "witnessed", n: best.n, statement_hash: best.statement_hash, anchored_seq: best.seq, freeze_cl_seq: idx.cl_seq, walked_rows: walk.rows };
    }
  }
  if (newer_stamp_scan && !newer_stamp_scan.complete) anchor = { level: "not_checked", reason: newer_stamp_scan.reason, newer_stamp_scan: "incomplete" };
  if (strict && anchor.level !== "witnessed") await fail("RESUME-ANCHOR-NOT-CHECKED", { reason: anchor.reason || "no witness statement covers this freeze head" });
  return { ok: true, spec: RESUME_SPEC, checked: true, freeze_head: { chain: fh.chain, seq: fh.seq, hash: fh.hash }, freeze_head_source: source, anchor, strict: Boolean(strict) };
}

/** Resume a paused session: check, then append a `resume` receipt that records the anchor level. */
export async function applyResume(session, env, opts = {}) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  if (session.closed) throw sessionError(409, "session_closed", "a closed session cannot be resumed; open a new session");
  const strict = opts.strict === true || (session.policy && session.policy.resume_strict === true);
  const check = await resumeCheck(session, env, { ...opts, strict });
  const receipt = await appendReceipt(session, "resume", { spec: RESUME_SPEC, freeze_head: check.freeze_head || null, anchor: check.anchor, strict }, opts.nowIso || new Date().toISOString());
  session.paused = false;
  session.updated_at = opts.nowIso || session.updated_at;
  return { session, receipt, check };
}

/**
 * AZRT-ANCHOR-COVERAGE-1.0 — Group A (RIB-057, RIB-058, RIB-059, RIB-061, RIB-062, RIB-063).
 *
 * Builds on AZRT-ANCHOR-1.0. The runtime still cannot write AzielEliab/aziel-anchors and still
 * has no witness signing key. Batch heads stay on GET /v1/anchor/heads. This module adds:
 *   - per-refusal publish of the refusals head into an outside anchor log before the refusal returns
 *     (RIB-057). If that log does not accept the head, the refusal seals ANCHOR-PENDING and verify flags it.
 *   - a cron verifier that seals one hash-linked row per slot, pass or fail (RIB-058). A skipped slot stays empty.
 *   - a deadline watchdog that pages from each check's own schedule and seals a miss (RIB-059).
 *   - an out-of-band heartbeat the chain writer and the runtime cannot write, read by an outside checker (RIB-061).
 *   - a kill-to-page drill: writer-death receipt to first named human ack, fail when the gap exceeds the budget
 *     even if the stop already fired (RIB-062, RIB-063).
 *
 * RIB-060 (heartbeat on the same chain) is not implemented.
 * Receipts are hash-linked and sealed, not signed. Not LIVE.
 * Cap-7 and .aziel are names only. Cap-7 is not ICANN. Paid satellite stays HELD.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { canonicalize, sha256Hex } from "./session-core.js";
import { anchorsKnown, anchoredThrough } from "./anchor.js";

export const COVERAGE_SPEC = "AZRT-ANCHOR-COVERAGE-1.0";
export const COVERAGE_CHAIN = "coverage";
export const ANCHOR_PENDING = "ANCHOR-PENDING";
export const PUBLISH_BUDGET_MS = 400;
export const VERIFIER_CHECK = "anchor-verify";
export const VERIFIER_EVERY_MS = 15 * 60 * 1000;
export const KILL_TO_PAGE_BUDGET_MS = 15 * 60 * 1000;
/** How many past slots a read or a tick will page. Older holes stay in the chain; a scan does not walk the epoch. */
export const LOOKBACK_SLOTS = 96;
/** RIB-060 is superseded. There is no same-chain heartbeat. */
export const SAME_CHAIN_HEARTBEAT = false;
/** Default. Live only when `coverageLive(env)` is true (code is present and COVERAGE_LIVE is explicitly on). */
export const LIVE = false;
/** Cos must not set COVERAGE_LIVE without Aziel OK. Missing, off, and any other string stay off. */
export const COVERAGE_LIVE_NOTE = "Cos must not turn COVERAGE_LIVE on without Aziel OK. Coverage ticks and refusal-path coverage rows stay off until that flag is explicitly on. Not LIVE until the code and the flag are both on. Cap-7 is not ICANN. Paid satellite stays HELD.";

export const HONESTY = Object.freeze({
  spec: COVERAGE_SPEC,
  live: false,
  signed: false,
  receipts: "hash-linked and sealed, not signed",
  same_chain_heartbeat: false,
  runtime_writes_witness_log: false,
  witness_repo: "AzielEliab/aziel-anchors",
  cap7: "names-only",
  cap7_is_icann: false,
  cap7_is_public_internet: false,
  paid_sat: "HELD",
  aziel_names: "names-only",
});

/** One schedule row per check. The deadline is that check's own, not a shared clock. */
export const COVERAGE_SCHEDULE = Object.freeze([
  Object.freeze({ check: VERIFIER_CHECK, every_ms: VERIFIER_EVERY_MS, deadline_ms: VERIFIER_EVERY_MS }),
]);

const NAME_RE = /^[a-z0-9._-]{1,40}$/;

/**
 * Coverage cron gate. Default OFF. True only for an explicit on: true, 1, "1", "true", "yes", "on".
 * "live", "false", "off", "0", and a missing var do not arm the tick.
 */
export function coverageLive(env) {
  const v = env && (env.COVERAGE_LIVE != null ? env.COVERAGE_LIVE : env.coverage_live);
  if (v === true || v === 1) return true;
  const s = String(v == null ? "" : v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

let outsideLog = null;

export function setOutsideAnchorLog(log) {
  outsideLog = log || null;
}

export function currentOutsideAnchorLog() {
  return outsideLog;
}

export function slotId(now, every) {
  const e = Number(every);
  const t = Number(now);
  if (!(e > 0) || !Number.isFinite(t)) return -1;
  return Math.floor(t / e);
}

/** Highest slot whose own deadline has already passed. The open slot is not due yet. */
export function latestDueSlot(now, check) {
  const every = Number(check && check.every_ms);
  const deadline = Number(check && check.deadline_ms);
  const t = Number(now);
  if (!(every > 0) || !(deadline > 0) || !Number.isFinite(t)) return -1;
  return Math.floor((t - deadline) / every);
}

export function batchAnchorSeq() {
  const known = anchorsKnown();
  if (!known || !known.ok) return 0;
  const best = anchoredThrough(known.entries, "refusals");
  return best && best.seq ? best.seq : 0;
}

/** Witness statement whose refusals head is exactly this seq and hash (batch log, not a new signature). */
export function witnessHasRefusalHead(seq, h) {
  const known = anchorsKnown();
  if (!known || !known.ok) return false;
  const best = anchoredThrough(known.entries, "refusals");
  return Boolean(best && best.seq === seq && best.h === h);
}

/**
 * Append-only anchor log the ChainLock writer does not hold.
 * Hash-linked, not signed. The first hash for a (chain, seq) wins; a different hash is refused.
 */
export function createOutsideAnchorLog() {
  const entries = [];
  return {
    kind: "outside-anchor-log",
    spec: COVERAGE_SPEC,
    signed: false,
    writable_by_chain_writer: false,
    writable_by_runtime_witness_key: false,
    list() {
      return entries.slice();
    },
    async append({ chain = "refusals", seq, h, at, kind = "per-refusal" } = {}) {
      const s = Number(seq);
      if (!Number.isInteger(s) || s < 1 || typeof h !== "string" || !/^[a-f0-9]{64}$/.test(h)) {
        return { ok: false, code: "ANCHOR-BAD-QUERY", written: false };
      }
      const existing = entries.find((e) => e.chain === chain && e.seq === s);
      if (existing) {
        if (existing.h === h) return { ok: true, replayed: true, written: false, ...existing };
        return { ok: false, code: "ANCHOR-MISMATCH", written: false, kept: existing.h, refused_h: h, seq: s, chain };
      }
      const prev = entries.length ? entries[entries.length - 1].entry_hash : "0".repeat(64);
      const body = {
        spec: COVERAGE_SPEC,
        n: entries.length + 1,
        prev,
        chain,
        seq: s,
        h,
        at: at || new Date().toISOString(),
        kind,
        signed: false,
        live: false,
      };
      const entry_hash = await sha256Hex(canonicalize(body));
      const row = { ...body, entry_hash };
      entries.push(row);
      return { ok: true, written: true, replayed: false, ...row };
    },
  };
}

export async function verifyOutsideLog(entries) {
  const rows = Array.isArray(entries) ? entries : [];
  let prev = "0".repeat(64);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.signed !== false) return { ok: false, code: "ANCHOR-MISMATCH", at: i + 1, reason: "not-sealed-unsigned" };
    const { entry_hash, ...body } = row;
    if (Number(body.n) !== i + 1 || body.prev !== prev) return { ok: false, code: "ANCHOR-ORDER-BREAK", at: i + 1 };
    const again = await sha256Hex(canonicalize(body));
    if (again !== entry_hash) return { ok: false, code: "ANCHOR-MISMATCH", at: i + 1, reason: "entry-hash" };
    prev = entry_hash;
  }
  return { ok: true, n: rows.length, signed: false };
}

/**
 * Publish one refusals head. Returns only after the outside log has accepted it,
 * or after the witness log already has this exact head, or as ANCHOR-PENDING.
 */
export async function publishRefusalHead({ seq, h, at, log = null, budgetMs = PUBLISH_BUDGET_MS } = {}) {
  const base = { spec: COVERAGE_SPEC, seq, h, signed: false, live: false };
  if (witnessHasRefusalHead(seq, h)) return { ...base, status: "anchored", code: "ANCHOR-OK", in_log: true, via: "witness" };
  if (log && typeof log.append === "function") {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ ok: false, code: ANCHOR_PENDING, timed_out: true }), Math.max(0, budgetMs));
    });
    let put;
    try {
      put = await Promise.race([Promise.resolve().then(() => log.append({ chain: "refusals", seq, h, at, kind: "per-refusal" })), timeout]);
    } catch {
      put = { ok: false, code: ANCHOR_PENDING };
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (put && put.ok) {
      return { ...base, status: "anchored", code: "ANCHOR-OK", in_log: true, via: "outside-log", n: put.n, entry_hash: put.entry_hash, replayed: Boolean(put.replayed) };
    }
    if (put && put.code === "ANCHOR-MISMATCH") {
      return { ...base, status: "refused", code: "ANCHOR-MISMATCH", in_log: false, kept: put.kept };
    }
  }
  return { ...base, status: ANCHOR_PENDING, code: ANCHOR_PENDING, in_log: false };
}

export async function sealCoverage(store, { k, fact, coverage, idempotency_key }) {
  const { append } = await import("./chainlock/ops.js");
  return append(store, {
    c: COVERAGE_CHAIN,
    k,
    s: String(k || "coverage").slice(0, 80),
    f: String(fact || "").slice(0, 160),
    coverage,
    idempotency_key,
  }, { internal: true });
}

/**
 * After a refusal row is sealed: wait for the outside log, or seal ANCHOR-PENDING.
 * COVERAGE_LIVE off: no outside-log append and no coverage-chain row. The refusal row
 * on `refusals` is already committed and is left alone.
 */
export async function finishRefusalAnchor(store, { seq, h, at = new Date().toISOString(), log = currentOutsideAnchorLog(), env = null } = {}) {
  if (!coverageLive(env)) {
    return {
      spec: COVERAGE_SPEC,
      seq,
      h,
      status: "COVERAGE-LIVE-OFF",
      code: "COVERAGE-LIVE-OFF",
      in_log: false,
      pending_sealed: false,
      written: false,
      coverage_live: false,
      signed: false,
      live: false,
    };
  }
  const pub = await publishRefusalHead({ seq, h, at, log });
  if (pub.status !== ANCHOR_PENDING) return { ...pub, pending_sealed: false };
  let pending = null;
  try {
    pending = await sealCoverage(store, {
      k: "anchor_pending",
      fact: `ANCHOR-PENDING refusals seq ${seq}`,
      coverage: {
        spec: COVERAGE_SPEC,
        kind: "anchor_pending",
        code: ANCHOR_PENDING,
        chain: "refusals",
        seq,
        h,
        signed: false,
        live: false,
      },
      idempotency_key: `anchor-pending:refusals:${seq}:${h}`,
    });
  } catch {
    pending = null;
  }
  return { ...pub, pending_sealed: Boolean(pending && pending.ok), pending_seq: pending && pending.ok ? pending.seq + 1 : null };
}

function isRoutineRefusal(row) {
  const kind = row && row.refusal && row.refusal.kind;
  return kind === "auth_rollup";
}

/**
 * Refusals written since the last batch anchor must match the outside log.
 * A missing log entry is flagged ANCHOR-PENDING. A different hash is ANCHOR-MISMATCH.
 * Routine rows (not k=refusal, and auth rollup counts) stay on the batch path.
 */
export function verifyRefusalsSinceBatch(rows, { batchThroughSeq = 0, logEntries = [] } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const flags = [];
  const breaks = [];
  const batch = Number(batchThroughSeq) || 0;
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const seq = i + 1;
    if (seq <= batch) continue;
    if (!row || row.k !== "refusal" || isRoutineRefusal(row)) continue;
    const h = row.stamp_sha256 || row.hash || null;
    const entry = (logEntries || []).find((e) => e && e.chain === "refusals" && e.seq === seq);
    if (!entry) {
      flags.push({ seq, h, code: ANCHOR_PENDING });
      continue;
    }
    if (entry.h !== h) breaks.push({ seq, code: "ANCHOR-MISMATCH", anchored_h: entry.h, runtime_h: h });
  }
  const ok = breaks.length === 0 && flags.length === 0;
  return {
    spec: COVERAGE_SPEC,
    ok,
    signed: false,
    live: false,
    batch_through_seq: batch,
    flags,
    breaks,
    pending: flags.length > 0,
    code: breaks.length ? "ANCHOR-MISMATCH" : flags.length ? ANCHOR_PENDING : "ANCHOR-OK",
  };
}

export function verifierGaps(rows, { check, fromSlot, toSlot }) {
  const have = new Set();
  for (const row of rows || []) {
    const c = row && row.coverage;
    if (row && row.k === "verifier" && c && c.check === check && Number.isInteger(c.slot)) have.add(c.slot);
  }
  const missing = [];
  const from = Number(fromSlot);
  const to = Number(toSlot);
  if (!Number.isInteger(from) || !Number.isInteger(to)) return missing;
  for (let s = from; s <= to; s++) if (!have.has(s)) missing.push(s);
  return missing;
}

export function pagesForSchedule({ schedule = COVERAGE_SCHEDULE, rows = [], now = Date.now() } = {}) {
  const pages = [];
  for (const check of schedule || []) {
    const mine = (rows || []).filter((r) => r && r.k === "verifier" && r.coverage && r.coverage.check === check.check && Number.isInteger(r.coverage.slot));
    if (!mine.length) continue;
    const minSlot = mine.reduce((m, r) => Math.min(m, r.coverage.slot), Infinity);
    const due = latestDueSlot(now, check);
    const from = Math.max(minSlot, due - LOOKBACK_SLOTS + 1);
    for (let s = from; s <= due; s++) {
      if (!mine.some((r) => r.coverage.slot === s)) {
        pages.push({
          spec: COVERAGE_SPEC,
          kind: "page",
          code: "COVERAGE-PAGE",
          check: check.check,
          slot: s,
          every_ms: check.every_ms,
          deadline_ms: check.deadline_ms,
          due_at: s * check.every_ms + check.deadline_ms,
          at: now,
          live: false,
          signed: false,
        });
      }
    }
  }
  return pages;
}

export async function runVerifierSlot({ store, now = Date.now(), log = currentOutsideAnchorLog(), writer = null, batchThroughSeq = null, check = VERIFIER_CHECK, everyMs = VERIFIER_EVERY_MS, deadlineMs = VERIFIER_EVERY_MS } = {}) {
  if (writer && typeof writer.alive === "function" && !writer.alive()) {
    return { ok: false, code: "WRITER-DEAD", result: "fail", written: false, sealed: false, live: false };
  }
  if (!store) return { ok: false, code: "COVERAGE-STORE-UNBOUND", result: "fail", written: false, sealed: false, live: false };
  const slot = slotId(now, everyMs);
  const { loadChain } = await import("./chainlock/ops.js");
  const refusals = await loadChain(store, "refusals");
  const batch = batchThroughSeq == null ? batchAnchorSeq() : batchThroughSeq;
  const logEntries = log && typeof log.list === "function" ? log.list() : [];
  let result = "fail";
  let code = "COVERAGE-LOG-UNBOUND";
  let detail = null;
  if (!log) {
    result = "fail";
    code = "COVERAGE-LOG-UNBOUND";
  } else {
    const logOk = await verifyOutsideLog(logEntries);
    detail = verifyRefusalsSinceBatch(refusals, { batchThroughSeq: batch, logEntries });
    if (!logOk.ok) {
      result = "fail";
      code = logOk.code;
    } else if (!detail.ok) {
      result = "fail";
      code = detail.code;
    } else {
      result = "pass";
      code = "ANCHOR-OK";
    }
  }
  const sealed = await sealCoverage(store, {
    k: "verifier",
    fact: `${check} slot ${slot} ${result}`,
    coverage: {
      spec: COVERAGE_SPEC,
      kind: "verifier",
      check,
      slot,
      result,
      code,
      every_ms: everyMs,
      deadline_ms: deadlineMs,
      due_at: slot * everyMs + deadlineMs,
      batch_through_seq: batch,
      signed: false,
      live: false,
    },
    idempotency_key: `verifier:${check}:${slot}`,
  });
  return {
    ok: Boolean(sealed && sealed.ok),
    spec: COVERAGE_SPEC,
    check,
    slot,
    result,
    code,
    written: Boolean(sealed && sealed.ok && !sealed.replayed),
    replayed: Boolean(sealed && sealed.replayed),
    sealed: Boolean(sealed && sealed.ok),
    h: sealed && sealed.stamp ? sealed.stamp.stamp_sha256 : null,
    live: false,
    signed: false,
    detail,
  };
}

export async function runDeadlineWatchdog({ store, now = Date.now(), schedule = COVERAGE_SCHEDULE } = {}) {
  if (!store) return { ok: false, code: "COVERAGE-STORE-UNBOUND", pages: [], misses: [], live: false };
  const { loadChain } = await import("./chainlock/ops.js");
  const rows = await loadChain(store, COVERAGE_CHAIN);
  const pages = pagesForSchedule({ schedule, rows, now });
  const misses = [];
  for (const page of pages) {
    const sealed = await sealCoverage(store, {
      k: "miss",
      fact: `miss ${page.check} slot ${page.slot}`,
      coverage: {
        spec: COVERAGE_SPEC,
        kind: "miss",
        code: "COVERAGE-MISS",
        check: page.check,
        slot: page.slot,
        every_ms: page.every_ms,
        deadline_ms: page.deadline_ms,
        due_at: page.due_at,
        signed: false,
        live: false,
      },
      idempotency_key: `miss:${page.check}:${page.slot}`,
    });
    misses.push({
      check: page.check,
      slot: page.slot,
      sealed: Boolean(sealed && sealed.ok),
      h: sealed && sealed.stamp ? sealed.stamp.stamp_sha256 : null,
      code: "COVERAGE-MISS",
    });
  }
  return { ok: true, spec: COVERAGE_SPEC, live: false, signed: false, pages, misses };
}

export async function runCoverageTick({ store, now = Date.now(), log = currentOutsideAnchorLog(), writer = null, schedule = COVERAGE_SCHEDULE, batchThroughSeq = null } = {}) {
  const anchor = (schedule || []).find((c) => c.check === VERIFIER_CHECK) || COVERAGE_SCHEDULE[0];
  const verifier = await runVerifierSlot({
    store,
    now,
    log,
    writer,
    batchThroughSeq,
    check: anchor.check,
    everyMs: anchor.every_ms,
    deadlineMs: anchor.deadline_ms,
  });
  const watchdog = await runDeadlineWatchdog({ store, now, schedule });
  return {
    ok: Boolean(verifier && verifier.sealed) && Boolean(watchdog && watchdog.ok),
    spec: COVERAGE_SPEC,
    live: false,
    signed: false,
    same_chain_heartbeat: SAME_CHAIN_HEARTBEAT,
    verifier,
    watchdog,
  };
}

/** Heartbeat shelf the chain writer and the runtime cannot write. The outside checker only reads it. */
export function createOutsideShelf() {
  const beats = [];
  return {
    kind: "outside-heartbeat",
    spec: COVERAGE_SPEC,
    writable_by_chain_writer: false,
    writable_by_runtime: false,
    signed: false,
    list() {
      return beats.slice();
    },
    latest() {
      return beats.length ? beats[beats.length - 1] : null;
    },
    async beatAs(role, beat = {}) {
      if (role === "chain-writer" || role === "runtime" || role === "runtime-writer") {
        return { ok: false, code: "DEADMAN-WRITER-REFUSED", written: false, spec: COVERAGE_SPEC };
      }
      if (role !== "outside-watchdog") return { ok: false, code: "DEADMAN-ROLE-REFUSED", written: false, spec: COVERAGE_SPEC };
      const at = Number(beat.at);
      if (!Number.isFinite(at)) return { ok: false, code: "DEADMAN-BAD-BEAT", written: false };
      const row = { n: beats.length + 1, at, writer_id: "outside-watchdog" };
      beats.push(row);
      return { ok: true, written: true, spec: COVERAGE_SPEC, ...row };
    },
  };
}

/** The Worker calls this and it does not write. RIB-061: the runtime has no heartbeat credential. */
export function workerHeartbeatAttempt(shelf) {
  if (!shelf || typeof shelf.beatAs !== "function") return { ok: false, code: "DEADMAN-WRITER-REFUSED", written: false, spec: COVERAGE_SPEC };
  return shelf.beatAs("runtime", { at: Date.now() });
}

/** Outside checker. It does not take a chain store and it does not write the runtime. */
export function checkDeadman(shelf, { now = Date.now(), deadline_ms } = {}) {
  const beat = shelf && typeof shelf.latest === "function" ? shelf.latest() : null;
  const deadline = Number(deadline_ms);
  const absent = !beat || !Number.isFinite(Number(beat.at)) || !(Number(beat.at) <= now) || !(deadline > 0) || now - Number(beat.at) > deadline;
  if (absent) {
    return {
      ok: false,
      page: true,
      code: "DEADMAN-ABSENT",
      spec: COVERAGE_SPEC,
      live: false,
      signed: false,
      checker: "outside",
      age_ms: beat && Number.isFinite(Number(beat.at)) ? now - Number(beat.at) : null,
    };
  }
  return { ok: true, page: false, code: "DEADMAN-OK", spec: COVERAGE_SPEC, live: false, signed: false, checker: "outside" };
}

export function createWriter() {
  let alive = true;
  let death = null;
  return {
    alive: () => alive,
    death: () => death,
    async kill({ store, at = Date.now() } = {}) {
      if (!alive) return { ok: false, code: "WRITER-DEAD", written: false, death, live: false };
      const sealed = await sealCoverage(store, {
        k: "writer_death",
        fact: "heartbeat writer killed on purpose",
        coverage: { spec: COVERAGE_SPEC, kind: "writer_death", at, signed: false, live: false },
        idempotency_key: `writer-death:${at}`,
      });
      death = {
        at,
        h: sealed && sealed.stamp ? sealed.stamp.stamp_sha256 : null,
        seq: sealed && sealed.ok ? sealed.seq + 1 : null,
        sealed: Boolean(sealed && sealed.ok),
      };
      alive = false;
      return { ok: Boolean(sealed && sealed.ok), code: sealed && sealed.ok ? "WRITER-KILLED" : "WRITER-DEATH-UNSEALED", death, written: Boolean(sealed && sealed.ok), live: false };
    },
  };
}

export async function sealHumanAck(store, { at, name, death_h }) {
  if (!NAME_RE.test(String(name || ""))) return { ok: false, code: "ACK-NAME-REFUSED", written: false, live: false };
  if (typeof death_h !== "string" || !/^[a-f0-9]{64}$/.test(death_h)) return { ok: false, code: "ACK-DEATH-REFUSED", written: false, live: false };
  const sealed = await sealCoverage(store, {
    k: "human_ack",
    fact: `human ack ${name}`,
    coverage: {
      spec: COVERAGE_SPEC,
      kind: "human_ack",
      at,
      name,
      death_h,
      signed: false,
      live: false,
      not_a_read_receipt: true,
    },
    idempotency_key: `human-ack:${death_h}:${name}`,
  });
  return {
    ok: Boolean(sealed && sealed.ok),
    code: sealed && sealed.ok ? "ACK-SEALED" : "ACK-UNSEALED",
    at,
    name,
    h: sealed && sealed.stamp ? sealed.stamp.stamp_sha256 : null,
    written: Boolean(sealed && sealed.ok && !sealed.replayed),
    live: false,
    signed: false,
  };
}

/**
 * Kill-to-page. The stop (page) firing does not pass the test.
 * Fail when the gap from the writer-death receipt to the first human ack exceeds the budget.
 */
export function killToPage({ deathAt, ackAt = null, pageFired = false, budgetMs = KILL_TO_PAGE_BUDGET_MS } = {}) {
  const budget = Number(budgetMs);
  if (!(budget > 0) || !Number.isFinite(budget)) return { ok: false, code: "KILL-BUDGET-INVALID", page_fired: Boolean(pageFired), live: false };
  if (!pageFired) return { ok: false, code: "KILL-STOP-NOT-FIRED", page_fired: false, live: false };
  if (ackAt == null || !Number.isFinite(Number(ackAt))) return { ok: false, code: "KILL-NO-ACK", page_fired: true, live: false };
  const gap = Number(ackAt) - Number(deathAt);
  if (!Number.isFinite(gap) || gap < 0) return { ok: false, code: "KILL-ACK-BEFORE-DEATH", page_fired: true, gap_ms: gap, live: false };
  if (gap > budget) return { ok: false, code: "KILL-TO-PAGE-OVER-BUDGET", page_fired: true, gap_ms: gap, budget_ms: budget, live: false };
  return { ok: true, code: "KILL-TO-PAGE-OK", page_fired: true, gap_ms: gap, budget_ms: budget, live: false, signed: false };
}

export async function runKillToPageDrill({ store, shelf, deathAt = Date.now(), ackDelayMs = 0, beatDeadlineMs, budgetMs = KILL_TO_PAGE_BUDGET_MS, human = "operator", writer = null } = {}) {
  const gate = writer || createWriter();
  const beatAt = deathAt - Number(beatDeadlineMs) - 1;
  const beat = await shelf.beatAs("outside-watchdog", { at: beatAt });
  const killed = await gate.kill({ store, at: deathAt });
  const writerBeat = await shelf.beatAs("chain-writer", { at: deathAt + 1 });
  const runtimeBeat = await workerHeartbeatAttempt(shelf);
  const page = checkDeadman(shelf, { now: deathAt, deadline_ms: beatDeadlineMs });
  const after = await runVerifierSlot({ store, now: deathAt + 1, log: createOutsideAnchorLog(), writer: gate });
  let ack = null;
  if (human && killed.death && killed.death.h) {
    ack = await sealHumanAck(store, { at: deathAt + ackDelayMs, name: human, death_h: killed.death.h });
  }
  const metric = killToPage({
    deathAt,
    ackAt: ack && ack.ok ? deathAt + ackDelayMs : null,
    pageFired: page.page === true,
    budgetMs,
  });
  return { spec: COVERAGE_SPEC, live: false, signed: false, beat, killed, writerBeat, runtimeBeat, page, verifier_after_kill: after, ack, metric };
}

export async function coverageView(store, { env = null, now = Date.now(), log = currentOutsideAnchorLog(), schedule = COVERAGE_SCHEDULE } = {}) {
  const on = coverageLive(env);
  const body = {
    spec: COVERAGE_SPEC,
    read: true,
    mints: false,
    live: on,
    coverage_live: on,
    signed: false,
    honesty: { ...HONESTY, live: on, coverage_live: on },
    schedule,
    same_chain_heartbeat: SAME_CHAIN_HEARTBEAT,
    cos_may_enable: false,
    note: on
      ? "COVERAGE_LIVE is on, so coverage ticks may seal. Receipts stay hash-linked and sealed, not signed. The Worker does not write the aziel-anchors witness log. Cap-7 and .aziel are names only. Cap-7 is not ICANN. Paid satellite stays HELD. " + COVERAGE_LIVE_NOTE
      : "Not LIVE. COVERAGE_LIVE is off, so coverage ticks do not run. " + COVERAGE_LIVE_NOTE + " Receipts stay hash-linked and sealed, not signed. The Worker does not write the aziel-anchors witness log and does not hold the witness key. Cap-7 and .aziel are names only. RIB-060 same-chain heartbeat is not implemented.",
  };
  if (!store) return { ...body, code: "COVERAGE-STORE-UNBOUND", refusal_check: null, pages: [] };
  const { loadChain } = await import("./chainlock/ops.js");
  const coverage = await loadChain(store, COVERAGE_CHAIN);
  const refusals = await loadChain(store, "refusals");
  const logEntries = log && typeof log.list === "function" ? log.list() : [];
  const refusal_check = verifyRefusalsSinceBatch(refusals, { batchThroughSeq: batchAnchorSeq(), logEntries });
  const anchor = (schedule || []).find((c) => c.check === VERIFIER_CHECK) || COVERAGE_SCHEDULE[0];
  const verifierRows = (coverage || []).filter((r) => r && r.k === "verifier" && r.coverage && r.coverage.check === anchor.check);
  let gaps = [];
  if (verifierRows.length) {
    const minSlot = verifierRows.reduce((m, r) => Math.min(m, r.coverage.slot), Infinity);
    const due = latestDueSlot(now, anchor);
    const from = Math.max(minSlot, due - LOOKBACK_SLOTS + 1);
    if (due >= from) gaps = verifierGaps(coverage, { check: anchor.check, fromSlot: from, toSlot: due });
  }
  return {
    ...body,
    code: "COVERAGE-STATUS",
    refusal_check,
    pages: pagesForSchedule({ schedule, rows: coverage, now }),
    gaps,
    coverage_rows: (coverage || []).length,
  };
}

export function coverageOpenApiPaths() {
  return {
    "/v1/anchor/coverage": {
      get: {
        operationId: "anchor_coverage_status",
        summary: "AZRT-ANCHOR-COVERAGE-1.0 status. Read-only. Mints nothing. Coverage ticks stay off until COVERAGE_LIVE is explicitly on.",
        description: "Per-refusal anchor flags, verifier gaps, and deadline pages. Cron ticks do not run while COVERAGE_LIVE is off. Cos must not turn that flag on without Aziel OK. Does not write aziel-anchors. Cap-7 and .aziel stay names only. Cap-7 is not ICANN. Paid satellite stays HELD.",
        tags: ["runtime"],
        responses: {
          "200": { description: "Status. refusal_check.ok is false when a post-batch refusal is pending or mismatched." },
        },
      },
    },
  };
}

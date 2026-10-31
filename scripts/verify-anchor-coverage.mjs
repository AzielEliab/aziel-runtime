/**
 * AZRT-ANCHOR-COVERAGE-1.0 (RIB-057, RIB-058, RIB-059, RIB-061, RIB-062, RIB-063).
 * RIB-060 same-chain heartbeat is not implemented.
 * Not LIVE. Receipts stay hash-linked and sealed, not signed.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MemoryStore } from "../src/chainlock/store.js";
import { storeFor } from "../src/chainlock/store.js";
import { append, loadChain, stampSha256, INTERNAL_CHAINS, ROSTER } from "../src/chainlock/ops.js";
import { sealRefusal } from "../src/receipt-guard.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { TETHER_CRON } from "../src/azos-tether.js";
import * as A from "../src/anchor.js";
import * as C from "../src/anchor-coverage.js";
import { checkFile, main as outsideMain } from "./anchor-coverage-outside.mjs";

const H = (ch) => ch.repeat(32);
let n = 0;
const ok = (cond, msg) => {
  assert.equal(Boolean(cond), true, msg || `check ${n}`);
  n++;
};

// Honesty and the superseded same-chain heartbeat. Coverage ticks default off.
ok(C.LIVE === false && C.SAME_CHAIN_HEARTBEAT === false && C.HONESTY.live === false);
ok(C.coverageLive({}) === false && C.coverageLive(null) === false && C.coverageLive({ COVERAGE_LIVE: "" }) === false);
ok(C.coverageLive({ COVERAGE_LIVE: "0" }) === false && C.coverageLive({ COVERAGE_LIVE: "false" }) === false);
ok(C.coverageLive({ COVERAGE_LIVE: "off" }) === false && C.coverageLive({ COVERAGE_LIVE: "live" }) === false && C.coverageLive({ COVERAGE_LIVE: "LIVE" }) === false);
ok(C.coverageLive({ COVERAGE_LIVE: "on" }) === true && C.coverageLive({ COVERAGE_LIVE: "1" }) === true && C.coverageLive({ COVERAGE_LIVE: true }) === true);
ok(C.COVERAGE_LIVE_NOTE.includes("Cos must not turn COVERAGE_LIVE on without Aziel OK"));
ok(fs.readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8").includes("COVERAGE_LIVE is unset on purpose"));
ok(!/^COVERAGE_LIVE\s*=/m.test(fs.readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8")));
ok(C.HONESTY.signed === false && C.HONESTY.runtime_writes_witness_log === false);
ok(C.HONESTY.cap7 === "names-only" && C.HONESTY.cap7_is_icann === false && C.HONESTY.paid_sat === "HELD");
ok(INTERNAL_CHAINS.includes("coverage") && !ROSTER.includes("coverage"));
ok(!fs.readFileSync(new URL("../src/anchor-coverage.js", import.meta.url), "utf8").includes('k: "heartbeat"'));
ok(!fs.readFileSync(new URL("./anchor-coverage-outside.mjs", import.meta.url), "utf8").includes("writer-do"));
ok(!fs.readFileSync(new URL("./anchor-coverage-outside.mjs", import.meta.url), "utf8").includes("chainlock/ops"));

// Old receipts verify unchanged.
const pre = JSON.parse(fs.readFileSync(new URL("../fixtures/pre-anchor-receipts.json", import.meta.url), "utf8"));
for (const st of pre.chainlock_acts) ok((await stampSha256(st)) === st.stamp_sha256, "old stamp hash");

// Outside log: first hash wins, hash-linked, not signed.
const log0 = C.createOutsideAnchorLog();
ok(log0.writable_by_chain_writer === false);
const put1 = await log0.append({ seq: 1, h: H("ab"), at: "t0" });
ok(put1.ok && put1.signed === false && put1.n === 1);
const again = await log0.append({ seq: 1, h: H("ab") });
ok(again.replayed === true && log0.list().length === 1);
const clash = await log0.append({ seq: 1, h: H("cd") });
ok(clash.ok === false && clash.code === "ANCHOR-MISMATCH" && clash.written === false && log0.list()[0].h === H("ab"));
ok((await C.verifyOutsideLog(log0.list())).ok === true);
const tampered = JSON.parse(JSON.stringify(log0.list()));
tampered[0].h = H("ef");
ok((await C.verifyOutsideLog(tampered)).code === "ANCHOR-MISMATCH");

// RIB-057: refusal does not return until the outside log has the head.
{
  const store = new MemoryStore();
  const log = C.createOutsideAnchorLog();
  let release;
  const gate = new Promise((r) => { release = r; });
  let entered = false;
  C.setOutsideAnchorLog({
    list: () => log.list(),
    append: async (row) => { entered = true; await gate; return log.append(row); },
  });
  let settled = false;
  const pending = sealRefusal(store, { code: "FG-X", tool: "fraggate_call", slug: "foldlock", op: "health", args: { n: 1 }, minuteBucket: 11, env: { COVERAGE_LIVE: "on" } }).then((r) => {
    settled = true;
    return r;
  });
  const waitUntil = Date.now() + 2000;
  while (!entered && Date.now() < waitUntil) await new Promise((r) => setImmediate(r));
  ok(entered === true && settled === false, "refusal still waiting on the anchor log");
  release();
  const rec = await pending;
  ok(rec.sealed === true && rec.per_refusal_anchor.status === "anchored" && rec.per_refusal_anchor.in_log === true);
  ok(rec.per_refusal_anchor.signed === false && rec.per_refusal_anchor.live === false);
  const rows = await loadChain(store, "refusals");
  ok(rows[0].per_refusal_anchor === undefined, "anchor result is not inside the refusal stamp");
  ok((await stampSha256(rows[0])) === rows[0].stamp_sha256);
  const good = C.verifyRefusalsSinceBatch(rows, { batchThroughSeq: 0, logEntries: log.list() });
  ok(good.ok === true && good.code === "ANCHOR-OK");
  // Rewriting a refusal written since the last batch fails verify.
  const copy = JSON.parse(JSON.stringify(rows));
  copy[0].fact = "rewritten since last batch";
  copy[0].stamp_sha256 = H("11");
  await store.replaceRecords("refusals", copy);
  const bad = C.verifyRefusalsSinceBatch(await loadChain(store, "refusals"), { batchThroughSeq: 0, logEntries: log.list() });
  ok(bad.ok === false && bad.code === "ANCHOR-MISMATCH" && bad.breaks[0].anchored_h === rec.h);
  C.setOutsideAnchorLog(null);
}

// A dead coverage sink does not unseal the refusal.
{
  const inner = new MemoryStore();
  let calls = 0;
  const store = {
    async appendAtomic(opts, builder) {
      calls++;
      if (calls > 1) throw new Error("coverage down");
      return inner.appendAtomic(opts, builder);
    },
  };
  C.setOutsideAnchorLog(null);
  const rec = await sealRefusal(store, { code: "FG-SINK", tool: "fraggate_call", slug: "foldlock", op: "health", args: { n: 9 }, minuteBucket: 19, env: { COVERAGE_LIVE: "on" } });
  ok(rec.sealed === true && rec.h && rec.per_refusal_anchor.code === "ANCHOR-PENDING" && rec.per_refusal_anchor.pending_sealed === false);
  ok((await loadChain(inner, "refusals")).length === 1);
  C.setOutsideAnchorLog(null);
}

// Routine follow rows stay on the batch path.
{
  const store = new MemoryStore();
  const log = C.createOutsideAnchorLog();
  C.setOutsideAnchorLog(log);
  const rec = await sealRefusal(store, { code: "FG-Y", tool: "fraggate_call", slug: "foldlock", op: "health", args: { n: 2 }, minuteBucket: 12, env: { COVERAGE_LIVE: "on" } });
  await append(store, { c: "refusals", k: "follow", s: "after", f: "routine follow stays batched" }, { internal: true });
  const rows = await loadChain(store, "refusals");
  ok(C.verifyRefusalsSinceBatch(rows, { batchThroughSeq: 0, logEntries: log.list() }).ok === true);
  const copy = JSON.parse(JSON.stringify(rows));
  copy[1].stamp_sha256 = H("22");
  ok(C.verifyRefusalsSinceBatch(copy, { batchThroughSeq: 0, logEntries: log.list() }).ok === true, "routine rewrite is not a per-refusal break");
  const roll = JSON.parse(JSON.stringify(rows));
  roll.push({ k: "refusal", stamp_sha256: H("33"), refusal: { kind: "auth_rollup" } });
  ok(C.verifyRefusalsSinceBatch(roll, { batchThroughSeq: 0, logEntries: log.list() }).ok === true, "auth rollup stays batched");
  ok(rec.per_refusal_anchor.code === "ANCHOR-OK");
  C.setOutsideAnchorLog(null);
}

// COVERAGE_LIVE off: the refusal still seals, and no coverage row is written.
{
  const log = C.createOutsideAnchorLog();
  C.setOutsideAnchorLog(log);
  const store = new MemoryStore();
  const rec = await sealRefusal(store, { code: "FG-OFF", tool: "fraggate_call", slug: "foldlock", op: "health", args: { n: 8 }, minuteBucket: 18 });
  ok(rec.sealed === true && rec.h);
  ok(rec.per_refusal_anchor.code === "COVERAGE-LIVE-OFF" && rec.per_refusal_anchor.written === false && rec.per_refusal_anchor.pending_sealed === false && rec.per_refusal_anchor.in_log === false);
  ok((await loadChain(store, "coverage")).length === 0, "flag off seals no coverage row");
  ok((await loadChain(store, "refusals")).length === 1);
  ok(log.list().length === 0, "flag off does not append the outside anchor log");
  const also = await sealRefusal(new MemoryStore(), { code: "FG-OFF2", tool: "fraggate_call", slug: "foldlock", op: "health", args: { n: 8 }, minuteBucket: 28, env: { COVERAGE_LIVE: "off" } });
  ok(also.per_refusal_anchor.code === "COVERAGE-LIVE-OFF" && also.per_refusal_anchor.written === false);
  C.setOutsideAnchorLog(null);
}

// No outside log: seal ANCHOR-PENDING and verify flags it. Witness exact head counts as in-log.
{
  C.setOutsideAnchorLog(null);
  const store = new MemoryStore();
  const rec = await sealRefusal(store, { code: "FG-Z", tool: "fraggate_call", slug: "foldlock", op: "health", args: { n: 3 }, minuteBucket: 13, env: { COVERAGE_LIVE: "on" } });
  ok(rec.per_refusal_anchor.code === "ANCHOR-PENDING" && rec.per_refusal_anchor.pending_sealed === true);
  const cov = await loadChain(store, "coverage");
  const pending = cov.find((r) => r.k === "anchor_pending");
  ok(pending && pending.coverage.code === "ANCHOR-PENDING" && pending.coverage.h === rec.h && pending.coverage.signed === false);
  ok((await stampSha256(pending)) === pending.stamp_sha256);
  const flagged = C.verifyRefusalsSinceBatch(await loadChain(store, "refusals"), { batchThroughSeq: 0, logEntries: [] });
  ok(flagged.ok === false && flagged.code === "ANCHOR-PENDING" && flagged.flags[0].seq === rec.seq);
  A.seedAnchorMemo("anchors", {
    ok: true,
    n: 1,
    entries: [{ statement: { n: 1, heads: { chains: [{ c: "refusals", seq: rec.seq, h: rec.h }] } }, statement_hash: H("44") }],
  });
  const via = await C.publishRefusalHead({ seq: rec.seq, h: rec.h, log: null });
  ok(via.status === "anchored" && via.via === "witness");
  A.resetAnchorMemo();
  C.setOutsideAnchorLog(null);
}

// RIB-058: each run seals pass or fail; a skipped slot stays a gap.
{
  const store = new MemoryStore();
  const log = C.createOutsideAnchorLog();
  C.setOutsideAnchorLog(log);
  const every = C.VERIFIER_EVERY_MS;
  const t0 = every * 10;
  const first = await C.runCoverageTick({ store, now: t0, log });
  ok(first.verifier.result === "pass" && first.verifier.code === "ANCHOR-OK" && first.verifier.sealed === true && first.live === false);
  const replay = await C.runVerifierSlot({ store, now: t0 + 10, log });
  ok(replay.replayed === true && replay.result === "pass");
  await sealRefusal(store, { code: "FG-Q", tool: "fraggate_call", slug: "foldlock", op: "health", args: { n: 4 }, minuteBucket: 14, env: { COVERAGE_LIVE: "on" } });
  const rows = await loadChain(store, "refusals");
  rows[0].stamp_sha256 = H("55");
  await store.replaceRecords("refusals", rows);
  // Slots 11 and 12 never run. Slot 13 seals fail. Miss rows must not fill the hole.
  const jump = await C.runCoverageTick({ store, now: t0 + 3 * every, log });
  ok(jump.verifier.slot === 13 && jump.verifier.result === "fail" && jump.verifier.code === "ANCHOR-MISMATCH");
  const cov = await loadChain(store, "coverage");
  const gaps = C.verifierGaps(cov, { check: C.VERIFIER_CHECK, fromSlot: 10, toSlot: 12 });
  ok(gaps.length === 2 && gaps[0] === 11 && gaps[1] === 12, "skipped verifier slots stay empty");
  ok(cov.filter((r) => r.k === "verifier").every((r) => r.coverage.signed === false));
  ok(!cov.some((r) => r.k === "heartbeat"));
  C.setOutsideAnchorLog(null);
}

// RIB-059: per-check deadline. A longer deadline does not page just because a shorter check did.
{
  const store = new MemoryStore();
  const schedule = [
    { check: "anchor-verify", every_ms: 1000, deadline_ms: 1000 },
    { check: "slow-check", every_ms: 1000, deadline_ms: 5000 },
  ];
  await C.sealCoverage(store, {
    k: "verifier",
    fact: "anchor-verify slot 0 pass",
    coverage: { spec: C.COVERAGE_SPEC, kind: "verifier", check: "anchor-verify", slot: 0, result: "pass", code: "ANCHOR-OK", signed: false, live: false },
    idempotency_key: "verifier:anchor-verify:0",
  });
  await C.sealCoverage(store, {
    k: "verifier",
    fact: "slow-check slot 0 pass",
    coverage: { spec: C.COVERAGE_SPEC, kind: "verifier", check: "slow-check", slot: 0, result: "pass", code: "ANCHOR-OK", signed: false, live: false },
    idempotency_key: "verifier:slow-check:0",
  });
  const now = 4000;
  const rows = await loadChain(store, "coverage");
  const pages = C.pagesForSchedule({ schedule, rows, now });
  ok(pages.length === 3 && pages.every((p) => p.check === "anchor-verify" && p.code === "COVERAGE-PAGE"));
  ok(!pages.some((p) => p.check === "slow-check"), "slow-check deadline has not passed");
  const dog = await C.runDeadlineWatchdog({ store, now, schedule });
  ok(dog.pages.length === 3 && dog.misses.length === 3 && dog.misses.every((m) => m.sealed && m.code === "COVERAGE-MISS"));
  const after = await loadChain(store, "coverage");
  ok(C.verifierGaps(after, { check: "anchor-verify", fromSlot: 0, toSlot: 3 }).join(",") === "1,2,3", "a miss row is not a verifier row");
  const miss = after.find((r) => r.k === "miss");
  ok(miss && miss.coverage.signed === false && (await stampSha256(miss)) === miss.stamp_sha256);
}

// RIB-061: heartbeat target refuses the chain writer and the runtime. Outside checker pages on absence.
{
  const shelf = C.createOutsideShelf();
  ok(shelf.writable_by_chain_writer === false && shelf.writable_by_runtime === false);
  const refused = await shelf.beatAs("chain-writer", { at: 10 });
  const runtime = await C.workerHeartbeatAttempt(shelf);
  ok(refused.code === "DEADMAN-WRITER-REFUSED" && refused.written === false);
  ok(runtime.code === "DEADMAN-WRITER-REFUSED" && runtime.written === false && shelf.list().length === 0);
  const beat = await shelf.beatAs("outside-watchdog", { at: 1000 });
  ok(beat.ok === true && beat.writer_id === "outside-watchdog");
  ok(C.checkDeadman(shelf, { now: 1000 + 500, deadline_ms: 1000 }).code === "DEADMAN-OK");
  const late = C.checkDeadman(shelf, { now: 1000 + 1001, deadline_ms: 1000 });
  ok(late.page === true && late.code === "DEADMAN-ABSENT" && late.checker === "outside" && late.live === false);
  const absent = C.checkDeadman(C.createOutsideShelf(), { now: 5, deadline_ms: 1000 });
  ok(absent.page === true && absent.code === "DEADMAN-ABSENT");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anchor-cov-"));
  const file = path.join(dir, "beats.json");
  fs.writeFileSync(file, JSON.stringify({ beats: [{ at: 1000, n: 1 }] }));
  const fresh = checkFile({ path: file, now: 1500, deadlineMs: 1000 });
  ok(fresh.page === false && fresh.checker === "outside" && fresh.cap7_is_icann === false && fresh.paid_sat === "HELD");
  const stale = outsideMain([file, "--deadline-ms", "1000", "--now", "5000"]);
  ok(stale.exit === 2 && stale.body.page === true && stale.body.live === false);
  const missing = outsideMain(["/tmp/does-not-exist-anchor-coverage-beats.json", "--now", "10"]);
  ok(missing.exit === 2 && missing.body.page === true);
}

// RIB-062 + RIB-063: kill the writer. Over budget fails even though the stop fired.
{
  const over = await C.runKillToPageDrill({
    store: new MemoryStore(),
    shelf: C.createOutsideShelf(),
    deathAt: 1_000_000,
    ackDelayMs: 5_000,
    beatDeadlineMs: 1_000,
    budgetMs: 1_000,
    human: "operator",
  });
  ok(over.killed.ok === true && over.killed.death.sealed === true);
  ok(over.page.page === true && over.metric.page_fired === true);
  ok(over.metric.ok === false && over.metric.code === "KILL-TO-PAGE-OVER-BUDGET" && over.metric.gap_ms === 5_000);
  ok(over.writerBeat.written === false && over.runtimeBeat.written === false);
  ok(over.verifier_after_kill.code === "WRITER-DEAD" && over.verifier_after_kill.written === false);
  ok(over.ack.ok === true && over.ack.signed === false && over.ack.name === "operator");
  ok(over.live === false && over.signed === false);
  const within = await C.runKillToPageDrill({
    store: new MemoryStore(),
    shelf: C.createOutsideShelf(),
    deathAt: 2_000_000,
    ackDelayMs: 400,
    beatDeadlineMs: 1_000,
    budgetMs: 1_000,
    human: "operator",
  });
  ok(within.metric.ok === true && within.metric.code === "KILL-TO-PAGE-OK" && within.metric.gap_ms === 400 && within.metric.page_fired === true);
  const noStop = C.killToPage({ deathAt: 1, ackAt: 2, pageFired: false, budgetMs: 10 });
  ok(noStop.ok === false && noStop.code === "KILL-STOP-NOT-FIRED");
  const noAck = C.killToPage({ deathAt: 1, ackAt: null, pageFired: true, budgetMs: 10 });
  ok(noAck.ok === false && noAck.code === "KILL-NO-ACK" && noAck.page_fired === true);
  const badName = await C.sealHumanAck(new MemoryStore(), { at: 3, name: "Not A Name", death_h: H("66") });
  ok(badName.ok === false && badName.code === "ACK-NAME-REFUSED" && badName.written === false);
}

// The within-budget store must not carry a same-chain heartbeat. Re-run to inspect that store.
{
  const store = new MemoryStore();
  const drill = await C.runKillToPageDrill({
    store,
    shelf: C.createOutsideShelf(),
    deathAt: 3_000_000,
    ackDelayMs: 100,
    beatDeadlineMs: 50,
    budgetMs: 500,
    human: "operator",
  });
  ok(drill.metric.ok === true);
  const cov = await loadChain(store, "coverage");
  ok(cov.some((r) => r.k === "writer_death") && cov.some((r) => r.k === "human_ack"));
  ok(!cov.some((r) => r.k === "heartbeat"));
  ok(cov.every((r) => r.coverage && r.coverage.signed === false));
}

// Cron stays off until COVERAGE_LIVE is explicitly on. Then an unbound log seals a fail row.
{
  C.setOutsideAnchorLog(null);
  const worker = (await import("../src/index.js")).default;
  const t0 = C.VERIFIER_EVERY_MS * 20;
  const off = { CHAINLOCK: memoryChainWriterNamespace({}) };
  const pendingOff = [];
  await worker.scheduled({ cron: TETHER_CRON, scheduledTime: t0 }, off, { waitUntil: (p) => pendingOff.push(p) });
  await Promise.all(pendingOff);
  const offRows = await loadChain(storeFor(off), "coverage");
  ok(offRows.length === 0, "default cron seals no verifier or watchdog row");
  const refused = await worker.fetch(new Request("https://aziel-runtime.example/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "fraggate_call", arguments: { slug: "foldlock", op: "fold-append" } } }),
  }), off);
  const refusedBody = await refused.json();
  const sc = refusedBody.result && (refusedBody.result.structuredContent || JSON.parse(refusedBody.result.content[0].text));
  ok(sc && sc.refusal_receipt && sc.refusal_receipt.sealed === true && sc.refusal_receipt.per_refusal_anchor.code === "COVERAGE-LIVE-OFF");
  ok((await loadChain(storeFor(off), "coverage")).length === 0, "a refusal with the flag off seals no coverage row");
  ok((await loadChain(storeFor(off), "refusals")).length === 1);
  const offRes = await worker.fetch(new Request("https://aziel-runtime.example/v1/anchor/coverage"), off);
  const offBody = await offRes.json();
  ok(offRes.status === 200 && offBody.read === true && offBody.mints === false && offBody.live === false && offBody.coverage_live === false);
  ok(offBody.cos_may_enable === false && offBody.note.includes("Cos must not turn COVERAGE_LIVE on without Aziel OK"));
  ok(offBody.honesty.cap7_is_icann === false && offBody.honesty.paid_sat === "HELD" && offBody.same_chain_heartbeat === false);
  ok(offBody.note.includes("Not LIVE"));
  const on = { CHAINLOCK: memoryChainWriterNamespace({}), COVERAGE_LIVE: "on" };
  const pendingOn = [];
  await worker.scheduled({ cron: TETHER_CRON, scheduledTime: t0 }, on, { waitUntil: (p) => pendingOn.push(p) });
  await Promise.all(pendingOn);
  const cov = await loadChain(storeFor(on), "coverage");
  const row = cov.find((r) => r.k === "verifier" && r.coverage && r.coverage.slot === 20);
  ok(row && row.coverage.result === "fail" && row.coverage.code === "COVERAGE-LOG-UNBOUND" && row.coverage.live === false);
  ok(!cov.some((r) => r.k === "heartbeat"));
  const onRes = await worker.fetch(new Request("https://aziel-runtime.example/v1/anchor/coverage"), on);
  const onBody = await onRes.json();
  ok(onBody.coverage_live === true && onBody.live === true && onBody.mints === false);
  const api = await worker.fetch(new Request("https://aziel-runtime.example/openapi.json"), on);
  const spec = await api.json();
  ok(spec.paths["/v1/anchor/coverage"] && spec.paths["/v1/anchor/coverage"].get);
  C.setOutsideAnchorLog(null);
}

console.log(`verify-anchor-coverage: ok (${n} checks; not LIVE; RIB-060 not implemented)`);

/**
 * AZRT-ACK-CLOCK-1.0 — RIB-066, RIB-064, RIB-065+RIB-067.
 * Sealed hash-linked rows. Not signed. Not LIVE.
 * Old session, ChainLock, and FragGate ledger seals verify unchanged.
 * Cap-7 is not ICANN. Paid satellite stays HELD.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { canonicalize, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { stampSha256 } from "../src/chainlock/ops.js";
import { composeLedgerEntry, verifyLedger } from "../src/fraggate/ledger.js";
import { CAP7_LOCKS, PAID_SATELLITE_HELD, TRAFFIC_PATHS } from "../src/qnm-honesty.js";
import { RF_BANDS, SATELLITE_RELAY_SWITCH } from "../src/mesh-channel-plane.js";
import { canonicalBytes, composeEvidence, GENESIS_PREV_HASH } from "../src/engines/forgereceipts/engine.js";
import {
  ACK_CLOCK_KIND,
  ACK_CLOCK_LIVE,
  DAY_MS,
  ackClockBoundary,
  ackLatencyFromReceipts,
  autoReply,
  checkBudget,
  createLedger,
  humanAck,
  openItem,
  readReceipt,
  reassign,
  reopen,
  resolveItem,
  verifyAckChain,
} from "../src/ack-clock.js";

let n = 0;
const ok = (cond, message) => {
  assert.equal(cond, true, message);
  n += 1;
};

const T0 = Date.parse("2026-01-01T00:00:00.000Z");
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const boundary = ackClockBoundary();
ok(ACK_CLOCK_LIVE === false && boundary.live === false && boundary.signed === false, "model is not live and not signed");
ok(boundary.spec_status === "not-live", "spec status stays not-live");
ok(CAP7_LOCKS.public_icann === false && CAP7_LOCKS.cap7_public_icann === false, "Cap-7 is not ICANN");
ok(CAP7_LOCKS.public_egress_ip === false && boundary.public_egress_ip === false, "Cap-7 is not a public egress IP");
ok(boundary.cap7_is_icann === false && boundary.cap7_names_only === true && boundary.public_icann === false, "names only");
ok(PAID_SATELLITE_HELD.held === true && PAID_SATELLITE_HELD.enabled === false && PAID_SATELLITE_HELD.live === false, "paid sat HELD");
ok(TRAFFIC_PATHS.paths.xm_sdars.held === true && TRAFFIC_PATHS.paths.xm_sdars.enabled === false, "xm_sdars HELD");
ok(RF_BANDS.xm_sdars.held === true && RF_BANDS.xm_sdars.live === false, "xm band stays HELD");
ok(
  SATELLITE_RELAY_SWITCH.held === true &&
    SATELLITE_RELAY_SWITCH.enabled === false &&
    SATELLITE_RELAY_SWITCH.live === false &&
    SATELLITE_RELAY_SWITCH.transmit === false,
  "satellite relay stays HELD",
);
ok(boundary.paid_sat === "HELD" && boundary.paid_satellite_held === true && boundary.satellite_relay_live === false, "boundary cites HELD");
ok(PUBLIC_MCP_TOOLS.length === 36 && !PUBLIC_MCP_TOOLS.some((name) => /ack|clock/i.test(name)), "tools/list stays 36");

// --- RIB-066: delivery, named ack, miss, read/auto do not stop, two clocks ---
{
  const ledger = createLedger();
  ok(ledger.live === false && ledger.signed === false, "ledger not live");
  const opened = await openItem(ledger, {
    now: T0,
    requester: "sam",
    issue_key: "disk-full",
    owner: "ada.aziel",
    ladder: ["ada.aziel", "bea", "cy"],
    budget_ms: 1000,
    live: true,
    paid_sat: "LIVE",
  });
  ok(opened.ok && opened.new_item === true && opened.receipt.event === "page_delivered", "page delivered is its own row");
  ok(opened.receipt.kind === ACK_CLOCK_KIND && opened.receipt.live === false && opened.receipt.signed === false, "seal is not live");
  ok(!Object.hasOwn(opened.receipt, "signature"), "receipt is not signed");
  ok(opened.receipt.name_resolved === false && opened.receipt.boundary.paid_sat === "HELD", "name stays a name; paid sat stays HELD");
  ok(opened.receipt.boundary.cap7_is_icann === false && opened.item.ack_stopped === false, "delivery does not ack");
  ok(opened.item.ack_clock_started_ms === T0 && opened.item.resolution_started_ms === T0, "delivery starts both clocks");
  const id = opened.item_id;
  const beforeNoise = ledger.receipts.length;
  const unread = await readReceipt(ledger, { item_id: id, now: T0 + 100, actor: "vendor" });
  const auto = await autoReply(ledger, { item_id: id, now: T0 + 200, actor: "mailbox" });
  ok(unread.ok && unread.receipt.event === "read_receipt" && unread.receipt.stops_clock === false, "read receipt is a row");
  ok(auto.ok && auto.receipt.event === "auto_reply" && auto.receipt.stops_clock === false, "auto-reply is a row");
  ok(unread.item.ack_stopped === false && auto.item.ack_stopped === false, "read and auto do not stop the clock");
  const notDeliberate = await humanAck(ledger, { item_id: id, now: T0 + 300, human_name: "Ada" });
  const machine = await humanAck(ledger, { item_id: id, now: T0 + 300, human_name: "Auto Reply", deliberate: true });
  const empty = await humanAck(ledger, { item_id: id, now: T0 + 300, human_name: "  ", deliberate: true });
  ok(notDeliberate.ok === false && notDeliberate.code === "ACK-NOT-DELIBERATE" && notDeliberate.written === false, "ack must be deliberate");
  ok(machine.code === "ACK-NOT-NAMED" && empty.code === "ACK-NOT-NAMED", "machine signals are not a human ack");
  ok(ledger.receipts.length === beforeNoise + 2, "refused acks write nothing");
  const early = await checkBudget(ledger, { item_id: id, now: T0 + 999 });
  ok(early.written === false && early.missed === false, "inside the budget writes nothing");
  const miss = await checkBudget(ledger, { item_id: id, now: T0 + 1000 });
  ok(miss.missed === true && miss.receipts[0].event === "ack_miss" && miss.receipts[0].stops_clock === false, "miss row does not stop the clock");
  ok(miss.receipts[0].owner === "ada.aziel" && miss.receipts[0].escalates_to === "bea", "miss names the next person");
  ok(miss.receipts[1].event === "page_delivered" && miss.receipts[1].cause === "escalation" && miss.receipts[1].owner === "bea", "escalation is a new delivery");
  ok(miss.item.ack_clock_started_ms === T0 + 1000 && miss.item.resolution_started_ms === T0, "new owner restarts ack only");
  ok(miss.item.handoff_count === 0, "escalation is not a handoff");
  const again = await checkBudget(ledger, { item_id: id, now: T0 + 1000 });
  ok(again.written === false, "the same delivery is not missed twice");
  const ack = await humanAck(ledger, { item_id: id, now: T0 + 1500, human_name: "Bea", deliberate: true });
  ok(ack.ok && ack.receipt.event === "human_ack" && ack.receipt.human_name === "Bea", "human ack is its own row");
  ok(ack.receipt.stops_clock === true && ack.receipt.ack_latency_ms === 500 && ack.receipt.resolution_ms === null, "ack latency is not resolution time");
  ok(ack.item.ack_stopped === true, "named ack stops the clock");
  const second = await humanAck(ledger, { item_id: id, now: T0 + 1600, human_name: "Bea", deliberate: true });
  ok(second.code === "ACK-ALREADY-STOPPED" && second.written === false, "a second ack does not rewrite the clock");
  const after = await checkBudget(ledger, { item_id: id, now: T0 + 99999 });
  ok(after.written === false, "a stopped clock does not miss");
  const resolved = await resolveItem(ledger, { item_id: id, now: T0 + 10 * DAY_MS });
  ok(resolved.receipt.event === "resolved" && resolved.receipt.stops_clock === false, "resolve is not an ack");
  ok(resolved.receipt.resolution_ms === 10 * DAY_MS && resolved.receipt.ack_latency_ms === 500, "resolution stays the long clock");
  ok(resolved.receipt.resolution_started_ms === T0, "resolution start is the open");
  const week = ackLatencyFromReceipts(ledger.receipts, { from_ms: T0, to_ms: T0 + 7 * DAY_MS });
  ok(week.count === 1 && week.mean_ms === 500 && week.rows[0].resolution_ms === null, "weekly ack latency comes from the rows");
  ok(week.source === "receipts", "latency does not read a side file");
}

// Resolve does not stop an open ack clock.
{
  const ledger = createLedger();
  const opened = await openItem(ledger, {
    now: T0,
    requester: "sam",
    issue_key: "still-open",
    owner: "ada",
    ladder: ["ada", "bea"],
    budget_ms: 1000,
  });
  const resolved = await resolveItem(ledger, { item_id: opened.item_id, now: T0 + 100 });
  ok(resolved.item.ack_stopped === false && resolved.receipt.ack_latency_ms === null, "resolve leaves ack empty");
  const miss = await checkBudget(ledger, { item_id: opened.item_id, now: T0 + 1000 });
  ok(miss.missed === true && miss.receipts[0].event === "ack_miss", "resolve does not stop the budget");
}

// Fast ack, stale resolution, on a second item in the same week figure.
{
  const ledger = createLedger();
  const a = await openItem(ledger, { now: T0, requester: "sam", issue_key: "a", owner: "ada", budget_ms: 5000 });
  const b = await openItem(ledger, { now: T0, requester: "sam", issue_key: "b", owner: "bea", budget_ms: 5000 });
  await humanAck(ledger, { item_id: a.item_id, now: T0 + 1000, human_name: "Ada", deliberate: true });
  await humanAck(ledger, { item_id: b.item_id, now: T0 + 3000, human_name: "Bea", deliberate: true });
  await resolveItem(ledger, { item_id: a.item_id, now: T0 + 10 * DAY_MS });
  const week = ackLatencyFromReceipts(ledger.receipts, { from_ms: T0, to_ms: T0 + DAY_MS });
  ok(week.count === 2 && week.mean_ms === 2000, "weekly mean is ack time only");
  const later = ackLatencyFromReceipts(ledger.receipts, { from_ms: T0 + DAY_MS, to_ms: T0 + 2 * DAY_MS });
  ok(later.count === 0 && later.mean_ms === null, "acks outside the week are not in the figure");
  const resolved = ledger.receipts.find((rec) => rec.event === "resolved");
  ok(resolved.ack_latency_ms === 1000 && resolved.resolution_ms === 10 * DAY_MS, "the two numbers stay apart");
}

// --- RIB-064: handoff, resume, resolution never restarts ---
{
  const ledger = createLedger();
  const opened = await openItem(ledger, {
    now: T0,
    requester: "sam",
    issue_key: "ping-pong",
    owner: "ada",
    ladder: ["ada", "bea", "cy"],
    budget_ms: 10000,
  });
  const id = opened.item_id;
  const firstHash = opened.receipt.hash;
  const same = await reassign(ledger, { item_id: id, to: "ada", now: T0 + 10 });
  ok(same.code === "ACK-REASSIGN-SAME" && ledger.receipts.length === 1, "reassign to the current owner writes nothing");
  const toBea = await reassign(ledger, { item_id: id, to: "bea", now: T0 + 1000 });
  ok(toBea.receipts[0].event === "reassign" && toBea.receipts[0].handoff_count === 1, "first handoff");
  ok(toBea.receipts[0].handoff_flagged === false && toBea.receipts[0].resolution_restarted === false, "one handoff is not a flag");
  ok(toBea.receipts[0].ack_restarted === true && toBea.receipts[0].ack_clock_started_ms === T0 + 1000, "new owner restarts ack");
  ok(toBea.receipts[1].cause === "reassign" && toBea.receipts[1].owner === "bea", "reassign delivers the new owner");
  ok(toBea.item.resolution_started_ms === T0, "resolution did not restart");
  const back = await reassign(ledger, { item_id: id, to: "ada", now: T0 + 5000 });
  ok(back.receipts[0].handoff_count === 2 && back.receipts[0].handoff_flagged === false, "two handoffs are not past two");
  ok(back.receipts[0].resumed === true && back.receipts[0].ack_restarted === false, "original owner resumes");
  ok(back.receipts[0].ack_clock_started_ms === T0 && back.receipts[0].ack_open === true, "resumed clock is the first ack start");
  ok(back.item.ack_stopped === false && back.item.resolution_started_ms === T0, "resume keeps the resolution clock");
  const ack = await humanAck(ledger, { item_id: id, now: T0 + 8000, human_name: "Ada", deliberate: true });
  ok(ack.receipt.ack_latency_ms === 8000, "resumed ack latency includes the first start");
  const toCy = await reassign(ledger, { item_id: id, to: "cy", now: T0 + 9000 });
  ok(toCy.receipts[0].handoff_count === 3 && toCy.receipts[0].handoff_flagged === true, "past two handoffs is flagged");
  ok(toCy.receipts[0].ack_restarted === true && toCy.item.ack_clock_started_ms === T0 + 9000, "a later owner still restarts");
  ok(toCy.item.resolution_started_ms === T0 && toCy.receipts[0].resolution_started_ms === T0, "flagged handoff still does not restart resolution");
  const resolved = await resolveItem(ledger, { item_id: id, now: T0 + 20000 });
  ok(resolved.receipt.resolution_ms === 20000 && resolved.receipt.resolution_started_ms === T0, "resolution is from the open");
  ok(resolved.receipt.handoff_count === 3 && resolved.receipt.handoff_flagged === true, "handoff count is on the resolve row");
  ok(opened.receipt.original_receipt_hash === null && back.receipts[1].original_receipt_hash === firstHash, "later rows name the original seal");
}

// Already-acked original owner keeps that ack when the item comes back.
{
  const ledger = createLedger();
  const opened = await openItem(ledger, {
    now: T0,
    requester: "sam",
    issue_key: "acked-resume",
    owner: "ada",
    ladder: ["ada", "bea"],
    budget_ms: 10000,
  });
  const id = opened.item_id;
  await humanAck(ledger, { item_id: id, now: T0 + 100, human_name: "Ada", deliberate: true });
  await reassign(ledger, { item_id: id, to: "bea", now: T0 + 200 });
  const back = await reassign(ledger, { item_id: id, to: "ada", now: T0 + 300 });
  ok(back.receipts[0].resumed === true && back.receipts[0].ack_open === false, "a finished first ack stays finished");
  ok(back.item.ack_stopped === true && back.item.ack_latency_ms === 100, "coming back does not restart a finished ack");
  const miss = await checkBudget(ledger, { item_id: id, now: T0 + 99999 });
  ok(miss.written === false, "a resumed finished ack does not miss");
}

// Late return of an owner who never acked misses against the first start.
{
  const ledger = createLedger();
  const opened = await openItem(ledger, {
    now: T0,
    requester: "sam",
    issue_key: "late-resume",
    owner: "ada",
    ladder: ["ada", "bea"],
    budget_ms: 10000,
  });
  const id = opened.item_id;
  await reassign(ledger, { item_id: id, to: "bea", now: T0 + 1000 });
  const back = await reassign(ledger, { item_id: id, to: "ada", now: T0 + 20000 });
  ok(back.item.ack_clock_started_ms === T0 && back.item.handoff_count === 2, "late resume uses the first start");
  const miss = await checkBudget(ledger, { item_id: id, now: T0 + 20000 });
  ok(miss.missed === true && miss.receipts[0].owner === "ada" && miss.receipts[0].escalates_to === "bea", "the original budget is already spent");
  ok(miss.item.handoff_count === 2, "the miss does not add a handoff");
}

// --- RIB-065 + RIB-067: total age, re-resolve, intake window ---
{
  const ledger = createLedger();
  const opened = await openItem(ledger, {
    now: T0,
    requester: "Sam",
    issue_key: "Disk Full",
    owner: "ada",
    budget_ms: 1000,
  });
  const id = opened.item_id;
  const first = opened.receipt.hash;
  await resolveItem(ledger, { item_id: id, now: T0 + DAY_MS });
  const again = await reopen(ledger, { item_id: id, now: T0 + 31 * DAY_MS });
  ok(again.receipt.event === "reopen" && again.receipt.reopen_count === 1 && again.receipt.reopen_flagged === false, "first reopen is not flagged");
  ok(again.receipt.total_age_ms === 31 * DAY_MS, "total age is from the open");
  ok(again.receipt.re_resolve_started_ms === T0 + 31 * DAY_MS && again.receipt.re_resolve_ms === 0, "re-resolve starts now");
  ok(again.receipt.resolution_started_ms === T0 && again.receipt.resolution_restarted === false, "resolution clock is inherited");
  ok(again.receipt.original_receipt_hash === first, "reopen links to the original seal");
  const fixed = await resolveItem(ledger, { item_id: id, now: T0 + 31 * DAY_MS + HOUR });
  ok(fixed.receipt.re_resolve_ms === HOUR, "the fix keeps a short re-resolve");
  ok(fixed.receipt.resolution_ms === 31 * DAY_MS + HOUR && fixed.receipt.total_age_ms === 31 * DAY_MS + HOUR, "total age and inherited resolution stay long");
  const second = await reopen(ledger, { item_id: id, now: T0 + 40 * DAY_MS });
  ok(second.receipt.reopen_count === 2 && second.receipt.reopen_flagged === true, "the second reopen is flagged");
  ok(second.receipt.handoff_count === 0 && second.receipt.total_age_ms === 40 * DAY_MS, "reopen and handoff counts are on the same row");
}

{
  const ledger = createLedger();
  const opened = await openItem(ledger, {
    now: T0,
    requester: "sam",
    issue_key: "disk-full",
    owner: "ada",
    budget_ms: 1000,
  });
  const id = opened.item_id;
  await resolveItem(ledger, { item_id: id, now: T0 + DAY_MS });
  const dup = await openItem(ledger, {
    now: T0 + 10 * DAY_MS,
    requester: "Sam",
    issue_key: "disk full",
    owner: "bea",
    item_id: "item_should_not_exist",
    budget_ms: 1000,
  });
  ok(dup.linked === true && dup.new_item === false && dup.item_id === id, "inside the window a new filing links");
  ok(dup.receipt.event === "intake_linked" && dup.receipt.refused_new_item === true, "the link is a sealed row");
  ok(dup.receipt.reopen_count === 1 && dup.receipt.forced === true, "intake bumps the reopen count");
  ok(dup.receipt.original_receipt_hash === opened.receipt.hash, "intake names the original");
  ok([...new Set(ledger.receipts.map((rec) => rec.item_id))].length === 1, "no second item was sealed");
  const dup2 = await openItem(ledger, {
    now: T0 + 11 * DAY_MS,
    requester: "sam",
    issue_key: "disk-full",
    owner: "ada",
    budget_ms: 1000,
  });
  ok(dup2.receipt.reopen_count === 2 && dup2.receipt.reopen_flagged === true, "a second inside-window filing flags");
}

{
  const ledger = createLedger();
  const opened = await openItem(ledger, {
    now: T0,
    requester: "sam",
    issue_key: "disk-full",
    owner: "ada",
    budget_ms: 1000,
  });
  await resolveItem(ledger, { item_id: opened.item_id, now: T0 + DAY_MS });
  const fresh = await openItem(ledger, {
    now: T0 + DAY_MS + 30 * DAY_MS + 1,
    requester: "sam",
    issue_key: "disk-full",
    owner: "ada",
    budget_ms: 1000,
  });
  ok(fresh.new_item === true && fresh.item_id !== opened.item_id, "outside the window a new item is allowed");
  ok(fresh.item.reopen_count === 0 && fresh.item.resolution_started_ms === T0 + DAY_MS + 30 * DAY_MS + 1, "the new item has its own resolution clock");
  ok(fresh.item.total_age_ms === 0, "a real new item does not inherit age");
}

{
  const ledger = createLedger();
  const opened = await openItem(ledger, {
    now: T0,
    requester: "sam",
    issue_key: "disk-full",
    owner: "ada",
    budget_ms: 1000,
  });
  const linked = await openItem(ledger, {
    now: T0 + 40 * DAY_MS,
    requester: "sam",
    issue_key: "disk-full",
    owner: "bea",
    budget_ms: 1000,
  });
  ok(linked.linked === true && linked.item_id === opened.item_id, "an unresolved item stays the same item");
  ok(linked.receipt.total_age_ms === 40 * DAY_MS, "the open item keeps its age");
}

// Chain verify, tamper, and additive old seals.
{
  const ledger = createLedger();
  const opened = await openItem(ledger, {
    now: T0,
    requester: "sam",
    issue_key: "verify",
    owner: "ada.aziel",
    ladder: ["ada.aziel", "bea"],
    budget_ms: 1000,
  });
  await readReceipt(ledger, { item_id: opened.item_id, now: T0 + 10 });
  await checkBudget(ledger, { item_id: opened.item_id, now: T0 + 1000 });
  await humanAck(ledger, { item_id: opened.item_id, now: T0 + 1200, human_name: "Bea", deliberate: true });
  await reassign(ledger, { item_id: opened.item_id, to: "cy", now: T0 + 1300 });
  await resolveItem(ledger, { item_id: opened.item_id, now: T0 + 2000 });
  await reopen(ledger, { item_id: opened.item_id, now: T0 + 3000 });
  const verified = await verifyAckChain(ledger.receipts);
  ok(verified.ok === true, "sealed chain verifies: " + JSON.stringify(verified.errors));
  const tampered = structuredClone(ledger.receipts);
  tampered[3].human_name = "someone-else";
  const broken = await verifyAckChain(tampered);
  ok(broken.ok === false && broken.errors.some((err) => err.error === "hash_mismatch"), "a changed ack name fails closed");
  const signed = structuredClone(ledger.receipts);
  signed[0].signature = "ed25519";
  const signedCheck = await verifyAckChain(signed);
  ok(signedCheck.ok === false, "adding a signature fails the seal");
}

{
  const session = JSON.parse(fs.readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
  const rows = session.receipts;
  const strict = await verifyChainStrict(rows);
  ok(strict.ok === true, "old session receipts verify unchanged");
  for (const rec of rows) {
    const { hash, ...unsigned } = rec;
    ok((await sha256Hex(canonicalize(unsigned))) === hash, "old session hash bytes unchanged seq " + rec.seq);
    ok(rec.kind !== ACK_CLOCK_KIND, "old session kind is not the ack clock");
  }
  const pre = JSON.parse(fs.readFileSync(new URL("../fixtures/pre-anchor-receipts.json", import.meta.url), "utf8"));
  for (const stamp of pre.chainlock_acts) {
    ok((await stampSha256(stamp)) === stamp.stamp_sha256, "old chainlock stamp hash unchanged");
  }
  ok((await verifyLedger({ entries: pre.fraggate_ledger })).ok === true, "old ledger rows verify");
  for (const entry of pre.fraggate_ledger) {
    const again = await composeLedgerEntry(entry, { seq: entry.seq, prev: entry.prev });
    ok(again.hash === entry.hash, "old ledger compose unchanged");
  }
  const evidence = composeEvidence("same", "incident", "Child's best interests recorded as context for this local receipt.");
  const legacy = new TextDecoder().decode(canonicalBytes("2026-09-23T00:00:00Z", "same", evidence, 1, GENESIS_PREV_HASH, null));
  ok(!legacy.includes("ack_latency_ms") && !legacy.includes("reopen_count") && !legacy.includes("ack-clock"), "forge seals without ack fields stay the old body");
}

console.log(`ok ack-clocks: ${n} checks`);

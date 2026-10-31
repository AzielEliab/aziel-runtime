/**
 * AZRT-ACK-CLOCK-1.0 — ack and resolution clocks as sealed hash-linked receipts.
 *
 * RIB-066: page delivery and a named human ack are different rows. Delivery arms
 * a budget. A miss pages the next person and seals a miss row. Read receipts and
 * auto-replies do not stop the clock. Ack latency and resolution time are
 * separate numbers, readable from the rows alone.
 * RIB-064: reassign restarts ack for a new owner. Resolution never restarts.
 * Reassign back to the original owner resumes that owner's first ack clock.
 * Every reassign bumps a handoff count. Past two is flagged.
 * RIB-065 + RIB-067: the item keeps total age. A reopen bumps a count (the second
 * flags) and starts its own re-resolve timer on a row linked to the original.
 * The same requester and issue key inside the window is a reopen, not a new item.
 *
 * Not signed. Not LIVE. Not a Softwares card. Not an MCP tool. Not a public door.
 * Cap-7 and `.aziel` on a row are names only. Cap-7 is not ICANN. Paid satellite
 * stays HELD. Old session, ForgeReceipts, ChainLock, and ledger seals are not
 * rewritten: this kind is its own chain.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */
import { canonicalize, sha256Hex } from "./session-core.js";
import { CAP7_LOCKS, PAID_SATELLITE_HELD, TRAFFIC_PATHS } from "./qnm-honesty.js";
import { RF_BANDS, SATELLITE_RELAY_SWITCH } from "./mesh-channel-plane.js";

export const ACK_CLOCK_SPEC = "AZRT-ACK-CLOCK-1.0";
export const ACK_CLOCK_KIND = "aziel-runtime.ack-clock";
export const ACK_CLOCK_LIVE = false;
export const ACK_CLOCK_SIGNED = false;
export const SPEC_STATUS = "not-live";
export const ZERO_HASH = "0".repeat(64);
export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_ACK_BUDGET_MS = 15 * 60 * 1000;
export const DEFAULT_REOPEN_WINDOW_MS = 30 * DAY_MS;
export const HANDOFF_FLAG_AFTER = 2;
export const REOPEN_FLAG_AT = 2;
export const EVENTS = Object.freeze([
  "page_delivered",
  "human_ack",
  "ack_miss",
  "read_receipt",
  "auto_reply",
  "reassign",
  "resolved",
  "reopen",
  "intake_linked",
]);

const ITEM_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const MACHINE_SIGNALS = new Set([
  "read",
  "read-receipt",
  "readreceipt",
  "seen",
  "delivered",
  "vendor",
  "vendor-delivered",
  "auto-reply",
  "autoreply",
  "vacation",
  "out-of-office",
  "ooo",
]);

function fail(code, message) {
  return {
    ok: false,
    code,
    message,
    spec: ACK_CLOCK_SPEC,
    live: false,
    signed: false,
    written: false,
    executed: false,
  };
}

export function ackClockBoundary() {
  return {
    spec: ACK_CLOCK_SPEC,
    spec_status: SPEC_STATUS,
    live: ACK_CLOCK_LIVE,
    signed: ACK_CLOCK_SIGNED,
    cap7_is_icann: false,
    cap7_names_only: true,
    public_icann: CAP7_LOCKS.public_icann === true,
    cap7_public_icann: CAP7_LOCKS.cap7_public_icann === true,
    public_egress_ip: CAP7_LOCKS.public_egress_ip === true,
    paid_sat: "HELD",
    paid_satellite_held: PAID_SATELLITE_HELD.held === true,
    paid_satellite_enabled: PAID_SATELLITE_HELD.enabled === true,
    paid_satellite_live: PAID_SATELLITE_HELD.live === true,
    xm_sdars_held: TRAFFIC_PATHS.paths.xm_sdars.held === true && RF_BANDS.xm_sdars.held === true,
    xm_sdars_enabled: TRAFFIC_PATHS.paths.xm_sdars.enabled === true,
    satellite_relay_held: SATELLITE_RELAY_SWITCH.held === true,
    satellite_relay_enabled: SATELLITE_RELAY_SWITCH.enabled === true,
    satellite_relay_live: SATELLITE_RELAY_SWITCH.live === true,
    court_filing: false,
  };
}

function boundarySeal() {
  return {
    live: false,
    signed: false,
    cap7_is_icann: false,
    cap7_names_only: true,
    public_icann: false,
    cap7_public_icann: false,
    public_egress_ip: false,
    paid_sat: "HELD",
    court_filing: false,
  };
}

export function createLedger() {
  return {
    spec: ACK_CLOCK_SPEC,
    spec_status: SPEC_STATUS,
    kind: ACK_CLOCK_KIND,
    live: false,
    signed: false,
    receipts: [],
  };
}

function parseTime(now) {
  if (typeof now === "number" && Number.isInteger(now) && now >= 0) return now;
  if (typeof now === "string" && now.trim()) {
    const ms = Date.parse(now);
    if (Number.isInteger(ms) && ms >= 0) return ms;
  }
  return null;
}

function label(value) {
  const s = String(value == null ? "" : value).normalize("NFKC").trim();
  if (!s || s.length > 80) return null;
  if (/[\u0000-\u001f]/.test(s)) return null;
  return s;
}

function matchKey(value) {
  const s = label(value);
  if (!s) return null;
  return s.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function machineSignal(name) {
  const folded = name.toLowerCase().replace(/[\s_]+/g, "-");
  return MACHINE_SIGNALS.has(folded);
}

function budgetOf(value) {
  if (value == null) return DEFAULT_ACK_BUDGET_MS;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 365 * DAY_MS) return null;
  return n;
}

function windowOf(value) {
  if (value == null) return DEFAULT_REOPEN_WINDOW_MS;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 3650 * DAY_MS) return null;
  return n;
}

function normalizeLadder(owner, ladder) {
  const names = [];
  const src = Array.isArray(ladder) ? ladder : [];
  for (const raw of src) {
    const person = label(raw);
    if (!person) return null;
    if (!names.includes(person)) names.push(person);
  }
  if (!names.includes(owner)) names.unshift(owner);
  return names;
}

function newItemId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return "item_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function projectItems(receipts) {
  const items = new Map();
  for (const rec of receipts || []) {
    if (!rec || !rec.item_id) continue;
    let item = items.get(rec.item_id);
    if (rec.event === "page_delivered") {
      if (!item) {
        item = {
          item_id: rec.item_id,
          requester: rec.requester,
          requester_key: rec.requester_key,
          issue: rec.issue,
          issue_key: rec.issue_key,
          opened_ms: rec.opened_ms,
          resolution_started_ms: rec.resolution_started_ms,
          original_receipt_hash: rec.hash,
          original_owner: rec.owner,
          original_ack_started_ms: rec.ack_clock_started_ms,
          ladder: Array.isArray(rec.ladder) ? rec.ladder.slice() : [],
          budget_ms: rec.budget_ms,
          handoff_count: 0,
          handoff_flagged: false,
          reopen_count: 0,
          reopen_flagged: false,
          re_resolve_started_ms: null,
          resolved_ms: null,
          resolution_ms: null,
          re_resolve_ms: null,
          ack_stopped: false,
          acked_ms: null,
          ack_latency_ms: null,
          human_name: null,
          status: "delivered",
          missed_for_start: null,
          missed_owner: null,
          exhausted: false,
          total_age_ms: rec.total_age_ms,
        };
        items.set(rec.item_id, item);
      }
      item.owner = rec.owner;
      item.owner_index = item.ladder.indexOf(rec.owner);
      item.ack_clock_started_ms = rec.ack_clock_started_ms;
      item.delivered_ms = rec.ts_ms;
      item.budget_ms = rec.budget_ms;
      item.ack_stopped = rec.ack_open === false;
      item.missed_for_start = null;
      item.missed_owner = null;
      item.exhausted = false;
      if (item.ack_stopped) item.status = "acked";
      else if (item.reopen_count > 0) item.status = "reopened";
      else item.status = "delivered";
      if (rec.handoff_count != null) item.handoff_count = rec.handoff_count;
      if (rec.handoff_flagged != null) item.handoff_flagged = rec.handoff_flagged === true;
      if (rec.total_age_ms != null) item.total_age_ms = rec.total_age_ms;
      continue;
    }
    if (!item) continue;
    if (rec.total_age_ms != null) item.total_age_ms = rec.total_age_ms;
    if (rec.event === "human_ack") {
      item.ack_stopped = true;
      item.acked_ms = rec.acked_ms;
      item.ack_latency_ms = rec.ack_latency_ms;
      item.human_name = rec.human_name;
      item.status = "acked";
    } else if (rec.event === "ack_miss") {
      item.last_miss_ms = rec.missed_ms;
      item.missed_for_start = rec.ack_clock_started_ms;
      item.missed_owner = rec.owner;
      item.exhausted = rec.exhausted === true;
      if (!item.ack_stopped) item.status = rec.exhausted ? "unacked" : "missed";
    } else if (rec.event === "reassign") {
      item.handoff_count = rec.handoff_count;
      item.handoff_flagged = rec.handoff_flagged === true;
      item.owner = rec.to;
      item.ack_clock_started_ms = rec.ack_clock_started_ms;
      item.ack_stopped = rec.ack_open === false;
      item.status = item.ack_stopped ? "acked" : "reassigned";
    } else if (rec.event === "resolved") {
      item.resolved_ms = rec.resolved_ms;
      item.resolution_ms = rec.resolution_ms;
      item.re_resolve_ms = rec.re_resolve_ms == null ? null : rec.re_resolve_ms;
      item.status = "resolved";
    } else if (rec.event === "reopen" || rec.event === "intake_linked") {
      item.reopen_count = rec.reopen_count;
      item.reopen_flagged = rec.reopen_flagged === true;
      item.re_resolve_started_ms = rec.re_resolve_started_ms;
      item.resolved_ms = null;
      item.resolution_ms = null;
      item.re_resolve_ms = null;
      item.handoff_count = rec.handoff_count;
      item.handoff_flagged = rec.handoff_flagged === true;
      item.status = "reopened";
    }
  }
  return items;
}

export function itemView(ledger, itemId) {
  const item = projectItems(ledger && ledger.receipts).get(itemId);
  if (!item) return null;
  return { ...item, ladder: item.ladder.slice(), live: false, signed: false };
}

function clockWasAcked(receipts, itemId, startMs) {
  return (receipts || []).some(
    (rec) =>
      rec &&
      rec.item_id === itemId &&
      rec.event === "human_ack" &&
      rec.stops_clock === true &&
      rec.ack_clock_started_ms === startMs,
  );
}

async function append(ledger, fields) {
  const prev = ledger.receipts.length ? ledger.receipts[ledger.receipts.length - 1] : null;
  const body = {
    kind: ACK_CLOCK_KIND,
    spec: ACK_CLOCK_SPEC,
    spec_status: SPEC_STATUS,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    live: false,
    signed: false,
    boundary: boundarySeal(),
    name_resolved: false,
    seq: prev ? prev.seq + 1 : 1,
    prev_hash: prev ? prev.hash : ZERO_HASH,
    ...fields,
  };
  const hash = await sha256Hex(canonicalize(body));
  const rec = { ...body, hash };
  ledger.receipts.push(rec);
  return rec;
}

function done(ledger, receipts, extra = {}) {
  const last = receipts[receipts.length - 1];
  const item = last ? itemView(ledger, last.item_id) : null;
  return {
    ok: true,
    spec: ACK_CLOCK_SPEC,
    spec_status: SPEC_STATUS,
    live: false,
    signed: false,
    written: receipts.length > 0,
    receipt: last || null,
    receipts,
    item,
    ...extra,
  };
}

function requireItem(ledger, itemId, now) {
  if (now == null) return fail("ACK-BAD-TIME", "now must be an integer millisecond time or an ISO timestamp");
  if (!itemId || !ITEM_RE.test(String(itemId))) return fail("ACK-NO-ITEM", "item_id is required");
  const item = projectItems(ledger.receipts).get(String(itemId));
  if (!item) return fail("ACK-NO-ITEM", "no sealed item with that id");
  if (now < item.opened_ms) return fail("ACK-BAD-TIME", "now is before the item opened");
  return { ok: true, item };
}

function age(item, now) {
  return now - item.opened_ms;
}

export async function openItem(ledger, input = {}) {
  if (!ledger || !Array.isArray(ledger.receipts)) return fail("ACK-BAD-INPUT", "ledger is required");
  const now = parseTime(input.now);
  if (now == null) return fail("ACK-BAD-TIME", "now must be an integer millisecond time or an ISO timestamp");
  const requester = label(input.requester);
  const issue = label(input.issue_key);
  const requesterKey = matchKey(input.requester);
  const issueKey = matchKey(input.issue_key);
  if (!requester || !issue || !requesterKey || !issueKey) {
    return fail("ACK-BAD-INPUT", "requester and issue_key are required");
  }
  const owner = label(input.owner);
  if (!owner) return fail("ACK-NO-OWNER", "owner is required");
  const ladder = normalizeLadder(owner, input.ladder);
  if (!ladder) return fail("ACK-BAD-INPUT", "ladder names must be 1-80 characters");
  const budget = budgetOf(input.budget_ms);
  if (budget == null) return fail("ACK-BAD-INPUT", "budget_ms must be a positive integer");
  const windowMs = windowOf(input.window_ms);
  if (windowMs == null) return fail("ACK-BAD-INPUT", "window_ms must be a positive integer");
  const items = projectItems(ledger.receipts);
  const match = findIntake(items, requesterKey, issueKey, now, windowMs);
  if (match) {
    return sealReopen(ledger, match, now, {
      event: "intake_linked",
      forced: true,
      window_ms: windowMs,
      match: "same_requester_same_issue_inside_window",
    });
  }
  let itemId = input.item_id == null || input.item_id === "" ? newItemId() : String(input.item_id).trim();
  if (!ITEM_RE.test(itemId)) return fail("ACK-BAD-INPUT", "item_id must be 1-80 chars [A-Za-z0-9_.:-]");
  if (items.has(itemId)) return fail("ACK-ITEM-EXISTS", "item_id is already sealed");
  const rec = await append(ledger, {
    event: "page_delivered",
    cause: "open",
    ts: new Date(now).toISOString(),
    ts_ms: now,
    item_id: itemId,
    requester,
    requester_key: requesterKey,
    issue,
    issue_key: issueKey,
    owner,
    ladder,
    budget_ms: budget,
    ack_clock_started_ms: now,
    ack_restarted: true,
    resumed: false,
    ack_open: true,
    stops_clock: false,
    resolution_started_ms: now,
    resolution_restarted: false,
    opened_ms: now,
    total_age_ms: 0,
    escalated_from: null,
    original_receipt_hash: null,
    handoff_count: 0,
    handoff_flagged: false,
    reopen_count: 0,
    reopen_flagged: false,
  });
  return done(ledger, [rec], { linked: false, new_item: true, item_id: itemId });
}

function findIntake(items, requesterKey, issueKey, now, windowMs) {
  let best = null;
  for (const item of items.values()) {
    if (item.requester_key !== requesterKey || item.issue_key !== issueKey) continue;
    const inside = item.resolved_ms == null || now <= item.resolved_ms + windowMs;
    if (!inside) continue;
    if (!best || item.opened_ms >= best.opened_ms) best = item;
  }
  return best;
}

async function sealReopen(ledger, item, now, extra) {
  const count = item.reopen_count + 1;
  const flagged = count >= REOPEN_FLAG_AT;
  const rec = await append(ledger, {
    event: extra.event,
    ts: new Date(now).toISOString(),
    ts_ms: now,
    item_id: item.item_id,
    requester: item.requester,
    requester_key: item.requester_key,
    issue: item.issue,
    issue_key: item.issue_key,
    reopen_count: count,
    reopen_flagged: flagged,
    original_receipt_hash: item.original_receipt_hash,
    resolution_started_ms: item.resolution_started_ms,
    resolution_restarted: false,
    re_resolve_started_ms: now,
    re_resolve_ms: 0,
    opened_ms: item.opened_ms,
    total_age_ms: age(item, now),
    handoff_count: item.handoff_count,
    handoff_flagged: item.handoff_flagged,
    stops_clock: false,
    forced: extra.forced === true,
    window_ms: extra.window_ms == null ? null : extra.window_ms,
    match: extra.match == null ? null : extra.match,
    refused_new_item: extra.event === "intake_linked",
  });
  return done(ledger, [rec], {
    linked: extra.event === "intake_linked",
    new_item: false,
    item_id: item.item_id,
  });
}

export async function reopen(ledger, input = {}) {
  if (!ledger || !Array.isArray(ledger.receipts)) return fail("ACK-BAD-INPUT", "ledger is required");
  const now = parseTime(input.now);
  const gate = requireItem(ledger, input.item_id, now);
  if (!gate.ok) return gate;
  return sealReopen(ledger, gate.item, now, { event: "reopen", forced: false, window_ms: null, match: null });
}

export async function humanAck(ledger, input = {}) {
  if (!ledger || !Array.isArray(ledger.receipts)) return fail("ACK-BAD-INPUT", "ledger is required");
  const now = parseTime(input.now);
  const gate = requireItem(ledger, input.item_id, now);
  if (!gate.ok) return gate;
  const item = gate.item;
  if (input.deliberate !== true) return fail("ACK-NOT-DELIBERATE", "only a deliberate human ack stops the clock");
  const human = label(input.human_name);
  if (!human || machineSignal(human)) return fail("ACK-NOT-NAMED", "ack needs a named human, not a read receipt or an auto-reply");
  if (item.ack_stopped) return fail("ACK-ALREADY-STOPPED", "this ack clock is already stopped");
  if (now < item.ack_clock_started_ms) return fail("ACK-BAD-TIME", "ack is before the ack clock started");
  const latency = now - item.ack_clock_started_ms;
  const rec = await append(ledger, {
    event: "human_ack",
    ts: new Date(now).toISOString(),
    ts_ms: now,
    item_id: item.item_id,
    human_name: human,
    deliberate: true,
    stops_clock: true,
    ack_clock_started_ms: item.ack_clock_started_ms,
    acked_ms: now,
    ack_latency_ms: latency,
    resolution_started_ms: item.resolution_started_ms,
    resolution_ms: null,
    resolution_restarted: false,
    opened_ms: item.opened_ms,
    total_age_ms: age(item, now),
    handoff_count: item.handoff_count,
    handoff_flagged: item.handoff_flagged,
    reopen_count: item.reopen_count,
    reopen_flagged: item.reopen_flagged,
  });
  return done(ledger, [rec]);
}

async function signal(ledger, input, event) {
  if (!ledger || !Array.isArray(ledger.receipts)) return fail("ACK-BAD-INPUT", "ledger is required");
  const now = parseTime(input.now);
  const gate = requireItem(ledger, input.item_id, now);
  if (!gate.ok) return gate;
  const item = gate.item;
  const actor = input.actor == null || input.actor === "" ? null : label(input.actor);
  if (input.actor != null && input.actor !== "" && !actor) return fail("ACK-BAD-INPUT", "actor must be 1-80 characters");
  const rec = await append(ledger, {
    event,
    signal: event,
    ts: new Date(now).toISOString(),
    ts_ms: now,
    item_id: item.item_id,
    actor,
    stops_clock: false,
    deliberate: false,
    ack_clock_started_ms: item.ack_clock_started_ms,
    resolution_started_ms: item.resolution_started_ms,
    resolution_restarted: false,
    opened_ms: item.opened_ms,
    total_age_ms: age(item, now),
  });
  return done(ledger, [rec]);
}

export function readReceipt(ledger, input = {}) {
  return signal(ledger, input, "read_receipt");
}

export function autoReply(ledger, input = {}) {
  return signal(ledger, input, "auto_reply");
}

async function checkOne(ledger, itemId, now) {
  const gate = requireItem(ledger, itemId, now);
  if (!gate.ok) return gate;
  const item = gate.item;
  if (item.ack_stopped) return { ok: true, missed: false, written: false, receipts: [], item: itemView(ledger, itemId) };
  if (item.missed_for_start === item.ack_clock_started_ms && item.missed_owner === item.owner) {
    return { ok: true, missed: false, written: false, already_missed: true, receipts: [], item: itemView(ledger, itemId) };
  }
  if (now < item.ack_clock_started_ms + item.budget_ms) {
    return { ok: true, missed: false, written: false, receipts: [], item: itemView(ledger, itemId) };
  }
  const idx = item.ladder.indexOf(item.owner);
  const next = idx >= 0 ? item.ladder[idx + 1] || null : null;
  const owner = item.owner;
  const start = item.ack_clock_started_ms;
  const miss = await append(ledger, {
    event: "ack_miss",
    ts: new Date(now).toISOString(),
    ts_ms: now,
    item_id: item.item_id,
    owner,
    budget_ms: item.budget_ms,
    ack_clock_started_ms: start,
    missed_ms: now,
    overdue_ms: now - (start + item.budget_ms),
    escalates_to: next,
    exhausted: next == null,
    stops_clock: false,
    resolution_started_ms: item.resolution_started_ms,
    resolution_restarted: false,
    opened_ms: item.opened_ms,
    total_age_ms: age(item, now),
    handoff_count: item.handoff_count,
    handoff_flagged: item.handoff_flagged,
  });
  const receipts = [miss];
  if (next) {
    const page = await append(ledger, {
      event: "page_delivered",
      cause: "escalation",
      ts: new Date(now).toISOString(),
      ts_ms: now,
      item_id: item.item_id,
      requester: item.requester,
      requester_key: item.requester_key,
      issue: item.issue,
      issue_key: item.issue_key,
      owner: next,
      ladder: item.ladder.slice(),
      budget_ms: item.budget_ms,
      ack_clock_started_ms: now,
      ack_restarted: true,
      resumed: false,
      ack_open: true,
      stops_clock: false,
      resolution_started_ms: item.resolution_started_ms,
      resolution_restarted: false,
      opened_ms: item.opened_ms,
      total_age_ms: age(item, now),
      escalated_from: owner,
      original_receipt_hash: item.original_receipt_hash,
      handoff_count: item.handoff_count,
      handoff_flagged: item.handoff_flagged,
      reopen_count: item.reopen_count,
      reopen_flagged: item.reopen_flagged,
    });
    receipts.push(page);
  }
  return done(ledger, receipts, { missed: true });
}

export async function checkBudget(ledger, input = {}) {
  if (!ledger || !Array.isArray(ledger.receipts)) return fail("ACK-BAD-INPUT", "ledger is required");
  const now = parseTime(input.now);
  if (now == null) return fail("ACK-BAD-TIME", "now must be an integer millisecond time or an ISO timestamp");
  if (input.item_id != null && input.item_id !== "") return checkOne(ledger, input.item_id, now);
  const ids = [...projectItems(ledger.receipts).keys()];
  const receipts = [];
  for (const id of ids) {
    const out = await checkOne(ledger, id, now);
    if (!out.ok) return out;
    if (out.receipts) receipts.push(...out.receipts);
  }
  return {
    ok: true,
    spec: ACK_CLOCK_SPEC,
    live: false,
    signed: false,
    written: receipts.length > 0,
    missed: receipts.some((rec) => rec.event === "ack_miss"),
    receipts,
  };
}

export async function reassign(ledger, input = {}) {
  if (!ledger || !Array.isArray(ledger.receipts)) return fail("ACK-BAD-INPUT", "ledger is required");
  const now = parseTime(input.now);
  const gate = requireItem(ledger, input.item_id, now);
  if (!gate.ok) return gate;
  const item = gate.item;
  const to = label(input.to);
  if (!to) return fail("ACK-NO-OWNER", "reassign needs the next owner");
  if (to === item.owner) return fail("ACK-REASSIGN-SAME", "reassign to the current owner does not bump a handoff");
  const count = item.handoff_count + 1;
  const flagged = count > HANDOFF_FLAG_AFTER;
  const resumed = to === item.original_owner;
  const start = resumed ? item.original_ack_started_ms : now;
  const ackOpen = resumed ? !clockWasAcked(ledger.receipts, item.item_id, item.original_ack_started_ms) : true;
  const hand = await append(ledger, {
    event: "reassign",
    ts: new Date(now).toISOString(),
    ts_ms: now,
    item_id: item.item_id,
    from: item.owner,
    to,
    handoff_count: count,
    handoff_flagged: flagged,
    ack_clock_started_ms: start,
    ack_restarted: !resumed,
    resumed,
    ack_open: ackOpen,
    stops_clock: false,
    resolution_started_ms: item.resolution_started_ms,
    resolution_restarted: false,
    opened_ms: item.opened_ms,
    total_age_ms: age(item, now),
    reopen_count: item.reopen_count,
    reopen_flagged: item.reopen_flagged,
  });
  const page = await append(ledger, {
    event: "page_delivered",
    cause: "reassign",
    ts: new Date(now).toISOString(),
    ts_ms: now,
    item_id: item.item_id,
    requester: item.requester,
    requester_key: item.requester_key,
    issue: item.issue,
    issue_key: item.issue_key,
    owner: to,
    ladder: item.ladder.slice(),
    budget_ms: item.budget_ms,
    ack_clock_started_ms: start,
    ack_restarted: !resumed,
    resumed,
    ack_open: ackOpen,
    stops_clock: false,
    resolution_started_ms: item.resolution_started_ms,
    resolution_restarted: false,
    opened_ms: item.opened_ms,
    total_age_ms: age(item, now),
    escalated_from: null,
    original_receipt_hash: item.original_receipt_hash,
    handoff_count: count,
    handoff_flagged: flagged,
    reopen_count: item.reopen_count,
    reopen_flagged: item.reopen_flagged,
  });
  return done(ledger, [hand, page]);
}

export async function resolveItem(ledger, input = {}) {
  if (!ledger || !Array.isArray(ledger.receipts)) return fail("ACK-BAD-INPUT", "ledger is required");
  const now = parseTime(input.now);
  const gate = requireItem(ledger, input.item_id, now);
  if (!gate.ok) return gate;
  const item = gate.item;
  if (item.resolved_ms != null) return fail("ACK-ALREADY-RESOLVED", "resolve does not restart; reopen before a new resolve");
  if (now < item.resolution_started_ms) return fail("ACK-BAD-TIME", "resolve is before the resolution clock");
  const reResolve = item.re_resolve_started_ms == null ? null : now - item.re_resolve_started_ms;
  if (reResolve != null && reResolve < 0) return fail("ACK-BAD-TIME", "resolve is before the re-resolve clock");
  const rec = await append(ledger, {
    event: "resolved",
    ts: new Date(now).toISOString(),
    ts_ms: now,
    item_id: item.item_id,
    resolution_started_ms: item.resolution_started_ms,
    resolution_restarted: false,
    resolved_ms: now,
    resolution_ms: now - item.resolution_started_ms,
    re_resolve_started_ms: item.re_resolve_started_ms,
    re_resolve_ms: reResolve,
    ack_latency_ms: item.ack_latency_ms,
    ack_stopped: item.ack_stopped,
    stops_clock: false,
    opened_ms: item.opened_ms,
    total_age_ms: age(item, now),
    handoff_count: item.handoff_count,
    handoff_flagged: item.handoff_flagged,
    reopen_count: item.reopen_count,
    reopen_flagged: item.reopen_flagged,
  });
  return done(ledger, [rec]);
}

export function ackLatencyFromReceipts(receipts, range = {}) {
  const from = range.from_ms == null ? null : range.from_ms;
  const to = range.to_ms == null ? null : range.to_ms;
  const clocks = new Map();
  const rows = [];
  for (const rec of receipts || []) {
    if (!rec) continue;
    if (rec.event === "page_delivered" || rec.event === "reassign") {
      clocks.set(rec.item_id, rec.ack_clock_started_ms);
    } else if (rec.event === "human_ack") {
      const start = clocks.get(rec.item_id);
      const latency = rec.acked_ms - start;
      if (from != null && rec.acked_ms < from) continue;
      if (to != null && rec.acked_ms >= to) continue;
      rows.push({
        item_id: rec.item_id,
        human_name: rec.human_name,
        acked_ms: rec.acked_ms,
        ack_clock_started_ms: start,
        ack_latency_ms: latency,
        sealed_ack_latency_ms: rec.ack_latency_ms,
        resolution_ms: rec.resolution_ms,
      });
    }
  }
  const sum = rows.reduce((acc, row) => acc + row.ack_latency_ms, 0);
  return {
    count: rows.length,
    mean_ms: rows.length ? Math.round(sum / rows.length) : null,
    rows,
    source: "receipts",
  };
}

export async function verifyAckChain(receipts) {
  const errors = [];
  const list = Array.isArray(receipts) ? receipts : [];
  let prev = ZERO_HASH;
  const starts = new Map();
  const handoffs = new Map();
  const reopens = new Map();
  const seenPage = new Set();
  for (let i = 0; i < list.length; i++) {
    const rec = list[i];
    if (!rec || rec.kind !== ACK_CLOCK_KIND) {
      errors.push({ seq: rec && rec.seq, error: "bad_kind" });
      continue;
    }
    if (rec.live !== false || rec.spec_status !== SPEC_STATUS) errors.push({ seq: rec.seq, error: "live" });
    if (rec.signed !== false || Object.prototype.hasOwnProperty.call(rec, "signature")) {
      errors.push({ seq: rec.seq, error: "signed" });
    }
    const b = rec.boundary;
    if (
      !b ||
      b.live !== false ||
      b.signed !== false ||
      b.cap7_is_icann !== false ||
      b.cap7_names_only !== true ||
      b.public_icann !== false ||
      b.cap7_public_icann !== false ||
      b.public_egress_ip !== false ||
      b.paid_sat !== "HELD"
    ) {
      errors.push({ seq: rec.seq, error: "boundary" });
    }
    if (rec.name_resolved !== false) errors.push({ seq: rec.seq, error: "name_resolved" });
    if (rec.prev_hash !== prev) errors.push({ seq: rec.seq, error: "prev_hash_mismatch" });
    if (rec.seq !== i + 1) errors.push({ seq: rec.seq, error: "seq_mismatch" });
    const { hash, ...unsigned } = rec;
    const again = await sha256Hex(canonicalize(unsigned));
    if (again !== hash) errors.push({ seq: rec.seq, error: "hash_mismatch" });
    if (!EVENTS.includes(rec.event)) errors.push({ seq: rec.seq, error: "bad_event" });
    if (rec.event === "human_ack") {
      if (rec.stops_clock !== true || rec.deliberate !== true || !rec.human_name) {
        errors.push({ seq: rec.seq, error: "ack_shape" });
      }
    }
    if (rec.event === "read_receipt" || rec.event === "auto_reply" || rec.event === "ack_miss" || rec.event === "resolved") {
      if (rec.stops_clock !== false) errors.push({ seq: rec.seq, error: "clock_not_stopped" });
    }
    if (rec.resolution_started_ms != null) {
      if (!starts.has(rec.item_id)) starts.set(rec.item_id, rec.resolution_started_ms);
      else if (starts.get(rec.item_id) !== rec.resolution_started_ms) {
        errors.push({ seq: rec.seq, error: "resolution_restarted" });
      }
    }
    if (rec.resolution_restarted === true) errors.push({ seq: rec.seq, error: "resolution_restarted" });
    if (rec.event === "reassign") {
      const n = (handoffs.get(rec.item_id) || 0) + 1;
      handoffs.set(rec.item_id, n);
      if (rec.handoff_count !== n) errors.push({ seq: rec.seq, error: "handoff_count" });
      if (rec.handoff_flagged !== n > HANDOFF_FLAG_AFTER) errors.push({ seq: rec.seq, error: "handoff_flag" });
    }
    if (rec.event === "reopen" || rec.event === "intake_linked") {
      const n = (reopens.get(rec.item_id) || 0) + 1;
      reopens.set(rec.item_id, n);
      if (rec.reopen_count !== n) errors.push({ seq: rec.seq, error: "reopen_count" });
      if (rec.reopen_flagged !== n >= REOPEN_FLAG_AT) errors.push({ seq: rec.seq, error: "reopen_flag" });
      if (!rec.original_receipt_hash) errors.push({ seq: rec.seq, error: "reopen_link" });
    }
    if (rec.event === "page_delivered" && rec.cause === "open") {
      if (seenPage.has(rec.item_id)) errors.push({ seq: rec.seq, error: "second_open" });
      seenPage.add(rec.item_id);
    }
    if (rec.event === "page_delivered" && rec.cause === "escalation") {
      const prior = list[i - 1];
      if (!prior || prior.event !== "ack_miss" || prior.item_id !== rec.item_id || prior.escalates_to !== rec.owner) {
        errors.push({ seq: rec.seq, error: "escalation_link" });
      }
    }
    if (rec.event === "page_delivered" && rec.cause === "reassign") {
      const prior = list[i - 1];
      if (!prior || prior.event !== "reassign" || prior.item_id !== rec.item_id || prior.to !== rec.owner) {
        errors.push({ seq: rec.seq, error: "reassign_link" });
      }
    }
    prev = rec.hash;
  }
  const latency = ackLatencyFromReceipts(list);
  for (const row of latency.rows) {
    if (row.ack_latency_ms !== row.sealed_ack_latency_ms) {
      errors.push({ item_id: row.item_id, error: "ack_latency_drift" });
    }
    if (row.resolution_ms != null) errors.push({ item_id: row.item_id, error: "ack_mixed_resolution" });
  }
  return {
    ok: errors.length === 0,
    spec: ACK_CLOCK_SPEC,
    live: false,
    signed: false,
    errors,
    count: list.length,
    head: list.length ? list[list.length - 1].hash : null,
  };
}

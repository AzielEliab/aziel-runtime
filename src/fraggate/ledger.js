/**
 * FragGate ask/refuse ledger — TemporalLock-shaped hash chain.
 * Serialized writer: seq/tip assigned and committed before ack.
 * Worker deploy uses CHAINLOCK Durable Object (chain name "fraggate").
 * In-process queue alone does not serialize cross-isolate writes.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { canonicalize, sha256Hex, ZERO_HASH } from "../session-core.js";

export const LEDGER_KIND = "aziel-runtime.fraggate.ledger";
export const LEDGER_CAP = 64;
export const LEDGER_CHAIN = "fraggate";

const ledgerAls = new AsyncLocalStorage();
const isolateEntries = new Map();
let isolateSeq = 0;
let isolateTip = ZERO_HASH;
let isolateWrite = Promise.resolve();
let isolateLedger = emptyLedger();

export function emptyLedger() {
  return {
    kind: LEDGER_KIND,
    seq: 0,
    tip: ZERO_HASH,
    entries: [],
  };
}

export function runWithLedgerStore(store, fn) {
  return ledgerAls.run({ store }, fn);
}

export function boundLedgerStore() {
  const ctx = ledgerAls.getStore();
  return ctx && ctx.store ? ctx.store : null;
}

function viewFromEntries(entryMap, seq, tip) {
  const entries = [...entryMap.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, e]) => e)
    .slice(-LEDGER_CAP);
  const last = entries.length ? entries[entries.length - 1] : null;
  return {
    kind: LEDGER_KIND,
    seq: last ? last.seq : seq,
    tip: last ? last.hash : tip,
    entries,
  };
}

function refreshIsolateView() {
  isolateLedger = viewFromEntries(isolateEntries, isolateSeq, isolateTip);
  return isolateLedger;
}

export function resetLedger() {
  isolateEntries.clear();
  isolateSeq = 0;
  isolateTip = ZERO_HASH;
  isolateLedger = emptyLedger();
  return isolateLedger;
}

export function currentLedger() {
  return isolateLedger;
}

export function ledgerTipView(ledger = isolateLedger) {
  const last = ledger.entries.length ? ledger.entries[ledger.entries.length - 1] : null;
  return {
    kind: LEDGER_KIND,
    seq: ledger.seq,
    tip: ledger.tip,
    asked: last ? last.asked : null,
    refused: last ? last.refused : null,
    code: last ? last.code : null,
    name: last ? last.name : null,
    op: last ? last.op : null,
    prev: last ? last.prev : ZERO_HASH,
    hash: last ? last.hash : ZERO_HASH,
    window_cap: LEDGER_CAP,
    ephemeral_window: true,
    memory_store_is_durable: false,
  };
}

function isLedgerSnapshot(value) {
  return Boolean(value && value.kind === LEDGER_KIND && Array.isArray(value.entries));
}

function isAppendOpts(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value.store || value.env || value.idempotency_key || value.idemp || value.caller),
  );
}

export async function composeLedgerEntry(record, { seq, prev }) {
  const body = {
    kind: LEDGER_KIND,
    seq,
    prev,
    asked: Boolean(record && record.asked),
    refused: Boolean(record && record.refused),
    code: record && record.code ? String(record.code) : null,
    name: record && record.name ? String(record.name) : null,
    op: record && record.op ? String(record.op) : null,
    gate: record && record.gate ? String(record.gate) : null,
    at: (record && record.at) || new Date().toISOString(),
  };
  const hash = await sha256Hex(canonicalize(body));
  return { ...body, hash };
}

async function appendToSnapshot(record, ledger) {
  const seq = ledger.seq + 1;
  const entry = await composeLedgerEntry(record, { seq, prev: ledger.tip });
  const next = {
    kind: LEDGER_KIND,
    seq,
    tip: entry.hash,
    entries: [...ledger.entries, entry].slice(-LEDGER_CAP),
  };
  return { ledger: next, tip: ledgerTipView(next) };
}

async function hydrateFromStore(store) {
  if (!store) return refreshIsolateView();
  let rows = [];
  if (typeof store.loadRecords === "function") {
    rows = await store.loadRecords(LEDGER_CHAIN);
  } else if (typeof store.get === "function") {
    const { parseJsonl } = await import("../chainlock/store.js");
    rows = parseJsonl(await store.get(`chains/${LEDGER_CHAIN}`));
  }
  isolateEntries.clear();
  for (const row of rows || []) {
    if (row && row.seq) isolateEntries.set(row.seq, row);
  }
  const last = rows && rows.length ? rows[rows.length - 1] : null;
  isolateSeq = last ? last.seq : 0;
  isolateTip = last ? last.hash : ZERO_HASH;
  return refreshIsolateView();
}

export async function loadLedger(store) {
  return hydrateFromStore(store);
}

function serialized(fn) {
  const run = isolateWrite.then(fn, fn);
  isolateWrite = run.then(
    () => {},
    () => {},
  );
  return run;
}

async function appendOnStore(record, store, idempotencyKey, caller) {
  const ack = await store.appendAtomic(
    {
      kind: "ledger",
      chain: LEDGER_CHAIN,
      caller: caller || "",
      idempotencyKey,
      genesis: ZERO_HASH,
      input: record,
    },
    async ({ prev, seq }) => composeLedgerEntry(record, { seq: seq + 1, prev: prev || ZERO_HASH }),
  );
  if (!ack || !ack.ok) {
    return { ledger: currentLedger(), tip: ledgerTipView(currentLedger()), refuse: ack && ack.refuse };
  }
  const ledger = await hydrateFromStore(store);
  return {
    ledger,
    tip: ledgerTipView(ledger),
    replayed: Boolean(ack.replayed),
  };
}

async function appendIsolate(record, idempotencyKey) {
  if (idempotencyKey) {
    for (const entry of isolateEntries.values()) {
      if (entry && entry.idemp === idempotencyKey) {
        const ledger = refreshIsolateView();
        return { ledger, tip: ledgerTipView(ledger), replayed: true };
      }
    }
  }
  const seq = isolateSeq + 1;
  const prev = isolateTip;
  const entry = await composeLedgerEntry(record, { seq, prev });
  if (idempotencyKey) entry.idemp = idempotencyKey;
  isolateEntries.set(seq, entry);
  isolateSeq = seq;
  isolateTip = entry.hash;
  const next = refreshIsolateView();
  return { ledger: next, tip: ledgerTipView(next), replayed: false };
}

/**
 * Append one asked-vs-refused record. Returns { ledger, tip }.
 * Sequence and tip are assigned inside the serialized writer and committed
 * before this function acknowledges the event.
 */
export async function appendLedger(record, second = isolateLedger) {
  if (isLedgerSnapshot(second) && second !== isolateLedger) {
    return appendToSnapshot(record, second);
  }
  const opts = isAppendOpts(second) ? second : {};
  const store = opts.store || boundLedgerStore();
  const idempotencyKey = String(
    (record && (record.idempotency_key || record.idemp || record.id)) ||
      opts.idempotency_key ||
      opts.idemp ||
      "",
  ).trim();
  const caller = String((record && record.caller) || opts.caller || "").trim();
  return serialized(() => {
    if (store && typeof store.appendAtomic === "function") {
      return appendOnStore(record, store, idempotencyKey || null, caller);
    }
    return appendIsolate(record, idempotencyKey || null);
  });
}

export async function verifyLedger(ledger = isolateLedger) {
  const rows = ledger && Array.isArray(ledger.entries) ? ledger.entries : [];
  const breaks = [];
  let prev = rows.length ? rows[0].prev : ZERO_HASH;
  for (let i = 0; i < rows.length; i++) {
    const entry = rows[i];
    if (!entry || !entry.hash) {
      breaks.push({ seq: i + 1, reason: "unreadable" });
      break;
    }
    if (entry.prev !== prev) {
      breaks.push({ seq: entry.seq, reason: "broken-prev", expected: prev, got: entry.prev });
      break;
    }
    const { hash, idemp, ...body } = entry;
    const recomputed = await sha256Hex(canonicalize(body));
    if (recomputed !== hash) {
      breaks.push({ seq: entry.seq, reason: "hash-miss" });
      break;
    }
    prev = hash;
  }
  return { ok: breaks.length === 0, breaks, n: rows.length };
}

/**
 * FragGate ask/refuse ledger — TemporalLock-shaped hash chain.
 * Append-only tip in this isolate (Worker or local process).
 * Does not invent a second evidence religion: canonicalize + SHA-256.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { canonicalize, sha256Hex, ZERO_HASH } from "../session-core.js";

export const LEDGER_KIND = "aziel-runtime.fraggate.ledger";
export const LEDGER_CAP = 64;

export function emptyLedger() {
  return {
    kind: LEDGER_KIND,
    seq: 0,
    tip: ZERO_HASH,
    entries: [],
  };
}

let isolateLedger = emptyLedger();

export function resetLedger() {
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
  };
}

/**
 * Append one asked-vs-refused record. Returns { ledger, tip }.
 */
export async function appendLedger(record, ledger = isolateLedger) {
  const seq = ledger.seq + 1;
  const body = {
    kind: LEDGER_KIND,
    seq,
    prev: ledger.tip,
    asked: Boolean(record && record.asked),
    refused: Boolean(record && record.refused),
    code: record && record.code ? String(record.code) : null,
    name: record && record.name ? String(record.name) : null,
    op: record && record.op ? String(record.op) : null,
    gate: record && record.gate ? String(record.gate) : null,
    at: (record && record.at) || new Date().toISOString(),
  };
  const hash = await sha256Hex(canonicalize(body));
  const entry = { ...body, hash };
  const next = {
    kind: LEDGER_KIND,
    seq,
    tip: hash,
    entries: [...ledger.entries, entry].slice(-LEDGER_CAP),
  };
  if (ledger === isolateLedger) isolateLedger = next;
  return {
    ledger: next,
    tip: ledgerTipView(next),
  };
}

/**
 * ChainLock CL-0.4 — append-only stamp chains + slim cards.
 *
 * Paper: docs/designs/CL-WP-0.4.md
 * Not a Softwares-tab product. Not a public ledger. Cites GodLock; does not write godlock.uk.
 * Author: Aziel Eliab only.
 */

import { boundMemoryMeta } from "../memory/meta.js";
import { canonicalize, sha256Hex } from "../session-core.js";
import { chainKey, parseJsonl, storeFor, toJsonl, VAULT_CHAINS_PATH, writerName } from "./store.js";
import { anchorRefNow, chainIntegrity } from "../anchor.js";
import { LATTICE_SPEC, LatticeError, latticeDocumentHash, latticeTips, planLattice, verifyLattice } from "../dual-lattice.js";

export const CL_VERSION = "CL-0.4";
export const CL_SPEC = "CL-WP-0.4";
export const CL_AUTHOR = "Aziel Eliab";
export const CL_NAMESPACE = "chainlock@aziel";
export const GENESIS = "GENESIS";
export const SUBJECT_CAP = 80;
export const FACT_CAP = 160;
export const CARD_CAP = 4096;
export const STM_WINDOW = 32;
export const RECALL_DEPTH_MAX = 5;

export const ROSTER = Object.freeze([
  "genesis",
  "identity",
  "ssh",
  "session",
  "acts",
  "evidence",
  "recall",
  "mesh",
  "library",
  "learn",
]);

/**
 * Runtime-internal chains (not on the public ROSTER, so chainlock_append cannot forge into them).
 * AZRT-REFUSAL-RECEIPT-1.0: sealed policy refusals and the next action after one (append-only).
 */
export const INTERNAL_CHAINS = Object.freeze(["refusals"]);

/**
 * LATTICE-DOC-UNIQUE-1.0: document chains. A document (stampDocumentHash: chain, kind,
 * subject, fact; no ids or times) may be stored once across every caller and mode.
 * A second copy online, offline, or under another user is refused LATTICE-DOUBLE-*.
 * The claim index is checked before the write; if it cannot be read, the write is
 * refused (fail closed). Event chains (session, acts, mesh, learn, recall, ...) are
 * not documents and keep their own rules.
 */
export const DOCUMENT_CHAINS = Object.freeze(["evidence", "library", "identity"]);
export const DOC_UNIQUE_SPEC = "LATTICE-DOC-UNIQUE-1.0";

/**
 * Normalize document text for the uniqueness index: Unicode NFKC (fullwidth and compatibility
 * forms fold), strip format characters \p{Cf} (U+200B, U+200D, U+00AD, ...), collapse
 * whitespace, trim, case-fold. "ｆirst  fact" and "fi\u00ADrst fact" are the same document.
 */
export function normalizeDocText(text) {
  return String(text == null ? "" : text)
    .normalize("NFKC")
    .replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase()
    .normalize("NFKC");
}

/**
 * Content hash for LATTICE-DOC-UNIQUE-1.0: normalized subject + fact only. Chain and kind are
 * left out on purpose, so the same text is one document across chains and kinds. (The lattice
 * document_hash in each stamp is unchanged, so existing rows still verify.)
 */
export async function documentContentHash(src) {
  return latticeDocumentHash({
    spec: DOC_UNIQUE_SPEC,
    subject: normalizeDocText(clip(src && (src.s || src.subject), SUBJECT_CAP)),
    fact: normalizeDocText(clip(src && (src.f || src.fact), FACT_CAP)),
  });
}

/** Claim a document hash. Only the Durable Object index is atomic; anything else fails closed. */
async function claimDocument(store, doc, owner, idemp) {
  try {
    if (store && typeof store.docClaim === "function") {
      const got = await store.docClaim(doc, owner, idemp);
      if (got && typeof got.ok === "boolean") return got;
    }
  } catch {
    /* fail closed below */
  }
  return { ok: false, refuse: "lattice-doc-index", code: "LATTICE-DOC-INDEX-UNAVAILABLE" };
}

async function releaseDocument(store, doc, owner) {
  try {
    if (store && typeof store.docRelease === "function") return await store.docRelease(doc, owner);
  } catch {
    /* a stale claim only blocks a retry of the same document; it never allows a double */
  }
  return null;
}

/**
 * Backfill: index document rows written before LATTICE-DOC-UNIQUE-1.0. `targets` is a list of
 * { chain, caller } (caller "" for the public chain). Each row claims its content hash with the
 * row id as idempotency key, so re-running is safe. A hash already owned by another user/chain is
 * reported as a pre-existing double; nothing is deleted or rewritten.
 */
export async function backfillDocumentIndex(storeOrEnv, targets = []) {
  const store = storeFor(storeOrEnv);
  const out = { ok: true, spec: DOC_UNIQUE_SPEC, indexed: 0, already: 0, doubles: [], unavailable: 0 };
  for (const t of targets) {
    const chain = String((t && t.chain) || "").trim();
    if (!DOCUMENT_CHAINS.includes(chain)) continue;
    const caller = String((t && t.caller) || "").trim();
    const rows = await loadChain(store, chain, caller);
    for (const row of rows) {
      if (!row || !row.fact) continue;
      const doc = await documentContentHash(row);
      const got = await claimDocument(store, doc, caller + "|" + chain, String(row.id || ""));
      if (got.ok && got.fresh) out.indexed++;
      else if (got.ok) out.already++;
      else if (got.code === "LATTICE-DOC-INDEX-UNAVAILABLE") { out.unavailable++; out.ok = false; }
      else out.doubles.push({ chain, caller, id: row.id || null, document_hash: doc, code: got.code });
    }
  }
  return out;
}

export const DOC_BACKFILL_PAGE_MAX = 100;

/**
 * Paged, resumable backfill (operator entry point). Reads rows [cursor, cursor+limit) of one
 * document chain from the CHAINLOCK Durable Object and claims each row's content hash (row id as
 * idempotency key, so re-running a page is safe). Returns next_cursor; done when it reaches the
 * tip. Fails closed without the DO. Pre-existing doubles are reported, never deleted.
 */
export async function backfillDocumentPage(storeOrEnv, { chain, caller = "", cursor = 1, limit = 50 } = {}) {
  const c = String(chain || "").trim();
  const who = String(caller || "").trim();
  const from = Math.floor(Number(cursor));
  const n = Math.min(Math.max(Math.floor(Number(limit)) || 0, 1), DOC_BACKFILL_PAGE_MAX);
  if (!DOCUMENT_CHAINS.includes(c) || !Number.isFinite(from) || from < 1) {
    return { ok: false, code: "DOC-BACKFILL-BAD-QUERY", spec: DOC_UNIQUE_SPEC, chains: DOCUMENT_CHAINS.slice() };
  }
  const store = storeFor(storeOrEnv);
  if (!store || typeof store.chainRows !== "function" || typeof store.docClaim !== "function") {
    return { ok: false, code: "LATTICE-DOC-INDEX-UNAVAILABLE", spec: DOC_UNIQUE_SPEC, message: DOUBLE_MESSAGE_UNAVAILABLE };
  }
  let page;
  try {
    page = await store.chainRows(writerName(c, who), from, n);
  } catch {
    page = null;
  }
  if (!page || page.ok !== true || !Array.isArray(page.rows)) {
    return { ok: false, code: "LATTICE-DOC-INDEX-UNAVAILABLE", spec: DOC_UNIQUE_SPEC, chain: c, caller: who, cursor: from, message: DOUBLE_MESSAGE_UNAVAILABLE };
  }
  const out = { ok: true, spec: DOC_UNIQUE_SPEC, chain: c, caller: who, cursor: from, limit: n, indexed: 0, already: 0, doubles: [], seq: Number(page.seq) || 0 };
  for (const { seq, row } of page.rows) {
    if (!row || !row.fact) continue;
    const doc = await documentContentHash(row);
    const got = await claimDocument(store, doc, who + "|" + c, String(row.id || ""));
    if (got.ok && got.fresh) out.indexed++;
    else if (got.ok) out.already++;
    else if (got.code === "LATTICE-DOC-INDEX-UNAVAILABLE") return { ...out, ok: false, code: got.code, next_cursor: seq, done: false };
    else out.doubles.push({ seq, id: row.id || null, document_hash: doc, code: got.code });
  }
  const last = page.rows.length ? page.rows[page.rows.length - 1].seq : from - 1;
  out.next_cursor = last + 1;
  out.done = last >= out.seq;
  return out;
}

/**
 * DOC-WRITERS-1.0: enumerate the (caller, chain) pairs to backfill, paged. The public document
 * chains are always listed first; then every caller chain registered in the document index.
 * A caller chain is registered the first time it claims a document (LATTICE-DOC-UNIQUE-1.0 on).
 */
export async function listDocumentWriters(storeOrEnv, { cursor = 0, limit = 100 } = {}) {
  const store = storeFor(storeOrEnv);
  if (!store || typeof store.docWriters !== "function") return { ok: false, code: "LATTICE-DOC-INDEX-UNAVAILABLE", spec: DOC_UNIQUE_SPEC };
  let got;
  try {
    got = await store.docWriters(cursor, limit);
  } catch {
    got = null;
  }
  if (!got || got.ok !== true) return { ok: false, code: "LATTICE-DOC-INDEX-UNAVAILABLE", spec: DOC_UNIQUE_SPEC };
  const first = Math.floor(Number(cursor)) === 0 || !cursor ? DOCUMENT_CHAINS.map((chain) => ({ caller: "", chain })) : [];
  // Public chains are always on the first page, so registered public entries are skipped.
  const writers = first.concat(got.writers.filter((w) => w.caller !== "" && DOCUMENT_CHAINS.includes(w.chain)));
  return { ok: true, spec: "DOC-WRITERS-1.0", writers, next_cursor: got.next_cursor, done: got.done, total_registered: got.total };
}

const DOUBLE_MESSAGE_UNAVAILABLE = "The document index (CHAINLOCK Durable Object) could not be read, so nothing was indexed (fail closed).";

const DOUBLE_MESSAGE = {
  "LATTICE-DOUBLE": "This document is already stored on this chain. The document hash matched, so it was not written twice.",
  "LATTICE-DOUBLE-CROSS": "This document is already stored under another user or chain. The document hash matched, so it was not written twice.",
  "LATTICE-DOC-INDEX-UNAVAILABLE": "The document index could not be read, so the write was refused (fail closed).",
};

/**
 * Additive optional stamp fields (2.0 additive-only). Present only when given, so
 * every stamp written before them hashes exactly as before.
 * AZRT-ANCHOR-1.0 anchor, AZRT-REFUSAL-RECEIPT-1.0 refusal, AZRT-GOAL-LINK-1.0 follows/goal_key,
 * AZRT-SCHEMA-PIN-1.0 schema_hash, AZRT-CONTEXT-HASH-1.0 context_hash/node_ids,
 * AZRT-EXPECT-SPEC-1.0 spec_ref/expect_hash.
 */
export const ADDITIVE_STAMP_FIELDS = Object.freeze([
  "anchor",
  "refusal",
  "follows",
  "goal_key",
  "schema_hash",
  "context_hash",
  "node_ids",
  "spec_ref",
  "expect_hash",
]);
const ADDITIVE_FIELD_BYTES = 1024;

function additiveValue(value) {
  if (value == null) return undefined;
  try {
    const text = JSON.stringify(value);
    if (!text || text.length > ADDITIVE_FIELD_BYTES) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export const VAULT_NOTE =
  "Local CLI vault: vault/chains/<name>.jsonl (source of truth). Worker CHAINLOCK Durable Object is the concurrent writer (individual records, commit-before-ack). USES KV is fallback without CAS. Private SSH keys do not live on the Worker.";

function clip(text, cap) {
  const s = text == null ? "" : String(text);
  if (s.length <= cap) return s;
  return s.slice(0, cap);
}

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "cl_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hashFieldsOf(obj) {
  const skip = new Set(["stamp_sha256", "hash", "h", "lockset_sha256"]);
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (skip.has(k) || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export async function stampSha256(stamp) {
  return sha256Hex(canonicalize(hashFieldsOf(stamp)));
}

export async function factHash(fact) {
  return sha256Hex(clip(fact, FACT_CAP));
}

export async function loadChain(store, name, caller) {
  const keyName = caller ? `${String(caller).trim()}/${String(name || "").trim()}` : String(name || "").trim();
  if (store && typeof store.loadRecords === "function") {
    return store.loadRecords(keyName);
  }
  const raw = await store.get(chainKey(name, caller));
  return parseJsonl(raw);
}

export async function saveChain(store, name, rows, caller) {
  if (store && typeof store.replaceRecords === "function") {
    const keyName = caller ? `${String(caller).trim()}/${String(name || "").trim()}` : String(name || "").trim();
    await store.replaceRecords(keyName, rows);
    return;
  }
  await store.put(chainKey(name, caller), toJsonl(rows));
}

/**
 * Document content for the dual hash lattice. Ids and timestamps are left out,
 * so the same stamp content hashes the same way twice (offline double refuse).
 */
export async function stampDocumentHash(src) {
  const chain = String((src && (src.c || src.chain)) || "session").trim() || "session";
  return latticeDocumentHash({
    c: chain,
    k: (src && (src.k || src.kind)) || "stamp",
    subject: clip(src && (src.s || src.subject), SUBJECT_CAP),
    fact: clip(src && (src.f || src.fact), FACT_CAP),
  });
}

function offlineOf(src) {
  return Boolean(src && (src.offline === true || src.offline === "true"));
}

/**
 * Compose one stamp. Every stamp carries the dual hash lattice (primary +
 * secondary). Give `rows` (existing chain rows) or `latticeTips` plus
 * `hasOffline` from a writer that keeps lattice tips in its metadata.
 * Throws LatticeError LATTICE-DOUBLE / LATTICE-USERNAME-ABSENT before any write.
 */
export async function composeChainlockStamp(src, { prev, rows = null, latticeTips: tips = null, hasOffline = null } = {}) {
  const chain = String((src && (src.c || src.chain)) || "session").trim() || "session";
  const subject = clip(src && (src.s || src.subject), SUBJECT_CAP);
  const fact = clip(src && (src.f || src.fact), FACT_CAP);
  const lattice = await planLattice({
    document_hash: await stampDocumentHash(src),
    offline: offlineOf(src),
    username: src && (src.username || src.user),
    rows: rows || [],
    tips,
    hasOffline,
  });
  const unsigned = {
    v: CL_VERSION,
    id: (src && src.id) || newId(),
    c: chain,
    k: (src && (src.k || src.kind)) || "stamp",
    t: (src && src.t) || new Date().toISOString(),
    prev,
    subject,
    fact,
    ns: CL_NAMESPACE,
    author: CL_AUTHOR,
    lattice,
  };
  if (src && src.r) unsigned.r = String(src.r);
  if (src && src.rose_transition_hash) unsigned.rose_transition_hash = String(src.rose_transition_hash);
  if (src && src.temporal_hash) unsigned.temporal_hash = String(src.temporal_hash);
  if (src && src.provenance_hash) unsigned.provenance_hash = String(src.provenance_hash);
  if (src && src.memory != null) {
    const memory = boundMemoryMeta(src.memory);
    if (memory) unsigned.memory = memory;
  }
  for (const key of ADDITIVE_STAMP_FIELDS) {
    const value = additiveValue(src && src[key]);
    if (value !== undefined) unsigned[key] = value;
  }
  unsigned.fh = await factHash(fact);
  unsigned.stamp_sha256 = await stampSha256(unsigned);
  return unsigned;
}

export function toCard(stamp, extra = {}) {
  if (!stamp || typeof stamp !== "object") return null;
  const fact = clip(stamp.fact, FACT_CAP);
  if (!fact) return null;
  const card = {
    id: stamp.id,
    c: stamp.c,
    k: stamp.k || "stamp",
    t: stamp.t,
    h: stamp.stamp_sha256 || stamp.h,
    fh: stamp.fh,
    s: clip(stamp.subject, SUBJECT_CAP),
    f: fact,
    g: "h+fh",
  };
  if (extra.r || stamp.r) card.r = extra.r || stamp.r;
  if (extra.pipe) card.pipe = extra.pipe;
  return card;
}

export function cardBytes(card) {
  return new TextEncoder().encode(JSON.stringify(card)).length;
}

export async function append(storeOrEnv, input = {}, options = {}) {
  const store = storeFor(storeOrEnv);
  const src = input && typeof input === "object" ? { ...input } : {};
  if (src.anchor == null) {
    // AZRT-ANCHOR-1.0: record the newest verified witness statement (absent when unknown).
    const anchor = anchorRefNow();
    if (anchor) src.anchor = anchor;
  }
  const chain = String(src.c || src.chain || "session").trim() || "session";
  const internal = options && options.internal === true && INTERNAL_CHAINS.includes(chain);
  if (!ROSTER.includes(chain) && !internal) {
    return { ok: false, refuse: "unknown-chain", chain, roster: ROSTER.slice() };
  }
  const fact = clip(src.f || src.fact, FACT_CAP);
  if (!fact) {
    return { ok: false, refuse: "no-fact", message: "Hash-only cards are non-compliant." };
  }
  const caller = String(src.caller || src.space || "").trim();
  const idempotencyKey = String(src.idempotency_key || src.idemp || src.id || "").trim();
  let docClaim = null;
  if (DOCUMENT_CHAINS.includes(chain)) {
    const doc = await documentContentHash(src);
    const owner = caller + "|" + chain;
    const got = await claimDocument(store, doc, owner, idempotencyKey);
    if (!got || !got.ok) {
      const code = (got && got.code) || "LATTICE-DOC-INDEX-UNAVAILABLE";
      return { ok: false, refuse: (got && got.refuse) || "lattice-doc-index", code, message: DOUBLE_MESSAGE[code], spec: DOC_UNIQUE_SPEC, document_hash: doc, written: false };
    }
    docClaim = got.fresh ? { doc, owner } : null;
  }
  const builder = async ({ prev, rows }) => {
    let unsigned;
    try {
      unsigned = await composeChainlockStamp(src, { prev: prev || GENESIS, rows: rows || [] });
    } catch (err) {
      if (err instanceof LatticeError) return { refuse: err.code === "LATTICE-DOUBLE" ? "lattice-double" : "lattice-username", code: err.code, message: err.message };
      throw err;
    }
    const card = toCard(unsigned, { pipe: src.pipe });
    if (!card || cardBytes(card) > CARD_CAP) {
      return { refuse: "card-cap", cap: CARD_CAP };
    }
    return unsigned;
  };
  let ack;
  try {
  if (typeof store.appendAtomic === "function") {
    ack = await store.appendAtomic(
      {
        kind: "chainlock",
        chain,
        caller,
        idempotencyKey: idempotencyKey || null,
        genesis: GENESIS,
        input: src,
      },
      builder,
    );
  } else {
    const rows = await loadChain(store, chain, caller);
    ack = await builder({ prev: rows.length ? rows[rows.length - 1].stamp_sha256 || GENESIS : GENESIS, seq: rows.length, rows });
    if (ack && ack.refuse) {
      if (docClaim) await releaseDocument(store, docClaim.doc, docClaim.owner);
      return { ok: false, ...ack };
    }
    rows.push(ack);
    await saveChain(store, chain, rows, caller);
    ack = { ok: true, record: ack, seq: rows.length, prev: ack.prev, replayed: false };
  }
  } catch (err) {
    // A throw after the claim must not leave the document locked.
    if (docClaim) await releaseDocument(store, docClaim.doc, docClaim.owner);
    throw err;
  }
  if (!ack || !ack.ok) {
    if (docClaim) await releaseDocument(store, docClaim.doc, docClaim.owner);
    const out = { ok: false, refuse: (ack && ack.refuse) || "append-failed", cap: ack && ack.cap };
    if (ack && ack.code) out.code = ack.code;
    if (ack && ack.message) out.message = ack.message;
    if (ack && ack.cap_class) out.cap_class = ack.cap_class; // RIB-018 follow-up 2 (additive)
    if (ack && (String(ack.refuse || "").startsWith("lattice-") || ack.refuse === "refusal-cap")) out.written = false;
    return out;
  }
  const unsigned = ack.record;
  const card = toCard(unsigned, { pipe: src.pipe });
  return {
    ok: true,
    v: CL_VERSION,
    stamp: unsigned,
    card,
    prev: unsigned.prev,
    seq: Math.max(0, Number(ack.seq) - 1),
    replayed: Boolean(ack.replayed),
    vault: VAULT_CHAINS_PATH.replace("<name>", chain),
    lattice: unsigned.lattice || null,
    lattice_live: Boolean(unsigned.lattice && unsigned.lattice.primary && unsigned.lattice.secondary),
  };
}

export async function tip(storeOrEnv, chain = "session", caller = "") {
  const store = storeFor(storeOrEnv);
  const name = String(chain || "session").trim() || "session";
  const space = String(caller || "").trim();
  const rows = await loadChain(store, name, space);
  if (!rows.length) {
    return { ok: true, chain: name, tip: null, empty: true };
  }
  const last = rows[rows.length - 1];
  const lt = latticeTips(rows);
  return {
    ok: true,
    chain: name,
    tip: toCard(last),
    stamp: last,
    seq: rows.length - 1,
    lattice_tips: lt.count ? { primary: lt.primary, secondary: lt.secondary, rows: lt.count } : null,
  };
}

export async function liveTips(storeOrEnv) {
  const store = storeFor(storeOrEnv);
  const members = [];
  for (const name of ROSTER) {
    const rows = await loadChain(store, name);
    if (!rows.length) continue;
    const last = rows[rows.length - 1];
    members.push({
      c: name,
      id: last.id,
      h: last.stamp_sha256,
      fh: last.fh,
    });
  }
  return members;
}

function depthRows(rows, depth) {
  const d = Math.max(0, Math.min(RECALL_DEPTH_MAX, Number(depth) || 0));
  if (!rows.length) return { d, rows: [] };
  if (d === 0) return { d, rows: [rows[rows.length - 1]] };
  if (d === 1) return { d, rows: rows.slice(-STM_WINDOW) };
  if (d >= 5) return { d, rows };
  const take = Math.min(rows.length, STM_WINDOW * (d + 1));
  return { d, rows: rows.slice(-take) };
}

export async function recall(storeOrEnv, input = {}) {
  const store = storeFor(storeOrEnv);
  const src = input && typeof input === "object" ? input : {};
  const depth = Math.max(0, Math.min(RECALL_DEPTH_MAX, Number(src.depth ?? src.d ?? 1) || 0));
  const q = String(src.q || src.query || "").trim().toLowerCase();
  const chains = src.c || src.chain ? [String(src.c || src.chain)] : ["session", "acts", "recall", "learn"];
  const caller = String(src.caller || src.space || "").trim();
  const facts = [];
  for (const name of chains) {
    if (!ROSTER.includes(name)) continue;
    const rows = await loadChain(store, name, caller);
    const sliced = depthRows(rows, depth).rows;
    for (const stamp of sliced) {
      if (!stamp || stamp._broken) continue;
      const fact = clip(stamp.fact, FACT_CAP);
      if (!fact || !stamp.stamp_sha256 || !stamp.fh) continue;
      if (q && !String(stamp.subject || "").toLowerCase().includes(q) && !fact.toLowerCase().includes(q)) {
        continue;
      }
      facts.push(toCard(stamp));
    }
  }
  if (!facts.length) {
    return { ok: false, refuse: "no-stamp", depth, v: CL_VERSION };
  }
  return { ok: true, v: CL_VERSION, depth, count: facts.length, facts };
}

export async function verify(storeOrEnv, input = {}) {
  const store = storeFor(storeOrEnv);
  const src = input && typeof input === "object" ? input : {};
  const names = src.c || src.chain ? [String(src.c || src.chain)] : ROSTER.slice();
  const caller = String(src.caller || src.space || "").trim();
  const breaks = [];
  const chains = [];
  for (const name of names) {
    // Addendum (RIB-018): an internal chain (refusals) is verifiable when named explicitly; read-only.
    if (!ROSTER.includes(name) && !(INTERNAL_CHAINS.includes(name) && (src.c || src.chain))) continue;
    const rows = await loadChain(store, name, caller);
    let prev = GENESIS;
    let ok = true;
    for (let i = 0; i < rows.length; i++) {
      const stamp = rows[i];
      if (!stamp || stamp._broken) {
        ok = false;
        breaks.push({ chain: name, seq: i, reason: "unreadable" });
        break;
      }
      const expectedPrev = stamp.prev || GENESIS;
      if (expectedPrev !== prev) {
        ok = false;
        breaks.push({ chain: name, seq: i, id: stamp.id, reason: "broken-prev", expected: prev, got: expectedPrev });
        break;
      }
      const recomputed = await stampSha256(stamp);
      if (recomputed !== stamp.stamp_sha256) {
        ok = false;
        breaks.push({ chain: name, seq: i, id: stamp.id, reason: "stamp-hash-miss" });
        break;
      }
      const fh = await factHash(stamp.fact);
      if (fh !== stamp.fh) {
        ok = false;
        breaks.push({ chain: name, seq: i, id: stamp.id, reason: "body-hash-miss" });
        break;
      }
      prev = stamp.stamp_sha256;
    }
    // RIB-013: a spec sealed as stamp #1 binds every later spec_ref in this chain (fail closed).
    const { verifyExpectSpec } = await import("../expect-spec-verify.js");
    const expect_spec = await verifyExpectSpec(rows.filter((row) => row && !row._broken), { hashOf: (r) => r.stamp_sha256, idOf: (r) => r.id });
    if (!expect_spec.ok) {
      ok = false;
      for (const e of expect_spec.errors) breaks.push({ chain: name, seq: (e.seq ?? 1) - 1, reason: e.code });
    }
    const dual = await verifyLattice(rows.filter((row) => row && !row._broken));
    if (!dual.ok) {
      ok = false;
      for (const br of dual.breaks) breaks.push({ chain: name, seq: br.seq, reason: br.reason });
    }
    // AZRT-INTEGRITY-LEVEL-1.0 (additive): level per chain; a witnessed head that moved fails closed.
    const integrity = chainIntegrity(name, rows.filter((row) => row && !row._broken), ok);
    if (integrity.mismatch) {
      ok = false;
      breaks.push({ chain: name, seq: integrity.mismatch.anchored_seq - 1, reason: "anchor-mismatch", code: integrity.mismatch.code });
    }
    chains.push({
      c: name,
      ok,
      n: rows.length,
      integrity,
      expect_spec: { status: expect_spec.status, spec_hash: expect_spec.spec_hash, errors: expect_spec.errors.length },
      isolated: !ok,
      dual_lattice: {
        ok: dual.ok,
        lattice_rows: dual.lattice_rows,
        legacy_rows: dual.legacy_rows,
        tips: dual.lattice_rows ? dual.tips : null,
        lattice_live: dual.lattice_live,
      },
    });
  }
  const allOk = breaks.length === 0;
  const withRows = chains.filter((row) => row.dual_lattice.lattice_rows > 0);
  return {
    ok: allOk,
    v: CL_VERSION,
    lattice: allOk,
    chains,
    breaks,
    fail_closed: true,
    dual_lattice: {
      spec: LATTICE_SPEC,
      lattices: ["primary", "secondary"],
      chains_with_rows: withRows.length,
      lattice_live: allOk && withRows.length > 0 && withRows.every((row) => row.dual_lattice.lattice_live),
    },
  };
}

export async function interact(storeOrEnv, input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const kind = src.k || src.kind || "interact";
  const extra = {
    rose_transition_hash: src.rose_transition_hash || null,
    temporal_hash: src.temporal_hash || null,
    provenance_hash: src.provenance_hash || null,
  };
  const session = await append(storeOrEnv, {
    c: "session",
    k: kind,
    subject: src.subject || src.s || kind,
    fact: src.fact || src.f || kind,
    r: src.r,
    pipe: src.pipe,
    ...extra,
  });
  if (kind === "choose" || kind === "refuse" || kind === "learn" || src.learn) {
    await append(storeOrEnv, {
      c: "learn",
      k: kind,
      subject: src.subject || src.s || kind,
      fact: src.fact || src.f || kind,
      r: src.r,
      pipe: src.pipe,
      ...extra,
    });
  }
  return session;
}

export function groundedDoor(recallResult) {
  if (!recallResult || !recallResult.ok || !recallResult.facts || !recallResult.facts.length) {
    return { ok: false, refuse: "no-stamp", door: "chainlock", v: CL_VERSION };
  }
  return {
    ok: true,
    door: "chainlock",
    v: CL_VERSION,
    code: "FG-CL",
    facts: recallResult.facts,
  };
}

/**
 * ChainLock CL-0.4 — append-only stamp chains + slim cards.
 *
 * Paper: docs/designs/CL-WP-0.4.md
 * Not a Softwares-tab product. Not a public ledger. Cites GodLock; does not write godlock.uk.
 * Author: Aziel Eliab only.
 */

import { boundMemoryMeta } from "../memory/meta.js";
import { canonicalize, sha256Hex } from "../session-core.js";
import { chainKey, parseJsonl, storeFor, toJsonl, VAULT_CHAINS_PATH } from "./store.js";

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

export async function composeChainlockStamp(src, { prev }) {
  const chain = String((src && (src.c || src.chain)) || "session").trim() || "session";
  const subject = clip(src && (src.s || src.subject), SUBJECT_CAP);
  const fact = clip(src && (src.f || src.fact), FACT_CAP);
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
  };
  if (src && src.r) unsigned.r = String(src.r);
  if (src && src.rose_transition_hash) unsigned.rose_transition_hash = String(src.rose_transition_hash);
  if (src && src.temporal_hash) unsigned.temporal_hash = String(src.temporal_hash);
  if (src && src.provenance_hash) unsigned.provenance_hash = String(src.provenance_hash);
  if (src && src.memory != null) {
    const memory = boundMemoryMeta(src.memory);
    if (memory) unsigned.memory = memory;
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

export async function append(storeOrEnv, input = {}) {
  const store = storeFor(storeOrEnv);
  const src = input && typeof input === "object" ? input : {};
  const chain = String(src.c || src.chain || "session").trim() || "session";
  if (!ROSTER.includes(chain)) {
    return { ok: false, refuse: "unknown-chain", chain, roster: ROSTER.slice() };
  }
  const fact = clip(src.f || src.fact, FACT_CAP);
  if (!fact) {
    return { ok: false, refuse: "no-fact", message: "Hash-only cards are non-compliant." };
  }
  const caller = String(src.caller || src.space || "").trim();
  const idempotencyKey = String(src.idempotency_key || src.idemp || src.id || "").trim();
  const builder = async ({ prev }) => {
    const unsigned = await composeChainlockStamp(src, { prev: prev || GENESIS });
    const card = toCard(unsigned, { pipe: src.pipe });
    if (!card || cardBytes(card) > CARD_CAP) {
      return { refuse: "card-cap", cap: CARD_CAP };
    }
    return unsigned;
  };
  let ack;
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
    ack = await builder({ prev: rows.length ? rows[rows.length - 1].stamp_sha256 || GENESIS : GENESIS, seq: rows.length });
    if (ack && ack.refuse) return { ok: false, ...ack };
    rows.push(ack);
    await saveChain(store, chain, rows, caller);
    ack = { ok: true, record: ack, seq: rows.length, prev: ack.prev, replayed: false };
  }
  if (!ack || !ack.ok) {
    return { ok: false, refuse: (ack && ack.refuse) || "append-failed", cap: ack && ack.cap };
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
  return {
    ok: true,
    chain: name,
    tip: toCard(last),
    stamp: last,
    seq: rows.length - 1,
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
    if (!ROSTER.includes(name)) continue;
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
    chains.push({ c: name, ok, n: rows.length, isolated: !ok });
  }
  const allOk = breaks.length === 0;
  return {
    ok: allOk,
    v: CL_VERSION,
    lattice: allOk,
    chains,
    breaks,
    fail_closed: true,
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

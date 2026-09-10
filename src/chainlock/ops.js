/**
 * ChainLock CL-0.4 — append-only stamp chains + slim cards.
 *
 * Paper: docs/designs/CL-WP-0.4.md
 * Not a Softwares-tab product. Not a public ledger. Cites GodLock; does not write godlock.uk.
 * Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "../session-core.js";
import { parseJsonl, storeFor, toJsonl, VAULT_CHAINS_PATH } from "./store.js";

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
  "Local CLI vault: vault/chains/<name>.jsonl (source of truth). Worker uses in-memory or USES KV under chainlock|. Private SSH keys do not live on the Worker.";

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

function chainKey(name) {
  return `chains/${String(name || "").trim()}`;
}

export async function loadChain(store, name) {
  const raw = await store.get(chainKey(name));
  return parseJsonl(raw);
}

export async function saveChain(store, name, rows) {
  await store.put(chainKey(name), toJsonl(rows));
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
  const subject = clip(src.s || src.subject, SUBJECT_CAP);
  const fact = clip(src.f || src.fact, FACT_CAP);
  if (!fact) {
    return { ok: false, refuse: "no-fact", message: "Hash-only cards are non-compliant." };
  }
  const rows = await loadChain(store, chain);
  const prev = rows.length ? rows[rows.length - 1].stamp_sha256 || GENESIS : GENESIS;
  const unsigned = {
    v: CL_VERSION,
    id: src.id || newId(),
    c: chain,
    k: src.k || src.kind || "stamp",
    t: src.t || new Date().toISOString(),
    prev,
    subject,
    fact,
    ns: CL_NAMESPACE,
    author: CL_AUTHOR,
  };
  if (src.r) unsigned.r = String(src.r);
  unsigned.fh = await factHash(fact);
  unsigned.stamp_sha256 = await stampSha256(unsigned);
  const card = toCard(unsigned, { pipe: src.pipe });
  if (!card || cardBytes(card) > CARD_CAP) {
    return { ok: false, refuse: "card-cap", cap: CARD_CAP };
  }
  rows.push(unsigned);
  await saveChain(store, chain, rows);
  return {
    ok: true,
    v: CL_VERSION,
    stamp: unsigned,
    card,
    prev,
    seq: rows.length - 1,
    vault: VAULT_CHAINS_PATH.replace("<name>", chain),
  };
}

export async function tip(storeOrEnv, chain = "session") {
  const store = storeFor(storeOrEnv);
  const name = String(chain || "session").trim() || "session";
  const rows = await loadChain(store, name);
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
  const facts = [];
  for (const name of chains) {
    if (!ROSTER.includes(name)) continue;
    const rows = await loadChain(store, name);
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
  const breaks = [];
  const chains = [];
  for (const name of names) {
    if (!ROSTER.includes(name)) continue;
    const rows = await loadChain(store, name);
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
  const session = await append(storeOrEnv, {
    c: "session",
    k: kind,
    subject: src.subject || src.s || kind,
    fact: src.fact || src.f || kind,
    r: src.r,
    pipe: src.pipe,
  });
  if (kind === "choose" || kind === "refuse" || kind === "learn" || src.learn) {
    await append(storeOrEnv, {
      c: "learn",
      k: kind,
      subject: src.subject || src.s || kind,
      fact: src.fact || src.f || kind,
      r: src.r,
      pipe: src.pipe,
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

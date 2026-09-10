/**
 * LOCKSET LS-0.1 — ChainLock × TemporalLock × GodLock.
 *
 * seal() members from live chain tips {c,id,h,fh}
 * TemporalLock block {kind,ts,note,n}
 * GodLock block cites https://godlock.uk — runtime does not write the public ledger.
 * verify is fail-closed.
 *
 * Paper: docs/designs/LS-WP-0.1.md
 * Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "./session-core.js";
import { hashFieldsOf, liveTips, verify as verifyChains } from "./chainlock/ops.js";
import { storeFor } from "./chainlock/store.js";

export const LS_VERSION = "LS-0.1";
export const LS_SPEC = "LS-WP-0.1";
export const LS_AUTHOR = "Aziel Eliab";
export const GODLOCK_URL = "https://godlock.uk";
export const TEMPORAL_NOTE = "Neutral receipt. No narrative. No authority.";
export const LOCKSET_KEY = "receipts/LOCKSET.json";

function godlockBlock() {
  return {
    node: "godlock",
    url: GODLOCK_URL,
    cite: "public-verify",
    pull: false,
    isolate: true,
  };
}

function temporalBlock(n, ts) {
  return {
    kind: "TemporalLock",
    ts: ts || new Date().toISOString(),
    note: TEMPORAL_NOTE,
    n,
  };
}

export async function locksetHash(doc) {
  return sha256Hex(canonicalize(hashFieldsOf(doc)));
}

export async function seal(storeOrEnv, extra = {}) {
  const store = storeFor(storeOrEnv);
  const members = await liveTips(store);
  if (!members.length) {
    return { ok: false, refuse: "empty-vault", v: LS_VERSION };
  }
  const unsigned = {
    v: LS_VERSION,
    author: LS_AUTHOR,
    members,
    temporal: temporalBlock(members.length, extra.ts),
    godlock: godlockBlock(),
    note: "Operator posts lockset_sha256 to GodLock. This runtime cites; it does not write godlock.uk.",
  };
  const lockset_sha256 = await locksetHash(unsigned);
  const doc = { ...unsigned, lockset_sha256 };
  await store.put(LOCKSET_KEY, JSON.stringify(doc));
  return { ok: true, v: LS_VERSION, lockset: doc, lockset_sha256 };
}

export async function loadLockset(storeOrEnv) {
  const store = storeFor(storeOrEnv);
  const raw = await store.get(LOCKSET_KEY);
  if (raw == null || raw === "") return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { _unreadable: true };
  }
}

export async function verify(storeOrEnv, input = {}) {
  const store = storeFor(storeOrEnv);
  const chain = await verifyChains(store, input);
  const breaks = (chain.breaks || []).slice();
  let lattice = Boolean(chain.ok);
  const sealed = await loadLockset(store);
  const requireSeal = input.require_seal === true || Boolean(sealed);

  if (requireSeal && !sealed) {
    lattice = false;
    breaks.push({ reason: "lockset-missing" });
  }
  if (sealed && sealed._unreadable) {
    lattice = false;
    breaks.push({ reason: "lockset-unreadable" });
  }
  if (sealed && !sealed._unreadable) {
    const recomputed = await locksetHash(sealed);
    if (recomputed !== sealed.lockset_sha256) {
      lattice = false;
      breaks.push({ reason: "lockset-hash-miss" });
    }
    if (!sealed.godlock || sealed.godlock.cite !== "public-verify" || sealed.godlock.url !== GODLOCK_URL) {
      lattice = false;
      breaks.push({ reason: "missing-godlock-cite" });
    }
    if (!sealed.temporal || sealed.temporal.kind !== "TemporalLock") {
      lattice = false;
      breaks.push({ reason: "missing-temporal" });
    }
    const live = await liveTips(store);
    const liveBy = new Map(live.map((m) => [m.c, m.h]));
    for (const m of sealed.members || []) {
      const h = liveBy.get(m.c);
      if (!h || h !== m.h) {
        lattice = false;
        breaks.push({ reason: "tip-drift", chain: m.c });
      }
    }
  }
  if (!chain.ok) lattice = false;
  return {
    ok: lattice,
    v: LS_VERSION,
    lattice,
    fail_closed: true,
    chains: chain.chains,
    breaks,
    lockset_sha256: sealed && sealed.lockset_sha256 ? sealed.lockset_sha256 : null,
    cite: GODLOCK_URL,
    write_public_ledger: false,
  };
}

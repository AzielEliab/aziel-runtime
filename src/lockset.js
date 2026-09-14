/**
 * LOCKSET LS-0.1 — ChainLock × TemporalLock × GodLock.
 *
 * seal() members from live chain tips {c,id,h,fh}
 * TemporalLock block {kind,ts,note,n}
 * GodLock block cites https://godlock.uk — runtime does not write the public ledger.
 * verify is fail-closed.
 * Split the wires: ingest is a proof, not a timer. The 1s tick is
 * presence + tip hash only. 777s is dwell after a valid cite. Clock
 * desync is not a yes. Ambiguous tip is isolate, not merge.
 * Equivocation ends the peer. Quorum cannot outvote a broken hash.
 * Cold-copy survival: tips are content-addressed and expensive to erase.
 * Local verify/append outlives a single-server pull and the creators.
 * Live body sync is refused. Payloads stay pull-only cold. Named hosts only.
 * Re-expand-from-archive: bytes survive, not summaries. Restore after
 * prev-hash verify. Not mesh from index. Crawlers are extra shelves only.
 * Training residue is rumor.
 * REHEAL: isolation is the cure. Own last good tip + verified trusted
 * pull, or phoenix-WAIT. Never neighbor talk-back-to-health.
 * CROSS-NETWORK-SURVIVAL-1.0: if network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault).
 *
 * Paper: docs/designs/LS-WP-0.1.md · SPLIT-WIRES-1.0 · COLD-COPY-1.0 · RE-EXPAND-1.0 · REHEAL-1.0 · CROSS-NETWORK-SURVIVAL-1.0
 * Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "./session-core.js";
import { hashFieldsOf, liveTips, verify as verifyChains } from "./chainlock/ops.js";
import { storeFor } from "./chainlock/store.js";
import {
  DWELL_S,
  SPLIT_WIRES,
  SPLIT_WIRES_LAW,
  SPLIT_WIRES_SHORT,
  ingestProof,
  judgeEquivocation,
  mayEmitTip,
  neighborPhoenix,
  partitionRejoin,
} from "./split-wires.js";
import { COLD_COPY, COLD_COPY_LAW, COLD_COPY_SHORT, tipEraseCost } from "./cold-copy.js";
import { RE_EXPAND, RE_EXPAND_LAW, RE_EXPAND_SHORT, reExpandFromArchive } from "./re-expand.js";
import { REHEAL, REHEAL_LAW, REHEAL_SHORT, rehealFromOwnTip } from "./reheal.js";
import {
  CROSS_NETWORK_SURVIVAL,
  CROSS_NETWORK_SURVIVAL_LAW,
  CROSS_NETWORK_SURVIVAL_SHORT,
  SURVIVAL_SHELVES,
  networkDataDie,
} from "./cross-network-survival.js";

export {
  DWELL_S,
  SPLIT_WIRES,
  SPLIT_WIRES_LAW,
  SPLIT_WIRES_SHORT,
  ingestProof,
  judgeEquivocation,
  mayEmitTip,
  neighborPhoenix,
  partitionRejoin,
  COLD_COPY,
  COLD_COPY_LAW,
  COLD_COPY_SHORT,
  tipEraseCost,
  RE_EXPAND,
  RE_EXPAND_LAW,
  RE_EXPAND_SHORT,
  reExpandFromArchive,
  REHEAL,
  REHEAL_LAW,
  REHEAL_SHORT,
  rehealFromOwnTip,
  CROSS_NETWORK_SURVIVAL,
  CROSS_NETWORK_SURVIVAL_LAW,
  CROSS_NETWORK_SURVIVAL_SHORT,
  SURVIVAL_SHELVES,
  networkDataDie,
};

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

  const wires = applySplitWires(input, sealed);
  if (wires.breaks.length) {
    lattice = false;
    breaks.push(...wires.breaks);
  }
  const erase = tipEraseCost(input);
  if (!erase.ok) {
    lattice = false;
    breaks.push({ reason: erase.reason });
  }
  const expand = applyReExpand(input);
  if (expand.breaks.length) {
    lattice = false;
    breaks.push(...expand.breaks);
  }
  const heal = applyReheal(input);
  if (heal.breaks.length) {
    lattice = false;
    breaks.push(...heal.breaks);
  }
  const survival = applyCrossNetworkSurvival(input);
  if (survival.breaks.length) {
    lattice = false;
    breaks.push(...survival.breaks);
  }

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
    split_wires: SPLIT_WIRES,
    dwell_s: DWELL_S,
    timer_is_not_yes: true,
    majority_is_truth: false,
    isolate: wires.isolate || breaks.some((b) => b.reason === "ambiguous-tip-isolate"),
    merge: false,
    cold_copy: COLD_COPY,
    live_body_sync: false,
    tip_expensive_to_erase: true,
    unkillable_by_single_server: true,
    rewrite: false,
    re_expand: RE_EXPAND,
    mesh_from_index: false,
    summaries_survive: false,
    bytes_survive: true,
    reheal: REHEAL,
    isolation_is_the_cure: true,
    neighbor_heal: false,
    vote_to_fix: false,
    cross_network_survival: CROSS_NETWORK_SURVIVAL,
    survival_shelves: SURVIVAL_SHELVES.slice(),
    live_network_is_shelf: false,
    chain_survives: true,
  };
}

function applyReExpand(input) {
  const wants =
    input.re_expand === true ||
    input.archive_bytes != null ||
    input.from_index === true ||
    input.mesh_from_index === true ||
    input.summary === true ||
    input.crawler === true ||
    input.training_residue === true ||
    input.training === true;
  if (!wants) return { breaks: [] };
  const out = reExpandFromArchive(input);
  return { breaks: out.ok ? [] : out.breaks };
}

function applyReheal(input) {
  const wants =
    input.reheal === true ||
    input.neighbor_heal === true ||
    input.listen_neighbors === true ||
    input.listen_to_neighbors === true ||
    input.heal_from_neighbors === true ||
    input.vote_to_fix === true ||
    input.talk_back === true ||
    input.phoenix_wait === true ||
    input.own_last_good_tip != null ||
    input.trusted_pull === true ||
    input.verified_trusted_pull === true;
  if (!wants) return { breaks: [] };
  const out = rehealFromOwnTip(input);
  if (out.ok) return { breaks: [] };
  return { breaks: [{ reason: out.reason || "stay-isolated" }] };
}

function applyCrossNetworkSurvival(input) {
  const wants =
    input.cross_network_survival === true ||
    input.survive_on_network === true ||
    input.live_shelf === true ||
    input.live_network_is_shelf === true ||
    input.network_dead === true ||
    input.data_dead === true;
  if (!wants) return { breaks: [] };
  const out = networkDataDie(input);
  if (out.ok) return { breaks: [] };
  return { breaks: [{ reason: out.reason || "live-network-is-not-a-shelf" }] };
}

function applySplitWires(input, sealed) {
  const wants =
    input.clock_desync === true ||
    input.ambiguous === true ||
    input.wait_then_take === true ||
    input.quorum_overrides_hash === true ||
    input.majority_vote === true ||
    input.cited_prev != null ||
    input.tip != null ||
    input.held_prev != null ||
    input.held_lockset != null ||
    input.lockset != null ||
    input.valid_cite != null ||
    input.elapsed_s != null ||
    input.verified != null;
  if (!wants) return { breaks: [], isolate: false };
  const proof = ingestProof({
    held_prev: input.held_prev,
    cited_prev: input.cited_prev,
    tip: input.tip,
    held_lockset: input.held_lockset || (sealed && sealed.lockset_sha256),
    lockset: input.lockset || (sealed && sealed.lockset_sha256),
    verified: input.verified,
    clock_desync: input.clock_desync,
    ambiguous: input.ambiguous,
    wait_then_take: input.wait_then_take,
    valid_cite: input.valid_cite,
    elapsed_s: input.elapsed_s,
    quorum_overrides_hash: input.quorum_overrides_hash,
    majority_vote: input.majority_vote,
  });
  return { breaks: proof.breaks, isolate: proof.isolate };
}

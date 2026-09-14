/**
 * SPLIT THE WIRES — locked ingest / tick law.
 *
 * Fast 0.5–1s tick and the 777s gate stay strangers. They never share a socket.
 * Payloads are pull-only. Ingest is hash-absolute. Equivocation kills that peer.
 * Anything less is a delayed epidemic.
 *
 * Companion: QNM-WP-1.0, NODE-OPS-1.0, LS-WP-0.1, docs/NODE_MESH.md
 * Author: Aziel Eliab only.
 */

export const SPLIT_WIRES = "SPLIT-WIRES-1.0";
export const SPLIT_WIRES_AUTHOR = "Aziel Eliab";
export const TICK_MS_MIN = 500;
export const TICK_MS_MAX = 1000;
export const DWELL_S = 777;
export const TICK_PLANE = "presence-tip-hash";
export const PAYLOAD_PLANE = "receiver-pull";
export const SHA256_RE = /^[a-f0-9]{64}$/;

export const TICK_FIELDS = Object.freeze(["presence", "tip_hash"]);

export const FORBIDDEN_TICK_KEYS = Object.freeze([
  "body",
  "diff",
  "file",
  "bytes",
  "video",
  "mp4",
  "media",
  "blob",
  "content",
  "upload",
  "data",
  "payload",
  "payload_b64",
  "file_b64",
  "also",
  "attachment",
  "stream",
]);

export const SPLIT_WIRES_SHORT =
  "pull-only payloads, hash-absolute ingest, equivocation = death of that peer, and two clocks that never share a socket. The 1s loop and the 777s gate stay strangers. Anything less is a delayed epidemic.";

export const SPLIT_WIRES_LAW = Object.freeze({
  spec: SPLIT_WIRES,
  author: SPLIT_WIRES_AUTHOR,
  identity: "Aziel Eliab",
  tick_ms: Object.freeze({ min: TICK_MS_MIN, max: TICK_MS_MAX }),
  dwell_s: DWELL_S,
  tick_plane: TICK_PLANE,
  payload_plane: PAYLOAD_PLANE,
  tick: "presence + tip hash only. Fixed-size. No body, no diff, no “also here’s the file.”",
  payload: "second plane the receiver pulls, never a push the sender fans out",
  update: "a proof, not a timer. Receiver already holds prev and the lockset. New tip must cite that prev, match the lockset rule, and verify fail-closed. 777s is dwell after a valid cite, not wait-then-take. Clock desync is not a yes. Ambiguous tip is isolate, not merge.",
  equivocation: "same prev, two different tips from one node → that node is locked/isolated. No vote-to-reconcile. Quorum cannot outvote a broken hash. Majority is not truth.",
  emit: "announce a tip only after own verify passes. Phoenix is local reboot/WAIT for the failed node. Neighbors do not phoenix because a neighbor phoenix’d. No unsend, so nothing leaving the box is an unverified body.",
  partition:
    "split brain: each island keeps its own chain; they do not auto-splice on reconnect. Rejoin is cite + human/operator or lockset gate, same as first ingest. Heartbeat loss is not isolate-by-timer. Heartbeat loss ≠ apply last packet.",
  short: SPLIT_WIRES_SHORT,
  die_with_pull:
    "Public tunnels/sites die with the pull. Phoenix is wait/re-seal, not public hostname resurrection. Mesh does not climb back onto a pulled hostname.",
});

export function isSha256Hex(value) {
  return SHA256_RE.test(String(value || "").trim().toLowerCase());
}

export function forbiddenTickKeys(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.keys(obj).filter((k) => FORBIDDEN_TICK_KEYS.includes(String(k).toLowerCase()));
}

export function tickAccepts(obj) {
  const banned = forbiddenTickKeys(obj);
  if (banned.length) {
    return { ok: false, code: "MESH-NO-BYTES", plane: TICK_PLANE, refused_keys: banned };
  }
  const tip = obj && obj.tip_hash != null ? String(obj.tip_hash).trim().toLowerCase() : "";
  const prev = obj && obj.prev != null ? String(obj.prev).trim().toLowerCase() : "";
  if (tip && !isSha256Hex(tip)) return { ok: false, code: "MESH-BAD-INPUT", reason: "tip_hash-not-fixed-size" };
  if (prev && !isSha256Hex(prev)) return { ok: false, code: "MESH-BAD-INPUT", reason: "prev-not-fixed-size" };
  return {
    ok: true,
    plane: TICK_PLANE,
    fields: TICK_FIELDS.slice(),
    tip_hash: tip || null,
    prev: prev || null,
  };
}

/**
 * Update is a proof, not a timer.
 * 777s is dwell after a valid cite — not “wait then take whatever arrived.”
 */
export function ingestProof(input = {}) {
  const held_prev = normalizeHash(input.held_prev);
  const cited_prev = normalizeHash(input.cited_prev);
  const tip = normalizeHash(input.tip);
  const held_lockset = normalizeHash(input.held_lockset);
  const lockset = normalizeHash(input.lockset);
  const breaks = [];

  if (input.clock_desync === true) {
    breaks.push({ reason: "clock-desync-not-yes" });
  }
  if (input.ambiguous === true) {
    breaks.push({ reason: "ambiguous-tip-isolate" });
  }
  if (!held_prev || !cited_prev || cited_prev !== held_prev) {
    breaks.push({ reason: "prev-cite-miss" });
  }
  if (!held_lockset || !lockset || lockset !== held_lockset) {
    breaks.push({ reason: "lockset-rule-miss" });
  }
  if (!tip) {
    breaks.push({ reason: "tip-missing" });
  }
  if (input.verified !== true) {
    breaks.push({ reason: "verify-fail-closed" });
  }
  if (input.wait_then_take === true || (Number(input.elapsed_s) >= DWELL_S && input.valid_cite !== true)) {
    breaks.push({ reason: "dwell-not-take" });
  }
  if (input.quorum_overrides_hash === true || input.majority_vote === true) {
    breaks.push({ reason: "majority-not-truth" });
  }

  const isolate = breaks.some((b) => b.reason === "ambiguous-tip-isolate");
  return {
    ok: breaks.length === 0,
    spec: SPLIT_WIRES,
    fail_closed: true,
    isolate,
    merge: false,
    dwell_s: DWELL_S,
    timer_is_not_yes: true,
    breaks,
  };
}

/** Same prev, two different tips from one node → that node is locked/isolated. */
export function judgeEquivocation(input = {}) {
  const prev = normalizeHash(input.prev);
  const tips = Array.isArray(input.tips) ? input.tips.map(normalizeHash).filter(Boolean) : [];
  const unique = new Set(tips);
  const equivocated = Boolean(prev && unique.size > 1);
  return {
    ok: !equivocated,
    spec: SPLIT_WIRES,
    node_id: input.node_id || null,
    prev,
    equivocated,
    presence: equivocated ? "isolated" : input.presence || "live",
    vote_to_reconcile: false,
    quorum_outvotes_hash: false,
    majority_is_truth: false,
    reason: equivocated ? "equivocation-ends-the-peer" : null,
  };
}

export function mayEmitTip(input = {}) {
  const verified = input.verified === true;
  return {
    ok: verified,
    spec: SPLIT_WIRES,
    emit: verified,
    unverified_body: false,
    unsend: false,
    reason: verified ? null : "emit-last-verify-first",
  };
}

export function neighborPhoenix(input = {}) {
  const neighbor_phoenixed = input.neighbor_phoenixed === true;
  return {
    ok: true,
    spec: SPLIT_WIRES,
    phoenix: neighbor_phoenixed ? false : input.self_failed === true,
    local_only: true,
    reason: neighbor_phoenixed ? "neighbors-do-not-phoenix" : null,
  };
}

export function partitionRejoin(input = {}) {
  const cite = input.cite === true;
  const gate = input.operator === true || input.lockset_gate === true;
  const auto_splice = input.auto_splice === true;
  if (auto_splice) {
    return { ok: false, spec: SPLIT_WIRES, splice: false, reason: "no-auto-splice" };
  }
  if (!cite || !gate) {
    return { ok: false, spec: SPLIT_WIRES, splice: false, reason: "rejoin-needs-cite-and-gate" };
  }
  return { ok: true, spec: SPLIT_WIRES, splice: false, ingest: "first-ingest-rules", reason: null };
}

export function heartbeatLossMeaning(input = {}) {
  return {
    spec: SPLIT_WIRES,
    poison: false,
    apply_last_packet: false,
    suspect: input.missed === true || Number(input.missed_intervals) >= 3,
    isolate: false,
    note: "Heartbeat loss is not isolate-by-timer. Heartbeat loss ≠ apply last packet.",
  };
}

export function clocksShareSocket() {
  return false;
}

function normalizeHash(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  return isSha256Hex(s) ? s : "";
}

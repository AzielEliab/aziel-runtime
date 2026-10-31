/**
 * RIB-050 / AZRT-WRITER-FENCE-1.0 (idea from @HOPPYEMPIRE).
 *
 * A stop that waits for the agent to obey it is not a control. Each fenced chain carries a
 * writer epoch sealed into the row. Stop and revoke (RIB-015, same issuer gate, not a second
 * authority) bump that epoch. An older epoch cannot append. After a stop, append refuses
 * SESSION-STOPPED. The check is this module, called from the session path and from ChainLock
 * append. Stopping does not undo an external effect; rows say so.
 * Not live. Receipts are hash-linked and sealed, not signed.
 * Author: Aziel Eliab.
 */
export const FENCE_SPEC = "AZRT-WRITER-FENCE-1.0";
export const NOT_UNDONE = "Stopping a run does not undo an external effect.";

export function chainFenceFromRows(rows) {
  const last = rows && rows.length ? rows[rows.length - 1] : null;
  const fence = last && last.writer_fence;
  if (!fence || !Number.isInteger(fence.epoch)) return { epoch: 0, stopped: false };
  return { epoch: fence.epoch, stopped: fence.stopped === true };
}

export function decideChainFence(chainFence, src, { authority = false } = {}) {
  const state = chainFence && Number.isInteger(chainFence.epoch) ? chainFence : { epoch: 0, stopped: false };
  const raw = src && src.writer_epoch;
  const presented = raw == null || raw === "" ? null : Number(raw);
  const wantsStop = Boolean(src && (src.k === "stop" || src.kind === "stop"));
  if (!state.epoch && presented == null && !wantsStop) return { ok: true, writerFence: null };
  if (presented != null && (!Number.isInteger(presented) || presented < 1)) {
    return { ok: false, code: "STALE-WRITER-FENCED", refuse: "stale-writer", message: "writer_epoch must be a positive integer. Nothing was appended." };
  }
  if (state.stopped) {
    return { ok: false, code: "SESSION-STOPPED", refuse: "session-stopped", message: "This chain is stopped. " + NOT_UNDONE + " Nothing was appended." };
  }
  if (state.epoch && presented == null) {
    return { ok: false, code: "STALE-WRITER-FENCED", refuse: "stale-writer", message: "This chain has a writer epoch. An append without the current epoch is fenced. Nothing was appended." };
  }
  if (state.epoch && presented < state.epoch) {
    return { ok: false, code: "STALE-WRITER-FENCED", refuse: "stale-writer", message: "writer epoch is older than the revocation stamp. Nothing was appended." };
  }
  if ((wantsStop || (state.epoch && presented > state.epoch) || (!state.epoch && presented != null)) && !authority) {
    return { ok: false, code: "FENCE-BUMP-REFUSED", refuse: "fence-bump", message: "Only the runtime may open, bump, or stop a writer epoch. Nothing was appended." };
  }
  const epoch = presented == null ? state.epoch : presented;
  return {
    ok: true,
    writerFence: {
      spec: FENCE_SPEC,
      epoch,
      bumped: Boolean(state.epoch && epoch > state.epoch),
      stopped: Boolean(authority && wantsStop),
      not_undone: NOT_UNDONE,
    },
  };
}

export function beginSessionFence(session) {
  if (!session || Number.isInteger(session.writer_epoch)) return;
  session.writer_epoch = 1;
  session.writer_stopped = false;
}

export function bumpSessionFence(session, { stopped = false, side_effects = [] } = {}) {
  if (!session) return null;
  if (!Number.isInteger(session.writer_epoch)) session.writer_epoch = 1;
  session.writer_epoch += 1;
  if (stopped) session.writer_stopped = true;
  session._fence_stamp = {
    spec: FENCE_SPEC,
    epoch: session.writer_epoch,
    bumped: true,
    stopped: stopped === true,
    side_effects: side_effects || [],
    not_undone: NOT_UNDONE,
  };
  return session._fence_stamp;
}

export function takeFenceStamp(session) {
  if (!session || !session._fence_stamp) return null;
  const stamp = session._fence_stamp;
  session._fence_stamp = null;
  return stamp;
}

export function presentSessionEpoch(session, presented) {
  if (presented == null || presented === "") return null;
  const n = Number(presented);
  if (!Number.isInteger(n) || n < 1) {
    return { code: "STALE-WRITER-FENCED", status: 409, message: "writer_epoch must be a positive integer. Nothing ran." };
  }
  const cur = session && session.writer_epoch;
  if (Number.isInteger(cur) && n < cur) {
    return { code: "STALE-WRITER-FENCED", status: 409, message: "writer epoch is older than the revocation stamp. Nothing ran." };
  }
  if (Number.isInteger(cur) && n > cur) {
    return { code: "FENCE-BUMP-REFUSED", status: 409, message: "Only the runtime may bump the writer epoch. Nothing ran." };
  }
  return null;
}

/** completed or unknown only. A rollback status is dropped. Nothing here claims an undo. */
export function sideEffectsOf(raw, pending) {
  const out = [];
  if (pending && pending.intent_id) {
    out.push({ intent_id: String(pending.intent_id).slice(0, 80), side_effect_status: "unknown", not_undone: NOT_UNDONE });
  }
  const list = raw && Array.isArray(raw.side_effects) ? raw.side_effects : [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const status = item.side_effect_status === "completed" || item.side_effect_status === "unknown" ? item.side_effect_status : null;
    if (!status) continue;
    out.push({
      id: String(item.id || item.intent_id || "").slice(0, 80),
      side_effect_status: status,
      not_undone: NOT_UNDONE,
    });
  }
  return out.slice(0, 16);
}

export function verifyWriterFence(receipts) {
  const errors = [];
  let required = null;
  let revocationSeq = null;
  let stoppedAt = null;
  const list = (receipts || []).filter(Boolean);
  let saw = false;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const seq = r.seq ?? i + 1;
    const epoch = Number.isInteger(r.writer_epoch)
      ? r.writer_epoch
      : r.writer_fence && Number.isInteger(r.writer_fence.epoch)
        ? r.writer_fence.epoch
        : null;
    if (epoch != null) {
      saw = true;
      if (required != null && epoch < required) {
        errors.push({ seq, code: "STALE-WRITER-EPOCH", epoch, required, revocation_seq: revocationSeq });
      }
      const bumped = Boolean(r.writer_fence && r.writer_fence.bumped);
      if (bumped) {
        required = epoch;
        revocationSeq = seq;
      } else if (required == null) {
        required = epoch;
      } else if (epoch > required) {
        errors.push({ seq, code: "FENCE-BUMP-UNMARKED", epoch, required });
        required = epoch;
      }
    }
    if (r.writer_fence && r.writer_fence.stopped === true) {
      if (stoppedAt != null) errors.push({ seq, code: "STOP-DUPLICATE", stopped_at_seq: stoppedAt });
      else stoppedAt = seq;
    } else if (stoppedAt != null && (r.event === "exec" || r.k === "exec")) {
      errors.push({ seq, code: "EXEC-AFTER-STOP", stopped_at_seq: stoppedAt });
    }
  }
  return {
    spec: FENCE_SPEC,
    ok: errors.length === 0,
    legacy: !saw,
    errors,
    not_undone: NOT_UNDONE,
    note: "Epoch checks are runtime code. " + NOT_UNDONE + " Hash-linked and sealed, not signed.",
  };
}

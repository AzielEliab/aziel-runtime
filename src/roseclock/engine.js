/**
 * RoseClock — forward-only action-time authority.
 *
 * state[n] --valid action--> state[n+1]
 * NEVER: state[n] --> state[n-1]
 * RESTORE / CORRECT / QUARANTINE are forward action_class values.
 * No rollback API.
 *
 * Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "../session-core.js";

export const ROSE_VERSION = "RC-1.0";
export const ROSE_AUTHOR = "Aziel Eliab";
export const ROSE_SOFTWARE_TAB = false;
export const GENESIS_PARENT = "GENESIS";

export const ACTION_CLASSES = Object.freeze([
  "EXECUTE",
  "HOLD",
  "REFUSE",
  "CORRECT",
  "SUPERSEDE",
  "REVOKE",
  "RESTORE_FORWARD",
  "QUARANTINE",
  "REPAIR",
  "LEARN",
]);

const ROLLBACK_RE = /\b(rollback|roll[_-]?back|rewind|undo|revert|backdate|time[_-]?travel)\b/i;

const tips = new Map();

function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `${prefix}_` + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isRollbackVerb(raw) {
  return ROLLBACK_RE.test(String(raw || ""));
}

export function refuseRollback(verb) {
  return {
    ok: false,
    refuse: "rollback-forbidden",
    code: "RC-NO-ROLLBACK",
    message: "RoseClock is forward-only. Rollback / rewind / undo / revert are refused. Restore, correct, and quarantine are forward action_class values.",
    verb: verb || null,
    rollback: false,
    v: ROSE_VERSION,
    author: ROSE_AUTHOR,
    software_tab: false,
  };
}

async function hashState(state) {
  const { state_hash: _ignore, ...rest } = state;
  return sha256Hex(canonicalize(rest));
}

async function hashTransition(t) {
  const { transition_hash: _ignore, ...rest } = t;
  return sha256Hex(canonicalize(rest));
}

export function genesisState(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const rose_id = src.rose_id || "aziel-runtime";
  const branch_id = src.branch_id || "main";
  return {
    rose_id,
    branch_id,
    sequence: 0,
    gear: src.gear || "OPEN",
    phase: src.phase || "OPEN",
    state: src.state || "GENESIS",
    causal_parent_hash: GENESIS_PARENT,
    active_capabilities: Array.isArray(src.active_capabilities) ? src.active_capabilities.slice() : [],
    created_at: src.created_at || new Date().toISOString(),
    state_hash: null,
    v: ROSE_VERSION,
    author: ROSE_AUTHOR,
  };
}

export function tipOf(rose_id = "aziel-runtime", branch_id = "main") {
  return tips.get(`${rose_id}::${branch_id}`) || null;
}

export function resetRoseClockForTests() {
  tips.clear();
}

export async function ensureTip(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const rose_id = src.rose_id || "aziel-runtime";
  const branch_id = src.branch_id || "main";
  const key = `${rose_id}::${branch_id}`;
  if (tips.has(key)) return tips.get(key);
  const state = genesisState({ ...src, rose_id, branch_id });
  state.state_hash = await hashState(state);
  tips.set(key, state);
  return state;
}

/**
 * Advance one forward transition. Sequence never decreases.
 */
export async function advance(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const action = src.action || src.op || "execute";
  if (isRollbackVerb(action) || isRollbackVerb(src.action_class) || src.rollback === true) {
    return refuseRollback(action);
  }
  const action_class = String(src.action_class || "EXECUTE").toUpperCase();
  if (isRollbackVerb(action_class) || action_class === "ROLLBACK" || action_class === "RESTORE") {
    return refuseRollback(action_class);
  }
  if (!ACTION_CLASSES.includes(action_class)) {
    return {
      ok: false,
      refuse: "unknown-action-class",
      message: `Unknown action_class. Forward classes: ${ACTION_CLASSES.join(", ")}. RESTORE is RESTORE_FORWARD.`,
      v: ROSE_VERSION,
    };
  }

  const current = await ensureTip(src);
  const to_sequence = current.sequence + 1;
  if (to_sequence <= current.sequence) {
    return refuseRollback("decrease");
  }
  if (src.to_sequence != null && Number(src.to_sequence) !== to_sequence) {
    return {
      ok: false,
      refuse: "sequence-mismatch",
      message: "to_sequence must equal from_sequence + 1. Sequence never decreases.",
      from_sequence: current.sequence,
      got: src.to_sequence,
      v: ROSE_VERSION,
    };
  }
  if (src.from_sequence != null && Number(src.from_sequence) !== current.sequence) {
    return {
      ok: false,
      refuse: "conflict",
      message: "Expected parent sequence does not match tip. Re-read and construct a new forward transition.",
      v: ROSE_VERSION,
    };
  }
  if (src.expected_parent && src.expected_parent !== current.state_hash) {
    return {
      ok: false,
      refuse: "conflict",
      message: "Expected RoseClock tip does not match. Two writes against the same tip cannot both silently commit.",
      expected: src.expected_parent,
      tip: current.state_hash,
      v: ROSE_VERSION,
    };
  }

  const occurred_at = src.occurred_at || new Date().toISOString();
  const unsigned = {
    transition_id: src.transition_id || newId("rt"),
    rose_id: current.rose_id,
    branch_id: current.branch_id,
    from_sequence: current.sequence,
    to_sequence,
    from_state_hash: current.state_hash,
    action: String(action),
    action_class,
    actor_id: src.actor_id || "aziel-runtime",
    authority: Array.isArray(src.authority) ? src.authority.slice() : ["SESSION_EXEC"],
    conditions: src.conditions && typeof src.conditions === "object" ? src.conditions : {},
    static_time_ref: src.static_time_ref || null,
    temporal_ref: src.temporal_ref || null,
    correction_of: src.correction_of || null,
    supersedes: src.supersedes || null,
    result_hash: src.result_hash || null,
    occurred_at,
    v: ROSE_VERSION,
    author: ROSE_AUTHOR,
  };
  unsigned.transition_hash = await hashTransition(unsigned);

  const next = {
    rose_id: current.rose_id,
    branch_id: current.branch_id,
    sequence: to_sequence,
    gear: src.gear || action_class,
    phase: src.phase || current.phase,
    state: src.state || action_class,
    causal_parent_hash: current.state_hash,
    active_capabilities: Array.isArray(src.active_capabilities)
      ? src.active_capabilities.slice()
      : current.active_capabilities.slice(),
    created_at: occurred_at,
    state_hash: null,
    v: ROSE_VERSION,
    author: ROSE_AUTHOR,
  };
  next.state_hash = await hashState(next);
  tips.set(`${next.rose_id}::${next.branch_id}`, next);

  return {
    ok: true,
    v: ROSE_VERSION,
    rollback: false,
    software_tab: false,
    transition: unsigned,
    before: current,
    after: next,
    author: ROSE_AUTHOR,
  };
}

export function rollback() {
  return refuseRollback("rollback");
}

export function rewind() {
  return refuseRollback("rewind");
}

export function undo() {
  return refuseRollback("undo");
}

export function revert() {
  return refuseRollback("revert");
}

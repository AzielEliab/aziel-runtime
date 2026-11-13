/**
 * RIB-048 / RIB-049: read the verified witness log and run the two checks.
 * Reading does not write the log, does not mint a key, and does not sign.
 * The statement for a request stays on that request. It is not stored on the isolate.
 * A statement with no artifact digest or no receipt key stays not_checked, never a pass.
 * Author: Aziel Eliab.
 */
import { refreshAnchorsIfStale } from "./anchor.js";
import { attestFromStatement } from "./build-attest.js";
import { witnessedKeyIdFromStatement } from "./second-mint.js";

/**
 * Newest verified slot-1 statement, refreshed when the memo is older than ANCHOR_CACHE_MS.
 * `checked` is true only when that read verified. A failed read is not a pass.
 */
export async function readGroupD(fetchImpl, now = Date.now()) {
  let st = null;
  try {
    st = await refreshAnchorsIfStale(fetchImpl, now);
  } catch {
    st = null;
  }
  const log_ok = Boolean(st && st.ok && st.latest && st.latest.statement);
  const statement = log_ok ? st.latest.statement : null;
  return {
    checked: log_ok,
    log_ok,
    statement,
    attest: statement ? attestFromStatement(statement) : null,
    receipt_key_id: statement ? witnessedKeyIdFromStatement(statement) : null,
  };
}

/** Load the statement and hand it to this call. Does not write the isolate note. */
export async function withGroupD(fetchImpl, fn) {
  const view = await readGroupD(fetchImpl);
  return fn(view);
}

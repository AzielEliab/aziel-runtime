/**
 * RIB-048 / RIB-049: read the verified witness log and run the two checks.
 * Reading does not write the log, does not mint a key, and does not sign.
 * A statement with no artifact digest or no receipt key stays not_checked, never a pass.
 * Author: Aziel Eliab.
 */
import { anchorsKnown, loadAnchors } from "./anchor.js";
import { attestFromStatement, setWitnessedBuildAttest, witnessedBuildAttest } from "./build-attest.js";
import { setWitnessedReceiptKeyId, witnessedKeyIdFromStatement, witnessedReceiptKeyId } from "./second-mint.js";

/**
 * Verified slot-1 statement this isolate already holds, or a bounded read of the witness log.
 * A failed read is not a pass and does not clear a note the caller did not ask to replace.
 */
export async function readGroupD(fetchImpl) {
  let st = anchorsKnown();
  if (!st) {
    try {
      st = await loadAnchors(fetchImpl);
    } catch {
      st = null;
    }
  }
  const log_ok = Boolean(st && st.ok && st.latest && st.latest.statement);
  const statement = log_ok ? st.latest.statement : null;
  return {
    checked: Boolean(st),
    log_ok,
    statement,
    attest: statement ? attestFromStatement(statement) : null,
    receipt_key_id: statement ? witnessedKeyIdFromStatement(statement) : null,
  };
}

/**
 * Note the statement for the duration of one session request, then restore the previous note.
 * Exec and signing in that request see the statement. A later direct call does not.
 */
export async function withGroupD(fetchImpl, fn) {
  const prevAttest = witnessedBuildAttest();
  const prevKey = witnessedReceiptKeyId();
  const view = await readGroupD(fetchImpl);
  if (view.log_ok) {
    setWitnessedBuildAttest(view.attest);
    setWitnessedReceiptKeyId(view.receipt_key_id);
  }
  try {
    return await fn(view);
  } finally {
    setWitnessedBuildAttest(prevAttest);
    setWitnessedReceiptKeyId(prevKey);
  }
}

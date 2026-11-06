/**
 * Copy build-attestation and receipt-key id off a verified witness statement into the
 * isolate that checks them before exec. Absence stays not_checked, never a pass.
 * Not live. Author: Aziel Eliab.
 */
import { attestFromStatement, setWitnessedBuildAttest } from "./build-attest.js";
import { setWitnessedReceiptKeyId, witnessedKeyIdFromStatement } from "./second-mint.js";

export function noteWitnessedStatement(statement) {
  const attest = attestFromStatement(statement);
  setWitnessedBuildAttest(attest);
  setWitnessedReceiptKeyId(witnessedKeyIdFromStatement(statement));
  return {
    build_attest: attest ? "noted" : "not_checked",
    receipt_key: witnessedKeyIdFromStatement(statement) ? "noted" : "not_checked",
    live: false,
  };
}

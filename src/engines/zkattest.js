/**
 * zkattest local engine entry (src/engines/zkattest.js).
 * Hash-commitment attest. Not a SNARK. Author: Aziel Eliab.
 */
export { ZKATTEST_OPS, runZkattest as run } from "./zkattest/ops.js";
export { ENGINE_VERSION, LIMITATION, VERSION, commit, attest, openCommitment, verifyReceipt } from "./zkattest/engine.js";

/**
 * decisiongate local engine entry (src/engines/decisiongate.js).
 * Artifact: ported DecisionGATE Worker gates (runtime.js had no separate engine.js).
 * Author: Aziel Eliab.
 */
export { DECISIONGATE_OPS, runDecisiongate as run } from "./decisiongate/ops.js";
export { LIMITATION, MOTTO, VERSION, check, runGates } from "./decisiongate/engine.js";

/**
 * azcoherence local engine entry (src/engines/azcoherence.js).
 * Cite/health second-pass coherence reviewer. Product: https://github.com/AzielEliab/AZCoherence
 * Author: Aziel Eliab.
 */
export { AZCOHERENCE_OPS, runAzcoherence as run } from "./azcoherence/ops.js";
export {
  ENGINE_VERSION,
  LIMITATION,
  VERSION,
  coherenceCheck,
  reviewTriad,
  alternateScore,
  neutralizeHallucination,
} from "./azcoherence/engine.js";

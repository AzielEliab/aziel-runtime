/**
 * azclce local engine entry (src/engines/azclce.js).
 * Artifact: vendored az-clce Worker engine.js + triad.js.
 * Author: Aziel Eliab.
 */
export { AZCLCE_OPS, runAzclce as run } from "./azclce/ops.js";
export { ENGINE_VERSION, LIMITATION, classify, gate, parseLayers, score } from "./azclce/engine.js";

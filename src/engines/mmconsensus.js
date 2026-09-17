/**
 * mmconsensus local engine entry (src/engines/mmconsensus.js).
 * Posted-opinion consensus. Not live model calls. Author: Aziel Eliab.
 */
export { MMCONSENSUS_OPS, runMmconsensus as run } from "./mmconsensus/ops.js";
export { ENGINE_VERSION, LIMITATION, VERSION, tally, agree } from "./mmconsensus/engine.js";

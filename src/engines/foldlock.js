/**
 * foldlock local engine entry (src/engines/foldlock.js).
 * Artifact: vendored FoldLock Worker codec.js.
 * Author: Aziel Eliab.
 */
export { FOLDLOCK_OPS, runFoldlock as run } from "./foldlock/ops.js";
export {
  LIMITATION,
  PREVIEW_CAP,
  VERSION,
  b64decode,
  b64encode,
  foldBytes,
  unfoldBytes,
} from "./foldlock/codec.js";

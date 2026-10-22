/**
 * MESH-ONBOARD-1.0 capped node log. Appends lines to a 0600 file and rotates it to <file>.1 once
 * the next line would pass maxBytes, so at most two capped files exist (about 2 x maxBytes).
 * If rotation fails the file is truncated instead: the log never grows past the cap.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { appendFileSync, renameSync, statSync, writeFileSync } from "node:fs";

export const LOG_FILE_MODE = 0o600;
export const LOG_MIN_BYTES = 4096;
export const LOG_DEFAULT_BYTES = 1048576;

export function cappedLogger(file, maxBytes = LOG_DEFAULT_BYTES) {
  const cap = Math.max(LOG_MIN_BYTES, Number(maxBytes) || LOG_DEFAULT_BYTES);
  return (...parts) => {
    const line = `${parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join(" ")}\n`;
    let size = 0;
    try {
      size = statSync(file).size;
    } catch {
      size = 0;
    }
    if (size > 0 && size + Buffer.byteLength(line) > cap) {
      try {
        renameSync(file, `${file}.1`);
      } catch {
        writeFileSync(file, line, { mode: LOG_FILE_MODE });
        return;
      }
    }
    appendFileSync(file, line, { mode: LOG_FILE_MODE });
  };
}

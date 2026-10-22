/**
 * MESH-ONBOARD-1.0 capped node log. Appends to a 0600 file and rotates it to <file>.1 once the
 * next write would pass maxBytes, so at most two capped files exist (about 2 x maxBytes).
 * If rotation fails the file is truncated instead: the log never grows past the cap.
 *
 * Follow-up to #352 (AZBot LOWs):
 * - An existing <file> and <file>.1 are chmod 0600 when the log opens and on every rotate.
 *   If an existing file cannot be made 0600 the logger fails closed: it writes nothing
 *   (logger.refused === "LOG-MODE-REFUSED") rather than append to a readable file.
 * - A single line longer than the cap is truncated (UTF-8 safe, with a marker) so one write
 *   never makes the file pass the cap. Raw chunks (cappedWriter) are split into cap-sized pieces.
 *
 * Follow-up to #357 (AZBot INFO): the log path is never followed through a symlink. Every open
 * uses O_NOFOLLOW and the mode is set on the open fd (fchmod), so a symlink at <file> or
 * <file>.1, or anything that is not a regular file, makes the logger refuse (LOG-MODE-REFUSED).
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { closeSync, constants, fchmodSync, fstatSync, lstatSync, openSync, renameSync, writeSync } from "node:fs";

const NOFOLLOW = constants.O_NOFOLLOW || 0;

export const LOG_FILE_MODE = 0o600;
export const LOG_MIN_BYTES = 4096;
export const LOG_DEFAULT_BYTES = 1048576;
export const LOG_TRUNC_MARK = " [truncated]\n";

function capOf(maxBytes) {
  return Math.max(LOG_MIN_BYTES, Number(maxBytes) || LOG_DEFAULT_BYTES);
}

/** True when fd is a regular file that is (or now is) 0600. */
function fdTight(fd) {
  const st = fstatSync(fd);
  if (!st.isFile()) return false;
  if (process.platform === "win32") return true;
  if ((st.mode & 0o777) !== LOG_FILE_MODE) fchmodSync(fd, LOG_FILE_MODE);
  return (fstatSync(fd).mode & 0o777) === LOG_FILE_MODE;
}

/**
 * Make p 0600 without following a symlink. True when p is absent or is now a 0600 regular file;
 * false for a symlink, a non-file, or a file that cannot be made 0600.
 */
function tighten(p) {
  let st;
  try {
    st = lstatSync(p);
  } catch (e) {
    return !!e && e.code === "ENOENT";
  }
  if (st.isSymbolicLink() || !st.isFile()) return false;
  let fd;
  try {
    fd = openSync(p, constants.O_RDONLY | NOFOLLOW);
    return fdTight(fd);
  } catch {
    return false;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** Write buf to p (append or truncate) through an O_NOFOLLOW fd that is checked 0600 first. */
function writeTight(p, buf, append) {
  const flags = constants.O_WRONLY | constants.O_CREAT | NOFOLLOW | (append ? constants.O_APPEND : constants.O_TRUNC);
  let fd;
  try {
    fd = openSync(p, flags, LOG_FILE_MODE);
    if (!fdTight(fd)) return false;
    let off = 0;
    while (off < buf.length) off += writeSync(fd, buf, off, buf.length - off);
    return true;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** Cut a UTF-8 buffer to at most n bytes without splitting a multi-byte character. */
function cutUtf8(buf, n) {
  if (buf.length <= n) return buf;
  let end = Math.max(0, n);
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end--;
  return buf.subarray(0, end);
}

/** Truncate one log line (ending in \n) so it fits in cap bytes. */
export function fitLine(line, cap) {
  const buf = Buffer.from(line, "utf8");
  if (buf.length <= cap) return buf;
  const mark = Buffer.from(LOG_TRUNC_MARK, "utf8");
  return Buffer.concat([cutUtf8(buf, cap - mark.length), mark]);
}

function makeSink(file, cap) {
  const state = { refused: null };
  if (!tighten(file) || !tighten(`${file}.1`)) state.refused = "LOG-MODE-REFUSED";
  const put = (buf) => {
    if (state.refused || buf.length === 0) return;
    let size = 0;
    try {
      const st = lstatSync(file);
      if (st.isSymbolicLink() || !st.isFile()) {
        state.refused = "LOG-MODE-REFUSED";
        return;
      }
      size = st.size;
    } catch {
      size = 0;
    }
    if (size > 0 && size + buf.length > cap) {
      if (!tighten(`${file}.1`)) {
        state.refused = "LOG-MODE-REFUSED";
        return;
      }
      try {
        renameSync(file, `${file}.1`);
      } catch {
        if (!writeTight(file, buf, false)) state.refused = "LOG-MODE-REFUSED";
        return;
      }
      if (!tighten(`${file}.1`)) {
        state.refused = "LOG-MODE-REFUSED";
        return;
      }
    }
    if (!writeTight(file, buf, true)) state.refused = "LOG-MODE-REFUSED";
  };
  return { state, put };
}

/** Line logger (console.log replacement): one call = one line, truncated to fit the cap. */
export function cappedLogger(file, maxBytes = LOG_DEFAULT_BYTES) {
  const cap = capOf(maxBytes);
  const { state, put } = makeSink(file, cap);
  const log = (...parts) => {
    const line = `${parts.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join(" ")}\n`;
    put(fitLine(line, cap));
  };
  Object.defineProperty(log, "refused", { get: () => state.refused });
  return log;
}

/** Raw byte writer (for a child's stdout/stderr): chunks are split into pieces of at most cap bytes. */
export function cappedWriter(file, maxBytes = LOG_DEFAULT_BYTES) {
  const cap = capOf(maxBytes);
  const { state, put } = makeSink(file, cap);
  const write = (chunk) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf8");
    for (let i = 0; i < buf.length; i += cap) put(buf.subarray(i, Math.min(buf.length, i + cap)));
  };
  Object.defineProperty(write, "refused", { get: () => state.refused });
  return write;
}

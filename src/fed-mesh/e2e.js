/**
 * End-to-end message bodies. X25519 + HKDF-SHA-256 + AES-GCM.
 * Track-2 seals version 2 (header bound as additional data) through the
 * shared carrier frame. Version 1 opens only when the caller sets allowV1.
 * The relay never calls openMessage. Author: Aziel Eliab only.
 */

import { carrierAdapter } from "../transport/carriers.js";
import { openFrame } from "../transport/sealed-frame.js";

export async function sealPlaintext(opts = {}) {
  const carrier = opts.carrier || "relay";
  const sealed = await carrierAdapter(carrier).seal({ ...opts, version: opts.version });
  if (!sealed || sealed.ok === false) return null;
  return sealed;
}

export async function openCiphertext(opts = {}) {
  return openFrame(opts);
}

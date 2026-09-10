/**
 * FoldLock in-process ops. Codec artifact is ./codec.js (vendored Worker engine).
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  LIMITATION,
  PAPER,
  PREVIEW_CAP,
  SPEC,
  TETHERS,
  VERSION,
  b64decode,
  b64encode,
  foldBytes,
  unfoldBytes,
} from "./codec.js";

const PRODUCT = "foldlock";
const LIVE = ["health", "skill", "fold-preview", "unfold-preview", "doctor"];
const STUB = ["zip", "hosted_store"];
export const FOLDLOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: PRODUCT,
    name: "FoldLock",
    version: VERSION,
    spec: SPEC,
    role: "algorithmic tether-word suppression",
    motto: "Not zip.",
    axes: ["fold", "unfold", "receipt"],
    neighbors: ["codelock", "azpipe"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { zip: false, paper: PAPER, tether_words: TETHERS.length, method: "adaptive" },
  };
}

export function foldlockHealth() {
  return capabilityHealth(envelope());
}

export function foldlockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Algorithmic tether-word suppression on UTF-8 text. Preview cap ~8KB. Not zip.",
  });
}

export function foldlockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "FoldLock doctor: fold-preview / unfold-preview. Not zip. No hosted store.",
  });
}

export async function foldPreview(body, scratch) {
  const src = body && typeof body === "object" ? body : {};
  const text = src.text != null ? String(src.text) : "";
  const raw = new TextEncoder().encode(text);
  scratch.push(raw);
  if (raw.byteLength > PREVIEW_CAP) {
    return {
      error: "preview cap ~8KB",
      status: 400,
      cap: PREVIEW_CAP,
      got: raw.byteLength,
      zip: false,
      kv_increment: false,
      limitation: LIMITATION,
    };
  }
  const { blob, receipt } = await foldBytes(raw);
  scratch.push(blob);
  return {
    product: PRODUCT,
    version: VERSION,
    spec: SPEC,
    kv_increment: false,
    zip: false,
    true_engine_runtime: true,
    method: receipt.method || "adaptive",
    strategy: receipt.strategy,
    banner: "SOTA adaptive UNI1 compression engine",
    limitation: LIMITATION,
    receipt,
    b64: b64encode(blob),
    tether_words: TETHERS.length,
  };
}

export async function unfoldPreview(body, scratch) {
  const src = body && typeof body === "object" ? body : {};
  const b64 = src.b64 || src.fld_b64 || src.bytes_b64;
  if (!b64) {
    return { error: "b64 required", status: 400, zip: false, verified: false, limitation: LIMITATION };
  }
  let blob;
  try {
    blob = b64decode(b64);
  } catch (err) {
    return {
      error: "bad base64: " + String(err && err.message ? err.message : err),
      status: 400,
      zip: false,
      verified: false,
      limitation: LIMITATION,
    };
  }
  scratch.push(blob);
  if (blob.byteLength > PREVIEW_CAP + 64) {
    return { error: "preview cap ~8KB", status: 400, cap: PREVIEW_CAP, zip: false, verified: false, limitation: LIMITATION };
  }
  const { raw, meta } = await unfoldBytes(blob);
  scratch.push(raw);
  return {
    product: PRODUCT,
    version: VERSION,
    spec: SPEC,
    kv_increment: false,
    zip: false,
    true_engine_runtime: true,
    method: meta.method || "adaptive",
    strategy: meta.strategy,
    banner: "SOTA adaptive UNI1 compression engine",
    limitation: LIMITATION,
    verified: true,
    text: meta.text,
    orig_size: meta.orig_size,
    orig_sha256: meta.orig_sha256,
  };
}

export async function runFoldlock(op, payload, scratch) {
  if (op === "health") return foldlockHealth();
  if (op === "skill") return foldlockSkill();
  if (op === "doctor") return foldlockDoctor();
  if (op === "fold-preview") return foldPreview(payload, scratch);
  if (op === "unfold-preview") return unfoldPreview(payload, scratch);
  return { unsupported: true };
}

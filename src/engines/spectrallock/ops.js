/**
 * spectrallock in-process ops. Author: Aziel Eliab.
 * Overlay bytes are vendored from spectrallock workers/download-tracker/src/overlay.js.
 * Runtime envelope (health/skill/targets/verify) stays here so overlay.js stays byte-for-byte.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  ALIASES,
  LIMITATION,
  LIVE,
  MAX_SIDE,
  MODES,
  STUB_MODES,
  TARGET_IDS,
  TARGETS,
  VERSION,
  overlayFromB64,
  resolveMode,
} from "./overlay.js";

const LIVE_OPS_LIST = ["health", "skill", "modes", "targets", "overlay", "verify", "doctor"];

export const SPECTRALLOCK_OPS = LIVE_OPS_LIST.slice();

export const PRODUCT = "spectrallock";
export const NAME = "SpectralLock";
export const SPEC = "RSA-2.0";
export const AUTHOR = "Aziel Eliab";
export const ROLE = "256px overlay preview";
export const MOTTO = "The human still reads the page. Balance never invents marks.";
export const AXES = Object.freeze(["lens", "target", "geometry"]);
export const NEIGHBORS = Object.freeze(["4dmap", "trajectorylock", "aziel-corpus"]);
export const STUB_REFUSE = Object.freeze(["spectrometer", "forensic", "invent_mark"]);

/** Runtime honesty wrapper. Overlay LIMITATION is product copy; health still needs THIS IS. */
export const RUNTIME_LIMITATION =
  "THIS IS: hosted 256px overlay preview. Synthetic looks only. " +
  LIMITATION +
  " THIS IS NOT: a spectrometer, forensic lab, ESDA, or chemical test. Never invent marks. Identity Aziel Eliab only.";

const CANONICAL_MODE_IDS = Object.freeze([
  "zero",
  "tazel",
  "vyrn",
  "uv",
  "rosetta",
  "zen",
  "chaos",
  "balance",
  "candle",
  "indent",
  "lemon",
]);

function envelope() {
  return {
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    role: ROLE,
    motto: MOTTO,
    axes: AXES,
    neighbors: NEIGHBORS,
    live_ops: LIVE_OPS_LIST,
    stub_ops: STUB_REFUSE,
    limitation: RUNTIME_LIMITATION,
    extra: { spectrometer: false, forensic: false, esda: false, chemical_test: false, max_side: MAX_SIDE },
  };
}

export function spectrallockHealth() {
  return capabilityHealth(envelope());
}

export function spectrallockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead:
      "256px hosted overlay preview. Lenses: zero, tazel, vyrn, uv, rosetta, zen, chaos, balance, candle, indent, lemon. " +
      "UV aliases: ultraviolet, uv-light, uvsa. Targets: ink, page. Synthetic looks. Not a spectrometer. Not forensic. Not ESDA. Not a chemical test. " +
      "Candle/indent/lemon never invent marks. Balance never invents marks. Full histogram / band-pass lives in the Python package. " +
      "4DMap Γ may cite a class; SpectralLock does not write 4DMap cards.",
  });
}

export function spectrallockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "SpectralLock doctor: 256px preview only. Not a spectrometer. Not forensic. Not ESDA. Not a chemical test.",
  });
}

export function listTargets() {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    targets: TARGETS,
    target_ids: TARGET_IDS.slice(),
    modes: MODES,
    live: LIVE.slice(),
    aliases: { ...ALIASES },
    max_side: MAX_SIDE,
    spectrometer: false,
    forensic: false,
    invent_mark: false,
    esda: false,
    chemical_test: false,
    neighbors: NEIGHBORS.slice(),
    limitation: RUNTIME_LIMITATION,
    author: AUTHOR,
  };
}

async function overlayMetaHash(meta) {
  const payload = {
    height: meta.height,
    lenses: meta.lenses,
    mode: meta.mode,
    target: meta.target,
    width: meta.width,
  };
  const keys = Object.keys(payload).sort();
  const raw = "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(payload[k])).join(",") + "}";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function resolveLensId(name) {
  const resolved = resolveMode(name);
  if (resolved && resolved.error === "stub") return resolved;
  if (typeof resolved === "string" && LIVE.includes(resolved)) return resolved;
  return null;
}

export async function verifyOverlay(body) {
  const src = body && typeof body === "object" ? body : {};
  const rawMode = String(src.mode || src.lens || "");
  const target = String(src.target || src.polarity || "ink");
  const width = Number(src.width);
  const height = Number(src.height);
  const stored = String(src.hash || src.overlay_hash || "");
  const rawLenses = Array.isArray(src.lenses) ? src.lenses : rawMode ? rawMode.split("+") : [];
  const lenses = [];
  for (const item of rawLenses) {
    const key = String(item || "").trim().toLowerCase();
    if (!key) continue;
    const resolved = resolveLensId(key);
    if (resolved && resolved.error === "stub") {
      return { ok: false, match: false, error: `${resolved.unknown} is a stub`, unknown: resolved.unknown, known: LIVE, limitation: RUNTIME_LIMITATION };
    }
    if (!resolved) {
      return { ok: false, match: false, error: "unknown lens", unknown: key, known: LIVE, limitation: RUNTIME_LIMITATION };
    }
    if (!lenses.includes(resolved)) lenses.push(resolved);
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { ok: false, match: false, error: "verify needs width and height from an overlay result", status: 400, limitation: RUNTIME_LIMITATION };
  }
  const mode = lenses.length === 1 ? lenses[0] : lenses.join("+");
  const recomputed = await overlayMetaHash({ mode, lenses, target, width, height });
  return {
    ok: !stored || stored === recomputed,
    match: !stored || stored === recomputed,
    product: PRODUCT,
    version: VERSION,
    hash: stored || recomputed,
    recomputed,
    mode,
    target,
    width,
    height,
    spectrometer: false,
    forensic: false,
    limitation: RUNTIME_LIMITATION,
    author: AUTHOR,
    note: "Metadata hash of mode/target/geometry. Not a forensic claim.",
  };
}

export async function runSpectrallock(op, payload, scratch) {
  if (op === "health") return spectrallockHealth();
  if (op === "skill") return spectrallockSkill();
  if (op === "doctor") return spectrallockDoctor();
  if (op === "modes") {
    return {
      product: PRODUCT,
      version: VERSION,
      modes: MODES,
      mode_ids: CANONICAL_MODE_IDS.slice(),
      live: LIVE.slice(),
      aliases: { ...ALIASES },
      targets: TARGETS,
      stub_modes: STUB_MODES.slice(),
      limitation: RUNTIME_LIMITATION,
      true_engine_runtime: true,
    };
  }
  if (op === "targets") return { ...listTargets(), true_engine_runtime: true };
  if (op === "verify") return verifyOverlay(payload);
  if (op === "overlay") {
    const src = payload && typeof payload === "object" ? payload : {};
    if (!src.b64 && !src.png_b64) return { error: "b64 required", status: 400, limitation: RUNTIME_LIMITATION };
    const result = await overlayFromB64(src.b64 || src.png_b64, src.mode || "rosetta", src);
    if (result && result.error) {
      return { ...result, limitation: RUNTIME_LIMITATION };
    }
    if (result && result.width && result.height) {
      result.overlay_hash = await overlayMetaHash({
        mode: result.mode,
        lenses: result.lenses,
        target: result.target,
        width: result.width,
        height: result.height,
      });
    }
    return result;
  }
  return { unsupported: true };
}

export { LIMITATION, LIVE, MODES, CANONICAL_MODE_IDS };

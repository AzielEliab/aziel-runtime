/**
 * spectrallock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  AUTHOR,
  AXES,
  LIMITATION,
  LIVE,
  MODES,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  ROLE,
  SPEC,
  STUB_REFUSE,
  TARGETS,
  VERSION,
  listTargets,
  overlayFromB64,
  verifyOverlay,
} from "./overlay.js";

const LIVE_OPS_LIST = ["health", "skill", "modes", "targets", "overlay", "verify", "doctor"];

export const SPECTRALLOCK_OPS = LIVE_OPS_LIST.slice();

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
    limitation: LIMITATION,
    extra: { spectrometer: false, forensic: false, max_side: 256 },
  };
}

export function spectrallockHealth() {
  return capabilityHealth(envelope());
}

export function spectrallockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "256px hosted overlay preview. Lenses: zero, tazel, vyrn, uv, rosetta, zen, chaos, balance. Targets: ink, page. Not a spectrometer. Not forensic. Balance never invents marks. Full histogram / band-pass lives in the Python package. 4DMap Γ may cite a class; SpectralLock does not write 4DMap cards.",
  });
}

export function spectrallockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "SpectralLock doctor: 256px preview only. Not a spectrometer. Not forensic.",
  });
}

export async function runSpectrallock(op, payload, scratch) {
  if (op === "health") return spectrallockHealth();
  if (op === "skill") return spectrallockSkill();
  if (op === "doctor") return spectrallockDoctor();
  if (op === "modes") {
    return { product: PRODUCT, version: VERSION, modes: MODES, targets: TARGETS, live: LIVE, limitation: LIMITATION, true_engine_runtime: true };
  }
  if (op === "targets") return { ...listTargets(), true_engine_runtime: true };
  if (op === "verify") return verifyOverlay(payload);
  if (op === "overlay") {
    const src = payload && typeof payload === "object" ? payload : {};
    if (!src.b64 && !src.png_b64) return { error: "b64 required", status: 400, limitation: LIMITATION };
    return overlayFromB64(src.b64 || src.png_b64, src.mode || "rosetta", src);
  }
  return { unsupported: true };
}

export { LIMITATION, VERSION, AUTHOR };

/**
 * peacelock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  MOTTO,
  ROLE,
  openLattice,
  sealLattice,
  breakLattice,
  showLattice,
  verifyLattice,
  stampEnvelope,
  uploadEnvelope,
} from "./engine.js";

const LIVE = ["health", "skill", "open", "seal", "break", "show", "verify", "stamp", "upload_envelope", "doctor"];
const STUB = ["transcript", "transcribe", "motive", "counterfactual", "invent", "waive-duty", "bypass-duty"];
export const PEACELOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: "peacelock",
    name: "PeaceLock",
    version: VERSION,
    spec: SPEC,
    role: ROLE,
    motto: MOTTO,
    axes: ["open", "seal", "break", "verify"],
    neighbors: ["temporallock", "whistlelock", "azchat"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { author: AUTHOR, transcript: false },
  };
}

export function peacelockHealth() {
  return capabilityHealth(envelope());
}

export function peacelockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Chosen silence / chosen inaction as a hash-chained receipt. Transcript, counterfactual, and motive stay ABSENT. HARD_DUTY refuses a silence/inaction receipt.",
  });
}

export function peacelockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "PeaceLock doctor: lattice open/seal/break/verify. No transcript. No motive.",
  });
}

export async function runPeacelock(op, payload, scratch) {
  if (op === "health") return peacelockHealth();
  if (op === "skill") return peacelockSkill();
  if (op === "doctor") return peacelockDoctor();
  if (op === "open") return openLattice(payload);
  if (op === "seal") return sealLattice(payload);
  if (op === "break") return breakLattice(payload);
  if (op === "show") return showLattice(payload);
  if (op === "verify") return verifyLattice(payload);
  if (op === "stamp") return stampEnvelope(payload, scratch);
  if (op === "upload_envelope") return uploadEnvelope(payload, scratch);
  return { unsupported: true };
}

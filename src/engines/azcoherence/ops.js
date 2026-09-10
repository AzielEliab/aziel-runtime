/**
 * AZCoherence in-process ops. Engine artifact is ./engine.js.
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  AUTHOR,
  AXES,
  LIMITATION,
  LIVE_OPS,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  PRODUCT_GITHUB,
  ROLE,
  SPEC,
  STUB_REFUSE,
  VERSION,
  alternateScore,
  coherenceCheck,
  neutralizeHallucination,
  reviewTriad,
  verifyReceipt,
} from "./engine.js";

export const AZCOHERENCE_OPS = LIVE_OPS.slice();

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
    live_ops: LIVE_OPS,
    stub_ops: STUB_REFUSE,
    limitation: LIMITATION,
    extra: {
      github: PRODUCT_GITHUB,
      advisory: true,
      confidence_is_not_truth: true,
      invents_evidence: false,
      akm_triad: false,
    },
  };
}

export function azcoherenceHealth() {
  return capabilityHealth(envelope());
}

export function azcoherenceSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: `Second-pass coherence reviewer for alternative triad scores. Peer AZ-CLCE detects R/D/P inconsistency; AZCoherence reviews primary vs alternate → PASS / FLAG / NEUTRALIZE / REFUSE. ${MOTTO} Not AKM-TRIAD fabric. Product cite: ${PRODUCT_GITHUB}.`,
  });
}

export function azcoherenceDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note:
      "AZCoherence doctor: cite/health + coherence receipt. Never invents evidence. Confidence ≠ truth. FragGate only. Not a mesh enable. Not AKM-TRIAD.",
  });
}

export async function runAzcoherence(op, payload) {
  if (op === "health") return azcoherenceHealth();
  if (op === "skill") return azcoherenceSkill();
  if (op === "doctor") return azcoherenceDoctor();
  if (op === "verify") return verifyReceipt(payload);
  if (op === "review_triad") return reviewTriad(payload);
  if (op === "alternate_score") return alternateScore(payload);
  if (op === "coherence_check") return coherenceCheck(payload);
  if (op === "neutralize_hallucination") return neutralizeHallucination(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION, AUTHOR };

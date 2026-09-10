/**
 * DecisionGATE in-process ops. Engine artifact is ./engine.js.
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  AUTHOR,
  AXES,
  GATE_ORDER,
  LIMITATION,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  ROLE,
  SPEC,
  STUB_REFUSE,
  VERSION,
  check,
  listGates,
  verifyLineage,
} from "./engine.js";

const LIVE = ["health", "skill", "check", "evaluate", "gates", "verify", "doctor"];

export const DECISIONGATE_OPS = LIVE.slice();

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
    live_ops: LIVE,
    stub_ops: STUB_REFUSE,
    limitation: LIMITATION,
    extra: { sequential_gate: true, wrap_hosted: false },
  };
}

export function decisiongateHealth() {
  return capabilityHealth(envelope());
}

export function decisiongateSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: `Five sequential gates on a proposal: ${GATE_ORDER.join(" → ")}. ${MOTTO} wrap is **not** hosted. 4DMap is an inspection frame, not a sequential gate.`,
  });
}

export function decisiongateDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "DecisionGATE doctor: five-gate order, wrap unhosted, no truth score. FragGate only.",
  });
}

export async function runDecisiongate(op, payload) {
  if (op === "health") return decisiongateHealth();
  if (op === "skill") return decisiongateSkill();
  if (op === "doctor") return decisiongateDoctor();
  if (op === "gates") return listGates();
  if (op === "verify") return verifyLineage(payload);
  if (op === "check" || op === "evaluate") return check(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION, AUTHOR };

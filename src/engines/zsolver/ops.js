/**
 * ZionPattern Solver in-process ops. Does not solve cases. 75% cap.
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { DISCLAIMER, SCHEMA_VERSION, patternsPayload, scoreRequest, sessionSnapshot } from "./engine.js";

const LIMITATION = ensureThisIs(
  DISCLAIMER,
  "THIS IS: nine ontology nodes with a hard 75% cap / 25% floor. THIS IS NOT: a case solver or court verdict.",
);
const LIVE = ["health", "skill", "patterns", "score", "session", "doctor"];
const STUB = ["solve_case", "court", "verdict"];
export const ZSOLVER_OPS = LIVE.slice();

function envelope() {
  return {
    product: "zsolver",
    name: "ZionPattern Solver",
    version: SCHEMA_VERSION,
    role: "provisional ontology scorer",
    motto: "Does not solve cases.",
    axes: ["pattern", "cap", "floor"],
    neighbors: ["godlock", "azcoherence", "decisiongate"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { disclaimer: DISCLAIMER, confidence_cap: 0.75 },
  };
}

export function zsolverHealth() {
  return capabilityHealth(envelope());
}

export function zsolverSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Nine ontology nodes (Zioncheck seed). Hard 75% cap / 25% floor. Does not solve cases.",
  });
}

export function zsolverDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "ZionPattern doctor: patterns / score / session. No case verdict.",
  });
}

export async function runZsolver(op, payload) {
  if (op === "health") return zsolverHealth();
  if (op === "skill") return zsolverSkill();
  if (op === "doctor") return zsolverDoctor();
  if (op === "patterns") return patternsPayload();
  const body = payload && typeof payload === "object" ? payload : {};
  if (op === "score") return scoreRequest(body);
  if (op === "session") return sessionSnapshot(body);
  return { unsupported: true };
}

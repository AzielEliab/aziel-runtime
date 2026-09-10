/**
 * codelock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { LIMITATION, MOTTO, VERSION, handleRender, gateStatus } from "./engine.js";

const LIVE = ["health", "skill", "render", "gate-status", "doctor"];
const STUB = ["rewrite_meaning", "remote_compile"];
export const CODELOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: "codelock",
    name: "CodeLock",
    version: VERSION,
    role: "perception gate on source text",
    motto: MOTTO,
    axes: ["normalize", "rosetta", "gate"],
    neighbors: ["glossafilter", "foldlock"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: ensureThisIs(LIMITATION, "THIS IS: a perception gate on source text. THIS IS NOT: a rewrite of meaning or a remote compiler."),
  };
}

export function codelockHealth() {
  return capabilityHealth(envelope());
}

export function codelockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Alters perception, not meaning. gate-status reports open/closed. Not a remote compiler.",
  });
}

export function codelockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "CodeLock doctor: render + gate-status. Does not rewrite meaning.",
  });
}

export async function runCodelock(op, payload, scratch) {
  if (op === "health") return codelockHealth();
  if (op === "skill") return codelockSkill();
  if (op === "doctor") return codelockDoctor();
  if (op === "gate-status") return { ...gateStatus(payload && payload.ack), true_engine_runtime: true };
  if (op === "render") return handleRender(payload);
  return { unsupported: true };
}

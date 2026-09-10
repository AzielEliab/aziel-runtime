/**
 * employeelock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { LIMITATION, VERSION, appendPreview, verifyCanonical } from "./engine.js";

const LIVE = ["health", "skill", "append-preview", "verify-canonical", "doctor"];
const STUB = ["court", "judge"];
export const EMPLOYEELOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: "employeelock",
    name: "EmployeeLock",
    version: VERSION,
    role: "hash-chained accountability workbook",
    motto: "Not a court. Not a truth score.",
    axes: ["canonical", "hash", "preview"],
    neighbors: ["forgereceipts", "temporallock"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { court: false, xlsx_stored: false },
  };
}

export function employeelockHealth() {
  return capabilityHealth(envelope());
}

export function employeelockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Hash a proposed LOG row and recompute posted canonical JSON. Hosted never stores xlsx. Not a court.",
  });
}

export function employeelockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "EmployeeLock doctor: append-preview + verify-canonical. court/judge stay refuse.",
  });
}

export async function runEmployeelock(op, payload, scratch) {
  if (op === "health") return employeelockHealth();
  if (op === "skill") return employeelockSkill();
  if (op === "doctor") return employeelockDoctor();
  if (op === "append-preview") return appendPreview(payload);
  if (op === "verify-canonical") return verifyCanonical(payload);
  return { unsupported: true };
}

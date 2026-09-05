/**
 * employeelock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, appendPreview, verifyCanonical } from "./engine.js";

export const EMPLOYEELOCK_OPS = ["health", "skill", "append-preview", "verify-canonical"];

export function employeelockHealth() {
  return {
    ok: true,
    product: "employeelock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function employeelockSkill() {
  return {
    markdown: `# employeelock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runEmployeelock(op, payload, scratch) {
  if (op === "health") return employeelockHealth();
  if (op === "skill") return employeelockSkill();
  if (op === "append-preview") return appendPreview(payload);
  if (op === "verify-canonical") return verifyCanonical(payload);
  return { unsupported: true };
}

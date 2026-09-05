/**
 * codelock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, handleRender, gateStatus } from "./engine.js";

export const CODELOCK_OPS = ["health", "skill", "render", "gate-status"];

export function codelockHealth() {
  return {
    ok: true,
    product: "codelock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function codelockSkill() {
  return {
    markdown: `# codelock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runCodelock(op, payload, scratch) {
  if (op === "health") return codelockHealth();
  if (op === "skill") return codelockSkill();
  if (op === "gate-status") return { ...gateStatus(payload && payload.ack), true_engine_runtime: true };
  if (op === "render") return handleRender(payload);
  return { unsupported: true };
}

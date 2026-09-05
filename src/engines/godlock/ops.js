/**
 * godlock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, score, submit } from "./engine.js";

export const GODLOCK_OPS = ["health", "skill", "score", "submit"];

export function godlockHealth() {
  return {
    ok: true,
    product: "godlock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function godlockSkill() {
  return {
    markdown: `# godlock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runGodlock(op, payload, scratch) {
  if (op === "health") return godlockHealth();
  if (op === "skill") return godlockSkill();
  if (op === "score") return score(payload);
  if (op === "submit") return submit(payload);
  return { unsupported: true };
}

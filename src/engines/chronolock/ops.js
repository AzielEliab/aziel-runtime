/**
 * chronolock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, advise, listAnchors } from "./engine.js";

export const CHRONOLOCK_OPS = ["health", "skill", "advisory", "anchors"];

export function chronolockHealth() {
  return {
    ok: true,
    product: "chronolock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function chronolockSkill() {
  return {
    markdown: `# chronolock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runChronolock(op, payload, scratch) {
  if (op === "health") return chronolockHealth();
  if (op === "skill") return chronolockSkill();
  if (op === "advisory") return { ...(await advise((payload && payload.geo) || "Indiana", payload && payload.language, payload && payload.dialect)), true_engine_runtime: true, limitation: LIMITATION };
  if (op === "anchors") return { ...listAnchors(), true_engine_runtime: true };
  return { unsupported: true };
}

/**
 * vibelock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, handleAnalyze } from "./engine.js";

export const VIBELOCK_OPS = ["health", "skill", "analyze", "detect"];

export function vibelockHealth() {
  return {
    ok: true,
    product: "vibelock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function vibelockSkill() {
  return {
    markdown: `# vibelock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runVibelock(op, payload, scratch) {
  if (op === "health") return vibelockHealth();
  if (op === "skill") return vibelockSkill();
  if (op === "analyze" || op === "detect") {
    const out = await handleAnalyze(payload);
    return { ...out, true_engine_runtime: true, limitation: LIMITATION };
  }
  return { unsupported: true };
}

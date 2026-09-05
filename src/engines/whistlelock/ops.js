/**
 * whistlelock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, hashPreview, canonPreview } from "./engine.js";

export const WHISTLELOCK_OPS = ["health", "skill", "hash-preview", "canon-preview"];

export function whistlelockHealth() {
  return {
    ok: true,
    product: "whistlelock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function whistlelockSkill() {
  return {
    markdown: `# whistlelock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runWhistlelock(op, payload, scratch) {
  if (op === "health") return whistlelockHealth();
  if (op === "skill") return whistlelockSkill();
  if (op === "hash-preview") return hashPreview(payload, scratch);
  if (op === "canon-preview") return canonPreview(payload);
  return { unsupported: true };
}

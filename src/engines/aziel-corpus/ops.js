/**
 * aziel-corpus in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, search, examplePayload } from "./engine.js";

export const AZIEL_CORPUS_OPS = ["health", "skill", "search", "example"];

export function aziel_corpusHealth() {
  return {
    ok: true,
    product: "aziel-corpus",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function aziel_corpusSkill() {
  return {
    markdown: `# aziel-corpus (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runAzielCorpus(op, payload, scratch) {
  if (op === "health") return aziel_corpusHealth();
  if (op === "skill") return aziel_corpusSkill();
  if (op === "search") return search(payload);
  if (op === "example") return { product: "aziel-corpus", example: examplePayload(), true_engine_runtime: true, limitation: LIMITATION };
  return { unsupported: true };
}

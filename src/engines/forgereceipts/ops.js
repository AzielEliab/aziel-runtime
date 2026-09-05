/**
 * forgereceipts in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, receipt } from "./engine.js";

export const FORGERECEIPTS_OPS = ["health", "skill", "receipt"];

export function forgereceiptsHealth() {
  return {
    ok: true,
    product: "forgereceipts",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function forgereceiptsSkill() {
  return {
    markdown: `# forgereceipts (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runForgereceipts(op, payload, scratch) {
  if (op === "health") return forgereceiptsHealth();
  if (op === "skill") return forgereceiptsSkill();
  if (op === "receipt") return receipt(payload);
  return { unsupported: true };
}

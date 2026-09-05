/**
 * azos in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, statusPayload, invitePayload, principlesPayload } from "./engine.js";

export const AZOS_OPS = ["health", "skill", "status", "invite", "principles"];

export function azosHealth() {
  return {
    ok: true,
    product: "azos",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function azosSkill() {
  return {
    markdown: `# azos (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runAzos(op, payload, scratch) {
  if (op === "health") return azosHealth();
  if (op === "skill") return azosSkill();
  if (op === "status") return statusPayload();
  if (op === "invite") return invitePayload();
  if (op === "principles") return principlesPayload();
  return { unsupported: true };
}

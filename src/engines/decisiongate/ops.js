/**
 * DecisionGATE in-process ops. Engine artifact is ./engine.js.
 * Author: Aziel Eliab.
 */
import { LIMITATION, MOTTO, VERSION, check } from "./engine.js";

export const DECISIONGATE_OPS = ["health", "skill", "check", "evaluate"];

export function decisiongateHealth() {
  return {
    ok: true,
    product: "decisiongate",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    motto: MOTTO,
    limitation: LIMITATION,
    author: "Aziel Eliab",
    wrap_hosted: false,
  };
}

export function decisiongateSkill() {
  return {
    markdown: `# DecisionGATE (in-process)

Five sequential gates on a proposal. ${MOTTO}
wrap is **not** hosted. This op ran inside aziel-runtime.

Author: **Aziel Eliab**. Version: ${VERSION}.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runDecisiongate(op, payload) {
  if (op === "health") return decisiongateHealth();
  if (op === "skill") return decisiongateSkill();
  if (op === "check" || op === "evaluate") return check(payload);
  return { unsupported: true };
}

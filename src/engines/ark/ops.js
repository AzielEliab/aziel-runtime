/**
 * The ARK in-process ops. Mode E heuristics only. Never unlocks a vault.
 * Author: Aziel Eliab.
 */
import { LIMITATION, levels, sweep } from "./engine.js";

export const ARK_OPS = ["health", "skill", "sweep", "levels"];

export function arkHealth() {
  return {
    ok: true,
    product: "ark",
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
    note: "Mode E heuristics only. Hosted/in-process never unlocks or stores vaults.",
  };
}

export function arkSkill() {
  return {
    markdown: `# The ARK (in-process)

Mode E heuristics sweep. **Not a kernel.** This process never unlocks or encrypts with a passphrase and never stores vaults.

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runArk(op, payload, scratch) {
  if (op === "health") return arkHealth();
  if (op === "skill") return arkSkill();
  if (op === "levels") return levels();
  if (op === "sweep") {
    const out = sweep(payload && typeof payload === "object" ? payload : {});
    return { ...out, true_engine_runtime: true, stored: false };
  }
  return { unsupported: true };
}

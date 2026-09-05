/**
 * postking in-process ops. Author: Aziel Eliab.
 */
import { MOTTO, newGame, playMove, statusOf } from "./engine.js";
const LIMITATION = MOTTO;
const VERSION = "0.1.0";

export const POSTKING_OPS = ["health", "skill", "new", "move", "status"];

export function postkingHealth() {
  return {
    ok: true,
    product: "postking",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function postkingSkill() {
  return {
    markdown: `# postking (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runPostking(op, payload, scratch) {
  if (op === "health") return postkingHealth();
  if (op === "skill") return postkingSkill();
  try {
    if (op === "new") return { ...newGame(payload || {}), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "move") return { ...(await playMove(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "status") return { ...statusOf(payload || {}), true_engine_runtime: true, limitation: LIMITATION };
  } catch (err) {
    return { error: String(err && err.message ? err.message : err), status: 400, limitation: LIMITATION };
  }
  return { unsupported: true };
}

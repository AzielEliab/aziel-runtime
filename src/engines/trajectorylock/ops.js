/**
 * trajectorylock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, EXAMPLE_CASE, analyzeCase } from "./engine.js";

export const TRAJECTORYLOCK_OPS = ["health", "skill", "example", "analyze"];

export function trajectorylockHealth() {
  return {
    ok: true,
    product: "trajectorylock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function trajectorylockSkill() {
  return {
    markdown: `# trajectorylock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runTrajectorylock(op, payload, scratch) {
  if (op === "health") return trajectorylockHealth();
  if (op === "skill") return trajectorylockSkill();
  if (op === "example") return { product: "trajectorylock", version: VERSION, example: EXAMPLE_CASE, limitation: LIMITATION, true_engine_runtime: true, synthetic: true };
  if (op === "analyze") {
    try {
      return await analyzeCase(payload && payload.case ? payload.case : payload);
    } catch (err) {
      return { error: String(err && err.message ? err.message : err), status: 400, limitation: LIMITATION };
    }
  }
  return { unsupported: true };
}

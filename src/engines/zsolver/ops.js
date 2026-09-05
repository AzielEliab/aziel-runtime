/**
 * ZionPattern Solver in-process ops. Does not solve cases. 75% cap.
 * Author: Aziel Eliab.
 */
import { DISCLAIMER, patternsPayload, scoreRequest, sessionSnapshot } from "./engine.js";

export const ZSOLVER_OPS = ["health", "skill", "patterns", "score", "session"];

export function zsolverHealth() {
  return {
    ok: true,
    product: "zsolver",
    true_engine_runtime: true,
    kv_increment: false,
    disclaimer: DISCLAIMER,
    author: "Aziel Eliab",
  };
}

export function zsolverSkill() {
  return {
    markdown: `# ZionPattern Solver (in-process)

Nine ontology nodes (Zioncheck seed). Hard 75% cap / 25% floor. **Does not solve cases.**

Author: **Aziel Eliab**.
${DISCLAIMER}
`,
    kv_increment: false,
    disclaimer: DISCLAIMER,
  };
}

export async function runZsolver(op, payload) {
  if (op === "health") return zsolverHealth();
  if (op === "skill") return zsolverSkill();
  if (op === "patterns") return patternsPayload();
  const body = payload && typeof payload === "object" ? payload : {};
  if (op === "score") return scoreRequest(body);
  if (op === "session") return sessionSnapshot(body);
  return { unsupported: true };
}

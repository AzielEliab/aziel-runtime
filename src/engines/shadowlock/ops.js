/**
 * shadowlock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, observePair, evaluateEthics, recordsFromFrame } from "./engine.js";

export const SHADOWLOCK_OPS = ["health", "skill", "observe", "hook"];

export function shadowlockHealth() {
  return {
    ok: true,
    product: "shadowlock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function shadowlockSkill() {
  return {
    markdown: `# shadowlock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runShadowlock(op, payload, scratch) {
  if (op === "health") return shadowlockHealth();
  if (op === "skill") return shadowlockSkill();
  if (op === "observe") {
    const src = payload && typeof payload === "object" ? payload : {};
    const recs = recordsFromFrame(src);
    const observed = recs[0] || src.observed || src;
    const counterfactual = src.counterfactual || { outcome: "skipped" };
    return { ...(await observePair(observed, counterfactual)), true_engine_runtime: true, limitation: LIMITATION };
  }
  if (op === "hook") {
    const ethics = evaluateEthics(payload);
    if (!ethics.passed) return { ...ethics, ok: false, status: 403, limitation: LIMITATION };
    const recs = recordsFromFrame(payload || {});
    let report = null;
    if (recs.length) report = await observePair(recs[0], (payload && payload.counterfactual) || { outcome: "skipped" });
    return { ok: true, ethics, report, stored: false, true_engine_runtime: true, limitation: LIMITATION, note: "Ethics receipt. Not an OS hook." };
  }
  return { unsupported: true };
}

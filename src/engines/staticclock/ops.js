/**
 * staticclock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, advise, listAnchors, appendClick, verifyClicks, timeslateOf } from "./engine.js";

export const STATICCLOCK_OPS = ["health", "skill", "advise", "advisory", "anchors", "click", "verify", "timeslate"];

export function staticclockHealth() {
  return {
    ok: true,
    product: "staticclock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function staticclockSkill() {
  return {
    markdown: `# staticclock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runStaticclock(op, payload, scratch) {
  if (op === "health") return staticclockHealth();
  if (op === "skill") return staticclockSkill();
  if (op === "advise" || op === "advisory") return { ...(await advise((payload && payload.geo) || "Indiana", payload && payload.language, payload && payload.dialect)), true_engine_runtime: true, limitation: LIMITATION };
  if (op === "anchors") return { ...listAnchors(), true_engine_runtime: true };
  if (op === "click") return { ...(await appendClick((payload && payload.clicks) || [], (payload && payload.action) || "tick", (payload && payload.source) || "in-process", payload && payload.second)), true_engine_runtime: true };
  if (op === "verify") return { ...(await verifyClicks((payload && payload.clicks) || [])), true_engine_runtime: true };
  if (op === "timeslate") return { ...(await timeslateOf(payload || {})), true_engine_runtime: true };
  return { unsupported: true };
}

/**
 * shadowlock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { LIMITATION, MOTTO, VERSION, observePair, evaluateEthics, recordsFromFrame } from "./engine.js";

const LIVE = ["health", "skill", "observe", "hook", "doctor"];
const STUB = ["os_hook", "process_intercept"];
export const SHADOWLOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: "shadowlock",
    name: "ShadowLock",
    version: VERSION,
    role: "zero-retention observation envelope",
    motto: MOTTO,
    axes: ["observe", "hook", "ethics"],
    neighbors: ["azos", "peacelock"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { stored: false, os_hook: false },
  };
}

export function shadowlockHealth() {
  return capabilityHealth(envelope());
}

export function shadowlockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Zero-retention observation of a job list you already have. hook is an ethics receipt, not an OS hook.",
  });
}

export function shadowlockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "ShadowLock doctor: observe + hook. Not an OS hook. Zero-retention.",
  });
}

export async function runShadowlock(op, payload, scratch) {
  if (op === "health") return shadowlockHealth();
  if (op === "skill") return shadowlockSkill();
  if (op === "doctor") return shadowlockDoctor();
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

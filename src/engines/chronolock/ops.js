/**
 * chronolock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  AUTHOR,
  AXES,
  LIMITATION,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  ROLE,
  SPEC,
  STUB_REFUSE,
  VERSION,
  advise,
  advisoryWindow,
  listAnchors,
} from "./engine.js";

const LIVE = ["health", "skill", "advisory", "advise", "anchors", "window", "doctor"];

export const CHRONOLOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    role: ROLE,
    motto: MOTTO,
    axes: AXES,
    neighbors: NEIGHBORS,
    live_ops: LIVE,
    stub_ops: STUB_REFUSE,
    limitation: LIMITATION,
    extra: { scheduler: false, targeting: false, virality: false },
  };
}

export function chronolockHealth() {
  return capabilityHealth(envelope());
}

export function chronolockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Timezone-aware linguistic alignment. Temporal Neutral Window 08:30–10:30 local (some anchors differ). Advisory only — not a scheduler, not targeting, not virality. Distinct from TemporalLock (receipts) and StaticClock (gear clicks). 4DMap T may cite a window; ChronoLock does not write cards.",
  });
}

export function chronolockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "ChronoLock doctor: advisory window only. No cron. Distinct from TemporalLock.",
  });
}

export async function runChronolock(op, payload, scratch) {
  if (op === "health") return chronolockHealth();
  if (op === "skill") return chronolockSkill();
  if (op === "doctor") return chronolockDoctor();
  if (op === "advisory" || op === "advise") {
    return { ...(await advise((payload && payload.geo) || "Indiana", payload && payload.language, payload && payload.dialect)), true_engine_runtime: true, limitation: LIMITATION };
  }
  if (op === "anchors") return { ...listAnchors(), true_engine_runtime: true };
  if (op === "window") return { ...advisoryWindow(payload && payload.geo), true_engine_runtime: true };
  return { unsupported: true };
}

export { LIMITATION, VERSION, AUTHOR };

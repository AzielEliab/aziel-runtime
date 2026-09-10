/**
 * staticclock in-process ops. Author: Aziel Eliab.
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
  appendClick,
  importExport,
  listAnchors,
  timeslateOf,
  verifyClicks,
} from "./engine.js";

const LIVE = ["health", "skill", "advise", "advisory", "anchors", "click", "verify", "timeslate", "import_export", "doctor"];

export const STATICCLOCK_OPS = LIVE.slice();

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
    extra: { rollbacks: false, stored: false },
  };
}

export function staticclockHealth() {
  return capabilityHealth(envelope());
}

export function staticclockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Forward-only gear-click timeline plus companion advisory. advise/advisory, anchors, click, verify, timeslate. Clock ≠ Lock (Softwares-tab Plain). ChronoLock is the related window product. TemporalLock hash-chains a timeslate; StaticClock does not store that lattice. Time only locks forward.",
  });
}

export function staticclockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "StaticClock doctor: forward-only clicks. No rollback. No remote shell.",
  });
}

export async function runStaticclock(op, payload, scratch) {
  if (op === "health") return staticclockHealth();
  if (op === "skill") return staticclockSkill();
  if (op === "doctor") return staticclockDoctor();
  if (op === "advise" || op === "advisory") {
    return { ...(await advise((payload && payload.geo) || "Indiana", payload && payload.language, payload && payload.dialect)), true_engine_runtime: true, limitation: LIMITATION };
  }
  if (op === "anchors") return { ...listAnchors(), true_engine_runtime: true };
  if (op === "click") {
    return { ...(await appendClick((payload && payload.clicks) || [], (payload && payload.action) || "tick", (payload && payload.source) || "in-process", payload && payload.second)), true_engine_runtime: true };
  }
  if (op === "verify") return { ...(await verifyClicks((payload && payload.clicks) || [])), true_engine_runtime: true };
  if (op === "timeslate") return { ...(await timeslateOf(payload || {})), true_engine_runtime: true };
  if (op === "import_export") return { ...(await importExport(payload || {})), true_engine_runtime: true };
  return { unsupported: true };
}

export { LIMITATION, VERSION, AUTHOR };

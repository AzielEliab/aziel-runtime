/**
 * trajectorylock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { hashGet, hashPut, hashStat, hashStoreEnvelope } from "../hash-store.js";
import {
  AUTHOR,
  AXES,
  EXAMPLE_CASE,
  LIMITATION,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  ROLE,
  SPEC,
  STUB_REFUSE,
  VERSION,
  analyzeCase,
  caseSchema,
  importExport,
  verifyResult,
} from "./engine.js";

const LIVE = ["health", "skill", "example", "analyze", "verify", "schema", "import_export", "hash_put", "hash_get", "hash_stat", "doctor"];

export const TRAJECTORYLOCK_OPS = LIVE.slice();

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
    extra: { certified_instrument: false, media_stored: false, media_cdn: false, ...hashStoreEnvelope() },
  };
}

export function trajectorylockHealth() {
  return capabilityHealth(envelope());
}

export function trajectorylockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Research prototype / auditable geometric test. Compatibility vs a declared official line. Match probability is P(match | declared model), not P(the official account is true). Hosted never stores media. Not a certified forensic instrument. 4DMap Π/Δ may cite a walk; TrajectoryLock does not write 4DMap cards.",
  });
}

export function trajectorylockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "TrajectoryLock doctor: small JSON geometry only. No media store. Not a certified instrument.",
  });
}

export async function runTrajectorylock(op, payload, scratch) {
  if (op === "health") return trajectorylockHealth();
  if (op === "skill") return trajectorylockSkill();
  if (op === "doctor") return trajectorylockDoctor();
  if (op === "schema") return { ...caseSchema(), true_engine_runtime: true };
  if (op === "example") {
    return { product: PRODUCT, version: VERSION, example: EXAMPLE_CASE, limitation: LIMITATION, true_engine_runtime: true, synthetic: true };
  }
  if (op === "verify") {
    try {
      return await verifyResult(payload);
    } catch (err) {
      return { error: String(err && err.message ? err.message : err), status: 400, limitation: LIMITATION };
    }
  }
  if (op === "import_export") {
    try {
      return await importExport(payload);
    } catch (err) {
      return { error: String(err && err.message ? err.message : err), status: 400, limitation: LIMITATION };
    }
  }
  if (op === "analyze") {
    try {
      return await analyzeCase(payload && payload.case ? payload.case : payload);
    } catch (err) {
      return { error: String(err && err.message ? err.message : err), status: 400, limitation: LIMITATION };
    }
  }
  if (op === "hash_put") return { ...hashStoreEnvelope(), ...(await hashPut("trajectorylock", payload)), limitation: LIMITATION };
  if (op === "hash_get") return { ...hashStoreEnvelope(), ...hashGet("trajectorylock", payload), limitation: LIMITATION };
  if (op === "hash_stat") return { ...hashStoreEnvelope(), ...hashStat("trajectorylock", payload), limitation: LIMITATION };
  return { unsupported: true };
}

export { LIMITATION, VERSION, AUTHOR };

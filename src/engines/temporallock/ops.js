/**
 * temporallock in-process ops. Author: Aziel Eliab.
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
  append,
  gate,
  genesis,
  importExport,
  parseChain,
  timeslate,
  verify,
  verifyLattice,
} from "./engine.js";

const LIVE = ["health", "skill", "genesis", "append", "verify", "timeslate", "gate", "import_export", "doctor"];

export const TEMPORALLOCK_OPS = LIVE.slice();

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
    extra: { stored: false, sequential_gate: false },
  };
}

export function temporallockHealth() {
  return capabilityHealth(envelope());
}

export function temporallockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Hash-chained receipts anyone can verify. Explicit genesis, append, verify, timeslate lattice, and gate accept. Client sends the chain. Not a truth claim and not a scheduler. StaticClock binds click_index forward-only. 4DMap T may cite a timeslate; TemporalLock does not write 4DMap cards.",
  });
}

export function temporallockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "TemporalLock doctor: stateless chain + timeslate lattice. No hosted store. No rollback.",
  });
}

export async function runTemporallock(op, payload, scratch) {
  if (op === "health") return temporallockHealth();
  if (op === "skill") return temporallockSkill();
  if (op === "doctor") return temporallockDoctor();
  try {
    if (op === "genesis") return { ...(await genesis(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "append") return { ...(await append(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "timeslate") return { ...(await timeslate(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "gate") return { ...(await gate(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "import_export") return { ...(await importExport(payload || {})), true_engine_runtime: true };
    if (op === "verify") {
      const chain = parseChain(payload);
      const rec = await verify(chain);
      const lat = await verifyLattice(chain, rec.errors);
      return { ...rec, lattice: lat, true_engine_runtime: true, limitation: LIMITATION };
    }
  } catch (err) {
    return { error: String(err && err.message ? err.message : err), status: 400, limitation: LIMITATION };
  }
  return { unsupported: true };
}

export { LIMITATION, VERSION, AUTHOR };

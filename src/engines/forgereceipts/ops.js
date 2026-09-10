/**
 * forgereceipts in-process ops. Author: Aziel Eliab.
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
  importExport,
  receipt,
  verifyReceipt,
} from "./engine.js";

const LIVE = ["health", "skill", "receipt", "verify", "import_export", "doctor"];

export const FORGERECEIPTS_OPS = LIVE.slice();

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
    extra: { legal_advice: false, court_filing: false, stored: false },
  };
}

export function forgereceiptsHealth() {
  return capabilityHealth(envelope());
}

export function forgereceiptsSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Local receipt mint. Recompute hashes. Client-held import/export JSON. Not legal advice. Does not contact courts. Neighbor TemporalLock shares the receipt shape; this engine does not store a chain.",
  });
}

export function forgereceiptsDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "ForgeReceipts doctor: receipt mint + verify. No court, no Odyssey, no file store.",
  });
}

export async function runForgereceipts(op, payload, scratch) {
  if (op === "health") return forgereceiptsHealth();
  if (op === "skill") return forgereceiptsSkill();
  if (op === "doctor") return forgereceiptsDoctor();
  if (op === "receipt") return receipt(payload);
  if (op === "verify") return verifyReceipt(payload);
  if (op === "import_export") return importExport(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION, AUTHOR };

/**
 * ZKAttest in-process ops. Engine artifact is ./engine.js.
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  LIMITATION,
  LIVE_OPS,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  PRODUCT_GITHUB,
  ROLE,
  SPEC,
  STUB_REFUSE,
  VERSION,
  AXES,
  attest,
  commit,
  limitationCite,
  openCommitment,
  verifyReceipt,
} from "./engine.js";

export const ZKATTEST_OPS = LIVE_OPS.slice();

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
    live_ops: LIVE_OPS,
    stub_ops: STUB_REFUSE,
    limitation: LIMITATION,
    extra: {
      github: PRODUCT_GITHUB,
      zk_system: false,
      snark: false,
      worker_home: null,
      in_runtime: true,
      domain: null,
      placement: "receipt-attest",
    },
  };
}

export function zkattestHealth() {
  return capabilityHealth(envelope());
}

export function zkattestSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: `Hash-commitment attest without returning the private witness. ${MOTTO} commit / attest / open / verify are REAL SHA-256 commitments. groth16 / snark / stark / plonk stay FG-STUB. Not a SNARK. In-runtime placement (no invented product Worker). Cite ${PRODUCT_GITHUB}.`,
  });
}

export function zkattestDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note:
      "ZKAttest doctor: hash-commitment attest. Witness never leaves commit/open. Full ZK proving is SLOT. FragGate only. Not a mesh enable.",
  });
}

export async function runZkattest(op, payload) {
  if (op === "health") return zkattestHealth();
  if (op === "skill") return zkattestSkill();
  if (op === "doctor") return zkattestDoctor();
  if (op === "limitation") return limitationCite();
  if (op === "commit") return commit(payload);
  if (op === "attest") return attest(payload);
  if (op === "open") return openCommitment(payload);
  if (op === "verify") return verifyReceipt(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION };

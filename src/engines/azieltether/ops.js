/**
 * azieltether in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { LIMITATION, MOTTO, ROLE, VERSION, ingest, verifyItems, asItems, dualChain, reconcile, pulse, tip, peerPreview } from "./engine.js";

const LIVE = ["health", "skill", "verify", "tip", "dual-chain", "reconcile", "pulse", "peer-preview", "doctor"];
const STUB = ["mesh-join", "vpn", "arm"];
export const AZIELTETHER_OPS = ["health", "skill", "ingest", "verify", "dual-chain", "reconcile", "pulse", "tip", "peer-preview", "doctor"];

function envelope() {
  return {
    product: "azieltether",
    name: "AzielTether",
    version: VERSION,
    role: ROLE,
    motto: MOTTO,
    axes: ["tip", "dual-chain", "reconcile"],
    neighbors: ["miragegrid", "aznet"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { vpn: false, mesh_join: false },
  };
}

export function azieltetherHealth() {
  return capabilityHealth(envelope());
}

export function azieltetherSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Central × decentral survival mesh for downloaded software. Prefer-central; peer sync when down. Not a VPN. mesh-join / arm stay refuse.",
  });
}

export function azieltetherDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "AzielTether doctor: verify / tip / dual-chain / reconcile / pulse. vpn/arm/mesh-join refuse.",
  });
}

export async function runAzieltether(op, payload, scratch) {
  if (op === "health") return azieltetherHealth();
  if (op === "skill") return azieltetherSkill();
  if (op === "doctor") return azieltetherDoctor();
  if (op === "ingest") return ingest(payload);
  if (op === "verify") return verifyItems(asItems(payload));
  if (op === "dual-chain") return dualChain(payload);
  if (op === "reconcile") return reconcile(payload);
  if (op === "pulse") return pulse(payload);
  if (op === "tip") return tip(payload);
  if (op === "peer-preview") return peerPreview(payload);
  return { unsupported: true };
}

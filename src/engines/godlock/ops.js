/**
 * godlock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { LIMITATION, MOTTO, VERSION, score, submit } from "./engine.js";

const LIVE = ["health", "skill", "score", "submit", "doctor"];
const STUB = ["vpn", "tor", "proxy", "anonymity"];
export const GODLOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: "godlock",
    name: "GodLock",
    version: VERSION,
    role: "offline ABAD / hardening score",
    motto: MOTTO,
    axes: ["abad", "hardening", "receipt"],
    neighbors: ["azcoherence", "decisiongate", "zsolver"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { vpn: false, tor: false, court: false },
  };
}

export function godlockHealth() {
  return capabilityHealth(envelope());
}

export function godlockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Offline ABAD / hardening score and ephemeral logical receipt. Not a VPN. Not a court.",
  });
}

export function godlockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "GodLock doctor: score + submit. No VPN, no Tor hop, no court.",
  });
}

export async function runGodlock(op, payload, scratch) {
  if (op === "health") return godlockHealth();
  if (op === "skill") return godlockSkill();
  if (op === "doctor") return godlockDoctor();
  if (op === "score") return score(payload);
  if (op === "submit") return submit(payload);
  return { unsupported: true };
}

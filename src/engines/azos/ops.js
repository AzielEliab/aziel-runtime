/**
 * azos in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { LIMITATION, MOTTO, VERSION, statusPayload, invitePayload, principlesPayload } from "./engine.js";

const LIVE = ["health", "skill", "status", "invite", "principles", "doctor"];
const STUB = ["exec", "shell", "lattice"];
export const AZOS_OPS = LIVE.slice();

function envelope() {
  return {
    product: "azos",
    name: "AZ-OS",
    version: VERSION,
    role: "read-only status / principles",
    motto: MOTTO,
    axes: ["status", "invite", "principles"],
    neighbors: ["decisiongate", "veillock"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { remote_shell: false, session_proxy: true },
  };
}

export function azosHealth() {
  return capabilityHealth(envelope());
}

export function azosSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Read-only status / principles and a five-gate ethics preview. exec / shell stay refuse. session/close stay named proxy_fallback.",
  });
}

export function azosDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "AZ-OS doctor: status / invite / principles. Public exec/shell refuse. session/exec/close/lattice stay proxy.",
  });
}

export async function runAzos(op, payload, scratch) {
  if (op === "health") return azosHealth();
  if (op === "skill") return azosSkill();
  if (op === "doctor") return azosDoctor();
  if (op === "status") return statusPayload();
  if (op === "invite") return invitePayload();
  if (op === "principles") return principlesPayload();
  return { unsupported: true };
}

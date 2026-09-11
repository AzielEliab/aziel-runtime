/**
 * azos in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { LIMITATION, MOTTO, VERSION, statusPayload, invitePayload, principlesPayload } from "./engine.js";
import { sessionClose, sessionOpen, sessionStatus } from "./session.js";

const LIVE = ["health", "skill", "status", "invite", "principles", "doctor", "session_open", "session_status", "session_close"];
const STUB = ["exec", "shell", "lattice"];
export const AZOS_OPS = LIVE.slice();

function envelope() {
  return {
    product: "azos",
    name: "AZ-OS",
    version: VERSION,
    role: "read-only status / principles + isolate ethics VFS",
    motto: MOTTO,
    axes: ["status", "invite", "principles", "session_vfs"],
    neighbors: ["decisiongate", "veillock"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { remote_shell: false, session_proxy: false, session_native: true },
  };
}

export function azosHealth() {
  return capabilityHealth(envelope());
}

export function azosSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Read-only status / principles and an isolate-native prefab ethics session VFS. exec / shell / lattice stay refuse.",
  });
}

export function azosDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "AZ-OS doctor: status / invite / principles plus isolate session_open / session_status / session_close. Public exec/shell/lattice refuse.",
  });
}

export async function runAzos(op, payload, scratch, env) {
  if (op === "health") return azosHealth();
  if (op === "skill") return azosSkill();
  if (op === "doctor") return azosDoctor();
  if (op === "status") return statusPayload();
  if (op === "invite") return invitePayload();
  if (op === "principles") return principlesPayload();
  if (op === "session_open") return sessionOpen(payload, env);
  if (op === "session_status") return sessionStatus(payload, env);
  if (op === "session_close") return sessionClose(payload, env);
  return { unsupported: true };
}

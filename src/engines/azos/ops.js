/**
 * azos in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { LIMITATION, MOTTO, VERSION, statusPayload, invitePayload, principlesPayload } from "./engine.js";
import { sessionClose, sessionOpen, sessionStatus } from "./session.js";
import { currentAltInternetFact } from "../../alt-internet-fact.js";
import { runFeature } from "../../operator-surfaces.js";

const LIVE = [
  "health",
  "skill",
  "status",
  "invite",
  "principles",
  "doctor",
  "session_open",
  "session_status",
  "session_close",
  "mode_list",
  "boot_path",
  "internet_base",
  "guardian",
  "download_list",
  "download_check",
  "phone_path",
  "sim_lockout",
  "cellular",
  "ip_mask",
  "azcall",
  "veillock",
  "malware_sweep",
  "airgap",
  "human_check",
];
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
  const feature = await runFeature("azos", op, payload, env);
  if (feature) return feature;
  if (op === "health") return azosHealth();
  if (op === "skill") return azosSkill();
  if (op === "doctor") return azosDoctor();
  if (op === "status") {
    const fact = currentAltInternetFact();
    return {
      ...statusPayload(),
      missing_line: fact.missing_line,
      not_live_sentence: fact.not_live_sentence,
      missing: fact.missing,
      machine_id: fact.machine_id,
    };
  }
  if (op === "invite") return invitePayload();
  if (op === "principles") return principlesPayload();
  if (op === "session_open") return sessionOpen(payload, env);
  if (op === "session_status") return sessionStatus(payload, env);
  if (op === "session_close") return sessionClose(payload, env);
  return { unsupported: true };
}

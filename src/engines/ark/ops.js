/**
 * The ARK in-process ops. Mode E heuristics only. Never unlocks a vault.
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { LIMITATION, levels, sweep } from "./engine.js";

const LIVE = ["health", "skill", "sweep", "levels", "doctor"];
// USER-SIGNIN-ARK-1.0: account_* run only inside the FragGate door (src/account/ops.js), after the credential firewall.
const DOOR_ONLY = ["account_open", "account_append", "account_recall"];
const STUB = ["scorch", "wipe", "unlock", "encrypt"];
export const ARK_OPS = [...LIVE, ...DOOR_ONLY];

function envelope() {
  return {
    product: "ark",
    name: "The ARK",
    version: "0.1.0",
    role: "Mode E heuristics sweep",
    motto: "Not a kernel. Hosted never unlocks.",
    axes: ["sweep", "levels", "decoy"],
    neighbors: ["embryolock", "whistlelock"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: ensureThisIs(
      LIMITATION,
      "THIS IS: Mode E heuristics sweep. THIS IS NOT: a kernel, hosted unlock, or stored vault.",
    ),
    extra: { stored: false, unlock: false },
  };
}

export function arkHealth() {
  return capabilityHealth(envelope());
}

export function arkSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Mode E heuristics only. Hosted/in-process never unlocks or stores vaults.",
  });
}

export function arkDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "ARK doctor: sweep + levels. scorch/wipe/unlock/encrypt stay refuse.",
  });
}

export async function runArk(op, payload, scratch) {
  if (op === "health") return arkHealth();
  if (op === "skill") return arkSkill();
  if (op === "doctor") return arkDoctor();
  if (op === "levels") return levels();
  if (op === "sweep") {
    const out = sweep(payload && typeof payload === "object" ? payload : {});
    return { ...out, true_engine_runtime: true, stored: false };
  }
  if (DOOR_ONLY.includes(op)) {
    return { ok: false, code: "ARK-DOOR-ONLY", message: "ARK account ops run only through FragGate (fraggate_call / POST /v1/fraggate/call).", written: false };
  }
  return { unsupported: true };
}

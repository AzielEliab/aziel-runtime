/**
 * whistlelock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { hashGet, hashPut, hashStat, hashStoreEnvelope } from "../hash-store.js";
import { LIMITATION, VERSION, hashPreview, canonPreview } from "./engine.js";

const LIVE = ["health", "skill", "hash-preview", "canon-preview", "hash_put", "hash_get", "hash_stat", "doctor"];
const STUB = ["send", "mail", "release"];
export const WHISTLELOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: "whistlelock",
    name: "WhistleLock",
    version: VERSION,
    role: "local drop ledger + isolate hash store",
    motto: "Not a mailer.",
    axes: ["hash", "canon", "isolate_store"],
    neighbors: ["trajectorylock", "forgereceipts"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: { ...hashStoreEnvelope(), send_mail_release: false, cdn: false },
  };
}

export function whistlelockHealth() {
  return capabilityHealth(envelope());
}

export function whistlelockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Local hash/canon preview plus isolate hash object store. send / mail / release stay refuse. No CDN.",
  });
}

export function whistlelockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "WhistleLock doctor: hash/canon + isolate store. send/mail/release refuse.",
  });
}

export async function runWhistlelock(op, payload, scratch) {
  if (op === "health") return whistlelockHealth();
  if (op === "skill") return whistlelockSkill();
  if (op === "doctor") return whistlelockDoctor();
  if (op === "hash-preview") return hashPreview(payload, scratch);
  if (op === "canon-preview") return canonPreview(payload);
  if (op === "hash_put") return { ...hashStoreEnvelope(), ...(await hashPut("whistlelock", payload)), limitation: LIMITATION };
  if (op === "hash_get") return { ...hashStoreEnvelope(), ...hashGet("whistlelock", payload), limitation: LIMITATION };
  if (op === "hash_stat") return { ...hashStoreEnvelope(), ...hashStat("whistlelock", payload), limitation: LIMITATION };
  return { unsupported: true };
}

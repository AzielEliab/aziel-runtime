/**
 * EmbryoLock in-process ops. Cite / health only on the public mesh.
 * Author: Aziel Eliab.
 */
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  SURFACE,
  embryolockDoctor,
  embryolockHealth,
  embryolockLimitation,
  embryolockPolicy,
  embryolockSkill,
  verifyHash,
} from "./engine.js";

export const EMBRYOLOCK_OPS = [
  "health",
  "skill",
  "doctor",
  "verify_hash",
  "policy",
  "limitation",
];

export async function runEmbryolock(op, payload) {
  if (op === "health") return embryolockHealth();
  if (op === "skill") return embryolockSkill();
  if (op === "doctor") return embryolockDoctor();
  if (op === "verify_hash") return verifyHash(payload);
  if (op === "policy" || op === "cite") return embryolockPolicy();
  if (op === "limitation") return embryolockLimitation();
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, SURFACE };

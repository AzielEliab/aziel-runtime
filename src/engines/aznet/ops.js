/**
 * aznet in-process ops. Author: Aziel Eliab.
 */
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  PAIR_PEER,
  aznetHealth,
  aznetSkill,
  pairStatus,
  gardenList,
  stamp,
  verifyHash,
  memorialList,
  memorialAppend,
  receiptVerify,
} from "./engine.js";

export const AZNET_OPS = [
  "health",
  "skill",
  "pair_status",
  "garden_list",
  "stamp",
  "verify_hash",
  "memorial_list",
  "memorial_append",
  "receipt_verify",
];

export function aznetHealthOp() {
  return aznetHealth();
}

export function aznetSkillOp() {
  return aznetSkill();
}

export async function runAznet(op, payload) {
  if (op === "health") return aznetHealth();
  if (op === "skill") return aznetSkill();
  if (op === "pair_status") return pairStatus(payload);
  if (op === "garden_list") return gardenList(payload);
  if (op === "stamp") return stamp(payload);
  if (op === "verify_hash") return verifyHash(payload);
  if (op === "memorial_list") return memorialList(payload);
  if (op === "memorial_append") return memorialAppend(payload);
  if (op === "receipt_verify") return receiptVerify(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, PAIR_PEER };

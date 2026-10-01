/**
 * aznet in-process ops. Author: Aziel Eliab.
 */
import { fedMeshNameDoor } from "../../mesh.js";
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  NAME,
  PRODUCT,
  PAIR_PEER,
  aznetHealth,
  aznetSkill,
  hostsPayloadIntent,
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
  "name_claim",
  "name_read",
  "name_resolve",
  "slot_read",
  "witness",
  "witness_read",
];

const NAME_DOOR_OPS = new Set(["name_claim", "name_read", "name_resolve", "slot_read", "witness", "witness_read"]);

async function aznetNameDoor(op, payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  if (hostsPayloadIntent(src)) {
    return {
      ok: false,
      product: PRODUCT,
      name: NAME,
      version: VERSION,
      spec: SPEC,
      author: AUTHOR,
      door: "fraggate",
      op,
      code: "AZN-NO-PAYLOAD",
      hosts_payloads: false,
      payload_host: false,
      mutated: false,
      message: "AZNet does not host payloads. The mesh name plane stores signed name records, not content bytes.",
    };
  }
  const fed = await fedMeshNameDoor(op, src, env);
  return {
    ...fed,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    author: AUTHOR,
    door: "fraggate",
    pair_required: false,
    payload_host: false,
    not_a_second_internet: true,
    aznet_replaces_internet: false,
    public_icann: false,
  };
}

export function aznetHealthOp() {
  return aznetHealth();
}

export function aznetSkillOp() {
  return aznetSkill();
}

export async function runAznet(op, payload, _scratch, env) {
  if (op === "health") return aznetHealth();
  if (op === "skill") return aznetSkill();
  if (op === "pair_status") return pairStatus(payload);
  if (op === "garden_list") return gardenList(payload);
  if (op === "stamp") return stamp(payload);
  if (op === "verify_hash") return verifyHash(payload);
  if (op === "memorial_list") return memorialList(payload);
  if (op === "memorial_append") return memorialAppend(payload);
  if (op === "receipt_verify") return receiptVerify(payload);
  if (NAME_DOOR_OPS.has(op)) return aznetNameDoor(op, payload, env);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, PAIR_PEER };

/**
 * 4dmap in-process ops. Author: Aziel Eliab.
 */
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  fourdmapHealth,
  fourdmapSkill,
  cardNew,
  cardPin,
  cardSpan,
  cardJoin,
  cardWalk,
  cardList,
  verifyHash,
} from "./engine.js";

export const FOURDMAP_OPS = [
  "health",
  "skill",
  "card_new",
  "card_pin",
  "card_span",
  "card_join",
  "card_walk",
  "card_list",
  "verify_hash",
];

export function fourdmapHealthOp() {
  return fourdmapHealth();
}

export function fourdmapSkillOp() {
  return fourdmapSkill();
}

export async function runFourdmap(op, payload) {
  if (op === "health") return fourdmapHealth();
  if (op === "skill") return fourdmapSkill();
  if (op === "card_new") return cardNew(payload);
  if (op === "card_pin") return cardPin(payload);
  if (op === "card_span") return cardSpan(payload);
  if (op === "card_join") return cardJoin(payload);
  if (op === "card_walk") return cardWalk(payload);
  if (op === "card_list") return cardList(payload);
  if (op === "verify_hash") return verifyHash(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR };

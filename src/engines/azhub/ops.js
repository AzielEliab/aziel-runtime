/**
 * azhub in-process ops. Author: Aziel Eliab.
 */
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  azhubHealth,
  azhubSkill,
  regionList,
  placeModule,
  removeModule,
  tetherDeclare,
  tetherCut,
  tetherList,
  blankKeyStatus,
} from "./engine.js";

export const AZHUB_OPS = [
  "health",
  "skill",
  "region_list",
  "place_module",
  "remove_module",
  "tether_declare",
  "tether_cut",
  "tether_list",
  "blank_key_status",
];

export function azhubHealthOp() {
  return azhubHealth();
}

export function azhubSkillOp() {
  return azhubSkill();
}

export async function runAzhub(op, payload) {
  if (op === "health") return azhubHealth();
  if (op === "skill") return azhubSkill();
  if (op === "region_list") return regionList(payload);
  if (op === "place_module") return placeModule(payload);
  if (op === "remove_module") return removeModule(payload);
  if (op === "tether_declare") return tetherDeclare(payload);
  if (op === "tether_cut") return tetherCut(payload);
  if (op === "tether_list") return tetherList(payload);
  if (op === "blank_key_status") return blankKeyStatus(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR };

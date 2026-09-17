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

export function azhubHealthOp(env) {
  return azhubHealth(env);
}

export function azhubSkillOp(env) {
  return azhubSkill(env);
}

export async function runAzhub(op, payload, _scratch, env) {
  if (op === "health") return azhubHealth(env);
  if (op === "skill") return azhubSkill(env);
  if (op === "region_list") return regionList(payload, env);
  if (op === "place_module") return placeModule(payload, env);
  if (op === "remove_module") return removeModule(payload, env);
  if (op === "tether_declare") return tetherDeclare(payload, env);
  if (op === "tether_cut") return tetherCut(payload, env);
  if (op === "tether_list") return tetherList(payload, env);
  if (op === "blank_key_status") return blankKeyStatus(payload, env);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR };

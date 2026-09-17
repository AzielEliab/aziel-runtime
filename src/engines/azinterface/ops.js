/**
 * azinterface in-process ops. Author: Aziel Eliab.
 */
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  PAGE_CYCLES,
  azinterfaceHealth,
  azinterfaceSkill,
  genesisStatus,
  siteStateGet,
  siteStateSet,
  integrityCheck,
  witnessList,
  pageCycleStatus,
} from "./engine.js";

export const AZINTERFACE_OPS = [
  "health",
  "skill",
  "genesis_status",
  "site_state_get",
  "site_state_set",
  "integrity_check",
  "witness_list",
  "page_cycle_status",
];

export function azinterfaceHealthOp(env) {
  return azinterfaceHealth(env);
}

export function azinterfaceSkillOp(env) {
  return azinterfaceSkill(env);
}

export async function runAzinterface(op, payload, _scratch, env) {
  if (op === "health") return azinterfaceHealth(env);
  if (op === "skill") return azinterfaceSkill(env);
  if (op === "genesis_status") return genesisStatus(payload, env);
  if (op === "site_state_get") return siteStateGet(payload, env);
  if (op === "site_state_set") return siteStateSet(payload, env);
  if (op === "integrity_check") return integrityCheck(payload, env);
  if (op === "witness_list") return witnessList(payload, env);
  if (op === "page_cycle_status") return pageCycleStatus(payload, env);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, PAGE_CYCLES };

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

export function azinterfaceHealthOp() {
  return azinterfaceHealth();
}

export function azinterfaceSkillOp() {
  return azinterfaceSkill();
}

export async function runAzinterface(op, payload) {
  if (op === "health") return azinterfaceHealth();
  if (op === "skill") return azinterfaceSkill();
  if (op === "genesis_status") return genesisStatus(payload);
  if (op === "site_state_get") return siteStateGet(payload);
  if (op === "site_state_set") return siteStateSet(payload);
  if (op === "integrity_check") return integrityCheck(payload);
  if (op === "witness_list") return witnessList(payload);
  if (op === "page_cycle_status") return pageCycleStatus(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, PAGE_CYCLES };

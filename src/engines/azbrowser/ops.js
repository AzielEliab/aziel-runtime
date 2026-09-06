/**
 * azbrowser in-process ops. Author: Aziel Eliab.
 */
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  LENS,
  airlockIngest,
  azbrowserHealth,
  azbrowserSkill,
  ethicalSearch,
  navigate,
  receiptList,
  receiptVerify,
  tabList,
  tabOpen,
} from "./engine.js";

export const AZBROWSER_OPS = [
  "health",
  "skill",
  "navigate",
  "airlock_ingest",
  "receipt_list",
  "verify",
  "receipt_verify",
  "ethical_search",
  "lamb_lens_search",
  "tab_open",
  "tab_list",
];

export function azbrowserHealthOp() {
  return azbrowserHealth();
}

export function azbrowserSkillOp() {
  return azbrowserSkill();
}

export async function runAzbrowser(op, payload, scratch, env) {
  if (op === "health") return azbrowserHealth();
  if (op === "skill") return azbrowserSkill();
  if (op === "navigate") return navigate(payload, env);
  if (op === "airlock_ingest") return airlockIngest(payload, env);
  if (op === "receipt_list") return receiptList(payload, env);
  if (op === "verify" || op === "receipt_verify") return receiptVerify(payload, env, op);
  if (op === "ethical_search") return ethicalSearch(payload, env, "ethical_search");
  if (op === "lamb_lens_search") return ethicalSearch(payload, env, "lamb_lens_search");
  if (op === "tab_open") return tabOpen(payload, env);
  if (op === "tab_list") return tabList(payload, env);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, LENS };

/**
 * azmail in-process ops. Author: Aziel Eliab.
 */
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  MESH_DEFAULT,
  airlockClassify,
  airlockScrub,
  airlockTrustScore,
  meshPost,
  meshPoll,
  meshEnable,
  meshDisable,
  keywordAlertSet,
  keywordAlertList,
  keywordAlertCheck,
  azmailHealth,
  azmailSkill,
} from "./engine.js";

export const AZMAIL_OPS = [
  "health",
  "skill",
  "airlock_classify",
  "scrub",
  "trust_score",
  "mesh_post",
  "mesh_poll",
  "mesh_listen",
  "mesh_enable",
  "mesh_disable",
  "keyword_alert_set",
  "keyword_alert_list",
  "keyword_alert_check",
];

export function azmailHealthOp() {
  return azmailHealth();
}

export function azmailSkillOp() {
  return azmailSkill();
}

export async function runAzmail(op, payload, scratch, env) {
  if (op === "health") return azmailHealth();
  if (op === "skill") return azmailSkill();
  if (op === "airlock_classify") return airlockClassify(payload);
  if (op === "scrub") return airlockScrub(payload);
  if (op === "trust_score") return airlockTrustScore(payload);
  if (op === "mesh_post") return meshPost(payload, env);
  if (op === "mesh_poll") return meshPoll(payload, env, "mesh_poll");
  if (op === "mesh_listen") return meshPoll(payload, env, "mesh_listen");
  if (op === "mesh_enable") return meshEnable(payload, env);
  if (op === "mesh_disable") return meshDisable(payload, env);
  if (op === "keyword_alert_set") return keywordAlertSet(payload, env);
  if (op === "keyword_alert_list") return keywordAlertList(payload, env);
  if (op === "keyword_alert_check") return keywordAlertCheck(payload, env);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, MESH_DEFAULT };

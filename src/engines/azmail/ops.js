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
  mailboxOpen,
  noticePost,
  mailPost,
  inboxPull,
  mailboxAck,
  mailboxVerifyReceipt,
  mailboxImportExport,
  transportStatus,
} from "./engine.js";
import { runFeature } from "../../operator-surfaces.js";

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
  "mailbox_open",
  "notice_post",
  "mail_post",
  "mail_send_base",
  "inbox_pull",
  "ack",
  "verify_receipt",
  "import_export",
  "transport_status",
  "doctor",
  "malware_sweep",
  "airgap",
];

export function azmailHealthOp() {
  return azmailHealth();
}

export function azmailSkillOp() {
  return azmailSkill();
}

export async function runAzmail(op, payload, scratch, env) {
  const feature = await runFeature("azmail", op, payload, env);
  if (feature) return feature;
  if (op === "health") return azmailHealth();
  if (op === "skill") return azmailSkill();
  if (op === "doctor") return { ...azmailHealth(), op: "doctor", doctor: true };
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
  if (op === "mailbox_open") return mailboxOpen(payload);
  if (op === "notice_post") return noticePost(payload, env);
  if (op === "mail_post") return mailPost(payload, env);
  if (op === "smtp_send") {
    return {
      ok: false,
      op: "smtp_send",
      code: "FG-STUB",
      sent: false,
      live: false,
      public_live: false,
      public_smtp_send: false,
      public_mta: false,
      installed: false,
      booted: false,
      line: "Public smtp_send stays refused.",
    };
  }
  if (op === "inbox_pull") return inboxPull(payload);
  if (op === "ack") return mailboxAck(payload);
  if (op === "verify_receipt") return mailboxVerifyReceipt(payload);
  if (op === "import_export") return mailboxImportExport(payload);
  if (op === "transport_status") {
    return {
      ok: true,
      product: "azmail",
      op: "transport_status",
      true_engine_runtime: true,
      limitation: LIMITATION,
      author: AUTHOR,
      ...transportStatus(env),
    };
  }
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, MESH_DEFAULT };

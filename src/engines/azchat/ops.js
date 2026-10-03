/**
 * AZChat in-process ops. Author: Aziel Eliab.
 */
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  LIVE_CANON,
  STUB_REFUSE,
  azchatDoctor,
  azchatHealth,
  azchatSkill,
  handleNew,
  handleRotate,
  roomOpen,
  roomPost,
  roomPull,
  busSend,
  busPoll,
  verifyReceipt,
  importExport,
} from "./engine.js";
import { runFeature } from "../../operator-surfaces.js";

export const AZCHAT_OPS = [...LIVE_CANON, "channel_seal", "bridge_status", "malware_sweep", "airgap"];

export async function runAzchat(op, payload, _scratch, env) {
  const feature = await runFeature("azchat", op, payload, env);
  if (feature) return feature;
  if (op === "health") return azchatHealth();
  if (op === "skill") return azchatSkill();
  if (op === "doctor") return azchatDoctor();
  if (op === "handle_new") return handleNew(payload);
  if (op === "handle_rotate") return handleRotate(payload);
  if (op === "room_open") return roomOpen(payload);
  if (op === "room_post") return roomPost(payload);
  if (op === "room_pull") return roomPull(payload);
  if (op === "bus_send") return busSend(payload);
  if (op === "bus_poll") return busPoll(payload);
  if (op === "verify_receipt") return verifyReceipt(payload);
  if (op === "import_export") return importExport(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR, STUB_REFUSE };

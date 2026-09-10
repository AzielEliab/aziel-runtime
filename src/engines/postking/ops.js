/**
 * postking in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { MOTTO, newGame, playMove, statusOf } from "./engine.js";

const LIMITATION = ensureThisIs(MOTTO, "THIS IS: continuity chess. THIS IS NOT: a win-maximizer or a remote engine farm.");
const VERSION = "0.1.0";
const LIVE = ["health", "skill", "new", "move", "status", "doctor"];
const STUB = ["win_engine", "rating"];
export const POSTKING_OPS = LIVE.slice();

function envelope() {
  return {
    product: "postking",
    name: "Post-King Chess",
    version: VERSION,
    role: "continuity chess",
    motto: MOTTO,
    axes: ["remain", "steward", "fen"],
    neighbors: ["zsolver", "decisiongate"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
  };
}

export function postkingHealth() {
  return capabilityHealth(envelope());
}

export function postkingSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "The goal is not to win. The goal is to remain. Human is king-bound; AI has a Node, not a king.",
  });
}

export function postkingDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "Post-King doctor: new / move / status. Not a rating engine.",
  });
}

export async function runPostking(op, payload, scratch) {
  if (op === "health") return postkingHealth();
  if (op === "skill") return postkingSkill();
  if (op === "doctor") return postkingDoctor();
  try {
    if (op === "new") return { ...newGame(payload || {}), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "move") return { ...(await playMove(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "status") return { ...statusOf(payload || {}), true_engine_runtime: true, limitation: LIMITATION };
  } catch (err) {
    return { error: String(err && err.message ? err.message : err), status: 400, limitation: LIMITATION };
  }
  return { unsupported: true };
}

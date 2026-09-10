/**
 * azbot in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { LIMITATION, VERSION, route, examplePayload } from "./engine.js";

const LIVE = ["health", "skill", "route", "example", "doctor"];
const STUB = ["foundation_model", "blend"];
export const AZBOT_OPS = LIVE.slice();

function envelope() {
  return {
    product: "azbot",
    name: "AZBot",
    version: VERSION,
    role: "skill router",
    motto: "Skill, not a foundation model.",
    axes: ["route", "toolkit"],
    neighbors: ["azclce", "azcoherence", "azinterface"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: ensureThisIs(LIMITATION, "THIS IS: a skill router onto catalog slugs. THIS IS NOT: a foundation model."),
  };
}

export function azbotHealth() {
  return capabilityHealth(envelope());
}

export function azbotSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Skill router — not a foundation model. Maps a request onto catalog slugs/ops. Peer AZCoherence is a separate product.",
  });
}

export function azbotDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "AZBot doctor: route + example. Not a model. Jeeves is not sovereign.",
  });
}

export async function runAzbot(op, payload, scratch, env) {
  if (op === "health") return azbotHealth();
  if (op === "skill") return azbotSkill();
  if (op === "doctor") return azbotDoctor();
  if (op === "route") {
    const routed = route(payload);
    if (payload && (payload.memory || payload.adaptive_recall || payload.feed_memory)) {
      const { feedCalibratedCards } = await import("../../memory.js");
      routed.memory = await feedCalibratedCards(env, payload.q || payload.text, payload.use_case);
    }
    return routed;
  }
  if (op === "example") return { product: "azbot", example: examplePayload(), true_engine_runtime: true, limitation: LIMITATION };
  return { unsupported: true };
}

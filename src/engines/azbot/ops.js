/**
 * azbot in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, route, examplePayload } from "./engine.js";

export const AZBOT_OPS = ["health", "skill", "route", "example"];

export function azbotHealth() {
  return {
    ok: true,
    product: "azbot",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function azbotSkill() {
  return {
    markdown: `# azbot (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runAzbot(op, payload, scratch, env) {
  if (op === "health") return azbotHealth();
  if (op === "skill") return azbotSkill();
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

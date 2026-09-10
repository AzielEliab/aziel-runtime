/**
 * AZAI in-process ops. Hosted blend is NOT claimed. Lamb check only.
 * Author: Aziel Eliab.
 */
import { LIMITATION, lambCheck, models } from "./engine.js";

export const AZAI_OPS = ["health", "skill", "lamb-check", "lamb_check", "models"];

export function azaiHealth() {
  return {
    ok: true,
    product: "azai",
    true_engine_runtime: true,
    kv_increment: false,
    provider_proxy: false,
    hosted_azai_is_not_the_blend: true,
    limitation: LIMITATION,
    author: "Aziel Eliab",
    note: "Protocol mirror + Lamb check. Live blend is local azai serve.",
  };
}

export function azaiSkill() {
  return {
    markdown: `# AZAI (in-process Lamb check)

AZAI hosted / in-process here is a **protocol mirror + Lamb Lens**, not the local blend.
Jeeves is not sovereign. Live blend is \`azai serve\`.

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    hosted_azai_is_not_the_blend: true,
    limitation: LIMITATION,
  };
}

export async function runAzai(op, payload, _scratch, env) {
  if (op === "health") return azaiHealth();
  if (op === "skill") return azaiSkill();
  if (op === "models") return models();
  if (op === "lamb-check" || op === "lamb_check") {
    const text = payload && payload.text != null ? String(payload.text) : "";
    const out = {
      product: "azai",
      true_engine_runtime: true,
      provider_proxy: false,
      hosted_azai_is_not_the_blend: true,
      limitation: LIMITATION,
      ...lambCheck(text),
    };
    if (payload && (payload.memory || payload.adaptive_recall || payload.feed_memory)) {
      const { feedCalibratedCards } = await import("../../memory.js");
      out.memory = await feedCalibratedCards(env, payload.q || text, payload.use_case);
    }
    return out;
  }
  return { unsupported: true };
}

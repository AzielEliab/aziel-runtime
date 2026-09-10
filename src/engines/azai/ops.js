/**
 * AZAI in-process ops. Hosted blend is NOT claimed. Lamb check only.
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { LIMITATION, lambCheck, models } from "./engine.js";

const LIVE = ["health", "skill", "lamb-check", "lamb_check", "models", "doctor"];
const STUB = ["blend", "complete", "chat"];
export const AZAI_OPS = LIVE.slice();

function envelope() {
  return {
    product: "azai",
    name: "AZAI",
    version: "0.1.0",
    role: "protocol mirror + Lamb Lens",
    motto: "Jeeves is not sovereign.",
    axes: ["lamb", "models", "mirror"],
    neighbors: ["aziel-corpus", "azbot"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: ensureThisIs(
      LIMITATION,
      "THIS IS: a protocol mirror + Lamb Lens check. THIS IS NOT: a hosted blend or paid-key proxy.",
    ),
    extra: { provider_proxy: false, hosted_azai_is_not_the_blend: true },
  };
}

export function azaiHealth() {
  return capabilityHealth(envelope());
}

export function azaiSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Protocol mirror + Lamb Lens. Live blend is local `azai serve`. blend/chat stay refuse.",
  });
}

export function azaiDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "AZAI doctor: lamb-check + models metadata. blend/complete/chat stay refuse.",
  });
}

export async function runAzai(op, payload, _scratch, env) {
  if (op === "health") return azaiHealth();
  if (op === "skill") return azaiSkill();
  if (op === "doctor") return azaiDoctor();
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

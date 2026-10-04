/**
 * AZAI in-process ops. Hosted blend is NOT claimed. Lamb check + Guide.
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { LIMITATION, lambCheck, models } from "./engine.js";
import { runFeature } from "../../operator-surfaces.js";

const LIVE = [
  "guide",
  "learner_guide",
  "ask",
  "lamb-check",
  "lamb_check",
  "models",
  "health",
  "skill",
  "doctor",
  "engine_status",
  "conversation",
  "agent",
  "azclicker",
  "attach",
  "crawl",
  "human_check",
  "cap7_lookup",
  "score_gate",
  "corpus_note",
  "receipt_learn",
  "receipt_status",
];
const STUB = ["blend", "complete", "chat"];
export const AZAI_OPS = LIVE.slice();

/** Question-shaped payload keys used by Guide / Lamb check. */
const QUESTION_KEYS = ["q", "question", "query", "task", "text", "prompt", "message"];

/**
 * Resolve AZAI op for MCP/LLM callers.
 * Empty op + question → guide (Lamb Lens first + adaptive).
 * Empty op + no question → lamb-check (not skill/doctor info dump).
 * Explicit skill/doctor/health/models/guide stay as asked.
 * chat/blend/complete stay stubs elsewhere.
 */
export function resolveAzaiOp(op, args) {
  const action = String(op || "").trim();
  if (action) return action;
  const question = azaiQuestionText(args);
  return question ? "guide" : "lamb-check";
}

export function azaiQuestionText(args) {
  const src = args && typeof args === "object" ? args : {};
  const payload = src.payload && typeof src.payload === "object" && !Array.isArray(src.payload) ? src.payload : src;
  for (const key of QUESTION_KEYS) {
    if (payload[key] == null) continue;
    const text = String(payload[key]).trim();
    if (text) return text;
  }
  return "";
}

function envelope() {
  return {
    product: "azai",
    name: "AZAI",
    version: "0.1.0",
    role: "protocol mirror + Lamb Lens + Guide",
    motto: "Jeeves is not sovereign.",
    axes: ["lamb", "models", "mirror"],
    neighbors: ["aziel-corpus", "azbot"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: ensureThisIs(
      LIMITATION,
      "THIS IS: a protocol mirror + Lamb Lens check + adaptive Guide. THIS IS NOT: a hosted blend or paid-key proxy.",
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
    lead:
      "Protocol mirror + Lamb Lens (Service → Clarity → Peace) + adaptive Guide. Prefer op=guide (or lamb-check) for questions. skill/doctor are diagnostics. Standalone local core. Ollama is optional SLOT, not the identity. blend/chat stay refuse.",
  });
}

export function azaiDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note:
      "AZAI doctor: lamb-check + models metadata. Prefer guide for questions. Standalone local core. Ollama is optional SLOT. blend/complete/chat stay refuse.",
  });
}

async function azaiGuide(payload, env) {
  const { guideAzai } = await import("../../ai-desks.js");
  const src = payload && typeof payload === "object" ? { ...payload } : {};
  if (!azaiQuestionText(src)) {
    return {
      error: "question required (q / query / question / text)",
      status: 400,
      code: "IF-BAD-INPUT",
      product: "azai",
      op: "guide",
      hint: "Pass q (or text) with fraggate_call slug=azai op=guide. skill is how-to only.",
    };
  }
  if (src.q == null && src.question == null && src.query == null && src.task == null) {
    const text = azaiQuestionText(src);
    if (text) src.q = text;
  }
  const guided = await guideAzai(src, env);
  if (!guided.ok) {
    return {
      error: guided.error || "guide refused",
      status: guided.status || 400,
      code: guided.code || "IF-BAD-INPUT",
      product: "azai",
      op: "guide",
    };
  }
  return {
    ...guided.body,
    product: "azai",
    true_engine_runtime: true,
    provider_proxy: false,
    hosted_azai_is_not_the_blend: true,
    blend: false,
    chat: false,
    output: guided.output,
  };
}

export async function runAzai(op, payload, _scratch, env) {
  const feature = await runFeature("azai", op, payload, env);
  if (feature) return feature;
  if (op === "health") return azaiHealth();
  if (op === "skill") return azaiSkill();
  if (op === "doctor") return azaiDoctor();
  if (op === "models") return models();
  if (op === "guide" || op === "learner_guide") return azaiGuide(payload, env);
  if (op === "lamb-check" || op === "lamb_check") {
    const text = payload && payload.text != null ? String(payload.text) : azaiQuestionText(payload || {});
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

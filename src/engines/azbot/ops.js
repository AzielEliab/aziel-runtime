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
  const base = capabilitySkill({
    ...envelope(),
    lead: "Skill router — not a foundation model. Maps a request onto catalog slugs/ops. Peer AZCoherence is a separate product.",
  });
  const toolkit = `
## Toolkit (live Softwares)

Route via \`fraggate_call\` / session exec. Do not invent scores.

- **azclce** — Jaccard triple / pairwise / CLCE+. Detects inconsistency, not intent. LIVE_OPS: score, classify, gate, health, skill.
- **azcoherence** — Second-pass triad coherence (AZC-0.1). Peer AZ-CLCE; reviews primary vs alternate → PASS / FLAG / NEUTRALIZE / REFUSE. LIVE_OPS: health, skill, doctor, verify, review_triad, alternate_score, coherence_check, neutralize_hallucination. Not AKM-TRIAD. Never invents evidence. Confidence ≠ truth.
- **azinterface** — Custodial page cycles. Sibling of AZHub under the same FragGate door.
- Other live Softwares route by keyword (vibelock, decisiongate, forgereceipts, 4dmap, embryolock, …).
`;
  const markdown = String(base.markdown).replace("Author: Aziel Eliab only.", `${toolkit}\nAuthor: Aziel Eliab only.`);
  return { ...base, markdown, skill: markdown };
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

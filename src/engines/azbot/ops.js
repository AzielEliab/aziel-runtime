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

Skill router — not a foundation model. Maps a request onto catalog slugs/ops.

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

## Toolkit (live Softwares)

Route via \`fraggate_call\` / session exec. Do not invent scores.

- **azclce** — Jaccard triple / pairwise / CLCE+. Detects inconsistency, not intent. LIVE_OPS: score, classify, gate, health, skill.
- **azcoherence** — Second-pass triad coherence (AZC-0.1). Peer AZ-CLCE; reviews primary vs alternate → PASS / FLAG / NEUTRALIZE / REFUSE. LIVE_OPS: health, skill, doctor, verify, review_triad, alternate_score, coherence_check, neutralize_hallucination. Not AKM-TRIAD. Never invents evidence. Confidence ≠ truth.
- **azinterface** — Custodial page cycles. Sibling of AZHub under the same FragGate door.
- Other live Softwares route by keyword (vibelock, decisiongate, forgereceipts, 4dmap, embryolock, …).

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

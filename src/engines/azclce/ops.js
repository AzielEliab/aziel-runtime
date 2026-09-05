/**
 * AZ-CLCE in-process ops. Engine artifact is ./engine.js + ./triad.js.
 * Author: Aziel Eliab.
 */
import { ENGINE_VERSION, LIMITATION, classify, gate, parseLayers, score } from "./engine.js";

export const AZCLCE_OPS = ["health", "skill", "score", "classify", "gate"];

function layersOf(payload) {
  return parseLayers(payload && typeof payload === "object" ? payload : {});
}

export function azclceHealth() {
  return {
    ok: true,
    product: "azclce",
    version: ENGINE_VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
    advisory: true,
  };
}

export function azclceSkill() {
  return {
    markdown: `# AZ-CLCE (in-process)

Jaccard triple / pairwise / CLCE+. Detects inconsistency, not intent. Type D is a label only.
This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**. Version: ${ENGINE_VERSION}.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runAzclce(op, payload) {
  if (op === "health") return azclceHealth();
  if (op === "skill") return azclceSkill();
  const layers = layersOf(payload);
  if (op === "score") return score(layers.r, layers.d, layers.p, layers.n);
  if (op === "classify") return classify(layers.r, layers.d, layers.p, layers.n);
  if (op === "gate") {
    const min = payload && payload.min != null ? payload.min : payload && payload.min_score;
    return gate(layers.r, layers.d, layers.p, layers.n, min);
  }
  return { unsupported: true };
}

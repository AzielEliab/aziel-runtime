/**
 * mialock in-process ops. Author: Aziel Eliab.
 */
import { hostedDoeMatch } from "./doe-match.js";
import { LIMITATION, VERSION, listModes, renderQueries } from "./queries.js";
import SAMPLE_INDEX from "./sample-index.js";
import SAMPLE_COVERAGE from "./sample-coverage.js";

export const MIALOCK_OPS = ["health", "skill", "doe-match", "queries", "search-options", "example", "map", "coverage"];

export function mialockHealth() {
  return {
    ok: true,
    product: "mialock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function mialockSkill() {
  return {
    markdown: `# mialock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runMialock(op, payload, scratch) {
  if (op === "health") return mialockHealth();
  if (op === "skill") return mialockSkill();
  if (op === "doe-match") return { ...hostedDoeMatch(payload || {}), true_engine_runtime: true };
  if (op === "search-options") return { product: "mialock", version: VERSION, modes: listModes(), limitation: LIMITATION, true_engine_runtime: true };
  if (op === "queries") {
    const mode = (payload && (payload.mode || payload.mode_id)) || "doe_cold";
    return renderQueries(mode, payload || {});
  }
  if (op === "example") return { product: "mialock", version: VERSION, example: { mode: "doe_cold", name: "Christina Green" }, limitation: LIMITATION, true_engine_runtime: true };
  if (op === "map") return { product: "mialock", version: VERSION, stub: true, index: SAMPLE_INDEX, limitation: LIMITATION, true_engine_runtime: true, note: "Sample index stub. Live Leaflet map is local CLI." };
  if (op === "coverage") return { product: "mialock", version: VERSION, stub: true, coverage: SAMPLE_COVERAGE, limitation: LIMITATION, true_engine_runtime: true, note: "Sample coverage stub. Heat ≠ presence." };
  return { unsupported: true };
}

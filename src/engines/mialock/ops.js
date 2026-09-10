/**
 * mialock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { hostedDoeMatch } from "./doe-match.js";
import { LIMITATION, VERSION, listModes, renderQueries } from "./queries.js";
import SAMPLE_INDEX from "./sample-index.js";
import SAMPLE_COVERAGE from "./sample-coverage.js";

const LIVE = ["health", "skill", "doe-match", "queries", "search-options", "example", "map", "coverage", "doctor"];
const STUB = ["live_track", "auto_id"];
export const MIALOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: "mialock",
    name: "M.I.A.Lock",
    version: VERSION,
    role: "Doe matching + coverage heat",
    motto: "Doe leads ≠ ID. Heat ≠ presence.",
    axes: ["doe", "coverage", "queries"],
    neighbors: ["aziel-corpus", "4dmap"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: ensureThisIs(LIMITATION, "THIS IS: search plans and Doe compatibility leads. THIS IS NOT: live tracking or auto-ID."),
  };
}

export function mialockHealth() {
  return capabilityHealth(envelope());
}

export function mialockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Event map + Doe matching + uncertainty ellipses + coverage heat. Doe leads ≠ ID. Heat ≠ presence. No live tracking.",
  });
}

export function mialockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "M.I.A.Lock doctor: doe-match / queries / coverage. Never an ID. No live tracking.",
  });
}

export async function runMialock(op, payload, scratch) {
  if (op === "health") return mialockHealth();
  if (op === "skill") return mialockSkill();
  if (op === "doctor") return mialockDoctor();
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

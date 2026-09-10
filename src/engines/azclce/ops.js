/**
 * AZ-CLCE in-process ops. Engine artifact is ./engine.js + ./triad.js.
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { AZCLCE_CROSS_MAP } from "../../cross-map.js";
import { ENGINE_VERSION, LIMITATION, NEIGHBORS, classify, gate, parseLayers, score } from "./engine.js";

const LIVE = ["health", "skill", "score", "classify", "gate", "doctor"];
const STUB = ["intent", "malice"];
export const AZCLCE_OPS = LIVE.slice();

function layersOf(payload) {
  return parseLayers(payload && typeof payload === "object" ? payload : {});
}

function envelope() {
  return {
    product: "azclce",
    name: "AZ-CLCE",
    version: ENGINE_VERSION,
    role: "Jaccard triple / pairwise / CLCE+",
    motto: "Detects inconsistency, not intent.",
    axes: ["r", "d", "p", "triple"],
    neighbors: NEIGHBORS,
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: ensureThisIs(
      LIMITATION,
      "THIS IS: Jaccard triple / pairwise / CLCE+ inconsistency labels. THIS IS NOT: intent, malice, or a lie detector.",
    ),
    extra: {
      advisory: true,
      peers: AZCLCE_CROSS_MAP.peers,
      hubs: AZCLCE_CROSS_MAP.hubs,
      worker_url: AZCLCE_CROSS_MAP.worker_url,
      cross_map: AZCLCE_CROSS_MAP,
      domain: "Language",
      domain_id: "04",
      placement: "domain-software",
    },
  };
}

export function azclceHealth() {
  return capabilityHealth(envelope());
}

export function azclceSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Jaccard triple / pairwise / CLCE+. Detects inconsistency, not intent. Type D is a label only. Peer AZCoherence is a separate product.",
  });
}

export function azclceDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "AZ-CLCE doctor: score / classify / gate. Not intent. Peer azcoherence.",
  });
}

export async function runAzclce(op, payload) {
  if (op === "health") return azclceHealth();
  if (op === "skill") return azclceSkill();
  if (op === "doctor") return azclceDoctor();
  const layers = layersOf(payload);
  if (op === "score") return score(layers.r, layers.d, layers.p, layers.n);
  if (op === "classify") return classify(layers.r, layers.d, layers.p, layers.n);
  if (op === "gate") {
    const min = payload && payload.min != null ? payload.min : payload && payload.min_score;
    return gate(layers.r, layers.d, layers.p, layers.n, min);
  }
  return { unsupported: true };
}

/**
 * MMConsensus in-process ops. Engine artifact is ./engine.js.
 * Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  AXES,
  LIMITATION,
  LIVE_OPS,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  PRODUCT_GITHUB,
  ROLE,
  SPEC,
  STUB_REFUSE,
  VERSION,
  agree,
  limitationCite,
  tally,
} from "./engine.js";

export const MMCONSENSUS_OPS = LIVE_OPS.slice();

function envelope() {
  return {
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    role: ROLE,
    motto: MOTTO,
    axes: AXES,
    neighbors: NEIGHBORS,
    live_ops: LIVE_OPS,
    stub_ops: STUB_REFUSE,
    limitation: LIMITATION,
    extra: {
      github: PRODUCT_GITHUB,
      live_model_call: false,
      adjacent_to: "decisiongate",
      replaces_decisiongate: false,
      worker_home: null,
      in_runtime: true,
      domain: null,
      placement: "consensus-review",
    },
  };
}

export function mmconsensusHealth() {
  return capabilityHealth(envelope());
}

export function mmconsensusSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: `Structured consensus over caller-supplied opinions. ${MOTTO} Adjacent to DecisionGATE (not a replacement hop). tally / agree are HEURISTIC. live_model_call / openai / anthropic stay FG-STUB. In-runtime placement. Cite ${PRODUCT_GITHUB}.`,
  });
}

export function mmconsensusDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note:
      "MMConsensus doctor: posted-opinion tally. Never calls models. Never invents a truth score. FragGate only. Not a mesh enable.",
  });
}

export async function runMmconsensus(op, payload) {
  if (op === "health") return mmconsensusHealth();
  if (op === "skill") return mmconsensusSkill();
  if (op === "doctor") return mmconsensusDoctor();
  if (op === "limitation") return limitationCite();
  if (op === "tally") return tally(payload);
  if (op === "agree") return agree(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION };

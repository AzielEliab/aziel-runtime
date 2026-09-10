/**
 * glossafilter in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { LIMITATION, MOTTO, VERSION, parseIntent, render, listPeers } from "./engine.js";

const LIVE = ["health", "skill", "render", "peers", "doctor"];
const STUB = ["conceal", "live_translator"];
export const GLOSSAFILTER_OPS = LIVE.slice();

function envelope() {
  return {
    product: "glossafilter",
    name: "Glossa Filter",
    version: VERSION,
    role: "deterministic linguistic mediation",
    motto: MOTTO,
    axes: ["intent", "peer", "channel"],
    neighbors: ["codelock", "chronolock"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
  };
}

export function glossafilterHealth() {
  return capabilityHealth(envelope());
}

export function glossafilterSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Render an intent across bundled peer ids. Human opinion remains human.",
  });
}

export function glossafilterDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "Glossa Filter doctor: render + peers. Not a live translator API.",
  });
}

export async function runGlossafilter(op, payload, scratch) {
  if (op === "health") return glossafilterHealth();
  if (op === "skill") return glossafilterSkill();
  if (op === "doctor") return glossafilterDoctor();
  if (op === "peers") return { ...listPeers(), true_engine_runtime: true, limitation: LIMITATION };
  if (op === "render") {
    try {
      const src = payload && typeof payload === "object" ? payload : {};
      const intent = src.intent && typeof src.intent === "object" && !src.channel ? { channel: "tooling", ...src.intent } : src;
      return { ...(await render(parseIntent(intent), src.peers)), true_engine_runtime: true };
    } catch (err) {
      return { error: String(err && err.message ? err.message : err), status: err && err.code ? err.code : 400, limitation: LIMITATION };
    }
  }
  return { unsupported: true };
}

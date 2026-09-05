/**
 * glossafilter in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, parseIntent, render, listPeers } from "./engine.js";

export const GLOSSAFILTER_OPS = ["health", "skill", "render", "peers"];

export function glossafilterHealth() {
  return {
    ok: true,
    product: "glossafilter",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function glossafilterSkill() {
  return {
    markdown: `# glossafilter (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runGlossafilter(op, payload, scratch) {
  if (op === "health") return glossafilterHealth();
  if (op === "skill") return glossafilterSkill();
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

/**
 * miragegrid in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, assign, listNodes, meshView, routeView, buildCircuit, verifyReceipt, makePool } from "./engine.js";

export const MIRAGEGRID_OPS = ["health", "skill", "assign", "route", "circuit", "verify-receipt", "nodes", "mesh"];

export function miragegridHealth() {
  return {
    ok: true,
    product: "miragegrid",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function miragegridSkill() {
  return {
    markdown: `# miragegrid (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runMiragegrid(op, payload, scratch) {
  if (op === "health") return miragegridHealth();
  if (op === "skill") return miragegridSkill();
  if (op === "assign") return { ...(await assign(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
  if (op === "nodes") return { ...listNodes(), true_engine_runtime: true };
  if (op === "mesh") return { ...meshView(), true_engine_runtime: true };
  if (op === "route") return { ...routeView((payload && payload.src) || (payload && payload.src_id), (payload && payload.dst) || (payload && payload.dst_id)), true_engine_runtime: true };
  if (op === "circuit") {
    const entropy = crypto.getRandomValues(new Uint8Array(32));
    const ts = (payload && payload.timestamp) || new Date().toISOString();
    return { ...(await buildCircuit(entropy, ts, (payload && payload.hops) || 3)), true_engine_runtime: true, limitation: LIMITATION };
  }
  if (op === "verify-receipt") {
    return { ok: true, result: await verifyReceipt(payload || {}, makePool()), true_engine_runtime: true };
  }
  return { unsupported: true };
}

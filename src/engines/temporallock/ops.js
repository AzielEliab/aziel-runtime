/**
 * temporallock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, genesis, append, verify, parseChain, timeslate, gate, verifyLattice } from "./engine.js";

export const TEMPORALLOCK_OPS = ["health", "skill", "genesis", "append", "verify", "timeslate", "gate"];

export function temporallockHealth() {
  return {
    ok: true,
    product: "temporallock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function temporallockSkill() {
  return {
    markdown: `# temporallock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runTemporallock(op, payload, scratch) {
  if (op === "health") return temporallockHealth();
  if (op === "skill") return temporallockSkill();
  try {
    if (op === "genesis") return { ...(await genesis(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "append") return { ...(await append(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "timeslate") return { ...(await timeslate(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "gate") return { ...(await gate(payload || {})), true_engine_runtime: true, limitation: LIMITATION };
    if (op === "verify") {
      const chain = parseChain(payload);
      const rec = await verify(chain);
      const lat = await verifyLattice(chain, rec.errors);
      return { ...rec, lattice: lat, true_engine_runtime: true, limitation: LIMITATION };
    }
  } catch (err) {
    return { error: String(err && err.message ? err.message : err), status: 400, limitation: LIMITATION };
  }
  return { unsupported: true };
}

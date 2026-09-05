/**
 * azieltether in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, ingest, verifyItems, asItems, dualChain, reconcile, pulse, tip, peerPreview } from "./engine.js";

export const AZIELTETHER_OPS = ["health", "skill", "ingest", "verify", "dual-chain", "reconcile", "pulse", "tip", "peer-preview"];

export function azieltetherHealth() {
  return {
    ok: true,
    product: "azieltether",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function azieltetherSkill() {
  return {
    markdown: `# azieltether (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runAzieltether(op, payload, scratch) {
  if (op === "health") return azieltetherHealth();
  if (op === "skill") return azieltetherSkill();
  if (op === "ingest") return ingest(payload);
  if (op === "verify") return verifyItems(asItems(payload));
  if (op === "dual-chain") return dualChain(payload);
  if (op === "reconcile") return reconcile(payload);
  if (op === "pulse") return pulse(payload);
  if (op === "tip") return tip(payload);
  if (op === "peer-preview") return peerPreview(payload);
  return { unsupported: true };
}

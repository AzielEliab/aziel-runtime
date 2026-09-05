/**
 * spectrallock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, MODES, TARGETS, LIVE, overlayFromB64 } from "./overlay.js";

export const SPECTRALLOCK_OPS = ["health", "skill", "modes", "overlay"];

export function spectrallockHealth() {
  return {
    ok: true,
    product: "spectrallock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function spectrallockSkill() {
  return {
    markdown: `# spectrallock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runSpectrallock(op, payload, scratch) {
  if (op === "health") return spectrallockHealth();
  if (op === "skill") return spectrallockSkill();
  if (op === "modes") return { product: "spectrallock", version: VERSION, modes: MODES, targets: TARGETS, live: LIVE, limitation: LIMITATION, true_engine_runtime: true };
  if (op === "overlay") {
    const src = payload && typeof payload === "object" ? payload : {};
    if (!src.b64 && !src.png_b64) return { error: "b64 required", status: 400, limitation: LIMITATION };
    return overlayFromB64(src.b64 || src.png_b64, src.mode || "rosetta", src);
  }
  return { unsupported: true };
}

/**
 * veillock in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, apps, pulse, consentDecision, obfuscateRecipe } from "./engine.js";

export const VEILLOCK_OPS = ["health", "skill", "apps", "pulse", "consent", "obfuscate-preview", "azos-hook", "call-accept"];

export function veillockHealth() {
  return {
    ok: true,
    product: "veillock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
  };
}

export function veillockSkill() {
  return {
    markdown: `# veillock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runVeillock(op, payload, scratch) {
  if (op === "health") return veillockHealth();
  if (op === "skill") return veillockSkill();
  if (op === "apps") return apps(payload);
  if (op === "pulse") return pulse(payload);
  if (op === "consent" || op === "azos-hook") return consentDecision(payload);
  if (op === "call-accept") return consentDecision({ ...(payload || {}), call_accepted: true });
  if (op === "obfuscate-preview") return obfuscateRecipe(payload);
  return { unsupported: true };
}

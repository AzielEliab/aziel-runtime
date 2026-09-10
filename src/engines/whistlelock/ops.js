/**
 * whistlelock in-process ops. Author: Aziel Eliab.
 */
import { hashGet, hashPut, hashStat, hashStoreEnvelope } from "../hash-store.js";
import { LIMITATION, VERSION, hashPreview, canonPreview } from "./engine.js";

export const WHISTLELOCK_OPS = ["health", "skill", "hash-preview", "canon-preview", "hash_put", "hash_get", "hash_stat"];

export function whistlelockHealth() {
  return {
    ok: true,
    product: "whistlelock",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
    ...hashStoreEnvelope(),
    send_mail_release: false,
  };
}

export function whistlelockSkill() {
  return {
    markdown: `# whistlelock (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runWhistlelock(op, payload, scratch) {
  if (op === "health") return whistlelockHealth();
  if (op === "skill") return whistlelockSkill();
  if (op === "hash-preview") return hashPreview(payload, scratch);
  if (op === "canon-preview") return canonPreview(payload);
  if (op === "hash_put") return { ...hashStoreEnvelope(), ...(await hashPut("whistlelock", payload)), limitation: LIMITATION };
  if (op === "hash_get") return { ...hashStoreEnvelope(), ...hashGet("whistlelock", payload), limitation: LIMITATION };
  if (op === "hash_stat") return { ...hashStoreEnvelope(), ...hashStat("whistlelock", payload), limitation: LIMITATION };
  return { unsupported: true };
}

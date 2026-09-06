/**
 * peacelock in-process ops. Author: Aziel Eliab.
 */
import {
  LIMITATION,
  VERSION,
  SPEC,
  AUTHOR,
  openLattice,
  sealLattice,
  breakLattice,
  showLattice,
  verifyLattice,
  stampEnvelope,
  uploadEnvelope,
} from "./engine.js";

export const PEACELOCK_OPS = [
  "health",
  "skill",
  "open",
  "seal",
  "break",
  "show",
  "verify",
  "stamp",
  "upload_envelope",
];

export function peacelockHealth() {
  return {
    ok: true,
    product: "peacelock",
    version: VERSION,
    spec: SPEC,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: AUTHOR,
  };
}

export function peacelockSkill() {
  return {
    markdown: `# peacelock (in-process)

PeaceLock (PL-WP-0.1) records **chosen silence** or **chosen inaction** as a hash-chained receipt.

- \`open\` — start a lattice.
- \`seal\` — append chosen_silence or chosen_inaction.
- \`break\` — end the sealed period. Still no transcript.
- \`show\` / \`verify\` — read the lattice. Missing fields stay ABSENT.
- \`stamp\` / \`upload_envelope\` — timestamped file-hash only.

HARD_DUTY refuses a silence/inaction receipt. Transcript, counterfactual, and motive are ABSENT — this isolate will not invent them.

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runPeacelock(op, payload, scratch) {
  if (op === "health") return peacelockHealth();
  if (op === "skill") return peacelockSkill();
  if (op === "open") return openLattice(payload);
  if (op === "seal") return sealLattice(payload);
  if (op === "break") return breakLattice(payload);
  if (op === "show") return showLattice(payload);
  if (op === "verify") return verifyLattice(payload);
  if (op === "stamp") return stampEnvelope(payload, scratch);
  if (op === "upload_envelope") return uploadEnvelope(payload, scratch);
  return { unsupported: true };
}

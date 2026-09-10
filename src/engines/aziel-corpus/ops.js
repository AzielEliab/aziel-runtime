/**
 * aziel-corpus in-process ops. Author: Aziel Eliab.
 */
import { LIMITATION, VERSION, search, examplePayload } from "./engine.js";

export const AZIEL_CORPUS_OPS = ["health", "skill", "search", "example"];

const NATIVE_OPS = ["health", "skill", "search", "example", "doctor"];
const PROXY_OPS = ["review", "score", "jeeves", "transcribe", "ocr", "verify-backfill", "verify-geo", "document-chain", "media-run"];

export function aziel_corpusHealth() {
  return {
    ok: true,
    product: "aziel-corpus",
    version: VERSION,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    author: "Aziel Eliab",
    native_ops: NATIVE_OPS.slice(),
    proxy_ops: PROXY_OPS.slice(),
    native_vs_proxy: {
      native: NATIVE_OPS.slice(),
      proxy: PROXY_OPS.slice(),
      note: "In-process search uses bundled sample MASTER. Live D1 / Whisper / OCR stay per-op proxy. Not a fake native OCR.",
    },
    r2: { bound: false, bucket: null, cdn: false },
    door: "fraggate",
    mesh_enabled_default: false,
  };
}

export function aziel_corpusSkill() {
  return {
    markdown: `# aziel-corpus (in-process)

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
  };
}

export async function runAzielCorpus(op, payload, scratch) {
  if (op === "health") return aziel_corpusHealth();
  if (op === "skill") return aziel_corpusSkill();
  if (op === "search") return search(payload);
  if (op === "example") return { product: "aziel-corpus", example: examplePayload(), true_engine_runtime: true, limitation: LIMITATION };
  return { unsupported: true };
}

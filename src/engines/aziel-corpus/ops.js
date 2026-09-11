/**
 * aziel-corpus in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  BINDING_GATED_OPS,
  LIMITATION,
  NATIVE_OPS,
  PROXY_OPS,
  VERSION,
  SPEC,
  documentChain,
  examplePayload,
  importExport,
  mediaRun,
  mediaStatus,
  ocr,
  review,
  score,
  search,
  transcribe,
  verifyBackfill,
  verifyGeo,
} from "./engine.js";
import { jeevesAsk } from "./jeeves.js";

export const AZIEL_CORPUS_OPS = [
  "health",
  "skill",
  "search",
  "example",
  "doctor",
  "review",
  "score",
  "verify-backfill",
  "verify-geo",
  "document-chain",
  "import_export",
  "jeeves",
  "media-run",
];

const LIVE = AZIEL_CORPUS_OPS.slice();
const STUB = ["blend", "chat", "smtp_send"];
const AXES = ["sample_master", "posted_json", "hash_chain", "gazetteer"];
const NEIGHBORS = ["spectrallock", "azai", "4dmap"];

function envelope(env) {
  return {
    product: "aziel-corpus",
    name: "Aziel Digital Library",
    version: VERSION,
    spec: SPEC,
    role: "portable sample-MASTER library + isolate-safe verify",
    motto: "Sample MASTER is not live D1. Labels stay honest.",
    axes: AXES,
    neighbors: NEIGHBORS,
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: LIMITATION,
    extra: {
      native_ops: NATIVE_OPS.slice(),
      proxy_ops: PROXY_OPS.slice(),
      binding_gated: { ...BINDING_GATED_OPS },
      native_vs_proxy: {
        native: NATIVE_OPS.slice(),
        proxy: PROXY_OPS.slice(),
        binding_gated: { ...BINDING_GATED_OPS },
        note: "In-process search uses bundled sample MASTER unless CORPUS_D1 is bound (then production `records`). jeeves is isolate-native. Whisper / OCR / media-run are native only when Workers AI is bound. Not a fake native OCR.",
      },
      media: mediaStatus(env),
    },
  };
}

export function aziel_corpusHealth(env) {
  return capabilityHealth(envelope(env));
}

export function aziel_corpusSkill(env) {
  return capabilitySkill({
    ...envelope(env),
    lead: "In-process search over a bundled public sample MASTER. review / score / verify-backfill / verify-geo / document-chain / jeeves run on posted or sample JSON. Live D1 queries production `records` when CORPUS_D1 is bound. Whisper / OCR / media-run stay binding-gated.",
  });
}

export function aziel_corpusDoctor(env) {
  return capabilityDoctor({
    ...envelope(env),
    doctor_note: "Corpus doctor: native-vs-proxy labels, isolate-safe jeeves, binding-gated Whisper/OCR/media-run, sample gazetteer. Not a fake OCR.",
  });
}

export async function runAzielCorpus(op, payload, scratch, env) {
  if (op === "health") return aziel_corpusHealth(env);
  if (op === "skill") return aziel_corpusSkill(env);
  if (op === "doctor") return aziel_corpusDoctor(env);
  if (op === "search") return search(payload, env);
  if (op === "example") return { product: "aziel-corpus", example: examplePayload(), true_engine_runtime: true, limitation: LIMITATION };
  if (op === "review") return review(payload);
  if (op === "score") return score(payload);
  if (op === "verify-backfill") return verifyBackfill(payload);
  if (op === "verify-geo") return verifyGeo(payload);
  if (op === "document-chain") return documentChain(payload);
  if (op === "import_export") return importExport(payload);
  if (op === "jeeves") return jeevesAsk(payload, env);
  if (op === "media-run") return mediaRun(payload, env);
  if (op === "transcribe") return transcribe(payload, env);
  if (op === "ocr") return ocr(payload, env);
  return { unsupported: true };
}

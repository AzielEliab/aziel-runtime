/**
 * spectrallock in-process ops. Author: Aziel Eliab.
 * Overlay bytes are vendored from spectrallock workers/download-tracker/src/overlay.js.
 * Runtime envelope (health/skill/targets/verify) stays here so overlay.js stays byte-for-byte.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  ALIASES,
  HANDWRITING_FAMILY,
  HANDWRITING_NOTE,
  HANDWRITING_OPS,
  INJECT_NOTE,
  LIMITATION,
  LIVE,
  MAX_SIDE,
  MODES,
  RECOVER_NOTE,
  RECOVER_OPS,
  REFUSE_NO_INK,
  REFUSE_OPAQUE,
  REFUSE_UNSUPPORTED,
  REFUSE_LIMIT,
  STUB_MODES,
  TARGET_IDS,
  TARGETS,
  UNREDACT_FAMILY,
  UNREDACT_NOTE,
  UNREDACT_OPS,
  VERSION,
  listHandwriting,
  listRecover,
  listUnredact,
  overlayFromB64,
  resolveMode,
} from "./overlay.js";

const LIVE_OPS_LIST = ["health", "skill", "modes", "targets", "overlay", "verify", "doctor"];

export const SPECTRALLOCK_OPS = LIVE_OPS_LIST.slice();

export const PRODUCT = "spectrallock";
export const NAME = "SpectralLock";
export const SPEC = "RSA-2.0";
export const AUTHOR = "Aziel Eliab";
export const ROLE = "256px overlay preview";
export const MOTTO = "The human still reads the page. Balance never invents marks.";
export const AXES = Object.freeze(["lens", "target", "geometry"]);
export const NEIGHBORS = Object.freeze(["4dmap", "trajectorylock", "aziel-corpus"]);
export const STUB_REFUSE = Object.freeze(["spectrometer", "forensic", "invent_mark"]);

/** Runtime honesty wrapper. Overlay LIMITATION is product copy; health still needs THIS IS. */
export const RUNTIME_LIMITATION =
  "THIS IS: hosted 256px overlay preview. Synthetic looks only. " +
  LIMITATION +
  " Overlay payload accepts inject true|false. ON is false-color membership paint, not recovered pigment. " +
  "OFF is gray of the same gate. Zero ignores the switch. Reports tazel_inband_pct and vyrn_inband_pct. " +
  "Vendored overlay also carries honest unredact / leftover-bytes (locate, lift, recover, refuse), " +
  "deep PDF revision graph + per-revision copies, universal recover (locate/deep-recover/revision-graph/" +
  "cross-compare/extract-embedded/scan-orphans/scan-metadata/scan-sidecars/scan-history/refuse), " +
  "and handwriting ink-scan heuristics (analyze/compare/side-by-side/graph/forgery-indicators/refuse). " +
  "Leftover-bytes recover reads present container bytes only (object id / offset / stream). " +
  "Incremental PDF revisions return revision_graph (startxref/Prev edges) plus per-revision tip-cut copies. " +
  "Opaque clipped black / flattened screenshot with no leftover bytes refuses " +
  REFUSE_OPAQUE +
  ". Universal recover cites present bytes only; 7z / HEIC / HEIF stay SLOT (SL-RECOVER-UNSUPPORTED). " +
  "Handwriting is a 256px PNG preview heuristic — not ESDA, not chemical dating, not writer identity, not a court finding. " +
  "Hosted JPEG handwriting is SLOT. Recover refuse codes are SL-RECOVER-*. Handwriting refuse codes are SL-HANDWRITING-*. " +
  "Heatmaps are not transcripts. Never OCR-from-black-box. " +
  "Catalog LIVE_OPS stay health, modes, targets, overlay, verify, doctor, skill — unredact / recover / handwriting " +
  "are product Worker doors (/v1/unredact, /v1/recover, /v1/handwriting), not a FragGate door op. " +
  "THIS IS NOT: a spectrometer, forensic lab, ESDA, chemical test, UV lamp, pigment recovery, or letter invention. " +
  "Balance/lemon/indent never invent marks. Identity Aziel Eliab only.";

const INJECT_FLAG = Object.freeze({
  accepted: true,
  values: [true, false],
  default: true,
  on: "false-color membership paint (not recovered pigment)",
  off: "gray of the same gate",
  zero_ignores: true,
  pigment_recovery: false,
  reports: ["tazel_inband_pct", "vyrn_inband_pct"],
  note: INJECT_NOTE,
});

/** Product-side unredact family. Not a FragGate LIVE_OP until GitBaby adds a door. */
const UNREDACT_FLAG = Object.freeze({
  ...listUnredact(),
  family: UNREDACT_FAMILY.slice(),
  ops: UNREDACT_OPS.slice(),
  refuse_code: REFUSE_OPAQUE,
  leftover_bytes_recovery: true,
  revision_graph: true,
  revision_copies: true,
  pigment_recovery: false,
  guessed_letters: false,
  heatmap_is_transcript: false,
  ocr_from_black_box: false,
  catalog_door_op: false,
  worker_path: "/v1/unredact",
  note: UNREDACT_NOTE,
});

/** Product-side universal recover family. Worker /v1/recover — not a FragGate LIVE_OP. */
const RECOVER_FLAG = Object.freeze({
  ...listRecover(),
  family: "recover",
  ops: RECOVER_OPS.slice(),
  leftover_bytes_recovery: true,
  revision_graph: true,
  guessed_letters: false,
  context_reconstruction: false,
  catalog_door_op: false,
  catalog_door: false,
  worker_path: "/v1/recover",
  note: RECOVER_NOTE,
});

/** Product-side handwriting family. Worker /v1/handwriting — not a FragGate LIVE_OP. */
const HANDWRITING_FLAG = Object.freeze({
  ...listHandwriting(),
  family: HANDWRITING_FAMILY.slice(),
  ops: HANDWRITING_OPS.slice(),
  refuse_codes: [REFUSE_NO_INK, REFUSE_UNSUPPORTED, REFUSE_LIMIT],
  esda: false,
  chemical_ink_dating: false,
  writer_identification_as_fact: false,
  forensic_certification: false,
  heatmap_is_transcript: false,
  heatmap_is_court_finding: false,
  jpeg: false,
  catalog_door_op: false,
  catalog_door: false,
  worker_path: "/v1/handwriting",
  note: HANDWRITING_NOTE,
});

const CANONICAL_MODE_IDS = Object.freeze([
  "zero",
  "tazel",
  "vyrn",
  "uv",
  "rosetta",
  "zen",
  "chaos",
  "balance",
  "candle",
  "indent",
  "lemon",
]);

function envelope() {
  return {
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    role: ROLE,
    motto: MOTTO,
    axes: AXES,
    neighbors: NEIGHBORS,
    live_ops: LIVE_OPS_LIST,
    stub_ops: STUB_REFUSE,
    limitation: RUNTIME_LIMITATION,
    extra: {
      spectrometer: false,
      forensic: false,
      esda: false,
      chemical_test: false,
      pigment_recovery: false,
      uv_lamp: false,
      leftover_bytes_recovery: true,
      revision_graph: true,
      ocr_from_black_box: false,
      max_side: MAX_SIDE,
      inject: INJECT_FLAG,
      unredact: UNREDACT_FLAG,
      recover: RECOVER_FLAG,
      handwriting: HANDWRITING_FLAG,
    },
  };
}

export function spectrallockHealth() {
  return capabilityHealth(envelope());
}

export function spectrallockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead:
      "256px hosted overlay preview. Lenses: zero, tazel, vyrn, uv, rosetta, zen, chaos, balance, candle, indent, lemon. " +
      "UV aliases: ultraviolet, uv-light, uvsa. Targets: ink, page. Overlay payload accepts inject true|false. " +
      "ON is false-color membership paint, not recovered pigment. OFF is gray of the same gate. Zero ignores the switch. " +
      "Reports tazel_inband_pct and vyrn_inband_pct. " +
      "Honest unredact family (locate, lift, recover, refuse) lives in vendored overlay.js and the product Worker /v1/unredact — not a catalog FragGate door op. " +
      "Leftover-bytes recover is honest (object id / offset / stream). Incremental PDF revisions return revision_graph + per-revision copies. " +
      "Universal recover (locate/deep-recover/revision-graph/cross-compare/extract-embedded/scan-orphans/scan-metadata/scan-sidecars/scan-history/refuse) is product Worker /v1/recover — 7z / HEIC / HEIF stay SLOT. " +
      "Handwriting (analyze/compare/side-by-side/graph/forgery-indicators/refuse) is product Worker /v1/handwriting — 256px PNG ink-scan heuristic, not ESDA / chemical dating / writer identity / court finding. Hosted JPEG is SLOT. " +
      "Opaque replace with no leftover bytes refuses SL-UNREDACT-OPAQUE. Recover refuse codes are SL-RECOVER-*. Handwriting refuse codes are SL-HANDWRITING-*. " +
      "Heatmaps are not transcripts. Never invent letters. Never OCR-from-black-box. " +
      "Synthetic looks. UV is not a lamp. Not a spectrometer. Not forensic. Not ESDA. Not a chemical test. " +
      "Candle/indent/lemon never invent marks. Balance never invents marks. Full histogram / band-pass lives in the Python package. " +
      "4DMap Γ may cite a class; SpectralLock does not write 4DMap cards.",
  });
}

export function spectrallockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note:
      "SpectralLock doctor: 256px preview only. Inject ON is paint, not pigment recovery. Leftover-bytes recover is honest; revision graph is honest; opaque refuse is honest; never OCR-from-black-box. Universal recover marks 7z/HEIC/HEIF SLOT. Handwriting is ink-scan heuristic, not ESDA or court cert. UV is not a lamp. Not a spectrometer. Not forensic. Not ESDA. Not a chemical test. Balance/lemon/indent never invent marks. Unredact / recover / handwriting are not FragGate door ops.",
  });
}

export function listTargets() {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    targets: TARGETS,
    target_ids: TARGET_IDS.slice(),
    modes: MODES,
    live: LIVE.slice(),
    aliases: { ...ALIASES },
    max_side: MAX_SIDE,
    spectrometer: false,
    forensic: false,
    invent_mark: false,
    esda: false,
    chemical_test: false,
    pigment_recovery: false,
    uv_lamp: false,
    leftover_bytes_recovery: true,
    revision_graph: true,
    ocr_from_black_box: false,
    inject: INJECT_FLAG,
    unredact: UNREDACT_FLAG,
    recover: RECOVER_FLAG,
    handwriting: HANDWRITING_FLAG,
    neighbors: NEIGHBORS.slice(),
    limitation: RUNTIME_LIMITATION,
    author: AUTHOR,
  };
}

async function overlayMetaHash(meta) {
  const payload = {
    height: meta.height,
    lenses: meta.lenses,
    mode: meta.mode,
    target: meta.target,
    width: meta.width,
  };
  const keys = Object.keys(payload).sort();
  const raw = "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(payload[k])).join(",") + "}";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function resolveLensId(name) {
  const resolved = resolveMode(name);
  if (resolved && resolved.error === "stub") return resolved;
  if (typeof resolved === "string" && LIVE.includes(resolved)) return resolved;
  return null;
}

export async function verifyOverlay(body) {
  const src = body && typeof body === "object" ? body : {};
  const rawMode = String(src.mode || src.lens || "");
  const target = String(src.target || src.polarity || "ink");
  const width = Number(src.width);
  const height = Number(src.height);
  const stored = String(src.hash || src.overlay_hash || "");
  const rawLenses = Array.isArray(src.lenses) ? src.lenses : rawMode ? rawMode.split("+") : [];
  const lenses = [];
  for (const item of rawLenses) {
    const key = String(item || "").trim().toLowerCase();
    if (!key) continue;
    const resolved = resolveLensId(key);
    if (resolved && resolved.error === "stub") {
      return { ok: false, match: false, error: `${resolved.unknown} is a stub`, unknown: resolved.unknown, known: LIVE, limitation: RUNTIME_LIMITATION };
    }
    if (!resolved) {
      return { ok: false, match: false, error: "unknown lens", unknown: key, known: LIVE, limitation: RUNTIME_LIMITATION };
    }
    if (!lenses.includes(resolved)) lenses.push(resolved);
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { ok: false, match: false, error: "verify needs width and height from an overlay result", status: 400, limitation: RUNTIME_LIMITATION };
  }
  const mode = lenses.length === 1 ? lenses[0] : lenses.join("+");
  const recomputed = await overlayMetaHash({ mode, lenses, target, width, height });
  return {
    ok: !stored || stored === recomputed,
    match: !stored || stored === recomputed,
    product: PRODUCT,
    version: VERSION,
    hash: stored || recomputed,
    recomputed,
    mode,
    target,
    width,
    height,
    spectrometer: false,
    forensic: false,
    limitation: RUNTIME_LIMITATION,
    author: AUTHOR,
    note: "Metadata hash of mode/target/geometry. Not a forensic claim.",
  };
}

export async function runSpectrallock(op, payload, scratch) {
  if (op === "health") return spectrallockHealth();
  if (op === "skill") return spectrallockSkill();
  if (op === "doctor") return spectrallockDoctor();
  if (op === "modes") {
    return {
      product: PRODUCT,
      version: VERSION,
      modes: MODES,
      mode_ids: CANONICAL_MODE_IDS.slice(),
      live: LIVE.slice(),
      aliases: { ...ALIASES },
      targets: TARGETS,
      stub_modes: STUB_MODES.slice(),
      inject: INJECT_FLAG,
      unredact: UNREDACT_FLAG,
      recover: RECOVER_FLAG,
      handwriting: HANDWRITING_FLAG,
      pigment_recovery: false,
      uv_lamp: false,
      leftover_bytes_recovery: true,
      revision_graph: true,
      ocr_from_black_box: false,
      limitation: RUNTIME_LIMITATION,
      true_engine_runtime: true,
    };
  }
  if (op === "targets") return { ...listTargets(), true_engine_runtime: true };
  if (op === "verify") return verifyOverlay(payload);
  if (op === "overlay") {
    const src = payload && typeof payload === "object" ? payload : {};
    if (!src.b64 && !src.png_b64) return { error: "b64 required", status: 400, limitation: RUNTIME_LIMITATION };
    const result = await overlayFromB64(src.b64 || src.png_b64, src.mode || "rosetta", src);
    if (result && result.error) {
      return { ...result, limitation: RUNTIME_LIMITATION };
    }
    if (result && result.width && result.height) {
      result.overlay_hash = await overlayMetaHash({
        mode: result.mode,
        lenses: result.lenses,
        target: result.target,
        width: result.width,
        height: result.height,
      });
    }
    return result;
  }
  return { unsupported: true };
}

export {
  LIMITATION,
  LIVE,
  MODES,
  CANONICAL_MODE_IDS,
  INJECT_FLAG,
  INJECT_NOTE,
  UNREDACT_FLAG,
  UNREDACT_NOTE,
  RECOVER_FLAG,
  RECOVER_NOTE,
  HANDWRITING_FLAG,
  HANDWRITING_NOTE,
  REFUSE_OPAQUE,
};

/**
 * AZ-CLCE consistency provider (channel C).
 * Invoked only when R/D/P layers are meaningful. Not an intent detector.
 * Author: Aziel Eliab only.
 */

import { clip01 } from "../../chainlock/adaptive.js";
import { parseLayers, score as clceScore } from "../../engines/azclce/engine.js";
import { canonicalize, sha256Hex } from "../../session-core.js";

export const PROVIDER_ID = "clce";
export const PROVIDER_VERSION = "C-1.0";
export const CHANNELS_SUPPORTED = Object.freeze(["C"]);

function hasLayers(packet) {
  const layers = parseLayers(packet || {});
  return Boolean(layers.r || layers.d || layers.p);
}

export function canScore(packet, useCase) {
  if (!hasLayers(packet)) return 0;
  const allowed = !useCase || (useCase.providers || []).includes(PROVIDER_ID);
  if (!allowed) return 0;
  return 0.9;
}

export async function score(packet = {}) {
  const layers = parseLayers(packet);
  const report = clceScore(layers.r, layers.d, layers.p, layers.n);
  const contradiction = 1 - Number(report.triple || 0);
  const nPen = clip01(report.n_ratio) ?? 0;
  const value = clip01(Number(report.plus != null ? report.plus : report.triple) * (1 - 0.25 * nPen) * (1 - 0.15 * contradiction));
  const receipt = await sha256Hex(
    canonicalize({
      provider: PROVIDER_ID,
      v: PROVIDER_VERSION,
      triple: report.triple,
      plus: report.plus,
    }),
  );
  return {
    channel: "C",
    score: value,
    evidence_refs: [],
    limitations: [
      "CLCE detects inconsistency, not intent.",
      "Type D is a label, not malice.",
      "Inconsistency does not establish intent.",
    ],
    uncertainty: clip01(report.n_ratio),
    provider_id: PROVIDER_ID,
    provider_receipt_hash: receipt,
    raw: {
      triple: report.triple,
      plus: report.plus,
      pairwise: report.pairwise,
      band: report.band,
      types: report.types,
    },
  };
}

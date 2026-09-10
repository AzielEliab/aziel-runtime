/**
 * SPRE structural-pattern provider (channels E and/or P).
 * Separates structural similarity from evidence completeness.
 * Negative controls required. Never asserts guilt.
 * Author: Aziel Eliab only.
 */

import { clip01 } from "../../chainlock/adaptive.js";
import { canonicalize, sha256Hex } from "../../session-core.js";

export const PROVIDER_ID = "spre";
export const PROVIDER_VERSION = "P-E-1.0";
export const CHANNELS_SUPPORTED = Object.freeze(["E", "P"]);

export function canScore(packet, useCase) {
  const src = packet && typeof packet === "object" ? packet : {};
  const has =
    src.ssi != null ||
    src.pc != null ||
    (src.spre && typeof src.spre === "object") ||
    src.pattern_score != null;
  if (!has) return 0;
  const allowed = !useCase || (useCase.providers || []).includes(PROVIDER_ID);
  if (!allowed) return 0;
  return 0.85;
}

export async function score(packet = {}) {
  const src = packet && typeof packet === "object" ? packet : {};
  const spre = src.spre && typeof src.spre === "object" ? src.spre : src;
  const ssi = clip01(spre.ssi);
  const e = clip01(spre.e != null ? spre.e : spre.evidence);
  let pc = clip01(spre.pc);
  if (pc == null && ssi != null && e != null) pc = ssi * e;
  const negative = spre.negative_control === true || spre.negative_controls === true;
  const transfer = clip01(spre.domain_transfer != null ? spre.domain_transfer : 1) ?? 1;
  const applicability = clip01(e != null ? e : 0.5);
  const structural = clip01(ssi != null ? ssi : pc != null ? pc : 0.4);
  const p = clip01((structural ?? 0.4) * (applicability ?? 0.5) * transfer);
  const evidence = e != null ? e : clip01(1 - (pc ?? 0.5));
  const receipt = await sha256Hex(
    canonicalize({ provider: PROVIDER_ID, v: PROVIDER_VERSION, ssi, e, pc, negative }),
  );
  return {
    channel: spre.channel === "E" ? "E" : "P",
    score: spre.channel === "E" ? evidence : p,
    scores: { E: evidence, P: p },
    evidence_refs: spre.evidence_refs || [],
    limitations: [
      "SPRE Pattern Confidence multiplies structural score by evidence. Not guilt.",
      "Negative controls are mandatory for pattern engines used in calibration.",
      "Official narrative is not evidence.",
    ],
    uncertainty: clip01(1 - (applicability ?? 0.5)),
    negative_control: negative,
    provider_id: PROVIDER_ID,
    provider_receipt_hash: receipt,
    raw: { ssi, e, pc, transfer },
  };
}

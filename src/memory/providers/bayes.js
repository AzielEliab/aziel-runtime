/**
 * Bayesian outcome-calibration provider (channel B).
 * Optional. B is computed from outcome history; this provider must not
 * overwrite the reconstructed posterior.
 * Author: Aziel Eliab only.
 */

import { clip01, posteriorReliability } from "../../chainlock/adaptive.js";
import { canonicalize, sha256Hex } from "../../session-core.js";

export const PROVIDER_ID = "bayes";
export const PROVIDER_VERSION = "B-1.0";
export const CHANNELS_SUPPORTED = Object.freeze(["B"]);

export function canScore(packet, useCase) {
  const src = packet && typeof packet === "object" ? packet : {};
  const n = Number(src.effective_observations != null ? src.effective_observations : src.effective_n);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const allowed = !useCase || (useCase.providers || []).includes(PROVIDER_ID);
  if (!allowed) return 0;
  if (n < 4) return 0.35;
  return 0.9;
}

export async function score(packet = {}) {
  const src = packet && typeof packet === "object" ? packet : {};
  const alpha = Number(src.alpha);
  const beta = Number(src.beta);
  const probability = clip01(src.posterior_probability != null ? src.posterior_probability : src.probability);
  const reliability = posteriorReliability(alpha, beta);
  const value = reliability != null ? reliability : probability;
  const receipt = await sha256Hex(
    canonicalize({
      provider: PROVIDER_ID,
      v: PROVIDER_VERSION,
      alpha,
      beta,
      probability,
    }),
  );
  return {
    channel: "B",
    score: clip01(value),
    evidence_refs: src.chain_refs || [],
    limitations: [
      "Bayesian posterior is calibrated belief strength, not truth.",
      "Providers must not overwrite B reconstructed from resolution events.",
      "Small N prevents representing a high posterior as mature calibration.",
    ],
    uncertainty: clip01(src.variance != null ? Math.min(1, 4 * Number(src.variance)) : 0.5),
    provider_id: PROVIDER_ID,
    provider_receipt_hash: receipt,
    overwrite_posterior: false,
  };
}

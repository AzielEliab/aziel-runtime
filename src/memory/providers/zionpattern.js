/**
 * ZionPattern provider (channel P). Domain-gated. Hard 75% cap is binding
 * when results originate here. Provisional; does not solve cases.
 * Author: Aziel Eliab only.
 */

import { clip01 } from "../../chainlock/adaptive.js";
import { CONFIDENCE_CAP, scoreRequest } from "../../engines/zsolver/engine.js";
import { canonicalize, sha256Hex } from "../../session-core.js";

export const PROVIDER_ID = "zionpattern";
export const PROVIDER_VERSION = "P-ZP-1.0";
export const CHANNELS_SUPPORTED = Object.freeze(["P"]);
export const DOMAIN_CAP = CONFIDENCE_CAP;

export function canScore(packet, useCase) {
  const src = packet && typeof packet === "object" ? packet : {};
  const has =
    src.answers ||
    src.document ||
    src.zion ||
    src.pattern_id ||
    (src.domain && String(src.domain).toLowerCase().includes("zion"));
  if (!has) return 0;
  const allowed = !useCase || (useCase.providers || []).includes(PROVIDER_ID);
  if (!allowed) return 0;
  return 0.8;
}

export async function score(packet = {}) {
  const report = scoreRequest(packet);
  const capped = Math.min(Number(report.capped_confidence != null ? report.capped_confidence : 0), DOMAIN_CAP);
  const receipt = await sha256Hex(
    canonicalize({
      provider: PROVIDER_ID,
      v: PROVIDER_VERSION,
      capped,
      cap: DOMAIN_CAP,
    }),
  );
  return {
    channel: "P",
    score: clip01(capped),
    evidence_refs: [],
    limitations: [
      "ZionPattern is provisional and assistive only. Does not solve cases.",
      "Hard confidence cap 75% / uncertainty floor 25% is domain-binding.",
      "Falsifiability and receipts remain required.",
    ],
    uncertainty: clip01(report.uncertainty != null ? report.uncertainty : 1 - capped),
    domain_cap: DOMAIN_CAP,
    provider_id: PROVIDER_ID,
    provider_receipt_hash: receipt,
    raw: {
      capped_confidence: report.capped_confidence,
      raw_confidence: report.raw_confidence,
    },
  };
}

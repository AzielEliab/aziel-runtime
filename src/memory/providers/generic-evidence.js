/**
 * Generic evidence / provenance provider (channel E).
 * Optional, domain-gated. Outputs are evidence to the calibrator, not authority.
 * Author: Aziel Eliab only.
 */

import { clip01, meanOf } from "../../chainlock/adaptive.js";
import { canonicalize, sha256Hex } from "../../session-core.js";

export const PROVIDER_ID = "generic-evidence";
export const PROVIDER_VERSION = "E-1.0";
export const CHANNELS_SUPPORTED = Object.freeze(["E"]);

export function canScore(packet, useCase) {
  const src = packet && typeof packet === "object" ? packet : {};
  const has =
    src.completeness != null ||
    src.provenance != null ||
    src.independence != null ||
    src.replication != null ||
    src.source_quality != null ||
    src.chain_integrity != null ||
    src.evidence != null ||
    src.fact ||
    src.subject;
  if (!has) return 0;
  if (useCase && useCase.id === "mature_workflow") return 0.4;
  return 0.85;
}

export async function score(packet = {}) {
  const src = packet && typeof packet === "object" ? packet : {};
  const signals = [
    clip01(src.completeness),
    clip01(src.provenance),
    clip01(src.source_quality != null ? src.source_quality : src.provenance_strength),
    clip01(src.independence),
    clip01(src.replication),
    clip01(src.chain_integrity),
  ].filter((v) => v != null);
  let value = meanOf(signals);
  if (value == null) {
    const fact = String(src.fact || src.evidence || "").trim();
    value = fact.length >= 12 ? 0.55 : 0.35;
  }
  const refs = [];
  if (src.provenance_hash) refs.push(String(src.provenance_hash));
  if (src.evidence_hash) refs.push(String(src.evidence_hash));
  const receipt = await sha256Hex(
    canonicalize({
      provider: PROVIDER_ID,
      v: PROVIDER_VERSION,
      channel: "E",
      score: value,
      refs,
    }),
  );
  return {
    channel: "E",
    score: clip01(value),
    evidence_refs: refs,
    limitations: [
      "Generic evidence score is not truth.",
      "Source count is not source independence.",
      "AI-generated conclusions are not independent corroboration.",
    ],
    uncertainty: clip01(1 - (signals.length ? Math.min(1, signals.length / 6) : 0.4)),
    provider_id: PROVIDER_ID,
    provider_receipt_hash: receipt,
  };
}

/**
 * Deterministic 3-of-4 triad selection (AKM-TRIAD-1.0).
 *
 * Suitability chooses channels. Component scores never change selection.
 * Author: Aziel Eliab only.
 */

import {
  CHANNELS,
  clip01,
  computeTriadScore,
  confidenceClass,
} from "../chainlock/adaptive.js";
import {
  CALIBRATION_MANIFEST_VERSION,
  MIN_CHANNEL_ADEQUACY,
  SUITABILITY_WEIGHTS,
  TIE_BREAK,
  TRIAD_DECISION_VERSION,
  TRIAD_WEIGHTS,
  classifyUseCase,
} from "./calibration-manifest.js";

export { classifyUseCase };

export function suitabilityOf(channel, useCase, availability, sampleN) {
  const ch = String(channel || "").toUpperCase();
  const fit = clip01(useCase && useCase.domain_fit && useCase.domain_fit[ch]) ?? 0;
  const avail = clip01(availability && availability[ch]) ?? 0;
  const n = Number(sampleN);
  const sample = !Number.isFinite(n) || n <= 0 ? 0 : clip01(1 - Math.exp(-n / 8));
  const rel = clip01(useCase && useCase.relevance && useCase.relevance[ch]) ?? 0;
  const w = SUITABILITY_WEIGHTS;
  const value = w.domain_manifest_fit * fit + w.input_availability * avail + w.historical_sample_adequacy * sample + w.decision_relevance * rel;
  return {
    channel: ch,
    suitability: Number(value.toFixed(6)),
    legs: {
      domain_manifest_fit: fit,
      input_availability: avail,
      historical_sample_adequacy: sample,
      decision_relevance: rel,
    },
    adequate: value >= MIN_CHANNEL_ADEQUACY && avail > 0,
  };
}

export function selectThreeOfFour(useCase, availability, sampleN, manifestTieBreak = TIE_BREAK) {
  const rows = CHANNELS.map((ch) => suitabilityOf(ch, useCase, availability, ch === "B" ? sampleN : sampleN));
  const byCh = Object.fromEntries(rows.map((r) => [r.channel, r]));
  const adequate = rows.filter((r) => r.adequate);
  if (adequate.length < 3) {
    return {
      ok: false,
      state: "TRIAD_INCOMPLETE",
      version: TRIAD_DECISION_VERSION,
      use_case: useCase && useCase.id,
      suitability: Object.fromEntries(rows.map((r) => [r.channel, r.suitability])),
      selected: [],
      omitted: CHANNELS.filter((ch) => !adequate.some((r) => r.channel === ch)),
      omission_reason: "Fewer than three channels have minimally adequate data. Returning TRIAD_INCOMPLETE rather than fabricating a full score.",
      policy_version: CALIBRATION_MANIFEST_VERSION,
    };
  }
  const ranked = rows.slice().sort((a, b) => {
    if (b.suitability !== a.suitability) return b.suitability - a.suitability;
    return manifestTieBreak.indexOf(a.channel) - manifestTieBreak.indexOf(b.channel);
  });
  const selected = ranked.slice(0, 3).map((r) => r.channel);
  const omitted = CHANNELS.find((ch) => !selected.includes(ch));
  const omittedRow = byCh[omitted];
  let omission_reason = useCase && useCase.omit_default === omitted ? useCase.omit_reason : null;
  if (!omission_reason) {
    omission_reason = `${omitted} omitted by suitability (${omittedRow.suitability.toFixed(3)}). Tie-break order ${manifestTieBreak.join(">")} — never by resulting confidence.`;
  }
  return {
    ok: true,
    state: "TRIAD_SELECTED",
    version: TRIAD_DECISION_VERSION,
    use_case: useCase && useCase.id,
    suitability: Object.fromEntries(rows.map((r) => [r.channel, r.suitability])),
    selected,
    omitted,
    omission_reason,
    policy_version: CALIBRATION_MANIFEST_VERSION,
    candidates: CHANNELS.slice(),
  };
}

export function inspectAvailability(packet, useCase, providersInvoked) {
  const src = packet && typeof packet === "object" ? packet : {};
  const invoked = new Set(providersInvoked || []);
  const e =
    src.completeness != null ||
    src.provenance != null ||
    src.evidence ||
    src.fact ||
    invoked.has("generic-evidence") ||
    invoked.has("spre")
      ? 0.8
      : 0.15;
  const layers = Boolean(src.r || src.d || src.p || src.R || src.D || src.P || (src.layers && (src.layers.r || src.layers.d)));
  const c = layers || invoked.has("clce") ? 0.85 : 0.1;
  const p =
    src.ssi != null ||
    src.pc != null ||
    src.answers ||
    src.zion ||
    invoked.has("spre") ||
    invoked.has("zionpattern")
      ? 0.8
      : 0.1;
  const n = Number(src.effective_observations != null ? src.effective_observations : src.effective_n);
  const b = Number.isFinite(n) && n > 0 ? clip01(0.3 + Math.min(0.7, n / 12)) : 0.05;
  if (useCase && useCase.id === "mature_workflow") {
    const floor = useCase.evidence_floor || 0.6;
    const eScore = clip01(src.completeness != null ? src.completeness : src.chain_integrity) ?? 0;
    if (eScore < floor) {
      return { E: Math.max(e, 0.7), C: c, P: p, B: b, evidence_floor_failed: true };
    }
  }
  return { E: e, C: c, P: p, B: b };
}

export function assembleTriadDecision(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const useCase = src.use_case || classifyUseCase(src.packet, src.operation);
  const availability = src.availability || inspectAvailability(src.packet, useCase, src.providers_invoked);
  const sampleN = Number(src.effective_observations != null ? src.effective_observations : 0);
  const selection = selectThreeOfFour(useCase, availability, sampleN);
  if (!selection.ok) {
    return {
      ...selection,
      component_scores: {},
      weights: {},
      balance: null,
      completeness: 0,
      triad_score: null,
      confidence_class: "LOW",
      evidence_refs: src.evidence_refs || [],
      chain_refs: src.chain_refs || [],
      belief_is_not_truth: true,
      author: "Aziel Eliab",
    };
  }
  const scores = src.channel_scores || {};
  const observed = selection.selected.filter((ch) => clip01(scores[ch]) != null).length;
  const completeness = observed / 3;
  const scored = computeTriadScore(selection.selected, scores, TRIAD_WEIGHTS, completeness);
  return {
    version: TRIAD_DECISION_VERSION,
    use_case: useCase.id,
    use_case_label: useCase.label,
    candidates: { E: scores.E ?? null, C: scores.C ?? null, P: scores.P ?? null, B: scores.B ?? null },
    suitability: selection.suitability,
    selected: selection.selected,
    omitted: selection.omitted,
    omission_reason: selection.omission_reason,
    component_scores: scored.component_scores || {},
    weights: scored.weights || {},
    balance: scored.balance ?? null,
    completeness,
    triad_score: scored.ok ? scored.triad_score : null,
    confidence_class: confidenceClass(scored.triad_score, sampleN),
    evidence_refs: src.evidence_refs || [],
    chain_refs: src.chain_refs || [],
    policy_version: CALIBRATION_MANIFEST_VERSION,
    state: scored.ok ? "TRIAD_SCORED" : "TRIAD_INCOMPLETE",
    ok: Boolean(scored.ok),
    belief_is_not_truth: true,
    authorizes_action: false,
    author: "Aziel Eliab",
  };
}

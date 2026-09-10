/**
 * AKM-TRIAD-1.0 — Bayesian math, evidence weighting, posterior
 * reconstruction, retrieval scoring, and Triad scoring.
 *
 * Belief calibration is not truth. History never changes.
 * Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "../session-core.js";

export const AKM_SPEC = "AKM-TRIAD-1.0";
export const AKM_VERSION = "TRIAD-0.1";
export const AKM_AUTHOR = "Aziel Eliab";
export const DEFAULT_ALPHA0 = 1;
export const DEFAULT_BETA0 = 1;
export const WEIGHT_MIN = 0.05;
export const WEIGHT_MAX = 4.0;
export const MEMORY_CONTEXT_CAP = 16;
export const CHANNELS = Object.freeze(["E", "C", "P", "B"]);

export function clamp(min, max, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function clip01(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return clamp(0, 1, Number(value));
}

export function meanOf(values) {
  const nums = (values || []).map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function evidenceWeight(qualitySignals) {
  const quality = meanOf(qualitySignals);
  const q = quality == null ? 0.5 : clip01(quality);
  return clamp(WEIGHT_MIN, WEIGHT_MAX, 0.5 + 1.5 * q);
}

export function posteriorMean(alpha, beta) {
  const a = Number(alpha);
  const b = Number(beta);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a + b <= 0) return 0.5;
  return a / (a + b);
}

export function posteriorVariance(alpha, beta) {
  const a = Number(alpha);
  const b = Number(beta);
  const s = a + b;
  if (!Number.isFinite(a) || !Number.isFinite(b) || s <= 0 || s + 1 <= 0) return null;
  return (a * b) / (s * s * (s + 1));
}

export function effectiveObservations(alpha, beta, alpha0 = DEFAULT_ALPHA0, beta0 = DEFAULT_BETA0) {
  const n = Number(alpha) + Number(beta) - Number(alpha0) - Number(beta0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Small-N restraint: high posterior with tiny N is not mature calibration.
 * Returns a reliability in [0,1] that cannot present 0.90 from N=2 as mature.
 */
export function posteriorReliability(alpha, beta, alpha0 = DEFAULT_ALPHA0, beta0 = DEFAULT_BETA0) {
  const p = posteriorMean(alpha, beta);
  const n = effectiveObservations(alpha, beta, alpha0, beta0);
  const maturity = 1 - Math.exp(-n / 8);
  return clip01(0.5 + (p - 0.5) * maturity);
}

export function applyOutcome(prior, outcome, weight) {
  const x = clip01(outcome);
  if (x == null) {
    return {
      ...prior,
      skipped: true,
      reason: "UNKNOWN",
    };
  }
  const w = clamp(WEIGHT_MIN, WEIGHT_MAX, weight == null ? 1 : Number(weight));
  const alpha = Number(prior.alpha);
  const beta = Number(prior.beta);
  return {
    alpha: alpha + w * x,
    beta: beta + w * (1 - x),
    skipped: false,
    weight: w,
    outcome: x,
  };
}

export function brierScore(pairs) {
  const rows = (pairs || []).filter(
    (p) => p && Number.isFinite(Number(p.predicted)) && Number.isFinite(Number(p.observed)),
  );
  if (!rows.length) return null;
  const sum = rows.reduce((acc, p) => {
    const d = Number(p.predicted) - Number(p.observed);
    return acc + d * d;
  }, 0);
  return sum / rows.length;
}

/**
 * Rebuild posterior from immutable resolution events.
 * UNKNOWN outcomes are skipped (not success, not failure).
 * AI-generated conclusions are not independent corroboration.
 */
export function rebuildPosterior(events, prior = { alpha: DEFAULT_ALPHA0, beta: DEFAULT_BETA0 }) {
  let alpha = Number(prior.alpha);
  let beta = Number(prior.beta);
  const alpha0 = Number(prior.alpha0 != null ? prior.alpha0 : DEFAULT_ALPHA0);
  const beta0 = Number(prior.beta0 != null ? prior.beta0 : DEFAULT_BETA0);
  const seen = new Set();
  const pairs = [];
  let applied = 0;
  let unknown = 0;
  for (const ev of events || []) {
    if (!ev || ev.kind !== "memory_resolution") continue;
    if (String(ev.outcome_label || "").toUpperCase() === "UNKNOWN" || ev.outcome === "UNKNOWN") {
      unknown += 1;
      continue;
    }
    if (ev.ai_generated === true || ev.self_corroboration === true) continue;
    const digest = ev.evidence_hash || ev.provenance_hash || ev.content_hash || null;
    if (digest) {
      if (seen.has(digest)) continue;
      seen.add(digest);
    }
    const predicted = posteriorMean(alpha, beta);
    const next = applyOutcome({ alpha, beta }, ev.outcome, ev.weight);
    if (next.skipped) {
      unknown += 1;
      continue;
    }
    pairs.push({ predicted, observed: next.outcome });
    alpha = next.alpha;
    beta = next.beta;
    applied += 1;
  }
  return {
    alpha,
    beta,
    probability: posteriorMean(alpha, beta),
    variance: posteriorVariance(alpha, beta),
    effective_observations: effectiveObservations(alpha, beta, alpha0, beta0),
    reliability: posteriorReliability(alpha, beta, alpha0, beta0),
    brier: brierScore(pairs),
    applied,
    unknown,
    prior: { alpha: alpha0, beta: beta0 },
    belief_is_not_truth: true,
  };
}

export function lexicalRelevance(query, subject, fact) {
  const q = String(query || "")
    .toLowerCase()
    .trim();
  if (!q) return 0.5;
  const hay = `${String(subject || "")} ${String(fact || "")}`.toLowerCase();
  if (!hay.trim()) return 0;
  if (hay.includes(q)) return 1;
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  if (!tokens.length) return hay.includes(q) ? 1 : 0;
  const hits = tokens.filter((t) => hay.includes(t)).length;
  return hits / tokens.length;
}

export function recencyScore(iso, now = Date.now()) {
  if (!iso) return 0.5;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0.5;
  const ageMs = Math.max(0, now - t);
  const day = 86400000;
  return clamp(0, 1, Math.exp(-ageMs / (14 * day)));
}

export function statusMultiplier(status, historyQuery = false) {
  const s = String(status || "ACTIVE").toUpperCase();
  if (s === "ACTIVE") return 1;
  if (s === "CONTESTED") return 0.75;
  if (s === "SUPERSEDED") return historyQuery ? 0.6 : 0.35;
  if (s === "REVOKED") return historyQuery ? 0.25 : 0;
  return 1;
}

export function triadFit(useCase, latestTriad) {
  if (!latestTriad || !Array.isArray(latestTriad.selected)) return 0.5;
  const want = Array.isArray(useCase && useCase.default_triad) ? useCase.default_triad : null;
  if (!want || !want.length) return 0.7;
  const got = new Set(latestTriad.selected);
  const hits = want.filter((c) => got.has(c)).length;
  return hits / want.length;
}

export function retrievalScore(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const weights = src.weights || {
    relevance: 0.35,
    posterior: 0.25,
    evidence: 0.2,
    recency: 0.1,
    triad_fit: 0.1,
  };
  const relevance = clip01(src.relevance) ?? 0.5;
  const posterior = clip01(src.posterior) ?? 0.5;
  const evidence = clip01(src.evidence) ?? 0.5;
  const recency = clip01(src.recency) ?? 0.5;
  const fit = clip01(src.triad_fit) ?? 0.5;
  const base =
    weights.relevance * relevance +
    weights.posterior * posterior +
    weights.evidence * evidence +
    weights.recency * recency +
    weights.triad_fit * fit;
  const mult = statusMultiplier(src.status, src.history);
  return {
    score: clamp(0, 1, base * mult),
    base,
    multiplier: mult,
    legs: { relevance, posterior, evidence, recency, triad_fit: fit },
    weights,
  };
}

export function normalizedStddev(values) {
  const nums = (values || []).map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const varSum = nums.reduce((a, b) => a + (b - mean) * (b - mean), 0) / nums.length;
  const sd = Math.sqrt(varSum);
  const maxSd = Math.sqrt(1 / 3);
  return clamp(0, 1, sd / maxSd);
}

export function computeTriadScore(selected, scores, weights, completeness) {
  const legs = (selected || []).map((ch) => clip01(scores && scores[ch]));
  if (legs.some((v) => v == null) || legs.length !== 3) {
    return { ok: false, state: "TRIAD_INCOMPLETE", triad_score: null };
  }
  const w = selected.map((ch) => Number(weights && weights[ch]));
  const wsum = w.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  const nw = wsum > 0 ? w.map((x) => x / wsum) : [1 / 3, 1 / 3, 1 / 3];
  const base = nw[0] * legs[0] + nw[1] * legs[1] + nw[2] * legs[2];
  const balance = 1 - normalizedStddev(legs);
  const complete = clip01(completeness) ?? 1;
  const triad_score = 100 * base * (0.8 + 0.2 * balance) * complete;
  return {
    ok: true,
    base,
    balance,
    completeness: complete,
    triad_score: Number(triad_score.toFixed(4)),
    component_scores: Object.fromEntries(selected.map((ch, i) => [ch, legs[i]])),
    weights: Object.fromEntries(selected.map((ch, i) => [ch, nw[i]])),
  };
}

export function confidenceClass(score, effectiveN) {
  const n = Number(effectiveN);
  if (!Number.isFinite(n) || n < 4) return "LOW";
  const s = Number(score);
  if (!Number.isFinite(s)) return "LOW";
  if (s >= 70 && n >= 12) return "HIGH";
  if (s >= 45) return "MODERATE";
  return "LOW";
}

export async function hashMemoryDelta(delta) {
  return sha256Hex(canonicalize(delta || {}));
}

export function emptyPrior() {
  return { alpha: DEFAULT_ALPHA0, beta: DEFAULT_BETA0, alpha0: DEFAULT_ALPHA0, beta0: DEFAULT_BETA0 };
}

/**
 * Versioned AKM-TRIAD-1.0 calibration manifest.
 *
 * Use-case → default triad, suitability floors, retrieval weights,
 * domain-gated providers. Selection is never by resulting confidence.
 * Author: Aziel Eliab only.
 */

export const CALIBRATION_MANIFEST_VERSION = "AKM-CAL-1.0";
export const TRIAD_DECISION_VERSION = "TRIAD-0.1";
export const AKM_AUTHOR = "Aziel Eliab";

export const CHANNELS = Object.freeze(["E", "C", "P", "B"]);

export const SUITABILITY_WEIGHTS = Object.freeze({
  domain_manifest_fit: 0.35,
  input_availability: 0.25,
  historical_sample_adequacy: 0.2,
  decision_relevance: 0.2,
});

export const MIN_CHANNEL_ADEQUACY = 0.25;

export const RETRIEVAL_WEIGHTS = Object.freeze({
  relevance: 0.35,
  posterior: 0.25,
  evidence: 0.2,
  recency: 0.1,
  triad_fit: 0.1,
});

export const TRIAD_WEIGHTS = Object.freeze({
  E: 1 / 3,
  C: 1 / 3,
  P: 1 / 3,
  B: 1 / 3,
});

/** Tie-break order is declared here — never by resulting confidence. */
export const TIE_BREAK = Object.freeze(["E", "C", "P", "B"]);

export const USE_CASES = Object.freeze({
  forensic_evidence: {
    id: "forensic_evidence",
    label: "Forensic / evidence review",
    default_triad: ["E", "C", "P"],
    omit_default: "B",
    omit_reason: "Outcome history may be sparse; evidence, consistency, and structural fit matter most.",
    providers: ["generic-evidence", "clce", "spre", "zionpattern"],
    keywords: ["forensic", "evidence", "cold case", "historical", "archive", "witness"],
    domain_fit: { E: 1, C: 0.9, P: 0.85, B: 0.25 },
    relevance: { E: 1, C: 0.9, P: 0.85, B: 0.2 },
  },
  operational_decision: {
    id: "operational_decision",
    label: "Repeated prediction / operational decision",
    default_triad: ["E", "C", "B"],
    omit_default: "P",
    omit_reason: "Historical calibration is more useful than generic pattern fit.",
    providers: ["generic-evidence", "clce", "bayes"],
    keywords: ["predict", "operational", "repeat", "forecast", "decision"],
    domain_fit: { E: 0.9, C: 0.85, P: 0.35, B: 0.95 },
    relevance: { E: 0.9, C: 0.85, P: 0.3, B: 1 },
  },
  pattern_family: {
    id: "pattern_family",
    label: "Known pattern-family classification",
    default_triad: ["E", "P", "B"],
    omit_default: "C",
    omit_reason: "Cross-layer consistency is optional if R/D/P layers are not meaningful.",
    providers: ["generic-evidence", "spre", "zionpattern", "bayes"],
    keywords: ["pattern", "family", "classify", "spre", "zion", "ontology"],
    domain_fit: { E: 0.85, C: 0.3, P: 1, B: 0.8 },
    relevance: { E: 0.85, C: 0.25, P: 1, B: 0.8 },
  },
  documentation: {
    id: "documentation",
    label: "System / documentation validation",
    default_triad: ["E", "C", "B"],
    omit_default: "P",
    omit_reason: "CLCE alignment plus observed resolution history.",
    providers: ["generic-evidence", "clce", "bayes"],
    keywords: ["docs", "documentation", "system", "validation", "clce", "layers"],
    domain_fit: { E: 0.85, C: 1, P: 0.3, B: 0.8 },
    relevance: { E: 0.8, C: 1, P: 0.25, B: 0.8 },
  },
  exploratory: {
    id: "exploratory",
    label: "Early exploratory research",
    default_triad: ["E", "C", "P"],
    omit_default: "B",
    omit_reason: "Avoid over-weighting Bayesian history when effective sample size is too small.",
    providers: ["generic-evidence", "clce", "spre"],
    keywords: ["explore", "early", "research", "hypothesis"],
    domain_fit: { E: 0.9, C: 0.8, P: 0.75, B: 0.2 },
    relevance: { E: 0.9, C: 0.8, P: 0.75, B: 0.15 },
  },
  mature_workflow: {
    id: "mature_workflow",
    label: "Mature repeated workflow",
    default_triad: ["C", "P", "B"],
    omit_default: "E",
    omit_reason: "Provenance/evidence completeness is already enforced upstream and remains above its domain floor.",
    providers: ["clce", "spre", "bayes", "generic-evidence"],
    keywords: ["mature", "workflow", "repeated", "production"],
    domain_fit: { E: 0.35, C: 0.9, P: 0.85, B: 0.95 },
    relevance: { E: 0.3, C: 0.9, P: 0.85, B: 0.95 },
    evidence_floor: 0.6,
  },
});

export const DOMAIN_CAPS = Object.freeze({
  zionpattern: 0.75,
});

export function classifyUseCase(packet = {}, operation = "") {
  const src = packet && typeof packet === "object" ? packet : {};
  const explicit = String(src.use_case || src.useCase || "").trim().toLowerCase();
  if (explicit && USE_CASES[explicit]) return USE_CASES[explicit];
  const aliases = {
    forensic: "forensic_evidence",
    evidence: "forensic_evidence",
    "forensic_evidence": "forensic_evidence",
    operational: "operational_decision",
    prediction: "operational_decision",
    "operational_decision": "operational_decision",
    pattern: "pattern_family",
    "pattern_family": "pattern_family",
    docs: "documentation",
    documentation: "documentation",
    explore: "exploratory",
    exploratory: "exploratory",
    mature: "mature_workflow",
    "mature_workflow": "mature_workflow",
  };
  if (aliases[explicit] && USE_CASES[aliases[explicit]]) return USE_CASES[aliases[explicit]];
  const hay = [
    operation,
    src.subject,
    src.fact,
    src.domain,
    src.relation_key,
    Array.isArray(src.keywords) ? src.keywords.join(" ") : "",
  ]
    .join(" ")
    .toLowerCase();
  let best = USE_CASES.exploratory;
  let hits = 0;
  for (const uc of Object.values(USE_CASES)) {
    const n = uc.keywords.filter((k) => hay.includes(k)).length;
    if (n > hits) {
      hits = n;
      best = uc;
    }
  }
  return best;
}

export function manifestView() {
  return {
    version: CALIBRATION_MANIFEST_VERSION,
    triad_decision: TRIAD_DECISION_VERSION,
    spec: "AKM-TRIAD-1.0",
    author: AKM_AUTHOR,
    software_tab: false,
    channels: CHANNELS.slice(),
    suitability_weights: { ...SUITABILITY_WEIGHTS },
    retrieval_weights: { ...RETRIEVAL_WEIGHTS },
    tie_break: TIE_BREAK.slice(),
    min_channel_adequacy: MIN_CHANNEL_ADEQUACY,
    use_cases: Object.keys(USE_CASES),
    domain_caps: { ...DOMAIN_CAPS },
    note: "Bayesian posterior is calibrated belief strength, not truth. Selection is by suitability, never by resulting confidence.",
  };
}

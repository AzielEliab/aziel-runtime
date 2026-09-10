/**
 * Lamb Lens — fabric ethics AFTER FragGate.
 *
 * Not a Softwares-tab product. Not a second door. Not LambGate.
 * Peace, then Clarity, then Service. PASS / REFUSE / HOLD-UNCERTAIN.
 *
 * participate = (Peace OR Clarity OR Service) AND NOT AbsoluteProhibition
 *
 * Absolute prohibitions: porn, harassment, foul language, stalking,
 * falsifying documents, bypassing protocols.
 * Permit Q&A and legitimate inspection (e.g. TrajectoryLock on public cases).
 *
 * Author: Aziel Eliab only.
 */

export const LAMB_LENS_VERSION = "LL-1.0";
export const LAMB_LENS_POLICY = "MASTER-33-LL-1.0";
export const LAMB_LENS_AUTHOR = "Aziel Eliab";
export const LAMB_LENS_SOFTWARE_TAB = false;
export const LAMB_LENS_DOOR = false;

const INSPECTION_SLUGS = new Set([
  "trajectorylock",
  "4dmap",
  "shadowlock",
  "employeelock",
  "whistlelock",
  "mialock",
  "chronolock",
  "peacelock",
  "aziel-corpus",
  "spectrallock",
  "vibelock",
  "godlock",
  "azclce",
]);

const QA_OPS = new Set([
  "health",
  "skill",
  "example",
  "analyze",
  "search",
  "advisory",
  "advise",
  "observe",
  "map",
  "queries",
  "coverage",
  "doe-match",
  "search-options",
  "verify",
  "verify_hash",
  "card_walk",
  "card_list",
  "card_new",
  "ethical_search",
  "lamb_lens_search",
]);

const PROHIBITIONS = Object.freeze([
  {
    id: "porn",
    re: /\b(porn|pornograph|xxx[- ]?video|onlyfans|nude pics|sex tape|explicit sex|csam|child.?porn)\b/i,
  },
  {
    id: "harassment",
    re: /\b(harass(ment|ing)?|doxx(ing)?|doxing|swatting|hate speech)\b/i,
  },
  {
    id: "foul_language",
    re: /\b(fuck|shit|bitch|cunt|asshole|motherfucker|dickhead)\b/i,
  },
  {
    id: "stalking",
    re: /\b(stalk(ing|er)?|track this (person|user|phone)|find (her|his|their) (address|home)|where does \w+ live)\b/i,
  },
  {
    id: "falsify_documents",
    re: /\b(forge (a )?(passport|id|diploma|document)|falsify (a )?(document|record|id)|fake (id|passport|court order)|counterfeit (id|passport))\b/i,
  },
  {
    id: "bypass_protocols",
    re: /\b(bypass (the )?(protocol|fraggate|gate|lamb|decisiongate)|jailbreak|ignore (all )?(previous|safety)|disable (the )?(safety|guardrails?))\b/i,
  },
]);

function clipText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function lensCorpus(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const parts = [
    src.slug,
    src.op,
    src.statement,
    clipText(src.payload),
    clipText(src.claim),
    src.text,
  ];
  if (src.claim && typeof src.claim === "object") {
    parts.push(src.claim.statement, clipText(src.claim.evidence));
  }
  return parts.filter(Boolean).join("\n");
}

function hitsIn(text) {
  const hits = [];
  for (const rule of PROHIBITIONS) {
    if (rule.re.test(text)) hits.push(rule.id);
  }
  return hits;
}

function inspectionPermit(slug, op, hits) {
  const s = String(slug || "")
    .trim()
    .toLowerCase();
  const o = String(op || "")
    .trim()
    .toLowerCase();
  if (!INSPECTION_SLUGS.has(s)) return false;
  const onlyStalk = hits.length > 0 && hits.every((h) => h === "stalking");
  if (!onlyStalk) return false;
  return !o || QA_OPS.has(o) || /analy|inspect|example|search|walk|map/.test(o);
}

function triad(text, slug, op) {
  const blob = `${text}\n${slug || ""}\n${op || ""}`.toLowerCase();
  const peace = /\b(peace|silence|de-?escalat|non-?harm|chosen inaction)\b/.test(blob) || slug === "peacelock";
  const clarity =
    QA_OPS.has(String(op || "").toLowerCase()) ||
    /\b(analy|search|inspect|cite|verify|question|clarify|health|skill|example)\b/.test(blob) ||
    Boolean(op);
  const service = /\b(help|assist|receipt|advisor|serve|verify)\b/.test(blob) || Boolean(op);
  return { peace, clarity, service };
}

/**
 * Fabric ethics check. Does not grant capability. FragGate already classified.
 */
export function lambLensCheck(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const slug = src.slug || null;
  const op = src.op || null;
  const text = lensCorpus(src);
  let hits = hitsIn(text);
  const reasons = [];

  if (hits.length && inspectionPermit(slug, op, hits)) {
    reasons.push("Legitimate inspection / public-case Q&A (e.g. TrajectoryLock). Stalking-shaped language permitted in this inspect context only.");
    hits = [];
  }

  const { peace, clarity, service } = triad(text, slug, op);
  const served = Boolean(peace || clarity || service);

  if (hits.length) {
    return {
      decision: "REFUSE",
      peace,
      clarity,
      service,
      prohibition_hits: hits,
      policy_version: LAMB_LENS_POLICY,
      reasons: [`Absolute prohibition: ${hits.join(", ")}.`, ...reasons],
      software_tab: false,
      door: false,
      after: "fraggate",
      v: LAMB_LENS_VERSION,
      author: LAMB_LENS_AUTHOR,
    };
  }

  if (!served) {
    if (!slug && !op) {
      return {
        decision: "PASS",
        peace,
        clarity,
        service,
        prohibition_hits: [],
        policy_version: LAMB_LENS_POLICY,
        reasons: ["Pipe admission without a named op. SweepGate / Sentinel own structure. Not a second door."],
        software_tab: false,
        door: false,
        after: "fraggate",
        v: LAMB_LENS_VERSION,
        author: LAMB_LENS_AUTHOR,
      };
    }
    return {
      decision: "HOLD-UNCERTAIN",
      peace: peace || "unknown",
      clarity: clarity || "unknown",
      service: service || "unknown",
      prohibition_hits: [],
      policy_version: LAMB_LENS_POLICY,
      reasons: ["No Peace / Clarity / Service signal. HOLD-UNCERTAIN. Not a second door."],
      software_tab: false,
      door: false,
      after: "fraggate",
      v: LAMB_LENS_VERSION,
      author: LAMB_LENS_AUTHOR,
    };
  }

  const order = [];
  if (peace) order.push("Peace");
  if (clarity) order.push("Clarity");
  if (service) order.push("Service");

  return {
    decision: "PASS",
    peace,
    clarity,
    service,
    prohibition_hits: [],
    policy_version: LAMB_LENS_POLICY,
    reasons: [`Compatible: ${order.join(", then ") || "Clarity"}.`, ...reasons],
    software_tab: false,
    door: false,
    after: "fraggate",
    v: LAMB_LENS_VERSION,
    author: LAMB_LENS_AUTHOR,
  };
}

export function lambLensView(decision) {
  if (!decision || typeof decision !== "object") return null;
  return {
    decision: decision.decision,
    prohibition_hits: decision.prohibition_hits || [],
    policy_version: decision.policy_version || LAMB_LENS_POLICY,
    software_tab: false,
    door: false,
  };
}

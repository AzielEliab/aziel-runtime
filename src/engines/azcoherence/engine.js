/**
 * AZCoherence engine — second-pass coherence reviewer for triad scores.
 *
 * Peer AZ-CLCE detects R/D/P inconsistency. AZCoherence reviews primary vs
 * alternate path and returns PASS / FLAG / NEUTRALIZE / REFUSE.
 * Never invents evidence. Confidence ≠ truth. Not AKM-TRIAD fabric.
 *
 * Product cite: https://github.com/AzielEliab/AZCoherence
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "azcoherence";
export const NAME = "AZCoherence";
export const VERSION = "0.1.0";
export const ENGINE_VERSION = VERSION;
export const SPEC = "AZC-0.1";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Confidence is not truth. Never invent evidence.";
export const ROLE = "second-pass triad coherence review (primary vs alternate)";
export const SCHEMA = "azcoherence.receipt.v0.1";
export const PRODUCT_GITHUB = "https://github.com/AzielEliab/AZCoherence";
export const THRESHOLD = 0.7;
export const FLAG_DELTA = 0.15;
export const NEUTRALIZE_DELTA = 0.35;
export const MAX_FIELD_CHARS = 64 * 1024;

export const AXES = Object.freeze(["primary", "alternate", "evidence", "confidence"]);
export const NEIGHBORS = Object.freeze(["azclce", "decisiongate", "godlock", "zsolver"]);
export const VERDICTS = Object.freeze(["PASS", "FLAG", "NEUTRALIZE", "REFUSE"]);
export const STUB_REFUSE = Object.freeze([
  "invent_evidence",
  "invent",
  "fabricate",
  "truth_score",
  "truth_claim",
  "akm_calibrate",
  "memory_observe",
  "posterior_as_truth",
  "auto_pass",
  "blend_scores",
]);

export const LIMITATION =
  "THIS IS: a cite/health second-pass coherence reviewer for alternative triad scores (AZC-0.1). Peer AZ-CLCE detects R/D/P inconsistency; AZCoherence reviews primary vs alternate path → PASS / FLAG / NEUTRALIZE / REFUSE. Advisory only. Never invents evidence. Confidence ≠ truth. THIS IS NOT: AKM-TRIAD fabric (memory stays fabric, not Softwares); a truth score; a posterior that authorizes action; a lie detector; a replacement for AZ-CLCE; a mesh enable. Product cite: https://github.com/AzielEliab/AZCoherence. Author: Aziel Eliab only.";

export const LIVE_OPS = Object.freeze([
  "health",
  "skill",
  "doctor",
  "verify",
  "review_triad",
  "alternate_score",
  "coherence_check",
  "neutralize_hallucination",
]);

function asStr(value) {
  if (value == null) return "";
  return String(value);
}

function checkField(name, value) {
  const text = value == null ? "" : String(value);
  if (text.length > MAX_FIELD_CHARS) {
    const err = new Error(name + " exceeds size limit (" + text.length + " > " + MAX_FIELD_CHARS + " characters)");
    err.code = "SIZE_LIMIT";
    throw err;
  }
  return text;
}

function clip01(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function asList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((item) => asStr(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .replace(/\r\n/g, "\n")
      .split(/\n|;/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  const text = asStr(value).trim();
  return text ? [text] : [];
}

export function tokenize(text) {
  if (text == null) return new Set();
  const src = typeof text === "string" ? text : Array.isArray(text) ? text.join(" ") : String(text);
  const out = new Set();
  for (const tok of src.toLowerCase().split(/[^a-z0-9]+/)) {
    if (tok) out.add(tok);
  }
  return out;
}

export function jaccard(a, b) {
  const left = a instanceof Set ? a : new Set(a || []);
  const right = b instanceof Set ? b : new Set(b || []);
  if (!left.size && !right.size) return 1;
  const union = new Set([...left, ...right]);
  let inter = 0;
  for (const x of left) if (right.has(x)) inter += 1;
  return union.size ? inter / union.size : 1;
}

export function jaccardTriple(r, d, p) {
  const tr = tokenize(r);
  const td = tokenize(d);
  const tp = tokenize(p);
  if (!tr.size && !td.size && !tp.size) return 1;
  const union = new Set([...tr, ...td, ...tp]);
  const inter = new Set([...tr].filter((x) => td.has(x) && tp.has(x)));
  return union.size ? inter.size / union.size : 1;
}

function bandOf(triple) {
  if (triple >= 1 - 1e-12) return "perfect";
  if (triple >= THRESHOLD) return "acceptable";
  return "structural_inconsistency";
}

function layerField(body, names) {
  if (!body || typeof body !== "object") return "";
  for (const n of names) {
    if (body[n] != null) return body[n];
  }
  const layers = body.layers;
  if (layers && typeof layers === "object") {
    for (const n of names) {
      if (layers[n] != null) return layers[n];
    }
  }
  return "";
}

export function parsePath(body, prefix = "") {
  const src = body && typeof body === "object" ? body : {};
  const nested = prefix
    ? src[prefix] && typeof src[prefix] === "object"
      ? src[prefix]
      : {}
    : src;
  const alt = prefix === "alternate" ? src.alternate || src.alt || nested : nested;
  const r = layerField(alt, prefix ? ["r", "R", "representation"] : ["r", "R", "representation"]);
  const d = layerField(alt, prefix ? ["d", "D", "description"] : ["d", "D", "description"]);
  const p = layerField(alt, prefix ? ["p", "P", "reality"] : ["p", "P", "reality"]);
  const n = layerField(alt, prefix ? ["n", "N", "negative", "negative_space"] : ["n", "N", "negative", "negative_space"]);
  const posted = clip01(alt.score ?? alt.triple ?? alt.primary_score ?? alt.alternate_score);
  return {
    r: checkField((prefix || "primary") + ".r", Array.isArray(r) ? r.join(" ") : r),
    d: checkField((prefix || "primary") + ".d", Array.isArray(d) ? d.join(" ") : d),
    p: checkField((prefix || "primary") + ".p", Array.isArray(p) ? p.join(" ") : p),
    n: checkField((prefix || "primary") + ".n", Array.isArray(n) ? n.join(" ") : n),
    posted_score: posted,
    band: alt.band != null ? asStr(alt.band).trim() || null : null,
    types: Array.isArray(alt.types) ? alt.types.map((t) => asStr(t)) : [],
  };
}

export function parseAlternate(body) {
  const src = body && typeof body === "object" ? body : {};
  if (src.alternate && typeof src.alternate === "object") return parsePath(src, "alternate");
  if (src.alt && typeof src.alt === "object") return parsePath({ alternate: src.alt }, "alternate");
  return {
    r: checkField("alternate.r", src.alt_r ?? src.alternate_r ?? ""),
    d: checkField("alternate.d", src.alt_d ?? src.alternate_d ?? ""),
    p: checkField("alternate.p", src.alt_p ?? src.alternate_p ?? ""),
    n: checkField("alternate.n", src.alt_n ?? src.alternate_n ?? ""),
    posted_score: clip01(src.alternate_score ?? src.alt_score),
    band: src.alt_band != null ? asStr(src.alt_band).trim() || null : null,
    types: Array.isArray(src.alt_types) ? src.alt_types.map((t) => asStr(t)) : [],
  };
}

export function scorePath(path) {
  const r = path.r || "";
  const d = path.d || "";
  const p = path.p || "";
  const n = path.n || "";
  const hasLayers = Boolean(r || d || p || n);
  const triple = hasLayers ? jaccardTriple(r, d, p) : path.posted_score != null ? path.posted_score : null;
  const rd = hasLayers ? jaccard(tokenize(r), tokenize(d)) : null;
  const dp = hasLayers ? jaccard(tokenize(d), tokenize(p)) : null;
  const rp = hasLayers ? jaccard(tokenize(r), tokenize(p)) : null;
  const computedBand = triple == null ? null : bandOf(triple);
  return {
    r,
    d,
    p,
    n,
    has_layers: hasLayers,
    triple,
    pairwise: { rd, dp, rp },
    band: path.band || computedBand,
    posted_score: path.posted_score,
    types: path.types.slice(),
    advisory: true,
  };
}

function truthy(value) {
  if (value === true || value === 1 || value === "1") return true;
  const s = asStr(value).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "truth";
}

export function collectFlags(src, primary, alternate) {
  const flags = [];
  const evidence = asList(src.evidence);
  const claim = checkField("claim", src.claim ?? src.text ?? src.statement ?? "");
  const confidence = clip01(src.confidence ?? src.conf);
  const invent = truthy(src.invent_evidence) || truthy(src.invent) || truthy(src.fabricate);
  const truthClaim = truthy(src.truth_claim) || truthy(src.posterior_as_truth) || truthy(src.as_truth);
  const layerTokens = new Set([
    ...tokenize(primary.r),
    ...tokenize(primary.d),
    ...tokenize(primary.p),
    ...tokenize(alternate.r),
    ...tokenize(alternate.d),
    ...tokenize(alternate.p),
    ...tokenize(evidence.join(" ")),
  ]);
  const claimTokens = [...tokenize(claim)].filter((t) => t.length > 3);
  const unsupported = claimTokens.filter((t) => !layerTokens.has(t));
  if (invent) flags.push("invent_requested");
  if (truthClaim) flags.push("truth_claim");
  if (confidence != null && confidence >= 0.75 && evidence.length === 0) flags.push("confidence_without_evidence");
  if (confidence != null && confidence >= THRESHOLD && evidence.length === 0) flags.push("thin_evidence");
  if (!primary.has_layers && primary.posted_score != null && primary.posted_score >= THRESHOLD && evidence.length === 0) {
    flags.push("posted_score_without_layers");
  }
  if (unsupported.length >= 3 && claim && evidence.length === 0) flags.push("unsupported_claim_tokens");
  return { flags, evidence, claim, confidence, invent, truthClaim, unsupported };
}

function deltaOf(primary, alternate) {
  if (primary.triple == null || alternate.triple == null) return null;
  return Math.abs(primary.triple - alternate.triple);
}

export function decideVerdict({ primary, alternate, flags, invent, truthClaim, confidence, evidence }) {
  if (invent || truthClaim) return "REFUSE";
  if (flags.includes("invent_requested") || flags.includes("truth_claim")) return "REFUSE";
  const delta = deltaOf(primary, alternate);
  const bandsDisagree =
    primary.band &&
    alternate.band &&
    ((primary.band === "perfect" && alternate.band === "structural_inconsistency") ||
      (alternate.band === "perfect" && primary.band === "structural_inconsistency"));
  if (bandsDisagree || (delta != null && delta >= NEUTRALIZE_DELTA) || flags.includes("confidence_without_evidence")) {
    return "NEUTRALIZE";
  }
  if (flags.includes("unsupported_claim_tokens") && (confidence == null || confidence >= THRESHOLD)) {
    return "NEUTRALIZE";
  }
  if (
    (delta != null && delta >= FLAG_DELTA) ||
    (primary.band && alternate.band && primary.band !== alternate.band) ||
    flags.includes("thin_evidence") ||
    flags.includes("posted_score_without_layers")
  ) {
    return "FLAG";
  }
  const haveCompare = primary.triple != null && alternate.triple != null;
  const havePrimary = primary.has_layers || primary.posted_score != null;
  if (!haveCompare && !havePrimary && evidence.length === 0) return "FLAG";
  return "PASS";
}

function canonicalFields(receipt) {
  return {
    schema: SCHEMA,
    verdict: receipt.verdict,
    primary_triple: receipt.primary && receipt.primary.triple,
    alternate_triple: receipt.alternate && receipt.alternate.triple,
    delta: receipt.delta,
    evidence_present: receipt.evidence_present,
    confidence: receipt.confidence,
    flags: (receipt.flags || []).slice().sort(),
    advisory: true,
    author: AUTHOR,
  };
}

export function canonicalJson(fields) {
  const keys = Object.keys(fields).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(fields[k])).join(",") + "}";
}

export async function sha256Hex(data) {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function envelope(extra) {
  return {
    ok: extra.ok !== false,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    schema: SCHEMA,
    role: ROLE,
    motto: MOTTO,
    github: PRODUCT_GITHUB,
    advisory: true,
    confidence_is_not_truth: true,
    invents_evidence: false,
    akm_triad: false,
    software_tab: true,
    door: "fraggate",
    mesh_enabled_default: false,
    author: AUTHOR,
    identity: AUTHOR,
    limitation: LIMITATION,
    ...extra,
  };
}

export async function buildReceipt(payload, op) {
  const src = payload && typeof payload === "object" ? payload : {};
  const primary = scorePath(parsePath(src));
  const alternate = scorePath(parseAlternate(src));
  const { flags, evidence, claim, confidence, invent, truthClaim, unsupported } = collectFlags(src, primary, alternate);
  const verdict = decideVerdict({ primary, alternate, flags, invent, truthClaim, confidence, evidence });
  const delta = deltaOf(primary, alternate);
  const receipt = envelope({
    op,
    verdict,
    primary,
    alternate,
    delta,
    evidence: evidence.slice(),
    evidence_present: evidence.length > 0,
    claim: claim || null,
    confidence,
    flags,
    unsupported_claim_tokens: unsupported.slice(0, 12),
    threshold: THRESHOLD,
    flag_delta: FLAG_DELTA,
    neutralize_delta: NEUTRALIZE_DELTA,
    neighbors: NEIGHBORS.slice(),
    note:
      verdict === "PASS"
        ? "Primary and alternate paths cohere. Advisory only. Confidence is not truth."
        : verdict === "FLAG"
          ? "Paths diverge or evidence is thin. Human review. Do not treat confidence as truth."
          : verdict === "NEUTRALIZE"
            ? "Hallucination risk in scoring. Neutralize: do not emit the posted score as fact."
            : "Refuse: invented evidence or a truth claim. AZCoherence will not mint a score.",
  });
  receipt.receipt_sha256 = await sha256Hex(canonicalJson(canonicalFields(receipt)));
  if (verdict === "REFUSE") receipt.ok = false;
  return receipt;
}

export async function reviewTriad(payload) {
  return buildReceipt(payload, "review_triad");
}

export async function alternateScore(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const path = scorePath(parseAlternate(src));
  if (!path.has_layers && path.posted_score == null) {
    return envelope({
      op: "alternate_score",
      ok: false,
      verdict: "FLAG",
      alternate: path,
      evidence_present: false,
      invents_evidence: false,
      note: "No alternate layers or posted score were supplied. AZCoherence does not invent a score.",
    });
  }
  const receipt = await buildReceipt(src, "alternate_score");
  return {
    ...receipt,
    op: "alternate_score",
    score: path.triple,
    band: path.band,
    alternate: path,
  };
}

export async function coherenceCheck(payload) {
  return buildReceipt(payload, "coherence_check");
}

export async function neutralizeHallucination(payload) {
  const review = await buildReceipt(payload, "neutralize_hallucination");
  const action =
    review.verdict === "PASS"
      ? "none"
      : review.verdict === "FLAG"
        ? "human_review"
        : review.verdict === "NEUTRALIZE"
          ? "cap_and_mark_advisory"
          : "refuse_score";
  const capped = review.confidence == null ? null : Math.min(review.confidence, action === "cap_and_mark_advisory" ? 0.5 : review.confidence);
  return {
    ...review,
    op: "neutralize_hallucination",
    neutralize: {
      action,
      emitted_score: action === "refuse_score" ? null : review.primary && review.primary.triple,
      confidence_capped: capped,
      advisory: true,
      invents_evidence: false,
      note:
        action === "none"
          ? "Nothing to neutralize. Still advisory. Confidence is not truth."
          : action === "human_review"
            ? "Flagged. Do not auto-pass. Human review."
            : action === "cap_and_mark_advisory"
              ? "Neutralized: do not present the posted score as fact. Confidence capped. Evidence was not invented."
              : "Refused to emit a neutralized score. Invented evidence and truth claims stay refused.",
    },
  };
}

export async function verifyReceipt(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const posted = asStr(src.receipt_sha256 || src.hash || src.digest).trim().toLowerCase();
  const recomputed = await buildReceipt(src, src.op || "coherence_check");
  const match = posted ? posted === recomputed.receipt_sha256 : true;
  return envelope({
    op: "verify",
    ok: match,
    verified: match,
    posted_sha256: posted || null,
    receipt_sha256: recomputed.receipt_sha256,
    verdict: recomputed.verdict,
    note: posted
      ? match
        ? "Posted receipt hash matches the recomputed coherence receipt."
        : "Posted receipt hash does not match. AZCoherence does not invent a passing verify."
      : "No posted hash. Recomputed the coherence receipt. Supply receipt_sha256 to compare.",
    recomputed: {
      verdict: recomputed.verdict,
      delta: recomputed.delta,
      evidence_present: recomputed.evidence_present,
      flags: recomputed.flags,
    },
  });
}

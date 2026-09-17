/**
 * MMConsensus — structured consensus over caller-supplied opinions.
 *
 * Adjacent to DecisionGATE (policy hop). Does not call models.
 * REAL/HEURISTIC: majority tally + token Jaccard agreement on posted texts.
 * THIS IS NOT: live multi-model inference, OpenAI/Anthropic/Grok calls,
 * score blending, or a truth score.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "mmconsensus";
export const NAME = "MMConsensus";
export const VERSION = "0.1.0";
export const ENGINE_VERSION = VERSION;
export const SPEC = "MM-CONSENSUS-0.1";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Opinions you already have. No live model call.";
export const ROLE = "structured consensus over posted opinions (adjacent to DecisionGATE)";
export const SCHEMA = "mmconsensus.receipt.v0.1";
export const PRODUCT_GITHUB = "https://github.com/AzielEliab/aziel-runtime";
export const MAX_OPINIONS = 32;
export const MAX_FIELD_CHARS = 16 * 1024;

export const AXES = Object.freeze(["statement", "opinions", "majority", "agreement"]);
export const NEIGHBORS = Object.freeze(["decisiongate", "azcoherence", "azclce"]);

export const STUB_REFUSE = Object.freeze([
  "live_model_call",
  "openai",
  "anthropic",
  "grok",
  "blend_models",
  "remote_infer",
  "truth_score",
  "court",
]);

export const LIMITATION =
  "THIS IS: a structured consensus helper (MM-CONSENSUS-0.1) over caller-supplied opinions. tally counts verdicts; agree scores posted texts. Adjacent to DecisionGATE — not a replacement hop. THIS IS NOT: live multi-model API calls, OpenAI / Anthropic / Grok inference, score blending, or a truth score. Honesty: HEURISTIC tally. SLOT for live model calls. FragGate only. Author: Aziel Eliab only.";

export const LIVE_OPS = Object.freeze(["health", "skill", "doctor", "tally", "agree", "limitation"]);

function asStr(value) {
  if (value == null) return "";
  return String(value);
}

function checkField(name, value) {
  const text = value == null ? "" : String(value);
  if (text.length > MAX_FIELD_CHARS) {
    const err = new Error(name + " exceeds size limit");
    err.code = "SIZE_LIMIT";
    err.status = 400;
    throw err;
  }
  return text;
}

export function tokenize(text) {
  const out = new Set();
  for (const tok of asStr(text).toLowerCase().split(/[^a-z0-9]+/)) {
    if (tok) out.add(tok);
  }
  return out;
}

export function jaccard(a, b) {
  const left = a instanceof Set ? a : tokenize(a);
  const right = b instanceof Set ? b : tokenize(b);
  if (!left.size && !right.size) return 1;
  const union = new Set([...left, ...right]);
  let inter = 0;
  for (const x of left) if (right.has(x)) inter += 1;
  return union.size ? inter / union.size : 1;
}

function clip01(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function parseOpinions(payload) {
  const raw = payload && payload.opinions;
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw.slice(0, MAX_OPINIONS).map((row, i) => {
    const src = row && typeof row === "object" ? row : { verdict: row };
    return {
      source: checkField("source", src.source) || `opinion-${i + 1}`,
      verdict: checkField("verdict", src.verdict || src.vote || src.decision).trim().toUpperCase() || "HOLD",
      confidence: clip01(src.confidence),
      text: checkField("text", src.text || src.rationale || ""),
    };
  });
}

function honesty() {
  return {
    honesty: "HEURISTIC",
    live_model_call: false,
    truth_score: false,
    adjacent_to: "decisiongate",
    replaces_decisiongate: false,
    author: AUTHOR,
    identity: AUTHOR,
    door: "fraggate",
  };
}

export function tally(payload) {
  const statement = checkField("statement", payload && payload.statement);
  const opinions = parseOpinions(payload);
  if (!opinions.length) {
    return { ok: false, error: "opinions[] required", status: 400, ...honesty() };
  }
  const counts = {};
  for (const row of opinions) {
    counts[row.verdict] = (counts[row.verdict] || 0) + 1;
  }
  let majority = null;
  let majority_n = 0;
  for (const [verdict, n] of Object.entries(counts)) {
    if (n > majority_n) {
      majority = verdict;
      majority_n = n;
    }
  }
  const n = opinions.length;
  const agreement_ratio = n ? majority_n / n : 0;
  const tied = Object.values(counts).filter((c) => c === majority_n).length > 1;
  return {
    ok: true,
    op: "tally",
    schema: SCHEMA,
    product: PRODUCT,
    spec: SPEC,
    version: VERSION,
    statement: statement || null,
    n,
    counts,
    majority: tied ? null : majority,
    tied,
    unanimous: agreement_ratio === 1,
    agreement_ratio,
    opinions,
    note: "Majority over posted verdicts. Does not call models. Not a truth score.",
    ...honesty(),
  };
}

export function agree(payload) {
  const opinions = parseOpinions(payload);
  if (opinions.length < 2) {
    return { ok: false, error: "agree needs at least two opinions", status: 400, ...honesty() };
  }
  const pairs = [];
  let sum = 0;
  let count = 0;
  for (let i = 0; i < opinions.length; i++) {
    for (let j = i + 1; j < opinions.length; j++) {
      const score = jaccard(opinions[i].text || opinions[i].verdict, opinions[j].text || opinions[j].verdict);
      pairs.push({ a: opinions[i].source, b: opinions[j].source, jaccard: score });
      sum += score;
      count += 1;
    }
  }
  return {
    ok: true,
    op: "agree",
    schema: SCHEMA,
    product: PRODUCT,
    spec: SPEC,
    mean_agreement: count ? sum / count : 0,
    pairs,
    n: opinions.length,
    note: "Token Jaccard over posted texts. HEURISTIC. Not live model consensus.",
    ...honesty(),
  };
}

export function limitationCite() {
  return {
    ok: true,
    op: "limitation",
    product: PRODUCT,
    spec: SPEC,
    limitation: LIMITATION,
    live_ops: LIVE_OPS.slice(),
    stub_ops: STUB_REFUSE.slice(),
    honesty_labels: {
      tally: "HEURISTIC",
      agree: "HEURISTIC",
      live_model_call: "SLOT",
    },
    out_of_scope: STUB_REFUSE.slice(),
    author: AUTHOR,
    identity: AUTHOR,
    door: "fraggate",
  };
}

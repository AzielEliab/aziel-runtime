/**
 * DecisionGATE engine (port of workers/download-tracker/src/runtime.js gates).
 * Sequential PASS/REVISE/BLOCK. wrap / remote command execution is NOT hosted.
 * Author: Aziel Eliab.
 */

export const PRODUCT = "decisiongate";
export const VERSION = "0.1.0";
export const MOTTO = "Freedom without clarity is chaos. Clarity without force is wisdom.";
export const PASS = "PASS";
export const REVISE = "REVISE";
export const BLOCK = "BLOCK";
export const GATE_ORDER = ["Definition", "Evidence", "Impact", "Integrity", "Responsibility"];
export const LIMITATION =
  "THIS IS: a lightweight ethical pre-execution filter (PASS / REVISE / BLOCK). THIS IS NOT: a predictor, a court, a truth score, advice, or a hosted command runner. wrap is not hosted.";

const HEDGES = new Set(["maybe", "somehow", "stuff", "things"]);
const COMMON_VERBS = new Set([
  "is", "are", "was", "were", "be", "been", "being", "am", "have", "has", "had", "do", "does", "did",
  "will", "would", "shall", "should", "can", "could", "must", "need", "needs", "make", "makes", "made",
  "take", "takes", "took", "give", "gives", "gave", "go", "goes", "went", "come", "keep", "put", "use",
  "uses", "used", "set", "get", "let", "allow", "allows", "publish", "release", "releases", "deploy",
  "ship", "open", "close", "create", "created", "delete", "write", "read", "run", "execute", "adopt",
  "reject", "approve", "block", "collect", "store", "share", "send", "build", "launch", "hire", "spend",
  "buy", "sell", "migrate", "replace", "update", "install", "announce", "commit", "sign", "fund",
  "grant", "revoke", "host", "serve", "bind", "filter", "record", "name", "assign", "document",
  "provide", "provides", "include", "includes", "add", "remove", "stop", "start", "move", "change",
  "apply", "submit", "accept", "refuse", "pay", "offer", "request", "require", "requires",
  "implement", "implements",
]);
const NEGATION_MARKERS = [
  "do not ", "don't ", "does not ", "doesn't ", "must not ", "cannot ", "can't ",
  "never ", "no ", "not ", "without ",
];
const WORD_RE = /[A-Za-z0-9][A-Za-z0-9._+-]*/g;

function asStr(v) {
  return v == null ? "" : String(v);
}

function asList(value) {
  if (value == null) return [];
  if (typeof value === "string") {
    let parts = value.replace(/\r\n/g, "\n").split("\n").map((p) => p.trim());
    if (parts.length === 1 && parts[0].includes(";")) {
      parts = parts[0].split(";").map((p) => p.trim());
    }
    return parts.filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((item) => asStr(item).trim()).filter(Boolean);
  }
  const text = asStr(value).trim();
  return text ? [text] : [];
}

export function proposalFromBody(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    statement: asStr(data.statement).trim(),
    evidence: asList(data.evidence),
    impacts_positive: asList(data.impacts_positive ?? data.impact_pos),
    impacts_negative: asList(data.impacts_negative ?? data.impact_neg),
    values: asList(data.values),
    commitments: asList(data.commitments),
    constraints: asList(data.constraints),
    accountable_person: asStr(data.accountable_person ?? data.accountable).trim(),
  };
}

function tokenize(text) {
  if (!text) return [];
  const m = text.toLowerCase().match(WORD_RE);
  return m || [];
}

function looksLikeVerb(token) {
  if (COMMON_VERBS.has(token)) return true;
  if (token.length > 4 && (token.endsWith("ing") || token.endsWith("ize") || token.endsWith("ise") || token.endsWith("ify"))) return true;
  if (token.length > 4 && token.endsWith("ed")) return true;
  return false;
}

function hasVerbAndObject(tokens) {
  const content = tokens.filter((t) => !HEDGES.has(t));
  if (content.length < 2) return false;
  return content.some(looksLikeVerb);
}

function gateResult(name, state, feedback, extra = {}) {
  const out = { name, state, feedback };
  if (extra.overridden) {
    out.overridden = true;
    if (extra.automatic_state) out.automatic_state = extra.automatic_state;
    if (extra.override_note) out.override_note = extra.override_note;
  }
  return out;
}

function gateDefinition(p) {
  const statement = p.statement.trim();
  if (!statement) {
    return gateResult("Definition", BLOCK, "Statement is empty. A proposal with no concrete statement cannot pass Definition. Write an unambiguous action with a verb and an object, at least 12 words.");
  }
  const tokens = tokenize(statement);
  if (tokens.length < 12) {
    return gateResult("Definition", REVISE, `Statement has ${tokens.length} word(s); Definition requires at least 12. Expand into a concrete, unambiguous proposal (who does what, to what, under what bound).`);
  }
  if (!hasVerbAndObject(tokens)) {
    return gateResult("Definition", REVISE, "Statement is hedge-only or lacks a verb+object after removing maybe/somehow/stuff/things. Name a specific action and its object.");
  }
  return gateResult("Definition", PASS, "Statement is concrete enough to scrutinize (length, verb+object).");
}

function gateEvidence(p) {
  const items = p.evidence.filter((e) => e.trim());
  if (!items.length) {
    return gateResult("Evidence", REVISE, "Evidence list is empty. Identify at least one fact, datum, or observation that grounds the statement. Ungrounded assertions do not pass Evidence.");
  }
  return gateResult("Evidence", PASS, `${items.length} evidence item(s) identified.`);
}

function gateImpact(p) {
  const pos = p.impacts_positive.filter((i) => i.trim());
  const neg = p.impacts_negative.filter((i) => i.trim());
  const missing = [];
  if (!pos.length) missing.push("positive");
  if (!neg.length) missing.push("negative");
  if (missing.length) {
    return gateResult("Impact", REVISE, `Impact list(s) empty: ${missing.join(" and ")}. Name who or what is affected on both the positive and the negative side. Hidden impacts do not pass Impact.`);
  }
  return gateResult("Impact", PASS, `${pos.length} positive and ${neg.length} negative impact(s) named.`);
}

function constraintPayload(constraint) {
  let text = constraint.toLowerCase().split(/\s+/).join(" ");
  if (!text) return null;
  let found = false;
  let remainder = ` ${text} `;
  for (const marker of NEGATION_MARKERS) {
    const padded = marker.startsWith(" ") ? marker : ` ${marker}`;
    if (remainder.includes(padded) || remainder.trimStart().startsWith(marker)) {
      found = true;
      remainder = remainder.split(padded).join(" ");
      const stripped = remainder.trimStart();
      if (stripped.startsWith(marker)) {
        remainder = " " + stripped.slice(marker.length);
      }
    }
  }
  const payload = remainder.split(/\s+/).filter(Boolean).join(" ");
  if (found && payload) return payload;
  return null;
}

function statementContradictsConstraint(statement, constraint) {
  const payload = constraintPayload(constraint);
  if (!payload) return false;
  const hay = statement.toLowerCase().split(/\s+/).join(" ");
  return hay.includes(payload);
}

function gateIntegrity(p) {
  const values = p.values.filter((v) => v.trim());
  if (!values.length) {
    return gateResult("Integrity", REVISE, "Values list is empty. Integrity requires stated values so the proposal can be checked against them.");
  }
  const hits = [];
  for (const constraint of p.constraints) {
    if (statementContradictsConstraint(p.statement, constraint)) hits.push(constraint);
  }
  if (hits.length) {
    const shown = hits[0];
    return gateResult("Integrity", BLOCK, `Statement contradicts a provided constraint (${JSON.stringify(shown)}). A contradiction of this kind cannot pass Integrity without changing the proposal's nature.`);
  }
  return gateResult("Integrity", PASS, `${values.length} value(s) stated; no constraint contradiction detected.`);
}

function gateResponsibility(p) {
  const owner = p.accountable_person.trim();
  if (!owner) {
    return gateResult("Responsibility", BLOCK, "Accountable person is blank. Diffuse or absent ownership cannot pass Responsibility. Name one accountable owner.");
  }
  return gateResult("Responsibility", PASS, `Accountable owner named: ${owner}.`);
}

const GATE_FUNCS = [gateDefinition, gateEvidence, gateImpact, gateIntegrity, gateResponsibility];

function coerceOverrides(overrides) {
  const out = {};
  if (!overrides || typeof overrides !== "object") return out;
  const known = Object.fromEntries(GATE_ORDER.map((n) => [n.toLowerCase(), n]));
  for (const [key, raw] of Object.entries(overrides)) {
    const name = known[String(key).trim().toLowerCase()];
    if (!name) continue;
    let note = "";
    let state = REVISE;
    if (typeof raw === "string") note = raw.trim();
    else if (raw && typeof raw === "object") {
      const stateRaw = String(raw.state || REVISE).trim().toUpperCase();
      if (stateRaw === REVISE) state = stateRaw;
      note = String(raw.note || raw.feedback || "").trim();
    }
    out[name] = { state, note };
  }
  return out;
}

export function runGates(proposal, overrides) {
  const prop = proposalFromBody(proposal);
  const forced = coerceOverrides(overrides);
  const lineage = [];
  let final_state = PASS;
  let blocked_at = null;
  for (const fn of GATE_FUNCS) {
    let result = fn(prop);
    if (forced[result.name]) {
      const { state, note } = forced[result.name];
      const auto = result.state;
      let feedback = result.feedback;
      feedback = note
        ? `${feedback} Human override to ${state}: ${note}`
        : `${feedback} Human override to ${state} (no note supplied).`;
      result = gateResult(result.name, state, feedback, {
        overridden: true,
        automatic_state: auto,
        override_note: note || undefined,
      });
    }
    lineage.push(result);
    if (result.state !== PASS) {
      final_state = result.state;
      if (result.state === BLOCK) blocked_at = result.name;
      break;
    }
  }
  return {
    lineage,
    final_state,
    blocked_at,
    proposal: prop,
    motto: MOTTO,
    product: PRODUCT,
    version: VERSION,
    limitation: LIMITATION,
    wrap_hosted: false,
  };
}

export function check(body) {
  const src = body && typeof body === "object" ? body : {};
  return runGates(src, src.overrides);
}

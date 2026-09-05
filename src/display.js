/**
 * Display-ready result envelope for the agent software surface.
 *
 * Agents show display.title / display.summary / display.fields in the AI client,
 * then take the next input. Structured `result` stays for machines.
 * Receipts stay optional — session plumbing is invisible unless asked for.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const ADVANCED_PREFIX = "[advanced/internal]";

const TITLE_OVERRIDES = {
  "godlock:score": "Score a GodLock submission",
  "godlock:submit": "Submit text to GodLock",
  "foldlock:fold-preview": "Fold text with FoldLock",
  "foldlock:unfold-preview": "Unfold a FoldLock preview",
  "decisiongate:check": "Run DecisionGATE on a proposal",
  "azclce:score": "Score an AZ-CLCE triad",
  "azclce:classify": "Classify an AZ-CLCE triad",
  "azclce:gate": "Gate an AZ-CLCE triad",
  "azai:lamb-check": "Run an AZAI Lamb check",
  "azai:lamb_check": "Run an AZAI Lamb check",
  "forgereceipts:receipt": "Build a ForgeReceipts receipt",
  "temporallock:genesis": "Start a TemporalLock chain",
  "temporallock:append": "Append a TemporalLock receipt",
  "temporallock:verify": "Verify a TemporalLock chain",
  "zsolver:score": "Score ZionPattern Solver answers",
  "zsolver:patterns": "List ZionPattern Solver patterns",
  "ark:sweep": "Sweep with The ARK",
  "spectrallock:overlay": "Preview a SpectralLock overlay",
  "employeelock:append-preview": "Preview an EmployeeLock log row",
  "employeelock:verify-canonical": "Verify EmployeeLock canonical JSON",
  "whistlelock:hash-preview": "Hash bytes in WhistleLock",
  "whistlelock:canon-preview": "Hash a WhistleLock ledger row",
  "trajectorylock:analyze": "Analyze a TrajectoryLock case",
  "mialock:doe-match": "Rank M.I.A.Lock Doe leads",
  "mialock:queries": "Render M.I.A.Lock search queries",
  "azieltether:verify": "Verify AzielTether package receipts",
  "aziel-corpus:search": "Search the Aziel Digital Library",
  "postking:new": "Start a Post-King Chess game",
  "postking:move": "Play a Post-King Chess move",
  "vibelock:analyze": "Analyze audio with VibeLock",
  "codelock:render": "Render source with CodeLock",
  "shadowlock:observe": "Observe a job list with ShadowLock",
  "miragegrid:assign": "Assign a MirageGrid node",
  "staticclock:advise": "Advise with StaticClock",
  "chronolock:advisory": "Get a ChronoLock advisory",
  "azbot:route": "Route a request with AZBot",
};

const OP_VERBS = {
  analyze: "Analyze with",
  apps: "Show local steps for",
  render: "Render with",
  score: "Score with",
  submit: "Submit to",
  observe: "Observe with",
  genesis: "Start a chain in",
  append: "Append a receipt in",
  verify: "Verify with",
  receipt: "Build a receipt in",
  check: "Check with",
  patterns: "List patterns in",
  session: "Snapshot a session in",
  status: "Read status from",
  assign: "Assign a node in",
  advise: "Advise with",
  advisory: "Get an advisory from",
  anchors: "List anchors in",
  new: "Start a game in",
  move: "Play a move in",
  classify: "Classify with",
  gate: "Gate with",
  sweep: "Sweep with",
  levels: "List levels in",
  "lamb-check": "Run a Lamb check in",
  lamb_check: "Run a Lamb check in",
  modes: "List modes in",
  overlay: "Preview an overlay in",
  route: "Route with",
  "append-preview": "Preview a log row in",
  "verify-canonical": "Verify canonical JSON in",
  "fold-preview": "Fold text with",
  "unfold-preview": "Unfold a preview in",
  "hash-preview": "Hash bytes in",
  "canon-preview": "Hash a ledger row in",
  example: "Show an example from",
  "search-options": "List search options in",
  queries: "Render search queries in",
  "doe-match": "Rank Doe leads in",
  coverage: "Show coverage in",
  map: "Show the casebook in",
  search: "Search",
  health: "Check liveness of",
  skill: "Read how to use",
};

const PREFERRED_FIELD_KEYS = [
  "score",
  "triple",
  "type",
  "ok",
  "pass",
  "gate",
  "ratio",
  "status",
  "hash",
  "sha256",
  "receipt_id",
  "id",
  "mode",
  "confidence",
  "verdict",
  "kind",
  "bytes_in",
  "bytes_out",
  "folded",
  "product",
  "version",
  "ran_in",
  "true_engine_runtime",
];

export function isAdvancedToolName(name, op) {
  const n = String(name || "");
  const action = String(op || "");
  if (n.startsWith("runtime_session_")) return true;
  if (n === "runtime_manifest") return true;
  if (n.endsWith("_health") || action === "health") return true;
  return false;
}

export function markAdvanced(description) {
  const text = String(description || "").trim();
  if (text.startsWith(ADVANCED_PREFIX)) return text;
  return `${ADVANCED_PREFIX} ${text}`;
}

export function productVerbTitle(product, op) {
  const slug = product && product.slug ? product.slug : "software";
  const name = product && product.name ? product.name : slug;
  const action = String(op || "").trim();
  const override = TITLE_OVERRIDES[`${slug}:${action}`];
  if (override) return override;
  const verb = OP_VERBS[action];
  if (verb) return `${verb} ${name}`;
  const pretty = action.replace(/-/g, " ").replace(/_/g, " ");
  return `${pretty} — ${name}`;
}

export function preferredProductVerb(product) {
  const ops = (product && product.ops) || [];
  const primary = ops.find((o) => o.op !== "health" && o.op !== "skill");
  const pick = primary || ops[0];
  if (!pick) return product && product.slug ? `${product.slug}_skill` : "runtime_run";
  return `${product.slug}_${pick.op}`;
}

export function productToolDescription(product, opSpec) {
  const action = opSpec && opSpec.op ? opSpec.op : "";
  const title = productVerbTitle(product, action);
  const one = (product && (product.oneLine || product.name)) || title;
  const advanced = action === "health";
  let desc;
  if (action === "health") {
    desc = `${title}. Prefer ${preferredProductVerb(product)} for using ${product.name} as software.`;
  } else if (action === "skill") {
    desc = `Read how to use ${product.name} like software in this chat. ${one}`;
  } else {
    desc = `${title}. Show the output to the user, then take the next input. ${one}`;
  }
  return advanced ? markAdvanced(desc) : desc;
}

export function productInputHint(product, opSpec) {
  const action = opSpec && opSpec.op ? opSpec.op : "this op";
  const name = product && product.name ? product.name : "this software";
  const example = product && product.example && typeof product.example === "object" ? product.example : null;
  const keys = example
    ? Object.keys(example).filter((k) => example[k] !== undefined && k !== "b64")
    : [];
  const pass = keys.length ? `Pass { ${keys.slice(0, 8).join(", ")} }.` : `Pass the fields ${name} needs for ${action}.`;
  const limit = product && product.banner ? shortClause(product.banner) : "";
  return limit ? `${pass} ${limit}` : pass;
}

export function displayEnvelope({ title, summary, fields, result, receipt, session_id, next }) {
  const display = {
    title: title || "Result",
    summary: summary == null ? "" : String(summary),
  };
  if (fields && fields.length) display.fields = fields;
  if (next) display.next = next;
  const out = {
    display,
    result: result === undefined ? null : result,
  };
  if (receipt !== undefined && receipt !== null) out.receipt = receipt;
  if (session_id) out.session_id = session_id;
  return out;
}

export function looksLikeEnvelope(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.display &&
      typeof value.display === "object" &&
      Object.prototype.hasOwnProperty.call(value, "result"),
  );
}

export function fieldsFromResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  const fields = [];
  const seen = new Set();
  for (const key of PREFERRED_FIELD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(result, key)) continue;
    if (!isDisplayable(result[key])) continue;
    fields.push({ label: labelize(key), value: stringifyField(result[key]) });
    seen.add(key);
  }
  for (const [key, value] of Object.entries(result)) {
    if (fields.length >= 8) break;
    if (seen.has(key)) continue;
    if (key === "markdown" || key === "skill" || key === "html" || key === "png_b64" || key === "b64") continue;
    if (!isDisplayable(value)) continue;
    fields.push({ label: labelize(key), value: stringifyField(value) });
  }
  return fields.length ? fields : undefined;
}

export function summaryFromResult(result, fallbackText, product) {
  if (result && typeof result === "object") {
    if (typeof result.summary === "string" && result.summary.trim()) return clip(result.summary, 360);
    if (typeof result.note === "string" && result.note.trim()) return clip(result.note, 360);
    if (typeof result.limitation === "string" && result.limitation.trim()) return clip(result.limitation, 360);
    if (typeof result.markdown === "string" && result.markdown.trim()) return firstMarkdownLead(result.markdown);
    if (result.error) return clip(String(result.error), 360);
    if (result.ok === false) return product ? `${product.name} returned an error.` : "The software returned an error.";
    if (result.score != null) return `${product ? product.name + " score: " : "Score: "}${stringifyField(result.score)}`;
    if (result.triple != null) return `${product ? product.name + " triple: " : "Triple: "}${stringifyField(result.triple)}`;
    if (result.ok === true && product) return `${product.name} finished. Show this output, then take the next input.`;
  }
  if (typeof fallbackText === "string" && fallbackText.trim() && !fallbackText.trim().startsWith("{")) {
    return firstMarkdownLead(fallbackText);
  }
  return product
    ? `${product.name} finished. Show this output to the user, then take the next input.`
    : "Finished. Show this output to the user, then take the next input.";
}

export function attachExecDisplay({ product, slug, op, parsedBody, receipt, session_id }) {
  const name = product && product.name ? product.name : slug || "Software";
  const title = product ? productVerbTitle(product, op) : `${op} — ${name}`;
  return displayEnvelope({
    title,
    summary: summaryFromResult(parsedBody, null, product || { name }),
    fields: fieldsFromResult(parsedBody),
    result: parsedBody,
    receipt,
    session_id,
    next: `Show this ${name} output to the user, then take the next input.`,
  });
}

export function wrapToolOutput({ name, text, status, product, op, extra }) {
  let parsed = null;
  if (typeof text === "string" && text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (looksLikeEnvelope(parsed)) return parsed;
  if (parsed && parsed.exec && (parsed.receipt || (parsed.exec && parsed.exec.result !== undefined))) {
    const slug = (parsed.exec && parsed.exec.slug) || (product && product.slug);
    const action = (parsed.exec && parsed.exec.op) || op;
    return attachExecDisplay({
      product,
      slug,
      op: action,
      parsedBody: parsed.exec.result !== undefined ? parsed.exec.result : parsed.exec,
      receipt: parsed.receipt,
      session_id: (extra && extra.session_id) || (parsed.session && parsed.session.id),
    });
  }
  const skillLike =
    name === "runtime_skill" ||
    (typeof name === "string" && name.endsWith("_skill")) ||
    (typeof text === "string" && (text.startsWith("#") || text.startsWith("---")));
  if (skillLike && parsed === null) {
    return displayEnvelope({
      title: product ? `How to use ${product.name}` : "Aziel Eliab Runtime",
      summary: firstMarkdownLead(text),
      result: { markdown: text },
      next: product
        ? `Then open ${product.name} and take the next input.`
        : "Then open a product tool (or runtime_run) and take the next input.",
    });
  }
  const title = product
    ? productVerbTitle(product, op)
    : titleFromToolName(name);
  const next = product
    ? `Show this ${product.name} output to the user, then take the next input.`
    : "Show this output to the user, then take the next input.";
  return displayEnvelope({
    title: status >= 400 ? `${title} (error)` : title,
    summary: summaryFromResult(parsed, text, product),
    fields: fieldsFromResult(parsed),
    result: parsed !== null ? parsed : { text: text == null ? "" : String(text) },
    receipt: extra && extra.receipt,
    session_id: extra && extra.session_id,
    next,
  });
}

export function formatDisplayText(envelope) {
  const d = (envelope && envelope.display) || {};
  const lines = [];
  if (d.title) lines.push(d.title, "");
  if (d.summary) lines.push(d.summary, "");
  if (Array.isArray(d.fields)) {
    for (const field of d.fields) {
      lines.push(`${field.label}: ${field.value}`);
    }
    if (d.fields.length) lines.push("");
  }
  if (d.next) lines.push(d.next, "");
  lines.push(JSON.stringify(envelope, null, 2));
  return lines.join("\n");
}

export function mcpContentText(name, envelope, rawText) {
  if (name === "runtime_skill" || (typeof name === "string" && name.endsWith("_skill"))) {
    const md = (envelope.result && envelope.result.markdown) || rawText || "";
    return `${(envelope.display && envelope.display.title) || "Skill"}\n\n${md}`;
  }
  return formatDisplayText(envelope);
}

function titleFromToolName(name) {
  const n = String(name || "Result");
  if (n === "runtime_run") return "Use Aziel Eliab software";
  if (n === "runtime_skill") return "Aziel Eliab Runtime";
  if (n === "runtime_bundle") return "Product list";
  if (n === "runtime_pull") return "Opened product";
  if (n === "runtime_manifest") return "Runtime manifest";
  return n.replace(/_/g, " ");
}

function firstMarkdownLead(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l !== "---" && !l.startsWith("name:") && !l.startsWith("description:"));
  const lead = lines.find((l) => !l.startsWith("#") && !l.startsWith(">") && !l.startsWith("-")) || lines[0] || "";
  return clip(lead.replace(/^#+\s*/, ""), 360);
}

function shortClause(text) {
  const one = String(text || "").split(/[.|\n]/)[0] || "";
  return clip(one.trim(), 180);
}

function isDisplayable(value) {
  const t = typeof value;
  if (t === "number" || t === "boolean") return true;
  if (t === "string") return value.length > 0 && value.length <= 240 && !value.includes("\n\n");
  return false;
}

function stringifyField(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function labelize(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/-/g, " ");
}

function clip(text, max) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

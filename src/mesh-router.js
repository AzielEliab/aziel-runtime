/**
 * MESH-ADAPT-1.0 — free-text route onto a live Softwares slug and op.
 *
 * The catalog argument is the source of truth (GET /v1/software rows).
 * This module does not add Softwares, version ids, or routes.
 * Lamb Lens runs first: Service, then Clarity, then Peace.
 * An unclear question stays with AZAI Guide. A write waits for confirm.
 * dry_run previews and does not run.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { RUN_ACTION, displayEnvelope, productVerbTitle } from "./display.js";
import { guideFlow, guideIntent, lensFirst } from "./guide-reason.js";

export const MESH_ROUTER_SPEC = "MESH-ADAPT-1.0";

/** Ops a clear question may run without confirm. Everything else waits. */
const AUTO_OPS = new Set([
  "health",
  "skill",
  "doctor",
  "status",
  "search",
  "ethical_search",
  "guide",
  "gates",
  "models",
  "example",
  "modes",
  "targets",
  "tip",
  "tip-pack",
  "frame_status",
  "page_cycle_status",
  "blank_key_status",
  "sandbox_status",
  "transport_status",
  "pair_status",
  "genesis_status",
  "patterns",
  "advisory",
  "advise",
  "peers",
  "anchors",
  "lamb-check",
  "lamb_check",
]);

const AUTO_PREFER = [
  "health",
  "skill",
  "doctor",
  "status",
  "search",
  "ethical_search",
  "guide",
  "gates",
  "models",
  "example",
  "modes",
  "targets",
  "tip",
  "tip-pack",
  "frame_status",
  "page_cycle_status",
  "blank_key_status",
  "sandbox_status",
  "transport_status",
  "pair_status",
  "genesis_status",
  "patterns",
  "advisory",
  "advise",
  "peers",
  "anchors",
];

const VERB_OPS = [
  [/\b(health|healthy|alive|liveness)\b/, ["health"]],
  [/\bdoctor\b/, ["doctor"]],
  [/\bskill\b/, ["skill"]],
  [/\b(search|find|look up)\b/, ["search", "ethical_search"]],
  [/\bfold\b/, ["fold-preview"]],
  [/\bunfold\b/, ["unfold-preview"]],
  [/\bscore\b/, ["score"]],
  [/\bguide\b/, ["guide"]],
  [/\blamb\b/, ["lamb-check", "lamb_check"]],
  [/\bpigment\b/, ["pigment"]],
  [/\boverlay\b/, ["overlay"]],
  [/\brender\b/, ["render"]],
  [/\bverify\b/, ["verify", "pack-verify", "verify-backfill"]],
];

/**
 * Phrase hints. A hint counts only when that slug is already on the catalog
 * passed in. Missing slugs are ignored. Ask Jeeves is not a hint target.
 */
const HINTS = Object.freeze({
  foldlock: ["fold", "unfold", "foldlock"],
  godlock: ["godlock"],
  decisiongate: ["decisiongate", "decision gate"],
  "aziel-corpus": ["corpus", "florence", "aziel corpus"],
  spectrallock: ["spectrallock", "spectral lock", "pigment", "overlay"],
  azai: ["azai"],
  azbrowser: ["azbrowser", "ethical search"],
  codelock: ["codelock", "code lock"],
  glossafilter: ["glossafilter", "glossa"],
  "4dmap": ["4dmap", "4d map"],
  peacelock: ["peacelock", "peace lock"],
  vibelock: ["vibelock", "vibe lock", "deepfake"],
  forgereceipts: ["forgereceipts", "forge receipt"],
  azclce: ["azclce", "az-clce"],
  azcoherence: ["azcoherence"],
  staticclock: ["staticclock", "static clock"],
  chronolock: ["chronolock"],
  embryolock: ["embryolock"],
  azhub: ["azhub", "blank key"],
  azinterface: ["azinterface", "page cycle"],
  azmail: ["azmail"],
  azchat: ["azchat"],
  aznet: ["aznet"],
  azvpn: ["azvpn"],
  miragegrid: ["miragegrid"],
  whitestone: ["whitestone"],
  postking: ["postking", "chess"],
  zsolver: ["zsolver"],
  trajectorylock: ["trajectorylock", "trajectory"],
  shadowlock: ["shadowlock"],
  mialock: ["mialock"],
  whistlelock: ["whistlelock"],
  employeelock: ["employeelock"],
  temporallock: ["temporallock"],
  zkattest: ["zkattest"],
  azos: ["azos", "az-os"],
  azbot: ["azbot"],
  toolbench: ["toolbench"],
  ark: ["ark vault"],
  mmconsensus: ["mmconsensus"],
  azieltether: ["azieltether"],
  veillock: ["veillock", "veil lock"],
});

const QUESTION_OPS = new Set(["search", "ethical_search", "guide", "ask", "jeeves", "lamb-check", "lamb_check"]);

export function meshQuestionOf(args) {
  if (!args || typeof args !== "object") return "";
  const raw = args.q != null ? args.q : args.question != null ? args.question : args.text != null ? args.text : "";
  if (typeof raw !== "string") return "";
  return raw.trim();
}

export function explicitRouteTarget(args) {
  if (!args || typeof args !== "object") return false;
  return String(args.slug || args.product || args.name || "").trim().length > 0;
}

function hasPhrase(hay, phrase) {
  const text = String(phrase || "").toLowerCase().trim();
  if (!text) return false;
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(hay);
}

function mentionsOp(hay, op) {
  const raw = String(op || "").toLowerCase();
  if (raw.length < 3) return false;
  const spaced = raw.replace(/-/g, " ").replace(/_/g, " ");
  return hasPhrase(hay, raw) || (spaced !== raw && hasPhrase(hay, spaced));
}

function normalizeCatalog(catalog) {
  const rows = [];
  const seen = new Set();
  for (const card of catalog || []) {
    if (!card || typeof card !== "object") continue;
    const slug = String(card.slug || "").trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    if (slug === "jeeves" || slug === "ask-jeeves") continue;
    seen.add(slug);
    const ops = Array.isArray(card.public_door_ops)
      ? card.public_door_ops.map((op) => String(op))
      : Array.isArray(card.ops)
        ? card.ops.map((op) => String(op))
        : [];
    rows.push({
      slug,
      name: String(card.name || slug),
      one_line: String(card.one_line || ""),
      status: String(card.status || card.fraggate_status || ""),
      public_door: card.public_door === true || card.open_live_door === true,
      ops,
    });
  }
  return rows;
}

function namesSlug(hay, cards) {
  return cards.some((card) => hasPhrase(hay, card.slug) || hasPhrase(hay, card.slug.replace(/-/g, " ")));
}

function scoreCard(hay, card) {
  let score = 0;
  if (hasPhrase(hay, card.slug) || hasPhrase(hay, card.slug.replace(/-/g, " "))) score += 10;
  const name = card.name.toLowerCase();
  if (name.length >= 4 && hasPhrase(hay, name)) score += 8;
  for (const phrase of HINTS[card.slug] || []) {
    if (hasPhrase(hay, phrase)) score += 6;
  }
  const words = card.one_line.toLowerCase().match(/[a-z]{5,}/g) || [];
  let line = 0;
  for (const word of words) {
    if (word === "jeeves" || word === "software" || word === "softwares") continue;
    if (hasPhrase(hay, word)) line += 1;
    if (line >= 3) break;
  }
  score += line;
  for (const op of card.ops) {
    if (mentionsOp(hay, op)) score += 4;
  }
  return score;
}

function pickOp(hay, card) {
  const named = card.ops.filter((op) => mentionsOp(hay, op)).sort((a, b) => b.length - a.length);
  if (named.length) return named[0];
  for (const [pattern, ops] of VERB_OPS) {
    if (!pattern.test(hay)) continue;
    const hit = ops.find((op) => card.ops.includes(op));
    if (hit) return hit;
  }
  return AUTO_PREFER.find((op) => card.ops.includes(op)) || null;
}

function payloadFor(question, op, given) {
  if (given && typeof given === "object" && !Array.isArray(given) && Object.keys(given).length) return given;
  if (QUESTION_OPS.has(op)) return { q: question };
  return {};
}

function lensView(lens) {
  return {
    order: ["Service", "Clarity", "Peace"],
    service: lens.service,
    clarity: lens.clarity,
    peace: lens.peace,
    overall: lens.overall,
    decision: lens.decision,
    blocked: lens.blocked === true,
    held: lens.held === true,
    believed: false,
  };
}

function lensFields(lens) {
  return [
    { label: "Service", value: String(lens.service || "") },
    { label: "Clarity", value: String(lens.clarity || "") },
    { label: "Peace", value: String(lens.peace || "") },
  ];
}

function base(question, cards, lens, extra) {
  return {
    ok: extra.ok !== false,
    spec: MESH_ROUTER_SPEC,
    author: "Aziel Eliab",
    identity: "Aziel Eliab only",
    question,
    catalog_count: cards.length,
    invented: false,
    software_tab_added: false,
    ask_jeeves_is_software: false,
    lens: lensView(lens),
    routed: false,
    slug: null,
    op: null,
    name: null,
    candidates: [],
    clarify: false,
    clarify_question: null,
    guide: "azai",
    dispatch: false,
    needs_confirm: false,
    dry_run: extra.dry_run === true,
    mutated: false,
    payload: {},
    display: {
      action: RUN_ACTION,
      title: extra.title || "Ask AZAI Guide",
      summary: extra.summary || "",
      fields: lensFields(lens),
    },
    ...extra.rest,
  };
}

function clarify(question, cards, lens, summary, candidates, dryRun, flow) {
  const names = (candidates || []).map((row) => row.slug).filter(Boolean);
  const which = names.length ? ` Name one of ${names.join(", ")}.` : "";
  const ask = `Ask AZAI Guide. That question does not pick one Software.${which}`;
  return base(question, cards, lens, {
    ok: true,
    dry_run: dryRun,
    title: (flow && flow.title) || "Ask AZAI Guide",
    summary,
    rest: {
      clarify: true,
      clarify_question: ask,
      candidates: candidates || [],
      suite_command: flow && flow.command ? flow.command : null,
      command_prompts: flow && flow.prompts ? flow.prompts : null,
      softwares: flow && flow.softwares ? flow.softwares : null,
    },
  });
}

/** Display envelope for a route that did not execute. */
export function meshPreviewEnvelope(decision) {
  const row = decision && typeof decision === "object" ? decision : {};
  const display = row.display && typeof row.display === "object" ? row.display : {};
  const envelope = displayEnvelope({
    title: display.title || "Ask AZAI Guide",
    summary: display.summary || "",
    fields: display.fields,
    result: row,
    dryRun: row.dispatch !== true,
  });
  envelope.ok = row.ok !== false && row.needs_confirm !== true;
  envelope.mutated = false;
  envelope.dry_run = row.dispatch !== true;
  envelope.spec = MESH_ROUTER_SPEC;
  envelope.author = "Aziel Eliab";
  if (row.code) envelope.code = row.code;
  if (row.needs_confirm) envelope.code = "MCP-CONFIRM-REQUIRED";
  return envelope;
}

/**
 * Pick a catalog slug and op. Does not execute.
 * `catalog` must be live Softwares rows. Rows not in that list are never added.
 */
export function routeMesh({ question, catalog, confirm = false, dry_run = false, payload = null } = {}) {
  const text = typeof question === "string" ? question.trim() : "";
  const cards = normalizeCatalog(catalog);
  const lens = lensFirst(text);
  if (!text || text.length > 500 || /[\u0000-\u001f\u007f]/.test(text)) {
    return base(text, cards, lens, {
      ok: false,
      dry_run: dry_run === true,
      title: "Ask AZAI Guide",
      summary: "A question is one short line. Nothing ran.",
      rest: { code: "MR-QUESTION" },
    });
  }
  if (lens.blocked) {
    return base(text, cards, lens, {
      ok: false,
      dry_run: dry_run === true,
      title: "Ask AZAI Guide",
      summary: "Lamb Lens refused that question before a Software was chosen. Nothing ran.",
      rest: { code: "MR-LENS-REFUSE", clarify: true, clarify_question: "Ask AZAI Guide. Lamb Lens refused that question." },
    });
  }
  const hay = text.toLowerCase();
  const named = namesSlug(hay, cards);
  if (lens.held || (/\bjeeves\b/.test(hay) && !named) || (guideIntent(text) !== "custom" && !named)) {
    const flow = lens.held ? null : guideFlow(text, cards, null);
    let summary;
    if (flow && flow.answer) {
      const tail = /\bjeeves\b/.test(hay)
        ? "Ask Jeeves is suite help, software_tab false. Nothing ran."
        : "Nothing ran.";
      summary = `${flow.answer}\n\n${tail}`;
    } else if (/\bjeeves\b/.test(hay)) {
      summary = "Ask Jeeves is suite help, not a Softwares card. Nothing ran.";
    } else {
      summary = "That question stays with AZAI Guide. Nothing ran.";
    }
    return clarify(text, cards, lens, summary, [], dry_run === true, flow);
  }

  const ranked = cards
    .map((card) => ({ card, score: scoreCard(hay, card) }))
    .filter((row) => row.score >= 6)
    .sort((a, b) => b.score - a.score || a.card.slug.localeCompare(b.card.slug));
  const candidates = ranked.slice(0, 3).map((row) => ({
    slug: row.card.slug,
    name: row.card.name,
    score: row.score,
    op: pickOp(hay, row.card),
  }));
  if (!ranked.length) {
    return clarify(text, cards, lens, "No catalog Software matched. Nothing ran.", [], dry_run === true);
  }
  const best = ranked[0];
  const second = ranked[1];
  if (second && best.card.slug !== second.card.slug && best.score - second.score < 3) {
    return clarify(
      text,
      cards,
      lens,
      "More than one Software matches. Nothing ran.",
      candidates,
      dry_run === true,
    );
  }

  const card = best.card;
  const op = pickOp(hay, card);
  if (!card.public_door || !card.ops.length || !op) {
    return clarify(
      text,
      cards,
      lens,
      `${card.name} is on the catalog and has no public door op for that question. Nothing ran.`,
      [{ slug: card.slug, name: card.name, score: best.score, op: op || null }],
      dry_run === true,
    );
  }

  const auto = AUTO_OPS.has(op);
  const confirmed = confirm === true;
  const preview = dry_run === true;
  const dispatch = !preview && (auto || confirmed);
  const title = productVerbTitle({ slug: card.slug, name: card.name }, op);
  const summary = preview
    ? `${RUN_ACTION} would use ${card.name}. Nothing ran.`
    : dispatch
      ? `${RUN_ACTION} — ${title}.`
      : `${title} waits for confirm. Nothing ran.`;
  return base(text, cards, lens, {
    ok: true,
    dry_run: preview || !dispatch,
    title,
    summary,
    rest: {
      routed: true,
      slug: card.slug,
      op,
      name: card.name,
      candidates,
      clarify: !dispatch,
      clarify_question: dispatch ? null : preview ? null : `Confirm to run ${title}.`,
      dispatch,
      needs_confirm: !preview && !dispatch,
      payload: payloadFor(text, op, payload),
    },
  });
}

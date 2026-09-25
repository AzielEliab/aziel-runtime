/**
 * Cross-user adaptive help for Ask Jeeves and AZAI Guide.
 * The shared store keeps aggregated counts: topic, assertion, corpus status,
 * and allowlisted UI hashes. It does not keep raw questions, names, mail,
 * secrets, or session ids. A learned sentence is a candidate: Lamb Lens, then
 * the same triad scorer as any other source. It is not believed.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { lensFirst, scoreCandidate } from "./guide-reason.js";
import { isTruthyFlag } from "./mcp-safeguard.js";
import { UI_DOMAINS } from "./ui-domains.js";

export const ADAPT_SPEC = "JEEVES-ADAPT-1.0";
export const ADAPT_KEY = "jeeves-adapt-v1";
export const ADAPT_MIN_ASKS = 2;

const TOPIC_LABELS = Object.freeze({
  version: "the suite version",
  version_id: "version ids",
  software_count: "the Softwares count",
  domain_tabs: "domain tabs",
  corpus_subtab: "the Corpus sub-tab",
  receipts: "receipts and dry_run",
  fraggate: "FragGate Run",
  mesh: "mesh awareness",
  intro: "where to click first",
  "4dmap": "4DMap",
  software_card: "a Softwares card",
  library: "the library shelf",
  outside: "an outside question",
  custom: "a custom question",
  lamb_lens: "a lens stop",
  refused: "a refused ask",
  easter_eggs: "easter eggs",
});

const TEACH = Object.freeze({
  domain_tabs: "Click a top-bar domain tab. Corpus research stays the Elroi sub-tab.",
  corpus_subtab: "Open Aziel Elroi Eliab, then the Corpus sub-tab.",
  fraggate: "Open the Software's domain tab, then Run. That posts through FragGate.",
  receipts: "Seal needs the confirm box. dry_run stores nothing.",
  version: "The suite version is on this help path. No version_id is invented.",
  software_count: "Softwares stay the cards already on the domain tabs. Ask Jeeves is not one of them.",
  intro: "Start with a suggested question, then the next hash link.",
  library: "Open the Library tab for the Aziel Corpus and Whitestone cards, or the Corpus sub-tab for the shelf.",
  outside: "Outside questions are allowed. Nothing outside the shelf is asserted from this count.",
});

const PII_RE =
  /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|\b\d{3}[-. ]\d{2,3}[-. ]\d{4}\b|\b(password|passwd|secret|api[_-]?key|bearer\s+[a-z0-9._-]{8,}|credential|ssn)\b/i;

const SESSION_RE = /^[a-z0-9_-]{8,40}$/i;

let memoryDoc = emptyDoc();
const sessions = new Map();

function emptyDoc() {
  return {
    spec: ADAPT_SPEC,
    raw_text_stored: false,
    pii_stored: false,
    believed: false,
    topics: {},
    withheld: 0,
    desks: { jeeves: 0, azai: 0 },
    last_receipt_hash: null,
    writes: 0,
  };
}

export function resetAdaptiveForTests() {
  memoryDoc = emptyDoc();
  sessions.clear();
}

export function containsPii(text) {
  return PII_RE.test(String(text || ""));
}

function allowlistedHrefs() {
  const set = new Set(["#elroi-corpus", "#elroi-jeeves", "#ask-jeeves", "#corpus-fold-pack", "#interface-panel", "#desk-forensic", "#desk-mesh", "#mesh-panel"]);
  for (const domain of UI_DOMAINS) set.add(`#domain-tab-${domain.id}`);
  return set;
}

export function allowHref(value) {
  const href = String(value || "").trim();
  if (!href.startsWith("#")) return null;
  if (!allowlistedHrefs().has(href)) return null;
  return href;
}

function kvOf(env) {
  if (env && env.JEEVES_ADAPT && typeof env.JEEVES_ADAPT.get === "function" && typeof env.JEEVES_ADAPT.put === "function") {
    return { binding: env.JEEVES_ADAPT, name: "JEEVES_ADAPT" };
  }
  if (env && env.USES && typeof env.USES.get === "function" && typeof env.USES.put === "function") {
    return { binding: env.USES, name: "USES" };
  }
  return null;
}

function parseDoc(raw) {
  if (!raw) return null;
  try {
    const doc = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!doc || doc.spec !== ADAPT_SPEC || !doc.topics) return null;
    doc.raw_text_stored = false;
    doc.pii_stored = false;
    doc.believed = false;
    return doc;
  } catch {
    return null;
  }
}

async function load(env) {
  const kv = kvOf(env);
  if (kv) {
    const raw = await kv.binding.get(ADAPT_KEY);
    const parsed = parseDoc(raw);
    if (parsed) {
      memoryDoc = parsed;
      return { doc: memoryDoc, store: "kv", binding: kv.name };
    }
  }
  return { doc: memoryDoc, store: kv ? "kv" : "isolate-memory", binding: kv ? kv.name : null };
}

async function save(env, doc) {
  doc.raw_text_stored = false;
  doc.pii_stored = false;
  doc.believed = false;
  memoryDoc = doc;
  const kv = kvOf(env);
  if (kv) await kv.binding.put(ADAPT_KEY, JSON.stringify(doc));
  return { store: kv ? "kv" : "isolate-memory", binding: kv ? kv.name : null };
}

function topicRow(doc, topic) {
  if (!doc.topics[topic]) {
    doc.topics[topic] = { asks: 0, assertions: {}, corpus: {}, hrefs: {}, helped: {} };
  }
  return doc.topics[topic];
}

function bump(bag, key) {
  if (!key) return;
  bag[key] = (bag[key] || 0) + 1;
}

function topKey(bag) {
  let best = null;
  let n = 0;
  for (const [key, count] of Object.entries(bag || {})) {
    if (count > n) {
      best = key;
      n = count;
    }
  }
  return best ? { key: best, count: n } : null;
}

function hintFor(topic, row) {
  if (!row || row.asks < ADAPT_MIN_ASKS) return null;
  const helpedTotal = Object.values(row.helped || {}).reduce((sum, n) => sum + n, 0);
  const bag = helpedTotal > 0 ? row.helped : row.hrefs;
  const top = topKey(bag);
  const uncertain = (row.assertions.uncertain || 0) + (row.assertions.conflict || 0);
  const confused = row.asks > 0 && uncertain / row.asks >= 0.5;
  const label = TOPIC_LABELS[topic] || "this help topic";
  const parts = [`Aggregated help: ${row.asks} asks about ${label}.`];
  if (top && top.count * 2 >= row.asks) parts.push(`${top.count} of them continued to ${top.key}.`);
  if (confused && TEACH[topic]) parts.push(TEACH[topic]);
  parts.push("This count is not a belief.");
  return { text: parts.join(" "), href: top ? top.key : null, asks: row.asks };
}

export function sessionProfile(sessionId) {
  const id = String(sessionId || "");
  if (!SESSION_RE.test(id)) return null;
  return sessions.get(id) || null;
}

export async function sharedSnapshot(env) {
  const loaded = await load(env);
  return JSON.parse(JSON.stringify(loaded.doc));
}

/**
 * Read the aggregate, maybe count this ask, and attach a lens-gated hint.
 * confirm writes. dry_run does not. A question with mail, a phone number,
 * or a secret word increments withheld and stores no topic.
 */
export async function applyAdaptive(reasoned, input, env, desk) {
  const src = input && typeof input === "object" ? input : {};
  const dry = isTruthyFlag(src.dry_run);
  const confirm = !dry && isTruthyFlag(src.confirm);
  const question = String(src.q || src.question || src.query || "");
  const loaded = await load(env);
  const doc = loaded.doc;
  const topic = reasoned && reasoned.topic && TOPIC_LABELS[reasoned.topic] ? reasoned.topic : reasoned && reasoned.topic ? "custom" : "custom";
  const pii = containsPii(question);
  let stored = false;
  let withheld = false;

  if (confirm && pii) {
    doc.withheld += 1;
    doc.writes += 1;
    await save(env, doc);
    stored = true;
    withheld = true;
  } else if (confirm && !pii) {
    const row = topicRow(doc, topic);
    row.asks += 1;
    const assertion = reasoned && reasoned.assertion ? String(reasoned.assertion) : "uncertain";
    bump(row.assertions, assertion);
    const corpus = reasoned && reasoned.epistemology && reasoned.epistemology.corpus && reasoned.epistemology.corpus.status;
    if (corpus) bump(row.corpus, corpus);
    const hrefs = Array.isArray(reasoned && reasoned.next_actions) ? reasoned.next_actions : [];
    for (const action of hrefs) {
      const href = allowHref(action && action.href);
      if (href) bump(row.hrefs, href);
    }
    const helped = allowHref(src.helped);
    if (helped) bump(row.helped, helped);
    if (desk === "azai" || desk === "jeeves") doc.desks[desk] += 1;
    doc.writes += 1;
    await save(env, doc);
    stored = true;
    const session = String(src.session || "");
    if (isTruthyFlag(src.profile) && SESSION_RE.test(session)) {
      sessions.set(session, { topic, href: helped || null });
    }
  }

  const fresh = await load(env);
  const row = fresh.doc.topics[topic] || null;
  const drafted = !pii && row ? hintFor(topic, row) : null;
  let shown = false;
  let candidate = null;
  let reason = pii ? "withheld" : drafted ? "ready" : "below-threshold";
  if (drafted) {
    const lens = lensFirst(drafted.text);
    if (lens.blocked || lens.held) {
      reason = lens.blocked ? "lamb-lens-refused" : "lamb-lens-held";
    } else {
      const scored = scoreCandidate({
        layer: "adaptive",
        id: topic,
        question: topic,
        text: drafted.text,
        hit: true,
      });
      candidate = {
        layer: "adaptive",
        topic,
        text: drafted.text,
        href: drafted.href,
        asks: drafted.asks,
        believed: false,
        authority: false,
        free_pass: false,
        lens_filtered: true,
        clce_triple: scored.clce_triple,
        triad: scored.triad,
      };
      shown = true;
    }
  }

  const adaptive = {
    spec: ADAPT_SPEC,
    believed: false,
    free_pass: false,
    authority: false,
    raw_text_stored: false,
    pii_stored: false,
    stored,
    withheld,
    dry_run: dry,
    confirm_required: !dry && !confirm,
    topic: pii ? null : topic,
    asks: row && !pii ? row.asks : 0,
    shown,
    reason,
    candidate,
    store: fresh.store,
    binding: fresh.binding,
    receipt_hash: fresh.doc.last_receipt_hash || null,
  };

  const next = Array.isArray(reasoned.next_actions) ? reasoned.next_actions.slice() : [];
  if (shown && candidate.href && !next.some((action) => action && action.href === candidate.href)) {
    next.unshift({ label: "Aggregated next step", href: candidate.href, learned: true, believed: false });
  }
  let answer = reasoned.answer || "";
  if (shown && candidate) {
    answer = `${answer}\n\nAdaptive (not believed, free_pass false): ${candidate.text}`;
  }
  return { ...reasoned, answer, next_actions: next, adaptive };
}

export async function sealAdaptive(env, hash) {
  const receipt = String(hash || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(receipt)) return { ok: false, sealed: false };
  const loaded = await load(env);
  loaded.doc.last_receipt_hash = receipt;
  await save(env, loaded.doc);
  return { ok: true, sealed: true, receipt_hash: receipt };
}

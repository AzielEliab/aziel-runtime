/**
 * Corpus-first guide for Ask Jeeves and AZAI.
 * Think order: clarify → pull the public shelf → pull this build's
 * Softwares roster and help graph → answer with the next click.
 * An empty or unreachable shelf is said out loud. No Softwares row,
 * version, or version_id is invented.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { search } from "./engines/aziel-corpus/engine.js";
import { jeevesShouldRefuse } from "./engines/aziel-corpus/jeeves.js";
import { SOFTWARE_COPY } from "./software-copy.js";
import { UI_DOMAINS } from "./ui-domains.js";
import { RUNTIME_VERSION } from "./runtime-api.js";

export const GUIDE_SPEC = "GUIDE-REASON-1.0";
export const SUITE_SOFTWARE_COUNT = 42;

export const GUIDE_STARTERS = Object.freeze([
  { q: "Where is Florence?", label: "Library: Florence" },
  { q: "How do the domain tabs work?", label: "Domain tabs" },
  { q: "Where is the Corpus sub-tab?", label: "Corpus sub-tab" },
  { q: "How do receipts and dry_run work?", label: "Receipts" },
  { q: "How do I run a Softwares card?", label: "FragGate Run" },
]);

const LAMB = Object.freeze(["Service", "Clarity", "Peace"]);

function roster() {
  const rows = [];
  for (const domain of UI_DOMAINS) {
    for (const slug of domain.softwares) {
      const copy = SOFTWARE_COPY[slug];
      rows.push({
        slug,
        domain: domain.id,
        domain_label: domain.label,
        one_line: copy && copy.one_line ? copy.one_line : null,
        href: `#domain-tab-${domain.id}`,
      });
    }
  }
  return rows;
}

export function suiteSoftwareRoster() {
  return roster();
}

function clarify(question) {
  const n = String(question || "").toLowerCase();
  let intent = "custom";
  if (/\bversion_id\b/.test(n)) intent = "version_id";
  else if (/\b(suite version|runtime version|what version|which version|current build|2\.0\.0)\b/.test(n)) intent = "version";
  else if (/\b(how many|count)\b/.test(n) && /\bsoftwares?\b/.test(n)) intent = "software_count";
  else if (/\b(domain tabs?|top-?bar|softwares tabs?)\b/.test(n) || (/\bhow do i\b/.test(n) && /\btabs?\b/.test(n))) intent = "domain_tabs";
  else if (/\b(elroi|sub-?tab|about aziel)\b/.test(n) && /\b(corpus|library|jeeves|tab)\b/.test(n)) intent = "corpus_subtab";
  else if (/\b(dry_run|dry run)\b/.test(n) || (/\bconfirm\b/.test(n) && /\b(seal|receipt|box)\b/.test(n)) || /\b(act-receipt|receipt fields|public chain)\b/.test(n)) intent = "receipts";
  else if (/\b(fraggate|run button|softwares card)\b/.test(n) || (/\bhow do i\b/.test(n) && /\b(run|click|use)\b/.test(n))) intent = "fraggate";
  else if (/\b(mesh|live nodes)\b/.test(n)) intent = "mesh";
  else if (/\b(ask jeeves|azai|onboarding|learning curve|where do i click|walkthrough)\b/.test(n)) intent = "intro";
  else if (/\b4dmap|pin\b/.test(n)) intent = "4dmap";
  return { question, intent };
}

function cardHits(question, cards) {
  const n = String(question || "").toLowerCase();
  return cards.filter((card) => {
    const slug = card.slug.toLowerCase();
    if (n.includes(slug)) return true;
    const spaced = slug.replace(/-/g, " ");
    return spaced !== slug && n.includes(spaced);
  }).slice(0, 3);
}

function flowAnswer(intent, cards) {
  const lines = UI_DOMAINS.map((domain) => `${domain.label} (${domain.id}): ${domain.softwares.join(", ")}`);
  if (intent === "domain_tabs") {
    return {
      topic: "domain_tabs",
      domains: UI_DOMAINS.map((domain) => ({ id: domain.id, label: domain.label, softwares: domain.softwares.slice() })),
      answer: `Suite ${RUNTIME_VERSION}. Click a top-bar domain tab. ${lines.join(". ")}. The Library tab groups aziel-corpus and whitestone. Corpus research is the Corpus sub-tab under Aziel Elroi Eliab (alternateName), not a top-bar domain. Those tabs are navigation. FragGate stays the single door.`,
      actions: [
        { label: "Open the Library tab", href: "#domain-tab-library" },
        { label: "Open the Corpus sub-tab", href: "#elroi-corpus" },
        { label: "Open Ask Jeeves", href: "#elroi-jeeves" },
      ],
    };
  }
  if (intent === "receipts") {
    return {
      topic: "receipts",
      answer: `Suite ${RUNTIME_VERSION}. Click Forensic on the interface desk for the audit tip. Receipt fields stay hash, request, output, and event, with attempt ids request_id, attempt_n, parent_receipt_id, and correlation_id. Seal needs the confirm box. dry_run stores nothing and does not dispatch. A confirmed seal can append the public chain only when RECEIPT_APPEND_TOKEN is set. Ask Jeeves and AZAI guide do not append that chain.`,
      actions: [
        { label: "Open the forensic desk", href: "#desk-forensic" },
        { label: "Open the Receipts tab", href: "#domain-tab-receipts" },
      ],
    };
  }
  if (intent === "version" || intent === "version_id") {
    const versionId =
      intent === "version_id"
        ? " No version_id is published on this help path. This reply does not invent one."
        : "";
    return {
      topic: "version",
      answer: `This build is aziel-runtime ${RUNTIME_VERSION}. Softwares count is ${cards.length}. Ask Jeeves is suite help on aziel-corpus op jeeves, software_tab false, not an extra Softwares card. tools/list stays 36.${versionId}`,
      actions: [{ label: "Open Ask Jeeves", href: "#elroi-jeeves" }],
    };
  }
  if (intent === "software_count") {
    return {
      topic: "software_count",
      answer: `Softwares count on this build is ${cards.length}. Ask Jeeves stays suite help with software_tab false and is not one of those cards.`,
      actions: [{ label: "Open the Library tab", href: "#domain-tab-library" }],
    };
  }
  if (intent === "corpus_subtab") {
    return {
      topic: "corpus_subtab",
      answer:
        "Click Aziel Elroi Eliab, then the Corpus sub-tab. Aziel Elroi Eliab is alternateName only. The primary name is Aziel Eliab. Corpus holds the FoldLock tip and the live library cite. Ask Jeeves is the sibling sub-tab. Neither is a top-bar domain. The Library top-bar tab still groups the Aziel Corpus and Whitestone cards.",
      actions: [
        { label: "Open the Corpus sub-tab", href: "#elroi-corpus" },
        { label: "Open Ask Jeeves", href: "#elroi-jeeves" },
        { label: "Open the Library tab", href: "#domain-tab-library" },
      ],
    };
  }
  if (intent === "fraggate") {
    return {
      topic: "fraggate",
      answer:
        "Click the domain tab for the Software, then Run on its card. That posts to POST /v1/fraggate/call with that card's slug and op. Agents use the same door: fraggate_list, then fraggate_describe, then fraggate_call. Seal on the interface desk and the AZBot Seal button still need the confirm box. This guide does not dispatch.",
      actions: [
        { label: "Open the interface desk", href: "#interface-panel" },
        { label: "Open the AI tab", href: "#domain-tab-ai" },
      ],
    };
  }
  if (intent === "mesh") {
    return {
      topic: "mesh",
      answer:
        "Click Mesh awareness on the interface desk, or open the mesh status panel. That tile does not join, heartbeat, leave, enable radios, or read Live Nodes. This guide did not read the roster and did not invent a node count.",
      actions: [
        { label: "Open mesh awareness", href: "#desk-mesh" },
        { label: "Open mesh status", href: "#mesh-panel" },
      ],
    };
  }
  if (intent === "4dmap") {
    return {
      topic: "4dmap",
      answer:
        "4DMap is on the Forensics tab. This guide does not query pins. A pin id is used only when you supply one on the AZAI Learn form, and that note says 4DMap was not queried.",
      actions: [{ label: "Open the Forensics tab", href: "#domain-tab-forensics" }],
    };
  }
  if (intent === "intro") {
    return {
      topic: "intro",
      answer: `Ask Jeeves and AZAI Guide walk this ${RUNTIME_VERSION} build. Click a suggested question, or type your own. Library text is pulled first. Suite clicks come from the ${cards.length} Softwares already on the domain tabs. Author Aziel Eliab only. Lamb Lens is Service, then Clarity, then Peace.`,
      actions: GUIDE_STARTERS.map((row) => ({ label: row.label, href: "#elroi-jeeves" })),
    };
  }
  return null;
}

function cardAnswer(hits) {
  if (!hits.length) return null;
  const lines = hits.map((card) => {
    const purpose = card.one_line || "This help graph has no catalog one_line for that slug.";
    return `${card.slug} is on the ${card.domain_label} tab. ${purpose} Click that tab, then the card.`;
  });
  return {
    topic: "software_card",
    answer: lines.join(" "),
    actions: hits.map((card) => ({ label: `Open ${card.domain_label}`, href: card.href })),
  };
}

async function pullCorpus(question, env) {
  try {
    const found = await search({ q: question }, env);
    const records = Array.isArray(found && found.records) ? found.records : [];
    const ranked = records.filter((rec) => {
      if (!Array.isArray(rec.matched)) return true;
      return rec.matched.some((tok) => String(tok).length >= 4);
    });
    const citations = ranked.slice(0, 5).map((rec) => ({
      record_id: rec.record_id || null,
      title: rec.title || null,
      author: rec.author || null,
      snippet: String(rec.snippet || rec.body || "").slice(0, 280),
      invented: false,
    }));
    return {
      ok: true,
      unreachable: false,
      live_d1: !!(found && found.live_d1),
      sample_master: !(found && found.live_d1),
      library_http: found && found.live_d1 ? "CORPUS_D1" : "not-probed",
      last_known_shelf: found && found.live_d1 ? "CORPUS_D1 records" : "bundled sample MASTER",
      citations,
      empty: citations.length === 0,
    };
  } catch (err) {
    let lastKnown = [];
    try {
      const sample = await search({ q: question }, {});
      const records = Array.isArray(sample && sample.records) ? sample.records : [];
      const ranked = records.filter((rec) => {
        if (!Array.isArray(rec.matched)) return true;
        return rec.matched.some((tok) => String(tok).length >= 4);
      });
      lastKnown = ranked.slice(0, 5).map((rec) => ({
        record_id: rec.record_id || null,
        title: rec.title || null,
        author: rec.author || null,
        snippet: String(rec.snippet || rec.body || "").slice(0, 280),
        invented: false,
        shelf: "last-known-sample-MASTER",
      }));
    } catch {
      lastKnown = [];
    }
    return {
      ok: true,
      unreachable: true,
      live_d1: false,
      sample_master: true,
      library_http: "unreachable",
      last_known_shelf: "bundled sample MASTER",
      citations: lastKnown,
      empty: lastKnown.length === 0,
      error: String((err && err.message) || err),
    };
  }
}

function leadFromCorpus(corpus) {
  if (!corpus.citations.length) return "";
  const lead = corpus.citations[0];
  const shelf = corpus.unreachable
    ? "Last-known bundled sample MASTER (the live shelf was unreachable). Not an invented visit."
    : corpus.live_d1
      ? "From CORPUS_D1 records. Not an invented visit."
      : "From the bundled sample MASTER. Live library HTTP was not probed. Not an invented visit.";
  return `${shelf} ${lead.title || lead.record_id} — ${lead.snippet}`;
}

export async function reasonGuide(question, env, { assistant = "Ask Jeeves" } = {}) {
  const q = String(question || "").trim().slice(0, 2000);
  const gate = jeevesShouldRefuse(q);
  if (gate.refuse) {
    return {
      ok: true,
      refused: true,
      assistant,
      answer: gate.reason,
      citations: [],
      image: null,
      blend: false,
      invented: false,
      invented_visits: false,
      library_search: false,
      library_http: "not-probed",
      software_tab: false,
      software_count: roster().length,
      author: "Aziel Eliab",
      identity: "Aziel Eliab",
      lamb_lens: LAMB.slice(),
    };
  }
  const cards = roster();
  const clarified = clarify(q);
  const corpus = await pullCorpus(q, env);
  const flow = flowAnswer(clarified.intent, cards);
  const hits = cardHits(q, cards);
  const card = flow ? null : cardAnswer(hits);
  const suite = flow || card;
  const shelfLead = leadFromCorpus(corpus);
  let answer;
  let known;
  if (suite && shelfLead) {
    answer = `${shelfLead}\n\n${suite.answer}`;
    known = corpus.unreachable ? "last-known-shelf-and-suite" : "corpus-and-suite";
  } else if (shelfLead && !suite) {
    answer = shelfLead;
    known = corpus.unreachable ? "last-known-shelf" : "corpus";
  } else if (suite) {
    const shelfNote = corpus.unreachable
      ? "The live shelf was unreachable. Last-known sample MASTER had no matching row. No shelf row was invented."
      : "The public shelf had no matching record. No shelf row was invented.";
    answer = `${suite.answer} ${shelfNote}`;
    known = "suite";
  } else {
    const shelfNote = corpus.unreachable
      ? "The live shelf was unreachable. Last-known sample MASTER had no matching row."
      : "The public shelf had no matching record.";
    answer = `${shelfNote} This build's help graph has no step for that question. Nothing was invented. Softwares count is ${cards.length}. Ask Jeeves is suite help, software_tab false.`;
    known = false;
  }
  if (clarified.intent === "version_id" && suite) {
    answer = suite.answer;
    if (shelfLead) answer = `${shelfLead}\n\n${answer}`;
  }
  const actions = suite && suite.actions
    ? suite.actions
    : corpus.citations.length
      ? [
          { label: "Open the Corpus sub-tab", href: "#elroi-corpus" },
          { label: "Open the Library tab", href: "#domain-tab-library" },
        ]
      : [
          { label: "Open Ask Jeeves", href: "#elroi-jeeves" },
          { label: "Open the interface desk", href: "#interface-panel" },
        ];
  const steps = [
    { id: "clarify", intent: clarified.intent, question: q },
    {
      id: "pull_corpus",
      library_http: corpus.library_http,
      last_known_shelf: corpus.last_known_shelf,
      hit_count: corpus.citations.length,
      unreachable: corpus.unreachable,
      invented: false,
    },
    {
      id: "pull_suite",
      version: RUNTIME_VERSION,
      software_count: cards.length,
      software_tab: false,
      matched_slugs: hits.map((cardRow) => cardRow.slug),
      invented: false,
    },
    { id: "reason", grounded_on: known },
    { id: "next", actions },
  ];
  return {
    ok: true,
    refused: false,
    assistant,
    spec: GUIDE_SPEC,
    source: known === "suite" || known === false ? (suite ? "interface-facts" : "unknown") : "corpus-first",
    topic: suite ? suite.topic : known === false ? "unknown" : "library",
    answer,
    known,
    steps,
    next_actions: actions,
    domains: suite && suite.domains ? suite.domains : null,
    citations: corpus.citations,
    version: RUNTIME_VERSION,
    software_count: cards.length,
    software_tab: false,
    image: null,
    grounded: known !== false,
    invented: false,
    invented_visits: false,
    library_search: true,
    library_http: corpus.library_http,
    last_known_shelf: corpus.last_known_shelf,
    unreachable: corpus.unreachable,
    empty: corpus.empty,
    live_d1: corpus.live_d1,
    sample_master: corpus.sample_master,
    blend: false,
    dispatched_fraggate: false,
    second_door: false,
    writes_public_chain: false,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    lamb_lens: LAMB.slice(),
  };
}

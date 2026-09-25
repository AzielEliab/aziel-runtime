/**
 * Epistemic guide for Ask Jeeves and AZAI.
 * Order is fixed: Lamb Lens (Service → Clarity → Peace) → corpus shelf →
 * any other source → suite triad (SPRE / CLCE / PhysLing) plus DecisionGATE.
 * Nothing is believed by default. A missing verifier leaves the triad final null.
 * No Softwares row, version, or version_id is invented.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { lambCheck } from "./engines/azai/engine.js";
import { search } from "./engines/aziel-corpus/engine.js";
import { THRESHOLD, VERY_LOW, score as clceScore } from "./engines/azclce/engine.js";
import { SCHEMA_TRIAD, assemble, unverified } from "./engines/azclce/triad.js";
import { check as decisiongateCheck } from "./engines/decisiongate/engine.js";
import { jeevesShouldRefuse } from "./engines/aziel-corpus/jeeves.js";
import { lambLensCheck } from "./lamblens.js";
import { SOFTWARE_COPY } from "./software-copy.js";
import { UI_DOMAINS } from "./ui-domains.js";
import { RUNTIME_VERSION } from "./runtime-api.js";

export const GUIDE_SPEC = "GUIDE-REASON-1.1";
export const EPISTEMIC_ORDER = Object.freeze(["lamb_lens", "corpus", "other_source", "triad"]);
export const SUITE_SOFTWARE_COUNT = 42;

export const GUIDE_STARTERS = Object.freeze([
  { q: "Where is Florence?", label: "Library: Florence" },
  { q: "How do the domain tabs work?", label: "Domain tabs" },
  { q: "Where is the Corpus sub-tab?", label: "Corpus sub-tab" },
  { q: "How do receipts and dry_run work?", label: "Receipts" },
  { q: "How do I run a Softwares card?", label: "FragGate Run" },
]);

const LAMB = Object.freeze(["Service", "Clarity", "Peace"]);

export function lensFirst(question) {
  const constitutional = lambCheck(question);
  const fabric = lambLensCheck({ text: question });
  const blocked = constitutional.overall === "FAIL" || fabric.decision === "REFUSE";
  const held = !blocked && (constitutional.overall === "CHECK" || fabric.decision === "HOLD-UNCERTAIN");
  return {
    order: LAMB.slice(),
    service: constitutional.service,
    clarity: constitutional.clarity,
    peace: constitutional.peace,
    overall: constitutional.overall,
    decision: fabric.decision,
    notes: constitutional.notes || [],
    reasons: fabric.reasons || [],
    prohibition_hits: fabric.prohibition_hits || [],
    honest: constitutional.honest,
    blocked,
    held,
    believed: false,
  };
}

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
      answer: `Ask Jeeves and AZAI Guide walk this ${RUNTIME_VERSION} build. Lamb Lens runs first (Service, then Clarity, then Peace), then the public shelf, then any other source. The suite triad sets how strongly this is asserted. Nothing is believed by default. Suite clicks come from the ${cards.length} Softwares already on the domain tabs. Author Aziel Eliab only.`,
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

function closedCorpus() {
  return {
    ok: true,
    unreachable: false,
    live_d1: false,
    sample_master: true,
    library_http: "not-consulted",
    last_known_shelf: "bundled sample MASTER",
    citations: [],
    empty: true,
    consulted: false,
  };
}

function whyLine(lens, corpusStatus, other, triad, dg, assertion) {
  const triple = triad.components.clce.score == null ? "null" : Number(triad.components.clce.score).toFixed(4);
  const final = triad.final.score == null ? "null" : String(triad.final.score);
  return `Why: Lamb Lens Service ${lens.service} / Clarity ${lens.clarity} / Peace ${lens.peace} (${lens.decision}). Corpus ${corpusStatus}. Other source ${other.status}, not authority. Triad ${triad.schema} final ${final} (${triad.final.verified_count}/3 verified). CLCE triple ${triple}. DecisionGATE ${dg.final_state}. Assertion ${assertion}. Believed: false.`;
}

export async function reasonGuide(question, env, { assistant = "Ask Jeeves" } = {}) {
  const q = String(question || "").trim().slice(0, 2000);
  const cards = roster();
  const lens = lensFirst(q);
  const baseFields = {
    ok: true,
    assistant,
    spec: GUIDE_SPEC,
    believed: false,
    provisional: true,
    invented: false,
    invented_visits: false,
    software_tab: false,
    software_count: cards.length,
    version: RUNTIME_VERSION,
    image: null,
    blend: false,
    dispatched_fraggate: false,
    second_door: false,
    writes_public_chain: false,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    lamb_lens: LAMB.slice(),
  };

  if (lens.blocked || lens.held) {
    const corpus = closedCorpus();
    const other = { status: "not-consulted", authority: false, kind: "none" };
    const clce = clceScore(q, "Corpus was not consulted.", "No other source was consulted.");
    const triad = assemble({ clce: clce.triad_component, spre: unverified("spre"), physling: unverified("physling") });
    const dg = decisiongateCheck({ statement: q });
    const assertion = lens.blocked ? "refused" : "held";
    const answer = lens.blocked
      ? `Lamb Lens stopped this before the shelf. ${lens.reasons.join(" ") || lens.notes.join(" ")} Nothing after the lens was treated as known.`
      : `Lamb Lens held this before the shelf (${lens.overall} / ${lens.decision}). ${lens.notes.join(" ")} No later source was treated as known.`;
    return {
      ...baseFields,
      refused: lens.blocked,
      held: lens.held,
      assertion,
      source: "lamb-lens",
      topic: "lamb_lens",
      answer: `${whyLine(lens, "not-consulted", other, triad, dg, assertion)}\n\n${answer}`,
      known: false,
      grounded: false,
      citations: [],
      library_search: false,
      library_http: "not-consulted",
      empty: true,
      live_d1: false,
      sample_master: true,
      epistemology: { order: EPISTEMIC_ORDER.slice(), believed: false, lamb_lens: lens, corpus: { status: "not-consulted", hit_count: 0 }, other_source: other, triad, decisiongate: { final_state: dg.final_state, blocked_at: dg.blocked_at, product: dg.product }, clce_triple: clce.triple, assertion },
      steps: [
        { id: "lamb_lens", order: LAMB.slice(), decision: lens.decision, overall: lens.overall, blocked: lens.blocked, held: lens.held },
        { id: "pull_corpus", consulted: false, hit_count: 0, invented: false },
        { id: "other_source", status: other.status, authority: false },
        { id: "triad", schema: triad.schema, ready: triad.final.ready, score: triad.final.score, decisiongate: dg.final_state },
      ],
      next_actions: [{ label: "Open Ask Jeeves", href: "#elroi-jeeves" }],
    };
  }

  const gate = jeevesShouldRefuse(q);
  if (gate.refuse) {
    return {
      ...baseFields,
      refused: true,
      assertion: "refused",
      source: "lamb-lens",
      topic: "refused",
      answer: `${whyLine(lens, "not-consulted", { status: "not-consulted", authority: false }, assemble({ clce: unverified("clce"), spre: unverified("spre"), physling: unverified("physling") }), decisiongateCheck({ statement: q }), "refused")}\n\n${gate.reason}`,
      citations: [],
      library_search: false,
      library_http: "not-consulted",
      known: false,
      grounded: false,
      steps: [
        { id: "lamb_lens", order: LAMB.slice(), decision: lens.decision, overall: lens.overall },
        { id: "pull_corpus", consulted: false, hit_count: 0 },
        { id: "other_source", status: "not-consulted", authority: false },
        { id: "triad", schema: SCHEMA_TRIAD, ready: false, score: null },
      ],
    };
  }

  const clarified = clarify(q);
  const corpus = await pullCorpus(q, env);
  corpus.consulted = true;
  const flow = flowAnswer(clarified.intent, cards);
  const hits = cardHits(q, cards);
  const card = flow ? null : cardAnswer(hits);
  const suite = flow || card;
  const outside = !suite && corpus.citations.length === 0;
  const other = suite
    ? { status: "suite-help-graph", kind: "this-build", authority: false, topic: suite.topic }
    : { status: "not-fetched", kind: "outside", authority: false, note: "No outside page was fetched. An outside question is allowed. It is not authority." };
  const shelfLead = leadFromCorpus(corpus);
  const corpusText = shelfLead || (corpus.unreachable ? "Live shelf unreachable. Last-known sample MASTER had no row." : "No public shelf row matched.");
  const otherText = suite ? suite.answer : "No other source was fetched.";
  const clce = clceScore(q, corpusText, otherText);
  const triad = assemble({
    clce: clce.triad_component,
    spre: unverified("spre"),
    physling: unverified("physling"),
  });
  let answerBody;
  let known;
  if (suite && shelfLead) {
    answerBody = `${shelfLead}\n\n${suite.answer}`;
    known = corpus.unreachable ? "last-known-shelf-and-suite" : "corpus-and-suite";
  } else if (shelfLead && !suite) {
    answerBody = `${shelfLead} This cite is provisional. It is not believed.`;
    known = corpus.unreachable ? "last-known-shelf" : "corpus";
  } else if (suite) {
    const shelfNote = corpus.unreachable
      ? "The live shelf was unreachable. Last-known sample MASTER had no matching row. No shelf row was invented."
      : "The public shelf had no matching record. No shelf row was invented.";
    answerBody = `${suite.answer} ${shelfNote}`;
    known = "suite";
  } else {
    const shelfNote = corpus.unreachable
      ? "The live shelf was unreachable. Last-known sample MASTER had no matching row."
      : "The public shelf had no matching record.";
    answerBody = `${shelfNote} Outside questions are allowed. No outside source was fetched, so nothing outside the shelf is asserted. What should be checked on the shelf or on a suite tab? Softwares count is ${cards.length}. Ask Jeeves is suite help, software_tab false.`;
    known = false;
  }
  if (clarified.intent === "version_id" && suite) {
    answerBody = suite.answer;
    if (shelfLead) answerBody = `${shelfLead}\n\n${answerBody}`;
  }
  const conflict = corpus.citations.length > 0 && !!suite && clce.triple < VERY_LOW;
  let assertion = "provisional";
  if (conflict) assertion = "conflict";
  else if (!corpus.citations.length && !suite) assertion = "uncertain";
  else if (!triad.final.ready) assertion = suite || corpus.citations.length ? "provisional" : "uncertain";
  const dg = decisiongateCheck({ statement: String(answerBody).slice(0, 800) });
  if (dg.final_state === "BLOCK") assertion = "refused";
  else if (dg.final_state !== "PASS" && assertion === "cite") assertion = "provisional";
  const corpusStatus = corpus.unreachable ? "unreachable" : corpus.citations.length ? "hit" : "miss";
  const why = whyLine(lens, corpusStatus, other, triad, dg, assertion);
  if (conflict) {
    answerBody = `${answerBody}\n\nThe question, the shelf, and the other source do not use the same words (CLCE triple ${clce.triple}). Which one should be checked?`;
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
    { id: "lamb_lens", order: LAMB.slice(), service: lens.service, clarity: lens.clarity, peace: lens.peace, decision: lens.decision, overall: lens.overall },
    {
      id: "pull_corpus",
      consulted: true,
      library_http: corpus.library_http,
      last_known_shelf: corpus.last_known_shelf,
      hit_count: corpus.citations.length,
      unreachable: corpus.unreachable,
      invented: false,
    },
    { id: "other_source", status: other.status, kind: other.kind, authority: false },
    {
      id: "triad",
      schema: triad.schema,
      ready: triad.final.ready,
      score: triad.final.score,
      clce_triple: clce.triple,
      decisiongate: dg.final_state,
      believed: false,
    },
  ];
  return {
    ...baseFields,
    refused: assertion === "refused",
    assertion,
    source: known === "suite" || known === false ? (suite ? "interface-facts" : outside ? "outside" : "unknown") : "corpus-first",
    topic: suite ? suite.topic : outside ? "outside" : "library",
    answer: `${why}\n\n${answerBody}`,
    known,
    grounded: known !== false,
    steps,
    next_actions: actions,
    domains: suite && suite.domains ? suite.domains : null,
    citations: corpus.citations,
    library_search: true,
    library_http: corpus.library_http,
    last_known_shelf: corpus.last_known_shelf,
    unreachable: corpus.unreachable,
    empty: corpus.empty,
    live_d1: corpus.live_d1,
    sample_master: corpus.sample_master,
    epistemology: {
      order: EPISTEMIC_ORDER.slice(),
      believed: false,
      lamb_lens: lens,
      corpus: { status: corpusStatus, hit_count: corpus.citations.length, library_http: corpus.library_http },
      other_source: other,
      triad,
      decisiongate: { final_state: dg.final_state, blocked_at: dg.blocked_at, product: dg.product, version: dg.version },
      clce_triple: clce.triple,
      clce_threshold: THRESHOLD,
      assertion,
    },
  };
}

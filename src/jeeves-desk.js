/**
 * Ask Jeeves suite help for the human interface.
 * Eggs and library search use the corpus jeeves engine.
 * Build answers use this runtime's domain tabs, version, and receipt rules.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { jeevesAsk, jeevesShouldRefuse } from "./engines/aziel-corpus/jeeves.js";
import {
  JEEVES_ASSET_NOTE,
  JEEVES_PUBLIC_FILE_COUNT,
  collectJeevesEasterEggs,
  continueJeevesSnake,
  jeevesAssetInventory,
} from "./engines/aziel-corpus/jeeves-eggs.js";
import { RUNTIME_VERSION } from "./runtime-api.js";
import { UI_DOMAINS } from "./ui-domains.js";

export const JEEVES_HELP_CALL = "jeeves_help";

function questionOf(input) {
  const src = input && typeof input === "object" ? input : {};
  const payload = src.payload && typeof src.payload === "object" && !Array.isArray(src.payload) ? src.payload : {};
  const raw = src.q != null ? src.q : src.question != null ? src.question : src.query != null ? src.query : payload.q != null ? payload.q : payload.question != null ? payload.question : payload.query;
  return String(raw || "").trim().slice(0, 2000);
}

function previousOf(input) {
  const src = input && typeof input === "object" ? input : {};
  const payload = src.payload && typeof src.payload === "object" ? src.payload : {};
  return src.previous || src.last_q || payload.previous || payload.last_q || "";
}

function snakeOf(input) {
  const src = input && typeof input === "object" ? input : {};
  const payload = src.payload && typeof src.payload === "object" ? src.payload : {};
  return src.snake || payload.snake || null;
}

export function interfaceHelpAnswer(question) {
  const n = String(question || "").toLowerCase();
  if (/\beaster\s*eggs?\b|\bjeeves bitmaps?\b|\blist (the )?(ask )?jeeves\b/.test(n)) {
    const assets = jeevesAssetInventory();
    const bound = assets.filter((item) => item.trigger_bound).length;
    return {
      topic: "easter_eggs",
      assets,
      answer:
        `Last-known Ask Jeeves files: ${JEEVES_PUBLIC_FILE_COUNT} under AzielEliab/aziel-corpus workers/download-tracker/public. ${bound} are bound to a corpus trigger. jeeves-kat-williams.png is a published sibling; the tupac_nobody trigger binds jeeves-kat-williams.gif. branding/ holds 7 of the same names. ${JEEVES_ASSET_NOTE}`,
    };
  }
  if (/\b(domain tabs?|top-?bar|softwares tabs?)\b/.test(n) || (/\bhow do i\b/.test(n) && /\b(tab|software)\b/.test(n))) {
    const lines = UI_DOMAINS.map((domain) => `${domain.label} (${domain.id}): ${domain.softwares.join(", ")}`);
    return {
      topic: "domain_tabs",
      domains: UI_DOMAINS.map((domain) => ({ id: domain.id, label: domain.label, softwares: domain.softwares.slice() })),
      answer:
        `Suite ${RUNTIME_VERSION}. Top-bar domain tabs group Softwares cards. ${lines.join(". ")}. The Library tab groups aziel-corpus and whitestone. Corpus research itself is the Corpus sub-tab under About Aziel. Aziel Elroi Eliab is alternateName only. Those tabs are navigation. FragGate stays the single door.`,
    };
  }
  if (
    /\b(dry_run|dry run)\b/.test(n) ||
    (/\bconfirm\b/.test(n) && /\b(seal|receipt|box)\b/.test(n)) ||
    /\b(act-receipt|receipt fields|public chain)\b/.test(n)
  ) {
    return {
      topic: "receipts",
      answer:
        `Suite ${RUNTIME_VERSION}. Interface seal needs confirm true. dry_run stores nothing and does not dispatch. Receipt fields stay hash, request, output, and event, with attempt ids request_id, attempt_n, parent_receipt_id, and correlation_id. A confirmed seal can append the public chain only when RECEIPT_APPEND_TOKEN is set. Ask Jeeves help does not append that chain. A dry_run on this help call returns the reply and skips the local interface ledger.`,
    };
  }
  if (/\b(suite version|runtime version|what version|which version|current build|2\.0\.0)\b/.test(n)) {
    return {
      topic: "version",
      version: RUNTIME_VERSION,
      answer: `This build is aziel-runtime ${RUNTIME_VERSION}. Ask Jeeves is suite help on aziel-corpus op jeeves, not an extra Softwares card. tools/list stays 36.`,
    };
  }
  if (/\b(elroi|sub-?tab|about aziel)\b/.test(n) && /\b(corpus|library|jeeves|tab)\b/.test(n)) {
    return {
      topic: "corpus_subtab",
      answer:
        `Aziel Elroi Eliab is alternateName only. The primary name is Aziel Eliab. That name is a top-bar domain tab. Corpus is a sub-tab on it (FoldLock tip and the live library cite), not its own top-bar domain. Ask Jeeves is the sibling sub-tab for this build. The Library top-bar tab still groups the Aziel Corpus and Whitestone Softwares cards.`,
    };
  }
  if (/\b(what can you|suite help|how (do i|can i) (use|ask) jeeves|ask jeeves help)\b/.test(n)) {
    return {
      topic: "intro",
      answer:
        `Ask Jeeves helps with this ${RUNTIME_VERSION} build: domain tabs, the suite version, receipts and dry_run, and the Corpus sub-tab under About Aziel. Library answers use the public corpus engine (sample MASTER, or CORPUS_D1 records when bound) and do not invent shelf rows. Easter eggs are the corpus trigger map. Author Aziel Eliab only.`,
    };
  }
  return null;
}

export async function askJeevesHelp(input, env) {
  const q = questionOf(input);
  if (!q) return { ok: false, status: 400, error: "question required (q / query / question)" };
  const gate = jeevesShouldRefuse(q);
  if (gate.refuse) {
    return {
      ok: true,
      refused: true,
      answer: gate.reason,
      citations: [],
      image: null,
      blend: false,
      invented_visits: false,
      library_search: false,
      library_http: "not-probed",
      software_tab: false,
      assistant: "Ask Jeeves",
    };
  }
  const previous = previousOf(input);
  const snake = snakeOf(input);
  const continued = continueJeevesSnake(q, snake);
  const eggs = continued ? [continued] : collectJeevesEasterEggs(q, { previous });
  if (eggs.length) {
    const asked = await jeevesAsk({ q, previous, snake }, env);
    return {
      ...asked,
      source: "corpus-easter-egg",
      software_tab: false,
      dispatched_fraggate: false,
      second_door: false,
    };
  }
  const help = interfaceHelpAnswer(q);
  if (help) {
    return {
      ok: true,
      refused: false,
      assistant: "Ask Jeeves",
      source: "interface-facts",
      topic: help.topic,
      answer: help.answer,
      version: help.version || RUNTIME_VERSION,
      domains: help.domains || null,
      assets: help.assets || null,
      asset_count: help.assets ? help.assets.length : null,
      citations: [],
      image: null,
      grounded: true,
      invented_visits: false,
      library_search: false,
      library_http: "not-probed",
      software_tab: false,
      dispatched_fraggate: false,
      second_door: false,
      author: "Aziel Eliab",
      identity: "Aziel Eliab",
    };
  }
  let asked;
  try {
    asked = await jeevesAsk({ q, previous, snake }, env);
  } catch (err) {
    return {
      ok: true,
      refused: false,
      assistant: "Ask Jeeves",
      source: "last-known",
      answer:
        "The library search did not complete. Last-known shelf is the bundled sample MASTER. This reply does not invent shelf rows.",
      library_http: "unreachable",
      library_search: false,
      invented_visits: false,
      citations: [],
      image: null,
      software_tab: false,
      error: String((err && err.message) || err),
      author: "Aziel Eliab",
      identity: "Aziel Eliab",
    };
  }
  return {
    ...asked,
    source: asked.live_d1 ? "CORPUS_D1" : "sample_MASTER",
    library_http: asked.live_d1 ? "CORPUS_D1" : "not-probed",
    last_known_shelf: asked.live_d1 ? "CORPUS_D1 records" : "bundled sample MASTER",
    software_tab: false,
    dispatched_fraggate: false,
    second_door: false,
  };
}

/**
 * Ask Jeeves suite help for the human interface.
 * Eggs and library search use the corpus jeeves engine.
 * Build answers use this runtime's domain tabs, version, and receipt rules.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { jeevesAsk } from "./engines/aziel-corpus/jeeves.js";
import {
  JEEVES_ASSET_NOTE,
  JEEVES_PUBLIC_FILE_COUNT,
  collectJeevesEasterEggs,
  continueJeevesSnake,
  jeevesAssetInventory,
} from "./engines/aziel-corpus/jeeves-eggs.js";
import { reasonGuide } from "./guide-reason.js";
import { applyAdaptive } from "./jeeves-adapt.js";
import { RUNTIME_VERSION } from "./runtime-api.js";

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
  return null;
}

export async function askJeevesHelp(input, env) {
  const q = questionOf(input);
  if (!q) return { ok: false, status: 400, error: "question required (q / query / question)" };
  const previous = previousOf(input);
  const snake = snakeOf(input);
  const continued = continueJeevesSnake(q, snake);
  const eggs = continued ? [continued] : collectJeevesEasterEggs(q, { previous });
  // Published corpus triggers stay a map, not a reasoned claim. Guide answers go through reasonGuide (lens first).
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
  if (interfaceHelpAnswer(q)) {
    const help = interfaceHelpAnswer(q);
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
  return applyAdaptive(await reasonGuide(q, env, { assistant: "Ask Jeeves" }), input, env, "jeeves");
}

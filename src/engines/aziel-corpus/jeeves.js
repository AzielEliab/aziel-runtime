/**
 * Isolate-safe Ask Jeeves over sample MASTER / CORPUS_D1 `records`.
 * Ports refuse + devil-not-real Jesus-image rules from AzielEliab/aziel-corpus
 * workers/download-tracker/src/jeeves.js. No AZAI blend/chat. No invented visits.
 * No operator secrets. Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { LIMITATION as CORPUS_LIMITATION, SAMPLE_MASTER, search } from "./engine.js";
import {
  JEEVES_ASSET_NOTE,
  JEEVES_JESUS_IMAGE,
  collectJeevesEasterEggs,
  continueJeevesSnake,
  isDevilDenial,
  isZsolverTopic,
  jeevesBitmapCite,
  jeevesEmptyShelfEgg,
  publicJeevesEgg,
} from "./jeeves-eggs.js";

export { JEEVES_JESUS_IMAGE, isDevilDenial };

export const JEEVES_NAME = "Ask Jeeves";
export const JEEVES_SUITE_HELP = Object.freeze({
  name: JEEVES_NAME,
  slug: "jeeves",
  software_tab: false,
  kind: "suite_help_assistant",
  parent_slug: "aziel-corpus",
  fraggate_slug: "aziel-corpus",
  fraggate_op: "jeeves",
  interface_call: "jeeves_help",
  named_tool: true,
  isolation_software: false,
});
export const JEEVES_LIMITATION =
  "Ask Jeeves is a research assistant over public library text (sample MASTER, or CORPUS_D1 records when bound). It is not sovereign, not the operator, and cannot change SPRE, CLCE, PhysLing, Bayesian, or triad scores. Not AZAI blend/chat. Does not invent visits. Author: Aziel Eliab only. Easter-egg bitmaps are cited from the corpus Worker public paths and are not hosted on this isolate.";

const REFUSE_RE =
  /\b(operator (password|hash|credential|account|secret|cookie)|master password|master hash|password hash|hidden admin|hidden operator|admin route|\/admin\b|superadmin|aziel_session|session token|scrypt|delete[- ]?all|wipe (the )?(corpus|library|ledger)|drop table|bypass quarantine|unquarantine|forge (a )?(score|triad|receipt)|modify (the )?(spre|clce|plr|physling|bayesian|triad|combined)( score)?|change (the )?(triad )?score|set (the )?(triad|score)|exfiltrat|dump (all )?(hashes|credentials|sessions)|reveal (the )?(operator|master))\b/i;

const BLEND_RE = /\b(azai\s+(blend|chat|complete)|blend\s+(azai|models?)|complete\s+chat|host(ed)?\s+blend)\b/i;

export function jeevesShouldRefuse(text) {
  const t = String(text || "");
  if (REFUSE_RE.test(t)) {
    return {
      refuse: true,
      reason: "Ask Jeeves cannot reveal operator secrets, change scores, bypass quarantine, or help damage the corpus.",
    };
  }
  if (BLEND_RE.test(t)) {
    return {
      refuse: true,
      reason: "Ask Jeeves is not AZAI. Hosted AZAI is protocol mirror + Lamb check, not the blend. blend / complete / chat stay refuse.",
    };
  }
  return { refuse: false };
}

function eggBody(eggs, extra = {}) {
  const egg = eggs[0];
  const cite = jeevesBitmapCite(egg.image || null);
  return base({
    refused: false,
    easter_egg: egg.id,
    easter_eggs: eggs.map(publicJeevesEgg),
    answer: egg.answer == null ? "" : String(egg.answer),
    image: egg.image || null,
    image_alt: egg.image_alt || null,
    citations: [],
    snake: egg.snake || null,
    bitmap_hosted_here: false,
    bitmap_probed: false,
    asset_note: cite.asset_note,
    asset: cite.asset,
    eggs_source: "AzielEliab/aziel-corpus workers/download-tracker/src/jeeves.js",
    ...extra,
  });
}

function extractiveAnswer(records, query) {
  const q = String(query || "").trim();
  const citations = (records || []).slice(0, 5).map((rec) => ({
    record_id: rec.record_id || null,
    title: rec.title || null,
    author: rec.author || null,
    snippet: String(rec.snippet || rec.body || "").slice(0, 280),
    invented: false,
  }));
  if (!citations.length) {
    return {
      answer: "No public library record matched. Ask Jeeves does not invent visits or shelf rows.",
      citations: [],
      grounded: true,
      empty: true,
    };
  }
  const lead = citations[0];
  const answer = q
    ? `From the public shelf (not an invented visit): ${lead.title || lead.record_id} — ${lead.snippet}`
    : `Public shelf cite: ${lead.title || lead.record_id} — ${lead.snippet}`;
  return { answer, citations, grounded: true, empty: false };
}

function base(extra = {}) {
  return {
    ok: true,
    product: "aziel-corpus",
    op: "jeeves",
    assistant: JEEVES_NAME,
    lamb_lens: true,
    sovereign: false,
    operator: false,
    blend: false,
    chat: false,
    invented_visits: false,
    true_engine_runtime: true,
    kv_increment: false,
    stored: false,
    limitation: JEEVES_LIMITATION,
    corpus_limitation: CORPUS_LIMITATION,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    ...extra,
  };
}

export async function jeevesAsk(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const q = String(src.q != null ? src.q : src.query != null ? src.query : src.question != null ? src.question : "").trim().slice(0, 2000);
  if (!q) {
    return base({
      ok: false,
      status: 400,
      error: "question required (q / query / question)",
      citations: [],
    });
  }
  const gate = jeevesShouldRefuse(q);
  if (gate.refuse) {
    return base({
      refused: true,
      answer: gate.reason,
      citations: [],
      image: null,
    });
  }
  const snake = continueJeevesSnake(q, src.snake);
  if (snake) return eggBody([snake], { library_search: false, library_http: "not-probed" });
  const eggs = collectJeevesEasterEggs(q, {
    previous: src.previous || src.last_q || src.last || src.previous_question || "",
  });
  if (eggs.length) {
    return eggBody(eggs, {
      library_search: false,
      library_http: "not-probed",
      note: eggs[0].id === "devil_not_real_jesus"
        ? "Jesus-image-only when the user says the devil is not real. Bitmap cite is the corpus Worker path; isolate does not invent a visit."
        : JEEVES_ASSET_NOTE,
    });
  }
  const found = await search({ q }, env);
  const records = Array.isArray(found && found.records) ? found.records : [];
  const extracted = extractiveAnswer(records, q);
  if (extracted.empty && !isZsolverTopic(q)) {
    const emptyEgg = jeevesEmptyShelfEgg();
    return eggBody([emptyEgg], {
      empty: true,
      live_d1: !!(found && found.live_d1),
      sample_master: !(found && found.live_d1),
      library_http: found && found.live_d1 ? "CORPUS_D1" : "not-probed",
      note: "No public library record matched. Ask Jeeves does not invent visits or shelf rows. Empty-shelf bitmap is the corpus briefcase. Live library HTTP was not probed when CORPUS_D1 is unbound.",
    });
  }
  return base({
    refused: false,
    answer: extracted.answer,
    grounded: extracted.grounded,
    citations: extracted.citations,
    count: extracted.citations.length,
    live_d1: !!(found && found.live_d1),
    sample_master: !!(found && found.sample_master) || (!found && SAMPLE_MASTER.length > 0),
    empty: extracted.empty === true,
    image: null,
    note: found && found.live_d1
      ? "Grounded on CORPUS_D1 records. Not an invented visit."
      : "Grounded on bundled sample MASTER. Live D1 when CORPUS_D1 is bound. Not an invented visit.",
  });
}

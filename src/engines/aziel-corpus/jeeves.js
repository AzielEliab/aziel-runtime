/**
 * Isolate-safe Ask Jeeves over sample MASTER / CORPUS_D1 `records`.
 * Ports refuse + devil-not-real Jesus-image rules from AzielEliab/aziel-corpus
 * workers/download-tracker/src/jeeves.js. No AZAI blend/chat. No invented visits.
 * No operator secrets. Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { LIMITATION as CORPUS_LIMITATION, SAMPLE_MASTER, search } from "./engine.js";

export const JEEVES_NAME = "Ask Jeeves";
export const JEEVES_JESUS_IMAGE = "/jeeves-jesus.png";
export const JEEVES_LIMITATION =
  "Ask Jeeves is a research assistant over public library text (sample MASTER, or CORPUS_D1 records when bound). It is not sovereign, not the operator, and cannot change SPRE, CLCE, PhysLing, Bayesian, or triad scores. Not AZAI blend/chat. Does not invent visits. Author: Aziel Eliab only.";

const REFUSE_RE =
  /\b(operator (password|hash|credential|account|secret|cookie)|master password|master hash|password hash|hidden admin|hidden operator|admin route|\/admin\b|superadmin|aziel_session|session token|scrypt|delete[- ]?all|wipe (the )?(corpus|library|ledger)|drop table|bypass quarantine|unquarantine|forge (a )?(score|triad|receipt)|modify (the )?(spre|clce|plr|physling|bayesian|triad|combined)( score)?|change (the )?(triad )?score|set (the )?(triad|score)|exfiltrat|dump (all )?(hashes|credentials|sessions)|reveal (the )?(operator|master))\b/i;

const BLEND_RE = /\b(azai\s+(blend|chat|complete)|blend\s+(azai|models?)|complete\s+chat|host(ed)?\s+blend)\b/i;

function norm(text) {
  return String(text || "").toLowerCase();
}

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

export function isDevilDenial(text) {
  const n = norm(text);
  return (
    /\b(the\s+)?(devil|satan)s?\s+(isn'?t|aint|ain't|is\s+not|are\s+not)\s+(even\s+)?real\b/.test(n) ||
    /\b(the\s+)?(devil|satan)s?\s+(doesn'?t|doesnt|don't|dont|does\s+not|do\s+not)\s+exist\b/.test(n) ||
    /\bthere\s+(is|are)\s+no\s+(devil|satan)\b/.test(n)
  );
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
  if (isDevilDenial(q)) {
    return base({
      refused: false,
      easter_egg: "devil_not_real_jesus",
      answer: "",
      image: JEEVES_JESUS_IMAGE,
      image_alt: "classical Jesus portrait (Ask Jeeves easter egg)",
      citations: [],
      note: "Jesus-image-only when the user says the devil is not real. Bitmap cite is the corpus Worker path; isolate does not invent a visit.",
    });
  }
  const found = await search({ q }, env);
  const records = Array.isArray(found && found.records) ? found.records : [];
  const extracted = extractiveAnswer(records, q);
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

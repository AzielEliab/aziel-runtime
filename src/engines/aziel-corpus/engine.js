/**
 * Aziel Digital Library portable search core.
 * In-process search of a bundled public sample MASTER (not live D1 unless CORPUS_D1 is bound).
 * review / score / verify-* / document-chain run on posted or sample JSON.
 * Whisper / OCR stay Workers-AI-gated (native only when env.AI is bound); else proxy_fallback.
 * jeeves / media-run stay per-op proxy. Author: Aziel Eliab.
 */

export const PRODUCT = "aziel-corpus";
export const VERSION = "2.6.2";
export const SPEC = "aziel-digital-library-portable-sample-v2.6.2";
export const LIMITATION =
  "THIS IS: in-process search over a bundled public sample MASTER, plus isolate-safe review/score/verify/document-chain on posted JSON. Live D1 search runs only when CORPUS_D1 is bound. Whisper / OCR run only when Workers AI is bound. THIS IS NOT: Zenodo, a 26-card software index, a fake native OCR, or Ask Jeeves. jeeves / media-run stay per-op proxy_fallback. Author: Aziel Eliab only.";

export const NATIVE_OPS = [
  "health",
  "skill",
  "search",
  "example",
  "doctor",
  "review",
  "score",
  "verify-backfill",
  "verify-geo",
  "document-chain",
  "import_export",
];
export const PROXY_OPS = ["jeeves", "media-run"];
export const BINDING_GATED_OPS = {
  transcribe: "workers-ai-whisper",
  ocr: "workers-ai-vision",
  search_d1: "CORPUS_D1",
};

/** Public sample records (portable). Not the live MASTER. */
export const SAMPLE_MASTER = [
  {
    record_id: "AZDOC-FLORENCE-SAMPLE",
    title: "Florence and the public library shelf",
    author: "Aziel Eliab",
    domain: "library",
    subjects: "Florence, gazetteer, public MASTER",
    keywords: "Florence, Italy, library, sample",
    body: "Sample public MASTER record used so in-process search can rank Florence without a D1 binding. Not a live ingest.",
    library: "corpus",
    created_utc: "2026-01-01T00:00:00Z",
    geo: { place: "Florence", country: "Italy", lat: 43.7696, lon: 11.2558 },
  },
  {
    record_id: "AZDOC-LAMB-SAMPLE",
    title: "Lamb Lens note on public boards",
    author: "Aziel Eliab",
    domain: "protocol",
    subjects: "Lamb Lens, Peace, Clarity, Service",
    keywords: "lamb, jeeves, azai",
    body: "Peace, clarity, service. Jeeves is not sovereign. Public HTTPS boards stay mesh-free.",
    library: "corpus",
    created_utc: "2026-02-01T00:00:00Z",
  },
  {
    record_id: "AZDOC-CLCE-SAMPLE",
    title: "CLCE inconsistency is not intent",
    author: "Aziel Eliab",
    domain: "method",
    subjects: "AZ-CLCE, triad",
    keywords: "clce, jaccard, triad",
    body: "AZ-CLCE detects inconsistency, not intent. Type D is a label only.",
    library: "aziel",
    created_utc: "2026-03-01T00:00:00Z",
  },
];

/** Gazetteer used by verify-geo. Sample only — not a live geocoder. */
export const SAMPLE_GEO = Object.freeze({
  florence: { place: "Florence", country: "Italy", lat: 43.7696, lon: 11.2558 },
  indiana: { place: "Indiana", country: "United States", lat: 39.7684, lon: -86.1581 },
});

function tokensOf(text) {
  return String(text || "")
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9._+-]*/g) || [];
}

function haystack(rec) {
  return [rec.title, rec.author, rec.domain, rec.subjects, rec.keywords, rec.body, rec.record_id]
    .map((v) => String(v || "").toLowerCase())
    .join(" ");
}

function srcOf(body) {
  return body && typeof body === "object" ? body : {};
}

function baseResult(extra = {}) {
  return {
    product: PRODUCT,
    version: VERSION,
    spec: SPEC,
    true_engine_runtime: true,
    kv_increment: false,
    stored: false,
    live_d1: false,
    sample_master: true,
    limitation: LIMITATION,
    author: "Aziel Eliab",
    ...extra,
  };
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text));
  const dig = await crypto.subtle.digest("SHA-256", data);
  const arr = new Uint8Array(dig);
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

function recordCanon(rec) {
  const row = rec && typeof rec === "object" ? rec : {};
  return JSON.stringify({
    record_id: String(row.record_id || ""),
    title: String(row.title || ""),
    author: String(row.author || ""),
    domain: String(row.domain || ""),
    library: String(row.library || ""),
    created_utc: String(row.created_utc || ""),
  });
}

function rankRows(rows, query, tokens) {
  const ranked = rows.map((rec) => {
    const hay = haystack(rec);
    let score = 0;
    const matched = [];
    if (!tokens.length && !query) score = 1;
    for (const tok of tokens) {
      if (hay.includes(tok)) {
        score += String(rec.title || "")
          .toLowerCase()
          .includes(tok)
          ? 3
          : 1;
        matched.push(tok);
      }
    }
    if (query && hay.includes(query.toLowerCase())) score += 2;
    return { ...rec, snippet: String(rec.body || "").slice(0, 280), rank_score: score, matched };
  });
  return ranked.filter((r) => r.rank_score > 0).sort((a, b) => b.rank_score - a.rank_score);
}

function filterSample(src) {
  const lib = String(src.lib || src.library || "all").toLowerCase();
  let rows = SAMPLE_MASTER.slice();
  if (lib === "aziel" || lib === "corpus") rows = rows.filter((r) => r.library === lib);
  if (src.author) {
    const a = String(src.author).toLowerCase();
    rows = rows.filter((r) => String(r.author).toLowerCase().includes(a));
  }
  if (src.domain) {
    const d = String(src.domain).toLowerCase();
    rows = rows.filter((r) => String(r.domain).toLowerCase().includes(d));
  }
  return rows;
}

function searchSample(body) {
  const src = srcOf(body);
  const q = src.q != null ? String(src.q) : src.query != null ? String(src.query) : "";
  const query = q.trim();
  const tokens = tokensOf(query);
  const hits = rankRows(filterSample(src), query, tokens);
  return baseResult({
    q: query,
    count: hits.length,
    records: hits.map(({ body: _b, ...rest }) => rest),
    note: "Bundled public sample MASTER. Live D1 search runs only when CORPUS_D1 is bound.",
  });
}

async function searchD1(body, db) {
  const src = srcOf(body);
  const q = src.q != null ? String(src.q) : src.query != null ? String(src.query) : "";
  const query = q.trim();
  const like = `%${query.replace(/[%_]/g, "")}%`;
  const stmt = db
    .prepare(
      "SELECT record_id, title, author, domain, subjects, keywords, library, created_utc FROM master WHERE title LIKE ? OR body LIKE ? OR keywords LIKE ? LIMIT 25",
    )
    .bind(like, like, like);
  const out = await stmt.all();
  const records = Array.isArray(out && out.results) ? out.results : [];
  return baseResult({
    live_d1: true,
    sample_master: false,
    q: query,
    count: records.length,
    records,
    note: "Native isolate D1 (CORPUS_D1 bound). Not a fake OCR.",
  });
}

export async function search(body, env) {
  const db = env && (env.CORPUS_D1 || env.DB);
  if (db && typeof db.prepare === "function") return searchD1(body, db);
  return searchSample(body);
}

export function examplePayload() {
  return { q: "Florence" };
}

export function review(body) {
  const src = srcOf(body);
  const recordId = src.record_id != null ? String(src.record_id) : "";
  const posted = src.record && typeof src.record === "object" ? src.record : null;
  const sample = recordId ? SAMPLE_MASTER.find((r) => r.record_id === recordId) : null;
  const rec = posted || sample || null;
  const text = src.text != null ? String(src.text) : rec ? haystack(rec) : "";
  const findings = [];
  if (!rec && !text.trim()) {
    return baseResult({
      op: "review",
      ok: false,
      error: "Pass { record_id } from the sample MASTER, { record }, or { text }.",
      status: 400,
      live_ingest: false,
    });
  }
  if (rec) {
    if (String(rec.author || "") !== "Aziel Eliab") findings.push("author_not_aziel_eliab");
    if (!rec.record_id) findings.push("missing_record_id");
    if (!rec.title) findings.push("missing_title");
  }
  if (/\blive ingest\b/i.test(text) && !/\bnot a live ingest\b/i.test(text)) findings.push("claims_live_ingest");
  if (/\b(whisper|ocr)\b/i.test(text) && !/\bnot\b.*\b(whisper|ocr)\b/i.test(text) && !/\b(whisper|ocr)\b.*\bnot\b/i.test(text)) {
    findings.push("media_claim_without_binding");
  }
  return baseResult({
    op: "review",
    ok: findings.length === 0,
    record_id: rec ? rec.record_id : null,
    findings,
    live_ingest: false,
    note: "Rules review over posted or sample JSON. Not live D1 ingest.",
  });
}

export function score(body) {
  const src = srcOf(body);
  const rec = src.record && typeof src.record === "object" ? src.record : src;
  const fields = ["record_id", "title", "author", "domain", "library"];
  let completeness = 0;
  for (const key of fields) if (String(rec[key] || "").trim()) completeness += 1;
  const tokens = tokensOf(src.q || src.query || rec.title || rec.body || "");
  const hits = rankRows(SAMPLE_MASTER.slice(), String(src.q || rec.title || ""), tokens);
  const overlap = hits[0] ? hits[0].rank_score : 0;
  const value = Number((completeness / fields.length * 0.6 + Math.min(overlap, 8) / 8 * 0.4).toFixed(4));
  return baseResult({
    op: "score",
    ok: true,
    score: value,
    completeness,
    fields: fields.length,
    overlap,
    court: false,
    truth_score: false,
    note: "Deterministic field completeness + sample overlap. Not a court score.",
  });
}

export async function verifyBackfill(body) {
  const src = srcOf(body);
  const posted = Array.isArray(src.records) ? src.records : src.record ? [src.record] : [];
  if (!posted.length) {
    return baseResult({
      op: "verify-backfill",
      ok: false,
      error: "Pass { records: [...] } or { record } from the sample MASTER.",
      status: 400,
    });
  }
  const rows = [];
  let match = true;
  for (const rec of posted) {
    const id = String(rec.record_id || "");
    const sample = SAMPLE_MASTER.find((r) => r.record_id === id);
    const expected = sample ? await sha256Hex(recordCanon(sample)) : null;
    const got = await sha256Hex(recordCanon(rec));
    const ok = expected != null && expected === got;
    if (!ok) match = false;
    rows.push({ record_id: id, match: ok, expected_hash: expected, got_hash: got, in_sample: !!sample });
  }
  return baseResult({
    op: "verify-backfill",
    ok: match,
    match,
    count: rows.length,
    records: rows,
    note: "Recomputes canonical hashes against the bundled sample MASTER. Not live D1 backfill.",
  });
}

export function verifyGeo(body) {
  const src = srcOf(body);
  const place = String(src.place || src.geo || src.name || "").trim();
  const key = place.toLowerCase();
  const expected = SAMPLE_GEO[key] || null;
  if (!expected) {
    return baseResult({
      op: "verify-geo",
      ok: false,
      error: "Pass a sample gazetteer place (Florence or Indiana). Not a live geocoder.",
      status: 400,
      geocoder: false,
    });
  }
  const lat = src.lat != null ? Number(src.lat) : expected.lat;
  const lon = src.lon != null ? Number(src.lon) : expected.lon;
  const dlat = Math.abs(lat - expected.lat);
  const dlon = Math.abs(lon - expected.lon);
  const match = dlat <= 0.25 && dlon <= 0.25;
  return baseResult({
    op: "verify-geo",
    ok: match,
    match,
    place: expected.place,
    country: expected.country,
    expected,
    got: { lat, lon },
    geocoder: false,
    note: "Sample gazetteer only. Not a live geocoder and not a mesh hop.",
  });
}

export async function documentChain(body) {
  const src = srcOf(body);
  const docs = Array.isArray(src.documents) ? src.documents : Array.isArray(src.records) ? src.records : [];
  if (!docs.length) {
    return baseResult({
      op: "document-chain",
      ok: false,
      error: "Pass { documents: [...] } client-held JSON.",
      status: 400,
    });
  }
  const chain = [];
  let prev = "0".repeat(64);
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i] && typeof docs[i] === "object" ? docs[i] : { text: String(docs[i]) };
    const canon = JSON.stringify({
      i,
      prev,
      record_id: String(doc.record_id || doc.id || ""),
      title: String(doc.title || ""),
      text: String(doc.text || doc.body || ""),
    });
    const hash = await sha256Hex(canon);
    chain.push({ i, prev, hash, record_id: doc.record_id || doc.id || null });
    prev = hash;
  }
  return baseResult({
    op: "document-chain",
    ok: true,
    tip: prev,
    count: chain.length,
    chain,
    stored: false,
    note: "Client-held document hash chain. Hosted does not store the library.",
  });
}

export async function importExport(body) {
  const src = srcOf(body);
  const mode = String(src.mode || "export").toLowerCase();
  if (mode === "import") {
    const records = Array.isArray(src.records) ? src.records : [];
    return baseResult({
      op: "import_export",
      ok: true,
      mode: "import",
      count: records.length,
      records,
      stored: false,
      note: "Client-held JSON import. Hosted isolate does not persist a library.",
    });
  }
  const records = Array.isArray(src.records) && src.records.length ? src.records : SAMPLE_MASTER.map(({ body: _b, ...rest }) => rest);
  return baseResult({
    op: "import_export",
    ok: true,
    mode: "export",
    count: records.length,
    records,
    stored: false,
    note: "Client-held JSON export. Sample MASTER when no records posted.",
  });
}

export async function transcribe(body, env) {
  if (!env || !env.AI || typeof env.AI.run !== "function") return { unsupported: true };
  const src = srcOf(body);
  const audio = src.audio_b64 || src.audio || src.bytes_b64;
  if (!audio) {
    return baseResult({
      op: "transcribe",
      ok: false,
      error: "audio_b64 required when Workers AI is bound.",
      status: 400,
      whisper_bound: true,
      native: true,
    });
  }
  const out = await env.AI.run("@cf/openai/whisper", { audio });
  return baseResult({
    op: "transcribe",
    ok: true,
    native: true,
    whisper_bound: true,
    live_d1: false,
    sample_master: false,
    engine: "workers-ai-whisper",
    text: out && out.text != null ? String(out.text) : "",
    note: "Native Workers AI Whisper. Not a fake transcript.",
  });
}

export async function ocr(body, env) {
  if (!env || !env.AI || typeof env.AI.run !== "function") return { unsupported: true };
  const src = srcOf(body);
  const image = src.image_b64 || src.image || src.b64;
  if (!image) {
    return baseResult({
      op: "ocr",
      ok: false,
      error: "image_b64 required when Workers AI is bound.",
      status: 400,
      vision_bound: true,
      native: true,
    });
  }
  const out = await env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {
    image,
    prompt: "Transcribe visible printed text only. Do not invent marks.",
    max_tokens: 256,
  });
  return baseResult({
    op: "ocr",
    ok: true,
    native: true,
    vision_bound: true,
    live_d1: false,
    sample_master: false,
    engine: "workers-ai-vision",
    text: out && (out.response || out.description || out.text) ? String(out.response || out.description || out.text) : "",
    note: "Native Workers AI vision. Not a fake OCR.",
  });
}

export function mediaStatus(env) {
  return {
    d1_bound: !!(env && (env.CORPUS_D1 || env.DB)),
    ai_bound: !!(env && env.AI),
    whisper: !!(env && env.AI),
    ocr: !!(env && env.AI),
    native_ops: NATIVE_OPS.slice(),
    proxy_ops: PROXY_OPS.slice(),
    binding_gated: { ...BINDING_GATED_OPS },
    next_step_d1: "Create the library D1 database and bind CORPUS_D1. Do not claim live D1 until bound.",
    next_step_ai: "Bind Workers AI (`AI`) for Whisper/OCR. Do not fake native media.",
  };
}

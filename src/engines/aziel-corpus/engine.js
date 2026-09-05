/**
 * Aziel Digital Library portable search core.
 * In-process search of a bundled public sample MASTER (not live D1).
 * Live ingest / review / Whisper / OCR stay unsupported-local → proxy_fallback.
 * Author: Aziel Eliab.
 */

export const PRODUCT = "aziel-corpus";
export const VERSION = "2.6.2";
export const SPEC = "aziel-digital-library-portable-sample-v2.6.2";
export const LIMITATION =
  "THIS IS: in-process search over a bundled public sample MASTER. THIS IS NOT: the live D1 library, Zenodo, a 26-card software index, Whisper, OCR, or Ask Jeeves. Live ingest/review/transcribe/ocr require product-Worker bindings and stay explicit per-op proxy_fallback. Author: Aziel Eliab only.";

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

export function search(body) {
  const src = body && typeof body === "object" ? body : {};
  const q = src.q != null ? String(src.q) : src.query != null ? String(src.query) : "";
  const query = q.trim();
  const tokens = tokensOf(query);
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
  const ranked = rows.map((rec) => {
    const hay = haystack(rec);
    let score = 0;
    const matched = [];
    if (!tokens.length && !query) score = 1;
    for (const tok of tokens) {
      if (hay.includes(tok)) {
        score += rec.title.toLowerCase().includes(tok) ? 3 : 1;
        matched.push(tok);
      }
    }
    if (query && hay.includes(query.toLowerCase())) score += 2;
    return { ...rec, snippet: rec.body.slice(0, 280), rank_score: score, matched };
  });
  const hits = ranked.filter((r) => r.rank_score > 0).sort((a, b) => b.rank_score - a.rank_score);
  return {
    product: PRODUCT,
    version: VERSION,
    spec: SPEC,
    true_engine_runtime: true,
    kv_increment: false,
    stored: false,
    live_d1: false,
    sample_master: true,
    q: query,
    count: hits.length,
    records: hits.map(({ body, ...rest }) => rest),
    limitation: LIMITATION,
    note: "Bundled public sample MASTER only. Live D1 search / ingest / review / Whisper / OCR stay per-op proxy_fallback.",
  };
}

export function examplePayload() {
  return { q: "Florence" };
}

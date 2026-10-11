/**
 * AZNews live ingest and store logic (AZNEWS-LIVE-1.0).
 *
 * Runs inside the AzNewsStore Durable Object (SQLite). Never writes KV or D1.
 * Every stored document (news item, weather report, sky report), every pull
 * receipt, every view receipt, and every 4DMap pin is one append-only ledger row
 * carrying the dual lattice (primary + secondary; offline secondary =
 * H(primary document hash + username)). Ledger rows are never deleted or
 * rewritten. Retention only trims the raw feed-chunk cache table.
 *
 * Tick (odd-minute cron, one Durable Object request):
 *   - 5 outlets per tick, rotating through every wired outlet (subrequests:
 *     5 feeds + <= 30 images + <= 1 weather <= 36 of the 50 allowed).
 *   - <= 6 new items per outlet per tick, newest first, items older than 72 h skipped.
 *   - weather every 120 min (one batched Open-Meteo call, 30 anchors),
 *     sky every 60 min (computed, no fetch).
 *   - a daily row-write budget (AZNEWS_DAILY_WRITE_BUDGET) stops news and weather
 *     ingest before the free-tier 100k/day row limit is at risk.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { canonicalize, sha256Hex } from "../../session-core.js";
import { LATTICE_GENESIS, planLattice, verifyLattice, LatticeError } from "../../dual-lattice.js";
import { assembleTriadDecision } from "../../memory/triad.js";
import { score as evidenceScore } from "../../memory/providers/generic-evidence.js";
import { USE_CASES } from "../../memory/calibration-manifest.js";
import { OUTLETS, OUTLETS_SPEC, outletConfigById, wiredOutlets } from "./aznews-outlets.js";
import { FEED_SPEC, canonicalUrl, parseDate, parseFeed } from "./aznews-feed.js";
import { eventLocation, reportedLocation, GEO_SPEC, GAZETTEER_SOURCE } from "./aznews-geo.js";
import { OPEN_METEO, WEATHER_ANCHORS, WEATHER_SPEC, parseWeatherBatch, weatherBatchUrl } from "./aznews-weather.js";
import { SKY_SPEC, skySnapshot } from "./aznews-sky.js";
import { BLACK_RULE, MATCH_SPEC, PIN_COLORS, PINS_SPEC, WHITE_RULE, colorFor, eraOf, inEra, matchPins, salientTokens } from "./aznews-pins.js";

export const LIVE_SPEC = "AZNEWS-LIVE-1.0";
export const OUTLETS_PER_TICK = 5;
export const FEED_ATTEMPTS = 2;
export const FEED_TIMEOUT_MS = 10000;
export const FEED_BACKOFF_MS = 1500;
export const NEW_PER_OUTLET = 6;
export const MAX_ITEM_AGE_MS = 72 * 3600000;
export const WEATHER_EVERY_MS = 120 * 60000;
export const SKY_EVERY_MS = 60 * 60000;
export const CACHE_KEEP = 600;
export const RECENT_CAP = 600;
export const RECENT_MS = 48 * 3600000;
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const AZNEWS_DAILY_WRITE_BUDGET = 40000;
export const VIEW_RECEIPTS_PER_DAY = 3000;
export const READ_LIMIT = 50;
export const FRESH_MS = 3 * 3600000;
export const OUTLETS_LIVE_WINDOW_MS = 60 * 60000;
export const WALK_SPEC = "AZNEWS-WALK-1.0";
export const JOIN_SPEC = "AZNEWS-JOIN-1.0";
export const WALK_ROWS_PER_STEP = 600;
export const JOIN_SAMPLE = 20;
export const CHECK_FRESH_MS = 15 * 60000;
export const OFFLINE_VIEW_RULE = "Offline view receipts (offline secondary = H(document hash + viewer)) are accepted only on the token-authenticated GET /v1/aznews/* route (Authorization: Bearer or X-Aziel-Runtime-Token). The viewer name is never stored: it is replaced by vh-<sha256(\"aznews-viewer-v1:\" + name)[0..32]>. Anonymous or FragGate calls with offline/username refuse AZNEWS-OFFLINE-AUTH-REQUIRED and nothing is written.";

/** Namespaced, hashed viewer id for offline view receipts. The chosen name never reaches the ledger. */
export async function viewerHash(name) {
  const clean = String(name == null ? "" : name).trim();
  if (!clean) return null;
  return "vh-" + (await sha256Hex("aznews-viewer-v1:" + clean)).slice(0, 32);
}

function truthy(v) {
  return v === true || v === 1 || v === "1" || v === "true";
}
export const BLACK_SWAN_RULE = Object.freeze({
  spec: "AZNEWS-BLACKSWAN-1.0",
  min_outlets: 5,
  window_ms: 6 * 3600000,
  min_shared_tokens: 2,
  lexicon: ["earthquake", "tsunami", "eruption", "volcano", "assassinat", "coup", "invasion", "invades", "nuclear", "pandemic", "outbreak", "collapse", "crash", "default", "meltdown", "martial law", "declares war", "war declared", "explosion", "blackout", "cyberattack", "hurricane", "cyclone", "typhoon", "famine", "massacre", "plane crash", "dam burst", "bank run", "impeach"],
  note: "A news cluster is flagged black-swan when its titles contain a rare-event lexicon term AND at least 5 distinct outlets publish titles sharing >= 2 salient entities within 6 hours. It is a heuristic flag, not a forecast.",
});

const HEADERS = { "user-agent": "Mozilla/5.0 (compatible; AZNews/1.0; +https://aziel-runtime.azieleliab.workers.dev/aznews)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5" };

function utcDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

async function hashDoc(doc) {
  return sha256Hex(canonicalize(doc));
}

/* ---------------------------------------------------------------- store */

/** In-memory repo with the same contract as the SQLite repo (tests, isolate fallback). */
export function memoryRepo() {
  const meta = new Map();
  const seen = new Map();
  const ledger = [];
  const cache = new Map();
  let writes = 0;
  return {
    kind: "memory",
    async metaGet(k) {
      return meta.has(k) ? structuredClone(meta.get(k)) : null;
    },
    async seenGet(k) {
      return seen.has(k) ? structuredClone(seen.get(k)) : null;
    },
    async rowGet(seq) {
      const row = ledger[seq - 1];
      return row ? structuredClone(row) : null;
    },
    async rowRange(from, to) {
      return ledger.slice(Math.max(0, from - 1), Math.max(0, to)).map((r) => structuredClone(r));
    },
    async count() {
      return ledger.length;
    },
    async cacheCount() {
      return cache.size;
    },
    async commit({ rows = [], meta: m = {}, seen: s = {}, cache: c = [] }) {
      for (const row of rows) {
        if (row.seq !== ledger.length + 1) throw new Error("ledger seq gap");
        ledger.push(structuredClone(row));
        writes += 1;
      }
      for (const [k, v] of Object.entries(m)) {
        meta.set(k, structuredClone(v));
        writes += 1;
      }
      for (const [k, v] of Object.entries(s)) {
        seen.set(k, structuredClone(v));
        writes += 1;
      }
      for (const { seq, raw } of c) {
        cache.set(seq, raw);
        writes += 1;
      }
      return { writes };
    },
    async cacheTrim(keep) {
      const keys = [...cache.keys()].sort((a, b) => a - b);
      const drop = keys.slice(0, Math.max(0, keys.length - keep));
      for (const k of drop) cache.delete(k);
      return drop.length;
    },
    _ledger: ledger,
    _cache: cache,
  };
}

/** SQLite repo over Durable Object ctx.storage.sql. */
export function sqlRepo(storage) {
  const sql = storage.sql;
  sql.exec("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL) WITHOUT ROWID");
  sql.exec("CREATE TABLE IF NOT EXISTS seen (k TEXT PRIMARY KEY, v TEXT NOT NULL) WITHOUT ROWID");
  sql.exec("CREATE TABLE IF NOT EXISTS ledger (seq INTEGER PRIMARY KEY, kind TEXT NOT NULL, body TEXT NOT NULL)");
  sql.exec("CREATE TABLE IF NOT EXISTS cache (seq INTEGER PRIMARY KEY, body TEXT NOT NULL)");
  const one = (q, ...args) => {
    const rows = sql.exec(q, ...args).toArray();
    return rows.length ? rows[0] : null;
  };
  return {
    kind: "durable-object-sqlite",
    async metaGet(k) {
      const r = one("SELECT v FROM meta WHERE k = ?", k);
      return r ? JSON.parse(r.v) : null;
    },
    async seenGet(k) {
      const r = one("SELECT v FROM seen WHERE k = ?", k);
      return r ? JSON.parse(r.v) : null;
    },
    async rowGet(seq) {
      const r = one("SELECT body FROM ledger WHERE seq = ?", Number(seq));
      return r ? JSON.parse(r.body) : null;
    },
    async rowRange(from, to) {
      return sql.exec("SELECT body FROM ledger WHERE seq >= ? AND seq <= ? ORDER BY seq", Number(from), Number(to)).toArray().map((r) => JSON.parse(r.body));
    },
    async count() {
      const r = one("SELECT MAX(seq) AS n FROM ledger");
      return r && r.n ? Number(r.n) : 0;
    },
    async cacheCount() {
      const r = one("SELECT COUNT(*) AS n FROM cache");
      return r ? Number(r.n) : 0;
    },
    async commit({ rows = [], meta = {}, seen = {}, cache = [] }) {
      let writes = 0;
      storage.transactionSync(() => {
        for (const row of rows) {
          sql.exec("INSERT INTO ledger (seq, kind, body) VALUES (?, ?, ?)", row.seq, row.kind, JSON.stringify(row));
          writes += 1;
        }
        for (const [k, v] of Object.entries(meta)) {
          sql.exec("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", k, JSON.stringify(v));
          writes += 1;
        }
        for (const [k, v] of Object.entries(seen)) {
          sql.exec("INSERT OR REPLACE INTO seen (k, v) VALUES (?, ?)", k, JSON.stringify(v));
          writes += 1;
        }
        for (const { seq, raw } of cache) {
          sql.exec("INSERT OR REPLACE INTO cache (seq, body) VALUES (?, ?)", seq, String(raw).slice(0, 32000));
          writes += 1;
        }
      });
      return { writes };
    },
    async cacheTrim(keep) {
      const r = one("SELECT COUNT(*) AS n, MAX(seq) AS hi FROM cache");
      if (!r || !r.n || r.n <= keep) return 0;
      const cut = one("SELECT seq FROM cache ORDER BY seq DESC LIMIT 1 OFFSET ?", keep - 1);
      if (!cut) return 0;
      const before = r.n;
      sql.exec("DELETE FROM cache WHERE seq < ?", cut.seq);
      return before - keep;
    },
  };
}

/* ------------------------------------------------------------- batching */

/** Collects ledger rows for one commit, stamping the dual lattice in order. */
export async function openBatch(repo) {
  const tips = (await repo.metaGet("tips")) || { primary: LATTICE_GENESIS, secondary: LATTICE_GENESIS, count: 0 };
  const count = await repo.count();
  const daily = (await repo.metaGet("writes_day")) || { day: utcDay(Date.now()), rows: 0, views: 0 };
  if (daily.day !== utcDay(Date.now())) Object.assign(daily, { day: utcDay(Date.now()), rows: 0, views: 0 });
  const batch = {
    rows: [],
    meta: {},
    seen: {},
    cache: [],
    tips: { ...tips },
    next: count + 1,
    daily,
    offlineSeen: new Set(),
    async add(kind, doc, { offline = false, username = null } = {}) {
      const document_hash = await hashDoc(doc);
      const lattice = await planLattice({
        document_hash,
        offline,
        username,
        tips: batch.tips,
        hasOffline: async (sec) => batch.offlineSeen.has(sec) || Boolean(await repo.seenGet(`o:${sec}`)),
      });
      const row = { seq: batch.next, kind, at: new Date().toISOString(), doc, lattice };
      batch.next += 1;
      batch.rows.push(row);
      batch.tips = { primary: lattice.primary, secondary: lattice.secondary, count: (batch.tips.count || 0) + 1 };
      if (offline) {
        batch.offlineSeen.add(lattice.secondary);
        batch.seen[`o:${lattice.secondary}`] = { seq: row.seq };
      }
      return row;
    },
    async commit() {
      if (!batch.rows.length && !Object.keys(batch.meta).length && !Object.keys(batch.seen).length) return { writes: 0 };
      batch.meta.tips = batch.tips;
      const planned = batch.rows.length + Object.keys(batch.meta).length + Object.keys(batch.seen).length + batch.cache.length + 1;
      batch.daily.rows += planned;
      batch.meta.writes_day = batch.daily;
      return repo.commit({ rows: batch.rows, meta: batch.meta, seen: batch.seen, cache: batch.cache });
    },
  };
  return batch;
}

/* --------------------------------------------------------------- scoring */

/** Triad score from the real text (AKM-TRIAD-1.0 assembleTriadDecision; forensic_evidence use case). */
export async function scoreItem({ title, wording, full_text, link, outlet, corroborating_outlets }) {
  const words = String(wording || "").split(/\s+/).filter(Boolean).length;
  const completeness = full_text ? 1 : Math.min(1, words / 120);
  const provenance = link && /^https:\/\//.test(link) ? 1 : 0.3;
  const sourceQuality = outlet && outlet.rank ? (51 - outlet.rank) / 50 : null;
  const e = await evidenceScore({ completeness, provenance, source_quality: sourceQuality, fact: wording });
  const titleTokens = salientTokens(title, outlet && outlet.name);
  const body = String(wording || "").toLowerCase();
  const C = titleTokens.length ? titleTokens.filter((t) => body.includes(t)).length / titleTokens.length : null;
  const P = Math.min(1, (corroborating_outlets || 0) / 5);
  const availability = { E: wording ? 0.8 : 0.15, C: titleTokens.length && wording ? 0.85 : 0.1, P: 0.8, B: 0.05 };
  const decision = assembleTriadDecision({
    use_case: USE_CASES.forensic_evidence,
    availability,
    channel_scores: { E: e.score, C, P },
    effective_observations: corroborating_outlets || 0,
    evidence_refs: link ? [link] : [],
  });
  return {
    value: decision.triad_score,
    state: decision.state,
    kind: "akm-triad-text",
    selected: decision.selected,
    components: decision.component_scores,
    inputs: { completeness: Number(completeness.toFixed(4)), provenance, source_quality: sourceQuality, title_body_agreement: C == null ? null : Number(C.toFixed(4)), corroborating_outlets: corroborating_outlets || 0 },
    note: "E = evidence (text completeness, canonical https link, outlet rank); C = title-body agreement; P = corroboration by other outlets in 48 h. Belief is not truth.",
  };
}

/* ------------------------------------------------------------ fetching */

async function timedFetch(fetchImpl, url, init = {}, ms = 8000) {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), ms) : null;
  try {
    return await fetchImpl(url, { ...init, signal: ctl ? ctl.signal : undefined, redirect: "follow" });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function hashImage(fetchImpl, url) {
  try {
    const res = await timedFetch(fetchImpl, url, { headers: { "user-agent": HEADERS["user-agent"], accept: "image/*" } }, 6000);
    if (!res || !res.ok) return { url, sha256: null, reason: `HTTP ${res ? res.status : "no response"}` };
    const len = Number(res.headers && res.headers.get ? res.headers.get("content-length") : 0);
    if (len && len > IMAGE_MAX_BYTES) return { url, sha256: null, reason: "image larger than 3 MiB; hash skipped" };
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > IMAGE_MAX_BYTES) return { url, sha256: null, reason: "image larger than 3 MiB; hash skipped" };
    return { url, sha256: await sha256Hex(buf), byte_length: buf.length, content_type: res.headers && res.headers.get ? res.headers.get("content-type") : null, fetched: true };
  } catch (err) {
    return { url, sha256: null, reason: String((err && err.message) || err).slice(0, 120) };
  }
}

/* -------------------------------------------------------------- pins */

async function addPins(batch, { report, receipt, reportKind, title, date, dateReason, reportGeo, reportReason, eventGeo, eventReason, reportType, eventType, source }) {
  const era = eraOf(date);
  const base = {
    kind: "aznews-pin",
    spec: PINS_SPEC,
    report_seq: report.seq,
    report_kind: reportKind,
    report_document_hash: report.lattice.document_hash,
    pull_receipt_seq: receipt.seq,
    event: String(title || "").slice(0, 240),
    date: date || null,
    date_basis: date ? (reportKind === "news" ? "published (event date as reported; pull time is not used)" : "observation/computation time") : null,
    date_reason: date ? null : dateReason || "No event date could be resolved.",
    era,
    source,
    permanent: true,
  };
  const reported = await batch.add("pin", {
    ...base,
    role: "report",
    pin_type: reportType,
    color: colorFor(reportType).color,
    color_hex: colorFor(reportType).hex,
    geo: reportGeo || null,
    geo_reason: reportGeo ? null : reportReason || "No reported location.",
    report_location_source: reportGeo ? reportLocationSource({ geo: reportGeo }) : null,
  });
  const event = await batch.add("pin", {
    ...base,
    role: "event",
    pin_type: eventType,
    color: colorFor(eventType).color,
    color_hex: colorFor(eventType).hex,
    geo: eventGeo || null,
    event_location: eventGeo || null,
    geo_reason: eventGeo ? null : eventReason || "No event location.",
  });
  return { reported, event };
}

/** Where a report pin's place came from. Legacy rows are read from geo.precision. */
export function reportLocationSource(d) {
  if (d.report_location_source) return d.report_location_source;
  const g = d.geo || {};
  if (g.precision === "outlet-hq" || g.kind === "outlet-hq") return "outlet_hq";
  if (g.precision === "observation-anchor") return "observation_anchor";
  if (g.precision === "computation-reference") return "computation_reference";
  if (d.geo == null) return null;
  return "dateline";
}

function pinId(seq) {
  return `pin-${seq}`;
}

/* -------------------------------------------------------------- news */

function recentWithin(recent, now) {
  return (recent || []).filter((r) => now - r.t <= RECENT_MS).slice(-RECENT_CAP);
}

function corroboration(recent, tokens, outletId, now, windowMs = RECENT_MS) {
  const outlets = new Set();
  for (const r of recent) {
    if (r.o === outletId || now - r.t > windowMs) continue;
    const shared = (r.k || []).filter((t) => tokens.includes(t)).length;
    if (shared >= 2) outlets.add(r.o);
  }
  return outlets;
}

function lexiconHit(title) {
  const t = String(title || "").toLowerCase();
  return BLACK_SWAN_RULE.lexicon.find((w) => t.includes(w)) || null;
}

async function ingestOutlet(batch, repo, outlet, fetchImpl, now, recent, budget) {
  const status = { id: outlet.id, name: outlet.name, attempted_at: new Date(now).toISOString(), ok: false, items_returned: 0, new_items: 0, http_status: null, reason: null };
  // AZNEWS-FEED-RETRY-1.0: at most FEED_ATTEMPTS fetches per outlet per tick. A retry
  // happens only on a timeout/network error, HTTP 429 or HTTP 5xx, after a short backoff.
  // Worst case per tick stays inside the 50-subrequest cap (5 feeds x 2 + 30 images + 1 weather).
  let res = null;
  let feedSub = 0;
  const timeoutMs = outlet.timeout_ms || FEED_TIMEOUT_MS;
  for (let attempt = 1; attempt <= FEED_ATTEMPTS; attempt++) {
    feedSub += 1;
    status.attempts = attempt;
    try {
      res = await timedFetch(fetchImpl, outlet.feed_url, { headers: HEADERS }, timeoutMs);
      status.http_status = res ? res.status : null;
      status.reason = null;
      if (res && (res.status === 429 || res.status >= 500) && attempt < FEED_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, FEED_BACKOFF_MS * attempt));
        continue;
      }
      break;
    } catch (err) {
      res = null;
      status.reason = `fetch failed: ${String((err && err.message) || err).slice(0, 120)}`;
      if (attempt < FEED_ATTEMPTS) await new Promise((r) => setTimeout(r, FEED_BACKOFF_MS * attempt));
    }
  }
  if (!res) return { status, subrequests: feedSub };
  if (!res.ok) {
    status.reason = `HTTP ${status.http_status}`;
    return { status, subrequests: feedSub };
  }
  const xml = await res.text();
  const items = parseFeed(xml);
  status.items_returned = items.length;
  status.ok = items.length > 0;
  if (!items.length) status.reason = "feed had no items";
  const fresh = [];
  for (const it of items) {
    if (!it.canonical_url) continue;
    const published = parseDate(it.published_raw);
    if (published && now - Date.parse(published) > MAX_ITEM_AGE_MS) continue;
    const urlHash = await sha256Hex(it.canonical_url);
    if (await repo.seenGet(`u:${urlHash}`)) continue;
    if (batch.seen[`u:${urlHash}`]) continue;
    const contentHash = await hashDoc({ title: it.title, wording: it.wording });
    if (await repo.seenGet(`c:${contentHash}`)) continue;
    if (batch.seen[`c:${contentHash}`]) continue;
    fresh.push({ ...it, published, urlHash, contentHash });
  }
  fresh.sort((a, b) => (Date.parse(b.published || 0) || 0) - (Date.parse(a.published || 0) || 0));
  const take = fresh.slice(0, Math.min(NEW_PER_OUTLET, budget.items));
  let subrequests = feedSub;
  const images = await Promise.all(take.map((it) => (it.image_urls[0] && budget.images-- > 0 ? hashImage(fetchImpl, it.image_urls[0]) : null)));
  subrequests += images.filter(Boolean).length;
  for (let i = 0; i < take.length; i++) {
    const it = take[i];
    budget.items -= 1;
    const tokens = salientTokens(it.title, outlet.name);
    const corro = corroboration(recent, tokens, outlet.id, now);
    const score = await scoreItem({ title: it.title, wording: it.wording, full_text: it.full_text, link: it.canonical_url, outlet, corroborating_outlets: corro.size });
    const ev = eventLocation({ title: it.title, text: it.wording, outletName: outlet.name, outletCountry: outlet.country });
    const rp = reportedLocation({ text: it.wording, outlet });
    const imgRows = it.image_urls.map((url, j) => (j === 0 && images[i] ? images[i] : { url, sha256: null, reason: j === 0 ? "image fetch budget used" : "only the first image is fetched and hashed" }));
    const itemId = `n-${it.urlHash.slice(0, 16)}`;
    const swanWord = lexiconHit(it.title);
    const doc = {
      kind: "aznews-news",
      spec: LIVE_SPEC,
      item_id: itemId,
      outlet: { id: outlet.id, name: outlet.name, rank: outlet.rank, feed_url: outlet.feed_url },
      title: it.title,
      link: it.link,
      canonical_url: it.canonical_url,
      published: it.published,
      published_raw: it.published_raw || null,
      wording: it.wording,
      wording_truncated: it.wording_truncated,
      full_text: it.full_text,
      text_source: it.text_source,
      images: imgRows,
      score,
      tokens,
      black_swan_term: swanWord,
      content_hash: it.contentHash,
      url_hash: it.urlHash,
      reported_location: rp.reported_location,
      reported_location_reason: rp.reason,
      event_location: ev.event_location,
      event_location_reason: ev.reason,
    };
    const report = await batch.add("news", doc);
    const receipt = await batch.add("pull_receipt", {
      kind: "aznews-pull-receipt",
      report_seq: report.seq,
      report_kind: "news",
      item_id: itemId,
      source: { type: "rss", outlet_id: outlet.id, outlet: outlet.name, feed_url: outlet.feed_url, http_status: status.http_status },
      fetched_at: new Date(now).toISOString(),
      content_hash: it.contentHash,
      document_hash: report.lattice.document_hash,
      image_sha256: imgRows.map((r) => r.sha256).filter(Boolean),
    });
    const pins = await addPins(batch, {
      report,
      receipt,
      reportKind: "news",
      title: it.title,
      date: it.published,
      dateReason: "The feed item had no parseable publication date.",
      reportGeo: rp.reported_location,
      reportReason: rp.reason,
      eventGeo: ev.event_location,
      eventReason: ev.reason,
      reportType: "news-report",
      eventType: "news-event",
      source: outlet.id,
    });
    // Correspondence: best match among recent event pins (append-only; never rewrites a pin).
    if (ev.event_location && it.published) {
      let best = null;
      for (const r of recent) {
        if (!r.pin || !r.geo) continue;
        const m = matchPins({ source: outlet.id, date: it.published, geo: ev.event_location, tokens }, { source: r.o, date: r.d, geo: r.geo, tokens: r.k });
        if (!m.level) continue;
        if (!best || (m.level === "black" && best.m.level !== "black") || (m.level === best.m.level && m.jaccard > best.m.jaccard)) best = { r, m };
      }
      if (best) {
        const type = best.m.level === "black" ? "correspondence" : "correspondence-candidate";
        await batch.add("pin", {
          kind: "aznews-pin",
          spec: PINS_SPEC,
          role: "correspondence",
          pin_type: type,
          color: colorFor(type).color,
          color_hex: colorFor(type).hex,
          event: it.title.slice(0, 240),
          date: it.published,
          era: eraOf(it.published),
          geo: ev.event_location,
          links: { pins: [pins.event.seq, best.r.pin], reports: [report.seq, best.r.s] },
          match: { ...best.m, rule: best.m.level === "black" ? BLACK_RULE : WHITE_RULE },
          source: outlet.id,
          permanent: true,
        });
      }
    }
    batch.seen[`u:${it.urlHash}`] = { seq: report.seq, receipt: receipt.seq, pins: [pins.reported.seq, pins.event.seq], item_id: itemId };
    batch.seen[`c:${it.contentHash}`] = { seq: report.seq };
    batch.seen[`i:${itemId}`] = { seq: report.seq, receipt: receipt.seq, pins: [pins.reported.seq, pins.event.seq] };
    batch.cache.push({ seq: report.seq, raw: it.raw });
    recent.push({ s: report.seq, o: outlet.id, t: now, k: tokens, sw: Boolean(swanWord), d: it.published, geo: ev.event_location ? { lat: ev.event_location.lat, lon: ev.event_location.lon } : null, pin: pins.event.seq, title: it.title.slice(0, 160) });
    status.new_items += 1;
  }
  return { status, subrequests };
}

async function blackSwans(batch, repo, recent, now) {
  const out = [];
  const swans = recent.filter((r) => r.sw && now - r.t <= BLACK_SWAN_RULE.window_ms);
  for (const r of swans) {
    const outlets = new Set([r.o]);
    const members = [r.s];
    for (const o of recent) {
      if (o === r || now - o.t > BLACK_SWAN_RULE.window_ms) continue;
      const shared = (o.k || []).filter((t) => (r.k || []).includes(t)).length;
      if (shared >= BLACK_SWAN_RULE.min_shared_tokens) {
        outlets.add(o.o);
        members.push(o.s);
      }
    }
    if (outlets.size < BLACK_SWAN_RULE.min_outlets) continue;
    const key = `b:${utcDay(now)}:${(r.k || []).slice().sort().slice(0, 3).join("+")}`;
    if (batch.seen[key] || (await repo.seenGet(key))) continue;
    const row = await batch.add("black_swan", { kind: "aznews-black-swan", rule: BLACK_SWAN_RULE.spec, title: r.title, outlets: [...outlets], member_report_seqs: members.slice(0, 40), tokens: r.k, flagged_at: new Date(now).toISOString(), note: BLACK_SWAN_RULE.note });
    batch.seen[key] = { seq: row.seq };
    out.push(row.seq);
  }
  return out;
}

/* ------------------------------------------------------- weather / sky */

async function ingestWeather(batch, fetchImpl, now) {
  const url = weatherBatchUrl();
  let body = null;
  let http = null;
  try {
    const res = await timedFetch(fetchImpl, url, { headers: { accept: "application/json", "user-agent": HEADERS["user-agent"] } }, 10000);
    http = res ? res.status : null;
    if (res && res.ok) body = await res.json();
  } catch (err) {
    return { ok: false, reason: String((err && err.message) || err).slice(0, 160), stored: 0 };
  }
  if (!body) return { ok: false, reason: `Open-Meteo HTTP ${http}`, stored: 0 };
  const rows = parseWeatherBatch(body);
  const contentHash = await hashDoc(rows);
  const seqs = [];
  for (const r of rows) {
    if (r.gap) continue;
    const doc = {
      kind: "aznews-weather",
      spec: WEATHER_SPEC,
      anchor: r.anchor,
      observed_at: r.observed_at,
      reading: r.reading,
      conditions: r.conditions,
      severe: r.severe,
      grid: r.grid,
      source: { name: OPEN_METEO.name, endpoint: OPEN_METEO.endpoint, attribution: OPEN_METEO.attribution, license: OPEN_METEO.license },
    };
    const report = await batch.add("weather", doc);
    const receipt = await batch.add("pull_receipt", {
      kind: "aznews-pull-receipt",
      report_seq: report.seq,
      report_kind: "weather",
      item_id: `w-${r.anchor.id}-${report.seq}`,
      source: { type: "open-meteo", url: OPEN_METEO.endpoint, http_status: http, batch_content_hash: contentHash },
      fetched_at: new Date(now).toISOString(),
      content_hash: await hashDoc(doc.reading),
      document_hash: report.lattice.document_hash,
    });
    await addPins(batch, {
      report,
      receipt,
      reportKind: "weather",
      title: `${r.anchor.name}: ${r.conditions || "conditions"} ${r.reading.temperature_2m} C${r.severe.length ? ` [${r.severe.join(", ")}]` : ""}`,
      date: r.observed_at,
      reportGeo: { name: r.anchor.name, lat: r.anchor.lat, lon: r.anchor.lon, precision: "observation-anchor", source: "anchor-config" },
      eventGeo: r.grid && Number.isFinite(r.grid.lat) ? { name: `${r.anchor.name} model grid cell`, lat: r.grid.lat, lon: r.grid.lon, precision: "open-meteo-grid", source: "open-meteo" } : null,
      eventReason: "Open-Meteo returned no grid coordinates.",
      reportType: "weather-report",
      eventType: "weather-event",
      source: "open-meteo",
    });
    seqs.push(report.seq);
  }
  return { ok: seqs.length > 0, stored: seqs.length, gaps: rows.filter((r) => r.gap).map((r) => r.anchor.id), seqs, observed: rows.map((r) => (r.gap ? null : r.anchor.area)).filter(Boolean) };
}

async function ingestSky(batch, now) {
  const anchors = WEATHER_ANCHORS.filter((a) => !/ocean/i.test(a.area));
  const snap = skySnapshot(new Date(now), anchors);
  const report = await batch.add("sky", snap);
  const receipt = await batch.add("pull_receipt", {
    kind: "aznews-pull-receipt",
    report_seq: report.seq,
    report_kind: "sky",
    item_id: `s-${report.seq}`,
    source: { type: "computed", library: snap.library, spec: SKY_SPEC },
    fetched_at: new Date(now).toISOString(),
    content_hash: await hashDoc({ sun: snap.sun, moon: snap.moon, seasons: snap.seasons }),
    document_hash: report.lattice.document_hash,
  });
  await addPins(batch, {
    report,
    receipt,
    reportKind: "sky",
    title: `Sun in ${snap.sun.tropical_sign} (tropical), in ${snap.sun.constellation} (IAU); Moon ${snap.moon.phase_name} in ${snap.moon.constellation}`,
    date: snap.computed_at,
    reportGeo: { name: "Prime meridian reference (Royal Observatory Greenwich)", lat: 51.4769, lon: -0.0005, precision: "computation-reference", source: "sky-config" },
    eventGeo: { name: "Sub-solar point", lat: snap.sub_solar_point.lat, lon: snap.sub_solar_point.lon, precision: "computed", source: "astronomy-engine" },
    reportType: "sky-report",
    eventType: "sky-event",
    source: "astronomy-engine",
  });
  return { ok: true, seq: report.seq, sun: snap.sun.tropical_sign, constellation: snap.sun.constellation };
}

/* ---------------------------------------------------------------- tick */

export async function tick(repo, { fetchImpl = typeof fetch === "function" ? fetch : null, now = Date.now(), outletsPerTick = OUTLETS_PER_TICK, force = {} } = {}) {
  const state = (await repo.metaGet("state")) || { cursor: 0, cycle: 0, last_weather_ms: 0, last_sky_ms: 0, ticks: 0 };
  const outletStatus = (await repo.metaGet("outlets")) || {};
  let recent = recentWithin(await repo.metaGet("recent"), now);
  const batch = await openBatch(repo);
  const report = { spec: LIVE_SPEC, at: new Date(now).toISOString(), outlets: [], weather: null, sky: null, black_swans: [], subrequests: 0, budget_stop: false };
  if (batch.daily.rows >= AZNEWS_DAILY_WRITE_BUDGET) {
    report.budget_stop = true;
  }
  const wired = wiredOutlets();
  if (!report.budget_stop && fetchImpl) {
    const budget = { items: 30, images: 30 };
    const picks = [];
    for (let i = 0; i < Math.min(outletsPerTick, wired.length); i++) picks.push(wired[(state.cursor + i) % wired.length]);
    // Feeds are read one outlet at a time so lattice order is deterministic.
    const results = [];
    for (const outlet of picks) results.push(await ingestOutlet(batch, repo, outlet, fetchImpl, now, recent, budget));
    for (const r of results) {
      outletStatus[r.status.id] = { ...r.status, cycle: state.cycle };
      report.outlets.push(r.status);
      report.subrequests += r.subrequests;
    }
    const nextCursor = state.cursor + picks.length;
    if (nextCursor >= wired.length) state.cycle += 1;
    state.cursor = nextCursor % wired.length;
    report.black_swans = await blackSwans(batch, repo, recent, now);
  }
  if (!report.budget_stop && fetchImpl && (force.weather || now - (state.last_weather_ms || 0) >= WEATHER_EVERY_MS)) {
    report.weather = await ingestWeather(batch, fetchImpl, now);
    report.subrequests += 1;
    if (report.weather.ok) {
      state.last_weather_ms = now;
      state.last_weather = { at: new Date(now).toISOString(), seqs: report.weather.seqs, gaps: report.weather.gaps, areas: [...new Set(report.weather.observed)] };
    } else {
      state.last_weather_error = { at: new Date(now).toISOString(), reason: report.weather.reason };
    }
  }
  if (force.sky || state.last_sky_spec !== SKY_SPEC || now - (state.last_sky_ms || 0) >= SKY_EVERY_MS) {
    report.sky = await ingestSky(batch, now);
    state.last_sky_ms = now;
    state.last_sky_spec = SKY_SPEC;
    state.last_sky_seq = report.sky.seq;
  }
  // Index of the newest news reports and pins (bounded reads; ledger is never scanned).
  const newsIdx = (await repo.metaGet("idx_news")) || [];
  const pinIdx = (await repo.metaGet("idx_pins")) || [];
  for (const row of batch.rows) {
    if (row.kind === "news") newsIdx.push(row.seq);
    if (row.kind === "pin") pinIdx.push(row.seq);
  }
  const counts = (await repo.metaGet("counts")) || {};
  for (const row of batch.rows) counts[row.kind] = (counts[row.kind] || 0) + 1;
  for (const row of batch.rows) {
    if (row.kind === "news" && row.doc.full_text) counts.news_full_text = (counts.news_full_text || 0) + 1;
    if (row.kind === "news" && row.doc.images.some((im) => im.sha256)) counts.news_image_hashed = (counts.news_image_hashed || 0) + 1;
    if (row.kind === "pin" && row.doc.role === "event" && row.doc.report_kind === "news" && !row.doc.geo) counts.news_event_location_null = (counts.news_event_location_null || 0) + 1;
    if (row.kind === "news") state.last_news_ms = now;
  }
  state.ticks = (state.ticks || 0) + 1;
  state.last_tick = report.at;
  batch.meta.state = state;
  batch.meta.outlets = outletStatus;
  batch.meta.recent = recent.slice(-RECENT_CAP);
  batch.meta.idx_news = newsIdx.slice(-500);
  batch.meta.idx_pins = pinIdx.slice(-500);
  batch.meta.counts = counts;
  const committed = await batch.commit();
  report.rows_appended = batch.rows.length;
  report.writes = committed.writes;
  report.cache_trimmed = await repo.cacheTrim(CACHE_KEEP);
  // Full checkpointed lattice walk, then the pin <-> item join check (both bounded).
  const w = await walkStep(repo, { now });
  report.walk = { verified_through: w.verified_through, tip: w.tip, lag_rows: w.lag_rows, breaks: w.breaks.length };
  const j = await joinCheck(repo, { now, verifiedThrough: w.verified_through });
  report.join = { joined: j.joined, merged: j.merged, linked: j.linked, sample: j.sample };
  return report;
}

/* --------------------------------------------------------------- reads */

function newsView(row) {
  if (!row) return null;
  const d = row.doc;
  return {
    seq: row.seq,
    item_id: d.item_id,
    outlet: d.outlet.name,
    outlet_id: d.outlet.id,
    title: d.title,
    link: d.canonical_url || d.link,
    published: d.published,
    full_text: d.full_text,
    text_source: d.text_source,
    wording: d.wording,
    images: d.images,
    score: d.score,
    reported_location: d.reported_location,
    event_location: d.event_location,
    event_location_reason: d.event_location_reason,
    black_swan_term: d.black_swan_term,
    lattice: { primary: row.lattice.primary, secondary: row.lattice.secondary, document_hash: row.lattice.document_hash },
  };
}

export function pinView(row) {
  if (!row) return null;
  const d = row.doc;
  return {
    pin_id: pinId(row.seq),
    seq: row.seq,
    added_at: row.at || null,
    pin_type: d.pin_type,
    color: d.color,
    color_hex: d.color_hex,
    role: d.role,
    event: d.event,
    date: d.date,
    date_reason: d.date_reason || null,
    era: d.era,
    geo: d.geo,
    geo_reason: d.geo_reason || null,
    report_location_source: d.role === "report" ? reportLocationSource(d) : null,
    report_seq: d.report_seq || null,
    report_kind: d.report_kind || null,
    pull_receipt_seq: d.pull_receipt_seq || null,
    links: d.links || null,
    match: d.match || null,
    source: d.source,
    permalink: `/aznews?pin=${pinId(row.seq)}`,
    lattice: { primary: row.lattice.primary, secondary: row.lattice.secondary },
  };
}

/** Mint view receipts (one per item per UTC hour; daily cap) for rows that were looked at. */
export async function mintViews(repo, reportSeqs, { via = "fraggate", offline = false, username = null, now = Date.now(), dry = false } = {}) {
  if (dry) return [...new Set(reportSeqs)].slice(0, 50).map((seq) => ({ report_seq: seq, view_receipt_seq: null, minted: false, dry_run: true, reason: "dry_run: the read was served and no receipt was minted" }));
  const batch = await openBatch(repo);
  const hour = new Date(now).toISOString().slice(0, 13);
  const out = [];
  for (const seq of [...new Set(reportSeqs)].slice(0, 50)) {
    const key = `v:${seq}:${hour}${offline ? `:${username}` : ""}`;
    const prior = batch.seen[key] || (await repo.seenGet(key));
    if (prior) {
      const priorRow = prior.seq ? await repo.rowGet(prior.seq) : null;
      out.push({ report_seq: seq, view_receipt_seq: prior.seq, pull_receipt_seq: (priorRow && priorRow.doc && priorRow.doc.pull_receipt_seq) || null, minted: false, reason: "already viewed this hour; the existing view receipt is returned" });
      continue;
    }
    if (batch.daily.views >= VIEW_RECEIPTS_PER_DAY) {
      out.push({ report_seq: seq, view_receipt_seq: null, minted: false, reason: "daily view-receipt cap reached; the read was served" });
      continue;
    }
    const report = await repo.rowGet(seq);
    if (!report) continue;
    const pull = report.kind === "news" ? await repo.seenGet(`i:${report.doc.item_id}`) : null;
    const pullSeq = pull ? pull.receipt : seq + 1;
    const pullRow = await repo.rowGet(pullSeq);
    try {
      const row = await batch.add(
        "view_receipt",
        {
          kind: "aznews-view-receipt",
          report_seq: seq,
          report_kind: report.kind,
          pull_receipt_seq: pullRow && pullRow.kind === "pull_receipt" ? pullSeq : null,
          pull_receipt_primary: pullRow && pullRow.kind === "pull_receipt" ? pullRow.lattice.primary : null,
          viewed_at: new Date(now).toISOString(),
          via,
          viewer: offline ? username : null,
          viewer_basis: offline ? "vh = sha256(\"aznews-viewer-v1:\" + name)[0..32]; the name is not stored" : null,
        },
        { offline, username },
      );
      batch.seen[key] = { seq: row.seq };
      batch.daily.views += 1;
      out.push({ report_seq: seq, view_receipt_seq: row.seq, pull_receipt_seq: row.doc.pull_receipt_seq, minted: true });
    } catch (err) {
      if (err instanceof LatticeError) out.push({ report_seq: seq, minted: false, code: err.code, reason: err.message });
      else throw err;
    }
  }
  const counts = (await repo.metaGet("counts")) || {};
  for (const row of batch.rows) counts[row.kind] = (counts[row.kind] || 0) + 1;
  if (batch.rows.length) batch.meta.counts = counts;
  await batch.commit();
  return out;
}

async function latestRows(repo, idxName, limit, cap = READ_LIMIT) {
  const idx = (await repo.metaGet(idxName)) || [];
  const seqs = idx.slice(-Math.min(limit, cap)).reverse();
  const rows = [];
  for (const s of seqs) rows.push(await repo.rowGet(s));
  return rows.filter(Boolean);
}

/* ------------------------------------------------- full lattice walk */

/**
 * AZNEWS-WALK-1.0: a checkpointed walk of the whole ledger from genesis (seq 1).
 * Each step reads at most WALK_ROWS_PER_STEP rows after the checkpoint, checks the
 * sequence is contiguous, checks both lattice links (primary and secondary prev
 * pointers and recomputed hashes, AZRT-DUAL-LATTICE-1.0), recomputes every document
 * hash, and only then moves the checkpoint (seq + both expected tips). When the
 * checkpoint reaches the ledger tip, the tip must equal the stored tips. Any break
 * is kept forever and stops the walk. Runs after every cron tick and on news_verify.
 */
export async function walkStep(repo, { now = Date.now(), maxRows = WALK_ROWS_PER_STEP, persist = true } = {}) {
  const prev = (await repo.metaGet("walk")) || null;
  const w = prev
    ? { ...prev, breaks: [...(prev.breaks || [])] }
    : { spec: WALK_SPEC, from_genesis: true, next: 1, expect: null, verified_through: 0, rows_walked: 0, document_hash_misses: 0, breaks: [], started_at: new Date(now).toISOString(), caught_up_at: null, steps: 0 };
  const tip = await repo.count();
  let walked = 0;
  if (!w.breaks.length && w.next <= tip) {
    const to = Math.min(tip, w.next + Math.max(1, maxRows) - 1);
    const rows = await repo.rowRange(w.next, to);
    let brk = null;
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || rows[i].seq !== w.next + i) {
        brk = { seq: w.next + i, reason: "sequence-gap" };
        break;
      }
    }
    if (!brk && rows.length !== to - w.next + 1) brk = { seq: w.next + rows.length, reason: "sequence-gap" };
    let res = null;
    if (!brk) {
      res = await verifyLattice(rows, { anchor: w.expect || undefined, legacyAllowed: false });
      if (!res.ok) brk = { seq: rows[res.breaks[0].seq].seq, reason: res.breaks[0].reason };
    }
    if (!brk) {
      for (const r of rows) {
        if ((await hashDoc(r.doc)) !== r.lattice.document_hash) {
          w.document_hash_misses += 1;
          brk = { seq: r.seq, reason: "document-hash-mismatch" };
          break;
        }
      }
    }
    if (brk) {
      w.breaks.push({ ...brk, at: new Date(now).toISOString() });
    } else {
      w.expect = res.tips;
      w.verified_through = to;
      w.next = to + 1;
      w.rows_walked += rows.length;
      walked = rows.length;
    }
  }
  if (!w.breaks.length && w.verified_through === tip && tip > 0) {
    const tips = await repo.metaGet("tips");
    if (!tips || tips.primary !== w.expect.primary || tips.secondary !== w.expect.secondary) {
      w.breaks.push({ seq: tip, reason: "stored-tips-differ-from-walk", at: new Date(now).toISOString() });
    } else {
      w.caught_up_at = new Date(now).toISOString();
    }
  }
  w.steps = (w.steps || 0) + 1;
  w.checked_at = new Date(now).toISOString();
  w.tip_at_check = tip;
  if (persist) await repo.commit({ meta: { walk: w } });
  return { ...w, tip, lag_rows: tip - w.verified_through, walked_this_step: walked, rows_per_step: maxRows };
}

export function walkLatticeLive(w, now = Date.now()) {
  if (!w) return { lattice_live: false, reason: "The full walk has not run yet." };
  if (!w.from_genesis) return { lattice_live: false, reason: "The walk did not start at genesis." };
  if ((w.breaks || []).length) return { lattice_live: false, reason: `The walk found a break at seq ${w.breaks[0].seq} (${w.breaks[0].reason}).` };
  if (!w.caught_up_at) return { lattice_live: false, reason: `The walk from genesis has not reached the tip yet (verified through seq ${w.verified_through}).` };
  if (now - Date.parse(w.caught_up_at) > CHECK_FRESH_MS) return { lattice_live: false, reason: "The last time the walk reached the tip is older than 15 minutes." };
  return { lattice_live: true, reason: null };
}

/* ---------------------------------------------------- pin <-> item join */

/**
 * AZNEWS-JOIN-1.0: the 4DMap pin <-> AZNews item join, checked on real links.
 * For each of the newest JOIN_SAMPLE stored items:
 *   news_pin direction  item -> its pins (index i:<item_id>), both roles (report, event)
 *   news_open direction each pin -> report_seq == the item, report_document_hash == the item's hash,
 *                       pull_receipt_seq == the item's pull receipt
 *   pull receipt        kind pull_receipt, report_seq and document_hash point back at the item
 *   item                its document hash recomputes
 * joined: at least one item and every sampled item passes both directions.
 * merged: joined, and every sampled item, pin and receipt sits at or below the
 *         full walk's verified_through (on the verified dual lattice).
 */
export async function joinCheck(repo, { now = Date.now(), sample = JOIN_SAMPLE, verifiedThrough = 0, persist = true } = {}) {
  const rows = await latestRows(repo, "idx_news", sample, sample);
  const results = [];
  for (const news of rows) {
    const r = { item_id: news.doc.item_id, report_seq: news.seq, pins: [], pull_receipt_seq: null, ok: false, on_verified_lattice: false, reason: null };
    const hit = await repo.seenGet(`i:${news.doc.item_id}`);
    if (!hit || hit.seq !== news.seq) {
      r.reason = "The item index does not point at this item.";
      results.push(r);
      continue;
    }
    r.pull_receipt_seq = hit.receipt || null;
    r.pins = (hit.pins || []).map(pinId);
    let bad = null;
    const roles = new Set();
    for (const s of hit.pins || []) {
      const p = await repo.rowGet(s);
      if (!p || p.kind !== "pin") { bad = `pin ${s} is missing`; break; }
      if (p.doc.report_seq !== news.seq) { bad = `pin ${s} names report ${p.doc.report_seq}`; break; }
      if (p.doc.report_document_hash !== news.lattice.document_hash) { bad = `pin ${s} carries another report hash`; break; }
      if (p.doc.pull_receipt_seq !== hit.receipt) { bad = `pin ${s} names another pull receipt`; break; }
      roles.add(p.doc.role);
    }
    const receipt = hit.receipt ? await repo.rowGet(hit.receipt) : null;
    if (!bad && (!receipt || receipt.kind !== "pull_receipt" || receipt.doc.report_seq !== news.seq || receipt.doc.document_hash !== news.lattice.document_hash)) bad = "The pull receipt does not link back to the item.";
    if (!bad && !(roles.has("report") && roles.has("event"))) bad = "The report pin or the event pin is missing.";
    if (!bad && (await hashDoc(news.doc)) !== news.lattice.document_hash) bad = "The item document hash does not recompute.";
    const maxSeq = Math.max(news.seq, receipt ? receipt.seq : 0, ...(hit.pins || [0]));
    r.on_verified_lattice = maxSeq <= verifiedThrough;
    if (bad) r.reason = bad;
    else r.ok = true;
    results.push(r);
  }
  const linked = results.filter((r) => r.ok).length;
  const joined = results.length > 0 && linked === results.length;
  const merged = joined && results.every((r) => r.on_verified_lattice);
  const out = {
    spec: JOIN_SPEC,
    checked_at: new Date(now).toISOString(),
    sample: results.length,
    linked,
    broken: results.filter((r) => !r.ok).slice(0, 5),
    off_verified_lattice: results.filter((r) => !r.on_verified_lattice).length,
    verified_through: verifiedThrough,
    joined,
    merged,
    example: results.find((r) => r.ok) || null,
    rule: "joined: every one of the newest stored items (up to 20) round-trips item -> pins (news_pin) and pin -> item (news_open) with matching report hash and pull receipt. merged: joined, and every sampled item, pin and receipt is inside the full-walk verified range.",
  };
  if (persist) await repo.commit({ meta: { join: out } });
  return out;
}

function freshCheck(at, now) {
  return Boolean(at) && now - Date.parse(at) <= CHECK_FRESH_MS;
}

export async function liveFlags(repo, now = Date.now()) {
  const state = (await repo.metaGet("state")) || {};
  const outlets = (await repo.metaGet("outlets")) || {};
  const counts = (await repo.metaGet("counts")) || {};
  const wired = wiredOutlets();
  const live = wired.filter((o) => {
    const s = outlets[o.id];
    return s && s.ok && s.items_returned > 0 && s.attempted_at && now - Date.parse(s.attempted_at) <= OUTLETS_LIVE_WINDOW_MS;
  });
  const walk = (await repo.metaGet("walk")) || null;
  const join = (await repo.metaGet("join")) || null;
  const lat = walkLatticeLive(walk, now);
  const joinFresh = Boolean(join) && freshCheck(join.checked_at, now);
  const joined = joinFresh && join.joined === true;
  const merged = joined && join.merged === true && lat.lattice_live;
  const lastWeather = state.last_weather || null;
  const weatherFresh = Boolean(state.last_weather_ms && now - state.last_weather_ms <= FRESH_MS);
  const skyFresh = Boolean(state.last_sky_ms && now - state.last_sky_ms <= FRESH_MS);
  const newsFresh = Boolean(state.last_news_ms && now - state.last_news_ms <= FRESH_MS);
  return {
    outlets_configured: OUTLETS.length,
    outlets_wired: wired.length,
    outlets_live: live.length,
    outlets_live_ids: live.map((o) => o.id),
    outlets_live_window: {
      kind: "rolling",
      minutes: OUTLETS_LIVE_WINDOW_MS / 60000,
      as_of: new Date(now).toISOString(),
      from: new Date(now - OUTLETS_LIVE_WINDOW_MS).toISOString(),
      rotation_minutes: Math.ceil(wired.length / OUTLETS_PER_TICK) * 2,
      note: "Rolling count, not a fixed number: it changes every 2-minute tick as outlets are re-fetched.",
    },
    outlets_live_rule: "Rolling: an outlet counts when a fetch in the last 60 minutes returned at least one item. One rotation over all wired outlets takes about rotation_minutes.",
    news_items_stored: counts.news || 0,
    news_full_text: counts.news_full_text || 0,
    news_summary_only: (counts.news || 0) - (counts.news_full_text || 0),
    news_image_hashed: counts.news_image_hashed || 0,
    news_event_location_null: counts.news_event_location_null || 0,
    weather_reports_stored: counts.weather || 0,
    sky_reports_stored: counts.sky || 0,
    pins_stored: counts.pin || 0,
    pull_receipts: counts.pull_receipt || 0,
    view_receipts: counts.view_receipt || 0,
    black_swans: counts.black_swan || 0,
    live: newsFresh && (counts.news || 0) > 0 && lat.lattice_live,
    live_rule: "live: a real item was stored in the last 3 hours AND lattice_live (full walk from genesis reached the tip in the last 15 minutes, no break).",
    weather_live: weatherFresh && Boolean(lastWeather) && (lastWeather.gaps || []).length === 0,
    weather_areas: lastWeather ? lastWeather.areas : [],
    weather_gaps: lastWeather ? lastWeather.gaps : [],
    sky_live: skyFresh,
    joined,
    merged,
    join_check: join ? { spec: join.spec, checked_at: join.checked_at, fresh: joinFresh, sample: join.sample, linked: join.linked, broken: join.broken, off_verified_lattice: join.off_verified_lattice, example: join.example, rule: join.rule } : null,
    joined_reason: joined ? null : !join ? "The pin <-> item join check has not run yet." : !joinFresh ? "The last join check is older than 15 minutes." : `Join check failed: ${join.linked}/${join.sample} items linked.`,
    merged_reason: merged ? null : !joined ? "Not joined." : !lat.lattice_live ? `lattice_live is false: ${lat.reason}` : `${join.off_verified_lattice} sampled items are not yet inside the verified walk.`,
    source_present: (counts.news || 0) > 0,
    lattice_live: lat.lattice_live,
    lattice_live_reason: lat.reason,
    lattice_walk: walk ? { spec: walk.spec, from_genesis: walk.from_genesis, verified_through: walk.verified_through, rows_walked: walk.rows_walked, breaks: walk.breaks, document_hash_misses: walk.document_hash_misses, caught_up_at: walk.caught_up_at, checked_at: walk.checked_at, tip_at_check: walk.tip_at_check, started_at: walk.started_at } : null,
    last_tick: state.last_tick || null,
    ticks: state.ticks || 0,
    cycle: state.cycle || 0,
  };
}

export async function read(repo, op, payload = {}, { now = Date.now(), auth = false } = {}) {
  const limit = Math.max(1, Math.min(READ_LIMIT, Number(payload.limit) || 20));
  const via = String(payload.via || "fraggate").slice(0, 40);
  const dry = truthy(payload.dry_run);
  const wantsOffline = truthy(payload.offline) || (payload.username != null && String(payload.username).trim() !== "");
  if (wantsOffline && !auth) {
    return { ok: false, refused: true, code: "AZNEWS-OFFLINE-AUTH-REQUIRED", message: "Offline view receipts need the token-authenticated GET /v1/aznews/* route. Nothing was read into the ledger and no name was written.", rule: OFFLINE_VIEW_RULE };
  }
  let viewer = null;
  if (wantsOffline) {
    viewer = await viewerHash(payload.username);
    if (!viewer) return { ok: false, refused: true, code: "AZNEWS-OFFLINE-USERNAME-REQUIRED", message: "An offline view needs a username. Nothing was written.", rule: OFFLINE_VIEW_RULE };
  }
  const viewOpts = { via, offline: wantsOffline, username: viewer, now, dry };
  if (op === "status") {
    const flags = await liveFlags(repo, now);
    const tips = (await repo.metaGet("tips")) || null;
    return { ok: true, spec: LIVE_SPEC, ...flags, tips, ledger_rows: await repo.count(), cache_rows: await repo.cacheCount(), storage: "durable-object-sqlite", kv_writes: false, d1_writes: false, specs: { feed: FEED_SPEC, geo: GEO_SPEC, weather: WEATHER_SPEC, sky: SKY_SPEC, pins: PINS_SPEC, match: MATCH_SPEC, outlets: OUTLETS_SPEC }, gazetteer: GAZETTEER_SOURCE, black_swan_rule: BLACK_SWAN_RULE };
  }
  if (op === "sources") {
    const outlets = (await repo.metaGet("outlets")) || {};
    const flags = await liveFlags(repo, now);
    return { ok: true, outlets_configured: OUTLETS.length, outlets_wired: flags.outlets_wired, outlets_live: flags.outlets_live, outlets: OUTLETS.map((o) => ({ ...o, live: flags.outlets_live_ids.includes(o.id), last: outlets[o.id] || null })) };
  }
  if (op === "feed") {
    let rows = await latestRows(repo, "idx_news", payload.outlet ? READ_LIMIT : limit);
    if (payload.outlet) rows = rows.filter((r) => r.doc.outlet.id === String(payload.outlet)).slice(0, limit);
    const views = await mintViews(repo, rows.map((r) => r.seq), viewOpts);
    return { ok: true, count: rows.length, items: rows.map(newsView), view_receipts: views };
  }
  if (op === "item") {
    const id = String(payload.item_id || payload.id || "");
    const hit = id.startsWith("n-") ? await repo.seenGet(`i:${id}`) : Number(id) ? { seq: Number(id) } : null;
    const row = hit ? await repo.rowGet(hit.seq) : null;
    if (!row || row.kind !== "news") return { ok: false, code: "AZNEWS-NO-MATCH", message: "No stored item has that id. Nothing was filled in." };
    const views = await mintViews(repo, [row.seq], viewOpts);
    const pins = [];
    for (const s of (hit.pins || [])) pins.push(pinView(await repo.rowGet(s)));
    const receipt = hit.receipt ? await repo.rowGet(hit.receipt) : null;
    return { ok: true, item: newsView(row), pins, pull_receipt: receipt, view_receipts: views };
  }
  if (op === "weather") {
    const state = (await repo.metaGet("state")) || {};
    const seqs = (state.last_weather && state.last_weather.seqs) || [];
    const rows = [];
    for (const s of seqs.slice(0, 40)) rows.push(await repo.rowGet(s));
    const views = await mintViews(repo, seqs.slice(0, 20), viewOpts);
    return {
      ok: true,
      observed_at: state.last_weather ? state.last_weather.at : null,
      source: OPEN_METEO,
      count: rows.filter(Boolean).length,
      gaps: state.last_weather ? state.last_weather.gaps : [],
      areas: state.last_weather ? state.last_weather.areas : [],
      regions: rows.filter(Boolean).map((r) => ({ seq: r.seq, anchor: r.doc.anchor, observed_at: r.doc.observed_at, reading: r.doc.reading, conditions: r.doc.conditions, severe: r.doc.severe, grid: r.doc.grid })),
      severe: rows.filter((r) => r && r.doc.severe.length).map((r) => ({ anchor: r.doc.anchor.name, severe: r.doc.severe })),
      view_receipts: views,
    };
  }
  if (op === "sky") {
    const state = (await repo.metaGet("state")) || {};
    const row = state.last_sky_seq ? await repo.rowGet(state.last_sky_seq) : null;
    if (!row) return { ok: false, code: "AZNEWS-SKY-ABSENT", message: "No sky report is stored yet." };
    const views = await mintViews(repo, [row.seq], viewOpts);
    return { ok: true, seq: row.seq, sky: row.doc, lattice: { primary: row.lattice.primary, secondary: row.lattice.secondary }, view_receipts: views };
  }
  if (op === "pins") {
    let rows = await latestRows(repo, "idx_pins", 200, 200);
    let pins = rows.map(pinView);
    if (payload.type) pins = pins.filter((p) => p.pin_type === String(payload.type));
    if (payload.era != null && payload.era !== "") pins = pins.filter((p) => inEra(p, payload.era));
    const last10 = rows.slice(0, 10).map(pinView).map((p) => ({ pin_id: p.pin_id, event: p.event, color: p.color, pin_type: p.pin_type, permalink: p.permalink, date: p.date, added_at: p.added_at, geo: p.geo }));
    return { ok: true, count: pins.length, pins: pins.slice(0, Number(payload.limit) || 200), last10, colors: PIN_COLORS, era_window_years: 3, match_rule: { spec: MATCH_SPEC, black: BLACK_RULE, white: WHITE_RULE } };
  }
  if (op === "pin") {
    const asked = String(payload.pin_id || payload.id || "");
    let row = null;
    if (asked) {
      const m = /^pin-(\d+)$/.exec(asked);
      row = m ? await repo.rowGet(Number(m[1])) : null;
    } else {
      const newest = await latestRows(repo, "idx_pins", 1, 1);
      row = newest[0] || null;
    }
    if (!row || row.kind !== "pin") return { ok: false, code: "AZNEWS-PIN-ABSENT", message: "No pin has that id." };
    const pin = pinView(row);
    const reportRow = pin.report_seq ? await repo.rowGet(pin.report_seq) : null;
    const views = pin.report_seq ? await mintViews(repo, [pin.report_seq], viewOpts) : [];
    return { ok: true, pin, report: reportRow ? (reportRow.kind === "news" ? newsView(reportRow) : { seq: reportRow.seq, kind: reportRow.kind, doc: reportRow.doc }) : null, view_receipts: views };
  }
  if (op === "receipts") {
    const total = await repo.count();
    const rows = await repo.rowRange(Math.max(1, total - 200), total);
    const out = rows.filter((r) => r.kind === "pull_receipt" || r.kind === "view_receipt").slice(-limit).reverse();
    return { ok: true, count: out.length, receipts: out.map((r) => ({ seq: r.seq, kind: r.kind, doc: r.doc, lattice: r.lattice })) };
  }
  if (op === "verify") {
    // Full checkpointed walk from genesis (AZNEWS-WALK-1.0), bounded per request; then the tail window.
    const steps = Math.max(1, Math.min(3, Number(payload.steps) || 1));
    let w = null;
    for (let i = 0; i < steps; i++) {
      w = await walkStep(repo, { now, persist: !dry });
      if (dry || w.breaks.length || w.lag_rows === 0) break;
    }
    const lat = walkLatticeLive(w, now);
    const total = await repo.count();
    const n = Math.max(2, Math.min(300, Number(payload.limit) || 200));
    const from = Math.max(1, total - n + 1);
    const rows = await repo.rowRange(from, total);
    const anchor = rows.length ? { primary: rows[0].lattice.primary_prev, secondary: rows[0].lattice.secondary_prev } : null;
    const tail = await verifyLattice(rows, { anchor, legacyAllowed: false });
    const tips = await repo.metaGet("tips");
    const join = dry ? (await repo.metaGet("join")) : await joinCheck(repo, { now, verifiedThrough: w.verified_through });
    return {
      ok: w.breaks.length === 0 && tail.ok,
      dry_run: dry,
      full_walk: {
        spec: WALK_SPEC,
        from_genesis: w.from_genesis,
        verified_through: w.verified_through,
        tip: w.tip,
        lag_rows: w.lag_rows,
        walked_this_request: w.walked_this_step,
        rows_per_step: w.rows_per_step,
        rows_walked_total: w.rows_walked,
        steps_total: w.steps,
        document_hash_misses: w.document_hash_misses,
        breaks: w.breaks,
        started_at: w.started_at,
        caught_up_at: w.caught_up_at,
        checkpoint: { next_seq: w.next, expect: w.expect },
        rule: "Each step reads at most rows_per_step rows after the checkpoint, checks seq contiguity, both lattice links and every document hash, then moves the checkpoint. At the tip, the stored tips must equal the walk. A break is permanent.",
      },
      lattice_live: lat.lattice_live,
      lattice_live_reason: lat.reason,
      tail_window: { from, to: total, ok: tail.ok, breaks: tail.breaks, tip_matches: Boolean(tips && rows.length && tips.primary === rows[rows.length - 1].lattice.primary) },
      tips,
      join,
    };
  }
  if (op === "news_pin") {
    // 4DMap joined path, item -> pins. Pins are minted at pull time; this reads them, it never invents one.
    let id = String(payload.item_id || payload.id || (payload.item && payload.item.item_id) || "");
    const url = String(payload.url || (payload.item && payload.item.url) || "");
    let hit = null;
    if (id.startsWith("n-")) hit = await repo.seenGet(`i:${id}`);
    else if (url) {
      const u = await repo.seenGet(`u:${await sha256Hex(canonicalUrl(url) || url)}`);
      if (u) { hit = { seq: u.seq, receipt: u.receipt, pins: u.pins }; id = u.item_id || ""; }
    } else if (!id) {
      const newest = await latestRows(repo, "idx_news", 1, 1);
      if (newest[0]) { id = newest[0].doc.item_id; hit = await repo.seenGet(`i:${id}`); }
    }
    if (!hit) return { ok: false, code: "AZNEWS-NO-MATCH", message: "No stored AZNews item matches that item_id or url. 4DMap does not pin an item that was not pulled. Nothing was written." };
    const row = await repo.rowGet(hit.seq);
    const pins = [];
    for (const s2 of hit.pins || []) pins.push(pinView(await repo.rowGet(s2)));
    const views = await mintViews(repo, [hit.seq], viewOpts);
    return { ok: true, path: "joined", direction: "item->pins", picked: payload.item_id || payload.url || payload.id ? "requested" : "newest stored item (no id given)", item: newsView(row), pins, pull_receipt_seq: hit.receipt || null, view_receipts: views, join: await repo.metaGet("join") };
  }
  if (op === "news_open") {
    // 4DMap joined path, pin -> item. The pin must name the item and carry its hash and pull receipt.
    const asked = String(payload.pin_id || payload.id || "");
    let row = null;
    if (asked) {
      const m = /^pin-(\d+)$/.exec(asked);
      row = m ? await repo.rowGet(Number(m[1])) : null;
    } else {
      const newest = await latestRows(repo, "idx_pins", 1, 1);
      row = newest[0] || null;
    }
    if (!row || row.kind !== "pin") return { ok: false, code: "AZNEWS-PIN-ABSENT", message: "No pin has that id. Pass pin_id like pin-123." };
    const pin = pinView(row);
    const report = pin.report_seq ? await repo.rowGet(pin.report_seq) : null;
    const linked = Boolean(report && report.lattice.document_hash === row.doc.report_document_hash);
    const views = await mintViews(repo, report ? [report.seq] : [], viewOpts);
    return { ok: Boolean(report), path: "joined", direction: "pin->item", picked: asked ? "requested" : "newest stored pin (no pin_id given)", pin, linked, item: report && report.kind === "news" ? newsView(report) : null, report: report && report.kind !== "news" ? { seq: report.seq, kind: report.kind, doc: report.doc } : null, view_receipts: views };
  }
  if (op === "globe") {
    // One read for the globe page: status, pins + last 10, headlines, weather, sky. One view-receipt batch.
    const flags = await liveFlags(repo, now);
    const pinRows = await latestRows(repo, "idx_pins", 200, 200);
    const newsRows = await latestRows(repo, "idx_news", 10);
    const state = (await repo.metaGet("state")) || {};
    const wSeqs = (state.last_weather && state.last_weather.seqs) || [];
    const wRows = [];
    for (const s of wSeqs.slice(0, 40)) wRows.push(await repo.rowGet(s));
    const skyRow = state.last_sky_seq ? await repo.rowGet(state.last_sky_seq) : null;
    const views = await mintViews(repo, [...newsRows.map((r) => r.seq), ...wSeqs, ...(skyRow ? [skyRow.seq] : [])], viewOpts);
    let pins = pinRows.map(pinView);
    if (payload.era != null && payload.era !== "") pins = pins.filter((p) => inEra(p, payload.era));
    return {
      ok: true,
      status: flags,
      pins,
      last10: pinRows.slice(0, 10).map(pinView).map((p) => ({ pin_id: p.pin_id, event: p.event, color: p.color, pin_type: p.pin_type, permalink: p.permalink, date: p.date, added_at: p.added_at, geo: p.geo })),
      colors: PIN_COLORS,
      items: newsRows.map(newsView).map((i) => ({ ...i, wording: String(i.wording || "").slice(0, 600) })),
      weather: { observed_at: state.last_weather ? state.last_weather.at : null, areas: flags.weather_areas, gaps: flags.weather_gaps, regions: wRows.filter(Boolean).map((r) => ({ seq: r.seq, anchor: r.doc.anchor, reading: r.doc.reading, conditions: r.doc.conditions, severe: r.doc.severe })), source: OPEN_METEO.attribution },
      sky: skyRow ? skyRow.doc : null,
      view_receipts_minted: views.filter((v) => v.minted).length,
    };
  }
  return { ok: false, code: "AZNEWS-UNKNOWN", message: "Unknown AZNews read." };
}

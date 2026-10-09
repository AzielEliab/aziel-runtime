/**
 * 4DMap standalone pin store (4DMAP-STORE-1.0). Lives in its own Durable Object
 * instance ("4dmap-v1", same SQLite ledger shape as the AZNews store, no KV/D1).
 * 4DMap does not need AZNews: this store holds map pins only, on the dual lattice.
 *
 * Layers:
 *   corpus     events from the Aziel Corpus map (GET https://azielcorpuslibrary.net/api/events):
 *              library-aziel-event / library-aziel-report / corpus-event / corpus-report,
 *              with the corpus's own place, date, record id, status and confidence.
 *   reference  places from the GeoNames gazetteer the 4dmap engine already ships
 *              (aznews-gazetteer.js, CC BY 4.0): national capitals and cities >= 1,000,000.
 *              Reference places, not events.
 * A corpus event whose content changes is stored again as a new row that names the row it
 * supersedes; reads show the newest row per source id. Nothing is invented: a corpus event
 * with no finite lat/lon is skipped. Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "../../session-core.js";
import { openBatch, walkStep, walkLatticeLive } from "./aznews-live.js";
import { GAZ_COUNTRIES, GAZ_CITIES, GAZETTEER_SOURCE } from "./aznews-gazetteer.js";
import { PIN_COLORS, matchPins, salientTokens, distanceKm, colorFor, BLACK_RULE, WHITE_RULE, MATCH_SPEC } from "./aznews-pins.js";

export const MAP_STORE_SPEC = "4DMAP-STORE-1.0";
export const MAP_DO_NAME = "4dmap-v1";
export const CORPUS_EVENTS_URL = "https://azielcorpuslibrary.net/api/events";
export const CORPUS_EVERY_MS = 10 * 60 * 1000;
export const MAP_ROWS_PER_TICK = 400;
/** Defense in depth for the corpus geoparser (same rule as aziel-corpus GEO-PIN-QUALITY-1.0). */
export const PIN_QUALITY_SPEC = "GEO-PIN-QUALITY-1.0";
export const LINK_SPEC = "4DMAP-LINK-1.0";
export const REFERENCE_LINK_KM = 50;
export const LINK_ITEMS_PER_TICK = 50;
export const LINK_RULE = Object.freeze({
  spec: LINK_SPEC,
  correspondence: "News item x corpus pin under " + MATCH_SPEC + " (shared salient entities + event place + dates within 3 years). black only when the BLACK rule passes; white when only the WHITE rule passes; nothing otherwise. The best match per item is stored.",
  reference_place: "News item x reference place: the item's resolved event location has the same place name as a reference place within " + REFERENCE_LINK_KM + " km. A place link, not a correspondence; never black or white.",
  black: BLACK_RULE,
  white: WHITE_RULE,
});

export function coordinateLooksReal(lat, lon) {
  lat = Number(lat); lon = Number(lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return false;
  if (Math.abs(lat) < 1 && Math.abs(lon) < 1) return false;
  if (lat === 0 || lon === 0) return false;
  if (Number.isInteger(lat) && Number.isInteger(lon)) return false;
  return true;
}

/** Why a corpus event is not a real pin (null when it is). Upstream's own retraction wins. */
export function corpusJunk(e) {
  if (e && e.retracted) return { retracted: String(e.retracted).slice(0, 40), reason: String(e.retract_reason || "Retracted by the corpus geoparser.").slice(0, 300), by: "aziel-corpus" };
  const name = String((e && e.place_name) || "").trim();
  if (!name || /^coord\s/i.test(name)) return { retracted: "geoparser_junk", reason: "No gazetteer-resolved place name (" + (name || "no name") + ").", by: "aziel-runtime" };
  if (!coordinateLooksReal(e.lat, e.lon)) return { retracted: "geoparser_junk", reason: "Coordinates (" + e.lat + ", " + e.lon + ") are not a real place (near 0,0, an exact 0, or whole degrees).", by: "aziel-runtime" };
  return null;
}

export const MAP_COLORS = Object.freeze({
  "library-aziel-event": PIN_COLORS["library-aziel-event"],
  "library-aziel-report": PIN_COLORS["library-aziel-report"],
  "corpus-event": PIN_COLORS["corpus-event"],
  "corpus-report": PIN_COLORS["corpus-report"],
  "reference-capital": { color: "grey", hex: "#9e9e9e", label: "Reference place: national capital (GeoNames; added; not in the operator palette; not an event)" },
  "reference-city": { color: "lightgrey", hex: "#cfd8dc", label: "Reference place: city of 1,000,000 or more (GeoNames; added; not in the operator palette; not an event)" },
});

const MAP_TYPES = new Set(Object.keys(MAP_COLORS));

function finite(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function pinDoc({ layer, pin_type, event, date, geo, source }) {
  const c = MAP_COLORS[pin_type];
  return { kind: "4dmap-pin", spec: MAP_STORE_SPEC, layer, pin_type, color: c.color, color_hex: c.hex, event, date: date || null, geo, source };
}

/** Pure: corpus /api/events body -> pin docs. Junk and retracted events go to .retractions, never to pins. */
export function corpusPinDocs(body) {
  const out = [];
  out.retractions = [];
  for (const e of (body && Array.isArray(body.events) ? body.events : [])) {
    const has = (v) => v !== null && v !== undefined && String(v).trim() !== "";
    const lat = e && has(e.lat) ? Number(e.lat) : NaN;
    const lon = e && has(e.lon) ? Number(e.lon) : NaN;
    if (!e || !e.event_id) continue;
    const junk = corpusJunk(e);
    if (junk) { out.retractions.push({ source_id: "corpus:" + String(e.event_id).slice(0, 80), ...junk }); continue; }
    if (!finite(lat) || !finite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const pin_type = MAP_TYPES.has(e.pin_type) && String(e.pin_type).match(/^(library-aziel|corpus)-/) ? e.pin_type : "corpus-event";
    out.push({
      source_id: "corpus:" + String(e.event_id).slice(0, 80),
      doc: pinDoc({
        layer: "corpus",
        pin_type,
        event: String(e.title || e.place_name || e.event_id).slice(0, 300),
        date: e.event_date ? String(e.event_date).slice(0, 40) : null,
        geo: { name: String(e.place_name || "").slice(0, 120), lat, lon, source: "aziel-corpus" },
        source: { api: CORPUS_EVENTS_URL, event_id: String(e.event_id), record_id: e.record_id || null, status: e.status || null, confidence: finite(Number(e.confidence)) ? Number(e.confidence) : null, method: e.source || null, library: e.library || null },
      }),
    });
  }
  return out;
}

/** Pure: GeoNames gazetteer -> reference pin docs (capitals, then cities >= 1,000,000). */
export function referencePinDocs() {
  const out = [];
  for (const [country, iso, lat, lon, capital] of GAZ_COUNTRIES) {
    if (!finite(lat) || !finite(lon)) continue;
    out.push({ source_id: "ref:capital:" + iso, doc: pinDoc({ layer: "reference", pin_type: "reference-capital", event: `${capital}, capital of ${country}`, date: null, geo: { name: capital, iso, lat, lon, source: "geonames" }, source: { gazetteer: GAZETTEER_SOURCE.name, license: GAZETTEER_SOURCE.license, url: GAZETTEER_SOURCE.url } }) });
  }
  const caps = new Set(GAZ_COUNTRIES.map((c) => `${c[4]}|${c[1]}`));
  for (const [name, lat, lon, iso, pop] of GAZ_CITIES) {
    if (!(pop >= 1000000) || caps.has(`${name}|${iso}`) || !finite(lat) || !finite(lon)) continue;
    out.push({ source_id: `ref:city:${iso}:${name}:${lat},${lon}`, doc: pinDoc({ layer: "reference", pin_type: "reference-city", event: `${name} (${iso}), population ${pop}`, date: null, geo: { name, iso, lat, lon, population: pop, source: "geonames" }, source: { gazetteer: GAZETTEER_SOURCE.name, license: GAZETTEER_SOURCE.license, url: GAZETTEER_SOURCE.url } }) });
  }
  const seen = new Set();
  return out.filter((c) => (seen.has(c.source_id) ? false : (seen.add(c.source_id), true)));
}

async function appendNew(repo, batch, candidates, cap) {
  let added = 0;
  let changed = 0;
  for (const c of candidates) {
    if (added + changed >= cap) break;
    const h = await sha256Hex(canonicalize(c.doc));
    const key = "m:" + c.source_id;
    const prior = batch.seen[key] || (await repo.seenGet(key));
    if (prior && prior.h === h) continue;
    const doc = prior ? { ...c.doc, supersedes_seq: prior.seq } : c.doc;
    const row = await batch.add("map_pin", { ...doc, source_id: c.source_id });
    batch.seen[key] = { seq: row.seq, h };
    if (prior) changed += 1;
    else added += 1;
  }
  return { added, changed };
}

/** Retract stored pins (append-only): a new map_pin row for the same source id, marked retracted. Never deletes. */
async function appendRetractions(repo, batch, retractions, cap) {
  let retracted = 0;
  for (const r of retractions) {
    if (retracted >= cap) break;
    const key = "m:" + r.source_id;
    const prior = batch.seen[key] || (await repo.seenGet(key));
    if (!prior || prior.retracted) continue; // never stored, or already retracted
    const row = await repo.rowGet(prior.seq);
    const base = row && row.doc ? row.doc : { kind: "4dmap-pin", spec: MAP_STORE_SPEC, layer: "corpus", source_id: r.source_id };
    const { supersedes_seq: _s, retracted: _r, retract_reason: _rr, retracted_by: _rb, ...keep } = base;
    const doc = { ...keep, supersedes_seq: prior.seq, retracted: r.retracted, retract_reason: r.reason, retracted_by: r.by, quality_spec: PIN_QUALITY_SPEC };
    const added = await batch.add("map_pin", doc);
    batch.seen[key] = { seq: added.seq, h: await sha256Hex(canonicalize(doc)), retracted: true };
    retracted += 1;
  }
  return retracted;
}

/** One bounded tick: reference layer (until complete), corpus layer every CORPUS_EVERY_MS, then the walk. */
export async function mapTick(repo, { fetchImpl = typeof fetch === "function" ? fetch : null, now = Date.now(), force = false } = {}) {
  const state = (await repo.metaGet("map_state")) || { last_corpus_ms: 0, ticks: 0 };
  const batch = await openBatch(repo);
  const report = { spec: MAP_STORE_SPEC, at: new Date(now).toISOString(), reference: null, corpus: null, subrequests: 0 };
  let room = MAP_ROWS_PER_TICK;
  if (!state.reference_complete) {
    const r = await appendNew(repo, batch, referencePinDocs(), room);
    room -= r.added + r.changed;
    report.reference = r;
    if (room > 0) state.reference_complete = true;
  }
  if (room > 0 && fetchImpl && (force || now - (state.last_corpus_ms || 0) >= CORPUS_EVERY_MS)) {
    report.subrequests += 1;
    try {
      const res = await fetchImpl(CORPUS_EVENTS_URL + "?include_retracted=1", { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (aziel-runtime 4dmap store)" } });
      if (res.ok) {
        const docs = corpusPinDocs(await res.json());
        const added = await appendNew(repo, batch, docs, room);
        const retracted = await appendRetractions(repo, batch, docs.retractions, Math.max(0, room - added.added - added.changed));
        report.corpus = { ok: true, valid_events: docs.length, refused_events: docs.retractions.length, ...added, retracted };
        state.last_corpus_ms = now;
        state.last_corpus = { at: report.at, valid_events: docs.length, refused_events: docs.retractions.length };
      } else {
        report.corpus = { ok: false, status: res.status };
        state.last_corpus_error = { at: report.at, status: res.status };
      }
    } catch (err) {
      report.corpus = { ok: false, reason: String((err && err.message) || err).slice(0, 120) };
      state.last_corpus_error = { at: report.at, reason: report.corpus.reason };
    }
  }
  state.ticks = (state.ticks || 0) + 1;
  state.last_tick = report.at;
  batch.meta.map_state = state;
  await batch.commit();
  report.rows_appended = batch.rows.length;
  const w = await walkStep(repo, { now });
  report.walk = { verified_through: w.verified_through, tip: w.tip, breaks: w.breaks.length };
  return report;
}

function pinView(row) {
  const d = row.doc || {};
  return { retracted: d.retracted || null, retract_reason: d.retract_reason || null, pin_id: "map-" + row.seq, seq: row.seq, added_at: row.at, layer: d.layer, pin_type: d.pin_type, color: d.color, color_hex: d.color_hex, event: d.event, date: d.date, geo: d.geo, source: d.source, source_id: d.source_id, supersedes_seq: d.supersedes_seq || null, lattice: { primary: row.lattice.primary, secondary: row.lattice.secondary, document_hash: row.lattice.document_hash } };
}

async function latestRows(repo) {
  const total = await repo.count();
  const scan = Math.min(total, 3000);
  const rows = total ? await repo.rowRange(total - scan + 1, total) : [];
  const latest = new Map();
  const links = [];
  for (const r of rows) {
    if (r.kind === "map_pin" && r.doc && r.doc.source_id) latest.set(r.doc.source_id, r);
    else if (r.kind === "map_link") links.push(r);
  }
  return { total, latest, links };
}

function linkView(r) {
  const d = r.doc || {};
  return { link_id: "link-" + r.seq, seq: r.seq, added_at: r.at, link_type: d.link_type, level: d.level || null, color: d.color || null, color_hex: d.color_hex || null, news: d.news, map: d.map, match: d.match || null, lattice: { primary: r.lattice.primary, document_hash: r.lattice.document_hash } };
}

/** Read the newest row per source id (bounded scan of the newest rows). Retracted pins hidden unless include_retracted. */
export async function mapRead(repo, payload = {}, { now = Date.now() } = {}) {
  const { total, latest, links } = await latestRows(repo);
  const withRetracted = payload.include_retracted === true || payload.include_retracted === "1";
  let pins = [...latest.values()].sort((a, b) => b.seq - a.seq).map(pinView);
  const retractedCount = pins.filter((p) => p.retracted).length;
  if (!withRetracted) pins = pins.filter((p) => !p.retracted);
  const layers = String(payload.layers || payload.layer || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (layers.length) pins = pins.filter((p) => layers.includes(p.layer));
  const lim = Math.max(1, Math.min(2000, Number(payload.limit) || 2000));
  const state = (await repo.metaGet("map_state")) || {};
  const walk = await repo.metaGet("walk");
  const lat = walkLatticeLive(walk, now);
  const counts = {};
  for (const p of latest.values()) if (!p.doc.retracted) counts[p.doc.layer] = (counts[p.doc.layer] || 0) + 1;
  const linkCounts = {};
  for (const l of links) linkCounts[l.doc.link_type + (l.doc.level ? ":" + l.doc.level : "")] = (linkCounts[l.doc.link_type + (l.doc.level ? ":" + l.doc.level : "")] || 0) + 1;
  return {
    ok: true,
    spec: MAP_STORE_SPEC,
    storage: "durable-object-sqlite",
    kv_writes: false,
    d1_writes: false,
    needs_aznews: false,
    retracted: { count: retractedCount, shown: withRetracted, rule: PIN_QUALITY_SPEC, note: "Retracted pins stay on the lattice (append-only); a later row for the same source id marks them retracted. Hidden unless ?include_retracted=1." },
    links: { counts: linkCounts, rule: LINK_RULE, newest: payload.links === true || payload.links === "1" ? links.slice(-200).reverse().map(linkView) : undefined },
    layers: { corpus: { count: counts.corpus || 0, source: CORPUS_EVENTS_URL, last: state.last_corpus || null, last_error: state.last_corpus_error || null }, reference: { count: counts.reference || 0, source: GAZETTEER_SOURCE, complete: Boolean(state.reference_complete) } },
    pins: pins.slice(0, lim),
    last10: pins.filter((p) => p.layer !== "reference").slice(0, 10),
    colors: MAP_COLORS,
    ledger_rows: total,
    tips: await repo.metaGet("tips"),
    lattice_live: lat.lattice_live,
    lattice_live_reason: lat.reason,
    lattice_walk: walk ? { verified_through: walk.verified_through, from_genesis: walk.from_genesis, breaks: walk.breaks, caught_up_at: walk.caught_up_at } : null,
  };
}

/** Pure: the corpus date as something Date.parse reads ("1101", "2026-07", "1936-08-07"). */
function corpusDateIso(d) {
  const t = String(d || "").trim();
  return /^-?\d{4}(-\d{2}){0,2}$/.test(t) ? t : null;
}

/**
 * Correspondence and reference-place links (4DMAP-LINK-1.0) for news items handed in by the
 * runtime cron (newest AZNews items, read with dry_run). Each item is checked once. Links are
 * map_link rows on this store's lattice; they name the news report's document hash and the
 * map pin's document hash, so either side can be re-checked. Never promotes without the rule.
 */
export async function mapLink(repo, items = [], { now = Date.now() } = {}) {
  const { latest } = await latestRows(repo);
  const corpus = [];
  const refByName = new Map();
  for (const r of latest.values()) {
    const d = r.doc;
    if (!d || d.retracted || !d.geo) continue;
    if (d.layer === "corpus") corpus.push({ r, date: corpusDateIso(d.date), tokens: salientTokens(d.event), geo: { lat: d.geo.lat, lon: d.geo.lon } });
    if (d.layer === "reference") {
      const k = String(d.geo.name || "").toLowerCase();
      if (!refByName.has(k)) refByName.set(k, []);
      refByName.get(k).push(r);
    }
  }
  const batch = await openBatch(repo);
  const out = { spec: LINK_SPEC, checked: 0, correspondence: { black: 0, white: 0 }, reference_place: 0, skipped_seen: 0 };
  const mapSide = (r) => ({ pin_seq: r.seq, pin_id: "map-" + r.seq, source_id: r.doc.source_id, layer: r.doc.layer, document_hash: r.lattice.document_hash, event: r.doc.event, date: r.doc.date || null, geo: r.doc.geo });
  for (const it of (Array.isArray(items) ? items : []).slice(0, LINK_ITEMS_PER_TICK)) {
    if (!it || !it.item_id || !it.document_hash) continue;
    const key = "n:" + it.item_id;
    if (batch.seen[key] || (await repo.seenGet(key))) { out.skipped_seen += 1; continue; }
    out.checked += 1;
    const ev = it.event_location && Number.isFinite(Number(it.event_location.lat)) && Number.isFinite(Number(it.event_location.lon)) ? it.event_location : null;
    const news = { item_id: it.item_id, report_seq: it.seq || null, report_document_hash: it.document_hash, outlet_id: it.outlet_id || null, title: String(it.title || "").slice(0, 240), published: it.published || null, event_location: ev ? { name: ev.name || null, lat: Number(ev.lat), lon: Number(ev.lon) } : null };
    const result = { item_id: it.item_id, correspondence: null, reference_place: null };
    if (ev && it.published) {
      const a = { source: "aznews:" + (it.outlet_id || ""), date: it.published, geo: { lat: Number(ev.lat), lon: Number(ev.lon) }, tokens: salientTokens(it.title, it.outlet) };
      let best = null;
      for (const c of corpus) {
        if (!c.date) continue;
        const m = matchPins(a, { source: "corpus", date: c.date, geo: c.geo, tokens: c.tokens });
        if (m.level !== "black" && m.level !== "white") continue;
        if (!best || (m.level === "black" && best.m.level !== "black") || (m.level === best.m.level && m.jaccard > best.m.jaccard)) best = { c, m };
      }
      if (best) {
        const type = best.m.level === "black" ? "correspondence" : "correspondence-candidate";
        const col = colorFor(type);
        await batch.add("map_link", { kind: "4dmap-link", spec: LINK_SPEC, link_type: "correspondence", level: best.m.level, pin_type: type, color: col.color, color_hex: col.hex, news, map: mapSide(best.c.r), match: { ...best.m, rule: best.m.level === "black" ? BLACK_RULE : WHITE_RULE } });
        out.correspondence[best.m.level] += 1;
        result.correspondence = best.m.level;
      }
      const name = String(ev.name || "").toLowerCase();
      let ref = null;
      for (const r of (name ? refByName.get(name) || [] : [])) {
        const km = distanceKm({ lat: Number(ev.lat), lon: Number(ev.lon) }, r.doc.geo);
        if (km <= REFERENCE_LINK_KM && (!ref || km < ref.km)) ref = { r, km };
      }
      if (ref) {
        await batch.add("map_link", { kind: "4dmap-link", spec: LINK_SPEC, link_type: "reference-place", level: null, news, map: mapSide(ref.r), match: { rule: LINK_RULE.reference_place, name_match: true, distance_km: Number(ref.km.toFixed(1)) } });
        out.reference_place += 1;
        result.reference_place = ref.r.doc.source_id;
      }
    }
    batch.seen[key] = { at: new Date(now).toISOString(), ...result };
  }
  await batch.commit();
  out.rows_appended = batch.rows.length;
  return out;
}

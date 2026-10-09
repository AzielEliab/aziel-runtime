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
import { PIN_COLORS } from "./aznews-pins.js";

export const MAP_STORE_SPEC = "4DMAP-STORE-1.0";
export const MAP_DO_NAME = "4dmap-v1";
export const CORPUS_EVENTS_URL = "https://azielcorpuslibrary.net/api/events";
export const CORPUS_EVERY_MS = 10 * 60 * 1000;
export const MAP_ROWS_PER_TICK = 400;

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

/** Pure: corpus /api/events body -> pin docs (skips rows without a finite place). */
export function corpusPinDocs(body) {
  const out = [];
  for (const e of (body && Array.isArray(body.events) ? body.events : [])) {
    const has = (v) => v !== null && v !== undefined && String(v).trim() !== "";
    const lat = e && has(e.lat) ? Number(e.lat) : NaN;
    const lon = e && has(e.lon) ? Number(e.lon) : NaN;
    if (!e || !e.event_id || !finite(lat) || !finite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
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
      const res = await fetchImpl(CORPUS_EVENTS_URL, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (aziel-runtime 4dmap store)" } });
      if (res.ok) {
        const docs = corpusPinDocs(await res.json());
        report.corpus = { ok: true, events_with_place: docs.length, ...(await appendNew(repo, batch, docs, room)) };
        state.last_corpus_ms = now;
        state.last_corpus = { at: report.at, events_with_place: docs.length };
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
  return { pin_id: "map-" + row.seq, seq: row.seq, added_at: row.at, layer: d.layer, pin_type: d.pin_type, color: d.color, color_hex: d.color_hex, event: d.event, date: d.date, geo: d.geo, source: d.source, source_id: d.source_id, supersedes_seq: d.supersedes_seq || null, lattice: { primary: row.lattice.primary, secondary: row.lattice.secondary, document_hash: row.lattice.document_hash } };
}

/** Read the newest row per source id (bounded scan of the newest rows). */
export async function mapRead(repo, payload = {}, { now = Date.now() } = {}) {
  const total = await repo.count();
  const scan = Math.min(total, 3000);
  const rows = total ? await repo.rowRange(total - scan + 1, total) : [];
  const latest = new Map();
  for (const r of rows) if (r.kind === "map_pin" && r.doc && r.doc.source_id) latest.set(r.doc.source_id, r);
  let pins = [...latest.values()].sort((a, b) => b.seq - a.seq).map(pinView);
  const layers = String(payload.layers || payload.layer || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (layers.length) pins = pins.filter((p) => layers.includes(p.layer));
  const lim = Math.max(1, Math.min(2000, Number(payload.limit) || 2000));
  const state = (await repo.metaGet("map_state")) || {};
  const walk = await repo.metaGet("walk");
  const lat = walkLatticeLive(walk, now);
  const counts = {};
  for (const p of latest.values()) counts[p.doc.layer] = (counts[p.doc.layer] || 0) + 1;
  return {
    ok: true,
    spec: MAP_STORE_SPEC,
    storage: "durable-object-sqlite",
    kv_writes: false,
    d1_writes: false,
    needs_aznews: false,
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

/**
 * AZNews geoparser (AZNEWS-GEO-1.0). Documented and deterministic. No guessing.
 *
 * Gazetteer: GeoNames countries (capital point) and cities (population >= 1M or
 * national capitals). See aznews-gazetteer.js for the source and license.
 *
 * Rules:
 * 1. Names match case-sensitively on word boundaries, longest name first.
 *    A small stoplist drops names that are usually ordinary words or
 *    people's names in English news (Male, Victoria, Chad, Georgia, ...).
 * 2. The outlet's own name is removed from the text first, so "New York Post"
 *    does not place a story in New York.
 * 3. Event location: scan the title; if nothing matches, scan the first 600
 *    characters of the text. The earliest match wins. When a city and its own
 *    country are both named, the city wins (finer point). A city name shared
 *    by several countries is accepted only when one of those countries is
 *    also named in the same text; otherwise it is ambiguous and skipped.
 * 4. No match: event_location is null with a reason. Never a guess.
 * 5. Reported location: a dateline at the start of the text ("KYIV, Ukraine
 *    (AP) -", "LONDON -") resolved through the same gazetteer; otherwise the
 *    outlet headquarters from the outlet config (precision "outlet-hq").
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { GAZ_CITIES, GAZ_COUNTRIES, GAZETTEER_SOURCE } from "./aznews-gazetteer.js";
import { GAZ_ADMIN1, GAZ_NAMED, REGIONS_SOURCE } from "./aznews-regions.js";

/**
 * AZNEWS-GEO-1.1 adds admin-1 regions (states, provinces) and named regions (seas,
 * gulfs, deserts, ranges) from Natural Earth (public domain), plus a short curated
 * list of news regions (CURATED_REGIONS) with approximate centroids, labeled as such.
 * Finer wins: city > admin-1/named region > country. An admin-1 name shared by
 * several countries resolves only when one of those countries is named in the same
 * text, or else to the outlet's home country when exactly one candidate is there
 * (labeled resolved_by "outlet-country"). Otherwise it is skipped. Never a guess.
 */
const CURATED_REGIONS = [
  ["Gulf Coast", "US", 29.5, -91.5], ["Midwest", "US", 41.9, -89.5], ["New England", "US", 43.9, -71.6],
  ["Pacific Northwest", "US", 46.5, -121.5], ["Deep South", "US", 32.5, -87.5], ["Appalachia", "US", 37.8, -81.0],
  ["Bay Area", "US", 37.7, -122.2], ["Southern California", "US", 34.0, -117.8], ["Great Plains", "US", 40.5, -100.5],
  ["Middle East", null, 29.0, 42.0], ["Sahel", null, 14.5, 2.0], ["Horn of Africa", null, 8.0, 45.0],
  ["Balkans", null, 43.0, 20.0], ["Caucasus", null, 42.0, 45.0], ["Kashmir", null, 34.5, 75.5],
  ["Donbas", "UA", 48.2, 38.3], ["Scandinavia", null, 62.0, 14.0], ["Southeast Asia", null, 10.0, 106.0],
  ["Central Asia", null, 43.0, 66.0], ["Latin America", null, -10.0, -60.0], ["Sub-Saharan Africa", null, 0.0, 22.0],
  ["West Africa", null, 11.0, -3.0], ["East Africa", null, -1.0, 36.0], ["Siberia", "RU", 62.0, 100.0],
  ["Patagonia", null, -45.0, -69.0], ["the Arctic", null, 78.0, 0.0], ["Antarctica", "AQ", -80.0, 0.0],
  ["Outback", "AU", -25.0, 134.0], ["Punjab", null, 30.9, 74.0], ["Tibet", "CN", 31.5, 88.0],
];
// Region names that are usually people, brands or ordinary words in English news
// (screened against a 10k common-word list and a first-name list on 2026-10-10).
const REGION_STOP = new Set(["Balkan", "Gulf", "Coast", "Pool", "Lori", "Lola", "Jewish", "Mary", "Northwest", "Southwest", "Maritime", "Mara", "Mono", "Unity", "Diana", "Magdalena", "Miranda", "Rivers", "Aurora", "Isabel", "Antique", "Saba", "Nelson", "Lara", "Luce", "Grad", "Meta", "Constantine", "Lira", "City", "Batman", "Orel", "Abra", "Paul", "Paola", "Amazon", "Angus", "Highland", "Midlands", "Cher", "Marne", "Latina", "Bedford", "Derby", "Kara", "Farah", "Lindi", "Marj", "Acre", "Charlotte", "Westminster", "Jersey", "Tobago", "Moselle", "Bari", "Mali Kanal", "Sarah", "Alexandra", "Elizabeth", "Columbia", "Hope", "Lincoln", "Douglas", "Grant", "Clay", "Logan", "Morgan", "Taylor", "Harris", "Lewis", "Davis", "Martin", "Bolivar", "Sucre", "Grace", "Prince", "Liberty", "Union", "Independence", "Progreso", "Esperanza", "Concordia", "Victory", "Champagne", "Bordeaux", "Burgundy", "Cognac"]);


export const GEO_SPEC = "AZNEWS-GEO-1.1";
export const EVENT_SCAN_CHARS = 600;

const STOP = new Set(["Male", "Victoria", "Hamilton", "Kingston", "Pest", "Teni", "Aba", "Jos", "Hue", "Kota", "Puxi", "Chad", "Georgia", "Of", "Nice", "Reading", "Mobile", "Split"]);

const ALIASES = [
  ["United States", "US"],
  ["U.S.", "US"],
  ["USA", "US"],
  ["America", "US"],
  ["United Kingdom", "GB"],
  ["UK", "GB"],
  ["U.K.", "GB"],
  ["Britain", "GB"],
  ["England", "GB"],
  ["Scotland", "GB"],
  ["Wales", "GB"],
  ["Gaza", "PS"],
  ["West Bank", "PS"],
  ["Palestine", "PS"],
  ["South Korea", "KR"],
  ["North Korea", "KP"],
  ["Russia", "RU"],
  ["Iran", "IR"],
  ["Syria", "SY"],
  ["Vietnam", "VN"],
  ["Taiwan", "TW"],
  ["Congo", "CD"],
  ["DR Congo", "CD"],
  ["Ivory Coast", "CI"],
  ["Czech Republic", "CZ"],
  ["Turkiye", "TR"],
  ["Türkiye", "TR"],
  ["Holland", "NL"],
  ["the Netherlands", "NL"],
  ["the Philippines", "PH"],
  ["Kiev", "UA-KYIV"],
  ["New Delhi", "IN-DELHI"],
];

let INDEX = null;

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function build() {
  if (INDEX) return INDEX;
  const byIso = new Map();
  const entries = [];
  for (const [name, iso, lat, lon, capital] of GAZ_COUNTRIES) {
    const row = { name, kind: "country", iso, lat, lon, precision: "country-capital-point", capital };
    byIso.set(iso, row);
    if (!STOP.has(name)) entries.push(row);
  }
  const regionByName = new Map();
  const addRegion = (row) => {
    if (STOP.has(row.name) || REGION_STOP.has(row.name)) return;
    const list = regionByName.get(row.name) || [];
    if (!list.some((r) => r.iso === row.iso)) list.push(row);
    regionByName.set(row.name, list);
  };
  for (const [name, iso, lat, lon, type] of GAZ_ADMIN1) addRegion({ name, kind: "admin1", admin_type: type, iso: iso && iso !== "-1" ? iso : null, lat, lon, precision: "admin1-label-point", gaz: REGIONS_SOURCE.name });
  for (const [name, lat, lon, cls] of GAZ_NAMED) addRegion({ name, kind: "named-region", feature_class: cls, iso: null, lat, lon, precision: "named-region-centroid", gaz: REGIONS_SOURCE.name });
  for (const [name, iso, lat, lon] of CURATED_REGIONS) addRegion({ name, kind: "named-region", iso, lat, lon, precision: "curated-region-approx-centroid", gaz: "AZNews curated" });
  const cityByName = new Map();
  for (const [name, lat, lon, iso, pop] of GAZ_CITIES) {
    if (STOP.has(name)) continue;
    const list = cityByName.get(name) || [];
    list.push({ name, kind: "city", iso, lat, lon, precision: "city", population: pop });
    cityByName.set(name, list);
  }
  for (const [alias, iso] of ALIASES) {
    if (iso === "UA-KYIV") {
      const kyiv = (cityByName.get("Kyiv") || [])[0];
      if (kyiv) entries.push({ ...kyiv, name: alias, alias_of: "Kyiv" });
      continue;
    }
    if (iso === "IN-DELHI") {
      const delhi = (cityByName.get("New Delhi") || cityByName.get("Delhi") || [])[0];
      if (delhi) entries.push({ ...delhi, name: alias, alias_of: delhi.name });
      continue;
    }
    const base = byIso.get(iso);
    if (base) entries.push({ ...base, name: alias, alias_of: base.name });
  }
  const cityNames = new Set(GAZ_CITIES.map((c) => c[0]));
  const countryNames = new Set(entries.map((e) => e.name));
  for (const [name, list] of regionByName) {
    if (cityNames.has(name) || countryNames.has(name)) continue; // cities and countries keep their names
    const isos = [...new Set(list.map((row) => row.iso))];
    entries.push({ ...list[0], name, ambiguous_isos: list.length > 1 ? isos : null, candidates: list.length > 1 ? list : null });
  }
  for (const [name, list] of cityByName) {
    const isos = [...new Set(list.map((row) => row.iso))];
    const best = list.slice().sort((a, b) => (b.population || 0) - (a.population || 0))[0];
    entries.push({ ...best, name, ambiguous_isos: isos.length > 1 ? isos : null, candidates: isos.length > 1 ? list : null });
  }
  entries.sort((a, b) => b.name.length - a.name.length);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${entries.map((e) => escapeRe(e.name)).join("|")})(?![\\p{L}\\p{N}])`, "gu");
  const byName = new Map();
  for (const e of entries) if (!byName.has(e.name)) byName.set(e.name, e);
  INDEX = { re, byName, byIso };
  return INDEX;
}

function scrub(text, outletName) {
  let out = String(text || "");
  if (outletName) out = out.split(outletName).join(" ");
  return out;
}

/** All gazetteer hits in order of position. */
export function placeMentions(text, outletName) {
  const { re, byName } = build();
  const hay = scrub(text, outletName);
  const hits = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(hay))) {
    const e = byName.get(m[0]);
    if (e) hits.push({ at: m.index, entry: e });
  }
  return hits;
}

function view(entry, source, matched) {
  return {
    name: entry.alias_of || entry.name,
    matched,
    kind: entry.kind,
    iso: entry.iso,
    lat: entry.lat,
    lon: entry.lon,
    precision: entry.precision,
    source,
    gazetteer: entry.gaz || GAZETTEER_SOURCE.name,
    geoparser: GEO_SPEC,
  };
}

const FINER = (e) => (e.kind === "city" ? 0 : e.kind === "admin1" || e.kind === "named-region" ? 1 : 2);

function resolveHits(hits, source, homeIso) {
  if (!hits.length) return null;
  const countries = new Set(hits.filter((h) => h.entry.kind === "country").map((h) => h.entry.iso));
  const pickAmbiguous = (e) => {
    const named = (e.candidates || []).filter((c) => countries.has(c.iso));
    if (named.length === 1) return { row: named[0], by: "named-country" };
    if (e.kind !== "city" && homeIso) {
      const home = (e.candidates || []).filter((c) => c.iso === homeIso);
      if (home.length === 1) return { row: home[0], by: "outlet-country" };
    }
    return null;
  };
  const resolved = [];
  for (const hit of hits) {
    const e = hit.entry;
    if (e.ambiguous_isos) {
      const p = pickAmbiguous(e);
      if (p) resolved.push({ ...p.row, name: e.name, resolved_by: p.by });
      continue;
    }
    resolved.push(e);
  }
  if (!resolved.length) return null;
  const first = resolved[0];
  // Finer point inside the same country wins over the earliest coarser mention.
  let best = first;
  for (const r of resolved) {
    if (FINER(r) < FINER(best) && (best.iso == null ? r.iso == null || FINER(best) === 1 : r.iso === best.iso)) best = r;
  }
  const v = view(best, source, best.name);
  if (best.resolved_by) v.resolved_by = best.resolved_by;
  return v;
}

/** Event location from the title, then the first 600 characters of the text. */
export function eventLocation({ title, text, outletName, outletCountry } = {}) {
  const fromTitle = resolveHits(placeMentions(title, outletName), "title", outletCountry);
  if (fromTitle) return { event_location: fromTitle, reason: null };
  const fromText = resolveHits(placeMentions(String(text || "").slice(0, EVENT_SCAN_CHARS), outletName), "text-first-600", outletCountry);
  if (fromText) return { event_location: fromText, reason: null };
  return {
    event_location: null,
    reason: `No unambiguous ${GAZETTEER_SOURCE.name} or ${REGIONS_SOURCE.name} place or region name was found in the title or the first ${EVENT_SCAN_CHARS} characters of the text. Nothing was guessed.`,
  };
}

const MONTHS = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?";
/**
 * Datelines (AZNEWS-GEO-1.0), read from the item text, never the title:
 *   "TOKYO (AP) — ...", "LONDON, Oct 9 (Reuters) - ...", "Kyiv, Ukraine — ...",
 *   "NEW DELHI: ...", "Mumbai, October 9: ...", "WASHINGTON — ..."
 * The candidate must resolve to one gazetteer place, so "Video: ..." or "Watch: ..." never count.
 */
const DATELINE_RE = new RegExp(
  "^\\s*(?:\\(?[A-Z][A-Za-z]+\\)?\\s+)?" +
    "([A-Z][A-Za-z.'\\- ]{1,40}?)" +
    "(?:,\\s*([A-Z][A-Za-z.' ]{1,30}?))?" +
    "(?:,?\\s+" + MONTHS + "\\s+\\d{1,2}(?:,\\s*\\d{4})?)?" +
    "\\s*(?:\\([^)]{1,40}\\))?" +
    "\\s*(?:[\\u2014\\u2013-]{1,2}|:)\\s+\\S",
);
const DATELINE_RE_STRICT = new RegExp(
  "^\\s*([A-Z][A-Za-z.'\\- ]{1,40}?)" +
    "(?:,\\s*([A-Z][A-Za-z.' ]{1,30}?))?" +
    "(?:,?\\s+" + MONTHS + "\\s+\\d{1,2}(?:,\\s*\\d{4})?)?" +
    "\\s*(?:\\([^)]{1,40}\\))?" +
    "\\s*(?:[\\u2014\\u2013-]{1,2}|:)\\s+\\S",
);

function datelineOf(text) {
  const t = String(text || "").replace(/^\s+/, "");
  const m = DATELINE_RE_STRICT.exec(t) || DATELINE_RE.exec(t);
  if (!m) return null;
  const raw = m[1].trim();
  if (raw.split(/\s+/).length > 4) return null;
  const city = raw === raw.toUpperCase() ? raw.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : raw;
  const hits = placeMentions(`${city}${m[2] ? `, ${m[2]}` : ""}`);
  const hit = resolveHits(hits, "dateline");
  if (!hit) return null;
  return { ...hit, dateline: m[0].slice(0, -1).trim().slice(0, 80) };
}

/**
 * Reported location: the dateline in the item text (summary, then full text).
 * Only when the text has no resolvable dateline: the outlet HQ, labeled
 * report_location_source "outlet_hq" so it is never read as a dateline.
 */
export function reportedLocation({ text, fullText, outlet } = {}) {
  for (const body of [text, fullText]) {
    const hit = datelineOf(body);
    if (hit) return { reported_location: { ...hit, report_location_source: "dateline" }, reason: null };
  }
  if (outlet && Number.isFinite(outlet.hq_lat) && Number.isFinite(outlet.hq_lon)) {
    return {
      reported_location: {
        name: outlet.hq_city,
        kind: "outlet-hq",
        iso: outlet.country,
        lat: outlet.hq_lat,
        lon: outlet.hq_lon,
        precision: "outlet-hq",
        source: "outlet-config",
        report_location_source: "outlet_hq",
        geoparser: GEO_SPEC,
      },
      reason: "The item text has no resolvable dateline. The outlet headquarters from the outlet config is used and labeled report_location_source: outlet_hq.",
    };
  }
  return { reported_location: null, reason: "No dateline in the item text and no outlet headquarters on record." };
}

export { GAZETTEER_SOURCE };

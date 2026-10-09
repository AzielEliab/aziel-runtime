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

export const GEO_SPEC = "AZNEWS-GEO-1.0";
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
    gazetteer: GAZETTEER_SOURCE.name,
    geoparser: GEO_SPEC,
  };
}

function resolveHits(hits, source) {
  if (!hits.length) return null;
  const countries = new Set(hits.filter((h) => h.entry.kind === "country").map((h) => h.entry.iso));
  for (const hit of hits) {
    const e = hit.entry;
    if (e.kind === "city" && e.ambiguous_isos) {
      const pick = (e.candidates || []).find((c) => countries.has(c.iso));
      if (!pick) continue;
      return view({ ...pick, name: e.name }, source, e.name);
    }
    if (e.kind === "country") {
      const city = hits.find((h) => h.entry.kind === "city" && !h.entry.ambiguous_isos && h.entry.iso === e.iso);
      if (city) return view(city.entry, source, city.entry.name);
    }
    return view(e, source, e.name);
  }
  return null;
}

/** Event location from the title, then the first 600 characters of the text. */
export function eventLocation({ title, text, outletName } = {}) {
  const fromTitle = resolveHits(placeMentions(title, outletName), "title");
  if (fromTitle) return { event_location: fromTitle, reason: null };
  const fromText = resolveHits(placeMentions(String(text || "").slice(0, EVENT_SCAN_CHARS), outletName), "text-first-600");
  if (fromText) return { event_location: fromText, reason: null };
  return {
    event_location: null,
    reason: `No unambiguous ${GAZETTEER_SOURCE.name} place name was found in the title or the first ${EVENT_SCAN_CHARS} characters of the text. Nothing was guessed.`,
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

/**
 * AZNews / 4DMap pin types, colors, eras, and correspondence matching
 * (AZNEWS-PINS-1.0). Shared by the runtime store, the runtime globe page,
 * and (copied verbatim) the corpus /map client.
 *
 * Colors (operator palette, 2026-10-09):
 *   RED         news event location
 *   BLUE        news reporting location (dateline or cited origin in the text; outlet HQ only when the text names none)
 *   PURPLE      Aziel Eliab library (corpus) document event locations
 *   PINK        that library document's origin/report locations as cited IN the document
 *   LIGHT GREEN all other corpus event locations
 *   DARK GREEN  all other corpus report locations
 *   BLACK       corresponding events (the matching rule passed)
 *   WHITE       potential corresponding events (candidate, below the confirmation threshold)
 * Added for the weather and sky reports, which the palette does not name:
 *   ORANGE      weather report (observation anchor) and weather event (model grid cell)
 *   GOLD        sky report (prime-meridian reference) and sky event (sub-solar point)
 *
 * Report locations come from the document's own content, never from who filed
 * or uploaded it.
 *
 * TEMPORAL: every pin carries the event date (not the pull date) when known and
 * its era (year, decade, century). No date -> date:null with a reason.
 *
 * CORRESPONDENCE RULE (AZNEWS-MATCH-1.0). Two event pins from DIFFERENT sources,
 * both dated, |date difference| <= 3 years, both with an event location:
 *   BLACK (confirmed): >= 3 shared salient entities AND Jaccard >= 0.30 AND distance <= 150 km
 *   WHITE (candidate): >= 2 shared salient entities AND distance <= 500 km, BLACK not passed
 *   otherwise: no link. A WHITE link is never rewritten to BLACK; a later BLACK pin is
 *   only appended when the full BLACK rule passes on its own.
 * Salient entities: capitalized words and numbers from the title, minus stopwords,
 * minus the outlet name, length >= 3.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
export const PINS_SPEC = "AZNEWS-PINS-1.0";
export const MATCH_SPEC = "AZNEWS-MATCH-1.0";
export const MATCH_YEARS = 3;
export const ERA_WINDOW_YEARS = 3;
export const BLACK_RULE = Object.freeze({ min_shared: 3, min_jaccard: 0.3, max_km: 150, max_years: MATCH_YEARS });
export const WHITE_RULE = Object.freeze({ min_shared: 2, max_km: 500, max_years: MATCH_YEARS });

export const PIN_COLORS = Object.freeze({
  "news-event": { color: "red", hex: "#e53935", label: "News event location" },
  "news-report": { color: "blue", hex: "#1e88e5", label: "News reporting location (dateline or cited origin)" },
  "library-aziel-event": { color: "purple", hex: "#8e24aa", label: "Aziel Eliab library document event location" },
  "library-aziel-report": { color: "pink", hex: "#f06292", label: "That library document's origin/report location as cited in the document" },
  "corpus-event": { color: "lightgreen", hex: "#9ccc65", label: "Other corpus event location" },
  "corpus-report": { color: "darkgreen", hex: "#2e7d32", label: "Other corpus report location" },
  "correspondence": { color: "black", hex: "#111111", label: "Corresponding event (matching rule passed)" },
  "correspondence-candidate": { color: "white", hex: "#ffffff", label: "Potential corresponding event (below the confirmation threshold)" },
  "weather-report": { color: "orange", hex: "#fb8c00", label: "Weather observation anchor (added; not in the operator palette)" },
  "weather-event": { color: "orange", hex: "#fb8c00", label: "Weather model grid cell (added; not in the operator palette)" },
  "sky-report": { color: "gold", hex: "#fdd835", label: "Sky computation reference (added; not in the operator palette)" },
  "sky-event": { color: "gold", hex: "#fdd835", label: "Sub-solar point (added; not in the operator palette)" },
});

export function colorFor(type) {
  const hit = PIN_COLORS[type];
  if (!hit) throw new Error(`Unknown pin type ${type}`);
  return hit;
}

/** Corpus pins: purple/pink for Aziel Eliab documents, light/dark green for the rest. */
export function corpusPinType({ author, role }) {
  const aziel = /aziel\s+eliab/i.test(String(author || ""));
  if (role === "report") return aziel ? "library-aziel-report" : "corpus-report";
  return aziel ? "library-aziel-event" : "corpus-event";
}

export function eraOf(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const year = new Date(t).getUTCFullYear();
  const c = year > 0 ? Math.floor((year - 1) / 100) + 1 : -(Math.floor(-year / 100) + 1);
  return { year, decade: `${Math.floor(year / 10) * 10}s`, century: c > 0 ? `${c}${["th", "st", "nd", "rd"][c % 10 > 3 || [11, 12, 13].includes(c % 100) ? 0 : c % 10]} century CE` : `${-c} century BCE` };
}

export function withinYears(aIso, bIso, years = MATCH_YEARS) {
  if (!aIso || !bIso) return false;
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= years * 365.25 * 86400000;
}

/** Era slider: keep pins whose event year is within +-3 years of the chosen year. Undated pins are kept out. */
export function inEra(pin, year, window = ERA_WINDOW_YEARS) {
  if (year == null || year === "") return true;
  const y = Number(year);
  if (!pin || !pin.era || !Number.isFinite(pin.era.year)) return false;
  return Math.abs(pin.era.year - y) <= window;
}

export function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371;
  const toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR;
  const dLon = (b.lon - a.lon) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const STOP = new Set("The A An And Or But Of In On At To For From By With As Is Are Was Were Be Been Has Have Had Will Would Could Should May Might Can Not No Its It This That These Those After Before Over Under Into About Amid Says Said Say New News Live Update Updates Latest Watch Video Photos How Why What When Who Where Which Here There More Most First Last Top Breaking Report Reports Opinion Analysis Review Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December Mr Mrs Ms Dr".split(" "));

export function salientTokens(title, outletName) {
  let text = String(title || "");
  if (outletName) text = text.split(outletName).join(" ");
  const out = new Set();
  for (const m of text.matchAll(/[\p{Lu}][\p{L}'’-]+|\d{2,}/gu)) {
    const w = m[0].replace(/['’]s$/, "");
    if (w.length < 3 || STOP.has(w)) continue;
    out.add(w.toLowerCase());
  }
  return [...out].slice(0, 12);
}

/** Match two event pins under AZNEWS-MATCH-1.0. Returns {level:"black"|"white"|null, ...evidence}. */
export function matchPins(a, b) {
  const evidence = { spec: MATCH_SPEC, shared: [], jaccard: 0, distance_km: null, years_apart: null };
  if (!a || !b || (a.source && b.source && a.source === b.source)) return { level: null, reason: "same source", ...evidence };
  if (!withinYears(a.date, b.date, MATCH_YEARS)) return { level: null, reason: "dates missing or more than 3 years apart", ...evidence };
  if (!a.geo || !b.geo) return { level: null, reason: "an event location is missing", ...evidence };
  const A = new Set(a.tokens || []);
  const B = new Set(b.tokens || []);
  const shared = [...A].filter((t) => B.has(t));
  const union = new Set([...A, ...B]).size || 1;
  const jac = shared.length / union;
  const km = distanceKm(a.geo, b.geo);
  evidence.shared = shared;
  evidence.jaccard = Number(jac.toFixed(3));
  evidence.distance_km = Number(km.toFixed(1));
  evidence.years_apart = Number((Math.abs(Date.parse(a.date) - Date.parse(b.date)) / (365.25 * 86400000)).toFixed(3));
  if (shared.length >= BLACK_RULE.min_shared && jac >= BLACK_RULE.min_jaccard && km <= BLACK_RULE.max_km) return { level: "black", reason: "BLACK rule passed", ...evidence };
  if (shared.length >= WHITE_RULE.min_shared && km <= WHITE_RULE.max_km) return { level: "white", reason: "WHITE candidate; BLACK rule not passed", ...evidence };
  return { level: null, reason: "rule not met", ...evidence };
}

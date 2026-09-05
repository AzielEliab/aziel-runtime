/**
 * StaticClock engine (port of workers/download-tracker/src/runtime.js).
 * Advisory + gear-click timeline. Author: Aziel Eliab.
 */
import INDEX from "./data.js";
export const PRODUCT = "staticclock";
export const VERSION = "0.2.0";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Every action is a gear click. Time only locks forward.";
export const LIMITATION = "THIS IS: an action-based immutable timeline plus companion advisory. THIS IS NOT: a rollback clock, a remote shell, or ChronoLock. Hosted / in-process does not store a chain.";
const OUTPUT_FIELDS = ["geo_location_chosen", "optimal_time", "optimal_date", "primary_language", "dialect_section"];
const DEFAULT_ANCHOR = "United States";
const DEFAULT_WINDOW = ["08:30", "10:30"];
const OVERRIDES = { Spain: ["09:30", "11:30"], Argentina: ["09:30", "11:30"], Egypt: ["09:00", "11:00"] };

const TOP_30 = [
  "United States","United Kingdom","Germany","France","Spain","Italy","Brazil","Mexico","Canada",
  "India","China","Japan","South Korea","Australia","New Zealand","South Africa","Nigeria","Egypt",
  "Israel","Turkey","Russia","Ukraine","Poland","Netherlands","Sweden","Norway","Finland",
  "Argentina","Chile","Saudi Arabia",
];

const US_STATES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida",
  "georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine",
  "maryland","massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska",
  "nevada","new hampshire","new jersey","new mexico","new york","north carolina","north dakota",
  "ohio","oklahoma","oregon","pennsylvania","rhode island","south carolina","south dakota",
  "tennessee","texas","utah","vermont","virginia","washington","west virginia","wisconsin","wyoming",
  "district of columbia","washington dc","washington d.c.","dc",
];

const ALIASES = {
  usa: "United States", us: "United States", "u.s.": "United States", "u.s.a.": "United States",
  america: "United States", "united states of america": "United States", indianapolis: "United States",
  chicago: "United States", "new york city": "United States", nyc: "United States", "los angeles": "United States",
  uk: "United Kingdom", "u.k.": "United Kingdom", britain: "United Kingdom", "great britain": "United Kingdom",
  england: "United Kingdom", scotland: "United Kingdom", wales: "United Kingdom", "northern ireland": "United Kingdom",
  gb: "United Kingdom", london: "United Kingdom", deutschland: "Germany", berlin: "Germany", paris: "France",
  madrid: "Spain", rome: "Italy", brasil: "Brazil", "sao paulo": "Brazil", "são paulo": "Brazil",
  "mexico city": "Mexico", méxico: "Mexico", toronto: "Canada", bharat: "India", hindustan: "India",
  prc: "China", "people's republic of china": "China", "peoples republic of china": "China",
  nippon: "Japan", nihon: "Japan", tokyo: "Japan", korea: "South Korea", "republic of korea": "South Korea",
  rok: "South Korea", seoul: "South Korea", sydney: "Australia", auckland: "New Zealand", aotearoa: "New Zealand",
  rsa: "South Africa", johannesburg: "South Africa", lagos: "Nigeria", cairo: "Egypt", "tel aviv": "Israel",
  jerusalem: "Israel", turkiye: "Turkey", türkiye: "Turkey", istanbul: "Turkey", moscow: "Russia",
  kyiv: "Ukraine", kiev: "Ukraine", warsaw: "Poland", holland: "Netherlands", amsterdam: "Netherlands",
  stockholm: "Sweden", oslo: "Norway", helsinki: "Finland", "buenos aires": "Argentina", santiago: "Chile",
  ksa: "Saudi Arabia", saudi: "Saudi Arabia", riyadh: "Saudi Arabia",
};
for (const s of US_STATES) ALIASES[s] = "United States";
function fold(text) {
  const nfkd = (text || "").normalize("NFKD");
  const stripped = [...nfkd].filter((ch) => !/[\u0300-\u036f]/.test(ch)).join("");
  return stripped.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function levenshtein(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array(b.length + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}

function ratio(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

function closest(folded, candidates, cutoff) {
  let best = null;
  let bestR = cutoff;
  for (const c of candidates) {
    const r = ratio(folded, c);
    if (r >= bestR) {
      bestR = r;
      best = c;
    }
  }
  return best;
}

function anchorLookup() {
  const table = { ...ALIASES };
  for (const name of TOP_30) table[fold(name)] = name;
  return table;
}

function resolveGeo(geo) {
  const folded = fold(geo);
  if (!folded) return DEFAULT_ANCHOR;
  const lookup = anchorLookup();
  if (lookup[folded]) return lookup[folded];
  const candidates = Object.keys(lookup);
  const match = closest(folded, candidates, 0.72);
  if (match) return lookup[match];
  const tokens = folded.split(" ");
  if (tokens.length > 1) {
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (lookup[tokens[i]]) return lookup[tokens[i]];
    }
    const m2 = closest(tokens[tokens.length - 1], candidates, 0.8);
    if (m2) return lookup[m2];
  }
  return DEFAULT_ANCHOR;
}

async function sha256Bytes(bytes) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

async function shake(basket, nonce, salt) {
  if (!basket.length) throw new Error("basket must not be empty");
  const scored = [];
  const enc = new TextEncoder();
  for (const item of basket) {
    const payload = new Uint8Array(nonce.length + salt.length + enc.encode(item).length);
    payload.set(nonce, 0);
    payload.set(salt, nonce.length);
    payload.set(enc.encode(item), nonce.length + salt.length);
    const digest = await sha256Bytes(payload);
    scored.push({ item, digest: [...digest].map((b) => b.toString(16).padStart(2, "0")).join("") });
  }
  scored.sort((a, b) => (a.digest < b.digest ? -1 : a.digest > b.digest ? 1 : 0));
  return scored[0].item;
}

async function pickIndex(n, nonce, salt) {
  if (n <= 0) throw new Error("n must be positive");
  const payload = new Uint8Array(nonce.length + salt.length);
  payload.set(nonce, 0);
  payload.set(salt, nonce.length);
  const digest = await sha256Bytes(payload);
  let n64 = 0n;
  for (let i = 0; i < 8; i++) n64 = (n64 << 8n) + BigInt(digest[i]);
  return Number(n64 % BigInt(n));
}

function windowFor(region) {
  return OVERRIDES[region] || DEFAULT_WINDOW;
}

function slotsIn(window, step = 15) {
  const [sh, sm] = window[0].split(":").map(Number);
  const [eh, em] = window[1].split(":").map(Number);
  const startM = sh * 60 + sm;
  const endM = eh * 60 + em;
  const out = [];
  for (let m = startM; m <= endM; m += step) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

async function pickTime(region, nonce) {
  const slots = slotsIn(windowFor(region));
  return slots[await pickIndex(slots.length, nonce, new TextEncoder().encode("time"))];
}

function localDate(iana) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: iana,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function record(name) {
  return INDEX.anchors[name];
}

function dialectsFor(language) {
  return INDEX.languages[language] ? [...INDEX.languages[language]] : [];
}

function findLanguage(name) {
  if (!name) return null;
  const folded = fold(name);
  for (const lang of Object.keys(INDEX.languages)) {
    if (fold(lang) === folded) return lang;
  }
  return null;
}

export async function advise(geo, languageHint, dialectHint) {
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const anchor = resolveGeo(geo);
  const basket = [...record(anchor).basket];
  const chosen = await shake(basket, nonce, new TextEncoder().encode("geo"));
  const rec = record(chosen);
  let language = rec.language;
  const hintedLang = findLanguage(languageHint);
  if (hintedLang) language = hintedLang;
  let dialect;
  const dialects = dialectsFor(language);
  if (dialectHint) {
    const folded = fold(dialectHint);
    dialect = dialects.find((d) => fold(d) === folded) || dialectHint;
  } else {
    dialect = dialects.length ? await shake(dialects, nonce, new TextEncoder().encode("dialect")) : "";
  }
  const clock = await pickTime(chosen, nonce);
  const day = localDate(String(rec.iana));
  const advisory = {
    geo_location_chosen: chosen,
    optimal_time: clock,
    optimal_date: day,
    primary_language: language,
    dialect_section: dialect,
  };
  const payload = {};
  for (const k of OUTPUT_FIELDS) payload[k] = advisory[k];
  payload.motto = MOTTO;
  payload.product = PRODUCT;
  payload.version = VERSION;
  payload.author = AUTHOR;
  payload.note = "Companion advisory. ChronoLock is the related window product. Author Aziel Eliab.";
  return payload;
}

export function listAnchors() {
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    note: "Top-30 companion anchors. Author Aziel Eliab.",
    anchors: TOP_30.map((name) => ({
      name,
      iana: INDEX.anchors[name].iana,
      language: INDEX.anchors[name].language,
    })),
  };
}

function canonicalClickJson(click, second, action, source, prevHash) {
  return JSON.stringify({
    action,
    click,
    prev_hash: prevHash,
    second,
    source,
  });
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function utcSecond() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function createClick(n, action, source, prevHash, second) {
  const text = String(action || "").trim();
  if (!text) throw new Error("action is required");
  const src = String(source || "local").trim() || "local";
  const sec = second || utcSecond();
  const hash = await sha256Hex(canonicalClickJson(n, sec, text, src, prevHash));
  return { click: n, second: sec, action: text, source: src, prev_hash: prevHash, hash };
}

function asClicks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => ({
    click: Number(row.click),
    second: String(row.second || ""),
    action: String(row.action || ""),
    source: String(row.source || "local"),
    prev_hash: String(row.prev_hash || ""),
    hash: String(row.hash || ""),
  }));
}

export async function verifyClicks(clicks) {
  const errors = [];
  for (let i = 0; i < clicks.length; i++) {
    const tick = clicks[i];
    const expected = await sha256Hex(
      canonicalClickJson(tick.click, tick.second, tick.action, tick.source, tick.prev_hash),
    );
    if (tick.hash !== expected) errors.push(`index ${i}: stored hash ${tick.hash} != recomputed ${expected}`);
    if (tick.click !== i + 1) errors.push(`index ${i}: click ${tick.click} != ${i + 1}`);
    if (i === 0) {
      if (tick.prev_hash !== GENESIS_PREV_HASH) errors.push("index 0: prev_hash != genesis zeros");
    } else if (tick.prev_hash !== clicks[i - 1].hash) {
      errors.push(`index ${i}: prev_hash != previous.hash`);
    }
  }
  return {
    ok: errors.length === 0,
    length: clicks.length,
    first_hash: clicks.length ? clicks[0].hash : null,
    last_hash: clicks.length ? clicks[clicks.length - 1].hash : null,
    errors,
  };
}

export async function appendClick(existing, action, source, second) {
  const clicks = asClicks(existing);
  const prev = clicks.length ? clicks[clicks.length - 1].hash : GENESIS_PREV_HASH;
  const tick = await createClick(clicks.length + 1, action, source, prev, second);
  const next = clicks.concat([tick]);
  return {
    click: tick,
    clicks: next,
    verify: await verifyClicks(next),
    timeslate: await timeslateOf(tick),
  };
}

export async function timeslateOf(tick) {
  const payload = {
    click: tick.click,
    click_hash: tick.hash,
    product: PRODUCT,
    schema: "staticclock-timeslate-v1",
    second: tick.second,
  };
  const raw = JSON.stringify(payload);
  const digest = await sha256Hex(raw);
  const evidence =
    "schema=staticclock-timeslate-v1 product=staticclock lattice=temporallock " +
    "click=" + tick.click + " second=" + tick.second +
    " click_hash=" + tick.hash + " cross_hash=" + digest;
  return {
    schema: "staticclock-timeslate-v1",
    product: PRODUCT,
    author: AUTHOR,
    click: tick.click,
    second: tick.second,
    click_hash: tick.hash,
    cross_hash: digest,
    lattice: "temporallock",
    azos: true,
    rollbacks: false,
    evidence,
    bind: {
      product: "temporallock",
      uses: "evidence",
      summary: "staticclock timeslate click " + tick.click,
      evidence,
      confidence: 1.0,
      timestamp: tick.second,
    },
    note: "TemporalLock hash-chains this timeslate into its lattice. StaticClock does not store TemporalLock receipts.",
  };
}

export function hookStatus(clicks) {
  const n = clicks.length;
  return {
    ok: true,
    hook: "azos",
    product: PRODUCT,
    author: AUTHOR,
    principle: "Integrity precedes execution.",
    exec: false,
    remote_shell: false,
    rollbacks: false,
    clicks: n,
    last_hash: n ? clicks[n - 1].hash : null,
    note: "Records actions into the StaticClock timeline. Does not exec.",
  };
}

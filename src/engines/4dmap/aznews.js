/**
 * AZNews join inside 4DMap.
 * A news item can land as a pin (date × event × geo anchor), or the map can open that item.
 * Not a Softwares card. Not an MCP tool. Not a live news product.
 * No news source module is imported. Production merged and live stay false.
 * Receipts this join writes use a primary hash chain and a secondary hash chain.
 * Offline, the secondary hash is the document's primary hash plus the username,
 * so the same document is not written twice for that user.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { canonicalize, sha256Hex } from "../../session-core.js";
import {
  CardError,
  GENESIS_PREV,
  PI_EMPTY,
  PIN_FRAME_KIND,
  makeCard,
  newId,
  scanIdentity,
  scanIntent,
} from "./product-card.js";

export const AZNEWS_ABSENT_CODE = "AZNEWS-SOURCE-ABSENT";
export const AZNEWS_ABSENT_MODULE = "src/engines/4dmap/aznews-source.js";
export const AZNEWS_ABSENT_SOURCE = "public Aziel news feed";
export const LIBRARY_MAP = "https://www.azielcorpuslibrary.net/map";

const DATE_RE = /^(\d{4}-\d{2}-\d{2})([T ](\d{2}:\d{2}(:\d{2})?)(Z|[+-]\d{2}:\d{2})?)?$/;
const GAZ_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/;
const USER_RE = /^[a-zA-Z0-9._-]{1,80}$/;

const records = [];
const chain = [];

export function resetAznewsStore() {
  records.length = 0;
  chain.length = 0;
}

export function aznewsJoinCard() {
  return {
    name: "AZNews",
    joined_into: "4dmap",
    software_tab: false,
    mcp_tool: false,
    catalog_slug: null,
    merged: false,
    live: false,
    field_1_0: false,
    installed_app: false,
    source_present: false,
    absent_code: AZNEWS_ABSENT_CODE,
    absent_module: AZNEWS_ABSENT_MODULE,
    absent_source: AZNEWS_ABSENT_SOURCE,
    library_map: LIBRARY_MAP,
    library_map_is_aznews: false,
    library_cite_merged: false,
    lamb_lens: "Service → Clarity → Peace",
    author: "Aziel Eliab",
    hash_lattices: ["primary", "secondary"],
    lattice_live: false,
  };
}

function lockFlags(extra) {
  return {
    ...extra,
    merged: false,
    live: false,
    source_present: false,
    field_1_0: false,
    installed_app: false,
    software_tab: false,
    mcp_tool: false,
    lattice_live: false,
    aznews: aznewsJoinCard(),
  };
}

function sentence(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export async function documentHash(doc) {
  return sha256Hex(canonicalize(doc));
}

export async function primaryChainHash(docHash, prev) {
  return sha256Hex(canonicalize({ document: docHash, prev: prev || GENESIS_PREV }));
}

/** Offline secondary hash: the document primary hash plus the username. */
export async function offlineSecondaryHash(docHash, username) {
  return sha256Hex(canonicalize({ primary: docHash, username: String(username) }));
}

export async function onlineSecondaryHash(primaryHash, prev) {
  return sha256Hex(
    canonicalize({
      offline: false,
      prev: prev || GENESIS_PREV,
      primary: primaryHash,
    }),
  );
}

function tips() {
  const last = chain[chain.length - 1];
  return {
    primary: last ? last.primary : GENESIS_PREV,
    secondary: last ? last.secondary : GENESIS_PREV,
  };
}

function clockOf(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (!text || !DATE_RE.test(text)) return null;
  if (!text.includes("T") && !text.includes(" ")) return `${text}T00:00:00Z`;
  return text.replace(" ", "T");
}

function asNum(raw, name) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "boolean") throw new CardError("AZNEWS-ANCHOR", `${name} must be a number.`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new CardError("AZNEWS-ANCHOR", `${name} is not a finite number.`);
  return value;
}

function anchorOf(raw) {
  const lat = asNum(raw.lat, "latitude");
  const lon = asNum(raw.lon, "longitude");
  if ((lat == null) !== (lon == null)) {
    throw new CardError("AZNEWS-ANCHOR", "Latitude and longitude must be supplied together.");
  }
  if (lat != null && (lat < -90 || lat > 90)) throw new CardError("AZNEWS-ANCHOR", "Latitude must be between -90 and 90.");
  if (lon != null && (lon < -180 || lon > 180)) throw new CardError("AZNEWS-ANCHOR", "Longitude must be between -180 and 180.");
  let gazetteer = null;
  if (raw.gazetteer_id != null && raw.gazetteer_id !== "") {
    gazetteer = String(raw.gazetteer_id).trim();
    scanIdentity(gazetteer);
    if (!GAZ_RE.test(gazetteer)) {
      throw new CardError("AZNEWS-ANCHOR", "A place anchor must be latitude and longitude, or an opaque place token.");
    }
    const tail = gazetteer.includes(".") && !gazetteer.includes(":") ? gazetteer.split(".").pop() : "";
    if (tail && /^[A-Za-z]+$/.test(tail)) {
      throw new CardError("AZNEWS-ANCHOR", "A place anchor is not a domain name.");
    }
  }
  if (lat == null && !gazetteer) {
    throw new CardError("AZNEWS-ANCHOR", "A news pin needs a place anchor: latitude and longitude, or a place token.");
  }
  return { lat, lon, gazetteer_id: gazetteer };
}

function placeWords(anchor) {
  if (anchor.gazetteer_id && anchor.lat == null) return `place token ${anchor.gazetteer_id}`;
  if (anchor.gazetteer_id) {
    return `latitude ${anchor.lat}, longitude ${anchor.lon}, place token ${anchor.gazetteer_id}`;
  }
  return `latitude ${anchor.lat}, longitude ${anchor.lon}`;
}

function mentionsLibrary(payload) {
  const src = String((payload && (payload.src || payload.source)) || "").trim().toLowerCase();
  if (["aziel-corpus", "library", "aziel-digital-library", "azielcorpus"].includes(src)) return true;
  const url = String((payload && (payload.map || payload.source_url || payload.url)) || "");
  if (url.includes(LIBRARY_MAP)) return true;
  const item = payload && payload.item;
  if (item && typeof item === "object") {
    const itemUrl = String(item.map || item.source_url || item.url || "");
    if (itemUrl.includes(LIBRARY_MAP)) return true;
  }
  return false;
}

function absentSentence(verb) {
  return sentence(
    `AZNews refused this ${verb}. The news source module ${AZNEWS_ABSENT_MODULE} is absent, and no ${AZNEWS_ABSENT_SOURCE} is configured. Nothing was written. The library map is a separate cite and is not this join. AZNews is not merged and not live. Lamb Lens order is Service, then Clarity, then Peace.`,
  );
}

function refuse(op, code, text) {
  const summary = sentence(text);
  return lockFlags({
    ok: false,
    refused: true,
    op,
    code,
    absent_module: code === AZNEWS_ABSENT_CODE ? AZNEWS_ABSENT_MODULE : undefined,
    absent_source: code === AZNEWS_ABSENT_CODE ? AZNEWS_ABSENT_SOURCE : undefined,
    message: summary,
    summary,
    note: summary,
  });
}

function readFixture(payload) {
  if (!payload || payload.fixture !== true) return null;
  const label = String(payload.fixture_label || "").trim();
  if (!/fixture/i.test(label) || label.length > 80) {
    throw new CardError(
      "AZNEWS-FIXTURE-UNLABELED",
      "A test fixture must carry a short label that says fixture. An unlabeled item is not a news source.",
    );
  }
  const raw = payload.item && typeof payload.item === "object" ? payload.item : null;
  if (!raw) {
    throw new CardError("AZNEWS-ITEM-INCOMPLETE", "A fixture pin needs an item with a date, an event, and a place anchor.");
  }
  scanIdentity(raw);
  scanIntent(raw);
  const event = String(raw.event || "").trim();
  const headline = String(raw.headline || "").trim();
  const clock = clockOf(raw.date || raw.paper_date);
  if (!clock) throw new CardError("AZNEWS-CLOCK", "A news pin needs a date. Upload time is not the event date.");
  if (!event) throw new CardError("AZNEWS-EVENT", "A news pin needs an event.");
  if (!headline) throw new CardError("AZNEWS-ITEM-INCOMPLETE", "A fixture item needs a headline so the map can open it in plain language.");
  if (event.length > 240 || headline.length > 240) {
    throw new CardError("AZNEWS-ITEM-INCOMPLETE", "Event and headline must stay within 240 characters.");
  }
  const itemId = String(raw.id || raw.item_id || "").trim();
  if (!itemId || itemId.length > 80) {
    throw new CardError("AZNEWS-ITEM-INCOMPLETE", "A fixture item needs a short id.");
  }
  const anchor = anchorOf(raw);
  return {
    label,
    offline: payload.offline === true,
    username: payload.username == null ? "" : String(payload.username).trim(),
    item: {
      id: itemId,
      date: clock,
      event,
      headline,
      lat: anchor.lat,
      lon: anchor.lon,
      gazetteer_id: anchor.gazetteer_id,
      fixture_label: label,
      fixture: true,
      live_article: false,
    },
  };
}

function usernameOf(fixture) {
  if (!fixture.offline) return null;
  if (!fixture.username || !USER_RE.test(fixture.username)) {
    throw new CardError(
      "AZNEWS-USERNAME-ABSENT",
      "An offline receipt needs a short username handle. The secondary hash is built from that user's primary hash plus the username. A legal name is not stored. Nothing was written.",
    );
  }
  return fixture.username;
}

async function planReceipt(doc, fixture) {
  const username = usernameOf(fixture);
  const docHash = await documentHash(doc);
  const prev = tips();
  const primary = await primaryChainHash(docHash, prev.primary);
  const secondary = fixture.offline
    ? await offlineSecondaryHash(docHash, username)
    : await onlineSecondaryHash(primary, prev.secondary);
  const existing = fixture.offline ? chain.find((row) => row.secondary === secondary) || null : null;
  const receipt = {
    kind: "aznews-receipt",
    document_hash: docHash,
    primary,
    primary_prev: prev.primary,
    secondary,
    secondary_prev: prev.secondary,
    offline: fixture.offline,
    username: fixture.offline ? username : null,
    lattices: ["primary", "secondary"],
    lattice_live: false,
    author: "Aziel Eliab",
  };
  return { receipt, existing, docHash };
}

function commitReceipt(receipt) {
  chain.push(receipt);
  return receipt;
}

async function pinFixture(payload, cardPrev) {
  const fixture = readFixture(payload);
  if (!fixture) return refuse("news_pin", AZNEWS_ABSENT_CODE, absentSentence("pin"));
  const item = fixture.item;
  const doc = {
    kind: "aznews-pin",
    item_id: item.id,
    date: item.date,
    event: item.event,
    lat: item.lat,
    lon: item.lon,
    gazetteer_id: item.gazetteer_id,
    headline: item.headline,
    fixture_label: fixture.label,
  };
  const planned = await planReceipt(doc, fixture);
  if (planned.existing) {
    throw new CardError(
      "AZNEWS-DOUBLE",
      "This document is already on the offline chain for that username. The secondary hash matches, so it was not written again.",
    );
  }
  const card = await makeCard({
    id: newId(),
    t: {
      kind: PIN_FRAME_KIND,
      clock: item.date,
      event: item.event,
      lat: item.lat,
      lon: item.lon,
      gazetteer_id: item.gazetteer_id,
      surface: "MOCK",
      fixture: true,
      join: "aznews",
      live_article: false,
    },
    src: "aznews-fixture",
    note: `Fixture pin ${item.event}`,
    prev: cardPrev || GENESIS_PREV,
    pi: PI_EMPTY,
  });
  const receipt = commitReceipt(planned.receipt);
  records.push({
    document_hash: receipt.document_hash,
    item,
    pin_id: card.id,
    card_h: card.h,
    receipt,
  });
  const summary = sentence(
    `A labeled fixture item was pinned on 4DMap by date, event, and place. Date ${item.date}, event ${item.event}, ${placeWords(item)}. It is not a live article and it is not a news source. AZNews stays unmerged and not live. The missing source is the module ${AZNEWS_ABSENT_MODULE} and a ${AZNEWS_ABSENT_SOURCE}. Lamb Lens order is Service, then Clarity, then Peace.`,
  );
  return lockFlags({
    ok: true,
    op: "news_pin",
    refused: false,
    fixture: true,
    fixture_is_source: false,
    fixture_label: fixture.label,
    surface: "MOCK",
    id: card.id,
    item_id: item.id,
    date: item.date,
    event: item.event,
    headline: item.headline,
    h: card.h,
    document_hash: receipt.document_hash,
    card,
    pin_frame: {
      kind: PIN_FRAME_KIND,
      date: item.date,
      event: item.event,
      lat: item.lat,
      lon: item.lon,
      gazetteer_id: item.gazetteer_id,
      surface: "MOCK",
    },
    receipt,
    summary,
    note: summary,
  });
}

function matchRecord(payload) {
  const id = String((payload && (payload.item_id || payload.pin_id || payload.id)) || "").trim();
  if (id) return records.find((row) => row.item.id === id || row.pin_id === id) || null;
  const raw = payload && payload.item && typeof payload.item === "object" ? payload.item : payload || {};
  const event = String(raw.event || "").trim();
  const clock = clockOf(raw.date || raw.paper_date);
  if (!event || !clock) return null;
  let anchor;
  try {
    anchor = anchorOf(raw);
  } catch {
    return null;
  }
  return (
    records.find(
      (row) =>
        row.item.event === event &&
        row.item.date === clock &&
        row.item.lat === anchor.lat &&
        row.item.lon === anchor.lon &&
        row.item.gazetteer_id === anchor.gazetteer_id,
    ) || null
  );
}

async function openItem(payload) {
  if (!records.length) {
    if (payload && payload.fixture === true) {
      readFixture(payload);
      return refuse(
        "news_open",
        "AZNEWS-NO-MATCH",
        "4DMap found no pinned item for that date, event, and place. Nothing was invented. AZNews is not merged and not live.",
      );
    }
    return refuse("news_open", AZNEWS_ABSENT_CODE, absentSentence("open"));
  }
  const found = matchRecord(payload);
  if (!found) {
    return refuse(
      "news_open",
      "AZNEWS-NO-MATCH",
      "4DMap found no pinned item for that date, event, and place. Nothing was invented. AZNews is not merged and not live.",
    );
  }
  const offline = payload.offline === true;
  const fixture = {
    offline,
    username: payload.username == null ? "" : String(payload.username).trim(),
    label: found.item.fixture_label,
  };
  if (offline) usernameOf(fixture);
  const doc = {
    kind: "aznews-open",
    item_id: found.item.id,
    pin_id: found.pin_id,
    date: found.item.date,
    event: found.item.event,
    lat: found.item.lat,
    lon: found.item.lon,
    gazetteer_id: found.item.gazetteer_id,
    headline: found.item.headline,
    fixture_label: found.item.fixture_label,
  };
  const planned = await planReceipt(doc, fixture);
  const docHash = planned.docHash;
  let receipt = planned.existing;
  const already = Boolean(receipt);
  if (!receipt) receipt = commitReceipt(planned.receipt);
  const item = found.item;
  const summary = sentence(
    already
      ? `4DMap opened the matching fixture item. Date ${item.date}, event ${item.event}, ${placeWords(item)}. The words are: ${item.headline}. That open was already on the offline chain for this username, so the document was not written again. This fixture is not a live article. AZNews is not merged and not live. Lamb Lens order is Service, then Clarity, then Peace.`
      : `4DMap opened the matching fixture item. Date ${item.date}, event ${item.event}, ${placeWords(item)}. The words are: ${item.headline}. This fixture is not a live article. AZNews is not merged and not live, because the news source module ${AZNEWS_ABSENT_MODULE} is absent and no ${AZNEWS_ABSENT_SOURCE} is configured. Lamb Lens order is Service, then Clarity, then Peace.`,
  );
  return lockFlags({
    ok: true,
    op: "news_open",
    refused: false,
    fixture: true,
    fixture_is_source: false,
    already_on_chain: already,
    id: found.pin_id,
    item_id: item.id,
    date: item.date,
    event: item.event,
    headline: item.headline,
    document_hash: docHash,
    receipt,
    summary,
    note: summary,
  });
}

function status() {
  const summary = sentence(
    `AZNews is joined into 4DMap as a pin and open path. No news source is present, so live news is refused. The missing module is ${AZNEWS_ABSENT_MODULE}. No ${AZNEWS_ABSENT_SOURCE} is configured. The library map is not this join. Labeled fixture pins in this process are not a news source. AZNews is not merged and not live. Receipts this path writes use a primary hash chain and a secondary hash chain. That lattice is not marked live. Lamb Lens order is Service, then Clarity, then Peace.`,
  );
  return lockFlags({
    ok: true,
    op: "news_status",
    joined: true,
    refused_source: true,
    code: AZNEWS_ABSENT_CODE,
    absent_module: AZNEWS_ABSENT_MODULE,
    absent_source: AZNEWS_ABSENT_SOURCE,
    fixture_pins: records.length,
    fixture_is_source: false,
    summary,
    note: summary,
  });
}

export async function runAznews(op, payload = {}, ctx = {}) {
  try {
    scanIdentity(payload);
    scanIntent(payload);
    if (mentionsLibrary(payload)) {
      return refuse(
        op,
        "AZNEWS-NOT-LIBRARY",
        "The corpus library map is a cite only and is not merged. It is not AZNews and it is not this join. Nothing was written.",
      );
    }
    if (op === "news_status") return status();
    if (op === "news_pin") return await pinFixture(payload, ctx.prev);
    if (op === "news_open") return await openItem(payload);
    return refuse(op, "AZNEWS-UNKNOWN", "AZNews does not have that action inside 4DMap.");
  } catch (err) {
    if (err && err.code) return refuse(op, err.code, err.message);
    throw err;
  }
}

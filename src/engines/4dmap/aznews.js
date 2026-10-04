/**
 * AZNews, standalone and joined to 4DMap.
 * news_ingest is the standalone path. news_pin and news_open are the joined path.
 * Not a Softwares card. Not an MCP tool. Not Field 1.0. Not an installed app.
 * live, merged, and installed stay false until a real item is on a pin or the map opens it.
 * The global live flag stays false. Only that item is marked live.
 * Receipts use a primary hash chain and a secondary hash chain.
 * Offline, the secondary hash is that document's primary hash plus the username,
 * so the same document is not written twice for that user.
 * Cross-tether with AZ-OS is a comment on the receipt. This repo does not update AZ-OS.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { canonicalize, sha256Hex } from "../../session-core.js";
import {
  blackSwanById,
  blackSwanCatalog,
  captureImage,
  imageReady,
  newsOutlets,
  NEWS_RANKING,
  outletById,
  pullOutlet,
  pullWeather,
  rankScore,
  regionById,
  suppliedWeather,
  weatherRegions,
  WEATHER_ADAPTER,
} from "./aznews-source.js";
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
let realOnMap = false;
let fetchedStored = false;

export function resetAznewsStore() {
  records.length = 0;
  chain.length = 0;
  realOnMap = false;
  fetchedStored = false;
}

function productState() {
  return {
    joined: records.some((row) => row.on_map),
    merged: realOnMap,
    live: false,
    installed: false,
    installed_app: false,
    source_present: fetchedStored,
    field_1_0: false,
    office_1_0: false,
    pilot_started: false,
    live_backends: false,
    alt_internet_live: false,
    mesh_node: false,
    lattice_live: false,
    software_tab: false,
    mcp_tool: false,
  };
}

export function aznewsJoinCard() {
  const state = productState();
  return {
    name: "AZNews",
    standalone: true,
    joined_into: "4dmap",
    software_tab: false,
    mcp_tool: false,
    catalog_slug: null,
    merged: state.merged,
    live: false,
    joined: state.joined,
    field_1_0: false,
    office_1_0: false,
    pilot_started: false,
    live_backends: false,
    alt_internet_live: false,
    installed: false,
    installed_app: false,
    mesh_node: false,
    source_present: state.source_present,
    absent_code: fetchedStored ? null : AZNEWS_ABSENT_CODE,
    absent_module: AZNEWS_ABSENT_MODULE,
    absent_source: AZNEWS_ABSENT_SOURCE,
    library_map: LIBRARY_MAP,
    library_map_is_aznews: false,
    library_cite_merged: false,
    lamb_lens: "Service → Clarity → Peace",
    author: "Aziel Eliab",
    hash_lattices: ["primary", "secondary"],
    lattice_live: false,
    paths: {
      standalone: { callable: true, op: "news_ingest" },
      joined: { callable: true, ops: ["news_pin", "news_open"] },
    },
    azos_cross_tether: "comment",
    azos_updated: false,
  };
}

function lockFlags(extra) {
  const state = productState();
  return {
    ...extra,
    merged: state.merged,
    live: false,
    joined: state.joined,
    source_present: state.source_present,
    field_1_0: false,
    office_1_0: false,
    pilot_started: false,
    live_backends: false,
    alt_internet_live: false,
    installed: false,
    installed_app: false,
    mesh_node: false,
    software_tab: false,
    mcp_tool: false,
    lattice_live: false,
    azos_updated: false,
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

function pathOf(payload, fallback) {
  const raw = String((payload && (payload.path || payload.desk)) || "").trim().toLowerCase();
  if (raw === "standalone" || raw === "aznews") return "standalone";
  if (raw === "joined" || raw === "4dmap" || raw === "map") return "joined";
  return fallback;
}

function absentSentence(verb) {
  return sentence(
    `AZNews refused this ${verb}. No news source is present. The source adapter ${AZNEWS_ABSENT_MODULE} returned no item, and no ${AZNEWS_ABSENT_SOURCE} is configured. Nothing was written. The library map is a separate cite and is not this join. AZNews is not merged and not live. Lamb Lens order is Service, then Clarity, then Peace.`,
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

function scoreOf(raw, fallback) {
  const value = raw == null || raw === "" ? fallback : raw;
  if (value == null || value === "") return { value: null, kind: "absent", invented: false };
  if (typeof value === "boolean") throw new CardError("AZNEWS-SCORE", "A score must be a number. Nothing was written.");
  if (typeof value === "object") {
    if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
      throw new CardError("AZNEWS-SCORE", "A score object needs a finite value. Nothing was written.");
    }
    return { value: value.value, kind: String(value.kind || "supplied"), invented: false };
  }
  const num = Number(value);
  if (!Number.isFinite(num)) throw new CardError("AZNEWS-SCORE", "A score must be a finite number. Nothing was written.");
  return { value: num, kind: "supplied", invented: false };
}

function usernameOf(pack) {
  if (!pack.offline) return null;
  if (!pack.username || !USER_RE.test(pack.username)) {
    throw new CardError(
      "AZNEWS-USERNAME-ABSENT",
      "An offline receipt needs a short username handle. The secondary hash is built from that user's primary hash plus the username. A legal name is not stored. Nothing was written.",
    );
  }
  return pack.username;
}

function azosComment() {
  return {
    cross_tether: "comment",
    slug: "azos",
    updated: false,
    note: "Cross-tether with AZ-OS is a comment on this receipt only. This repository does not update AZ-OS.",
  };
}

async function planReceipt(doc, pack) {
  const username = usernameOf(pack);
  const docHash = await documentHash(doc);
  const prev = tips();
  const primary = await primaryChainHash(docHash, prev.primary);
  const secondary = pack.offline
    ? await offlineSecondaryHash(docHash, username)
    : await onlineSecondaryHash(primary, prev.secondary);
  const existing = pack.offline ? chain.find((row) => row.secondary === secondary) || null : null;
  const receipt = {
    kind: "aznews-receipt",
    document_hash: docHash,
    primary,
    primary_prev: prev.primary,
    secondary,
    secondary_prev: prev.secondary,
    offline: pack.offline === true,
    username: pack.offline ? username : null,
    lattices: ["primary", "secondary"],
    lattice_live: false,
    wording: doc.wording,
    images: doc.images,
    score: doc.score,
    score_kind: doc.score_kind,
    azos: azosComment(),
    author: "Aziel Eliab",
  };
  return { receipt, existing, docHash };
}

function commitReceipt(receipt) {
  chain.push(receipt);
  return receipt;
}

async function imageOf(raw, fetchImpl) {
  try {
    return await captureImage(raw, fetchImpl);
  } catch (err) {
    if (err && err.code) throw new CardError(err.code, err.message);
    throw err;
  }
}

function fetchImplOf(ctx) {
  if (ctx && typeof ctx.fetchImpl === "function") return ctx.fetchImpl;
  if (typeof fetch === "function") return fetch;
  return null;
}

async function readSupplied(payload, kind, fetchImpl) {
  const raw = payload.item && typeof payload.item === "object" ? payload.item : null;
  if (!raw) {
    throw new CardError("AZNEWS-ITEM-INCOMPLETE", "A pin needs an item with a date, an event, and a place anchor.");
  }
  scanIdentity(raw);
  scanIntent(raw);
  const event = String(raw.event || "").trim();
  const headline = String(raw.headline || "").trim();
  const wording = String(raw.wording || headline || "").trim();
  const clock = clockOf(raw.date || raw.paper_date);
  if (!clock) throw new CardError("AZNEWS-CLOCK", "A news pin needs a date. Upload time is not the event date.");
  if (!event) throw new CardError("AZNEWS-EVENT", "A news pin needs an event.");
  if (!headline && !wording) {
    throw new CardError("AZNEWS-ITEM-INCOMPLETE", "An item needs wording so the map can open it in plain language.");
  }
  if (event.length > 240 || headline.length > 240) {
    throw new CardError("AZNEWS-ITEM-INCOMPLETE", "Event and headline must stay within 240 characters.");
  }
  if (wording.length > 8000) throw new CardError("AZNEWS-ITEM-INCOMPLETE", "Wording must stay within 8000 characters.");
  const itemId = String(raw.id || raw.item_id || "").trim();
  if (!itemId || itemId.length > 80) throw new CardError("AZNEWS-ITEM-INCOMPLETE", "An item needs a short id.");
  const anchor = anchorOf(raw);
  const images = await imageOf(raw.image || raw.images || payload.image, fetchImpl);
  const score = scoreOf(raw.score != null ? raw.score : payload.score, null);
  const real = kind === "real";
  if (real && !wording) throw new CardError("AZNEWS-ITEM-INCOMPLETE", "A real item needs its full wording.");
  if (real && score.value == null) throw new CardError("AZNEWS-ITEM-INCOMPLETE", "A real item needs a score. None was filled in.");
  if (real && !imageReady(images.images)) {
    throw new CardError(
      "AZNEWS-ITEM-INCOMPLETE",
      "A real item needs image bytes or a content hash plus a fetch URL. The image was not dropped and the item was not stored.",
    );
  }
  return {
    kind,
    label: kind === "fixture" ? String(payload.fixture_label || "").trim() : "",
    offline: payload.offline === true,
    username: payload.username == null ? "" : String(payload.username).trim(),
    item: {
      id: itemId,
      date: clock,
      event,
      headline: headline || wording.slice(0, 240),
      wording,
      lat: anchor.lat,
      lon: anchor.lon,
      gazetteer_id: anchor.gazetteer_id,
      images: images.images,
      image_gap: images.image_gap,
      score: score.value,
      score_kind: score.kind,
      fixture_label: kind === "fixture" ? String(payload.fixture_label || "").trim() : "",
      fixture: kind === "fixture",
      live: real,
      origin: real ? "supplied" : "fixture",
      live_article: real,
    },
  };
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
  return payload;
}

async function docFor(kind, item, extra = {}) {
  return {
    kind,
    item_id: item.id,
    date: item.date,
    event: item.event,
    lat: item.lat,
    lon: item.lon,
    gazetteer_id: item.gazetteer_id,
    headline: item.headline,
    wording: item.wording,
    images: item.images,
    image_gap: item.image_gap === true,
    score: item.score,
    score_kind: item.score_kind,
    fixture_label: item.fixture_label || "",
    ...extra,
  };
}

async function storeItem(pack, doc, card, onMap) {
  const planned = await planReceipt(doc, pack);
  if (planned.existing) {
    throw new CardError(
      "AZNEWS-DOUBLE",
      "This document is already on the offline chain for that username. The secondary hash matches, so it was not written again.",
    );
  }
  const receipt = commitReceipt(planned.receipt);
  const row = {
    document_hash: receipt.document_hash,
    item: pack.item,
    pin_id: card ? card.id : null,
    card_h: card ? card.h : null,
    card: card || null,
    on_map: onMap === true,
    receipt,
  };
  records.push(row);
  if (onMap && pack.item.live) realOnMap = true;
  if (pack.item.origin === "fetch" && pack.item.live) fetchedStored = true;
  return { receipt, row };
}

async function pinSupplied(pack, cardPrev, path) {
  const item = pack.item;
  const onMap = path === "joined";
  const doc = await docFor(onMap ? "aznews-pin" : "aznews-ingest", item);
  let card = null;
  if (onMap) {
    card = await makeCard({
      id: newId(),
      t: {
        kind: PIN_FRAME_KIND,
        clock: item.date,
        event: item.event,
        lat: item.lat,
        lon: item.lon,
        gazetteer_id: item.gazetteer_id,
        surface: item.fixture ? "MOCK" : "REAL",
        fixture: item.fixture === true,
        join: "aznews",
        live_article: item.live === true,
      },
      src: item.fixture ? "aznews-fixture" : "aznews-supplied",
      note: item.fixture ? `Fixture pin ${item.event}` : `Supplied pin ${item.event}`,
      prev: cardPrev || GENESIS_PREV,
      pi: PI_EMPTY,
    });
  }
  const stored = await storeItem(pack, doc, card, onMap);
  const receipt = stored.receipt;
  const summary = item.fixture
      ? sentence(
        `A labeled fixture item was pinned on 4DMap by date, event, and place. Date ${item.date}, event ${item.event}, ${placeWords(item)}. It is not a live article and it is not a news source. AZNews stays unmerged and not live. The adapter ${AZNEWS_ABSENT_MODULE} did not return a live article, and no ${AZNEWS_ABSENT_SOURCE} is configured. Lamb Lens order is Service, then Clarity, then Peace.`,
      )
    : sentence(
        onMap
          ? `A supplied item is on a 4DMap pin. Date ${item.date}, event ${item.event}, ${placeWords(item)}. The wording and the image hash are on both hash chains. ${item.live ? "Only this item is live." : "This item is not live."} The global live flag stays false. AZNews is not an installed app. Lamb Lens order is Service, then Clarity, then Peace.`
          : `A supplied item was stored on the AZNews standalone path. It is not on a 4DMap pin. ${item.live ? "Only this item is live." : "This item is not live."} The global live flag stays false. AZNews is not merged and not installed.`,
      );
  if (!onMap && item.fixture) {
    return lockFlags({
      ok: true,
      op: "news_ingest",
      path: "standalone",
      on_map: false,
      refused: false,
      fixture: true,
      fixture_is_source: false,
      fixture_label: pack.label,
      item_live: false,
      surface: "MOCK",
      item_id: item.id,
      date: item.date,
      event: item.event,
      headline: item.headline,
      wording: item.wording,
      images: item.images,
      score: item.score,
      score_kind: item.score_kind,
      document_hash: receipt.document_hash,
      receipt,
      summary: sentence(
        `A labeled fixture item was stored on the AZNews standalone path. Date ${item.date}, event ${item.event}. It is not a live article and it is not on a 4DMap pin. AZNews stays unmerged and not live.`,
      ),
      note: sentence(
        `A labeled fixture item was stored on the AZNews standalone path. Date ${item.date}, event ${item.event}. It is not a live article and it is not on a 4DMap pin. AZNews stays unmerged and not live.`,
      ),
    });
  }
  return lockFlags({
    ok: true,
    op: onMap ? "news_pin" : "news_ingest",
    path: onMap ? "joined" : "standalone",
    on_map: onMap,
    refused: false,
    fixture: item.fixture === true,
    fixture_is_source: false,
    fixture_label: item.fixture ? pack.label : undefined,
    item_live: item.live === true,
    surface: item.fixture ? "MOCK" : "REAL",
    id: card ? card.id : undefined,
    item_id: item.id,
    date: item.date,
    event: item.event,
    headline: item.headline,
    wording: item.wording,
    images: item.images,
    image_gap: item.image_gap === true,
    score: item.score,
    score_kind: item.score_kind,
    h: card ? card.h : undefined,
    document_hash: receipt.document_hash,
    card: card || undefined,
    pin_frame: card
      ? {
          kind: PIN_FRAME_KIND,
          date: item.date,
          event: item.event,
          lat: item.lat,
          lon: item.lon,
          gazetteer_id: item.gazetteer_id,
          surface: item.fixture ? "MOCK" : "REAL",
        }
      : undefined,
    receipt,
    summary,
    note: summary,
  });
}

async function pinFixture(payload, cardPrev, path) {
  const gate = readFixture(payload);
  if (!gate) return null;
  const pack = await readSupplied(payload, "fixture", null);
  if (path === "standalone") return pinSupplied(pack, cardPrev, "standalone");
  return pinSupplied(pack, cardPrev, "joined");
}

function matchRecord(payload, mapOnly) {
  const pool = mapOnly ? records.filter((row) => row.on_map) : records;
  const id = String((payload && (payload.item_id || payload.pin_id || payload.id)) || "").trim();
  if (id) return pool.find((row) => row.item.id === id || row.pin_id === id) || null;
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
    pool.find(
      (row) =>
        row.item.event === event &&
        row.item.date === clock &&
        row.item.lat === anchor.lat &&
        row.item.lon === anchor.lon &&
        row.item.gazetteer_id === anchor.gazetteer_id,
    ) || null
  );
}

async function openItem(payload, path) {
  const mapOnly = path !== "standalone";
  const pool = mapOnly ? records.filter((row) => row.on_map) : records;
  if (!pool.length) {
    if (payload && payload.fixture === true) {
      readFixture(payload);
      return refuse(
        "news_open",
        "AZNEWS-NO-MATCH",
        "4DMap found no pinned item for that date, event, and place. Nothing was invented. AZNews is not merged and not live.",
      );
    }
    if (!mapOnly && records.length) {
      return refuse(
        "news_open",
        "AZNEWS-NO-MATCH",
        "AZNews found no stored item for that id. Nothing was filled in.",
      );
    }
    return refuse("news_open", AZNEWS_ABSENT_CODE, absentSentence("open"));
  }
  const found = matchRecord(payload, mapOnly);
  if (!found) {
    return refuse(
      "news_open",
      "AZNEWS-NO-MATCH",
      mapOnly
        ? "4DMap found no pinned item for that date, event, and place. Nothing was invented. AZNews is not merged and not live."
        : "AZNews found no stored item for that id. Nothing was filled in.",
    );
  }
  const offline = payload.offline === true;
  const pack = {
    offline,
    username: payload.username == null ? "" : String(payload.username).trim(),
    label: found.item.fixture_label,
  };
  if (offline) usernameOf(pack);
  const doc = await docFor("aznews-open", found.item, { pin_id: found.pin_id, path });
  const planned = await planReceipt(doc, pack);
  const docHash = planned.docHash;
  let receipt = planned.existing;
  const already = Boolean(receipt);
  if (!receipt) receipt = commitReceipt(planned.receipt);
  if (path === "joined" && found.item.live) {
    found.opened = true;
    realOnMap = true;
  }
  const item = found.item;
  const summary = item.fixture
    ? sentence(
        already
          ? `4DMap opened the matching fixture item. Date ${item.date}, event ${item.event}, ${placeWords(item)}. The words are: ${item.headline}. That open was already on the offline chain for this username, so the document was not written again. This fixture is not a live article. AZNews is not merged and not live. Lamb Lens order is Service, then Clarity, then Peace.`
          : `4DMap opened the matching fixture item. Date ${item.date}, event ${item.event}, ${placeWords(item)}. The words are: ${item.headline}. This fixture is not a live article. AZNews is not merged and not live, because the news source module ${AZNEWS_ABSENT_MODULE} is in this tree and no ${AZNEWS_ABSENT_SOURCE} is configured. Lamb Lens order is Service, then Clarity, then Peace.`,
      )
    : sentence(
        path === "joined"
          ? `4DMap opened the supplied item. The words are: ${item.wording}. ${item.live ? "Only this item is live." : "This item is not a live article."} The global live flag stays false.`
          : `AZNews opened the stored item on the standalone path. The words are: ${item.wording}. It was not opened from a map pin. ${item.live ? "Only this item is live." : "This item is not a live article."} The global live flag stays false.`,
      );
  return lockFlags({
    ok: true,
    op: "news_open",
    path,
    on_map: found.on_map === true,
    refused: false,
    fixture: item.fixture === true,
    fixture_is_source: false,
    item_live: item.live === true,
    already_on_chain: already,
    id: found.pin_id,
    item_id: item.id,
    date: item.date,
    event: item.event,
    headline: item.headline,
    wording: item.wording,
    images: item.images,
    score: item.score,
    document_hash: docHash,
    receipt,
    summary,
    note: summary,
  });
}

function status() {
  const outlets = newsOutlets();
  const summary = sentence(
    `No news source is present, so live news is refused. AZNews standalone (news_ingest) and the 4DMap join (news_pin, news_open) are both callable. The adapter ${AZNEWS_ABSENT_MODULE} is in this tree. No ${AZNEWS_ABSENT_SOURCE} is configured. ${outlets.length} outlets from the Press Gazette English-language top 50 are configured and not live until a fetch stores an item. Labeled fixture pins are not a news source. The global live flag stays false. Receipts use a primary hash chain and a secondary hash chain. That lattice is not marked live. Lamb Lens order is Service, then Clarity, then Peace.`,
  );
  return lockFlags({
    ok: true,
    op: "news_status",
    refused_source: !fetchedStored,
    code: fetchedStored ? null : AZNEWS_ABSENT_CODE,
    absent_module: AZNEWS_ABSENT_MODULE,
    absent_source: AZNEWS_ABSENT_SOURCE,
    fixture_pins: records.filter((row) => row.item.fixture && row.on_map).length,
    fixture_is_source: false,
    standalone_items: records.filter((row) => !row.on_map).length,
    paths: aznewsJoinCard().paths,
    outlets: outlets.length,
    outlets_live: 0,
    weather_live: false,
    weather_adapter: WEATHER_ADAPTER.name,
    black_swans: blackSwanCatalog().length,
    ranking: NEWS_RANKING.article,
    summary,
    note: summary,
  });
}

function sources(payload) {
  const rows = newsOutlets();
  const summary = sentence(
    `${rows.length} outlets are configured from the Press Gazette English-language top 50 for August 2026. None of these catalog rows is live. A public RSS is wired where a feed URL is recorded. A paid or blocked feed stays configured-but-not-live. No ${AZNEWS_ABSENT_SOURCE} is configured.`,
  );
  return lockFlags({
    ok: true,
    op: "news_sources",
    path: "standalone",
    count: rows.length,
    sources_live: false,
    outlets_live: 0,
    ranking: NEWS_RANKING,
    outlets: payload && payload.full === false ? rows.map((row) => ({ id: row.id, rank: row.rank, status: row.status, live: false, access: row.access })) : rows,
    summary,
    note: summary,
  });
}

async function sourceFetch(payload, ctx) {
  const outlet = outletById(payload.id || payload.source_id || payload.outlet);
  if (!outlet) {
    return refuse("news_sources", "AZNEWS-SOURCE-UNKNOWN", "That outlet is not in the cited top 50. Nothing was fetched.");
  }
  const pulled = await pullOutlet(outlet, fetchImplOf(ctx));
  const summary = sentence(
    pulled.fetched
      ? `The ${outlet.name} feed returned an item on this call. The catalog row stays configured-but-not-live until that item is stored with wording, an image hash, and a score. The global live flag stays false.`
      : `${outlet.name} stayed configured-but-not-live. ${pulled.reason}`,
  );
  return lockFlags({
    ok: true,
    op: "news_sources",
    path: "standalone",
    sources_live: false,
    outlet: { ...pulled, live: false, status: pulled.fetched ? "configured-but-not-live" : pulled.status },
    item_preview: pulled.item
      ? { title: pulled.item.title, link: pulled.item.link, image_url: pulled.item.image_url || null }
      : null,
    summary,
    note: summary,
  });
}

async function weather(payload, ctx) {
  const all = weatherRegions();
  const asked = payload && (payload.region || payload.id) ? regionById(payload.region || payload.id) : null;
  if ((payload && (payload.region || payload.id)) && !asked) {
    return refuse("news_weather", "AZNEWS-REGION-UNKNOWN", "That region is not in the UN M49 list. No reading was filled in.");
  }
  const targets = asked ? [asked] : all;
  const fetchImpl = payload && payload.fetch === true ? fetchImplOf(ctx) : null;
  const rows = [];
  for (const region of targets) {
    let row;
    if (payload && payload.observation && asked && region.id === asked.id) {
      const supplied = suppliedWeather(region, payload.observation);
      if (!supplied) {
        return refuse("news_weather", "AZNEWS-WEATHER-GAP", "The supplied observation had no temperature. The gap stands. Nothing was filled in.");
      }
      supplied.live = payload.real === true;
      row = supplied;
    } else if (fetchImpl) {
      row = await pullWeather(region, fetchImpl);
    } else {
      row = {
        ...region,
        reading: null,
        gap: true,
        live: false,
        score: 0,
        score_kind: "observation-present",
        wording: `No observation for ${region.name}. The adapter was not asked to fetch. None was filled in.`,
        reason: "The Open-Meteo adapter was not asked to fetch.",
      };
    }
    rows.push(row);
  }
  const untouched = asked
    ? all
        .filter((region) => region.id !== asked.id)
        .map((region) => ({
          ...region,
          gap: true,
          live: false,
          reading: null,
          score: 0,
          score_kind: "observation-present",
          wording: `No observation for ${region.name}. None was filled in.`,
          origin: null,
        }))
    : [];
  const combined = asked ? rows.concat(untouched) : rows;
  const gaps = combined.filter((row) => row.gap).length;
  const anyLive = rows.some((row) => row.live === true && row.origin === "open-meteo");
  const weatherLive = anyLive && gaps === 0;
  for (const row of combined) {
    const doc = {
      kind: "aznews-weather",
      region_id: row.id,
      wording: row.wording,
      images: [],
      image_gap: true,
      score: row.score,
      score_kind: row.score_kind,
      reading: row.reading,
      gap: row.gap === true,
      origin: row.origin || null,
    };
    const pack = { offline: payload.offline === true, username: payload.username == null ? "" : String(payload.username) };
    const planned = await planReceipt(doc, pack);
    const prior = planned.existing || chain.find((entry) => entry.document_hash === planned.docHash) || null;
    if (!prior) commitReceipt(planned.receipt);
    row.document_hash = planned.docHash;
    row.receipt = prior || planned.receipt;
  }
  const summary = sentence(
    weatherLive
      ? "Open-Meteo returned an observation for every listed region on this call."
      : `Weather is not live globally. ${gaps} region gaps are recorded. Open-Meteo is the adapter. No reading was filled in where an observation was missing.`,
  );
  return lockFlags({
    ok: true,
    op: "news_weather",
    path: "standalone",
    weather_live: weatherLive,
    weather_adapter: WEATHER_ADAPTER,
    region: asked ? rows[0] : undefined,
    regions: combined,
    gaps,
    count: combined.length,
    summary,
    note: summary,
  });
}

async function blackSwan(payload, cardPrev) {
  const catalog = blackSwanCatalog();
  const id = payload && (payload.id || payload.event_id);
  if (!id) {
    const summary = sentence(
      `${catalog.length} cited black-swan rows are listed. Rows without a calendar day are not pinnable. None of these rows is a live article. The global live flag stays false.`,
    );
    return lockFlags({
      ok: true,
      op: "news_black_swan",
      path: payload && payload.path === "standalone" ? "standalone" : "joined",
      count: catalog.length,
      events: catalog,
      summary,
      note: summary,
    });
  }
  const event = blackSwanById(id);
  if (!event) return refuse("news_black_swan", "AZNEWS-EVENT-UNKNOWN", "That event is not in the cited catalog. Nothing was added.");
  const pin = payload.pin === true || payload.path === "joined";
  if (pin && !event.pinnable) {
    return refuse(
      "news_black_swan",
      "AZNEWS-DATE-GAP",
      `${event.event} is cited and has no calendar day in the source, so it was not pinned. The gap is recorded.`,
    );
  }
  const pack = {
    offline: payload.offline === true,
    username: payload.username == null ? "" : String(payload.username).trim(),
  };
  const item = {
    id: event.id,
    date: event.date ? clockOf(event.date) : null,
    event: event.event,
    headline: event.event,
    wording: event.wording,
    lat: event.lat,
    lon: event.lon,
    gazetteer_id: event.gazetteer_id,
    images: [],
    image_gap: true,
    score: event.score,
    score_kind: event.score_kind,
    fixture: false,
    live: false,
    origin: "cited-catalog",
  };
  const onMap = pin === true;
  const doc = await docFor(onMap ? "aznews-black-swan-pin" : "aznews-black-swan", item, { cites: event.cites });
  let card = null;
  if (onMap) {
    card = await makeCard({
      id: newId(),
      t: {
        kind: PIN_FRAME_KIND,
        clock: item.date,
        event: item.event,
        lat: item.lat,
        lon: item.lon,
        gazetteer_id: item.gazetteer_id,
        surface: "REAL",
        fixture: false,
        join: "aznews",
        live_article: false,
        cited: true,
      },
      src: "aznews-black-swan",
      note: `Cited black swan ${item.event}`,
      prev: cardPrev || GENESIS_PREV,
      pi: PI_EMPTY,
    });
  }
  const stored = await storeItem({ ...pack, item }, doc, card, onMap);
  const summary = sentence(
    onMap
      ? `The cited event ${item.event} is pinned on 4DMap. The wording is on both hash chains. It is not a live article. The global live flag stays false.`
      : `The cited event ${item.event} is on the AZNews chain. It is not a live article.`,
  );
  return lockFlags({
    ok: true,
    op: "news_black_swan",
    path: onMap ? "joined" : "standalone",
    on_map: onMap,
    item_live: false,
    event: item.event,
    event_id: item.id,
    date: item.date,
    wording: item.wording,
    score: item.score,
    score_kind: item.score_kind,
    cites: event.cites,
    images: [],
    image_gap: true,
    id: card ? card.id : undefined,
    card: card || undefined,
    pin_frame: card
      ? {
          kind: PIN_FRAME_KIND,
          date: item.date,
          event: item.event,
          lat: item.lat,
          lon: item.lon,
          gazetteer_id: item.gazetteer_id,
          surface: "REAL",
        }
      : undefined,
    document_hash: stored.receipt.document_hash,
    receipt: stored.receipt,
    summary,
    note: summary,
  });
}

async function ingestFetched(op, payload, ctx, path) {
  const outlet = outletById(payload.id || payload.source_id || payload.outlet);
  if (!outlet) return refuse(op, "AZNEWS-SOURCE-UNKNOWN", "That outlet is not in the cited top 50. Nothing was stored.");
  const pulled = await pullOutlet(outlet, fetchImplOf(ctx));
  if (!pulled.fetched || !pulled.item) {
    return refuse(op, AZNEWS_ABSENT_CODE, absentSentence(op === "news_ingest" ? "ingest" : "pin"));
  }
  const feed = pulled.item;
  const images = await imageOf(feed.image_url ? { url: feed.image_url } : null, fetchImplOf(ctx));
  const score = rankScore(outlet.rank);
  const clock = clockOf(feed.date) || null;
  const wording = String(feed.wording || "").trim();
  const ready = Boolean(wording && score != null && imageReady(images.images) && clock);
  const item = {
    id: `${outlet.id}-${(await documentHash({ link: feed.link || "", title: feed.title || "" })).slice(0, 12)}`,
    date: clock || "1970-01-01T00:00:00Z",
    event: String(feed.title || outlet.name).slice(0, 240),
    headline: String(feed.title || outlet.name).slice(0, 240),
    wording: wording || String(feed.title || ""),
    lat: null,
    lon: null,
    gazetteer_id: `outlet:${outlet.id}`,
    images: images.images,
    image_gap: !imageReady(images.images),
    score,
    score_kind: "press-gazette-rank",
    fixture: false,
    live: ready,
    origin: "fetch",
    live_article: ready,
    source_id: outlet.id,
  };
  if (!clock) {
    return lockFlags({
      ok: true,
      op,
      path,
      on_map: false,
      stored: false,
      item_live: false,
      outlet_id: outlet.id,
      wording: item.wording,
      images: item.images,
      image_gap: true,
      score,
      summary: sentence(
        `${outlet.name} returned an item without a parseable date. It was not pinned and it is not live. The wording was not dropped.`,
      ),
      note: sentence(
        `${outlet.name} returned an item without a parseable date. It was not pinned and it is not live. The wording was not dropped.`,
      ),
    });
  }
  const pack = {
    kind: "fetch",
    offline: payload.offline === true,
    username: payload.username == null ? "" : String(payload.username).trim(),
    item,
  };
  const stored = await pinSupplied(pack, ctx.prev, ready && path === "joined" ? "joined" : "standalone");
  stored.item_live = item.live === true;
  stored.global_live = false;
  if (!ready) {
    stored.item_live = false;
    stored.summary = sentence(
      `${outlet.name} was fetched and stored with the wording that the feed returned. An image hash or a date was missing, so this item is not live. The global live flag stays false.`,
    );
    stored.note = stored.summary;
  }
  return stored;
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
    if (op === "news_sources") {
      if (payload && payload.fetch === true) return await sourceFetch(payload, ctx);
      return sources(payload);
    }
    if (op === "news_weather") return await weather(payload, ctx);
    if (op === "news_black_swan") return await blackSwan(payload, ctx.prev);
    if (op === "news_ingest" || op === "news_pin") {
      const path = op === "news_ingest" ? "standalone" : pathOf(payload, "joined");
      if (payload && payload.fetch === true) return await ingestFetched(op, payload, ctx, path);
      if (payload && payload.real === true) {
        const pack = await readSupplied(payload, "real", fetchImplOf(ctx));
        return pinSupplied(pack, ctx.prev, path);
      }
      const pinned = await pinFixture(payload, ctx.prev, path);
      if (pinned) return pinned;
      return refuse(op, AZNEWS_ABSENT_CODE, absentSentence(op === "news_ingest" ? "ingest" : "pin"));
    }
    if (op === "news_open") return await openItem(payload, pathOf(payload, "joined"));
    return refuse(op, "AZNEWS-UNKNOWN", "AZNews does not have that action.");
  } catch (err) {
    if (err && err.code) return refuse(op, err.code, err.message);
    throw err;
  }
}

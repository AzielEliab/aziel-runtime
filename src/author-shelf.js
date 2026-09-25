/**
 * Aziel Elroi Eliab author shelf.
 *
 * Top-bar tab. Corpus is a sub-shelf inside it, not a domain beside
 * AZnet / Forensics / Social. One snapshot feeds every sub-shelf.
 * A site that does not answer stays unreachable. Last-known rows are
 * labeled stale. Empty means empty. This shelf does not POST uploads.
 *
 * Author: Aziel Eliab. The tab name is Aziel Elroi Eliab.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ZENODO_AUDIT } from "./catalog-meta.js";
import { PAPER_DEPOSITS } from "./cold-multi-shelf.js";
import {
  AUTHOR_SITE_CITE,
  AUTHOR_SITE_ORIGIN,
  GODLOCK_UK_CITE,
  GODLOCK_UK_ORIGIN,
  HEDIDNTJUMP_CITE,
  HEDIDNTJUMP_HOME,
  HEDIDNTJUMP_NAME,
  LIBRARY_NAME,
  LIBRARY_ORIGIN,
} from "./seo.js";
import { LIVE_LIBRARY_INDEX } from "./engines/aziel-corpus/tip-pack.js";

export const AUTHOR_SHELF_SPEC = "AUTHOR-SHELF-1.0";
export const AUTHOR_TAB_ID = "aziel-elroi-eliab";
export const AUTHOR_TAB_LABEL = "Aziel Elroi Eliab";
export const AUTHOR_NAME_TAB = "Aziel Elroi Eliab";
export const AUTHOR_IDENTITY = "Aziel Eliab only";

const UA = "Mozilla/5.0";
const ITEM_CAP = 24;
const ITEM_KEYS = ["record_id", "id", "title", "name", "url", "href", "sha256", "hash", "doi"];

/** Front doors already cited in this runtime. No invented host. */
export const AUTHOR_SURFACES = Object.freeze([
  Object.freeze({
    id: "corpus",
    shelf: "corpus",
    name: LIBRARY_NAME,
    role: "corpus",
    home: `${LIBRARY_ORIGIN}/`,
    probe: LIVE_LIBRARY_INDEX,
  }),
  Object.freeze({
    id: "azieleliab",
    shelf: "sites",
    name: "azieleliab.com",
    role: "hub",
    home: `${AUTHOR_SITE_ORIGIN}/`,
    probe: AUTHOR_SITE_CITE,
  }),
  Object.freeze({
    id: "godlock",
    shelf: "sites",
    name: "godlock.uk",
    role: "hub",
    home: `${GODLOCK_UK_ORIGIN}/`,
    probe: GODLOCK_UK_CITE,
  }),
  Object.freeze({
    id: "hedidntjump",
    shelf: "sites",
    name: HEDIDNTJUMP_NAME,
    role: "sister-archive",
    home: HEDIDNTJUMP_HOME,
    probe: HEDIDNTJUMP_CITE,
  }),
  Object.freeze({
    id: "zenodo",
    shelf: "papers",
    name: "Zenodo",
    role: "records-api",
    home: ZENODO_AUDIT.public_api,
    probe: `${ZENODO_AUDIT.public_api}?q=${encodeURIComponent(ZENODO_AUDIT.creator_queries[0])}&size=10`,
    note: "Public records API already cited by the Zenodo audit. This runtime has no Aziel Systems community URL.",
  }),
]);

const lastKnown = new Map();

export function resetAuthorShelf() {
  lastKnown.clear();
}

function clip(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text.length > 240) return "";
  return text;
}

function copyItem(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const item = { invented: false };
  for (const key of ITEM_KEYS) {
    const text = clip(row[key]);
    if (text) item[key] = text;
  }
  const meta = row.metadata;
  if (meta && typeof meta === "object" && !item.title) {
    const title = clip(meta.title);
    if (title) item.title = title;
  }
  const links = row.links;
  if (links && typeof links === "object" && !item.url) {
    const url = clip(links.html || links.self);
    if (url) item.url = url;
  }
  if (Object.keys(item).length < 2) return null;
  return item;
}

function readList(value) {
  if (!Array.isArray(value)) return null;
  const items = [];
  for (const row of value) {
    const item = copyItem(row);
    if (item) items.push(item);
    if (items.length >= ITEM_CAP) break;
  }
  return items;
}

export function readInventory(json) {
  if (Array.isArray(json)) {
    const items = readList(json);
    return { inventory_read: items != null, items: items || [] };
  }
  if (!json || typeof json !== "object") return { inventory_read: false, items: [] };
  const buckets = [json.records, json.items, json.documents, json.entries, json.hits && json.hits.hits, Array.isArray(json.hits) ? json.hits : null];
  for (const bucket of buckets) {
    const items = readList(bucket);
    if (items) return { inventory_read: true, items };
  }
  return { inventory_read: false, items: [] };
}

function filterItems(items, query) {
  const q = clip(query).toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    [item.record_id, item.id, item.title, item.name, item.doi, item.hash, item.sha256]
      .filter(Boolean)
      .some((part) => String(part).toLowerCase().includes(q)),
  );
}

async function probeSurface(surface, fetchImpl, query) {
  const prior = lastKnown.get(surface.id) || null;
  try {
    const res = await fetchImpl(surface.probe, {
      method: "GET",
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res || !res.ok) {
      return {
        reachable: false,
        http_status: res ? res.status : 0,
        reason: "http-error",
        inventory_read: false,
        items: [],
        last_known: prior,
      };
    }
    const json = await res.json().catch(() => null);
    const read = readInventory(json);
    const items = filterItems(read.items, query);
    if (read.inventory_read) {
      lastKnown.set(surface.id, { at: new Date().toISOString(), items, http_status: res.status });
    }
    return {
      reachable: true,
      http_status: res.status,
      reason: read.inventory_read ? null : "inventory-unparsed",
      inventory_read: read.inventory_read,
      items: read.inventory_read ? items : [],
      last_known: null,
    };
  } catch {
    return {
      reachable: false,
      http_status: 0,
      reason: "unreachable",
      inventory_read: false,
      items: [],
      last_known: prior,
    };
  }
}

function viewSurface(surface, probe) {
  const stale = !probe.reachable && probe.last_known
    ? {
        at: probe.last_known.at,
        http_status: probe.last_known.http_status,
        item_count: probe.last_known.items.length,
        items: probe.last_known.items,
        stale: true,
        invented: false,
      }
    : null;
  return {
    id: surface.id,
    shelf: surface.shelf,
    name: surface.name,
    role: surface.role,
    home: surface.home,
    probe: surface.probe,
    note: surface.note || null,
    reachable: probe.reachable === true,
    http_status: probe.http_status,
    reason: probe.reason,
    inventory_read: probe.inventory_read === true,
    item_count: probe.items.length,
    items: probe.items,
    last_known: stale,
    invented: false,
  };
}

function hashItems(surfaces) {
  const out = [];
  for (const surface of surfaces) {
    const rows = surface.reachable ? surface.items : surface.last_known ? surface.last_known.items : [];
    for (const item of rows) {
      const hash = item.sha256 || item.hash;
      if (!hash) continue;
      out.push({
        hash,
        surface: surface.id,
        stale: surface.reachable !== true,
        invented: false,
      });
      if (out.length >= ITEM_CAP) return out;
    }
  }
  return out;
}

export async function refreshAuthorShelf(fetchImpl = fetch, opts = {}) {
  const query = clip(opts.query || opts.q || "");
  const only = opts.only ? String(opts.only) : "";
  const selected = AUTHOR_SURFACES.filter((surface) => !only || surface.id === only || surface.shelf === only);
  const surfaces = [];
  for (const surface of selected) {
    const probe = await probeSurface(surface, fetchImpl, query);
    surfaces.push(viewSurface(surface, probe));
  }
  const corpus = surfaces.find((surface) => surface.id === "corpus") || null;
  return {
    ok: true,
    spec: AUTHOR_SHELF_SPEC,
    author: AUTHOR_NAME_TAB,
    identity: AUTHOR_IDENTITY,
    lamb_lens: ["Service", "Clarity", "Peace"],
    tab: AUTHOR_TAB_ID,
    corpus_is_top_bar_domain: false,
    uploads_pushed: false,
    no_double_upload: true,
    hashchain: "cite only; this shelf does not write site bytes",
    redact: "item bodies are not copied; id, title, url, and hash only",
    invented: false,
    query: query || null,
    corpus_searched: !!(corpus && corpus.reachable && corpus.inventory_read),
    surfaces,
    shelves: {
      corpus: surfaces.filter((surface) => surface.shelf === "corpus"),
      sites: surfaces,
      uploads: hashItems(surfaces),
      papers: {
        live: surfaces.filter((surface) => surface.shelf === "papers"),
        catalog_cites: PAPER_DEPOSITS.map((row) => ({
          doi: row.doi,
          payload: row.payload,
          source: "in-repo-cite",
          live: false,
          not_a_live_query: true,
        })),
        zenodo_audit_at: ZENODO_AUDIT.checked_at,
      },
    },
  };
}

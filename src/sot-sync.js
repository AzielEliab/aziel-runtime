/**
 * SOT-SYNC-1.0 — pull-plane fan-out for the suite tip.
 *
 * GET /v1/software (this Worker's catalog) is the authority for suite
 * version, git sha, Softwares count, and per-card versions. mesh_broadcast
 * stays a hash receipt. This plane does not copy catalog bodies across the
 * mesh (live_body_sync stays false). Outlets pull. A confirm apply writes
 * the mesh ledger and a push hook only when that hook answers.
 *
 * An unreachable outlet keeps its last-known inventory. Missing fields stay
 * null. version_id stays null when the live catalog does not expose it.
 * Ask Jeeves is suite help, not a Softwares card.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BUILD_GIT_SHA } from "./build-meta.js";
import { check as decisiongateCheck } from "./engines/decisiongate/engine.js";
import { JEEVES_SUITE_HELP } from "./engines/aziel-corpus/jeeves.js";
import { appendActReceipt, mintActReceipt } from "./library-receipts.js";
import { isTruthyFlag } from "./mcp-safeguard.js";
import { RUNTIME_VERSION } from "./runtime-api.js";
import {
  AUTHOR_SITE_ORIGIN,
  LIBRARY_MIRROR,
  softwareHubCrawl,
} from "./seo.js";
import { softwareCatalog, softwareMeta } from "./software-catalog.js";
import { ZERO_HASH } from "./session-core.js";

export const SOT_SPEC = "SOT-SYNC-1.0";
export const SOT_AUTHOR = "Aziel Eliab";
export const SOT_VERSION_ID_NOTE =
  "GET /v1/software does not expose version_id. This field is null. No version_id was invented.";
export const SOT_PLANE_NOTE =
  "Pull plane. mesh_broadcast remains hash-receipt only. live_body_sync is false. Outlets pull GET /v1/software. A hook POST carries the tip (version, git sha, count, slug versions), not catalog bodies.";

const RECEIPT_CAP = 32;
const HOOK_HOSTS = new Set([
  "azieleliab.com",
  "www.azieleliab.com",
  "godlock.uk",
  "www.godlock.uk",
  "azielcorpuslibrary.net",
  "www.azielcorpuslibrary.net",
]);

const ledger = {
  outlets: {},
  last_sot: null,
  receipts: [],
  tip_hash: ZERO_HASH,
};

const pushOverrides = new Map();
let products = [];

export function setSotProducts(list) {
  products = Array.isArray(list) ? list.slice() : [];
  return products.length;
}

export function resetSotStore() {
  ledger.outlets = {};
  ledger.last_sot = null;
  ledger.receipts = [];
  ledger.tip_hash = ZERO_HASH;
  pushOverrides.clear();
}

export function setOutletPushUrl(id, url) {
  const key = String(id || "").trim();
  const accepted = acceptOutletHook(url);
  if (!key || !accepted.ok) return { ok: false, code: "SOT-HOOK-HOST", id: key || null };
  pushOverrides.set(key, accepted.url);
  return { ok: true, id: key, push_url: accepted.url };
}

export function acceptOutletHook(raw) {
  const url = String(raw || "").trim();
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, code: "SOT-HOOK-HOST", message: "outlet_hook must be an https URL on a hub or *.vibelock.workers.dev host." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, code: "SOT-HOOK-HOST", message: "outlet_hook must be https." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, code: "SOT-HOOK-HOST", message: "outlet_hook must not carry userinfo." };
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = HOOK_HOSTS.has(host) || host.endsWith(".vibelock.workers.dev");
  if (!allowed) {
    return { ok: false, code: "SOT-HOOK-HOST", message: "outlet_hook host is not a registered hub or product Worker." };
  }
  return { ok: true, url: parsed.toString() };
}

function shaOrNull(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(s)) return null;
  return s;
}

function stringOrNull(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s ? s : null;
}

function countOrNull(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function localCatalog(origin, env) {
  const meta = softwareMeta(env || {});
  return softwareCatalog(String(origin || "").replace(/\/$/, ""), products, {
    runtimeVersion: RUNTIME_VERSION,
    version: RUNTIME_VERSION,
    git_sha: meta.git_sha,
    updated_at: meta.updated_at,
    env,
  });
}

function versionsFromCards(cards) {
  const out = {};
  for (const card of cards || []) {
    if (!card || typeof card !== "object" || !card.slug) continue;
    out[String(card.slug)] = card.version == null ? null : String(card.version);
  }
  return out;
}

function tipFromSot(sot) {
  return {
    suite_version: sot.suite_version,
    git_sha: sot.git_sha,
    softwares_count: sot.softwares_count,
    version_id: null,
  };
}

export function projectSot(catalog, extra = {}) {
  const cards = Array.isArray(catalog && catalog.software) ? catalog.software : [];
  const slugs = cards.map((card) => card && card.slug).filter(Boolean);
  return {
    ok: true,
    spec: SOT_SPEC,
    author: SOT_AUTHOR,
    identity: "Aziel Eliab",
    source: extra.source || "in-process-get-v1-software",
    endpoints: {
      software: "/v1/software",
      health: "/v1/health",
      cite: "/cite.json",
    },
    endpoints_read: extra.endpoints_read || ["GET /v1/software"],
    suite_version: catalog && catalog.version ? String(catalog.version) : null,
    git_sha: shaOrNull(catalog && catalog.git_sha),
    softwares_count: Number.isInteger(catalog && catalog.count) ? catalog.count : null,
    version_id: null,
    version_id_note: SOT_VERSION_ID_NOTE,
    software_versions: versionsFromCards(cards),
    software_slugs: slugs,
    ask_jeeves: {
      ...JEEVES_SUITE_HELP,
      in_softwares_cards: slugs.includes("jeeves") || slugs.includes("ask-jeeves"),
    },
    live_body_sync: false,
    mesh_broadcast: false,
    nodes_unchanged: true,
    live_nodes_unchanged: true,
    download_counters_unchanged: true,
    note: extra.note || "Suite tip from the catalog GET /v1/software serves. version_id is null.",
  };
}

function emptySot(source, note) {
  return {
    ok: false,
    spec: SOT_SPEC,
    author: SOT_AUTHOR,
    identity: "Aziel Eliab",
    source,
    suite_version: null,
    git_sha: null,
    softwares_count: null,
    version_id: null,
    version_id_note: SOT_VERSION_ID_NOTE,
    software_versions: {},
    software_slugs: [],
    ask_jeeves: { ...JEEVES_SUITE_HELP, in_softwares_cards: false },
    live_body_sync: false,
    mesh_broadcast: false,
    nodes_unchanged: true,
    live_nodes_unchanged: true,
    download_counters_unchanged: true,
    note,
  };
}

function observeJson(body) {
  const software = Array.isArray(body.software) ? body.software : null;
  const catalogShaped = software != null || body.git_sha != null || body.gitSha != null;
  const suite_version = stringOrNull(body.suite_version ?? body.runtime_version ?? (catalogShaped ? body.version : null));
  const git_sha = shaOrNull(body.git_sha ?? body.gitSha);
  const softwares_count = countOrNull(
    body.softwares_count ?? body.software_count ?? (software ? software.length : null),
  );
  let version_id = null;
  if (Object.prototype.hasOwnProperty.call(body, "version_id") && body.version_id != null && String(body.version_id).trim() !== "") {
    const raw = String(body.version_id).trim();
    version_id = raw.toLowerCase() === "null" ? null : raw;
  }
  return {
    suite_version,
    git_sha,
    softwares_count,
    version_id,
    software_versions: software ? versionsFromCards(software) : null,
    exposed: {
      suite_version: suite_version != null,
      git_sha: git_sha != null,
      softwares_count: softwares_count != null,
      version_id: version_id != null,
      software_versions: software != null,
    },
  };
}

function observeText(text) {
  const pick = (re) => {
    const m = String(text || "").match(re);
    return m ? m[1] : null;
  };
  const version_id_raw = pick(/^version_id:\s*(\S+)/im);
  return observeJson({
    suite_version: pick(/^suite_version:\s*(\S+)/im),
    git_sha: pick(/^git_sha:\s*([0-9a-f]{7,40})/im),
    softwares_count: pick(/^softwares_count:\s*(\d+)/im),
    version_id: version_id_raw,
  });
}

export function observeOutletBody(payload) {
  if (payload == null) return observeJson({});
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) return observeJson({});
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return observeOutletBody(JSON.parse(trimmed));
      } catch {
        return observeText(trimmed);
      }
    }
    return observeText(trimmed);
  }
  if (typeof payload !== "object" || Array.isArray(payload)) return observeJson({});
  return observeJson(payload);
}

function sisterNote(id) {
  if (id === "azieleliab") {
    return "Hub cite / JSON-LD / llms. Sister adapter: AzielEliab/azieleliab #81. This runtime does not write that site until POST /v1/mesh/outlet exists there.";
  }
  if (id === "godlock.uk") {
    return "Softwares and runtime cites. Sister adapter: AzielEliab/godlock #94. This runtime does not write that site until the hook exists.";
  }
  if (id === "library") {
    return "Corpus surfaces that cite this runtime. Adapter is not in this repo. Unreachable keeps the last-known inventory.";
  }
  return "Registered outlet. Push runs only when push_url is set and the hook answers.";
}

function staticOutlets() {
  const rows = [];
  for (const hub of softwareHubCrawl()) {
    rows.push({
      id: `${hub.id}-cite`,
      kind: "hub_cite",
      label: `${hub.name} cite.json`,
      pull_url: hub.cite,
      push_url: null,
      push_contract: `${String(hub.origin).replace(/\/$/, "")}/v1/mesh/outlet`,
      sister_note: sisterNote(hub.id),
    });
    rows.push({
      id: `${hub.id}-llms`,
      kind: "hub_cite",
      label: `${hub.name} llms.txt`,
      pull_url: hub.llms,
      push_url: null,
      push_contract: `${String(hub.origin).replace(/\/$/, "")}/v1/mesh/outlet`,
      sister_note: sisterNote(hub.id),
    });
    rows.push({
      id: `${hub.id}-catalog`,
      kind: "catalog_mirror",
      label: `${hub.name} Softwares catalog mirror`,
      pull_url: hub.software_catalog,
      push_url: null,
      push_contract: `${String(hub.origin).replace(/\/$/, "")}/v1/mesh/outlet`,
      sister_note: sisterNote(hub.id),
    });
  }
  rows.push({
    id: "azieleliab-jsonld",
    kind: "jsonld",
    label: "azieleliab.com person JSON-LD",
    pull_url: `${AUTHOR_SITE_ORIGIN}/person.jsonld`,
    push_url: null,
    push_contract: `${AUTHOR_SITE_ORIGIN}/v1/mesh/outlet`,
    sister_note: sisterNote("azieleliab"),
  });
  rows.push({
    id: "corpus-runtime-mirror",
    kind: "corpus_surface",
    label: "azielcorpuslibrary.net /runtime catalog mirror",
    pull_url: `${LIBRARY_MIRROR}/v1/software`,
    push_url: null,
    push_contract: `${LIBRARY_MIRROR}/v1/mesh/outlet`,
    sister_note: sisterNote("library"),
  });
  rows.push({
    id: "runtime-frozen-cite",
    kind: "frozen_cite",
    label: "Stamped build-meta cite",
    pull_url: null,
    in_process: true,
    push_url: null,
    push_contract: null,
    sister_note: "Compares BUILD_GIT_SHA and RUNTIME_VERSION with the SoT tip. Apply does not rewrite source files.",
  });
  rows.push({
    id: "mesh-sot-ledger",
    kind: "mesh_ledger",
    label: "Quantum Node Mesh SoT ledger",
    pull_url: null,
    in_process: true,
    ledger: true,
    push_url: null,
    push_contract: "GET /v1/mesh/sot",
    sister_note: SOT_PLANE_NOTE,
  });
  return rows;
}

function meshHookOutlets(nodes) {
  const rows = [];
  for (const node of Object.values(nodes || {})) {
    if (!node || !node.outlet_hook) continue;
    const accepted = acceptOutletHook(node.outlet_hook);
    if (!accepted.ok || !node.node_id) continue;
    rows.push({
      id: `mesh-${node.node_id}`,
      kind: "mesh_hook",
      label: node.label || node.product || node.node_id,
      node_id: node.node_id,
      product: node.product || null,
      pull_url: accepted.url,
      push_url: accepted.url,
      push_contract: accepted.url,
      sister_note: "Mesh join advertised outlet_hook. The roster counts are unchanged. The hook receives the tip, not a catalog body.",
    });
  }
  return rows;
}

function withPush(row) {
  const override = pushOverrides.get(row.id);
  if (!override) return row;
  return { ...row, push_url: override };
}

export function listOutletRecords(nodes) {
  return staticOutlets().concat(meshHookOutlets(nodes)).map(withPush);
}

function frozenObserved(local) {
  return {
    suite_version: RUNTIME_VERSION,
    git_sha: shaOrNull(BUILD_GIT_SHA),
    softwares_count: Number.isInteger(local && local.count) ? local.count : null,
    version_id: null,
    software_versions: null,
    exposed: {
      suite_version: true,
      git_sha: shaOrNull(BUILD_GIT_SHA) != null,
      softwares_count: Number.isInteger(local && local.count),
      version_id: false,
      software_versions: false,
    },
  };
}

function diffFields(sot, observed) {
  const fields = [];
  const scalar = ["suite_version", "git_sha", "softwares_count"];
  for (const name of scalar) {
    const exposed = observed && observed.exposed && observed.exposed[name] === true;
    const sotVal = sot[name];
    const got = exposed ? observed[name] : null;
    fields.push({
      field: name,
      sot: sotVal,
      observed: got,
      exposed,
      would_change: exposed && got !== sotVal,
      note: exposed ? null : "Outlet did not expose this field. It was not filled from the SoT.",
    });
  }
  fields.push({
    field: "version_id",
    sot: null,
    observed: observed && observed.exposed && observed.exposed.version_id ? observed.version_id : null,
    exposed: !!(observed && observed.exposed && observed.exposed.version_id),
    would_change: false,
    note: SOT_VERSION_ID_NOTE,
  });
  const versionsExposed = !!(observed && observed.exposed && observed.exposed.software_versions);
  const changes = [];
  if (versionsExposed) {
    const theirs = observed.software_versions || {};
    const ours = sot.software_versions || {};
    const slugs = new Set([...Object.keys(ours), ...Object.keys(theirs)]);
    for (const slug of slugs) {
      if (ours[slug] !== theirs[slug]) changes.push({ slug, sot: ours[slug] ?? null, observed: Object.prototype.hasOwnProperty.call(theirs, slug) ? theirs[slug] : null });
    }
  }
  fields.push({
    field: "software_versions",
    sot_count: sot.software_versions ? Object.keys(sot.software_versions).length : 0,
    observed_count: versionsExposed ? Object.keys(observed.software_versions || {}).length : null,
    exposed: versionsExposed,
    would_change: changes.length > 0,
    changes,
    note: versionsExposed ? null : "Outlet did not expose a software array. No cards were invented.",
  });
  return fields;
}

function statusFrom(probe, fields) {
  if (probe.unreachable) return "unreachable";
  if (fields.some((row) => row.would_change)) return "drifted";
  const required = fields.filter((row) => row.field === "suite_version" || row.field === "git_sha" || row.field === "softwares_count");
  if (required.some((row) => !row.exposed)) return "unexposed";
  return "ok";
}

async function fetchText(url, fetchImpl) {
  const res = await fetchImpl(url, {
    method: "GET",
    redirect: "manual",
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json, text/plain" },
    signal: AbortSignal.timeout(2500),
  });
  if (!res || res.status < 200 || res.status >= 300) {
    return { ok: false, status: res ? res.status : 0 };
  }
  const text = await res.text();
  return { ok: true, status: res.status, text };
}

async function probeOutlet(outlet, sot, local, fetchImpl, saved) {
  if (outlet.ledger) {
    const observed = {
      suite_version: saved && saved.last_applied ? saved.last_applied.suite_version : null,
      git_sha: saved && saved.last_applied ? saved.last_applied.git_sha : null,
      softwares_count: saved && saved.last_applied ? saved.last_applied.softwares_count : null,
      version_id: null,
      software_versions: null,
      exposed: {
        suite_version: !!(saved && saved.last_applied && saved.last_applied.suite_version != null),
        git_sha: !!(saved && saved.last_applied && saved.last_applied.git_sha),
        softwares_count: !!(saved && saved.last_applied && saved.last_applied.softwares_count != null),
        version_id: false,
        software_versions: false,
      },
    };
    const fields = diffFields(sot, observed);
    return { unreachable: false, observed, fields, status: saved && saved.last_applied ? statusFrom({ unreachable: false }, fields) : "drifted" };
  }
  if (outlet.kind === "frozen_cite") {
    const observed = frozenObserved(local);
    const fields = diffFields(sot, observed);
    return { unreachable: false, observed, fields, status: statusFrom({ unreachable: false }, fields) };
  }
  if (!outlet.pull_url) {
    return {
      unreachable: false,
      observed: null,
      fields: diffFields(sot, observeJson({})),
      status: "unexposed",
    };
  }
  try {
    const got = await fetchText(outlet.pull_url, fetchImpl);
    if (!got.ok) {
      return { unreachable: true, http_status: got.status, observed: null, fields: [], status: "unreachable" };
    }
    const observed = observeOutletBody(got.text);
    const fields = diffFields(sot, observed);
    return { unreachable: false, observed, fields, status: statusFrom({ unreachable: false }, fields), http_status: got.status };
  } catch {
    return { unreachable: true, http_status: 0, observed: null, fields: [], status: "unreachable" };
  }
}

function publicOutlet(outlet, probe, saved, writing) {
  const last_known = probe && probe.unreachable ? (saved && saved.last_known) || null : probe && probe.observed ? probe.observed : (saved && saved.last_known) || null;
  const invented = false;
  return {
    id: outlet.id,
    kind: outlet.kind,
    label: outlet.label,
    pull_url: outlet.pull_url || null,
    push_url: outlet.push_url || null,
    push_contract: outlet.push_contract || null,
    node_id: outlet.node_id || null,
    product: outlet.product || null,
    status: probe ? probe.status : "unexposed",
    last_applied: saved && saved.last_applied ? saved.last_applied : null,
    last_known: last_known
      ? {
          suite_version: last_known.suite_version ?? null,
          git_sha: last_known.git_sha ?? null,
          softwares_count: last_known.softwares_count ?? null,
          version_id: last_known.version_id ?? null,
          software_versions: last_known.software_versions || null,
        }
      : null,
    fields: probe && probe.fields ? probe.fields : [],
    would_change: probe && probe.fields ? probe.fields.filter((row) => row.would_change).map((row) => row.field) : [],
    http_status: probe && probe.http_status != null ? probe.http_status : null,
    invented,
    apply: writing || null,
    sister_note: outlet.sister_note || null,
  };
}

async function postHook(outlet, sot, fetchImpl) {
  const accepted = acceptOutletHook(outlet.push_url);
  if (!accepted.ok) return { ok: false, code: "SOT-HOOK-HOST" };
  const tip = tipFromSot(sot);
  try {
    const res = await fetchImpl(accepted.url, {
      method: "POST",
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0", "content-type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        spec: SOT_SPEC,
        outlet_id: outlet.id,
        author: SOT_AUTHOR,
        identity: "Aziel Eliab",
        live_body_sync: false,
        mesh_broadcast: false,
        pull: "/v1/software",
        tip,
        software_versions: sot.software_versions,
        version_id: null,
        version_id_note: SOT_VERSION_ID_NOTE,
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res || res.status < 200 || res.status >= 300) return { ok: false, status: res ? res.status : 0 };
    const json = await res.json().catch(() => ({}));
    if (json && json.ok === false) return { ok: false, status: res.status, code: json.code || "SOT-HOOK-REFUSED" };
    return { ok: true, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

function rememberKnown(saved, probe) {
  if (probe && probe.unreachable) return (saved && saved.last_known) || null;
  if (probe && probe.observed) {
    return {
      suite_version: probe.observed.suite_version,
      git_sha: probe.observed.git_sha,
      softwares_count: probe.observed.softwares_count,
      version_id: probe.observed.version_id,
      software_versions: probe.observed.software_versions,
      exposed: probe.observed.exposed,
    };
  }
  return (saved && saved.last_known) || null;
}

const GATE_PROPOSAL = Object.freeze({
  statement: "Apply the live software catalog tip to registered mesh outlets after the operator confirms.",
  evidence: ["GET /v1/software is the in-process catalog for suite version, git sha, and Softwares count."],
  impact_pos: ["One confirmed tip is recorded for every outlet the mesh can address."],
  impact_neg: ["An unreachable outlet stays on its last-known inventory."],
  values: ["Do not invent a software row."],
  accountable: "Aziel Eliab",
});

async function resolveSot(origin, env, fetchImpl, payload) {
  const local = localCatalog(origin, env);
  const liveBase = stringOrNull((payload && payload.live_base) || (env && env.SOT_LIVE_BASE));
  if (!liveBase) {
    const sot = projectSot(local, {
      source: "in-process-get-v1-software",
      endpoints_read: ["GET /v1/software"],
      note: "This Worker serves GET /v1/software. suite_version is that catalog version (the same RUNTIME_VERSION GET /v1/health publishes). version_id is absent on both. git_sha is the catalog git_sha.",
    });
    return { sot, local, blocked: false };
  }
  const accepted = acceptOutletHook(liveBase.endsWith("/") ? liveBase : `${liveBase}/`);
  const baseAccepted = acceptOutletHook(liveBase);
  if (!baseAccepted.ok && !accepted.ok) {
    return { sot: emptySot("refused", "SOT_LIVE_BASE is not an allowlisted https host."), local, blocked: true, code: "SOT-HOOK-HOST" };
  }
  const base = new URL(baseAccepted.ok ? baseAccepted.url : liveBase);
  base.pathname = "/";
  const root = base.toString().replace(/\/$/, "");
  try {
    const software = await fetchText(`${root}/v1/software`, fetchImpl);
    if (!software.ok) throw new Error("software");
    const parsed = JSON.parse(software.text);
    const health = await fetchText(`${root}/v1/health`, fetchImpl);
    let healthVersion = null;
    if (health.ok) {
      try {
        healthVersion = stringOrNull(JSON.parse(health.text).version);
      } catch {
        healthVersion = null;
      }
    }
    const sot = projectSot(parsed, {
      source: "live-pull",
      endpoints_read: health.ok ? ["GET /v1/software", "GET /v1/health"] : ["GET /v1/software"],
      note: healthVersion && healthVersion !== parsed.version
        ? `Catalog version is ${parsed.version}. GET /v1/health version is ${healthVersion}. The catalog version is the suite tip. version_id was not in the catalog body.`
        : "Live GET /v1/software is the tip. version_id is null unless that body exposed it, and this projection still cites null because the contract field is absent.",
    });
    if (parsed && Object.prototype.hasOwnProperty.call(parsed, "version_id") && parsed.version_id != null && String(parsed.version_id).trim()) {
      sot.version_id = null;
      sot.version_id_note = `${SOT_VERSION_ID_NOTE} The live body included version_id and it was not copied.`;
    }
    return { sot, local, blocked: false };
  } catch {
    if (ledger.last_sot) {
      return {
        sot: {
          ...ledger.last_sot,
          source: "last-known",
          ok: true,
          note: "Live GET /v1/software was unreachable. Last-known tip kept. No software row was invented.",
        },
        local,
        blocked: false,
        sot_unreachable: true,
      };
    }
    return {
      sot: emptySot("unreachable", "Live GET /v1/software was unreachable and no last-known tip is stored. Count and cards were not invented."),
      local,
      blocked: true,
      code: "SOT-UNREACHABLE",
    };
  }
}

function fetchOf(env, payload) {
  if (env && typeof env.sotFetch === "function") return env.sotFetch;
  if (payload && typeof payload.fetchImpl === "function") return payload.fetchImpl;
  return globalThis.fetch;
}

export async function runSotMeshOp(op, payload, env, ctx = {}) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const origin = stringOrNull(ctx.origin || src.origin) || "https://aziel-runtime.vibelock.workers.dev";
  const fetchImpl = fetchOf(env, src);
  const nodes = ctx.nodes || {};
  const resolved = await resolveSot(origin, env, fetchImpl, src);
  if (resolved.blocked) {
    return {
      ok: false,
      code: resolved.code || "SOT-UNREACHABLE",
      author: SOT_AUTHOR,
      identity: "Aziel Eliab",
      spec: SOT_SPEC,
      message: resolved.sot.note,
      sot: resolved.sot,
      http_status: 400,
      receipt: null,
      live_body_sync: false,
      mesh_broadcast: false,
      nodes_unchanged: true,
      live_nodes_unchanged: true,
    };
  }
  const sot = resolved.sot;
  const outlets = listOutletRecords(nodes);
  const probed = [];
  for (const outlet of outlets) {
    const saved = ledger.outlets[outlet.id] || null;
    const probe = await probeOutlet(outlet, sot, resolved.local, fetchImpl, saved);
    probed.push({ outlet, saved, probe });
  }

  if (op === "outlets" || op === "sot-status") {
    const rows = probed.map(({ outlet, saved, probe }) => publicOutlet(outlet, probe, saved, null));
    return {
      ok: true,
      code: "SOT-OK",
      author: SOT_AUTHOR,
      identity: "Aziel Eliab",
      spec: SOT_SPEC,
      op,
      sot,
      outlets: rows,
      outlet_count: rows.length,
      plane: SOT_PLANE_NOTE,
      live_body_sync: false,
      mesh_broadcast: false,
      nodes_unchanged: true,
      live_nodes_unchanged: true,
      download_counters_unchanged: true,
      tools_list_unchanged: true,
      http_status: 200,
    };
  }

  const dry = isTruthyFlag(src.dry_run);
  const confirm = isTruthyFlag(src.confirm);
  if (!dry && !confirm) {
    const rows = probed.map(({ outlet, saved, probe }) => publicOutlet(outlet, probe, saved, "not-run"));
    return {
      ok: false,
      code: "SOT-CONFIRM-REQUIRED",
      author: SOT_AUTHOR,
      identity: "Aziel Eliab",
      spec: SOT_SPEC,
      message: "Pass dry_run true to preview, or confirm true to apply. Nothing was written.",
      sot,
      outlets: rows,
      receipt: null,
      http_status: 400,
      live_body_sync: false,
      mesh_broadcast: false,
      nodes_unchanged: true,
      live_nodes_unchanged: true,
    };
  }

  if (dry) {
    const rows = probed.map(({ outlet, saved, probe }) => publicOutlet(outlet, probe, saved, "dry_run"));
    return {
      ok: true,
      code: "SOT-DRY-RUN",
      author: SOT_AUTHOR,
      identity: "Aziel Eliab",
      spec: SOT_SPEC,
      op: "sot-sync",
      dry_run: true,
      confirm: false,
      written: false,
      sot,
      outlets: rows,
      outlet_count: rows.length,
      receipt: null,
      plane: SOT_PLANE_NOTE,
      live_body_sync: false,
      mesh_broadcast: false,
      nodes_unchanged: true,
      live_nodes_unchanged: true,
      download_counters_unchanged: true,
      http_status: 200,
      note: "Dry run. last_applied was not updated. Unreachable outlets were not filled in.",
    };
  }

  const gate = decisiongateCheck(GATE_PROPOSAL);
  if (!gate || gate.final_state !== "PASS") {
    return {
      ok: false,
      code: "SOT-GATE-BLOCK",
      author: SOT_AUTHOR,
      identity: "Aziel Eliab",
      spec: SOT_SPEC,
      message: "DecisionGATE did not PASS. Nothing was written.",
      decisiongate: { final_state: gate && gate.final_state, blocked_at: gate && gate.blocked_at },
      receipt: null,
      http_status: 400,
      live_body_sync: false,
      nodes_unchanged: true,
      live_nodes_unchanged: true,
    };
  }

  const rows = [];
  let applied = 0;
  let unreachable = 0;
  for (const item of probed) {
    const { outlet, saved, probe } = item;
    let apply = "not-written";
    let nextApplied = saved && saved.last_applied ? saved.last_applied : null;
    let nextKnown = rememberKnown(saved, probe);
    let status = probe.status;
    if (probe.unreachable && !(outlet.kind === "mesh_hook" && outlet.push_url)) {
      unreachable += 1;
      apply = "unreachable";
      status = "unreachable";
    } else if (outlet.ledger) {
      nextApplied = tipFromSot(sot);
      nextKnown = { ...nextApplied, software_versions: sot.software_versions, version_id: null };
      apply = "written";
      status = "ok";
      applied += 1;
    } else if (outlet.push_url && probe.status !== "ok") {
      const pushed = await postHook(outlet, sot, fetchImpl);
      if (pushed.ok) {
        nextApplied = tipFromSot(sot);
        apply = "written";
        status = "ok";
        applied += 1;
      } else {
        apply = "unreachable";
        status = "unreachable";
        unreachable += 1;
      }
    } else if (probe.status === "ok") {
      nextApplied = tipFromSot(sot);
      apply = "written";
      applied += 1;
    } else if (!outlet.push_url) {
      apply = "awaiting_adapter";
    }
    ledger.outlets[outlet.id] = { last_applied: nextApplied, last_known: nextKnown };
    const row = publicOutlet(outlet, { ...probe, status, observed: probe.observed }, ledger.outlets[outlet.id], apply);
    row.last_applied = nextApplied;
    row.last_known = nextKnown
      ? {
          suite_version: nextKnown.suite_version ?? null,
          git_sha: nextKnown.git_sha ?? null,
          softwares_count: nextKnown.softwares_count ?? null,
          version_id: nextKnown.version_id ?? null,
          software_versions: nextKnown.software_versions || null,
        }
      : null;
    row.status = status;
    rows.push(row);
  }

  ledger.last_sot = tipFromSot(sot);
  const receipt = await mintActReceipt({
    previous_hash: ledger.tip_hash,
    request: `Apply SOT-SYNC-1.0 tip version ${sot.suite_version} sha ${sot.git_sha} count ${sot.softwares_count}.`,
    output: `Wrote ${applied} outlet records. ${unreachable} unreachable. DecisionGATE PASS. No software row invented.`,
    event: {
      surface: "mesh",
      path: "/v1/mesh/sot-sync",
      method: "POST",
      status: 200,
      tool: "sot-sync",
      runtime_version: RUNTIME_VERSION,
    },
  });
  ledger.tip_hash = receipt.hash;
  ledger.receipts.unshift(receipt);
  ledger.receipts = ledger.receipts.slice(0, RECEIPT_CAP);
  const appended = await appendActReceipt(env, receipt, fetchImpl);

  return {
    ok: true,
    code: "SOT-APPLIED",
    author: SOT_AUTHOR,
    identity: "Aziel Eliab",
    spec: SOT_SPEC,
    op: "sot-sync",
    dry_run: false,
    confirm: true,
    written: true,
    decisiongate: { final_state: "PASS", spec: "DG-0.1" },
    sot,
    outlets: rows,
    outlet_count: rows.length,
    applied_count: applied,
    unreachable_count: unreachable,
    receipt,
    act_receipt: "ACT-RECEIPT-1.0",
    published: appended.published === true,
    append_refuse: appended.refuse || null,
    plane: SOT_PLANE_NOTE,
    live_body_sync: false,
    mesh_broadcast: false,
    nodes_unchanged: true,
    live_nodes_unchanged: true,
    download_counters_unchanged: true,
    http_status: 200,
  };
}

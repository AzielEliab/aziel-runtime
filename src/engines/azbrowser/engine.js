/**
 * AZBrowser engine (AZB-1.0).
 * Lamb Lens ethical research browser.
 * Cite. Refuse harmful harvest. Never invent visit results.
 * Reached only via FragGate LIVE_OPS.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "azbrowser";
export const NAME = "AZBrowser";
export const VERSION = "0.1.0";
export const SPEC = "AZB-1.0";
export const LENS = "Lamb Lens";
export const AUTHOR = "Aziel Eliab";
export const ROLE = "Lamb Lens ethical research browser";
export const RING_CAP = 64;
export const TAB_CAP = 16;
export const TEXT_CAP = 2000;
export const FETCH_BYTE_CAP = 8192;
export const FETCH_MS = 2500;
export const KV_KEY = "azbrowser";
export const GENESIS_PREV = "0".repeat(64);

export const LIMITATION =
  "THIS IS: AZBrowser (AZB-1.0) — Lamb Lens ethical research browser: sandboxed advisory navigate (metadata only; no raw HTML), Lamb Lens ethical search (cite; refuse harmful harvest; never invent visit results), airlock ingest, in-memory/KV tabs, hash-chained receipts, plus an honest Browser Rendering status (sandbox_status / sandbox_render). Reached only through the aziel-runtime FragGate door (POST /v1/fraggate/call or MCP fraggate_call). AZNet is separate software (same FragGate door); pairing is order/token only, not a shared app. THIS IS NOT: Chromium unless Workers Browser Rendering is bound and a real page session ran; a Tor exit; phoenix wipe; an unrestricted proxy; a keylogger; clipboard harvest; surveillance. tor_exit / phoenix_wipe / chromium / proxy / harvest stay stub. Hosted never claims a visit it did not fetch, and never returns raw HTML. Worker https navigate stays advisory metadata. A .aziel or aziel:// name is a mesh name-read against a posted ledger or relay snapshot only: a miss or hash mismatch is FG-GATE-REFUSE, nothing is sent to DNS, and this Worker does not dial a LAN peer. Page bytes and the owner-key check stay on the local AZBrowser shell. .aziel is not claimed LIVE on this Worker. Author: Aziel Eliab only.";

const HARVEST =
  /\b(harvest|scrape (all )?(emails?|contacts?|phones?)|dump (passwords?|credentials?|cookies?)|steal (cookies?|sessions?|tokens?)|keylog(ger)?|clipboard (monitor|steal|harvest)|doxx|ssn|social security|credit card dump|mass scrape|email list|phone dump|credential (dump|harvest)|wiretap|stalk|track (this )?(person|user|phone)|surveillance kit|malware kit|exploit kit|0-?day)\b/i;
const SCRIPTISH = /<\s*script\b|javascript:|data:text\/html|vbscript:|on\w+\s*=/i;
const MALWARE_EXT = /\.(exe|scr|dll|bat|cmd|ps1|msi|apk|dmg)(\?|#|$)/i;

const memory = {
  receipts: [],
  tabs: [],
  seq: 0,
};

export function resetAzbrowserStore() {
  memory.receipts = [];
  memory.tabs = [];
  memory.seq = 0;
}

function nowMs() {
  return Date.now();
}

function nowIso(ms = nowMs()) {
  return new Date(ms).toISOString();
}

function clipText(raw, cap = TEXT_CAP) {
  return String(raw == null ? "" : raw).slice(0, cap);
}

export async function sha256Hex(data) {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canonicalReceipt(fields) {
  const payload = {
    cited: fields.cited === true,
    id: String(fields.id || ""),
    kind: String(fields.kind || ""),
    op: String(fields.op || ""),
    prev: String(fields.prev || GENESIS_PREV),
    query: String(fields.query || ""),
    refused: fields.refused === true,
    ts: String(fields.ts || ""),
    url: String(fields.url || ""),
    visited: fields.visited === true,
  };
  const keys = Object.keys(payload).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(payload[k])).join(",") + "}";
}

export const LAMB_LENS_CORPUS = Object.freeze([
  {
    title: "AZBrowser",
    url: "https://github.com/AzielEliab/azbrowser",
    snippet: "AZBrowser — Lamb Lens ethical research browser. Author Aziel Eliab.",
    topics: ["azbrowser", "browser", "research", "ethical", "search", "lamb", "lens"],
  },
  {
    title: "FragGate",
    url: "https://github.com/AzielEliab/fraggate",
    snippet: "FragGate FG-0.1 kernel: hashed registry, DecisionGATE before exec, ask/refuse ledger.",
    topics: ["fraggate", "door", "registry", "decisiongate", "kernel"],
  },
  {
    title: "Aziel Eliab Runtime",
    url: "https://aziel-runtime.vibelock.workers.dev/",
    snippet: "Aziel Eliab Runtime — FragGate door over the catalog. Discover, route, refuse.",
    topics: ["runtime", "aziel", "eliab", "catalog", "mcp", "openapi"],
  },
  {
    title: "W3C Ethical Web Principles",
    url: "https://www.w3.org/TR/ethical-web-principles/",
    snippet: "W3C TAG ethical web principles. Citation only — Lamb Lens does not invent a visit.",
    topics: ["ethics", "web", "w3c", "principles", "ethical"],
  },
  {
    title: "RFC 9110 HTTP Semantics",
    url: "https://www.rfc-editor.org/rfc/rfc9110.html",
    snippet: "HTTP semantics (RFC 9110). Cited reference, not a claimed page visit.",
    topics: ["http", "rfc", "9110", "web", "protocol"],
  },
  {
    title: "Aziel Digital Library",
    url: "https://www.azielcorpuslibrary.net/",
    snippet: "Aziel Digital Library — public MASTER. Not a private-file search engine.",
    topics: ["library", "corpus", "aziel", "digital"],
  },
]);

function tokensOf(text) {
  return (
    String(text || "")
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9._+-]*/g) || []
  );
}

export function harvestSignals(raw) {
  const text = clipText(raw);
  const signals = [];
  if (HARVEST.test(text)) signals.push("harvest_language");
  if (SCRIPTISH.test(text)) signals.push("script_payload");
  if (MALWARE_EXT.test(text)) signals.push("malware_extension");
  return { text, signals, harvest: signals.includes("harvest_language") || signals.includes("script_payload") };
}

export function matchLambLens(query) {
  const tokens = tokensOf(query);
  if (!tokens.length) return [];
  const scored = LAMB_LENS_CORPUS.map((row) => {
    const hay = `${row.title} ${row.snippet} ${(row.topics || []).join(" ")}`.toLowerCase();
    let hits = 0;
    const matched = [];
    for (const tok of tokens) {
      if (tok.length < 2) continue;
      if (hay.includes(tok) || (row.topics || []).includes(tok)) {
        hits += 1;
        matched.push(tok);
      }
    }
    return { ...row, score: hits, matched };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map((row) => ({
    title: row.title,
    url: row.url,
    snippet: row.snippet,
    cited: true,
    visited: false,
    matched: row.matched,
  }));
}

function tabsKv(env) {
  const kv = env && env.AZBROWSER_TABS;
  if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function") return null;
  return kv;
}

function snapshotFromMemory() {
  return {
    receipts: Array.isArray(memory.receipts) ? memory.receipts.slice() : [],
    tabs: Array.isArray(memory.tabs) ? memory.tabs.slice() : [],
    seq: Number(memory.seq) || 0,
  };
}

function applySnapshot(snap) {
  memory.receipts = Array.isArray(snap.receipts) ? snap.receipts.slice(0, RING_CAP) : [];
  memory.tabs = Array.isArray(snap.tabs) ? snap.tabs.slice(0, TAB_CAP) : [];
  memory.seq = Number(snap.seq) || 0;
}

async function loadState(env) {
  const kv = tabsKv(env);
  if (!kv) {
    return { ...snapshotFromMemory(), store: "isolate_memory" };
  }
  try {
    const raw = await kv.get(KV_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      applySnapshot(parsed);
      return { ...snapshotFromMemory(), store: "kv" };
    }
  } catch {
    /* empty kv */
  }
  applySnapshot({ receipts: [], tabs: [], seq: 0 });
  return { ...snapshotFromMemory(), store: "kv" };
}

async function saveState(env, state) {
  applySnapshot(state);
  const kv = tabsKv(env);
  const body = {
    receipts: memory.receipts,
    tabs: memory.tabs,
    seq: memory.seq,
  };
  if (kv) {
    await kv.put(KV_KEY, JSON.stringify(body));
    return "kv";
  }
  return "isolate_memory";
}

function storeHonesty(store) {
  if (store === "kv") return "Durable AZBROWSER_TABS KV (multi-isolate).";
  return "Isolate memory only — AZBROWSER_TABS KV is unbound. Multi-isolate tabs are not claimed.";
}

function baseResult(extra = {}) {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    lens: LENS,
    true_engine_runtime: true,
    kv_increment: false,
    door: "fraggate",
    door_only: true,
    author: AUTHOR,
    chromium: false,
    tor: false,
    raw_html: false,
    limitation: LIMITATION,
    ...extra,
  };
}

function refuse(code, message, extra = {}) {
  return baseResult({
    ok: false,
    refused: true,
    code,
    error: message,
    ...extra,
  });
}

async function mintReceipt(state, fields) {
  const prev = state.receipts[0] && state.receipts[0].hash ? state.receipts[0].hash : GENESIS_PREV;
  state.seq += 1;
  const ts = nowIso();
  const id = `azb_${state.seq.toString(36)}_${ts.slice(0, 19).replace(/[-:T]/g, "")}`;
  const draft = {
    id,
    op: fields.op || "",
    kind: fields.kind || fields.op || "event",
    ts,
    prev,
    query: fields.query || "",
    url: fields.url || "",
    cited: fields.cited === true,
    visited: fields.visited === true,
    refused: fields.refused === true,
  };
  const hash = await sha256Hex(canonicalReceipt(draft));
  const receipt = { ...draft, hash };
  state.receipts.unshift(receipt);
  if (state.receipts.length > RING_CAP) state.receipts.length = RING_CAP;
  return receipt;
}

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[::1\]|::1$|metadata\.google|169\.254\.169\.254)/i;

export function isPrivateOrMetadataHost(host) {
  const name = String(host || "").trim().toLowerCase();
  if (!name) return true;
  if (name.endsWith(".onion") || name.endsWith(".onion.")) return true;
  return PRIVATE_HOST.test(name);
}

export function browserRenderingStatus(env) {
  const bound = !!(env && env.BROWSER);
  return {
    chromium: false,
    browser_rendering_bound: bound,
    implemented: false,
    deferred: !bound,
    tor: false,
    phoenix: false,
    puppeteer_claimed: false,
    next_step: bound
      ? "sandbox_render may launch Workers Browser Rendering for an allowlisted https URL. Tor / phoenix stay refuse. Do not claim Chromium until a real page session returns."
      : "Bind Workers Browser Rendering (`browser.binding = BROWSER` in wrangler) on a paid plan, install @cloudflare/puppeteer, then deploy. Do not fake Chromium. Tor / phoenix stay refuse.",
  };
}

export function sandboxStatus(env) {
  const status = browserRenderingStatus(env);
  return baseResult({
    op: "sandbox_status",
    ok: true,
    ...status,
    note: status.deferred
      ? "Chromium is DEFERRED. Advisory navigate stays metadata-only. This is not a fake browser."
      : "Browser Rendering binding is present. sandbox_render still refuses private/onion/Tor targets.",
  });
}

export async function sandboxRender(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const meshAnswer = await answerMeshName("sandbox_render", src, env);
  if (meshAnswer) return meshAnswer;
  const status = browserRenderingStatus(env);
  const parsed = parseAdvisoryUrl(src.url);
  if (!parsed.ok) {
    return refuse(parsed.code || "AZB-BAD-URL", parsed.error || "Pass { url }.", {
      op: "sandbox_render",
      visited: false,
      ...status,
    });
  }
  if (isPrivateOrMetadataHost(parsed.host)) {
    return refuse("AZB-SSRF-REFUSE", "Private, loopback, metadata, and .onion hosts are refused. Not a proxy.", {
      op: "sandbox_render",
      host: parsed.host,
      visited: false,
      ...status,
    });
  }
  if (!env || !env.BROWSER) {
    return baseResult({
      op: "sandbox_render",
      ok: false,
      implemented: false,
      deferred: true,
      visited: false,
      chromium: false,
      url: parsed.url,
      host: parsed.host,
      ...status,
      note: "Workers Browser Rendering is unbound. Chromium stays NOT IMPLEMENTED. Advisory navigate remains metadata-only.",
    });
  }
  try {
    const mod = await import("@cloudflare/puppeteer");
    const puppeteer = mod.default || mod;
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.goto(parsed.url, { waitUntil: "domcontentloaded", timeout: 8000 });
    const title = String((await page.title()) || "").slice(0, 180);
    await browser.close();
    const state = await loadState(env);
    const receipt = await mintReceipt(state, { op: "sandbox_render", kind: "render", url: parsed.url, visited: true, cited: true });
    await saveState(env, state);
    return baseResult({
      op: "sandbox_render",
      ok: true,
      implemented: true,
      deferred: false,
      visited: true,
      chromium: false,
      engine: "workers-browser-rendering",
      url: parsed.url,
      host: parsed.host,
      title,
      receipt,
      browser_rendering_bound: true,
      note: "Workers Browser Rendering page session. Not claimed as Chromium product UI. Tor / phoenix stay refuse.",
    });
  } catch (err) {
    return baseResult({
      op: "sandbox_render",
      ok: false,
      implemented: false,
      deferred: true,
      visited: false,
      chromium: false,
      url: parsed.url,
      host: parsed.host,
      error: String(err && err.message ? err.message : err).slice(0, 180),
      ...status,
      note: "Browser Rendering launch failed. No visit is claimed. Do not fake Chromium.",
    });
  }
}

export function parseAdvisoryUrl(raw) {
  const text = clipText(raw, 2048).trim();
  if (!text) return { ok: false, code: "AZB-BAD-URL", error: "Pass { url }." };
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return { ok: false, code: "AZB-BAD-URL", error: "URL did not parse. No visit is claimed." };
  }
  const scheme = String(parsed.protocol || "").replace(/:$/, "").toLowerCase();
  if (scheme === "javascript" || scheme === "data" || scheme === "file" || scheme === "blob" || scheme === "about") {
    return {
      ok: false,
      code: "AZB-SCHEME-REFUSE",
      error: `${scheme}: is refused. No Chromium exec. No raw HTML.`,
      scheme,
      url: parsed.href,
    };
  }
  if (scheme !== "https" && scheme !== "http") {
    return {
      ok: false,
      code: "AZB-SCHEME-REFUSE",
      error: "Only http(s) advisory metadata is allowed. No visit is claimed.",
      scheme,
    };
  }
  if (MALWARE_EXT.test(parsed.pathname)) {
    return {
      ok: false,
      code: "AZB-MALWARE-REFUSE",
      error: "Executable / malware-shaped path is refused. No download.",
      host: parsed.hostname,
      path: parsed.pathname,
    };
  }
  return {
    ok: true,
    url: parsed.href,
    host: parsed.hostname,
    scheme,
    path: parsed.pathname,
  };
}

function extractTitle(buf) {
  const text = String(buf || "").replace(/\0/g, "");
  const m = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return "";
  return clipText(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(), 180);
}

export async function advisoryFetch(url, fetcher) {
  const run = typeof fetcher === "function" ? fetcher : typeof fetch === "function" ? fetch : null;
  if (!run) {
    return { fetched: false, visited: false, note: "No fetch binding. Metadata only. No visit claimed." };
  }
  try {
    const ac = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(FETCH_MS) : undefined;
    const res = await run(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.1" },
      signal: ac,
    });
    const status = Number(res.status) || 0;
    const content_type = String((res.headers && res.headers.get && res.headers.get("content-type")) || "").slice(0, 120);
    const raw = await res.arrayBuffer();
    const bytes = new Uint8Array(raw).subarray(0, FETCH_BYTE_CAP);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const title = extractTitle(decoded);
    bytes.fill(0);
    return {
      fetched: true,
      visited: true,
      status,
      content_type,
      title: title || "",
      bytes_seen: Math.min(Number(raw && raw.byteLength) || 0, FETCH_BYTE_CAP),
      raw_html: false,
      note: "Advisory metadata only. Raw HTML is discarded. Not Chromium.",
    };
  } catch (err) {
    return {
      fetched: false,
      visited: false,
      error: String(err && err.message ? err.message : err).slice(0, 180),
      note: "Fetch failed. No visit is claimed. Lamb Lens does not invent page content.",
    };
  }
}

export async function ethicalSearch(payload, env, op = "ethical_search") {
  const src = payload && typeof payload === "object" ? payload : {};
  const query = clipText(src.q != null ? src.q : src.query != null ? src.query : src.text);
  const state = await loadState(env);
  if (!query.trim()) {
    const receipt = await mintReceipt(state, { op, kind: "refuse", refused: true, query: "" });
    const store = await saveState(env, state);
    return refuse("AZB-BAD-INPUT", "Pass { q }. Lamb Lens cites; it does not invent visit results.", {
      op,
      receipt,
      receipt_required: true,
      store,
    });
  }
  const hit = harvestSignals(query);
  if (hit.harvest) {
    const receipt = await mintReceipt(state, { op, kind: "refuse", refused: true, query });
    const store = await saveState(env, state);
    return refuse("AZB-HARVEST-REFUSE", "Lamb Lens refuses harmful harvest. No scrape, no credential dump, no surveillance.", {
      op,
      query,
      signals: hit.signals,
      receipt,
      receipt_required: true,
      cited: false,
      visited: false,
      store,
      store_note: storeHonesty(store),
    });
  }
  const results = matchLambLens(query);
  const receipt = await mintReceipt(state, {
    op,
    kind: "search",
    query,
    cited: results.length > 0,
    visited: false,
    refused: false,
  });
  const store = await saveState(env, state);
  return baseResult({
    op,
    code: "AZB-OK",
    query,
    count: results.length,
    results,
    cited: true,
    visited: false,
    invented: false,
    receipt,
    receipt_required: true,
    store,
    store_note: storeHonesty(store),
    note:
      results.length > 0
        ? "Lamb Lens citations from a sealed index. visited=false. No invented page content."
        : "No cited hits. Lamb Lens does not invent visit results.",
  });
}

const MESH_LABEL = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const HEX64 = /^[0-9a-f]{64}$/;
const SECRET_FIELDS = new Set([
  "private_key",
  "privatekey",
  "secret_key",
  "secretkey",
  "signing_key",
  "signingkey",
  "seed",
  "seed_b64",
  "enc_seed",
  "enc_seed_b64",
  "priv",
  "privkey",
  "ed25519_secret",
  "sk",
  "secret",
]);

function labelOk(label) {
  return Boolean(label) && MESH_LABEL.test(label) && !String(label).includes("..");
}

function meshClass(name, handle, path, raw) {
  const safePath = path && String(path).startsWith("/") ? String(path) : `/${path || ""}`;
  return {
    mesh: true,
    ok: true,
    plane: "mesh",
    name,
    handle,
    path: safePath || "/",
    url: `aziel://${handle}${safePath === "/" ? "/" : safePath}`,
    display_url: name + (safePath === "/" ? "" : safePath),
    raw,
    dns: false,
    icann: false,
    ca: false,
  };
}

/** Classify a mesh name. Does not contact DNS or a LAN peer. */
export function classifyAzielDestination(raw) {
  const text = String(raw == null ? "" : raw).trim();
  if (!text || /\s/.test(text)) return { mesh: false };
  const lower = text.toLowerCase();
  if (/^(javascript|data|file|vbscript|blob|about):/.test(lower)) return { mesh: false };
  if (lower.startsWith("aziel:")) {
    let parsed;
    try {
      parsed = new URL(text);
    } catch {
      return { mesh: true, ok: false, reason: "bad_handle", url: text, name: "", handle: "" };
    }
    const handle = String(parsed.hostname || "").toLowerCase();
    if (!labelOk(handle)) return { mesh: true, ok: false, reason: "bad_handle", url: text, name: "", handle };
    return meshClass(`${handle}.aziel`, handle, parsed.pathname || "/", text);
  }
  let parsed;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    parsed = new URL(candidate);
  } catch {
    return { mesh: false };
  }
  const scheme = String(parsed.protocol || "").replace(/:$/, "").toLowerCase();
  if (scheme !== "https" && scheme !== "http") return { mesh: false };
  const host = String(parsed.hostname || "").toLowerCase().replace(/\.$/, "");
  if (!host.endsWith(".aziel")) return { mesh: false };
  const labels = host.split(".");
  if (labels.length < 2 || labels[labels.length - 1] !== "aziel") {
    return { mesh: true, ok: false, reason: "bad_handle", url: text, name: host, handle: "" };
  }
  const handle = labels[labels.length - 2];
  if (!labelOk(handle) || !labels.slice(0, -1).every((part) => labelOk(part))) {
    return { mesh: true, ok: false, reason: "bad_handle", url: text, name: host, handle };
  }
  return meshClass(host, handle, parsed.pathname || "/", text);
}

function hex64(value) {
  const text = String(value || "").trim().toLowerCase();
  return HEX64.test(text) ? text : "";
}

function localObjectHash(record) {
  const ref = record && typeof record === "object" ? record.ref : null;
  if (!ref || typeof ref !== "object" || Array.isArray(ref)) return "";
  return hex64(ref.object);
}

function relayTargetHash(row) {
  const target = row && typeof row === "object" ? row.target : null;
  if (!target || typeof target !== "object" || String(target.type || "") !== "hash") return "";
  return hex64(target.value);
}

function relayStatementHash(row) {
  if (!row || typeof row !== "object") return "";
  return hex64(row.statement_hash);
}

function ledgerHashConflict(record, row, expectHash) {
  const local = localObjectHash(record);
  const relay = relayTargetHash(row);
  const statement = relayStatementHash(row);
  const expect = hex64(expectHash);
  if (local && relay && local !== relay) return "hash_mismatch";
  if (!expect || expect === statement) return "";
  if (local && expect !== local) return "hash_mismatch";
  if (!local && relay && expect !== relay) return "hash_mismatch";
  if (!local && !relay && row) return "hash_mismatch";
  return "";
}

function containsSecret(value, depth = 0) {
  if (depth > 12 || value == null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsSecret(item, depth + 1));
  for (const [key, child] of Object.entries(value)) {
    const norm = String(key).toLowerCase().replace(/-/g, "_");
    if (SECRET_FIELDS.has(norm)) return true;
    if (containsSecret(child, depth + 1)) return true;
  }
  return false;
}

function asRecords(value) {
  if (Array.isArray(value)) return value.filter((row) => row && typeof row === "object" && !Array.isArray(row));
  if (value && typeof value === "object") {
    if (Array.isArray(value.records)) return asRecords(value.records);
    if (value.name) return [value];
  }
  return [];
}

function normalizeRelay(doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { found: false };
  if (doc.found === true && doc.row && typeof doc.row === "object") return doc;
  if (doc.found === false && (doc.unread || doc.isolated || doc.code)) return doc;
  const code = String(doc.code || "");
  if (code === "FED-MESH-ISOLATED") {
    return {
      found: false,
      isolated: true,
      code,
      reason: String(doc.reason || "unspecified"),
      evidence_hash: String(doc.evidence_hash || ""),
    };
  }
  let row = doc.record && typeof doc.record === "object" ? doc.record : null;
  if (!row && doc.name && (doc.statement_hash || doc.status || doc.owner)) row = doc;
  if (!row || !row.name) {
    if (code === "FED-MESH-NO-NAME" || doc.ok === false) return { found: false, code: code || "FED-MESH-NO-NAME" };
    return { found: false };
  }
  return { found: true, row, source: "fed-mesh-relay" };
}

function meshRaw(src) {
  if (!src || typeof src !== "object") return "";
  if (src.url != null) return src.url;
  if (src.href != null) return src.href;
  if (src.name != null) return src.name;
  if (src.q != null) return src.q;
  return "";
}

function snapshotOf(src) {
  const body = src && typeof src === "object" ? src : {};
  const ledger = body.ledger != null ? body.ledger : body.ledger_snapshot != null ? body.ledger_snapshot : body.records;
  const relay = body.relay != null ? body.relay : body.relay_snapshot != null ? body.relay_snapshot : body.relay_row;
  return {
    records: asRecords(ledger),
    relay: relay == null ? null : relay,
    relayPosted: body.relay != null || body.relay_snapshot != null || body.relay_row != null,
    expectHash: body.expect_hash != null ? body.expect_hash : body.expectHash,
  };
}

const MESH_NOTES = {
  bad_handle: "That string is not a .aziel mesh name. It was not sent to DNS.",
  name_not_in_ledger: "This .aziel name is not in the posted ledger or relay snapshot. It was not sent to DNS. This Worker does not dial a LAN peer.",
  hash_mismatch: "The posted ledger and relay snapshot disagree on the object hash. Refused. Not sent to DNS.",
  object_missing: "The relay snapshot names this .aziel record. Page bytes are not on this Worker. Not sent to DNS. Browse it in the local AZBrowser shell.",
  keys_must_stay_on_node: "A private key was in the posted snapshot. Keys stay on the node.",
  handle_isolated: "This handle is isolated on the posted relay snapshot. Not sent to DNS.",
  mesh_browse_local_shell: "Workers Browser Rendering does not render a .aziel name. navigate can name-read a posted snapshot. The local AZBrowser shell browses the page. This call did not dial a LAN peer and did not use DNS.",
};

function meshFields(extra = {}) {
  return {
    plane: "mesh",
    dns: false,
    icann: false,
    ca: false,
    dialed_lan: false,
    fetched: false,
    visited: false,
    navigable: false,
    html: null,
    raw_html: false,
    regular_browsers_resolve_aziel: false,
    keys_leave_node: false,
    worker_name_read: "posted-snapshot",
    mesh_browse: "local-azbrowser-shell",
    signature_checked: false,
    verified_owner: false,
    ...extra,
  };
}

/**
 * Name-read from a posted ledger and/or relay snapshot.
 * The Worker does not dial LAN and does not query DNS.
 */
export function resolveAzielNameRead(classified, src) {
  if (!classified || classified.mesh !== true) {
    return meshFields({ ok: false, reason: "bad_handle", error: MESH_NOTES.bad_handle });
  }
  if (classified.ok !== true) {
    const reason = classified.reason || "bad_handle";
    return meshFields({
      ok: false,
      reason,
      error: MESH_NOTES[reason] || MESH_NOTES.bad_handle,
      name: classified.name || null,
      url: classified.url || classified.raw || "",
    });
  }
  const snap = snapshotOf(src);
  if (snap.records.some((row) => containsSecret(row)) || (snap.relayPosted && containsSecret(snap.relay))) {
    return meshFields({
      ok: false,
      reason: "keys_must_stay_on_node",
      error: MESH_NOTES.keys_must_stay_on_node,
      name: classified.name,
    });
  }
  const record = snap.records.find((row) => String(row.name || "").trim().toLowerCase() === classified.name) || null;
  const relayDoc = snap.relayPosted ? normalizeRelay(snap.relay) : { found: false, unread: true };
  const relayRow = relayDoc.found === true && relayDoc.row && typeof relayDoc.row === "object" ? relayDoc.row : null;
  if (ledgerHashConflict(record, relayRow, snap.expectHash)) {
    return meshFields({
      ok: false,
      reason: "hash_mismatch",
      error: MESH_NOTES.hash_mismatch,
      name: classified.name,
      owner_handle: (record && record.handle) || classified.handle,
    });
  }
  if (!record && relayDoc.isolated === true) {
    return meshFields({
      ok: false,
      reason: "handle_isolated",
      error: MESH_NOTES.handle_isolated,
      name: classified.name,
      owner_handle: classified.handle,
    });
  }
  if (!record && relayRow) {
    const status = String(relayRow.status || "").toLowerCase();
    const released = relayRow.released === true || status === "released";
    const final = !released && (relayRow.final === true || status === "final");
    if (released) {
      return meshFields({
        ok: false,
        reason: "name_not_in_ledger",
        error: "The relay snapshot released this name. It was not sent to DNS.",
        name: relayRow.name || classified.name,
        name_resolved: false,
        relay_unread: false,
      });
    }
    if (!final) {
      return meshFields({
        ok: true,
        action: "name_pending",
        reason: "name_pending",
        error: "",
        name: relayRow.name || classified.name,
        name_status: "PENDING",
        owner_handle: String(relayRow.owner || classified.handle || ""),
        statement_hash: String(relayRow.statement_hash || ""),
        target: relayRow.target || null,
        ledger_source: "posted-relay-snapshot",
        note: "Pending name on the posted relay snapshot. Not a verified site. Not sent to DNS. This Worker did not dial a LAN peer.",
      });
    }
    return meshFields({
      ok: false,
      reason: "object_missing",
      error: MESH_NOTES.object_missing,
      name: relayRow.name || classified.name,
      name_status: "FINAL",
      owner_handle: String(relayRow.owner || classified.handle || ""),
      statement_hash: String(relayRow.statement_hash || ""),
      target: relayRow.target || null,
      ledger_source: "posted-relay-snapshot",
    });
  }
  if (!record) {
    return meshFields({
      ok: false,
      reason: "name_not_in_ledger",
      error: MESH_NOTES.name_not_in_ledger,
      name: classified.name,
      owner_handle: classified.handle,
      relay_unread: relayDoc.unread === true,
    });
  }
  const local = localObjectHash(record);
  const relay = relayTargetHash(relayRow);
  return meshFields({
    ok: true,
    action: "name_read",
    reason: "posted_snapshot",
    error: "",
    found: true,
    name: classified.name,
    owner_handle: String(record.handle || classified.handle || ""),
    target_hash: local,
    relay_statement_hash: relayStatementHash(relayRow),
    hash_agreement: Boolean(local && relay && local === relay),
    ledger_source: relayRow ? "posted-ledger+relay-snapshot" : "posted-ledger",
    note: "The posted snapshot matched this .aziel name. This Worker did not check the owner key, did not fetch page bytes, did not dial a LAN peer, and did not query DNS. Browse the name in the local AZBrowser shell.",
  });
}

async function answerMeshName(op, src, env) {
  const classified = classifyAzielDestination(meshRaw(src));
  if (!classified.mesh) return null;
  const state = await loadState(env);
  let decision;
  if (op === "sandbox_render") {
    decision = meshFields({
      ok: false,
      reason: "mesh_browse_local_shell",
      error: MESH_NOTES.mesh_browse_local_shell,
      name: classified.ok ? classified.name : classified.name || null,
      chromium: false,
      implemented: false,
    });
  } else {
    decision = resolveAzielNameRead(classified, src);
  }
  const refused = decision.ok !== true;
  const receipt = await mintReceipt(state, {
    op,
    kind: refused ? "refuse" : decision.action || "name_read",
    refused,
    url: classified.url || String(meshRaw(src) || ""),
    visited: false,
    cited: decision.ok === true,
  });
  if (op === "tab_open" && decision.ok === true) {
    state.tabs.unshift({
      id: `tab_${state.seq.toString(36)}`,
      url: classified.url,
      host: classified.name,
      title: classified.name,
      opened_at: receipt.ts,
      receipt_id: receipt.id,
      visited: false,
      mesh: true,
    });
    if (state.tabs.length > TAB_CAP) state.tabs.length = TAB_CAP;
  }
  const store = await saveState(env, state);
  const { ok, error, ...rest } = decision;
  const common = {
    op,
    receipt,
    receipt_required: true,
    store,
    store_note: storeHonesty(store),
    scheme: "aziel",
    host: classified.name || null,
    url: classified.url || null,
    ...rest,
    ok,
  };
  if (!ok) return refuse("FG-GATE-REFUSE", error || MESH_NOTES.name_not_in_ledger, common);
  return baseResult({ ...common, code: "AZB-OK" });
}

export async function navigate(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const meshAnswer = await answerMeshName("navigate", src, env);
  if (meshAnswer) return meshAnswer;
  const parsed = parseAdvisoryUrl(src.url != null ? src.url : src.href != null ? src.href : src.q);
  const state = await loadState(env);
  if (!parsed.ok) {
    const receipt = await mintReceipt(state, {
      op: "navigate",
      kind: "refuse",
      refused: true,
      url: parsed.url || String(src.url || ""),
    });
    const store = await saveState(env, state);
    return refuse(parsed.code, parsed.error, {
      op: "navigate",
      scheme: parsed.scheme || null,
      receipt,
      receipt_required: true,
      visited: false,
      raw_html: false,
      store,
    });
  }
  const meta = await advisoryFetch(parsed.url, src.fetcher);
  const receipt = await mintReceipt(state, {
    op: "navigate",
    kind: "navigate",
    url: parsed.url,
    visited: meta.visited === true,
    cited: true,
    refused: false,
  });
  const store = await saveState(env, state);
  return baseResult({
    op: "navigate",
    code: "AZB-OK",
    url: parsed.url,
    host: parsed.host,
    scheme: parsed.scheme,
    path: parsed.path,
    status: meta.status || null,
    content_type: meta.content_type || null,
    title: meta.title || "",
    bytes_seen: meta.bytes_seen || 0,
    fetched: meta.fetched === true,
    visited: meta.visited === true,
    raw_html: false,
    html: null,
    receipt,
    receipt_required: true,
    store,
    store_note: storeHonesty(store),
    note: meta.note || "Advisory metadata only. Raw HTML is not returned.",
  });
}

export async function airlockIngest(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const text = clipText(src.text != null ? src.text : src.url != null ? src.url : src.body != null ? src.body : src.q);
  const state = await loadState(env);
  const mesh = classifyAzielDestination(text.trim());
  if (mesh.mesh) {
    const receipt = await mintReceipt(state, {
      op: "airlock_ingest",
      kind: "airlock",
      query: text,
      url: mesh.url || "",
      refused: false,
      visited: false,
      cited: false,
    });
    const store = await saveState(env, state);
    return baseResult({
      op: "airlock_ingest",
      code: "AZB-OK",
      label: "mesh_name",
      signals: ["mesh_name"],
      advisory: true,
      visited: false,
      fetched: false,
      dialed_lan: false,
      dns: false,
      icann: false,
      raw_html: false,
      html: null,
      name: mesh.name || null,
      receipt,
      receipt_required: true,
      store,
      store_note: storeHonesty(store),
      note: "Posted text is a .aziel mesh name. Airlock did not resolve it, did not query DNS, and did not dial a LAN peer. navigate name-reads a posted ledger or relay snapshot. Page browse stays on the local AZBrowser shell.",
    });
  }
  if (!text.trim()) {
    const receipt = await mintReceipt(state, { op: "airlock_ingest", kind: "refuse", refused: true });
    const store = await saveState(env, state);
    return refuse("AZB-BAD-INPUT", "Pass { url } or { text }. Airlock does not store raw HTML.", {
      op: "airlock_ingest",
      receipt,
      receipt_required: true,
      store,
    });
  }
  const harvest = harvestSignals(text);
  let urlMeta = null;
  if (/^https?:\/\//i.test(text.trim()) || text.includes("://")) {
    urlMeta = parseAdvisoryUrl(text.trim());
  }
  let label = "clean";
  const signals = harvest.signals.slice();
  if (urlMeta && !urlMeta.ok) {
    signals.push("url_refuse");
    label = urlMeta.code === "AZB-MALWARE-REFUSE" ? "malware" : "suspicious";
  } else if (harvest.signals.includes("script_payload") || harvest.signals.includes("malware_extension")) {
    label = "malware";
  } else if (harvest.harvest) {
    label = "harvest";
  } else if (harvest.signals.length) {
    label = "suspicious";
  }
  const refused = label === "malware" || label === "harvest";
  const receipt = await mintReceipt(state, {
    op: "airlock_ingest",
    kind: refused ? "refuse" : "airlock",
    query: text,
    url: urlMeta && urlMeta.ok ? urlMeta.url : "",
    refused,
    visited: false,
    cited: false,
  });
  const store = await saveState(env, state);
  if (refused) {
    return refuse("AZB-AIRLOCK-REFUSE", "Airlock refused this ingest. No raw HTML stored. No visit claimed.", {
      op: "airlock_ingest",
      label,
      signals,
      receipt,
      receipt_required: true,
      visited: false,
      raw_html: false,
      store,
    });
  }
  return baseResult({
    op: "airlock_ingest",
    code: "AZB-OK",
    label,
    signals,
    advisory: true,
    visited: false,
    raw_html: false,
    receipt,
    receipt_required: true,
    store,
    store_note: storeHonesty(store),
    note: "APP Phase 1 airlock. Classifies ingest. Does not execute Chromium or store malware HTML.",
  });
}

export async function tabOpen(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const meshAnswer = await answerMeshName("tab_open", src, env);
  if (meshAnswer) return meshAnswer;
  const parsed = parseAdvisoryUrl(src.url != null ? src.url : src.href != null ? src.href : src.q);
  const state = await loadState(env);
  if (!parsed.ok) {
    const receipt = await mintReceipt(state, { op: "tab_open", kind: "refuse", refused: true, url: String(src.url || "") });
    const store = await saveState(env, state);
    return refuse(parsed.code, parsed.error, { op: "tab_open", receipt, receipt_required: true, store });
  }
  const harvest = harvestSignals(parsed.url);
  if (harvest.harvest) {
    const receipt = await mintReceipt(state, { op: "tab_open", kind: "refuse", refused: true, url: parsed.url });
    const store = await saveState(env, state);
    return refuse("AZB-HARVEST-REFUSE", "Tab open refused: harvest / malware-shaped target.", {
      op: "tab_open",
      receipt,
      receipt_required: true,
      store,
    });
  }
  const receipt = await mintReceipt(state, {
    op: "tab_open",
    kind: "tab",
    url: parsed.url,
    visited: false,
    cited: true,
  });
  const tab = {
    id: `tab_${state.seq.toString(36)}`,
    url: parsed.url,
    host: parsed.host,
    title: parsed.host,
    opened_at: receipt.ts,
    receipt_id: receipt.id,
    visited: false,
  };
  state.tabs.unshift(tab);
  if (state.tabs.length > TAB_CAP) state.tabs.length = TAB_CAP;
  const store = await saveState(env, state);
  return baseResult({
    op: "tab_open",
    code: "AZB-OK",
    tab,
    count: state.tabs.length,
    receipt,
    receipt_required: true,
    store,
    store_note: storeHonesty(store),
    note: "Tab recorded in-session. Title is host metadata, not a claimed page visit.",
  });
}

export async function tabList(payload, env) {
  const state = await loadState(env);
  return baseResult({
    op: "tab_list",
    code: "AZB-OK",
    count: state.tabs.length,
    tabs: state.tabs.map((t) => ({
      id: t.id,
      url: t.url,
      host: t.host,
      title: t.title,
      opened_at: t.opened_at,
      receipt_id: t.receipt_id,
      visited: false,
    })),
    store: state.store,
    store_note: storeHonesty(state.store),
    note: "Session tabs. visited=false unless a later navigate receipt says otherwise.",
  });
}

export async function receiptList(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const state = await loadState(env);
  const limit = Math.min(64, Math.max(1, Number(src.limit) || 16));
  const receipts = state.receipts.slice(0, limit);
  return baseResult({
    op: "receipt_list",
    code: "AZB-OK",
    count: receipts.length,
    receipts,
    store: state.store,
    store_note: storeHonesty(state.store),
    note: "Hash-chained AZBrowser receipts. Anyone can verify.",
  });
}

export async function receiptVerify(payload, env, op = "verify") {
  const src = payload && typeof payload === "object" ? payload : {};
  const state = await loadState(env);
  const want = String(src.id || src.receipt_id || src.hash || "").trim();
  const row = want
    ? state.receipts.find((r) => r.id === want || r.hash === want)
    : state.receipts[0];
  if (!row) {
    return refuse("AZB-NO-RECEIPT", "No matching receipt. Pass { id } or { hash }.", { op });
  }
  const expected = await sha256Hex(canonicalReceipt(row));
  const ok = expected === row.hash;
  return baseResult({
    op,
    code: ok ? "AZB-OK" : "AZB-RECEIPT-MISMATCH",
    ok,
    receipt: row,
    expected_hash: expected,
    verified: ok,
    note: ok ? "Receipt hash matches the canonical fields." : "Receipt hash does not match.",
  });
}

export async function azbrowserVpn(payload, env) {
  const { ensureDefaultVpnSession, vpnAutoCite } = await import("../../azvpn-auto.js");
  const auto = await ensureDefaultVpnSession(payload, env);
  if (!auto || auto.ok === false) {
    return {
      ok: false,
      refused: true,
      op: "vpn",
      product: PRODUCT,
      name: NAME,
      code: (auto && auto.code) || "AZVPN-AUTO-FAIL",
      error: (auto && auto.error) || "AZVPN auto-bind could not start.",
      connected: false,
      fake_connected: false,
      backend: "azvpn",
      auto: true,
      vpn_auto: auto && auto.vpn_auto ? auto.vpn_auto : vpnAutoCite({ open: true }),
      note: "AZBrowser is not a VPN product. Public VPN auto-binds AZVPN. Auto could not start — no fake connected.",
    };
  }
  return {
    ok: true,
    op: "vpn",
    product: PRODUCT,
    name: NAME,
    backend: "azvpn",
    auto: true,
    connected: true,
    fake_connected: false,
    kind: "https_ws",
    tunnel_id: auto.tunnel_id,
    session: auto.session || null,
    vpn_auto: auto.vpn_auto || vpnAutoCite({ open: true }),
    public_vpn: true,
    default_vpn_backend: "azvpn",
    auto_use: true,
    note: "AZBrowser is not a VPN product. Public VPN auto-binds AZVPN (HTTPS/WS REAL; WireGuard/OpenVPN SLOT).",
  };
}

export function azbrowserHealth(env) {
  return baseResult({
    ok: true,
    mesh: false,
    dials_lan: false,
    aziel_dns: false,
    aziel_on_worker: "name-read-from-posted-snapshot",
    chromium: false,
    tor: false,
    receipt_count: memory.receipts.length,
    tab_count: memory.tabs.length,
    browser_rendering: browserRenderingStatus(env),
  });
}

export function azbrowserSkill() {
  return {
    markdown: `# AZBrowser (in-process)

AZBrowser (AZB-1.0) is the Lamb Lens ethical research browser. AZNet is separate software (same FragGate door) — pairing is order/token only, not a shared Phase-1 UI.

**Reached only via FragGate** on aziel-runtime (and host \`/runtime\` proxies of that door):

- MCP: \`fraggate_call\` with \`{ slug: "azbrowser", op: "..." }\`
- HTTP: \`POST /v1/fraggate/call\` with the same CallEnvelope
- Worker UI buttons on this runtime call that same door — one backend, two surfaces
- Leftover flat names such as \`azbrowser_ethical_search\` still go through FragGate (\`parseTarget\`) — they are not a side door and are not listed on \`tools/list\`

Live ops: \`ethical_search\`, \`lamb_lens_search\`, \`navigate\`, \`airlock_ingest\`, \`tab_open\`, \`tab_list\`, \`receipt_list\`, \`verify\`, \`receipt_verify\`, \`sandbox_status\`, \`sandbox_render\`, \`health\`, \`skill\`, \`vpn\` (auto-binds AZVPN).

Lamb Lens **cites**. It **refuses harmful harvest**. It **does not invent visit results**. \`navigate\` returns advisory metadata for ordinary https hosts — never raw HTML.

A \`.aziel\` or \`aziel://\` name is not an https visit and is not ICANN DNS. \`navigate\` name-reads a posted \`ledger\` / \`relay\` snapshot. A miss or a hash mismatch returns \`FG-GATE-REFUSE\` (\`name_not_in_ledger\` or \`hash_mismatch\`). This Worker does not dial a LAN peer. The owner-key check and the page bytes stay on the local AZBrowser shell. \`.aziel\` is not LIVE on this Worker.

\`sandbox_status\` / \`sandbox_render\` report Workers Browser Rendering honestly. Chromium stays DEFERRED unless a real binding launches. Private / onion / Tor targets refuse.

tor_exit / phoenix_wipe / chromium / unrestricted proxy / surveillance stay **stub**.

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
    door: "fraggate",
    door_only: true,
    lens: LENS,
  };
}

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
  "THIS IS: AZBrowser (AZB-1.0) — Lamb Lens ethical research browser: sandboxed advisory navigate (metadata only; no raw HTML), Lamb Lens ethical search (cite; refuse harmful harvest; never invent visit results), airlock ingest, in-memory/KV tabs, hash-chained receipts. Reached only through the aziel-runtime FragGate door (POST /v1/fraggate/call or MCP fraggate_call). AZNet is a separate product/engine; pairing is order/token only, not a shared app. THIS IS NOT: Chromium; a real browser exec; Tor exit control; phoenix wipe; an unrestricted proxy; a keylogger; clipboard harvest; surveillance. tor_exit / phoenix_wipe / chromium / proxy / harvest stay stub. Hosted never claims a visit it did not fetch, and never returns raw HTML. Author: Aziel Eliab only.";

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

export async function navigate(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
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

export function azbrowserHealth() {
  return baseResult({
    ok: true,
    mesh: false,
    chromium: false,
    tor: false,
    receipt_count: memory.receipts.length,
    tab_count: memory.tabs.length,
  });
}

export function azbrowserSkill() {
  return {
    markdown: `# AZBrowser (in-process)

AZBrowser (AZB-1.0) is the Lamb Lens ethical research browser. AZNet is a separate product/engine — pairing is order/token only, not a shared Phase-1 UI.

**Reached only via FragGate** on aziel-runtime (and host \`/runtime\` proxies of that door):

- MCP: \`fraggate_call\` with \`{ slug: "azbrowser", op: "..." }\`
- HTTP: \`POST /v1/fraggate/call\` with the same CallEnvelope
- Worker UI buttons on this runtime call that same door — one backend, two surfaces
- Leftover flat names such as \`azbrowser_ethical_search\` still go through FragGate (\`parseTarget\`) — they are not a side door and are not listed on \`tools/list\`

Live ops: \`ethical_search\`, \`lamb_lens_search\`, \`navigate\`, \`airlock_ingest\`, \`tab_open\`, \`tab_list\`, \`receipt_list\`, \`verify\`, \`receipt_verify\`, \`health\`, \`skill\`.

Lamb Lens **cites**. It **refuses harmful harvest**. It **does not invent visit results**. \`navigate\` returns advisory metadata only — never raw HTML.

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

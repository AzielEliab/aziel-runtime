/**
 * AZMail engine (APP 1.0).
 * Anonymous MCP mesh mailer + advisory anti-phishing airlock.
 * Mailbox path: scan, airgap, seal to the user key. See guard.js.
 * Independent of AZ-OS / Lumen. Not a full internet MTA.
 * Mesh default OFF. Reached only via FragGate LIVE_OPS.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import {
  AIRGAP_BOUNDARY,
  AZMAIL_HONESTY,
  buildExternalMime,
  deliverExternal,
  domainOf,
  externalNote,
  headerSafe,
  inspectBeforeAirgap,
  isEmailAddress,
  normalizePublicJwk,
  openMailboxObject,
  probeScannerSync,
  sealMailboxObject,
} from "./guard.js";

export const PRODUCT = "azmail";
export const NAME = "AZMail";
export const VERSION = "0.1.0";
export const SPEC = "APP-1.0";
export const AUTHOR = "Aziel Eliab";
export const ROLE = "anonymous MCP mesh mailer + advisory airlock";
export const MESH_DEFAULT = "off";
export const MESH_DEFAULT_ENABLED = false;
export const RING_CAP = 64;
export const ALERT_CAP = 16;
export const KEYWORD_CAP = 32;
export const TEXT_CAP = 2000;
export const ENABLE_COOLDOWN_MS = 60_000;
export const KV_KEY = "ring";

export const LIMITATION =
  "THIS IS: AZMail APP 1.0 — advisory anti-phishing airlock (classify / scrub / trust_score), a local isolate mailbox (notice_post / mail_post / inbox_pull) encrypted to the user key, plus an anonymous in-process MCP mesh ring (default OFF). Scan is LIVE-when-scanner-present (ClamAV). Absent scanner refuses AZM-SCAN-ABSENT and does not invent a clean verdict. Airgap is present: body, links, videos, docs, images, zips, and other files are parsed and scanned on the dirty side; only a scanned sealed object enters the mailbox; attachments are never executed. AZMail-to-AZMail is sealed end-to-end to the user key. Mail to @gmail, @live, @yahoo, and other SMTP domains is a normal MIME message over opportunistic TLS and is not end-to-end. Independent of AZ-OS / Lumen / interface / AZChat. Reached only through the aziel-runtime FragGate door (POST /v1/fraggate/call or MCP fraggate_call). THIS IS NOT: a full internet MTA; a public SMTP door; a Proton clone claim; Field 1.0; identity; deanonymization; credential harvest; a VPN; WhistleLock; AZChat. Public smtp / send / smtp_send / deliver / identify / deanonymize / harvest stay stub. No public MTA. field_1_0 false. proton_clone_live false. Author: Aziel Eliab only.";

export const IDENTITY_KEYS = Object.freeze([
  "from",
  "from_name",
  "to",
  "cc",
  "bcc",
  "reply_to",
  "email",
  "user",
  "username",
  "author",
  "name",
  "display_name",
  "real_name",
  "handle",
  "identity",
  "ip",
  "addr",
  "address",
  "phone",
  "user_agent",
  "ua",
  "session_id",
  "session",
  "cookie",
  "authorization",
  "password",
  "passwd",
  "token",
  "secret",
  "credential",
  "credentials",
]);

const PHISH_URGENCY = /\b(urgent|immediately|act now|within \d+ hours|account (will be )?(locked|suspended|closed)|verify (your )?account|confirm (your )?(identity|password)|unusual (sign-?in|activity))\b/i;
const PHISH_HARVEST = /\b(password|passwd|one[- ]?time (code|password)|otp|ssn|social security|credit card|card number|routing number|seed phrase|recovery phrase|private key|wallet seed)\b/i;
const PHISH_LINK = /\b(click (here|the link)|login at|reset (your )?password here|verify at|http:\/\/|bit\.ly|tinyurl)\b/i;
const LOOKALIKE = /\b(paypa1|app1eid|micros0ft|g00gle|faceb00k|amaz0n|wellsfargo-|chase-secure|irs-refund|coinbase-help)\b/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;
const SECRET_RE = /\b(?:sk|pk|api|token|bearer|secret|passwd|password)[-_:= ]+[A-Za-z0-9./+=_-]{8,}\b/gi;
const PAN_RE = /\b(?:\d[ -]*?){13,19}\b/g;

const NOTICE_CLASSES = new Set(["error", "update", "health", "receipt"]);
const MAILBOX_CAP = 64;

const memory = {
  enabled: MESH_DEFAULT_ENABLED,
  last_enable_ms: 0,
  posts: [],
  alerts: [],
  seq: 0,
  boxes: {},
};

export function resetAzmailStore() {
  memory.enabled = MESH_DEFAULT_ENABLED;
  memory.last_enable_ms = 0;
  memory.posts = [];
  memory.alerts = [];
  memory.seq = 0;
  memory.boxes = {};
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

export function hasIdentityField(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  for (const key of IDENTITY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) return true;
  }
  return false;
}

export function stripIdentity(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const k = String(key).toLowerCase();
    if (IDENTITY_KEYS.includes(k)) continue;
    out[key] = value;
  }
  return out;
}

function collectIdentityKeys(obj) {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj).filter((k) => IDENTITY_KEYS.includes(String(k).toLowerCase()));
}

export function scrubText(raw) {
  let text = clipText(raw);
  const redactions = [];
  const bump = (kind) => {
    redactions.push(kind);
  };
  text = text.replace(EMAIL_RE, () => {
    bump("email");
    return "[REDACTED_EMAIL]";
  });
  text = text.replace(SECRET_RE, () => {
    bump("secret");
    return "[REDACTED_SECRET]";
  });
  text = text.replace(PAN_RE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length < 13) return m;
    bump("pan");
    return "[REDACTED_PAN]";
  });
  text = text.replace(PHONE_RE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length < 10) return m;
    bump("phone");
    return "[REDACTED_PHONE]";
  });
  return { text, redactions, redacted: redactions.length > 0 };
}

export function classifyText(raw) {
  const text = clipText(raw);
  const signals = [];
  if (PHISH_HARVEST.test(text)) signals.push("credential_language");
  if (PHISH_URGENCY.test(text)) signals.push("urgency");
  if (PHISH_LINK.test(text)) signals.push("link_pressure");
  if (LOOKALIKE.test(text)) signals.push("lookalike_domain");
  if (EMAIL_RE.test(text) && (PHISH_HARVEST.test(text) || PHISH_LINK.test(text))) signals.push("channel_spoof");
  let label = "clean";
  if (signals.includes("credential_language") && (signals.includes("urgency") || signals.includes("link_pressure") || signals.includes("lookalike_domain"))) {
    label = "phishing";
  } else if (signals.includes("credential_language")) {
    label = "credential_harvest";
  } else if (signals.length) {
    label = "suspicious";
  }
  return {
    label,
    signals,
    advisory: true,
    spec: SPEC,
  };
}

export function scoreTrust(raw, classified) {
  const hit = classified || classifyText(raw);
  let score = 0.72;
  if (hit.label === "phishing") score = 0.18;
  else if (hit.label === "credential_harvest") score = 0.28;
  else if (hit.label === "suspicious") score = 0.42;
  if (hit.signals.includes("lookalike_domain")) score = Math.min(score, 0.22);
  if (score > 0.75) score = 0.75;
  return {
    trust_score: Number(score.toFixed(2)),
    cap: 0.75,
    label: hit.label,
    signals: hit.signals,
    advisory: true,
    note: "Advisory only. Not a mail-filter appliance and not a verdict.",
  };
}

function normalizeKeywords(raw) {
  const src = Array.isArray(raw) ? raw : String(raw || "").split(/[,|\n]/);
  const out = [];
  const seen = new Set();
  for (const item of src) {
    const word = String(item || "")
      .trim()
      .toLowerCase()
      .slice(0, 48);
    if (word.length < 2) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    out.push(word);
    if (out.length >= KEYWORD_CAP) break;
  }
  return out;
}

export function matchKeywords(text, keywords) {
  const hay = ` ${String(text || "").toLowerCase()} `;
  const hits = [];
  for (const word of keywords || []) {
    const needle = String(word || "").toLowerCase();
    if (!needle) continue;
    const re = new RegExp(`(^|[^a-z0-9])${escapeRe(needle)}([^a-z0-9]|$)`, "i");
    if (re.test(hay)) hits.push(needle);
  }
  return hits;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function meshKv(env) {
  const kv = env && env.AZMAIL_MESH;
  if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function") return null;
  return kv;
}

function snapshotFromMemory() {
  return {
    enabled: memory.enabled === true,
    last_enable_ms: Number(memory.last_enable_ms) || 0,
    posts: Array.isArray(memory.posts) ? memory.posts.slice() : [],
    alerts: Array.isArray(memory.alerts) ? memory.alerts.slice() : [],
    seq: Number(memory.seq) || 0,
  };
}

function applySnapshot(snap) {
  memory.enabled = snap.enabled === true;
  memory.last_enable_ms = Number(snap.last_enable_ms) || 0;
  memory.posts = Array.isArray(snap.posts) ? snap.posts.slice(0, RING_CAP) : [];
  memory.alerts = Array.isArray(snap.alerts) ? snap.alerts.slice(0, ALERT_CAP) : [];
  memory.seq = Number(snap.seq) || 0;
}

async function loadState(env) {
  const kv = meshKv(env);
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
    /* fall through to empty kv ring */
  }
  applySnapshot({
    enabled: MESH_DEFAULT_ENABLED,
    last_enable_ms: 0,
    posts: [],
    alerts: [],
    seq: 0,
  });
  return { ...snapshotFromMemory(), store: "kv" };
}

async function saveState(env, state) {
  applySnapshot(state);
  const kv = meshKv(env);
  const body = {
    enabled: memory.enabled,
    last_enable_ms: memory.last_enable_ms,
    posts: memory.posts,
    alerts: memory.alerts,
    seq: memory.seq,
  };
  if (kv) {
    await kv.put(KV_KEY, JSON.stringify(body));
    return "kv";
  }
  return "isolate_memory";
}

function storeHonesty(store) {
  if (store === "kv") {
    return "Durable AZMAIL_MESH KV ring (multi-isolate).";
  }
  return "Isolate memory only — AZMAIL_MESH KV is unbound. Multi-isolate mesh is not claimed.";
}

function baseResult(extra = {}) {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    true_engine_runtime: true,
    kv_increment: false,
    mesh_default: MESH_DEFAULT,
    door: "fraggate",
    door_only: true,
    author: AUTHOR,
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

export function airlockClassify(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const text = clipText(src.text != null ? src.text : src.body != null ? src.body : src.message);
  const hit = classifyText(text);
  return baseResult({
    op: "airlock_classify",
    code: "AZM-OK",
    text_len: text.length,
    classification: hit.label,
    signals: hit.signals,
    advisory: true,
    mta: false,
    note: "APP 1.0 advisory classify. Not a full internet MTA.",
  });
}

export function airlockScrub(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const raw = clipText(src.text != null ? src.text : src.body != null ? src.body : src.message);
  const cleaned = scrubText(raw);
  return baseResult({
    op: "scrub",
    code: "AZM-OK",
    text: cleaned.text,
    redactions: cleaned.redactions,
    redacted: cleaned.redacted,
    advisory: true,
    mta: false,
    note: "APP 1.0 advisory scrub. Credentials and addresses are redacted in-process. Nothing is mailed.",
  });
}

export function airlockTrustScore(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const text = clipText(src.text != null ? src.text : src.body != null ? src.body : src.message);
  const classified = classifyText(text);
  const scored = scoreTrust(text, classified);
  return baseResult({
    op: "trust_score",
    code: "AZM-OK",
    ...scored,
    mta: false,
  });
}

function anonymousRecord({ text, channel, alerts_hit, ts, id }) {
  return {
    id,
    text,
    ts,
    channel,
    alerts_hit,
  };
}

export async function meshPost(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const dropped = collectIdentityKeys(src);
  const state = await loadState(env);
  if (!state.enabled) {
    return refuse("AZM-MESH-OFF", "Mesh is off. mesh_post is refused. Call mesh_enable or leave the chaos switch off.", {
      op: "mesh_post",
      mesh_enabled: false,
      mesh_default: MESH_DEFAULT,
      store: state.store,
      store_note: storeHonesty(state.store),
      dropped_identity_fields: dropped,
    });
  }
  const raw = clipText(src.text != null ? src.text : src.body != null ? src.body : src.message);
  if (!raw.trim()) {
    return refuse("AZM-BAD-INPUT", "Pass { text }. Identity fields are dropped. Nothing is mailed.", {
      op: "mesh_post",
      mesh_enabled: true,
    });
  }
  const cleaned = scrubText(raw);
  const classified = classifyText(cleaned.text);
  const keywords = state.alerts.flatMap((a) => a.keywords || []);
  const alerts_hit = matchKeywords(cleaned.text, keywords);
  const ts = nowIso();
  state.seq += 1;
  const id = `azm_${state.seq.toString(36)}_${ts.slice(0, 19).replace(/[-:T]/g, "")}`;
  const channel = String(src.channel || "anon")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24) || "anon";
  const record = anonymousRecord({
    id,
    text: cleaned.text,
    channel,
    alerts_hit,
    ts,
  });
  state.posts.unshift(record);
  if (state.posts.length > RING_CAP) state.posts.length = RING_CAP;
  const store = await saveState(env, state);
  return baseResult({
    op: "mesh_post",
    code: "AZM-OK",
    mesh_enabled: true,
    store,
    store_note: storeHonesty(store),
    record,
    classification: classified.label,
    dropped_identity_fields: dropped,
    identity_stored: false,
    mta: false,
    smtp: false,
    note: "Anonymous mesh post. No identity fields stored. Not SMTP.",
  });
}

export async function meshPoll(payload, env, op = "mesh_poll") {
  const src = payload && typeof payload === "object" ? payload : {};
  const state = await loadState(env);
  const limit = Math.min(32, Math.max(1, Number(src.limit) || 16));
  const records = state.posts.slice(0, limit).map((row) => anonymousRecord(row));
  return baseResult({
    op,
    code: "AZM-OK",
    mesh_enabled: state.enabled === true,
    mesh_default: MESH_DEFAULT,
    store: state.store,
    store_note: storeHonesty(state.store),
    count: records.length,
    records,
    identity_stored: false,
    mta: false,
    note: state.enabled
      ? "Anonymous mesh ring. No identity fields."
      : "Mesh is off. Ring is readable; mesh_post stays refused until mesh_enable.",
  });
}

export async function meshEnable(payload, env) {
  const state = await loadState(env);
  const now = nowMs();
  if (state.last_enable_ms && now - state.last_enable_ms < ENABLE_COOLDOWN_MS) {
    const retry_ms = ENABLE_COOLDOWN_MS - (now - state.last_enable_ms);
    return refuse("AZM-ENABLE-RATE", "mesh_enable is rate-limited to avoid chaos. mesh_disable is always allowed.", {
      op: "mesh_enable",
      mesh_enabled: false,
      retry_ms,
      store: state.store,
    });
  }
  state.enabled = true;
  state.last_enable_ms = now;
  const store = await saveState(env, state);
  return baseResult({
    op: "mesh_enable",
    code: "AZM-OK",
    mesh_enabled: true,
    mesh_default: MESH_DEFAULT,
    store,
    store_note: storeHonesty(store),
    note: "Anonymous mesh is on. Posts still drop identity fields. SMTP stays stub.",
  });
}

export async function meshDisable(payload, env) {
  const state = await loadState(env);
  state.enabled = false;
  const store = await saveState(env, state);
  return baseResult({
    op: "mesh_disable",
    code: "AZM-OK",
    mesh_enabled: false,
    mesh_default: MESH_DEFAULT,
    store,
    store_note: storeHonesty(store),
    note: "Chaos switch: mesh is off. mesh_post is refused. Disable is always allowed.",
  });
}

export async function keywordAlertSet(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const dropped = collectIdentityKeys(src);
  const keywords = normalizeKeywords(src.keywords != null ? src.keywords : src.keyword != null ? src.keyword : src.q);
  if (!keywords.length) {
    return refuse("AZM-BAD-INPUT", "Pass { keywords: [\"term\", ...] }. No identity destination.", {
      op: "keyword_alert_set",
      dropped_identity_fields: dropped,
    });
  }
  const state = await loadState(env);
  const id = String(src.id || `alert_${state.alerts.length + 1}`).replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || `alert_${state.alerts.length + 1}`;
  const row = { id, keywords, ts: nowIso() };
  const next = state.alerts.filter((a) => a.id !== id);
  next.unshift(row);
  if (next.length > ALERT_CAP) next.length = ALERT_CAP;
  state.alerts = next;
  const store = await saveState(env, state);
  return baseResult({
    op: "keyword_alert_set",
    code: "AZM-OK",
    alert: row,
    count: state.alerts.length,
    store,
    dropped_identity_fields: dropped,
    destination: null,
    note: "Fine-tuned keyword alert. No email / identity destination is stored.",
  });
}

export async function keywordAlertList(payload, env) {
  const state = await loadState(env);
  return baseResult({
    op: "keyword_alert_list",
    code: "AZM-OK",
    count: state.alerts.length,
    alerts: state.alerts.map((a) => ({ id: a.id, keywords: a.keywords.slice(), ts: a.ts })),
    store: state.store,
    destination: null,
    note: "Keyword alerts only. No PII destinations.",
  });
}

export async function keywordAlertCheck(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const text = clipText(src.text != null ? src.text : src.body != null ? src.body : src.message);
  const state = await loadState(env);
  const extra = normalizeKeywords(src.keywords);
  const keywords = extra.length ? extra : state.alerts.flatMap((a) => a.keywords || []);
  const hits = matchKeywords(text, keywords);
  return baseResult({
    op: "keyword_alert_check",
    code: "AZM-OK",
    hits,
    hit: hits.length > 0,
    keywords_checked: keywords.length,
    note: "Fine-tuned word-boundary match. Advisory only.",
  });
}

function callerId(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const raw = src.caller || src.mailbox_id || src.mailbox || src.id || "";
  const id = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 48);
  return id || "worker";
}

function boxOf(id) {
  if (!memory.boxes[id]) memory.boxes[id] = { id, items: [], opened: nowIso() };
  return memory.boxes[id];
}

async function mailboxReceipt(fields) {
  const { sha256Hex } = await import("../../session-core.js");
  const hash = await sha256Hex(JSON.stringify(fields));
  return { ...fields, receipt_sha256: hash, author: AUTHOR };
}

function findBoxByAddress(addr) {
  const want = String(addr || "").trim().toLowerCase();
  if (!want) return null;
  for (const box of Object.values(memory.boxes)) {
    if (box.address === want) return box;
  }
  return null;
}

function sawPrivateMaterial(src) {
  if (!src || typeof src !== "object") return false;
  if (src.user_private_key || src.private_jwk || src.private_key) return true;
  const pub = src.user_public_key || src.public_jwk;
  return Boolean(pub && typeof pub === "object" && pub.d);
}

export async function mailboxOpen(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const id = callerId(src);
  const box = boxOf(id);
  const droppedPrivate = sawPrivateMaterial(src);
  if (src.user_public_key || src.public_jwk) {
    const pub = normalizePublicJwk(src.user_public_key || src.public_jwk);
    if (!pub) {
      return refuse("AZM-BAD-KEY", "user_public_key must be an X25519 OKP JWK. The private key is not stored.", {
        op: "mailbox_open",
        private_key_stored: false,
      });
    }
    box.public_jwk = pub;
  }
  if (src.address) {
    const address = String(src.address).trim().toLowerCase();
    if (!isEmailAddress(address)) {
      return refuse("AZM-BAD-INPUT", "address must be an email-shaped mailbox label.", { op: "mailbox_open" });
    }
    const taken = findBoxByAddress(address);
    if (taken && taken.id !== id) {
      return refuse("AZM-ADDRESS-TAKEN", "That address is already registered on another AZMail mailbox.", {
        op: "mailbox_open",
      });
    }
    box.address = address;
  }
  const receipt = await mailboxReceipt({ op: "mailbox_open", mailbox_id: id, ts: box.opened });
  return baseResult({
    op: "mailbox_open",
    mailbox_id: id,
    opened: box.opened,
    count: box.items.length,
    address: box.address || null,
    public_key_registered: Boolean(box.public_jwk),
    private_key_stored: false,
    dropped_private_key: droppedPrivate,
    provider_can_read: false,
    at_rest: "sealed-to-user",
    mta: false,
    smtp: false,
    mesh_enabled_default: false,
    receipt,
    ...AZMAIL_HONESTY,
    note: "Local isolate mailbox. The user public key may be registered. The private key is never stored. Not a public MTA.",
  });
}

function publicScan(scan) {
  if (!scan) return null;
  return {
    code: scan.code,
    verdict: scan.verdict,
    clean: scan.clean === true,
    live: scan.live === true,
    fixture_labeled: scan.fixture_labeled === true,
    scanner: scan.scanner || null,
    signature: scan.signature || null,
    parts: Array.isArray(scan.parts) ? scan.parts : [],
    note: scan.note || "",
  };
}

async function storeSealed(box, fields, publicJwk, object, scan, e2e) {
  const sealed = await sealMailboxObject(publicJwk, object);
  if (!sealed) return null;
  memory.seq += 1;
  const item = {
    id: `${fields.kind === "notice" ? "n" : "m"}_${memory.seq.toString(36)}`,
    kind: fields.kind,
    class: fields.class || null,
    from: fields.from || null,
    to: fields.to,
    ts: nowIso(),
    acked: false,
    airgap: "crossed",
    plaintext_crossed: false,
    exec: false,
    e2e: e2e === true,
    end_to_end: e2e === true,
    external_smtp_e2e: false,
    at_rest: "sealed-to-user",
    provider_can_read: false,
    sealed,
    scan: publicScan(scan),
    carried: (object.parts || []).map((part) => ({ kind: part.kind, name: part.name, sha256: part.sha256 })),
  };
  box.items.unshift(item);
  if (box.items.length > MAILBOX_CAP) box.items.length = MAILBOX_CAP;
  return item;
}

export async function noticePost(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const klass = String(src.class || src.kind || "").toLowerCase();
  if (!NOTICE_CLASSES.has(klass)) {
    return refuse("AZM-BAD-INPUT", "notice_post class must be error|update|health|receipt.", {
      op: "notice_post",
      allowed: [...NOTICE_CLASSES],
    });
  }
  const to = callerId({ mailbox_id: src.to || src.mailbox_id || "worker" });
  const box = boxOf(to);
  if (!box.public_jwk) {
    return refuse("AZM-NO-USER-KEY", "Register the user public key with mailbox_open before posting. No shared demo key is used.", {
      op: "notice_post",
      private_key_stored: false,
    });
  }
  const inspected = await inspectBeforeAirgap(src, env);
  if (!inspected.ok) {
    return refuse(inspected.code, inspected.error || "Notice did not cross the airgap.", {
      op: "notice_post",
      scan: publicScan(inspected.scan),
      crossed: false,
      exec: false,
      plaintext_crossed: false,
      e2e: false,
      external_smtp_e2e: false,
    });
  }
  const item = await storeSealed(
    box,
    { kind: "notice", class: klass, to },
    box.public_jwk,
    { v: 1, body: inspected.body, parts: inspected.parts, exec: false },
    inspected.scan,
    true,
  );
  const receipt = await mailboxReceipt({ op: "notice_post", mailbox_id: to, item_id: item.id, class: klass });
  return baseResult({
    op: "notice_post",
    mailbox_id: to,
    item,
    receipt,
    mta: false,
    smtp: false,
    e2e: true,
    external_smtp_e2e: false,
    airgap: "crossed",
    exec: false,
    ...AZMAIL_HONESTY,
    note: "Agent→user notice sealed to the user key after the airgap. Not SMTP.",
  });
}

function localFromId(src) {
  if (isEmailAddress(src.from)) return String(src.from).trim().toLowerCase();
  return callerId({ mailbox_id: src.from || src.caller });
}

export async function mailPost(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const toRaw = String(src.to || "").trim();
  if (!toRaw || !headerSafe(toRaw) || !headerSafe(src.from || "") || !headerSafe(src.subject || "")) {
    return refuse("AZM-BAD-INPUT", "mail_post needs a from and a to without header breaks.", { op: "mail_post" });
  }
  const inspected = await inspectBeforeAirgap(src, env);
  if (!inspected.ok) {
    return refuse(inspected.code, inspected.error || "Mail did not cross the airgap.", {
      op: "mail_post",
      scan: publicScan(inspected.scan),
      crossed: false,
      exec: false,
      plaintext_crossed: false,
      sent: false,
      e2e: false,
      external_smtp_e2e: false,
    });
  }
  if (isEmailAddress(toRaw)) {
    const local = findBoxByAddress(toRaw);
    if (local && local.public_jwk) {
      return deliverAzmail(src, inspected, local, toRaw.toLowerCase());
    }
    return deliverOrdinarySmtp(src, inspected, toRaw.toLowerCase(), env);
  }
  const to = toRaw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 48);
  if (!to) {
    return refuse("AZM-BAD-INPUT", "mail_post needs a mailbox id or an email address.", { op: "mail_post" });
  }
  return deliverAzmail(src, inspected, boxOf(to), to);
}

async function deliverAzmail(src, inspected, box, toLabel) {
  if (!box.public_jwk) {
    return refuse("AZM-NO-USER-KEY", "The recipient has no user public key. AZMail does not fall back to a shared demo key.", {
      op: "mail_post",
      private_key_stored: false,
      e2e: false,
      external_smtp_e2e: false,
      sent: false,
    });
  }
  const from = localFromId(src);
  const object = { v: 1, body: inspected.body, parts: inspected.parts, exec: false };
  const item = await storeSealed(box, { kind: "mail", from, to: toLabel }, box.public_jwk, object, inspected.scan, true);
  const sender = isEmailAddress(from) ? findBoxByAddress(from) : memory.boxes[from];
  if (sender && sender.public_jwk && sender.id !== box.id) {
    await storeSealed(sender, { kind: "mail", from, to: toLabel }, sender.public_jwk, object, inspected.scan, true);
  }
  const receipt = await mailboxReceipt({ op: "mail_post", from, to: toLabel, item_id: item.id });
  return baseResult({
    op: "mail_post",
    from,
    to: toLabel,
    item,
    receipt,
    mta: false,
    smtp: false,
    public_mta: false,
    sent: true,
    ...AZMAIL_HONESTY,
    e2e: true,
    end_to_end: true,
    external_smtp_e2e: false,
    azmail_to_azmail: true,
    airgap: "crossed",
    plaintext_crossed: false,
    exec: false,
    provider_can_read: false,
    scan: publicScan(inspected.scan),
    note: "AZMail-to-AZMail. Body, links, and files are sealed to the recipient user key. The provider cannot read them.",
  });
}

async function deliverOrdinarySmtp(src, inspected, to, env) {
  const domain = domainOf(to);
  const from = isEmailAddress(src.from) ? String(src.from).trim() : `${localFromId(src)}@azmail.local`;
  const mime = buildExternalMime({
    from,
    to,
    subject: src.subject || "(no subject)",
    body: inspected.body,
    parts: inspected.parts,
  });
  const wire = await deliverExternal({ from, to, mime, env });
  if (!wire.ok) {
    return refuse(wire.code || "AZM-SMTP-ABSENT", wire.note || wire.error || "External SMTP was not sent.", {
      op: "mail_post",
      from,
      to,
      recipient_domain: domain,
      sent: false,
      tls: wire.tls === true,
      wire: wire.wire || null,
      e2e: false,
      end_to_end: false,
      external_smtp_e2e: false,
      gmail_e2e: false,
      public_mta: false,
      smtp: false,
      airgap: "held",
      exec: false,
      scan: publicScan(inspected.scan),
      field_1_0: false,
      proton_clone_live: false,
    });
  }
  const sender = isEmailAddress(from) ? findBoxByAddress(from) : memory.boxes[localFromId(src)];
  let senderItem = null;
  if (sender && sender.public_jwk) {
    senderItem = await storeSealed(
      sender,
      { kind: "mail", from, to },
      sender.public_jwk,
      { v: 1, body: inspected.body, parts: inspected.parts, exec: false, wire: "external-smtp" },
      inspected.scan,
      false,
    );
    if (senderItem) senderItem.e2e = false;
    if (senderItem) senderItem.end_to_end = false;
  }
  return baseResult({
    op: "mail_post",
    from,
    to,
    recipient_domain: domain,
    item: senderItem,
    sent: true,
    tls: wire.tls === true,
    tls_peer_verified: wire.tls_peer_verified === true,
    wire: wire.wire,
    transport: wire.transport,
    mta: false,
    smtp: false,
    public_mta: false,
    local_smtp: true,
    e2e: false,
    end_to_end: false,
    external_smtp_e2e: false,
    gmail_e2e: false,
    live_e2e: false,
    yahoo_e2e: false,
    outlook_e2e: false,
    azmail_to_azmail: false,
    airgap: "crossed",
    plaintext_crossed: false,
    exec: false,
    provider_can_read_mailbox: senderItem ? false : null,
    scan: publicScan(inspected.scan),
    field_1_0: false,
    proton_clone_live: false,
    note: externalNote(domain, wire.tls === true),
  });
}

export async function inboxPull(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const id = callerId(src);
  const box = boxOf(id);
  const limit = Math.min(32, Math.max(1, Number(src.limit) || 16));
  const items = box.items.slice(0, limit);
  let opened = null;
  if (src.user_private_key || src.private_jwk) {
    const privateJwk = src.user_private_key || src.private_jwk;
    opened = [];
    for (const item of items) {
      const object = await openMailboxObject(privateJwk, item.sealed);
      if (!object) {
        opened.push({ id: item.id, opened: false, code: "AZM-SEAL-CLOSED" });
      } else {
        opened.push({
          id: item.id,
          opened: true,
          body: object.body,
          parts: object.parts || [],
        });
      }
    }
  }
  return baseResult({
    op: "inbox_pull",
    mailbox_id: id,
    count: items.length,
    items,
    opened,
    private_key_stored: false,
    provider_can_read: false,
    at_rest: "sealed-to-user",
    mta: false,
    smtp: false,
    ...AZMAIL_HONESTY,
    note: "Caller inbox only. Stored items are ciphertext sealed to the user key. The private key is not stored.",
  });
}

export async function mailboxAck(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const id = callerId(src);
  const box = boxOf(id);
  const itemId = String(src.item_id || src.id || "");
  const item = box.items.find((row) => row.id === itemId);
  if (!item) {
    return refuse("AZM-NOT-FOUND", "ack needs a caller-owned item_id.", { op: "ack", status: 404, mailbox_id: id });
  }
  item.acked = true;
  const receipt = await mailboxReceipt({ op: "ack", mailbox_id: id, item_id: item.id });
  return baseResult({ op: "ack", mailbox_id: id, item, receipt, mta: false, smtp: false });
}

export async function mailboxVerifyReceipt(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const receipt = src.receipt && typeof src.receipt === "object" ? src.receipt : src;
  const { receipt_sha256, ...rest } = receipt;
  const { sha256Hex } = await import("../../session-core.js");
  const expect = await sha256Hex(JSON.stringify(rest));
  return baseResult({
    op: "verify_receipt",
    match: Boolean(receipt_sha256) && receipt_sha256 === expect,
    receipt_sha256: expect,
    posted: receipt_sha256 || null,
    mta: false,
    smtp: false,
  });
}

export function mailboxImportExport(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const mode = String(src.mode || "export").toLowerCase();
  const id = callerId(src);
  const box = boxOf(id);
  return baseResult({
    op: "import_export",
    mode: mode === "import" ? "import" : "export",
    mailbox_id: id,
    items: mode === "import" ? [] : box.items.slice(),
    stored: false,
    mta: false,
    smtp: false,
    note: "Client-held ciphertext JSON. Plaintext is not exported. Hosted mailbox is isolate-local, not an MTA.",
  });
}

export function transportStatus(env) {
  const probe = probeScannerSync(env);
  return {
    public_mta: false,
    smtp: false,
    imap: false,
    pop3: false,
    mx: false,
    gated: true,
    public_send: false,
    smtp_send: "FG-STUB",
    local_mailbox: true,
    local_smtp: "LIVE-when-transport-present",
    scan: AZMAIL_HONESTY.scan,
    scan_live: probe.live === true,
    scanner: probe.live ? "clamav" : null,
    scan_absent_code: "AZM-SCAN-ABSENT",
    airgap: AIRGAP_BOUNDARY.present ? "present" : "absent",
    airgap_boundary: AIRGAP_BOUNDARY,
    mailbox_at_rest: AZMAIL_HONESTY.mailbox_at_rest,
    provider_can_read_mailbox: false,
    external_smtp_e2e: false,
    gmail_e2e: false,
    live_e2e: false,
    yahoo_e2e: false,
    outlook_e2e: false,
    azmail_to_azmail: "sealed-e2e",
    carried: AZMAIL_HONESTY.carried,
    attachment_exec: false,
    links_fetched: false,
    field_1_0: false,
    proton_clone_live: false,
    next_step:
      "Public smtp_send stays FG-STUB. mail_post scans body, links, videos, docs, images, zips, and other files before the airgap. AZMail-to-AZMail is sealed to the user key. Ordinary SMTP (@gmail, @live, @yahoo, and other domains) is normal MIME over opportunistic TLS and is not end-to-end. A missing scanner refuses AZM-SCAN-ABSENT.",
  };
}

export function azmailHealth() {
  return baseResult({
    ok: true,
    mesh_enabled: memory.enabled === true,
    mesh_default: MESH_DEFAULT,
    mesh_enabled_default: false,
    mta: false,
    smtp: false,
    r2: { bound: false, bucket: null, cdn: false },
    isolate_hash_store: true,
    object_store: "isolate-hash",
    mailbox: true,
    azchat_bridge: false,
    ...AZMAIL_HONESTY,
    airgap_boundary: AIRGAP_BOUNDARY,
    transport: transportStatus(),
  });
}

export function azmailSkill() {
  return {
    markdown: `# AZMail (in-process)

AZMail (APP 1.0) is the anonymous MCP mesh mailer + advisory anti-phishing airlock.

**Reached only via FragGate** on aziel-runtime (and host \`/runtime\` proxies of that door):

- MCP: \`fraggate_call\` with \`{ slug: "azmail", op: "..." }\`
- HTTP: \`POST /v1/fraggate/call\` with the same CallEnvelope
- Leftover flat names such as \`azmail_mesh_post\` still go through FragGate (\`parseTarget\`) — they are not a side door and are not listed on \`tools/list\`

Live ops: \`airlock_classify\`, \`scrub\`, \`trust_score\`, \`mesh_post\`, \`mesh_poll\`, \`mesh_listen\`, \`mesh_enable\`, \`mesh_disable\`, \`keyword_alert_set\`, \`keyword_alert_list\`, \`keyword_alert_check\`, \`mailbox_open\`, \`notice_post\`, \`mail_post\`, \`inbox_pull\`, \`ack\`, \`verify_receipt\`, \`import_export\`, \`transport_status\`, \`health\`, \`skill\`.

Mesh default: **off**. \`mesh_disable\` is always allowed. \`mesh_enable\` is rate-limited. Posts store no identity fields.

## Honesty

- Scan: LIVE-when-scanner-present. If ClamAV (\`clamscan\` or \`clamdscan\`) is absent, mail refuses \`AZM-SCAN-ABSENT\`. No clean verdict is invented.
- Airgap: present. Body, links, videos, docs, images, zips, and other files are parsed and scanned on the dirty side. Only a scanned sealed object enters the mailbox. Attachments are never executed. Links are not fetched.
- Mailbox: encrypted-to-user. The provider does not hold the user private key.
- AZMail-to-AZMail: sealed end-to-end to the user key, including those attachments.
- External SMTP (@gmail, @live, @yahoo, and other ordinary domains): normal MIME over opportunistic TLS. Not end-to-end.
- \`field_1_0\`: false. \`proton_clone_live\`: false.
- Public \`smtp_send\` stays stub. Not a full internet MTA.

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
    door: "fraggate",
    door_only: true,
    mesh_default: MESH_DEFAULT,
    ...AZMAIL_HONESTY,
    airgap_boundary: AIRGAP_BOUNDARY,
  };
}

/**
 * AZMail engine (APP 1.0).
 * Anonymous MCP mesh mailer + advisory anti-phishing airlock.
 * Independent of AZ-OS / Lumen. Not a full internet MTA.
 * Mesh default OFF. Reached only via FragGate LIVE_OPS.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

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
  "THIS IS: AZMail APP 1.0 — advisory anti-phishing airlock (classify / scrub / trust_score) plus an anonymous in-process MCP mesh ring (default OFF). Independent of AZ-OS / Lumen / interface. Reached only through the aziel-runtime FragGate door (POST /v1/fraggate/call or MCP fraggate_call). THIS IS NOT: a full internet MTA; SMTP / IMAP / POP3; a side door past FragGate; identity; deanonymization; credential harvest; a VPN; WhistleLock. SMTP / send / mail / deliver / identify / deanonymize / harvest stay stub. Hosted never claims a real mailbox. Author: Aziel Eliab only.";

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

const memory = {
  enabled: MESH_DEFAULT_ENABLED,
  last_enable_ms: 0,
  posts: [],
  alerts: [],
  seq: 0,
};

export function resetAzmailStore() {
  memory.enabled = MESH_DEFAULT_ENABLED;
  memory.last_enable_ms = 0;
  memory.posts = [];
  memory.alerts = [];
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

export function azmailHealth() {
  return baseResult({
    ok: true,
    mesh_enabled: memory.enabled === true,
    mesh_default: MESH_DEFAULT,
    mta: false,
    smtp: false,
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

Live ops: \`airlock_classify\`, \`scrub\`, \`trust_score\`, \`mesh_post\`, \`mesh_poll\`, \`mesh_listen\`, \`mesh_enable\`, \`mesh_disable\`, \`keyword_alert_set\`, \`keyword_alert_list\`, \`keyword_alert_check\`, \`health\`, \`skill\`.

Mesh default: **off**. \`mesh_disable\` is always allowed. \`mesh_enable\` is rate-limited. Posts store no identity fields.

SMTP / send / mail / deliver / identify / deanonymize / harvest stay **stub**. Not a full internet MTA. Independent of AZ-OS / Lumen.

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
    door: "fraggate",
    door_only: true,
    mesh_default: MESH_DEFAULT,
  };
}

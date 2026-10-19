/**
 * RIB-047 / AZRT-WITNESS-QUORUM-1.0 (idea from @RohanBhanotAI): a second witness slot (different key, host
 * and provider; same account holder).
 *
 * Slot 1 is the existing witness (AzielEliab/aziel-anchors, pinned key). It stays REQUIRED: if slot 1
 * fails, verify fails, whatever slot 2 says. Slot 2 is a second provider configured only by its
 * own config (env WITNESS2_LOG_URL + WITNESS2_PUBLIC_KEY, optional WITNESS2_NAME). With no config the
 * slot reports WITNESS2-NOT-CONFIGURED. There is no mock or fallback witness: nothing is invented.
 *
 * Slot 2 is read exactly like slot 1 (signed JSONL log, pinned Ed25519 key, hash + n + prev order),
 * then its newest statement's heads are checked against the runtime rows, and every chain head both
 * witnesses state at the same seq must agree. Quorum: have = verified slots; required = 1 by default,
 * 2 when env WITNESS_QUORUM="2" or the request asks require_quorum. Not met -> WITNESS-QUORUM-NOT-MET.
 * Read-only. The runtime has no write path to either log. Receipts are sealed, not signed.
 * Author: Aziel Eliab.
 */
import { checkStatementAgainstRuntime, parseJsonlLines, verifySignedLog, WITNESS_LOG_URL, WITNESS_PUBLIC_KEY, WITNESS_RETIRED_KEYS, WITNESS_REPO, ANCHOR_FETCH_TIMEOUT_MS, ANCHOR_CACHE_MS } from "./anchor.js";

export const QUORUM_SPEC = "AZRT-WITNESS-QUORUM-1.0";
export const WITNESS2_CODES = Object.freeze({
  notConfigured: "WITNESS2-NOT-CONFIGURED",
  badConfig: "WITNESS2-BAD-CONFIG",
  notIndependent: "WITNESS2-NOT-INDEPENDENT",
  missing: "WITNESS2-MISSING",
  unreachable: "WITNESS2-UNREACHABLE",
  invalid: "WITNESS2-LOG-INVALID",
  mismatch: "WITNESS2-MISMATCH",
  ok: "WITNESS2-OK",
  partial: "WITNESS2-PARTIAL",
  tooLarge: "WITNESS2-TOO-LARGE",
  quorumNotMet: "WITNESS-QUORUM-NOT-MET",
  quorumBadPolicy: "WITNESS-QUORUM-BAD-POLICY",
});
const KEY_RE = /^[A-Za-z0-9_-]{43}$/;
export const WITNESS2_MAX_BYTES = 2 * 1024 * 1024;

function b64uDecode(text) {
  try {
    const s = String(text).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}
function b64uEncode(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const hexOf = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** Canonical 32-byte key: decodes to 32 bytes AND re-encodes to exactly the same text (no spare-bit variants). */
export function canonicalKey(text) {
  if (!KEY_RE.test(String(text || ""))) return null;
  const bytes = b64uDecode(text);
  if (!bytes || bytes.length !== 32 || b64uEncode(bytes) !== text) return null;
  return hexOf(bytes);
}
function slot1KeyBytes() {
  const out = new Set();
  for (const k of [WITNESS_PUBLIC_KEY, ...(WITNESS_RETIRED_KEYS || []).map((x) => (x && typeof x === "object" ? x.key || x.public_key : x))]) {
    const b = k ? b64uDecode(k) : null;
    if (b && b.length === 32) out.add(hexOf(b));
  }
  return out;
}

/** Hosts that are IP literals or loopback/local names are refused. */
export function hostRefused(hostname) {
  const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^[0-9.]+$/.test(h)) return true; // IPv4 (also short / decimal forms)
  if (/^0x[0-9a-f.x]+$/i.test(h)) return true; // hex IPv4
  if (h.includes(":")) return true; // IPv6
  return false;
}

/** owner/repo a log URL resolves to on GitHub raw / github.com raw|blob / jsDelivr; null if not GitHub-hosted. */
export function githubRepoOf(u) {
  let path;
  try { path = decodeURIComponent(u.pathname); } catch { path = u.pathname; }
  const parts = path.toLowerCase().split("/").filter(Boolean);
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  // github.com / raw / media / api / codeload / pages / githack / statically / jsDelivr (incl. purge).
  if (host === "raw.githubusercontent.com" || host === "github.com" || host === "www.github.com" || host === "media.githubusercontent.com" || host === "codeload.github.com") return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  if (host === "api.github.com" && parts[0] === "repos" && parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  if (host.endsWith(".github.io") && parts.length >= 1) return `${host.slice(0, -".github.io".length)}/${parts[0]}`;
  if ((host === "raw.githack.com" || host === "rawcdn.githack.com") && parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  if (host === "cdn.statically.io" && parts[0] === "gh" && parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  if ((host === "cdn.jsdelivr.net" || host === "fastly.jsdelivr.net" || host === "gcore.jsdelivr.net" || host === "testingcf.jsdelivr.net" || host === "purge.jsdelivr.net") && parts[0] === "gh" && parts.length >= 3) return `${parts[1]}/${parts[2].split("@")[0]}`;
  return null;
}

/**
 * AZRT-WITNESS-QUORUM-1.0 addendum: a slot-2 log on Cloudflare (Workers, Pages, R2) shares the runtime's own
 * provider, so it is refused (WITNESS2-NOT-INDEPENDENT: not a different provider). GitHub-hosted logs stay allowed
 * only outside the slot-1 repo. Checked by hostname list here and by response headers when the log is read.
 */
export function cloudflareHosted(hostname) {
  const h = String(hostname || "").toLowerCase().replace(/\.$/, "");
  return ["workers.dev", "pages.dev", "r2.dev", "r2.cloudflarestorage.com", "cloudflare.com", "cloudflareworkers.com"].some((d) => h === d || h.endsWith("." + d));
}

/** Which response header shows the slot-2 log was served through Cloudflare ("cf-ray" / "server: cloudflare"), or null. */
export function cloudflareServed(headers) {
  const get = (n) => (headers && typeof headers.get === "function" ? headers.get(n) : null);
  if (get("cf-ray")) return "cf-ray";
  if (/^cloudflare/i.test(String(get("server") || "").trim())) return "server: cloudflare";
  return null;
}

/** Slot-2 config from its own env vars. Never defaults to anything. */
export function witness2Config(env) {
  const url = env && typeof env.WITNESS2_LOG_URL === "string" ? env.WITNESS2_LOG_URL.trim() : "";
  const key = env && typeof env.WITNESS2_PUBLIC_KEY === "string" ? env.WITNESS2_PUBLIC_KEY.trim() : "";
  if (!url && !key) return { configured: false, code: WITNESS2_CODES.notConfigured, reason: "no second witness provider configured (WITNESS2_LOG_URL + WITNESS2_PUBLIC_KEY)" };
  let u = null;
  try { u = new URL(url); } catch { u = null; }
  const ck = canonicalKey(key);
  if (!u || u.protocol !== "https:" || !ck) return { configured: false, code: WITNESS2_CODES.badConfig, reason: "WITNESS2_LOG_URL must be https and WITNESS2_PUBLIC_KEY a canonical 32-byte base64url Ed25519 key; both are required" };
  if (u.username || u.password || hostRefused(u.hostname)) return { configured: false, code: WITNESS2_CODES.badConfig, reason: "WITNESS2_LOG_URL host must be a public DNS name (no IP address, localhost or credentials)" };
  if (slot1KeyBytes().has(ck)) return { configured: false, code: WITNESS2_CODES.notIndependent, reason: "second witness key equals the first witness's current or retired key" };
  if (cloudflareHosted(u.hostname)) return { configured: false, code: WITNESS2_CODES.notIndependent, reason: "second witness log host is a known Cloudflare hostname (workers.dev, pages.dev, r2.dev, r2.cloudflarestorage.com, cloudflare.com, cloudflareworkers.com), the runtime's own provider; a second witness must use a different provider" };
  const primary = new URL(WITNESS_LOG_URL);
  const repo = githubRepoOf(u);
  if (u.href === primary.href || repo === WITNESS_REPO.toLowerCase()) {
    return { configured: false, code: WITNESS2_CODES.notIndependent, reason: "second witness log lives in the first witness's repo; a second witness must use a different host" };
  }
  return { configured: true, url: u.href, public_key: key, name: env.WITNESS2_NAME ? String(env.WITNESS2_NAME).slice(0, 64) : u.host };
}

const memo = { at: 0, key: "", state: null };
export function resetWitness2Memo() { memo.at = 0; memo.key = ""; memo.state = null; }

async function fetchText(fetchImpl, url) {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), ANCHOR_FETCH_TIMEOUT_MS) : null;
  try {
    const res = await fetchImpl(url, { redirect: "manual", signal: ctl ? ctl.signal : undefined, headers: { "user-agent": "aziel-runtime-anchor-reader" }, cf: { cacheTtl: 0 } });
    // Workers reject redirect:"error"; redirect:"manual" returns 3xx (or opaqueredirect / status 0).
    if (res.type === "opaqueredirect" || res.status === 0 || (res.status >= 300 && res.status < 400)) return { ok: false, status: res.status || 302, error: "redirect refused" };
    // Addendum (AZBot review of #309): a custom domain proxied by Cloudflare passes the hostname list, so
    // the response itself is checked too. cf-ray or server: cloudflare means the log is served through
    // Cloudflare, the runtime's own provider. Checked before the status, so a 404 through Cloudflare counts.
    const via = cloudflareServed(res.headers);
    if (via) { try { await res.body?.cancel(); } catch {} return { ok: false, cloudflare: true, via }; }
    if (!res.ok) return { ok: false, status: res.status };
    const len = Number(res.headers && res.headers.get && res.headers.get("content-length"));
    if (len > WITNESS2_MAX_BYTES) { try { await res.body?.cancel(); } catch {} return { ok: false, tooLarge: true }; }
    if (!res.body || typeof res.body.getReader !== "function") return { ok: false, error: "no readable body" };
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > WITNESS2_MAX_BYTES) { try { await reader.cancel(); } catch {} return { ok: false, tooLarge: true }; }
      chunks.push(value);
    }
    const buf = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
    return { ok: true, text: new TextDecoder().decode(buf) };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err).slice(0, 120) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Load + verify the slot-2 log. */
export async function loadWitness2(env, fetchImpl, { force = false, now = Date.now() } = {}) {
  const cfg = witness2Config(env);
  if (!cfg.configured) return { ok: false, configured: false, code: cfg.code, reason: cfg.reason };
  const k = cfg.url + "|" + cfg.public_key;
  if (!force && memo.state && memo.key === k && now - memo.at < ANCHOR_CACHE_MS) return memo.state;
  const got = await fetchText(fetchImpl || fetch, cfg.url);
  let state;
  if (!got.ok && got.cloudflare) {
    state = { ok: false, configured: true, name: cfg.name, url: cfg.url, public_key: cfg.public_key, code: WITNESS2_CODES.notIndependent, detail: `the log response came through Cloudflare (${got.via}), the runtime's own provider; a second witness must use a different provider. Only the hostname list and these two headers are checked.` };
  } else if (!got.ok) {
    state = { ok: false, configured: true, name: cfg.name, url: cfg.url, public_key: cfg.public_key, code: got.tooLarge ? WITNESS2_CODES.tooLarge : (got.status === 404 ? WITNESS2_CODES.missing : WITNESS2_CODES.unreachable), detail: got.tooLarge ? `log larger than ${WITNESS2_MAX_BYTES} bytes` : (got.status || got.error) };
  } else {
    const entries = parseJsonlLines(got.text);
    const check = await verifySignedLog(entries, { publicKey: cfg.public_key });
    state = check.ok
      ? { ok: true, configured: true, name: cfg.name, url: cfg.url, public_key: cfg.public_key, n: check.n, latest: check.latest, entries }
      : { ok: false, configured: true, name: cfg.name, url: cfg.url, public_key: cfg.public_key, code: check.code === "ANCHOR-MISSING" ? WITNESS2_CODES.missing : WITNESS2_CODES.invalid, log_code: check.code, at: check.at, reason: check.reason };
  }
  memo.at = now; memo.key = k; memo.state = state;
  return state;
}

/** Every (chain, seq) both witnesses state must carry the same head hash. */
export function crossCheckWitnesses(entries1, entries2) {
  const index = new Map();
  for (const row of entries1 || []) {
    for (const h of (row && row.statement && row.statement.heads && row.statement.heads.chains) || []) if (h && h.c && h.seq) index.set(`${h.c}#${h.seq}`, h.h);
  }
  const conflicts = [];
  let shared = 0;
  for (const row of entries2 || []) {
    for (const h of (row && row.statement && row.statement.heads && row.statement.heads.chains) || []) {
      if (!h || !h.c || !h.seq) continue;
      const k = `${h.c}#${h.seq}`;
      if (!index.has(k)) continue;
      shared++;
      if (index.get(k) !== h.h) conflicts.push({ c: h.c, seq: h.seq, witness1_h: index.get(k), witness2_h: h.h });
    }
  }
  return { ok: conflicts.length === 0, shared_heads: shared, conflicts };
}

/** Does slot 2's newest statement cover every chain head in slot 1's newest statement (same seq + h)? */
export function coverageOf(latest1, latest2) {
  const want = ((latest1 && latest1.statement && latest1.statement.heads && latest1.statement.heads.chains) || []).filter((h) => h && h.c && Number.isInteger(h.seq));
  if (!want.length) return { ok: false, covered: 0, required: 0, missing: [], reason: "first witness's newest statement has no chain heads to cover" };
  const have = new Map();
  for (const h of (latest2 && latest2.statement && latest2.statement.heads && latest2.statement.heads.chains) || []) if (h && h.c) have.set(h.c, h);
  const missing = [];
  for (const h of want) {
    const g = have.get(h.c);
    if (!g || g.seq !== h.seq || g.h !== h.h) missing.push({ c: h.c, seq: h.seq, witness2: g ? { seq: g.seq, h: g.h } : null });
  }
  return { ok: missing.length === 0, covered: want.length - missing.length, required: want.length, missing: missing.slice(0, 20) };
}

export function requiredQuorum(env, requested) {
  const raw = requested != null && requested !== "" ? requested : env && env.WITNESS_QUORUM;
  if (raw == null || raw === "" || raw === "1" || raw === 1) return { required: 1 };
  if (raw === "2" || raw === 2 || raw === true || raw === "true") return { required: 2 };
  return { required: 2, bad: true }; // unknown policy: fail closed to the stricter quorum
}

/**
 * Quorum view for verify. primary = loadAnchors() state; primaryCheck = runtime check of its newest
 * statement. Slot 1 is required. Returns { ok, code, witnesses[], quorum{required,have,level} }.
 */
export async function witnessQuorum(env, { primary, primaryCheck, fetchImpl, deps = {}, requireQuorum = null, force = false } = {}) {
  const policy = requiredQuorum(env, requireQuorum);
  const w1ok = Boolean(primary && primary.ok && primaryCheck && primaryCheck.ok);
  const w1 = { slot: 1, name: "aziel-anchors", required: true, status: w1ok ? "verified" : (primary && primary.ok ? "mismatch" : "unverified"), code: w1ok ? "ANCHOR-OK" : (primary && primary.ok ? "ANCHOR-MISMATCH" : (primary && primary.code) || "ANCHOR-MISSING"), n: (primary && primary.n) || 0 };
  const s2 = await loadWitness2(env, fetchImpl, { force });
  let w2;
  if (!s2.configured) w2 = { slot: 2, required: policy.required >= 2, status: "not_configured", code: s2.code, reason: s2.reason };
  else if (!s2.ok) w2 = { slot: 2, name: s2.name, url: s2.url, public_key: s2.public_key, required: policy.required >= 2, status: s2.code === WITNESS2_CODES.notIndependent ? "not_independent" : s2.code === WITNESS2_CODES.missing ? "missing" : (s2.code === WITNESS2_CODES.unreachable ? "unreachable" : (s2.code === WITNESS2_CODES.tooLarge ? "too_large" : "invalid")), code: s2.code, ...(s2.log_code ? { log_code: s2.log_code, at: s2.at, reason: s2.reason } : { detail: s2.detail }) };
  else {
    const rt = await checkStatementAgainstRuntime(env, s2.latest.statement, deps);
    const cross = primary && primary.ok ? crossCheckWitnesses(primary.entries, s2.entries) : { ok: true, shared_heads: 0, conflicts: [], note: "first witness not verified; no cross-check" };
    // A head that disagrees is a mismatch; a statement with nothing checkable is only uncovered (partial).
    const ok = (rt.ok || rt.checked === 0) && cross.ok;
    // Coverage (AZBot #292): slot 2 counts only if its newest statement states every chain head of
    // slot 1's newest statement with the same seq and h. Otherwise "partial": not counted.
    const coverage = coverageOf(primary && primary.ok ? primary.latest : null, s2.latest);
    const status = !ok ? "mismatch" : (coverage.ok ? "verified" : "partial");
    w2 = { slot: 2, name: s2.name, url: s2.url, public_key: s2.public_key, required: policy.required >= 2, status, code: status === "verified" ? WITNESS2_CODES.ok : (status === "partial" ? WITNESS2_CODES.partial : WITNESS2_CODES.mismatch), n: s2.n, latest: { n: s2.latest.statement.n, statement_hash: s2.latest.statement_hash, runtime_check: rt }, cross_check: cross, coverage };
  }
  const have = [w1, w2].filter((w) => w.status === "verified").length;
  const level = w1.status !== "verified" ? "none" : (w2.status === "verified" ? "dual" : "single");
  // A configured second witness that disagrees fails verify even at quorum 1 (fail closed).
  let ok = w1.status === "verified" && have >= policy.required && w2.status !== "mismatch";
  let code = ok ? "WITNESS-QUORUM-OK" : (w1.status !== "verified" ? w1.code : (w2.status === "mismatch" ? WITNESS2_CODES.mismatch : WITNESS2_CODES.quorumNotMet));
  if (policy.bad) { ok = false; code = WITNESS2_CODES.quorumBadPolicy; }
  return {
    spec: QUORUM_SPEC,
    ok,
    code,
    fail_closed: true,
    witnesses: [w1, w2],
    quorum: { required: policy.required, have, level, first_witness_required: true },
    note: "Slot 1 (aziel-anchors) is always required. Slot 2 is read only when its own config is set; no mock witness exists.",
  };
}

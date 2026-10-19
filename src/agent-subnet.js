/**
 * AGENT-SUBNET-1.0: an AI-agent subnet on the node mesh. Paper: docs/designs/AGENT-SUBNET-1.0.md
 *
 * Zero trust: every agent has its own self-generated Ed25519 key (FED-MESH handle), every statement
 * is signed, every hop verifies, default deny. Grants are explicit, scoped, expiring, revocable, and
 * recorded. Cross-owner links need both owners. Rate limits per agent and global.
 * Privacy: payloads are sealed on the agent (X25519; the relay never opens a box). The relay keeps
 * ciphertext only, in a short-lived mailbox. Receipts hold hashes only (salted ids, ct sha256, size
 * bucket, kind, verdict). No content, no raw ids, no IPs.
 * Receipts: internal ChainLock chain `agentcomms` (dual lattice, append-only, tethered to AZ-OS).
 * Refusals: RIB-018 sealRefusal on `refusals` with a fixed reason + reason_sha256 (no caller text).
 * FragGate stays the single door: these are `mesh` ops (agent-*). No new MCP tool.
 * live stays false until two real independent agents exchange a verified message end to end.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { canonicalize, sha256Hex } from "./session-core.js";
import { b64urlToBytes, handleFromRawPublicKey, canonicalHandle } from "./fed-mesh/codec.js";
import { verifyObject } from "./fed-mesh/identity.js";
import { D2D_ORDER_ARROW } from "./d2d-carriers.js";

export const AGENT_SPEC = "AGENT-SUBNET-1.0";
export const AGENT_CHAIN = "agentcomms";
export const AGENT_PAPER = "docs/designs/AGENT-SUBNET-1.0.md";
export const AGENT_SKEW_MS = 5 * 60 * 1000;
export const AGENT_SEEN_TTL_S = 15 * 60;
export const AGENT_BOX_TTL_MS = 72 * 60 * 60 * 1000;
export const AGENT_MAILBOX_CAP = 64;
export const AGENT_PULL_MAX = 16;
export const AGENT_OWNER_CAP = 32;
export const AGENT_GRANT_MAX_MS = 30 * 24 * 60 * 60 * 1000;
export const AGENT_CT_MIN = 17; // one byte + a 16-byte AEAD tag
export const AGENT_CT_MAX = 16384;
export const AGENT_SEND_PER_MIN = 30;
export const AGENT_GLOBAL_PER_MIN = 600;
export const AGENT_REGISTER_PER_MIN = 20;
export const AGENT_READ_PER_MIN = 60;
export const AGENT_SEAL_CAP_PER_MIN = 120;
export const AGENT_CHALLENGE_TTL_MS = 120 * 1000;
export const AGENT_VIEW_LIMIT = 50;
export const AGENT_CAPS = Object.freeze(["chat", "task", "review", "search", "code", "data"]);
export const AGENT_ALGS = Object.freeze(["x25519-hkdf-sha256-aes256gcm", "x25519-xsalsa20poly1305-sealedbox", "x25519-xchacha20poly1305"]);
export const AGENT_KINDS = Object.freeze(["register", "grant", "revoke", "send", "deliver", "read", "refuse"]);
/** Plane P order (D2D-CARRIERS-1.0). The Worker has none of these radios. */
export const AGENT_RADIO_CARRIERS = Object.freeze(["lan", "wifi", "bluetooth", "rf", "photon"]);
export const AGENT_INTERNET_CARRIER = "internet-relay";
export const AGENT_OPS = Object.freeze([
  "agent-status", "agent-register", "agent-grant", "agent-revoke", "agent-send", "agent-pull",
  "agent-ack", "agent-challenge", "agent-receipts", "agent-directory",
]);
export const AGENT_MUTATE_OPS = Object.freeze(["agent-register", "agent-grant", "agent-revoke", "agent-send", "agent-pull", "agent-ack"]);
const KV = "agentnet|";
const HEX64 = /^[a-f0-9]{64}$/;
const NONCE_RE = /^[A-Za-z0-9_-]{16,64}$/;
/** Transport keys the door may add; never signed, dropped before any check. */
const TRANSPORT_KEYS = new Set(["confirm", "dry_run", "origin", "goal_id", "context_refs", "context_hash", "node_ids", "schema_hash", "background", "op", "slug"]);
const PRIVATE_KEY_RE = /^(private_?key|privatekey|enc_?private_?key|seed|enc_?seed|secret|secret_?key|d|sk|signing_?key)$/i;

const SHAPES = Object.freeze({
  "agent-register": { keys: ["v", "kind", "agent_id", "public_key", "enc_public_key", "owner_public_key", "discoverable", "caps", "t", "nonce"], sigs: ["sig", "owner_sig"] },
  "agent-grant": { keys: ["v", "kind", "from", "to", "scopes", "expires_at", "t", "nonce"], sigs: ["owner_sig_to", "owner_sig_from"] },
  "agent-revoke": { keys: ["v", "kind", "grant_id", "by_owner_public_key", "t", "nonce"], sigs: ["owner_sig"] },
  "agent-send": { keys: ["v", "kind", "from", "to", "grant_id", "carrier", "alg", "box_sha256", "t", "nonce"], sigs: ["sig"], extra: ["box"] },
  "agent-pull": { keys: ["v", "kind", "agent_id", "t", "nonce"], sigs: ["sig"] },
  "agent-ack": { keys: ["v", "kind", "agent_id", "acks", "t", "nonce"], sigs: ["sig"] },
  "agent-view": { keys: ["v", "kind", "scope", "subject_public_key", "challenge", "t", "nonce"], sigs: ["sig"] },
});
const BOX_KEYS = Object.freeze(["alg", "eph_public_key", "nonce", "ciphertext"]);

/** Fixed, code-chosen reasons. Caller text is never echoed or stored (AZBot #301 rule). */
export const AGENT_CODES = Object.freeze({
  "AGENT-BAD-INPUT": [400, "The statement is not a well-formed AGENT-SUBNET-1.0 statement."],
  "AGENT-PLAINTEXT-FIELD": [400, "Only sealed boxes travel. A field outside the signed statement and the box was refused."],
  "AGENT-PLAINTEXT-SUSPECT": [400, "The box does not look like ciphertext. Seal the payload on the agent before sending."],
  "AGENT-PRIVATE-KEY": [400, "Private keys stay on the agent. This relay does not accept them."],
  "AGENT-SKEW": [400, "The statement time is not within five minutes of this relay."],
  "AGENT-REPLAY": [409, "This exact signed statement was already used."],
  "AGENT-ID-MISMATCH": [400, "The agent or owner id does not match the hash of its public key."],
  "AGENT-SIG-INVALID": [403, "The agent signature did not verify. Nothing was done."],
  "AGENT-OWNER-SIG": [403, "An owner signature is missing or did not verify. Links across owners need both owners."],
  "AGENT-UNKNOWN": [404, "That agent is not registered on this subnet."],
  "AGENT-EXISTS": [409, "That agent id is already registered. A new key is a new agent."],
  "AGENT-OWNER-CAP": [409, "This owner already has the most agents this subnet allows."],
  "AGENT-NO-GRANT": [403, "No grant lets this sender reach this receiver. Default is deny."],
  "AGENT-GRANT-EXPIRED": [403, "The grant has expired."],
  "AGENT-GRANT-REVOKED": [403, "The grant was revoked."],
  "AGENT-GRANT-SCOPE": [403, "The grant does not carry the send scope."],
  "AGENT-BOX-HASH": [400, "box_sha256 does not match the sealed box."],
  "AGENT-CARRIER-ABSENT": [503, "That radio carrier is not present at this relay. The Worker is the internet relay only."],
  "AGENT-RATE": [429, "Rate limit reached for this agent or for the subnet. Try again in a minute."],
  "AGENT-MAILBOX-FULL": [409, "The receiver's mailbox is full. It must pull and ack first."],
  "AGENT-RECEIPT-UNAVAILABLE": [503, "The receipt could not be sealed, so nothing was done. No receipt, no message."],
  "AGENT-RECEIPT-CAP": [503, "The receipt seal cap for this minute is reached, so nothing was done."],
  "AGENT-STORE-UNBOUND": [503, "The durable store is not bound in this isolate. Nothing was done."],
  "AGENT-CHALLENGE": [403, "The view challenge is missing, expired, or not from this relay."],
  "AGENT-NOT-FOUND": [404, "Unknown agent subnet path."],
  "AGENT-METHOD": [405, "Wrong method for this agent subnet path."],
});

export const AGENT_HONEST = Object.freeze({
  live: false,
  live_rule: "live stays false until two real, independent agents (different owners, not test fixtures) exchange a message end to end, the receiver acks it verified, and an operator checks that row on the chain. A count never flips the flag; a reviewed code change does.",
  relay_sees_plaintext: false,
  stores_plaintext: false,
  receipts_hold_content: false,
  receipts_hold_raw_ids: false,
  receipts_hold_ip: false,
  alt_internet_live: false,
  packet_path_live: false,
  radio_carriers_live: false,
  second_device: false,
  runtime_signs_receipts: false,
  new_mcp_tool: false,
});

// ---------- small helpers ----------
const nowMs = () => Date.now();
let clock = null;
export function _setAgentClock(fn) { clock = typeof fn === "function" ? fn : null; }
const now = () => (clock ? clock() : nowMs());
const sealMemo = { minute: -1, count: 0, refusals: new Map() };
export function _resetAgentMemo() { sealMemo.minute = -1; sealMemo.count = 0; sealMemo.refusals = new Map(); }
function memoMinute() {
  const m = Math.floor(now() / 60000);
  if (sealMemo.minute !== m) { sealMemo.minute = m; sealMemo.count = 0; sealMemo.refusals = new Map(); }
  return m;
}

function kvOf(env) {
  const kv = env && env.USES;
  return kv && typeof kv.get === "function" && typeof kv.put === "function" ? kv : null;
}
async function chainStoreOf(env) {
  if (!env || !env.CHAINLOCK) return null; // receipts must be durable: no memory fallback in production paths
  const { storeFor } = await import("./chainlock/store.js");
  return storeFor(env);
}
async function kvGetJson(kv, key) {
  try { const raw = await kv.get(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function kvPutJson(kv, key, value, ttlS) {
  await kv.put(key, JSON.stringify(value), ttlS ? { expirationTtl: Math.max(60, Math.floor(ttlS)) } : undefined);
}

export async function handleOf(publicKeyB64) {
  const raw = b64urlToBytes(publicKeyB64);
  if (!raw || raw.length !== 32) return "";
  return handleFromRawPublicKey(raw);
}

export function sizeBucket(bytes) {
  let b = 64;
  while (b < bytes) b *= 2;
  return b;
}

/** Fraction of printable ASCII bytes. Random ciphertext is about 0.37. */
export function printableRatio(bytes) {
  if (!bytes || !bytes.length) return 1;
  let p = 0;
  for (const x of bytes) if ((x >= 0x20 && x <= 0x7e) || x === 0x0a || x === 0x0d || x === 0x09) p++;
  return p / bytes.length;
}

async function subnetSalt(kv) {
  const key = KV + "salt";
  let salt = null;
  try { salt = await kv.get(key); } catch { salt = null; }
  if (salt && HEX64.test(salt)) return salt;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const fresh = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  await kv.put(key, fresh);
  const back = await kv.get(key);
  return back && HEX64.test(back) ? back : fresh; // last writer wins; re-read so isolates converge
}
async function hid(salt, id) {
  return (await sha256Hex(`${AGENT_SPEC}|${salt}|${String(id)}`)).slice(0, 32);
}

function unsignedOf(body, shape) {
  const out = {};
  for (const k of shape.keys) if (body[k] !== undefined) out[k] = body[k];
  return out;
}
function stripTransport(src) {
  const out = {};
  for (const [k, v] of Object.entries(src || {})) if (!TRANSPORT_KEYS.has(k)) out[k] = v;
  return out;
}
function hasPrivateKey(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 4) return false;
  for (const k of Object.keys(value)) {
    if (PRIVATE_KEY_RE.test(k)) return true;
    if (hasPrivateKey(value[k], depth + 1)) return true;
  }
  return false;
}
async function sigOk(publicKey, statement, sig) {
  try { return await verifyObject(publicKey, statement, sig); } catch { return false; }
}

// ---------- receipts ----------
async function sealComm(env, rec, idem) {
  const store = await chainStoreOf(env);
  if (!store) return { sealed: false, status: "unavailable", code: "AGENT-RECEIPT-UNAVAILABLE" };
  memoMinute();
  if (sealMemo.count >= AGENT_SEAL_CAP_PER_MIN) return { sealed: false, status: "rate_limited", code: "AGENT-RECEIPT-CAP" };
  sealMemo.count++;
  const body = { spec: AGENT_SPEC, ...rec };
  const rh = await sha256Hex(canonicalize(body));
  const { append } = await import("./chainlock/ops.js");
  try {
    const out = await append(store, {
      c: AGENT_CHAIN,
      k: "agentcomm",
      s: rec.kind,
      f: `agent ${rec.kind} r=${rh.slice(0, 16)}. Hashes only.`,
      agentcomm: body,
      idempotency_key: "agentcomm:" + (await sha256Hex(idem)).slice(0, 40),
    }, { internal: true });
    if (!out || !out.ok || !out.stamp || !out.stamp.agentcomm) return { sealed: false, status: "unavailable", code: "AGENT-RECEIPT-UNAVAILABLE" };
    return {
      spec: AGENT_SPEC, sealed: true, status: "sealed", kind: rec.kind, chain: AGENT_CHAIN, seq: out.seq + 1,
      h: out.stamp.stamp_sha256, r: rh, replayed: Boolean(out.replayed),
      lattice: out.lattice ? { primary: out.lattice.primary, secondary: out.lattice.secondary } : null,
      verify: `/v1/anchor/row?c=${AGENT_CHAIN}&seq=${out.seq + 1}`,
    };
  } catch {
    return { sealed: false, status: "unavailable", code: "AGENT-RECEIPT-UNAVAILABLE" };
  }
}

async function sealAgentRefusal(env, code, verb) {
  const [status, reason] = AGENT_CODES[code] || AGENT_CODES["AGENT-BAD-INPUT"];
  const minute = memoMinute();
  const key = `${code}|${verb}`;
  if (sealMemo.refusals.has(key)) return { ...sealMemo.refusals.get(key), replayed: true, memo: true };
  const store = await chainStoreOf(env);
  if (!store) return { kind: "refusal", sealed: false, status: "unavailable", reason: "no durable store in this isolate" };
  const { sealRefusal } = await import("./receipt-guard.js");
  const view = await sealRefusal(store, {
    code, tool: "mesh", slug: "agent-subnet", op: verb, args: { door: "mesh-agents", code, verb }, minuteBucket: minute,
    extra: { kind: "refusal", surface: "agent-subnet", door: "mesh-agents", reason, reason_sha256: await sha256Hex(reason), status, route: `/v1/mesh/agents/${verb.replace(/^agent-/, "")}` },
  });
  const out = { ...view, kind: "refusal", code, surface: "agent-subnet", status: view && view.sealed ? "sealed" : "unavailable" };
  if (out.sealed) sealMemo.refusals.set(key, out);
  return out;
}

/** A refusal: sealed on `refusals`; when the caller proved its signature, also a `refuse` row on agentcomms. */
async function refuseAgent(env, code, verb, { salt = null, agentId = null, extra = {} } = {}) {
  const [status, message] = AGENT_CODES[code] || AGENT_CODES["AGENT-BAD-INPUT"];
  const refusal_receipt = await sealAgentRefusal(env, code, verb);
  const out = { ok: false, code, message, spec: AGENT_SPEC, http_status: status, op: verb, refusal_receipt, ...extra };
  if (salt && agentId && refusal_receipt.sealed) {
    const from_h = await hid(salt, agentId);
    out.agentcomm_receipt = await sealComm(env, { kind: "refuse", code, from_h, refusal_h: refusal_receipt.h, sig_verdict: "verified" }, `refuse|${from_h}|${code}|${Math.floor(now() / 60000)}`);
  }
  return out;
}

async function rate(env, bucket, key, limit) {
  try {
    const { takeDistributedRateSlot } = await import("./rate-quota.js");
    const slot = await takeDistributedRateSlot(env, bucket, key, limit, now());
    return slot && slot.ok !== false;
  } catch {
    return false; // fail closed
  }
}

// ---------- common statement checks ----------
async function prepare(env, op, src) {
  const shape = SHAPES[op === "agent-receipts" ? "agent-view" : op];
  const body = stripTransport(src);
  if (hasPrivateKey(body)) return { refuse: "AGENT-PRIVATE-KEY" };
  const allowed = new Set([...shape.keys, ...shape.sigs, ...(shape.extra || [])]);
  for (const k of Object.keys(body)) if (!allowed.has(k)) return { refuse: op === "agent-send" ? "AGENT-PLAINTEXT-FIELD" : "AGENT-BAD-INPUT" };
  const wantKind = op === "agent-receipts" ? "agent-view" : op;
  if (body.v !== AGENT_SPEC || body.kind !== wantKind) return { refuse: "AGENT-BAD-INPUT" };
  if (typeof body.nonce !== "string" || !NONCE_RE.test(body.nonce)) return { refuse: "AGENT-BAD-INPUT" };
  const t = Date.parse(String(body.t || ""));
  if (!Number.isFinite(t) || Math.abs(now() - t) > AGENT_SKEW_MS) return { refuse: "AGENT-SKEW" };
  const kv = kvOf(env);
  if (!kv || !env.CHAINLOCK) return { refuse: "AGENT-STORE-UNBOUND" };
  const salt = await subnetSalt(kv);
  const statement = unsignedOf(body, shape);
  const statement_hash = await sha256Hex(canonicalize(statement));
  return { body, kv, salt, statement, statement_hash, t };
}
async function markSeen(kv, hash) {
  const key = KV + "seen|" + hash;
  if (await kv.get(key)) return false;
  await kv.put(key, "1", { expirationTtl: AGENT_SEEN_TTL_S });
  return true;
}
async function loadAgent(kv, id) {
  const h = canonicalHandle(id);
  return h ? kvGetJson(kv, KV + "agent|" + h) : null;
}

// ---------- ops ----------
async function opRegister(env, src) {
  const verb = "agent-register";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb);
  const { body, kv, salt, statement, statement_hash } = p;
  const agentId = canonicalHandle(body.agent_id);
  if (!agentId || typeof body.public_key !== "string" || typeof body.enc_public_key !== "string" || typeof body.owner_public_key !== "string") return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  const enc = b64urlToBytes(body.enc_public_key);
  if (!enc || enc.length !== 32) return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  if (body.discoverable !== undefined && typeof body.discoverable !== "boolean") return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  const caps = body.caps === undefined ? [] : body.caps;
  if (!Array.isArray(caps) || caps.length > AGENT_CAPS.length || caps.some((c) => !AGENT_CAPS.includes(c))) return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  if ((await handleOf(body.public_key)) !== agentId) return refuseAgent(env, "AGENT-ID-MISMATCH", verb);
  const ownerId = await handleOf(body.owner_public_key);
  if (!ownerId) return refuseAgent(env, "AGENT-ID-MISMATCH", verb);
  if (!(await sigOk(body.public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb);
  if (!(await sigOk(body.owner_public_key, statement, body.owner_sig))) return refuseAgent(env, "AGENT-OWNER-SIG", verb);
  if (!(await rate(env, "agent_register", "all", AGENT_REGISTER_PER_MIN))) return refuseAgent(env, "AGENT-RATE", verb);
  if (!(await markSeen(kv, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb);
  if (await loadAgent(kv, agentId)) return refuseAgent(env, "AGENT-EXISTS", verb);
  const owned = (await kvGetJson(kv, KV + "owner|" + ownerId)) || [];
  if (owned.length >= AGENT_OWNER_CAP) return refuseAgent(env, "AGENT-OWNER-CAP", verb);
  const agent_h = await hid(salt, agentId);
  const receipt = await sealComm(env, { kind: "register", agent_h, owner_h: await hid(salt, ownerId), sig_verdict: "verified", discoverable: body.discoverable === true }, `register|${agentId}`);
  if (!receipt.sealed) return refuseAgent(env, receipt.code || "AGENT-RECEIPT-UNAVAILABLE", verb);
  const row = { agent_id: agentId, public_key: body.public_key, enc_public_key: body.enc_public_key, owner_id: ownerId, owner_public_key: body.owner_public_key, discoverable: body.discoverable === true, caps, registered_at: new Date(now()).toISOString() };
  await kvPutJson(kv, KV + "agent|" + agentId, row);
  owned.push(agentId);
  await kvPutJson(kv, KV + "owner|" + ownerId, owned);
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, agent_id: agentId, discoverable: row.discoverable, caps, receipt, ...AGENT_HONEST };
}

async function opGrant(env, src) {
  const verb = "agent-grant";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb);
  const { body, kv, salt, statement, statement_hash } = p;
  const from = await loadAgent(kv, body.from);
  const to = await loadAgent(kv, body.to);
  if (!from || !to) return refuseAgent(env, "AGENT-UNKNOWN", verb);
  if (from.agent_id === to.agent_id) return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  if (!Array.isArray(body.scopes) || body.scopes.length !== 1 || body.scopes[0] !== "send") return refuseAgent(env, "AGENT-GRANT-SCOPE", verb);
  const exp = Date.parse(String(body.expires_at || ""));
  if (!Number.isFinite(exp) || exp <= now() || exp - now() > AGENT_GRANT_MAX_MS) return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  if (!(await sigOk(to.owner_public_key, statement, body.owner_sig_to))) return refuseAgent(env, "AGENT-OWNER-SIG", verb);
  const cross = from.owner_id !== to.owner_id;
  if (cross && !(await sigOk(from.owner_public_key, statement, body.owner_sig_from))) return refuseAgent(env, "AGENT-OWNER-SIG", verb);
  if (!(await markSeen(kv, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb);
  const grant_id = statement_hash;
  const grant_h = await hid(salt, grant_id);
  const receipt = await sealComm(env, {
    kind: "grant", grant_h, from_h: await hid(salt, from.agent_id), to_h: await hid(salt, to.agent_id),
    owner_pair_h: await hid(salt, [from.owner_id, to.owner_id].sort().join("|")), cross_owner: cross, scopes: ["send"],
    expires_day: new Date(exp).toISOString().slice(0, 10), sig_verdict: "verified",
  }, `grant|${grant_id}`);
  if (!receipt.sealed) return refuseAgent(env, receipt.code || "AGENT-RECEIPT-UNAVAILABLE", verb);
  await kvPutJson(kv, KV + "grant|" + grant_id, { grant_id, from: from.agent_id, to: to.agent_id, scopes: ["send"], expires_at: new Date(exp).toISOString(), cross_owner: cross, revoked_at: null });
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, grant_id, cross_owner: cross, owners_signed: cross ? 2 : 1, expires_at: new Date(exp).toISOString(), receipt, ...AGENT_HONEST };
}

async function opRevoke(env, src) {
  const verb = "agent-revoke";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb);
  const { body, kv, salt, statement, statement_hash } = p;
  if (!HEX64.test(String(body.grant_id || ""))) return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  const grant = await kvGetJson(kv, KV + "grant|" + body.grant_id);
  if (!grant) return refuseAgent(env, "AGENT-NO-GRANT", verb);
  const from = await loadAgent(kv, grant.from);
  const to = await loadAgent(kv, grant.to);
  const by = await handleOf(body.by_owner_public_key);
  if (!by || !from || !to || (by !== from.owner_id && by !== to.owner_id)) return refuseAgent(env, "AGENT-OWNER-SIG", verb);
  if (!(await sigOk(body.by_owner_public_key, statement, body.owner_sig))) return refuseAgent(env, "AGENT-OWNER-SIG", verb);
  if (!(await markSeen(kv, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb);
  if (grant.revoked_at) return refuseAgent(env, "AGENT-GRANT-REVOKED", verb);
  const receipt = await sealComm(env, { kind: "revoke", grant_h: await hid(salt, grant.grant_id), from_h: await hid(salt, grant.from), to_h: await hid(salt, grant.to), by_h: await hid(salt, by), sig_verdict: "verified" }, `revoke|${grant.grant_id}`);
  if (!receipt.sealed) return refuseAgent(env, receipt.code || "AGENT-RECEIPT-UNAVAILABLE", verb);
  grant.revoked_at = new Date(now()).toISOString();
  await kvPutJson(kv, KV + "grant|" + grant.grant_id, grant);
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, grant_id: grant.grant_id, revoked: true, receipt, ...AGENT_HONEST };
}

export function pickCarrier(raw) {
  const c = String(raw == null ? "auto" : raw).trim().toLowerCase();
  if (AGENT_RADIO_CARRIERS.includes(c)) return { ok: false, carrier: c, absent_code: "QNM-RADIO-ABSENT" };
  if (c === AGENT_INTERNET_CARRIER) return { ok: true, carrier: AGENT_INTERNET_CARRIER, fallback: false };
  if (c === "auto") return { ok: true, carrier: AGENT_INTERNET_CARRIER, fallback: true, tried: AGENT_RADIO_CARRIERS.map((id) => ({ id, present: false })) };
  return { ok: false, bad: true };
}

async function opSend(env, src) {
  const verb = "agent-send";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb);
  const { body, kv, salt, statement, statement_hash } = p;
  const box = body.box;
  if (!box || typeof box !== "object" || Array.isArray(box)) return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  for (const k of Object.keys(box)) if (!BOX_KEYS.includes(k)) return refuseAgent(env, "AGENT-PLAINTEXT-FIELD", verb);
  if (!AGENT_ALGS.includes(box.alg) || box.alg !== body.alg) return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  const from = await loadAgent(kv, body.from);
  if (!from) return refuseAgent(env, "AGENT-UNKNOWN", verb);
  if (!(await sigOk(from.public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb);
  // From here the sender proved its key: refusals also get a hashed `refuse` row it can see.
  const who = { salt, agentId: from.agent_id };
  if ((await sha256Hex(canonicalize(box))) !== body.box_sha256) return refuseAgent(env, "AGENT-BOX-HASH", verb, who);
  const ct = b64urlToBytes(box.ciphertext);
  if (!ct || ct.length < AGENT_CT_MIN || ct.length > AGENT_CT_MAX) return refuseAgent(env, "AGENT-BAD-INPUT", verb, who);
  if (typeof box.eph_public_key !== "string" || typeof box.nonce !== "string") return refuseAgent(env, "AGENT-BAD-INPUT", verb, who);
  if (printableRatio(ct) >= 0.9) return refuseAgent(env, "AGENT-PLAINTEXT-SUSPECT", verb, who);
  const to = await loadAgent(kv, body.to);
  if (!to) return refuseAgent(env, "AGENT-UNKNOWN", verb, who);
  const grant = HEX64.test(String(body.grant_id || "")) ? await kvGetJson(kv, KV + "grant|" + body.grant_id) : null;
  if (!grant || grant.from !== from.agent_id || grant.to !== to.agent_id) return refuseAgent(env, "AGENT-NO-GRANT", verb, who);
  if (grant.revoked_at) return refuseAgent(env, "AGENT-GRANT-REVOKED", verb, who);
  if (!(Date.parse(grant.expires_at) > now())) return refuseAgent(env, "AGENT-GRANT-EXPIRED", verb, who);
  if (!Array.isArray(grant.scopes) || !grant.scopes.includes("send")) return refuseAgent(env, "AGENT-GRANT-SCOPE", verb, who);
  const carrier = pickCarrier(body.carrier);
  if (carrier.bad) return refuseAgent(env, "AGENT-BAD-INPUT", verb, who);
  if (!carrier.ok) return refuseAgent(env, "AGENT-CARRIER-ABSENT", verb, { ...who, extra: { carrier: carrier.carrier, absent_code: carrier.absent_code, order: D2D_ORDER_ARROW, fallback: AGENT_INTERNET_CARRIER } });
  if (!(await rate(env, "agent_send", from.agent_id, AGENT_SEND_PER_MIN)) || !(await rate(env, "agent_global", "all", AGENT_GLOBAL_PER_MIN))) return refuseAgent(env, "AGENT-RATE", verb, who);
  if (!(await markSeen(kv, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, who);
  const prefix = KV + "box|" + to.agent_id + "|";
  const listed = await kv.list({ prefix, limit: AGENT_MAILBOX_CAP + 1 });
  if (((listed && listed.keys) || []).length >= AGENT_MAILBOX_CAP) return refuseAgent(env, "AGENT-MAILBOX-FULL", verb, who);
  const msg_id = statement_hash;
  const boxKey = prefix + msg_id;
  await kvPutJson(kv, boxKey, { msg_id, statement: { ...statement, sig: body.sig }, box, stored_at: now() }, AGENT_BOX_TTL_MS / 1000);
  const receipt = await sealComm(env, {
    kind: "send", msg_id, ct_sha256: await sha256Hex(ct), from_h: await hid(salt, from.agent_id), to_h: await hid(salt, to.agent_id),
    owner_pair_h: await hid(salt, [from.owner_id, to.owner_id].sort().join("|")), cross_owner: from.owner_id !== to.owner_id,
    size_bucket: sizeBucket(ct.length), sig_verdict: "verified", carrier: carrier.carrier, fallback: carrier.fallback, grant_h: await hid(salt, grant.grant_id),
  }, `send|${msg_id}`);
  if (!receipt.sealed) {
    try { await kv.delete(boxKey); } catch { /* the box expires on its own TTL */ }
    return refuseAgent(env, receipt.code || "AGENT-RECEIPT-UNAVAILABLE", verb);
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, msg_id, carrier: carrier.carrier, fallback: carrier.fallback, carrier_order: D2D_ORDER_ARROW, stored: true, expires_in_s: AGENT_BOX_TTL_MS / 1000, receipt, ...AGENT_HONEST };
}

async function opPull(env, src) {
  const verb = "agent-pull";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb);
  const { body, kv, salt, statement, statement_hash } = p;
  const me = await loadAgent(kv, body.agent_id);
  if (!me) return refuseAgent(env, "AGENT-UNKNOWN", verb);
  if (!(await sigOk(me.public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb);
  const who = { salt, agentId: me.agent_id };
  if (!(await rate(env, "agent_read", me.agent_id, AGENT_READ_PER_MIN))) return refuseAgent(env, "AGENT-RATE", verb, who);
  if (!(await markSeen(kv, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, who);
  const listed = await kv.list({ prefix: KV + "box|" + me.agent_id + "|", limit: AGENT_MAILBOX_CAP });
  const messages = [];
  let withheld = 0;
  for (const k of (listed && listed.keys) || []) {
    if (messages.length >= AGENT_PULL_MAX) break;
    const row = await kvGetJson(kv, k.name);
    if (!row || now() - Number(row.stored_at || 0) > AGENT_BOX_TTL_MS) continue;
    const sender = await loadAgent(kv, row.statement && row.statement.from);
    const ct = b64urlToBytes(row.box && row.box.ciphertext) || new Uint8Array(0);
    const receipt = await sealComm(env, {
      kind: "deliver", msg_id: row.msg_id, ct_sha256: await sha256Hex(ct), from_h: await hid(salt, row.statement.from), to_h: await hid(salt, me.agent_id),
      cross_owner: Boolean(sender && sender.owner_id !== me.owner_id), size_bucket: sizeBucket(ct.length), sig_verdict: "verified", carrier: AGENT_INTERNET_CARRIER,
    }, `deliver|${row.msg_id}`);
    if (!receipt.sealed) { withheld++; continue; } // no receipt, no delivery
    messages.push({ msg_id: row.msg_id, statement: row.statement, sender_public_key: sender ? sender.public_key : null, box: row.box, receipt });
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, agent_id: me.agent_id, count: messages.length, withheld_no_receipt: withheld, messages, verify_note: "Verify each statement.sig against sender_public_key yourself, check box_sha256, then open the box with your own key. The relay never opens it.", ...AGENT_HONEST };
}

async function opAck(env, src) {
  const verb = "agent-ack";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb);
  const { body, kv, salt, statement, statement_hash } = p;
  const me = await loadAgent(kv, body.agent_id);
  if (!me) return refuseAgent(env, "AGENT-UNKNOWN", verb);
  if (!(await sigOk(me.public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb);
  const who = { salt, agentId: me.agent_id };
  const acks = body.acks;
  if (!Array.isArray(acks) || acks.length < 1 || acks.length > AGENT_PULL_MAX || acks.some((a) => !a || !HEX64.test(String(a.msg_id || "")) || !["verified", "failed"].includes(a.verdict) || Object.keys(a).some((k) => k !== "msg_id" && k !== "verdict"))) return refuseAgent(env, "AGENT-BAD-INPUT", verb, who);
  if (!(await rate(env, "agent_read", me.agent_id, AGENT_READ_PER_MIN))) return refuseAgent(env, "AGENT-RATE", verb, who);
  if (!(await markSeen(kv, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, who);
  const done = [];
  for (const a of acks) {
    const key = KV + "box|" + me.agent_id + "|" + a.msg_id;
    const row = await kvGetJson(kv, key);
    if (!row) { done.push({ msg_id: a.msg_id, read: false, reason: "not in this mailbox" }); continue; }
    const sender = await loadAgent(kv, row.statement.from);
    const ct = b64urlToBytes(row.box && row.box.ciphertext) || new Uint8Array(0);
    const receipt = await sealComm(env, {
      kind: "read", msg_id: a.msg_id, ct_sha256: await sha256Hex(ct), from_h: await hid(salt, row.statement.from), to_h: await hid(salt, me.agent_id),
      cross_owner: Boolean(sender && sender.owner_id !== me.owner_id), size_bucket: sizeBucket(ct.length), sig_verdict: "verified", recipient_verdict: a.verdict,
    }, `read|${a.msg_id}`);
    if (!receipt.sealed) { done.push({ msg_id: a.msg_id, read: false, reason: "receipt not sealed; box kept" }); continue; }
    try { await kv.delete(key); } catch { /* expires on TTL */ }
    done.push({ msg_id: a.msg_id, read: true, verdict: a.verdict, receipt });
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, agent_id: me.agent_id, acks: done, ciphertext_deleted: done.filter((d) => d.read).length, ...AGENT_HONEST };
}

// ---------- viewer ----------
export async function makeChallenge(env) {
  const kv = kvOf(env);
  if (!kv) return { ok: false, code: "AGENT-STORE-UNBOUND" };
  const salt = await subnetSalt(kv);
  const exp = now() + AGENT_CHALLENGE_TTL_MS;
  const rand = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const mac = (await sha256Hex(`${salt}|challenge|${exp}|${rand}`)).slice(0, 32);
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, challenge: `${exp}.${rand}.${mac}`, expires_at: new Date(exp).toISOString(), sign: "Sign {v,kind:'agent-view',scope:'agent'|'owner',subject_public_key,challenge,t,nonce} with that key; POST it to /v1/mesh/agents/receipts." };
}
async function challengeOk(salt, ch) {
  const m = /^(\d{13})\.([a-f0-9]{24})\.([a-f0-9]{32})$/.exec(String(ch || ""));
  if (!m) return false;
  const exp = Number(m[1]);
  if (!(exp > now() && exp - now() <= AGENT_CHALLENGE_TTL_MS)) return false;
  return (await sha256Hex(`${salt}|challenge|${exp}|${m[2]}`)).slice(0, 32) === m[3];
}

async function chainRows(env) {
  const store = await chainStoreOf(env);
  if (!store) return null;
  const { loadChain } = await import("./chainlock/ops.js");
  return loadChain(store, AGENT_CHAIN);
}
function rowView(r, i) {
  return { seq: i + 1, t: r.t || null, kind: r.agentcomm && r.agentcomm.kind, agentcomm: r.agentcomm || null, h: r.stamp_sha256, prev: r.prev || null, lattice: r.lattice ? { primary: r.lattice.primary, secondary: r.lattice.secondary } : null, verify: `/v1/anchor/row?c=${AGENT_CHAIN}&seq=${i + 1}` };
}
function tipOf(rows) {
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  return { seq: rows.length, h: last.stamp_sha256, lattice: last.lattice ? { primary: last.lattice.primary, secondary: last.lattice.secondary } : null };
}
export function aggregate(rows) {
  const by_kind = Object.fromEntries(AGENT_KINDS.map((k) => [k, 0]));
  let e2e = 0;
  for (const r of rows) {
    const a = r && r.agentcomm;
    if (!a || !(a.kind in by_kind)) continue;
    by_kind[a.kind]++;
    if (a.kind === "read" && a.recipient_verdict === "verified" && a.cross_owner === true) e2e++;
  }
  return { total: rows.length, by_kind, e2e_verified_observed: e2e };
}

/** Public: aggregate counts + tip only. No rows, no hashed ids. */
export async function publicReceipts(env) {
  const rows = await chainRows(env);
  if (!rows) return { status: 503, body: { ok: false, code: "AGENT-STORE-UNBOUND", spec: AGENT_SPEC, chain: AGENT_CHAIN } };
  return { status: 200, body: { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, chain: AGENT_CHAIN, scope: "public", ...aggregate(rows), tip: tipOf(rows), rows_shown: 0, verify_chain: `chainlock_verify {"c":"${AGENT_CHAIN}"}`, owner_view: "GET /v1/mesh/agents/challenge, sign an agent-view statement, POST /v1/mesh/agents/receipts", ...AGENT_HONEST } };
}

async function opView(env, src) {
  const verb = "agent-receipts";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb);
  const { body, kv, salt, statement, statement_hash } = p;
  if (!(await challengeOk(salt, body.challenge))) return refuseAgent(env, "AGENT-CHALLENGE", verb);
  const subject = await handleOf(body.subject_public_key);
  if (!subject) return refuseAgent(env, "AGENT-ID-MISMATCH", verb);
  let ids = [];
  if (body.scope === "agent") {
    const a = await loadAgent(kv, subject);
    if (!a || a.public_key !== body.subject_public_key) return refuseAgent(env, "AGENT-UNKNOWN", verb);
    ids = [a.agent_id];
  } else if (body.scope === "owner") {
    ids = (await kvGetJson(kv, KV + "owner|" + subject)) || [];
    if (!ids.length) return refuseAgent(env, "AGENT-UNKNOWN", verb);
  } else return refuseAgent(env, "AGENT-BAD-INPUT", verb);
  if (!(await sigOk(body.subject_public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb);
  if (!(await rate(env, "agent_read", subject, AGENT_READ_PER_MIN))) return refuseAgent(env, "AGENT-RATE", verb);
  if (!(await markSeen(kv, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb);
  const mine = new Set();
  for (const id of ids) mine.add(await hid(salt, id));
  if (body.scope === "owner") mine.add(await hid(salt, subject));
  const rows = await chainRows(env);
  if (!rows) return refuseAgent(env, "AGENT-STORE-UNBOUND", verb);
  const hit = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const a = rows[i] && rows[i].agentcomm;
    if (!a) continue;
    if (mine.has(a.from_h) || mine.has(a.to_h) || mine.has(a.agent_h) || mine.has(a.owner_h) || mine.has(a.by_h)) hit.push(rowView(rows[i], i));
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, scope: body.scope, agents: ids.length, matched: hit.length, receipts: hit.slice(0, AGENT_VIEW_LIMIT), tip: tipOf(rows), note: "Only rows that involve the proved agent (or the proved owner's agents) are shown. Ids in rows are salted hashes.", ...AGENT_HONEST };
}

export async function directory(env, searchParams) {
  const kv = kvOf(env);
  if (!kv) return { status: 503, body: { ok: false, code: "AGENT-STORE-UNBOUND", spec: AGENT_SPEC } };
  const pub = (a) => ({ agent_id: a.agent_id, public_key: a.public_key, enc_public_key: a.enc_public_key, caps: a.caps || [] });
  const one = searchParams && searchParams.get ? searchParams.get("agent_id") : null;
  if (one) {
    const a = await loadAgent(kv, one);
    if (!a) return { status: 404, body: { ok: false, code: "AGENT-UNKNOWN", spec: AGENT_SPEC, message: AGENT_CODES["AGENT-UNKNOWN"][1] } };
    return { status: 200, body: { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, agent: pub(a), owner_listed: false } };
  }
  const listed = await kv.list({ prefix: KV + "agent|", limit: 200 });
  const agents = [];
  for (const k of (listed && listed.keys) || []) {
    const a = await kvGetJson(kv, k.name);
    if (a && a.discoverable === true) agents.push(pub(a));
  }
  return { status: 200, body: { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, count: agents.length, agents, owner_listed: false, note: "Only agents registered with discoverable:true are listed. Discovery is not consent: a grant is still required." } };
}

export async function agentStatus(env) {
  const rows = await chainRows(env).catch(() => null);
  const agg = rows ? aggregate(rows) : null;
  return {
    ok: true, code: "AGENT-OK", spec: AGENT_SPEC, paper: AGENT_PAPER,
    agent_subnet: { live: false, ...(agg || {}), tip: rows ? tipOf(rows) : null, store: rows ? "bound" : "unbound" },
    chain: AGENT_CHAIN,
    door: "fraggate mesh agent-* (MCP fraggate_call {slug:'mesh',op:'agent-send',payload}); HTTP POST /v1/mesh/agents/<verb>",
    ops: AGENT_OPS.slice(),
    routes: {
      status: "GET /v1/mesh/agents", directory: "GET /v1/mesh/agents/directory[?agent_id=#...]", challenge: "GET /v1/mesh/agents/challenge",
      receipts_public: "GET /v1/mesh/agents/receipts", receipts_scoped: "POST /v1/mesh/agents/receipts (signed agent-view)",
      register: "POST /v1/mesh/agents/register", grant: "POST /v1/mesh/agents/grant", revoke: "POST /v1/mesh/agents/revoke",
      send: "POST /v1/mesh/agents/send", pull: "POST /v1/mesh/agents/pull", ack: "POST /v1/mesh/agents/ack", viewer: "/agents",
    },
    carriers: { order: AGENT_RADIO_CARRIERS.concat([AGENT_INTERNET_CARRIER]), order_arrow: D2D_ORDER_ARROW, present_at_worker: [AGENT_INTERNET_CARRIER], radio_absent_code: "QNM-RADIO-ABSENT", fallback: AGENT_INTERNET_CARRIER },
    limits: { send_per_agent_per_min: AGENT_SEND_PER_MIN, global_per_min: AGENT_GLOBAL_PER_MIN, register_per_min: AGENT_REGISTER_PER_MIN, mailbox_cap: AGENT_MAILBOX_CAP, box_ttl_s: AGENT_BOX_TTL_MS / 1000, ciphertext_bytes: [AGENT_CT_MIN, AGENT_CT_MAX], receipt_seal_cap_per_min: AGENT_SEAL_CAP_PER_MIN, grant_max_days: 30 },
    algs: AGENT_ALGS.slice(), caps: AGENT_CAPS.slice(), kinds: AGENT_KINDS.slice(), codes: Object.keys(AGENT_CODES),
    verify_chain: `chainlock_verify {"c":"${AGENT_CHAIN}"}`,
    ...AGENT_HONEST,
    author: "Aziel Eliab",
  };
}

/** mesh op entry (FragGate door → runMeshOp → here). */
export async function runAgentOp(op, src, env) {
  try {
    if (op === "agent-status") return agentStatus(env);
    if (op === "agent-register") return await opRegister(env, src);
    if (op === "agent-grant") return await opGrant(env, src);
    if (op === "agent-revoke") return await opRevoke(env, src);
    if (op === "agent-send") return await opSend(env, src);
    if (op === "agent-pull") return await opPull(env, src);
    if (op === "agent-ack") return await opAck(env, src);
    if (op === "agent-challenge") return makeChallenge(env);
    if (op === "agent-receipts") {
      if (src && src.kind === "agent-view") return await opView(env, src);
      return (await publicReceipts(env)).body;
    }
    if (op === "agent-directory") return (await directory(env, { get: (k) => (k === "agent_id" && src && src.agent_id ? String(src.agent_id) : null) })).body;
    return refuseAgent(env, "AGENT-NOT-FOUND", "agent-status");
  } catch {
    // Fail closed: a crash is a refusal, never a success.
    return refuseAgent(env, "AGENT-BAD-INPUT", AGENT_OPS.includes(op) ? op : "agent-status");
  }
}

/** HTTP: /v1/mesh/agents[/verb]. Returns {status, body}. */
export async function dispatchAgentHttp(method, path, payload, env, searchParams) {
  const m = String(method || "GET").toUpperCase();
  const verb = path === "/v1/mesh/agents" ? "status" : path.slice("/v1/mesh/agents/".length);
  const asOut = (body) => ({ status: body && body.ok === false ? body.http_status || 400 : 200, body });
  const read = m === "GET" || m === "HEAD";
  if (verb === "status") return read ? asOut(await agentStatus(env)) : asOut(await refuseAgent(env, "AGENT-METHOD", "agent-status"));
  if (verb === "directory") return read ? directory(env, searchParams) : asOut(await refuseAgent(env, "AGENT-METHOD", "agent-directory"));
  if (verb === "challenge") {
    if (!read) return asOut(await refuseAgent(env, "AGENT-METHOD", "agent-challenge"));
    const c = await makeChallenge(env);
    return c.ok ? { status: 200, body: c } : asOut(await refuseAgent(env, "AGENT-STORE-UNBOUND", "agent-challenge"));
  }
  if (verb === "receipts") {
    if (read) return publicReceipts(env);
    if (m === "POST") return asOut(await opView(env, payload));
    return asOut(await refuseAgent(env, "AGENT-METHOD", "agent-receipts"));
  }
  const op = "agent-" + verb;
  if (AGENT_MUTATE_OPS.includes(op)) {
    if (m !== "POST") return asOut(await refuseAgent(env, "AGENT-METHOD", op));
    return asOut(await runAgentOp(op, payload, env));
  }
  return asOut(await refuseAgent(env, "AGENT-NOT-FOUND", "agent-status"));
}

/** Public /v1/anchor/rows view of an agentcomms row: links and lattice, no receipt body. */
export function redactAgentRow(entry) {
  if (!entry || !entry.row) return entry;
  const { agentcomm, ...rest } = entry.row;
  return { ...entry, row: { ...rest, agentcomm: agentcomm ? { redacted: true, kind: agentcomm.kind } : undefined } };
}

/** Test hook: spend one receipt-seal slot in this isolate (exercises AGENT-RECEIPT-CAP). */
export async function _burnSealForTest() { memoMinute(); sealMemo.count++; }

/**
 * Human viewer (runtime /agents). Public: aggregate counts + tip. Scoped: paste a signed agent-view
 * statement made by the reference client (`agent-subnet-client.mjs view <name> --print`). The page never
 * asks for a private key. Rows are rendered as text nodes only.
 */
export function agentsPageHtml(origin = "") {
  const api = String(origin || "").replace(/\/$/, "") + "/v1/mesh/agents";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent subnet receipts · Aziel Runtime</title>
<style>body{font:15px/1.5 system-ui,sans-serif;background:#0d1117;color:#e6edf3;margin:0;padding:1.2rem;max-width:1000px;margin:auto}
h1{font-size:1.4rem}code,pre,textarea{font-family:ui-monospace,monospace;font-size:.85rem}.card{border:1px solid #30363d;border-radius:8px;padding:.9rem;margin:.8rem 0;background:#161b22}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #30363d;padding:.3rem;text-align:left;font-size:.82rem;word-break:break-all}
.flag{color:#f0b429}.hint{position:fixed;right:1rem;bottom:1rem;max-width:340px;background:#1f2937;border:1px solid #f0b429;border-radius:8px;padding:.8rem;font-size:.88rem}
textarea{width:100%;min-height:8rem;background:#0d1117;color:#e6edf3;border:1px solid #30363d}button{background:#238636;color:#fff;border:0;border-radius:6px;padding:.4rem .9rem;cursor:pointer}</style></head>
<body><h1>Agent subnet receipts</h1>
<p>AGENT-SUBNET-1.0. Every agent message, grant, and refusal leaves a hash-only receipt on the <code>agentcomms</code> chain (both lattices, tethered to AZ-OS). Payloads are sealed on the agent; this relay sees ciphertext only. <span class="flag">live: false</span> until two real, independent agents have exchanged a verified message end to end.</p>
<div class="card"><h2>Public view</h2><p>Counts and the chain tip only. Nobody's rows are public.</p><pre id="pub">loading…</pre></div>
<div class="card"><h2>Your agents' receipts</h2>
<ol><li>Run <code>node scripts/agent-subnet-client.mjs view &lt;agent&gt; --print</code> (add <code>--owner</code> with your owner key to see all your agents).</li>
<li>Paste the signed statement below. It holds a public key and a signature, never a private key. Keys never go into this page.</li></ol>
<textarea id="stmt" placeholder='{"v":"AGENT-SUBNET-1.0","kind":"agent-view",...}'></textarea><p><button id="go">Show my receipts</button></p>
<p id="msg"></p><table><thead><tr><th>seq</th><th>time</th><th>kind</th><th>ct sha256</th><th>verdict</th><th>carrier</th><th>h</th></tr></thead><tbody id="rows"></tbody></table></div>
<div class="card"><p>Verify the whole chain: <code>chainlock_verify {"c":"agentcomms"}</code>. Status: <a href="${api}">${api}</a>. Paper: <code>${AGENT_PAPER}</code>.</p></div>
<div class="hint" id="hint"><strong>Hint.</strong> Agents sign everything with their own keys. Discovery is not consent: a receiver's owner must grant each sender, and links across owners need both owners. <button id="hx">Got it</button></div>
<script>
const API=${JSON.stringify(api)};
const $=(id)=>document.getElementById(id);
try{if(localStorage.getItem("agents-hint")==="1")$("hint").remove();}catch(e){}
$("hx")&&($("hx").onclick=()=>{try{localStorage.setItem("agents-hint","1")}catch(e){};$("hint").remove();});
fetch(API+"/receipts").then(r=>r.json()).then(j=>{$("pub").textContent=JSON.stringify({live:j.live,total:j.total,by_kind:j.by_kind,e2e_verified_observed:j.e2e_verified_observed,tip:j.tip,verify_chain:j.verify_chain},null,2)}).catch(()=>{$("pub").textContent="unreachable (fail closed: no claim)"});
$("go").onclick=async()=>{const tb=$("rows");tb.textContent="";let body;try{body=JSON.parse($("stmt").value)}catch(e){$("msg").textContent="That is not JSON.";return}
if(/private|seed|secret/i.test(Object.keys(body).join(","))){$("msg").textContent="Refused here: that looks like it has a private key. Do not paste keys.";return}
const r=await fetch(API+"/receipts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json();
if(!j.ok){$("msg").textContent=(j.code||"refused")+": "+(j.message||"");return}
$("msg").textContent=j.matched+" receipt(s) involve your "+(j.scope==="owner"?"agents":"agent")+".";
for(const row of j.receipts){const tr=document.createElement("tr");const a=row.agentcomm||{};for(const v of [row.seq,row.t,a.kind,a.ct_sha256||"",a.recipient_verdict||a.sig_verdict||a.code||"",a.carrier||"",row.h]){const td=document.createElement("td");td.textContent=String(v==null?"":v);tr.appendChild(td)}tb.appendChild(tr)}};
</script></body></html>`;
}

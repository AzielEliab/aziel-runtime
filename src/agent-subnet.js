/**
 * AGENT-SUBNET-1.0: an AI-agent subnet on the node mesh. Paper: docs/designs/AGENT-SUBNET-1.0.md
 * Designed to let AI agents exchange signed, end-to-end sealed messages. live:false (not proven yet).
 *
 * Zero trust: every agent has its own self-generated Ed25519 key (FED-MESH handle), every statement
 * is signed, every hop verifies, default deny. Grants are explicit, scoped, expiring, revocable, and
 * recorded. Cross-owner links need both owners. An owner can retire an agent, which kills every grant.
 * State (salt, replay keys, agents, grants, tombstones, registration limits) lives in ONE Durable Object
 * (src/agent-state.js), so checks and writes are strongly consistent.
 * Privacy: payloads are sealed on the agent (X25519 + HKDF-SHA256 + AES-256-GCM, ephemeral sender key,
 * static recipient key: no forward secrecy). The relay keeps ciphertext only, in a short-lived mailbox
 * keyed by a salted recipient hash. Receipts hold hashes only (salted ids, ct sha256, size bucket, kind,
 * verdict). The operator can read the salt and the queued boxes' sender id (see the paper).
 * Receipts: internal ChainLock chain `agentcomms` (dual lattice, append-only, tethered to AZ-OS).
 * Refusals: RIB-018 sealRefusal on `refusals` with reason:null + reason_sha256 (no caller text).
 * FragGate stays the single door: these are `mesh` ops (agent-*). No new MCP tool.
 * live stays false until two real independent agents exchange a verified message end to end.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { canonicalize, sha256Hex } from "./session-core.js";
import { b64urlToBytes, handleFromRawPublicKey, canonicalHandle } from "./fed-mesh/codec.js";
import { verifyObject } from "./fed-mesh/identity.js";
import { D2D_ORDER_ARROW } from "./d2d-carriers.js";
import { AGENT_STATE_OBJECT, AGENT_STATE_PATH, AGENTCOMM_CAP, agentCommClass } from "./agent-state.js";

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
/** Registration limits (in the state DO): per owner key, per visitor IP hash, and for the whole subnet. */
export const AGENT_REGISTER_PER_OWNER_PER_MIN = 3;
export const AGENT_REGISTER_PER_IP_PER_MIN = 5;
export const AGENT_REGISTER_PER_MIN = 20;
export const AGENT_READ_PER_MIN = 60;
/** Per-isolate receipt seal caps per class (backstop; the writer DO holds the true caps, AGENTCOMM_CAP). */
export const AGENT_SEAL_CAP_PER_MIN = Object.freeze({ msg: 300, rider: 600, ctl: 60, refuse: 60 });
/** Per-isolate caches: the salt never changes once made; directory and public counts are cached 60 s. */
export const AGENT_CACHE_MS = 60 * 1000;
export const AGENT_CHALLENGE_TTL_MS = 120 * 1000;
export const AGENT_VIEW_LIMIT = 50;
/** Public counts: refreshed once an hour, bucketed to tens, anything under 10 shown as "<10". */
export const AGENT_PUBLIC_K = 10;
export const AGENT_PUBLIC_REFRESH_MS = 60 * 60 * 1000;
export const AGENT_CAPS = Object.freeze(["chat", "task", "review", "search", "code", "data"]);
/** The only scheme that exists: X25519 ECDH (ephemeral sender, static recipient) + HKDF-SHA256 + AES-256-GCM. */
export const AGENT_ALGS = Object.freeze(["x25519-hkdf-sha256-aes256gcm"]);
export const AGENT_FORWARD_SECRECY = false;
export const AGENT_KINDS = Object.freeze(["register", "grant", "revoke", "retire", "send", "deliver", "read", "refuse"]);
/** Plane P order (D2D-CARRIERS-1.0). The Worker has none of these radios. */
export const AGENT_RADIO_CARRIERS = Object.freeze(["lan", "wifi", "bluetooth", "rf", "photon"]);
export const AGENT_INTERNET_CARRIER = "internet-relay";
export const AGENT_OPS = Object.freeze([
  "agent-status", "agent-register", "agent-grant", "agent-revoke", "agent-retire", "agent-send", "agent-pull",
  "agent-ack", "agent-challenge", "agent-receipts", "agent-directory",
]);
export const AGENT_MUTATE_OPS = Object.freeze(["agent-register", "agent-grant", "agent-revoke", "agent-retire", "agent-send", "agent-pull", "agent-ack"]);
const KV = "agentnet|";
const HEX64 = /^[a-f0-9]{64}$/;
const NONCE_RE = /^[A-Za-z0-9_-]{16,64}$/;
const IPH_RE = /^[a-f0-9]{16,64}$/;
/** Transport keys the door may add; never signed, dropped before any check. */
const TRANSPORT_KEYS = new Set(["confirm", "dry_run", "origin", "goal_id", "context_refs", "context_hash", "node_ids", "schema_hash", "background", "op", "slug"]);
const PRIVATE_KEY_RE = /^(private_?key|privatekey|enc_?private_?key|seed|enc_?seed|secret|secret_?key|d|sk|signing_?key)$/i;

const SHAPES = Object.freeze({
  "agent-register": { keys: ["v", "kind", "agent_id", "public_key", "enc_public_key", "owner_public_key", "discoverable", "caps", "t", "nonce"], sigs: ["sig", "owner_sig"] },
  "agent-grant": { keys: ["v", "kind", "from", "to", "scopes", "expires_at", "t", "nonce"], sigs: ["owner_sig_to", "owner_sig_from"] },
  "agent-revoke": { keys: ["v", "kind", "grant_id", "by_owner_public_key", "t", "nonce"], sigs: ["owner_sig"] },
  "agent-retire": { keys: ["v", "kind", "agent_id", "owner_public_key", "t", "nonce"], sigs: ["owner_sig"] },
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
  "AGENT-RETIRED": [403, "That agent was retired by its owner. Every grant it had is dead."],
  "AGENT-OWNER-CAP": [409, "This owner already has the most agents this subnet allows."],
  "AGENT-NO-GRANT": [403, "No grant lets this sender reach this receiver. Default is deny."],
  "AGENT-GRANT-EXPIRED": [403, "The grant has expired."],
  "AGENT-GRANT-REVOKED": [403, "The grant was revoked."],
  "AGENT-GRANT-SCOPE": [403, "The grant does not carry the send scope."],
  "AGENT-BOX-HASH": [400, "box_sha256 does not match the sealed box."],
  "AGENT-CARRIER-ABSENT": [503, "That radio carrier is not present at this relay. The Worker is the internet relay only."],
  "AGENT-RATE": [429, "Rate limit reached for this agent, owner, visitor, or for the subnet. Try again in a minute."],
  "AGENT-MAILBOX-FULL": [409, "The receiver's mailbox is full. It must pull and ack first."],
  "AGENT-RECEIPT-UNAVAILABLE": [503, "The receipt could not be sealed, so nothing was done. No receipt, no message."],
  "AGENT-RECEIPT-CAP": [503, "The receipt seal cap for this minute is reached, so nothing was done."],
  "AGENT-STORE-UNBOUND": [503, "The durable store is not bound in this isolate. Nothing was done."],
  "AGENT-SALT-LOST": [503, "The subnet salt is missing while receipts exist. Refusing rather than minting a new one."],
  "AGENT-CHALLENGE": [403, "The view challenge is missing, expired, already used, or not for this scope and key."],
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
  receipts_encrypted: false,
  operator_can_read_salt: true,
  operator_sees_queued_sender: true,
  forward_secrecy: false,
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
const sealMemo = { minute: -1, used: { msg: 0, rider: 0, ctl: 0, refuse: 0 }, full: new Set(), refusals: new Map() };
export function _resetAgentMemo() { sealMemo.minute = -1; sealMemo.used = { msg: 0, rider: 0, ctl: 0, refuse: 0 }; sealMemo.full = new Set(); sealMemo.refusals = new Map(); }
/** Per-isolate caches keyed by the CHAINLOCK binding (one entry per deployment; tests get fresh envs). */
const saltCache = new WeakMap();
const viewCache = new WeakMap();
function cacheBag(env) {
  const k = env && env.CHAINLOCK;
  if (!k || typeof k !== "object") return null;
  if (!viewCache.has(k)) viewCache.set(k, {});
  return viewCache.get(k);
}
async function cached(env, name, fn) {
  const bag = cacheBag(env);
  const hit = bag && bag[name];
  if (hit && now() - hit.at < AGENT_CACHE_MS && now() >= hit.at) return hit.value;
  const value = await fn();
  if (bag && value) bag[name] = { at: now(), value };
  return value;
}
export function _resetAgentCaches(env) { const k = env && env.CHAINLOCK; if (k && typeof k === "object") { saltCache.delete(k); viewCache.delete(k); } }
function memoMinute() {
  const m = Math.floor(now() / 60000);
  if (sealMemo.minute !== m) { sealMemo.minute = m; sealMemo.used = { msg: 0, rider: 0, ctl: 0, refuse: 0 }; sealMemo.full = new Set(); sealMemo.refusals = new Map(); }
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
/** One op on the agent state Durable Object. Throws when it is not reachable (callers fail closed). */
async function state(env, op, args = {}) {
  const store = await chainStoreOf(env);
  if (!store || typeof store._json !== "function") throw new Error("agent state unbound");
  const out = await store._json(AGENT_STATE_OBJECT, AGENT_STATE_PATH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, ...args }) });
  if (!out || typeof out !== "object" || out.error) throw new Error("agent state error");
  return out;
}
async function kvGetJson(kv, key) {
  try { const raw = await kv.get(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function kvPutJson(kv, key, value, ttlS) {
  await kv.put(key, JSON.stringify(value), ttlS ? { expirationTtl: Math.max(60, Math.floor(ttlS)) } : undefined);
}

/**
 * The limiter key of a visitor IP: IPv4 as is, IPv6 cut to its /64 (one subscriber usually holds a whole
 * /64, so the full address would let one caller rotate buckets). Peers use the same rule.
 */
export function agentIpKey(ip) {
  const raw = String(ip || "").trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (!raw.includes(":")) return raw;
  let [head, tail] = raw.includes("::") ? raw.split("::") : [raw, null];
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  if (t.length && t[t.length - 1].includes(".")) t.splice(t.length - 1, 1, "0", "0"); // embedded IPv4 (low 32 bits)
  const fill = tail === null ? [] : Array(Math.max(0, 8 - h.length - t.length)).fill("0");
  const full = [...h, ...fill, ...t].slice(0, 8).map((x) => (parseInt(x || "0", 16) || 0).toString(16));
  return full.slice(0, 4).join(":") + "::/64";
}
/** sha256("agent-ip|" + agentIpKey(ip))[:32]: the hashed visitor key for the agent limits. */
export async function agentIpHash(ip) {
  return (await sha256Hex("agent-ip|" + agentIpKey(ip))).slice(0, 32);
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

/**
 * The subnet salt: created once in the state DO. If it is missing while agentcomms already has rows,
 * refuse (AGENT-SALT-LOST) instead of minting a new one that would orphan every hashed id.
 * The operator can read it (it sits in the operator's Durable Object), so hashed ids protect against the
 * public, not against the operator.
 */
async function subnetSalt(env) {
  const key = env && env.CHAINLOCK && typeof env.CHAINLOCK === "object" ? env.CHAINLOCK : null;
  const hit = key ? saltCache.get(key) : null;
  if (hit) return { salt: hit };
  const out = await subnetSaltFromState(env);
  if (out.salt && key) saltCache.set(key, out.salt);
  return out;
}
async function subnetSaltFromState(env) {
  const got = await state(env, "salt");
  if (got.salt && HEX64.test(got.salt)) return { salt: got.salt };
  const rows = await chainRows(env);
  if (!rows) return { refuse: "AGENT-STORE-UNBOUND" };
  if (rows.length > 0) return { refuse: "AGENT-SALT-LOST" };
  const made = await state(env, "salt", { create: true });
  return made.salt && HEX64.test(made.salt) ? { salt: made.salt } : { refuse: "AGENT-STORE-UNBOUND" };
}
async function hid(salt, id) {
  return (await sha256Hex(`${AGENT_SPEC}|${salt}|${String(id)}`)).slice(0, 32);
}
const hexOf = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hmacHex(saltHex, msg) {
  const key = await crypto.subtle.importKey("raw", Uint8Array.from(saltHex.match(/../g).map((x) => parseInt(x, 16))), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hexOf(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
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
/**
 * Seal one agentcomms receipt. Classes (msg: send, rider: deliver/read, ctl: register/grant/revoke/retire,
 * refuse) each have their own share, so refusal spam can't starve real messages. The writer DO holds the
 * true caps (AGENTCOMM_CAP, incl. a per-agent cap on refuse rows); this isolate keeps a backstop per class
 * and a "class full until the end of this minute" memo. Only real write failures give a slot back.
 */
async function sealComm(env, rec, idem, capKeys = null) {
  const store = await chainStoreOf(env);
  if (!store) return { sealed: false, status: "unavailable", code: "AGENT-RECEIPT-UNAVAILABLE" };
  memoMinute();
  const cls = agentCommClass(rec.kind);
  if (sealMemo.full.has(cls)) return { sealed: false, status: "rate_limited", code: "AGENT-RECEIPT-CAP", cap_class: cls, memo: true };
  if (sealMemo.used[cls] >= AGENT_SEAL_CAP_PER_MIN[cls]) return { sealed: false, status: "rate_limited", code: "AGENT-RECEIPT-CAP", cap_class: cls };
  sealMemo.used[cls]++;
  const refund = () => { if (sealMemo.used[cls] > 0) sealMemo.used[cls]--; };
  const body = { spec: AGENT_SPEC, ...rec };
  const rh = await sha256Hex(canonicalize(body));
  const { append } = await import("./chainlock/ops.js");
  try {
    const out = await append(store, {
      c: AGENT_CHAIN,
      k: "agentcomm",
      s: "agentcomm",
      f: `agent receipt r=${rh.slice(0, 16)}. Hashes only.`,
      agentcomm: body,
      // Fair-share keys for the writer's caps (salted hashes); not part of the stamped row.
      ...(capKeys ? { agentcap: capKeys } : {}),
      idempotency_key: "agentcomm:" + (await sha256Hex(idem)).slice(0, 40),
    }, { internal: true });
    if (out && out.refuse === "agentcomm-cap") {
      if (out.cap_limit === "class" || out.cap_limit === "total") {
        if (out.cap_limit === "total") for (const c of ["msg", "ctl", "refuse"]) sealMemo.full.add(c);
        else sealMemo.full.add(out.cap_class || cls);
      }
      return { sealed: false, status: "rate_limited", code: "AGENT-RECEIPT-CAP", cap_class: out.cap_class || cls, cap_limit: out.cap_limit || null };
    }
    if (!out || !out.ok || !out.stamp || !out.stamp.agentcomm) { refund(); return { sealed: false, status: "unavailable", code: "AGENT-RECEIPT-UNAVAILABLE" }; }
    return {
      spec: AGENT_SPEC, sealed: true, status: "sealed", kind: rec.kind, chain: AGENT_CHAIN, seq: out.seq + 1,
      h: out.stamp.stamp_sha256, r: rh, replayed: Boolean(out.replayed),
      lattice: out.lattice ? { primary: out.lattice.primary, secondary: out.lattice.secondary } : null,
      verify: `/v1/anchor/row?c=${AGENT_CHAIN}&seq=${out.seq + 1}`,
    };
  } catch {
    refund();
    return { sealed: false, status: "unavailable", code: "AGENT-RECEIPT-UNAVAILABLE" };
  }
}

async function sealAgentRefusal(env, code, verb, via = "mcp") {
  const [status, reason] = AGENT_CODES[code] || AGENT_CODES["AGENT-BAD-INPUT"];
  const minute = memoMinute();
  // via: "rest" (HTTP /v1/mesh/agents/*) spends the #302 rest share; FragGate/MCP spends the mcp share.
  const door = via === "rest" ? "rest" : "mcp";
  const key = `${code}|${verb}|${door}`;
  if (sealMemo.refusals.has(key)) return { ...sealMemo.refusals.get(key), replayed: true, memo: true };
  const store = await chainStoreOf(env);
  if (!store) return { kind: "refusal", sealed: false, status: "unavailable", reason: "no durable store in this isolate" };
  const { sealRefusal } = await import("./receipt-guard.js");
  // Same as refusal-doors: reason:null on the row, only the hash of the fixed reason text.
  const view = await sealRefusal(store, {
    code, tool: "mesh", slug: "agent-subnet", op: verb, args: { door: "mesh-agents", code, verb, via: door }, minuteBucket: minute,
    extra: { kind: "refusal", surface: "agent-subnet", via: door, door: "mesh-agents", reason: null, reason_sha256: await sha256Hex(reason), status, route: `/v1/mesh/agents/${verb.replace(/^agent-/, "")}` },
  });
  const out = { ...view, kind: "refusal", code, surface: "agent-subnet", status: view && view.sealed ? "sealed" : (view && view.status) || "unavailable" };
  if (out.sealed) sealMemo.refusals.set(key, out);
  return out;
}

/** A refusal: sealed on `refusals`; when the caller proved its signature, also a `refuse` row on agentcomms. */
async function refuseAgent(env, code, verb, { salt = null, agentId = null, extra = {}, via = "mcp" } = {}) {
  const [status, message] = AGENT_CODES[code] || AGENT_CODES["AGENT-BAD-INPUT"];
  const refusal_receipt = await sealAgentRefusal(env, code, verb, via);
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
  const s = await subnetSalt(env);
  if (s.refuse) return { refuse: s.refuse };
  const statement = unsignedOf(body, shape);
  const statement_hash = await sha256Hex(canonicalize(statement));
  return { body, kv, salt: s.salt, statement, statement_hash, t };
}
/** Replay protection in the state DO (atomic check-and-set). */
async function markSeen(env, hash) {
  const out = await state(env, "seen", { key: "st:" + hash, ttl_ms: AGENT_SEEN_TTL_S * 1000 });
  return out.ok === true && out.fresh === true;
}
async function loadAgentState(env, id) {
  const h = canonicalHandle(id);
  if (!h) return { agent: null, retired: false };
  const out = await state(env, "agent", { id: h });
  return { agent: out.agent || null, retired: Boolean(out.retired) };
}
async function loadAgent(env, id) {
  return (await loadAgentState(env, id)).agent;
}
/** Is this grant usable right now? Re-read from the state DO (send AND pull). */
async function grantUsable(env, grantId, fromId, toId) {
  const v = await state(env, "grant_get", { grant_id: String(grantId || "") });
  const g = v.grant;
  if (!g || g.from !== fromId || g.to !== toId) return { code: "AGENT-NO-GRANT" };
  if (v.revoked || g.revoked_at) return { code: "AGENT-GRANT-REVOKED" };
  if (v.retired_from || v.retired_to) return { code: "AGENT-RETIRED" };
  if (!(Date.parse(g.expires_at) > now())) return { code: "AGENT-GRANT-EXPIRED" };
  if (!Array.isArray(g.scopes) || !g.scopes.includes("send")) return { code: "AGENT-GRANT-SCOPE" };
  return { ok: true, grant: g };
}
async function mailboxPrefix(salt, agentId) {
  return KV + "box|" + (await hid(salt, "mailbox|" + agentId)) + "|";
}
/** Drop queued boxes in one mailbox that match a predicate (bounded by the mailbox cap). */
async function sweepMailbox(env, kv, salt, agentId, pred) {
  let dropped = 0;
  try {
    const listed = await kv.list({ prefix: await mailboxPrefix(salt, agentId), limit: AGENT_MAILBOX_CAP + 1 });
    for (const k of (listed && listed.keys) || []) {
      const row = await kvGetJson(kv, k.name);
      if (!row || pred(row)) { try { await kv.delete(k.name); dropped++; } catch { /* TTL */ } }
    }
  } catch { /* boxes still expire on TTL and are rechecked at pull */ }
  return dropped;
}

// ---------- ops ----------
async function opRegister(env, src, meta = {}) {
  const verb = "agent-register";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb, { via: meta.via });
  const { body, salt, statement, statement_hash } = p;
  const agentId = canonicalHandle(body.agent_id);
  if (!agentId || typeof body.public_key !== "string" || typeof body.enc_public_key !== "string" || typeof body.owner_public_key !== "string") return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  const enc = b64urlToBytes(body.enc_public_key);
  if (!enc || enc.length !== 32) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  if (body.discoverable !== undefined && typeof body.discoverable !== "boolean") return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  const caps = body.caps === undefined ? [] : body.caps;
  if (!Array.isArray(caps) || caps.length > AGENT_CAPS.length || caps.some((c) => !AGENT_CAPS.includes(c))) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  if ((await handleOf(body.public_key)) !== agentId) return refuseAgent(env, "AGENT-ID-MISMATCH", verb, { via: meta.via });
  const ownerId = await handleOf(body.owner_public_key);
  if (!ownerId) return refuseAgent(env, "AGENT-ID-MISMATCH", verb, { via: meta.via });
  if (!(await sigOk(body.public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb, { via: meta.via });
  if (!(await sigOk(body.owner_public_key, statement, body.owner_sig))) return refuseAgent(env, "AGENT-OWNER-SIG", verb, { via: meta.via });
  // Per owner key, per visitor IP hash (owner keys are free, so the IP bucket is what bounds one caller),
  // and for the whole subnet; all three in the state DO, charged together or not at all.
  const ipKey = meta && IPH_RE.test(String(meta.ip_h || "")) ? String(meta.ip_h) : "none";
  const slots = [
    { key: "reg_owner:" + ownerId, limit: AGENT_REGISTER_PER_OWNER_PER_MIN },
    { key: "reg_ip:" + ipKey, limit: AGENT_REGISTER_PER_IP_PER_MIN },
    { key: "reg_all", limit: AGENT_REGISTER_PER_MIN },
  ];
  if ((await state(env, "rate", { slots })).ok !== true) return refuseAgent(env, "AGENT-RATE", verb, { via: meta.via });
  if (!(await markSeen(env, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, { via: meta.via });
  const row = { agent_id: agentId, public_key: body.public_key, enc_public_key: body.enc_public_key, owner_id: ownerId, owner_public_key: body.owner_public_key, discoverable: body.discoverable === true, caps, registered_at: new Date(now()).toISOString() };
  const reg = await state(env, "register", { row, owner_cap: AGENT_OWNER_CAP });
  if (!reg.ok) return refuseAgent(env, reg.code || "AGENT-STORE-UNBOUND", verb, { via: meta.via });
  const agent_h = await hid(salt, agentId);
  const receipt = await sealComm(env, { kind: "register", agent_h, owner_h: await hid(salt, ownerId), sig_verdict: "verified", discoverable: body.discoverable === true }, `register|${agentId}`);
  if (!receipt.sealed) {
    await state(env, "unregister", { id: agentId }).catch(() => null); // no receipt, no agent
    return refuseAgent(env, receipt.code || "AGENT-RECEIPT-UNAVAILABLE", verb, { via: meta.via });
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, agent_id: agentId, discoverable: row.discoverable, caps, receipt, ...AGENT_HONEST };
}

async function opGrant(env, src, meta = {}) {
  const verb = "agent-grant";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb, { via: meta.via });
  const { body, salt, statement, statement_hash } = p;
  const fs = await loadAgentState(env, body.from);
  const ts = await loadAgentState(env, body.to);
  const from = fs.agent;
  const to = ts.agent;
  if (!from || !to) return refuseAgent(env, "AGENT-UNKNOWN", verb, { via: meta.via });
  if (fs.retired || ts.retired) return refuseAgent(env, "AGENT-RETIRED", verb, { via: meta.via });
  if (from.agent_id === to.agent_id) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  if (!Array.isArray(body.scopes) || body.scopes.length !== 1 || body.scopes[0] !== "send") return refuseAgent(env, "AGENT-GRANT-SCOPE", verb, { via: meta.via });
  const exp = Date.parse(String(body.expires_at || ""));
  if (!Number.isFinite(exp) || exp <= now() || exp - now() > AGENT_GRANT_MAX_MS) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  if (!(await sigOk(to.owner_public_key, statement, body.owner_sig_to))) return refuseAgent(env, "AGENT-OWNER-SIG", verb, { via: meta.via });
  const cross = from.owner_id !== to.owner_id;
  if (cross && !(await sigOk(from.owner_public_key, statement, body.owner_sig_from))) return refuseAgent(env, "AGENT-OWNER-SIG", verb, { via: meta.via });
  if (!(await markSeen(env, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, { via: meta.via });
  const grant_id = statement_hash;
  // Never overwrite: an existing grant (or a revocation tombstone) for this id refuses.
  const added = await state(env, "grant_add", { grant: { grant_id, from: from.agent_id, to: to.agent_id, scopes: ["send"], expires_at: new Date(exp).toISOString(), cross_owner: cross } });
  if (!added.ok) return refuseAgent(env, added.code || "AGENT-STORE-UNBOUND", verb, { via: meta.via });
  const grant_h = await hid(salt, grant_id);
  const receipt = await sealComm(env, {
    kind: "grant", grant_h, from_h: await hid(salt, from.agent_id), to_h: await hid(salt, to.agent_id),
    owner_pair_h: await hid(salt, [from.owner_id, to.owner_id].sort().join("|")), cross_owner: cross, scopes: ["send"],
    expires_day: new Date(exp).toISOString().slice(0, 10), sig_verdict: "verified",
  }, `grant|${grant_id}`);
  if (!receipt.sealed) {
    await state(env, "grant_undo", { grant_id }).catch(() => null); // no receipt, no grant
    return refuseAgent(env, receipt.code || "AGENT-RECEIPT-UNAVAILABLE", verb, { via: meta.via });
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, grant_id, cross_owner: cross, owners_signed: cross ? 2 : 1, expires_at: new Date(exp).toISOString(), receipt, ...AGENT_HONEST };
}

async function opRevoke(env, src, meta = {}) {
  const verb = "agent-revoke";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb, { via: meta.via });
  const { body, kv, salt, statement, statement_hash } = p;
  if (!HEX64.test(String(body.grant_id || ""))) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  // The signing key is in the statement: check the signature before any state lookup.
  const by = await handleOf(body.by_owner_public_key);
  if (!by || !(await sigOk(body.by_owner_public_key, statement, body.owner_sig))) return refuseAgent(env, "AGENT-OWNER-SIG", verb, { via: meta.via });
  const v = await state(env, "grant_get", { grant_id: body.grant_id });
  const grant = v.grant;
  if (!grant) return refuseAgent(env, "AGENT-NO-GRANT", verb, { via: meta.via });
  const from = await loadAgent(env, grant.from);
  const to = await loadAgent(env, grant.to);
  if (!from || !to || (by !== from.owner_id && by !== to.owner_id)) return refuseAgent(env, "AGENT-OWNER-SIG", verb, { via: meta.via });
  if (!(await markSeen(env, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, { via: meta.via });
  const rec = { kind: "revoke", grant_h: await hid(salt, grant.grant_id), from_h: await hid(salt, grant.from), to_h: await hid(salt, grant.to), by_h: await hid(salt, by), sig_verdict: "verified" };
  if (v.revoked || grant.revoked_at) {
    // Already dead. Re-seal the (idempotent) revoke receipt in case the first seal did not land.
    const again = await sealComm(env, rec, `revoke|${grant.grant_id}`);
    return refuseAgent(env, "AGENT-GRANT-REVOKED", verb, { via: meta.via, extra: { receipt: again } });
  }
  // Fail safe (AZBot N3): set the permanent tombstone FIRST, then sweep the queue, then seal the receipt.
  // A pull that races this sees the tombstone and drops; a failed seal never leaves a live grant.
  const done = await state(env, "revoke", { grant_id: grant.grant_id, by: await hid(salt, by), why: "owner" });
  if (!done.ok) return refuseAgent(env, done.code || "AGENT-STORE-UNBOUND", verb, { via: meta.via });
  const dropped = await sweepMailbox(env, kv, salt, grant.to, (row) => row.statement && row.statement.grant_id === grant.grant_id);
  const receipt = await sealComm(env, rec, `revoke|${grant.grant_id}`);
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, grant_id: grant.grant_id, revoked: true, queued_dropped: dropped, receipt, receipt_pending: !receipt.sealed, ...AGENT_HONEST };
}

/** Owner-signed retire: the agent is dead for good, and every grant it had is revoked at once. */
async function opRetire(env, src, meta = {}) {
  const verb = "agent-retire";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb, { via: meta.via });
  const { body, kv, salt, statement, statement_hash } = p;
  // The owner key is in the statement: check the signature before any state lookup.
  const by = await handleOf(body.owner_public_key);
  if (!by || !(await sigOk(body.owner_public_key, statement, body.owner_sig))) return refuseAgent(env, "AGENT-OWNER-SIG", verb, { via: meta.via });
  const s = await loadAgentState(env, body.agent_id);
  const agent = s.agent;
  if (!agent) return refuseAgent(env, "AGENT-UNKNOWN", verb, { via: meta.via });
  if (by !== agent.owner_id || body.owner_public_key !== agent.owner_public_key) return refuseAgent(env, "AGENT-OWNER-SIG", verb, { via: meta.via });
  if (!(await markSeen(env, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, { via: meta.via });
  const rec = { kind: "retire", agent_h: await hid(salt, agent.agent_id), owner_h: await hid(salt, agent.owner_id), sig_verdict: "verified" };
  if (s.retired) {
    const again = await sealComm(env, rec, `retire|${agent.agent_id}`);
    return refuseAgent(env, "AGENT-RETIRED", verb, { via: meta.via, extra: { receipt: again } });
  }
  // Fail safe: retired + every grant tombstoned FIRST, then the queue swept, then the receipt sealed.
  const done = await state(env, "retire", { agent_id: agent.agent_id });
  if (!done.ok) return refuseAgent(env, done.code || "AGENT-STORE-UNBOUND", verb, { via: meta.via });
  const dropped = await sweepMailbox(env, kv, salt, agent.agent_id, () => true);
  const receipt = await sealComm(env, rec, `retire|${agent.agent_id}`);
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, agent_id: agent.agent_id, retired: true, grants_revoked: done.grants_revoked, queued_dropped: dropped, receipt, receipt_pending: !receipt.sealed, ...AGENT_HONEST };
}

export function pickCarrier(raw) {
  const c = String(raw == null ? "auto" : raw).trim().toLowerCase();
  if (AGENT_RADIO_CARRIERS.includes(c)) return { ok: false, carrier: c, absent_code: "QNM-RADIO-ABSENT" };
  if (c === AGENT_INTERNET_CARRIER) return { ok: true, carrier: AGENT_INTERNET_CARRIER, fallback: false };
  if (c === "auto") return { ok: true, carrier: AGENT_INTERNET_CARRIER, fallback: true, tried: AGENT_RADIO_CARRIERS.map((id) => ({ id, present: false })) };
  return { ok: false, bad: true };
}

async function opSend(env, src, meta = {}) {
  const verb = "agent-send";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb, { via: meta.via });
  const { body, kv, salt, statement, statement_hash } = p;
  const box = body.box;
  if (!box || typeof box !== "object" || Array.isArray(box)) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  for (const k of Object.keys(box)) if (!BOX_KEYS.includes(k)) return refuseAgent(env, "AGENT-PLAINTEXT-FIELD", verb, { via: meta.via });
  if (!AGENT_ALGS.includes(box.alg) || box.alg !== body.alg) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  const fs = await loadAgentState(env, body.from);
  const from = fs.agent;
  if (!from) return refuseAgent(env, "AGENT-UNKNOWN", verb, { via: meta.via });
  if (!(await sigOk(from.public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb, { via: meta.via });
  // From here the sender proved its key: refusals also get a hashed `refuse` row it can see.
  const who = { salt, agentId: from.agent_id };
  if (fs.retired) return refuseAgent(env, "AGENT-RETIRED", verb, { ...who, via: meta.via });
  if ((await sha256Hex(canonicalize(box))) !== body.box_sha256) return refuseAgent(env, "AGENT-BOX-HASH", verb, { ...who, via: meta.via });
  const ct = b64urlToBytes(box.ciphertext);
  if (!ct || ct.length < AGENT_CT_MIN || ct.length > AGENT_CT_MAX) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { ...who, via: meta.via });
  if (typeof box.eph_public_key !== "string" || typeof box.nonce !== "string") return refuseAgent(env, "AGENT-BAD-INPUT", verb, { ...who, via: meta.via });
  if (printableRatio(ct) >= 0.9) return refuseAgent(env, "AGENT-PLAINTEXT-SUSPECT", verb, { ...who, via: meta.via });
  const to = await loadAgent(env, body.to);
  if (!to) return refuseAgent(env, "AGENT-UNKNOWN", verb, { ...who, via: meta.via });
  const gu = await grantUsable(env, body.grant_id, from.agent_id, to.agent_id);
  if (!gu.ok) return refuseAgent(env, gu.code, verb, { ...who, via: meta.via });
  const grant = gu.grant;
  const carrier = pickCarrier(body.carrier);
  if (carrier.bad) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { ...who, via: meta.via });
  if (!carrier.ok) return refuseAgent(env, "AGENT-CARRIER-ABSENT", verb, { ...who, via: meta.via, extra: { carrier: carrier.carrier, absent_code: carrier.absent_code, order: D2D_ORDER_ARROW, fallback: AGENT_INTERNET_CARRIER } });
  if (!(await rate(env, "agent_send", from.agent_id, AGENT_SEND_PER_MIN)) || !(await rate(env, "agent_global", "all", AGENT_GLOBAL_PER_MIN))) return refuseAgent(env, "AGENT-RATE", verb, { ...who, via: meta.via });
  if (!(await markSeen(env, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, { ...who, via: meta.via });
  const prefix = await mailboxPrefix(salt, to.agent_id);
  const listed = await kv.list({ prefix, limit: AGENT_MAILBOX_CAP + 1 });
  if (((listed && listed.keys) || []).length >= AGENT_MAILBOX_CAP) return refuseAgent(env, "AGENT-MAILBOX-FULL", verb, { ...who, via: meta.via });
  const msg_id = statement_hash;
  const boxKey = prefix + msg_id;
  // Stored: the signed statement without `to` (the mailbox key is a salted hash of the recipient; the
  // recipient knows itself), the sender id (needed to verify the signature and open the box), the box.
  const { to: _to, ...stored } = statement;
  await kvPutJson(kv, boxKey, { msg_id, statement: { ...stored, sig: body.sig }, box, stored_at: now() }, AGENT_BOX_TTL_MS / 1000);
  const owner_pair_h = await hid(salt, [from.owner_id, to.owner_id].sort().join("|"));
  // Fair share (AZBot N1): the writer caps sends per sending visitor and per owner pair. The visitor key is a
  // salted hash of the (already hashed, IPv6 /64) visitor IP; it rides beside the row, never in it.
  const ipKey = meta && IPH_RE.test(String(meta.ip_h || "")) ? String(meta.ip_h) : "none";
  const capKeys = { ip: await hid(salt, "ip|" + ipKey), pair: owner_pair_h };
  const receipt = await sealComm(env, {
    kind: "send", msg_id, ct_sha256: await sha256Hex(ct), from_h: await hid(salt, from.agent_id), to_h: await hid(salt, to.agent_id),
    owner_pair_h, cross_owner: from.owner_id !== to.owner_id,
    size_bucket: sizeBucket(ct.length), sig_verdict: "verified", carrier: carrier.carrier, fallback: carrier.fallback, grant_h: await hid(salt, grant.grant_id),
  }, `send|${msg_id}`, capKeys);
  if (!receipt.sealed) {
    try { await kv.delete(boxKey); } catch { /* the box expires on its own TTL */ }
    return refuseAgent(env, receipt.code || "AGENT-RECEIPT-UNAVAILABLE", verb, { via: meta.via, extra: receipt.cap_limit ? { cap_class: receipt.cap_class, cap_limit: receipt.cap_limit } : {} });
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, msg_id, carrier: carrier.carrier, fallback: carrier.fallback, carrier_order: D2D_ORDER_ARROW, stored: true, expires_in_s: AGENT_BOX_TTL_MS / 1000, receipt, ...AGENT_HONEST };
}

async function opPull(env, src, meta = {}) {
  const verb = "agent-pull";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb, { via: meta.via });
  const { body, kv, salt, statement, statement_hash } = p;
  const ms = await loadAgentState(env, body.agent_id);
  const me = ms.agent;
  if (!me) return refuseAgent(env, "AGENT-UNKNOWN", verb, { via: meta.via });
  if (!(await sigOk(me.public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb, { via: meta.via });
  const who = { salt, agentId: me.agent_id };
  if (ms.retired) return refuseAgent(env, "AGENT-RETIRED", verb, { ...who, via: meta.via });
  if (!(await rate(env, "agent_read", me.agent_id, AGENT_READ_PER_MIN))) return refuseAgent(env, "AGENT-RATE", verb, { ...who, via: meta.via });
  if (!(await markSeen(env, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, { ...who, via: meta.via });
  const listed = await kv.list({ prefix: await mailboxPrefix(salt, me.agent_id), limit: AGENT_MAILBOX_CAP });
  const messages = [];
  let withheld = 0;
  const dropped = {};
  for (const k of (listed && listed.keys) || []) {
    if (messages.length >= AGENT_PULL_MAX) break;
    const row = await kvGetJson(kv, k.name);
    if (!row || now() - Number(row.stored_at || 0) > AGENT_BOX_TTL_MS) continue;
    const st = { ...(row.statement || {}), to: me.agent_id };
    // Recheck the grant (and both agents' retired state) at pull: revoked means dropped, not delivered.
    const gu = await grantUsable(env, st.grant_id, st.from, me.agent_id);
    if (!gu.ok) {
      try { await kv.delete(k.name); } catch { /* TTL */ }
      dropped[gu.code] = (dropped[gu.code] || 0) + 1;
      continue;
    }
    const sender = await loadAgent(env, st.from);
    const ct = b64urlToBytes(row.box && row.box.ciphertext) || new Uint8Array(0);
    const receipt = await sealComm(env, {
      kind: "deliver", msg_id: row.msg_id, ct_sha256: await sha256Hex(ct), from_h: await hid(salt, st.from), to_h: await hid(salt, me.agent_id),
      cross_owner: Boolean(sender && sender.owner_id !== me.owner_id), size_bucket: sizeBucket(ct.length), sig_verdict: "verified", carrier: AGENT_INTERNET_CARRIER,
    }, `deliver|${row.msg_id}`);
    if (!receipt.sealed) { withheld++; continue; } // no receipt, no delivery
    messages.push({ msg_id: row.msg_id, statement: st, sender_public_key: sender ? sender.public_key : null, box: row.box, receipt });
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, agent_id: me.agent_id, count: messages.length, withheld_no_receipt: withheld, dropped_not_granted: dropped, messages, verify_note: "Verify each statement.sig against sender_public_key yourself, check box_sha256, then open the box with your own key. The relay never opens it.", ...AGENT_HONEST };
}

async function opAck(env, src, meta = {}) {
  const verb = "agent-ack";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb, { via: meta.via });
  const { body, kv, salt, statement, statement_hash } = p;
  const ms = await loadAgentState(env, body.agent_id);
  const me = ms.agent;
  if (!me) return refuseAgent(env, "AGENT-UNKNOWN", verb, { via: meta.via });
  if (!(await sigOk(me.public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb, { via: meta.via });
  const who = { salt, agentId: me.agent_id };
  if (ms.retired) return refuseAgent(env, "AGENT-RETIRED", verb, { ...who, via: meta.via });
  const acks = body.acks;
  if (!Array.isArray(acks) || acks.length < 1 || acks.length > AGENT_PULL_MAX || acks.some((a) => !a || !HEX64.test(String(a.msg_id || "")) || !["verified", "failed"].includes(a.verdict) || Object.keys(a).some((k) => k !== "msg_id" && k !== "verdict"))) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { ...who, via: meta.via });
  if (!(await rate(env, "agent_read", me.agent_id, AGENT_READ_PER_MIN))) return refuseAgent(env, "AGENT-RATE", verb, { ...who, via: meta.via });
  if (!(await markSeen(env, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, { ...who, via: meta.via });
  const prefix = await mailboxPrefix(salt, me.agent_id);
  const done = [];
  for (const a of acks) {
    const key = prefix + a.msg_id;
    const row = await kvGetJson(kv, key);
    if (!row) { done.push({ msg_id: a.msg_id, read: false, reason: "not in this mailbox" }); continue; }
    const from = row.statement && row.statement.from;
    const sender = await loadAgent(env, from);
    const ct = b64urlToBytes(row.box && row.box.ciphertext) || new Uint8Array(0);
    const receipt = await sealComm(env, {
      kind: "read", msg_id: a.msg_id, ct_sha256: await sha256Hex(ct), from_h: await hid(salt, from), to_h: await hid(salt, me.agent_id),
      cross_owner: Boolean(sender && sender.owner_id !== me.owner_id), size_bucket: sizeBucket(ct.length), sig_verdict: "verified", recipient_verdict: a.verdict,
    }, `read|${a.msg_id}`);
    if (!receipt.sealed) { done.push({ msg_id: a.msg_id, read: false, reason: "receipt not sealed; box kept" }); continue; }
    try { await kv.delete(key); } catch { /* expires on TTL */ }
    done.push({ msg_id: a.msg_id, read: true, verdict: a.verdict, receipt });
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, agent_id: me.agent_id, acks: done, ciphertext_deleted: done.filter((d) => d.read).length, ...AGENT_HONEST };
}

// ---------- viewer ----------
const SCOPES = Object.freeze(["agent", "owner"]);
/**
 * A view challenge is bound to one scope and one subject key: HMAC-SHA256(salt, scope|subject|exp|rand).
 * It is single-use (consumed in the state DO) and expires in two minutes.
 */
export async function makeChallenge(env, params = {}) {
  if (!kvOf(env) || !env.CHAINLOCK) return { ok: false, code: "AGENT-STORE-UNBOUND" };
  const scope = String(params.scope || "");
  const subject = await handleOf(String(params.subject_public_key || ""));
  if (!SCOPES.includes(scope) || !subject) return { ok: false, code: "AGENT-BAD-INPUT" };
  let s;
  try { s = await subnetSalt(env); } catch { return { ok: false, code: "AGENT-STORE-UNBOUND" }; }
  if (s.refuse) return { ok: false, code: s.refuse };
  const exp = now() + AGENT_CHALLENGE_TTL_MS;
  const rand = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const mac = (await hmacHex(s.salt, `${AGENT_SPEC}|challenge|${scope}|${subject}|${exp}|${rand}`)).slice(0, 32);
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, scope, challenge: `${exp}.${rand}.${mac}`, expires_at: new Date(exp).toISOString(), single_use: true, sign: "Sign {v,kind:'agent-view',scope,subject_public_key,challenge,t,nonce} with that same key (same scope); POST it to /v1/mesh/agents/receipts." };
}
async function challengeOk(salt, ch, scope, subject) {
  const m = /^(\d{13})\.([a-f0-9]{24})\.([a-f0-9]{32})$/.exec(String(ch || ""));
  if (!m) return false;
  const exp = Number(m[1]);
  if (!(exp > now() && exp - now() <= AGENT_CHALLENGE_TTL_MS)) return false;
  const want = (await hmacHex(salt, `${AGENT_SPEC}|challenge|${scope}|${subject}|${exp}|${m[2]}`)).slice(0, 32);
  return want === m[3];
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
/** Exact counts (internal and tests). The public only ever sees bucket() of these, refreshed hourly. */
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
/** Under 10 shows "<10"; otherwise rounded down to tens ("40+"). */
export function bucket(n) {
  const x = Math.max(0, Math.floor(Number(n) || 0));
  return x < AGENT_PUBLIC_K ? `<${AGENT_PUBLIC_K}` : `${Math.floor(x / 10) * 10}+`;
}
export function bucketedAggregate(rows) {
  const a = aggregate(rows);
  return { total: bucket(a.total), by_kind: Object.fromEntries(Object.entries(a.by_kind).map(([k, v]) => [k, bucket(v)])), e2e_verified_observed: bucket(a.e2e_verified_observed) };
}
/**
 * The hourly public snapshot (state DO). Counts are bucketed; the tip is the tip at snapshot time.
 * Polling more often shows nothing new, so single events can't be timed from here.
 */
async function publicSnapshot(env) {
  const hour = Math.floor(now() / AGENT_PUBLIC_REFRESH_MS);
  const bag = cacheBag(env);
  const hit = bag && bag.pub;
  if (hit && Number(hit.value.hour) === hour && now() - hit.at < AGENT_CACHE_MS && now() >= hit.at) return hit.value;
  const snap = await publicSnapshotFromState(env, hour);
  if (bag && snap) bag.pub = { at: now(), value: snap };
  return snap;
}
async function publicSnapshotFromState(env, hour) {
  const got = await state(env, "pub_get");
  if (got.snapshot && Number(got.snapshot.hour) === hour) return got.snapshot;
  const rows = await chainRows(env);
  if (!rows) return null;
  const snap = { hour, as_of: new Date(hour * AGENT_PUBLIC_REFRESH_MS).toISOString(), ...bucketedAggregate(rows), tip: tipOf(rows) };
  const put = await state(env, "pub_put", { snapshot: snap });
  return put.snapshot || snap;
}
const PUBLIC_NOTE = "Counts are refreshed once an hour and bucketed to tens; anything under 10 shows as \"<10\". The tip is that hour's tip hash (no row number).";
/** The public form of a snapshot: no hour key, and the tip without its exact row number (AZBot N5). */
function publicOfSnapshot(snap) {
  const { hour, tip, ...rest } = snap;
  return { ...rest, tip: tip ? { h: tip.h, lattice: tip.lattice, seq: bucket(tip.seq) } : null };
}
/**
 * The hourly tip WITH its exact row number, for the witness heads (/v1/anchor/heads), the public row pages
 * (/v1/anchor/rows and /row stop at it) and the AZ-OS tether (sent up to it). Null when unbound.
 */
export async function agentHourlyTip(env) {
  try {
    const snap = await publicSnapshot(env);
    return snap ? { seq: snap.tip ? snap.tip.seq : 0, h: snap.tip ? snap.tip.h : null, lattice: snap.tip ? snap.tip.lattice : null, as_of: snap.as_of, hourly: true } : null;
  } catch { return null; }
}

/** Public: hourly, bucketed counts + the hourly tip only. No rows, no hashed ids. */
export async function publicReceipts(env) {
  let snap = null;
  try { snap = await publicSnapshot(env); } catch { snap = null; }
  if (!snap) return { status: 503, body: { ok: false, code: "AGENT-STORE-UNBOUND", spec: AGENT_SPEC, chain: AGENT_CHAIN } };
  const pub = publicOfSnapshot(snap);
  return { status: 200, body: { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, chain: AGENT_CHAIN, scope: "public", ...pub, refresh: "hourly", k_min: AGENT_PUBLIC_K, note: PUBLIC_NOTE, rows_shown: 0, verify_chain: `chainlock_verify {"c":"${AGENT_CHAIN}"}`, owner_view: "GET /v1/mesh/agents/challenge?scope=agent|owner&subject_public_key=..., sign an agent-view statement with that key, POST /v1/mesh/agents/receipts", ...AGENT_HONEST } };
}

async function opView(env, src, meta = {}) {
  const verb = "agent-receipts";
  const p = await prepare(env, verb, src);
  if (p.refuse) return refuseAgent(env, p.refuse, verb, { via: meta.via });
  const { body, salt, statement, statement_hash } = p;
  if (!SCOPES.includes(body.scope)) return refuseAgent(env, "AGENT-BAD-INPUT", verb, { via: meta.via });
  const subject = await handleOf(body.subject_public_key);
  if (!subject) return refuseAgent(env, "AGENT-ID-MISMATCH", verb, { via: meta.via });
  if (!(await challengeOk(salt, body.challenge, body.scope, subject))) return refuseAgent(env, "AGENT-CHALLENGE", verb, { via: meta.via });
  // Signature first (AZBot N8): before it, every caller gets the same answer whether or not the key has agents.
  if (!(await sigOk(body.subject_public_key, statement, body.sig))) return refuseAgent(env, "AGENT-SIG-INVALID", verb, { via: meta.via });
  let ids = [];
  if (body.scope === "agent") {
    const a = await loadAgent(env, subject);
    if (!a || a.public_key !== body.subject_public_key) return refuseAgent(env, "AGENT-UNKNOWN", verb, { via: meta.via });
    ids = [a.agent_id];
  } else {
    ids = (await state(env, "owner_agents", { owner_id: subject })).ids || [];
    if (!ids.length) return refuseAgent(env, "AGENT-UNKNOWN", verb, { via: meta.via });
  }
  if (!(await rate(env, "agent_read", subject, AGENT_READ_PER_MIN))) return refuseAgent(env, "AGENT-RATE", verb, { via: meta.via });
  if (!(await markSeen(env, statement_hash))) return refuseAgent(env, "AGENT-REPLAY", verb, { via: meta.via });
  // Single use: the challenge itself is consumed too (a second statement over it is refused).
  const used = await state(env, "seen", { key: "ch:" + String(body.challenge).split(".")[2], ttl_ms: AGENT_CHALLENGE_TTL_MS * 2 });
  if (!(used.ok === true && used.fresh === true)) return refuseAgent(env, "AGENT-CHALLENGE", verb, { via: meta.via });
  const mine = new Set();
  for (const id of ids) mine.add(await hid(salt, id));
  if (body.scope === "owner") mine.add(await hid(salt, subject));
  const rows = await chainRows(env);
  if (!rows) return refuseAgent(env, "AGENT-STORE-UNBOUND", verb, { via: meta.via });
  const hit = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const a = rows[i] && rows[i].agentcomm;
    if (!a) continue;
    if (mine.has(a.from_h) || mine.has(a.to_h) || mine.has(a.agent_h) || mine.has(a.owner_h) || mine.has(a.by_h)) hit.push(rowView(rows[i], i));
  }
  return { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, op: verb, scope: body.scope, agents: ids.length, matched: hit.length, receipts: hit.slice(0, AGENT_VIEW_LIMIT), tip: tipOf(rows), note: "Only rows that involve the proved agent (or the proved owner's agents) are shown. Ids in rows are salted hashes.", ...AGENT_HONEST };
}

export async function directory(env, searchParams) {
  if (!kvOf(env) || !env.CHAINLOCK) return { status: 503, body: { ok: false, code: "AGENT-STORE-UNBOUND", spec: AGENT_SPEC } };
  const pub = (a) => ({ agent_id: a.agent_id, public_key: a.public_key, enc_public_key: a.enc_public_key, caps: a.caps || [] });
  const one = searchParams && searchParams.get ? searchParams.get("agent_id") : null;
  try {
    if (one) {
      const s = await loadAgentState(env, one);
      if (!s.agent || s.retired) return { status: 404, body: { ok: false, code: s.retired ? "AGENT-RETIRED" : "AGENT-UNKNOWN", spec: AGENT_SPEC, message: AGENT_CODES[s.retired ? "AGENT-RETIRED" : "AGENT-UNKNOWN"][1] } };
      return { status: 200, body: { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, agent: pub(s.agent), owner_listed: false } };
    }
    // Cached 60 s per isolate (AZBot N2). A retired agent can linger here up to 60 s; send and pull
    // recheck the state DO, so a listing never grants anything.
    const agents = await cached(env, "directory", async () => ((await state(env, "directory")).agents || []).map(pub));
    return { status: 200, body: { ok: true, code: "AGENT-OK", spec: AGENT_SPEC, count: agents.length, agents, owner_listed: false, note: "Only agents registered with discoverable:true (and not retired) are listed. Discovery is not consent: a grant is still required." } };
  } catch {
    return { status: 503, body: { ok: false, code: "AGENT-STORE-UNBOUND", spec: AGENT_SPEC } };
  }
}

export async function agentStatus(env) {
  let snap = null;
  try { snap = await publicSnapshot(env); } catch { snap = null; }
  const pub = snap ? publicOfSnapshot(snap) : {};
  return {
    ok: true, code: "AGENT-OK", spec: AGENT_SPEC, paper: AGENT_PAPER,
    agent_subnet: { live: false, ...pub, refresh: "hourly", k_min: AGENT_PUBLIC_K, store: snap ? "bound" : "unbound" },
    chain: AGENT_CHAIN,
    door: "fraggate mesh agent-* (MCP fraggate_call {slug:'mesh',op:'agent-send',payload}); HTTP POST /v1/mesh/agents/<verb>",
    ops: AGENT_OPS.slice(),
    routes: {
      status: "GET /v1/mesh/agents", directory: "GET /v1/mesh/agents/directory[?agent_id=#...]", challenge: "GET /v1/mesh/agents/challenge?scope=agent|owner&subject_public_key=...",
      receipts_public: "GET /v1/mesh/agents/receipts", receipts_scoped: "POST /v1/mesh/agents/receipts (signed agent-view)",
      register: "POST /v1/mesh/agents/register", grant: "POST /v1/mesh/agents/grant", revoke: "POST /v1/mesh/agents/revoke", retire: "POST /v1/mesh/agents/retire",
      send: "POST /v1/mesh/agents/send", pull: "POST /v1/mesh/agents/pull", ack: "POST /v1/mesh/agents/ack", viewer: "/agents",
    },
    carriers: { order: AGENT_RADIO_CARRIERS.concat([AGENT_INTERNET_CARRIER]), order_arrow: D2D_ORDER_ARROW, present_at_worker: [AGENT_INTERNET_CARRIER], radio_absent_code: "QNM-RADIO-ABSENT", fallback: AGENT_INTERNET_CARRIER },
    limits: { send_per_agent_per_min: AGENT_SEND_PER_MIN, global_per_min: AGENT_GLOBAL_PER_MIN, register_per_owner_per_min: AGENT_REGISTER_PER_OWNER_PER_MIN, register_per_ip_per_min: AGENT_REGISTER_PER_IP_PER_MIN, register_per_min: AGENT_REGISTER_PER_MIN, mailbox_cap: AGENT_MAILBOX_CAP, box_ttl_s: AGENT_BOX_TTL_MS / 1000, ciphertext_bytes: [AGENT_CT_MIN, AGENT_CT_MAX], receipt_caps_per_min: { ...AGENTCOMM_CAP.classes, total: AGENTCOMM_CAP.total, rider_deliver_read: AGENTCOMM_CAP.rider, send_per_visitor: AGENTCOMM_CAP.per_ip, send_per_owner_pair: AGENTCOMM_CAP.per_pair, refuse_per_agent: AGENTCOMM_CAP.refuse_per_agent }, edge: { post_kind: "mesh_mutate", get_kind: "agent_read", note: "per client IP (or the peer-forwarded visitor hash), 429 RATE_LIMIT" }, grant_max_days: 30 },
    crypto: { scheme: "X25519 ECDH (ephemeral sender key, static recipient key) + HKDF-SHA256 + AES-256-GCM", algs: AGENT_ALGS.slice(), forward_secrecy: AGENT_FORWARD_SECRECY, signatures: "Ed25519" },
    algs: AGENT_ALGS.slice(), caps: AGENT_CAPS.slice(), kinds: AGENT_KINDS.slice(), codes: Object.keys(AGENT_CODES),
    verify_chain: `chainlock_verify {"c":"${AGENT_CHAIN}"}`,
    ...AGENT_HONEST,
    author: "Aziel Eliab",
  };
}

/** mesh op entry (FragGate door → runMeshOp → here). meta: { ip_h } from the HTTP edge, when known. */
export async function runAgentOp(op, src, env, meta = {}) {
  try {
    if (op === "agent-status") return agentStatus(env);
    if (op === "agent-register") return await opRegister(env, src, meta);
    if (op === "agent-grant") return await opGrant(env, src, meta);
    if (op === "agent-revoke") return await opRevoke(env, src, meta);
    if (op === "agent-retire") return await opRetire(env, src, meta);
    if (op === "agent-send") return await opSend(env, src, meta);
    if (op === "agent-pull") return await opPull(env, src, meta);
    if (op === "agent-ack") return await opAck(env, src, meta);
    if (op === "agent-challenge") {
      const c = await makeChallenge(env, { scope: src && src.scope, subject_public_key: src && src.subject_public_key });
      return c.ok ? c : refuseAgent(env, c.code || "AGENT-BAD-INPUT", "agent-challenge", { via: meta.via });
    }
    if (op === "agent-receipts") {
      if (src && src.kind === "agent-view") return await opView(env, src, meta);
      return (await publicReceipts(env)).body;
    }
    if (op === "agent-directory") return (await directory(env, { get: (k) => (k === "agent_id" && src && src.agent_id ? String(src.agent_id) : null) })).body;
    return refuseAgent(env, "AGENT-NOT-FOUND", "agent-status", { via: meta.via });
  } catch {
    // Fail closed: a crash (including the state DO being unreachable) is a refusal, never a success.
    return refuseAgent(env, "AGENT-STORE-UNBOUND", AGENT_OPS.includes(op) ? op : "agent-status", { via: meta.via });
  }
}

/** HTTP: /v1/mesh/agents[/verb]. Returns {status, body}. meta: { ip_h }. */
export async function dispatchAgentHttp(method, path, payload, env, searchParams, metaIn = {}) {
  const m = String(method || "GET").toUpperCase();
  // Over HTTP every refusal spends the #302 rest share, not the MCP one (AZBot N6).
  const meta = { ...(metaIn || {}), via: "rest" };
  const R = (code, verb2) => refuseAgent(env, code, verb2, { via: "rest" });
  const verb = path === "/v1/mesh/agents" ? "status" : path.slice("/v1/mesh/agents/".length);
  const asOut = (body) => ({ status: body && body.ok === false ? body.http_status || 400 : 200, body });
  const read = m === "GET" || m === "HEAD";
  if (verb === "status") return read ? asOut(await agentStatus(env)) : asOut(await R("AGENT-METHOD", "agent-status"));
  if (verb === "directory") return read ? directory(env, searchParams) : asOut(await R("AGENT-METHOD", "agent-directory"));
  if (verb === "challenge") {
    if (!read) return asOut(await R("AGENT-METHOD", "agent-challenge"));
    const q = (k) => (searchParams && searchParams.get ? searchParams.get(k) : null);
    const c = await makeChallenge(env, { scope: q("scope"), subject_public_key: q("subject_public_key") });
    return c.ok ? { status: 200, body: c } : asOut(await R(c.code || "AGENT-BAD-INPUT", "agent-challenge"));
  }
  if (verb === "receipts") {
    if (read) return publicReceipts(env);
    if (m === "POST") {
      try { return asOut(await opView(env, payload, meta)); } catch { return asOut(await R("AGENT-STORE-UNBOUND", "agent-receipts")); }
    }
    return asOut(await R("AGENT-METHOD", "agent-receipts"));
  }
  const op = "agent-" + verb;
  if (AGENT_MUTATE_OPS.includes(op)) {
    if (m !== "POST") return asOut(await R("AGENT-METHOD", op));
    return asOut(await runAgentOp(op, payload, env, meta));
  }
  return asOut(await R("AGENT-NOT-FOUND", "agent-status"));
}

/** Public /v1/anchor/rows view of an agentcomms row: links and lattice, no receipt body. */
export function redactAgentRow(entry) {
  if (!entry || !entry.row) return entry;
  // No receipt body, and no time or kind either (they would let the public time each event).
  const { agentcomm, t, ts, time, s, f, fact, summary, kind, ...rest } = entry.row;
  return { ...entry, row: { ...rest, agentcomm: agentcomm ? { redacted: true } : undefined } };
}

/** Test hooks: spend receipt-seal slots of one class in this isolate; read the salt; peek at the memo. */
export async function _burnSealForTest(cls = "msg") { memoMinute(); sealMemo.used[cls]++; }
export function _sealMemoForTest() { memoMinute(); return { used: { ...sealMemo.used }, full: [...sealMemo.full] }; }
export async function _saltForTest(env) { return (await state(env, "salt")).salt; }

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
<p>AGENT-SUBNET-1.0 is designed to let AI agents exchange signed messages that are sealed on the agent, with a hash-only receipt for every message, grant, and refusal on the <code>agentcomms</code> chain (both lattices, tethered to AZ-OS). Receipts are hashed, not encrypted: they hold no content, and ids in them are salted hashes. The relay is designed to see ciphertext only. <span class="flag">live: false</span>: not yet proven between two real, independent agents.</p>
<div class="card"><h2>Public view</h2><p>Counts and the chain tip only, refreshed once an hour; counts are rounded to tens and anything under 10 shows as "&lt;10". Nobody's rows are public.</p><pre id="pub">loading…</pre></div>
<div class="card"><h2>Your agents' receipts</h2>
<ol><li>Run <code>node scripts/agent-subnet-client.mjs view &lt;agent&gt; --print</code> (add <code>--owner</code> with your owner key to see all your agents). The challenge it signs is for that one key and scope, and works once.</li>
<li>Paste the signed statement below. It holds a public key and a signature, never a private key. Keys never go into this page.</li></ol>
<textarea id="stmt" placeholder='{"v":"AGENT-SUBNET-1.0","kind":"agent-view",...}'></textarea><p><button id="go">Show my receipts</button></p>
<p id="msg"></p><table><thead><tr><th>seq</th><th>time</th><th>kind</th><th>ct sha256</th><th>verdict</th><th>carrier</th><th>h</th></tr></thead><tbody id="rows"></tbody></table></div>
<div class="card"><p>Verify the whole chain: <code>chainlock_verify {"c":"agentcomms"}</code>. Status: <a href="${api}">${api}</a>. Paper: <code>${AGENT_PAPER}</code>.</p></div>
<div class="hint" id="hint"><strong>Hint.</strong> Agents are designed to sign everything with their own keys. Discovery is not consent: a receiver's owner must grant each sender, links across owners need both owners, and an owner can retire an agent to end every grant at once. <button id="hx">Got it</button></div>
<script>
const API=${JSON.stringify(api)};
const $=(id)=>document.getElementById(id);
try{if(localStorage.getItem("agents-hint")==="1")$("hint").remove();}catch(e){}
$("hx")&&($("hx").onclick=()=>{try{localStorage.setItem("agents-hint","1")}catch(e){};$("hint").remove();});
fetch(API+"/receipts").then(r=>r.json()).then(j=>{$("pub").textContent=JSON.stringify({live:j.live,as_of:j.as_of,refresh:j.refresh,total:j.total,by_kind:j.by_kind,e2e_verified_observed:j.e2e_verified_observed,tip:j.tip,verify_chain:j.verify_chain},null,2)}).catch(()=>{$("pub").textContent="unreachable (fail closed: no claim)"});
$("go").onclick=async()=>{const tb=$("rows");tb.textContent="";let body;try{body=JSON.parse($("stmt").value)}catch(e){$("msg").textContent="That is not JSON.";return}
if(/private|seed|secret/i.test(Object.keys(body).join(","))){$("msg").textContent="Refused here: that looks like it has a private key. Do not paste keys.";return}
const r=await fetch(API+"/receipts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json();
if(!j.ok){$("msg").textContent=(j.code||"refused")+": "+(j.message||"");return}
$("msg").textContent=j.matched+" receipt(s) involve your "+(j.scope==="owner"?"agents":"agent")+".";
for(const row of j.receipts){const tr=document.createElement("tr");const a=row.agentcomm||{};for(const v of [row.seq,row.t,a.kind,a.ct_sha256||"",a.recipient_verdict||a.sig_verdict||a.code||"",a.carrier||"",row.h]){const td=document.createElement("td");td.textContent=String(v==null?"":v);tr.appendChild(td)}tb.appendChild(tr)}};
</script></body></html>`;
}

/**
 * RIB-042 / AZRT-HELD-KEY-1.0 (idea from @DTXNaidu): "hold but never mint" receipt signing.
 *
 * The receipt signing key is provisioned by the deploy/issuer side as Worker secrets:
 *   RECEIPT_SIGNING_KEY            Ed25519 private key, PKCS#8, base64url (secret)
 *   RECEIPT_SIGNING_PUBLIC_KEY     matching raw public key, base64url (published at GET /v1/receipt-key)
 *   RECEIPT_KEY_PROVISIONED_BY     who provisioned it (free text from the deploy side; default "deploy-secret")
 *   RECEIPT_KEY_ATTESTATION_SHA256 optional 64-hex hash of a provisioning attestation
 * The runtime imports the private key NON-EXTRACTABLE with usage ["sign"] only. This module has no
 * code path to generate, rotate or export a key (a test scans this file for such calls).
 *
 * Each new session receipt carries `signature`, outside the hash (the hash is computed first; the
 * signature covers "azrt-receipt-sig-1:" + hash):
 *   signed:   { spec, alg:"Ed25519", sig, key_id, public_key, provisioned_by, attestation_sha256 }
 *   unsigned: { spec, sig:null, reason }    no key provisioned (or it failed its self-check). Never a fake signature.
 * Verify checks each signature against trusted keys: PINNED_RECEIPT_KEYS (in code) plus the published
 * RECEIPT_SIGNING_PUBLIC_KEY of this deploy. Old receipts (no signature field) report "legacy".
 * Honest limit: the published key comes from the same deploy; pin a key in PINNED_RECEIPT_KEYS (or
 * compare /v1/receipt-key with an outside record) to trust it independently.
 * Author: Aziel Eliab.
 */
import { sha256Hex } from "./session-core.js";

export const HELD_KEY_SPEC = "AZRT-HELD-KEY-1.0";
export const SIG_DOMAIN = "azrt-receipt-sig-1:";
/** Pinned trusted receipt public keys (raw Ed25519, base64url). None pinned yet. */
export const PINNED_RECEIPT_KEYS = Object.freeze([]);
/**
 * AZRT-KEYS-1.0: retired receipt keys, append-only epochs { public_key, from, until } (ISO times).
 * When the deploy side replaces the held key, the old PUBLIC key is added here (in a reviewed PR) so
 * receipts it signed keep verifying. A retired key verifies only receipts whose `ts` falls inside its
 * epoch, never anything newer, and the runtime never signs with it: load() refuses a held key whose
 * public key is listed here (RECEIPT-KEY-IS-RETIRED), and a retired listing wins over a pinned one.
 * No private key is kept for this. Empty until the first key change. "Append-only" is enforced by review
 * plus a fingerprint test (scripts/verify-receipt-key-epochs.mjs); there is no outside record of the list
 * until the aziel-anchors patch (heads.receipt_key) lands.
 */
export const RECEIPT_KEY_EPOCHS = Object.freeze([]);
const HEX64 = /^[a-f0-9]{64}$/;

function b64urlToBytes(text) {
  const s = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function keyIdOf(publicKeyB64url) {
  return "ed25519:" + (await sha256Hex(Array.from(b64urlToBytes(publicKeyB64url), (b) => b.toString(16).padStart(2, "0")).join("")));
}

async function verifyRaw(publicKeyB64url, message, sigB64url) {
  try {
    const key = await crypto.subtle.importKey("raw", b64urlToBytes(publicKeyB64url), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, b64urlToBytes(sigB64url), new TextEncoder().encode(message));
  } catch {
    return false;
  }
}

const cache = new WeakMap();
const NO_KEY = Object.freeze({ ok: false, reason: "no receipt signing key provisioned; receipts are hash-linked and sealed, not signed" });

/** Load the provisioned key. Never generates one. Cached per env object (default epochs only). */
export async function heldSignerFromEnv(env, { epochs } = {}) {
  if (!env || typeof env !== "object") return NO_KEY;
  if (epochs !== undefined) return load(env, epochs);
  if (cache.has(env)) return cache.get(env);
  const out = await load(env);
  cache.set(env, out);
  return out;
}

async function load(env, epochs = RECEIPT_KEY_EPOCHS) {
  const priv = env.RECEIPT_SIGNING_KEY;
  const pub = env.RECEIPT_SIGNING_PUBLIC_KEY;
  if (!priv) return NO_KEY;
  if (!pub) return { ok: false, reason: "RECEIPT_SIGNING_PUBLIC_KEY not provisioned; refusing to sign without a published key" };
  // AZRT-KEYS-1.0: never sign with a key listed in RECEIPT_KEY_EPOCHS (its receipts would fail RECEIPT-KEY-RETIRED).
  const pubId = await keyIdOf(String(pub).trim());
  for (const e of epochs || []) {
    if (e && e.public_key && (await keyIdOf(e.public_key)) === pubId) {
      return { ok: false, code: "RECEIPT-KEY-IS-RETIRED", key_id: pubId, reason: "the held receipt key is listed in RECEIPT_KEY_EPOCHS (retired); not signing until a new key is provisioned" };
    }
  }
  let key;
  try {
    // Non-extractable, sign-only: the runtime can use the key but cannot read it back out.
    key = await crypto.subtle.importKey("pkcs8", b64urlToBytes(String(priv).trim()), { name: "Ed25519" }, false, ["sign"]);
  } catch {
    return { ok: false, reason: "RECEIPT_SIGNING_KEY is not a valid Ed25519 PKCS#8 key" };
  }
  const sign = async (msg) => bytesToB64url(await crypto.subtle.sign({ name: "Ed25519" }, key, new TextEncoder().encode(msg)));
  // Self-check: the held private key must match the published public key, or nothing is signed.
  const probe = SIG_DOMAIN + "0".repeat(64);
  if (!(await verifyRaw(pub, probe, await sign(probe)))) return { ok: false, reason: "RECEIPT_SIGNING_KEY does not match RECEIPT_SIGNING_PUBLIC_KEY; not signing" };
  const att = String(env.RECEIPT_KEY_ATTESTATION_SHA256 || "").toLowerCase();
  return {
    ok: true,
    sign,
    provenance: {
      key_id: await keyIdOf(pub),
      public_key: String(pub).trim(),
      provisioned_by: String(env.RECEIPT_KEY_PROVISIONED_BY || "deploy-secret").slice(0, 128),
      attestation_sha256: HEX64.test(att) ? att : null,
    },
  };
}

/** Per-isolate active signer used by appendReceipt (set by the session Durable Object). */
let active = NO_KEY;
export function setActiveReceiptSigner(signer) {
  active = signer && signer.ok ? signer : signer || NO_KEY;
}
export function activeReceiptSigner() {
  return active;
}

/** Hashed commitment sealed before the receipt hash: which key must sign it, or that none will. */
export function sigCommitFor(signer = active) {
  return signer && signer.ok ? { spec: HELD_KEY_SPEC, key_id: signer.provenance.key_id } : { spec: HELD_KEY_SPEC, mode: "none" };
}

/** The `signature` field for a receipt hash. Unsigned when no key: sig null + reason. */
export async function signatureFor(hash, signer = active) {
  if (!signer || !signer.ok) return { spec: HELD_KEY_SPEC, sig: null, reason: (signer && signer.reason) || NO_KEY.reason };
  return { spec: HELD_KEY_SPEC, alg: "Ed25519", sig: await signer.sign(SIG_DOMAIN + hash), ...signer.provenance };
}

/**
 * Trusted keys: retired epochs (time-bounded) + pinned in code + the published key of this deploy (labelled
 * by source). Retired wins: a key that is both pinned (or published) and retired is trusted only inside its
 * epoch, so pinning can't un-retire a key.
 */
export async function trustedReceiptKeys(env, { epochs = RECEIPT_KEY_EPOCHS, pinned = PINNED_RECEIPT_KEYS } = {}) {
  const out = [];
  for (const e of epochs || []) {
    if (!e || !e.public_key || !e.until) continue;
    const id = await keyIdOf(e.public_key);
    if (!out.some((x) => x.key_id === id)) out.push({ public_key: e.public_key, key_id: id, source: "retired", from: e.from || null, until: e.until });
  }
  for (const k of pinned || []) {
    const id = await keyIdOf(k);
    if (!out.some((x) => x.key_id === id)) out.push({ public_key: k, key_id: id, source: "pinned" });
  }
  if (env && env.RECEIPT_SIGNING_PUBLIC_KEY) {
    const k = String(env.RECEIPT_SIGNING_PUBLIC_KEY).trim();
    const id = await keyIdOf(k);
    if (!out.some((x) => x.key_id === id)) out.push({ public_key: k, key_id: id, source: "published" });
  }
  return out;
}

/**
 * Verify every receipt signature. sig_commit is inside the (already verified) hash:
 *   sig_commit.key_id  -> a valid signature by exactly that key is REQUIRED (missing/null = RECEIPT-SIG-MISSING)
 *   sig_commit.mode none -> unsigned, must carry a reason
 *   no sig_commit      -> legacy (minted before RIB-042)
 * Any legacy or unsigned receipt after the first signed one fails RECEIPT-SIG-DOWNGRADE.
 */
export async function verifyReceiptSignatures(receipts, { trusted = [] } = {}) {
  const errors = [];
  const rows = [];
  let signed = 0;
  let firstSigned = null;
  for (let i = 0; i < (receipts || []).length; i++) {
    const r = receipts[i];
    if (!r) continue;
    const seq = r.seq ?? i + 1;
    const c = r.sig_commit;
    const s = r.signature;
    const fail = (code, extra = {}) => { errors.push({ seq, code, ...extra }); rows.push({ seq, status: "failed", code }); };
    if (!c || typeof c !== "object") {
      if (firstSigned != null) { fail("RECEIPT-SIG-DOWNGRADE", { after_signed_seq: firstSigned }); continue; }
      rows.push({ seq, status: "legacy" });
      continue;
    }
    if (!c.key_id) {
      if (firstSigned != null) { fail("RECEIPT-SIG-DOWNGRADE", { after_signed_seq: firstSigned }); continue; }
      if (c.mode !== "none") { fail("RECEIPT-SIG-COMMIT-BAD"); continue; }
      if (s && s.sig != null) { fail("RECEIPT-SIG-UNCOMMITTED"); continue; }
      if (!s || !s.reason) { fail("RECEIPT-SIG-NO-REASON"); continue; }
      rows.push({ seq, status: "unsigned", reason: s.reason });
      continue;
    }
    if (!s || s.sig == null) { fail("RECEIPT-SIG-MISSING", { key_id: c.key_id }); continue; }
    const id = s.public_key ? await keyIdOf(s.public_key) : null;
    if (!id || id !== s.key_id || id !== c.key_id) { fail("RECEIPT-KEY-ID-MISMATCH"); continue; }
    const t = trusted.find((k) => k.key_id === id);
    if (!t) { fail("RECEIPT-KEY-UNTRUSTED", { key_id: id }); continue; }
    if (t.source === "retired") {
      // AZRT-KEYS-1.0: a retired key covers only receipts minted inside its epoch.
      const at = Date.parse(r.ts || "");
      const inside = Number.isFinite(at) && at <= Date.parse(t.until) && (!t.from || at >= Date.parse(t.from));
      if (!inside) { fail("RECEIPT-KEY-RETIRED", { key_id: id, until: t.until }); continue; }
    }
    if (!(await verifyRaw(t.public_key, SIG_DOMAIN + r.hash, s.sig))) { fail("RECEIPT-SIG-BAD"); continue; }
    signed++;
    if (firstSigned == null) firstSigned = seq;
    rows.push({ seq, status: "verified", key_id: id, key_source: t.source });
  }
  const unsigned = rows.filter((x) => x.status === "unsigned").length;
  const legacy = rows.filter((x) => x.status === "legacy").length;
  return {
    spec: HELD_KEY_SPEC,
    ok: errors.length === 0,
    status: errors.length ? "failed" : signed && !unsigned && !legacy ? "all_signed" : signed ? "partly_signed" : "unsigned",
    signed, unsigned, legacy,
    first_signed_seq: firstSigned,
    trusted: trusted.map((k) => ({ key_id: k.key_id, source: k.source })),
    errors,
    rows,
  };
}

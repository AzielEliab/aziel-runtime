/**
 * USER-SIGNIN-ARK-1.0 §5-§9: ark account_open / account_append / account_recall.
 * Default OFF (env.ARK_ACCOUNTS !== "on" → ARK-ACCOUNTS-OFF). No account record:
 * a wrong password is a different, empty vault. Rows are sealed (row_hash +
 * dual lattice) and opt-in signed by the user's Ed25519 key (user_sig). The
 * runtime never signs and never stores a secret. Author: Aziel Eliab.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ARK_ACCOUNT_SPEC, hex, sha256, signBytes, verifySig, sealData, openData, vaultIdOf, normalizeUsername } from "./ark-kdf.js";
import { arkCredsFor, arkDeriveFor } from "./firewall.js";
import { LATTICE_GENESIS, latticePrimary, latticeOnlineSecondary } from "../dual-lattice.js";
import { clientIp, rateKeyOf } from "../production.js";
import { storeFor } from "../chainlock/store.js";

export const ARK_ACCOUNT_OPS = Object.freeze(["account_open", "account_append", "account_recall", "account_challenge", "account_session"]);
export const CHALLENGE_TTL_MS = 120 * 1000;
export const SESSION_TTL_MS = 15 * 60 * 1000;
export const RL_WINDOW_S = 900;
export const RL_PER_PREFIX = 60;
export const RL_PER_SUBJECT = 100; // eased from 30 (targeted-lockout LOW)
export const RL_SUBJECT_HEX = 6; // hosted subject is a truncated, window-salted hash: buckets, not identities
export const TS_SKEW_MS = 5 * 60 * 1000;
export const DATA_MAX = 16384;
export const RECALL_MAX = 50;
const KIND_RE = /^[a-z0-9_.-]{1,40}$/;
const enc = new TextEncoder();

const refuse = (code) => ({ ok: false, code, spec: ARK_ACCOUNT_SPEC, written: false });

export function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
}
export function appendMessage(row) {
  const { spec, vault_id, seq, prev, kind, ct_sha256, ts } = row;
  return enc.encode(canonical({ spec, vault_id, seq, prev, kind, ct_sha256, ts }));
}
/** USER-SIGNIN-ARK-1.0 §10: the client signs this with its locally derived Ed25519 key. */
export function sessionMessage(vaultId, nonce) {
  return enc.encode(`ARK-ACCOUNT:v1:session|${vaultId}|${nonce}`);
}
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const chalKey = (nonce) => `ark:chal:${nonce}`;
const sessKey = (h) => `ark:sess:${h}`;
async function sessionVault(kv, token, now) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return null;
  const raw = await kv.get(sessKey(hex(await sha256("ARK-ACCOUNT:v1:sess|" + token))));
  if (raw == null) return null;
  const s = JSON.parse(raw);
  return Number.isInteger(s.exp) && s.exp > now && /^[0-9a-f]{64}$/.test(s.vault_id) ? s : null;
}
export function recallMessage(vaultId, ts) {
  return enc.encode(`ARK-ACCOUNT:v1:recall|${vaultId}|${ts}`);
}

const tipKey = (v) => `ark:acct:${v}:tip`;
const rowKey = (v, s) => `ark:acct:${v}:${s}`;

async function readTip(kv, v) {
  const raw = await kv.get(tipKey(v));
  if (raw == null) return { seq: 0, row_hash: LATTICE_GENESIS, primary: LATTICE_GENESIS, secondary: LATTICE_GENESIS };
  const t = JSON.parse(raw);
  if (!Number.isInteger(t.seq) || t.seq < 1) throw new Error("tip");
  return t;
}

async function rateHit(kv, key, limit, now) {
  const w = Math.floor(now / 1000 / RL_WINDOW_S);
  const k = `ark:rl:${key}:${w}`;
  const n = Number((await kv.get(k)) || 0);
  if (n >= limit) return false;
  await kv.put(k, String(n + 1));
  return true;
}

async function sealRow(base) {
  const lattice = {
    document_hash: base.ct_sha256,
    primary: await latticePrimary(base.ct_sha256, base._prev_primary),
    offline: false,
  };
  lattice.secondary = await latticeOnlineSecondary(lattice.primary, base._prev_secondary);
  const { _prev_primary, _prev_secondary, ...row } = base;
  row.lattice = lattice;
  row.row_hash = hex(await sha256(canonical(row)));
  return row;
}

function okTs(ts, now) {
  return Number.isInteger(ts) && Math.abs(now - ts) <= TS_SKEW_MS;
}

/**
 * @param op one of ARK_ACCOUNT_OPS
 * @param payload scrubbed payload (no credentials)
 * @param keys hosted keys from arkKeysFor(args), or null (device mode)
 * @param meta { credential_error?, credential_mode? } from the scrubbed args
 */
export async function runArkAccountOp(op, payload, env, request, keys = null, meta = {}, now = Date.now()) {
  meta = meta || {};
  try {
    if (!env || env.ARK_ACCOUNTS !== "on") return refuse("ARK-ACCOUNTS-OFF");
    // Durable storage only (ChainLock DO or USES KV); the per-isolate memory store would lose history.
    if (!env.CHAINLOCK && !(env.USES && typeof env.USES.get === "function")) return refuse("ARK-STORE-OFF");
    const kv = storeFor(env);
    if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function") return refuse("ARK-STORE-OFF");
    if (!ARK_ACCOUNT_OPS.includes(op)) return refuse("ARK-INPUT");
    if (meta.credential_error) return refuse("ARK-INPUT");
    // USER-SIGNIN-ARK-1.0 §12.2: the LLM app must never see the plaintext login. A username/password
    // reaching any door is already scrubbed by the firewall; here it is refused, nothing derived or stored.
    // Deprecated door: only ARK_PLAINTEXT_DOOR="deprecated-on" (never set in wrangler.toml) re-opens it.
    if ((meta.credential_mode === "hosted" || keys) && env.ARK_PLAINTEXT_DOOR !== "deprecated-on") return refuse("ARK-PLAINTEXT-REFUSED");
    const p = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
    const creds = !keys && meta.handle ? arkCredsFor(meta.handle) : null;
    const hosted = !!keys || !!creds || (meta.handle && meta.credential_mode === "hosted");
    if (meta.credential_mode === "hosted" && !hosted) return refuse("ARK-INPUT");
    const win = Math.floor(now / 1000 / RL_WINDOW_S);
    let subject, pub, vaultId;
    if (hosted) {
      let u;
      try { u = keys ? null : normalizeUsername(creds ? creds.u : undefined); } catch { return refuse("ARK-INPUT"); }
      subject = keys ? keys.rl_subject.slice(0, RL_SUBJECT_HEX) : hex(await sha256(`ARK-ACCOUNT:v1:rl|${win}|${u}`)).slice(0, RL_SUBJECT_HEX);
    } else if (p.session !== undefined) {
      const sv = await sessionVault(kv, p.session, now);
      if (!sv) return refuse("ARK-SESSION");
      pub = sv.vault_pub; vaultId = sv.vault_id; subject = vaultId;
      meta = { ...meta, session_ok: true };
    } else {
      pub = String(p.vault_pub || "");
      vaultId = await vaultIdOf(pub);
      subject = vaultId;
    }
    const prefix = hex(await sha256("ARK-ACCOUNT:v1:ip|" + rateKeyOf(clientIp(request))));
    if (!(await rateHit(kv, "p:" + prefix, RL_PER_PREFIX, now))) return refuse("ARK-RATE");
    if (!(await rateHit(kv, "s:" + subject, RL_PER_SUBJECT, now))) return refuse("ARK-RATE");
    if (hosted && !keys) {
      // MED-2: PBKDF2 runs only after the flag, store and both rate checks pass.
      try { keys = await arkDeriveFor(meta.handle); } catch { return refuse("ARK-INPUT"); }
      if (!keys) return refuse("ARK-INPUT");
    }
    if (hosted) { pub = keys.pub; vaultId = keys.vault_id; }
    const tip = await readTip(kv, vaultId);

    if (op === "account_challenge") {
      // Stateless toward the password: any vault_pub gets a nonce (no oracle).
      const nonce = randHex(32);
      await kv.put(chalKey(nonce), JSON.stringify({ vault_id: vaultId, exp: now + CHALLENGE_TTL_MS }));
      return { ok: true, code: "ARK-OK", spec: ARK_ACCOUNT_SPEC, vault_id: vaultId, nonce, expires_ms: CHALLENGE_TTL_MS, sign: "ARK-ACCOUNT:v1:session|<vault_id>|<nonce>", written: false };
    }

    if (op === "account_session") {
      const nonce = String(p.nonce || "");
      if (!/^[0-9a-f]{64}$/.test(nonce)) return refuse("ARK-INPUT");
      const raw = await kv.get(chalKey(nonce));
      if (raw == null) return refuse("ARK-STALE");
      const c = JSON.parse(raw);
      if (c.used) return refuse("ARK-STALE");
      await kv.put(chalKey(nonce), JSON.stringify({ ...c, used: true })); // single use, consumed before verify
      if (c.vault_id !== vaultId || !(c.exp > now)) return refuse("ARK-STALE");
      if (!(await verifySig(pub, String(p.user_sig || ""), sessionMessage(vaultId, nonce)))) return refuse("ARK-SIG-BAD");
      // Verify against the receipt chain: the vault's tip row (if any) must be signed by this key.
      if (tip.seq > 0) {
        const last = JSON.parse((await kv.get(rowKey(vaultId, tip.seq))) || "null");
        if (!last || last.row_hash !== tip.row_hash || last.user_pub !== pub) return refuse("ARK-FAIL-CLOSED");
      }
      const token = randHex(32);
      await kv.put(sessKey(hex(await sha256("ARK-ACCOUNT:v1:sess|" + token))), JSON.stringify({ vault_id: vaultId, vault_pub: pub, exp: now + SESSION_TTL_MS }));
      return { ok: true, code: "ARK-OK", spec: ARK_ACCOUNT_SPEC, vault_id: vaultId, session: token, expires_ms: SESSION_TTL_MS, count: tip.seq, tip: tip.row_hash, written: false, deniable: true };
    }

    if (op === "account_open") {
      return { ok: true, code: "ARK-OK", spec: ARK_ACCOUNT_SPEC, vault_id: vaultId, vault_pub: pub, count: tip.seq, tip: tip.row_hash, written: false, deniable: true };
    }

    if (op === "account_recall") {
      if (!hosted && !meta.session_ok) {
        const ts = p.ts;
        if (!okTs(ts, now)) return refuse("ARK-STALE");
        if (!(await verifySig(pub, String(p.user_sig || ""), recallMessage(vaultId, ts)))) return refuse("ARK-SIG-BAD");
      }
      const limit = Math.min(RECALL_MAX, Math.max(1, Number.isInteger(p.limit) ? p.limit : 20));
      const rows = [];
      for (let s = tip.seq; s >= 1 && rows.length < limit; s--) {
        const raw = await kv.get(rowKey(vaultId, s));
        if (raw == null) throw new Error("gap");
        const row = JSON.parse(raw);
        if (hosted) {
          const { ct_b64, ...pub_ } = row;
          rows.push({ ...pub_, data: await openData(keys.encKey, vaultId, row.seq, ct_b64) });
        } else rows.push(row);
      }
      return { ok: true, code: "ARK-OK", spec: ARK_ACCOUNT_SPEC, vault_id: vaultId, count: tip.seq, rows, written: false };
    }

    // account_append
    const seq = tip.seq + 1;
    let kind, ct_b64, ct_sha256, ts, user_sig;
    if (hosted) {
      if (typeof p.data !== "string" || p.data.length === 0 || p.data.length > DATA_MAX) return refuse("ARK-INPUT");
      kind = p.kind === undefined ? "note" : p.kind;
      if (typeof kind !== "string" || !KIND_RE.test(kind)) return refuse("ARK-INPUT");
      ts = now;
      ct_b64 = await sealData(keys.encKey, vaultId, seq, p.data);
      ct_sha256 = hex(await sha256(ct_b64));
      user_sig = await signBytes(keys.signKey, appendMessage({ spec: ARK_ACCOUNT_SPEC, vault_id: vaultId, seq, prev: tip.row_hash, kind, ct_sha256, ts }));
    } else {
      ({ kind, ct_b64, ct_sha256, ts, user_sig } = p);
      if (p.seq !== seq || p.prev !== tip.row_hash) return refuse("ARK-STALE");
      if (typeof kind !== "string" || !KIND_RE.test(kind)) return refuse("ARK-INPUT");
      if (typeof ct_b64 !== "string" || ct_b64.length === 0 || ct_b64.length > DATA_MAX * 2) return refuse("ARK-INPUT");
      if (ct_sha256 !== hex(await sha256(ct_b64))) return refuse("ARK-INPUT");
      if (!okTs(ts, now)) return refuse("ARK-STALE");
      if (!(await verifySig(pub, String(user_sig || ""), appendMessage({ spec: ARK_ACCOUNT_SPEC, vault_id: vaultId, seq, prev: tip.row_hash, kind, ct_sha256, ts })))) return refuse("ARK-SIG-BAD");
    }
    if ((await kv.get(rowKey(vaultId, seq))) != null) return refuse("ARK-STALE"); // append-only: never overwrite
    const row = await sealRow({ spec: ARK_ACCOUNT_SPEC, vault_id: vaultId, seq, prev: tip.row_hash, ts, kind, ct_b64, ct_sha256, user_pub: pub, user_sig, signed_by: "user", _prev_primary: tip.primary, _prev_secondary: tip.secondary });
    await kv.put(rowKey(vaultId, seq), JSON.stringify(row));
    await kv.put(tipKey(vaultId), JSON.stringify({ seq, row_hash: row.row_hash, primary: row.lattice.primary, secondary: row.lattice.secondary }));
    const back = JSON.parse((await kv.get(tipKey(vaultId))) || "null");
    if (!back || back.row_hash !== row.row_hash) return refuse("ARK-STALE"); // no KV CAS: lost race is reported
    const { ct_b64: _c, ...view } = row;
    return { ok: true, code: "ARK-OK", spec: ARK_ACCOUNT_SPEC, written: true, sealed: true, runtime_signed: false, row: view };
  } catch {
    return refuse("ARK-FAIL-CLOSED");
  }
}

/** Verify one vault's rows: seq/prev/row_hash/lattice links and user_sig. Read-only. */
export async function verifyArkRows(rows, tip = null) {
  let prev = LATTICE_GENESIS, pp = LATTICE_GENESIS, ps = LATTICE_GENESIS;
  for (const [i, r] of rows.entries()) {
    if (r.seq !== i + 1 || r.prev !== prev) return { ok: false, at: i + 1, why: "link" };
    if (typeof r.ct_b64 === "string" && hex(await sha256(r.ct_b64)) !== r.ct_sha256) return { ok: false, at: i + 1, why: "ct_sha256" };
    const { row_hash, ...rest } = r;
    if (hex(await sha256(canonical(rest))) !== row_hash) return { ok: false, at: i + 1, why: "row_hash" };
    if (r.lattice.primary !== (await latticePrimary(r.ct_sha256, pp))) return { ok: false, at: i + 1, why: "primary" };
    if (r.lattice.secondary !== (await latticeOnlineSecondary(r.lattice.primary, ps))) return { ok: false, at: i + 1, why: "secondary" };
    if (!(await verifySig(r.user_pub, r.user_sig, appendMessage(r)))) return { ok: false, at: i + 1, why: "user_sig" };
    if ((await vaultIdOf(r.user_pub)) !== r.vault_id) return { ok: false, at: i + 1, why: "vault_id" };
    prev = row_hash; pp = r.lattice.primary; ps = r.lattice.secondary;
  }
  // Bind to the stored tip: catches a last-row swap or a truncated history.
  if (tip && (tip.seq !== rows.length || tip.row_hash !== prev)) return { ok: false, at: rows.length, why: "tip" };
  return { ok: true, n: rows.length };
}

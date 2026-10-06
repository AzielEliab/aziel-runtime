/**
 * Runtime → AZ-OS cross-tether (AUDIT-2026-10-04 §5.3). AZRT-AZOS-TETHER-1.0.
 *
 * The runtime SENDS signed dual-lattice tips. AZ-OS CHECKS and STORES them over
 * its own tracker API (POST /v1/tether/tip on azos-download-tracker).
 *
 * This is not FragGate `azos` `lattice`, which stays refused (REMAIN-OFF item 8,
 * STUB_OPS.azos exec/shell/lattice in src/fraggate/registry.js). It is not
 * AZ-OS /v1/exec, not a shell session, and not the tracker's TemporalLock
 * /v1/lattice bind. The runtime never runs code inside AZ-OS.
 *
 * Signing key: Worker secret TETHER_SIGNING_SEED (32-byte hex Ed25519 seed).
 * Absent secret → TETHER-KEY-ABSENT, nothing is sent, azos_updated false.
 * azos_updated is true only when AZ-OS answered stored+verified for that exact tip.
 * Not mesh membership. Not second_device. Not a public ledger. Not courtroom proof.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { canonicalize, sha256Hex } from "./session-core.js";
import { LATTICE_GENESIS, LATTICE_SPEC, isHex64, verifyLattice } from "./dual-lattice.js";
import { ROSTER, loadChain } from "./chainlock/ops.js";
import { storeFor } from "./chainlock/store.js";

export const TETHER_SPEC = "AZRT-AZOS-TETHER-1.0";
export const TETHER_KIND = "azrt-lattice-tip";
export const TETHER_ROUTE = "/v1/tether/tip";
export const TETHER_STATUS_ROUTE = "/v1/tether";
export const TETHER_AZOS_ORIGIN = "https://azos-download-tracker.vibelock.workers.dev";
export const TETHER_ROW_CAP = 64;

const ED_PKCS8_PREFIX = Uint8Array.from([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

export const TETHER_FACTS = Object.freeze({
  spec: TETHER_SPEC,
  direction: "runtime-sends, azos-verifies-and-stores",
  azos_route: TETHER_ROUTE,
  azos_lattice_refusal_stays: true,
  remain_off_item: 8,
  runtime_exec_into_azos: false,
  uses_fraggate_azos_lattice: false,
  mesh_node: false,
  second_device: false,
  alt_internet_live: false,
  public_ledger: false,
  courtroom_proof: false,
  author: "Aziel Eliab",
});

function b64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hexBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Import the tether signing key from the Worker secret. Returns null when absent or malformed. */
export async function tetherKey(env) {
  const raw = String((env && env.TETHER_SIGNING_SEED) || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(raw)) return null;
  const seed = hexBytes(raw);
  const pkcs8 = new Uint8Array(ED_PKCS8_PREFIX.length + seed.length);
  pkcs8.set(ED_PKCS8_PREFIX, 0);
  pkcs8.set(seed, ED_PKCS8_PREFIX.length);
  const privateKey = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, true, ["sign"]);
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return { privateKey, public_key: String(jwk.x || "") };
}

export function tetherStatement(packet) {
  const { sig: _omit, ...unsigned } = packet || {};
  return canonicalize(unsigned);
}

export async function signTetherPacket(key, packet) {
  const bytes = new TextEncoder().encode(tetherStatement(packet));
  const sig = new Uint8Array(await crypto.subtle.sign("Ed25519", key.privateKey, bytes));
  return { ...packet, sig: b64url(sig) };
}

function rowOf(lat, seq) {
  return {
    seq,
    document_hash: lat.document_hash,
    primary: lat.primary,
    primary_prev: lat.primary_prev,
    secondary: lat.secondary,
    secondary_prev: lat.secondary_prev,
    offline: lat.offline === true,
    username: lat.offline === true ? lat.username : null,
    lattices: ["primary", "secondary"],
  };
}

/** Lattice rows of one chain, in order, with their position in the chain. */
export function latticeRowsOf(rows) {
  const out = [];
  (rows || []).forEach((row, i) => {
    const lat = row && row.lattice;
    if (lat && isHex64(lat.primary) && isHex64(lat.secondary)) out.push(rowOf(lat, i));
  });
  return out;
}

/** Rows after the tip AZ-OS already stored. Returns null when that tip is not on this chain (fork). */
export function rowsSince(latticeRows, acked) {
  const tip = acked && isHex64(acked.primary) ? acked.primary : LATTICE_GENESIS;
  if (tip === LATTICE_GENESIS) return latticeRows.slice();
  const at = latticeRows.findIndex((row) => row.primary === tip);
  if (at < 0) return null;
  return latticeRows.slice(at + 1);
}

export async function buildTetherPacket({ key, chain, rows, gitSha, t }) {
  const last = rows[rows.length - 1];
  const packet = {
    spec: TETHER_SPEC,
    kind: TETHER_KIND,
    lattice_spec: LATTICE_SPEC,
    source: "aziel-runtime",
    chain,
    rows,
    tips: last ? { primary: last.primary, secondary: last.secondary } : null,
    git_sha: gitSha || null,
    t: t || new Date().toISOString(),
    public_key: key.public_key,
    author: "Aziel Eliab",
  };
  packet.packet_hash = await sha256Hex(canonicalize(packet));
  return signTetherPacket(key, packet);
}

function azosFetcher(env) {
  if (env && env.AZOS && typeof env.AZOS.fetch === "function") return (url, init) => env.AZOS.fetch(url, init);
  return null;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** AZ-OS stored tips per chain (GET /v1/tether on the tracker). */
export async function azosTetherState(env, fetcher = azosFetcher(env)) {
  if (!fetcher) return { ok: false, code: "TETHER-AZOS-UNBOUND", chains: {} };
  const res = await fetcher(TETHER_AZOS_ORIGIN + TETHER_STATUS_ROUTE, { headers: { accept: "application/json" } });
  const body = await readJson(res);
  if (!res.ok || !body || typeof body !== "object") return { ok: false, code: "TETHER-AZOS-STATUS", status: res.status, chains: {} };
  const chains = {};
  for (const row of Array.isArray(body.chains) ? body.chains : []) {
    if (row && row.chain) chains[row.chain] = row;
  }
  return { ok: true, chains, public_key: body.public_key || null };
}

/**
 * Push one chain's new lattice rows to AZ-OS. Batches of TETHER_ROW_CAP.
 * Returns azos_updated true only when AZ-OS answered stored+verified for the
 * runtime's current tip of that chain.
 */
export async function pushChain(env, chain, opts = {}) {
  const key = opts.key || (await tetherKey(env));
  const base = { chain, spec: TETHER_SPEC, ...TETHER_FACTS };
  if (!key) {
    return { ...base, ok: false, code: "TETHER-KEY-ABSENT", azos_updated: false, sent: false, message: "TETHER_SIGNING_SEED is not set, so nothing was sent to AZ-OS." };
  }
  const fetcher = opts.fetcher || azosFetcher(env);
  if (!fetcher) return { ...base, ok: false, code: "TETHER-AZOS-UNBOUND", azos_updated: false, sent: false };
  const store = opts.store || storeFor(env);
  const all = await loadChain(store, chain);
  const local = await verifyLattice(all.filter((row) => row && !row._broken));
  if (!local.ok) return { ...base, ok: false, code: "TETHER-LOCAL-BROKEN", breaks: local.breaks, azos_updated: false, sent: false };
  const latticeRows = latticeRowsOf(all);
  if (!latticeRows.length) return { ...base, ok: true, code: "TETHER-NOTHING", azos_updated: false, sent: false, lattice_rows: 0 };
  const localTip = { primary: local.tips.primary, secondary: local.tips.secondary };
  const acked = opts.acked !== undefined ? opts.acked : ((await azosTetherState(env, fetcher)).chains[chain] || null);
  const ackedTip = acked && acked.tips ? acked.tips : null;
  if (ackedTip && ackedTip.primary === localTip.primary && ackedTip.secondary === localTip.secondary && acked.verified === true) {
    return { ...base, ok: true, code: "TETHER-CURRENT", azos_updated: true, sent: false, tip: localTip, azos: acked };
  }
  const pending = rowsSince(latticeRows, ackedTip);
  if (pending == null) {
    return { ...base, ok: false, code: "TETHER-FORK", azos_updated: false, sent: false, tip: localTip, azos_tip: ackedTip };
  }
  let ack = null;
  let sentRows = 0;
  for (let i = 0; i < pending.length; i += TETHER_ROW_CAP) {
    const batch = pending.slice(i, i + TETHER_ROW_CAP);
    const packet = await buildTetherPacket({ key, chain, rows: batch, gitSha: env && env.GIT_SHA, t: opts.t });
    const res = await fetcher(TETHER_AZOS_ORIGIN + TETHER_ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(packet),
    });
    ack = await readJson(res);
    if (!res.ok || !ack || ack.ok !== true) {
      return { ...base, ok: false, code: (ack && ack.code) || "TETHER-AZOS-REFUSED", status: res.status, azos: ack, azos_updated: false, sent: true, rows_sent: sentRows };
    }
    sentRows += batch.length;
  }
  const stored = Boolean(ack && ack.stored === true && ack.verified === true && ack.tips &&
    ack.tips.primary === localTip.primary && ack.tips.secondary === localTip.secondary);
  return {
    ...base,
    ok: stored,
    code: stored ? "TETHER-STORED" : "TETHER-UNACKED",
    azos_updated: stored,
    sent: true,
    rows_sent: sentRows,
    tip: localTip,
    azos: ack,
  };
}

/** Push every roster chain that has lattice rows. Used by cron and POST /v1/tether/push. */
export async function pushAll(env, opts = {}) {
  const key = opts.key || (await tetherKey(env));
  if (!key) {
    return { ok: false, code: "TETHER-KEY-ABSENT", azos_updated: false, sent: false, chains: [], ...TETHER_FACTS };
  }
  const fetcher = opts.fetcher || azosFetcher(env);
  const state = await azosTetherState(env, fetcher);
  if (!state.ok) return { ok: false, code: state.code, azos_updated: false, sent: false, chains: [], ...TETHER_FACTS };
  const store = opts.store || storeFor(env);
  const out = [];
  for (const chain of opts.chains || ROSTER) {
    const res = await pushChain(env, chain, { ...opts, key, fetcher, store, acked: state.chains[chain] || null });
    if (res.code === "TETHER-NOTHING") continue;
    out.push(res);
  }
  const updated = out.length > 0 && out.every((row) => row.azos_updated === true);
  return {
    ok: out.every((row) => row.ok),
    code: out.length ? (updated ? "TETHER-STORED" : "TETHER-PARTIAL") : "TETHER-NOTHING",
    azos_updated: updated,
    chains: out.map((row) => ({ chain: row.chain, code: row.code, azos_updated: row.azos_updated, rows_sent: row.rows_sent || 0, tip: row.tip || null })),
    ...TETHER_FACTS,
  };
}

/** Public read: spec, signing public key (no secret), and AZ-OS stored tips. */
export async function tetherStatus(env, opts = {}) {
  const key = await tetherKey(env);
  const fetcher = opts.fetcher || azosFetcher(env);
  let azos = { ok: false, chains: {} };
  if (fetcher) {
    try {
      azos = await azosTetherState(env, fetcher);
    } catch {
      azos = { ok: false, code: "TETHER-AZOS-STATUS", chains: {} };
    }
  }
  const chains = Object.values(azos.chains || {});
  const keyMatches = Boolean(key && azos.public_key && azos.public_key === key.public_key);
  return {
    ok: true,
    ...TETHER_FACTS,
    key_present: Boolean(key),
    public_key: key ? key.public_key : null,
    azos_public_key: azos.public_key || null,
    azos_key_matches: keyMatches,
    azos_reachable: azos.ok === true,
    azos_chains: chains,
    azos_updated: keyMatches && chains.length > 0 && chains.every((row) => row.verified === true),
    azos_updated_rule: "true only when AZ-OS pins this runtime public key and reports every stored chain tip as verified.",
    code: key ? (azos.ok ? "TETHER-STATUS" : "TETHER-AZOS-UNREACHABLE") : "TETHER-KEY-ABSENT",
  };
}

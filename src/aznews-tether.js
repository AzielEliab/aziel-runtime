/**
 * AZNews -> AZ-OS signed copy (AZRT-AZOS-NEWS-1.0).
 *
 * The AzNewsStore object SENDS its own ledger rows (items, pins, pull and view
 * receipts, weather, sky; each with its document and both lattice hashes) to the
 * AZ-OS tracker, in order from genesis, signed with the same Ed25519 tether key as
 * AZRT-AZOS-TETHER-1.0 (TETHER_SIGNING_SEED). AZ-OS checks the signature against its
 * pinned runtime key, recomputes every document hash and both lattice links from the
 * tip it already stored, and only then keeps the rows in its own Durable Object
 * (SQLite). That copy is what AZ-OS serves standalone when this runtime is
 * unreachable. Offline view rows carry only the vh-<sha256> viewer hash.
 *
 * Bounded per tick: at most PACKETS_PER_PUSH packets of at most ROWS_PER_PACKET rows
 * and BYTES_PER_PACKET bytes. Runs inside the object (its own subrequest budget).
 * No KV, no D1. Never execs into AZ-OS. Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "./session-core.js";
import { LATTICE_GENESIS, LATTICE_SPEC } from "./dual-lattice.js";
import { tetherKey, signTetherPacket, TETHER_AZOS_ORIGIN } from "./azos-tether.js";

export const NEWS_TETHER_SPEC = "AZRT-AZOS-NEWS-1.0";
export const NEWS_TETHER_KIND = "aznews-rows";
export const NEWS_TETHER_ROUTE = "/v1/tether/aznews";
export const MAP_TETHER_SPEC = "AZRT-MAP-COPY-1.0";
export const MAP_TETHER_KIND = "map-rows";
export const MAP_TETHER_ROUTE = "/v1/tether/4dmap";
/** Signed copy chains. Each is its own ledger (own Durable Object) and its own route on the receiver. */
export const COPY_CHAINS = Object.freeze({
  aznews: { chain: "aznews", spec: NEWS_TETHER_SPEC, kind: NEWS_TETHER_KIND, route: NEWS_TETHER_ROUTE, source: "aziel-runtime AzNewsStore aznews-v1" },
  "4dmap": { chain: "4dmap", spec: MAP_TETHER_SPEC, kind: MAP_TETHER_KIND, route: MAP_TETHER_ROUTE, source: "aziel-runtime 4DMap store 4dmap-v1" },
});
export const AZINTERFACE_ORIGIN = "https://azinterface-download-tracker.vibelock.workers.dev";
/** Receivers that keep their own verified copy. Service bindings only (no public fetch). */
export function copyTargets(env) {
  const out = [];
  if (env && env.AZOS && typeof env.AZOS.fetch === "function") out.push({ name: "azos", origin: TETHER_AZOS_ORIGIN, fetcher: (u, i) => env.AZOS.fetch(u, i) });
  if (env && env.AZINTERFACE && typeof env.AZINTERFACE.fetch === "function") out.push({ name: "azinterface", origin: AZINTERFACE_ORIGIN, fetcher: (u, i) => env.AZINTERFACE.fetch(u, i) });
  return out;
}
export const ROWS_PER_PACKET = 150;
export const BYTES_PER_PACKET = 700000;
export const PACKETS_PER_PUSH = 3;

function rowOut(row) {
  return { seq: row.seq, kind: row.kind, at: row.at || null, doc: row.doc, lattice: row.lattice };
}

/** Build one signed packet of rows after `afterSeq` (contiguous, in order). Pure apart from repo reads. */
export async function buildNewsPacket({ key, repo, afterSeq, expect, gitSha, t, maxRows = ROWS_PER_PACKET, maxBytes = BYTES_PER_PACKET, chain = "aznews" }) {
  const cc = COPY_CHAINS[chain];
  const total = await repo.count();
  if (afterSeq >= total) return { packet: null, total };
  const rows = await repo.rowRange(afterSeq + 1, Math.min(total, afterSeq + maxRows));
  const out = [];
  let bytes = 0;
  let prev = expect || { primary: LATTICE_GENESIS, secondary: LATTICE_GENESIS };
  for (const row of rows) {
    if (row.seq !== afterSeq + out.length + 1) break;
    if (row.lattice.primary_prev !== prev.primary || row.lattice.secondary_prev !== prev.secondary) {
      return { fork: true, at_seq: row.seq, total };
    }
    const r = rowOut(row);
    const size = JSON.stringify(r).length;
    if (out.length && bytes + size > maxBytes) break;
    out.push(r);
    bytes += size;
    prev = { primary: row.lattice.primary, secondary: row.lattice.secondary };
  }
  if (!out.length) return { packet: null, total };
  const last = out[out.length - 1];
  const tips = (await repo.metaGet("tips")) || null;
  const packet = {
    spec: cc.spec,
    kind: cc.kind,
    lattice_spec: LATTICE_SPEC,
    source: cc.source,
    chain: cc.chain,
    after_seq: afterSeq,
    rows: out,
    tips: { primary: last.lattice.primary, secondary: last.lattice.secondary, seq: last.seq },
    store_tip: tips ? { primary: tips.primary, secondary: tips.secondary, seq: total } : { seq: total },
    git_sha: gitSha || null,
    t: t || new Date().toISOString(),
    public_key: key.public_key,
    author: "Aziel Eliab",
  };
  packet.packet_hash = await sha256Hex(canonicalize(packet));
  return { packet: await signTetherPacket(key, packet), total, bytes };
}

async function readJson(res) {
  try { return await res.json(); } catch { return null; }
}

/** Push the next rows of one chain to one receiver. Called inside the store object after a tick. */
export async function pushNewsCopy(env, repo, opts = {}) {
  const chain = opts.chain || "aznews";
  const cc = COPY_CHAINS[chain];
  const origin = opts.origin || TETHER_AZOS_ORIGIN;
  const base = { spec: cc.spec, chain, target: opts.target || "azos" };
  const key = opts.key || (await tetherKey(env));
  if (!key) return { ...base, ok: false, code: "NEWS-TETHER-KEY-ABSENT", sent: false };
  const fetcher = opts.fetcher || (env && env.AZOS && typeof env.AZOS.fetch === "function" ? (u, i) => env.AZOS.fetch(u, i) : null);
  if (!fetcher) return { ...base, ok: false, code: "NEWS-TETHER-AZOS-UNBOUND", sent: false };
  const stRes = await fetcher(origin + cc.route, { headers: { accept: "application/json" } });
  const st = await readJson(stRes);
  if (!stRes.ok || !st || st.ok !== true) return { ...base, ok: false, code: "NEWS-TETHER-AZOS-STATUS", status: stRes.status, sent: false };
  let after = Number(st.tip_seq) || 0;
  let expect = st.tips && st.tips.primary ? { primary: st.tips.primary, secondary: st.tips.secondary } : null;
  if (after > 0) {
    const mine = await repo.rowGet(after);
    if (!mine || !expect || mine.lattice.primary !== expect.primary || mine.lattice.secondary !== expect.secondary) {
      return { ...base, ok: false, code: "NEWS-TETHER-FORK", sent: false, azos_tip_seq: after };
    }
  }
  const packets = [];
  let total = await repo.count();
  for (let i = 0; i < (opts.packets || PACKETS_PER_PUSH); i++) {
    const built = await buildNewsPacket({ key, repo, afterSeq: after, expect, gitSha: env && env.GIT_SHA, t: opts.t, maxRows: opts.maxRows, maxBytes: opts.maxBytes, chain });
    total = built.total;
    if (built.fork) return { ...base, ok: false, code: "NEWS-TETHER-FORK", sent: packets.length > 0, at_seq: built.at_seq, packets };
    if (!built.packet) break;
    const res = await fetcher(origin + cc.route, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(built.packet),
    });
    const ack = await readJson(res);
    if (!res.ok || !ack || ack.ok !== true) {
      return { ...base, ok: false, code: (ack && ack.code) || "NEWS-TETHER-AZOS-REFUSED", status: res.status, sent: true, packets, azos: ack };
    }
    packets.push({ rows: built.packet.rows.length, to_seq: built.packet.tips.seq, bytes: built.bytes });
    after = built.packet.tips.seq;
    expect = { primary: built.packet.tips.primary, secondary: built.packet.tips.secondary };
  }
  return { ...base, ok: true, code: packets.length ? "NEWS-TETHER-STORED" : "NEWS-TETHER-CURRENT", sent: packets.length > 0, packets, azos_tip_seq: after, runtime_tip_seq: total, lag_rows: Math.max(0, total - after) };
}

/** Push one chain to every bound receiver (AZ-OS, AZInterface). One failure does not stop the other. */
export async function pushCopies(env, repo, { chain = "aznews", ...opts } = {}) {
  const targets = opts.targets || copyTargets(env);
  const key = opts.key || (await tetherKey(env));
  const out = [];
  for (const t of targets) {
    try {
      out.push(await pushNewsCopy(env, repo, { ...opts, key, chain, target: t.name, origin: t.origin, fetcher: t.fetcher }));
    } catch (err) {
      out.push({ chain, target: t.name, ok: false, code: "NEWS-TETHER-ERROR", message: String((err && err.message) || err).slice(0, 160) });
    }
  }
  return { ok: out.length > 0 && out.every((r) => r.ok), chain, targets: out.map((r) => ({ target: r.target, code: r.code, packets: (r.packets || []).length, tip_seq: r.azos_tip_seq, lag_rows: r.lag_rows })) };
}

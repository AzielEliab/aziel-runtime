/**
 * Runtime → AZ-OS cross-tether (AZRT-AZOS-TETHER-1.0, AUDIT-2026-10-04 §5.3).
 * The runtime signs dual-lattice tips and posts them to the AZ-OS tracker.
 * azos_updated is true only when AZ-OS answered stored+verified for that exact tip.
 * The runtime `azos` `lattice` / `exec` / `shell` refusal stays (REMAIN-OFF item 8).
 * Writes fixtures/azos-tether-vector.json (test seed only) for the AZ-OS repo test.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import {
  TETHER_FACTS,
  TETHER_ROUTE,
  buildTetherPacket,
  latticeRowsOf,
  pushAll,
  pushChain,
  rowsSince,
  tetherKey,
  tetherStatement,
  tetherStatus,
} from "../src/azos-tether.js";
import { LATTICE_GENESIS, verifyLattice } from "../src/dual-lattice.js";
import { append } from "../src/chainlock/ops.js";
import { MemoryStore } from "../src/chainlock/store.js";
import { STUB_OPS, classifyCall, buildRegistry } from "../src/fraggate/registry.js";
import { canonicalize } from "../src/session-core.js";

const TEST_SEED = "11".repeat(32); // test-only seed; never the production key
const OTHER_SEED = "22".repeat(32);

function b64urlBytes(text) {
  return new Uint8Array(Buffer.from(String(text).replace(/-/g, "+").replace(/_/g, "/"), "base64"));
}

async function sigOk(publicKey, packet) {
  const key = await crypto.subtle.importKey("raw", b64urlBytes(publicKey), { name: "Ed25519" }, false, ["verify"]);
  return crypto.subtle.verify("Ed25519", key, b64urlBytes(packet.sig), new TextEncoder().encode(tetherStatement(packet)));
}

/** In-test AZ-OS tracker double: verifies signature, recomputes both chains, links to stored tip, stores. */
function mockAzos(pinned) {
  const state = new Map();
  const calls = [];
  const fetcher = async (url, init = {}) => {
    const path = new URL(url).pathname;
    calls.push({ path, method: init.method || "GET" });
    if (path === "/v1/tether" && (init.method || "GET") === "GET") {
      return Response.json({ ok: true, public_key: pinned, chains: [...state.values()] });
    }
    if (path === TETHER_ROUTE && init.method === "POST") {
      const packet = JSON.parse(init.body);
      if (packet.public_key !== pinned || !(await sigOk(pinned, packet))) {
        return Response.json({ ok: false, code: "TETHER-SIG", stored: false, verified: false }, { status: 403 });
      }
      const prev = state.get(packet.chain);
      const anchor = prev ? prev.tips : { primary: LATTICE_GENESIS, secondary: LATTICE_GENESIS };
      const res = await verifyLattice(packet.rows, { pick: (row) => row, anchor, legacyAllowed: false });
      if (!res.ok) return Response.json({ ok: false, code: "TETHER-LINK", stored: false, verified: false, breaks: res.breaks }, { status: 409 });
      const row = { chain: packet.chain, tips: res.tips, rows: (prev ? prev.rows : 0) + packet.rows.length, verified: true };
      state.set(packet.chain, row);
      return Response.json({ ok: true, stored: true, verified: true, chain: packet.chain, tips: res.tips, rows: row.rows });
    }
    if (path.startsWith("/v1/exec") || path.startsWith("/v1/session") || path === "/v1/lattice") {
      throw new Error("tether must not call AZ-OS exec, session, or the TemporalLock lattice route");
    }
    return new Response("not found", { status: 404 });
  };
  return { fetcher, state, calls };
}

// --- 1. No secret: nothing is sent, azos_updated false -------------------------
{
  const store = new MemoryStore();
  await append(store, { c: "evidence", fact: "x" });
  const azos = mockAzos("unused");
  const res = await pushChain({}, "evidence", { store, fetcher: azos.fetcher });
  assert.equal(res.code, "TETHER-KEY-ABSENT");
  assert.equal(res.azos_updated, false);
  assert.equal(res.sent, false);
  assert.equal(azos.calls.length, 0);
  const all = await pushAll({}, { store, fetcher: azos.fetcher });
  assert.equal(all.azos_updated, false);
  const status = await tetherStatus({}, { fetcher: azos.fetcher });
  assert.equal(status.key_present, false);
  assert.equal(status.azos_updated, false);
}

// --- 2. Signed push stores and verifies; azos_updated true only on matching ack ----
const env = { TETHER_SIGNING_SEED: TEST_SEED, GIT_SHA: "a".repeat(40) };
const key = await tetherKey(env);
assert.match(key.public_key, /^[A-Za-z0-9_-]{43}$/);
const store = new MemoryStore();
await append(store, { c: "evidence", subject: "one", fact: "first" });
await append(store, { c: "evidence", subject: "two", fact: "second" });
await append(store, { c: "evidence", subject: "field", fact: "offline note", offline: true, username: "azuser" });
await append(store, { c: "acts", fact: "act one" });
const azos = mockAzos(key.public_key);
const pushed = await pushAll(env, { store, fetcher: azos.fetcher });
assert.equal(pushed.ok, true, JSON.stringify(pushed));
assert.equal(pushed.azos_updated, true);
assert.deepEqual(pushed.chains.map((c) => c.chain).sort(), ["acts", "evidence"]);
assert.equal(azos.state.get("evidence").rows, 3);
assert.equal(azos.calls.filter((c) => c.method === "POST").length, 2);
for (const c of azos.calls) assert.ok(c.path === "/v1/tether" || c.path === TETHER_ROUTE, `only tether routes: ${c.path}`);

// Current tip: nothing re-sent, still updated.
const again = await pushChain(env, "evidence", { store, fetcher: azos.fetcher });
assert.equal(again.code, "TETHER-CURRENT");
assert.equal(again.azos_updated, true);
assert.equal(again.sent, false);

// Incremental: only the new row is sent and it links to the stored tip.
await append(store, { c: "evidence", fact: "third" });
const inc = await pushChain(env, "evidence", { store, fetcher: azos.fetcher });
assert.equal(inc.code, "TETHER-STORED");
assert.equal(inc.rows_sent, 1);
assert.equal(azos.state.get("evidence").rows, 4);

const status = await tetherStatus(env, { fetcher: azos.fetcher });
assert.equal(status.key_present, true);
assert.equal(status.azos_key_matches, true);
assert.equal(status.azos_updated, true);
assert.equal(status.public_key, key.public_key);
assert.equal(JSON.stringify(status).includes(TEST_SEED), false, "status never prints the seed");

// --- 3. Wrong key: AZ-OS refuses, azos_updated false ---------------------------------
{
  const wrong = mockAzos((await tetherKey({ TETHER_SIGNING_SEED: OTHER_SEED })).public_key);
  const res = await pushChain(env, "evidence", { store, fetcher: wrong.fetcher });
  assert.equal(res.ok, false);
  assert.equal(res.azos_updated, false);
  assert.equal(wrong.state.size, 0);
  const st = await tetherStatus(env, { fetcher: wrong.fetcher });
  assert.equal(st.azos_key_matches, false);
  assert.equal(st.azos_updated, false);
}

// --- 4. An ack for a different tip does not count ------------------------------------
{
  const liar = async (url, init = {}) => {
    const path = new URL(url).pathname;
    if (path === "/v1/tether") return Response.json({ ok: true, public_key: key.public_key, chains: [] });
    return Response.json({ ok: true, stored: true, verified: true, tips: { primary: "b".repeat(64), secondary: "c".repeat(64) } });
  };
  const res = await pushChain(env, "evidence", { store, fetcher: liar });
  assert.equal(res.azos_updated, false);
  assert.equal(res.code, "TETHER-UNACKED");
}

// --- 5. Fork: AZ-OS holds a tip that is not on this chain -----------------------------
{
  const rows = latticeRowsOf(await store.loadRecords("evidence"));
  assert.equal(rowsSince(rows, { primary: "d".repeat(64) }), null);
  const res = await pushChain(env, "evidence", { store, fetcher: azos.fetcher, acked: { tips: { primary: "d".repeat(64), secondary: "e".repeat(64) } } });
  assert.equal(res.code, "TETHER-FORK");
  assert.equal(res.azos_updated, false);
}

// --- 6. Tampered packet fails signature ----------------------------------------------
{
  const rows = latticeRowsOf(await store.loadRecords("acts"));
  const packet = await buildTetherPacket({ key, chain: "acts", rows, gitSha: "f".repeat(40), t: "2026-10-05T00:00:00.000Z" });
  assert.equal(await sigOk(key.public_key, packet), true);
  const tampered = structuredClone(packet);
  tampered.rows[0].secondary = "0".repeat(63) + "1";
  assert.equal(await sigOk(key.public_key, tampered), false);
}

// --- 7. The refusal stays: FragGate azos exec/shell/lattice ---------------------------
for (const op of ["exec", "shell", "lattice"]) assert.ok(STUB_OPS.azos.includes(op), `azos ${op} stays refused`);
assert.equal(TETHER_FACTS.azos_lattice_refusal_stays, true);
assert.equal(TETHER_FACTS.runtime_exec_into_azos, false);
assert.equal(TETHER_FACTS.uses_fraggate_azos_lattice, false);
assert.equal(TETHER_FACTS.mesh_node, false);
assert.equal(TETHER_FACTS.second_device, false);
assert.equal(TETHER_FACTS.alt_internet_live, false);

// --- 8. Cross-repo vector (test seed) --------------------------------------------------
{
  const vstore = new MemoryStore();
  await append(vstore, { c: "evidence", id: "cl_vector000000000000000001", t: "2026-10-05T00:00:00.000Z", subject: "vector", fact: "first vector fact" });
  await append(vstore, { c: "evidence", id: "cl_vector000000000000000002", t: "2026-10-05T00:00:01.000Z", subject: "vector", fact: "offline vector fact", offline: true, username: "azuser" });
  await append(vstore, { c: "evidence", id: "cl_vector000000000000000003", t: "2026-10-05T00:00:02.000Z", subject: "vector", fact: "third vector fact" });
  const rows = latticeRowsOf(await vstore.loadRecords("evidence"));
  const first = await buildTetherPacket({ key, chain: "evidence", rows: rows.slice(0, 2), gitSha: "0".repeat(40), t: "2026-10-05T00:00:03.000Z" });
  const second = await buildTetherPacket({ key, chain: "evidence", rows: rows.slice(2), gitSha: "0".repeat(40), t: "2026-10-05T00:00:04.000Z" });
  const vector = {
    spec: "AZRT-AZOS-TETHER-1.0",
    note: "Test vector signed with a public test-only seed (0x11 * 32). Not the production key. The AZ-OS repo copies this file and must verify and store it.",
    test_public_key: key.public_key,
    packets: [first, second],
    final_tips: second.tips,
  };
  const path = new URL("../fixtures/azos-tether-vector.json", import.meta.url);
  const text = JSON.stringify(vector, null, 2) + "\n";
  let existing = null;
  try {
    existing = readFileSync(path, "utf8");
  } catch {
    existing = null;
  }
  if (process.argv.includes("--write") || existing == null) writeFileSync(path, text);
  else assert.equal(existing, text, "fixtures/azos-tether-vector.json is stale; run node scripts/verify-azos-tether.mjs --write");
  // Same canonical form as AZ-OS (sorted keys, no spaces).
  assert.equal(canonicalize({ b: 1, a: [true, null, "x"] }), '{"a":[true,null,"x"],"b":1}');
}

console.log("ok azos-tether: signed dual-lattice tips stored and verified by an AZ-OS double; no key → not sent; wrong key, wrong ack, fork, and tamper → azos_updated false; azos exec/shell/lattice refusal stays");

/**
 * Regression: 2026-10-08 POST /mcp answered HTTP 500 (error 1101) because
 * putMcpSession threw "KV put() limit exceeded for the day" once the account's
 * daily Workers KV put quota ran out (use counters + mesh roster cron spent it).
 *
 * 1. MCP initialize / tools/list answer 200 while USES KV put() throws the quota error,
 *    with and without the RUNTIME_KV Durable Object.
 * 2. With RUNTIME_KV, hot writes land in the Durable Object and never touch USES KV.
 * 3. Legacy KV values (use counters, MCP sessions) are still read; nothing is wiped.
 * 4. MCP initialize / tools/list still answer after N ChainLock lattice rows.
 * 5. The tether selects only rows after the AZ-OS tip, even on a long chain.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MCP_SESSION_HEADER } from "../src/mcp-transport.js";
import { hybridKv, memoryRuntimeKvNamespace, withDurableKv } from "../src/durable-kv.js";
import { memoryUsesKv, incrementUse, readUses, USES_TOTAL_SOURCE } from "../src/uses.js";
import { cachedUses, clearStatsMemo, statsFloorFor, statsFloorStorageKey } from "../src/stats-cache.js";
import { append } from "../src/chainlock/ops.js";
import { DurableStore } from "../src/chainlock/store.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { latticeRowsOf, rowsSince } from "../src/azos-tether.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const QUOTA = "KV put() limit exceeded for the day.";

function quotaKv(seed = {}) {
  const inner = memoryUsesKv(seed);
  const puts = [];
  return {
    puts,
    get: (k, o) => inner.get(k, o),
    list: (o) => inner.list(o),
    async put(k) {
      puts.push(k);
      throw new Error(QUOTA);
    },
    async delete() {
      throw new Error(QUOTA);
    },
  };
}

async function mcp(env, method, id = 1, headers = {}) {
  return handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params: method === "initialize" ? { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "kv-quota", version: "1" } } : {} }),
    }),
    env,
  );
}

async function initAndList(env, label) {
  const init = await mcp(env, "initialize");
  assert.equal(init.status, 200, `${label}: initialize must not 500`);
  const sid = init.headers.get(MCP_SESSION_HEADER) || init.headers.get("mcp-session-id");
  assert.match(sid || "", /./, `${label}: session header`);
  const list = await mcp(env, "tools/list", 2, { [MCP_SESSION_HEADER]: sid });
  assert.equal(list.status, 200, `${label}: tools/list must not 500`);
  const body = await list.json();
  assert.equal(body.result.tools.length, 36, `${label}: tools/list stays 36`);
  const cold = await mcp(env, "tools/list", 3);
  assert.equal(cold.status, 200, `${label}: session-less tools/list must not 500`);
  return sid;
}

// --- 1. Quota-exhausted USES KV, no Durable Object: still 200 --------------------
{
  const USES = quotaKv();
  await initAndList({ USES }, "kv-only quota");
  assert.ok(USES.puts.length > 0, "the quota path was exercised");
}

// --- 2. Quota-exhausted USES KV + RUNTIME_KV: writes land in the DO only --------
{
  const USES = quotaKv();
  const RUNTIME_KV = memoryRuntimeKvNamespace();
  const env = { USES, RUNTIME_KV };
  await initAndList(env, "durable");
  assert.ok([...RUNTIME_KV._map.keys()].some((k) => k.startsWith("k:mcp|") || k.includes("mcp")), "MCP session stored in RUNTIME_KV");
  assert.equal(USES.puts.length, 0, "USES KV is never written when RUNTIME_KV is bound");
  assert.equal(withDurableKv(env), withDurableKv(env), "wrapped env is cached per raw env");
  assert.equal(withDurableKv({ USES }).USES, USES, "no RUNTIME_KV: env unchanged");
}

// --- 3. Legacy values carry over (no wipe) --------------------------------------
{
  const legacy = memoryUsesKv({ total: "41", "host|a.example": "7" });
  const RUNTIME_KV = memoryRuntimeKvNamespace();
  const kv = hybridKv(RUNTIME_KV, legacy);
  assert.equal(await kv.get("total"), "41");
  await kv.put("total", "42");
  assert.equal(await kv.get("total"), "42", "Durable Object value wins");
  assert.equal(await legacy.get("total"), "41", "legacy KV left as it was");
  await kv.put("host|b.example", "1");
  await kv.put("ttl", "x", { expirationTtl: 60 });
  const names = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: "host|", cursor });
    for (const k of page.keys) names.push(k.name);
    cursor = page.list_complete === false ? page.cursor : undefined;
  } while (cursor);
  assert.deepEqual([...new Set(names)].sort(), ["host|a.example", "host|b.example"]);
  assert.equal(await kv.get('{"x":1}'), null);

  const env = { USES: legacy, RUNTIME_KV };
  const wrapped = withDurableKv(env);
  const before = await readUses(wrapped, { light: true });
  // The put above stored 42 on the object while legacy stayed 41. readUses adds them.
  assert.equal(before.uses_legacy, 41);
  assert.equal(before.uses_durable, 42);
  assert.equal(before.uses, 83);
  await incrementUse(wrapped, { host: "c.example", method: "POST", path: "/mcp" });
  const after = await readUses(wrapped);
  assert.equal(after.uses, before.uses + 1, "one new use adds one to the published total");
  assert.equal(after.uses_legacy, 41);
  assert.equal(after.uses_durable, 43);
  assert.equal(await legacy.get("total"), "41", "legacy total stays frozen");
  assert.equal(await wrapped.USES.durableGet("total"), "43", "the sum is not written back");
}

// --- 3a. Empty DO total does not absorb the frozen legacy base on the next bump --
{
  const legacy = memoryUsesKv({ total: "41" });
  const kv = hybridKv(memoryRuntimeKvNamespace(), legacy);
  const before = await readUses({ USES: kv }, { light: true });
  assert.equal(before.uses, 41);
  assert.equal(before.uses_durable, 0);
  await incrementUse({ USES: kv }, { host: "c.example", method: "POST", path: "/mcp" });
  const after = await readUses({ USES: kv }, { light: true });
  assert.equal(after.uses, 42);
  assert.equal(after.uses_legacy, 41);
  assert.equal(after.uses_durable, 1);
  assert.equal(await legacy.get("total"), "41");
  assert.equal(await kv.durableGet("total"), "1");
}

// --- 3b. Fresh DO total does not hide the frozen legacy total -------------------
{
  const legacy = memoryUsesKv({ total: "112111", "host|a.example": "7" });
  const RUNTIME_KV = memoryRuntimeKvNamespace();
  const kv = hybridKv(RUNTIME_KV, legacy);
  await kv.put("total", "5332");
  assert.equal(await kv.get("total"), "5332", "hybrid get still prefers the Durable Object");
  const before = await readUses({ USES: kv }, { light: true });
  assert.equal(before.uses, 112111 + 5332);
  assert.equal(before.uses_legacy, 112111);
  assert.equal(before.uses_durable, 5332);
  await incrementUse({ USES: kv }, { host: "c.example", method: "GET", path: "/v1/skill" });
  const after = await readUses({ USES: kv }, { light: true });
  assert.equal(after.uses, 112111 + 5333);
  assert.equal(after.uses_durable, 5333);
  const snap = await readUses({ USES: kv }, { maps: "snapshot" });
  assert.equal(snap.uses, after.uses, "snapshot read uses the same legacy+DO total");
  assert.equal(await legacy.get("total"), "112111");
  assert.equal(await kv.durableGet("total"), "5333", "DO total stays the delta");
  assert.notEqual(await kv.durableGet("total"), String(after.uses));
  clearStatsMemo();
  const floorEnv = { CHAINLOCK: memoryChainWriterNamespace({}) };
  const floor = statsFloorFor(floorEnv);
  await floor.raise("full", 112111);
  const served = await cachedUses("full", () => readUses({ USES: kv }, { light: true }), {
    now: 1_000_000,
    cache: null,
    floor,
  });
  assert.equal(served.uses, 112111 + 5333);
  assert.equal(served.cache.uses_floor_applied, false, "sum is above the floor, so the floor no longer masks");
  assert.equal(served.uses_read, undefined);
  assert.equal(served.uses_durable, 5333);
  assert.equal(served.cache.floor_epoch, USES_TOTAL_SOURCE);
}

// --- 3c. Inflated pre-reconciliation floor does not pin the reconciled total ----
{
  const legacy = memoryUsesKv({ total: "62051" });
  const RUNTIME_KV = memoryRuntimeKvNamespace();
  const kv = hybridKv(RUNTIME_KV, legacy);
  await kv.put("total", "5888");
  const read = await readUses({ USES: kv }, { light: true });
  assert.equal(read.uses_legacy, 62051);
  assert.equal(read.uses_durable, 5888);
  assert.equal(read.uses, 67939);
  assert.equal(read.uses_total_source, USES_TOTAL_SOURCE);
  const CHAINLOCK = memoryChainWriterNamespace({});
  const floor = statsFloorFor({ CHAINLOCK });
  await floor.raise("full", 112111);
  await floor.raise("light", 112111);
  clearStatsMemo();
  const res = await handler(new Request("https://x.example/v1/uses"), { USES: legacy, RUNTIME_KV, CHAINLOCK }, { waitUntil() {} });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.uses, 67939);
  assert.equal(body.uses_legacy, 62051);
  assert.equal(body.uses_durable, 5888);
  assert.equal(body.uses_total_source, USES_TOTAL_SOURCE);
  assert.equal(body.cache.uses_floor_applied, false);
  assert.equal(body.uses_read, undefined);
  assert.equal(body.cache.floor_epoch, USES_TOTAL_SOURCE);
  assert.equal(await kv.durableGet("total"), "5888", "published sum is not written back");
  assert.equal(await legacy.get("total"), "62051");
  assert.equal((await floor.raise("full", 0)).floor, 112111);
  assert.equal((await floor.raise(statsFloorStorageKey("full", body), 0)).floor, 67939);
  await incrementUse({ USES: kv }, { host: "c.example", method: "POST", path: "/mcp" });
  assert.equal(await kv.durableGet("total"), "5889");
  clearStatsMemo();
  const res2 = await handler(new Request("https://x.example/v1/uses"), { USES: legacy, RUNTIME_KV, CHAINLOCK }, { waitUntil() {} });
  const climbed = await res2.json();
  assert.equal(res2.status, 200);
  assert.equal(climbed.uses, 67940);
  assert.equal(climbed.uses_legacy, 62051);
  assert.equal(climbed.uses_durable, 5889);
  assert.equal(climbed.cache.uses_floor_applied, false);
  assert.equal(await kv.durableGet("total"), "5889", "the climb is not copied into the DO total");
  assert.notEqual(await kv.durableGet("total"), String(climbed.uses));
  clearStatsMemo();
  const statsRes = await handler(new Request("https://x.example/v1/stats"), { USES: legacy, RUNTIME_KV, CHAINLOCK }, { waitUntil() {} });
  const stats = await statsRes.json();
  assert.equal(statsRes.status, 200);
  assert.equal(stats.uses, 67940);
  assert.equal(stats.alias_of, "/v1/uses");
  assert.equal(stats.cache.uses_floor_applied, false);
  assert.equal(await kv.durableGet("total"), "5889");
}

// --- 4. MCP still answers after N lattice rows ----------------------------------
{
  const N = 300;
  const CHAINLOCK = memoryChainWriterNamespace();
  const store = new DurableStore(CHAINLOCK);
  for (let i = 0; i < N; i++) await append(store, { c: "session", fact: "row-" + i });
  const env = { USES: quotaKv(), RUNTIME_KV: memoryRuntimeKvNamespace(), CHAINLOCK };
  const t0 = Date.now();
  await initAndList(env, `after ${N} lattice rows`);
  assert.ok(Date.now() - t0 < 5000, "MCP initialize + tools/list stay fast on a long chain");

  // --- 5. Tether selects only rows after the AZ-OS tip -------------------------
  const rows = latticeRowsOf(await store.loadRecords("session"));
  assert.equal(rows.length, N);
  const acked = { primary: rows[N - 6].primary };
  const since = rowsSince(rows, acked);
  assert.equal(since.length, 5, "only the 5 rows after the stored tip are selected");
  const sel = await store.latticeSince("session", rows[N - 6].primary);
  assert.equal((sel.rows || []).length, 5, "ChainWriter selects only new rows");
}

// --- 6. Deploy wiring ------------------------------------------------------------
{
  const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  assert.match(toml, /name = "RUNTIME_KV"\s*\nclass_name = "RuntimeKv"/);
  assert.match(toml, /tag = "v5"\s*\nnew_sqlite_classes = \["RuntimeKv"\]/);
  const src = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(src, /export \{[^}]*RuntimeKv[^}]*\}/);
}

console.log("ok kv-quota");

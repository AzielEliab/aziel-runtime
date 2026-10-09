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
import { memoryUsesKv, incrementUse, readUses } from "../src/uses.js";
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
  await incrementUse(wrapped, { host: "c.example", method: "POST", path: "/mcp" });
  const after = await readUses(wrapped);
  assert.equal(after.uses, (before.uses || 0) + 1, "use counter continues from the legacy total");
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

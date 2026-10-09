#!/usr/bin/env node
/**
 * Glama-style stdio smoke (GLAMA-STDIO-DISCOVERY-1.0).
 *
 * Glama builds a container from this repo, runs `node cli/mcp-stdio.mjs`
 * (wrapped by mcp-proxy) and checks MCP `initialize` + `tools/list`.
 * This script spawns the real CLI the same way and asserts:
 *   1. --local: initialize ok, tools/list = 36.
 *   2. bridge with the Worker DOWN (mock answers Cloudflare 1101 HTML / or
 *      the origin refuses): initialize + tools/list still answer 36 tools
 *      from the in-process catalog, labeled remote:false; tools/call and
 *      ping stay honest errors (no execution, no receipt).
 *   3. optional live bridge (GLAMA_SMOKE_LIVE=1): 36 tools from the Worker.
 *
 *   node scripts/smoke-glama-stdio.mjs                 # 1 + 2 (offline-safe)
 *   GLAMA_SMOKE_LIVE=1 node scripts/smoke-glama-stdio.mjs
 *   node scripts/smoke-glama-stdio.mjs --cmd "docker run --rm -i --network none IMAGE" --expect-fallback
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "cli/mcp-stdio.mjs");
const EXPECTED_TOOLS = 36;
const EXPECTED_VERSION = "2.0.0-rc1";

const INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "glama-smoke", version: "1" } },
};
const INITIALIZED = { jsonrpc: "2.0", method: "notifications/initialized" };
const LIST = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };
const PING = { jsonrpc: "2.0", id: 3, method: "ping" };
const CALL = {
  jsonrpc: "2.0",
  id: 4,
  method: "tools/call",
  params: { name: "fraggate_call", arguments: { slug: "decisiongate", op: "health", confirm: true } },
};

function runStdio(command, args, messages, env = {}, timeoutMs = 60000) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`stdio smoke timed out after ${timeoutMs}ms\nstderr:\n${err}`));
    }, timeoutMs);
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const byId = {};
      for (const line of out.split("\n")) {
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          reject(new Error(`stdout is not MCP-only JSON: ${line.slice(0, 200)}`));
          return;
        }
        if (msg.id !== undefined) byId[msg.id] = msg;
      }
      resolvePromise({ code, byId, stderr: err });
    });
    for (const m of messages) child.stdin.write(JSON.stringify(m) + "\n");
    child.stdin.end();
  });
}

function assertDiscovery(label, r, { expectFallback }) {
  const init = r.byId[1];
  const list = r.byId[2];
  assert.ok(init && init.result, `${label}: initialize failed: ${JSON.stringify(init && init.error)}\n${r.stderr}`);
  assert.equal(init.result.serverInfo.name, "aziel-runtime", `${label}: serverInfo.name`);
  assert.equal(init.result.serverInfo.version, EXPECTED_VERSION, `${label}: serverInfo.version`);
  assert.ok(init.result.capabilities && init.result.capabilities.tools, `${label}: tools capability`);
  assert.ok(list && list.result, `${label}: tools/list failed: ${JSON.stringify(list && list.error)}\n${r.stderr}`);
  assert.equal(list.result.tools.length, EXPECTED_TOOLS, `${label}: tools/list count`);
  for (const t of list.result.tools) {
    assert.ok(t.name && t.inputSchema && t.inputSchema.type === "object", `${label}: tool shape ${t.name}`);
  }
  const names = list.result.tools.map((t) => t.name);
  assert.ok(names.includes("Softwares") && names.includes("fraggate_call"), `${label}: entry tools`);
  const meta = (r) => r.result._meta && r.result._meta["aziel-runtime/discovery"];
  if (expectFallback) {
    assert.equal(meta(init)?.source, "local-catalog", `${label}: initialize must be labeled local-catalog`);
    assert.equal(meta(init)?.remote, false);
    assert.equal(meta(list)?.source, "local-catalog", `${label}: tools/list must be labeled local-catalog`);
    assert.equal(meta(list)?.fraggate_receipt, false);
  }
  console.log(`ok: ${label} initialize ${init.result.serverInfo.version} + tools/list ${list.result.tools.length}`);
}

function startDownWorker() {
  return new Promise((res) => {
    const server = createServer((req, resp) => {
      req.resume();
      req.on("end", () => {
        const body =
          "<!DOCTYPE html><title>Worker threw exception | aziel-runtime.vibelock.workers.dev | Cloudflare</title>Error 1101";
        resp.writeHead(500, { "Content-Type": "text/html" });
        resp.end(body);
      });
    });
    server.listen(0, "127.0.0.1", () => res({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

const argv = process.argv.slice(2);
const cmdIdx = argv.indexOf("--cmd");
if (cmdIdx !== -1) {
  // External command mode (e.g. docker run -i IMAGE). Discovery only.
  const parts = String(argv[cmdIdx + 1] || "").split(/\s+/).filter(Boolean);
  assert.ok(parts.length, "--cmd needs a command");
  const r = await runStdio(parts[0], parts.slice(1), [INIT, INITIALIZED, LIST], {}, 180000);
  assertDiscovery(`cmd "${parts.join(" ")}"`, r, { expectFallback: argv.includes("--expect-fallback") });
  process.exit(0);
}

// 1. --local
const local = await runStdio(process.execPath, [cli, "--local"], [INIT, INITIALIZED, LIST]);
assertDiscovery("--local", local, { expectFallback: false });

// 2a. Worker down: 1101 HTML
const down = await startDownWorker();
try {
  const r = await runStdio(process.execPath, [cli, "--url", down.url], [INIT, INITIALIZED, LIST, PING, CALL], {
    AZIEL_RUNTIME_FAILOVER: "0",
  });
  assertDiscovery("bridge, Worker 1101", r, { expectFallback: true });
  assert.ok(r.byId[3] && r.byId[3].error, "ping must stay an honest upstream error");
  assert.ok(r.byId[4] && r.byId[4].error, "tools/call must stay an honest upstream error (no local execution)");
  assert.doesNotMatch(JSON.stringify(r.byId[4]), /"FG-OK"|fraggate\.ledger/);
  assert.match(r.stderr, /DISCOVERY-LOCAL initialize/);
  console.log("ok: bridge, Worker 1101 → ping + tools/call stay errors (no receipt)");

  // Opt-out keeps the strict old behavior.
  const strict = await runStdio(process.execPath, [cli, "--url", down.url], [INIT, LIST], {
    AZIEL_RUNTIME_FAILOVER: "0",
    AZIEL_RUNTIME_DISCOVERY_FALLBACK: "0",
  });
  assert.ok(strict.byId[1] && strict.byId[1].error, "fallback=0 must not answer initialize locally");
  console.log("ok: AZIEL_RUNTIME_DISCOVERY_FALLBACK=0 keeps the strict error");
} finally {
  await new Promise((r) => down.server.close(r));
}

// 2b. Worker unreachable (connection refused)
const refused = await runStdio(process.execPath, [cli, "--url", "http://127.0.0.1:9"], [INIT, INITIALIZED, LIST], {
  AZIEL_RUNTIME_FAILOVER: "0",
});
assertDiscovery("bridge, origin refused", refused, { expectFallback: true });

// 3. optional live bridge
if (process.env.GLAMA_SMOKE_LIVE === "1") {
  const live = await runStdio(process.execPath, [cli], [INIT, INITIALIZED, LIST]);
  assertDiscovery("bridge, live Worker", live, { expectFallback: false });
}

console.log("ok: Glama stdio smoke");

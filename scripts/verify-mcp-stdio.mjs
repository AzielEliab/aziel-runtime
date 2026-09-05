/**
 * Stdio MCP: framing, mock HTTP bridge, in-process --local, optional live smoke.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_RUNTIME_URL,
  ReadBuffer,
  createBridgeContext,
  dispatchMcp,
  mcpRequestHeaders,
  parseCliArgs,
  rpcError,
  serializeMessage,
} from "../src/mcp-stdio.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "cli/mcp-stdio.mjs");

const glama = JSON.parse(await readFile(join(root, "glama.json"), "utf8"));
assert.equal(glama.$schema, "https://glama.ai/mcp/schemas/server.json");
assert.deepEqual(glama.maintainers, ["AzielEliab"]);
assert.equal(Object.keys(glama).sort().join(","), "$schema,maintainers");

const dockerfile = await readFile(join(root, "Dockerfile"), "utf8");
assert.match(dockerfile, /cli\/mcp-stdio\.mjs/);
assert.match(dockerfile, /AZIEL_RUNTIME_URL/);

const dockerignore = await readFile(join(root, ".dockerignore"), "utf8");
assert.match(dockerignore, /\.git/);
assert.match(dockerignore, /node_modules/);

const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
assert.match(pkg.scripts.mcp, /cli\/mcp-stdio\.mjs/);
assert.equal(pkg.bin["aziel-runtime-mcp"], "./cli/mcp-stdio.mjs");

const parsed = parseCliArgs(["--local", "--url", "https://example.test"]);
assert.equal(parsed.flags.local, true);
assert.equal(parsed.flags.url, "https://example.test");

const buf = new ReadBuffer();
buf.append(Buffer.from(serializeMessage({ jsonrpc: "2.0", id: 1, method: "ping" })));
assert.deepEqual(buf.readMessage(), { jsonrpc: "2.0", id: 1, method: "ping" });
assert.equal(buf.readMessage(), null);

const framed = JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/list", params: {} });
buf.append(Buffer.from(`Content-Length: ${Buffer.byteLength(framed)}\r\n\r\n${framed}`));
assert.equal(buf.readMessage().method, "tools/list");

buf.append(Buffer.from('{"jsonrpc":"2.0","id":1}\n{"jsonrpc":"2.0","id":2}\n'));
assert.equal(buf.readMessage().id, 1);
assert.equal(buf.readMessage().id, 2);

const err = rpcError(3, -32000, "boom");
assert.equal(err.jsonrpc, "2.0");
assert.equal(err.id, 3);
assert.equal(err.error.code, -32000);

function startMock(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const seen = [];
const mock = await startMock(async (req, res) => {
  assert.equal(req.method, "POST");
  assert.equal(req.url, "/mcp");
  assert.equal(req.headers["user-agent"], "Mozilla/5.0");
  assert.match(req.headers["content-type"], /application\/json/);
  const body = await readJson(req);
  seen.push({ body, headers: req.headers });
  if (body.method === "initialize") {
    res.setHeader("mcp-session-id", "sess_glama_test");
    res.setHeader("MCP-Protocol-Version", "2025-03-26");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "aziel-runtime", version: "1.5.0" },
        },
      }),
    );
    return;
  }
  if (body.method === "tools/list") {
    assert.equal(req.headers["mcp-session-id"], "sess_glama_test");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          tools: [
            { name: "runtime_skill", description: "How to use this software" },
            { name: "runtime_run", description: "Use Aziel Eliab software" },
          ],
        },
      }),
    );
    return;
  }
  if (body.method === "boom") {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("bad gateway");
    return;
  }
  res.writeHead(204);
  res.end();
});

const ctx = createBridgeContext({
  flags: { url: mock.url },
  token: "secret-token",
  fetchImpl: fetch,
});
const headers = mcpRequestHeaders(ctx);
assert.equal(headers.Authorization, "Bearer secret-token");
assert.equal(headers["X-Aziel-Runtime-Token"], "secret-token");

const init = await dispatchMcp(
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "verify", version: "1" } },
  },
  ctx,
);
assert.equal(init.result.serverInfo.name, "aziel-runtime");
assert.equal(ctx.sessionId, "sess_glama_test");
assert.equal(seen[0].headers.authorization, "Bearer secret-token");
assert.equal(seen[0].headers["x-aziel-runtime-token"], "secret-token");

const listed = await dispatchMcp({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, ctx);
const names = listed.result.tools.map((t) => t.name);
assert.ok(names.includes("runtime_skill"));
assert.ok(names.includes("runtime_run"));

const failed = await dispatchMcp({ jsonrpc: "2.0", id: 3, method: "boom" }, ctx);
assert.equal(failed.error.code, -32000);
assert.match(failed.error.message, /non-JSON|502/);

await new Promise((resolve, reject) => mock.server.close((err) => (err ? reject(err) : resolve())));

function spawnMcp(args, extraEnv = {}) {
  return spawn(process.execPath, [cli, ...args], {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function rpcOverStdio(child, messages, { timeoutMs = 20000, expect = null } = {}) {
  const want = expect != null ? expect : messages.filter((m) => m.id !== undefined).length;
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    const replies = [];
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`stdio timeout after ${timeoutMs}ms; stderr=${err}; stdout=${out}`));
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      out += d.toString("utf8");
      let idx;
      while ((idx = out.indexOf("\n")) !== -1) {
        const line = out.slice(0, idx);
        out = out.slice(idx + 1);
        if (!line.trim()) continue;
        if (/^content-length:/i.test(line)) {
          reject(new Error("stdio wrote Content-Length to stdout; expected NDJSON"));
          return;
        }
        replies.push(JSON.parse(line));
        if (replies.length >= want) {
          clearTimeout(timer);
          resolve({ replies, stderr: err });
        }
      }
    });
    child.stderr.on("data", (d) => {
      err += d.toString("utf8");
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    for (const m of messages) child.stdin.write(JSON.stringify(m) + "\n");
  });
}

const mock2 = await startMock(async (req, res) => {
  const body = await readJson(req);
  if (body.method === "initialize") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "aziel-runtime", version: "1.5.0" } },
      }),
    );
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      jsonrpc: "2.0",
      id: body.id,
      result: { tools: [{ name: "runtime_skill" }, { name: "runtime_run" }] },
    }),
  );
});

const child = spawnMcp([], { AZIEL_RUNTIME_URL: mock2.url });
const handshake = await rpcOverStdio(child, [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "verify-mcp-stdio", version: "1" } } },
  { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
]);
child.stdin.end();
assert.equal(handshake.replies[0].result.serverInfo.name, "aziel-runtime");
assert.ok(handshake.replies[1].result.tools.some((t) => t.name === "runtime_skill"));
assert.ok(handshake.replies[1].result.tools.some((t) => t.name === "runtime_run"));
assert.doesNotMatch(handshake.replies.map((r) => JSON.stringify(r)).join("\n"), /aziel-runtime-mcp /);
await new Promise((resolve, reject) => mock2.server.close((err) => (err ? reject(err) : resolve())));

const local = spawnMcp(["--local"]);
const localHs = await rpcOverStdio(
  local,
  [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "verify-local", version: "1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  ],
  { timeoutMs: 30000 },
);
local.stdin.end();
assert.ok(localHs.replies[0].result, `local initialize failed: ${JSON.stringify(localHs.replies[0])}`);
assert.equal(localHs.replies[0].result.serverInfo.name, "aziel-runtime");
const localTools = localHs.replies[1].result.tools.map((t) => t.name);
assert.ok(localTools.includes("runtime_skill"));
assert.ok(localTools.includes("runtime_run"));

if (process.env.AZIEL_RUNTIME_MCP_SKIP_LIVE === "1") {
  console.log("verify-mcp-stdio: skip live smoke (AZIEL_RUNTIME_MCP_SKIP_LIVE=1)");
} else {
  const liveUrl = (process.env.AZIEL_RUNTIME_URL || DEFAULT_RUNTIME_URL).replace(/\/$/, "");
  let online = false;
  try {
    const res = await fetch(liveUrl + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
      signal: AbortSignal.timeout(8000),
    });
    online = res.ok;
  } catch {
    online = false;
  }
  if (!online) {
    console.log("verify-mcp-stdio: skip live smoke (hosted Worker unreachable)");
  } else {
    const live = spawnMcp([], { AZIEL_RUNTIME_URL: liveUrl });
    const liveHs = await rpcOverStdio(
      live,
      [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "verify-live", version: "1" } } },
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      ],
      { timeoutMs: 20000 },
    );
    live.stdin.end();
    assert.ok(liveHs.replies[0].result);
    const liveTools = liveHs.replies[1].result.tools.map((t) => t.name);
    assert.ok(liveTools.includes("runtime_skill") || liveTools.includes("runtime_run"));
    console.log("verify-mcp-stdio: live smoke ok", liveTools.length, "tools");
  }
}

console.log("verify-mcp-stdio: ok");

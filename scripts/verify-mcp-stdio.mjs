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
  usage,
} from "../src/mcp-stdio.js";
import { dnsError, looksLikeFraggateExecutionReceipt } from "../src/remote-transport.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "cli/mcp-stdio.mjs");

const glama = JSON.parse(await readFile(join(root, "glama.json"), "utf8"));
assert.equal(glama.$schema, "https://glama.ai/mcp/schemas/server.json");
assert.deepEqual(glama.maintainers, ["AzielEliab"]);
assert.equal(glama.name, "Aziel Runtime");
assert.equal(glama.version, "2.0.0-rc1");
assert.match(glama.description, /^Aziel Runtime lets AI assistants run 40\+ research tools through one door/);
assert.match(glama.description, /Install on Glama, then list tools, describe one, and call it/);
assert.match(glama.description, /Every call can leave a receipt/);
assert.doesNotMatch(glama.description, /not an API aggregator/);
assert.match(glama.description, /2\.0\.0-rc1/);
assert.match(glama.description, /1\.6\.2 is superseded heritage/);
assert.ok(Array.isArray(glama.keywords) && glama.keywords.includes("mcp"));
assert.ok(glama.keywords.includes("openapi"));
assert.ok(glama.keywords.includes("fraggate"));
assert.ok(glama.keywords.includes("digital-forensics"));
assert.ok(glama.keywords.includes("softwares"));
assert.ok(glama.keywords.includes("decisiongate"));
assert.ok(glama.keywords.includes("receipts"));
assert.match(glama.description, /Glama Install Server release 2\.0\.7/);
assert.match(glama.description, /Worker \/ server package stays 2\.0\.0-rc1/);
assert.ok(Array.isArray(glama.categories) && glama.categories.includes("agent-orchestration"));
assert.equal(glama.homepage, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
assert.match(glama.documentation, /docs\/GLAMA\.md/);

const registry = JSON.parse(await readFile(join(root, "server.json"), "utf8"));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
assert.equal(registry.$schema, "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json");
assert.equal(registry.name, "io.github.AzielEliab/aziel-runtime");
assert.match(registry.name, /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
assert.equal(registry.title, "Aziel Runtime");
assert.equal(registry.version, "2.0.0-rc1");
assert.equal(registry.version, pkg.version);
assert.notEqual(registry.version, "2.0.7");
assert.ok(registry.description.length >= 1 && registry.description.length <= 100);
assert.match(registry.description, /FragGate/);
assert.doesNotMatch(registry.description, /2\.0\.7/);
assert.equal(registry.repository.url, "https://github.com/AzielEliab/aziel-runtime");
assert.equal(registry.repository.source, "github");
assert.equal(registry.websiteUrl, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
assert.equal(registry.packages, undefined);
assert.deepEqual(registry.remotes, [
  { type: "streamable-http", url: "https://aziel-runtime.vibelock.workers.dev/mcp" },
]);
const glamaDoc = await readFile(join(root, "docs/GLAMA.md"), "utf8");
assert.match(glamaDoc, /\[`server\.json`\]\(\.\.\/server\.json\)/);
assert.match(glamaDoc, /mcp-publisher publish/);
assert.match(glamaDoc, /2\.0\.7/);
assert.match(glamaDoc, /not `server\.json` `version`/);

const dockerfile = await readFile(join(root, "Dockerfile"), "utf8");
assert.match(dockerfile, /cli\/mcp-stdio\.mjs/);
assert.match(dockerfile, /AZIEL_RUNTIME_URL/);
assert.match(dockerfile, /CMD \["node", "cli\/mcp-stdio\.mjs"\]/);
assert.match(dockerfile, /outbound DNS/);
assert.match(dockerfile, /vibelock\.workers\.dev/);
assert.doesNotMatch(dockerfile, /ENTRYPOINT/);
assert.doesNotMatch(dockerfile, /mcp-proxy/);

const dockerignore = await readFile(join(root, ".dockerignore"), "utf8");
assert.match(dockerignore, /\.git/);
assert.match(dockerignore, /node_modules/);

assert.match(pkg.scripts.mcp, /cli\/mcp-stdio\.mjs/);
assert.equal(pkg.bin["aziel-runtime-mcp"], "./cli/mcp-stdio.mjs");

const parsed = parseCliArgs(["--local", "--url", "https://example.test"]);
assert.equal(parsed.flags.local, true);
assert.equal(parsed.flags.url, "https://example.test");
assert.match(usage(), /FG-DNS/);
assert.match(usage(), /outbound DNS \+ HTTPS/);

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
assert.deepEqual(ctx.origins, [mock.url]);

await new Promise((resolve, reject) => mock.server.close((err) => (err ? reject(err) : resolve())));

const deadHits = [];
const liveHits = [];
const dead = await startMock(async (_req, res) => {
  deadHits.push(1);
  res.writeHead(429, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, code: "RATE_LIMIT" }));
});
const live = await startMock(async (req, res) => {
  liveHits.push(req.url);
  const body = await readJson(req);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { ok: true, via: "named-hub" } }));
});
const failCtx = createBridgeContext({
  origins: [dead.url, live.url],
  flags: { url: dead.url },
  fetchImpl: fetch,
});
const failedOver = await dispatchMcp({ jsonrpc: "2.0", id: 9, method: "ping" }, failCtx);
assert.equal(failedOver.result.via, "named-hub");
assert.equal(deadHits.length, 1);
assert.equal(liveHits.length, 1);
assert.equal(failCtx.url, live.url);
await new Promise((resolve, reject) => dead.server.close((err) => (err ? reject(err) : resolve())));
await new Promise((resolve, reject) => live.server.close((err) => (err ? reject(err) : resolve())));

let localHits = 0;
const dnsFailCtx = createBridgeContext({
  flags: { url: "https://aziel-runtime.vibelock.workers.dev" },
  origins: ["https://aziel-runtime.vibelock.workers.dev"],
  fetchImpl: async () => {
    throw dnsError("aziel-runtime.vibelock.workers.dev");
  },
  localSend: async () => {
    localHits += 1;
    throw new Error("must not local-validate a remote DNS miss");
  },
  log: () => {},
});
const dnsFailed = await dispatchMcp(
  { jsonrpc: "2.0", id: 11, method: "tools/call", params: { name: "fraggate_call", arguments: { slug: "spectrallock", op: "health", confirm: true } } },
  dnsFailCtx,
);
assert.equal(dnsFailed.error.data.code, "FG-DNS");
assert.equal(dnsFailed.error.data.remote, false);
assert.equal(dnsFailed.error.data.fraggate_receipt, false);
assert.equal(dnsFailed.error.data.local_validation, false);
assert.equal(looksLikeFraggateExecutionReceipt(dnsFailed), false);
assert.equal(localHits, 0);

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
assert.ok(localTools.includes("fraggate_call"));
assert.ok(localTools.includes("runtime_run"));
assert.ok(localTools.length <= 40, `stdio tools/list ${localTools.length}`);
assert.ok(localTools.includes("memory_recall"));
assert.ok(!localTools.includes("godlock_submit"));
assert.ok(!localTools.includes("foldlock_fold-preview"));

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

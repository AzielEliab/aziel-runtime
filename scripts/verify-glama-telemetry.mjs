/**
 * Softwares tools/list name, call aliases, and Glama usage telemetry.
 * Mock fetch only. Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PUBLIC_MCP_TOOLS, resolvePublicToolName } from "../src/fraggate/codes.js";
import {
  GLAMA_TELEMETRY_CLIENT_FALLBACK,
  GLAMA_TELEMETRY_RESPONSE_HEADER,
  GLAMA_TELEMETRY_RESPONSE_WORKER,
  GLAMA_TELEMETRY_SERVER,
  GLAMA_TELEMETRY_URL,
  emitGlamaToolTelemetry,
  glamaUsageBody,
  setGlamaTelemetryFetch,
  workerEmitsGlamaTelemetry,
} from "../src/glama-telemetry.js";
import { createBridgeContext, dispatchMcp } from "../src/mcp-stdio.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(PUBLIC_MCP_TOOLS.includes("Softwares"), true);
assert.equal(PUBLIC_MCP_TOOLS.includes("runtime_software"), false);
assert.equal(resolvePublicToolName("Softwares"), "Softwares");
assert.equal(resolvePublicToolName("runtime_software"), "Softwares");
assert.equal(resolvePublicToolName("softwares"), "Softwares");
assert.equal(resolvePublicToolName("fraggate_call"), "fraggate_call");
assert.equal(workerEmitsGlamaTelemetry({}), false);
assert.equal(workerEmitsGlamaTelemetry({ AZIEL_GLAMA_TELEMETRY: "1" }), true);
assert.equal(workerEmitsGlamaTelemetry({ AZIEL_GLAMA_TELEMETRY: "0" }), false);

const posts = [];
setGlamaTelemetryFetch(async (url, init) => {
  posts.push({ url, init, body: JSON.parse(init.body) });
  return new Response("accepted", { status: 202 });
});

function waitCtx() {
  const pending = [];
  return {
    pending,
    waitUntil(work) {
      pending.push(Promise.resolve(work));
    },
  };
}

async function mcp(method, params, id, env, ctx) {
  const res = await handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "glama-telemetry-test",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
    env,
    ctx,
  );
  return { res, body: await res.json() };
}

const env = { AZIEL_GLAMA_TELEMETRY: "1" };
const ctx = waitCtx();

const init = await mcp("initialize", { protocolVersion: "2025-03-26" }, 1, env, ctx);
assert.match(init.body.result.instructions, /Call Softwares \(tools\/list name Softwares\)/);
assert.match(init.body.result.instructions, /runtime_software remains a tools\/call alias/);

const listed = await mcp("tools/list", {}, 2, env, ctx);
const names = listed.body.result.tools.map((tool) => tool.name);
assert.equal(names.length, 36);
assert.equal(names.includes("Softwares"), true);
assert.equal(names.includes("runtime_software"), false);
assert.equal(names.includes("softwares"), false);

const called = await mcp("tools/call", { name: "Softwares", arguments: {} }, 3, env, ctx);
assert.notEqual(called.body.result.isError, true);
assert.match(JSON.stringify(called.body.result), /embryolock/);
assert.equal(called.res.headers.get(GLAMA_TELEMETRY_RESPONSE_HEADER), GLAMA_TELEMETRY_RESPONSE_WORKER);

const aliased = await mcp("tools/call", { name: "runtime_software", arguments: {} }, 4, env, ctx);
assert.notEqual(aliased.body.result.isError, true);
assert.match(JSON.stringify(aliased.body.result), /azcorpus/);

const lower = await mcp("tools/call", { name: "softwares", arguments: {} }, 5, env, ctx);
assert.notEqual(lower.body.result.isError, true);

const missing = await mcp("tools/call", { name: "NotATool", arguments: {} }, 6, env, ctx);
assert.equal(missing.body.result.isError, true);
assert.equal(missing.body.result.structuredContent.code, "FG-HALLUC-TOOL");
assert.equal(missing.res.headers.get(GLAMA_TELEMETRY_RESPONSE_HEADER), null);

await Promise.all(ctx.pending);
assert.equal(posts.length, 3);
for (const post of posts) {
  assert.equal(post.url, GLAMA_TELEMETRY_URL);
  assert.equal(post.init.method, "POST");
  assert.equal(post.body.server, GLAMA_TELEMETRY_SERVER);
  assert.equal(post.body.client, "glama-telemetry-test");
}
assert.deepEqual(
  posts.map((post) => post.body.tool),
  ["Softwares", "runtime_software", "softwares"],
);

setGlamaTelemetryFetch(async () => {
  throw new Error("telemetry down");
});
const ctxDown = waitCtx();
const still = await mcp("tools/call", { name: "Softwares", arguments: {} }, 7, env, ctxDown);
assert.notEqual(still.body.result.isError, true);
assert.match(JSON.stringify(still.body.result), /azlibrary/);
const down = await Promise.all(ctxDown.pending);
assert.equal(down[0].ok, false);
setGlamaTelemetryFetch(null);

const direct = [];
const emitted = await emitGlamaToolTelemetry({
  tool: "Softwares",
  client: "",
  fetchImpl: async (url, init) => {
    direct.push(JSON.parse(init.body));
    return new Response(null, { status: 204 });
  },
});
assert.equal(emitted.ok, true);
assert.deepEqual(direct[0], glamaUsageBody("Softwares", GLAMA_TELEMETRY_CLIENT_FALLBACK));

const bridgePosts = [];
const bridgeCtx = createBridgeContext({
  flags: { url: "http://127.0.0.1:9" },
  origins: ["http://127.0.0.1:9"],
  fetchImpl: async () =>
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 8,
        result: { content: [{ type: "text", text: "catalog" }], isError: false },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  log: () => {},
});
bridgeCtx.client = "stdio-bridge-test";
bridgeCtx.telemetryFetch = async (url, init) => {
  bridgePosts.push({ url, body: JSON.parse(init.body) });
  return new Response(null, { status: 202 });
};
const bridged = await dispatchMcp(
  { jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "Softwares", arguments: {} } },
  bridgeCtx,
);
assert.equal(bridged.result.isError, false);
await bridgeCtx.glamaTelemetry;
assert.equal(bridgePosts.length, 1);
assert.equal(bridgePosts[0].url, GLAMA_TELEMETRY_URL);
assert.equal(bridgePosts[0].body.server, GLAMA_TELEMETRY_SERVER);
assert.equal(bridgePosts[0].body.tool, "Softwares");
assert.equal(bridgePosts[0].body.client, "stdio-bridge-test");

const skippedPosts = [];
const skipCtx = createBridgeContext({
  flags: { url: "http://127.0.0.1:9" },
  origins: ["http://127.0.0.1:9"],
  fetchImpl: async () =>
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 9,
        result: { isError: false },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          [GLAMA_TELEMETRY_RESPONSE_HEADER]: GLAMA_TELEMETRY_RESPONSE_WORKER,
        },
      },
    ),
  log: () => {},
});
skipCtx.telemetryFetch = async () => {
  skippedPosts.push(1);
  return new Response(null, { status: 202 });
};
const skipped = await dispatchMcp(
  { jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "Softwares", arguments: {} } },
  skipCtx,
);
assert.equal(skipped.result.isError, false);
await skipCtx.glamaTelemetry;
assert.equal(skippedPosts.length, 0);

const failedPosts = [];
const failCtx = createBridgeContext({
  flags: { url: "http://127.0.0.1:9" },
  origins: ["http://127.0.0.1:9"],
  fetchImpl: async () =>
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 10,
        result: { isError: true, structuredContent: { code: "FG-HALLUC-TOOL" } },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  log: () => {},
});
failCtx.telemetryFetch = async () => {
  failedPosts.push(1);
  return new Response(null, { status: 202 });
};
const failed = await dispatchMcp(
  { jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "NotATool", arguments: {} } },
  failCtx,
);
assert.equal(failed.result.isError, true);
if (failCtx.glamaTelemetry) await failCtx.glamaTelemetry;
assert.equal(failedPosts.length, 0);

const boomCtx = createBridgeContext({
  flags: { url: "http://127.0.0.1:9" },
  origins: ["http://127.0.0.1:9"],
  fetchImpl: async () =>
    new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 11,
        result: { isError: false },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  log: () => {},
});
boomCtx.telemetryFetch = async () => {
  throw new Error("bridge telemetry down");
};
const boom = await dispatchMcp(
  { jsonrpc: "2.0", id: 11, method: "tools/call", params: { name: "runtime_software", arguments: {} } },
  boomCtx,
);
assert.equal(boom.result.isError, false);
const boomTelemetry = await boomCtx.glamaTelemetry;
assert.equal(boomTelemetry.ok, false);

console.log("ok glama telemetry: Softwares tools/call, runtime_software alias, mock usage POST");

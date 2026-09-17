/**
 * Sentinel MCP discovery surfaces: server-card + oauth-protected-resource.
 * Does not invent a Glama UUID, DOI, Framagit URL, or OAuth IdP.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import {
  LIVE_MCP_URL,
  MCP_PROTOCOL_VERSION,
  mcpDiscoveryKind,
  mcpEndpointUrl,
  mcpServerCard,
  oauthProtectedResource,
} from "../src/mcp-discovery.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { RUNTIME_GITHUB, RUNTIME_HUB_URL } from "../src/seo.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = {};

async function get(path) {
  return handler(new Request(origin + path), env);
}

assert.equal(mcpDiscoveryKind("/.well-known/mcp/server-card.json"), "server-card");
assert.equal(mcpDiscoveryKind("/mcp/.well-known/mcp/server-card.json"), "server-card");
assert.equal(mcpDiscoveryKind("/.well-known/oauth-protected-resource"), "oauth-protected-resource");
assert.equal(mcpDiscoveryKind("/.well-known/oauth-protected-resource/"), "oauth-protected-resource");
assert.equal(mcpDiscoveryKind("/.well-known/oauth-protected-resource/mcp"), "oauth-protected-resource");
assert.equal(mcpDiscoveryKind("/mcp/.well-known/oauth-protected-resource"), "oauth-protected-resource");
assert.equal(mcpDiscoveryKind("/mcp"), null);
assert.equal(mcpEndpointUrl(origin), origin + "/mcp");
assert.equal(LIVE_MCP_URL, "https://aziel-runtime.vibelock.workers.dev/mcp");

const cardPaths = [
  "/.well-known/mcp/server-card.json",
  "/mcp/.well-known/mcp/server-card.json",
];
for (const path of cardPaths) {
  const res = await get(path);
  assert.equal(res.status, 200, path);
  assert.match(res.headers.get("content-type") || "", /application\/json/);
  const body = await res.json();
  assert.equal(body.name, "aziel-runtime");
  assert.equal(body.version, RUNTIME_VERSION);
  assert.equal(body.version, "2.0.0-rc1");
  assert.equal(body.homepage, RUNTIME_HUB_URL);
  assert.equal(body.support, RUNTIME_GITHUB);
  assert.equal(body.author, "Aziel Eliab");
  assert.equal(body.transport, "streamable-http");
  assert.match(body.encoding, /JSON-RPC MCP-over-HTTP/);
  assert.equal(body.endpoint, "POST /mcp");
  assert.equal(body.url, origin + "/mcp");
  assert.equal(body.protocolVersion, MCP_PROTOCOL_VERSION);
  assert.equal(body.preferredProtocolVersion, MCP_PROTOCOL_VERSION);
  assert.equal(body.auth.type, "none");
  assert.equal(body.auth.public, true);
  assert.deepEqual(body.tools.names.slice().sort(), PUBLIC_MCP_TOOLS.slice().sort());
  assert.equal(body.tools.count, PUBLIC_MCP_TOOLS.length);
  assert.ok(body.tools.pipeline.includes("fraggate_list"));
  assert.ok(body.tools.pipeline.includes("fraggate_call"));
  assert.equal(body.links.openapi, origin + "/openapi.json");
  assert.equal(body.links.llms, origin + "/llms.txt");
  assert.equal(body.links.homepage, RUNTIME_HUB_URL);
  assert.equal(body.links.support, RUNTIME_GITHUB);
  assert.doesNotMatch(JSON.stringify(body), /10\.\d{4,}\/[a-z0-9._-]+/i);
  assert.doesNotMatch(JSON.stringify(body), /framagit\.org/i);
  assert.doesNotMatch(JSON.stringify(body), /glama\.ai\/mcp\/servers\/[0-9a-f]{8}-[0-9a-f-]{27}/i);
  assert.doesNotMatch(JSON.stringify(body), /authorization_server":\s*"https?:\/\//i);
}

const oauthPaths = [
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
  "/mcp/.well-known/oauth-protected-resource",
];
for (const path of oauthPaths) {
  const res = await get(path);
  assert.equal(res.status, 200, path);
  assert.match(res.headers.get("content-type") || "", /application\/json/);
  const body = await res.json();
  assert.equal(body.resource, origin + "/mcp");
  assert.ok(Array.isArray(body.authorization_servers));
  assert.equal(body.authorization_servers.length, 0, "no invented OAuth IdP");
  assert.equal(body.auth, "none (public)");
  assert.equal(body.resource_name, "aziel-runtime");
  assert.doesNotMatch(JSON.stringify(body), /https:\/\/[^"]*oauth[^"]*\/authorize/i);
  assert.doesNotMatch(JSON.stringify(body), /accounts\.google\.com|github\.com\/login\/oauth|auth0\.com/i);
}

const unitCard = mcpServerCard(origin);
assert.equal(unitCard.name, "aziel-runtime");
assert.equal(unitCard.homepage, "https://www.azieleliab.com/runtime");
const unitOauth = oauthProtectedResource(origin);
assert.deepEqual(unitOauth.authorization_servers, []);

const init = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  }),
  env,
);
const initBody = await init.json();
assert.equal(init.status, 200);
assert.equal(initBody.result.serverInfo.name, "aziel-runtime");
assert.equal(initBody.result.serverInfo.version, "2.0.0-rc1");
assert.equal(initBody.result.protocolVersion, MCP_PROTOCOL_VERSION);

const listed = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  }),
  env,
);
const listedBody = await listed.json();
assert.deepEqual(
  listedBody.result.tools.map((t) => t.name).sort(),
  PUBLIC_MCP_TOOLS.slice().sort(),
);

const getMcp = await get("/mcp");
assert.equal(getMcp.status, 200);
const getMcpBody = await getMcp.json();
assert.equal(getMcpBody.auth, "none (public)");
assert.equal(getMcpBody.server_card, "/.well-known/mcp/server-card.json");
assert.equal(getMcpBody.oauth_protected_resource, "/.well-known/oauth-protected-resource");

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/.well-known/mcp/server-card.json"].get);
assert.ok(openapi.paths["/.well-known/oauth-protected-resource"].get);
assert.ok(openapi.paths["/mcp"].post);

console.log("ok mcp-discovery: server-card + oauth-protected-resource + initialize/tools/list");

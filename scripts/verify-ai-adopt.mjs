/**
 * AI adopt discovery: compact card, Content-Signal, HEAD parity, aliases,
 * slim Actions OpenAPI, install snippets, client matrix.
 * Freeze: Softwares 42 / tools/list 36. No invented DOI.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { CONTENT_SIGNAL } from "../src/security-headers.js";
import { CLIENT_CLASS_IDS } from "../src/client-matrix.js";
import { glamaStaticDecision } from "../src/glama-static.js";
import { MCP_PROTOCOL_PREFERRED } from "../src/mcp-transport.js";

const { default: worker } = await import("../src/index.js");
const handler = worker.fetch;
const origin = "https://aziel-runtime.example";

async function call(path, init, env = {}) {
  return handler(new Request(origin + path, init), env);
}

async function get(path, env) {
  return call(path, { method: "GET" }, env);
}

async function head(path, env) {
  return call(path, { method: "HEAD" }, env);
}

assert.equal(CONTENT_SIGNAL, "search=yes, ai-input=yes, ai-train=yes");
assert.equal(PUBLIC_MCP_TOOLS.length, 36, "tools/list freeze");
assert.equal(CLIENT_CLASS_IDS.length, 17);

const listed = await call("/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
});
const listedBody = await listed.json();
assert.equal(listedBody.result.tools.length, 36);

const softwareRes = await get("/v1/software");
assert.equal(softwareRes.status, 200);
const software = await softwareRes.json();
assert.equal(software.count, 42);

const adoptRes = await get("/adopt.json");
assert.equal(adoptRes.status, 200);
assert.match(adoptRes.headers.get("content-type") || "", /application\/json/);
assert.equal(adoptRes.headers.get("Content-Signal"), CONTENT_SIGNAL);
const adoptRaw = await adoptRes.text();
assert.ok(Buffer.byteLength(adoptRaw) <= 8192, `adopt.json ${Buffer.byteLength(adoptRaw)} bytes`);
const adopt = JSON.parse(adoptRaw);
assert.equal(adopt.product, "Aziel Runtime");
assert.equal(adopt.git_sha, software.git_sha);
assert.equal(adopt.version_id, software.version_id);
assert.equal(adopt.version_id_source, software.version_id_source);
assert.equal(adopt.softwares_count, 42);
assert.equal(adopt.tools_list_count, 36);
assert.equal(adopt.door, "fraggate");
assert.equal(adopt.second_door, false);
assert.equal(adopt.mcp, origin + "/mcp");
assert.equal(adopt.openapi, origin + "/openapi.json");
assert.equal(adopt.openapi_actions, origin + "/openapi/adopt-actions.json");
assert.equal(adopt.glama, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
assert.equal(adopt.protocol_preferred, "2025-11-25");
assert.equal(adopt.protocol_preferred, MCP_PROTOCOL_PREFERRED);
assert.equal(adopt.auth, "none");
assert.equal(adopt.confirm_is_not_auth, true);
assert.match(adopt.public_demo, /not a private tenant/);
assert.match(adopt.why_adopt, /One FragGate door/);
assert.match(adopt.why_adopt, /No latency figure/);
assert.doesNotMatch(adopt.why_adopt, /registered with ICANN|second internet|Cap-7 public egress/i);
assert.deepEqual(adopt.clients, CLIENT_CLASS_IDS.slice());
assert.equal(adopt.author_id, "https://www.azieleliab.com/#aziel");
assert.equal(adopt.content_signal, CONTENT_SIGNAL);
assert.equal(adopt.tip_lag, null);
assert.equal(adopt.head_sha, null);
assert.deepEqual(adopt.first_call.refuse_codes, ["FG-HALLUC-TOOL", "MCP-CONFIRM-REQUIRED"]);
assert.match(adopt.first_call.examples[0], /Softwares/);
assert.match(adopt.first_call.examples[1], /dry_run/);
assert.doesNotMatch(adoptRaw, /10\.\d{4,}\//);
assert.doesNotMatch(adoptRaw, /zenodo\.org\/record/i);
assert.doesNotMatch(adoptRaw, /glama\.ai\/mcp\/servers\/[0-9a-f]{8}-[0-9a-f-]{27}/i);
assert.doesNotMatch(adoptRaw, /accounts\.google\.com|auth0\.com|github\.com\/login\/oauth/i);

const lagSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const lagged = await (await get("/adopt.json", { HEAD_SHA: lagSha })).json();
assert.equal(lagged.tip_lag, true);
assert.equal(lagged.head_sha, lagSha);
assert.equal(lagged.git_sha, software.git_sha);
const matched = await (await get("/adopt.json", { HEAD_SHA: software.git_sha })).json();
assert.equal(matched.tip_lag, false);
assert.equal(matched.git_sha, software.git_sha);

const discovery = [
  "/",
  "/openapi.json",
  "/llms.txt",
  "/ai.txt",
  "/cite.json",
  "/adopt.json",
  "/.well-known/llms.txt",
  "/mcp.json",
  "/.well-known/mcp.json",
  "/openapi/adopt-actions.json",
  "/install/cursor.json",
  "/install/claude-desktop.json",
  "/v1/clients.json",
  "/glama.json",
  "/robots.txt",
  "/sitemap.xml",
  "/v1/catalog.json",
  "/v1/bundle",
];
for (const path of discovery) {
  const g = await get(path);
  const h = await head(path);
  assert.equal(g.status, 200, `GET ${path}`);
  assert.equal(h.status, g.status, `HEAD ${path} parity`);
  assert.equal(await h.text(), "", `HEAD ${path} empty body`);
  assert.equal(h.headers.get("Content-Signal"), CONTENT_SIGNAL, `HEAD Content-Signal ${path}`);
  const ct = g.headers.get("content-type") || "";
  if (/json|html|plain|xml/.test(ct)) {
    assert.equal(g.headers.get("Content-Signal"), CONTENT_SIGNAL, `GET Content-Signal ${path}`);
  }
}

const mcpGet = await get("/mcp");
const mcpHead = await head("/mcp");
assert.equal(mcpGet.status, 200);
assert.equal(mcpHead.status, 405, "HEAD /mcp stays the mutate surface");

const card = await (await get("/.well-known/mcp/server-card.json")).json();
const mcpJson = await (await get("/mcp.json")).json();
const wellMcp = await (await get("/.well-known/mcp.json")).json();
assert.deepEqual(mcpJson, card);
assert.deepEqual(wellMcp, card);
assert.equal(mcpJson.auth.type, "none");
assert.equal(mcpJson.authorization_servers, undefined);

const llms = await (await get("/llms.txt")).text();
const wellLlms = await (await get("/.well-known/llms.txt")).text();
const ai = await (await get("/ai.txt")).text();
const wellAi = await (await get("/.well-known/ai.txt")).text();
assert.equal(wellLlms, llms);
assert.equal(wellAi, ai);
assert.match(llms.split("\n").slice(0, 30).join("\n"), /Compact adopt card: \/adopt\.json/);
assert.match(llms, /www\.azieleliab\.com\/#aziel/);

const plugin = await get("/.well-known/ai-plugin.json");
assert.equal(plugin.status, 404);
const wrongCard = await get("/.well-known/mcp/server.json");
assert.equal(wrongCard.status, 404);

const repoGlama = JSON.parse(readFileSync(new URL("../glama.json", import.meta.url), "utf8"));
const servedGlama = await (await get("/glama.json")).json();
assert.deepEqual(servedGlama, repoGlama);
assert.equal(glamaStaticDecision({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }).status, 404);
assert.doesNotMatch(JSON.stringify(servedGlama), /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

const slimRes = await get("/openapi/adopt-actions.json");
const slim = await slimRes.json();
const slimPaths = Object.keys(slim.paths);
assert.deepEqual(slimPaths.sort(), ["/v1/fraggate/call", "/v1/health", "/v1/skill", "/v1/software"]);
assert.ok(slimPaths.length < 12);
assert.equal(slim.info["x-second-door"], false);
assert.equal(slim.info["x-author-id"], "https://www.azieleliab.com/#aziel");
assert.equal(slim.info["x-sameAs"][0], "https://www.azieleliab.com/#aziel");
assert.doesNotMatch(JSON.stringify(slim), /10\.\d{4,}\//);
const full = await (await get("/openapi.json")).json();
assert.ok(Object.keys(full.paths).length > slimPaths.length);
assert.ok(full.paths["/v1/fraggate/call"]);

const cursor = await (await get("/install/cursor.json")).json();
assert.equal(cursor.mcpServers["aziel-runtime"].url, origin + "/mcp");
assert.equal(cursor.mcpServers["aziel-runtime"].headers["MCP-Protocol-Version"], "2025-11-25");
assert.equal(cursor.mcpServers["aziel-runtime"].headers.Authorization, undefined);
const claude = await (await get("/install/claude-desktop.json")).json();
assert.equal(claude.mcpServers["aziel-runtime"].type, "http");
assert.equal(claude.mcpServers["aziel-runtime"].url, origin + "/mcp");
assert.equal(claude.mcpServers["aziel-runtime"].headers["MCP-Protocol-Version"], "2025-11-25");

const matrix = await (await get("/v1/clients.json")).json();
assert.equal(matrix.author_id, "https://www.azieleliab.com/#aziel");
assert.equal(matrix.door, "fraggate");
assert.equal(matrix.auth, "none");
assert.equal(matrix.clients.length, 17);
assert.deepEqual(matrix.clients.map((c) => c.id), CLIENT_CLASS_IDS.slice());
for (const row of matrix.clients) {
  assert.ok(row.status === "LIVE" || row.status === "SLOT", row.id);
  assert.ok(row.snippet_url.startsWith("https://"), row.id);
  assert.ok(Array.isArray(row.slot), row.id);
}
assert.equal(matrix.clients.find((c) => c.id === "cursor").snippet_url, origin + "/install/cursor.json");
assert.equal(matrix.clients.find((c) => c.id === "claude").snippet_url, origin + "/install/claude-desktop.json");
assert.equal(matrix.clients.find((c) => c.id === "chatgpt").snippet_url, origin + "/openapi/adopt-actions.json");
assert.ok(matrix.clients.find((c) => c.id === "chatgpt").slot.some((s) => /ai-plugin/i.test(s)));
assert.ok(matrix.clients.find((c) => c.id === "apple").slot.some((s) => /Apple private API/.test(s)));
assert.ok(matrix.clients.find((c) => c.id === "copilot").slot.some((s) => /ai-plugin/i.test(s)));
assert.equal(matrix.clients.find((c) => c.id === "glama").snippet_url, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
assert.match(matrix.clients.map((c) => c.name).join("\n"), /ChatGPT/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Grok/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Venice/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Claude/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Cursor/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Glama/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Perplexity/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Copilot/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Gemini/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Mistral/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Meta AI/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Apple Intelligence/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Amazon Q/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /DuckAssist/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /You\.com/);
assert.match(matrix.clients.map((c) => c.name).join("\n"), /Cohere/);
assert.doesNotMatch(JSON.stringify(matrix), /10\.\d{4,}\//);

const robots = await (await get("/robots.txt")).text();
assert.match(robots, /User-agent: \*\nAllow: \//);
assert.match(robots, /User-agent: GPTBot\nAllow: \//);
assert.doesNotMatch(robots, /User-agent: GPTBot\nDisallow:/);
assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/);

const sitemap = await (await get("/sitemap.xml")).text();
for (const loc of [
  "/adopt.json",
  "/openapi/adopt-actions.json",
  "/install/cursor.json",
  "/install/claude-desktop.json",
  "/v1/clients.json",
  "/mcp.json",
  "/.well-known/llms.txt",
  "/glama.json",
]) {
  assert.match(sitemap, new RegExp(loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

console.log("ok ai-adopt", Buffer.byteLength(adoptRaw), "adopt bytes");

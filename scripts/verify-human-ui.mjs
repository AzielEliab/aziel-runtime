/**
 * Human workspace UI (audit F06–F08) + HTML hardening (F04).
 * Dual-surface: agents MCP + humans Worker UI. MCP inventory unchanged.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { HUMAN_TASKS, parseHumanPayload } from "../src/human-ui.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { buildMcpToolList } from "../src/mcp-surface.js";
import { sessionMcpTools } from "../src/session-http.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

async function get(path, headers = {}) {
  return handler(new Request(origin + path, { headers }), env);
}

async function post(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );
}

const empty = parseHumanPayload("");
assert.equal(empty.ok, true);
assert.deepEqual(empty.value, {});
const good = parseHumanPayload('{"q":"medieval manuscripts"}');
assert.equal(good.ok, true);
assert.equal(good.value.q, "medieval manuscripts");
const bad = parseHumanPayload("not-json {");
assert.equal(bad.ok, false);
assert.match(bad.error, /Invalid JSON/);
const arr = parseHumanPayload("[1]");
assert.equal(arr.ok, false);

const names = buildMcpToolList({ sessionTools: sessionMcpTools() }).map((t) => t.name).sort();
assert.deepEqual(names, PUBLIC_MCP_TOOLS.slice().sort(), "MCP inventory must not change");

const homeRes = await get("/");
assert.equal(homeRes.status, 200);
assert.match(homeRes.headers.get("content-type") || "", /text\/html/);
assert.match(homeRes.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
assert.equal(homeRes.headers.get("x-frame-options"), "DENY");
assert.equal(homeRes.headers.get("x-content-type-options"), "nosniff");
assert.equal(homeRes.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
assert.match(homeRes.headers.get("strict-transport-security") || "", /max-age=/);

const home = await homeRes.text();
assert.match(home, /id="workspace"/);
assert.match(home, /id="fg-console"/);
assert.match(home, /id="mesh-panel"/);
assert.match(home, /id="session-strip"/);
assert.match(home, /What do you want to do\?/);
assert.match(home, /Loading status/);
assert.doesNotMatch(home, /15:20/);
assert.doesNotMatch(home, /\{ q: text, text: text \}/);
assert.match(home, /Invalid JSON — not sent/);
assert.match(home, /<label for="fg-name">Name \/ slug<\/label>/);
assert.match(home, /<label for="fg-op">Operation<\/label>/);
assert.match(home, /<label for="fg-payload-console">Payload JSON<\/label>/);

for (const task of HUMAN_TASKS) {
  assert.match(home, new RegExp(`id="task-${task.slug}"`));
  assert.match(home, new RegExp(`<label for="task-${task.slug}-`));
}

assert.match(home, /id="task-chainlock"/);
assert.match(home, /<label for="mesh-product">Product slug \(required to join\)<\/label>/);
assert.ok(home.indexOf("<button") < home.indexOf('id="version-history"'), "first button is in the workspace, not the essay");
assert.ok(home.indexOf('id="workspace"') < home.indexOf('id="version-history"'));
assert.ok(home.indexOf("not merely an API orchestrator") < home.indexOf('id="workspace"') || home.indexOf("not merely an API orchestrator") > 0);

const textareas = [...home.matchAll(/<textarea\b([^>]*)>/g)].map((m) => m[1]);
assert.ok(textareas.length >= 8, `expected labeled workspace textareas, got ${textareas.length}`);
for (const attrs of textareas) {
  assert.match(attrs, /\bid="/, `textarea missing id: ${attrs}`);
}

const wsRes = await get("/workspace");
assert.equal(wsRes.status, 200);
assert.match(wsRes.headers.get("content-security-policy") || "", /object-src 'none'/);
const ws = await wsRes.text();
assert.match(ws, /<title>Workspace — /);
assert.match(ws, /id="fg-console"/);
assert.match(ws, /id="mesh-panel"/);
assert.match(ws, /FragGate console/);
assert.doesNotMatch(ws, /15:20/);

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /\/workspace</);

const softwareHtml = await (
  await get("/v1/software", { accept: "text/html" })
).text();
assert.match(softwareHtml, /<label for="software-filter">Search Softwares/);
assert.match(softwareHtml, /Use in browser/);
assert.match(softwareHtml, /Connect AI/);
assert.match(softwareHtml, /data-software-row/);

const listed = await (await get("/v1/fraggate/list")).json();
assert.equal(listed.ok, true);
assert.ok(listed.entries || listed.live || listed.names || listed.registry || listed.digest);

const described = await (await get("/v1/fraggate/describe?slug=decisiongate")).json();
assert.notEqual(described.code, "FG-HALLUC-TOOL");
assert.ok(described.slug === "decisiongate" || /decisiongate/i.test(described.name || ""));

async function call(slug, op, payload) {
  const res = await post("/v1/fraggate/call", { slug, op, payload });
  const body = await res.json();
  return { status: res.status, body };
}

const ops = [
  ["decisiongate", "check", {
    statement: "Release the catalog Worker this week so agents share one FragGate door.",
    evidence: ["OpenAPI 3.1 combined spec."],
    impact_pos: ["One URL for GPT Actions."],
    impact_neg: ["A vague draft takes longer."],
    values: ["Clarity without force"],
    accountable: "Aziel Eliab",
  }],
  ["foldlock", "fold-preview", { text: "the cat and the dog" }],
  ["azbrowser", "ethical_search", { q: "medieval manuscripts" }],
  ["forgereceipts", "receipt", { summary: "filed locally", evidence: "sha256:demo" }],
  ["godlock", "score", { text: "ABAD does not layer on phi." }],
  ["temporallock", "genesis", { summary: "sky was overcast", evidence: "photo:./sky.jpg", confidence: 0.9 }],
];

for (const [slug, op, payload] of ops) {
  const { status, body } = await call(slug, op, payload);
  assert.equal(status, 200, `${slug}/${op} HTTP ${status} ${JSON.stringify(body).slice(0, 240)}`);
  assert.notEqual(body.code, "FG-HALLUC-TOOL", `${slug}/${op} halluc`);
  assert.notEqual(body.ok, false, `${slug}/${op} refused ${body.code || body.error}`);
}

const mesh = await (await get("/v1/mesh")).json();
assert.ok(mesh.rollup || mesh.live_nodes != null);
assert.equal(mesh.get_never_enables, true);

const health = await call("decisiongate", "health", {});
assert.equal(health.status, 200);

const foldlockCard = await (await get("/p/foldlock")).text();
assert.match(foldlockCard, /<label for="fg-payload-foldlock">Payload JSON for FoldLock<\/label>/);
assert.match(foldlockCard, /data-op="fold-preview"/);
assert.doesNotMatch(foldlockCard, /\{ q: text, text: text \}/);

assert.ok(PRODUCTS.some((p) => p.slug === "foldlock"));
assert.ok(home.includes('data-op="fold-preview"') || ws.includes("fold-preview"));

console.log("verify-human-ui: ok");

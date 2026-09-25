/**
 * Human workspace UI (audit F06–F08). Dual-surface: agents MCP + humans Worker UI.
 * HTML headers come from F03–F05 (#111). MCP inventory unchanged.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { HUMAN_TASKS, parseHumanPayload } from "../src/human-ui.js";
import { WORKER_ONLY_PRODUCTS } from "../src/software-catalog.js";
import { UI_DOMAINS, uncoveredUiDomainSlugs, uiDomainForSlug } from "../src/ui-domains.js";
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
assert.match(homeRes.headers.get("content-security-policy") || "", /script-src 'unsafe-inline'/);
assert.equal(homeRes.headers.get("x-frame-options"), "DENY");
assert.equal(homeRes.headers.get("x-content-type-options"), "nosniff");
assert.equal(homeRes.headers.get("referrer-policy"), "no-referrer");
assert.match(homeRes.headers.get("strict-transport-security") || "", /max-age=31536000/);

const home = await homeRes.text();
assert.match(home, /id="workspace"/);
assert.match(home, /id="op-panel"/);
assert.match(home, /id="fg-console"/);
assert.match(home, /id="dashboard"/);
assert.match(home, /id="dash-metrics"/);
assert.match(home, /id="dash-softwares"/);
assert.match(home, /role="tablist"/);
assert.match(home, /data-domain-tab="aznet"/);
assert.match(home, /data-domain-tab="forensics"/);
assert.match(home, /data-domain-tab="games"/);
assert.match(home, /data-domain-tab="social"/);
assert.match(home, /data-domain-tab="elroi"/);
assert.match(home, /Aziel Elroi Eliab/);
assert.match(home, /id="sot-desk"/);
assert.match(home, /data-sot="dry"/);
assert.doesNotMatch(home, /data-domain-tab="corpus"/);
assert.doesNotMatch(home, /data-domain-tab="aziel-elroi-eliab"/);
assert.doesNotMatch(home, /Human side of this runtime/);
const catalogSlugs = PRODUCTS.map((p) => p.slug).concat(WORKER_ONLY_PRODUCTS.map((p) => p.slug));
assert.deepEqual(uncoveredUiDomainSlugs(catalogSlugs), []);
const placed = UI_DOMAINS.flatMap((d) => d.softwares);
assert.equal(new Set(placed).size, placed.length);
assert.equal(uiDomainForSlug("azbrowser"), "aznet");
assert.equal(uiDomainForSlug("4dmap"), "forensics");
assert.equal(uiDomainForSlug("spectrallock"), "forensics");
assert.equal(uiDomainForSlug("postking"), "games");
assert.equal(uiDomainForSlug("azchat"), "social");
assert.equal(uiDomainForSlug("azmail"), "social");
assert.match(home, /data-dash-slug="azbrowser"[^>]*data-domain="aznet"/);
assert.match(home, /data-dash-slug="4dmap"[^>]*data-domain="forensics"/);
assert.match(home, /data-dash-slug="vibelock"[^>]*data-domain="forensics"/);
assert.match(home, /AI deepfake risk in mp4, mp3/);
assert.match(home, /id="ai-vibe"/);
assert.match(home, /data-dash-slug="postking"[^>]*data-domain="games"/);
assert.match(home, /data-dash-slug="azchat"[^>]*data-domain="social"/);
assert.match(home, /data-dash-slug="azchat"[\s\S]{0,900}all-rooms list/);
assert.match(home, /data-dash-slug="azchat"[\s\S]{0,900}passphrase/);
assert.match(home, /id="desk-azbot"[^>]*data-domain="ai"[^>]*data-role="worker"/);
assert.match(home, /id="desk-azai"[^>]*data-domain="ai"[^>]*data-role="learner"/);
assert.match(home, /id="dash-receipts"/);
assert.match(home, /id="mesh-panel"/);
assert.match(home, /id="session-strip"/);
assert.match(home, /Operator control panel/);
assert.match(home, /<label for="op-fg-name">Name \/ slug<\/label>/);
assert.match(home, /<label for="op-fg-op">Operation<\/label>/);
assert.match(home, /<label for="op-fg-payload">Payload JSON<\/label>/);
assert.match(home, /id="metric-nodes"/);
assert.match(home, /id="metric-live"/);
assert.match(home, /id="metric-software"/);
assert.match(home, />Nodes</);
assert.match(home, />Live Nodes</);
assert.match(home, /human mesh users/);
assert.match(home, /id="op-aznet-pair"/);
assert.match(home, /data-op-pair="pair_status"/);
assert.match(home, /data-op-pair="pair"/);
assert.match(home, />Pair status</);
assert.match(home, /pairs with AZNet \(order\/token\)/);
assert.match(home, /id="task-aznet"/);
assert.match(home, /Channel plane/);
assert.match(home, /data-dash-slug="foldlock"/);
assert.match(home, /What do you want to do\?/);
assert.match(home, /Loading status/);
assert.doesNotMatch(home, /15:20/);
assert.doesNotMatch(home, /\{ q: text, text: text \}/);
assert.match(home, /Invalid JSON — not sent/);
assert.match(home, /let out = document.getElementById\("fg-console-out"\)/);
assert.doesNotMatch(home, /var out = document.getElementById\("fg-console-out"\)/);
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
assert.ok(home.indexOf("node-meshed orchestration suite") < home.indexOf('id="workspace"') || home.indexOf("node-meshed orchestration suite") > 0);

const textareas = [...home.matchAll(/<textarea\b([^>]*)>/g)].map((m) => m[1]);
assert.ok(textareas.length >= 8, `expected labeled workspace textareas, got ${textareas.length}`);
for (const attrs of textareas) {
  assert.match(attrs, /\bid="/, `textarea missing id: ${attrs}`);
}

const wsRes = await get("/workspace");
assert.equal(wsRes.status, 200);
assert.match(wsRes.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
assert.equal(wsRes.headers.get("x-frame-options"), "DENY");
assert.equal(wsRes.headers.get("referrer-policy"), "no-referrer");
const ws = await wsRes.text();
assert.match(ws, /<title>Workspace — /);
assert.match(ws, /id="fg-console"/);
assert.match(ws, /id="op-panel"/);
assert.match(ws, /id="dashboard"/);
assert.match(ws, /id="mesh-panel"/);
assert.match(ws, /FragGate console/);
assert.match(ws, /Operator control panel/);
assert.match(ws, /id="about-aziel"/);
assert.match(ws, /id="elroi-pane"/);
assert.match(ws, /id="elroi-jeeves"/);
assert.match(ws, /id="desk-jeeves"/);
assert.match(ws, /data-elroi-tab="corpus"/);
assert.match(ws, /data-domain-tab="elroi"/);
assert.match(ws, /id="sot-desk"/);
assert.doesNotMatch(ws, /data-domain-tab="corpus"/);
assert.match(ws, /id="desk-jeeves-link"/);
assert.doesNotMatch(ws, /data-domain-tab="corpus"/);
assert.match(ws, /id="about-aziel-strip"/);
assert.match(ws, /id="about-aziel-strip-op"/);
assert.match(ws, /id="launch-parts"/);
assert.match(ws, /#aziel/);
assert.match(ws, /data-launch-slug="foldlock"/);
assert.match(ws, /data-launch-slug="godlock"/);
assert.match(ws, /#foldlock/);
assert.match(ws, /#godlock/);
const foldChips = ws.match(/data-launch-slug="foldlock"[^>]*>([^<]*(?:<span[^>]*>[^<]*<\/span>[^<]*)*)/) || [];
const godChips = ws.match(/data-launch-slug="godlock"[^>]*>([^<]*(?:<span[^>]*>[^<]*<\/span>[^<]*)*)/) || [];
assert.ok(foldChips[0] && godChips[0], "dashboard cards must carry launch chips");
assert.notEqual(foldChips[0], godChips[0], "hashtag chips must differ per Softwares card");
assert.doesNotMatch(ws, /15:20/);

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /\/workspace</);
assert.match(sitemap, /\/download</);

const softwareHtml = await (
  await get("/v1/software", { accept: "text/html" })
).text();
assert.match(softwareHtml, /<label for="software-filter">Search Softwares/);
assert.match(softwareHtml, /Use in browser/);
assert.match(softwareHtml, /id="suite-download-software"/);
assert.match(ws, /id="suite-download-op"/);
assert.match(ws, /data-mesh="vpn"/);
assert.match(ws, /data-mesh="heartbeat"/);
assert.match(ws, /data-mesh="enable"/);
assert.match(ws, /id="mesh-bearer"/);
assert.match(ws, /id="task-azmail"/);
assert.match(ws, /id="task-embryolock"/);
assert.match(softwareHtml, /Connect AI/);
assert.match(softwareHtml, /data-software-row/);
assert.match(softwareHtml, /id="about-aziel"/);
assert.match(softwareHtml, /data-launch-slug="foldlock"/);
assert.match(softwareHtml, /#foldlock/);

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
  ["azmail", "airlock_classify", { text: "hello from the anonymous ring" }],
  ["azhub", "region_list", {}],
  ["azinterface", "genesis_status", {}],
  ["aziel-corpus", "search", { q: "Florence" }],
  ["4dmap", "pin", { label: "inspect-1" }],
  ["embryolock", "limitation", {}],
  ["peacelock", "open", { scope: "silence", subject: "chamber-1" }],
];

for (const [slug, op, payload] of ops) {
  const { status, body } = await call(slug, op, payload);
  assert.equal(status, 200, `${slug}/${op} HTTP ${status} ${JSON.stringify(body).slice(0, 240)}`);
  assert.notEqual(body.code, "FG-HALLUC-TOOL", `${slug}/${op} halluc`);
  assert.notEqual(body.ok, false, `${slug}/${op} refused ${body.code || body.error}`);
}

const receipts = await (await get("/v1/receipts")).json();
assert.ok(receipts.spec || receipts.public_chain || receipts.path || receipts.ok !== undefined);

const mesh = await (await get("/v1/mesh")).json();
assert.ok(mesh.rollup || mesh.live_nodes != null);
assert.equal(typeof mesh.nodes, "number");
assert.equal(mesh.nodes, mesh.human_mesh_users + mesh.human_uses);
assert.equal(mesh.live_nodes, mesh.human_mesh_users);
assert.equal(mesh.live_nodes, mesh.rollup.mesh);
assert.equal(mesh.nodes, mesh.rollup.nodes);
assert.equal(mesh.get_never_enables, true);
assert.equal(mesh.nine_laws && mesh.nine_laws.hard_true, true);
assert.equal(mesh.vpn, true);
assert.equal(mesh.public_vpn, true);
assert.equal(mesh.default_vpn_backend, "azvpn");
assert.equal(mesh.origin_hiding, false);
assert.equal(mesh.wifi, "on");
assert.equal(mesh.bluetooth, "on");
assert.equal(mesh.rf, "on");
assert.equal(mesh.photon, "on");
assert.equal(mesh.channel_plane && mesh.channel_plane.spec, "QNM-CHANNEL-PLANE-1.0");
assert.equal(mesh.channel_plane.vpn, true);
assert.equal(mesh.channel_plane.concentrator_slug, "azvpn");
assert.equal(mesh.vpn_auto.get_never_opens, true);
assert.ok(Array.isArray(mesh.bearers) && mesh.bearers.includes("suite-presence"));

const pair = await call("aznet", "pair_status", {});
assert.equal(pair.status, 200);
assert.equal(pair.body.result.vpn, false);
assert.equal(pair.body.result.public_vpn, true);
assert.equal(pair.body.result.default_vpn_backend, "azvpn");
assert.equal(pair.body.result.tunnel, false);
assert.equal(pair.body.result.pairing, "order/token");

const health = await call("decisiongate", "health", {});
assert.equal(health.status, 200);

const foldlockCard = await (await get("/p/foldlock")).text();
assert.match(foldlockCard, /<label for="fg-payload-foldlock">Payload JSON for FoldLock<\/label>/);
assert.match(foldlockCard, /data-op="fold-preview"/);
assert.doesNotMatch(foldlockCard, /\{ q: text, text: text \}/);

assert.ok(PRODUCTS.some((p) => p.slug === "foldlock"));
assert.ok(home.includes('data-op="fold-preview"') || ws.includes("fold-preview"));

console.log("verify-human-ui: ok");

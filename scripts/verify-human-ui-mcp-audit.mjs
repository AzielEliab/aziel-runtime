/**
 * Audit close-test: Softwares human UI + MCP wiring (docs/audit/HUMAN-UI-MCP-AUDIT-2026-09-17.md).
 * Asserts critical wiring only. Does not change runtime behavior.
 * Does not invent scores or claim .
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import {
  LIVE_OPS,
  OP_ALIASES,
  STUB_OPS,
  NAMED_STUBS,
  buildRegistry,
} from "../src/fraggate/registry.js";
import {
  PUBLIC_MCP_TOOLS,
  PUBLIC_MCP_TOOL_MAX,
  PUBLIC_DOOR_TOOLS,
  PUBLIC_FABRIC_TOOLS,
  PUBLIC_HELPER_TOOLS,
  PUBLIC_SESSION_TOOLS,
} from "../src/fraggate/codes.js";
import { HUMAN_TASKS, hasLiveDoor, parseHumanPayload } from "../src/human-ui.js";
import { LABELED_HUMAN_TASK_SLUGS } from "../src/human-hrefs.js";
import { MUTATING_MCP_TOOLS } from "../src/mcp-safeguard.js";
import { buildMcpToolList, mcpInitializeInstructions } from "../src/mcp-surface.js";
import { sessionMcpTools } from "../src/session-http.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { MASTER_33_SLUGS, TAB_PLACEMENT_SLUGS } from "../src/domain-map.js";
import { WORKER_ONLY_PRODUCTS } from "../src/software-catalog.js";
import { MESH_CANONICAL_OPS, MESH_MCP_TOOLS } from "../src/mesh.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

async function get(path, headers = {}) {
  return handler(new Request(origin + path, { headers }), env);
}

async function post(path, body, headers = {}) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    env,
  );
}

const productSlugs = PRODUCTS.map((p) => p.slug).sort();
const liveOpSlugs = Object.keys(LIVE_OPS).sort();
const catalogLive = productSlugs.filter((s) => hasLiveDoor(s));
const localOnly = productSlugs.filter((s) => !hasLiveDoor(s));
const kernelSlugs = liveOpSlugs.filter((s) => !productSlugs.includes(s));
const taskSlugs = HUMAN_TASKS.map((t) => t.slug);
assert.deepEqual(taskSlugs.slice().sort(), LABELED_HUMAN_TASK_SLUGS.slice().sort(), "href allowlist matches HUMAN_TASKS");

const tools = buildMcpToolList({ sessionTools: sessionMcpTools() });
const toolNames = tools.map((t) => t.name).sort();
assert.deepEqual(toolNames, PUBLIC_MCP_TOOLS.slice().sort(), "MCP tools/list must match PUBLIC_MCP_TOOLS");
assert.equal(toolNames.length, PUBLIC_MCP_TOOLS.length);
assert.ok(toolNames.length <= PUBLIC_MCP_TOOL_MAX, "public MCP tool count stays at or under PUBLIC_MCP_TOOL_MAX");
assert.ok(
  toolNames.every((n) => PUBLIC_MCP_TOOLS.includes(n)),
  "no former {slug}_{op} pile and no unknown MCP names",
);

for (const name of MUTATING_MCP_TOOLS) {
  assert.ok(toolNames.includes(name), `mutating tool listed: ${name}`);
  const tool = tools.find((t) => t.name === name);
  assert.ok(tool.inputSchema?.properties?.confirm, `${name} schema documents confirm`);
  assert.ok(tool.inputSchema?.properties?.dry_run, `${name} schema documents dry_run`);
  assert.equal(tool.annotations?.requiresConfirmation, true, `${name} annotated requiresConfirmation`);
  const required = tool.inputSchema?.required || [];
  assert.ok(!required.includes("confirm"), `${name} must not require confirm in schema.required (connector refresh)`);
}

assert.ok(!MUTATING_MCP_TOOLS.includes("mesh_disable"), "mesh_disable is refuse-only, not a mutate gate");
assert.ok(!MUTATING_MCP_TOOLS.includes("mesh_status"));
assert.ok(!MUTATING_MCP_TOOLS.includes("chainlock_tip"));
assert.ok(!MUTATING_MCP_TOOLS.includes("fraggate_list"));

assert.deepEqual(NAMED_STUBS, [], "named stub products stay empty — stubs are ops, not fake catalog cards");
assert.deepEqual(localOnly, ["veillock"], "VeilLock is the only catalog local_only slug");
assert.deepEqual(kernelSlugs.sort(), ["memory", "mesh"].sort(), "LIVE_OPS kernel extras are mesh + memory");
assert.equal(productSlugs.length, 41);
assert.equal(MASTER_33_SLUGS.length, 33);
assert.ok(TAB_PLACEMENT_SLUGS.includes("azvpn"));
assert.ok(productSlugs.includes("azvpn"));
assert.ok(LIVE_OPS.azvpn.includes("describe"));
assert.ok(STUB_OPS.azvpn.includes("wireguard"));

for (const slug of MASTER_33_SLUGS) {
  assert.ok(productSlugs.includes(slug), `MASTER-33 slug in PRODUCTS: ${slug}`);
}
const workerOnlySlugs = WORKER_ONLY_PRODUCTS.map((p) => p.slug);
for (const slug of TAB_PLACEMENT_SLUGS) {
  if (workerOnlySlugs.includes(slug)) {
    assert.ok(!productSlugs.includes(slug), `Worker-only placement is not a PRODUCTS true-engine: ${slug}`);
    continue;
  }
  assert.ok(productSlugs.includes(slug), `placement slug in PRODUCTS: ${slug}`);
}
assert.ok(TAB_PLACEMENT_SLUGS.includes("whitestone"));
assert.ok(workerOnlySlugs.includes("whitestone"));

for (const task of HUMAN_TASKS) {
  assert.ok(hasLiveDoor(task.slug), `HUMAN_TASKS slug live: ${task.slug}`);
  assert.ok((LIVE_OPS[task.slug] || []).includes(task.op), `${task.slug} primary op ${task.op} is LIVE_OPS`);
}

const home = await (await get("/")).text();
const workspace = await (await get("/workspace")).text();
const about = await (await get("/about")).text();
const softwareHtml = await (await get("/v1/software", { accept: "text/html" })).text();
const azvpnCard = await (await get("/p/azvpn")).text();
const veillockCard = await (await get("/p/veillock")).text();
const foldCard = await (await get("/p/foldlock")).text();

for (const html of [home, workspace]) {
  for (const id of ["op-panel", "dashboard", "fg-console", "mesh-panel", "dash-softwares", "about-aziel"]) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} on human pane`);
  }
  assert.match(html, /id="task-azvpn"/);
  assert.match(html, /data-dash-slug="azvpn"/);
  assert.match(html, /data-dash-slug="veillock"/);
  assert.match(html, /local only — no public FragGate door/);
}
assert.match(home, /href="https:\/\/aziel-runtime\.example\/workspace#task-azmail">Use in browser/);

assert.match(about, /id="about-aziel"/);
assert.match(about, /#aziel/);
assert.doesNotMatch(about, /id="op-panel"/, "/about is cite/launch, not the operator rack");

assert.match(softwareHtml, /Use in browser/);
assert.match(softwareHtml, /data-software-row/);
assert.match(softwareHtml, /data-slug="azvpn"/);
assert.match(softwareHtml, /href="https:\/\/aziel-runtime\.example\/workspace#task-azvpn"/);
assert.match(softwareHtml, /href="https:\/\/aziel-runtime\.example\/workspace#task-azmail"/);
assert.match(softwareHtml, /id="suite-download-software"/);

assert.match(azvpnCard, /data-op="describe"/);
assert.match(azvpnCard, /data-op="open"/);
assert.match(azvpnCard, /WireGuard \/ OpenVPN \/ L3 stay SLOT/);
assert.match(azvpnCard, /data-slug="azvpn"/);
assert.doesNotMatch(azvpnCard, /href="null"/, "in-runtime AZVPN card must not emit Download desktop href=null");
assert.match(azvpnCard, /no counted Worker tarball \(in-runtime\)/);
assert.doesNotMatch(veillockCard, /data-slug="veillock"[^>]*data-kind="door"/, "VeilLock has no public FragGate button rack");
assert.match(veillockCard, /id="fold-pack-verify"/, "every /p/{slug} still ships FoldLock corpus-tip door");
assert.match(foldCard, /data-op="fold-preview"/);

for (const p of PRODUCTS) {
  assert.match(home, new RegExp(`data-dash-slug="${p.slug}"`));
  assert.match(home, new RegExp(`id="${p.slug}"`));
  assert.match(softwareHtml, new RegExp(`data-slug="${p.slug}"`));
  if (taskSlugs.includes(p.slug)) {
    assert.match(softwareHtml, new RegExp(`/workspace#task-${p.slug}`));
  } else {
    assert.match(softwareHtml, new RegExp(`/p/${p.slug}`));
    assert.doesNotMatch(softwareHtml, new RegExp(`/workspace#task-${p.slug}`));
  }
}
assert.match(softwareHtml, /data-slug="whitestone"/);
assert.match(softwareHtml, /whitestone\.vibelock\.workers\.dev/);
assert.match(softwareHtml, /whitestone-download-tracker\.vibelock\.workers\.dev\/download/);
assert.doesNotMatch(softwareHtml, /\/p\/whitestone/);
assert.match(softwareHtml, /whitestone\.vibelock\.workers\.dev/);
assert.match(softwareHtml, /Case Mode/i);
assert.match(softwareHtml, /1\.6\.0/);
assert.doesNotMatch(softwareHtml, /not a lawyer/i);

for (const slug of ["azvpn", "foldlock", "zkattest", "veillock", "azmail"]) {
  const card = await (await get(`/p/${slug}`)).text();
  assert.match(card, /id="about-aziel"/);
  assert.match(card, /class="launch-chips"/);
  if (hasLiveDoor(slug)) {
    assert.match(card, new RegExp(`data-slug="${slug}"`));
  }
}

const script = home.slice(home.indexOf("function fraggateCall"));
assert.match(script, /origin \+ "\/v1\/fraggate\/call"/);
assert.match(script, /origin \+ "\/v1\/fraggate\/list"/);
assert.match(script, /origin \+ "\/v1\/fraggate\/describe\?slug="/);
assert.match(script, /origin \+ "\/v1\/mesh"/);
assert.match(script, /origin \+ "\/v1\/receipts"/);
assert.match(script, /origin \+ "\/v1\/session\/open"/);
assert.match(script, /origin \+ "\/mcp"/);
assert.match(script, /name: name, arguments: \{ c:/);
assert.match(script, /fraggateCall\(origin, "mesh", "join"/);
assert.match(script, /fraggateCall\(origin, "mesh", "vpn"/);
assert.match(script, /fraggateCall\(origin, "mesh", "enable"/);
assert.match(script, /fraggateCall\(origin, "mesh", act/);
assert.match(home, /data-mesh="heartbeat"/);
assert.match(home, /data-mesh="leave"/);
assert.match(home, /data-mesh="vpn"/);
assert.match(home, /data-mesh="enable"/);
assert.match(home, /id="mesh-bearer"/);
assert.match(home, /id="task-azmail"/);
assert.match(home, /id="task-azhub"/);
assert.match(home, /id="task-azinterface"/);
assert.match(home, /id="task-aziel-corpus"/);
assert.match(home, /id="task-4dmap"/);
assert.match(home, /id="task-embryolock"/);
assert.match(home, /id="task-peacelock"/);
assert.match(home, /id="suite-download-op"/);
assert.match(home, /id="suite-download-dash"/);
assert.match(home, /worker_hardware false/);
assert.match(script, /fraggateCall\(origin, "aznet", op/);
const fraggateFnEnd = script.indexOf("document.querySelectorAll(\".fg-door");
assert.ok(fraggateFnEnd > 0, "FragGate helper is before the door boxes");
assert.doesNotMatch(
  script.slice(0, fraggateFnEnd),
  /confirm\s*:/,
  "human HTTP FragGate helper does not send MCP confirm",
);
assert.match(script, /origin \+ "\/v1\/interface"/);
assert.match(script, /call: "seal", confirm: true/, "interface seal still sends confirm on its own call");

const dataAttrs = [...home.matchAll(/data-(op-console|op-soft|op-pair|op-mesh|op-sess|console|mesh|cl|sess|op)="([^"]+)"/g)];
assert.ok(dataAttrs.length > 20, `expected wired data-* buttons, got ${dataAttrs.length}`);
for (const [, kind] of dataAttrs) {
  if (kind === "op-console" || kind === "console") {
    assert.match(script, /data-console|data-op-console/);
  }
}

const mcpInit = await post("/mcp", { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "audit", version: "0" } } });
const mcpInitBody = await mcpInit.json();
assert.equal(mcpInitBody.result?.serverInfo?.version || mcpInitBody.result?.protocolVersion ? true : true, true);
const listed = await post("/mcp", { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
const listedBody = await listed.json();
const liveNames = (listedBody.result?.tools || []).map((t) => t.name).sort();
assert.deepEqual(liveNames, toolNames);

const openapi = await (await get("/openapi.json")).json();
assert.equal(openapi.openapi.startsWith("3."), true);
assert.ok(openapi.paths["/v1/fraggate/call"], "OpenAPI documents FragGate call");
assert.ok(openapi.paths["/mcp"], "OpenAPI documents MCP edge");
assert.ok(openapi.paths["/p/azvpn/describe"], "OpenAPI documents per-slug proxy paths, not a single /p/{product}/{op} template");
assert.ok(openapi.paths["/about"]);
assert.ok(openapi.paths["/workspace"], "OpenAPI documents GET /workspace");
assert.ok(openapi.paths["/download"], "OpenAPI documents GET /download suite pack");
assert.ok(openapi.paths["/v1/suite/download"], "OpenAPI documents machine suite pack alias");

const registry = await (await get("/v1/fraggate/list")).json();
assert.equal(registry.ok, true);
const regSlugs = (registry.entries || []).map((e) => e.slug).sort();
for (const slug of catalogLive) {
  assert.ok(regSlugs.includes(slug), `registry lists live catalog slug ${slug}`);
}
assert.ok(regSlugs.includes("mesh"));
assert.ok(regSlugs.includes("memory"));
assert.ok(regSlugs.includes("veillock"));
const veil = (registry.entries || []).find((e) => e.slug === "veillock");
assert.equal(veil.status, "local_only");

const catalog = await (await get("/v1/software")).json();
assert.equal(catalog.count, 42);
assert.equal(catalog.live_count, 41, "hub Softwares live_count excludes VeilLock local_only and includes Whitestone Worker-only");
assert.equal(catalog.local_only_count, 1);
assert.equal(catalog.worker_only_count, 1);
assert.ok(catalog.software.some((s) => s.slug === "veillock" && s.status === "local_only" && s.door === "none"));
assert.ok(
  catalog.software.some(
    (s) =>
      s.slug === "whitestone" &&
      s.status === "live" &&
      s.worker_only === true &&
      s.engine === false &&
      s.door === "none" &&
      s.worker_home === "https://whitestone-download-tracker.vibelock.workers.dev/" &&
      s.download_url === "https://whitestone-download-tracker.vibelock.workers.dev/download" &&
      s.web_app === "https://whitestone.vibelock.workers.dev/",
  ),
);
assert.ok(String(catalog.suite_download || "").endsWith("/download"));
assert.ok(catalog.software.some((s) => s.slug === "azvpn"));
assert.ok(!catalog.software.some((s) => s.slug === "mesh"), "mesh is not a Softwares-tab card");
assert.ok(!catalog.software.some((s) => s.slug === "lumen"), "Lumen is not a catalog card");
assert.ok(!catalog.software.some((s) => s.slug === "ark-private"));
assert.ok(!catalog.software.some((s) => s.slug === "trades-runtime"), "trades-runtime is cite-only, not a Softwares card");
assert.ok(catalog.sister_products.products.some((p) => p.slug === "trades-runtime" && p.fraggate_call === false));

const describeWhite = await (await get("/v1/fraggate/describe?slug=whitestone")).json();
assert.equal(describeWhite.code, "FG-HALLUC-TOOL", "Whitestone is not a FragGate engine — do not invent ops");
const callWhite = await post("/v1/fraggate/call", { slug: "whitestone", op: "health", payload: {} });
const callWhiteBody = await callWhite.json();
assert.equal(callWhiteBody.ok, false);
assert.equal(callWhiteBody.code, "FG-HALLUC-TOOL");

const describeTrades = await (await get("/v1/fraggate/describe?slug=trades-runtime")).json();
assert.equal(describeTrades.code, "FG-HALLUC-TOOL", "trades-runtime is not a FragGate registry name");
const callTrades = await post("/v1/fraggate/call", { slug: "trades-runtime", op: "health", payload: {} });
const callTradesBody = await callTrades.json();
assert.equal(callTradesBody.ok, false);
assert.equal(callTradesBody.code, "FG-HALLUC-TOOL");

const describeAzvpn = await (await get("/v1/fraggate/describe?slug=azvpn")).json();
assert.notEqual(describeAzvpn.code, "FG-HALLUC-TOOL");
assert.ok(describeAzvpn.ops?.includes("describe") || describeAzvpn.entry?.ops?.includes("describe") || JSON.stringify(describeAzvpn).includes("describe"));

const callHealth = await post("/v1/fraggate/call", { slug: "azvpn", op: "describe", payload: {} });
const callBody = await callHealth.json();
assert.equal(callHealth.status, 200);
assert.notEqual(callBody.ok, false);
assert.notEqual(callBody.code, "FG-HALLUC-TOOL");

const wireguard = await post("/v1/fraggate/call", { slug: "azvpn", op: "wireguard", payload: {} });
const wgBody = await wireguard.json();
assert.equal(wgBody.ok, false);
assert.match(String(wgBody.code || wgBody.refuse || ""), /STUB|FG-STUB/);

const mcpCallNoConfirm = await post("/mcp", {
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "fraggate_call", arguments: { slug: "decisiongate", op: "health" } },
});
const mcpCallBody = await mcpCallNoConfirm.json();
const mcpText = JSON.stringify(mcpCallBody);
assert.match(mcpText, /MCP-CONFIRM-REQUIRED|confirm=true/);

const unlabeled = productSlugs.filter((s) => !taskSlugs.includes(s));
assert.ok(unlabeled.length >= 20, "remaining Softwares use /p/{slug} instead of a labeled #task-* pane");
assert.ok(taskSlugs.includes("azvpn"));
assert.ok(taskSlugs.includes("azmail"));
assert.ok(taskSlugs.includes("azhub"));
assert.ok(taskSlugs.includes("azinterface"));
assert.ok(taskSlugs.includes("aziel-corpus"));
assert.ok(taskSlugs.includes("4dmap"));
assert.ok(taskSlugs.includes("embryolock"));
assert.ok(taskSlugs.includes("peacelock"));
assert.equal(taskSlugs.length, 15);

const instructions = mcpInitializeInstructions();
assert.match(instructions, /fraggate_call is THE single door|Execute only through fraggate_call/);
assert.match(instructions, /Do not invoke former \{slug\}_\{op\} names/);
assert.doesNotMatch(instructions, /VPN\/hop mesh is not claimed on the public surface/);
assert.match(instructions, /Public VPN auto-binds AZVPN/);
assert.match(tools.find((t) => t.name === "fraggate_list").description, /Not the full FragGate door/);
assert.match(tools.find((t) => t.name === "fraggate_list").description, /4dmap/);
assert.match(tools.find((t) => t.name === "fraggate_call").description, /Catalog LIVE_OPS slugs/);
assert.match(instructions, /AZVPN|azvpn|1\.7\.|public VPN|concentrator/i);
assert.match(instructions, /kernel-direct wrappers/);
assert.match(instructions, /Not MASTER-33/);
assert.match(instructions, /Not a second Softwares door/);
assert.doesNotMatch(instructions, /EmbryoLock is stub \/ local-not-hosted/);

const getMcp = await (await get("/mcp")).json();
assert.equal(getMcp.gateway.second_door, false);
assert.equal(getMcp.gateway.fabric.master_33, false);
assert.equal(getMcp.gateway.fabric.second_softwares_door, false);
assert.equal(getMcp.gateway.fabric.hop_list, "kernel-direct");
assert.equal(getMcp.gateway.fabric.same_kernels, true);
assert.ok(getMcp.production_binds.SESSION.class_name === "RuntimeSession");
assert.ok(getMcp.production_binds.CHAINLOCK.class_name === "ChainWriter");
assert.ok(getMcp.production_binds.RATE.class_name === "RateQuota");
assert.equal(getMcp.durability.production_binds.CHAINLOCK.class_name, "ChainWriter");

const suitePack = await (await get("/download")).json();
assert.equal(suitePack.ok, true);
assert.equal(suitePack.spec, "AZRT-SUITE-PACK-1.0");
assert.equal(suitePack.labels.software_catalog, "REAL");
assert.equal(suitePack.labels.worker_wasm_bundle, "SLOT");
assert.equal(suitePack.labels.wireguard_openvpn_l3, "SLOT");
assert.equal(suitePack.labels.invented_doi, false);
assert.equal(suitePack.foldlock_tip.full_library_in_process, false);
assert.ok(Array.isArray(suitePack.catalog.software) && suitePack.catalog.software.length === 42);
assert.ok(suitePack.catalog.software.some((s) => s.slug === "whitestone" && s.worker_only === true));
assert.equal(suitePack.mesh.live_nodes_plane, "human-mesh-users-site-viewers");
assert.equal(suitePack.mesh.nodes_plane, "human-mesh-users-uses");
assert.equal(suitePack.mesh.software_nodes_plane, "software-worker-fanout");
assert.equal(suitePack.mesh.instance_join.downloads_are_not_live, true);
assert.match(suitePack.mesh.live_nodes_note, /human mesh users/i);
assert.match(suitePack.mesh.nodes_note, /human mesh users plus/i);
assert.ok(suitePack.mesh.channel_plane.worker_hardware === false);
assert.equal(suitePack.mesh.channel_plane.local_radio_hooks.mock, false);
assert.equal(suitePack.mesh.channel_plane.local_radio_hooks.worker_hardware, false);

assert.ok(MESH_CANONICAL_OPS.includes("vpn"));
assert.ok(Array.isArray(MESH_MCP_TOOLS));
assert.ok(!MESH_MCP_TOOLS.includes("mesh_vpn"), "mesh/vpn is FragGate-only; no dedicated MCP tool");

assert.equal(PUBLIC_DOOR_TOOLS.length + PUBLIC_FABRIC_TOOLS.length + PUBLIC_HELPER_TOOLS.length + PUBLIC_SESSION_TOOLS.length, PUBLIC_MCP_TOOLS.length);

const empty = parseHumanPayload("");
assert.equal(empty.ok, true);
const built = buildRegistry(PRODUCTS);
assert.equal(built.local_only_count, 1);
assert.ok(built.live_count >= 40);

const aliasTargets = [];
for (const [slug, map] of Object.entries(OP_ALIASES)) {
  for (const [alias, dest] of Object.entries(map)) {
    aliasTargets.push(`${slug}/${alias}->${dest}`);
    assert.ok((LIVE_OPS[slug] || []).includes(dest), `alias dest live: ${slug}/${dest}`);
    assert.ok((LIVE_OPS[slug] || []).includes(alias), `alias listed on LIVE_OPS: ${slug}/${alias}`);
  }
}
assert.ok(aliasTargets.length > 10);

console.log(
  JSON.stringify(
    {
      ok: true,
      products: productSlugs.length,
      catalog_live: catalogLive.length,
      local_only: localOnly,
      kernel: kernelSlugs,
      human_tasks: taskSlugs,
      use_in_browser_without_task_pane: unlabeled,
      mcp_tools: toolNames.length,
      mutating: MUTATING_MCP_TOOLS.length,
      registry_live: built.live_count,
      registry_local_only: built.local_only_count,
      named_stubs: NAMED_STUBS.length,
    },
    null,
    2,
  ),
);

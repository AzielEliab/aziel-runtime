/**
 * BAN-SURVIVAL-1.0: mutual backup — live multi-front ↔ cold shelves. Live-node API SLOT.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { LIVE_OPS } from "../src/fraggate/registry.js";
import { MEMORY_STUB_OPS } from "../src/memory.js";
import { SUITE_DESIGNS } from "../src/seo.js";
import {
  CAP7_SITES,
  cap7AznetRemainder,
  cap7BrowserSubset,
  cap7SiteNames,
  landCap7Shuffle,
  siteForMirageNode,
} from "../src/cap7-shuffle.js";
import {
  CALLING_NAME_SEEDS,
  generateCallingName,
  nameAlertText,
  resolveCallingName,
  slugifyCallingName,
} from "../src/calling-name.js";
import {
  AKM_MEMORY_LAW,
  BAN_SURVIVAL,
  BAN_SURVIVAL_DOCS,
  BAN_SURVIVAL_RULE,
  BAN_SURVIVAL_TIP,
  CLIENT_ORDER,
  EXEC_PATHS,
  CAP7_AZNET,
  LIVE_NODE_API,
  NAMED_ROUTES,
  NEIGHBOR_SHELF_CITE,
  PRIMARY_WORKER_ORIGIN,
  SHELF_BACKUP,
  READ_PATHS,
  REFUSE,
  applyBanSurvival,
  blockedRouteRefuse,
  bridgeOrigins,
  dispatchSurvivalHttp,
  doorMode,
  failoverCite,
  isExecPath,
  isReadPath,
  isRouteBlocked,
  isSurvivalPath,
  judgeBannedHostLive,
  judgeInventedLiveShelf,
  judgeLlmReplica,
  judgeAznetPayloadHost,
  judgeDoorOnly,
  judgeFakeCap7Host,
  judgeMemoryAsTruth,
  judgeMemoryRewrite,
  judgeOpenNodeProxy,
  judgeSecondDoor,
  judgeShelfOnly,
  judgeUnmarkedHydra,
  liveDoors,
  liveExecOrigins,
  namedExecOrigins,
  nextExecOrigin,
  parseBlockedRoutes,
  rateLimitFailoverCite,
  shouldFailoverStatus,
  survivalCiteField,
  survivalDoc,
  survivalLlmsBlock,
  survivalSkillMarkdown,
} from "../src/ban-survival.js";

const paper = readFileSync(new URL("../docs/designs/BAN-SURVIVAL-1.0.md", import.meta.url), "utf8");
const survival = readFileSync(new URL("../docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md", import.meta.url), "utf8");
const nodeMesh = readFileSync(new URL("../docs/NODE_MESH.md", import.meta.url), "utf8");
const clientUpdate = readFileSync(new URL("../docs/CLIENT_UPDATE.md", import.meta.url), "utf8");
const citeDoc = readFileSync(new URL("../docs/CITE.md", import.meta.url), "utf8");
const designsReadme = readFileSync(new URL("../docs/designs/README.md", import.meta.url), "utf8");

assert.equal(BAN_SURVIVAL, "BAN-SURVIVAL-1.0");
assert.equal(BAN_SURVIVAL_DOCS, "docs/designs/BAN-SURVIVAL-1.0.md");
assert.match(paper, /^# BAN-SURVIVAL-1\.0/m);
assert.match(paper, /Author: Aziel Eliab only/);
assert.match(paper, /Never invent a live door/);
assert.match(paper, /Never claim a banned host is still LIVE/);
assert.match(paper, /back each other up/);
assert.match(paper, /BAN-NO-SHELF-ONLY/);
assert.match(paper, /BAN-NO-DOOR-ONLY/);
assert.match(paper, /BAN-NO-OPEN-NODE-PROXY/);
assert.match(paper, /BAN-NO-FAKE-CAP7-HOST/);
assert.match(paper, /BAN-NO-AZNET-PAYLOAD-HOST/);
assert.match(paper, /BAN-NO-HARDCODE-CAP7-HOST/);
assert.match(paper, /BAN-NO-FAKE-SHUFFLE-LIVE/);
assert.match(paper, /belief_is_not_truth/);
assert.match(paper, /memory_get/);
assert.match(paper, /memory_resolve/);
assert.match(paper, /ping MirageGrid/);
assert.match(paper, /distinct mesh names/);
assert.match(paper, /Calling-name rotation/);
assert.match(paper, /\*new name alert:/);
assert.match(paper, /Whitestone AI/);
assert.match(paper, /Platforms \(all LIVE\)/);
assert.match(clientUpdate, /Calling-name rotation/);
assert.match(clientUpdate, /Windows/);
assert.match(paper, /radio_phy/);
assert.match(paper, /service binding/);
assert.match(paper, /Not a Softwares-tab product/);
assert.match(paper, /No new MCP tool/);
assert.match(paper, /BAN-NO-LIE/);
assert.match(paper, /BAN-NO-HYDRA/);
assert.match(paper, /BAN-NO-SECOND-DOOR/);
assert.match(paper, /https:\/\/www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(paper, /15:20 chrome visible|clock face on the homepage/i);
assert.match(paper, /mutual backup/i);
assert.match(paper, /backup for death-by-ban/);
assert.match(paper, /backup for cold-shelf death/);
assert.doesNotMatch(paper, /failed plan/i);
assert.equal(REFUSE.NO_SHELF_FAILOVER, undefined);
assert.ok(!Object.values(REFUSE).includes("BAN-NO-SHELF-FAILOVER"));
assert.match(survival, /BAN-SURVIVAL-1\.0/);
assert.match(nodeMesh, /BAN-SURVIVAL-1\.0/);
assert.match(clientUpdate, /BAN-SURVIVAL-1\.0/);
assert.match(clientUpdate, /LIVE only/);
assert.match(citeDoc, /BAN-SURVIVAL-1\.0/);
assert.match(designsReadme, /BAN-SURVIVAL-1\.0/);

assert.ok(SUITE_DESIGNS.some((d) => d.id === BAN_SURVIVAL && d.kind === "law" && d.status === "live"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("ban_survival"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("runtime_survival"));
assert.equal(PUBLIC_MCP_TOOLS.includes("fraggate_call"), true);

assert.deepEqual(namedExecOrigins(), [
  PRIMARY_WORKER_ORIGIN,
  "https://www.azielcorpuslibrary.net/runtime",
  "https://www.azieleliab.com/runtime",
  "https://godlock.uk/runtime",
]);
assert.ok(NAMED_ROUTES.every((r) => r.independent === false));
assert.ok(NAMED_ROUTES.every((r) => r.blast_radius === "cf-github"));
assert.equal(SHELF_BACKUP.role, "death-by-ban-backup");
assert.equal(SHELF_BACKUP.is_live_door, false);
assert.equal(SHELF_BACKUP.mutual_backup, true);
assert.equal(NEIGHBOR_SHELF_CITE.plane_b.status, "slot");
assert.equal(NEIGHBOR_SHELF_CITE.plane_c.status, "slot");
assert.equal(LIVE_NODE_API.status, "slot");
assert.equal(LIVE_NODE_API.exec, false);
assert.equal(CAP7_AZNET.cite.status, "live");
assert.equal(CAP7_AZNET.aznet_verify.status, "live");
assert.equal(CAP7_AZNET.hosted_endpoints.status, "slot");
assert.equal(CAP7_AZNET.radio_phy, false);
assert.equal(CAP7_AZNET.resolves_to_hub, false);
assert.equal(CAP7_AZNET.factory, "miragegrid");
assert.equal(CAP7_AZNET.shuffle.layout, "live");
assert.equal(CAP7_AZNET.shuffle.public_worker_shuffle, "slot");
assert.equal(CAP7_AZNET.shuffle.hosted_update, "slot");
assert.equal(CAP7_AZNET.shuffle.hardcoded_single_host, false);
assert.equal(AKM_MEMORY_LAW.belief_is_not_truth, true);
assert.equal(AKM_MEMORY_LAW.append_only, true);
assert.equal(AKM_MEMORY_LAW.memory_delete, false);
assert.deepEqual(AKM_MEMORY_LAW.stub_ops.slice(), MEMORY_STUB_OPS.slice());
assert.deepEqual(MEMORY_STUB_OPS.slice(), ["model_update", "rollback", "rewrite", "delete_history", "auto_update"]);
assert.equal(cap7SiteNames().length, 7);
assert.equal(new Set(cap7SiteNames()).size, 7);
assert.ok(cap7SiteNames().every((n) => n.startsWith("cap7-") && !n.includes(".")));
assert.equal(cap7BrowserSubset().length, 3);
assert.equal(cap7AznetRemainder().length, 4);
assert.equal(siteForMirageNode(1).mesh_name, "cap7-loom");
assert.equal(siteForMirageNode(8).mesh_name, "cap7-loom");
assert.notEqual(siteForMirageNode(1).mesh_name, siteForMirageNode(2).mesh_name);
assert.ok(CAP7_SITES.every((s) => s.resolves_to_hub === false && s.name_may_change === true && s.is_live_door === false));
assert.ok((LIVE_OPS.miragegrid || []).includes("shuffle"));
assert.ok(CLIENT_ORDER.length >= 5);
assert.ok(CLIENT_ORDER.some((step) => /ping MirageGrid|shuffle/i.test(step)));
assert.ok(CLIENT_ORDER.some((step) => /shelf backup|lockset tip/i.test(step)));
assert.ok(CLIENT_ORDER.some((step) => /vice versa|cold-shelf death/i.test(step)));
assert.ok(EXEC_PATHS.includes("/mcp"));
assert.ok(EXEC_PATHS.includes("/v1/fraggate/call"));
assert.ok(READ_PATHS.includes("/survival"));
assert.ok(READ_PATHS.includes("/cite.json"));
assert.equal(isExecPath("/mcp"), true);
assert.equal(isExecPath("/cite.json"), false);
assert.equal(isReadPath("/survival"), true);
assert.equal(isSurvivalPath("/doors"), true);
assert.equal(isSurvivalPath("/v1/failover"), true);
assert.equal(isSurvivalPath("/mcp"), false);

assert.equal(judgeBannedHostLive({ banned_host_is_live: true }).reason, REFUSE.NO_LIE);
assert.equal(judgeUnmarkedHydra({ unnamed_failover: true }).reason, REFUSE.NO_HYDRA);
assert.equal(judgeSecondDoor({ secret_backdoor: true }).reason, REFUSE.NO_SECOND_DOOR);
assert.equal(judgeInventedLiveShelf({ plane_b_live: true }).reason, REFUSE.NO_FAN);
assert.equal(judgeShelfOnly({ tip_pack_is_live_door: true }).reason, REFUSE.NO_SHELF_ONLY);
assert.equal(judgeShelfOnly({ archive_is_mcp: true }).reason, REFUSE.NO_SHELF_ONLY);
assert.equal(judgeDoorOnly({ shelves_failed_plan: true }).reason, REFUSE.NO_DOOR_ONLY);
assert.equal(judgeDoorOnly({ drop_shelves: true }).reason, REFUSE.NO_DOOR_ONLY);
assert.equal(judgeOpenNodeProxy({ live_nodes_are_api: true }).reason, REFUSE.NO_OPEN_NODE_PROXY);
assert.equal(judgeOpenNodeProxy({ open_node_proxy: true }).reason, REFUSE.NO_OPEN_NODE_PROXY);
assert.equal(judgeFakeCap7Host({ cap7_hosted_endpoint_live: true }).reason, REFUSE.NO_FAKE_CAP7_HOST);
assert.equal(judgeFakeCap7Host({ fake_icann_az: true }).reason, REFUSE.NO_FAKE_CAP7_HOST);
assert.equal(judgeAznetPayloadHost({ aznet_hosts_payloads: true }).reason, REFUSE.NO_AZNET_PAYLOAD);
assert.equal(judgeLlmReplica({ llm_memory_is_replica: true }).reason, REFUSE.NO_LLM_REPLICA);
assert.equal(applyBanSurvival({}).ok, true);
assert.equal(applyBanSurvival({ lie_to_survive: true, second_door: true }).ok, false);
assert.equal(applyBanSurvival({ tip_pack_is_live_door: true }).ok, false);
assert.equal(applyBanSurvival({ shelves_failed_plan: true }).ok, false);
assert.equal(applyBanSurvival({ unattested_node_api: true }).ok, false);
assert.equal(applyBanSurvival({ cap7_is_mcp: true }).ok, false);
assert.equal(applyBanSurvival({ payload_host_live: true }).ok, false);
assert.equal(applyBanSurvival({ hardcoded_single_host: true }).ok, false);
assert.equal(applyBanSurvival({ public_shuffle_live: true }).ok, false);
assert.equal(applyBanSurvival({ localhost_pool_is_public_update: true }).ok, false);
assert.equal(applyBanSurvival({ posterior_is_truth: true }).ok, false);
assert.equal(applyBanSurvival({ memory_delete: true }).ok, false);
assert.equal(applyBanSurvival({ calling_name: "ChatGPT" }).ok, false);
assert.equal(applyBanSurvival({ chainlock_rewrite: true }).ok, false);
assert.equal(applyBanSurvival({ invent_ban: true }).ok, false);
assert.equal(judgeMemoryAsTruth({ belief_is_truth: true }).reason, REFUSE.NO_MEMORY_AS_TRUTH);
assert.equal(judgeMemoryRewrite({ delete_history: true }).reason, REFUSE.NO_MEMORY_REWRITE);
assert.equal(generateCallingName(0), "Whitestone AI");
assert.equal(generateCallingName(1), "Bills");
assert.equal(generateCallingName(5), "Elroi Runtime");
assert.equal(CALLING_NAME_SEEDS.length, 6);
assert.ok(generateCallingName(20).endsWith("Runtime"));
assert.notEqual(generateCallingName(40, "a"), generateCallingName(41, "a"));
assert.equal(nameAlertText("Whitestone AI"), "*new name alert: Whitestone AI");
assert.equal(slugifyCallingName("Eliab Runtime"), "eliab-runtime");
const idleName = resolveCallingName({});
assert.equal(idleName.rotated, false);
assert.equal(idleName.calling_name, "Aziel Runtime");
assert.equal(idleName.identity, "Aziel Eliab");
const rotated = resolveCallingName({ BAN_SURVIVAL_NAME_ROTATE: "1", BAN_SURVIVAL_NAME_GEN: "0" });
assert.equal(rotated.rotated, true);
assert.equal(rotated.calling_name, "Whitestone AI");
assert.equal(rotated.alert, "*new name alert: Whitestone AI");
assert.equal(rotated.chainlock_rewrite, false);
assert.equal(rotated.akm_rewrite, false);
const ingest = resolveCallingName({}, { implies_ban: true, seed: "t" });
assert.equal(ingest.rotated, true);
const invented = resolveCallingName({}, { invent_ban: true });
assert.equal(invented.rotated, false);
assert.equal(invented.invented_ban, true);

assert.deepEqual(parseBlockedRoutes({ BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp,library-runtime" }), [
  { id: "workers-dev", path: "/mcp" },
  { id: "library-runtime", path: null },
]);
assert.equal(doorMode({}), "LIVE");
assert.equal(doorMode({ BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" }), "DEGRADED");
assert.ok(isRouteBlocked({ BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" }, PRIMARY_WORKER_ORIGIN, "/mcp"));
assert.equal(isRouteBlocked({ BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" }, PRIMARY_WORKER_ORIGIN, "/cite.json"), null);

const quarantined = blockedRouteRefuse({ id: "workers-dev", path: "/mcp" }, PRIMARY_WORKER_ORIGIN, {});
assert.equal(quarantined.status, 503);
assert.equal(quarantined.mode, "DEGRADED");
assert.equal(quarantined.lie_to_survive, false);
assert.equal(quarantined.mutual_backup, true);
assert.equal(quarantined.shelves_are_not_a_live_door, true);
assert.equal(quarantined.failover.spec, BAN_SURVIVAL);

assert.deepEqual(bridgeOrigins({ url: "https://example.test/runtime" }, {}), ["https://example.test/runtime"]);
assert.deepEqual(bridgeOrigins({}, { AZIEL_RUNTIME_FAILOVER: "0" }), [PRIMARY_WORKER_ORIGIN]);
assert.ok(bridgeOrigins({}, {}).includes("https://www.azielcorpuslibrary.net/runtime"));
assert.equal(nextExecOrigin(PRIMARY_WORKER_ORIGIN), "https://www.azielcorpuslibrary.net/runtime");
assert.equal(shouldFailoverStatus(429), true);
assert.equal(shouldFailoverStatus(200), false);

const blockedEnv = { BAN_SURVIVAL_BLOCKED: "workers-dev" };
assert.equal(liveExecOrigins(blockedEnv).includes(PRIMARY_WORKER_ORIGIN), false);
assert.ok(liveExecOrigins(blockedEnv).includes("https://www.azielcorpuslibrary.net/runtime"));
assert.equal(liveDoors(blockedEnv).some((d) => d.id === "workers-dev"), false);
assert.equal(liveDoors({}).length, NAMED_ROUTES.length);

const cite = survivalCiteField(PRIMARY_WORKER_ORIGIN, {});
assert.equal(cite.spec, BAN_SURVIVAL);
assert.equal(cite.doi, null);
assert.equal(cite.second_door, false);
assert.equal(cite.software_tab, false);
assert.equal(cite.mutual_backup, true);
assert.equal(cite.shelves_are_not_a_live_door, true);
assert.equal(cite.shelf_backup.plane_b, "slot");
assert.equal(cite.shelf_backup.is_live_door, false);
assert.equal(cite.live_node_api.status, "slot");
assert.equal(cite.cap7_aznet.cite.status, "live");
assert.equal(cite.cap7_aznet.hosted_endpoints.status, "slot");
assert.equal(cite.cap7_aznet.radio_phy, false);
assert.equal(cite.cap7_aznet.shuffle.layout, "live");
assert.equal(cite.cap7_aznet.shuffle.public_worker_shuffle, "slot");
assert.equal(cite.cap7_aznet.shuffle.hardcoded_single_host, false);
assert.equal(cite.akm_memory.spec, "AKM-TRIAD-1.0");
assert.equal(cite.akm_memory.belief_is_not_truth, true);
assert.equal(cite.akm_memory.memory_delete, false);
assert.ok(cite.akm_memory.stub_ops.includes("delete_history"));
assert.equal(cite.calling_name.rotated, false);
assert.equal(cite.calling_name.calling_name, "Aziel Runtime");
assert.equal(cite.platforms.all_live, true);
assert.ok(cite.platforms.platforms.every((p) => p.live === true && p.native_app_store === false));
assert.deepEqual(cite.platforms.platforms.map((p) => p.id), ["windows", "mac", "linux", "android", "ios"]);
assert.match(cite.survival, /\/survival$/);
assert.ok(cite.live_doors.every((d) => d.status === "live"));
assert.deepEqual(cite.exec_origins, namedExecOrigins());

const citeBlocked = survivalCiteField(PRIMARY_WORKER_ORIGIN, blockedEnv);
assert.equal(citeBlocked.exec_origins.includes(PRIMARY_WORKER_ORIGIN), false);
assert.ok(citeBlocked.live_doors.every((d) => d.id !== "workers-dev"));

const doc = survivalDoc(PRIMARY_WORKER_ORIGIN, { BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" });
assert.equal(doc.mode, "DEGRADED");
assert.equal(doc.fraggate_is_the_door, true);
assert.equal(doc.mutual_backup, true);
assert.equal(doc.shelves_are_not_a_live_door, true);
assert.equal(doc.live_node_api.status, "slot");
assert.equal(doc.cap7_aznet.aznet_verify.status, "live");
assert.equal(doc.cap7_aznet.hosted_endpoints.status, "slot");
assert.equal(doc.routes[0].status, "degraded");
assert.deepEqual(doc.routes[0].blocked_paths, ["/mcp"]);
assert.equal(doc.routes[1].status, "live");
assert.ok(doc.live_doors.some((d) => d.id === "workers-dev"));
assert.ok(doc.live_doors.find((d) => d.id === "workers-dev").exec.every((u) => !u.endsWith("/mcp")));
assert.equal(doc.shelf_backup.is_live_door, false);
assert.equal(doc.shelf_backup.role, "death-by-ban-backup");

const fullyBlocked = survivalDoc(PRIMARY_WORKER_ORIGIN, { BAN_SURVIVAL_BLOCKED: "workers-dev" });
assert.equal(fullyBlocked.routes[0].status, "blocked");
assert.equal(fullyBlocked.exec_origins.includes(PRIMARY_WORKER_ORIGIN), false);

const http = dispatchSurvivalHttp("GET", "/survival", PRIMARY_WORKER_ORIGIN, {});
assert.equal(http.status, 200);
assert.equal(http.body.spec, BAN_SURVIVAL);
assert.equal(http.body.mode, "LIVE");
assert.equal(dispatchSurvivalHttp("POST", "/survival", PRIMARY_WORKER_ORIGIN, {}).status, 405);

const failover = rateLimitFailoverCite({ scope: "mcp", limit: 1, retry_after: 2 }, PRIMARY_WORKER_ORIGIN, {});
assert.equal(failover.spec, BAN_SURVIVAL);
assert.equal(failover.rate_limit.code, "RATE_LIMIT");
assert.equal(failover.exec_origins.includes(PRIMARY_WORKER_ORIGIN), false);
assert.ok(failover.exec_origins.includes("https://www.azielcorpuslibrary.net/runtime"));
assert.equal(failover.mutual_backup, true);
assert.equal(failover.shelves_are_not_a_live_door, true);
assert.equal(failover.live_node_api.status, "slot");
assert.equal(failoverCite(PRIMARY_WORKER_ORIGIN).lie_to_survive, false);

const llms = survivalLlmsBlock(PRIMARY_WORKER_ORIGIN);
assert.match(llms, /BAN-SURVIVAL-1\.0/);
assert.match(llms, new RegExp(BAN_SURVIVAL_TIP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(llms, /Never invent a live door/);
assert.match(llms, /Three layers/);
assert.match(llms, /Cap-7/);
assert.match(llms, /shelf tip-hash/);
assert.match(llms, /shuffle/);
assert.match(llms, /belief_is_not_truth/);
assert.match(survivalSkillMarkdown(PRIMARY_WORKER_ORIGIN), /DEGRADED/);
assert.match(survivalSkillMarkdown(PRIMARY_WORKER_ORIGIN), /SLOT/);
assert.match(BAN_SURVIVAL_RULE, /Never invent a live door/);
assert.match(BAN_SURVIVAL_RULE, /Three layers/);
assert.match(BAN_SURVIVAL_RULE, /Never fake a Cap-7 hosted endpoint/);

const handler = (await import("../src/index.js")).default.fetch;
const origin = PRIMARY_WORKER_ORIGIN;
async function get(path, env = {}) {
  return handler(new Request(origin + path), env);
}
const res = await get("/survival");
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.spec, BAN_SURVIVAL);
assert.equal(body.mode, "LIVE");
assert.equal(body.second_door, false);
assert.equal(body.lie_to_survive, false);
assert.equal(body.mutual_backup, true);
assert.equal(body.shelves_are_not_a_live_door, true);
assert.equal(body.live_node_api.status, "slot");
assert.equal(body.cap7_aznet.cite.status, "live");
assert.equal(body.cap7_aznet.hosted_endpoints.status, "slot");
assert.equal(body.cap7_aznet.shuffle.layout, "live");
assert.equal(body.akm_memory.belief_is_not_truth, true);
assert.equal(body.platforms.all_live, true);
assert.equal(body.platforms.platforms.length, 5);
assert.equal(body.platforms.all_live, true);
assert.ok(body.live_doors.length >= 3);
assert.match(res.headers.get("cache-control") || "", /max-age=120/);

const citeRes = await get("/cite.json");
const citeBody = await citeRes.json();
assert.equal(citeBody.ban_survival.spec, BAN_SURVIVAL);
assert.equal(citeBody.ban_survival.mutual_backup, true);
assert.equal(citeBody.ban_survival.live_node_api.status, "slot");
assert.equal(citeBody.ban_survival.cap7_aznet.hosted_endpoints.status, "slot");
assert.ok(citeBody.ban_survival.live_doors.length >= 3);

const citeBlockedHttp = await get("/cite.json", { BAN_SURVIVAL_BLOCKED: "workers-dev" });
const citeBlockedBody = await citeBlockedHttp.json();
assert.equal(citeBlockedBody.ban_survival.exec_origins.includes(PRIMARY_WORKER_ORIGIN), false);

const manifest = await get("/manifest.webmanifest");
assert.equal(manifest.status, 200);
assert.match(manifest.headers.get("content-type") || "", /manifest\+json/);
const manifestBody = await manifest.json();
assert.equal(manifestBody.name, "Aziel Runtime");
assert.equal(manifestBody.aziel.native_app_store, false);
assert.deepEqual(manifestBody.aziel.platforms, ["windows", "mac", "linux", "android", "ios"]);

const home = await get("/");
assert.match(await home.text(), /rel="manifest"/);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/survival"]);
assert.ok(openapi.paths["/v1/survival"]);

const blocked = await handler(
  new Request(origin + "/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }),
  { BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" },
);
assert.equal(blocked.status, 503);
const blockedBody = await blocked.json();
assert.equal(blockedBody.mode, "DEGRADED");
assert.equal(blockedBody.mutual_backup, true);
assert.equal(blockedBody.shelves_are_not_a_live_door, true);
assert.equal(blockedBody.failover.spec, BAN_SURVIVAL);
assert.ok(blockedBody.failover.exec_origins.includes("https://www.azielcorpuslibrary.net/runtime"));

const stillCite = await get("/cite.json", { BAN_SURVIVAL_BLOCKED: "workers-dev:/mcp" });
assert.equal(stillCite.status, 200);

const landed = await landCap7Shuffle({});
assert.equal(landed.ok, true);
assert.equal(landed.hardcoded_single_host, false);
assert.equal(landed.public_worker_shuffle, "slot");
assert.equal(landed.update.status, "slot");
assert.equal(landed.update.hosted_url, null);
assert.equal(landed.update.is_live_door, false);
assert.ok(cap7SiteNames().includes(landed.land.mesh_name));
assert.equal(landed.update.that_round_endpoint, landed.land.mesh_name);
assert.doesNotMatch(JSON.stringify(landed.update), /127\.0\.0\.1/);
const hard = await landCap7Shuffle({ hardcoded_single_host: true });
assert.equal(hard.ok, false);
assert.equal(hard.code, REFUSE.NO_HARDCODE_CAP7_HOST);
const fakeLive = await landCap7Shuffle({ public_shuffle_live: true });
assert.equal(fakeLive.ok, false);
assert.equal(fakeLive.code, REFUSE.NO_FAKE_SHUFFLE_LIVE);
const localUp = await landCap7Shuffle({ update_url: "http://127.0.0.1:19001" });
assert.equal(localUp.ok, false);
assert.equal(localUp.code, REFUSE.NO_LOCALHOST_CAP7_UPDATE);

const rotatedEnv = { BAN_SURVIVAL_NAME_ROTATE: "1", BAN_SURVIVAL_NAME_GEN: "0" };
const rotatedSurvival = await get("/survival", rotatedEnv);
const rotatedBody = await rotatedSurvival.json();
assert.equal(rotatedBody.calling_name.rotated, true);
assert.equal(rotatedBody.calling_name.calling_name, "Whitestone AI");
assert.equal(rotatedBody.calling_name.alert, "*new name alert: Whitestone AI");
assert.equal(rotatedBody.calling_name.identity, "Aziel Eliab");
assert.equal(rotatedBody.akm_memory.belief_is_not_truth, true);

const rotatedCite = await (await get("/cite.json", rotatedEnv)).json();
assert.equal(rotatedCite.product, "Whitestone AI");
assert.equal(rotatedCite.slug, "whitestone-ai");
assert.equal(rotatedCite.calling_name.alert, "*new name alert: Whitestone AI");
assert.equal(rotatedCite.author, "Aziel Eliab");

const rotatedOpen = await (await get("/openapi.json", rotatedEnv)).json();
assert.equal(rotatedOpen.info.title, "Whitestone AI");
assert.match(rotatedOpen.info.description, /^Aziel Runtime is not merely/);

const rotatedMcp = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  }),
  rotatedEnv,
);
const rotatedMcpBody = await rotatedMcp.json();
assert.equal(rotatedMcpBody.result.serverInfo.name, "whitestone-ai");
assert.equal(rotatedMcpBody.result.serverInfo.title, "Whitestone AI");

const shuffleCall = await handler(
  new Request(origin + "/v1/fraggate/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "miragegrid", op: "shuffle", payload: {} }),
  }),
  {},
);
assert.equal(shuffleCall.status, 200);
const shuffleBody = await shuffleCall.json();
assert.equal(shuffleBody.ok, true);
assert.equal(shuffleBody.result.ok, true);
assert.equal(shuffleBody.result.update.status, "slot");
assert.ok(cap7SiteNames().includes(shuffleBody.result.land.mesh_name));

console.log("verify-ban-survival: ok");

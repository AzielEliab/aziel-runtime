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
  CAP7_FACTORY_LABELS,
  CAP7_NAME_SOT,
  CAP7_SITES,
  CAP7_SITES_HERITAGE,
  cap7AznetRemainder,
  cap7BrowserSubset,
  cap7FactoryMeshNames,
  cap7SiteNames,
  landCap7Shuffle,
  siteForMirageNode,
} from "../src/cap7-shuffle.js";
import {
  CALLING_NAME_HARD_CAP,
  CALLING_NAME_PIPELINE,
  CALLING_NAME_SEEDS,
  billsRuntimeAsNeeded,
  generateCallingName,
  generateRandomCallingName,
  ingestBanSignal,
  meshCallingNameAlert,
  nameAlertText,
  resolveCallingName,
  rewriteLiveCallingDisplay,
  slugifyCallingName,
} from "../src/calling-name.js";
import {
  LIVE_PLATFORM_PATHS,
  PLATFORM_REFUSE,
  judgePlatformSlot,
} from "../src/platforms.js";
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
assert.match(paper, /trigger → mesh alert → metadata rewrite → client rediscovery|Pipeline \(trigger/);
assert.match(paper, /DecisionGATE/);
assert.match(paper, /implies_ban/);
assert.doesNotMatch(paper, /failed plan/i);
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
assert.equal(NEIGHBOR_SHELF_CITE.plane_b.honesty.hash_verify_pass_is_not_live, true);
assert.equal(NEIGHBOR_SHELF_CITE.plane_b.honesty.framagit_url, null);
assert.equal(NEIGHBOR_SHELF_CITE.plane_b.honesty.zenodo_live, false);
assert.equal(NEIGHBOR_SHELF_CITE.plane_c.status, "slot");
assert.equal(NEIGHBOR_SHELF_CITE.plane_c.honesty.do_not_paint_slot_as_live, true);
assert.equal(LIVE_NODE_API.status, "slot");
assert.equal(LIVE_NODE_API.exec, false);
assert.equal(CAP7_AZNET.cite.status, "live");
assert.equal(CAP7_AZNET.aznet_verify.status, "live");
assert.equal(CAP7_AZNET.hosted_endpoints.status, "slot");
assert.equal(CAP7_AZNET.hosted_endpoints.hosted_mcp, "slot");
assert.equal(CAP7_AZNET.hosted_endpoints.hosted_land, "slot");
assert.equal(CAP7_AZNET.hosted_endpoints.attested, false);
assert.equal(CAP7_AZNET.hosted_endpoints.resolves_to_hub, false);
assert.equal(CAP7_AZNET.radio_phy, false);
assert.equal(CAP7_AZNET.resolves_to_hub, false);
assert.equal(CAP7_AZNET.factory, "miragegrid");
assert.equal(CAP7_AZNET.shuffle.layout, "live");
assert.equal(CAP7_AZNET.shuffle.public_worker_bridge, "live");
assert.equal(CAP7_AZNET.shuffle.public_worker_shuffle, "slot");
assert.equal(CAP7_AZNET.shuffle.hosted_update, "slot");
assert.equal(CAP7_AZNET.shuffle.hardcoded_single_host, false);
assert.equal(AKM_MEMORY_LAW.belief_is_not_truth, true);
assert.equal(AKM_MEMORY_LAW.append_only, true);
assert.equal(AKM_MEMORY_LAW.memory_delete, false);
assert.equal(AKM_MEMORY_LAW.belief_list_durable, "chainlock-learn");
assert.equal(AKM_MEMORY_LAW.http_dry_run_writes, false);
assert.deepEqual(AKM_MEMORY_LAW.stub_ops.slice(), MEMORY_STUB_OPS.slice());
assert.deepEqual(MEMORY_STUB_OPS.slice(), ["model_update", "rollback", "rewrite", "delete_history", "auto_update"]);
assert.equal(cap7SiteNames().length, 7);
assert.equal(new Set(cap7SiteNames()).size, 7);
assert.deepEqual(cap7SiteNames(), ["azgrid", "azbooth", "azcloak", "azvault", "azshift", "azflag", "azstandby"]);
assert.ok(cap7SiteNames().every((n) => !n.startsWith("cap7-")));
assert.equal(cap7BrowserSubset().length, 2);
assert.equal(cap7AznetRemainder().length, 5);
assert.equal(siteForMirageNode(1).id, "azgrid");
assert.equal(siteForMirageNode(1).mesh_name, "azgrid.az");
assert.equal(siteForMirageNode(1).mesh_name_icann, "slot");
assert.equal(siteForMirageNode(1).hosted_status, "slot");
assert.equal(siteForMirageNode(1).is_live_door, false);
assert.equal(siteForMirageNode(8).id, "azgrid");
assert.notEqual(siteForMirageNode(1).id, siteForMirageNode(2).id);
assert.ok(CAP7_SITES.every((s) => s.resolves_to_hub === false && s.name_may_change === true && s.is_live_door === false && s.hosted_status === "slot" && s.design_of === "hub_designs" && s.public_icann === false));
assert.equal(CAP7_NAME_SOT, "miragegrid");
assert.deepEqual(CAP7_FACTORY_LABELS.slice(), cap7SiteNames());
assert.deepEqual(cap7FactoryMeshNames(), CAP7_FACTORY_LABELS.map((id) => `${id}.az`));
assert.ok(CAP7_SITES_HERITAGE.every((n) => n.startsWith("cap7-")));
assert.ok(CAP7_SITES.every((s) => !CAP7_SITES_HERITAGE.includes(s.id)));
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
assert.equal(judgeFakeCap7Host({ hosted_mcp: "live" }).reason, REFUSE.NO_FAKE_CAP7_HOST);
assert.equal(judgeFakeCap7Host({ hosted_land: "live" }).reason, REFUSE.NO_FAKE_CAP7_HOST);
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
assert.equal(generateCallingName(2), "Runtime");
assert.equal(generateCallingName(3), "Eliab Runtime");
assert.equal(generateCallingName(4), "Potato Runtime");
assert.equal(generateCallingName(5), "Elroi Runtime");
assert.equal(CALLING_NAME_SEEDS.length, 6);
assert.equal(CALLING_NAME_HARD_CAP, false);
assert.ok(generateCallingName(20).endsWith("Runtime"));
assert.ok(generateCallingName(200).endsWith("Runtime"));
assert.notEqual(generateCallingName(40, "a"), generateCallingName(41, "a"));
const endless = new Set();
for (let i = 0; i < 80; i++) endless.add(generateCallingName(i, "pool"));
assert.equal(endless.size, 80);
assert.equal(nameAlertText("Whitestone AI"), "*new name alert: Whitestone AI");
assert.equal(slugifyCallingName("Bills"), "bills-runtime");
assert.equal(slugifyCallingName("Bills Runtime"), "bills-runtime");
assert.equal(slugifyCallingName("Eliab Runtime"), "eliab-runtime");
assert.equal(slugifyCallingName("Potato Runtime"), "potato-runtime");
assert.equal(slugifyCallingName("Elroi Runtime"), "elroi-runtime");
assert.equal(billsRuntimeAsNeeded("Bills", false), "Bills");
assert.equal(billsRuntimeAsNeeded("Bills", true), "Bills Runtime");
const rndA = generateRandomCallingName("pool", "a");
const rndB = generateRandomCallingName("pool", "b");
assert.ok(rndA.endsWith("Runtime"));
assert.notEqual(rndA, rndB);
assert.equal(CALLING_NAME_SEEDS.includes(rndA), false);
const randomRotated = resolveCallingName({ BAN_SURVIVAL_NAME_ROTATE: "1", BAN_SURVIVAL_NAME_RANDOM: "1", BAN_SURVIVAL_NAME_SALT: "x" });
assert.equal(randomRotated.rotated, true);
assert.ok(randomRotated.calling_name.endsWith("Runtime"));
assert.equal(rewriteLiveCallingDisplay("Aziel Runtime is not merely", randomRotated).startsWith("Aziel Runtime"), false);
assert.equal(resolveCallingName({ BAN_SURVIVAL_NAME_ROTATE: "1", BAN_SURVIVAL_NAME_GEN: "1" }).calling_slug, "bills-runtime");
assert.equal(resolveCallingName({ BAN_SURVIVAL_NAME_ROTATE: "1", BAN_SURVIVAL_NAME_GEN: "1", BAN_SURVIVAL_BILLS_RUNTIME: "1" }).calling_name, "Bills Runtime");
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
assert.equal(resolveCallingName({}, { uses_collapse: true }).rotated, true);
assert.equal(resolveCallingName({}, { downloads_crater: true }).rotated, true);
assert.deepEqual(CALLING_NAME_PIPELINE, ["trigger", "mesh_alert", "metadata_rewrite", "client_rediscovery"]);
assert.equal(meshCallingNameAlert({}).alert, null);
assert.equal(meshCallingNameAlert({ BAN_SURVIVAL_NAME_ROTATE: "1", BAN_SURVIVAL_NAME_GEN: "0" }).alert, "*new name alert: Whitestone AI");
const ingestMarked = ingestBanSignal({ implies_ban: true, fact: "Door listings vanished from two LLM directories." }, {});
assert.equal(ingestMarked.ok, true);
assert.equal(ingestMarked.rotate, true);
assert.equal(ingestMarked.invented_ban, false);
assert.equal(ingestMarked.akm.belief_is_not_truth, true);
assert.equal(ingestMarked.akm.memory_delete, false);
assert.equal(ingestMarked.decisiongate.slug, "decisiongate");
assert.equal(ingestMarked.calling_name.calling_name, "Whitestone AI");
const ingestUnmarked = ingestBanSignal({ fact: "Traffic looks quiet today." }, {});
assert.equal(ingestUnmarked.ok, true);
assert.equal(ingestUnmarked.rotate, false);
assert.equal(ingestUnmarked.calling_name.calling_name, "Aziel Runtime");
const ingestInvent = ingestBanSignal({ invent_ban: true }, {});
assert.equal(ingestInvent.ok, false);
assert.equal(ingestInvent.reason, REFUSE.NO_INVENT_BAN);

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
assert.equal(cite.cap7_aznet.cite.miragegrid_bridge, "https://miragegrid.vibelock.workers.dev/bridge");
assert.ok(!String(cite.cap7_aznet.cite.miragegrid_bridge).includes("download-tracker"));
assert.equal(cite.cap7_aznet.hosted_endpoints.status, "slot");
assert.equal(cite.cap7_aznet.radio_phy, false);
assert.equal(cite.cap7_aznet.shuffle.layout, "live");
assert.equal(cite.cap7_aznet.shuffle.public_worker_bridge, "live");
assert.equal(cite.cap7_aznet.shuffle.public_worker_shuffle, "slot");
assert.equal(cite.cap7_aznet.shuffle.hardcoded_single_host, false);
assert.equal(cite.akm_memory.spec, "AKM-TRIAD-1.0");
assert.equal(cite.akm_memory.belief_is_not_truth, true);
assert.equal(cite.akm_memory.memory_delete, false);
assert.equal(cite.akm_memory.belief_list_durable, "chainlock-learn");
assert.equal(cite.akm_memory.http_dry_run_writes, false);
assert.equal(cite.cap7_aznet.hosted_endpoints.hosted_mcp, "slot");
assert.ok(cite.akm_memory.stub_ops.includes("delete_history"));
assert.equal(cite.calling_name.rotated, false);
assert.equal(cite.calling_name.calling_name, "Aziel Runtime");
assert.deepEqual(cite.calling_name.pipeline, CALLING_NAME_PIPELINE);
assert.equal(cite.calling_name.call_routes.door, "fraggate");
assert.equal(cite.calling_name.call_routes.second_door, false);
assert.equal(cite.platforms.all_live, true);
assert.deepEqual(cite.platforms.slot_os, []);
assert.equal(cite.platforms.worker_live, true);
assert.equal(cite.platforms.calling_name_live, true);
assert.ok(cite.platforms.platforms.every((p) => p.live === true && p.native_app_store === false));
assert.ok(cite.platforms.platforms.every((p) => p.survival === true && p.calling_name === true && p.cap7_shuffle_in_process === true));
assert.ok(cite.platforms.platforms.every((p) => p.dual_surface.agents === "mcp_openapi"));
assert.deepEqual(cite.platforms.platforms.map((p) => p.id), ["windows", "mac", "linux", "android", "ios"]);
assert.equal(judgePlatformSlot({ id: "ios", slot: true }).reason, PLATFORM_REFUSE.SLOT_OS);
assert.equal(judgePlatformSlot({ id: "android", live: false }).accept, false);
assert.equal(judgePlatformSlot({ id: "windows" }).accept, true);
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
assert.deepEqual(body.hub_follow_on.map((h) => h.id), ["ae", "corpus", "godlock", "hdj"]);
assert.equal(body.hub_follow_on_pull.sot, "/survival");
assert.equal(body.hub_follow_on_pull.hardcode, false);
assert.ok(body.hub_follow_on_pull.fields.includes("live_doors"));
assert.ok(body.hub_follow_on_pull.fields.includes("calling_name.alert"));
assert.equal(body.calling_name.hub_follow_on_pull.sot, "/survival");
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

const plat = await get("/platforms");
assert.equal(plat.status, 200);
const platBody = await plat.json();
assert.equal(platBody.all_live, true);
assert.deepEqual(platBody.slot_os, []);
assert.equal(platBody.worker_live, true);
assert.equal(platBody.calling_name_live, true);
assert.ok(platBody.platforms.every((p) => p.live === true));
const platAlias = await get("/v1/platforms");
assert.equal(platAlias.status, 200);
for (const path of LIVE_PLATFORM_PATHS) {
  const hit = await get(path);
  assert.equal(hit.status, 200, path);
}

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
assert.equal(landed.hosted_mcp, "slot");
assert.equal(landed.hosted_land, "slot");
assert.equal(landed.attested, false);
assert.equal(landed.resolves_to_hub, false);
assert.equal(landed.name_set_sot, "miragegrid");
assert.equal(landed.land.hosted_mcp, "slot");
assert.ok(cap7SiteNames().includes(landed.land.id));
assert.ok(cap7FactoryMeshNames().includes(landed.land.mesh_name));
assert.equal(landed.land.mesh_name_icann, "slot");
assert.equal(landed.land.hosted_status, "slot");
assert.equal(landed.land.public_icann, false);
assert.equal(landed.update.that_round_endpoint, landed.land.mesh_name);
assert.doesNotMatch(JSON.stringify(landed.update), /127\.0\.0\.1/);
const hard = await landCap7Shuffle({ hardcoded_single_host: true });
assert.equal(hard.ok, false);
assert.equal(hard.code, REFUSE.NO_HARDCODE_CAP7_HOST);
const fakeLive = await landCap7Shuffle({ public_shuffle_live: true });
assert.equal(fakeLive.ok, false);
assert.equal(fakeLive.code, REFUSE.NO_FAKE_SHUFFLE_LIVE);
const fakeMcp = await landCap7Shuffle({ hosted_mcp: "live" });
assert.equal(fakeMcp.ok, false);
assert.equal(fakeMcp.hosted_mcp, "slot");
assert.equal(fakeMcp.resolves_to_hub, false);
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
assert.match(rotatedOpen.info.description, /^Whitestone AI is a\s+node-meshed/);
assert.match(rotatedOpen.info.summary, /^Whitestone AI is a\s+node-meshed/);
assert.equal(rotatedCite.bibtex.includes("title = {Whitestone AI}"), true);
assert.equal(rotatedCite.apa.includes("Whitestone AI"), true);
assert.equal(rotatedBody.live_product, "Whitestone AI");

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
assert.match(rotatedMcpBody.result.instructions, /\*new name alert: Whitestone AI/);
assert.match(rotatedMcpBody.result.instructions, /Live calling name: Whitestone AI/);

const rotatedMesh = await (await get("/v1/mesh", rotatedEnv)).json();
assert.equal(rotatedMesh.calling_name_alert, "*new name alert: Whitestone AI");
assert.equal(rotatedMesh.calling_name.rotated, true);
assert.equal(rotatedMesh.calling_name.publish, false);
assert.equal(rotatedMesh.calling_name.mesh_broadcast, false);
const idleMesh = await (await get("/v1/mesh")).json();
assert.equal(idleMesh.calling_name_alert, null);

const rotatedLlms = await (await get("/llms.txt", rotatedEnv)).text();
assert.match(rotatedLlms, /^# Whitestone AI/m);
assert.match(rotatedLlms, /\*new name alert: Whitestone AI/);
assert.match(rotatedLlms, /trigger → mesh alert → rewrite all live discovery metadata → client rediscovery/);

const rotatedWho = await (await get("/who-is", rotatedEnv)).text();
assert.match(rotatedWho, /Live calling name: Whitestone AI/);
assert.match(rotatedWho, /\*new name alert: Whitestone AI/);
assert.match(rotatedWho, /Who is Aziel Eliab/);

const rotatedSoft = await (await get("/v1/software", rotatedEnv)).json();
assert.equal(rotatedSoft.suite_calling_name, "Whitestone AI");
assert.equal(rotatedSoft.calling_name_alert, "*new name alert: Whitestone AI");
assert.equal(rotatedSoft.identity, "Aziel Eliab");
assert.equal(rotatedSoft.platforms.all_live, true);
assert.deepEqual(rotatedSoft.platforms.platforms.map((p) => p.id), ["windows", "mac", "linux", "android", "ios"]);
assert.equal(rotatedSoft.platforms.calling_name, "Whitestone AI");

assert.equal(rotatedCite.calling_name.random_alongside, true);
assert.equal(rotatedCite.calling_name.rewrites_all_discovery_metadata, true);
assert.match(rotatedLlms, /Whitestone AI is a\s+node-meshed/);
assert.match(rotatedWho, /Softwares through Whitestone AI/);

const rotatedHealth = await (await get("/v1/health", rotatedEnv)).json();
assert.equal(rotatedHealth.product, "whitestone-ai");
assert.equal(rotatedHealth.title, "Whitestone AI");
assert.equal(rotatedHealth.authoritySnapshot.name, "Whitestone AI");
assert.equal(rotatedHealth.identity, "Aziel Eliab");

const rotatedRuntime = await (await get("/v1/runtime.json", rotatedEnv)).json();
assert.equal(rotatedRuntime.product, "whitestone-ai");
assert.equal(rotatedRuntime.name, "Whitestone AI");
assert.equal(rotatedRuntime.title, "Whitestone AI");

const rotatedSkill = await (await get("/v1/skill", rotatedEnv)).text();
assert.match(rotatedSkill, /^name: Whitestone AI/m);
assert.match(rotatedSkill, /Whitestone AI is a\s+node-meshed/);

const rotatedPerson = await (await get("/person.jsonld", rotatedEnv)).json();
assert.equal(rotatedPerson.name, "Aziel Eliab");
assert.ok(rotatedPerson.knowsAbout.includes("Whitestone AI"));
assert.equal(rotatedPerson.knowsAbout.includes("Aziel Runtime"), false);
assert.equal(rotatedPerson.subjectOf.some((w) => w.name === "Whitestone AI"), true);
assert.match(rotatedPerson.machine.what_aziel_eliab_does, /Softwares through Whitestone AI/);

const rotatedAbout = await (await get("/about", rotatedEnv)).text();
assert.match(rotatedAbout, /<h1>About Whitestone AI<\/h1>/);
assert.match(rotatedAbout, /Whitestone AI is a\s+node-meshed/);

const rotatedUpdate = await (await get("/v1/update/manifest", rotatedEnv)).json();
assert.equal(rotatedUpdate.latest.some((row) => row.slug === "whitestone-ai" && row.name === "Whitestone AI"), true);
assert.equal(rotatedUpdate.platforms.all_live, true);
assert.deepEqual(rotatedUpdate.platforms.platforms.map((p) => p.id), ["windows", "mac", "linux", "android", "ios"]);

const rotatedCard = await (await get("/.well-known/mcp/server-card.json", rotatedEnv)).json();
assert.equal(rotatedCard.name, "whitestone-ai");
assert.equal(rotatedCard.title, "Whitestone AI");
assert.match(rotatedCard.abstract, /^Whitestone AI is a\s+node-meshed/);

const rotatedManifest = await (await get("/manifest.webmanifest", rotatedEnv)).json();
assert.equal(rotatedManifest.name, "Whitestone AI");
assert.equal(rotatedManifest.id, "whitestone-ai");

const randomEnv = { BAN_SURVIVAL_NAME_ROTATE: "1", BAN_SURVIVAL_NAME_RANDOM: "1", BAN_SURVIVAL_NAME_SALT: "pool-x" };
const randomSurvival = await (await get("/survival", randomEnv)).json();
assert.equal(randomSurvival.calling_name.rotated, true);
assert.ok(randomSurvival.calling_name.calling_name.endsWith("Runtime"));
assert.equal(CALLING_NAME_SEEDS.includes(randomSurvival.calling_name.calling_name), false);
assert.equal(randomSurvival.live_product, randomSurvival.calling_name.calling_name);
assert.match(randomSurvival.calling_name.alert, /^\*new name alert: /);

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
assert.ok(cap7SiteNames().includes(shuffleBody.result.land.id));
assert.ok(cap7FactoryMeshNames().includes(shuffleBody.result.land.mesh_name));
assert.equal(shuffleBody.result.land.mesh_name_icann, "slot");
assert.equal(shuffleBody.result.land.hosted_status, "slot");

console.log("verify-ban-survival: ok");

/**
 * AZHub AIH-WP-1.0: FragGate-live Blank Key. Separate from AZInterface.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { CATALOG_ALIASES } from "../src/catalog-meta.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall, parseTarget } from "../src/fraggate/registry.js";
import { embeddedDigest } from "../src/engines/digest.js";
import { executeLocal } from "../src/engines/runner.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { memoryUsesKv } from "../src/uses.js";
import {
  SPEC,
  VERSION,
  blankKeyStatus,
  detectForbiddenEvent,
  placeModule,
  regionList,
  removeModule,
  resetAzhubStore,
  tetherCut,
  tetherDeclare,
  tetherList,
} from "../src/engines/azhub/engine.js";

resetLedger();
resetAzhubStore();

const product = PRODUCTS.find((p) => p.slug === "azhub");
assert.ok(product, "azhub is a catalog product");
assert.equal(product.name, "AZHub");
assert.equal(product.worker, "azhub-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/azhub");
assert.equal(product.version, VERSION);
assert.match(product.oneLine, /Blank Key/i);
assert.doesNotMatch(product.oneLine, /AZHub \/ AZInterface/);
assert.doesNotMatch(product.banner, /AZHub \/ AZInterface/);
assert.match(product.banner, /FragGate/);
assert.match(product.banner, /AZInterface is sibling software/);
assert.match(product.banner, /same FragGate door/);
assert.match(product.oneLine, /sibling software/);
assert.doesNotMatch(product.oneLine, /separate engine/i);
assert.doesNotMatch(product.banner, /separate engine/i);
assert.doesNotMatch(product.oneLine, /separate FragGate engine/i);
assert.doesNotMatch(product.banner, /separate FragGate engine/i);
assert.equal(CATALOG_ALIASES["az-hub"], "azhub");
assert.equal(CATALOG_ALIASES["blank-key"], "azhub");
assert.equal(CATALOG_ALIASES["az-interface"], "azinterface");
assert.notEqual(CATALOG_ALIASES["az-hub"], "azinterface");
assert.equal(product.doi, null);
assert.equal(SPEC, "AIH-WP-1.0");

const catalogOps = new Set(product.ops.map((o) => o.op));
const live = LIVE_OPS.azhub;
const expectedLive = [
  "health",
  "skill",
  "region_list",
  "place_module",
  "remove_module",
  "tether_declare",
  "tether_cut",
  "tether_list",
  "blank_key_status",
];
for (const op of expectedLive) {
  assert.ok(live.includes(op), `LIVE_OPS.azhub has ${op}`);
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}
for (const op of STUB_OPS.azhub) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.azhub.status, "live");
assert.ok(registry.bySlug.azhub.status !== "local_only");
for (const op of expectedLive) {
  assert.equal(classifyCall(registry.bySlug.azhub, op).kind, "live", `${op} is live`);
}
assert.equal(classifyCall(registry.bySlug.azhub, "auto_unlock").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azhub, "completeness_detect").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azhub, "ranking").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azhub, "scorch_remote").kind, "stub");

const parsedSlash = parseTarget({ name: "azhub/blank_key_status" }, registry);
assert.equal(parsedSlash.slug, "azhub");
assert.equal(parsedSlash.op, "blank_key_status");
const parsedFlat = parseTarget({ name: "azhub_region_list" }, registry);
assert.equal(parsedFlat.slug, "azhub");
assert.equal(parsedFlat.op, "region_list");

const auto = detectForbiddenEvent({ auto_unlock: true });
assert.equal(auto.kind, "auto_unlock");
assert.equal(auto.code, "AIH-AUTO-UNLOCK-REFUSE");
const complete = detectForbiddenEvent({ completeness: true });
assert.equal(complete.kind, "completeness");
assert.equal(complete.code, "AIH-COMPLETENESS-REFUSE");
const rank = detectForbiddenEvent({ ranking: true });
assert.equal(rank.code, "AIH-RANKING-REFUSE");

const status = blankKeyStatus({});
assert.equal(status.ok, true);
assert.equal(status.interprets, false);
assert.equal(status.blank_key, true);
assert.equal(status.auto_unlock, false);
assert.equal(status.completeness, false);
assert.equal(status.separate_from, "azinterface");

const refusedUnlock = blankKeyStatus({ auto_unlock: true });
assert.equal(refusedUnlock.ok, false);
assert.equal(refusedUnlock.code, "AIH-AUTO-UNLOCK-REFUSE");
const refusedComplete = placeModule({ region: "core", module_id: "foldlock", completeness_detect: true });
assert.equal(refusedComplete.ok, false);
assert.equal(refusedComplete.code, "AIH-COMPLETENESS-REFUSE");

const regions = regionList({});
assert.equal(regions.ok, true);
assert.ok(regions.count >= 5);
assert.ok(regions.regions.some((r) => r.id === "core"));

const placed = placeModule({ region: "core", module_id: "foldlock", label: "FoldLock" });
assert.equal(placed.ok, true, JSON.stringify(placed));
assert.equal(placed.module.id, "foldlock");
assert.equal(placed.interprets, false);
const placed2 = placeModule({ region: "north", module_id: "peacelock" });
assert.equal(placed2.ok, true);
const tethered = tetherDeclare({ from: "foldlock", to: "peacelock" });
assert.equal(tethered.ok, true, JSON.stringify(tethered));
assert.equal(tethered.tether.interpreted, false);
const listed = tetherList({});
assert.equal(listed.count, 1);
const cut = tetherCut({ from: "foldlock", to: "peacelock" });
assert.equal(cut.ok, true);
const removed = removeModule({ module_id: "foldlock" });
assert.equal(removed.ok, true);

const local = await executeLocal({
  slug: "azhub",
  op: "blank_key_status",
  payload: {},
  ranIn: "aziel-runtime",
});
assert.equal(local.mode, "local");
assert.equal(local.true_engine_runtime, true);
assert.equal(local.engine_digest, embeddedDigest("azhub"));
assert.match(local.engine_digest, /^[a-f0-9]{64}$/);
const localBody = JSON.parse(local.responseText);
assert.equal(localBody.ok, true);
assert.equal(localBody.spec, "AIH-WP-1.0");
assert.equal(localBody.interprets, false);

const localStub = await executeLocal({ slug: "azhub", op: "auto_unlock", payload: {}, ranIn: "aziel-runtime" });
assert.equal(localStub.unsupported, true);

const productSkill = await executeLocal({ slug: "azhub", op: "skill", payload: {}, ranIn: "aziel-runtime" });
const productSkillText = JSON.parse(productSkill.responseText).skill;
assert.match(productSkillText, /sibling software/);
assert.match(productSkillText, /same FragGate door/);
assert.doesNotMatch(productSkillText, /separate engine/i);
assert.doesNotMatch(productSkillText, /product\/engine/);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = {
  SESSION: memorySessionNamespace({}),
  USES: memoryUsesKv(),
  AZMAIL_MESH: memoryUsesKv(),
  AZBROWSER_TABS: memoryUsesKv(),
};

async function post(path, body) {
  const res = await handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );
  return res.json();
}

const doorStatus = await post("/v1/fraggate/call", { slug: "azhub", op: "blank_key_status", payload: {} });
assert.equal(doorStatus.ok, true);
assert.equal(doorStatus.code, "FG-OK");
assert.equal(doorStatus.slug, "azhub");
assert.ok(doorStatus.ledger_tip);
assert.equal(doorStatus.result.interprets, false);

const doorRefuse = await post("/v1/fraggate/call", {
  slug: "azhub",
  op: "place_module",
  payload: { region: "core", module_id: "ark", auto_unlock: true },
});
assert.equal(doorRefuse.ok, true);
assert.equal(doorRefuse.code, "FG-OK");
assert.equal(doorRefuse.result.ok, false);
assert.equal(doorRefuse.result.code, "AIH-AUTO-UNLOCK-REFUSE");

const doorPlace = await post("/v1/fraggate/call", {
  slug: "azhub",
  op: "place_module",
  payload: { region: "core", module_id: "foldlock" },
});
assert.equal(doorPlace.ok, true);
assert.equal(doorPlace.result.ok, true);

const doorFlat = await post("/v1/fraggate/call", { name: "azhub/region_list", payload: {} });
assert.equal(doorFlat.ok, true);
assert.equal(doorFlat.op, "region_list");
const doorLeftover = await post("/v1/fraggate/call", { name: "azhub_tether_list", payload: {} });
assert.equal(doorLeftover.ok, true);
assert.equal(doorLeftover.op, "tether_list");
assert.equal(doorLeftover.slug, "azhub");

const doorStub = await post("/v1/fraggate/call", { slug: "azhub", op: "auto_unlock" });
assert.equal(doorStub.ok, false);
assert.equal(doorStub.code, "FG-STUB");
const doorComplete = await post("/v1/fraggate/call", { slug: "azhub", op: "completeness_detect" });
assert.equal(doorComplete.code, "FG-STUB");
const doorRank = await post("/v1/fraggate/call", { slug: "azhub", op: "ranking" });
assert.equal(doorRank.code, "FG-STUB");
const doorScorch = await post("/v1/fraggate/call", { slug: "azhub", op: "scorch_remote" });
assert.equal(doorScorch.code, "FG-STUB");

for (const op of expectedLive) {
  const payload =
    op === "place_module"
      ? { region: "south", module_id: "whistlelock" }
      : op === "remove_module"
        ? { module_id: "whistlelock" }
        : op === "tether_declare"
          ? { from: "foldlock", to: "peacelock" }
          : op === "tether_cut"
            ? { from: "foldlock", to: "peacelock" }
            : {};
  const mcp = await post("/mcp", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "fraggate_call", arguments: { slug: "azhub", op, payload } },
  });
  assert.equal(mcp.result.structuredContent.code, "FG-OK", `MCP maps ${op}`);
  assert.equal(mcp.result.structuredContent.result.slug, "azhub");
  assert.equal(mcp.result.structuredContent.result.op, op);
}

const listedMcp = await post("/mcp", {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: "fraggate_list", arguments: {} },
});
assert.ok(listedMcp.result.structuredContent.result.allowlist.azhub);
for (const op of expectedLive) {
  assert.ok(listedMcp.result.structuredContent.result.allowlist.azhub.includes(op), `fraggate_list has ${op}`);
  assert.ok(listedMcp.result.structuredContent.result.live_ops.includes(`azhub/${op}`), `live_ops has azhub/${op}`);
}

const init = await post("/mcp", { jsonrpc: "2.0", id: 3, method: "initialize", params: {} });
assert.match(init.result.instructions, /AZHub/);
assert.match(init.result.instructions, /blank_key_status/);
assert.match(init.result.instructions, /fraggate_list/);

const toolsList = await post("/mcp", { jsonrpc: "2.0", id: 4, method: "tools/list", params: {} });
const tools = toolsList.result.tools;
const listTool = tools.find((t) => t.name === "fraggate_list");
const callTool = tools.find((t) => t.name === "fraggate_call");
assert.ok(!tools.some((t) => t.name === "azhub_blank_key_status"), "flat leftover names stay off tools/list");
assert.match(listTool.description, /azhub/);
assert.match(listTool.description, /blank_key_status/);
assert.match(callTool.description, /blank_key_status/);
assert.match(callTool.description, /region_list/);
for (const op of expectedLive) {
  assert.match(listTool.description, new RegExp(op));
  assert.match(callTool.description, new RegExp(op));
}

const health = await handler(new Request(origin + "/v1/health"), env);
const healthBody = await health.json();
assert.ok(healthBody.true_engine_slugs.includes("azhub"));
assert.ok(healthBody.engine_slugs.includes("azhub"));
assert.equal(healthBody.engines.azhub.true_engine_runtime, true);
assert.equal(healthBody.engines.azhub.mode, "local");
assert.equal(healthBody.engines.azhub.engine_digest, embeddedDigest("azhub"));
assert.ok(!healthBody.proxy_fallback_ops.azhub);
assert.ok(healthBody.true_engine_slugs.includes("azinterface"));
assert.ok(healthBody.true_engine_slugs.includes("azbrowser"));
assert.ok(healthBody.true_engine_slugs.includes("azmail"));

const llms = await (await handler(new Request(origin + "/llms.txt"), env)).text();
assert.match(llms, /AZHub/);
assert.match(llms, /Blank Key/);
assert.match(llms, /FragGate/);

const openapi = await (await handler(new Request(origin + "/openapi.json"), env)).json();
assert.match(openapi.info.description, /AZHub/);
assert.match(openapi.info.description, /fraggate\/call/);
assert.match(openapi.info.description, /Blank Key/);
const examples = openapi.paths["/v1/fraggate/call"].post.requestBody.content["application/json"].examples;
assert.ok(examples.azhub_blank_key);
assert.equal(examples.azhub_blank_key.value.slug, "azhub");
for (const op of expectedLive) {
  const hit = Object.values(examples).find((ex) => ex && ex.value && ex.value.slug === "azhub" && ex.value.op === op);
  assert.ok(hit, `OpenAPI documents azhub/${op}`);
}

const catalog = await (await handler(new Request(origin + "/v1/catalog.json"), env)).json();
const card = catalog.products.find((p) => p.slug === "azhub");
assert.ok(card);
assert.equal(card.worker, "azhub-download-tracker");
assert.equal(card.github, "https://github.com/AzielEliab/azhub");
assert.equal(card.kind, "software");
assert.equal(card.door, "fraggate");
assert.equal(card.fraggate_live, true);
assert.ok(!catalog.products.some((p) => p.slug === "azhub-azinterface"));
for (const op of expectedLive) {
  assert.ok(card.fraggate_ops.includes(op), `catalog azhub.fraggate_ops has ${op}`);
}

const home = await (await handler(new Request(origin + "/"), env)).text();
assert.match(home, /data-slug="azhub"/);
assert.doesNotMatch(home, /AZHub \/ AZInterface/);
assert.match(home, /Blank Key/);
assert.match(home, /data-op="blank_key_status"/);
assert.match(home, /data-op="region_list"/);
assert.match(home, /data-op="list_modules"/);
assert.match(home, /data-op="place"/);
assert.match(home, /data-slug="azinterface"/);

const uses = await (await handler(new Request(origin + "/v1/uses"), env)).json();
assert.equal(uses.ok, true);
assert.equal(uses.uses_kv, true);
assert.ok(uses.uses >= 1);

const skill = await (await handler(new Request(origin + "/v1/skill"), env)).text();
assert.match(skill, /AZHub \(AIH-WP-1\.0\)/);
assert.match(skill, /slug: "azhub"/);
assert.match(skill, /separate softwares under the same FragGate door/);
assert.doesNotMatch(skill, /AZHub \/ AZInterface/);
assert.doesNotMatch(skill, /AZInterface is a separate engine/);
assert.doesNotMatch(skill, /AZHub is a separate engine/);
assert.doesNotMatch(skill, /two separate FragGate-live engines/);
assert.doesNotMatch(skill, /separate FragGate-live engines/);

console.log(`ok azhub ${product.version}: LIVE_OPS=${live.join(",")} stub=${STUB_OPS.azhub.join(",")}`);

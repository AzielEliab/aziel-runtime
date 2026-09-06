/**
 * AZInterface AIH-WP-1.0: FragGate-live custodial environment. Pre-locked page cycles.
 * Separate from AZHub. Author: Aziel Eliab.
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
  PAGE_CYCLES,
  SPEC,
  VERSION,
  genesisStatus,
  integrityCheck,
  normalizeCycle,
  pageCycleStatus,
  resetAzinterfaceStore,
  siteStateGet,
  siteStateSet,
  witnessList,
} from "../src/engines/azinterface/engine.js";

resetLedger();
resetAzinterfaceStore();

const product = PRODUCTS.find((p) => p.slug === "azinterface");
assert.ok(product, "azinterface is a catalog product");
assert.equal(product.name, "AZInterface");
assert.equal(product.worker, "azinterface-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/azinterface");
assert.equal(product.version, VERSION);
assert.match(product.oneLine, /page cycles/i);
assert.doesNotMatch(product.oneLine, /AZHub \/ AZInterface/);
assert.doesNotMatch(product.banner, /AZHub \/ AZInterface/);
assert.match(product.banner, /FragGate/);
assert.match(product.banner, /AZHub is sibling software/);
assert.match(product.banner, /same FragGate door/);
assert.match(product.oneLine, /sibling software/);
assert.doesNotMatch(product.oneLine, /separate engine/i);
assert.doesNotMatch(product.banner, /separate engine/i);
assert.doesNotMatch(product.oneLine, /separate FragGate engine/i);
assert.doesNotMatch(product.banner, /separate FragGate engine/i);
assert.equal(CATALOG_ALIASES["az-interface"], "azinterface");
assert.equal(CATALOG_ALIASES["page-cycle"], "azinterface");
assert.equal(CATALOG_ALIASES["az-hub"], "azhub");
assert.notEqual(CATALOG_ALIASES["az-interface"], "azhub");
assert.equal(product.doi, null);
assert.equal(SPEC, "AIH-WP-1.0");
assert.deepEqual(PAGE_CYCLES, ["OFF", "integrity", "ON", "FULL SHUTDOWN", "MEMORIAL"]);

const catalogOps = new Set(product.ops.map((o) => o.op));
const live = LIVE_OPS.azinterface;
const expectedLive = [
  "health",
  "skill",
  "genesis_status",
  "site_state_get",
  "site_state_set",
  "integrity_check",
  "witness_list",
  "page_cycle_status",
];
for (const op of expectedLive) {
  assert.ok(live.includes(op), `LIVE_OPS.azinterface has ${op}`);
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}
for (const op of STUB_OPS.azinterface) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.azinterface.status, "live");
assert.ok(registry.bySlug.azinterface.status !== "local_only");
for (const op of expectedLive) {
  assert.equal(classifyCall(registry.bySlug.azinterface, op).kind, "live", `${op} is live`);
}
assert.equal(classifyCall(registry.bySlug.azinterface, "auto_unlock").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azinterface, "completeness_detect").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azinterface, "ranking").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azinterface, "scorch_remote").kind, "stub");

const parsedSlash = parseTarget({ name: "azinterface/page_cycle_status" }, registry);
assert.equal(parsedSlash.slug, "azinterface");
assert.equal(parsedSlash.op, "page_cycle_status");
const parsedFlat = parseTarget({ name: "azinterface_genesis_status" }, registry);
assert.equal(parsedFlat.slug, "azinterface");
assert.equal(parsedFlat.op, "genesis_status");

assert.equal(normalizeCycle("OFF"), "OFF");
assert.equal(normalizeCycle("integrity"), "integrity");
assert.equal(normalizeCycle("ON"), "ON");
assert.equal(normalizeCycle("FULL SHUTDOWN"), "FULL SHUTDOWN");
assert.equal(normalizeCycle("MEMORIAL"), "MEMORIAL");
assert.equal(normalizeCycle("full-shutdown"), "FULL SHUTDOWN");
assert.equal(normalizeCycle("invented"), null);

const genesis = genesisStatus({});
assert.equal(genesis.ok, true);
assert.equal(genesis.genesis_sealed, true);
assert.equal(genesis.cycles_sealed, true);
assert.deepEqual(genesis.cycles, PAGE_CYCLES);

const cycles = pageCycleStatus({});
assert.equal(cycles.ok, true);
assert.equal(cycles.pre_locked, true);
assert.equal(cycles.current, "OFF");
assert.deepEqual(cycles.cycles, ["OFF", "integrity", "ON", "FULL SHUTDOWN", "MEMORIAL"]);
assert.equal(cycles.page_cycle.skip_forbidden, true);
assert.equal(cycles.page_cycle.auto_unlock, false);

const skip = siteStateSet({ cycle: "ON" });
assert.equal(skip.ok, false);
assert.equal(skip.code, "AIH-CYCLE-LOCKED");

const unlock = siteStateSet({ cycle: "ON", auto_unlock: true });
assert.equal(unlock.ok, false);
assert.equal(unlock.code, "AIH-AUTO-UNLOCK-REFUSE");

const complete = pageCycleStatus({ completeness_detect: true });
assert.equal(complete.ok, false);
assert.equal(complete.code, "AIH-COMPLETENESS-REFUSE");

const integrity = integrityCheck({ witness: "custodian-1" });
assert.equal(integrity.ok, true, JSON.stringify(integrity));
assert.equal(integrity.integrity_ok, true);
assert.equal(integrity.current, "integrity");
assert.equal(integrity.note.includes("auto-unlock"), true);

const stillOffOn = siteStateSet({ cycle: "ON" });
assert.equal(stillOffOn.ok, true, JSON.stringify(stillOffOn));
assert.equal(stillOffOn.current, "ON");

const skipMemorial = siteStateSet({ cycle: "MEMORIAL" });
assert.equal(skipMemorial.ok, false);
assert.equal(skipMemorial.code, "AIH-CYCLE-LOCKED");

const shutdown = siteStateSet({ cycle: "FULL SHUTDOWN" });
assert.equal(shutdown.ok, true);
assert.equal(shutdown.current, "FULL SHUTDOWN");
const memorial = siteStateSet({ cycle: "MEMORIAL" });
assert.equal(memorial.ok, true);
assert.equal(memorial.current, "MEMORIAL");
const leave = siteStateSet({ cycle: "ON" });
assert.equal(leave.ok, false);
assert.equal(leave.code, "AIH-CYCLE-TERMINAL");

const witnesses = witnessList({});
assert.ok(witnesses.count >= 1);
assert.equal(witnesses.ranking, false);

resetAzinterfaceStore();
const needIntegrity = siteStateSet({ cycle: "integrity" });
assert.equal(needIntegrity.ok, true);
const onWithoutCheck = siteStateSet({ cycle: "ON" });
assert.equal(onWithoutCheck.ok, false);
assert.equal(onWithoutCheck.code, "AIH-INTEGRITY-REQUIRED");

const local = await executeLocal({
  slug: "azinterface",
  op: "page_cycle_status",
  payload: {},
  ranIn: "aziel-runtime",
});
assert.equal(local.mode, "local");
assert.equal(local.true_engine_runtime, true);
assert.equal(local.engine_digest, embeddedDigest("azinterface"));
assert.match(local.engine_digest, /^[a-f0-9]{64}$/);
const localBody = JSON.parse(local.responseText);
assert.equal(localBody.ok, true);
assert.equal(localBody.spec, "AIH-WP-1.0");
assert.deepEqual(localBody.cycles, PAGE_CYCLES);

const localStub = await executeLocal({ slug: "azinterface", op: "auto_unlock", payload: {}, ranIn: "aziel-runtime" });
assert.equal(localStub.unsupported, true);

const productSkill = await executeLocal({ slug: "azinterface", op: "skill", payload: {}, ranIn: "aziel-runtime" });
const productSkillText = JSON.parse(productSkill.responseText).skill;
assert.match(productSkillText, /sibling software/);
assert.match(productSkillText, /same FragGate door/);
assert.doesNotMatch(productSkillText, /separate engine/i);
assert.doesNotMatch(productSkillText, /product\/engine/);

resetAzinterfaceStore();

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

const doorCycle = await post("/v1/fraggate/call", { slug: "azinterface", op: "page_cycle_status", payload: {} });
assert.equal(doorCycle.ok, true);
assert.equal(doorCycle.code, "FG-OK");
assert.equal(doorCycle.slug, "azinterface");
assert.ok(doorCycle.ledger_tip);
assert.deepEqual(doorCycle.result.cycles, PAGE_CYCLES);
assert.equal(doorCycle.result.current, "OFF");
assert.equal(doorCycle.result.pre_locked, true);

const doorSkip = await post("/v1/fraggate/call", {
  slug: "azinterface",
  op: "site_state_set",
  payload: { cycle: "ON" },
});
assert.equal(doorSkip.ok, true);
assert.equal(doorSkip.code, "FG-OK");
assert.equal(doorSkip.result.ok, false);
assert.equal(doorSkip.result.code, "AIH-CYCLE-LOCKED");

const doorIntegrity = await post("/v1/fraggate/call", {
  slug: "azinterface",
  op: "integrity_check",
  payload: { witness: "door-1" },
});
assert.equal(doorIntegrity.ok, true);
assert.equal(doorIntegrity.result.current, "integrity");

const doorFlat = await post("/v1/fraggate/call", { name: "azinterface/genesis_status", payload: {} });
assert.equal(doorFlat.ok, true);
assert.equal(doorFlat.op, "genesis_status");
const doorLeftover = await post("/v1/fraggate/call", { name: "azinterface_witness_list", payload: {} });
assert.equal(doorLeftover.ok, true);
assert.equal(doorLeftover.op, "witness_list");
assert.equal(doorLeftover.slug, "azinterface");

const doorStub = await post("/v1/fraggate/call", { slug: "azinterface", op: "auto_unlock" });
assert.equal(doorStub.ok, false);
assert.equal(doorStub.code, "FG-STUB");
const doorComplete = await post("/v1/fraggate/call", { slug: "azinterface", op: "completeness_detect" });
assert.equal(doorComplete.code, "FG-STUB");
const doorRank = await post("/v1/fraggate/call", { slug: "azinterface", op: "ranking" });
assert.equal(doorRank.code, "FG-STUB");
const doorScorch = await post("/v1/fraggate/call", { slug: "azinterface", op: "scorch_remote" });
assert.equal(doorScorch.code, "FG-STUB");

for (const op of expectedLive) {
  const payload = op === "site_state_set" ? { cycle: "OFF" } : op === "integrity_check" ? { witness: "mcp-1" } : {};
  const mcp = await post("/mcp", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "fraggate_call", arguments: { slug: "azinterface", op, payload } },
  });
  assert.equal(mcp.result.structuredContent.code, "FG-OK", `MCP maps ${op}`);
  assert.equal(mcp.result.structuredContent.result.slug, "azinterface");
  assert.equal(mcp.result.structuredContent.result.op, op);
}

const listedMcp = await post("/mcp", {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: "fraggate_list", arguments: {} },
});
assert.ok(listedMcp.result.structuredContent.result.allowlist.azinterface);
for (const op of expectedLive) {
  assert.ok(
    listedMcp.result.structuredContent.result.allowlist.azinterface.includes(op),
    `fraggate_list has ${op}`,
  );
  assert.ok(
    listedMcp.result.structuredContent.result.live_ops.includes(`azinterface/${op}`),
    `live_ops has azinterface/${op}`,
  );
}

const init = await post("/mcp", { jsonrpc: "2.0", id: 3, method: "initialize", params: {} });
assert.match(init.result.instructions, /AZInterface/);
assert.match(init.result.instructions, /page_cycle_status/);
assert.match(init.result.instructions, /FULL SHUTDOWN/);

const toolsList = await post("/mcp", { jsonrpc: "2.0", id: 4, method: "tools/list", params: {} });
const tools = toolsList.result.tools;
const listTool = tools.find((t) => t.name === "fraggate_list");
const callTool = tools.find((t) => t.name === "fraggate_call");
assert.ok(!tools.some((t) => t.name === "azinterface_page_cycle_status"), "flat leftover names stay off tools/list");
assert.match(listTool.description, /azinterface/);
assert.match(listTool.description, /page_cycle_status/);
assert.match(callTool.description, /page_cycle_status/);
assert.match(callTool.description, /genesis_status/);
for (const op of expectedLive) {
  assert.match(listTool.description, new RegExp(op));
  assert.match(callTool.description, new RegExp(op));
}

const health = await handler(new Request(origin + "/v1/health"), env);
const healthBody = await health.json();
assert.ok(healthBody.true_engine_slugs.includes("azinterface"));
assert.ok(healthBody.engine_slugs.includes("azinterface"));
assert.equal(healthBody.engines.azinterface.true_engine_runtime, true);
assert.equal(healthBody.engines.azinterface.mode, "local");
assert.equal(healthBody.engines.azinterface.engine_digest, embeddedDigest("azinterface"));
assert.ok(!healthBody.proxy_fallback_ops.azinterface);
assert.ok(healthBody.true_engine_slugs.includes("azhub"));
assert.ok(healthBody.true_engine_slugs.includes("azbrowser"));

const llms = await (await handler(new Request(origin + "/llms.txt"), env)).text();
assert.match(llms, /AZInterface/);
assert.match(llms, /FULL SHUTDOWN/);
assert.match(llms, /FragGate/);

const openapi = await (await handler(new Request(origin + "/openapi.json"), env)).json();
assert.match(openapi.info.description, /AZInterface/);
assert.match(openapi.info.description, /fraggate\/call/);
assert.match(openapi.info.description, /page cycles/);
const examples = openapi.paths["/v1/fraggate/call"].post.requestBody.content["application/json"].examples;
assert.ok(examples.azinterface_page_cycle);
assert.equal(examples.azinterface_page_cycle.value.slug, "azinterface");
for (const op of expectedLive) {
  const hit = Object.values(examples).find(
    (ex) => ex && ex.value && ex.value.slug === "azinterface" && ex.value.op === op,
  );
  assert.ok(hit, `OpenAPI documents azinterface/${op}`);
}

const catalog = await (await handler(new Request(origin + "/v1/catalog.json"), env)).json();
const card = catalog.products.find((p) => p.slug === "azinterface");
assert.ok(card);
assert.equal(card.worker, "azinterface-download-tracker");
assert.equal(card.github, "https://github.com/AzielEliab/azinterface");
assert.equal(card.kind, "software");
assert.equal(card.door, "fraggate");
assert.equal(card.fraggate_live, true);
assert.ok(catalog.products.some((p) => p.slug === "azhub"));
assert.ok(!catalog.products.some((p) => p.slug === "azhub-azinterface"));
for (const op of expectedLive) {
  assert.ok(card.fraggate_ops.includes(op), `catalog azinterface.fraggate_ops has ${op}`);
}

const home = await (await handler(new Request(origin + "/"), env)).text();
assert.match(home, /data-slug="azinterface"/);
assert.doesNotMatch(home, /AZHub \/ AZInterface/);
assert.match(home, /pre-locked/);
assert.match(home, /data-op="page_cycle_status"/);
assert.match(home, /data-op="genesis_status"/);
assert.match(home, /data-slug="azhub"/);

const uses = await (await handler(new Request(origin + "/v1/uses"), env)).json();
assert.equal(uses.ok, true);
assert.equal(uses.uses_kv, true);
assert.ok(uses.uses >= 1);

const skill = await (await handler(new Request(origin + "/v1/skill"), env)).text();
assert.match(skill, /AZInterface \(AIH-WP-1\.0\)/);
assert.match(skill, /slug: "azinterface"/);
assert.match(skill, /FULL SHUTDOWN/);
assert.match(skill, /sibling softwares under the same FragGate door/);
assert.doesNotMatch(skill, /AZHub \/ AZInterface/);
assert.doesNotMatch(skill, /AZHub is a separate engine/);
assert.doesNotMatch(skill, /AZInterface is a separate engine/);
assert.doesNotMatch(skill, /two separate FragGate-live engines/);
assert.doesNotMatch(skill, /separate FragGate-live engines/);

console.log(
  `ok azinterface ${product.version}: LIVE_OPS=${live.join(",")} stub=${STUB_OPS.azinterface.join(",")} cycles=${PAGE_CYCLES.join("/")}`,
);

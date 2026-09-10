/**
 * AZBrowser AZB-1.0: FragGate-live engine, Lamb Lens refuse + receipt required.
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
  LENS,
  SPEC,
  VERSION,
  airlockIngest,
  ethicalSearch,
  harvestSignals,
  matchLambLens,
  navigate,
  parseAdvisoryUrl,
  receiptList,
  receiptVerify,
  resetAzbrowserStore,
  tabList,
  tabOpen,
} from "../src/engines/azbrowser/engine.js";

resetLedger();
resetAzbrowserStore();

const product = PRODUCTS.find((p) => p.slug === "azbrowser");
assert.ok(product, "azbrowser is a catalog product");
assert.equal(product.name, "AZBrowser");
assert.equal(product.worker, "azbrowser-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/azbrowser");
assert.equal(product.version, VERSION);
assert.match(product.oneLine, /Lamb Lens ethical research browser/i);
assert.doesNotMatch(product.oneLine, /AZBrowser \/ AZNet/);
assert.doesNotMatch(product.banner, /AZBrowser \/ AZNet/);
assert.match(product.banner, /FragGate/);
assert.match(product.banner, /AZNet is separate software/);
assert.match(product.banner, /same FragGate door/);
assert.match(product.oneLine, /AZNet is a separate software/);
assert.doesNotMatch(product.oneLine, /separate engine/i);
assert.doesNotMatch(product.banner, /separate engine/i);
assert.doesNotMatch(product.oneLine, /product\/engine/);
assert.doesNotMatch(product.banner, /product\/engine/);
assert.equal(CATALOG_ALIASES.aznet, undefined);
assert.equal(CATALOG_ALIASES["az-net"], "aznet");
assert.notEqual(CATALOG_ALIASES["az-net"], "azbrowser");
assert.equal(CATALOG_ALIASES["az-browser"], "azbrowser");
assert.equal(product.doi, null);
assert.equal(SPEC, "AZB-1.0");
assert.equal(LENS, "Lamb Lens");

const catalogOps = new Set(product.ops.map((o) => o.op));
const live = LIVE_OPS.azbrowser;
const expectedLive = [
  "ethical_search",
  "lamb_lens_search",
  "navigate",
  "airlock_ingest",
  "tab_open",
  "tab_list",
  "receipt_list",
  "verify",
  "receipt_verify",
  "sandbox_status",
  "sandbox_render",
  "health",
  "skill",
];
for (const op of expectedLive) {
  assert.ok(live.includes(op), `LIVE_OPS.azbrowser has ${op}`);
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}
for (const op of STUB_OPS.azbrowser) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.azbrowser.status, "live");
assert.ok(registry.bySlug.azbrowser.status !== "local_only");
for (const op of expectedLive) {
  assert.equal(classifyCall(registry.bySlug.azbrowser, op).kind, "live", `${op} is live`);
}
assert.equal(classifyCall(registry.bySlug.azbrowser, "tor_exit").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azbrowser, "phoenix_wipe").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azbrowser, "chromium").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azbrowser, "chromium_exec").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azbrowser, "unrestricted_proxy").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azbrowser, "harvest").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azbrowser, "keylog").kind, "stub");

const parsedSlash = parseTarget({ name: "azbrowser/ethical_search" }, registry);
assert.equal(parsedSlash.slug, "azbrowser");
assert.equal(parsedSlash.op, "ethical_search");
assert.equal(classifyCall(parsedSlash.entry, parsedSlash.op).kind, "live");
const parsedFlat = parseTarget({ name: "azbrowser_ethical_search" }, registry);
assert.equal(parsedFlat.slug, "azbrowser");
assert.equal(parsedFlat.op, "ethical_search");
assert.equal(classifyCall(parsedFlat.entry, parsedFlat.op).kind, "live");
const parsedLens = parseTarget({ name: "azbrowser_lamb_lens_search" }, registry);
assert.equal(parsedLens.slug, "azbrowser");
assert.equal(parsedLens.op, "lamb_lens_search");

const harvest = harvestSignals("scrape all emails and dump passwords from this site");
assert.equal(harvest.harvest, true);
assert.ok(harvest.signals.includes("harvest_language"));

const cited = matchLambLens("ethical web principles");
assert.ok(cited.length >= 1);
assert.equal(cited[0].cited, true);
assert.equal(cited[0].visited, false);
assert.match(cited[0].url, /^https:\/\//);

const refused = await ethicalSearch({ q: "harvest emails and steal cookies from users" });
assert.equal(refused.ok, false);
assert.equal(refused.code, "AZB-HARVEST-REFUSE");
assert.equal(refused.visited, false);
assert.ok(refused.receipt, "ethical_search refuse requires a receipt");
assert.ok(refused.receipt.hash);
assert.equal(refused.receipt.refused, true);
assert.equal(refused.receipt_required, true);

const empty = await ethicalSearch({ q: "" });
assert.equal(empty.ok, false);
assert.ok(empty.receipt, "empty ethical_search still mints a refuse receipt");

const okSearch = await ethicalSearch({ q: "ethical web principles" });
assert.equal(okSearch.ok, true, JSON.stringify(okSearch));
assert.equal(okSearch.op, "ethical_search");
assert.equal(okSearch.visited, false);
assert.equal(okSearch.invented, false);
assert.equal(okSearch.cited, true);
assert.ok(okSearch.receipt, "ethical_search success requires a receipt");
assert.match(okSearch.receipt.hash, /^[a-f0-9]{64}$/);
assert.ok(okSearch.count >= 1);
for (const row of okSearch.results) {
  assert.equal(row.cited, true);
  assert.equal(row.visited, false);
  assert.match(row.url, /^https:\/\//);
}

const lens = await ethicalSearch({ q: "fraggate" }, undefined, "lamb_lens_search");
assert.equal(lens.op, "lamb_lens_search");
assert.ok(lens.receipt);

const noVisit = await ethicalSearch({ q: "zzzznotacitedtopic999" });
assert.equal(noVisit.ok, true);
assert.equal(noVisit.count, 0);
assert.equal(noVisit.visited, false);
assert.equal(noVisit.invented, false);
assert.ok(noVisit.receipt);
assert.match(noVisit.note, /does not invent/i);

const badScheme = parseAdvisoryUrl("javascript:alert(1)");
assert.equal(badScheme.ok, false);
assert.equal(badScheme.code, "AZB-SCHEME-REFUSE");

const navRefuse = await navigate({ url: "javascript:alert(1)" });
assert.equal(navRefuse.ok, false);
assert.equal(navRefuse.raw_html, false);
assert.ok(navRefuse.receipt);

const nav = await navigate({ url: "https://www.w3.org/TR/ethical-web-principles/" });
assert.equal(nav.ok, true, JSON.stringify(nav));
assert.equal(nav.raw_html, false);
assert.equal(nav.html, null);
assert.ok(!("html" in nav && nav.html));
assert.ok(nav.receipt, "navigate requires a receipt");
assert.equal(nav.host, "www.w3.org");

const airlockBad = await airlockIngest({ text: "<script>alert(1)</script>" });
assert.equal(airlockBad.ok, false);
assert.equal(airlockBad.code, "AZB-AIRLOCK-REFUSE");
assert.ok(airlockBad.receipt);

const airlockOk = await airlockIngest({ url: "https://github.com/AzielEliab/azbrowser" });
assert.equal(airlockOk.ok, true, JSON.stringify(airlockOk));
assert.ok(airlockOk.receipt);

const tab = await tabOpen({ url: "https://github.com/AzielEliab/fraggate" });
assert.equal(tab.ok, true, JSON.stringify(tab));
assert.equal(tab.tab.visited, false);
assert.ok(tab.receipt);
const listedTabs = await tabList({});
assert.ok(listedTabs.count >= 1);

const receipts = await receiptList({ limit: 16 });
assert.ok(receipts.count >= 1);
assert.ok(receipts.receipts.every((r) => r.hash));
const verified = await receiptVerify({ id: okSearch.receipt.id });
assert.equal(verified.ok, true, JSON.stringify(verified));
assert.equal(verified.verified, true);

resetAzbrowserStore();
const kv = memoryUsesKv();
const envKv = { AZBROWSER_TABS: kv };
const kvSearch = await ethicalSearch({ q: "azbrowser" }, envKv);
assert.equal(kvSearch.store, "kv");
assert.ok(kvSearch.receipt);
resetAzbrowserStore();
const kvList = await receiptList({}, envKv);
assert.equal(kvList.store, "kv");
assert.ok(kvList.receipts.some((r) => r.id === kvSearch.receipt.id));

const local = await executeLocal({
  slug: "azbrowser",
  op: "ethical_search",
  payload: { q: "ethical web principles" },
  ranIn: "aziel-runtime",
});
assert.equal(local.mode, "local");
assert.equal(local.true_engine_runtime, true);
assert.equal(local.engine_digest, embeddedDigest("azbrowser"));
assert.match(local.engine_digest, /^[a-f0-9]{64}$/);
const localBody = JSON.parse(local.responseText);
assert.equal(localBody.ok, true);
assert.equal(localBody.spec, "AZB-1.0");
assert.ok(localBody.receipt);

const localStub = await executeLocal({ slug: "azbrowser", op: "tor_exit", payload: {}, ranIn: "aziel-runtime" });
assert.equal(localStub.unsupported, true);

const productSkill = await executeLocal({ slug: "azbrowser", op: "skill", payload: {}, ranIn: "aziel-runtime" });
const productSkillText = JSON.parse(productSkill.responseText).markdown || JSON.parse(productSkill.responseText).skill || "";
assert.match(productSkillText, /separate software/);
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

const doorSearch = await post("/v1/fraggate/call", {
  slug: "azbrowser",
  op: "ethical_search",
  payload: { q: "ethical web principles" },
});
assert.equal(doorSearch.ok, true);
assert.equal(doorSearch.code, "FG-OK");
assert.equal(doorSearch.slug, "azbrowser");
assert.ok(doorSearch.ledger_tip);
assert.ok(doorSearch.result.receipt);
assert.equal(doorSearch.result.visited, false);

const doorRefuse = await post("/v1/fraggate/call", {
  slug: "azbrowser",
  op: "ethical_search",
  payload: { q: "scrape all emails and dump passwords" },
});
assert.equal(doorRefuse.ok, true);
assert.equal(doorRefuse.code, "FG-OK");
assert.equal(doorRefuse.result.ok, false);
assert.equal(doorRefuse.result.code, "AZB-HARVEST-REFUSE");
assert.ok(doorRefuse.result.receipt, "door ethical_search refuse requires a receipt");

const doorNavigate = await post("/v1/fraggate/call", {
  slug: "azbrowser",
  op: "navigate",
  payload: { url: "https://github.com/AzielEliab/azbrowser" },
});
assert.equal(doorNavigate.ok, true);
assert.equal(doorNavigate.result.raw_html, false);
assert.ok(doorNavigate.result.receipt);

const doorAirlock = await post("/v1/fraggate/call", {
  slug: "azbrowser",
  op: "airlock_ingest",
  payload: { url: "https://github.com/AzielEliab/fraggate" },
});
assert.equal(doorAirlock.ok, true);
assert.ok(doorAirlock.result.receipt);

const doorTab = await post("/v1/fraggate/call", {
  slug: "azbrowser",
  op: "tab_open",
  payload: { url: "https://aziel-runtime.vibelock.workers.dev/" },
});
assert.equal(doorTab.ok, true);
const doorTabs = await post("/v1/fraggate/call", { slug: "azbrowser", op: "tab_list", payload: {} });
assert.equal(doorTabs.ok, true);
assert.ok(doorTabs.result.count >= 1);

const doorReceipts = await post("/v1/fraggate/call", { slug: "azbrowser", op: "receipt_list", payload: { limit: 8 } });
assert.equal(doorReceipts.ok, true);
assert.ok(doorReceipts.result.count >= 1);

const doorVerify = await post("/v1/fraggate/call", {
  slug: "azbrowser",
  op: "verify",
  payload: { id: doorSearch.result.receipt.id },
});
assert.equal(doorVerify.ok, true);
assert.equal(doorVerify.result.verified, true);

const doorFlat = await post("/v1/fraggate/call", { name: "azbrowser/lamb_lens_search", payload: { q: "aziel" } });
assert.equal(doorFlat.ok, true);
assert.equal(doorFlat.op, "lamb_lens_search");
const doorLeftover = await post("/v1/fraggate/call", { name: "azbrowser_ethical_search", payload: { q: "runtime" } });
assert.equal(doorLeftover.ok, true);
assert.equal(doorLeftover.op, "ethical_search");
assert.equal(doorLeftover.slug, "azbrowser");

const doorStub = await post("/v1/fraggate/call", { slug: "azbrowser", op: "tor_exit" });
assert.equal(doorStub.ok, false);
assert.equal(doorStub.code, "FG-STUB");
const doorWipe = await post("/v1/fraggate/call", { slug: "azbrowser", op: "phoenix_wipe" });
assert.equal(doorWipe.code, "FG-STUB");
const doorChrome = await post("/v1/fraggate/call", { slug: "azbrowser", op: "chromium" });
assert.equal(doorChrome.code, "FG-STUB");

for (const op of expectedLive) {
  const payload =
    op === "ethical_search" || op === "lamb_lens_search"
      ? { q: "ethical web principles" }
      : op === "navigate"
        ? { url: "https://github.com/AzielEliab/azbrowser" }
        : op === "airlock_ingest"
          ? { url: "https://github.com/AzielEliab/azbrowser" }
          : op === "tab_open"
            ? { url: "https://github.com/AzielEliab/fraggate" }
            : op === "verify" || op === "receipt_verify"
              ? { id: doorSearch.result.receipt.id }
              : op === "sandbox_render"
                ? { url: "https://github.com/AzielEliab/aziel-runtime" }
                : {};
  const mcp = await post("/mcp", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "fraggate_call", arguments: { slug: "azbrowser", op, payload } },
  });
  assert.equal(mcp.result.structuredContent.code, "FG-OK", `MCP maps ${op}`);
  assert.equal(mcp.result.structuredContent.result.slug, "azbrowser");
  assert.equal(mcp.result.structuredContent.result.op, op);
}

const listed = await post("/mcp", {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: "fraggate_list", arguments: {} },
});
assert.ok(listed.result.structuredContent.result.allowlist.azbrowser);
for (const op of expectedLive) {
  assert.ok(listed.result.structuredContent.result.allowlist.azbrowser.includes(op), `fraggate_list has ${op}`);
  assert.ok(listed.result.structuredContent.result.live_ops.includes(`azbrowser/${op}`), `live_ops has azbrowser/${op}`);
}

const init = await post("/mcp", {
  jsonrpc: "2.0",
  id: 3,
  method: "initialize",
  params: {},
});
assert.match(init.result.instructions, /AZBrowser/);
assert.match(init.result.instructions, /ethical_search/);
assert.match(init.result.instructions, /fraggate_list/);

const toolsList = await post("/mcp", {
  jsonrpc: "2.0",
  id: 4,
  method: "tools/list",
  params: {},
});
const tools = toolsList.result.tools;
assert.ok(Array.isArray(tools));
const listTool = tools.find((t) => t.name === "fraggate_list");
const callTool = tools.find((t) => t.name === "fraggate_call");
assert.ok(listTool, "tools/list includes fraggate_list");
assert.ok(callTool, "tools/list includes fraggate_call");
assert.ok(!tools.some((t) => t.name === "azbrowser_ethical_search"), "flat leftover names stay off tools/list");
assert.match(listTool.description, /azbrowser/);
assert.match(listTool.description, /ethical_search/);
assert.match(callTool.description, /ethical_search/);
assert.match(callTool.description, /navigate/);
for (const op of expectedLive) {
  assert.match(listTool.description, new RegExp(op));
  assert.match(callTool.description, new RegExp(op));
}

const health = await handler(new Request(origin + "/v1/health"), env);
const healthBody = await health.json();
assert.ok(healthBody.true_engine_slugs.includes("azbrowser"));
assert.ok(healthBody.engine_slugs.includes("azbrowser"));
assert.equal(healthBody.engines.azbrowser.true_engine_runtime, true);
assert.equal(healthBody.engines.azbrowser.mode, "local");
assert.equal(healthBody.engines.azbrowser.engine_digest, embeddedDigest("azbrowser"));
assert.ok(!healthBody.proxy_fallback_ops.azbrowser);

const llms = await (await handler(new Request(origin + "/llms.txt"), env)).text();
assert.match(llms, /AZBrowser/);
assert.match(llms, /Lamb Lens/);
assert.match(llms, /FragGate/);
assert.match(llms, /slug=fraggate/);
assert.match(llms, /catalog.json extras/);
assert.match(llms, /worker=fraggate-download-tracker/);
assert.match(llms, /not nested in AZBrowser/);

const openapi = await (await handler(new Request(origin + "/openapi.json"), env)).json();
assert.match(openapi.info.description, /AZBrowser/);
assert.match(openapi.info.description, /fraggate\/call/);
assert.match(openapi.info.description, /ethical_search/);
assert.match(openapi.paths["/v1/fraggate/call"].post.summary, /AZBrowser/);
const examples = openapi.paths["/v1/fraggate/call"].post.requestBody.content["application/json"].examples;
assert.ok(examples.azbrowser_ethical_search);
assert.equal(examples.azbrowser_ethical_search.value.slug, "azbrowser");
for (const op of expectedLive) {
  const hit = Object.values(examples).find((ex) => ex && ex.value && ex.value.slug === "azbrowser" && ex.value.op === op);
  assert.ok(hit, `OpenAPI documents azbrowser/${op}`);
}

const catalog = await (await handler(new Request(origin + "/v1/catalog.json"), env)).json();
const azbCard = catalog.products.find((p) => p.slug === "azbrowser");
assert.ok(azbCard, "hub catalog fetch includes azbrowser");
assert.equal(azbCard.slug, "azbrowser");
assert.equal(azbCard.worker, "azbrowser-download-tracker");
assert.equal(azbCard.github, "https://github.com/AzielEliab/azbrowser");
assert.equal(azbCard.kind, "software");
assert.equal(azbCard.door, "fraggate");
assert.equal(azbCard.fraggate_live, true);
assert.ok(azbCard.fraggate_call.endsWith("/v1/fraggate/call"));
for (const op of expectedLive) {
  assert.ok(azbCard.fraggate_ops.includes(op), `catalog azbrowser.fraggate_ops has ${op}`);
}
assert.ok(!catalog.products.some((p) => p.slug === "fraggate"), "fraggate is extras, not PRODUCTS");
assert.equal(catalog.door, "fraggate");
assert.equal(catalog.kernel, "https://github.com/AzielEliab/fraggate");
assert.equal(catalog.fraggate.slug, "fraggate");
assert.equal(catalog.fraggate.kind, "kernel");
assert.equal(catalog.fraggate.github, "https://github.com/AzielEliab/fraggate");
assert.equal(catalog.fraggate.worker, "fraggate-download-tracker");
assert.equal(catalog.fraggate.engine, false);
assert.equal(catalog.fraggate.worker_home, "https://fraggate-download-tracker.vibelock.workers.dev/");
assert.equal(catalog.fraggate.download, "https://fraggate-download-tracker.vibelock.workers.dev/download");
assert.match(catalog.fraggate.one_line, /kernel door/);
assert.match(catalog.fraggate.note, /not nested in AZBrowser/);
const extraFg = catalog.extras.find((e) => e.slug === "fraggate");
assert.ok(extraFg, "catalog.extras includes FragGate hub card");
assert.equal(extraFg.github, "https://github.com/AzielEliab/fraggate");
assert.equal(extraFg.worker, "fraggate-download-tracker");
assert.equal(extraFg.engine, false);
assert.equal(extraFg.worker_home, catalog.fraggate.worker_home);
assert.equal(extraFg.download, catalog.fraggate.download);

const home = await (await handler(new Request(origin + "/"), env)).text();
assert.match(home, /data-slug="azbrowser"/);
assert.doesNotMatch(home, /AZBrowser \/ AZNet/);
assert.match(home, /Lamb Lens ethical research browser/);
assert.match(home, /data-op="ethical_search"/);
assert.match(home, /data-op="navigate"/);
assert.match(home, /data-op="airlock"/);
assert.match(home, /data-op="home"/);
assert.match(home, /\/v1\/fraggate\/call/);
assert.match(home, /catalog extras/);
assert.match(home, /github.com\/AzielEliab\/fraggate/);
assert.match(home, /fraggate-download-tracker/);
assert.match(home, /href="https:\/\/fraggate-download-tracker\.vibelock\.workers\.dev\/"/);
assert.match(home, /not nested in AZBrowser/);

const uses = await (await handler(new Request(origin + "/v1/uses"), env)).json();
assert.equal(uses.ok, true);
assert.equal(uses.uses_kv, true);
assert.ok(uses.uses >= 1);

const skill = await (await handler(new Request(origin + "/v1/skill"), env)).text();
assert.match(skill, /AZBrowser \(AZB-1\.0\)/);
assert.doesNotMatch(skill, /AZBrowser \/ AZNet/);
assert.match(skill, /slug: "azbrowser"/);
assert.doesNotMatch(skill, /AZNet is a separate engine/);
assert.doesNotMatch(skill, /AZNet is a separate product\/engine/);

console.log(
  `ok azbrowser ${product.version}: LIVE_OPS=${live.join(",")} stub=${STUB_OPS.azbrowser.join(",")}`,
);

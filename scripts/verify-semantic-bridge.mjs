/**
 * Cap-7 semantic-bridge cite + dual-surface AI upload/download path.
 * NO-FAN: no fake ICANN .az; no AZ-GEN live registrar; no visible 15:20;
 * GET /v1/mesh never enables radios. Cap-7 names inherit designs only;
 * resolves_to_hub: false — not aliases of the four ICANN hostnames.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS } from "../src/fraggate/registry.js";
import { executeLocal } from "../src/engines/runner.js";
import {
  CAP7_INHERIT,
  CAP7_RESOLVES_TO_HUB,
  ICANN_HUB_HOSTS,
  MIRAGEGRID_WORKER_ORIGIN,
  SEMANTIC_BRIDGE_FACTORY,
  SEMANTIC_BRIDGE_SPEC,
  dispatchAzGeneratorHttp,
  dualSurfaceAgentHowTo,
  miragegridBridgeCite,
  miragegridBridgeUrl,
  semanticBridgeCiteField,
  semanticBridgeLlmsBlock,
  semanticBridgeSkillMarkdown,
  semanticBridgeStatus,
} from "../src/semantic-bridge.js";
import { shouldIncrementUse } from "../src/uses.js";
import { CRAWLER_LEAD_VERSION_RE, RUNTIME_ABSTRACT } from "../src/seo.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path) {
  return handler(new Request(origin + path, { headers: { "user-agent": "Mozilla/5.0" } }), {});
}

async function post(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "user-agent": "Mozilla/5.0", "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    }),
    {},
  );
}

assert.equal(SEMANTIC_BRIDGE_SPEC, "CAP-7");
assert.equal(SEMANTIC_BRIDGE_FACTORY, "miragegrid");
assert.equal(CAP7_INHERIT, "designs");
assert.equal(CAP7_RESOLVES_TO_HUB, false);
assert.deepEqual(ICANN_HUB_HOSTS, [
  "https://www.azieleliab.com/",
  "https://www.azielcorpuslibrary.net/",
  "https://godlock.uk/",
  "https://www.hedidntjump.com/",
]);
assert.equal(miragegridBridgeUrl(), `${MIRAGEGRID_WORKER_ORIGIN}/bridge`);

const cite = semanticBridgeCiteField(origin);
assert.equal(cite.public_icann, false);
assert.equal(cite.icann_tld_az, false);
assert.equal(cite.live_registrar, false);
assert.equal(cite.az_gen_live_registrar, false);
assert.equal(cite.resolves_to_hub, false);
assert.equal(cite.inherit, "designs");
assert.equal(cite.name_may_change, true);
assert.equal(cite.canonical_hubs_immutable, true);
assert.equal(cite.fifth_product, false);
assert.deepEqual(cite.canonical_hubs.find((h) => h.host.includes("azielcorpuslibrary")).designs, [
  "azcorpus",
  "azlibrary",
]);
assert.ok(cite.website_designs.ids.includes("azcorpus"));
assert.ok(cite.website_designs.ids.includes("azlibrary"));
assert.equal(cite.website_designs.fifth_product, false);
assert.equal(cite.website_designs.designs.find((d) => d.id === "azlibrary").upload.method, "api_token_only");
assert.equal(cite.website_designs.designs.find((d) => d.id === "azlibrary").upload.never_embed_secret, true);
assert.equal(cite.website_designs.designs.find((d) => d.id === "azcorpus").download_open, true);
assert.equal(cite.visible_1520, false);
assert.equal(cite.mesh_get_never_enables, true);
assert.equal(cite.growth_on, true);
assert.equal(cite.software_tab, false);
assert.equal(cite.browse.aznet, true);
assert.equal(cite.browse.azbrowser, true);
assert.equal(cite.plane_a.hubs_mirror_tips, true);
assert.ok(cite.plane_a.hubs.every((h) => h.mirrors_tips === true && h.resolves_cap7 === false));
assert.ok(cite.not_aliases_of.every((h) => ICANN_HUB_HOSTS.includes(h)));
assert.match(cite.inherit_note, /designs only/);
assert.match(cite.inherit_note, /map to the original four canonical hubs only/);
assert.match(cite.inherit_note, /azcorpus\+azlibrary/);
assert.match(cite.limitation, /THIS IS NOT:[\s\S]*public \.az TLD/);
assert.match(cite.limitation, /THIS IS NOT:[\s\S]*live AZ-GEN registrar/);
assert.match(cite.limitation, /THIS IS NOT:[\s\S]*visible 15:20/);
assert.equal(cite.visible_1520, false);
assert.doesNotMatch(JSON.stringify(cite), /"public_icann":true/);
assert.match(cite.limitation.split("THIS IS NOT:")[0], /MirageGrid only/);
assert.doesNotMatch(cite.limitation.split("THIS IS NOT:")[0], /live registrar|ICANN DNS|public \.az/);

const gen = dispatchAzGeneratorHttp("GET", "/v1/mesh/az-generator", origin);
assert.equal(gen.status, 200);
assert.equal(gen.body.ok, true);
assert.equal(gen.body.code, "CAP7-CITE");
assert.equal(gen.body.resolves_to_hub, false);
assert.equal(gen.body.live_registrar, false);
assert.equal(gen.body.name_may_change, true);
assert.equal(gen.body.canonical_hubs_immutable, true);
assert.equal(gen.body.fifth_product, false);
assert.equal(gen.body.public_icann, false);

const refused = dispatchAzGeneratorHttp("POST", "/v1/mesh/az-generator", origin);
assert.equal(refused.status, 405);
assert.equal(refused.body.ok, false);
assert.equal(refused.body.code, "CAP7-CITE-ONLY");
assert.equal(refused.body.mesh_get_never_enables, true);
assert.equal(refused.body.name_may_change, true);
assert.equal(refused.body.canonical_hubs_immutable, true);
assert.equal(refused.body.fifth_product, false);
assert.equal(refused.body.public_icann, false);

const bridge = miragegridBridgeCite(origin);
assert.equal(bridge.product, "miragegrid");
assert.equal(bridge.op, "bridge");
assert.equal(bridge.resolves_to_hub, false);
assert.equal(bridge.public_icann, false);

const local = await executeLocal({ slug: "miragegrid", op: "bridge", payload: { origin }, ranIn: "aziel-runtime" });
assert.equal(local.status, 200);
const localBody = JSON.parse(local.responseText);
assert.equal(localBody.ok, true);
assert.equal(localBody.spec, "CAP-7");
assert.equal(localBody.resolves_to_hub, false);
assert.equal(localBody.inherit, "designs");

assert.ok((LIVE_OPS.miragegrid || []).includes("bridge"));
const mg = PRODUCTS.find((p) => p.slug === "miragegrid");
assert.ok(mg.ops.some((o) => o.op === "bridge"));

const httpCite = await get("/cite.json");
assert.equal(httpCite.status, 200);
const citeBody = await httpCite.json();
assert.equal(citeBody.semantic_bridge.spec, "CAP-7");
assert.equal(citeBody.semantic_bridge.resolves_to_hub, false);
assert.equal(citeBody.semantic_bridge.inherit, "designs");
assert.equal(citeBody.semantic_bridge.public_icann, false);
assert.equal(citeBody.semantic_bridge.az_gen_live_registrar, false);
assert.equal(citeBody.semantic_bridge.paths.miragegrid_bridge, `${MIRAGEGRID_WORKER_ORIGIN}/bridge`);
assert.equal(citeBody.semantic_bridge.paths.mesh_az_generator, `${origin}/v1/mesh/az-generator`);
assert.ok(citeBody.compatible_ai_clients.includes("ChatGPT (GPT Actions / OpenAI)"));
assert.ok(citeBody.compatible_ai_clients.includes("plus other MCP/OpenAPI-capable assistants"));

const catalog = await (await get("/v1/catalog.json")).json();
assert.equal(catalog.semantic_bridge.resolves_to_hub, false);
assert.equal(catalog.crawl.mesh_az_generator, `${origin}/v1/mesh/az-generator`);

const azGen = await get("/v1/mesh/az-generator");
assert.equal(azGen.status, 200);
const azBody = await azGen.json();
assert.equal(azBody.ok, true);
assert.equal(azBody.resolves_to_hub, false);
assert.equal(azBody.live_registrar, false);
assert.equal(azBody.mesh_get_never_enables, true);

const azPost = await post("/v1/mesh/az-generator", { name: "fake.az" });
assert.equal(azPost.status, 405);
const azPostBody = await azPost.json();
assert.equal(azPostBody.code, "CAP7-CITE-ONLY");

const meshGet = await (await get("/v1/mesh")).json();
assert.equal(meshGet.get_never_enables, true);
assert.equal(meshGet.enabled, true);

const fg = await post("/v1/fraggate/call", { slug: "miragegrid", op: "bridge", payload: { origin } });
assert.equal(fg.status, 200);
const fgBody = await fg.json();
assert.equal(fgBody.ok, true);
assert.equal(fgBody.result.spec, "CAP-7");
assert.equal(fgBody.result.resolves_to_hub, false);
assert.equal(fgBody.result.inherit, "designs");

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/v1/mesh/az-generator"]);
assert.match(openapi.paths["/v1/mesh/az-generator"].get.summary, /resolves_to_hub false/);
assert.match(openapi.paths["/v1/mesh/az-generator"].get.summary, /Not a live AZ-GEN registrar/);
assert.ok(openapi.paths["/p/miragegrid/bridge"]);
assert.match(openapi.paths["/p/miragegrid/bridge"].get.description, /fraggate\/call/);
assert.ok(openapi.paths["/v1/update/check"]);
assert.ok(openapi.paths["/v1/pull/{slug}"]);
assert.ok(openapi.paths["/p/azbrowser/airlock_ingest"]);
assert.ok(openapi.paths["/p/peacelock/upload_envelope"]);
assert.match(openapi.info.description, /ChatGPT \(GPT Actions \/ OpenAI\)/);
assert.match(openapi.info.description, /plus other MCP\/OpenAPI-capable assistants/);
assert.match(openapi.info.description, /Cap-7 mesh names via MirageGrid only/);
assert.ok(openapi.info.description.indexOf(RUNTIME_ABSTRACT) === 0);

const skill = await (await get("/v1/skill")).text();
assert.match(skill, /Dual surface — upload \/ download \/ invoke/);
assert.match(skill, /\/v1\/update\/check/);
assert.match(skill, /airlock_ingest/);
assert.match(skill, /upload_envelope/);
assert.match(skill, /Cap-7 semantic bridge/);
assert.match(skill, /resolves_to_hub: false/);
assert.match(skill, /inherit hub \*\*designs\*\* only/);
assert.match(skill, /azcorpus/);
assert.match(skill, /azlibrary/);
assert.match(skill, /API token only/);
assert.match(skill, /never embed the secret/i);
assert.match(skill, /name_may_change: true/);
assert.match(skill, /ChatGPT \(GPT Actions \/ OpenAI\)/);
assert.match(skill, /plus other MCP\/OpenAPI-capable assistants/);

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /Cap-7 semantic bridge/);
assert.match(llms, /resolves_to_hub: false/);
assert.match(llms, /inherit: designs/);
assert.match(llms, /azcorpus \+ azlibrary/);
assert.match(llms, /name_may_change: true/);
assert.match(llms, /Visible 15:20: false/);
assert.ok(llms.indexOf("## What this is") < llms.indexOf("## Cap-7 semantic bridge"));
assert.doesNotMatch(llms.split("\n").slice(0, 30).join("\n"), CRAWLER_LEAD_VERSION_RE);

assert.equal(shouldIncrementUse("GET", "/v1/mesh/az-generator"), false);
assert.equal(shouldIncrementUse("POST", "/v1/mesh/az-generator"), true);

const howTo = dualSurfaceAgentHowTo(origin);
assert.match(howTo, /\/v1\/update\/check/);
assert.match(howTo, /airlock_ingest/);
const skillMd = semanticBridgeSkillMarkdown(origin);
assert.match(skillMd, /resolves_to_hub: false/);
assert.doesNotMatch(skillMd, /alias of (azieleliab|godlock)/i);
const llmsBlock = semanticBridgeLlmsBlock(origin);
assert.match(llmsBlock, /Fake ICANN \.az: false/);
assert.match(semanticBridgeStatus(origin).code, /CAP7-CITE/);

const citeDoc = await readFile(new URL("../docs/CITE.md", import.meta.url), "utf8");
assert.match(citeDoc, /resolves_to_hub: false/);
assert.match(citeDoc, /inherit hub \*\*designs\*\* only/);
assert.match(citeDoc, /azcorpus/);
assert.match(citeDoc, /azlibrary upload/);
assert.match(citeDoc, /not\*\* aliases of the four ICANN hostnames/);

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
assert.match(readme, /resolves_to_hub: false/);
assert.match(readme, /ChatGPT \(GPT Actions \/ OpenAI\)/);

console.log("ok Cap-7 semantic-bridge cite: inherit designs only, resolves_to_hub false, no ICANN aliases");

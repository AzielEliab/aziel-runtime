/**
 * Guardrails for catalog + pull + proxy + session-runtime routes.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PRODUCTS } from "../src/index.js";
import {
  RUNTIME_VERSION,
  resolveSlug,
  runtimeSkillMarkdown,
  runtimeManifest,
  bundleJson,
  pullRecord,
  fallbackSkillMarkdown,
} from "../src/runtime-api.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const png = await readFile(join(root, "public/sigil.png"));

const env = {
  ASSETS: {
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      if (path === "/sigil.png") {
        return new Response(png, { status: 200, headers: { "Content-Type": "image/png" } });
      }
      return new Response("not found", { status: 404 });
    },
  },
};

async function get(path) {
  return handler(new Request(origin + path), env);
}

assert.equal(resolveSlug("foldlock", Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]))), "foldlock");
assert.equal(resolveSlug("az-clce", Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]))), "azclce");
assert.equal(resolveSlug("aziel-digital-library", Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]))), "aziel-corpus");
assert.equal(resolveSlug("missing", Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]))), null);

const skill = await get("/v1/skill");
assert.equal(skill.status, 200);
assert.match(skill.headers.get("content-type") || "", /markdown|text\/plain/);
const skillText = await skill.text();
assert.match(skillText, /Aziel Eliab Runtime/);
assert.match(skillText, /catalog \+ pull \+ proxy/);
assert.match(skillText, /1\.3\.0/);
assert.match(skillText, /engine_digest/);
assert.match(skillText, /open → policy → exec/);
assert.match(skillText, /\/v1\/runtime\.json/);
assert.match(skillText, /\/v1\/bundle/);
assert.match(skillText, /\/v1\/pull\/\{slug\}/);
assert.match(skillText, /\/p\/\{slug\}\/\{op\}/);
assert.match(skillText, /Mozilla\/5\.0/);
assert.match(skillText, /Everblooming/);
assert.doesNotMatch(skillText, /10\.5281\/zenodo\.XXXX/);

const manifestRes = await get("/v1/runtime.json");
assert.equal(manifestRes.status, 200);
const manifest = await manifestRes.json();
assert.equal(manifest.ok, true);
assert.equal(manifest.role, "engine-runtime");
assert.equal(manifest.proxy_is_not_exec, true);
assert.ok(Array.isArray(manifest.true_engine_slugs));
assert.ok(manifest.true_engine_slugs.includes("foldlock"));
assert.equal(manifest.engines.foldlock.true_engine_runtime, true);
assert.equal(manifest.engines.vibelock.true_engine_runtime, false);
assert.equal(manifest.author, "Aziel Eliab");
assert.equal(manifest.identity, "Aziel Eliab");
assert.equal(manifest.version, RUNTIME_VERSION);
assert.equal(manifest.product_count, PRODUCTS.length);
assert.ok(manifest.endpoints.pull.includes("/v1/pull/{slug}"));
assert.ok(manifest.endpoints.invoke.includes("/p/{slug}/{op}"));
assert.ok(manifest.endpoints.cite.includes("/cite.json"));
assert.equal(manifest.doi, null);

const bundleRes = await get("/v1/bundle");
assert.equal(bundleRes.status, 200);
const bundle = await bundleRes.json();
assert.equal(bundle.role, "engine-runtime");
assert.equal(bundle.products.length, PRODUCTS.length);
const fold = bundle.products.find((p) => p.slug === "foldlock");
assert.ok(fold.skill_url.endsWith("/v1/pull/foldlock/skill"));
assert.ok(fold.invoke_prefix.endsWith("/p/foldlock"));

const pullAll = await get("/v1/pull?all=1");
assert.equal(pullAll.status, 200);
const pullAllBody = await pullAll.json();
assert.equal(pullAllBody.products.length, PRODUCTS.length);

const pullRes = await get("/v1/pull/foldlock");
assert.equal(pullRes.status, 200);
const pull = await pullRes.json();
assert.equal(pull.slug, "foldlock");
assert.equal(pull.name, "FoldLock");
assert.ok(pull.skill_url.endsWith("/v1/pull/foldlock/skill"));
assert.ok(pull.download.includes("/download"));
assert.ok(pull.install.endsWith("/install.sh"));
assert.match(pull.install_sh, /install\.sh/);
assert.ok(Array.isArray(pull.ops));
assert.ok(pull.aliases.invoke_prefix.endsWith("/p/foldlock"));
assert.ok(pull.aliases.slugs.includes("foldlock"));
assert.ok(typeof pull.skill === "string" && pull.skill.length > 20);

const aliasPull = await get("/v1/pull/az-clce");
assert.equal(aliasPull.status, 200);
const aliasBody = await aliasPull.json();
assert.equal(aliasBody.slug, "azclce");

const unknown = await get("/v1/pull/not-a-product");
assert.equal(unknown.status, 404);

const pullSkill = await get("/v1/pull/foldlock/skill");
assert.equal(pullSkill.status, 200);
const pullSkillText = await pullSkill.text();
assert.match(pullSkillText, /FoldLock|# FoldLock|fold/);

const health = await (await get("/v1/health")).json();
assert.equal(health.role, "engine-runtime");
assert.equal(health.version, RUNTIME_VERSION);
assert.deepEqual(health.true_engine_slugs, manifest.true_engine_slugs);
assert.equal(health.session, "/v1/session/open");
assert.equal(health.skill, "/v1/skill");
assert.equal(health.bundle, "/v1/bundle");
assert.ok(health.products.includes("mialock"));

const home = await get("/");
assert.equal(home.status, 200);
const homeHtml = await home.text();
assert.match(homeHtml, /Aziel Eliab Runtime/);
assert.match(homeHtml, /pull/);
assert.match(homeHtml, /invoke/);
assert.match(homeHtml, /Everblooming sigil/);
assert.match(homeHtml, /src="\/sigil\.png"/);
assert.match(homeHtml, /\/v1\/skill/);
assert.match(homeHtml, /\/v1\/runtime\.json/);
assert.match(homeHtml, /M\.I\.A\.Lock/);

const sigil = await get("/sigil.png");
assert.equal(sigil.status, 200);
assert.match(sigil.headers.get("content-type") || "", /png/);
assert.equal(sigil.headers.get("X-Aziel-Sigil"), "Everblooming");

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /Role: engine-runtime/);
assert.match(llms, /1\.1\.0 was catalog\+proxy/);
assert.match(llms, /1\.3\.0/);
assert.match(llms, /\/v1\/bundle/);
assert.match(llms, /Aziel Eliab Runtime/);

const openapi = await (await get("/openapi.json")).json();
assert.equal(openapi.info.title, "Aziel Eliab Runtime");
assert.equal(openapi.info.version, RUNTIME_VERSION);
assert.ok(openapi.paths["/v1/skill"]);
assert.ok(openapi.paths["/v1/runtime.json"]);
assert.ok(openapi.paths["/v1/session/open"]);
assert.ok(openapi.paths["/v1/session/{id}/exec"]);
assert.ok(openapi.paths["/v1/bundle"]);
assert.ok(openapi.paths["/v1/pull/{slug}"]);
assert.ok(openapi.paths["/p/foldlock/fold-preview"]);

const mcpInit = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  }),
  env,
);
const mcpBody = await mcpInit.json();
assert.match(mcpBody.result.instructions, /in-process engines/);
assert.match(mcpBody.result.instructions, /not exec/);
assert.match(mcpBody.result.instructions, /engine_digest/);
assert.equal(mcpBody.result.serverInfo.version, RUNTIME_VERSION);

const mcpList = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  }),
  env,
);
const tools = (await mcpList.json()).result.tools.map((t) => t.name);
assert.ok(tools.includes("runtime_skill"));
assert.ok(tools.includes("runtime_manifest"));
assert.ok(tools.includes("runtime_bundle"));
assert.ok(tools.includes("runtime_pull"));
assert.ok(tools.includes("runtime_session_open"));
assert.ok(tools.includes("runtime_session_exec"));

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /\/v1\/skill/);
assert.match(sitemap, /\/v1\/runtime\.json/);
assert.match(sitemap, /\/v1\/bundle/);
assert.match(sitemap, /\/v1\/pull\/foldlock\/skill/);

const miss = await (await get("/no-such-route")).json();
assert.match(miss.hint, /\/v1\/skill/);

const localSkill = runtimeSkillMarkdown(origin, PRODUCTS);
assert.match(localSkill, /ChatGPT/);
const localManifest = runtimeManifest(origin, PRODUCTS);
assert.equal(localManifest.product_count, PRODUCTS.length);
const localBundle = bundleJson(origin, PRODUCTS);
assert.equal(localBundle.products.length, PRODUCTS.length);
const rec = pullRecord(PRODUCTS[0], origin, fallbackSkillMarkdown(PRODUCTS[0], origin));
assert.equal(rec.ok, true);
assert.ok(rec.skill);

console.log(`ok runtime ${RUNTIME_VERSION}: skill, runtime.json, bundle, pull, ${PRODUCTS.length} products, sigil, MCP`);

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
  RUNTIME_ROLE,
  VERSION_HISTORY,
  authoritySnapshot,
  resolveSlug,
  runtimeSkillMarkdown,
  runtimeManifest,
  bundleJson,
  pullRecord,
  fallbackSkillMarkdown,
} from "../src/runtime-api.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { VERSION_HEADER, ROLE_HEADER } from "../src/production.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const png = await readFile(join(root, "public/sigil.png"));

const env = {
  SESSION: memorySessionNamespace({}),
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
assert.match(skillText, /1\.5\.0/);
assert.match(skillText, /1\.4\.1/);
assert.match(skillText, /1\.4\.0/);
assert.match(skillText, /1\.3\.0/);
assert.match(skillText, /Dual surface/);
assert.match(skillText, /How an agent uses this like software/);
assert.match(skillText, /runtime_run/);
assert.match(skillText, /advanced\/internal/);
assert.match(skillText, /\/v1\/ready/);
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
const catalogSlugs = PRODUCTS.map((p) => p.slug).sort();
assert.deepEqual(manifest.true_engine_slugs, catalogSlugs);
assert.deepEqual(manifest.engine_slugs, catalogSlugs);
assert.deepEqual(manifest.proxy_fallback_slugs, []);
assert.ok(manifest.true_engine_slugs.includes("foldlock"));
assert.ok(manifest.true_engine_slugs.includes("vibelock"));
assert.equal(manifest.engines.foldlock.true_engine_runtime, true);
assert.equal(manifest.engines.vibelock.true_engine_runtime, true);
assert.equal(manifest.engines.vibelock.mode, "local");
assert.match(manifest.engines.vibelock.engine_digest, /^[a-f0-9]{64}$/);
for (const slug of catalogSlugs) {
  assert.equal(manifest.engines[slug].true_engine_runtime, true, `${slug} is a true engine`);
  assert.equal(manifest.engines[slug].mode, "local", `${slug} mode`);
  assert.match(manifest.engines[slug].engine_digest, /^[a-f0-9]{64}$/, `${slug} digest`);
}
assert.ok(manifest.proxy_fallback_ops.azos.includes("session"));
assert.ok(manifest.proxy_fallback_ops["aziel-corpus"].includes("transcribe"));
assert.equal(manifest.author, "Aziel Eliab");
assert.equal(manifest.identity, "Aziel Eliab");
assert.equal(manifest.version, RUNTIME_VERSION);
assert.equal(manifest.product_count, PRODUCTS.length);
assert.ok(manifest.endpoints.pull.includes("/v1/pull/{slug}"));
assert.ok(manifest.endpoints.invoke.includes("/p/{slug}/{op}"));
assert.ok(manifest.endpoints.cite.includes("/cite.json"));
assert.equal(manifest.doi, null);
assert.ok(manifest.authoritySnapshot);
assert.equal(manifest.authoritySnapshot.version, RUNTIME_VERSION);
assert.equal(manifest.authoritySnapshot.role, RUNTIME_ROLE);
assert.deepEqual(manifest.authoritySnapshot, authoritySnapshot());
assert.ok(Array.isArray(manifest.version_history));
assert.deepEqual(manifest.version_history, VERSION_HISTORY);
assert.equal(manifest.honest, undefined);
assert.ok(!Object.prototype.hasOwnProperty.call(manifest, "honest"));
assert.equal(manifestRes.headers.get(VERSION_HEADER), RUNTIME_VERSION);
assert.equal(manifestRes.headers.get(ROLE_HEADER), RUNTIME_ROLE);
assert.match(manifestRes.headers.get("Cache-Control") || "", /no-store/);
assert.match(manifestRes.headers.get("CDN-Cache-Control") || "", /no-store/);

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

const healthRes = await get("/v1/health");
assert.equal(healthRes.status, 200);
assert.equal(healthRes.headers.get(VERSION_HEADER), RUNTIME_VERSION);
assert.equal(healthRes.headers.get(ROLE_HEADER), RUNTIME_ROLE);
assert.match(healthRes.headers.get("Cache-Control") || "", /no-store/);
const health = await healthRes.json();
assert.equal(health.role, "engine-runtime");
assert.equal(health.version, RUNTIME_VERSION);
assert.equal(health.ready, "/v1/ready");
assert.ok(health.authoritySnapshot);
assert.equal(health.authoritySnapshot.version, RUNTIME_VERSION);
assert.ok(!Object.prototype.hasOwnProperty.call(health, "honest"));

const readyRes = await get("/v1/ready");
assert.equal(readyRes.status, 200);
const ready = await readyRes.json();
assert.equal(ready.ok, true);
assert.equal(ready.version, health.version);
assert.equal(ready.role, health.role);
assert.equal(ready.session_binding, true);

for (const path of ["/v1/health", "/v1/ready", "/v1/runtime.json", "/v1/runtime", "/v1/skill"]) {
  const head = await handler(new Request(origin + path, { method: "HEAD" }), env);
  assert.equal(head.status, 200, `HEAD ${path}`);
  assert.equal(head.headers.get(VERSION_HEADER), RUNTIME_VERSION, `HEAD ${path} version`);
  assert.equal(head.headers.get(ROLE_HEADER), RUNTIME_ROLE, `HEAD ${path} role`);
  const text = await head.text();
  assert.equal(text, "");
}
assert.deepEqual(health.true_engine_slugs, manifest.true_engine_slugs);
assert.deepEqual(health.engine_slugs, health.true_engine_slugs);
assert.deepEqual(manifest.engine_slugs, manifest.true_engine_slugs);
assert.ok(health.true_engine_runtime === true);
assert.ok(manifest.true_engine_runtime === true);
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
assert.match(homeHtml, /Aziel Elroi Eliab/);
assert.match(homeHtml, /og:image/);
assert.match(homeHtml, /application\/ld\+json/);

const sigil = await get("/sigil.png");
assert.equal(sigil.status, 200);
assert.match(sigil.headers.get("content-type") || "", /png/);
assert.equal(sigil.headers.get("X-Aziel-Sigil"), "Everblooming");

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /Role: engine-runtime/);
assert.match(llms, /1\.1\.0 was catalog\+proxy/);
assert.match(llms, /1\.5\.0/);
assert.match(llms, /1\.4\.1/);
assert.match(llms, /1\.4\.0/);
assert.match(llms, /1\.3\.0/);
assert.match(llms, /\/v1\/bundle/);
assert.match(llms, /Aziel Eliab Runtime/);
assert.match(llms, /Aziel Digital Library/);
assert.match(llms, /Aziel Elroi Eliab/);

const openapi = await (await get("/openapi.json")).json();
assert.equal(openapi.info.title, "Aziel Eliab Runtime");
assert.equal(openapi.info.version, RUNTIME_VERSION);
assert.ok(openapi.paths["/v1/skill"]);
assert.ok(openapi.paths["/v1/runtime.json"]);
assert.ok(openapi.paths["/v1/ready"]);
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
assert.match(mcpBody.result.instructions, /runtime_run/);
assert.match(mcpBody.result.instructions, /display\.title/);
assert.match(mcpBody.result.instructions, /advanced\/internal/);
assert.equal(mcpBody.result.serverInfo.version, RUNTIME_VERSION);

const mcpList = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  }),
  env,
);
const mcpListBody = await mcpList.json();
const toolObjs = mcpListBody.result.tools;
const tools = toolObjs.map((t) => t.name);
const byName = Object.fromEntries(toolObjs.map((t) => [t.name, t]));
assert.ok(tools.includes("runtime_skill"));
assert.ok(tools.includes("runtime_run"));
assert.ok(tools.includes("runtime_manifest"));
assert.ok(tools.includes("runtime_bundle"));
assert.ok(tools.includes("runtime_pull"));
assert.ok(tools.includes("runtime_session_open"));
assert.ok(tools.includes("runtime_session_exec"));
assert.ok(tools.includes("godlock_submit"));
assert.ok(tools.includes("foldlock_fold-preview"));
assert.match(byName.runtime_run.description, /in-process engine|Use Aziel Eliab software/);
assert.match(byName.godlock_submit.description, /GodLock/);
assert.doesNotMatch(byName.godlock_submit.description, /JSON body posted/);
assert.doesNotMatch(byName["foldlock_fold-preview"].inputSchema.description || "", /JSON body posted/);
assert.match(byName["foldlock_fold-preview"].description, /FoldLock/);
assert.doesNotMatch(byName["foldlock_fold-preview"].description, /\[advanced\/internal\]/);
assert.match(byName.runtime_session_open.description, /\[advanced\/internal\]/);
assert.match(byName.runtime_session_exec.description, /\[advanced\/internal\]/);
assert.match(byName.runtime_manifest.description, /\[advanced\/internal\]/);
assert.match(byName.foldlock_health.description, /\[advanced\/internal\]/);
assert.match(byName.runtime_skill.description, /open a product|like software|next input/i);

async function mcpCall(name, args) {
  const res = await handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name, arguments: args } }),
    }),
    env,
  );
  return res.json();
}

const foldCall = await mcpCall("foldlock_fold-preview", { text: "the cat and the dog" });
assert.equal(foldCall.result.isError, false);
assert.ok(foldCall.result.structuredContent);
assert.ok(foldCall.result.structuredContent.display);
assert.match(foldCall.result.structuredContent.display.title, /FoldLock/);
assert.ok(foldCall.result.structuredContent.result);
assert.match(foldCall.result.content[0].text, /FoldLock|the cat/);

const runCall = await mcpCall("runtime_run", {
  slug: "azclce",
  op: "score",
  payload: { r: "login button blue", d: "login form submits", p: "login button submits" },
});
assert.equal(runCall.result.isError, false);
assert.ok(runCall.result.structuredContent.display.title);
assert.ok(runCall.result.structuredContent.result);
assert.ok(runCall.result.structuredContent.receipt);
assert.match(runCall.result.structuredContent.session_id || "", /^sess_/);

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /\/v1\/skill/);
assert.match(sitemap, /\/v1\/runtime\.json/);
assert.match(sitemap, /\/v1\/ready/);
assert.match(sitemap, /\/v1\/bundle/);
assert.match(sitemap, /\/v1\/pull\/foldlock\/skill/);
assert.match(sitemap, /\/sitemap-index\.xml/);

const sitemapIndex = await (await get("/sitemap-index.xml")).text();
assert.match(sitemapIndex, /<sitemapindex /);
assert.match(sitemapIndex, /azielcorpuslibrary\.net\/sitemap\.xml/);
assert.match(sitemapIndex, /godlock\.uk\/sitemap\.xml/);

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

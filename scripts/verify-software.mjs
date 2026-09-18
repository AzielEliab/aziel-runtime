/**
 * Software catalog sort law + client update check + plain use-purpose copy.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { BUILD_GIT_SHA } from "../src/build-meta.js";
import { embeddedDigest, trueEngineSlugs } from "../src/engines/digest.js";
import { NAMED_STUBS } from "../src/fraggate/registry.js";
import { SOFTWARE_COPY, softwareCopySlugs } from "../src/software-copy.js";
import { executeLocal } from "../src/engines/runner.js";
import { catalogExtraCards } from "../src/catalog-meta.js";
import {
  SOFTWARE_FRAMING,
  SOFTWARE_SORT_LAW,
  WORKER_ONLY_PRODUCTS,
  compareVersions,
  listSoftwareEntries,
  softwareBucket,
  softwareCatalog,
  sortSoftwareEntries,
  updateCheck,
  updateManifest,
} from "../src/software-catalog.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path) {
  return handler(new Request(origin + path), {});
}

assert.equal(softwareBucket("StaticClock", "staticclock"), "plain", "Clock ≠ Lock");
assert.equal(softwareBucket("ChronoLock", "chronolock"), "lock");
assert.equal(softwareBucket("DecisionGATE", "decisiongate"), "gate");
assert.equal(softwareBucket("FoldLock", "foldlock"), "lock");
assert.equal(softwareBucket("AZHub", "azhub"), "plain");
assert.equal(softwareBucket("EmbryoLock", "embryolock"), "lock");
assert.equal(softwareBucket("ForgeReceipts", "forgereceipts"), "plain");
assert.equal(softwareBucket("Glossa Filter", "glossafilter"), "plain");
assert.equal(softwareBucket("4DMap", "4dmap"), "plain");
assert.equal(softwareBucket("AZCoherence", "azcoherence"), "plain");
assert.equal(softwareBucket("Whitestone", "whitestone"), "plain");

const mixed = sortSoftwareEntries([
  { name: "VibeLock", bucket: "lock" },
  { name: "AZHub", bucket: "plain" },
  { name: "DecisionGATE", bucket: "gate" },
  { name: "StaticClock", bucket: "plain" },
  { name: "FoldLock", bucket: "lock" },
  { name: "The ARK", bucket: "plain" },
]);
assert.deepEqual(
  mixed.map((e) => e.name),
  ["AZHub", "StaticClock", "The ARK", "DecisionGATE", "FoldLock", "VibeLock"],
);

const entries = listSoftwareEntries(PRODUCTS, origin, { updated_at: "2026-09-06", git_sha: null });
assert.ok(entries.length === PRODUCTS.length + NAMED_STUBS.length + WORKER_ONLY_PRODUCTS.length);
assert.ok(entries.some((e) => e.slug === "embryolock" && e.status === "live" && e.local_destructive_boundary === true));
assert.ok(entries.every((e) => e.slug !== "fraggate"), "FragGate is the door, not a software card");
assert.equal(entries.filter((e) => e.status === "live").length, PRODUCTS.length - 1 + WORKER_ONLY_PRODUCTS.length);
assert.ok(entries.some((e) => e.slug === "veillock" && e.status === "local_only" && e.door === "none" && e.fraggate_status === "local_only"));
assert.equal(softwareBucket(entries.find((e) => e.slug === "staticclock").name, "staticclock"), "plain");

const buckets = entries.map((e) => e.bucket);
const firstGate = buckets.indexOf("gate");
const firstLock = buckets.indexOf("lock");
assert.ok(firstGate >= 0 && firstLock >= 0);
assert.ok(
  buckets.slice(0, firstGate).every((b) => b === "plain"),
  "plain block first",
);
assert.ok(
  buckets.slice(firstGate, firstLock).every((b) => b === "gate"),
  "gate block after plain",
);
assert.ok(
  buckets.slice(firstLock).every((b) => b === "lock"),
  "lock block last",
);

function assertAzSorted(slice) {
  const names = slice.map((e) => e.name);
  const sorted = names.slice().sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  assert.deepEqual(names, sorted);
}
assertAzSorted(entries.filter((e) => e.bucket === "plain"));
assertAzSorted(entries.filter((e) => e.bucket === "gate"));
assertAzSorted(entries.filter((e) => e.bucket === "lock"));

const catalog = softwareCatalog(origin, PRODUCTS, { runtimeVersion: RUNTIME_VERSION, updated_at: "2026-09-06" });
assert.equal(catalog.ok, true);
assert.equal(catalog.author, "Aziel Eliab");
assert.equal(catalog.identity, "Aziel Eliab");
assert.equal(catalog.author_id, "https://www.azieleliab.com/#aziel");
assert.equal(catalog.stats.person_id, "https://www.azieleliab.com/#aziel");
assert.equal(catalog.social_status.identity, "Aziel Eliab");
assert.ok(catalog.stats.hubs.some((h) => h.id === "azieleliab"));
assert.equal(catalog.door, "fraggate");
assert.equal(catalog.sort_law, SOFTWARE_SORT_LAW);
assert.match(catalog.framing, /one FragGate door/);
assert.match(catalog.framing, /Never separate FragGate engines/);
assert.doesNotMatch(catalog.framing, /are separate FragGate engines/);
assert.equal(SOFTWARE_FRAMING.includes("Never separate FragGate engines"), true);
assert.ok(
  catalog.software.some(
    (s) =>
      s.slug === "embryolock" &&
      s.status === "live" &&
      s.worker_home === "https://embryolock-download-tracker.vibelock.workers.dev/" &&
      s.download_url === "https://embryolock-download-tracker.vibelock.workers.dev/download",
  ),
);
const fold = catalog.software.find((s) => s.slug === "foldlock");
assert.equal(fold.bucket, "lock");
assert.equal(fold.status, "live");
assert.ok(fold.download_url.endsWith("/download"));
assert.ok(fold.worker_home.includes("foldlock-download-tracker"));
assert.ok(fold.agent.pipeline.includes("fraggate_list"));
const fourd = catalog.software.find((s) => s.slug === "4dmap");
assert.ok(fourd);
assert.equal(fourd.bucket, "plain");
assert.equal(fourd.status, "live");
assert.equal(fourd.worker_home, "https://4dmap-download-tracker.vibelock.workers.dev/");
assert.equal(fourd.mesh.enabled_default, true);
assert.equal(fourd.qns_cd.spec, "QNS-CD-1.0");
assert.ok(fold.mcp.endsWith("/mcp"));
assert.equal(fold.mesh.path, "/v1/mesh");
assert.equal(fold.mesh.enabled_default, true);
assert.ok(!catalog.software.some((s) => s.slug === "mesh"), "suite mesh is not a Softwares-tab product");
assert.ok(!catalog.software.some((s) => s.slug === "anon-broadcast"), "anon-broadcast is not a Softwares-tab product");
assert.ok(!catalog.software.some((s) => s.slug === "trades-runtime"), "trades-runtime is cite-only, not a Softwares-tab card");
assert.ok(catalog.sister_products.products.some((p) => p.slug === "trades-runtime" && p.engine === false && p.fraggate_call === false));
assert.match(catalog.count_note, /trades-runtime/);
assert.equal(catalog.mesh.enabled_default, true);
assert.equal(catalog.mesh.mesh_default, "on");
assert.equal(catalog.mesh.suite_presence, "on");
assert.equal(catalog.mesh.path, "/v1/mesh");
assert.equal(catalog.mesh.spec, "QNM-BUILD-1.0");
assert.equal(catalog.mesh.companion, "AIH-WP-1.1");
assert.equal(catalog.mesh.rollup_only, true);
assert.equal(catalog.mesh.qnm_s, false);
assert.ok(catalog.software.every((s) => s.qns_cd && s.qns_cd.spec === "QNS-CD-1.0"));
assert.ok(catalog.software.every((s) => s.qns_cd.local === "https://github.com/AzielEliab/qnm-node"));
assert.ok(!catalog.software.some((s) => s.slug === "qns" || s.slug === "qnsd"));
assert.ok(
  !catalog.software.some((s) => ["akm", "akm-triad", "adaptive-memory", "memory"].includes(s.slug)),
  "AKM-TRIAD-1.0 is LIVE fabric, not a Softwares-tab product",
);
assert.equal(catalog.qns_cd.spec, "QNS-CD-1.0");
assert.equal(catalog.mesh.qns_cd.spec, "QNS-CD-1.0");

assert.equal(compareVersions("0.7.0", "0.8.0") < 0, true);
assert.equal(compareVersions("0.8.0", "0.8.0"), 0);
assert.equal(compareVersions("2.6.2", "2.6.1") > 0, true);
assert.equal(compareVersions("v1.6.11", "1.6.12") < 0, true);
assert.equal(compareVersions("nope", "1.0.0"), null);

const older = updateCheck({ slug: "foldlock", version: "0.7.0" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(older.ok, true);
assert.equal(older.slug, "foldlock");
assert.equal(older.current, "0.7.0");
assert.equal(older.latest, "0.8.0");
assert.equal(older.update_available, true);
assert.ok(older.download_url.includes("foldlock"));

const current = updateCheck({ slug: "foldlock", version: "0.8.0" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(current.update_available, false);

const alias = updateCheck({ slug: "az-clce", version: "0.1.0" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(alias.slug, "azclce");
assert.equal(alias.update_available, true);

const embryo = updateCheck({ slug: "embryo-lock", version: "0.0.1" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(embryo.slug, "embryolock");
assert.equal(embryo.latest, "1.2.0");
assert.equal(embryo.update_available, true);
assert.equal(embryo.download_url, "https://embryolock-download-tracker.vibelock.workers.dev/download");
assert.match(embryo.notes, /EmbryoLock|1\.2\.0/i);

const runtime = updateCheck({ slug: "aziel-runtime", version: "1.6.11" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(runtime.slug, "aziel-runtime");
assert.equal(runtime.latest, RUNTIME_VERSION);
assert.equal(runtime.update_available, true);
assert.equal(runtime.download_url, `${origin}/download`);
assert.match(runtime.notes, /SLOT|suite pack/i);

const missing = updateCheck({ slug: "not-a-product", version: "1.0.0" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(missing.ok, false);
assert.equal(missing.status, 404);

const manifest = updateManifest(origin, PRODUCTS, { runtimeVersion: RUNTIME_VERSION });
assert.ok(manifest.latest.some((r) => r.slug === "foldlock" && r.latest === "0.8.0"));
assert.ok(manifest.latest.some((r) => r.slug === "embryolock" && r.status === "live"));
assert.ok(manifest.latest.some((r) => r.slug === "aziel-runtime" && r.latest === RUNTIME_VERSION));
assert.match(manifest.client_note, /install\.sh/);

const res = await get("/v1/software");
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.software.length, PRODUCTS.length + NAMED_STUBS.length + WORKER_ONLY_PRODUCTS.length);
assert.ok(body.software.some((s) => s.slug === "azchat" && s.status === "live" && s.domain_id === "07"));
assert.deepEqual(
  body.software.map((s) => s.slug),
  entries.map((s) => s.slug),
);
assert.equal(body.software[0].bucket, "plain");
assert.equal(body.software[body.software.length - 1].bucket, "lock");
assert.ok(body.software.some((s) => s.slug === "embryolock"));
assert.equal(body.git_sha, BUILD_GIT_SHA);
const liveCards = body.software.filter((s) => s.status === "live");
const localOnlyCards = body.software.filter((s) => s.status === "local_only");
const workerOnlyCards = body.software.filter((s) => s.worker_only);
const engineCards = [...liveCards, ...localOnlyCards].filter((s) => !s.worker_only);
assert.equal(liveCards.length, PRODUCTS.length - 1 + WORKER_ONLY_PRODUCTS.length);
assert.equal(localOnlyCards.length, 1);
assert.equal(body.live_count, PRODUCTS.length - 1 + WORKER_ONLY_PRODUCTS.length);
assert.equal(body.local_only_count, 1);
assert.equal(body.worker_only_count, WORKER_ONLY_PRODUCTS.length);
assert.ok(body.suite_download.endsWith("/download"));
for (const card of engineCards) {
  assert.match(card.engine_digest, /^[a-f0-9]{64}$/, `${card.slug} engine_digest`);
  assert.equal(card.engine_digest, embeddedDigest(card.slug), `${card.slug} digest matches health embed`);
}
assert.equal(engineCards.length, trueEngineSlugs().length);
assert.ok(workerOnlyCards.every((s) => s.engine_digest == null && s.engine === false && s.door === "none"));
assert.match(body.framing, /Never separate FragGate engines/);
assert.ok(body.software.every((s) => !/are separate FragGate engines/i.test(s.one_line || "")));
assert.equal(body.isolation_software_count, 33);
assert.deepEqual(body.tab_placement_slugs, [
  "azinterface",
  "decisiongate",
  "forgereceipts",
  "azcoherence",
  "zkattest",
  "mmconsensus",
  "toolbench",
  "azvpn",
  "whitestone",
]);
assert.match(body.count_note, /placements/);
assert.match(body.count_note, /software_count is 33/);
assert.equal(body.domains.software_count, 33);
assert.equal(body.domains.domains_are_doors, false);
assert.ok(body.website_designs);
assert.deepEqual(body.website_designs.ids, ["azcorpus", "azlibrary"]);
assert.equal(body.website_designs.software_tab, false);
assert.equal(body.website_designs.fraggate_slug, false);
assert.equal(body.website_designs.fifth_product, false);
assert.equal(body.website_designs.download_open, true);
assert.ok(body.software.every((s) => s.slug !== "azcorpus" && s.slug !== "azlibrary"));
const corpusCard = body.software.find((s) => s.slug === "aziel-corpus");
assert.deepEqual(corpusCard.website_designs, ["azcorpus", "azlibrary"]);
assert.equal(
  corpusCard.website_designs_cards.find((d) => d.id === "azlibrary").upload.method,
  "api_token_only",
);
assert.match(corpusCard.one_line, /azcorpus \+ azlibrary/);
assert.ok(body.count !== body.isolation_software_count, "Softwares-tab count is not the isolation 33");
const fourdLine = body.software.find((s) => s.slug === "4dmap").one_line;
assert.match(fourdLine, /Inspect the same event/i);
assert.match(fourdLine, /time, change, graph, and place/i);
assert.doesNotMatch(fourdLine, /Domain Door/);
assert.doesNotMatch(fourdLine, /THIS IS:/i);

assert.deepEqual(
  softwareCopySlugs().sort(),
  PRODUCTS.map((p) => p.slug).concat(WORKER_ONLY_PRODUCTS.map((p) => p.slug)).sort(),
);
assert.equal(body.software.length, softwareCopySlugs().length);
{
  const { SOFTWARE_FAQ_NAMES, softwaresFaqItems, ARK_ONE_LINE } = await import("../src/softwares-faq.js");
  assert.deepEqual(Object.keys(SOFTWARE_FAQ_NAMES).sort(), softwareCopySlugs().sort());
  const faqItems = softwaresFaqItems(origin);
  assert.equal(faqItems.length, softwareCopySlugs().length);
  const ark = faqItems.find((s) => s.slug === "ark");
  assert.equal(ark.name, "The ARK");
  assert.equal(ark.one_line, "Keep a local deniable vault; one phrase opens one vault.");
  assert.equal(ark.one_line, ARK_ONE_LINE);
  assert.equal(ark.one_line, SOFTWARE_COPY.ark.one_line);
  assert.equal(ark.url, "https://ark-download-tracker.vibelock.workers.dev/");
  assert.equal(ark.download_url, "https://ark-download-tracker.vibelock.workers.dev/download");
  const whiteFaq = faqItems.find((s) => s.slug === "whitestone");
  assert.ok(whiteFaq, "whitestone Softwares FAQ item");
  assert.equal(whiteFaq.name, "Whitestone");
  assert.equal(whiteFaq.url, "https://whitestone.vibelock.workers.dev/");
  assert.equal(whiteFaq.download_url, "https://whitestone.vibelock.workers.dev/download");
  assert.match(whiteFaq.one_line, /not a lawyer/i);
  assert.ok(faqItems.every((s) => s.name && s.one_line && s.url));
}
assert.ok(
  body.software.every((s) => String(s.one_line || "").trim().length > 0),
  "every Softwares card has a non-empty one_line",
);
assert.ok(
  body.software.every((s) => String(s.description || "").trim().length > 0),
  "every Softwares card has a non-empty description",
);
assert.ok(
  body.software.every((s) => !/THIS IS:|THIS IS NOT:/i.test(`${s.one_line} ${s.description}`)),
  "Softwares catalog copy has no THIS IS / THIS IS NOT template",
);
assert.ok(
  body.software.every((s) => /\bUse\b/.test(s.description) && /exists/i.test(s.description)),
  "every description names the job (Use) and why it exists",
);
assert.ok(body.software.every((s) => !/\b\b/.test(`${s.one_line} ${s.description}`)));
assert.ok(body.software.every((s) => !/10\.\d{4,}\//.test(`${s.one_line} ${s.description}`)), "no invented DOI in copy");
assert.ok(body.software.every((s) => !/are separate FragGate engines/i.test(s.description || "")));

const USE_PURPOSE = {
  azos: [/ethics status|ethics workspace/i],
  azai: [/local chat runtime|OpenAI-compatible/i],
  azbot: [/skill router/i],
  azieltether: [/downloaded packages|central Worker/i],
  staticclock: [/gear-click|plain clock/i],
  ark: [/local deniable vault/i, /one phrase opens one vault/i],
  "aziel-corpus": [/azcorpus \+ azlibrary/, /public library/i],
  godlock: [/product name/, /Aziel Eliab only/],
  azvpn: [/HTTPS|WebSocket/i, /public VPN concentrator/i],
  veillock: [/own device/i],
  embryolock: [/offline vault|local vault/i],
  azinterface: [/page cycles/i],
  whitestone: [/not a lawyer/i, /not legal advice/i, /ephemeral|session/i, /zip/i],
};
for (const [slug, patterns] of Object.entries(USE_PURPOSE)) {
  const card = body.software.find((s) => s.slug === slug);
  assert.ok(card, `${slug} catalog card`);
  const hay = `${card.one_line} ${card.description}`;
  for (const re of patterns) {
    assert.match(hay, re, `${slug} must keep use-purpose ${re}`);
  }
}
assert.equal(body.software.find((s) => s.slug === "veillock").local_only, true);
assert.equal(body.software.find((s) => s.slug === "veillock").door, "none");
assert.match(body.mesh.note, /worker_hardware:false/);
assert.match(SOFTWARE_COPY.godlock.description, /Aziel Eliab only/);
const extras = catalogExtraCards(origin);
const meshExtra = extras.find((e) => e.slug === "mesh" || e.name === "Quantum Node Mesh" || /QNM/.test(e.one_line || ""));
assert.ok(meshExtra, "mesh extras card exists");
assert.match(meshExtra.one_line, /worker_hardware:false/);
assert.match(meshExtra.one_line, /THIS IS NOT: a Softwares-tab product/);
assert.ok(!body.software.some((s) => s.slug === "hedidntjump" || s.slug === "he-didnt-jump"));

const azc = body.software.find((s) => s.slug === "azcoherence");
assert.ok(azc.cross_map);
assert.equal(azc.domain, null);
assert.ok(azc.peers.some((p) => p.slug === "azclce"));
const clce = body.software.find((s) => s.slug === "azclce");
assert.ok(clce.peers.some((p) => p.slug === "azcoherence"));
assert.match(clce.description, /AZ-CLCE/);
assert.match(clce.one_line, /three written layers/i);

const whitestone = body.software.find((s) => s.slug === "whitestone");
assert.ok(whitestone, "whitestone Softwares-tab card");
assert.equal(whitestone.name, "Whitestone");
assert.equal(whitestone.bucket, "plain");
assert.equal(whitestone.status, "live");
assert.equal(whitestone.fraggate_status, "none");
assert.equal(whitestone.door, "none");
assert.equal(whitestone.kind, "software");
assert.equal(whitestone.worker_only, true);
assert.equal(whitestone.engine, false);
assert.equal(whitestone.domain, null);
assert.equal(whitestone.placement, "pro-se-advisor");
assert.equal(whitestone.version, "1.4.0");
assert.equal(whitestone.worker_home, "https://whitestone.vibelock.workers.dev/");
assert.equal(whitestone.download_url, "https://whitestone.vibelock.workers.dev/download");
assert.equal(whitestone.github, "https://github.com/AzielEliab/Whitestone");
assert.equal(whitestone.engine_digest, null);
assert.equal(whitestone.agent.fraggate_call, null);
assert.match(whitestone.one_line, /not a lawyer/i);
assert.match(whitestone.description, /not legal advice/i);
assert.doesNotMatch(`${whitestone.one_line} ${whitestone.description}`, /THIS IS:/i);

const whiteCheck = updateCheck({ slug: "whitestone", version: "1.0.0" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(whiteCheck.ok, true);
assert.equal(whiteCheck.slug, "whitestone");
assert.equal(whiteCheck.latest, "1.4.0");
assert.equal(whiteCheck.update_available, true);
assert.equal(whiteCheck.download_url, "https://whitestone.vibelock.workers.dev/download");
assert.equal(whiteCheck.github, "https://github.com/AzielEliab/Whitestone");

const mirror = await get("/v1/fraggate/software");
assert.equal(mirror.status, 200);
const mirrored = await mirror.json();
assert.equal(mirrored.mirror_of, "/v1/software");
assert.equal(mirrored.software.length, body.software.length);

const checkRes = await get("/v1/update/check?slug=foldlock&version=0.7.0");
assert.equal(checkRes.status, 200);
const check = await checkRes.json();
assert.equal(check.update_available, true);
assert.equal(check.latest, "0.8.0");
assert.equal(check.current, "0.7.0");

const unknownRes = await get("/v1/update/check?slug=nope&version=1");
assert.equal(unknownRes.status, 404);

const manRes = await get("/v1/update/manifest");
assert.equal(manRes.status, 200);
const man = await manRes.json();
assert.ok(man.latest.length >= PRODUCTS.length);

const head = await handler(new Request(origin + "/v1/software", { method: "HEAD" }), {});
assert.equal(head.status, 200);
assert.equal(await head.text(), "");

const mcp = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "runtime_software", arguments: {} } }),
  }),
  {},
);
const mcpBody = await mcp.json();
assert.ok(mcpBody.result);
assert.match(JSON.stringify(mcpBody.result), /embryolock/);
assert.match(JSON.stringify(mcpBody.result), /azcorpus/);
assert.match(JSON.stringify(mcpBody.result), /azlibrary/);

const list = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  }),
  {},
);
const tools = (await list.json()).result.tools;
const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
assert.ok(byName.runtime_software);
assert.match(byName.fraggate_list.title, /Step 1/);
assert.match(byName.fraggate_describe.title, /Step 2/);
assert.match(byName.fraggate_call.title, /Step 3/);
assert.match(byName.fraggate_list.description, /\/v1\/software/);
assert.ok(tools.length <= 40);

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /\/v1\/software/);
assert.match(sitemap, /\/v1\/update\/check/);
assert.match(sitemap, /\/v1\/fraggate\/software/);

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /\/v1\/software/);
assert.match(llms, /update\/check/);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/v1/software"]);
assert.ok(openapi.paths["/v1/update/check"]);
assert.ok(openapi.paths["/v1/update/manifest"]);

for (const payload of [{}, { text: "" }, { text: "   " }, { text: null }]) {
  const refused = await executeLocal({ slug: "godlock", op: "submit", payload, ranIn: "aziel-runtime" });
  assert.equal(refused.status, 400, `godlock submit refuse ${JSON.stringify(payload)}`);
  const refusedBody = JSON.parse(refused.responseText);
  assert.equal(refusedBody.ok, false);
  assert.ok(refusedBody.receipt == null, "empty/null GodLock submit mints no receipt");
}

console.log(
  `ok software catalog: ${body.software.length} entries, sort ${SOFTWARE_SORT_LAW}, update check foldlock 0.7.0→0.8.0`,
);

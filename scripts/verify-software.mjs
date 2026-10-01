/**
 * Software catalog sort law + client update check + plain use-purpose copy.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION, runtimeManifest } from "../src/runtime-api.js";
import { BUILD_GIT_SHA } from "../src/build-meta.js";
import { embeddedDigest, trueEngineSlugs } from "../src/engines/digest.js";
import { LIVE_OPS, NAMED_STUBS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { previewCatalogAdmission } from "../src/fraggate/door.js";
import { SOFTWARE_COPY, softwareCopySlugs } from "../src/software-copy.js";
import { executeLocal } from "../src/engines/runner.js";
import { CATALOG_ALIASES, catalogExtraCards } from "../src/catalog-meta.js";
import {
  SOFTWARE_FRAMING,
  SOFTWARE_SORT_LAW,
  WORKER_ONLY_PRODUCTS,
  compareVersions,
  listSoftwareEntries,
  sanitizeVersionId,
  softwareBucket,
  softwareCatalog,
  softwareMeta,
  sortSoftwareEntries,
  updateCheck,
  updateManifest,
} from "../src/software-catalog.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path, env = {}) {
  return handler(new Request(origin + path), env);
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
assert.equal(CATALOG_ALIASES["case-mode"], "whitestone");
assert.equal(CATALOG_ALIASES.casemode, "whitestone");
assert.equal(CATALOG_ALIASES["pro-se"], "whitestone");

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
assert.equal(catalog.primary_host, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
assert.equal(catalog.homepage, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
assert.equal(catalog.host, `${origin}/`);
assert.equal(catalog.library_mirror, "https://www.azielcorpuslibrary.net/runtime");
assert.ok(
  catalog.software.every(
    (s) =>
      s.host === catalog.primary_host &&
      s.homepage === catalog.homepage &&
      s.primary_host === catalog.primary_host,
  ),
);
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
for (const card of catalog.software) {
  assert.equal(typeof card.slug, "string", "catalog card slug");
  assert.equal(typeof card.name, "string", `${card.slug} name`);
  assert.match(String(card.bucket), /^(plain|gate|lock)$/, `${card.slug} bucket`);
  assert.match(String(card.status), /^(live|stub|local_only)$/, `${card.slug} status`);
  assert.equal(typeof card.one_line, "string", `${card.slug} one_line`);
  assert.ok(card.one_line.length > 8, `${card.slug} one_line too thin`);
  assert.equal(typeof card.description, "string", `${card.slug} description`);
  assert.doesNotMatch(card.one_line, /THIS IS NOT:/);
  assert.doesNotMatch(card.description, /THIS IS NOT:/);
}
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
assert.equal(catalog.count, 42);
assert.equal(catalog.catalog_sets.equate, false);
assert.equal(catalog.catalog_sets.intentional_split, true);
assert.equal(catalog.catalog_sets.same_count_not_same_set, true);
assert.equal(catalog.catalog_sets.softwares_count, 42);
assert.equal(catalog.catalog_sets.fraggate_product_count, 43);
assert.equal(catalog.catalog_sets.software_nodes_fanout_count, PRODUCTS.length);
assert.equal(catalog.catalog_sets.fraggate_allowlist_count, catalog.catalog_sets.softwares_count);
assert.deepEqual(catalog.catalog_sets.softwares_not_on_allowlist, ["veillock", "whitestone"]);
assert.deepEqual(catalog.catalog_sets.allowlist_not_on_softwares, ["memory", "mesh"]);
assert.deepEqual(catalog.catalog_sets.softwares_not_in_registry, ["whitestone"]);
assert.deepEqual(catalog.catalog_sets.registry_not_on_softwares, ["memory", "mesh"]);
assert.deepEqual(catalog.catalog_sets.softwares_not_in_software_nodes, ["whitestone"]);
assert.deepEqual(catalog.catalog_sets.software_nodes_not_on_softwares, []);
assert.match(catalog.count_note, /catalog_sets\.equate is false/);
assert.match(catalog.mesh.software_nodes_note, /Whitestone is a Softwares card and is absent/);
assert.equal(catalog.sister_products.products.find((p) => p.slug === "trades-runtime").version, "0.4.9");
assert.deepEqual(catalog.catalog_sets, runtimeManifest(origin, PRODUCTS).catalog_sets);
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
const bareCheck = updateCheck({}, origin, PRODUCTS, { runtimeVersion: RUNTIME_VERSION });
assert.equal(bareCheck.ok, false);
assert.equal(bareCheck.status, 400);
assert.equal(bareCheck.error, "slug required");
assert.match(bareCheck.hint, /slug=\{slug\}/);

const manifest = updateManifest(origin, PRODUCTS, { runtimeVersion: RUNTIME_VERSION });
assert.ok(manifest.latest.some((r) => r.slug === "foldlock" && r.latest === "0.8.0"));
assert.ok(manifest.latest.some((r) => r.slug === "embryolock" && r.status === "live"));
assert.ok(manifest.latest.some((r) => r.slug === "aziel-runtime" && r.latest === RUNTIME_VERSION));
assert.match(manifest.client_note, /install\.sh/);

const res = await get("/v1/software");
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.primary_host, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
assert.equal(body.homepage, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
assert.equal(body.host, `${origin}/`);
assert.equal(body.library_mirror, "https://www.azielcorpuslibrary.net/runtime");
assert.ok(body.software.every((s) => s.host === body.primary_host && s.homepage === body.homepage));
assert.equal(body.software.length, PRODUCTS.length + NAMED_STUBS.length + WORKER_ONLY_PRODUCTS.length);
assert.ok(body.software.some((s) => s.slug === "azchat" && s.status === "live" && s.domain_id === "07"));
const azchatCard = body.software.find((s) => s.slug === "azchat");
assert.match(azchatCard.one_line, /all-rooms list/);
assert.match(azchatCard.one_line, /passphrase/);
assert.match(azchatCard.description, /room you host/);
assert.match(azchatCard.description, /AZChat product contract/);
assert.deepEqual(
  body.software.map((s) => s.slug),
  entries.map((s) => s.slug),
);
assert.equal(body.software[0].bucket, "plain");
assert.equal(body.software[body.software.length - 1].bucket, "lock");
assert.ok(body.software.some((s) => s.slug === "embryolock"));
assert.equal(body.git_sha, BUILD_GIT_SHA);
assert.equal(body.updated_at, "2026-09-30");
assert.ok(body.software.every((s) => s.updated_at === "2026-09-30"));
assert.match(body.update_check, /\/v1\/update\/check\?slug=\{slug\}&version=\{installed\}$/);
assert.equal(body.count, 42);
assert.equal(body.software.some((card) => card.slug === "jeeves" || card.slug === "ask-jeeves"), false);
assert.equal(body.version_id, null);
assert.equal(body.version_id_source, null);
assert.match(body.version_id_note, /does not expose version_id/);
assert.equal(sanitizeVersionId("ffd469b4-2d65-47f7-948e-04a0be007caf"), "ffd469b4-2d65-47f7-948e-04a0be007caf");
assert.equal(sanitizeVersionId(BUILD_GIT_SHA), null);
assert.equal(sanitizeVersionId("not-a-version"), null);
const liveVersion = "11111111-2222-4333-8444-555555555555";
const staleVersion = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const boundMeta = softwareMeta({
  CF_VERSION_METADATA: { id: liveVersion, tag: BUILD_GIT_SHA, timestamp: "2026-09-26T00:00:00.000Z" },
  VERSION_ID: staleVersion,
});
assert.equal(boundMeta.version_id, liveVersion);
assert.equal(boundMeta.version_id_source, "cf_version_metadata");
assert.equal(boundMeta.git_sha, BUILD_GIT_SHA);
assert.equal(boundMeta.updated_at, "2026-09-26");
assert.equal(
  softwareMeta(
    {
      UPDATED_AT: "2026-09-30T12:29:07Z",
      CF_VERSION_METADATA: { timestamp: "2026-09-26T00:00:00.000Z" },
    },
    { updated_at: "2026-09-14" },
  ).updated_at,
  "2026-09-30",
);
assert.equal(softwareMeta({}, { updated_at: "2026-09-14" }).updated_at, "2026-09-14");
const varOnly = softwareMeta({ VERSION_ID: staleVersion });
assert.equal(varOnly.version_id, staleVersion);
assert.equal(varOnly.version_id_source, "version_id_var");
assert.equal(softwareMeta({ VERSION_ID: "invented" }).version_id, null);
assert.equal(softwareMeta({}).version_id, null);
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
assert.match(corpusCard.one_line, /Ask Jeeves/);
assert.equal(corpusCard.suite_help.software_tab, false);
assert.equal(corpusCard.suite_help.slug, "jeeves");
assert.equal(corpusCard.suite_help.fraggate_op, "jeeves");
assert.equal(body.software.some((s) => s.slug === "jeeves" || s.slug === "askjeeves"), false);
assert.match(body.count_note, /Ask Jeeves is suite help/);
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
  assert.equal(whiteFaq.url, "https://whitestone-download-tracker.vibelock.workers.dev/");
  assert.equal(whiteFaq.download_url, "https://whitestone-download-tracker.vibelock.workers.dev/download");
  assert.match(whiteFaq.one_line, /Case Mode/i);
  assert.match(whiteFaq.one_line, /whitestone\.vibelock\.workers\.dev/);
  assert.doesNotMatch(whiteFaq.one_line, /not a lawyer/i);
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
  body.software.every(
    (s) => !/never invent|this is not|needs verified|\bunverified\b|without inventing/i.test(`${s.one_line} ${s.description}`),
  ),
  "Softwares purpose copy has no never-invent / this-is-not / verified-status marketing",
);
assert.ok(
  body.software.every((s) => !/\b(?:SLOT|REAL)\b/.test(`${s.one_line} ${s.description}`)),
  "Softwares purpose blurbs omit SLOT/REAL status tags",
);
assert.ok(
  body.software.every((s) => /\bUse\b/.test(s.description) && /exists/i.test(s.description)),
  "every description names the job (Use) and why it exists",
);
assert.ok(body.software.every((s) => !/\bfielded_100\b/.test(`${s.one_line} ${s.description}`)));
assert.ok(body.software.every((s) => !/10\.\d{4,}\//.test(`${s.one_line} ${s.description}`)), "no invented DOI in copy");
assert.ok(body.software.every((s) => !/are separate FragGate engines/i.test(s.description || "")));

const USE_PURPOSE = {
  azos: [/ethics status|ethics workspace/i],
  azai: [/OpenAI-compatible|Lamb Lens|adaptive Guide|Lamb ethics/i],
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
  whitestone: [
    /ephemeral|session/i,
    /zip/i,
    /Case Mode/i,
    /historical as-of/i,
    /TrajectoryLock/i,
    /75%/,
    /whitestone\.vibelock\.workers\.dev/,
  ],
};
for (const [slug, patterns] of Object.entries(USE_PURPOSE)) {
  const card = body.software.find((s) => s.slug === slug);
  assert.ok(card, `${slug} catalog card`);
  const hay = `${card.one_line} ${card.description}`;
  for (const re of patterns) {
    assert.match(hay, re, `${slug} must keep use-purpose ${re}`);
  }
}
const veilCard = body.software.find((s) => s.slug === "veillock");
assert.equal(veilCard.local_only, true);
assert.equal(veilCard.door, "none");
assert.equal(veilCard.public_door, false);
assert.deepEqual(veilCard.public_door_ops, []);
assert.equal(veilCard.open_live_door, false);
assert.equal(veilCard.agent.open_live_door, false);
assert.equal(veilCard.agent.fraggate_call_executes, false);
assert.match(veilCard.agent.pipeline, /FG-LOCAL-ONLY/);
assert.match(veilCard.door_label, /no public FragGate door/);
const embryoCard = body.software.find((s) => s.slug === "embryolock");
assert.equal(embryoCard.public_door, true);
assert.equal(embryoCard.open_live_door, true);
assert.ok(embryoCard.public_door_ops.includes("limitation"));
assert.ok(embryoCard.stub_ops.includes("wipe"));
assert.ok(embryoCard.stub_ops.includes("unlock"));
assert.ok(!embryoCard.public_door_ops.includes("wipe"));
const mgCard = body.software.find((s) => s.slug === "miragegrid");
assert.equal(mgCard.slug, "miragegrid");
assert.match(mgCard.one_line, /short-lived session node/);
assert.match(mgCard.one_line, /Cap-7 mesh-name metadata/);
assert.match(mgCard.one_line, /not a public ICANN registrar/);
assert.match(mgCard.one_line, /Cap-7 geo, sticky session, and land rotation are LIVE on the Cap-7 plane, not a public egress IP\./);
assert.doesNotMatch(mgCard.one_line, /stub refuse today|planned; stub refuse/);
assert.match(mgCard.description, /not a public ICANN registrar/);
assert.match(mgCard.description, /LIVE on the Cap-7 plane/);
assert.match(mgCard.description, /not a public egress IP/);
assert.match(mgCard.description, /AZVPN/);
assert.match(mgCard.description, /MirageGrid pull request 28 has landed/);
assert.match(mgCard.description, /6d0bd3471e29af5ad8ab37573bb4ac9ff0b21dcb/);
assert.match(mgCard.description, /in-process engine/);
assert.doesNotMatch(mgCard.description, /stays unclaimed/);
assert.doesNotMatch(`${mgCard.one_line} ${mgCard.description}`, /node-mesh VPN|anonymity network|packet mesh|SOCKS5|hosted VPN/i);
assert.deepEqual(mgCard.public_door_ops, [
  "assign",
  "verify-receipt",
  "nodes",
  "bridge",
  "shuffle",
  "health",
  "skill",
  "doctor",
  "geo-target",
  "session-stick",
  "egress-rotate",
]);
const mgStubs = ["vpn-hop", "hop", "tunnel", "mesh"];
const mgLivePlane = ["geo-target", "session-stick", "egress-rotate"];
assert.deepEqual(STUB_OPS.miragegrid.slice(), mgStubs);
assert.deepEqual(LIVE_OPS.miragegrid.slice(), mgCard.public_door_ops);
for (const op of mgStubs) {
  assert.ok(mgCard.stub_ops.includes(op), `miragegrid stub ${op}`);
  assert.ok(!mgCard.public_door_ops.includes(op), `miragegrid live must omit ${op}`);
  assert.equal(classifyCall(buildRegistry(PRODUCTS).bySlug.miragegrid, op).kind, "stub", op);
}
for (const op of mgLivePlane) {
  assert.ok(mgCard.public_door_ops.includes(op), `miragegrid live ${op}`);
  assert.ok(!mgCard.stub_ops.includes(op), `miragegrid stub must omit ${op}`);
  assert.equal(classifyCall(buildRegistry(PRODUCTS).bySlug.miragegrid, op).kind, "live", op);
}
const mgHealth = await executeLocal({ slug: "miragegrid", op: "health", payload: {}, ranIn: "aziel-runtime" });
const mgHealthBody = JSON.parse(mgHealth.responseText);
assert.equal(mgHealthBody.public_icann_registrar, false);
assert.equal(mgHealthBody.vpn, false);
assert.equal(mgHealthBody.anonymity_network, false);
assert.equal(mgHealthBody.packet_mesh, false);
assert.equal(mgHealthBody.cap7_plane.live, true);
assert.equal(mgHealthBody.cap7_plane.status, "live");
assert.equal(mgHealthBody.cap7_plane.public_egress_ip, false);
assert.equal(mgHealthBody.cap7_plane.public_icann, false);
assert.equal(mgHealthBody.cap7_plane.azvpn, false);
assert.equal(mgHealthBody.cap7_plane.worker_live, false);
assert.equal(mgHealthBody.cap7_plane.worker_doors_live, true);
assert.equal(mgHealthBody.cap7_plane.hosted, false);
assert.equal(mgHealthBody.cap7_plane.miragegrid_pr_landed, true);
assert.equal(mgHealthBody.cap7_plane.miragegrid_pr_merge, "6d0bd3471e29af5ad8ab37573bb4ac9ff0b21dcb");
assert.equal(mgHealthBody.cap7_plane.factory_exec, true);
assert.equal(mgHealthBody.hub_mirror_count, 4);
assert.equal(mgHealthBody.decoy_count, 3);
assert.equal(mgHealthBody.per_node_aziel_slots, false);
assert.equal(mgHealthBody.author, "Aziel Eliab");
const mgSkill = await executeLocal({ slug: "miragegrid", op: "skill", payload: {}, ranIn: "aziel-runtime" });
const mgSkillBody = JSON.parse(mgSkill.responseText);
assert.match(mgSkillBody.markdown, /not a public ICANN registrar/);
assert.match(mgSkillBody.markdown, /geo-target, session-stick, and egress-rotate are LIVE on the Cap-7 plane/);
assert.match(mgSkillBody.markdown, /not a public egress IP/);
assert.match(mgSkillBody.markdown, /FG-STUB/);
assert.match(mgSkillBody.markdown, /not the QNM suite mesh/);
assert.match(mgSkillBody.markdown, /Aziel Eliab only/);
assert.doesNotMatch(mgSkillBody.markdown, /true node-mesh VPN|SOCKS5/);
assert.ok(mgSkillBody.live_ops.includes("geo-target"));
assert.ok(mgSkillBody.live_ops.includes("session-stick"));
assert.ok(mgSkillBody.live_ops.includes("egress-rotate"));
assert.ok(mgSkillBody.stub_ops.includes("vpn-hop"));
assert.ok(!mgSkillBody.stub_ops.includes("egress-rotate"));
const mgAssign = await executeLocal({ slug: "miragegrid", op: "assign", payload: {}, ranIn: "aziel-runtime" });
const mgAssignBody = JSON.parse(mgAssign.responseText);
assert.equal(mgAssignBody.kind, "control-plane-assign");
assert.match(mgAssignBody.banner, /not a public ICANN registrar/);
assert.match(mgAssignBody.banner, /LIVE on the Cap-7 plane, not a public egress IP/);
assert.doesNotMatch(mgAssignBody.banner, /stub refuse today/);
assert.doesNotMatch(mgAssignBody.banner, /true node-mesh VPN|anonymity network|SOCKS5/);
const geo = JSON.parse(
  (await executeLocal({ slug: "miragegrid", op: "geo-target", payload: { region: "booth-east" }, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(geo.ok, true);
assert.equal(geo.code, "CAP7-GEO-TARGET");
assert.equal(geo.public_egress_ip, false);
assert.equal(geo.egress_ip, null);
assert.equal(geo.public_icann, false);
assert.equal(geo.azvpn, false);
assert.equal(geo.geo_applied, false);
assert.equal(geo.packet_forwarding, false);
assert.equal(geo.hosted_vpn, false);
assert.equal(geo.worker_live, false);
assert.equal(geo.worker_doors_live, true);
assert.equal(geo.hosted, false);
assert.equal(geo.miragegrid_pr_landed, true);
assert.equal(geo.miragegrid_pr_merge, "6d0bd3471e29af5ad8ab37573bb4ac9ff0b21dcb");
const geoIp = JSON.parse(
  (await executeLocal({ slug: "miragegrid", op: "geo-target", payload: { region: "203.0.113.8" }, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(geoIp.ok, false);
assert.equal(geoIp.code, "MG-NOT-PUBLIC-EGRESS");
assert.notEqual(geoIp.code, "FG-STUB");
const stick = JSON.parse(
  (await executeLocal({ slug: "miragegrid", op: "session-stick", payload: { sticky_key: "booth-1" }, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(stick.ok, true);
assert.equal(stick.node_id, "node-21");
assert.equal(stick.sticky_ip, false);
assert.equal(stick.egress_ip, null);
assert.equal(stick.public_icann, false);
const stickAgain = JSON.parse(
  (await executeLocal({ slug: "miragegrid", op: "session-stick", payload: { sticky_key: "booth-1" }, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(stickAgain.node_id, stick.node_id);
assert.equal(stickAgain.land.id, stick.land.id);
const stickIp = JSON.parse(
  (await executeLocal({ slug: "miragegrid", op: "session-stick", payload: { sticky_key: "booth-1", sticky_ip: true }, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(stickIp.code, "MG-NOT-PUBLIC-EGRESS");
const rot = JSON.parse(
  (await executeLocal({ slug: "miragegrid", op: "egress-rotate", payload: { prev: "azgrid" }, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(rot.ok, true);
assert.equal(rot.from, "azgrid");
assert.equal(rot.land.id, "azbooth");
assert.equal(rot.public_egress_ip, false);
assert.equal(rot.icann_publish, false);
assert.equal(rot.packet_forwarding, false);
const mgRegistry = buildRegistry(PRODUCTS);
const dryGeo = previewCatalogAdmission({ slug: "miragegrid", op: "geo-target", dry_run: true }, mgRegistry, mgRegistry.bySlug);
assert.equal(dryGeo.proceed, true);
const dryStick = previewCatalogAdmission({ slug: "miragegrid", op: "session-stick", dry_run: true }, mgRegistry, mgRegistry.bySlug);
assert.equal(dryStick.proceed, true);
const dryRot = previewCatalogAdmission({ slug: "miragegrid", op: "egress-rotate", dry_run: true }, mgRegistry, mgRegistry.bySlug);
assert.equal(dryRot.proceed, true);
const dryHop = previewCatalogAdmission({ slug: "miragegrid", op: "vpn-hop", dry_run: true }, mgRegistry, mgRegistry.bySlug);
assert.equal(dryHop.proceed, false);
assert.equal(dryHop.envelope.code, "FG-STUB");
const runtimeSkill = await (await get("/v1/skill")).text();
assert.match(runtimeSkill, /not a public ICANN registrar/);
assert.match(runtimeSkill, /geo-target, session-stick, egress-rotate/);
assert.match(azchatCard.one_line, /mesh hop starts off/);
assert.equal(azchatCard.mesh_default, "off");
assert.equal(azchatCard.public_door, true);
const whiteCard = body.software.find((s) => s.slug === "whitestone");
assert.equal(whiteCard.public_door, false);
assert.equal(whiteCard.open_live_door, false);
assert.match(whiteCard.door_label, /FragGate status none/);
assert.equal(body.count, 42);
assert.match(body.mesh.note, /worker_hardware:false/);
assert.match(SOFTWARE_COPY.godlock.description, /Aziel Eliab only/);
const extras = catalogExtraCards(origin);
const meshExtra = extras.find((e) => e.slug === "mesh" || e.name === "Quantum Node Mesh" || /QNM/.test(e.one_line || ""));
assert.ok(meshExtra, "mesh extras card exists");
assert.match(meshExtra.one_line, /worker_hardware:false/);
assert.match(meshExtra.one_line, /QNM-BUILD-1\.0/);
assert.doesNotMatch(meshExtra.one_line, /THIS IS NOT:/);
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
assert.equal(whitestone.version, "1.6.0");
assert.equal(whitestone.worker_home, "https://whitestone-download-tracker.vibelock.workers.dev/");
assert.equal(whitestone.download_url, "https://whitestone-download-tracker.vibelock.workers.dev/download");
assert.equal(whitestone.web_app, "https://whitestone.vibelock.workers.dev/");
assert.equal(whitestone.github, "https://github.com/AzielEliab/Whitestone");
assert.equal(whitestone.engine_digest, null);
assert.equal(whitestone.agent.fraggate_call, null);
assert.match(whitestone.one_line, /Case Mode/i);
assert.match(whitestone.one_line, /whitestone\.vibelock\.workers\.dev/);
assert.match(whitestone.description, /historical as-of/i);
assert.match(whitestone.description, /TrajectoryLock/i);
assert.match(whitestone.note, /Case Mode is a product feature/i);
assert.doesNotMatch(`${whitestone.one_line} ${whitestone.description}`, /not a lawyer|not legal advice/i);
assert.doesNotMatch(`${whitestone.one_line} ${whitestone.description}`, /THIS IS:/i);

const whiteCheck = updateCheck({ slug: "whitestone", version: "1.0.0" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(whiteCheck.ok, true);
assert.equal(whiteCheck.slug, "whitestone");
assert.equal(whiteCheck.latest, "1.6.0");
assert.equal(updateCheck({ slug: "case-mode", version: "1.0.0" }, origin, PRODUCTS, { runtimeVersion: RUNTIME_VERSION }).slug, "whitestone");
assert.equal(whiteCheck.update_available, true);
assert.equal(whiteCheck.download_url, "https://whitestone-download-tracker.vibelock.workers.dev/download");
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
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "Softwares", arguments: {} } }),
  }),
  {},
);
const mcpBody = await mcp.json();
assert.ok(mcpBody.result);
assert.notEqual(mcpBody.result.isError, true);
assert.match(JSON.stringify(mcpBody.result), /embryolock/);
assert.match(JSON.stringify(mcpBody.result), /azcorpus/);
assert.match(JSON.stringify(mcpBody.result), /azlibrary/);

const softwareAlias = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 11, method: "tools/call", params: { name: "runtime_software", arguments: {} } }),
  }),
  {},
);
const softwareAliasBody = await softwareAlias.json();
assert.notEqual(softwareAliasBody.result.isError, true);
assert.match(JSON.stringify(softwareAliasBody.result), /embryolock/);

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
assert.ok(byName.Softwares);
assert.equal(byName.runtime_software, undefined);
assert.equal(tools.length, 36);
assert.match(byName.fraggate_list.title, /Step 1/);
assert.match(byName.fraggate_describe.title, /Step 2/);
assert.match(byName.fraggate_call.title, /Step 3/);
assert.match(byName.fraggate_list.description, /\/v1\/software/);
assert.ok(tools.length <= 40);

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /\/v1\/software/);
assert.match(sitemap, /\/v1\/update\/check\?slug=aziel-runtime/);
assert.match(sitemap, /\/v1\/fraggate\/software/);

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /\/v1\/software/);
assert.match(llms, /update\/check\?slug=\{slug\}/);
assert.match(llms, /public GET \/v1\/manifest is not a path/);
assert.match(llms, /tools\/list name Softwares/);
assert.match(llms, /^version_id: null$/m);
assert.match(llms, /^version_id_source: unbound$/m);
assert.match(llms, /not a public ICANN registrar/);
assert.match(llms, /geo-target, session-stick, egress-rotate/);
assert.match(llms, /LIVE on the Cap-7 plane/);
assert.match(llms, /not a public egress IP/);
assert.doesNotMatch(llms, /stub refuse today/);
assert.doesNotMatch(llms, /true node-mesh VPN|userspace SOCKS5/);
const cite = await (await get("/cite.json")).json();
assert.equal(cite.suite_tip.version_id, null);
assert.match(cite.suite_tip.version_id_note, /does not expose version_id/);
assert.match(cite.update_check, /slug=\{slug\}/);
const boundEnv = {
  CF_VERSION_METADATA: { id: liveVersion, tag: "not-a-sha", timestamp: "2026-09-26T00:00:00.000Z" },
  VERSION_ID: staleVersion,
  GIT_SHA: BUILD_GIT_SHA,
};
const boundSoftware = await (await get("/v1/software", boundEnv)).json();
assert.equal(boundSoftware.count, 42);
assert.equal(boundSoftware.version_id, liveVersion);
assert.equal(boundSoftware.version_id_source, "cf_version_metadata");
assert.equal(boundSoftware.updated_at, "2026-09-26");
assert.ok(boundSoftware.software.every((s) => s.updated_at === "2026-09-26"));
assert.match(boundSoftware.update_check, /slug=\{slug\}/);
assert.equal(boundSoftware.software.some((card) => card.slug === "jeeves" || card.slug === "ask-jeeves"), false);
const boundLlms = await (await get("/llms.txt", boundEnv)).text();
assert.match(boundLlms, new RegExp(`^version_id: ${liveVersion}$`, "m"));
assert.match(boundLlms, /^version_id_source: cf_version_metadata$/m);
assert.doesNotMatch(boundLlms, new RegExp(staleVersion));
const boundCite = await (await get("/cite.json", boundEnv)).json();
assert.equal(boundCite.suite_tip.version_id, liveVersion);
assert.equal(boundCite.suite_tip.softwares_count, 42);
assert.equal(boundCite.suite_tip.version_id_source, "cf_version_metadata");

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/v1/software"]);
assert.ok(openapi.paths["/v1/update/check"]);
assert.equal(openapi.paths["/v1/update/check"].get.parameters.find((p) => p.name === "slug").required, true);
assert.ok(openapi.paths["/v1/update/check"].get.responses["400"]);
assert.equal(openapi.paths["/v1/manifest"], undefined);
assert.ok(openapi.paths["/v1/update/manifest"]);
assert.ok(openapi.paths["/v1/runtime.json"]);

const bareHttp = await get("/v1/update/check");
assert.equal(bareHttp.status, 400);
const bareBody = await bareHttp.json();
assert.equal(bareBody.error, "slug required");
assert.match(bareBody.hint, /slug=\{slug\}/);
const knownCheck = await get("/v1/update/check?slug=aziel-runtime");
assert.equal(knownCheck.status, 200);
const knownBody = await knownCheck.json();
assert.equal(knownBody.ok, true);
assert.equal(knownBody.slug, "aziel-runtime");

const manifestGone = await get("/v1/manifest");
assert.equal(manifestGone.status, 404);
const goneBody = await manifestGone.json();
assert.equal(goneBody.ok, false);
assert.equal(goneBody.live, false);
assert.equal(goneBody.error, "not a public path");
assert.match(goneBody.machine_manifest, /\/v1\/runtime\.json$/);
assert.match(goneBody.hint, /runtime_manifest/);
assert.match(goneBody.hint, /\/v1\/software/);

const health = await (await get("/v1/health")).json();
assert.match(health.update_check, /slug=\{slug\}/);
const mcpCard = await (await get("/mcp")).json();
assert.match(mcpCard.update_check, /slug=\{slug\}/);

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

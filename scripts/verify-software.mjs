/**
 * Software catalog sort law + client update check.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { NAMED_STUBS } from "../src/fraggate/registry.js";
import {
  SOFTWARE_FRAMING,
  SOFTWARE_SORT_LAW,
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
assert.ok(entries.length === PRODUCTS.length + NAMED_STUBS.length);
assert.ok(entries.some((e) => e.slug === "embryolock" && e.status === "stub"));
assert.ok(entries.every((e) => e.slug !== "fraggate"), "FragGate is the door, not a software card");
assert.equal(entries.filter((e) => e.status === "live").length, PRODUCTS.length);
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
assert.equal(catalog.door, "fraggate");
assert.equal(catalog.sort_law, SOFTWARE_SORT_LAW);
assert.match(catalog.framing, /one FragGate door/);
assert.match(catalog.framing, /Never separate FragGate engines/);
assert.doesNotMatch(catalog.framing, /are separate FragGate engines/);
assert.equal(SOFTWARE_FRAMING.includes("Never separate FragGate engines"), true);
assert.ok(catalog.software.some((s) => s.slug === "embryolock" && s.download_url === null));
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
assert.equal(fourd.mesh.enabled_default, false);
assert.equal(fourd.qns_cd.spec, "QNS-CD-1.0");
assert.ok(fold.mcp.endsWith("/mcp"));
assert.equal(fold.mesh.path, "/v1/mesh");
assert.equal(fold.mesh.enabled_default, false);
assert.ok(!catalog.software.some((s) => s.slug === "mesh"), "suite mesh is not a Softwares-tab product");
assert.ok(!catalog.software.some((s) => s.slug === "anon-broadcast"), "anon-broadcast is not a Softwares-tab product");
assert.equal(catalog.mesh.enabled_default, false);
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
assert.equal(embryo.update_available, false);
assert.equal(embryo.download_url, null);
assert.match(embryo.notes, /stub/i);

const runtime = updateCheck({ slug: "aziel-runtime", version: "1.6.11" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(runtime.slug, "aziel-runtime");
assert.equal(runtime.latest, RUNTIME_VERSION);
assert.equal(runtime.update_available, true);
assert.equal(runtime.download_url, null);

const missing = updateCheck({ slug: "not-a-product", version: "1.0.0" }, origin, PRODUCTS, {
  runtimeVersion: RUNTIME_VERSION,
});
assert.equal(missing.ok, false);
assert.equal(missing.status, 404);

const manifest = updateManifest(origin, PRODUCTS, { runtimeVersion: RUNTIME_VERSION });
assert.ok(manifest.latest.some((r) => r.slug === "foldlock" && r.latest === "0.8.0"));
assert.ok(manifest.latest.some((r) => r.slug === "embryolock" && r.status === "stub"));
assert.ok(manifest.latest.some((r) => r.slug === "aziel-runtime" && r.latest === RUNTIME_VERSION));
assert.match(manifest.client_note, /install\.sh/);

const res = await get("/v1/software");
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.software.length, PRODUCTS.length + NAMED_STUBS.length);
assert.ok(body.software.some((s) => s.slug === "azchat" && s.status === "stub" && s.domain_id === "07"));
assert.deepEqual(
  body.software.map((s) => s.slug),
  entries.map((s) => s.slug),
);
assert.equal(body.software[0].bucket, "plain");
assert.equal(body.software[body.software.length - 1].bucket, "lock");
assert.ok(body.software.some((s) => s.slug === "embryolock"));
assert.match(body.framing, /Never separate FragGate engines/);
assert.ok(body.software.every((s) => !/are separate FragGate engines/i.test(s.one_line || "")));
assert.equal(body.isolation_software_count, 33);
assert.deepEqual(body.tab_placement_slugs, ["azinterface", "decisiongate", "forgereceipts"]);
assert.match(body.count_note, /placements/);
assert.match(body.count_note, /software_count is 33/);
assert.equal(body.domains.software_count, 33);
assert.equal(body.domains.domains_are_doors, false);
assert.ok(body.count !== body.isolation_software_count, "Softwares-tab count is not the isolation 33");
const fourdLine = body.software.find((s) => s.slug === "4dmap").one_line;
assert.match(fourdLine, /inspection frame/i);
assert.match(fourdLine, /not an extra door/i);
assert.doesNotMatch(fourdLine, /Domain Door/);

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

console.log(
  `ok software catalog: ${body.software.length} entries, sort ${SOFTWARE_SORT_LAW}, update check foldlock 0.7.0→0.8.0`,
);

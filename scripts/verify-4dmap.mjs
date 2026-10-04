/**
 * 4DMap (4DM-WP-1.0) engine invariants + FragGate allowlist.
 * Four-axis inspection frame. Not a sequential gate.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { plainConsumerText, summaryFromResult } from "../src/display.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { softwareCatalog } from "../src/software-catalog.js";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import {
  AZNEWS_ABSENT_MODULE,
  AZNEWS_ABSENT_SOURCE,
  LIBRARY_MAP,
  offlineSecondaryHash,
  onlineSecondaryHash,
  primaryChainHash,
  runAznews,
} from "../src/engines/4dmap/aznews.js";
import { GENESIS_PREV } from "../src/engines/4dmap/product-card.js";
import { CATALOG_ALIASES } from "../src/catalog-meta.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall, parseTarget } from "../src/fraggate/registry.js";
import { softwareBucket } from "../src/software-catalog.js";
import { embeddedDigest } from "../src/engines/digest.js";
import { executeLocal } from "../src/engines/runner.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  AXES,
  DOMAINS_ARE_DOORS,
  JOIN_TYPES,
  LAYER,
  NEIGHBORS,
  SEQUENTIAL_GATE,
  SPEC,
  VERSION,
  ZION_CAP,
  absence,
  axisDescribe,
  cap,
  cardExport,
  cardImport,
  cardJoin,
  cardList,
  cardNew,
  cardPin,
  cardSpan,
  cardWalk,
  classMark,
  cohort,
  detectForbidden,
  example,
  fork,
  fourdmapSkill,
  frameStatus,
  gap,
  join,
  joinTypeForOp,
  lens,
  list,
  neighborCite,
  normalizeAxis,
  normalizeJoinType,
  pin,
  resetFourdmapStore,
  span,
  stack,
  verifyChain,
  verifyHash,
  walk,
  walkTrace,
} from "../src/engines/4dmap/engine.js";

resetLedger();
resetFourdmapStore();

const product = PRODUCTS.find((p) => p.slug === "4dmap");
assert.ok(product, "4dmap is a catalog product");
assert.equal(product.name, "4DMap");
assert.equal(product.worker, "4dmap-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/4dmap");
assert.equal(product.version, "0.3.0");
assert.equal(VERSION, "0.3.0");
assert.match(product.oneLine, /Inspect the same event/i);
assert.match(product.oneLine, /time, change, graph, and place/i);
assert.doesNotMatch(product.oneLine, /THIS IS:|THIS IS NOT:/i);
assert.doesNotMatch(product.oneLine, /Domain Door/);
assert.equal(product.doi, null);
assert.equal(softwareBucket(product.name, product.slug), "plain");

const catalogOps = new Set(product.ops.map((o) => o.op));
const ENHANCED = ["frame_status", "axis_describe", "walk_trace", "card_export", "card_import", "verify_chain", "neighbor_cite"];
const PRODUCT_02 = ["pin", "span", "stack", "gap", "fork", "walk", "lens", "class", "cohort", "absence", "cap", "join", "list", "example"];
const PRODUCT_03 = ["memory_cite", "memory_observe", "library_pin", "plot", "possibility", "pattern_recall", "lattice_tip", "poison_refuse"];
for (const op of ["card_new", "card_pin", "card_span", "card_join", "card_walk", "card_list", "verify_hash", "health", "skill", ...ENHANCED, ...PRODUCT_02, ...PRODUCT_03]) {
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}

assert.equal(SPEC, "4DM-WP-1.0");
assert.equal(SEQUENTIAL_GATE, false);
assert.equal(DOMAINS_ARE_DOORS, false);
assert.equal(LAYER, "inspection_frame");
assert.deepEqual(AXES, ["T", "Δ", "Γ", "Π"]);
assert.ok(NEIGHBORS.includes("temporallock"));
assert.ok(NEIGHBORS.includes("staticclock"));
assert.ok(NEIGHBORS.includes("chronolock"));
assert.ok(NEIGHBORS.includes("trajectorylock"));
assert.ok(NEIGHBORS.includes("spectrallock"));
assert.equal(normalizeAxis("delta"), "Δ");
assert.equal(normalizeJoinType("citation"), "cite");
assert.equal(joinTypeForOp("card_pin"), "pin");
assert.equal(joinTypeForOp("pin"), "pin");
assert.equal(joinTypeForOp("card_walk"), "walk");
assert.equal(joinTypeForOp("walk"), "walk");
assert.equal(joinTypeForOp("join"), "join");
assert.equal(detectForbidden({ truth_score: true }).kind, "truth_score");
assert.equal(detectForbidden({ invent_mark: true }).kind, "invent_mark");
assert.equal(detectForbidden({ backdate_class: 1 }).kind, "backdate_class");
assert.equal(detectForbidden({ lumen_panel: "on" }).kind, "lumen_panel");
assert.equal(detectForbidden({ label: "inspect-1" }), null);

assert.equal(CATALOG_ALIASES.fourdmap, "4dmap");
assert.equal(CATALOG_ALIASES["4d-map"], "4dmap");
assert.equal(CATALOG_ALIASES["4dm-wp-1.0"], "4dmap");

const live = LIVE_OPS["4dmap"];
for (const op of ["health", "skill", "card_new", "card_pin", "card_span", "card_join", "card_walk", "card_list", "verify_hash", ...ENHANCED, ...PRODUCT_02, ...PRODUCT_03]) {
  assert.ok(live.includes(op), `LIVE_OPS.4dmap has ${op}`);
}
for (const alias of ["frame", "axis", "trace", "export", "import", "neighbor", "ingest_pin", "plot_pins", "score_hooks", "possibility_cite", "lattice_tips"]) {
  assert.ok(live.includes(alias), `LIVE_OPS.4dmap has alias ${alias}`);
}
for (const op of STUB_OPS["4dmap"]) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}
assert.deepEqual(STUB_OPS["4dmap"], ["truth_score", "lumen_panel", "invent_mark", "backdate_class"]);

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug["4dmap"].status, "live");
assert.ok(registry.bySlug["4dmap"].status !== "local_only");
for (const op of live) {
  assert.equal(classifyCall(registry.bySlug["4dmap"], op).kind, "live", `${op} is live`);
}
assert.equal(classifyCall(registry.bySlug["4dmap"], "frame_status").kind, "live");
assert.equal(classifyCall(registry.bySlug["4dmap"], "neighbor_cite").kind, "live");
assert.equal(classifyCall(registry.bySlug["4dmap"], "truth_score").kind, "stub");
assert.equal(classifyCall(registry.bySlug["4dmap"], "lumen_panel").kind, "stub");
assert.equal(classifyCall(registry.bySlug["4dmap"], "invent_mark").kind, "stub");
assert.equal(classifyCall(registry.bySlug["4dmap"], "backdate_class").kind, "stub");
assert.equal(classifyCall(registry.bySlug["4dmap"], "area_estimate").kind, "unknown_op");
assert.equal(classifyCall(registry.bySlug["4dmap"], "library_pin").kind, "live");

const parsedSlash = parseTarget({ name: "4dmap/card_new" }, registry);
assert.equal(parsedSlash.slug, "4dmap");
assert.equal(parsedSlash.op, "card_new");
const parsedFlat = parseTarget({ name: "4dmap_card_pin" }, registry);
assert.equal(parsedFlat.slug, "4dmap");
assert.equal(parsedFlat.op, "card_pin");

const opened = await cardNew({ label: "inspect-1" });
assert.equal(opened.ok, true);
assert.equal(opened.true_engine_runtime, true);
assert.equal(opened.sequential_gate, false);
assert.equal(opened.domains_are_doors, false);
assert.equal(opened.not_a_door, true);
assert.equal(opened.layer, "inspection_frame");
assert.equal(opened.door, "fraggate");
assert.equal(opened.join_type, "inspect");
assert.ok(opened.card.card_hash);
assert.equal(opened.card.axes.T, null);
assert.deepEqual(opened.card.cites, []);

const pinT = await cardPin({ card_id: opened.card.card_id, axis: "T", mark: "declared-time" });
assert.equal(pinT.ok, true);
assert.equal(pinT.join_type, "pin");
assert.equal(pinT.axis, "T");
assert.equal(pinT.pin.mark, "declared-time");

const invent = await cardPin({ card_id: opened.card.card_id, axis: "Δ" });
assert.equal(invent.ok, false);
assert.equal(invent.code, "4DM-INVENT-REFUSE");

const pinD = await cardPin({ card_id: opened.card.card_id, axis: "delta", mark: "declared-delta" });
assert.equal(pinD.ok, true);
const spanned = await cardSpan({ card_id: opened.card.card_id, from: "T", to: "Δ" });
assert.equal(spanned.ok, true);
assert.equal(spanned.join_type, "span");

const other = await cardNew({ label: "inspect-2" });
const joined = await cardJoin({ card_id: opened.card.card_id, other_id: other.card.card_id, join_type: "cite" });
assert.equal(joined.ok, true);
assert.equal(joined.join_type, "cite");
assert.ok(JOIN_TYPES.includes(joined.join_type));

const walked = await cardWalk({ card_ids: [opened.card.card_id, other.card.card_id] });
assert.equal(walked.ok, true);
assert.equal(walked.join_type, "walk");
assert.equal(walked.walk.chainlock_may_stamp, true);
assert.match(walked.walk.walk_hash, /^[a-f0-9]{64}$/);

const listed = cardList({});
assert.equal(listed.count, 2);
assert.equal(listed.walks.length, 1);

const verified = await verifyHash({ card_id: opened.card.card_id });
assert.equal(verified.match, true);
const walkOk = await verifyHash({ walk_id: walked.walk.walk_id });
assert.equal(walkOk.match, true);

const backdate = await cardPin({
  card_id: opened.card.card_id,
  axis: "Γ",
  mark: "class-a",
  class_at: "2000-01-01T00:00:00Z",
});
assert.equal(backdate.ok, false);
assert.equal(backdate.code, "4DM-BACKDATE-REFUSE");

const truth = await cardNew({ truth_score: 0.9 });
assert.equal(truth.ok, false);
assert.equal(truth.code, "4DM-TRUTH-REFUSE");

const local = await executeLocal({ slug: "4dmap", op: "card_new", payload: { label: "iso-1" }, ranIn: "aziel-runtime" });
assert.equal(local.true_engine_runtime, true);
assert.equal(local.engine_digest, embeddedDigest("4dmap"));
assert.equal(local.status, 200);
const localBody = JSON.parse(local.responseText);
assert.equal(localBody.ok, true);
assert.equal(localBody.spec, "4DM-WP-1.0");

const localStub = await executeLocal({ slug: "4dmap", op: "truth_score", payload: {}, ranIn: "aziel-runtime" });
assert.equal(localStub.unsupported, true);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

async function post(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );
}

const doorNew = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "card_new", payload: { label: "door-1" } })).json();
assert.equal(doorNew.ok, true);
assert.equal(doorNew.slug, "4dmap");
assert.equal(doorNew.result.sequential_gate, false);
assert.ok(doorNew.gate);
const claimJoin = JSON.stringify(doorNew);
assert.match(JSON.stringify(doorNew.result), /inspect|card/);

const doorStub = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "truth_score" })).json();
assert.equal(doorStub.code, "FG-STUB");
const doorInvent = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "invent_mark" })).json();
assert.equal(doorInvent.code, "FG-STUB");
const doorBack = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "backdate_class" })).json();
assert.equal(doorBack.code, "FG-STUB");
const doorLumen = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "lumen_panel" })).json();
assert.equal(doorLumen.code, "FG-STUB");

const health = await (await handler(new Request(origin + "/v1/health"), env)).json();
assert.ok(health.true_engine_slugs.includes("4dmap"));
assert.equal(health.engines["4dmap"].true_engine_runtime, true);
assert.equal(health.engines["4dmap"].engine_digest, embeddedDigest("4dmap"));

const software = await (await handler(new Request(origin + "/v1/software"), env)).json();
const card = software.software.find((s) => s.slug === "4dmap");
assert.ok(card);
assert.equal(card.bucket, "plain");
assert.equal(card.status, "live");
assert.equal(card.worker_home, "https://4dmap-download-tracker.vibelock.workers.dev/");
assert.equal(card.mesh.enabled_default, true);
assert.equal(card.qns_cd.spec, "QNS-CD-1.0");
assert.equal(card.qns_cd.local, "https://github.com/AzielEliab/qnm-node");
assert.ok(!software.software.some((s) => s.slug === "memory"), "AKM-TRIAD is not Softwares-tab");
assert.ok(!PRODUCTS.some((p) => p.slug === "memory"), "memory is LIVE fabric, not a catalog Software");
assert.ok(LIVE_OPS.memory.includes("observe"));
assert.ok(LIVE_OPS.memory.includes("calibrate"));
assert.ok(LIVE_OPS.memory.includes("recall"));
assert.ok(STUB_OPS.memory.includes("rollback"));
assert.equal(registry.bySlug.memory.software_tab, false);
assert.equal(registry.bySlug.memory.kind, "kernel");
assert.equal(classifyCall(registry.bySlug.memory, "observe").kind, "live");
assert.equal(classifyCall(registry.bySlug.memory, "rollback").kind, "stub");

const cite = await (await handler(new Request(origin + "/cite.json"), env)).json();
assert.ok(cite.designs.papers.some((p) => p.id === "4DM-WP-1.0" && p.kind === "software"));
assert.ok(cite.designs.papers.some((p) => p.id === "AKM-TRIAD-1.0"));
assert.ok(cite.products.some((p) => p.slug === "4dmap"));
assert.ok(!cite.products.some((p) => p.slug === "memory"));

const memHealth = await (await handler(new Request(origin + "/v1/memory"), env)).json();
assert.equal(memHealth.spec, "AKM-TRIAD-1.0");
assert.equal(memHealth.software_tab, false);
const memObserve = await (await post("/v1/memory/observe", { subject: "4dm-akm-guard", fact: "akm stays fabric" })).json();
assert.equal(memObserve.ok, true);
assert.ok(memObserve.memory_id);
const memGet = await (await handler(new Request(origin + `/v1/memory/${memObserve.memory_id}`), env)).json();
assert.equal(memGet.memory_id, memObserve.memory_id);
const memDoor = await (await post("/v1/fraggate/call", { slug: "memory", op: "observe", payload: { subject: "4dm-akm-fg", fact: "behind FragGate" } })).json();
assert.equal(memDoor.ok, true);
assert.equal(memDoor.slug, "memory");

const mcpList = await (
  await handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    }),
    env,
  )
).json();
const toolNames = (mcpList.result.tools || []).map((t) => t.name);
for (const name of ["memory_observe", "memory_resolve", "memory_calibrate", "memory_recall", "memory_get"]) {
  assert.ok(toolNames.includes(name), `MCP still lists ${name}`);
}

const frame = frameStatus({});
assert.equal(frame.ok, true);
assert.equal(frame.domains_are_doors, false);
assert.equal(frame.not_a_door, true);
assert.equal(frame.extra_door, false);
assert.equal(frame.sequential_gate, false);
assert.equal(frame.layer, "inspection_frame");
assert.equal(frame.door, "fraggate");
assert.deepEqual(frame.axes, AXES);
assert.match(frame.note, /inspection frame/i);
assert.doesNotMatch(JSON.stringify(frame), /Domain Door/);

const axisT = axisDescribe({ axis: "temporal" });
assert.equal(axisT.ok, true);
assert.equal(axisT.axis, "T");
assert.ok(axisT.neighbors.includes("temporallock"));
assert.equal(axisT.pinned_count, 1);
const badAxis = axisDescribe({ axis: "zeta" });
assert.equal(badAxis.ok, false);
assert.equal(badAxis.code, "4DM-AXIS");

const traced = walkTrace({ walk_id: walked.walk.walk_id });
assert.equal(traced.ok, true);
assert.equal(traced.sequential_gate, false);
assert.equal(traced.steps.length, 2);
assert.equal(traced.steps[0].still_matches, true);

const citeT = await neighborCite({ card_id: opened.card.card_id, axis: "T", neighbor: "temporallock", join_type: "cite" });
assert.equal(citeT.ok, true);
assert.equal(citeT.join_type, "cite");
assert.equal(citeT.cite.neighbor, "temporallock");
assert.equal(citeT.card.cites.length, 1);
const badNeighbor = await neighborCite({ card_id: opened.card.card_id, axis: "Γ", neighbor: "temporallock" });
assert.equal(badNeighbor.ok, false);
assert.equal(badNeighbor.code, "4DM-NEIGHBOR");
const inventNeighbor = await neighborCite({ card_id: opened.card.card_id, neighbor: "zd30" });
assert.equal(inventNeighbor.ok, false);
assert.equal(inventNeighbor.code, "4DM-NEIGHBOR");

const exported = await cardExport({ card_id: opened.card.card_id });
assert.equal(exported.ok, true);
assert.equal(exported.envelope.schema, "4DM-EXPORT-0.1");
assert.match(exported.envelope.export_hash, /^[a-f0-9]{64}$/);
const importedDup = await cardImport({ envelope: exported.envelope });
assert.equal(importedDup.ok, true);
assert.equal(importedDup.imported, 1);

resetFourdmapStore();
const restored = await cardImport({ envelope: exported.envelope });
assert.equal(restored.ok, true);
assert.equal(restored.cards[0].card_id, opened.card.card_id);
assert.equal(restored.cards[0].card_hash, exported.envelope.card.card_hash);
const broken = JSON.parse(JSON.stringify(exported.envelope));
broken.card.label = "tampered";
const refuseTamper = await cardImport({ envelope: broken });
assert.equal(refuseTamper.ok, false);
assert.equal(refuseTamper.code, "4DM-HASH");

const chainCard = await verifyChain({ card_id: restored.cards[0].card_id });
assert.equal(chainCard.match, true);
assert.equal(chainCard.kind, "card");

resetFourdmapStore();
const productPin = await pin({ axis: "T", t: "2026-09-10T00:00:00Z", note: "product pin" });
assert.equal(productPin.ok, true);
assert.equal(productPin.op, "pin");
assert.equal(productPin.axis, "T");
assert.equal(productPin.pin.mark, "2026-09-10T00:00:00Z");
const productPin2 = await pin({ axis: "delta", value: "declared-delta" });
assert.equal(productPin2.ok, true);
const productSpan = await span({ from_id: productPin.card.card_id, to_id: productPin2.card.card_id });
assert.equal(productSpan.ok, true);
assert.equal(productSpan.op, "span");
assert.equal(productSpan.axis, "Δ");
const productStack = await stack({ ids: [productPin.card.card_id, productPin2.card.card_id] });
assert.equal(productStack.ok, true);
assert.equal(productStack.axis, "Γ");
const productGap = await gap({ from_id: productPin.card.card_id, to_id: productPin2.card.card_id });
assert.equal(productGap.ok, true);
const productFork = await fork({ id: productPin.card.card_id });
assert.equal(productFork.ok, true);
assert.equal(productFork.forks_kept, true);
assert.equal(productFork.winner, null);
const productWalk = await walk({ card_ids: [productPin.card.card_id, productPin2.card.card_id] });
assert.equal(productWalk.ok, true);
assert.equal(productWalk.op, "walk");
const tipWalk = await walk({ tip: productSpan.card.card_id });
assert.equal(tipWalk.ok, true);
assert.ok(tipWalk.n >= 1);
const silentLens = lens({});
assert.equal(silentLens.ok, true);
assert.equal(silentLens.silent, true);
assert.equal(silentLens.pi, "Π-EMPTY");
const hitLens = lens({ query: "product pin" });
assert.equal(hitLens.silent, false);
assert.ok(hitLens.hits.includes(productPin.card.card_id));
const silentClass = await classMark({});
assert.equal(silentClass.silent, true);
const namedClass = await classMark({ label: "declared-class" });
assert.equal(namedClass.ok, true);
assert.deepEqual(namedClass.pi, { class: "declared-class" });
const silentCohort = await cohort({});
assert.equal(silentCohort.silent, true);
const namedCohort = await cohort({ ids: [productPin.card.card_id] });
assert.equal(namedCohort.ok, true);
const silentAbsence = absence({ query: "no-such-mark-zzz" });
assert.equal(silentAbsence.silent, true);
const capped = cap({ score: 0.99 });
assert.equal(capped.ok, true);
assert.equal(capped.score, ZION_CAP);
assert.equal(capped.capped, true);
const productJoin = await join({ left: productPin.card.card_id, right: productPin2.card.card_id, join_type: "T-DELTA" });
assert.equal(productJoin.ok, true);
assert.equal(productJoin.axis_join, "T-Δ");
const backJoin = await join({ left: productPin.card.card_id, right: productPin2.card.card_id, join_type: "PI-T" });
assert.equal(backJoin.ok, false);
assert.equal(backJoin.code, "4DM-BACKDATE-REFUSE");
const listed02 = list({});
assert.equal(listed02.ok, true);
assert.ok(listed02.count >= 2);
const demo = await example({});
assert.equal(demo.ok, true);
assert.equal(demo.synthetic, true);
assert.equal(demo.card.card_id, "4dm-example-pin");

const doorPin = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "pin", payload: { axis: "T", t: "declared-door-pin" } })).json();
assert.equal(doorPin.ok, true);
assert.equal(doorPin.result.op, "pin");
const doorCap = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "cap", payload: { score: 0.9 } })).json();
assert.equal(doorCap.ok, true);
assert.equal(doorCap.result.score, ZION_CAP);
const doorExample = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "example" })).json();
assert.equal(doorExample.ok, true);
assert.equal(doorExample.result.synthetic, true);

const doorFrame = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "frame" })).json();
assert.equal(doorFrame.ok, true);
assert.equal(doorFrame.result.domains_are_doors, false);
assert.equal(doorFrame.result.not_a_door, true);
assert.equal(doorFrame.result.layer, "inspection_frame");

resetFourdmapStore();
const paperPin = {
  event: "paper pin",
  date: "1914-08-01",
  lat: 48.85,
  lon: 2.35,
  surface: "MOCK",
};
const doorLibrary = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "library_pin", payload: paperPin })).json();
assert.equal(doorLibrary.code, "FG-OK");
assert.notEqual(doorLibrary.code, "FG-UNKNOWN-OP");
assert.equal(doorLibrary.ok, true);
assert.equal(doorLibrary.result.ok, true);
assert.equal(doorLibrary.result.op, "library_pin");
assert.equal(doorLibrary.result.surface, "MOCK");
assert.equal(doorLibrary.result.pin_frame.kind, "4DM-PIN-FRAME");
assert.equal(doorLibrary.result.collapsed, false);
assert.equal(doorLibrary.result.ml_store, false);
assert.match(doorLibrary.result.h, /^[a-f0-9]{64}$/);
const doorPlot = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "plot", payload: {} })).json();
assert.equal(doorPlot.code, "FG-OK");
assert.equal(doorPlot.result.ok, true);
assert.equal(doorPlot.result.n, 1);
assert.equal(doorPlot.result.gis, false);
const doorTips = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "lattice_tip", payload: {} })).json();
assert.equal(doorTips.code, "FG-OK");
assert.equal(doorTips.result.n, 1);
const doorCite = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "memory_cite", payload: { id: doorLibrary.result.id } })).json();
assert.equal(doorCite.code, "FG-OK");
assert.equal(doorCite.result.ok, true);
assert.equal(doorCite.result.cited, true);
assert.equal(doorCite.result.card_rewritten, false);
assert.equal(doorCite.result.posterior_is_truth, false);
assert.equal(doorCite.result.door, false);
const doorObserve = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "memory_observe", payload: { id: doorLibrary.result.id } })).json();
assert.equal(doorObserve.code, "FG-OK");
assert.equal(doorObserve.result.ok, true);
assert.equal(doorObserve.result.forwarded, false);
assert.equal(doorObserve.result.observation.fabric, true);
assert.equal(doorObserve.result.observation.software_tab, false);
const doorPossibility = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "possibility", payload: { id: doorLibrary.result.id } })).json();
assert.equal(doorPossibility.code, "FG-OK");
assert.equal(doorPossibility.result.ok, true);
assert.equal(doorPossibility.result.collapsed, false);
assert.equal(doorPossibility.result.possibility.label, "possibility");
const doorRecall = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "pattern_recall", payload: {} })).json();
assert.equal(doorRecall.code, "FG-OK");
assert.equal(doorRecall.result.ok, true);
assert.equal(doorRecall.result.ml_store, false);
const doorPoison = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "poison_refuse", payload: paperPin })).json();
assert.equal(doorPoison.code, "FG-OK");
assert.equal(doorPoison.result.ok, true);
assert.equal(doorPoison.result.payload_stored, false);
const doorPoisoned = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "library_pin", payload: paperPin })).json();
assert.equal(doorPoisoned.code, "FG-OK");
assert.equal(doorPoisoned.result.ok, false);
assert.equal(doorPoisoned.result.code, "POISON_REFUSE");
const doorIncomplete = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "library_pin", payload: { event: "paper pin" } })).json();
assert.equal(doorIncomplete.code, "FG-OK");
assert.equal(doorIncomplete.result.ok, false);
assert.equal(doorIncomplete.result.code, "CLOCK_REFUSE");
const doorAlias = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "ingest_pin", payload: { event: "alias pin", date: "1945-05-08", gazetteer_id: "place:rome", surface: "MOCK" } })).json();
assert.equal(doorAlias.code, "FG-OK");
assert.equal(doorAlias.result.ok, true);
assert.equal(doorAlias.result.op, "library_pin");
assert.equal(doorAlias.aliased, true);
const doorArea = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "area_estimate", payload: {} })).json();
assert.equal(doorArea.code, "FG-UNKNOWN-OP");

const skill = await (await handler(new Request(origin + "/v1/skill"), env)).text();
assert.match(skill, /4DMap \(4DM-WP-1\.0\)/);
assert.match(skill, /1\.6\.14/);
assert.match(skill, /1\.7\.6/);
assert.match(skill, /1\.7\.4/);
assert.match(skill, /frame_status/);
const engineSkill = fourdmapSkill();
assert.match(engineSkill.skill, /inspection frame/i);
assert.doesNotMatch(engineSkill.markdown, /Domain Door/);
assert.match(engineSkill.markdown, /frame_status/);

const llms = await (await handler(new Request(origin + "/llms.txt"), env)).text();
assert.match(llms, /4DMap/);
assert.match(llms, /4DM-WP-1\.0/);
assert.match(llms, /frame_status/);
assert.match(llms, /1\.7\.6/);
assert.match(llms, /1\.7\.4/);

const home = await (await handler(new Request(origin + "/"), env)).text();
assert.match(home, /data-slug="4dmap"/);
assert.match(home, /id="desk-aznews"/);
assert.match(home, /news_ingest/);
assert.match(home, /4DM-WP-1\.0/);
assert.match(home, /not a sequential gate/i);
assert.match(home, /1\.7\.6/);
assert.match(home, /1\.7\.4/);
assert.match(home, /frame_status/);
assert.doesNotMatch(product.banner, /Domain Door/);

void claimJoin;

resetFourdmapStore();
const catalog = softwareCatalog(origin, PRODUCTS);
assert.equal(catalog.count, 42);
assert.equal(catalog.software.some((row) => row.slug === "aznews"), false);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(PUBLIC_MCP_TOOLS.includes("news_pin"), false);
assert.equal(PUBLIC_MCP_TOOLS.includes("aznews"), false);
assert.equal(existsSync(new URL("../src/engines/4dmap/aznews-source.js", import.meta.url)), true);
assert.equal(joinTypeForOp("news_pin"), "pin");
assert.ok(live.includes("news_pin"));
assert.ok(live.includes("news_open"));
assert.ok(catalogOps.has("news_status"));

const newsProduct = { name: "4DMap", slug: "4dmap" };
function humanLines(body) {
  const plain = plainConsumerText(body, null);
  const summary = summaryFromResult(body, null, newsProduct);
  assert.doesNotMatch(plain, /\{/);
  assert.doesNotMatch(summary, /\{/);
  assert.doesNotMatch(plain, /15:20/);
  assert.doesNotMatch(summary, /15:20/);
  return { plain, summary };
}

const absentPin = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "news_pin", payload: {} })).json();
assert.equal(absentPin.code, "FG-OK");
assert.equal(absentPin.result.ok, false);
assert.equal(absentPin.result.code, "AZNEWS-SOURCE-ABSENT");
assert.equal(absentPin.result.merged, false);
assert.equal(absentPin.result.live, false);
assert.equal(absentPin.result.source_present, false);
assert.equal(absentPin.result.lattice_live, false);
assert.equal(absentPin.result.aznews.merged, false);
assert.equal(absentPin.result.aznews.live, false);
assert.equal(absentPin.result.absent_module, AZNEWS_ABSENT_MODULE);
assert.match(absentPin.result.note, new RegExp(AZNEWS_ABSENT_MODULE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(absentPin.result.note, new RegExp(AZNEWS_ABSENT_SOURCE));
const absentHuman = humanLines(absentPin);
assert.match(absentHuman.summary, /refused/i);
assert.match(absentHuman.plain, /src\/engines\/4dmap\/aznews-source\.js/);

const libraryAsNews = await (
  await post("/v1/fraggate/call", { slug: "4dmap", op: "news_pin", payload: { map: LIBRARY_MAP, event: "library map" } })
).json();
assert.equal(libraryAsNews.result.code, "AZNEWS-NOT-LIBRARY");
assert.equal(libraryAsNews.result.merged, false);
assert.equal(libraryAsNews.result.live, false);
assert.equal(libraryAsNews.result.joined, false);
assert.equal(libraryAsNews.result.lattice_live, false);
assert.equal(libraryAsNews.result.installed, false);
assert.match(libraryAsNews.result.note, /not AZNews/i);

const fixture = {
  fixture: true,
  fixture_label: "test-fixture",
  offline: true,
  username: "fixture-reader",
  merged: true,
  live: true,
  item: {
    id: "fixture-item-1",
    date: "1999-12-31",
    event: "fixture desk note",
    lat: 0,
    lon: 0,
    headline: "Labeled fixture item. Not a published article.",
  },
};
const pinned = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "news_pin", payload: fixture })).json();
assert.equal(pinned.code, "FG-OK");
assert.equal(pinned.result.ok, true);
assert.equal(pinned.result.op, "news_pin");
assert.equal(pinned.result.merged, false);
assert.equal(pinned.result.live, false);
assert.equal(pinned.result.source_present, false);
assert.equal(pinned.result.fixture_is_source, false);
assert.equal(pinned.result.surface, "MOCK");
assert.equal(pinned.result.lattice_live, true);
assert.equal(pinned.result.field_1_0, false);
assert.equal(pinned.result.installed_app, false);
assert.equal(pinned.result.aznews.live, false);
assert.equal(pinned.result.aznews.merged, false);
assert.equal(pinned.result.date, "1999-12-31T00:00:00Z");
assert.equal(pinned.result.event, "fixture desk note");
assert.equal(pinned.result.pin_frame.lat, 0);
assert.equal(pinned.result.pin_frame.lon, 0);
assert.deepEqual(pinned.result.receipt.lattices, ["primary", "secondary"]);
assert.equal(pinned.result.receipt.lattice_live, true);
assert.match(pinned.result.receipt.primary, /^[a-f0-9]{64}$/);
assert.match(pinned.result.receipt.secondary, /^[a-f0-9]{64}$/);
assert.equal(pinned.result.receipt.offline, true);
assert.equal(pinned.result.receipt.primary_prev, GENESIS_PREV);
assert.equal(pinned.result.receipt.secondary_prev, GENESIS_PREV);
assert.equal(
  pinned.result.receipt.primary,
  await primaryChainHash(pinned.result.document_hash, GENESIS_PREV),
);
assert.equal(
  pinned.result.receipt.secondary,
  await offlineSecondaryHash(pinned.result.document_hash, "fixture-reader"),
);
const independentSecondary = await sha256Hex(
  canonicalize({ primary: pinned.result.document_hash, username: "fixture-reader" }),
);
assert.equal(pinned.result.receipt.secondary, independentSecondary);
const pinHuman = humanLines(pinned);
assert.match(pinHuman.summary, /fixture item was pinned/i);
assert.match(pinHuman.summary, /not live/i);
assert.doesNotMatch(pinHuman.summary, /Field 1\.0 is live|installed as an app/i);

const doubled = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "news_pin", payload: fixture })).json();
assert.equal(doubled.result.ok, false);
assert.equal(doubled.result.code, "AZNEWS-DOUBLE");
assert.equal(doubled.result.merged, false);
assert.equal(doubled.result.live, false);
assert.equal(doubled.result.joined, false);
assert.equal(doubled.result.lattice_live, false);
assert.equal(doubled.result.aznews.live, false);
assert.equal(doubled.result.aznews.lattice_live, false);
assert.equal(doubled.result.installed, false);
assert.equal(doubled.result.booted, false);
assert.match(doubled.result.note, /not written again/i);

const otherUser = {
  ...fixture,
  username: "fixture-reader-2",
  merged: true,
  live: true,
};
const secondUser = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "news_pin", payload: otherUser })).json();
assert.equal(secondUser.result.ok, true);
assert.equal(secondUser.result.live, false);
assert.equal(secondUser.result.merged, false);
assert.equal(secondUser.result.document_hash, pinned.result.document_hash);
assert.notEqual(secondUser.result.receipt.secondary, pinned.result.receipt.secondary);
assert.equal(
  secondUser.result.receipt.secondary,
  await offlineSecondaryHash(secondUser.result.document_hash, "fixture-reader-2"),
);
assert.equal(secondUser.result.receipt.primary_prev, pinned.result.receipt.primary);

const openedNews = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "news_open",
    payload: { id: "fixture-item-1", offline: true, username: "fixture-reader" },
  })
).json();
assert.equal(openedNews.result.ok, true);
assert.equal(openedNews.result.op, "news_open");
assert.equal(openedNews.result.headline, "Labeled fixture item. Not a published article.");
assert.equal(openedNews.result.merged, false);
assert.equal(openedNews.result.live, false);
assert.equal(openedNews.result.fixture_is_source, false);
assert.equal(openedNews.result.already_on_chain, false);
assert.deepEqual(openedNews.result.receipt.lattices, ["primary", "secondary"]);
assert.equal(openedNews.result.lattice_live, true);
assert.equal(openedNews.result.receipt.lattice_live, true);
assert.equal(
  openedNews.result.receipt.secondary,
  await offlineSecondaryHash(openedNews.result.document_hash, "fixture-reader"),
);
const openHuman = humanLines(openedNews);
assert.match(openHuman.plain, /Labeled fixture item/);
assert.match(openHuman.summary, /opened the matching fixture item/i);

const openedAgain = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "news_open",
    payload: { item_id: "fixture-item-1", offline: true, username: "fixture-reader" },
  })
).json();
assert.equal(openedAgain.result.ok, true);
assert.equal(openedAgain.result.already_on_chain, true);
assert.equal(openedAgain.result.receipt.secondary, openedNews.result.receipt.secondary);
assert.equal(openedAgain.result.live, false);
assert.match(openedAgain.result.note, /not written again/i);

const byPlace = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "news_open",
    payload: {
      offline: true,
      username: "fixture-reader-2",
      date: "1999-12-31",
      event: "fixture desk note",
      lat: 0,
      lon: 0,
    },
  })
).json();
assert.equal(byPlace.result.ok, true);
assert.equal(byPlace.result.item_id, "fixture-item-1");
assert.equal(byPlace.result.live, false);

const plotted = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "plot", payload: {} })).json();
assert.equal(plotted.result.ok, true);
assert.ok(plotted.result.pins.some((pin) => pin.event === "fixture desk note" && pin.surface === "MOCK"));

const online = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "news_pin",
    payload: {
      fixture: true,
      fixture_label: "test-fixture",
      offline: false,
      live: true,
      merged: true,
      item: {
        id: "fixture-item-online",
        date: "2001-01-01",
        event: "fixture online note",
        lat: 1,
        lon: 2,
        headline: "Labeled fixture item for the online chain. Not a published article.",
      },
    },
  })
).json();
assert.equal(online.result.ok, true);
assert.equal(online.result.live, false);
assert.equal(online.result.merged, false);
assert.equal(online.result.receipt.offline, false);
assert.equal(
  online.result.receipt.secondary,
  await onlineSecondaryHash(online.result.receipt.primary, online.result.receipt.secondary_prev),
);
assert.notEqual(
  online.result.receipt.secondary,
  await offlineSecondaryHash(online.result.document_hash, "fixture-reader"),
);
assert.equal(online.result.lattice_live, true);
assert.equal(online.result.receipt.lattice_live, true);

const after = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "news_status", payload: {} })).json();
assert.equal(after.result.ok, true);
assert.equal(after.result.joined, true);
assert.equal(after.result.source_present, false);
assert.equal(after.result.merged, false);
assert.equal(after.result.live, false);
assert.equal(after.result.lattice_live, true);
assert.equal(after.result.live, false);
assert.equal(after.result.aznews.live, false);
assert.equal(after.result.aznews.lattice_live, true);
assert.equal(after.result.code, "AZNEWS-SOURCE-ABSENT");
assert.ok(after.result.fixture_pins >= 1);
assert.equal(after.result.fixture_is_source, false);
assert.match(after.result.note, /not a news source/i);
const statusHuman = humanLines(after);
assert.match(statusHuman.summary, /No news source is present/i);

const libraryStill = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "library_pin",
    payload: { event: "paper pin", date: "1914-08-01", lat: 48.85, lon: 2.35, surface: "MOCK" },
  })
).json();
assert.equal(libraryStill.result.ok, true);
assert.equal(libraryStill.result.op, "library_pin");
assert.equal(libraryStill.result.library.cite_only, true);
assert.equal(libraryStill.result.library.merged, false);
assert.equal(libraryStill.result.library.slug, "aziel-corpus");
assert.equal(libraryStill.result.library.map, LIBRARY_MAP);
assert.notEqual(libraryStill.result.library.software, "AZNews");

const softwareAgain = await (await handler(new Request(origin + "/v1/software"), env)).json();
assert.equal(softwareAgain.count, 42);
assert.equal(softwareAgain.software.some((row) => row.slug === "aznews"), false);

const imageBytes = new TextEncoder().encode("aznews-image-bytes");
const imageHash = await sha256Hex(imageBytes);
const imageB64 = Buffer.from(imageBytes).toString("base64");
const standalone = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "news_ingest",
    payload: {
      fixture: true,
      fixture_label: "standalone-fixture",
      offline: true,
      username: "fixture-reader",
      live: true,
      merged: true,
      item: {
        id: "fixture-standalone-1",
        date: "1998-01-02",
        event: "fixture standalone note",
        lat: 3,
        lon: 4,
        headline: "Standalone fixture headline.",
        wording: "Full standalone fixture wording. Not a published article.",
        score: 0.25,
        image: { b64: imageB64, url: "https://github.com/AzielEliab/aziel-runtime" },
      },
    },
  })
).json();
assert.equal(standalone.result.ok, true);
assert.equal(standalone.result.path, "standalone");
assert.equal(standalone.result.on_map, false);
assert.equal(standalone.result.live, false);
assert.equal(standalone.result.merged, false);
assert.equal(standalone.result.item_live, false);
assert.equal(standalone.result.installed_app, false);
assert.equal(standalone.result.wording, "Full standalone fixture wording. Not a published article.");
assert.equal(standalone.result.score, 0.25);
assert.equal(standalone.result.images[0].sha256, imageHash);
assert.equal(standalone.result.images[0].dropped, false);
assert.equal(standalone.result.images[0].fetch_url, "https://github.com/AzielEliab/aziel-runtime");
assert.equal(standalone.result.lattice_live, true);
assert.equal(standalone.result.receipt.lattice_live, true);
assert.deepEqual(standalone.result.receipt.lattices, ["primary", "secondary"]);
assert.equal(standalone.result.receipt.wording, standalone.result.wording);
assert.equal(standalone.result.receipt.score, 0.25);
assert.equal(standalone.result.receipt.images[0].sha256, imageHash);
assert.equal(standalone.result.receipt.azos.updated, false);
assert.equal(standalone.result.receipt.azos.slug, "azos");
assert.equal(
  standalone.result.receipt.secondary,
  await offlineSecondaryHash(standalone.result.document_hash, "fixture-reader"),
);
const plotAfterStandalone = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "plot", payload: {} })).json();
assert.equal(
  plotAfterStandalone.result.pins.some((pin) => pin.event === "fixture standalone note"),
  false,
);

const realItem = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "news_pin",
    payload: {
      real: true,
      offline: true,
      username: "real-reader",
      live: true,
      merged: true,
      installed: true,
      item: {
        id: "real-item-1",
        date: "2026-10-03",
        event: "supplied real desk item",
        lat: 51.5,
        lon: -0.12,
        headline: "Supplied real item",
        wording: "Full wording of the supplied real item. It was not fetched from a wire.",
        score: 0.5,
        image: { b64: imageB64, url: "https://github.com/AzielEliab/aziel-runtime", sha256: imageHash },
      },
    },
  })
).json();
assert.equal(realItem.result.ok, true);
assert.equal(realItem.result.path, "joined");
assert.equal(realItem.result.on_map, true);
assert.equal(realItem.result.item_live, true);
assert.equal(realItem.result.live, false);
assert.equal(realItem.result.aznews.live, false);
assert.equal(realItem.result.merged, true);
assert.equal(realItem.result.installed, false);
assert.equal(realItem.result.installed_app, false);
assert.equal(realItem.result.mesh_node, false);
assert.equal(realItem.result.lattice_live, true);
assert.equal(realItem.result.receipt.lattice_live, true);
assert.equal(realItem.result.field_1_0, false);
assert.equal(realItem.result.office_1_0, false);
assert.equal(realItem.result.pilot_started, false);
assert.equal(realItem.result.alt_internet_live, false);
assert.equal(realItem.result.images[0].sha256, imageHash);
assert.equal(realItem.result.images[0].dropped, false);
assert.equal(realItem.result.receipt.score, 0.5);
assert.equal(realItem.result.receipt.wording, realItem.result.wording);
assert.equal(realItem.result.receipt.azos.updated, false);

const sources = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "news_sources", payload: {} })).json();
assert.equal(sources.result.ok, true);
assert.equal(sources.result.count, 50);
assert.equal(sources.result.live, false);
assert.equal(sources.result.sources_live, false);
assert.equal(sources.result.outlets.length, 50);
assert.ok(sources.result.outlets.every((row) => row.live === false && row.status === "configured-but-not-live"));
assert.match(sources.result.ranking.article, /pressgazette\.co\.uk/);
assert.match(sources.result.ranking.scope, /English-language/);
assert.ok(sources.result.outlets.some((row) => row.access === "public-rss" && row.feed_url));
assert.ok(sources.result.outlets.some((row) => row.access === "paid-or-blocked"));
assert.ok(sources.result.outlets.some((row) => row.access === "unwired"));

const weatherQuiet = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "news_weather", payload: {} })).json();
assert.equal(weatherQuiet.result.ok, true);
assert.equal(weatherQuiet.result.weather_live, false);
assert.equal(weatherQuiet.result.live, false);
assert.ok(weatherQuiet.result.gaps >= 1);
assert.ok(weatherQuiet.result.regions.every((row) => row.reading == null && row.gap === true && row.live === false));

const weatherOne = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "news_weather",
    payload: {
      region: "northern-europe",
      real: true,
      observation: { temperature_2m: 9.5, observed_at: "2026-10-03T12:00:00Z" },
    },
  })
).json();
assert.equal(weatherOne.result.ok, true);
assert.equal(weatherOne.result.weather_live, false);
assert.equal(weatherOne.result.live, false);
assert.equal(weatherOne.result.region.live, true);
assert.equal(weatherOne.result.region.origin, "supplied");
assert.equal(weatherOne.result.region.reading.temperature_2m, 9.5);
assert.ok(weatherOne.result.regions.filter((row) => row.id !== "northern-europe").every((row) => row.gap === true && row.reading == null));
assert.equal(weatherOne.result.receipt ? weatherOne.result.region.score : weatherOne.result.region.score, 1);

const swans = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "news_black_swan", payload: {} })).json();
assert.equal(swans.result.ok, true);
assert.equal(swans.result.live, false);
assert.ok(swans.result.count >= 10);
assert.ok(swans.result.events.every((row) => Array.isArray(row.cites) && row.cites.length >= 1 && row.score === 1));
assert.ok(swans.result.events.some((row) => row.pinnable === false && row.date == null));

const swanPin = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "news_black_swan",
    payload: { id: "september-11-2001", pin: true, offline: true, username: "fixture-reader" },
  })
).json();
assert.equal(swanPin.result.ok, true);
assert.equal(swanPin.result.on_map, true);
assert.equal(swanPin.result.item_live, false);
assert.equal(swanPin.result.live, false);
assert.equal(swanPin.result.merged, true);
assert.match(swanPin.result.wording, /9\/11/);
assert.equal(swanPin.result.score, 1);
assert.equal(swanPin.result.image_gap, true);
assert.deepEqual(swanPin.result.receipt.lattices, ["primary", "secondary"]);
assert.equal(swanPin.result.receipt.azos.updated, false);
assert.equal(
  swanPin.result.receipt.secondary,
  await offlineSecondaryHash(swanPin.result.document_hash, "fixture-reader"),
);

const swanGap = await (
  await post("/v1/fraggate/call", {
    slug: "4dmap",
    op: "news_black_swan",
    payload: { id: "rise-of-the-internet", pin: true },
  })
).json();
assert.equal(swanGap.result.ok, false);
assert.equal(swanGap.result.code, "AZNEWS-DATE-GAP");
assert.equal(swanGap.result.live, false);
assert.equal(swanGap.result.joined, false);
assert.equal(swanGap.result.lattice_live, false);
assert.equal(swanGap.result.installed, false);

const liveWeather = await runAznews("news_weather", { fetch: true, region: "northern-europe" });
assert.equal(liveWeather.weather_live, false);
assert.equal(liveWeather.live, false);
assert.equal(liveWeather.installed_app, false);
if (liveWeather.region.gap) {
  assert.equal(liveWeather.region.reading, null);
  assert.equal(liveWeather.region.live, false);
} else {
  assert.equal(liveWeather.region.origin, "open-meteo");
  assert.equal(typeof liveWeather.region.reading.temperature_2m, "number");
  assert.equal(liveWeather.region.live, true);
}
assert.ok(liveWeather.regions.some((row) => row.id !== "northern-europe" && row.gap === true && row.reading == null));

const fetchedMiss = await runAznews("news_sources", { fetch: true, id: "bbc" }, { fetchImpl: async () => { throw new Error("offline"); } });
assert.equal(fetchedMiss.outlet.live, false);
assert.equal(fetchedMiss.outlet.status, "configured-but-not-live");
assert.equal(fetchedMiss.live, false);
assert.match(fetchedMiss.note, /not-live/i);

resetFourdmapStore();
const fetchedImage = new TextEncoder().encode("fetched-desk-image");
const fetchedImageUrl = "https://feeds.bbci.co.uk/news/desk.jpg";
const fetchedRss = `<?xml version="1.0"?><rss version="2.0"><channel><item><title>Fetched desk item</title><description>Full wording of the fetched desk item from the wire.</description><pubDate>Sat, 03 Oct 2026 10:00:00 +0200</pubDate><link>https://www.bbc.com/news/fetched-desk-item</link><enclosure url="${fetchedImageUrl}" type="image/jpeg" /></item></channel></rss>`;
const bareRss = `<?xml version="1.0"?><rss version="2.0"><channel><item><title>Undated bare item</title><description>Wording without an image.</description><pubDate>Sat, 03 Oct 2026 08:00:00 GMT</pubDate><link>https://www.cnn.com/bare</link></item></channel></rss>`;
function feedFetch(map) {
  return async (url) => {
    const hit = map[url];
    if (hit == null) {
      return { ok: false, status: 404, text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) };
    }
    const bytes = typeof hit === "string" ? new TextEncoder().encode(hit) : hit;
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return {
      ok: true,
      status: 200,
      text: async () => new TextDecoder().decode(copy),
      arrayBuffer: async () => copy.buffer,
    };
  };
}
const absentFetch = await runAznews(
  "news_pin",
  { fetch: true, id: "bbc", live: true, merged: true },
  { fetchImpl: async () => { throw new Error("offline"); } },
);
assert.equal(absentFetch.ok, false);
assert.equal(absentFetch.code, "AZNEWS-SOURCE-ABSENT");
assert.equal(absentFetch.live, false);
assert.equal(absentFetch.joined, false);
assert.equal(absentFetch.merged, false);
assert.equal(absentFetch.lattice_live, false);
assert.equal(absentFetch.aznews.live, false);
assert.equal(absentFetch.installed, false);
assert.equal(absentFetch.booted, false);
assert.equal(absentFetch.mesh_node, false);

const incompleteFetch = await runAznews(
  "news_pin",
  { fetch: true, id: "cnn", live: true },
  { fetchImpl: feedFetch({ "http://rss.cnn.com/rss/edition.rss": bareRss }) },
);
assert.equal(incompleteFetch.ok, true);
assert.equal(incompleteFetch.item_live, false);
assert.equal(incompleteFetch.on_map, false);
assert.equal(incompleteFetch.live, false);
assert.equal(incompleteFetch.joined, false);
assert.equal(incompleteFetch.installed, false);

const fetchImpl = feedFetch({
  "https://feeds.bbci.co.uk/news/rss.xml": fetchedRss,
  [fetchedImageUrl]: fetchedImage,
});
const standaloneFetch = await runAznews(
  "news_ingest",
  { fetch: true, id: "bbc", offline: true, username: "fetch-reader", live: true, merged: true },
  { fetchImpl },
);
assert.equal(standaloneFetch.ok, true);
assert.equal(standaloneFetch.path, "standalone");
assert.equal(standaloneFetch.on_map, false);
assert.equal(standaloneFetch.live, false);
assert.equal(standaloneFetch.joined, false);
assert.equal(standaloneFetch.item_live, true);
assert.equal(standaloneFetch.source_present, true);
assert.equal(standaloneFetch.lattice_live, true);
assert.equal(standaloneFetch.receipt.lattice_live, true);
assert.equal(standaloneFetch.date, "2026-10-03T08:00:00Z");
assert.equal(standaloneFetch.installed, false);
assert.equal(standaloneFetch.mesh_node, false);
assert.equal(standaloneFetch.booted, false);
assert.equal(
  standaloneFetch.receipt.secondary,
  await offlineSecondaryHash(standaloneFetch.document_hash, "fetch-reader"),
);
assert.doesNotMatch(standaloneFetch.summary, /\{/);

const fetchedPin = await runAznews(
  "news_pin",
  { fetch: true, id: "bbc", offline: true, username: "fetch-reader", live: true, merged: true, installed: true },
  { fetchImpl },
);
assert.equal(fetchedPin.ok, true);
assert.equal(fetchedPin.path, "joined");
assert.equal(fetchedPin.on_map, true);
assert.equal(fetchedPin.item_live, true);
assert.equal(fetchedPin.live, true);
assert.equal(fetchedPin.joined, true);
assert.equal(fetchedPin.aznews.live, true);
assert.equal(fetchedPin.merged, true);
assert.equal(fetchedPin.fixture, false);
assert.equal(fetchedPin.surface, "REAL");
assert.equal(fetchedPin.installed, false);
assert.equal(fetchedPin.installed_app, false);
assert.equal(fetchedPin.booted, false);
assert.equal(fetchedPin.mesh_node, false);
assert.equal(fetchedPin.alt_internet_live, false);
assert.equal(fetchedPin.lattice_live, true);
assert.equal(fetchedPin.receipt.lattice_live, true);
assert.match(fetchedPin.receipt.primary, /^[a-f0-9]{64}$/);
assert.match(fetchedPin.receipt.secondary, /^[a-f0-9]{64}$/);
assert.equal(fetchedPin.date, "2026-10-03T08:00:00Z");
assert.equal(fetchedPin.images[0].verified, true);
assert.equal(
  fetchedPin.receipt.secondary,
  await offlineSecondaryHash(fetchedPin.document_hash, "fetch-reader"),
);
assert.match(fetchedPin.summary, /join is live for this item/i);
assert.doesNotMatch(fetchedPin.summary, /\{/);
assert.doesNotMatch(fetchedPin.summary, /15:20/);
if (fetchedPin.live === true) {
  assert.equal(fetchedPin.ok, true);
  assert.equal(fetchedPin.on_map, true);
  assert.equal(fetchedPin.path, "joined");
  assert.notEqual(fetchedPin.code, "AZNEWS-SOURCE-ABSENT");
}

const fetchedDouble = await runAznews(
  "news_pin",
  { fetch: true, id: "bbc", offline: true, username: "fetch-reader" },
  { fetchImpl },
);
assert.equal(fetchedDouble.ok, false);
assert.equal(fetchedDouble.code, "AZNEWS-DOUBLE");
assert.equal(fetchedDouble.live, false);
assert.equal(fetchedDouble.joined, false);
assert.equal(fetchedDouble.lattice_live, false);
assert.equal(fetchedDouble.aznews.live, false);
assert.equal(fetchedDouble.aznews.lattice_live, false);

const fetchedStatus = await runAznews("news_status", {});
assert.equal(fetchedStatus.ok, true);
assert.equal(fetchedStatus.live, true);
assert.equal(fetchedStatus.joined, true);
assert.equal(fetchedStatus.lattice_live, true);
assert.equal(fetchedStatus.installed, false);
assert.equal(fetchedStatus.mesh_node, false);
assert.match(fetchedStatus.note, /join is live/i);
assert.doesNotMatch(fetchedStatus.note, /\{/);
assert.equal(softwareCatalog(origin, PRODUCTS).count, 42);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);

console.log(`ok 4dmap ${product.version}: LIVE_OPS=${live.join(",")} stub=${STUB_OPS["4dmap"].join(",")} axes=${AXES.join("/")}`);

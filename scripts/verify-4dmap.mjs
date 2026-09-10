/**
 * 4DMap (4DM-WP-1.0) engine invariants + FragGate allowlist.
 * Four-axis inspection frame. Not a sequential gate.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
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
  axisDescribe,
  cardExport,
  cardImport,
  cardJoin,
  cardList,
  cardNew,
  cardPin,
  cardSpan,
  cardWalk,
  detectForbidden,
  fourdmapSkill,
  frameStatus,
  joinTypeForOp,
  neighborCite,
  normalizeAxis,
  normalizeJoinType,
  resetFourdmapStore,
  verifyChain,
  verifyHash,
  walkTrace,
} from "../src/engines/4dmap/engine.js";

resetLedger();
resetFourdmapStore();

const product = PRODUCTS.find((p) => p.slug === "4dmap");
assert.ok(product, "4dmap is a catalog product");
assert.equal(product.name, "4DMap");
assert.equal(product.worker, "4dmap-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/4dmap");
assert.equal(product.version, "0.1.0");
assert.match(product.oneLine, /4DM-WP-1\.0/);
assert.match(product.oneLine, /not a sequential gate|not an extra door/i);
assert.match(product.oneLine, /inspection frame/i);
assert.doesNotMatch(product.oneLine, /Domain Door/);
assert.equal(product.doi, null);
assert.equal(softwareBucket(product.name, product.slug), "plain");

const catalogOps = new Set(product.ops.map((o) => o.op));
const ENHANCED = ["frame_status", "axis_describe", "walk_trace", "card_export", "card_import", "verify_chain", "neighbor_cite"];
for (const op of ["card_new", "card_pin", "card_span", "card_join", "card_walk", "card_list", "verify_hash", "health", "skill", ...ENHANCED]) {
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
assert.equal(joinTypeForOp("card_walk"), "walk");
assert.equal(detectForbidden({ truth_score: true }).kind, "truth_score");
assert.equal(detectForbidden({ invent_mark: true }).kind, "invent_mark");
assert.equal(detectForbidden({ backdate_class: 1 }).kind, "backdate_class");
assert.equal(detectForbidden({ lumen_panel: "on" }).kind, "lumen_panel");
assert.equal(detectForbidden({ label: "inspect-1" }), null);

assert.equal(CATALOG_ALIASES.fourdmap, "4dmap");
assert.equal(CATALOG_ALIASES["4d-map"], "4dmap");
assert.equal(CATALOG_ALIASES["4dm-wp-1.0"], "4dmap");

const live = LIVE_OPS["4dmap"];
for (const op of ["health", "skill", "card_new", "card_pin", "card_span", "card_join", "card_walk", "card_list", "verify_hash", ...ENHANCED]) {
  assert.ok(live.includes(op), `LIVE_OPS.4dmap has ${op}`);
}
for (const alias of ["frame", "axis", "trace", "export", "import", "neighbor"]) {
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
const span = await cardSpan({ card_id: opened.card.card_id, from: "T", to: "Δ" });
assert.equal(span.ok, true);
assert.equal(span.join_type, "span");

const other = await cardNew({ label: "inspect-2" });
const joined = await cardJoin({ card_id: opened.card.card_id, other_id: other.card.card_id, join_type: "cite" });
assert.equal(joined.ok, true);
assert.equal(joined.join_type, "cite");
assert.ok(JOIN_TYPES.includes(joined.join_type));

const walk = await cardWalk({ card_ids: [opened.card.card_id, other.card.card_id] });
assert.equal(walk.ok, true);
assert.equal(walk.join_type, "walk");
assert.equal(walk.walk.chainlock_may_stamp, true);
assert.match(walk.walk.walk_hash, /^[a-f0-9]{64}$/);

const listed = cardList({});
assert.equal(listed.count, 2);
assert.equal(listed.walks.length, 1);

const verified = await verifyHash({ card_id: opened.card.card_id });
assert.equal(verified.match, true);
const walkOk = await verifyHash({ walk_id: walk.walk.walk_id });
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
assert.equal(card.mesh.enabled_default, false);
assert.equal(card.qns_cd.spec, "QNS-CD-1.0");
assert.equal(card.qns_cd.local, "https://github.com/AzielEliab/qnm-node");

const cite = await (await handler(new Request(origin + "/cite.json"), env)).json();
assert.ok(cite.designs.papers.some((p) => p.id === "4DM-WP-1.0" && p.kind === "software"));
assert.ok(cite.products.some((p) => p.slug === "4dmap"));

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

const traced = walkTrace({ walk_id: walk.walk.walk_id });
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

const doorFrame = await (await post("/v1/fraggate/call", { slug: "4dmap", op: "frame" })).json();
assert.equal(doorFrame.ok, true);
assert.equal(doorFrame.result.domains_are_doors, false);
assert.equal(doorFrame.result.not_a_door, true);
assert.equal(doorFrame.result.layer, "inspection_frame");

const skill = await (await handler(new Request(origin + "/v1/skill"), env)).text();
assert.match(skill, /4DMap \(4DM-WP-1\.0\)/);
assert.match(skill, /1\.6\.14/);
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
assert.match(llms, /1\.7\.4/);

const home = await (await handler(new Request(origin + "/"), env)).text();
assert.match(home, /data-slug="4dmap"/);
assert.match(home, /4DM-WP-1\.0/);
assert.match(home, /not a sequential gate/i);
assert.match(home, /1\.7\.4/);
assert.match(home, /frame_status/);
assert.doesNotMatch(product.banner, /Domain Door/);

void claimJoin;
console.log(`ok 4dmap ${product.version}: LIVE_OPS=${live.join(",")} stub=${STUB_OPS["4dmap"].join(",")} axes=${AXES.join("/")}`);

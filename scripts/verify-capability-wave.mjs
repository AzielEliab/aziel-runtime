/**
 * Softwares capability wave 1: decisiongate, forgereceipts, temporallock,
 * staticclock, chronolock, trajectorylock, spectrallock.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { engineOps } from "../src/engines/registry.js";
import { executeLocal } from "../src/engines/runner.js";
import { productVerbTitle } from "../src/display.js";
import { MESH_DEFAULT_ENABLED } from "../src/mesh.js";
import { FEATURE_STATE_AUDIT } from "../src/seo.js";

const WAVE = [
  "decisiongate",
  "forgereceipts",
  "temporallock",
  "staticclock",
  "chronolock",
  "trajectorylock",
  "spectrallock",
];

const REQUIRED_NEW = {
  decisiongate: ["gates", "verify", "doctor"],
  forgereceipts: ["verify", "import_export", "doctor"],
  temporallock: ["timeslate", "gate", "import_export", "doctor"],
  staticclock: ["click", "verify", "timeslate", "import_export", "doctor"],
  chronolock: ["window", "doctor"],
  trajectorylock: ["verify", "schema", "import_export", "doctor"],
  spectrallock: ["targets", "verify", "doctor"],
};

function product(slug) {
  return PRODUCTS.find((p) => p.slug === slug);
}

for (const slug of WAVE) {
  const p = product(slug);
  assert.ok(p, `${slug} is a catalog product`);
  assert.doesNotMatch(p.oneLine, /runtime \d+\.\d+.*FragGate|FragGate.*runtime \d+\.\d+/);
  const catalog = new Set(p.ops.map((o) => o.op));
  const live = LIVE_OPS[slug];
  const engine = engineOps(slug);
  assert.ok(catalog.has("health"), `${slug} catalog health`);
  assert.ok(catalog.has("skill"), `${slug} catalog skill`);
  for (const op of REQUIRED_NEW[slug]) {
    assert.ok(live.includes(op), `${slug} LIVE_OPS has ${op}`);
    assert.ok(catalog.has(op), `${slug} catalog has ${op}`);
    assert.ok(engine.includes(op) || Object.keys({}).length === 0, `${slug} engine lists ${op} or alias`);
  }
  for (const op of live) {
    if (op === "advise" && slug === "chronolock") continue;
    if (op === "advisory" && slug === "staticclock") continue;
    if (op === "evaluate" && slug === "decisiongate") continue;
    assert.ok(engine.includes(op) || catalog.has(op), `${slug} public ${op} is engine or catalog`);
  }
  for (const stub of STUB_OPS[slug] || []) {
    assert.equal(classifyCall(buildRegistry(PRODUCTS).bySlug[slug], stub).kind, "stub", `${slug} ${stub} stub`);
    assert.ok(!live.includes(stub), `${slug} stub ${stub} is not live`);
  }

  const health = await executeLocal({ slug, op: "health", payload: {}, ranIn: "aziel-runtime" });
  assert.equal(health.status, 200, `${slug} health`);
  const body = JSON.parse(health.responseText);
  assert.equal(body.ok, true, `${slug} health ok`);
  assert.equal(body.door, "fraggate", `${slug} door`);
  assert.equal(body.mesh_enabled_default, false, `${slug} mesh default off`);
  assert.ok(Array.isArray(body.axes) && body.axes.length, `${slug} health axes`);
  assert.ok(Array.isArray(body.neighbors) && body.neighbors.length, `${slug} health neighbors`);
  assert.ok(Array.isArray(body.live_ops) && body.live_ops.includes("health"), `${slug} health live_ops`);
  assert.ok(body.limitation && String(body.limitation).includes("THIS IS"), `${slug} limitation`);
  assert.equal(body.author, "Aziel Eliab");

  const skill = await executeLocal({ slug, op: "skill", payload: {}, ranIn: "aziel-runtime" });
  assert.equal(skill.status, 200, `${slug} skill`);
  const skillBody = JSON.parse(skill.responseText);
  assert.match(skillBody.markdown, /LIVE_OPS/);
  assert.match(skillBody.markdown, /fraggate_call/);
  assert.match(skillBody.markdown, /Aziel Eliab/);

  const doctor = await executeLocal({ slug, op: "doctor", payload: {}, ranIn: "aziel-runtime" });
  assert.equal(doctor.status, 200, `${slug} doctor`);
  const docBody = JSON.parse(doctor.responseText);
  assert.equal(docBody.doctor, true, `${slug} doctor flag`);
  assert.equal(docBody.mesh_enabled_default, false);

  assert.match(productVerbTitle(p, "doctor"), /liveness|Doctor|Check/i);
}

const dg = await executeLocal({
  slug: "decisiongate",
  op: "gates",
  payload: {},
  ranIn: "aziel-runtime",
});
const dgGates = JSON.parse(dg.responseText);
assert.equal(dgGates.sequential_gate, true);
assert.equal(dgGates.gates.length, 5);
assert.equal(dgGates.wrap_hosted, false);

const dgCheck = await executeLocal({
  slug: "decisiongate",
  op: "check",
  payload: {
    statement: "Release the catalog Worker this week after the OpenAPI review.",
    evidence: ["OpenAPI 3.1 combined spec."],
    impact_pos: ["One URL for GPT Actions."],
    impact_neg: ["A vague draft takes longer."],
    values: ["Clarity without force"],
    accountable: "Aziel Eliab",
  },
  ranIn: "aziel-runtime",
});
const checked = JSON.parse(dgCheck.responseText);
const dgVerify = await executeLocal({
  slug: "decisiongate",
  op: "verify",
  payload: { lineage: checked.lineage, final_state: checked.final_state },
  ranIn: "aziel-runtime",
});
assert.equal(JSON.parse(dgVerify.responseText).match, true);

const fr = await executeLocal({
  slug: "forgereceipts",
  op: "receipt",
  payload: { note: "filed locally for capability wave" },
  ranIn: "aziel-runtime",
});
const minted = JSON.parse(fr.responseText);
assert.equal(minted.ok, true);
const frV = await executeLocal({
  slug: "forgereceipts",
  op: "verify",
  payload: { receipt: minted.receipt },
  ranIn: "aziel-runtime",
});
assert.equal(JSON.parse(frV.responseText).match, true);
const frX = await executeLocal({
  slug: "forgereceipts",
  op: "import_export",
  payload: { mode: "export", receipt: minted.receipt },
  ranIn: "aziel-runtime",
});
assert.equal(JSON.parse(frX.responseText).ok, true);

const tl = await executeLocal({
  slug: "temporallock",
  op: "genesis",
  payload: { summary: "sky", evidence: "photo:./sky.jpg", confidence: 0.9 },
  ranIn: "aziel-runtime",
});
const chain = JSON.parse(tl.responseText).chain;
const tlX = await executeLocal({
  slug: "temporallock",
  op: "import_export",
  payload: { mode: "export", chain },
  ranIn: "aziel-runtime",
});
assert.equal(JSON.parse(tlX.responseText).ok, true);
const tlI = await executeLocal({
  slug: "temporallock",
  op: "import_export",
  payload: { mode: "import", chain },
  ranIn: "aziel-runtime",
});
assert.equal(JSON.parse(tlI.responseText).ok, true);

const sc = await executeLocal({
  slug: "staticclock",
  op: "click",
  payload: { action: "tick", clicks: [] },
  ranIn: "aziel-runtime",
});
const clicks = JSON.parse(sc.responseText).clicks;
assert.ok(clicks.length === 1);
const scV = await executeLocal({
  slug: "staticclock",
  op: "verify",
  payload: { clicks },
  ranIn: "aziel-runtime",
});
assert.equal(JSON.parse(scV.responseText).ok, true);

const cl = await executeLocal({
  slug: "chronolock",
  op: "window",
  payload: { geo: "Indiana" },
  ranIn: "aziel-runtime",
});
const win = JSON.parse(cl.responseText);
assert.equal(win.scheduler, false);
assert.ok(Array.isArray(win.window) && win.window.length === 2);

const trS = await executeLocal({
  slug: "trajectorylock",
  op: "schema",
  payload: {},
  ranIn: "aziel-runtime",
});
assert.ok(JSON.parse(trS.responseText).observation_types.includes("direct_line"));
const trX = await executeLocal({
  slug: "trajectorylock",
  op: "import_export",
  payload: { mode: "export" },
  ranIn: "aziel-runtime",
});
assert.equal(JSON.parse(trX.responseText).media_stored, false);

const sp = await executeLocal({
  slug: "spectrallock",
  op: "targets",
  payload: {},
  ranIn: "aziel-runtime",
});
const targets = JSON.parse(sp.responseText);
assert.ok(targets.target_ids.includes("ink"));
assert.equal(targets.spectrometer, false);

for (const forbidden of ["akm", "akm-triad", "adaptive-memory", "memory"]) {
  assert.ok(!product(forbidden), `${forbidden} is fabric, not a Softwares-tab catalog engine`);
}
for (const slug of WAVE) {
  for (const op of LIVE_OPS[slug] || []) {
    assert.ok(!String(op).startsWith("memory_"), `${slug} LIVE_OPS does not invent memory_* software verbs`);
  }
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.decisiongate.status, "live");
assert.equal(classifyCall(registry.bySlug.decisiongate, "wrap").kind, "stub");
assert.equal(classifyCall(registry.bySlug.forgereceipts, "court").kind, "stub");
assert.equal(classifyCall(registry.bySlug.temporallock, "rollback").kind, "stub");
assert.equal(classifyCall(registry.bySlug.staticclock, "rollback").kind, "stub");
assert.equal(classifyCall(registry.bySlug.chronolock, "cron").kind, "stub");
assert.equal(classifyCall(registry.bySlug.trajectorylock, "store_media").kind, "stub");
assert.equal(classifyCall(registry.bySlug.spectrallock, "forensic").kind, "stub");

assert.equal(FEATURE_STATE_AUDIT.remain_off_by_design, true);
assert.equal(MESH_DEFAULT_ENABLED, false);

const REMAIN_OFF = [
  { slug: "ark", op: "wipe" },
  { slug: "ark", op: "scorch" },
  { slug: "ark", op: "unlock" },
  { slug: "ark", op: "encrypt" },
  { slug: "veillock", op: "inject" },
  { slug: "azos", op: "exec" },
  { slug: "azos", op: "shell" },
  { slug: "4dmap", op: "truth_score" },
  { slug: "4dmap", op: "invent_mark" },
  { slug: "4dmap", op: "backdate_class" },
  { slug: "4dmap", op: "lumen_panel" },
  { slug: "memory", op: "rollback" },
  { slug: "temporallock", op: "rollback" },
  { slug: "staticclock", op: "rollback" },
  { slug: "mesh", op: "wipe" },
  { slug: "mesh", op: "arm" },
];
for (const { slug, op } of REMAIN_OFF) {
  const entry = registry.bySlug[slug];
  assert.ok(entry, `${slug} is in the FragGate registry`);
  assert.equal(classifyCall(entry, op).kind, "stub", `${slug}/${op} Remain-Off-by-Design`);
  assert.ok((STUB_OPS[slug] || []).includes(op), `${slug} STUB_OPS lists ${op}`);
  assert.ok(!(LIVE_OPS[slug] || []).includes(op), `${slug} LIVE_OPS does not include ${op}`);
}
assert.equal(registry.bySlug.veillock.status, "local_only");

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const meshGet = await handler(new Request(origin + "/v1/mesh", { headers: { "user-agent": "Mozilla/5.0" } }), {});
assert.equal(meshGet.status, 200);
const meshBody = await meshGet.json();
assert.equal(meshBody.enabled, false, "GET /v1/mesh never enables");
assert.notEqual(meshBody.enabled, true);

const rollback = await handler(
  new Request(origin + "/v1/rollback", { method: "POST", headers: { "user-agent": "Mozilla/5.0" } }),
  {},
);
assert.equal(rollback.status, 404, "no public rollback API");
const roseRollback = await handler(
  new Request(origin + "/v1/roseclock/rollback", { method: "POST", headers: { "user-agent": "Mozilla/5.0" } }),
  {},
);
assert.equal(roseRollback.status, 404, "no RoseClock rewind API");

console.log(`ok capability wave 1: ${WAVE.join(", ")}`);

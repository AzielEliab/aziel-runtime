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
import {
  HANDWRITING_NOTE,
  RECOVER_NOTE,
  REFUSE_OPAQUE,
  UNREDACT_NOTE,
  classifyCoverBuf,
  handwritingFromB64,
  REFUSE_GONE,
  SPECTRAL_TRIAD_HEX,
  WHEEL_PAINT_HEX,
  listHandwriting,
  listPigment,
  listRecover,
  listUnredact,
  locatePdfBytes,
  parseHandwritingOp,
  parsePigmentOp,
  parseRecoverOp,
  parseUnredactOp,
  pigmentFromB64,
  recoverFromB64,
  unredactFromB64,
} from "../src/engines/spectrallock/overlay.js";

const WAVE = [
  "decisiongate",
  "forgereceipts",
  "temporallock",
  "staticclock",
  "chronolock",
  "trajectorylock",
  "spectrallock",
];

const WAVE23 = [
  "peacelock",
  "employeelock",
  "whistlelock",
  "shadowlock",
  "foldlock",
  "godlock",
  "vibelock",
  "codelock",
  "azclce",
  "azos",
  "glossafilter",
  "miragegrid",
  "postking",
  "ark",
  "azai",
  "azbot",
  "zsolver",
  "mialock",
  "azieltether",
  "aziel-corpus",
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

const spModes = await executeLocal({
  slug: "spectrallock",
  op: "modes",
  payload: {},
  ranIn: "aziel-runtime",
});
const modesBody = JSON.parse(spModes.responseText);
const expectedModes = ["zero", "tazel", "vyrn", "uv", "rosetta", "zen", "chaos", "balance", "candle", "indent", "lemon"];
assert.deepEqual(modesBody.live, expectedModes);
assert.deepEqual(modesBody.mode_ids, expectedModes);
assert.equal(modesBody.modes.length, 11);
assert.equal(modesBody.aliases.ultraviolet, "uv");
assert.equal(modesBody.aliases["uv-light"], "uv");
assert.equal(modesBody.aliases.uvsa, "uv");
assert.ok(modesBody.limitation.includes("THIS IS"));
assert.match(modesBody.limitation, /256/);
assert.equal(modesBody.inject.accepted, true);
assert.deepEqual(modesBody.inject.values, [true, false]);
assert.equal(modesBody.inject.zero_ignores, true);
assert.equal(modesBody.pigment_recovery, false);
assert.equal(modesBody.uv_lamp, false);
assert.match(modesBody.limitation, /inject/i);
assert.match(modesBody.limitation, /pigment/);
assert.match(modesBody.limitation, /UV is not a lamp/);
assert.match(String(modesBody.inject.note), /synthetic 365/);
assert.match(String(modesBody.inject.note), /Balance never invents marks/);
assert.equal(modesBody.wheel_paint.separate_from_triad, true);
assert.equal(modesBody.wheel_paint.triad.tazel, SPECTRAL_TRIAD_HEX.tazel);
assert.equal(modesBody.wheel_paint.paint.tazel, WHEEL_PAINT_HEX.tazel);
assert.notEqual(modesBody.wheel_paint.triad.tazel, modesBody.wheel_paint.paint.tazel);
assert.equal(modesBody.wheel_paint.triad.vyrn, "#C00066");
assert.equal(modesBody.wheel_paint.paint.vyrn, "#A22639");
assert.equal(modesBody.pigment.catalog_door_op, true);
assert.equal(modesBody.pigment.status, "live");
assert.equal(modesBody.pigment.refuse_code, "SL-PIGMENT-GONE");
assert.equal(modesBody.amoe_live_product, false);
assert.equal(modesBody.leftover_bytes_recovery, true);
assert.equal(modesBody.ocr_from_black_box, false);
assert.equal(modesBody.unredact.leftover_bytes_recovery, true);
assert.equal(modesBody.unredact.revision_graph, true);
assert.equal(modesBody.unredact.revision_copies, true);
assert.equal(modesBody.unredact.pigment_recovery, false);
assert.equal(modesBody.unredact.guessed_letters, false);
assert.equal(modesBody.unredact.heatmap_is_transcript, false);
assert.equal(modesBody.unredact.ocr_from_black_box, false);
assert.equal(modesBody.unredact.catalog_door_op, false);
assert.equal(modesBody.unredact.refuse_code, "SL-UNREDACT-OPAQUE");
assert.deepEqual(modesBody.unredact.ops, ["locate", "lift", "recover", "refuse"]);
assert.deepEqual(modesBody.unredact.family, ["unredact", "lift", "redact-locate"]);
assert.match(String(modesBody.unredact.note), /leftover/);
assert.equal(modesBody.revision_graph, true);
assert.equal(modesBody.recover.catalog_door, false);
assert.equal(modesBody.recover.catalog_door_op, false);
assert.equal(modesBody.recover.revision_graph, true);
assert.deepEqual(
  modesBody.recover.ops,
  ["locate", "deep-recover", "revision-graph", "cross-compare", "extract-embedded", "scan-orphans", "scan-metadata", "scan-sidecars", "scan-history", "refuse"],
);
assert.ok(modesBody.recover.slot_kinds.includes("7z"));
assert.ok(modesBody.recover.slot_kinds.includes("heic"));
assert.ok(modesBody.recover.slot_kinds.includes("heif"));
assert.ok(modesBody.recover.refuse_codes.includes("SL-RECOVER-NO-BYTES"));
assert.equal(modesBody.recover.worker_path, "/v1/recover");
assert.equal(modesBody.handwriting.catalog_door, false);
assert.equal(modesBody.handwriting.catalog_door_op, false);
assert.equal(modesBody.handwriting.esda, false);
assert.equal(modesBody.handwriting.forensic_certification, false);
assert.equal(modesBody.handwriting.jpeg, false);
assert.deepEqual(
  modesBody.handwriting.ops,
  ["analyze", "compare", "side-by-side", "graph", "forgery-indicators", "refuse"],
);
assert.ok(modesBody.handwriting.slot_signals.includes("esda"));
assert.ok(modesBody.handwriting.slot_signals.includes("writer_identity"));
assert.ok(modesBody.handwriting.slot_signals.includes("jpeg_decode"));
assert.equal(modesBody.handwriting.worker_path, "/v1/handwriting");
assert.match(modesBody.limitation, /SL-UNREDACT-OPAQUE/);
assert.match(modesBody.limitation, /leftover-bytes/);
assert.match(modesBody.limitation, /revision graph/);
assert.match(modesBody.limitation, /7z \/ HEIC \/ HEIF stay SLOT/);
assert.match(modesBody.limitation, /not ESDA/);
assert.match(modesBody.limitation, /not a FragGate door op/);
assert.match(modesBody.limitation, /\/v1\/recover/);
assert.match(modesBody.limitation, /\/v1\/handwriting/);
assert.ok(!LIVE_OPS.spectrallock.includes("unredact"), "unredact is not a catalog LIVE_OP");
assert.ok(!LIVE_OPS.spectrallock.includes("locate"), "locate is not a catalog LIVE_OP");
assert.ok(!LIVE_OPS.spectrallock.includes("lift"), "lift is not a catalog LIVE_OP");
assert.ok(!LIVE_OPS.spectrallock.includes("recover"), "recover is not a catalog LIVE_OP");
assert.ok(!LIVE_OPS.spectrallock.includes("handwriting"), "handwriting is not a catalog LIVE_OP");
assert.ok(!LIVE_OPS.spectrallock.includes("refuse"), "refuse is not a catalog LIVE_OP");
assert.ok(LIVE_OPS.spectrallock.includes("pigment"), "pigment is a catalog LIVE_OP");
assert.ok(LIVE_OPS.spectrallock.includes("restore-pigment"), "restore-pigment is a catalog LIVE_OP");
assert.deepEqual(LIVE_OPS.spectrallock, ["modes", "targets", "overlay", "pigment", "restore-pigment", "verify", "doctor", "health", "skill"]);

const spSkill = await executeLocal({
  slug: "spectrallock",
  op: "skill",
  payload: {},
  ranIn: "aziel-runtime",
});
const skillBody = JSON.parse(spSkill.responseText);
assert.match(String(skillBody.skill || skillBody.markdown), /inject true\|false/);
assert.match(String(skillBody.skill || skillBody.markdown), /not recovered pigment/);
assert.match(String(skillBody.skill || skillBody.markdown), /Spectral Harmonic Wheel/);
assert.match(String(skillBody.skill || skillBody.markdown), /restore lost pigment/i);
assert.match(String(skillBody.skill || skillBody.markdown), /SL-PIGMENT-GONE/);
assert.match(String(skillBody.skill || skillBody.markdown), /AMOE/);
assert.match(String(skillBody.skill || skillBody.markdown), /tazel_inband_pct/);
assert.match(String(skillBody.skill || skillBody.markdown), /leftover-bytes/);
assert.match(String(skillBody.skill || skillBody.markdown), /revision_graph/);
assert.match(String(skillBody.skill || skillBody.markdown), /SL-UNREDACT-OPAQUE/);
assert.match(String(skillBody.skill || skillBody.markdown), /Never OCR-from-black-box/);
assert.match(String(skillBody.skill || skillBody.markdown), /7z \/ HEIC \/ HEIF stay SLOT/);
assert.match(String(skillBody.skill || skillBody.markdown), /not ESDA/);
assert.match(String(skillBody.limitation), /Balance\/lemon\/indent never invent marks/);
assert.match(String(skillBody.limitation), /SL-UNREDACT-OPAQUE/);
assert.match(String(skillBody.limitation), /SL-RECOVER-\*/);
assert.match(String(skillBody.limitation), /SL-HANDWRITING-\*/);
assert.match(String(skillBody.skill || skillBody.markdown), /SL-RECOVER-\*/);
assert.match(String(skillBody.skill || skillBody.markdown), /SL-HANDWRITING-\*/);

const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const spOverlayOn = await executeLocal({
  slug: "spectrallock",
  op: "overlay",
  payload: { mode: "vyrn", inject: true, b64: TINY_PNG },
  ranIn: "aziel-runtime",
});
const overlayOn = JSON.parse(spOverlayOn.responseText);
assert.equal(overlayOn.inject, true);
assert.equal(overlayOn.pigment_recovery, false);
assert.equal(typeof overlayOn.tazel_inband_pct, "number");
assert.equal(typeof overlayOn.vyrn_inband_pct, "number");
const spOverlayOff = await executeLocal({
  slug: "spectrallock",
  op: "overlay",
  payload: { mode: "vyrn", inject: false, b64: TINY_PNG },
  ranIn: "aziel-runtime",
});
const overlayOff = JSON.parse(spOverlayOff.responseText);
assert.equal(overlayOff.inject, false);
assert.equal(overlayOff.inject_applied, false);
const spOverlayZero = await executeLocal({
  slug: "spectrallock",
  op: "overlay",
  payload: { mode: "zero", inject: true, b64: TINY_PNG },
  ranIn: "aziel-runtime",
});
const overlayZero = JSON.parse(spOverlayZero.responseText);
assert.equal(overlayZero.inject, true);
assert.equal(overlayZero.inject_applied, false);
assert.equal(overlayZero.inject_ignored, true);

assert.equal(parsePigmentOp("restore-pigment"), "restore");
assert.equal(parsePigmentOp("estimate-pigment"), "estimate");
assert.equal(listPigment().status, "live");
assert.equal(REFUSE_GONE, "SL-PIGMENT-GONE");
assert.notEqual(SPECTRAL_TRIAD_HEX.tazel, WHEEL_PAINT_HEX.tazel);
const gonePigment = await pigmentFromB64(TINY_PNG, { op: "restore" });
assert.equal(gonePigment.pigment_recovery, true);
assert.equal(gonePigment.recovered, false);
assert.equal(gonePigment.refuse_code, "SL-PIGMENT-GONE");
assert.equal(gonePigment.invented_marks, false);
assert.equal(gonePigment.wheel_paint_used, false);
assert.equal(gonePigment.spectral_triad_used_for_restore, false);
const spPigment = await executeLocal({
  slug: "spectrallock",
  op: "pigment",
  payload: {},
  ranIn: "aziel-runtime",
});
const pigmentList = JSON.parse(spPigment.responseText);
assert.equal(pigmentList.status, "live");
assert.equal(pigmentList.catalog_door_op, true);
assert.equal(pigmentList.amoe_live_product, false);
assert.deepEqual(pigmentList.family, ["pigment", "restore-pigment"]);
const spRestore = await executeLocal({
  slug: "spectrallock",
  op: "restore-pigment",
  payload: { b64: TINY_PNG, op: "refuse" },
  ranIn: "aziel-runtime",
});
const pigmentRefuse = JSON.parse(spRestore.responseText);
assert.equal(pigmentRefuse.family, "pigment");
assert.equal(pigmentRefuse.pigment_recovery, true);
assert.equal(pigmentRefuse.recovered, false);
assert.equal(pigmentRefuse.refuse_code, "SL-PIGMENT-GONE");
assert.equal(pigmentRefuse.amoe_live_product, false);
assert.equal(parseUnredactOp("redact-locate"), "locate");
assert.equal(parseUnredactOp("leftover-bytes"), "recover");
assert.equal(parseRecoverOp("deep"), "deep-recover");
assert.equal(parseRecoverOp("revision-graph"), "revision-graph");
assert.equal(parseHandwritingOp("forgery-scan"), "forgery-indicators");
assert.equal(REFUSE_OPAQUE, "SL-UNREDACT-OPAQUE");
assert.match(UNREDACT_NOTE, /leftover/);
assert.match(UNREDACT_NOTE, /Heatmaps are residual overlays/);
assert.match(UNREDACT_NOTE, /revision graph/);
assert.match(RECOVER_NOTE, /SLOT parsers stay SLOT/);
assert.match(HANDWRITING_NOTE, /human verification required/);
assert.equal(listUnredact().leftover_bytes_recovery, true);
assert.equal(listUnredact().revision_graph, true);
assert.deepEqual(listRecover().slot_kinds, ["7z", "heic", "heif"]);
assert.equal(listRecover().catalog_door, false);
assert.equal(listHandwriting().esda, false);
assert.equal(listHandwriting().catalog_door, false);
assert.ok(listHandwriting().slot_signals.includes("jpeg_decode"));
const leftoverPdf = new TextEncoder().encode(
  "%PDF-1.4\n1 0 obj << /Title (Docket) >> endobj\n4 0 obj << /Length 20 >> stream\nBT (ALICE SMITH) Tj ET\nendstream\nendobj\n4 0 obj << /Length 8 >> stream\n0 0 0 rg\nendstream\nendobj\n%%EOF\n%%EOF\n",
);
const leftoverLocate = locatePdfBytes(leftoverPdf);
assert.equal(leftoverLocate.leftover_bytes, true);
assert.match((leftoverLocate.recovered || []).map((r) => r.preview || "").join(" ").toUpperCase(), /ALICE/);
assert.ok((leftoverLocate.recovered_from || []).length >= 1);
const leftoverB64 = Buffer.from(leftoverPdf).toString("base64");
const leftoverRecover = await unredactFromB64(leftoverB64, { op: "recover" });
assert.equal(leftoverRecover.leftover_bytes, true);
assert.ok(Array.isArray(leftoverRecover.recovered_from));
assert.ok((leftoverRecover.recovered || []).some((r) => String(r.object_id || "").length && Number.isFinite(r.offset)));
assert.match(String(leftoverRecover.note), /leftover/);
assert.equal(leftoverRecover.guessed_letters, false);
assert.equal(leftoverRecover.heatmap_is_transcript, false);
assert.ok(leftoverRecover.revision_graph);
assert.equal(leftoverRecover.revision_graph.invented, false);
assert.ok(Array.isArray(leftoverRecover.page_revisions));
const leftoverUniversal = await recoverFromB64(leftoverB64, { op: "revision-graph", filename: "docket.pdf" });
assert.equal(leftoverUniversal.family, "recover");
assert.equal(leftoverUniversal.type, "pdf");
assert.equal(leftoverUniversal.no_lie, true);
assert.ok(leftoverUniversal.revision_graph);
assert.ok((leftoverUniversal.recovered || []).length >= 1);
const blackBuf = new Float32Array(32 * 48 * 3);
for (let i = 0; i < blackBuf.length; i++) blackBuf[i] = 0.93;
for (let y = 8; y < 24; y++) {
  for (let x = 6; x < 42; x++) {
    const p = (y * 48 + x) * 3;
    blackBuf[p] = blackBuf[p + 1] = blackBuf[p + 2] = 0;
  }
}
const opaqueCover = classifyCoverBuf(blackBuf, 48, 32);
assert.equal(opaqueCover.opaque_replace, true);
const noLeftoverRecover = await unredactFromB64(TINY_PNG, { op: "recover" });
assert.equal(noLeftoverRecover.leftover_bytes, false);
assert.equal(noLeftoverRecover.refuse_code, "SL-UNREDACT-OPAQUE");
assert.equal(noLeftoverRecover.stop, true);
assert.equal(noLeftoverRecover.guessed_letters, false);
const tinyHand = await handwritingFromB64(TINY_PNG, { op: "analyze" });
assert.equal(tinyHand.family, "handwriting");
assert.equal(tinyHand.esda, false);
assert.equal(tinyHand.forensic_certification, false);
assert.equal(tinyHand.writer_identification_as_fact, false);
assert.ok(
  tinyHand.refuse_code === "SL-HANDWRITING-NO-INK" ||
    (Array.isArray(tinyHand.indicators) && tinyHand.invented === false),
);

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
assert.equal(classifyCall(registry.bySlug.spectrallock, "pigment").kind, "live");
assert.equal(classifyCall(registry.bySlug.spectrallock, "restore-pigment").kind, "live");
assert.equal(classifyCall(registry.bySlug.spectrallock, "unredact").kind, "unknown_op");
assert.equal(classifyCall(registry.bySlug.spectrallock, "locate").kind, "unknown_op");
assert.equal(classifyCall(registry.bySlug.spectrallock, "lift").kind, "unknown_op");
assert.equal(classifyCall(registry.bySlug.spectrallock, "recover").kind, "unknown_op");
assert.equal(classifyCall(registry.bySlug.spectrallock, "handwriting").kind, "unknown_op");

for (const slug of WAVE23) {
  const p = product(slug);
  assert.ok(p, `${slug} is a catalog product`);
  const live = LIVE_OPS[slug];
  assert.ok(live.includes("doctor"), `${slug} LIVE_OPS has doctor`);
  assert.ok(p.ops.some((o) => o.op === "doctor"), `${slug} catalog has doctor`);
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
  const doctor = await executeLocal({ slug, op: "doctor", payload: {}, ranIn: "aziel-runtime" });
  assert.equal(doctor.status, 200, `${slug} doctor`);
  assert.equal(JSON.parse(doctor.responseText).doctor, true, `${slug} doctor flag`);
}

const review = JSON.parse(
  (await executeLocal({ slug: "aziel-corpus", op: "review", payload: { record_id: "AZDOC-FLORENCE-SAMPLE" }, ranIn: "aziel-runtime" }))
    .responseText,
);
assert.equal(review.ok, true);
assert.equal(review.live_ingest, false);
const geo = JSON.parse(
  (await executeLocal({ slug: "aziel-corpus", op: "verify-geo", payload: { place: "Florence" }, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(geo.match, true);

console.log(`ok capability wave 1 + wave 2–3: ${WAVE.concat(WAVE23).join(", ")}`);

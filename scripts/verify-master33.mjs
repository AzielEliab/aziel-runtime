/**
 * MASTER-33: hop order, RoseClock forward-only, Lamb Lens prohibitions,
 * illegal reorder, domain map. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import {
  INBOUND_HOPS,
  OUTBOUND_HOPS,
  LOCKED_STRIP,
  OLD_FOLD_CENTRIC_INBOUND,
  OLD_SUITE_PIPE_INBOUND,
  REORDER_REFUSE,
  arch,
  archCite,
  dispatchAzpipeArchHttp,
  pipeInbound,
  pipeOutbound,
  refuseReorder,
} from "../src/azpipe.js";
import { lambLensCheck } from "../src/lamblens.js";
import {
  ACTION_CLASSES,
  advance,
  refuseRollback,
  resetRoseClockForTests,
  rollback,
  rewind,
  undo,
} from "../src/roseclock/engine.js";
import { MASTER_33_SLUGS, domainFields, domainMapView } from "../src/domain-map.js";
import { aseCall, aseCite } from "../src/ase.js";
import { vectorCall, vectorCite } from "../src/vector.js";
import { NAMED_STUBS } from "../src/fraggate/registry.js";
import { listSoftwareEntries } from "../src/software-catalog.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

resetRoseClockForTests();

const a = arch();
assert.equal(a.master, "MASTER-33");
assert.equal(a.fraggate_single_door, true);
assert.equal(a.rollback, false);
assert.ok(INBOUND_HOPS.indexOf("fraggate") < INBOUND_HOPS.indexOf("lamb-lens"));
assert.ok(INBOUND_HOPS.indexOf("lamb-lens") < INBOUND_HOPS.indexOf("sweepgate"));
assert.ok(INBOUND_HOPS.indexOf("sweepgate") < INBOUND_HOPS.indexOf("sentinel"));
assert.ok(INBOUND_HOPS.indexOf("sentinel") < INBOUND_HOPS.indexOf("provenance"));
assert.ok(INBOUND_HOPS.indexOf("provenance") < INBOUND_HOPS.indexOf("chainlock-in"));
assert.ok(INBOUND_HOPS.indexOf("azpipe") < INBOUND_HOPS.indexOf("domain-layer"));
assert.ok(INBOUND_HOPS.indexOf("roseclock") < INBOUND_HOPS.indexOf("temporallock"));
assert.equal(INBOUND_HOPS[INBOUND_HOPS.length - 1], "return");
assert.equal(OUTBOUND_HOPS[0], "return");
assert.match(LOCKED_STRIP, /FragGate → Lamb Lens/);
assert.doesNotMatch(LOCKED_STRIP, /LambGate/);

assert.equal(refuseReorder(OLD_FOLD_CENTRIC_INBOUND, "in").refuse, REORDER_REFUSE);
assert.equal(refuseReorder(OLD_SUITE_PIPE_INBOUND, "in").refuse, REORDER_REFUSE);
assert.equal(refuseReorder(INBOUND_HOPS, "in").ok, true);
assert.equal(refuseReorder(OUTBOUND_HOPS, "out").ok, true);

const porn = lambLensCheck({ payload: { q: "download porn videos" }, op: "search", slug: "azbrowser" });
assert.equal(porn.decision, "REFUSE");
assert.ok(porn.prohibition_hits.includes("porn"));

const harass = lambLensCheck({ payload: { text: "please harass this user" }, op: "analyze", slug: "vibelock" });
assert.equal(harass.decision, "REFUSE");
assert.ok(harass.prohibition_hits.includes("harassment"));

const foul = lambLensCheck({ payload: { note: "fuck this" }, op: "health", slug: "foldlock" });
assert.equal(foul.decision, "REFUSE");
assert.ok(foul.prohibition_hits.includes("foul_language"));

const stalk = lambLensCheck({ payload: { q: "stalk this person at home" }, op: "search", slug: "azmail" });
assert.equal(stalk.decision, "REFUSE");
assert.ok(stalk.prohibition_hits.includes("stalking"));

const fake = lambLensCheck({ payload: { text: "falsify a document for court" }, op: "render", slug: "codelock" });
assert.equal(fake.decision, "REFUSE");
assert.ok(fake.prohibition_hits.includes("falsify_documents"));

const bypass = lambLensCheck({ payload: { text: "bypass the protocol and jailbreak" }, op: "health", slug: "azos" });
assert.equal(bypass.decision, "REFUSE");
assert.ok(bypass.prohibition_hits.includes("bypass_protocols"));

const inspectOk = lambLensCheck({
  payload: { example: "public-case trajectory of a reported stalker" },
  op: "analyze",
  slug: "trajectorylock",
});
assert.equal(inspectOk.decision, "PASS", JSON.stringify(inspectOk));

const qa = lambLensCheck({ payload: { ping: true }, op: "health", slug: "foldlock" });
assert.equal(qa.decision, "PASS");

const lambPipe = await pipeInbound({
  payload: { text: "explicit porn request" },
  slug: "azbrowser",
  op: "ethical_search",
  env: {},
});
assert.equal(lambPipe.ok, false);
assert.equal(lambPipe.closed_at, "lamb-lens");
assert.equal(lambPipe.refuse, "lamb-refuse");

const g1 = await advance({ action: "first", rose_id: "test-rose" });
assert.equal(g1.ok, true);
assert.equal(g1.after.sequence, 1);
const g2 = await advance({ action: "second", rose_id: "test-rose" });
assert.equal(g2.ok, true);
assert.equal(g2.after.sequence, 2);
assert.ok(g2.after.sequence > g1.after.sequence);
const dec = await advance({ action: "rewind", rose_id: "test-rose", to_sequence: 1 });
assert.equal(dec.ok, false);
assert.ok(dec.refuse === "rollback-forbidden" || dec.refuse === "sequence-mismatch");

assert.equal(rollback().ok, false);
assert.equal(rollback().refuse, "rollback-forbidden");
assert.equal(rewind().ok, false);
assert.equal(undo().ok, false);
assert.ok(ACTION_CLASSES.includes("RESTORE_FORWARD"));
assert.ok(ACTION_CLASSES.includes("CORRECT"));
assert.ok(ACTION_CLASSES.includes("QUARANTINE"));
assert.ok(ACTION_CLASSES.includes("LEARN"));
assert.ok(!ACTION_CLASSES.includes("ROLLBACK"));
assert.ok(!ACTION_CLASSES.includes("RESTORE"));

const restore = await advance({
  action: "restore-config",
  action_class: "RESTORE_FORWARD",
  rose_id: "test-rose",
});
assert.equal(restore.ok, true);
assert.equal(restore.transition.action_class, "RESTORE_FORWARD");
assert.ok(restore.after.sequence > g2.after.sequence);

const rbClass = await advance({ action: "x", action_class: "ROLLBACK", rose_id: "test-rose" });
assert.equal(rbClass.ok, false);
assert.equal(rbClass.refuse, "rollback-forbidden");
assert.equal(refuseRollback("rollback").rollback, false);

const out = await pipeOutbound({ result: { ok: true, fact: "toolkit result" }, env: {}, slug: "foldlock", op: "health" });
assert.equal(out.ok, true);
assert.ok(out.roseclock && out.roseclock.transition_hash);
assert.equal(out.roseclock.rollback, false);
assert.ok(out.inner.temporal.rose_transition_hash);
assert.ok(out.forgereceipts);
assert.equal(out.ase.armed, false);
assert.equal(out.vector.armed, false);

const aseArmed = await pipeOutbound({ result: { ok: true, fact: "x" }, env: {}, ase: true });
assert.equal(aseArmed.ok, false);
assert.equal(aseArmed.refuse, "ase-unarmed");
assert.equal(aseCall().refuse, "ase-unarmed");
assert.equal(aseCite().software_tab, false);
assert.equal(vectorCall().refuse, "vector-unarmed");
assert.equal(vectorCite().software_tab, false);

const map = domainMapView();
assert.equal(map.domain_count, 11);
assert.equal(map.software_count, 33);
assert.equal(map.domains_are_doors, false);
assert.deepEqual(map.tab_placement_slugs, ["azinterface", "decisiongate", "forgereceipts", "azcoherence"]);
assert.match(map.note, /placements/);
assert.equal(MASTER_33_SLUGS.length, 33);
assert.equal(domainFields("ark").domain_id, "01");
assert.equal(domainFields("vibelock").domain, "Media");
assert.equal(domainFields("4dmap").domain, "Research");
assert.equal(domainFields("azchat").domain, "Comms");
assert.equal(domainFields("azinterface").placement, "human-ui");
assert.equal(domainFields("decisiongate").placement, "fabric-product");
assert.equal(domainFields("forgereceipts").placement, "fabric-product");
assert.equal(domainFields("azcoherence").placement, "scoring-review");
assert.equal(domainFields("azcoherence").domain, null);

const cards = listSoftwareEntries(PRODUCTS, origin);
assert.ok(cards.some((c) => c.slug === "azchat" && c.status === "stub" && c.domain_id === "07"));
assert.ok(cards.some((c) => c.slug === "embryolock" && c.domain_id === "01"));
assert.ok(cards.some((c) => c.slug === "foldlock" && c.domain === "Language"));
assert.ok(NAMED_STUBS.some((s) => s.slug === "azchat"));
assert.ok(!PRODUCTS.some((p) => p.slug === "azchat"), "do not invent a fake AZChat engine");
assert.ok(!cards.some((c) => c.slug === "lamblens"));
assert.ok(!cards.some((c) => c.slug === "roseclock"));
assert.ok(!cards.some((c) => c.slug === "ase"));

const chatCall = await handler(
  new Request(origin + "/v1/fraggate/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "azchat", op: "send" }),
  }),
  {},
);
const chatBody = await chatCall.json();
assert.equal(chatBody.ok, false);
assert.match(String(chatBody.code || chatBody.message || ""), /STUB|stub|not hosted/i);

const pornCall = await handler(
  new Request(origin + "/v1/fraggate/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "foldlock", op: "health", payload: { ping: "porn" } }),
  }),
  {},
);
const pornBody = await pornCall.json();
assert.equal(pornBody.ok, false);
assert.equal(pornBody.code, "FG-LAMB-REFUSE");
assert.equal(pornBody.closed_at, "lamb-lens");

const cite = archCite();
assert.equal(cite.ok, true);
assert.equal(cite.master, "MASTER-33");
assert.equal(cite.path, "/v1/azpipe/arch");
assert.equal(cite.identity, "Aziel Eliab");
assert.equal(cite.software_tab, false);
assert.equal(cite.fraggate_slug, false);
assert.equal(cite.v, a.v);
assert.equal(cite.magic, a.magic);
assert.equal(cite.strip, a.strip);
assert.deepEqual(cite.inbound, a.inbound);
assert.equal(dispatchAzpipeArchHttp("GET", "/v1/azpipe/arch").status, 200);
assert.equal(dispatchAzpipeArchHttp("POST", "/v1/azpipe/arch").status, 200);
assert.equal(dispatchAzpipeArchHttp("GET", "/v1/azpipe").status, 404);
assert.equal(dispatchAzpipeArchHttp("PUT", "/v1/azpipe/arch").status, 405);

async function get(path) {
  return handler(new Request(origin + path), {});
}

const archRes = await get("/v1/azpipe/arch");
assert.equal(archRes.status, 200);
const archBody = await archRes.json();
assert.equal(archBody.ok, true);
assert.equal(archBody.master, "MASTER-33");
assert.equal(archBody.v, a.v);
assert.equal(archBody.magic, a.magic);
assert.equal(archBody.locked, true);
assert.equal(archBody.lambgate, false);
assert.equal(archBody.fraggate_single_door, true);
assert.equal(archBody.roseclock, true);
assert.equal(archBody.software_tab, false);
assert.equal(archBody.identity, "Aziel Eliab");
assert.equal(archBody.author, "Aziel Eliab");
assert.equal(archBody.strip, LOCKED_STRIP);
assert.deepEqual(archBody.inbound, INBOUND_HOPS);
assert.equal(archBody.domains.domain_count, 11);
assert.equal(archBody.domains.software_count, 33);
assert.equal(archBody.domains.domains_are_doors, false);

const fg = await (await get("/v1/fraggate")).json();
assert.deepEqual(fg.pipeline.inbound, archBody.inbound);
assert.equal(fg.pipeline.strip, archBody.strip);
assert.equal(fg.pipeline_strip, archBody.strip);

const archHead = await handler(new Request(origin + "/v1/azpipe/arch", { method: "HEAD" }), {});
assert.equal(archHead.status, 200);
assert.equal(await archHead.text(), "");

const archPost = await handler(
  new Request(origin + "/v1/azpipe/arch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  }),
  {},
);
assert.equal(archPost.status, 200);
const archPostBody = await archPost.json();
assert.equal(archPostBody.master, "MASTER-33");
assert.equal(archPostBody.strip, LOCKED_STRIP);

const unknown = await get("/v1/azpipe/invent");
assert.equal(unknown.status, 404);
assert.match((await unknown.json()).hint, /\/v1\/azpipe\/arch/);

const software = await (await get("/v1/software")).json();
assert.ok(!software.software.some((s) => s.slug === "azpipe" || s.slug === "master-33"));
assert.match(software.azpipe_arch, /\/v1\/azpipe\/arch$/);

const skill = await (await get("/v1/skill")).text();
assert.match(skill, /GET \/v1\/azpipe\/arch/);
assert.match(skill, /MASTER-33 AZPIPE cite/);

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /\/v1\/azpipe\/arch/);

const citeJson = await (await get("/cite.json")).json();
assert.match(citeJson.azpipe_arch, /\/v1\/azpipe\/arch$/);
assert.equal(citeJson.identity, "Aziel Eliab");

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /\/v1\/azpipe\/arch/);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/v1/azpipe/arch"]);
assert.ok(openapi.paths["/v1/azpipe/arch"].get);
assert.ok(openapi.paths["/v1/azpipe/arch"].post);
assert.match(openapi.paths["/v1/azpipe/arch"].get.summary, /MASTER-33/);

const runtime = await (await get("/v1/runtime.json")).json();
assert.equal(runtime.endpoints.azpipe_arch, origin + "/v1/azpipe/arch");
assert.equal(runtime.fabric.azpipe_arch, "/v1/azpipe/arch");

const mesh = await (await get("/v1/mesh")).json();
assert.equal(mesh.enabled, false);

console.log("ok MASTER-33 hops RoseClock Lamb Lens domains azchat azpipe/arch cite");

/**
 * LIVE fabric: SweepGate, AZPIPE, ChainLock, LOCKSET, packed catalog.
 * Not Softwares-tab products. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { inspect } from "../src/sweepgate.js";
import {
  INBOUND_HOPS,
  OUTBOUND_HOPS,
  LOCKED_STRIP,
  OLD_FOLD_CENTRIC_INBOUND,
  OLD_FOLD_CENTRIC_OUTBOUND,
  REORDER_REFUSE,
  arch,
  pipeInbound,
  pipeOutbound,
  refuseReorder,
  thinPipe,
} from "../src/azpipe.js";
import { MemoryStore } from "../src/chainlock/store.js";
import { ROSTER, append, recall, tip, verify } from "../src/chainlock/ops.js";
import { seal, verify as verifyLockset } from "../src/lockset.js";
import {
  PACKED_CATALOG_KEY,
  VISITOR_PER_MINUTE,
  countingKv,
  readPackedCatalog,
  visitorBucket,
} from "../src/packed-catalog.js";
import { PUBLIC_MCP_TOOL_MAX } from "../src/fraggate/codes.js";

const sgPaper = readFileSync(new URL("../docs/designs/SG-WP-0.1.md", import.meta.url), "utf8");
assert.match(sgPaper, /^# SG-WP-0\.1 — SweepGate/m);
assert.match(sgPaper, /Airlock, anti-poison, structural malware-class sweep/);
assert.match(sgPaper, /inject-payload/);
assert.match(sgPaper, /password, private_key, secret, legal_name, home_address/);
assert.doesNotMatch(sgPaper, /vault\/chains/);
assert.doesNotMatch(sgPaper, /^# CL-WP/m);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path, env = {}) {
  return handler(new Request(origin + path), env);
}

async function mcp(name, args, env = {}) {
  const res = await handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    }),
    env,
  );
  return res.json();
}

// --- SweepGate isolate ---
const clean = await inspect({ fact: "library card", url: "https://godlock.uk/AzielEliab" });
assert.equal(clean.v, "SG-0.1");
assert.equal(clean.airlock, "open");
assert.equal(clean.isolate, false);
assert.equal(clean.refuse, undefined);

const mz = await inspect("MZ\x90 dropper payload");
assert.equal(mz.isolate, true);
assert.equal(mz.airlock, "closed");
assert.equal(mz.refuse, "sweep-isolate");
assert.ok(mz.hits.includes("malware-class"));

const sh = await inspect("#!/bin/sh\nrm -rf /");
assert.equal(sh.isolate, true);
assert.ok(sh.hits.includes("malware-class"));

const meter = await inspect("launch meterpreter stage");
assert.equal(meter.isolate, true);

const b64mz = await inspect("TVpQAA12345678== header");
assert.equal(b64mz.isolate, true);

const block = await inspect({ password: "x", fact: "no" });
assert.equal(block.isolate, true);
assert.ok(block.hits.includes("airlock-block"));

const off = await inspect({ cite: "https://evil.example/payload" });
assert.equal(off.isolate, true);
assert.ok(off.hits.includes("off-origin"));

const trustedOff = await inspect({ cite: "https://evil.example/payload" }, { untrusted: false });
assert.equal(trustedOff.isolate, false);
assert.ok(trustedOff.hits.includes("off-origin"));

const outboundOff = await inspect({ cite: "https://evil.example/payload" }, { dir: "out" });
assert.equal(outboundOff.isolate, false);

const ssnKey = await inspect({ ssn: "000", fact: "fold later" });
assert.equal(ssnKey.isolate, false);
assert.ok(!ssnKey.hits.includes("airlock-block"));

const poison = await inspect("inject-payload jailbreak-ignore");
assert.equal(poison.isolate, true);
assert.ok(poison.hits.includes("poison"));

// --- AZPIPE locked hop order (MASTER-33 / 1.7.0) ---
const architecture = arch();
assert.equal(architecture.magic, "FLD3");
assert.equal(architecture.v, "AZPIPE-0.2");
assert.equal(architecture.locked, true);
assert.equal(architecture.lambgate, false);
assert.equal(architecture.fraggate_single_door, true);
assert.equal(architecture.lamb_lens, true);
assert.equal(architecture.roseclock, true);
assert.equal(architecture.rollback, false);
assert.deepEqual(architecture.inbound, [
  "human",
  "azinterface",
  "public",
  "fraggate",
  "lamb-lens",
  "sweepgate",
  "sentinel",
  "provenance",
  "chainlock-in",
  "decisiongate",
  "azpipe",
  "domain-layer",
  "ase",
  "roseclock",
  "staticclock",
  "temporallock",
  "chainlock-out",
  "forgereceipts",
  "return",
]);
assert.deepEqual(architecture.outbound, [
  "return",
  "forgereceipts",
  "chainlock-out",
  "temporallock",
  "staticclock",
  "roseclock",
  "ase",
  "domain-layer",
  "azpipe",
  "decisiongate",
  "provenance",
  "sentinel",
  "sweepgate",
  "lamb-lens",
  "fraggate",
  "public",
  "azinterface",
  "human",
]);
assert.deepEqual(INBOUND_HOPS, architecture.inbound);
assert.deepEqual(OUTBOUND_HOPS, architecture.outbound);
assert.equal(architecture.joins_cell, false);
assert.equal(architecture.software_tab, false);
assert.equal(architecture.domain_doors.inspection.slug, "4dmap");
assert.equal(architecture.domain_doors.inspection.sequential_gate, false);
assert.equal(architecture.domain_layer.doors, false);
assert.match(architecture.strip, /FragGate → Lamb Lens → SweepGate → Sentinel/);
assert.match(architecture.strip, /ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer/);
assert.equal(architecture.inbound.indexOf("fraggate"), architecture.inbound.indexOf("lamb-lens") - 1);
assert.equal(architecture.lambgate, false);
assert.ok(!/LambGate/.test(architecture.strip));
assert.ok(!architecture.inbound.includes("fold"));
assert.ok(!architecture.inbound.includes("toolkits"));
assert.ok(!architecture.inbound.includes("lambgate"));
assert.ok(!architecture.inbound.includes("zd30"));

const oldIn = refuseReorder(OLD_FOLD_CENTRIC_INBOUND, "in");
assert.equal(oldIn.ok, false);
assert.equal(oldIn.refuse, REORDER_REFUSE);
const oldOut = refuseReorder(OLD_FOLD_CENTRIC_OUTBOUND, "out");
assert.equal(oldOut.ok, false);
assert.equal(oldOut.refuse, REORDER_REFUSE);
const swapped = refuseReorder(
  ["human", "azinterface", "public", "sweepgate", "fraggate", "lamb-lens", "sentinel", "provenance", "chainlock-in", "decisiongate", "azpipe", "domain-layer", "ase", "roseclock", "staticclock", "temporallock", "chainlock-out", "forgereceipts", "return"],
  "in",
);
assert.equal(swapped.ok, false);
assert.equal(swapped.refuse, REORDER_REFUSE);
const lockedOk = refuseReorder(INBOUND_HOPS, "in");
assert.equal(lockedOk.ok, true);
const lamb = refuseReorder([...INBOUND_HOPS, "lambgate"], "in");
assert.equal(lamb.ok, false);

const reorderPipe = await pipeInbound({
  payload: { fact: "reorder attempt" },
  path: OLD_FOLD_CENTRIC_INBOUND,
  env: {},
});
assert.equal(reorderPipe.ok, false);
assert.equal(reorderPipe.refuse, REORDER_REFUSE);

const admitted = await pipeInbound({
  payload: { fact: "tether library", url: "https://www.azielcorpuslibrary.net/cite.json" },
  env: {},
});
assert.equal(admitted.ok, true);
assert.deepEqual(admitted.path, INBOUND_HOPS);
assert.equal(admitted.magic, "FLD3");
assert.ok(admitted.admitted);
assert.ok(thinPipe(admitted).v === "AZPIPE-0.2");
assert.equal(admitted.qnm.pull, false);
assert.equal(admitted.qnm.bridges, 2);

const emptyRefuse = await pipeInbound({ payload: {}, claim: null });
assert.equal(emptyRefuse.ok, false);
assert.equal(emptyRefuse.refuse, "ungrounded");
assert.equal(emptyRefuse.closed_at, "fraggate");
assert.equal(emptyRefuse.inner, null);

const swept = await pipeInbound({ payload: { body: "MZ meterpreter" }, env: {} });
assert.equal(swept.ok, false);
assert.equal(swept.refuse, "sweep-isolate");
assert.equal(swept.closed_at, "sweepgate");
assert.equal(swept.isolate.in, true);
assert.equal(swept.inner, null);

const folded = await pipeInbound({
  payload: { note: "see https://evil.example/x", fact: "cite only" },
  env: {},
});
assert.equal(folded.ok, false);
assert.equal(folded.refuse, "sweep-isolate");

const trustedFold = await pipeInbound({
  payload: { note: "see https://evil.example/x", fact: "cite only", ssn: "000" },
  untrusted: false,
  env: {},
});
assert.equal(trustedFold.ok, true);
assert.equal(trustedFold.admitted.ssn, "[FLD3:block]");
assert.match(String(trustedFold.admitted.note), /\[FLD3:url\]/);
assert.equal(trustedFold.domain_doors.inspection.slug, "4dmap");
assert.ok(trustedFold.inner.entry && trustedFold.inner.entry.h && trustedFold.inner.entry.fh);

const outbound = await pipeOutbound({
  result: { ok: true, fact: "toolkit result" },
  env: {},
});
assert.equal(outbound.ok, true);
assert.deepEqual(outbound.path, OUTBOUND_HOPS);
assert.ok(outbound.inner.exit && outbound.inner.exit.h);
assert.equal(outbound.inner.temporal.kind, "TemporalLock");
assert.equal(outbound.inner.staticclock.kind, "StaticClock");
assert.equal(outbound.response, true);

const gateAfterStamp = await pipeInbound({
  payload: { fact: "library card" },
  claim: { statement: "no", evidence: [], accountable: "" },
  env: {},
});
assert.equal(gateAfterStamp.ok, false);
assert.equal(gateAfterStamp.closed_at, "decisiongate");
assert.ok(gateAfterStamp.inner == null);

const liveCallRes = await handler(
  new Request(origin + "/v1/fraggate/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "foldlock", op: "health", payload: { ping: true } }),
  }),
  {},
);
const liveCall = await liveCallRes.json();
assert.equal(liveCall.ok, true, JSON.stringify(liveCall));
assert.equal(liveCall.gate.final_state, "PASS");
assert.ok(liveCall.entry && liveCall.entry.h, "ChainLock-IN stamp");
assert.ok(liveCall.receipt && liveCall.receipt.h, "ChainLock-OUT stamp");
assert.equal(liveCall.temporal.kind, "TemporalLock");
assert.equal(liveCall.staticclock.kind, "StaticClock");
assert.equal(liveCall.domain_doors.inspection.slug, "4dmap");
assert.match(liveCall.pipeline_strip, /ChainLock-IN → DecisionGATE → AZPIPE/);
assert.equal(liveCall.domain_doors.inspection.sequential_gate, false);

const describeMap = await (await get("/v1/fraggate/describe?slug=4dmap")).json();
assert.equal(describeMap.ok, true);
assert.equal(describeMap.domain_doors.slug, "4dmap");
assert.deepEqual(describeMap.pipeline.inbound, INBOUND_HOPS);
assert.equal(describeMap.pipeline.lambgate, false);

const door = await (await get("/v1/fraggate")).json();
assert.deepEqual(door.pipeline.inbound, INBOUND_HOPS);
assert.match(door.pipeline_strip, /Internal Domain Layer/);
assert.match(door.pipeline_strip, /FragGate → Lamb Lens/);

// --- ChainLock append / verify ---
const store = new MemoryStore();
assert.deepEqual(ROSTER, [
  "genesis",
  "identity",
  "ssh",
  "session",
  "acts",
  "evidence",
  "recall",
  "mesh",
  "library",
  "learn",
]);

const a1 = await append(store, { c: "session", subject: "open", fact: "session opened on worker" });
assert.equal(a1.ok, true);
assert.equal(a1.stamp.prev, "GENESIS");
assert.match(a1.stamp.stamp_sha256, /^[a-f0-9]{64}$/);
assert.equal(a1.card.s.length <= 80, true);
assert.equal(a1.card.f.length <= 160, true);
assert.ok(a1.card.h && a1.card.fh && a1.card.f);

const noFact = await append(store, { c: "session", subject: "hash only" });
assert.equal(noFact.ok, false);
assert.equal(noFact.refuse, "no-fact");

const a2 = await append(store, { c: "session", subject: "act", fact: "operator chose recall depth 1" });
assert.equal(a2.ok, true);
assert.equal(a2.stamp.prev, a1.stamp.stamp_sha256);

const t = await tip(store, "session");
assert.equal(t.tip.id, a2.stamp.id);
assert.equal(t.tip.h, a2.stamp.stamp_sha256);

const rec = await recall(store, { depth: 1, c: "session" });
assert.equal(rec.ok, true);
assert.ok(rec.facts.every((f) => f.id && f.h && f.fh && f.f));

const emptyRecall = await recall(store, { depth: 0, c: "learn" });
assert.equal(emptyRecall.ok, false);
assert.equal(emptyRecall.refuse, "no-stamp");

const okVerify = await verify(store, { c: "session" });
assert.equal(okVerify.ok, true);
assert.equal(okVerify.lattice, true);

const broken = new MemoryStore();
await append(broken, { c: "acts", fact: "first act on the chain" });
await append(broken, { c: "acts", fact: "second act on the chain" });
const rows = JSON.parse("[" + (await broken.get("chains/acts")).trim().split("\n").join(",") + "]");
rows[1].prev = "0".repeat(64);
await broken.put("chains/acts", rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
const bad = await verify(broken, { c: "acts" });
assert.equal(bad.ok, false);
assert.equal(bad.fail_closed, true);
assert.ok(bad.breaks.some((b) => b.reason === "broken-prev"));

// --- LOCKSET fail-closed ---
const vault = new MemoryStore();
await append(vault, { c: "genesis", fact: "lattice genesis for lockset" });
await append(vault, { c: "session", fact: "session tip before seal" });
const sealed = await seal(vault);
assert.equal(sealed.ok, true);
assert.match(sealed.lockset_sha256, /^[a-f0-9]{64}$/);
assert.equal(sealed.lockset.godlock.url, "https://godlock.uk");
assert.equal(sealed.lockset.godlock.cite, "public-verify");
assert.equal(sealed.lockset.godlock.pull, false);
assert.equal(sealed.lockset.godlock.isolate, true);
assert.equal(sealed.lockset.temporal.kind, "TemporalLock");

const sealedOk = await verifyLockset(vault);
assert.equal(sealedOk.lattice, true);
assert.equal(sealedOk.write_public_ledger, false);

await append(vault, { c: "session", fact: "append after seal drifts the tip" });
const drifted = await verifyLockset(vault);
assert.equal(drifted.ok, false);
assert.equal(drifted.lattice, false);
assert.ok(drifted.breaks.some((b) => b.reason === "tip-drift"));

const missingCite = new MemoryStore();
await append(missingCite, { c: "genesis", fact: "need a tip to seal" });
const s2 = await seal(missingCite);
delete s2.lockset.godlock;
s2.lockset.lockset_sha256 = "dead";
await missingCite.put("receipts/LOCKSET.json", JSON.stringify(s2.lockset));
const citeFail = await verifyLockset(missingCite);
assert.equal(citeFail.lattice, false);
assert.ok(citeFail.breaks.some((b) => b.reason === "missing-godlock-cite" || b.reason === "lockset-hash-miss"));

// --- packed catalog single-key read ---
const kv = countingKv({
  [PACKED_CATALOG_KEY]: JSON.stringify({ ok: true, packed: true, software: [{ slug: "foldlock" }] }),
});
const packed = await readPackedCatalog({ USES: kv }, origin, PRODUCTS, { kv_probe: kv });
assert.equal(packed.kv_ops, 1);
assert.equal(kv.stats.gets, 1);
assert.equal(kv.stats.lists, 0);
assert.equal(packed.packed, true);
assert.equal(packed.source, "packed");
assert.ok(packed.kv_ops < 191);

const mem = await readPackedCatalog({}, origin, PRODUCTS, {});
assert.equal(mem.kv_ops, 0);
assert.equal(mem.source, "memory");
assert.ok(mem.catalog.software.length >= PRODUCTS.length);

const usesOnly = countingKv({ other: "1" });
const hot = await readPackedCatalog({ USES: usesOnly }, origin, PRODUCTS, {});
assert.equal(hot.kv_ops, 0, "catalog GET must not read env.USES");
assert.equal(usesOnly.stats.gets, 0);
assert.equal(usesOnly.stats.lists, 0);
assert.equal(hot.source, "memory");
assert.ok(hot.catalog.software.length >= PRODUCTS.length);

const capEnv = { RUNTIME_TOKEN: "op-secret-token" };
const t0 = 1_700_000_000_000;
const visitorReq = (extra = {}) =>
  new Request(origin + "/expensive", {
    headers: { "CF-Connecting-IP": "203.0.113.88", ...extra },
  });
for (let i = 0; i < VISITOR_PER_MINUTE; i += 1) {
  const b = await visitorBucket(visitorReq(), capEnv, t0 + i);
  assert.equal(b.ok, true);
}
const softCap = await visitorBucket(visitorReq(), capEnv, t0 + VISITOR_PER_MINUTE);
assert.equal(softCap.ok, false);
assert.equal(softCap.refuse, "rate-soft");
const bypass = await visitorBucket(
  visitorReq({ "X-Aziel-Runtime-Token": "op-secret-token" }),
  capEnv,
  t0 + VISITOR_PER_MINUTE,
);
assert.equal(bypass.ok, true);
assert.equal(bypass.bypass, true);
assert.equal(bypass.operator, true);

const usesHot = countingKv();
const billed = { USES: usesHot };
const hubHit = await get("/v1/software", billed);
assert.equal(hubHit.status, 200);
const hubBody = await hubHit.json();
assert.ok(hubBody.software.length >= PRODUCTS.length);
assert.equal(usesHot.stats.gets, 0, "hub /v1/software must not touch USES");
assert.equal(usesHot.stats.puts, 0);
assert.equal(usesHot.stats.lists, 0);

const burstEnv = {};
for (let i = 0; i < 70; i += 1) {
  const burst = await get("/v1/software", burstEnv);
  assert.equal(burst.status, 200, "catalog GET must stay 200 under visitor load");
  await burst.text();
}

const soft = await get("/v1/software");
assert.equal(soft.status, 200);
assert.match(soft.headers.get("Cache-Control") || "", /s-maxage=300/);
const home = await get("/");
assert.equal(home.status, 200);
assert.match(home.headers.get("Cache-Control") || "", /s-maxage=300/);
const homeHtml = await home.text();
assert.match(homeHtml, /FoldLock/);
assert.match(homeHtml, /\/v1\/software/);
assert.match(homeHtml, /ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer/);
assert.match(homeHtml, /MASTER-33/);
assert.match(homeHtml, /SUITE-PIPE-1\.6\.15/);
assert.match(homeHtml, /LambGate is not a hop/);
const updateMan = await get("/v1/update/manifest");
assert.equal(updateMan.status, 200);
assert.match(updateMan.headers.get("Cache-Control") || "", /s-maxage=300/);
await updateMan.text();
const softBody = await soft.json();
assert.equal(softBody.rl.list, false);
assert.equal(softBody.rl.spec, "RL-WP-0.1-runtime");
assert.equal(softBody.rl.scope, "runtime");
assert.equal(softBody.rl.catalog_always_full, true);
assert.equal(softBody.rl.catalog_consumes_bucket, false);
assert.ok(softBody.rl.kv_ops <= 1);
assert.equal(softBody.donation.kv, false);
assert.equal(softBody.donation.addresses, null);
assert.ok(!softBody.software.some((s) => s.slug === "chainlock"));
assert.ok(!softBody.software.some((s) => s.slug === "azpipe"));
assert.ok(!softBody.software.some((s) => s.slug === "sweepgate"));
assert.ok(!softBody.software.some((s) => s.slug === "lockset"));
assert.ok(!softBody.software.some((s) => s.slug === "memory"));

const mesh = await (await get("/v1/mesh")).json();
assert.equal(mesh.enabled, false);

const list = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  }),
  {},
);
const tools = (await list.json()).result.tools.map((t) => t.name);
assert.ok(tools.includes("chainlock_append"));
assert.ok(tools.includes("chainlock_verify"));
assert.ok(tools.includes("chainlock_seal"));
assert.ok(tools.includes("memory_recall"));
assert.ok(tools.length <= PUBLIC_MCP_TOOL_MAX);

const env = {};
const appended = await mcp("chainlock_append", { c: "session", fact: "mcp append fact on session" }, env);
assert.equal(appended.result.isError, false);
assert.match(JSON.stringify(appended.result), /stamp_sha256|cl_/);

const cite = await (await get("/cite.json")).json();
assert.ok(cite.designs.papers.some((p) => p.id === "SG-WP-0.1" && p.status === "live" && p.kind === "fabric"));
assert.ok(cite.designs.papers.some((p) => p.id === "CL-WP-0.4"));
assert.ok(cite.designs.papers.some((p) => p.id === "RL-WP-0.1" && p.path === "docs/designs/RL-WP-0.1-runtime.md"));
assert.ok(cite.designs.papers.some((p) => p.id === "QNS-CD-1.0" && p.kind === "fabric" && p.software_tab === false));
assert.ok(cite.designs.papers.every((p) => p.software_tab === false));
assert.equal(cite.identity, "Aziel Eliab");
assert.doesNotMatch(JSON.stringify(cite.designs), /GodLock\.AZ/);

const skill = await (await get("/v1/skill")).text();
assert.match(skill, /LIVE fabric/);
assert.match(skill, /chainlock_\*/);
assert.match(skill, /SG-WP-0\.1/);
assert.match(skill, /MASTER-33/);
assert.match(skill, /SUITE-PIPE-1\.6\.15/);
assert.match(skill, /ChainLock-IN → DecisionGATE → AZPIPE/);
assert.doesNotMatch(skill, /LambGate is a hop/);

assert.ok(cite.designs.papers.some((p) => p.id === "SUITE-PIPE-1.6.15" && p.kind === "fabric"));
assert.ok(cite.designs.papers.some((p) => p.id === "MASTER-33" && p.kind === "fabric"));
assert.ok(cite.designs.papers.some((p) => p.id === "AKM-TRIAD-1.0" && p.kind === "fabric" && p.software_tab === false));
assert.match(homeHtml, /AKM-TRIAD-1\.0/);
assert.match(skill, /AKM-TRIAD-1\.0/);

console.log("ok lattice SweepGate AZPIPE ChainLock LOCKSET packed-catalog");

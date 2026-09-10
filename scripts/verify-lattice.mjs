/**
 * LIVE fabric: SweepGate, AZPIPE, ChainLock, LOCKSET, packed catalog.
 * Not Softwares-tab products. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { inspect } from "../src/sweepgate.js";
import { INBOUND_HOPS, OUTBOUND_HOPS, arch, pipeInbound, thinPipe } from "../src/azpipe.js";
import { MemoryStore } from "../src/chainlock/store.js";
import { ROSTER, append, recall, tip, verify } from "../src/chainlock/ops.js";
import { seal, verify as verifyLockset } from "../src/lockset.js";
import {
  PACKED_CATALOG_KEY,
  countingKv,
  readPackedCatalog,
} from "../src/packed-catalog.js";
import { PUBLIC_MCP_TOOL_MAX } from "../src/fraggate/codes.js";

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

// --- AZPIPE hop order ---
const architecture = arch();
assert.equal(architecture.magic, "FLD3");
assert.equal(architecture.v, "AZPIPE-0.2");
assert.deepEqual(architecture.inbound, [
  "frag",
  "sweep",
  "fold",
  "static",
  "fold",
  "entry",
  "frag",
  "toolkits",
]);
assert.deepEqual(architecture.outbound, [
  "toolkits",
  "frag",
  "fold",
  "static",
  "fold",
  "sweep",
  "frag",
]);
assert.deepEqual(INBOUND_HOPS, architecture.inbound);
assert.deepEqual(OUTBOUND_HOPS, architecture.outbound);
assert.equal(architecture.joins_cell, false);
assert.equal(architecture.software_tab, false);

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
assert.equal(emptyRefuse.closed_at, "frag");
assert.equal(emptyRefuse.inner, null);

const swept = await pipeInbound({ payload: { body: "MZ meterpreter" }, env: {} });
assert.equal(swept.ok, false);
assert.equal(swept.refuse, "sweep-isolate");
assert.equal(swept.closed_at, "sweep");
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

const burstEnv = {};
for (let i = 0; i < 70; i += 1) {
  const burst = await get("/v1/software", burstEnv);
  assert.equal(burst.status, 200, "catalog GET must stay 200 under visitor load");
  await burst.text();
}

const soft = await get("/v1/software");
assert.equal(soft.status, 200);
assert.match(soft.headers.get("Cache-Control") || "", /s-maxage=300/);
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
assert.ok(tools.length <= PUBLIC_MCP_TOOL_MAX);

const env = {};
const appended = await mcp("chainlock_append", { c: "session", fact: "mcp append fact on session" }, env);
assert.equal(appended.result.isError, false);
assert.match(JSON.stringify(appended.result), /stamp_sha256|cl_/);

const cite = await (await get("/cite.json")).json();
assert.ok(cite.designs.papers.some((p) => p.id === "SG-WP-0.1" && p.status === "live" && p.kind === "fabric"));
assert.ok(cite.designs.papers.some((p) => p.id === "CL-WP-0.4"));
assert.ok(cite.designs.papers.some((p) => p.id === "RL-WP-0.1" && p.path === "docs/designs/RL-WP-0.1-runtime.md"));
assert.ok(cite.designs.papers.every((p) => p.software_tab === false));
assert.equal(cite.identity, "Aziel Eliab");
assert.doesNotMatch(JSON.stringify(cite.designs), /GodLock\.AZ/);

const skill = await (await get("/v1/skill")).text();
assert.match(skill, /LIVE fabric/);
assert.match(skill, /chainlock_\*/);
assert.match(skill, /SG-WP-0\.1/);

console.log("ok lattice SweepGate AZPIPE ChainLock LOCKSET packed-catalog");

/**
 * FragGate door: thin tools/list, hashed registry, HALLUC/stub/local_only refuse,
 * DecisionGATE ledger, allowlisted live ops.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { PUBLIC_MCP_TOOL_MAX } from "../src/fraggate/codes.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall, parseTarget } from "../src/fraggate/registry.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { memorySessionNamespace } from "../src/session-do.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

resetLedger();

async function get(path) {
  return handler(new Request(origin + path), env);
}

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

async function mcp(method, params = {}, id = 1) {
  const res = await post("/mcp", { jsonrpc: "2.0", id, method, params });
  return res.json();
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.live_count, Object.keys(LIVE_OPS).length);
assert.ok(registry.live_count > 5, `live_count ${registry.live_count} should be much higher than the old 5-only cut`);
assert.equal(registry.bySlug.veillock.status, "local_only");
assert.equal(registry.local_only_count, 1);
assert.ok(!LIVE_OPS.veillock);
assert.equal(registry.stub_count, registry.entries.filter((e) => e.status === "stub").length);
assert.equal(registry.stub_op_count, Object.values(STUB_OPS).reduce((n, ops) => n + ops.length, 0));
assert.ok(registry.stub_op_count >= 12);
assert.equal(registry.stub_ops.length, registry.stub_op_count);
assert.equal(registry.live_count + registry.local_only_count + registry.stub_count, registry.entries.length);
assert.equal(registry.bySlug.foldlock.status, "live");
assert.equal(registry.bySlug.godlock.status, "live");
assert.equal(registry.bySlug.decisiongate.status, "live");
assert.equal(registry.bySlug["aziel-corpus"].status, "live");
assert.equal(registry.bySlug.azclce.status, "live");
assert.equal(registry.bySlug.ark.status, "live");
assert.equal(registry.bySlug.whistlelock.status, "live");
assert.equal(registry.bySlug.miragegrid.status, "live");
assert.equal(registry.bySlug.vibelock.status, "live");
assert.ok(registry.bySlug.ark.ops.includes("sweep"));
assert.ok(registry.bySlug.ark.ops.includes("levels"));
assert.ok(!registry.bySlug.ark.ops.includes("scorch"));
assert.ok(registry.bySlug.whistlelock.ops.includes("hash-preview"));
assert.ok(!registry.bySlug.whistlelock.ops.includes("send"));
assert.ok(registry.bySlug.miragegrid.ops.includes("assign"));
assert.ok(!registry.bySlug.miragegrid.ops.includes("tunnel"));
assert.ok(registry.bySlug.azieltether.ops.includes("verify"));
assert.ok(!registry.bySlug.azieltether.ops.includes("mesh-join"));
assert.equal(registry.bySlug.peacelock.status, "live");
assert.ok(registry.bySlug.peacelock.ops.includes("open"));
assert.ok(registry.bySlug.peacelock.ops.includes("seal"));
assert.ok(registry.bySlug.peacelock.ops.includes("break"));
assert.ok(registry.bySlug.peacelock.ops.includes("show"));
assert.ok(registry.bySlug.peacelock.ops.includes("verify"));
assert.ok(!registry.bySlug.peacelock.ops.includes("transcript"));
assert.ok(registry.bySlug.peacelock.stub_ops.includes("transcript"));
assert.ok(registry.bySlug.peacelock.stub_ops.includes("motive"));
assert.ok(registry.bySlug.peacelock.stub_ops.includes("counterfactual"));
assert.ok(registry.bySlug.peacelock.stub_ops.includes("waive-duty"));
assert.equal(classifyCall(registry.bySlug.peacelock, "transcript").kind, "stub");
assert.equal(classifyCall(registry.bySlug.peacelock, "open").kind, "live");
assert.ok(registry.bySlug.employeelock.ops.includes("append-preview"));
assert.ok(registry.bySlug.mialock.ops.includes("doe-match"));
assert.ok(registry.bySlug.ark.stub_ops.includes("scorch"));
assert.equal(classifyCall(registry.bySlug.ark, "scorch").kind, "stub");
assert.equal(classifyCall(null, "x").kind, "halluc");
assert.equal(parseTarget({ name: "godlock_submit" }, registry).slug, "godlock");
assert.equal(parseTarget({ name: "godlock_submit" }, registry).op, "submit");

for (const [slug, ops] of Object.entries(LIVE_OPS)) {
  const product = PRODUCTS.find((p) => p.slug === slug);
  assert.ok(product, `LIVE_OPS slug ${slug} must be a catalog product`);
  const catalogOps = new Set((product.ops || []).map((o) => o.op));
  for (const op of ops) {
    if (slug === "decisiongate" && op === "evaluate") continue;
    assert.ok(catalogOps.has(op), `${slug}/${op} is not a catalog op`);
  }
}
for (const [slug, ops] of Object.entries(STUB_OPS)) {
  const live = new Set(LIVE_OPS[slug] || []);
  for (const op of ops) {
    assert.ok(!live.has(op), `STUB_OPS ${slug}/${op} must not also be live`);
  }
}

const door = await (await get("/v1/fraggate")).json();
assert.equal(door.ok, true);
assert.equal(door.door, "fraggate");
assert.match(door.registry_digest, /^[a-f0-9]{64}$/);
assert.equal(door.live_count, registry.live_count);
assert.equal(door.stub_count, registry.stub_count);
assert.equal(door.stub_op_count, registry.stub_op_count);
assert.equal(door.local_only_count, registry.local_only_count);
assert.equal(door.live_count + door.local_only_count + door.stub_count, door.product_count);
assert.equal(door.stub_ops.length, door.stub_op_count);
assert.ok(door.kernel.includes("fraggate"));

const listed = await (await get("/v1/fraggate/list")).json();
assert.equal(listed.ok, true);
assert.equal(listed.stub_count, registry.stub_count);
assert.equal(listed.stub_op_count, registry.stub_op_count);
assert.equal(listed.live_count + listed.local_only_count + listed.stub_count, listed.product_count);
assert.equal(listed.entries.length, listed.product_count);
assert.ok(listed.entries.some((e) => e.slug === "foldlock" && e.status === "live"));
assert.ok(listed.entries.some((e) => e.slug === "vibelock" && e.status === "live"));
assert.ok(listed.entries.some((e) => e.slug === "veillock" && e.status === "local_only"));
assert.ok(listed.entries.some((e) => e.slug === "ark" && e.status === "live" && e.ops.includes("sweep")));

const described = await (await get("/v1/fraggate/describe?name=FoldLock")).json();
assert.equal(described.ok, true);
assert.equal(described.slug, "foldlock");
assert.equal(described.status, "live");
assert.ok(described.ops.includes("fold-preview"));

const hallucHttp = await post("/v1/fraggate/call", { name: "embrylock", op: "arm" });
assert.equal(hallucHttp.status, 400);
const hallucBody = await hallucHttp.json();
assert.equal(hallucBody.ok, false);
assert.equal(hallucBody.code, "FG-HALLUC-TOOL");
assert.ok(hallucBody.ledger_tip);
assert.equal(hallucBody.ledger_tip.asked, true);
assert.equal(hallucBody.ledger_tip.refused, true);
assert.match(hallucBody.ledger_tip.hash, /^[a-f0-9]{64}$/);
assert.ok(hallucBody.exist.mcp.includes("fraggate_call"));

const stubHttp = await (await post("/v1/fraggate/call", { slug: "ark", op: "scorch" })).json();
assert.equal(stubHttp.ok, false);
assert.equal(stubHttp.code, "FG-STUB");
assert.equal(stubHttp.ledger_tip.refused, true);

const localOnly = await (await post("/v1/fraggate/call", { slug: "veillock", op: "apps" })).json();
assert.equal(localOnly.ok, false);
assert.equal(localOnly.code, "FG-LOCAL-ONLY");

const veilInject = await (await post("/v1/fraggate/call", { slug: "veillock", op: "inject" })).json();
assert.equal(veilInject.code, "FG-STUB");

const whistleSend = await (await post("/v1/fraggate/call", { slug: "whistlelock", op: "send" })).json();
assert.equal(whistleSend.code, "FG-STUB");

const liveVibe = await (await post("/v1/fraggate/call", { slug: "vibelock", op: "health" })).json();
assert.equal(liveVibe.ok, true, JSON.stringify(liveVibe));
assert.equal(liveVibe.code, "FG-OK");

const liveArk = await (await post("/v1/fraggate/call", { slug: "ark", op: "levels" })).json();
assert.equal(liveArk.ok, true, JSON.stringify(liveArk));
assert.equal(liveArk.code, "FG-OK");
assert.ok(liveArk.result);

const liveZ = await (
  await post("/v1/fraggate/call", {
    slug: "zsolver",
    op: "score",
    payload: { answers: [{ pattern_id: "P1", value: "yes" }, { pattern_id: "P2", value: "unknown" }] },
  })
).json();
assert.equal(liveZ.ok, true, JSON.stringify(liveZ));
assert.equal(liveZ.code, "FG-OK");

const gateRefuse = await (
  await post("/v1/fraggate/call", {
    slug: "foldlock",
    op: "fold-preview",
    payload: { text: "the cat and the dog" },
    claim: { statement: "no", evidence: [], accountable: "" },
  })
).json();
assert.equal(gateRefuse.ok, false);
assert.equal(gateRefuse.code, "FG-GATE-REFUSE");
assert.ok(gateRefuse.gate);
assert.notEqual(gateRefuse.gate.final_state, "PASS");
assert.equal(gateRefuse.ledger_tip.asked, true);
assert.equal(gateRefuse.ledger_tip.refused, true);
assert.equal(gateRefuse.result, null);

const liveFold = await (
  await post("/v1/fraggate/call", {
    slug: "foldlock",
    op: "fold-preview",
    payload: { text: "the cat and the dog" },
  })
).json();
assert.equal(liveFold.ok, true);
assert.equal(liveFold.code, "FG-OK");
assert.equal(liveFold.slug, "foldlock");
assert.ok(liveFold.result);
assert.equal(liveFold.gate.final_state, "PASS");
assert.equal(liveFold.ledger_tip.refused, false);
assert.ok(liveFold.engine && liveFold.engine.engine_digest);

const liveGod = await (
  await post("/v1/fraggate/call", {
    name: "godlock_submit",
    payload: { text: "ABAD does not layer on phi." },
  })
).json();
assert.equal(liveGod.ok, true, JSON.stringify(liveGod));
assert.equal(liveGod.slug, "godlock");
assert.equal(liveGod.op, "submit");

const liveAz = await (
  await post("/v1/fraggate/call", {
    slug: "azclce",
    op: "score",
    payload: { r: "login button blue", d: "login form submits", p: "login button submits" },
  })
).json();
assert.equal(liveAz.ok, true);

const peaceTranscript = await (await post("/v1/fraggate/call", { slug: "peacelock", op: "transcript" })).json();
assert.equal(peaceTranscript.ok, false);
assert.equal(peaceTranscript.code, "FG-STUB");

const peaceMotive = await (await post("/v1/fraggate/call", { slug: "peacelock", op: "motive" })).json();
assert.equal(peaceMotive.code, "FG-STUB");

const livePeace = await (
  await post("/v1/fraggate/call", {
    slug: "peacelock",
    op: "open",
    payload: { scope: "silence", subject: "chamber-1" },
  })
).json();
assert.equal(livePeace.ok, true, JSON.stringify(livePeace));
assert.equal(livePeace.code, "FG-OK");
assert.equal(livePeace.slug, "peacelock");
assert.ok(livePeace.result && livePeace.result.ok);
assert.equal(livePeace.result.receipt.transcript, "ABSENT");
assert.ok(livePeace.engine && livePeace.engine.engine_digest);

const verify = await (await post("/v1/fraggate/verify", { name: "decisiongate" })).json();
assert.equal(verify.ok, true);
assert.equal(verify.status, "live");

const health = await (await get("/v1/health")).json();
assert.equal(health.ok, true);
assert.equal(health.version, RUNTIME_VERSION);
assert.equal(health.door, "fraggate");
assert.ok(health.true_engine_runtime);

const ready = await (await get("/v1/ready")).json();
assert.equal(ready.ok, true);

const manifest = await (await get("/v1/runtime.json")).json();
assert.equal(manifest.door, "fraggate");
assert.match(manifest.registry_digest, /^[a-f0-9]{64}$/);
assert.match(manifest.fraggate.registry_digest, /^[a-f0-9]{64}$/);
assert.equal(manifest.registry_digest, manifest.fraggate.registry_digest);
assert.equal(manifest.fraggate.live_count, registry.live_count);
assert.equal(manifest.fraggate.stub_count, registry.stub_count);
assert.equal(manifest.fraggate.stub_op_count, registry.stub_op_count);
assert.equal(
  manifest.fraggate.live_count + manifest.fraggate.local_only_count + manifest.fraggate.stub_count,
  manifest.product_count,
);

const mcpManifest = await mcp("tools/call", { name: "runtime_manifest", arguments: {} }, 3);
assert.equal(mcpManifest.result.isError, false);
const mcpManifestBody = mcpManifest.result.structuredContent.result;
assert.match(mcpManifestBody.registry_digest, /^[a-f0-9]{64}$/);
assert.equal(mcpManifestBody.registry_digest, mcpManifestBody.fraggate.registry_digest);

const mcpInit = await mcp("initialize");
assert.match(mcpInit.result.instructions, /One door/);
assert.match(mcpInit.result.instructions, /fraggate_call/);
assert.match(mcpInit.result.instructions, /1\.6\.0/);
assert.equal(mcpInit.result.serverInfo.version, RUNTIME_VERSION);

const mcpList = await mcp("tools/list", {}, 2);
const tools = mcpList.result.tools.map((t) => t.name);
assert.ok(tools.length <= PUBLIC_MCP_TOOL_MAX, `tools/list length ${tools.length}`);
assert.ok(tools.includes("runtime_skill"));
assert.ok(tools.includes("fraggate_list"));
assert.ok(tools.includes("fraggate_describe"));
assert.ok(tools.includes("fraggate_verify"));
assert.ok(tools.includes("fraggate_call"));
assert.ok(tools.includes("decisiongate_check"));
assert.ok(tools.includes("library_lookup"));
assert.ok(tools.includes("runtime_run"));
assert.ok(!tools.includes("godlock_submit"));
assert.ok(!tools.includes("foldlock_fold-preview"));
assert.ok(!tools.includes("azclce_score"));
assert.ok(!tools.some((n) => n.endsWith("_health") && n !== "runtime_health"));

const byName = Object.fromEntries(mcpList.result.tools.map((t) => [t.name, t]));
assert.match(byName.runtime_run.description, /\[advanced\/internal\]/);
assert.doesNotMatch(byName.fraggate_call.description, /\[advanced\/internal\]/);

const foldMcp = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { slug: "foldlock", op: "fold-preview", payload: { text: "the cat and the dog" } },
});
assert.equal(foldMcp.result.isError, false);
assert.ok(foldMcp.result.structuredContent.display);
assert.equal(foldMcp.result.structuredContent.code, "FG-OK");

const hallucMcp = await mcp("tools/call", {
  name: "fraggate_call",
  arguments: { name: "not-a-lock", op: "explode" },
});
assert.equal(hallucMcp.result.isError, true);
assert.equal(hallucMcp.result.structuredContent.code, "FG-HALLUC-TOOL");

const flatMcp = await mcp("tools/call", { name: "foldlock_fold-preview", arguments: { text: "x" } });
assert.equal(flatMcp.result.isError, true);
assert.equal(flatMcp.result.structuredContent.code, "FG-HALLUC-TOOL");

const lib = await mcp("tools/call", { name: "library_lookup", arguments: { q: "Florence", op: "search" } });
assert.equal(lib.result.isError, false);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/v1/fraggate"]);
assert.ok(openapi.paths["/v1/fraggate/call"]);
assert.equal(openapi.paths["/p/foldlock/fold-preview"], undefined);
assert.match(openapi.info.description, /FragGate/);

console.log(`ok fraggate ${RUNTIME_VERSION}: door, registry, HALLUC/stub/local_only, gate ledger, live allowlist, thin MCP`);

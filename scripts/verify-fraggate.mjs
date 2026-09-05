/**
 * FragGate door: thin tools/list, hashed registry, HALLUC/stub/local_only refuse,
 * DecisionGATE ledger, allowlisted live ops.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { PUBLIC_MCP_TOOL_MAX } from "../src/fraggate/codes.js";
import { LIVE_OPS, buildRegistry, classifyCall, parseTarget } from "../src/fraggate/registry.js";
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
assert.ok(registry.local_only_count > 10);
assert.ok(registry.stub_count >= 4);
assert.equal(registry.bySlug.foldlock.status, "live");
assert.equal(registry.bySlug.godlock.status, "live");
assert.equal(registry.bySlug.decisiongate.status, "live");
assert.equal(registry.bySlug["aziel-corpus"].status, "live");
assert.equal(registry.bySlug.azclce.status, "live");
assert.equal(registry.bySlug.ark.status, "local_only");
assert.equal(registry.bySlug.whistlelock.status, "local_only");
assert.equal(registry.bySlug.miragegrid.status, "local_only");
assert.ok(registry.bySlug.ark.stub_ops.includes("scorch"));
assert.equal(classifyCall(registry.bySlug.ark, "scorch").kind, "stub");
assert.equal(classifyCall(null, "x").kind, "halluc");
assert.equal(parseTarget({ name: "godlock_submit" }, registry).slug, "godlock");
assert.equal(parseTarget({ name: "godlock_submit" }, registry).op, "submit");

const door = await (await get("/v1/fraggate")).json();
assert.equal(door.ok, true);
assert.equal(door.door, "fraggate");
assert.match(door.registry_digest, /^[a-f0-9]{64}$/);
assert.equal(door.live_count, registry.live_count);
assert.ok(door.kernel.includes("fraggate"));

const listed = await (await get("/v1/fraggate/list")).json();
assert.equal(listed.ok, true);
assert.ok(listed.entries.some((e) => e.slug === "foldlock" && e.status === "live"));
assert.ok(listed.entries.some((e) => e.slug === "vibelock" && e.status === "local_only"));

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

const localOnly = await (await post("/v1/fraggate/call", { slug: "vibelock", op: "analyze" })).json();
assert.equal(localOnly.ok, false);
assert.equal(localOnly.code, "FG-LOCAL-ONLY");

const whistleSend = await (await post("/v1/fraggate/call", { slug: "whistlelock", op: "send" })).json();
assert.equal(whistleSend.code, "FG-STUB");

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
assert.match(manifest.fraggate.registry_digest, /^[a-f0-9]{64}$/);
assert.equal(manifest.fraggate.live_count, registry.live_count);

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

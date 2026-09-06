/**
 * AZNet AZN-WP-0.1: FragGate-live engine, AZBrowser pair, garden, memorial, no payloads.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall, parseTarget } from "../src/fraggate/registry.js";
import { embeddedDigest } from "../src/engines/digest.js";
import { executeLocal } from "../src/engines/runner.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { memoryUsesKv } from "../src/uses.js";
import {
  PAIR_FLAG,
  PAIR_PEER,
  SPEC,
  VERSION,
  inspectPair,
  pairStatus,
  gardenList,
  stamp,
  verifyHash,
  memorialList,
  memorialAppend,
  receiptVerify,
  resetAznetStore,
} from "../src/engines/aznet/engine.js";

resetLedger();
resetAznetStore();

const PAIR = { pair_token: "aznet-azbrowser-pair", pair_flag: "azbrowser" };

const product = PRODUCTS.find((p) => p.slug === "aznet");
assert.ok(product, "aznet is a catalog product");
assert.equal(product.name, "AZNet");
assert.equal(product.worker, "aznet-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/aznet");
assert.equal(product.version, VERSION);
assert.match(product.oneLine, /Hash continuity without hosting/);
assert.match(product.banner, /FragGate/);
assert.equal(product.doi, null);
assert.equal(PAIR_PEER, "azbrowser");
assert.equal(PAIR_FLAG, "azbrowser");
assert.equal(SPEC, "AZN-WP-0.1");

const catalogOps = new Set(product.ops.map((o) => o.op));
const live = LIVE_OPS.aznet;
const expectedLive = [
  "health",
  "pair_status",
  "garden_list",
  "stamp",
  "verify_hash",
  "memorial_list",
  "memorial_append",
  "receipt_verify",
  "skill",
];
for (const op of expectedLive) {
  assert.ok(live.includes(op), `LIVE_OPS.aznet has ${op}`);
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}
for (const op of STUB_OPS.aznet) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.aznet.status, "live");
assert.ok(registry.bySlug.aznet.status !== "local_only");
for (const op of expectedLive) {
  assert.equal(classifyCall(registry.bySlug.aznet, op).kind, "live", `${op} is live`);
}
assert.equal(classifyCall(registry.bySlug.aznet, "payload_host").kind, "stub");
assert.equal(classifyCall(registry.bySlug.aznet, "serve_content_for_peer").kind, "stub");
assert.equal(classifyCall(registry.bySlug.aznet, "analytics").kind, "stub");
assert.equal(classifyCall(registry.bySlug.aznet, "ranking").kind, "stub");
assert.equal(classifyCall(registry.bySlug.aznet, "repair_integrity_bypass").kind, "stub");
assert.equal(classifyCall(registry.bySlug.aznet, "interface").kind, "stub");
assert.equal(classifyCall(registry.bySlug.aznet, "lumen").kind, "stub");
assert.equal(classifyCall(registry.bySlug.aznet, "hub").kind, "stub");

const parsedSlash = parseTarget({ name: "aznet/stamp" }, registry);
assert.equal(parsedSlash.slug, "aznet");
assert.equal(parsedSlash.op, "stamp");
assert.equal(classifyCall(parsedSlash.entry, parsedSlash.op).kind, "live");
const parsedFlat = parseTarget({ name: "aznet_stamp" }, registry);
assert.equal(parsedFlat.slug, "aznet");
assert.equal(parsedFlat.op, "stamp");
assert.equal(classifyCall(parsedFlat.entry, parsedFlat.op).kind, "live");

const missing = inspectPair({});
assert.equal(missing.paired, false);
assert.equal(missing.both_required, true);
assert.equal(missing.peer, "azbrowser");

const tokenOnly = inspectPair({ pair_token: "aznet-azbrowser-pair" });
assert.equal(tokenOnly.paired, false);
assert.equal(tokenOnly.token_present, true);
assert.equal(tokenOnly.flag_ok, false);

const flagOnly = inspectPair({ pair_flag: "azbrowser" });
assert.equal(flagOnly.paired, false);
assert.equal(flagOnly.token_present, false);

const both = inspectPair(PAIR);
assert.equal(both.paired, true);
assert.equal(both.flag_ok, true);

const status = pairStatus({});
assert.equal(status.ok, true);
assert.equal(status.pair.paired, false);
assert.equal(status.code, "AZN-PAIR-MISSING");

const refusedGarden = await gardenList({});
assert.equal(refusedGarden.ok, false);
assert.equal(refusedGarden.code, "AZN-PAIR-REQUIRED");

const refusedStamp = await stamp({ hash: "a".repeat(64) });
assert.equal(refusedStamp.ok, false);
assert.equal(refusedStamp.code, "AZN-PAIR-REQUIRED");

const hostRefuse = await stamp({ ...PAIR, hash: "b".repeat(64), host_payload: true });
assert.equal(hostRefuse.ok, false);
assert.equal(hostRefuse.code, "AZN-NO-PAYLOAD");
assert.equal(hostRefuse.hosts_payloads, false);

const stamped = await stamp({ ...PAIR, hash: "c".repeat(64), label: "garden-ref-1" });
assert.equal(stamped.ok, true, JSON.stringify(stamped));
assert.equal(stamped.ref.hash, "c".repeat(64));
assert.equal(stamped.hosts_payloads, false);
assert.ok(stamped.receipt);
assert.match(stamped.receipt.hash, /^[a-f0-9]{64}$/);
assert.match(stamped.receipt.staticclock_click, /^[a-f0-9]{64}$/);
assert.match(stamped.receipt.timeslate_hash, /^[a-f0-9]{64}$/);
assert.equal(stamped.receipt.prev_hash, "0".repeat(64));
assert.equal(stamped.receipt.click_index, 0);

const hashed = await stamp({ ...PAIR, text: "hash-then-discard-me", label: "from-text" });
assert.equal(hashed.ok, true);
assert.equal(hashed.hashed_then_discarded, true);
assert.ok(!("text" in hashed.ref));
assert.match(hashed.ref.hash, /^[a-f0-9]{64}$/);

const listed = await gardenList(PAIR);
assert.equal(listed.ok, true);
assert.ok(listed.count >= 2);
assert.ok(listed.garden.every((row) => row.hash && !("payload" in row) && !("content" in row)));

const verified = await verifyHash({ ...PAIR, hash: "c".repeat(64) });
assert.equal(verified.ok, true);
assert.equal(verified.verified, true);
assert.equal(verified.isolated, false);

const isolated = await verifyHash({ ...PAIR, hash: "c".repeat(64), expected: "d".repeat(64) });
assert.equal(isolated.ok, false);
assert.equal(isolated.code, "AZN-INTEGRITY");
assert.equal(isolated.isolated, true);

const isolateRefuse = await verifyHash({ ...PAIR, hash: "c".repeat(64) });
assert.equal(isolateRefuse.ok, false);
assert.equal(isolateRefuse.code, "AZN-ISOLATED");

const memRefuse = await memorialAppend({ ...PAIR, hash: "c".repeat(64), note: "should fail isolated" });
assert.equal(memRefuse.ok, false);
assert.equal(memRefuse.code, "AZN-ISOLATED");

const fresh = await stamp({ ...PAIR, hash: "e".repeat(64), label: "memorial-candidate" });
assert.equal(fresh.ok, true);
const memorial = await memorialAppend({ ...PAIR, hash: "e".repeat(64), note: "sealed" });
assert.equal(memorial.ok, true, JSON.stringify(memorial));
assert.equal(memorial.terminal_only, true);
assert.equal(memorial.memorial.terminal, true);
assert.equal(memorial.ref.memorialized, true);

const terminal = await memorialAppend({ ...PAIR, hash: "e".repeat(64), note: "rewrite" });
assert.equal(terminal.ok, false);
assert.equal(terminal.code, "AZN-MEMORIAL-TERMINAL");

const mems = await memorialList(PAIR);
assert.equal(mems.ok, true);
assert.ok(mems.memorials.some((m) => m.hash === "e".repeat(64)));
assert.ok(mems.memorials.every((m) => m.terminal === true));

const receipts = await receiptVerify({ chain: [stamped.receipt, hashed.receipt] });
assert.equal(receipts.ok, true, JSON.stringify(receipts.errors));
assert.equal(receipts.verified, true);
assert.equal(receipts.length, 2);
assert.equal(receipts.source, "submitted");

const local = await executeLocal({
  slug: "aznet",
  op: "pair_status",
  payload: {},
  ranIn: "aziel-runtime",
});
assert.equal(local.mode, "local");
assert.equal(local.true_engine_runtime, true);
assert.equal(local.engine_digest, embeddedDigest("aznet"));
assert.match(local.engine_digest, /^[a-f0-9]{64}$/);
const localBody = JSON.parse(local.responseText);
assert.equal(localBody.ok, true);
assert.equal(localBody.spec, "AZN-WP-0.1");

const localStub = await executeLocal({ slug: "aznet", op: "payload_host", payload: {}, ranIn: "aziel-runtime" });
assert.equal(localStub.unsupported, true);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = {
  SESSION: memorySessionNamespace({}),
  USES: memoryUsesKv(),
  AZMAIL_MESH: memoryUsesKv(),
};

async function post(path, body) {
  const res = await handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );
  return res.json();
}

const doorPair = await post("/v1/fraggate/call", { slug: "aznet", op: "pair_status", payload: {} });
assert.equal(doorPair.ok, true);
assert.equal(doorPair.code, "FG-OK");
assert.equal(doorPair.slug, "aznet");
assert.ok(doorPair.ledger_tip);
assert.equal(doorPair.result.pair.paired, false);

const doorRefuse = await post("/v1/fraggate/call", { slug: "aznet", op: "garden_list", payload: {} });
assert.equal(doorRefuse.ok, true);
assert.equal(doorRefuse.code, "FG-OK");
assert.equal(doorRefuse.result.ok, false);
assert.equal(doorRefuse.result.code, "AZN-PAIR-REQUIRED");

const doorStamp = await post("/v1/fraggate/call", {
  slug: "aznet",
  op: "stamp",
  payload: { ...PAIR, hash: "f".repeat(64), label: "door-ref" },
});
assert.equal(doorStamp.ok, true, JSON.stringify(doorStamp));
assert.equal(doorStamp.result.ok, true);
assert.equal(doorStamp.result.hosts_payloads, false);
assert.match(doorStamp.result.receipt.timeslate_hash, /^[a-f0-9]{64}$/);

const doorFlat = await post("/v1/fraggate/call", { name: "aznet/garden_list", payload: PAIR });
assert.equal(doorFlat.ok, true);
assert.equal(doorFlat.op, "garden_list");
assert.ok(doorFlat.result.garden.some((row) => row.hash === "f".repeat(64)));

const doorLeftover = await post("/v1/fraggate/call", { name: "aznet_stamp", payload: { ...PAIR, hash: "1".repeat(64), label: "leftover" } });
assert.equal(doorLeftover.ok, true);
assert.equal(doorLeftover.op, "stamp");
assert.equal(doorLeftover.slug, "aznet");
assert.equal(doorLeftover.result.ok, true);

const doorStub = await post("/v1/fraggate/call", { slug: "aznet", op: "payload_host" });
assert.equal(doorStub.ok, false);
assert.equal(doorStub.code, "FG-STUB");

const doorServe = await post("/v1/fraggate/call", { slug: "aznet", op: "serve_content_for_peer" });
assert.equal(doorServe.code, "FG-STUB");

const doorBypass = await post("/v1/fraggate/call", { slug: "aznet", op: "repair_integrity_bypass" });
assert.equal(doorBypass.code, "FG-STUB");

const mcp = await post("/mcp", {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name: "fraggate_call", arguments: { slug: "aznet", op: "pair_status", payload: {} } },
});
assert.equal(mcp.result.structuredContent.code, "FG-OK");
assert.equal(mcp.result.structuredContent.result.slug, "aznet");

const health = await handler(new Request(origin + "/v1/health"), env);
const healthBody = await health.json();
assert.ok(healthBody.true_engine_slugs.includes("aznet"));
assert.ok(healthBody.engine_slugs.includes("aznet"));
assert.equal(healthBody.engines.aznet.true_engine_runtime, true);
assert.equal(healthBody.engines.aznet.mode, "local");
assert.equal(healthBody.engines.aznet.engine_digest, embeddedDigest("aznet"));
assert.ok(!healthBody.proxy_fallback_ops.aznet);
if (healthBody.true_engine_slugs.includes("azbrowser")) {
  assert.ok(healthBody.engines.azbrowser);
}
assert.ok(healthBody.true_engine_slugs.includes("azmail"));
assert.ok(healthBody.true_engine_slugs.includes("peacelock"));

const llms = await (await handler(new Request(origin + "/llms.txt"), env)).text();
assert.match(llms, /AZNet/);
assert.match(llms, /AZN-WP-0\.1/);
assert.match(llms, /FragGate/);

const openapi = await (await handler(new Request(origin + "/openapi.json"), env)).json();
assert.match(openapi.info.description, /AZNet/);
assert.match(openapi.info.description, /fraggate\/call/);
assert.match(openapi.info.description, /not a payload host/i);

const uses = await (await handler(new Request(origin + "/v1/uses"), env)).json();
assert.equal(uses.ok, true);
assert.equal(uses.uses_kv, true);
assert.ok(uses.uses >= 1);

const home = await (await handler(new Request(origin + "/"), env)).text();
assert.match(home, /data-slug="aznet"/);
assert.match(home, /data-op="pair_status"/);
assert.match(home, /data-op="garden_list"/);
assert.match(home, /data-slug="azbrowser"/);
assert.ok(!home.includes('data-slug="azbrowser"') || home.indexOf('data-slug="aznet"') !== home.indexOf('data-slug="azbrowser"'));

const skill = await (await handler(new Request(origin + "/v1/skill"), env)).text();
assert.match(skill, /AZNet \(AZN-WP-0\.1\)/);
assert.match(skill, /slug: "aznet"/);

console.log(
  `ok aznet ${product.version}: LIVE_OPS=${live.join(",")} stub=${STUB_OPS.aznet.join(",")} pair_peer=${PAIR_PEER}`,
);

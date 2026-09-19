/**
 * Architecture-fit five: zkattest / mmconsensus / toolbench + isolate
 * sandbox + edge MCP gateway. FragGate remains THE single door.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { PUBLIC_MCP_TOOLS, PUBLIC_MCP_TOOL_MAX } from "../src/fraggate/codes.js";
import { embeddedDigest } from "../src/engines/digest.js";
import { executeLocal } from "../src/engines/runner.js";
import { domainFields, MASTER_33_SLUGS, TAB_PLACEMENT_SLUGS } from "../src/domain-map.js";
import { mcpGatewayCite, mcpServerCard } from "../src/mcp-discovery.js";
import { softwareBucket } from "../src/software-catalog.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { SUITE_CASES } from "../src/engines/toolbench/engine.js";
import { commit, attest, openCommitment } from "../src/engines/zkattest/engine.js";
import { tally } from "../src/engines/mmconsensus/engine.js";

resetLedger();

assert.ok(PUBLIC_MCP_TOOLS.length <= PUBLIC_MCP_TOOL_MAX);
assert.equal(PUBLIC_MCP_TOOLS.length, 36, "architecture-fit adds engines, not MCP tools");
assert.ok(!PUBLIC_MCP_TOOLS.some((n) => /^(zkattest|mmconsensus|toolbench)_/.test(n)));

const SLUGS = ["zkattest", "mmconsensus", "toolbench"];
for (const slug of SLUGS) {
  const product = PRODUCTS.find((p) => p.slug === slug);
  assert.ok(product, `${slug} is a catalog product`);
  assert.equal(product.github, "https://github.com/AzielEliab/aziel-runtime");
  assert.ok(!product.worker, `${slug} must not invent a download-tracker Worker`);
  assert.equal(product.doi, null);
  assert.equal(softwareBucket(product.name, product.slug), "plain");
  const domain = domainFields(slug);
  assert.equal(domain.domain, null);
  assert.ok(!MASTER_33_SLUGS.includes(slug), `${slug} is placement, not isolation-33`);
  assert.ok(TAB_PLACEMENT_SLUGS.includes(slug));
  assert.ok(LIVE_OPS[slug].includes("health"));
  assert.ok(LIVE_OPS[slug].includes("skill"));
  assert.ok(LIVE_OPS[slug].includes("doctor"));
  const registry = buildRegistry(PRODUCTS);
  assert.equal(registry.bySlug[slug].status, "live");
  assert.equal(classifyCall(registry.bySlug[slug], "health").kind, "live");
}

assert.equal(classifyCall(buildRegistry(PRODUCTS).bySlug.zkattest, "groth16").kind, "stub");
assert.equal(classifyCall(buildRegistry(PRODUCTS).bySlug.mmconsensus, "live_model_call").kind, "stub");
assert.equal(classifyCall(buildRegistry(PRODUCTS).bySlug.toolbench, "").kind, "stub");
assert.equal(classifyCall(null, "health").kind, "halluc");

const committed = await commit({ witness: "private-witness-1", salt: "aa".repeat(16) });
assert.equal(committed.ok, true);
assert.equal(committed.zk_system, false);
assert.ok(!JSON.stringify(committed).includes("private-witness-1"));
const bound = await attest({ statement: "public statement", commitment: committed.commitment });
assert.equal(bound.ok, true);
assert.equal(bound.verdict, "BOUND");
assert.ok(!JSON.stringify(bound).includes("private-witness-1"));
const opened = await openCommitment({
  commitment: committed.commitment,
  salt: committed.salt,
  witness: "private-witness-1",
});
assert.equal(opened.match, true);
assert.equal(opened.zero_knowledge, false);

const refuseWitness = await attest({
  statement: "x",
  commitment: committed.commitment,
  witness: "leak",
});
assert.equal(refuseWitness.ok, false);

const tallied = tally({
  statement: "Ship this week.",
  opinions: [
    { source: "a", verdict: "PASS", text: "OpenAPI review is done" },
    { source: "b", verdict: "PASS", text: "OpenAPI review finished" },
    { source: "c", verdict: "REVISE", text: "Need one more check" },
  ],
});
assert.equal(tallied.majority, "PASS");
assert.equal(tallied.live_model_call, false);
assert.equal(tallied.truth_score, false);

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

async function get(path) {
  return handler(new Request(origin + path), env);
}

for (const slug of SLUGS) {
  const described = await (await get(`/v1/fraggate/describe?slug=${slug}`)).json();
  assert.equal(described.ok, true);
  assert.equal(described.slug, slug);
  assert.equal(described.status, "live");

  const health = await (await post("/v1/fraggate/call", { slug, op: "health" })).json();
  assert.equal(health.ok, true);
  assert.equal(health.code, "FG-OK");
  assert.equal(health.slug, slug);
  assert.equal(health.door, "fraggate");

  const local = await executeLocal({ slug, op: "health", payload: {}, ranIn: "aziel-runtime" });
  assert.equal(local.mode, "local");
  assert.equal(local.engine_digest, embeddedDigest(slug));
}

const zkStub = await (await post("/v1/fraggate/call", { slug: "zkattest", op: "groth16" })).json();
assert.equal(zkStub.ok, false);
assert.equal(zkStub.code, "FG-STUB");

const mmStub = await (await post("/v1/fraggate/call", { slug: "mmconsensus", op: "live_model_call" })).json();
assert.equal(mmStub.ok, false);
assert.equal(mmStub.code, "FG-STUB");

const tbStub = await (await post("/v1/fraggate/call", { slug: "toolbench", op: "" })).json();
assert.equal(tbStub.ok, false);
assert.equal(tbStub.code, "FG-STUB");

const suite = await (await post("/v1/fraggate/call", { slug: "toolbench", op: "suite" })).json();
assert.equal(suite.ok, true);
assert.equal(suite.result.third_party_lab, false);
assert.ok(suite.result.count >= 8);

for (const row of SUITE_CASES) {
  const ran = await (await post("/v1/fraggate/call", { slug: "toolbench", op: "run_case", payload: { id: row.id } })).json();
  assert.equal(ran.ok, true, row.id);
  assert.equal(ran.result.pass, true, `${row.id} ${JSON.stringify(ran.result)}`);
  assert.equal(ran.result.invents_pass, false);
}

const gw = mcpGatewayCite();
assert.equal(gw.role, "edge-mcp-gateway");
assert.equal(gw.door, "fraggate");
assert.equal(gw.terminates_at, "fraggate_call");
assert.equal(gw.second_door, false);
assert.equal(gw.backdoor_exec, false);

const mcpGet = await (await get("/mcp")).json();
assert.equal(mcpGet.gateway.role, "edge-mcp-gateway");
assert.equal(mcpGet.gateway.second_door, false);
assert.equal(mcpGet.door, "fraggate");

const card = mcpServerCard(origin);
assert.equal(card.gateway.role, "edge-mcp-gateway");
assert.equal(card.tools.count, PUBLIC_MCP_TOOLS.length);

const sessOpened = await (await post("/v1/session/open", {})).json();
const sid = sessOpened.session.id;
const guest = await post(`/v1/session/${sid}/policy`, { qemu: true });
const guestBody = await guest.json();
assert.equal(guest.status, 400);
assert.equal(guestBody.code, "guest_vm_refused");

const kvmClass = await post(`/v1/session/${sid}/policy`, { isolate_class: "kvm" });
assert.equal((await kvmClass.json()).code, "guest_vm_refused");

const pol = await (await post(`/v1/session/${sid}/policy`, { max_ops: 1, wipe_on_close: true, allow_slugs: ["zkattest"] })).json();
assert.equal(pol.ok, true);
assert.equal(pol.session.policy.max_ops, 1);
assert.equal(pol.session.policy.wipe_on_close, true);
assert.equal(pol.session.policy.sandbox_kind, "isolate");
assert.equal(pol.session.policy.guest_vm, false);

const exec1 = await post(`/v1/session/${sid}/exec`, { slug: "zkattest", op: "health", payload: {} });
assert.equal(exec1.status, 200);
const exec2 = await post(`/v1/session/${sid}/exec`, { slug: "zkattest", op: "skill", payload: {} });
const exec2Body = await exec2.json();
assert.equal(exec2.status, 409);
assert.equal(exec2Body.code, "max_ops");

const closed = await (await post(`/v1/session/${sid}/close`, {})).json();
assert.equal(closed.session.closed, true);
assert.equal(closed.session.wiped, true);
assert.equal(closed.receipt.payload.guest_vm, false);

const fitDoc = readFileSync(new URL("../docs/2.0/ARCHITECTURE-FIT-FIVE.md", import.meta.url), "utf8");
assert.match(fitDoc, /Lamb Lens/);
assert.match(fitDoc, /Service → Clarity → Peace/);
assert.match(fitDoc, /NO-LIE/);
assert.match(fitDoc, /FragGate is THE single public executable door/);
assert.match(fitDoc, /zkattest/);
assert.match(fitDoc, /mmconsensus/);
assert.match(fitDoc, /toolbench/);
assert.match(fitDoc, /edge-mcp-gateway/);
assert.doesNotMatch(fitDoc, / is LIVE|full ZK proving is LIVE|KVM guest is LIVE/i);
assert.match(fitDoc, /Worker-only placement/);
assert.match(fitDoc, /WHITESTONE-PLACEMENT/);
assert.match(fitDoc, /do \*\*not\*\* invent `fraggate_call` ops/);

const whitePlace = readFileSync(new URL("../docs/2.0/WHITESTONE-PLACEMENT.md", import.meta.url), "utf8");
assert.match(whitePlace, /worker_only/);
assert.match(whitePlace, /FG-HALLUC-TOOL/);
assert.match(whitePlace, /Case Mode/);
assert.match(whitePlace, /not\*\* the FragGate kernel/);
assert.match(whitePlace, /Aziel Eliab/);
assert.doesNotMatch(whitePlace, /fraggate_call ops for Whitestone|invent a FragGate door/i);

console.log("ok architecture-fit: zkattest/mmconsensus/toolbench door paths + isolate sandbox + edge MCP gateway");

/**
 * FragGate door: thin tools/list, hashed registry, HALLUC/stub/local_only refuse,
 * DecisionGATE ledger, allowlisted live ops.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { existMcpHint, PUBLIC_MCP_TOOLS, PUBLIC_MCP_TOOL_MAX } from "../src/fraggate/codes.js";
import { LIVE_OPS, NAMED_STUBS, OP_ALIASES, STUB_OPS, buildRegistry, classifyCall, parseTarget, resolveOpAlias } from "../src/fraggate/registry.js";
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
assert.equal(registry.bySlug.azmail.status, "live");
assert.ok(registry.bySlug.azmail.status !== "local_only");
assert.ok(registry.bySlug.azmail.ops.includes("airlock_classify"));
assert.ok(registry.bySlug.azmail.ops.includes("scrub"));
assert.ok(registry.bySlug.azmail.ops.includes("trust_score"));
assert.ok(registry.bySlug.azmail.ops.includes("mesh_post"));
assert.ok(registry.bySlug.azmail.ops.includes("mesh_poll"));
assert.ok(registry.bySlug.azmail.ops.includes("mesh_listen"));
assert.ok(registry.bySlug.azmail.ops.includes("mesh_enable"));
assert.ok(registry.bySlug.azmail.ops.includes("mesh_disable"));
assert.ok(registry.bySlug.azmail.ops.includes("keyword_alert_set"));
assert.ok(registry.bySlug.azmail.ops.includes("keyword_alert_list"));
assert.ok(registry.bySlug.azmail.ops.includes("keyword_alert_check"));
assert.ok(!registry.bySlug.azmail.ops.includes("smtp"));
assert.ok(registry.bySlug.azmail.stub_ops.includes("smtp"));
assert.ok(registry.bySlug.azmail.stub_ops.includes("deanonymize"));
assert.ok(registry.bySlug.azmail.stub_ops.includes("harvest"));
assert.equal(classifyCall(registry.bySlug.azmail, "smtp").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azmail, "mesh_post").kind, "live");
assert.equal(registry.bySlug.azbrowser.status, "live");
assert.ok(registry.bySlug.azbrowser.status !== "local_only");
assert.ok(registry.bySlug.azbrowser.ops.includes("ethical_search"));
assert.ok(registry.bySlug.azbrowser.ops.includes("lamb_lens_search"));
assert.ok(registry.bySlug.azbrowser.ops.includes("navigate"));
assert.ok(registry.bySlug.azbrowser.ops.includes("airlock_ingest"));
assert.ok(registry.bySlug.azbrowser.ops.includes("tab_open"));
assert.ok(registry.bySlug.azbrowser.ops.includes("tab_list"));
assert.ok(registry.bySlug.azbrowser.ops.includes("receipt_list"));
assert.ok(registry.bySlug.azbrowser.ops.includes("verify"));
assert.ok(registry.bySlug.azbrowser.ops.includes("receipt_verify"));
assert.ok(!registry.bySlug.azbrowser.ops.includes("tor_exit"));
assert.ok(registry.bySlug.azbrowser.stub_ops.includes("tor_exit"));
assert.ok(registry.bySlug.azbrowser.stub_ops.includes("phoenix_wipe"));
assert.ok(registry.bySlug.azbrowser.stub_ops.includes("chromium"));
assert.ok(registry.bySlug.azbrowser.stub_ops.includes("unrestricted_proxy"));
assert.ok(registry.bySlug.azbrowser.stub_ops.includes("harvest"));
assert.equal(classifyCall(registry.bySlug.azbrowser, "tor_exit").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azbrowser, "ethical_search").kind, "live");
assert.equal(registry.bySlug.aznet.status, "live");
assert.ok(registry.bySlug.aznet.status !== "local_only");
assert.ok(registry.bySlug.aznet.ops.includes("pair_status"));
assert.ok(registry.bySlug.aznet.ops.includes("garden_list"));
assert.ok(registry.bySlug.aznet.ops.includes("stamp"));
assert.ok(registry.bySlug.aznet.ops.includes("verify_hash"));
assert.ok(registry.bySlug.aznet.ops.includes("memorial_list"));
assert.ok(registry.bySlug.aznet.ops.includes("memorial_append"));
assert.ok(registry.bySlug.aznet.ops.includes("receipt_verify"));
assert.ok(!registry.bySlug.aznet.ops.includes("payload_host"));
assert.ok(registry.bySlug.aznet.stub_ops.includes("payload_host"));
assert.ok(registry.bySlug.aznet.stub_ops.includes("serve_content_for_peer"));
assert.ok(registry.bySlug.aznet.stub_ops.includes("analytics"));
assert.ok(registry.bySlug.aznet.stub_ops.includes("ranking"));
assert.ok(registry.bySlug.aznet.stub_ops.includes("repair_integrity_bypass"));
assert.ok(registry.bySlug.aznet.stub_ops.includes("interface"));
assert.ok(registry.bySlug.aznet.stub_ops.includes("lumen"));
assert.ok(registry.bySlug.aznet.stub_ops.includes("hub"));
assert.equal(classifyCall(registry.bySlug.aznet, "payload_host").kind, "stub");
assert.equal(classifyCall(registry.bySlug.aznet, "stamp").kind, "live");
assert.equal(registry.bySlug.azhub.status, "live");
assert.ok(registry.bySlug.azhub.ops.includes("blank_key_status"));
assert.ok(registry.bySlug.azhub.ops.includes("region_list"));
assert.ok(registry.bySlug.azhub.stub_ops.includes("auto_unlock"));
assert.ok(registry.bySlug.azhub.stub_ops.includes("completeness_detect"));
assert.equal(classifyCall(registry.bySlug.azhub, "auto_unlock").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azhub, "blank_key_status").kind, "live");
assert.equal(registry.bySlug.azinterface.status, "live");
assert.ok(registry.bySlug.azinterface.ops.includes("page_cycle_status"));
assert.ok(registry.bySlug.azinterface.ops.includes("genesis_status"));
assert.ok(registry.bySlug.azinterface.stub_ops.includes("auto_unlock"));
assert.ok(registry.bySlug.azinterface.stub_ops.includes("ranking"));
assert.equal(classifyCall(registry.bySlug.azinterface, "completeness_detect").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azinterface, "page_cycle_status").kind, "live");
assert.equal(registry.bySlug["4dmap"].status, "live");
assert.ok(registry.bySlug["4dmap"].ops.includes("card_new"));
assert.ok(registry.bySlug["4dmap"].ops.includes("card_walk"));
assert.ok(registry.bySlug["4dmap"].ops.includes("verify_hash"));
assert.ok(registry.bySlug["4dmap"].ops.includes("frame_status"));
assert.ok(registry.bySlug["4dmap"].ops.includes("neighbor_cite"));
assert.ok(registry.bySlug["4dmap"].ops.includes("pin"));
assert.ok(registry.bySlug["4dmap"].ops.includes("walk"));
assert.ok(registry.bySlug["4dmap"].ops.includes("list"));
assert.ok(registry.bySlug["4dmap"].ops.includes("example"));
assert.ok(registry.bySlug["4dmap"].stub_ops.includes("truth_score"));
assert.ok(registry.bySlug["4dmap"].stub_ops.includes("invent_mark"));
assert.equal(classifyCall(registry.bySlug["4dmap"], "card_new").kind, "live");
assert.equal(classifyCall(registry.bySlug["4dmap"], "truth_score").kind, "stub");
assert.ok(registry.bySlug.employeelock.ops.includes("append-preview"));
assert.ok(registry.bySlug.mialock.ops.includes("doe-match"));
assert.ok(registry.bySlug.ark.stub_ops.includes("scorch"));
assert.equal(classifyCall(registry.bySlug.ark, "scorch").kind, "stub");
assert.equal(classifyCall(null, "x").kind, "halluc");
assert.equal(parseTarget({ name: "godlock_submit" }, registry).slug, "godlock");
assert.equal(parseTarget({ name: "godlock_submit" }, registry).op, "submit");

for (const [slug, ops] of Object.entries(LIVE_OPS)) {
  if (slug === "mesh") {
    assert.ok(registry.bySlug.mesh && registry.bySlug.mesh.kind === "kernel");
    assert.ok(!PRODUCTS.some((p) => p.slug === "mesh"), "mesh is not a catalog Software product");
    continue;
  }
  if (slug === "memory") {
    assert.ok(registry.bySlug.memory && registry.bySlug.memory.kind === "kernel");
    assert.ok(!PRODUCTS.some((p) => p.slug === "memory"), "memory is not a catalog Software product");
    assert.equal(registry.bySlug.memory.software_tab, false);
    continue;
  }
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
assert.ok(listed.entries.some((e) => e.slug === "embryolock" && e.status === "live" && e.ops.includes("policy")));
assert.ok(listed.entries.some((e) => e.slug === "mesh" && e.status === "live" && e.ops.includes("join")));
assert.ok(listed.op_aliases && listed.op_aliases.azhub.list_modules === "region_list");
assert.ok(listed.entries.some((e) => e.slug === "azhub" && e.ops.includes("list_modules") && e.ops.includes("place")));
assert.ok(listed.entries.some((e) => e.slug === "azinterface" && e.ops.includes("genesis_boot") && e.ops.includes("hold")));
assert.ok(listed.entries.some((e) => e.slug === "azbrowser" && e.ops.includes("airlock") && e.ops.includes("home")));
assert.ok(listed.entries.some((e) => e.slug === "azmail" && e.ops.includes("classify")));
assert.ok(listed.entries.some((e) => e.slug === "aznet" && e.ops.includes("doctor") && e.ops.includes("pair")));
assert.ok(listed.entries.some((e) => e.slug === "peacelock" && e.ops.includes("doctor")));

const described = await (await get("/v1/fraggate/describe?name=FoldLock")).json();
assert.equal(described.ok, true);
assert.equal(described.slug, "foldlock");
assert.equal(described.status, "live");
assert.ok(described.ops.includes("fold-preview"));

const embryoDesc = await (await get("/v1/fraggate/describe?slug=embryolock")).json();
assert.equal(embryoDesc.ok, true);
assert.equal(embryoDesc.slug, "embryolock");
assert.equal(embryoDesc.status, "live");
assert.equal(embryoDesc.live, true);
assert.equal(embryoDesc.stub, false);
assert.match(String(embryoDesc.digest || ""), /^[a-f0-9]{64}$/);
assert.match(String(embryoDesc.note || embryoDesc.description || ""), /local-destructive|Never execute on the public mesh/i);

const embryoCall = await (await post("/v1/fraggate/call", { slug: "embryolock", op: "arm" })).json();
assert.equal(embryoCall.ok, false);
assert.equal(embryoCall.code, "FG-STUB");

assert.equal(resolveOpAlias("azhub", "list_modules").op, "region_list");
assert.equal(resolveOpAlias("azhub", "place").op, "place_module");
assert.equal(resolveOpAlias("azinterface", "genesis_boot").op, "genesis_status");
assert.equal(resolveOpAlias("azinterface", "hold").op, "page_cycle_status");
assert.equal(resolveOpAlias("azbrowser", "airlock").op, "airlock_ingest");
assert.equal(resolveOpAlias("azbrowser", "home").op, "health");
assert.equal(resolveOpAlias("azmail", "classify").op, "airlock_classify");
assert.equal(resolveOpAlias("aznet", "doctor").op, "health");
assert.equal(resolveOpAlias("aznet", "pair").op, "pair_status");
assert.equal(resolveOpAlias("peacelock", "doctor").op, "health");
assert.equal(resolveOpAlias("azhub", "region_list").aliased, false);

assert.ok(registry.bySlug.embryolock);
assert.equal(registry.bySlug.embryolock.status, "live");
assert.equal(registry.bySlug.embryolock.local_destructive_boundary, true);
assert.equal(registry.stub_count, NAMED_STUBS.length);
assert.equal(classifyCall(registry.bySlug.embryolock, "arm").kind, "stub");
assert.equal(classifyCall(registry.bySlug.embryolock, "health").kind, "live");
assert.ok(PRODUCTS.some((p) => p.slug === "embryolock"), "embryolock is a catalog Software engine");

for (const [slug, aliases] of Object.entries(OP_ALIASES)) {
  for (const [uiOp, canon] of Object.entries(aliases)) {
    assert.ok((LIVE_OPS[slug] || []).includes(uiOp), `LIVE_OPS.${slug} lists UI alias ${uiOp}`);
    assert.ok((LIVE_OPS[slug] || []).includes(canon), `LIVE_OPS.${slug} lists canonical ${canon}`);
    assert.ok(registry.bySlug[slug].ops.includes(uiOp), `describe/list ops include ${slug}/${uiOp}`);
    assert.equal(classifyCall(registry.bySlug[slug], uiOp).kind, "live", `${slug}/${uiOp} is live`);
  }
}

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
assert.ok(hallucBody.exist.mcp.includes("memory_observe"));
assert.ok(hallucBody.exist.mcp.includes("mesh_status"));
assert.ok(hallucBody.exist.mcp.includes("chainlock_append"));
assert.equal(hallucBody.exist.see, "tools/list");
assert.equal(hallucBody.exist.pointer, "POST /mcp tools/list");
assert.ok(!hallucBody.exist.mcp.includes("foldlock_fold-preview"));
assert.deepEqual(hallucBody.exist.mcp.slice().sort(), PUBLIC_MCP_TOOLS.slice().sort());

const stubHttp = await (await post("/v1/fraggate/call", { slug: "ark", op: "scorch" })).json();
assert.equal(stubHttp.ok, false);
assert.equal(stubHttp.code, "FG-STUB");
assert.equal(stubHttp.ledger_tip.refused, true);
assert.ok(stubHttp.exist.mcp.includes("fraggate_call"));
assert.equal(stubHttp.exist.see, "tools/list");

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

const azmailSmtp = await (await post("/v1/fraggate/call", { slug: "azmail", op: "smtp" })).json();
assert.equal(azmailSmtp.ok, false);
assert.equal(azmailSmtp.code, "FG-STUB");

const azmailDeanonymize = await (await post("/v1/fraggate/call", { slug: "azmail", op: "deanonymize" })).json();
assert.equal(azmailDeanonymize.code, "FG-STUB");

const liveAzmail = await (
  await post("/v1/fraggate/call", {
    slug: "azmail",
    op: "airlock_classify",
    payload: { text: "hello from the anonymous ring" },
  })
).json();
assert.equal(liveAzmail.ok, true, JSON.stringify(liveAzmail));
assert.equal(liveAzmail.code, "FG-OK");
assert.equal(liveAzmail.slug, "azmail");
assert.ok(liveAzmail.ledger_tip);
assert.ok(liveAzmail.engine && liveAzmail.engine.engine_digest);

const azbrowserTor = await (await post("/v1/fraggate/call", { slug: "azbrowser", op: "tor_exit" })).json();
assert.equal(azbrowserTor.ok, false);
assert.equal(azbrowserTor.code, "FG-STUB");

const azbrowserChromium = await (await post("/v1/fraggate/call", { slug: "azbrowser", op: "chromium" })).json();
assert.equal(azbrowserChromium.code, "FG-STUB");

const liveAzbrowser = await (
  await post("/v1/fraggate/call", {
    slug: "azbrowser",
    op: "ethical_search",
    payload: { q: "ethical web principles" },
  })
).json();
assert.equal(liveAzbrowser.ok, true, JSON.stringify(liveAzbrowser));
assert.equal(liveAzbrowser.code, "FG-OK");
assert.equal(liveAzbrowser.slug, "azbrowser");
assert.ok(liveAzbrowser.ledger_tip);
assert.ok(liveAzbrowser.engine && liveAzbrowser.engine.engine_digest);
assert.ok(liveAzbrowser.result && liveAzbrowser.result.receipt);

const aznetHost = await (await post("/v1/fraggate/call", { slug: "aznet", op: "payload_host" })).json();
assert.equal(aznetHost.ok, false);
assert.equal(aznetHost.code, "FG-STUB");

const liveAznet = await (
  await post("/v1/fraggate/call", {
    slug: "aznet",
    op: "pair_status",
    payload: {},
  })
).json();
assert.equal(liveAznet.ok, true, JSON.stringify(liveAznet));
assert.equal(liveAznet.code, "FG-OK");
assert.equal(liveAznet.slug, "aznet");
assert.ok(liveAznet.ledger_tip);
assert.ok(liveAznet.engine && liveAznet.engine.engine_digest);

const azhubUnlock = await (await post("/v1/fraggate/call", { slug: "azhub", op: "auto_unlock" })).json();
assert.equal(azhubUnlock.ok, false);
assert.equal(azhubUnlock.code, "FG-STUB");
const liveAzhub = await (await post("/v1/fraggate/call", { slug: "azhub", op: "blank_key_status", payload: {} })).json();
assert.equal(liveAzhub.ok, true, JSON.stringify(liveAzhub));
assert.equal(liveAzhub.code, "FG-OK");
assert.equal(liveAzhub.slug, "azhub");
assert.equal(liveAzhub.result.interprets, false);
assert.equal(liveAzhub.result.auto_unlock, false);

const uiAliasCases = [
  { slug: "azhub", op: "list_modules", payload: {}, canon: "region_list" },
  { slug: "azhub", op: "place", payload: { region: "west", module_id: "azmail" }, canon: "place_module" },
  { slug: "azinterface", op: "genesis_boot", payload: {}, canon: "genesis_status" },
  { slug: "azinterface", op: "hold", payload: {}, canon: "page_cycle_status" },
  { slug: "azbrowser", op: "airlock", payload: { url: "https://github.com/AzielEliab/azbrowser" }, canon: "airlock_ingest" },
  { slug: "azbrowser", op: "home", payload: {}, canon: "health" },
  { slug: "azmail", op: "classify", payload: { text: "hello from the anonymous ring" }, canon: "airlock_classify" },
  { slug: "aznet", op: "doctor", payload: {}, canon: "health" },
  { slug: "aznet", op: "pair", payload: {}, canon: "pair_status" },
  { slug: "peacelock", op: "doctor", payload: {}, canon: "health" },
];
for (const row of uiAliasCases) {
  const body = await (await post("/v1/fraggate/call", { slug: row.slug, op: row.op, payload: row.payload })).json();
  assert.equal(body.ok, true, `${row.slug}/${row.op} ${JSON.stringify(body)}`);
  assert.equal(body.code, "FG-OK", `${row.slug}/${row.op} code`);
  assert.equal(body.slug, row.slug);
  assert.equal(body.op, row.op);
  assert.equal(body.canonical_op, row.canon);
  assert.equal(body.aliased, true);
  assert.notEqual(body.code, "FG-UNKNOWN-OP");
}

const interfaceScorch = await (await post("/v1/fraggate/call", { slug: "azinterface", op: "scorch_remote" })).json();
assert.equal(interfaceScorch.ok, false);
assert.equal(interfaceScorch.code, "FG-STUB");

const azinterfaceUnlock = await (await post("/v1/fraggate/call", { slug: "azinterface", op: "auto_unlock" })).json();
assert.equal(azinterfaceUnlock.code, "FG-STUB");
const liveAzinterface = await (
  await post("/v1/fraggate/call", { slug: "azinterface", op: "page_cycle_status", payload: {} })
).json();
assert.equal(liveAzinterface.ok, true, JSON.stringify(liveAzinterface));
assert.equal(liveAzinterface.code, "FG-OK");
assert.equal(liveAzinterface.slug, "azinterface");
assert.deepEqual(liveAzinterface.result.cycles, ["OFF", "integrity", "ON", "FULL SHUTDOWN", "MEMORIAL"]);

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
  manifest.fraggate.product_count,
);
assert.equal(manifest.product_count, PRODUCTS.length);
assert.equal(manifest.fraggate.product_count, registry.entries.length);
assert.ok(manifest.fraggate.product_count > manifest.product_count, "named stubs sit on the FragGate registry, not the catalog");

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
assert.deepEqual(tools.slice().sort(), PUBLIC_MCP_TOOLS.slice().sort(), "exist.mcp / PUBLIC_MCP_TOOLS tracks tools/list");
assert.equal(existMcpHint().see, "tools/list");
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
assert.ok(openapi.paths["/mcp"]);
assert.equal(openapi.paths["/p/foldlock/fold-preview"], undefined);
assert.match(openapi.info.description, /FragGate/);

console.log(`ok fraggate ${RUNTIME_VERSION}: door, registry, HALLUC/stub/local_only, gate ledger, live allowlist, thin MCP`);

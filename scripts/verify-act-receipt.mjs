/**
 * ACT-RECEIPT-1.0: fail-open append, four fields, no Softwares card.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { NAMED_STUBS } from "../src/fraggate/registry.js";
import { WORKER_ONLY_PRODUCTS } from "../src/software-catalog.js";
import { SUITE_DESIGNS } from "../src/seo.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { ZERO_HASH } from "../src/session-core.js";
import {
  ACT_RECEIPT_NOTE,
  ACT_RECEIPT_TIP_DARK,
  ACT_RECEIPT_TIP_EMPTY,
  LIBRARY_RECEIPTS,
  LIBRARY_RECEIPTS_PUBLIC,
  RECEIPTS_HEADER,
  RECEIPTS_SPEC,
  actReceiptHint,
  actReceiptStatus,
  appendActReceipt,
  dispatchActReceiptHttp,
  hashActReceipt,
  mintActReceipt,
  oneSentence,
  publishLibraryReceipt,
  recordActReceipt,
  shouldMintActReceipt,
} from "../src/library-receipts.js";

const paper = readFileSync(new URL("../docs/designs/ACT-RECEIPT-1.0.md", import.meta.url), "utf8");
const pdf = readFileSync(new URL("../docs/designs/ACT-RECEIPT-1.0.pdf", import.meta.url));
assert.ok(pdf.slice(0, 5).toString() === "%PDF-");
assert.match(paper, /^# ACT-RECEIPT-1\.0/m);
assert.match(paper, /www\.azielcorpuslibrary\.net\/receipts/);
assert.match(paper, /x-aziel-receipt/);
assert.match(paper, /RECEIPT_APPEND_TOKEN/);
assert.match(paper, /Fail-open/);
assert.match(paper, /Not a Softwares-tab product/);
assert.match(paper, /No user \/ IP \/ geo/);
assert.match(paper, /MESH-VAULT lite/);
assert.match(paper, /Not a Remain-OFF flip/);
assert.match(paper, /Do not enable remain-off items/);
assert.match(paper, /die with the pull/i);
assert.match(paper, /wait \/ re-seal/);
assert.doesNotMatch(paper, /Phoenix brings/i);
assert.doesNotMatch(paper, /auto-reattach/i);

assert.equal(RECEIPTS_SPEC, "ACT-RECEIPT-1.0");
assert.equal(LIBRARY_RECEIPTS, "https://www.azielcorpuslibrary.net/v1/receipts/append");
assert.equal(LIBRARY_RECEIPTS_PUBLIC, "https://www.azielcorpuslibrary.net/receipts");
assert.match(ACT_RECEIPT_NOTE, /fail-open/i);

assert.equal(oneSentence("First sentence. Second stays out."), "First sentence.");
assert.ok(SUITE_DESIGNS.some((d) => d.id === "ACT-RECEIPT-1.0" && d.kind === "fabric" && d.file === "ACT-RECEIPT-1.0.md"));

assert.equal(shouldMintActReceipt("GET", "/v1/fraggate/list"), true);
assert.equal(shouldMintActReceipt("POST", "/v1/fraggate/call"), true);
assert.equal(shouldMintActReceipt("POST", "/mcp"), true);
assert.equal(shouldMintActReceipt("POST", "/v1/memory/observe"), true);
assert.equal(shouldMintActReceipt("POST", "/v1/mesh/join"), true);
assert.equal(shouldMintActReceipt("GET", "/v1/software"), true);
assert.equal(shouldMintActReceipt("GET", "/v1/pull/peacelock"), true);
assert.equal(shouldMintActReceipt("GET", "/v1/health"), false);
assert.equal(shouldMintActReceipt("GET", "/v1/receipts"), false);
assert.equal(shouldMintActReceipt("GET", "/v1/receipts/tip"), false);
assert.equal(shouldMintActReceipt("GET", "/"), false);

const minted = await mintActReceipt({
  previous_hash: ZERO_HASH,
  request: "FragGate listed the hashed registry.",
  output: "Returned 200 without breaking the engine path.",
  event: {
    surface: "fraggate",
    path: "/v1/fraggate/list",
    method: "GET",
    status: 200,
    tool: "fraggate_list",
    spec: RECEIPTS_SPEC,
    runtime_version: RUNTIME_VERSION,
  },
});
assert.match(minted.hash, /^[a-f0-9]{64}$/);
assert.equal(minted.previous_hash, ZERO_HASH);
assert.equal(minted.request.split(/[.!?]/).filter(Boolean).length, 1);
assert.equal(minted.output.split(/[.!?]/).filter(Boolean).length, 1);
assert.deepEqual(Object.keys(minted.event).sort(), [
  "method",
  "path",
  "runtime_version",
  "spec",
  "status",
  "surface",
  "tool",
]);
assert.equal(minted.event.spec, RECEIPTS_SPEC);
assert.equal(minted.event.runtime_version, RUNTIME_VERSION);
const recomputed = await hashActReceipt({
  previous_hash: minted.previous_hash,
  request: minted.request,
  output: minted.output,
  event: minted.event,
});
assert.equal(minted.hash, recomputed);

const noToken = await publishLibraryReceipt({}, { action: "Ask.", output: "Answer." });
assert.equal(noToken.refuse, "no-token");
assert.equal(noToken.published, false);

const skipped = await recordActReceipt({}, new Request("https://aziel-runtime.example/v1/fraggate/list"), new Response("ok"));
assert.equal(skipped.skipped, true);
assert.equal(skipped.refuse, "no-token");

const prev = "ab".repeat(32);
const calls = [];
const fakeFetch = async (url, init) => {
  calls.push({ url: String(url), method: init && init.method, headers: init && init.headers, body: init && init.body });
  if (String(url).includes("/v1/receipts/tip")) {
    return new Response(JSON.stringify({ ok: true, hash: prev }), { status: 200 });
  }
  if (String(url).includes("/v1/receipts/append")) {
    return new Response(JSON.stringify({ ok: true, receipt: { hash: "cc".repeat(32) } }), { status: 201 });
  }
  return new Response("no", { status: 404 });
};

const published = await publishLibraryReceipt(
  { RECEIPT_APPEND_TOKEN: "secret-token" },
  { action: "FragGate listed the hashed registry.", output: "Returned 200 without breaking the engine path.", path: "/v1/fraggate/list", method: "GET", tool: "fraggate_list", status: 200 },
  fakeFetch,
);
assert.equal(published.published, true);
assert.equal(calls.length, 2);
assert.equal(calls[1].url, LIBRARY_RECEIPTS);
assert.equal(calls[1].headers[RECEIPTS_HEADER], "secret-token");
const posted = JSON.parse(calls[1].body);
assert.equal(posted.spec, RECEIPTS_SPEC);
assert.equal(posted.previous_hash, prev);
assert.match(posted.hash, /^[a-f0-9]{64}$/);
assert.equal(posted.request, "FragGate listed the hashed registry.");
assert.equal(posted.output, "Returned 200 without breaking the engine path.");
assert.equal(posted.event.surface, "aziel-runtime");
assert.equal(posted.event.path, "/v1/fraggate/list");
assert.equal(posted.event.method, "GET");
assert.equal(posted.event.tool, "fraggate_list");
assert.equal(posted.event.spec, RECEIPTS_SPEC);
assert.equal(posted.event.runtime_version, RUNTIME_VERSION);
assert.ok(!JSON.stringify(posted).includes("secret-token"));
assert.doesNotMatch(JSON.stringify(posted), /"ip"|geo|latitude|user_id|cf-connecting/i);

const darkCalls = [];
const darkPublish = await publishLibraryReceipt(
  { RECEIPT_APPEND_TOKEN: "secret-token" },
  { action: "Ask.", output: "Answer." },
  async () => {
    darkCalls.push("tip");
    throw new Error("dark");
  },
);
assert.equal(darkPublish.published, false);
assert.equal(darkPublish.skipped, true);
assert.equal(darkPublish.refuse, "corpus-unreachable");
assert.equal(darkCalls.length, 1);

const down = await appendActReceipt({ RECEIPT_APPEND_TOKEN: "x" }, minted, async () => {
  throw new Error("network down");
});
assert.equal(down.fail_open, true);
assert.equal(down.published, false);

const cite = actReceiptStatus();
assert.equal(cite.software_tab, false);
assert.equal(cite.fraggate_slug, false);
assert.equal(cite.public_chain, LIBRARY_RECEIPTS_PUBLIC);
assert.deepEqual(cite.fields, ["hash", "request", "output", "event"]);
assert.equal(cite.no_user_ip_geo, true);
assert.equal(cite.empty_tip_is_not_success, true);
assert.equal(cite.fail_open_means.includes("append-skip"), true);
assert.equal(cite.content_addressed, true);
assert.match(cite.forgereceipts, /not this public ACT tip/);
assert.equal(actReceiptHint().software_tab, false);
assert.equal(actReceiptHint().empty_tip_is_not_success, true);

const postRefuse = await dispatchActReceiptHttp("POST", "/v1/receipts", {});
assert.equal(postRefuse.status, 405);
assert.equal(postRefuse.body.code, "ACT-RECEIPT-CORPUS-ONLY");

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path, env = {}) {
  return handler(new Request(origin + path), env);
}

async function postJson(path, body, env = {}) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    }),
    env,
  );
}

const res = await get("/v1/receipts");
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.spec, RECEIPTS_SPEC);
assert.equal(body.public_chain, LIBRARY_RECEIPTS_PUBLIC);
assert.equal(body.software_tab, false);
assert.equal(body.fail_open, true);
assert.equal(body.token_configured, false);
assert.match(body.note, /azielcorpuslibrary\.net\/receipts/);
assert.deepEqual(body.fields, ["hash", "request", "output", "event"]);

const head = await handler(new Request(origin + "/v1/receipts", { method: "HEAD" }), {});
assert.equal(head.status, 200);

const refused = await postJson("/v1/receipts", { append: true });
assert.equal(refused.status, 405);

const tipCalls = [];
const tipFetch = async (url) => {
  tipCalls.push(String(url));
  return new Response(JSON.stringify({ ok: true, hash: prev, tip: { hash: prev } }), { status: 200 });
};
const tipOut = await dispatchActReceiptHttp("GET", "/v1/receipts/tip", {}, tipFetch);
assert.equal(tipOut.status, 200);
assert.equal(tipOut.body.proxied, true);
assert.equal(tipOut.body.public_chain, LIBRARY_RECEIPTS_PUBLIC);
assert.equal(tipOut.body.hash, prev);
const proxyOut = await dispatchActReceiptHttp("GET", "/v1/receipts/proxy", {}, tipFetch);
assert.equal(proxyOut.body.proxied, true);

const darkTip = await dispatchActReceiptHttp("GET", "/v1/receipts/tip", {}, async () => {
  throw new Error("dark");
});
assert.equal(darkTip.status, 200);
assert.equal(darkTip.body.ok, false);
assert.equal(darkTip.body.success, false);
assert.equal(darkTip.body.fail_open, false);
assert.equal(darkTip.body.fail_open_append, true);
assert.equal(darkTip.body.code, ACT_RECEIPT_TIP_DARK);
assert.equal(darkTip.body.tip_status, "slot");
assert.equal(darkTip.body.public_chain, LIBRARY_RECEIPTS_PUBLIC);
assert.equal(darkTip.body.hash, null);
assert.equal(darkTip.body.empty_tip_is_not_success, true);

const emptyTip = await dispatchActReceiptHttp("GET", "/v1/receipts/tip", {}, async () => {
  return new Response(JSON.stringify({ ok: true, hash: ZERO_HASH, receipts: [] }), { status: 200 });
});
assert.equal(emptyTip.status, 200);
assert.equal(emptyTip.body.ok, false);
assert.equal(emptyTip.body.success, false);
assert.equal(emptyTip.body.code, ACT_RECEIPT_TIP_EMPTY);
assert.equal(emptyTip.body.tip_status, "slot");
assert.equal(emptyTip.body.hash, null);
assert.equal(emptyTip.body.live_tip, false);
assert.equal(emptyTip.body.fail_open, false);

const engine = await postJson("/v1/fraggate/call", { slug: "peacelock", op: "health" });
assert.equal(engine.status, 200);
const engineBody = await engine.json();
assert.equal(engineBody.ok, true);
assert.equal(engineBody.slug, "peacelock");

const httpCalls = [];
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const href = String(url);
  if (href.includes("azielcorpuslibrary.net/v1/receipts")) {
    httpCalls.push({ url: href, method: init && init.method, headers: init && init.headers, body: init && init.body });
    if (href.includes("/append")) return new Response(JSON.stringify({ ok: true }), { status: 201 });
    return new Response(JSON.stringify({ ok: true, hash: ZERO_HASH }), { status: 200 });
  }
  return origFetch(url, init);
};
try {
  const env = { RECEIPT_APPEND_TOKEN: "test-append-token" };
  const listed = await get("/v1/fraggate/list", env);
  assert.equal(listed.status, 200);
  const called = await postJson("/v1/fraggate/call", { slug: "peacelock", op: "health" }, env);
  assert.equal(called.status, 200);
  const calledBody = await called.json();
  assert.equal(calledBody.ok, true);
  const mcpList = await postJson(
    "/mcp",
    { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    env,
  );
  assert.equal(mcpList.status, 200);
  const catalog = await get("/v1/software", env);
  assert.equal(catalog.status, 200);
  const mesh = await postJson("/v1/mesh/broadcast", { sha256: "aa".repeat(32) }, env);
  assert.ok(mesh.status === 200 || mesh.status === 400);

  const appends = httpCalls.filter((c) => c.url.includes("/append"));
  assert.ok(appends.length >= 3, `expected appends after list/call/mcp, got ${appends.length}`);
  assert.ok(appends.every((c) => c.headers[RECEIPTS_HEADER] === "test-append-token"));
  for (const row of appends) {
    const payload = JSON.parse(row.body);
    assert.equal(payload.spec, RECEIPTS_SPEC);
    assert.match(payload.hash, /^[a-f0-9]{64}$/);
    assert.match(payload.previous_hash, /^[a-f0-9]{64}$/);
    assert.ok(payload.request);
    assert.ok(payload.output);
    assert.ok(payload.event && payload.event.spec === RECEIPTS_SPEC);
    assert.doesNotMatch(JSON.stringify(payload), /test-append-token|user_id|"ip"|geo/i);
  }
} finally {
  globalThis.fetch = origFetch;
}

const software = await (await get("/v1/software")).json();
assert.ok(!software.software.some((s) => s.slug === "act-receipt" || s.slug === "receipts" || s.slug === "actreceipt"));
assert.equal(software.software.length, PRODUCTS.length + NAMED_STUBS.length + WORKER_ONLY_PRODUCTS.length);
assert.equal(software.act_receipt.spec, RECEIPTS_SPEC);
assert.equal(software.act_receipt.software_tab, false);
assert.ok(software.software.every((s) => s.slug !== "act-receipt"));

const catalog = await (await get("/v1/catalog.json")).json();
assert.ok(!catalog.products.some((p) => p.slug === "act-receipt"));
assert.ok(!catalog.extras.some((e) => e.slug === "act-receipt" || e.slug === "receipts"));

const skill = await (await get("/v1/skill")).text();
assert.match(skill, /ACT-RECEIPT-1\.0/);
assert.match(skill, /\/v1\/receipts/);

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /ACT-RECEIPT-1\.0/);

const citeJson = await (await get("/cite.json")).json();
assert.ok(citeJson.designs.papers.some((p) => p.id === "ACT-RECEIPT-1.0" && p.kind === "fabric" && p.software_tab === false));

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /\/v1\/receipts/);
assert.match(sitemap, /ACT-RECEIPT-1\.0\.md/);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/v1/receipts"]);
assert.match(openapi.paths["/v1/receipts"].get.summary, /ACT-RECEIPT-1\.0/);

const runtime = await (await get("/v1/runtime.json")).json();
assert.equal(runtime.fabric.act_receipt, "ACT-RECEIPT-1.0");
assert.equal(runtime.endpoints.receipts, origin + "/v1/receipts");

const mcp = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  }),
  {},
);
const init = await mcp.json();
assert.match(init.result.instructions, /ACT-RECEIPT-1\.0/);
const tools = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  }),
  {},
);
const listed = (await tools.json()).result.tools;
assert.ok(!listed.some((t) => /act.?receipt|receipts_append/i.test(t.name)), "no ACT-RECEIPT MCP product tool");

console.log(`ok act-receipt ${RECEIPTS_SPEC}: fail-open, four fields, corpus /receipts, no software card`);

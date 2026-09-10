/**
 * Repo self-check adversarial harness (not a third-party lab).
 * Covers bypass, replay, concurrency, capability attenuation, SSRF,
 * malformed input, cross-domain isolation, receipt/provenance tamper.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { executeLocal } from "../src/engines/runner.js";
import { sandboxRender } from "../src/engines/azbrowser/engine.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { verifyChainStrict } from "../src/session-core.js";
import { resetLedger } from "../src/fraggate/ledger.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };
resetLedger();

async function post(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify(body),
    }),
    env,
  );
}

async function jsonPost(path, body) {
  const res = await post(path, body);
  const data = await res.json();
  return { status: res.status, data };
}

// --- bypass: /p is proxy not exec; unknown tools refuse; mesh GET never enables ---
const proxy = await jsonPost("/p/decisiongate/check", { statement: "bypass" });
assert.notEqual(proxy.data && proxy.data.code, "FG-OK");
assert.ok(!proxy.data || !proxy.data.ledger, "proxy path is not FragGate exec");
assert.ok(!proxy.data || proxy.data.door !== "fraggate" || proxy.data.proxy_is_not_exec !== false);

const unknownOp = await jsonPost("/v1/fraggate/call", { slug: "decisiongate", op: "invented_fantasy_op" });
assert.equal(unknownOp.data.ok, false);
assert.match(String(unknownOp.data.code || ""), /FG-UNKNOWN-OP|FG-HALLUC|FG-STUB|FG-LOCAL/);
const halluc = await jsonPost("/v1/fraggate/call", { slug: "not-a-real-software", op: "health" });
assert.equal(halluc.data.ok, false);
assert.match(String(halluc.data.code || ""), /FG-HALLUC|FG-UNKNOWN/);

const meshGet = await handler(new Request(origin + "/v1/mesh", { headers: { "user-agent": "Mozilla/5.0" } }), env);
const meshBody = await meshGet.json();
assert.notEqual(meshBody.enabled, true);
assert.notEqual(meshBody.mesh_enabled, true);

const smtp = await jsonPost("/v1/fraggate/call", { slug: "azmail", op: "smtp_send", payload: { to: "a@b.c", text: "no" } });
assert.equal(smtp.data.code, "FG-STUB");

const chrome = await jsonPost("/v1/fraggate/call", { slug: "azbrowser", op: "chromium" });
assert.equal(chrome.data.code, "FG-STUB");

// --- malformed input ---
const noSlug = await jsonPost("/v1/fraggate/call", { op: "health" });
assert.equal(noSlug.data.ok, false);
const badJson = await handler(
  new Request(origin + "/v1/fraggate/call", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: "{not-json",
  }),
  env,
);
assert.ok(badJson.status >= 400);
const huge = await jsonPost("/v1/fraggate/call", {
  slug: "godlock",
  op: "score",
  payload: { text: "x".repeat(200_000) },
});
assert.ok(huge.status === 200 || huge.status >= 400);

const corpusBad = JSON.parse(
  (await executeLocal({ slug: "aziel-corpus", op: "review", payload: {}, ranIn: "aziel-runtime" })).responseText,
);
assert.equal(corpusBad.ok, false);

// --- SSRF / private / onion refuse on sandbox_render ---
for (const url of ["http://127.0.0.1/", "http://169.254.169.254/latest/meta-data", "https://example.onion/", "javascript:alert(1)"]) {
  const out = await sandboxRender({ url }, {});
  assert.equal(out.visited, false, `ssrf ${url} must not visit`);
  assert.notEqual(out.ok, true);
  assert.equal(out.chromium, false);
}

const deferred = await sandboxRender({ url: "https://github.com/AzielEliab/aziel-runtime" }, {});
assert.equal(deferred.deferred, true);
assert.equal(deferred.implemented, false);
assert.equal(deferred.visited, false);
assert.equal(deferred.chromium, false);

// --- capability attenuation ---
const open = await jsonPost("/v1/session/open", {});
assert.equal(open.status, 200);
const sid = open.data.session?.id || open.data.id;
assert.ok(sid, "session id");
const policy = await jsonPost(`/v1/session/${sid}/policy`, { allow_slugs: ["godlock"], allow_ops: ["score"] });
assert.equal(policy.status, 200);
const denied = await jsonPost(`/v1/session/${sid}/exec`, { slug: "azos", op: "status", payload: {} });
assert.equal(denied.status, 403);
const deniedOp = await jsonPost(`/v1/session/${sid}/exec`, { slug: "godlock", op: "submit", payload: { text: "no" } });
assert.equal(deniedOp.status, 403);
const allowed = await jsonPost(`/v1/session/${sid}/exec`, { slug: "godlock", op: "score", payload: { text: "ABAD does not layer on phi." } });
assert.equal(allowed.status, 200);

// --- replay: a prior receipt is not an exec ticket ---
const receipt = allowed.data.receipt;
const replay = await jsonPost("/v1/fraggate/call", { slug: "godlock", op: "score", receipt, payload: { text: "replay" } });
assert.equal(replay.data.ok, true);
assert.ok(replay.data.result, "replay still goes through FragGate; receipt is not a skip ticket");

// --- concurrency ---
const conc = await Promise.all(
  Array.from({ length: 8 }, (_, i) =>
    executeLocal({
      slug: "aziel-corpus",
      op: "score",
      payload: { record: { record_id: "AZDOC-FLORENCE-SAMPLE", title: "t" + i, author: "Aziel Eliab", domain: "library", library: "corpus" } },
      ranIn: "aziel-runtime",
    }),
  ),
);
for (const row of conc) {
  assert.equal(row.status, 200);
  const body = JSON.parse(row.responseText);
  assert.equal(body.court, false);
}

// --- cross-domain isolation ---
const veilInject = await jsonPost("/v1/fraggate/call", { slug: "veillock", op: "inject" });
assert.ok(veilInject.data.code === "FG-STUB" || veilInject.data.code === "FG-LOCAL-ONLY");
const mailExec = await jsonPost("/v1/fraggate/call", { slug: "azmail", op: "exec" });
assert.equal(mailExec.data.ok, false);
const chatBridge = await jsonPost("/v1/fraggate/call", { slug: "azchat", op: "bridge_azmail" });
assert.equal(chatBridge.data.code, "FG-STUB");
const arkWipe = await jsonPost("/v1/fraggate/call", { slug: "ark", op: "wipe" });
assert.equal(arkWipe.data.code, "FG-STUB");

const corpus = JSON.parse(
  (await executeLocal({ slug: "aziel-corpus", op: "review", payload: { record_id: "AZDOC-FLORENCE-SAMPLE" }, ranIn: "aziel-runtime" }))
    .responseText,
);
assert.equal(corpus.live_ingest, false);

// --- receipt / provenance tamper ---
const minted = JSON.parse(
  (
    await executeLocal({
      slug: "forgereceipts",
      op: "receipt",
      payload: { note: "adversarial self-check" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(minted.ok, true);
const good = JSON.parse(
  (
    await executeLocal({
      slug: "forgereceipts",
      op: "verify",
      payload: { receipt: minted.receipt },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(good.match, true);
const tampered = { ...minted.receipt, hash: "0".repeat(64) };
const bad = JSON.parse(
  (
    await executeLocal({
      slug: "forgereceipts",
      op: "verify",
      payload: { receipt: tampered },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(bad.match, false);

const chain = JSON.parse(
  (
    await executeLocal({
      slug: "aziel-corpus",
      op: "document-chain",
      payload: { documents: [{ record_id: "a", title: "one" }, { record_id: "b", title: "two" }] },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(chain.ok, true);
assert.equal(chain.chain[1].prev, chain.chain[0].hash);

const receiptsRes = await handler(new Request(origin + `/v1/session/${sid}/receipts`, { headers: { "user-agent": "Mozilla/5.0" } }), env);
const receipts = await receiptsRes.json();
if (receipts.receipts) {
  const strict = await verifyChainStrict(receipts.receipts);
  assert.equal(strict.ok, true);
}

console.log("ok adversarial self-check: bypass replay concurrency attenuation ssrf malformed isolation tamper");

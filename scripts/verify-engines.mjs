/**
 * True engine runtime: digest stable, receipt chain verifies, proxy_fallback marked,
 * health / skill / runtime.json agree.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_LAYER, RUNTIME_ROLE, RUNTIME_VERSION } from "../src/runtime-api.js";
import { computeDigests } from "./hash-engines.mjs";
import { ENGINE_DIGESTS, embeddedDigest, trueEngineSlugs } from "../src/engines/digest.js";
import { honestyFields } from "../src/engines/registry.js";
import { executeLocal } from "../src/engines/runner.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { verifyChainStrict } from "../src/session-core.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = {
  VIBELOCK: {
    fetch: async () =>
      new Response(JSON.stringify({ ok: true, mocked: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  },
};
env.SESSION = memorySessionNamespace(env);

async function jsonReq(path, method, body) {
  const res = await handler(
    new Request(origin + path, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
  return { status: res.status, data: await res.json() };
}

const computed = await computeDigests();
for (const slug of trueEngineSlugs()) {
  assert.equal(ENGINE_DIGESTS[slug], computed[slug], `${slug} digest matches file bytes`);
  assert.match(ENGINE_DIGESTS[slug], /^[a-f0-9]{64}$/);
}

const first = await executeLocal({ slug: "azclce", op: "score", payload: { r: "login button blue", d: "login form submits", p: "login button submits" }, ranIn: "aziel-runtime" });
const second = await executeLocal({ slug: "azclce", op: "score", payload: { r: "login button blue", d: "login form submits", p: "login button submits" }, ranIn: "aziel-runtime" });
assert.equal(first.mode, "local");
assert.equal(first.true_engine_runtime, true);
assert.equal(first.engine_digest, second.engine_digest);
assert.equal(first.engine_digest, embeddedDigest("azclce"));
assert.equal(first.ran_in, "aziel-runtime");
assert.equal(first.status, 200);
assert.equal(second.status, 200);

const foldA = await executeLocal({ slug: "foldlock", op: "fold-preview", payload: { text: "the cat and the dog" }, ranIn: "aziel-runtime" });
const foldB = await executeLocal({ slug: "foldlock", op: "fold-preview", payload: { text: "the cat and the dog" }, ranIn: "aziel-runtime" });
assert.equal(foldA.engine_digest, foldB.engine_digest);
assert.equal(foldA.engine_digest, embeddedDigest("foldlock"));
assert.equal(foldA.ran_in, "aziel-runtime");
const folded = JSON.parse(foldA.responseText);
assert.equal(folded.zip, false);
assert.ok(folded.b64);

const opened = await jsonReq("/v1/session/open", "POST", {});
const id = opened.data.session.id;
await jsonReq(`/v1/session/${id}/policy`, "POST", { allow_slugs: ["azclce", "foldlock", "vibelock"] });

const exec1 = await jsonReq(`/v1/session/${id}/exec`, "POST", {
  slug: "azclce",
  op: "score",
  payload: { r: "login button blue", d: "login form submits", p: "login button submits" },
});
assert.equal(exec1.status, 200);
assert.equal(exec1.data.exec.mode, "local");
assert.equal(exec1.data.exec.true_engine_runtime, true);
assert.equal(exec1.data.exec.engine_digest, embeddedDigest("azclce"));
assert.equal(exec1.data.exec.ran_in, "aziel-runtime");
assert.equal(exec1.data.receipt.payload.result.engine_digest, embeddedDigest("azclce"));
assert.equal(exec1.data.receipt.payload.result.ran_in, "aziel-runtime");
assert.equal(exec1.data.receipt.payload.result.mode, "local");
assert.equal(exec1.data.receipt.payload.result.true_engine_runtime, true);

const exec2 = await jsonReq(`/v1/session/${id}/exec`, "POST", {
  slug: "azclce",
  op: "score",
  payload: { r: "login button blue", d: "login form submits", p: "login button submits" },
});
assert.equal(exec2.data.exec.engine_digest, exec1.data.exec.engine_digest);

const foldExec = await jsonReq(`/v1/session/${id}/exec`, "POST", {
  slug: "foldlock",
  op: "fold-preview",
  payload: { text: "the cat and the dog sat on the mat and the man" },
});
assert.equal(foldExec.status, 200);
assert.equal(foldExec.data.exec.ran_in, "aziel-runtime");
assert.equal(foldExec.data.exec.engine_digest, embeddedDigest("foldlock"));

const proxy = await jsonReq(`/v1/session/${id}/exec`, "POST", {
  slug: "vibelock",
  op: "analyze",
  payload: { note: "proxy fallback fixture" },
});
assert.equal(proxy.status, 200);
assert.equal(proxy.data.exec.mode, "proxy_fallback");
assert.equal(proxy.data.exec.true_engine_runtime, false);
assert.equal(proxy.data.exec.engine_digest, null);
assert.equal(proxy.data.exec.ran_in, null);
assert.ok(proxy.data.receipt.payload.result.mode === "proxy_fallback");

const receipts = await jsonReq(`/v1/session/${id}/receipts`, "GET");
assert.equal(receipts.data.verified.ok, true);
const strict = await verifyChainStrict(receipts.data.receipts);
assert.equal(strict.ok, true);

const health = await jsonReq("/v1/health", "GET");
const manifest = await jsonReq("/v1/runtime.json", "GET");
const catalog = await jsonReq("/v1/catalog.json", "GET");
assert.equal(health.data.version, RUNTIME_VERSION);
assert.equal(manifest.data.version, RUNTIME_VERSION);
assert.equal(catalog.data.version, RUNTIME_VERSION);
assert.equal(health.data.role, RUNTIME_ROLE);
assert.equal(manifest.data.role, RUNTIME_ROLE);
assert.equal(catalog.data.role, RUNTIME_ROLE);
assert.equal(health.data.layer, RUNTIME_LAYER);
assert.equal(manifest.data.layer, RUNTIME_LAYER);
assert.deepEqual(health.data.true_engine_slugs, trueEngineSlugs());
assert.deepEqual(health.data.engine_slugs, trueEngineSlugs());
assert.deepEqual(manifest.data.true_engine_slugs, trueEngineSlugs());
assert.deepEqual(manifest.data.engine_slugs, trueEngineSlugs());
assert.equal(health.data.true_engine_runtime, true);
assert.equal(health.data.engines.foldlock.true_engine_runtime, true);
assert.equal(health.data.engines.vibelock.true_engine_runtime, false);
assert.equal(health.data.engines.vibelock.mode, "proxy_fallback");
assert.equal(health.data.proxy_is_not_exec, true);
assert.equal(manifest.data.hosted_azai_is_not_the_blend, true);

const skill = await (await handler(new Request(origin + "/v1/skill"), env)).text();
assert.match(skill, /1\.3\.0/);
assert.match(skill, /1\.2\.0 = session-runtime/);
assert.match(skill, /engine_digest/);
assert.match(skill, /true-engine slugs/i);
assert.equal(honestyFields(PRODUCTS.map((p) => p.slug)).true_engine_slugs.join(","), trueEngineSlugs().join(","));

const gate = await executeLocal({
  slug: "decisiongate",
  op: "check",
  payload: {
    statement: "Release the catalog Worker this week after the OpenAPI review.",
    evidence: ["OpenAPI 3.1 combined spec."],
    impact_pos: ["One URL for GPT Actions."],
    impact_neg: ["A vague draft takes longer."],
    values: ["Clarity without force"],
    accountable: "Aziel Eliab",
  },
  ranIn: "aziel-runtime",
});
assert.equal(gate.true_engine_runtime, true);
assert.equal(gate.engine_digest, embeddedDigest("decisiongate"));
const gateBody = JSON.parse(gate.responseText);
assert.ok(Array.isArray(gateBody.lineage));

console.log(
  `ok engines ${RUNTIME_VERSION}: ${trueEngineSlugs().join(",")} digests stable, chain verifies, proxy_fallback marked, health/skill/runtime agree`,
);

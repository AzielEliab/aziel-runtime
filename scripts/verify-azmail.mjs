/**
 * AZMail APP 1.0: FragGate-live engine, mesh off-switch, keyword alerts, no PII.
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
  IDENTITY_KEYS,
  MESH_DEFAULT,
  MESH_DEFAULT_ENABLED,
  SPEC,
  VERSION,
  airlockClassify,
  airlockScrub,
  airlockTrustScore,
  hasIdentityField,
  meshDisable,
  meshEnable,
  meshPoll,
  meshPost,
  resetAzmailStore,
  keywordAlertCheck,
  keywordAlertList,
  keywordAlertSet,
} from "../src/engines/azmail/engine.js";

resetLedger();
resetAzmailStore();

const product = PRODUCTS.find((p) => p.slug === "azmail");
assert.ok(product, "azmail is a catalog product");
assert.equal(product.name, "AZMail");
assert.equal(product.worker, "azmail-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/azmail");
assert.equal(product.version, VERSION);
assert.match(product.oneLine, /APP 1\.0/);
assert.match(product.banner, /FragGate/);
assert.equal(product.doi, null);
assert.equal(MESH_DEFAULT, "off");
assert.equal(MESH_DEFAULT_ENABLED, false);
assert.equal(SPEC, "APP-1.0");

const catalogOps = new Set(product.ops.map((o) => o.op));
const live = LIVE_OPS.azmail;
const expectedLive = [
  "airlock_classify",
  "scrub",
  "trust_score",
  "mesh_post",
  "mesh_poll",
  "mesh_listen",
  "mesh_enable",
  "mesh_disable",
  "keyword_alert_set",
  "keyword_alert_list",
  "keyword_alert_check",
  "mailbox_open",
  "notice_post",
  "mail_post",
  "inbox_pull",
  "ack",
  "verify_receipt",
  "import_export",
  "transport_status",
  "health",
  "skill",
];
for (const op of expectedLive) {
  assert.ok(live.includes(op), `LIVE_OPS.azmail has ${op}`);
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}
for (const op of STUB_OPS.azmail) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.azmail.status, "live");
assert.ok(registry.bySlug.azmail.status !== "local_only");
for (const op of expectedLive) {
  assert.equal(classifyCall(registry.bySlug.azmail, op).kind, "live", `${op} is live`);
}
assert.equal(classifyCall(registry.bySlug.azmail, "smtp").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azmail, "smtp_send").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azmail, "send").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azmail, "mail").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azmail, "deliver").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azmail, "identify").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azmail, "deanonymize").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azmail, "harvest").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azmail, "credential_capture").kind, "stub");

const parsedSlash = parseTarget({ name: "azmail/mesh_post" }, registry);
assert.equal(parsedSlash.slug, "azmail");
assert.equal(parsedSlash.op, "mesh_post");
assert.equal(classifyCall(parsedSlash.entry, parsedSlash.op).kind, "live");
const parsedFlat = parseTarget({ name: "azmail_scrub" }, registry);
assert.equal(parsedFlat.slug, "azmail");
assert.equal(parsedFlat.op, "scrub");
assert.equal(classifyCall(parsedFlat.entry, parsedFlat.op).kind, "live");

const classified = airlockClassify({ text: "Verify your account immediately and send your password to http://bit.ly/x" });
assert.equal(classified.ok, true);
assert.equal(classified.classification, "phishing");
assert.equal(classified.advisory, true);
assert.equal(classified.mta, false);
assert.equal(classified.door, "fraggate");

const clean = airlockClassify({ text: "hello from the anonymous ring" });
assert.equal(clean.classification, "clean");

const scrubbed = airlockScrub({ text: "reach me at alice@example.com password=hunter2token" });
assert.ok(scrubbed.redacted);
assert.match(scrubbed.text, /\[REDACTED_EMAIL\]/);
assert.doesNotMatch(scrubbed.text, /alice@example\.com/);

const scored = airlockTrustScore({ text: "Verify your account immediately and send your password" });
assert.ok(scored.trust_score < 0.4);
assert.ok(scored.trust_score <= scored.cap);
assert.equal(scored.cap, 0.75);

const offPost = await meshPost({ text: "hello", from: "alice@example.com", user: "alice" });
assert.equal(offPost.ok, false);
assert.equal(offPost.code, "AZM-MESH-OFF");
assert.equal(offPost.mesh_enabled, false);
assert.ok(offPost.dropped_identity_fields.includes("from"));
assert.ok(offPost.dropped_identity_fields.includes("user"));

const setAlert = await keywordAlertSet({
  id: "chaos",
  keywords: ["urgent", "password"],
  email: "alerts@example.com",
  from: "ops",
});
assert.equal(setAlert.ok, true);
assert.equal(setAlert.destination, null);
assert.deepEqual(setAlert.alert.keywords, ["urgent", "password"]);
assert.ok(!("email" in setAlert.alert));
assert.ok(setAlert.dropped_identity_fields.includes("email"));

const listed = await keywordAlertList({});
assert.equal(listed.ok, true);
assert.equal(listed.destination, null);
assert.ok(listed.alerts.some((a) => a.id === "chaos"));

const checked = await keywordAlertCheck({ text: "this is urgent news" });
assert.equal(checked.hit, true);
assert.ok(checked.hits.includes("urgent"));

const enabled = await meshEnable({});
assert.equal(enabled.ok, true, JSON.stringify(enabled));
assert.equal(enabled.mesh_enabled, true);
assert.equal(enabled.mesh_default, "off");

const identPost = await meshPost({
  text: "hello from the anonymous ring, write alice@example.com",
  from: "alice@example.com",
  user: "alice",
  username: "alice",
  author: "Alice",
  email: "alice@example.com",
  ip: "1.2.3.4",
  session_id: "sess_abc",
});
assert.equal(identPost.ok, true, JSON.stringify(identPost));
assert.equal(identPost.identity_stored, false);
assert.equal(identPost.smtp, false);
assert.equal(hasIdentityField(identPost.record), false);
for (const key of IDENTITY_KEYS) {
  assert.ok(!(key in identPost.record), `mesh record must not store ${key}`);
}
assert.match(identPost.record.text, /\[REDACTED_EMAIL\]/);
assert.doesNotMatch(identPost.record.text, /alice@example\.com/);

const keywordPost = await meshPost({ text: "this password reset is urgent" });
assert.equal(keywordPost.ok, true);
assert.ok(keywordPost.record.alerts_hit.includes("password"));
assert.ok(keywordPost.record.alerts_hit.includes("urgent"));

const polled = await meshPoll({ limit: 8 });
assert.equal(polled.ok, true);
assert.ok(polled.count >= 2);
for (const row of polled.records) {
  assert.equal(hasIdentityField(row), false);
}

const listened = await meshPoll({}, undefined, "mesh_listen");
assert.equal(listened.op, "mesh_listen");

const rate = await meshEnable({});
assert.equal(rate.ok, false);
assert.equal(rate.code, "AZM-ENABLE-RATE");

const disabled = await meshDisable({});
assert.equal(disabled.ok, true);
assert.equal(disabled.mesh_enabled, false);

const afterOff = await meshPost({ text: "still trying" });
assert.equal(afterOff.ok, false);
assert.equal(afterOff.code, "AZM-MESH-OFF");

resetAzmailStore();
const kv = memoryUsesKv();
const envKv = { AZMAIL_MESH: kv };
const kvEnable = await meshEnable({}, envKv);
assert.equal(kvEnable.store, "kv");
const kvPost = await meshPost({ text: "kv ring hello" }, envKv);
assert.equal(kvPost.ok, true);
assert.equal(kvPost.store, "kv");
resetAzmailStore();
const kvPoll = await meshPoll({}, envKv);
assert.equal(kvPoll.store, "kv");
assert.ok(kvPoll.records.some((r) => r.text === "kv ring hello"));

resetAzmailStore();
const memPostBlocked = await meshPost({ text: "memory default off" }, {});
assert.equal(memPostBlocked.code, "AZM-MESH-OFF");
assert.match(memPostBlocked.store_note, /Isolate memory|unbound/i);

const local = await executeLocal({
  slug: "azmail",
  op: "airlock_classify",
  payload: { text: "hello from the anonymous ring" },
  ranIn: "aziel-runtime",
});
assert.equal(local.mode, "local");
assert.equal(local.true_engine_runtime, true);
assert.equal(local.engine_digest, embeddedDigest("azmail"));
assert.match(local.engine_digest, /^[a-f0-9]{64}$/);
const localBody = JSON.parse(local.responseText);
assert.equal(localBody.ok, true);
assert.equal(localBody.spec, "APP-1.0");

const localStub = await executeLocal({ slug: "azmail", op: "smtp", payload: {}, ranIn: "aziel-runtime" });
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

const doorClassify = await post("/v1/fraggate/call", {
  slug: "azmail",
  op: "airlock_classify",
  payload: { text: "hello from the anonymous ring" },
});
assert.equal(doorClassify.ok, true);
assert.equal(doorClassify.code, "FG-OK");
assert.equal(doorClassify.slug, "azmail");
assert.ok(doorClassify.ledger_tip);
assert.equal(doorClassify.result.classification, "clean");

const doorOff = await post("/v1/fraggate/call", {
  slug: "azmail",
  op: "mesh_post",
  payload: { text: "should refuse", from: "bob@example.com" },
});
assert.equal(doorOff.ok, true);
assert.equal(doorOff.code, "FG-OK");
assert.equal(doorOff.result.ok, false);
assert.equal(doorOff.result.code, "AZM-MESH-OFF");

const doorEnable = await post("/v1/fraggate/call", { slug: "azmail", op: "mesh_enable", payload: {} });
assert.equal(doorEnable.ok, true);
assert.equal(doorEnable.result.mesh_enabled, true);

const doorPost = await post("/v1/fraggate/call", {
  name: "AZMail",
  op: "mesh_post",
  payload: { text: "frag gate hello", user: "should-drop", email: "x@y.z" },
});
assert.equal(doorPost.ok, true, JSON.stringify(doorPost));
assert.equal(doorPost.result.ok, true);
assert.equal(hasIdentityField(doorPost.result.record), false);

const doorFlat = await post("/v1/fraggate/call", { name: "azmail/mesh_poll", payload: { limit: 4 } });
assert.equal(doorFlat.ok, true);
assert.equal(doorFlat.op, "mesh_poll");
assert.ok(doorFlat.result.records.length >= 1);
const doorLeftover = await post("/v1/fraggate/call", { name: "azmail_scrub", payload: { text: "x@y.z" } });
assert.equal(doorLeftover.ok, true);
assert.equal(doorLeftover.op, "scrub");
assert.equal(doorLeftover.slug, "azmail");

const doorStub = await post("/v1/fraggate/call", { slug: "azmail", op: "smtp" });
assert.equal(doorStub.ok, false);
assert.equal(doorStub.code, "FG-STUB");

const doorDeanonymize = await post("/v1/fraggate/call", { slug: "azmail", op: "deanonymize" });
assert.equal(doorDeanonymize.ok, false);
assert.equal(doorDeanonymize.code, "FG-STUB");

const mcp = await post("/mcp", {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name: "fraggate_call", arguments: { slug: "azmail", op: "trust_score", payload: { text: "hello" } } },
});
assert.equal(mcp.result.structuredContent.code, "FG-OK");
assert.equal(mcp.result.structuredContent.result.slug, "azmail");

const health = await handler(new Request(origin + "/v1/health"), env);
const healthBody = await health.json();
assert.ok(healthBody.true_engine_slugs.includes("azmail"));
assert.ok(healthBody.engine_slugs.includes("azmail"));
assert.equal(healthBody.engines.azmail.true_engine_runtime, true);
assert.equal(healthBody.engines.azmail.mode, "local");
assert.equal(healthBody.engines.azmail.engine_digest, embeddedDigest("azmail"));
assert.ok(!healthBody.proxy_fallback_ops.azmail);

const llms = await (await handler(new Request(origin + "/llms.txt"), env)).text();
assert.match(llms, /AZMail/);
assert.match(llms, /APP 1\.0/);
assert.match(llms, /FragGate/);

const openapi = await (await handler(new Request(origin + "/openapi.json"), env)).json();
assert.match(openapi.info.description, /AZMail/);
assert.match(openapi.info.description, /fraggate\/call/);
assert.match(openapi.info.description, /not a full internet MTA/i);

const uses = await (await handler(new Request(origin + "/v1/uses"), env)).json();
assert.equal(uses.ok, true);
assert.equal(uses.uses_kv, true);
assert.ok(uses.uses >= 1);
assert.doesNotMatch(JSON.stringify(uses), /Authorization|alice@|password=/i);

const skill = await (await handler(new Request(origin + "/v1/skill"), env)).text();
assert.match(skill, /AZMail \(APP 1\.0\)/);
assert.match(skill, /slug: "azmail"/);

console.log(
  `ok azmail ${product.version}: LIVE_OPS=${live.join(",")} stub=${STUB_OPS.azmail.join(",")} mesh_default=${MESH_DEFAULT}`,
);

/**
 * AZMail APP 1.0: FragGate-live engine, mesh off-switch, keyword alerts, no PII.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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
  azmailHealth,
  azmailSkill,
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
import {
  AIRGAP_BOUNDARY,
  fixtureLabeledScanner,
  generateUserKeyPair,
  listenSmtpSink,
  probeScannerSync,
} from "../src/engines/azmail/guard.js";

resetLedger();
resetAzmailStore();

const product = PRODUCTS.find((p) => p.slug === "azmail");
assert.ok(product, "azmail is a catalog product");
assert.equal(product.name, "AZMail");
assert.equal(product.worker, "azmail-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/azmail");
assert.equal(product.version, VERSION);
assert.match(product.oneLine, /Classify mail text|local mailbox/i);
assert.match(product.oneLine, /LIVE-when-scanner-present/);
assert.match(product.oneLine, /not end-to-end/i);
assert.doesNotMatch(product.oneLine, /THIS IS:|THIS IS NOT:/i);
assert.doesNotMatch(product.oneLine, /Field 1\.0|Proton clone LIVE/i);
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
  "smtp_send",
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
assert.equal(classifyCall(registry.bySlug.azmail, "smtp_send").kind, "live");
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
  params: { name: "fraggate_call", arguments: { slug: "azmail", op: "trust_score", payload: { text: "hello" }, confirm: true } },
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
assert.match(skill, /LIVE-when-scanner-present/);
assert.match(skill, /encrypted-to-user/);
assert.match(skill, /not end-to-end/i);

const skillOp = azmailSkill();
assert.match(skillOp.markdown, /LIVE-when-scanner-present/);
assert.match(skillOp.markdown, /Airgap: present/);
assert.match(skillOp.markdown, /encrypted-to-user/);
assert.match(skillOp.markdown, /not end-to-end/i);
assert.equal(skillOp.field_1_0, false);
assert.equal(skillOp.proton_clone_live, false);
assert.equal(skillOp.external_smtp_e2e, false);
assert.equal(AIRGAP_BOUNDARY.present, true);
assert.equal(AIRGAP_BOUNDARY.exec, false);

const healthOp = azmailHealth();
assert.equal(healthOp.scan, "LIVE-when-scanner-present");
assert.equal(healthOp.airgap, "present");
assert.equal(healthOp.mailbox_at_rest, "encrypted-to-user");
assert.equal(healthOp.external_smtp_e2e, false);
assert.equal(healthOp.gmail_e2e, false);
assert.equal(healthOp.field_1_0, false);
assert.equal(healthOp.proton_clone_live, false);
assert.equal(healthOp.transport.smtp_send, "LIVE-when-transport-present");
assert.equal(healthOp.transport.public_mta, false);
assert.equal(healthOp.transport.local_smtp, "LIVE-when-transport-present");
assert.equal(healthOp.transport.scan_live, probeScannerSync().live === true);

resetAzmailStore();
const fixture = fixtureLabeledScanner();
const sealEnv = { AZMAIL_SCANNER: fixture };
const absentEnv = { AZMAIL_FORCE_SCANNER_ABSENT: true };

async function localMail(op, payload, mailEnv = sealEnv) {
  return JSON.parse(
    (await executeLocal({ slug: "azmail", op, payload, env: mailEnv, ranIn: "aziel-runtime" })).responseText,
  );
}

const alice = await generateUserKeyPair();
const bob = await generateUserKeyPair();
assert.notEqual(alice.public_jwk.x, bob.public_jwk.x);
assert.notEqual(alice.private_jwk.d, bob.private_jwk.d);

const openedAlice = await localMail("mailbox_open", {
  mailbox_id: "alice",
  address: "alice@azmail.local",
  user_public_key: { ...alice.public_jwk, d: alice.private_jwk.d },
});
assert.equal(openedAlice.ok, true, JSON.stringify(openedAlice));
assert.equal(openedAlice.private_key_stored, false);
assert.equal(openedAlice.dropped_private_key, true);
assert.equal(openedAlice.public_key_registered, true);
const openedBob = await localMail("mailbox_open", {
  mailbox_id: "bob",
  address: "bob@azmail.local",
  user_public_key: bob.public_jwk,
});
assert.equal(openedBob.ok, true, JSON.stringify(openedBob));

const absent = await localMail(
  "mail_post",
  { from: "alice", to: "bob", text: "should not pass", attachments: [{ filename: "note.pdf", media_type: "application/pdf", content_base64: Buffer.from("%PDF").toString("base64") }] },
  absentEnv,
);
assert.equal(absent.ok, false);
assert.equal(absent.code, "AZM-SCAN-ABSENT");
assert.notEqual(absent.scan && absent.scan.verdict, "clean");
assert.equal(absent.scan.clean, false);
assert.equal(absent.sent, false);

const unlabeled = await localMail(
  "mail_post",
  { from: "alice", to: "bob", text: "no" },
  { AZMAIL_SCANNER: { kind: "fixture", scan: () => ({ ok: true, verdict: "clean" }) } },
);
assert.equal(unlabeled.code, "AZM-SCAN-ABSENT");
assert.equal(unlabeled.scan.clean, false);
assert.notEqual(unlabeled.scan.verdict, "clean");

const kinds = {
  link: { links: ["https://example.com/watch"] },
  video: { attachments: [{ filename: "clip.mp4", media_type: "video/mp4", content_base64: Buffer.from("AZMAIL-CLEAN-VIDEO-BYTES").toString("base64") }] },
  doc: { attachments: [{ filename: "note.pdf", media_type: "application/pdf", content_base64: Buffer.from("AZMAIL-CLEAN-DOC-BYTES").toString("base64") }] },
  image: { attachments: [{ filename: "photo.png", media_type: "image/png", content_base64: Buffer.from("AZMAIL-CLEAN-IMAGE-BYTES").toString("base64") }] },
  zip: { attachments: [{ filename: "pack.zip", media_type: "application/zip", content_base64: Buffer.from("AZMAIL-CLEAN-ZIP-BYTES").toString("base64") }] },
  file: { attachments: [{ filename: "notes.bin", media_type: "application/octet-stream", content_base64: Buffer.from("AZMAIL-CLEAN-FILE-BYTES").toString("base64") }] },
};
const carried = await localMail("mail_post", {
  from: "alice",
  to: "bob@azmail.local",
  text: "sealed body",
  ...{
    links: kinds.link.links,
    attachments: [kinds.video, kinds.doc, kinds.image, kinds.zip, kinds.file].flatMap((row) => row.attachments),
  },
});
assert.equal(carried.ok, true, JSON.stringify(carried));
assert.equal(carried.e2e, true);
assert.equal(carried.end_to_end, true);
assert.equal(carried.azmail_to_azmail, true);
assert.equal(carried.external_smtp_e2e, false);
assert.equal(carried.gmail_e2e, false);
assert.equal(carried.exec, false);
assert.equal(carried.item.plaintext_crossed, false);
assert.equal(carried.item.airgap, "crossed");
assert.equal(carried.item.text, undefined);
assert.equal(carried.scan.fixture_labeled, true);
assert.equal(carried.scan.live, false);
assert.equal(carried.scan.scanner, "fixture-labeled");
assert.equal(carried.scan.verdict, "clean");
assert.deepEqual(
  carried.item.carried.map((part) => part.kind).sort(),
  ["doc", "file", "image", "link", "video", "zip"],
);
const stored = JSON.stringify(carried.item);
assert.equal(stored.includes("AZMAIL-CLEAN-VIDEO-BYTES"), false);
assert.equal(stored.includes("sealed body"), false);
assert.equal(stored.includes(alice.private_jwk.d), false);

const bobInbox = await localMail("inbox_pull", { mailbox_id: "bob", user_private_key: bob.private_jwk });
const openedRow = bobInbox.opened.find((row) => row.body === "sealed body");
assert.ok(openedRow, JSON.stringify(bobInbox.opened));
assert.equal(openedRow.opened, true);
for (const kind of ["link", "video", "doc", "image", "zip", "file"]) {
  assert.ok(openedRow.parts.some((part) => part.kind === kind), kind);
}
const video = openedRow.parts.find((part) => part.kind === "video");
assert.equal(Buffer.from(video.bytes_b64, "base64").toString("utf8"), "AZMAIL-CLEAN-VIDEO-BYTES");
const wrong = await localMail("inbox_pull", { mailbox_id: "bob", user_private_key: alice.private_jwk });
assert.ok(wrong.opened.some((row) => row.code === "AZM-SEAL-CLOSED"));
const exported = await localMail("import_export", { mailbox_id: "bob", mode: "export" });
assert.equal(JSON.stringify(exported).includes(bob.private_jwk.d), false);
assert.equal(JSON.stringify(exported).includes("AZMAIL-CLEAN-ZIP-BYTES"), false);
assert.equal(exported.items.every((item) => item.exec === false && item.plaintext_crossed === false), true);

const infected = await localMail("mail_post", {
  from: "alice",
  to: "bob",
  text: "clean looking",
  attachments: [{ filename: "bad.zip", media_type: "application/zip", content_base64: Buffer.from("AZMAIL-FIXTURE-INFECTED").toString("base64") }],
});
assert.equal(infected.ok, false);
assert.equal(infected.code, "AZM-SCAN-INFECTED");
assert.equal(infected.sent, false);
assert.equal(infected.crossed, false);
const afterInfected = await localMail("inbox_pull", { mailbox_id: "bob" });
assert.equal(afterInfected.items.some((item) => JSON.stringify(item).includes("AZMAIL-FIXTURE-INFECTED")), false);

const noexec = await localMail("mail_post", {
  from: "alice",
  to: "bob",
  text: "run",
  exec: true,
  attachments: [{ filename: "clip.mp4", media_type: "video/mp4", content_base64: Buffer.from("video").toString("base64") }],
});
assert.equal(noexec.code, "AZM-ATTACH-NOEXEC");
const jsLink = await localMail("mail_post", { from: "alice", to: "bob", text: "x", links: ["javascript:alert(1)"] });
assert.equal(jsLink.code, "AZM-ATTACH-NOEXEC");

const calls = [];
const transport = {
  present: true,
  tls: true,
  async send(message) {
    calls.push(message);
    return { accepted: true, tls: true, e2e: true };
  },
};
const smtpEnv = { AZMAIL_SCANNER: fixture, AZMAIL_SMTP: transport };
for (const address of ["person@gmail.com", "person@live.com", "person@yahoo.com", "person@example.org"]) {
  const external = await localMail(
    "mail_post",
    {
      from: "alice@azmail.local",
      to: address,
      subject: "ordinary",
      text: `wire ${address}`,
      links: ["https://example.com/file"],
      attachments: [
        { filename: "clip.mp4", media_type: "video/mp4", content_base64: Buffer.from("AZMAIL-CLEAN-VIDEO-BYTES").toString("base64") },
        { filename: "pack.zip", media_type: "application/zip", content_base64: Buffer.from("AZMAIL-CLEAN-ZIP-BYTES").toString("base64") },
        { filename: "photo.png", media_type: "image/png", content_base64: Buffer.from("AZMAIL-CLEAN-IMAGE-BYTES").toString("base64") },
        { filename: "note.pdf", media_type: "application/pdf", content_base64: Buffer.from("AZMAIL-CLEAN-DOC-BYTES").toString("base64") },
      ],
    },
    smtpEnv,
  );
  assert.equal(external.ok, true, JSON.stringify(external));
  assert.equal(external.e2e, false, address);
  assert.equal(external.end_to_end, false, address);
  assert.equal(external.external_smtp_e2e, false, address);
  assert.equal(external.gmail_e2e, false, address);
  assert.equal(external.yahoo_e2e, false, address);
  assert.equal(external.live_e2e, false, address);
  assert.equal(external.wire, "normal-mime-opportunistic-tls", address);
  assert.match(external.note, /not end-to-end/i);
  assert.equal(external.azmail_to_azmail, false);
}
assert.equal(calls.length, 4);
for (const message of calls) {
  assert.match(message.mime, /X-AZMail-E2E: false/);
  assert.doesNotMatch(message.mime, /X-AZMail-E2E: true/);
  assert.match(message.mime, /not end-to-end/i);
  assert.ok(message.mime.includes(Buffer.from("AZMAIL-CLEAN-VIDEO-BYTES").toString("base64")));
  assert.ok(message.mime.includes(Buffer.from("AZMAIL-CLEAN-ZIP-BYTES").toString("base64")));
  assert.match(message.mime, /https:\/\/example\.com\/file/);
}
const beforeOutbound = calls.length;
const infectedOut = await localMail(
  "mail_post",
  {
    from: "alice@azmail.local",
    to: "person@gmail.com",
    text: "no",
    attachments: [{ filename: "bad.pdf", media_type: "application/pdf", content_base64: Buffer.from("AZMAIL-FIXTURE-INFECTED").toString("base64") }],
  },
  smtpEnv,
);
assert.equal(infectedOut.code, "AZM-SCAN-INFECTED");
assert.equal(calls.length, beforeOutbound);

const missingTransport = await localMail("mail_post", {
  from: "alice@azmail.local",
  to: "person@gmail.com",
  text: "no transport",
});
assert.equal(missingTransport.code, "AZM-SMTP-ABSENT");
assert.equal(missingTransport.e2e, false);
assert.equal(missingTransport.sent, false);

const certDir = mkdtempSync(join(tmpdir(), "azmail-tls-"));
const keyPath = join(certDir, "key.pem");
const certPath = join(certDir, "cert.pem");
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-keyout", keyPath, "-out", certPath, "-days", "1", "-nodes", "-subj", "/CN=localhost"], { stdio: "ignore" });
const sink = await listenSmtpSink({ cert: readFileSync(certPath), key: readFileSync(keyPath), implicitTls: true });
const tlsMail = await localMail(
  "mail_post",
  {
    from: "alice@azmail.local",
    to: "person@outlook.com",
    text: "tls-body",
    attachments: [{ filename: "photo.png", media_type: "image/png", content_base64: Buffer.from("AZMAIL-CLEAN-IMAGE-BYTES").toString("base64") }],
  },
  {
    AZMAIL_SCANNER: fixture,
    AZMAIL_SMTP_HOST: sink.host,
    AZMAIL_SMTP_PORT: sink.port,
    AZMAIL_SMTP_IMPLICIT_TLS: true,
    AZMAIL_SMTP_INSECURE: true,
  },
);
assert.equal(tlsMail.ok, true, JSON.stringify(tlsMail));
assert.equal(tlsMail.tls, true);
assert.equal(tlsMail.e2e, false);
assert.equal(tlsMail.external_smtp_e2e, false);
assert.match(sink.messages[0], /tls-body/);
assert.match(sink.messages[0], /X-AZMail-E2E: false/);
assert.ok(sink.messages[0].includes(Buffer.from("AZMAIL-CLEAN-IMAGE-BYTES").toString("base64")));
await sink.close();

const clear = await listenSmtpSink();
const clearRefuse = await localMail(
  "mail_post",
  { from: "alice@azmail.local", to: "person@yahoo.com", text: "clear" },
  { AZMAIL_SCANNER: fixture, AZMAIL_SMTP_HOST: clear.host, AZMAIL_SMTP_PORT: clear.port },
);
assert.equal(clearRefuse.code, "AZM-SMTP-TLS-ABSENT");
assert.equal(clearRefuse.sent, false);
assert.equal(clearRefuse.e2e, false);
assert.equal(clear.flags.data, 0);
await clear.close();

if (probeScannerSync().live) {
  const liveClean = await localMail("mail_post", { from: "alice", to: "bob", text: "live clean body" }, {});
  assert.equal(liveClean.ok, true, JSON.stringify(liveClean));
  assert.equal(liveClean.scan.live, true);
  assert.equal(liveClean.scan.scanner, "clamav");
  const eicar = ["X5O!P%@AP[4\\PZX54(P^)7CC)7}$", "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join("");
  const liveBad = await localMail(
    "mail_post",
    { from: "alice", to: "bob", text: "x", attachments: [{ filename: "eicar.txt", media_type: "text/plain", content_base64: Buffer.from(eicar).toString("base64") }] },
    {},
  );
  assert.equal(liveBad.code, "AZM-SCAN-INFECTED");
} else {
  const realAbsent = await localMail("mail_post", { from: "alice", to: "bob", text: "no scanner" }, {});
  assert.equal(realAbsent.code, "AZM-SCAN-ABSENT");
  assert.equal(realAbsent.scan.clean, false);
  assert.equal(realAbsent.scan.live, false);
}

const localPath = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/azmail-local.mjs"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  child.on("error", reject);
  child.on("close", (code) => resolve({ code, stdout, stderr }));
});
assert.equal(localPath.code, 0, localPath.stderr || localPath.stdout);
const proved = JSON.parse(localPath.stdout);
assert.equal(proved.ok, true);
assert.equal(proved.scan_absent, "AZM-SCAN-ABSENT");
assert.equal(proved.infected, "AZM-SCAN-INFECTED");
assert.equal(proved.e2e, true);
assert.equal(proved.external_smtp_e2e, false);
assert.equal(proved.field_1_0, false);
assert.deepEqual(proved.kinds.sort(), ["doc", "file", "image", "link", "video", "zip"]);

console.log(
  `ok azmail ${product.version}: LIVE_OPS=${live.join(",")} stub=${STUB_OPS.azmail.join(",")} mesh_default=${MESH_DEFAULT}`,
);

/**
 * GATE F and GATE G — metadata inventory and claim limits.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { PRODUCTS } from "../src/index.js";
import { softwareCatalog } from "../src/software-catalog.js";
import {
  CLAIM_LIMITS,
  CLAIM_PRIVACY_PRESERVING,
  CLAIM_SURVIVABLE,
  CLAIM_TAMPER_EVIDENT,
  CLAIM_ZERO_TRUST,
  OBSERVER_LEAKAGE,
} from "../src/security/claims.js";
import { minimumProvenance } from "../src/checkpoints/checkpoint.js";
import { ENVELOPE_METADATA, openEnvelope, sealEnvelope } from "../src/transport/envelope-v2.js";
import { createRelay, relayAccept, relayLog } from "../src/transport/relay.js";
import { negotiateBearer } from "../src/transport/routing.js";
import { createReplayCache } from "../src/transport/replay-cache.js";
import { sweepReplay } from "../src/transport/replay-cache.js";
import { rememberReplay } from "../src/transport/replay-cache.js";
import { pair } from "./azp-fixture.mjs";

const secret = "AZP-SECRET-privacy-token";
const { aliceKs, bobKs, alice, bob, now } = await pair();
const sealed = await sealEnvelope({
  keystore: aliceKs,
  session: alice.session,
  recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
  payload: secret,
  now,
  ttlMs: 5_000,
});
assert.equal(sealed.ok, true, sealed.message);
const relay = createRelay({ id: "privacy" });
assert.equal(relayAccept(relay, sealed.envelope, now).ok, true);
const logText = JSON.stringify(relayLog(relay));
assert.equal(logText.includes(secret), false);
assert.equal(logText.includes("private"), false);
const receipt = await minimumProvenance({ payload: secret, policy: "admit", session_id: bob.session.session_id });
assert.equal(JSON.stringify(receipt).includes(secret), false);
assert.equal(receipt.payload_sha256.length, 64);

const opened = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now,
});
assert.equal(opened.payload, secret);

const routingNames = new Set(ENVELOPE_METADATA.map((row) => row.field));
for (const key of Object.keys(sealed.envelope)) assert.equal(routingNames.has(key), true, key);
for (const row of ENVELOPE_METADATA) {
  assert.equal(row.observer, "relay");
  assert.equal(typeof row.reveals, "string");
  assert.equal(row.necessary, true);
  assert.equal(row.class, undefined);
}
assert.equal(routingNames.has("payload"), false);
assert.equal(routingNames.has("email"), false);
assert.equal(Object.hasOwn(sealed.envelope, "ip"), false);
assert.equal(Object.hasOwn(sealed.envelope, "uptime"), false);
assert.equal(Object.hasOwn(sealed.envelope, "source_address"), false);
const relayRow = relayLog(relay)[0];
assert.equal(typeof relayRow.bytes, "number");
assert.ok(relayRow.bytes > secret.length);
assert.equal(typeof sealed.envelope.created_at, "string");
assert.equal(relayRow.recipient_hint, sealed.envelope.recipient_hint);
const leakageNames = ["timing", "ip_connection_frequency", "message_size", "relay_relationships", "node_uptime"];
assert.deepEqual(OBSERVER_LEAKAGE.map((row) => row.field), leakageNames);
for (const row of OBSERVER_LEAKAGE) {
  assert.equal(row.necessary, false, row.field);
  assert.equal(row.class, "leakage");
  assert.equal(typeof row.observer, "string");
  assert.equal(typeof row.reveals, "string");
  assert.equal(routingNames.has(row.field), false);
}

const cache = createReplayCache({ cap: 4 });
rememberReplay(cache, {
  network_id: "aziel-runtime",
  sender: alice.session.ephemeral_public_key,
  message_id: "retain-me",
  expires_at: now + 1_000,
}, now);
assert.equal(cache.entries.size, 1);
sweepReplay(cache, now + 1_000);
assert.equal(cache.entries.size, 0);

for (const bearer of ["tor", "udp", "radio", "sandbox", "icann", "cap7-egress"]) {
  const refused = negotiateBearer(bearer);
  assert.equal(refused.live, false);
  assert.equal(refused.code, "AZP-BEARER-REFUSE");
  assert.equal(refused.public_icann, false);
  assert.equal(refused.cap7_public_egress, false);
}
assert.equal(CLAIM_LIMITS.anonymous, false);
assert.equal(CLAIM_LIMITS.unkillable, false);
assert.equal(CLAIM_LIMITS.cap7_public_icann, false);
assert.equal(CLAIM_LIMITS.cap7_public_egress, false);
assert.equal(CLAIM_LIMITS.mirage_is_azvpn, false);
assert.equal(CLAIM_LIMITS.aznet_replaces_internet, false);
assert.equal(CLAIM_LIMITS.live_multi_provider, false);
assert.equal(CLAIM_LIMITS.encryption_addressed_is_anonymity, false);

const paper = readFileSync(new URL("../docs/designs/AZP-NS-1.0.md", import.meta.url), "utf8");
assert.match(paper, /tamper-evident/);
assert.match(paper, /privacy-preserving/);
assert.match(paper, /survivable/);
assert.equal(paper.includes(CLAIM_TAMPER_EVIDENT), true);
assert.equal(paper.includes(CLAIM_PRIVACY_PRESERVING), true);
assert.equal(paper.includes(CLAIM_SURVIVABLE), true);
assert.equal(paper.includes(CLAIM_ZERO_TRUST), true);
assert.match(paper, /not anonymity/);
assert.match(paper, /Encryption of the payload is not anonymity/);
assert.match(paper, /not an unkillable network/);
assert.match(paper, /Plane B Framagit/);
assert.match(paper, /Softwares stay 42/);
assert.match(paper, /FIXTURE-MEASURE/);
assert.match(paper, /not an anonymity PASS/);

const warnsPaper = readFileSync(new URL("../docs/designs/MESH-INTERNET-WARNS-1.0.md", import.meta.url), "utf8");
assert.match(warnsPaper, /WARN-4/);
assert.match(warnsPaper, /FIXTURE-MEASURE/);
assert.match(warnsPaper, /not an anonymity PASS/);
assert.match(warnsPaper, /encryption_addressed_is_anonymity/);

const samples = [];
for (let i = 0; i < 8; i += 1) {
  const payload = `measure-${i}-${"x".repeat(i)}`;
  const t0 = performance.now();
  const sample = await sealEnvelope({
    keystore: aliceKs,
    session: alice.session,
    recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
    payload,
    now: now + i,
    ttlMs: 5_000,
  });
  const sealMs = performance.now() - t0;
  assert.equal(sample.ok, true, sample.message);
  const bytes = Buffer.byteLength(JSON.stringify(sample.envelope), "utf8");
  assert.equal(bytes > payload.length, true);
  assert.equal(Number.isFinite(sealMs), true);
  samples.push({ index: i, bytes, seal_ms: Math.round(sealMs * 1000) / 1000 });
}
const fixtureMeasure = {
  label: "FIXTURE-MEASURE",
  warn_id: "WARN-4",
  anonymity_pass: false,
  n: samples.length,
  samples,
  note: "Fixture envelope size and seal-timing samples. Not an anonymity test. Not an anonymity PASS.",
};
assert.equal(fixtureMeasure.label, "FIXTURE-MEASURE");
assert.equal(fixtureMeasure.anonymity_pass, false);
assert.equal(fixtureMeasure.n, 8);
assert.equal(fixtureMeasure.samples.every((row) => row.bytes > 0 && row.seal_ms >= 0), true);

assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(softwareCatalog("https://aziel-runtime.example", PRODUCTS).count, 42);

const fields = [
  ...ENVELOPE_METADATA.map((row) => ({ ...row, class: "routing" })),
  ...OBSERVER_LEAKAGE.map((row) => ({ ...row })),
];
const necessary = fields.filter((row) => row.necessary === true).map((row) => row.field);
const leakage = fields.filter((row) => row.necessary === false).map((row) => row.field);
assert.deepEqual(leakage, leakageNames);
assert.ok(necessary.includes("ciphertext"));
assert.equal(necessary.includes("timing"), false);
const claim_limits = { ...CLAIM_LIMITS };
const report = {
  script: "verify-privacy-metadata",
  fields,
  observer: [...new Set(fields.map((row) => row.observer))],
  reveals: fields.map((row) => ({ field: row.field, reveals: row.reveals })),
  necessary,
  claim_limits,
};
assert.equal(Array.isArray(report.fields), true);
assert.ok(report.fields.length >= ENVELOPE_METADATA.length + OBSERVER_LEAKAGE.length);
assert.equal(report.claim_limits.anonymous, false);
assert.equal(report.claim_limits.unkillable, false);
assert.equal(report.claim_limits.live_multi_provider, false);
assert.equal(report.claim_limits.encryption_addressed_is_anonymity, false);
assert.equal(report.fields.some((row) => row.reveals.toLowerCase().includes("anonymous")), false);
assert.equal(fixtureMeasure.anonymity_pass, false);
console.log(JSON.stringify({
  script: report.script,
  fields: report.fields,
  observer: report.observer,
  reveals: report.reveals,
  necessary: report.necessary,
  claim_limits: report.claim_limits,
  fixture_measure: fixtureMeasure,
  anonymous: false,
  unkillable: false,
  live_multi_provider: false,
  anonymity_pass: false,
}, null, 2));
console.log("verify-privacy-metadata: GATE F/G ok; FIXTURE-MEASURE is not an anonymity PASS");

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

const fields = new Set(ENVELOPE_METADATA.map((row) => row.field));
for (const key of Object.keys(sealed.envelope)) assert.equal(fields.has(key), true, key);
for (const row of ENVELOPE_METADATA) {
  assert.equal(row.observer, "relay");
  assert.equal(typeof row.reveals, "string");
  assert.equal(row.necessary, true);
}
assert.equal(fields.has("payload"), false);
assert.equal(fields.has("email"), false);

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

for (const bearer of ["tor", "udp", "radio", "sandbox"]) {
  const refused = negotiateBearer(bearer);
  assert.equal(refused.live, false);
  assert.equal(refused.code, "AZP-BEARER-REFUSE");
}
assert.equal(CLAIM_LIMITS.anonymous, false);
assert.equal(CLAIM_LIMITS.unkillable, false);
assert.equal(CLAIM_LIMITS.cap7_public_icann, false);
assert.equal(CLAIM_LIMITS.cap7_public_egress, false);
assert.equal(CLAIM_LIMITS.mirage_is_azvpn, false);
assert.equal(CLAIM_LIMITS.aznet_replaces_internet, false);
assert.equal(CLAIM_LIMITS.live_multi_provider, false);

const paper = readFileSync(new URL("../docs/designs/AZP-NS-1.0.md", import.meta.url), "utf8");
assert.match(paper, /tamper-evident/);
assert.match(paper, /privacy-preserving/);
assert.match(paper, /survivable/);
assert.equal(paper.includes(CLAIM_TAMPER_EVIDENT), true);
assert.equal(paper.includes(CLAIM_PRIVACY_PRESERVING), true);
assert.equal(paper.includes(CLAIM_SURVIVABLE), true);
assert.equal(paper.includes(CLAIM_ZERO_TRUST), true);
assert.match(paper, /not anonymity/);
assert.match(paper, /not an unkillable network/);
assert.match(paper, /Plane B Framagit/);
assert.match(paper, /Softwares stay 42/);

assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(softwareCatalog("https://aziel-runtime.example", PRODUCTS).count, 42);

const inventory = ENVELOPE_METADATA.map((row) => ({ ...row }));
console.log(JSON.stringify({
  script: "verify-privacy-metadata",
  anonymous: false,
  unkillable: false,
  inventory,
}, null, 2));
console.log("verify-privacy-metadata: GATE F/G ok");

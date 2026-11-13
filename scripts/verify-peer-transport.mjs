/**
 * Pin is checked before any HTTP bytes. Replay watermark does not expire.
 * Address policy uses canonical literals, not names or odd spellings.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import https from "node:https";
import { dialDestination, isLanHost, isLoopbackHost } from "../src/fed-mesh/bearers.js";
import { mintLocalCert, peerFetch } from "../src/fed-mesh/local-tls.js";
import { memoryRateQuotaNamespace, takeDistributedRateSlot } from "../src/rate-quota.js";
import { rateLimitDecision } from "../src/production.js";

assert.equal(isLoopbackHost("localhost"), false);
assert.equal(dialDestination("localhost").reason, "name");
assert.equal(isLoopbackHost("127.0.0.1"), true);
assert.equal(isLoopbackHost("127.0.0.2"), true);
assert.equal(isLoopbackHost("::1"), true);
assert.equal(isLoopbackHost("::ffff:127.0.0.1"), true);
assert.equal(isLoopbackHost("0177.0.0.1"), false);
assert.equal(isLoopbackHost("0x7f.0.0.1"), false);
assert.equal(isLoopbackHost("2130706433"), false);
assert.equal(isLanHost("10.0.0.01"), false);
assert.equal(isLanHost("10.0.0.1"), true);
assert.equal(isLanHost("::ffff:10.1.2.3"), true);
assert.equal(isLanHost("::ffff:8.8.8.8"), false);
assert.equal(dialDestination("::ffff:8.8.8.8").reason, "public-v4-mapped");
assert.equal(isLanHost("fd.example.com"), false);
assert.equal(isLanHost("not-a-lan.local"), false);

const right = mintLocalCert();
const wrong = mintLocalCert();
const seen = [];
const server = https.createServer({ key: right.keyPem, cert: right.certPem }, (req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    seen.push({
      url: req.url,
      bytes: Buffer.concat(chunks).length,
      token: req.headers["x-aziel-admin-token"] || null,
      body: Buffer.concat(chunks).toString("utf8"),
    });
    res.end(JSON.stringify({ ok: true }));
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const url = `https://127.0.0.1:${port}/v1/fed-mesh/discover`;
try {
  const missed = await peerFetch(url, {
    method: "POST",
    json: { marker: "beacon-body" },
    tlsPin: wrong.fingerprint,
    headers: { "x-aziel-admin-token": "not-sent-to-wrong-cert" },
  });
  assert.equal(missed.code, "FED-MESH-TLS-PIN");
  assert.equal(missed.sent, false);
  assert.equal(missed.application_bytes, 0);
  assert.equal(seen.length, 0, "wrong pin must not deliver an HTTP request");

  const absent = await peerFetch(url, { method: "POST", json: { marker: "beacon-body" }, tlsPin: "" });
  assert.equal(absent.code, "FED-MESH-TLS-PIN");
  assert.equal(absent.application_bytes, 0);
  assert.equal(seen.length, 0);

  const ok = await peerFetch(url, {
    method: "POST",
    json: { marker: "beacon-body" },
    tlsPin: right.fingerprint,
  });
  assert.equal(ok.transportOk, true);
  assert.equal(ok.json.ok, true);
  assert.equal(seen.length, 1);
  assert.match(seen[0].body, /beacon-body/);

  const changed = await peerFetch(url, {
    method: "POST",
    json: { marker: "second-body" },
    tlsPin: wrong.fingerprint,
    headers: { "x-aziel-admin-token": "still-not-sent" },
  });
  assert.equal(changed.code, "FED-MESH-TLS-PIN");
  assert.equal(changed.application_bytes, 0);
  assert.equal(changed.socket_reused, false);
  assert.equal(seen.length, 1, "a later wrong pin does not reuse the accepted socket");
  assert.equal(seen[0].token, null);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const clear = await peerFetch("http://10.1.2.3/v1/fed-mesh/discover", { method: "POST", json: { marker: "no" } });
assert.equal(clear.code, "FED-MESH-TLS-REQUIRED");
assert.equal(clear.application_bytes, 0);
const named = await peerFetch("http://localhost/v1/fed-mesh/discover", { method: "POST", json: { marker: "no" } });
assert.equal(named.code, "FED-MESH-NO-ROUTE");
assert.equal(named.application_bytes, 0);

const origin = "https://aziel-runtime.example";
const badCf = rateLimitDecision(
  { __aziel_rate_limits: { mesh_mutate: 1 } },
  new Request(origin + "/v1/mesh/lie", { headers: { "CF-Connecting-IP": "not-an-ip", "X-Azrt-Client-IP": "198.51.100.8" } }),
  "mesh_mutate",
);
assert.equal(badCf.ingress_source, "cf-connecting-ip-unparsed");
assert.equal(badCf.ip, "ingress-unidentified");
assert.equal(badCf.forwarded_headers_trusted, false);
assert.equal(badCf.cf_overwrite_proven, false);
assert.equal(badCf.global_quota, false);

const broken = {
  RATE: {
    getByName() {
      return { take() { throw new Error("rate down"); } };
    },
  },
  __aziel_rate_limits: { mesh_mutate: 1 },
};
const first = await takeDistributedRateSlot(broken, "mesh_mutate", "203.0.113.9", 1);
const second = await takeDistributedRateSlot(broken, "mesh_mutate", "203.0.113.9", 1);
assert.equal(first.enforcement, "isolate");
assert.equal(first.rate_backend, "isolate-fallback");
assert.equal(first.rate_error, "RATE-UNAVAILABLE");
assert.equal(first.shared_across_isolates, false);
assert.equal(first.global_quota, false);
assert.equal(first.cf_overwrite_proven, false);
assert.equal(second.ok, false);
assert.equal(second.enforcement, "isolate");

const healthy = { RATE: memoryRateQuotaNamespace({}), __aziel_rate_limits: { mesh_mutate: 1 } };
const bound = await takeDistributedRateSlot(healthy, "mesh_mutate", "203.0.113.10", 1);
assert.equal(bound.enforcement, "durable-object");
assert.equal(bound.rate_backend, "durable-object");
assert.equal(bound.shared_across_isolates, true);
assert.equal(bound.global_quota, false);
assert.equal(bound.cf_overwrite_proven, false);

if (process.env.AZIEL_HERMETIC === "1") {
  const { noteHermeticBlock } = await import("./isolate-net.mjs");
  noteHermeticBlock("example.invalid");
  let caught = null;
  try { await fetch("https://example.invalid/nope"); }
  catch (err) { caught = err; }
  assert.ok(caught && String(caught.message).includes("ISOLATED_NET_BLOCKED"), "declared refusal must be blocked before a socket");
  assert.equal(caught.code, "ISOLATED_NET_BLOCKED");
}

console.log("ok peer-transport: pin before HTTP bytes, canonical dial, isolate fallback is not a global quota");

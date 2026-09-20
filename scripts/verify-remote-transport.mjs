/**
 * Remote MCP/FragGate transport honesty.
 *
 * Mocked DNS / network failure must return FG-DNS / FG-NET with remote:false.
 * Never a FragGate execution receipt. Never a silent --local fallback.
 * SpectralLock describe/call is asserted in-process (same door as the Worker).
 * Optional live smoke uses a real fetch only when DNS works — no invented receipt.
 *
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import assert from "node:assert/strict";
import { ENGINE_DIGESTS } from "../src/engines/digest.js";
import {
  FG_DNS,
  FG_NET,
} from "../src/fraggate/codes.js";
import {
  PRIMARY_REMOTE_ORIGIN,
  REQUIRED_EGRESS,
  classifyTransportError,
  dnsError,
  looksLikeFraggateExecutionReceipt,
  networkRefuseEnvelope,
} from "../src/remote-transport.js";
import { createBridgeContext, dispatchMcp, usage } from "../src/mcp-stdio.js";
import { memorySessionNamespace } from "../src/session-do.js";

const handler = (await import("../src/index.js")).default.fetch;

const dns = classifyTransportError(dnsError());
assert.equal(dns.code, FG_DNS);
assert.equal(dns.kind, "dns");
assert.equal(dns.remote, false);

const net = classifyTransportError(new Error("connect ECONNREFUSED 127.0.0.1:1"));
assert.equal(net.code, FG_NET);
assert.equal(net.remote, false);

const envelope = networkRefuseEnvelope({
  err: dnsError("aziel-runtime.vibelock.workers.dev"),
  origin: PRIMARY_REMOTE_ORIGIN,
  path: "/mcp",
});
assert.equal(envelope.ok, false);
assert.equal(envelope.remote, false);
assert.equal(envelope.code, FG_DNS);
assert.equal(envelope.fraggate_receipt, false);
assert.equal(envelope.local_validation, false);
assert.equal(envelope.fabricated, false);
assert.equal(envelope.door, null);
assert.equal(envelope.result, null);
assert.equal(envelope.ledger_tip, null);
assert.equal(looksLikeFraggateExecutionReceipt(envelope), false);
assert.ok(REQUIRED_EGRESS.dns && REQUIRED_EGRESS.https && REQUIRED_EGRESS.cloudflare);
assert.match(usage(), /FG-DNS/);
assert.match(usage(), /vibelock\.workers\.dev/);

let localSendCalls = 0;
const dnsCtx = createBridgeContext({
  flags: { url: PRIMARY_REMOTE_ORIGIN },
  origins: [PRIMARY_REMOTE_ORIGIN],
  fetchImpl: async () => {
    throw dnsError("aziel-runtime.vibelock.workers.dev");
  },
  localSend: async () => {
    localSendCalls += 1;
    throw new Error("localSend must not run on remote DNS failure");
  },
  log: () => {},
});
assert.equal(dnsCtx.local, false);

const failed = await dispatchMcp(
  {
    jsonrpc: "2.0",
    id: 42,
    method: "tools/call",
    params: { name: "fraggate_call", arguments: { slug: "spectrallock", op: "health", confirm: true } },
  },
  dnsCtx,
);
assert.equal(failed.jsonrpc, "2.0");
assert.equal(failed.id, 42);
assert.equal(failed.error.code, -32000);
assert.equal(failed.error.data.remote, false);
assert.equal(failed.error.data.code, FG_DNS);
assert.equal(failed.error.data.fraggate_receipt, false);
assert.equal(failed.error.data.local_validation, false);
assert.equal(failed.error.data.fabricated, false);
assert.equal(failed.error.data.door, null);
assert.equal(failed.error.data.ledger_tip, null);
assert.equal(failed.error.data.result, null);
assert.doesNotMatch(JSON.stringify(failed), /"FG-OK"/);
assert.doesNotMatch(JSON.stringify(failed), /aziel-runtime\.fraggate\.ledger/);
assert.equal(looksLikeFraggateExecutionReceipt(failed), false);
assert.equal(looksLikeFraggateExecutionReceipt(failed.error.data), false);
assert.equal(localSendCalls, 0, "remote DNS failure must not fall back to in-process localSend");

const netCtx = createBridgeContext({
  flags: { url: PRIMARY_REMOTE_ORIGIN },
  origins: [PRIMARY_REMOTE_ORIGIN],
  fetchImpl: async () => {
    throw new Error("connect ETIMEDOUT");
  },
  localSend: async () => {
    throw new Error("localSend must not run on remote network failure");
  },
  log: () => {},
});
const netFail = await dispatchMcp({ jsonrpc: "2.0", id: 7, method: "ping" }, netCtx);
assert.equal(netFail.error.data.code, FG_NET);
assert.equal(netFail.error.data.remote, false);
assert.equal(netFail.error.data.fraggate_receipt, false);
assert.equal(looksLikeFraggateExecutionReceipt(netFail), false);

const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };
const described = await (
  await handler(new Request(origin + "/v1/fraggate/describe?slug=spectrallock"), env)
).json();
assert.equal(described.ok, true);
assert.equal(described.slug, "spectrallock");
assert.equal(described.digest, ENGINE_DIGESTS.spectrallock);
assert.ok(described.ops.includes("health"));

const called = await (
  await handler(
    new Request(origin + "/v1/fraggate/call", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "spectrallock", op: "health" }),
    }),
    env,
  )
).json();
assert.equal(called.ok, true);
assert.equal(called.code, "FG-OK");
assert.equal(called.door, "fraggate");
assert.equal(called.engine.engine_digest, ENGINE_DIGESTS.spectrallock);
assert.match(called.ledger_tip.hash, /^[a-f0-9]{64}$/);
assert.equal(looksLikeFraggateExecutionReceipt(called), true);

if (process.env.AZIEL_RUNTIME_MCP_SKIP_LIVE === "1") {
  console.log("verify-remote-transport: skip live smoke (AZIEL_RUNTIME_MCP_SKIP_LIVE=1)");
} else {
  let online = false;
  try {
    const res = await fetch(PRIMARY_REMOTE_ORIGIN + "/v1/fraggate/describe?slug=spectrallock", {
      headers: { "user-agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    online = res.ok;
    if (online) {
      const liveDesc = await res.json();
      assert.equal(liveDesc.slug, "spectrallock");
      assert.equal(liveDesc.digest, ENGINE_DIGESTS.spectrallock);
      const liveCall = await fetch(PRIMARY_REMOTE_ORIGIN + "/v1/fraggate/call", {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
        body: JSON.stringify({ slug: "spectrallock", op: "health" }),
        signal: AbortSignal.timeout(12000),
      });
      const liveBody = await liveCall.json();
      assert.equal(liveBody.code, "FG-OK");
      assert.equal(looksLikeFraggateExecutionReceipt(liveBody), true);
      assert.match(liveBody.ledger_tip.hash, /^[a-f0-9]{64}$/);
      console.log("verify-remote-transport: live spectrallock receipt", liveBody.ledger_tip.hash);
    }
  } catch (err) {
    const classified = classifyTransportError(err);
    assert.ok(classified.code === FG_DNS || classified.code === FG_NET);
    assert.equal(looksLikeFraggateExecutionReceipt(networkRefuseEnvelope({ err })), false);
    console.log("verify-remote-transport: live smoke skipped (", classified.code, ")");
    online = false;
  }
  if (!online) {
    /* already logged */
  }
}

console.log("verify-remote-transport: ok (mocked DNS refuses; no fake FragGate receipt)");

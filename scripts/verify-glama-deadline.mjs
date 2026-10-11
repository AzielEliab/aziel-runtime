// GLAMA-STDIO-DEADLINE-1.0: a black-holed egress (fetch never settles until
// aborted) must not stall initialize / tools/list past the discovery deadline.
// Discovery answers from the in-process catalog (remote=false, no receipt).
// Author: Aziel Eliab.
import assert from "node:assert/strict";
import { createBridgeContext, dispatchMcp, bridgeTimeoutMs } from "../src/mcp-stdio.js";

const hang = (_url, init) =>
  new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason || new Error("aborted"))));
const keepAlive = setInterval(() => {}, 1000);
const ctx = createBridgeContext(
  { fetchImpl: hang, discoveryTimeoutMs: 300, origins: ["https://a.invalid", "https://b.invalid", "https://c.invalid"], log: () => {} },
  {},
);
assert.equal(bridgeTimeoutMs({ id: 1, method: "tools/call" }, ctx), 30000);
assert.equal(bridgeTimeoutMs({ id: 1, method: "tools/list" }, ctx), 300);
let t = Date.now();
const init = await dispatchMcp({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }, ctx);
assert.ok(init.result && init.result.serverInfo, "initialize answered");
assert.ok(Date.now() - t < 3000, "initialize within deadline");
assert.equal(init.result._meta["aziel-runtime/discovery"].remote, false);
t = Date.now();
await dispatchMcp({ jsonrpc: "2.0", method: "notifications/initialized" }, ctx);
const list = await dispatchMcp({ jsonrpc: "2.0", id: 2, method: "tools/list" }, ctx);
assert.equal(list.result.tools.length, 36);
assert.ok(Date.now() - t < 1500, "skip window: no second wait");
clearInterval(keepAlive);
console.log("ok glama stdio deadline: black-holed egress answers discovery locally, 36 tools");

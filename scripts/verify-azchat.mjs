/**
 * AZChat 0.1.0 — T-CHAT-01..04. Mesh default off. Not AZMail.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { embeddedDigest } from "../src/engines/digest.js";
import { executeLocal } from "../src/engines/runner.js";
import {
  MESH_ENABLED_DEFAULT,
  VERSION,
  resetAzchatStore,
} from "../src/engines/azchat/engine.js";

resetAzchatStore();

const product = PRODUCTS.find((p) => p.slug === "azchat");
assert.ok(product, "azchat is a catalog product");
assert.equal(product.name, "AZChat");
assert.equal(product.worker, "azchat-download-tracker");
assert.equal(product.version, VERSION);
assert.equal(MESH_ENABLED_DEFAULT, false);
assert.match(product.oneLine, /Mesh hop default off/);
assert.ok(embeddedDigest("azchat"));

const catalogOps = new Set(product.ops.map((o) => o.op));
const live = LIVE_OPS.azchat;
const expected = [
  "health",
  "skill",
  "doctor",
  "handle_new",
  "handle_rotate",
  "room_open",
  "room_post",
  "room_pull",
  "bus_send",
  "bus_poll",
  "verify_receipt",
  "import_export",
];
for (const op of expected) {
  assert.ok(live.includes(op), `LIVE_OPS.azchat has ${op}`);
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}
for (const op of STUB_OPS.azchat) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.azchat.status, "live");
assert.equal(classifyCall(registry.bySlug.azchat, "send").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azchat, "bridge_azmail").kind, "stub");

const health = await executeLocal({ slug: "azchat", op: "health", payload: {}, ranIn: "aziel-runtime" });
const healthBody = JSON.parse(health.responseText);
assert.equal(healthBody.ok, true);
assert.equal(healthBody.mesh_enabled_default, false);
assert.equal(healthBody.azmail_bridge, false);
assert.equal(healthBody.r2.bound, false);

// T-CHAT-01 two-agent bus
const aSend = await executeLocal({
  slug: "azchat",
  op: "bus_send",
  payload: { from: "agent-a", to: "agent-b", text: "ping" },
  ranIn: "aziel-runtime",
});
const aFrame = JSON.parse(aSend.responseText);
assert.equal(aFrame.ok, true);
assert.equal(aFrame.azmail_bridge, false);
const bPoll = await executeLocal({
  slug: "azchat",
  op: "bus_poll",
  payload: { agent: "agent-b" },
  ranIn: "aziel-runtime",
});
const bFrames = JSON.parse(bPoll.responseText);
assert.ok(bFrames.frames.some((f) => f.from === "agent-a" && f.to === "agent-b"));

// T-CHAT-02 two-handle room
const h1 = JSON.parse(
  (await executeLocal({ slug: "azchat", op: "handle_new", payload: { label: "alice" }, ranIn: "aziel-runtime" })).responseText,
);
const h2 = JSON.parse(
  (await executeLocal({ slug: "azchat", op: "handle_new", payload: { label: "bob" }, ranIn: "aziel-runtime" })).responseText,
);
assert.ok(h1.token && h2.token);
const room = JSON.parse(
  (
    await executeLocal({
      slug: "azchat",
      op: "room_open",
      payload: { token_a: h1.token, token_b: h2.token, ttl_ms: 60_000 },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(room.ok, true);
const posted = JSON.parse(
  (
    await executeLocal({
      slug: "azchat",
      op: "room_post",
      payload: { token: h1.token, room_id: room.room_id, text: "hello bob" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(posted.ok, true);
const pulled = JSON.parse(
  (
    await executeLocal({
      slug: "azchat",
      op: "room_pull",
      payload: { token: h2.token, room_id: room.room_id },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.ok(pulled.posts.some((p) => p.text === "hello bob"));

// stranger pull 404
const stranger = JSON.parse(
  (await executeLocal({ slug: "azchat", op: "handle_new", payload: { label: "eve" }, ranIn: "aziel-runtime" })).responseText,
);
const strangerPull = JSON.parse(
  (
    await executeLocal({
      slug: "azchat",
      op: "room_pull",
      payload: { token: stranger.token, room_id: room.room_id },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(strangerPull.status, 404);

// T-CHAT-03 rotate unlinks
const rotated = JSON.parse(
  (
    await executeLocal({
      slug: "azchat",
      op: "handle_rotate",
      payload: { token: h1.token },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(rotated.ok, true);
const oldPull = JSON.parse(
  (
    await executeLocal({
      slug: "azchat",
      op: "room_pull",
      payload: { token: h1.token, room_id: room.room_id },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(oldPull.status, 404);

// T-CHAT-04 sealed TTL
const short = JSON.parse(
  (
    await executeLocal({
      slug: "azchat",
      op: "room_open",
      payload: { token_a: h2.token, token_b: stranger.token, ttl_ms: 1 },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
await new Promise((r) => setTimeout(r, 5));
const sealedPost = JSON.parse(
  (
    await executeLocal({
      slug: "azchat",
      op: "room_post",
      payload: { token: h2.token, room_id: short.room_id, text: "too late" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(sealedPost.sealed, true);
assert.ok(sealedPost.status === 410 || sealedPost.ok === false);

console.log(`ok azchat ${VERSION}: T-CHAT-01..04 mesh_default=${MESH_ENABLED_DEFAULT} digest=${embeddedDigest("azchat")}`);

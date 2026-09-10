/**
 * AZRT-1.9-CLOSE-1.0: ops[] ≡ LIVE_OPS public verbs, remain-OFF, OpenAPI, hash store.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS, STUB_OPS, NAMED_STUBS, OP_ALIASES, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { engineOps } from "../src/engines/registry.js";
import { executeLocal } from "../src/engines/runner.js";
import { resetHashStore } from "../src/engines/hash-store.js";
import { resetAzmailStore } from "../src/engines/azmail/engine.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";

assert.equal(RUNTIME_VERSION, "1.9.0");
assert.equal(NAMED_STUBS.length, 0);

const aliasesOf = (slug) => new Set(Object.keys(OP_ALIASES[slug] || {}));

for (const [slug, ops] of Object.entries(LIVE_OPS)) {
  if (slug === "mesh" || slug === "memory") continue;
  const product = PRODUCTS.find((p) => p.slug === slug);
  assert.ok(product, `LIVE_OPS ${slug} is a catalog product`);
  const catalog = new Set(product.ops.map((o) => o.op));
  const engine = new Set(engineOps(slug));
  const aliases = aliasesOf(slug);
  for (const op of ops) {
    assert.ok(catalog.has(op), `${slug} catalog missing LIVE_OPS ${op}`);
    if (!aliases.has(op) && op !== "evaluate" && op !== "advise" && op !== "advisory") {
      assert.ok(engine.has(op) || aliases.has(op), `${slug} engine missing public ${op}`);
    }
  }
}

for (const [slug, ops] of Object.entries(STUB_OPS)) {
  const live = new Set(LIVE_OPS[slug] || []);
  for (const op of ops) assert.ok(!live.has(op), `${slug}/${op} must not be live`);
}

const remain = [
  ["azmail", "smtp_send"],
  ["azmail", "deanonymize"],
  ["azchat", "bridge_azmail"],
  ["whistlelock", "send"],
  ["whistlelock", "mail"],
  ["whistlelock", "release"],
  ["trajectorylock", "store_media"],
  ["miragegrid", "vpn-hop"],
  ["azieltether", "vpn"],
  ["azos", "exec"],
  ["azai", "blend"],
  ["azbrowser", "chromium"],
  ["azbrowser", "tor_exit"],
  ["embryolock", "wipe"],
];
const registry = buildRegistry(PRODUCTS);
for (const [slug, op] of remain) {
  assert.equal(classifyCall(registry.bySlug[slug], op).kind, "stub", `${slug}/${op} remain-OFF`);
}

resetAzmailStore();
const notice = JSON.parse(
  (
    await executeLocal({
      slug: "azmail",
      op: "notice_post",
      payload: { class: "update", text: "worker inbox", to: "worker" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(notice.ok, true);
assert.equal(notice.smtp, false);
const inbox = JSON.parse(
  (
    await executeLocal({
      slug: "azmail",
      op: "inbox_pull",
      payload: { mailbox_id: "worker" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.ok(inbox.items.some((i) => i.text === "worker inbox"));
const mailed = JSON.parse(
  (
    await executeLocal({
      slug: "azmail",
      op: "mail_post",
      payload: { from: "alice", to: "bob", text: "local only" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(mailed.ok, true);
const bob = JSON.parse(
  (
    await executeLocal({
      slug: "azmail",
      op: "inbox_pull",
      payload: { mailbox_id: "bob" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.ok(bob.items.some((i) => i.text === "local only"));

resetHashStore();
const put = JSON.parse(
  (
    await executeLocal({
      slug: "trajectorylock",
      op: "hash_put",
      payload: { text: "media-bytes" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(put.ok, true);
assert.equal(put.cdn, false);
assert.equal(put.url, null);
const got = JSON.parse(
  (
    await executeLocal({
      slug: "trajectorylock",
      op: "hash_get",
      payload: { hash: put.hash },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(got.ok, true);
const wput = JSON.parse(
  (
    await executeLocal({
      slug: "whistlelock",
      op: "hash_put",
      payload: { text: "whistle-file" },
      ranIn: "aziel-runtime",
    })
  ).responseText,
);
assert.equal(wput.ok, true);
assert.equal(wput.cdn, false);

const corpus = JSON.parse(
  (await executeLocal({ slug: "aziel-corpus", op: "health", payload: {}, ranIn: "aziel-runtime" })).responseText,
);
assert.ok(corpus.native_ops.includes("search"));
assert.ok(corpus.proxy_ops.includes("ocr"));

const handler = (await import("../src/index.js")).default.fetch;
const openapi = await (
  await handler(new Request("https://aziel-runtime.example/openapi.json", { headers: { "user-agent": "Mozilla/5.0" } }), {})
).json();
assert.ok(openapi.info.description.startsWith("Aziel Runtime is not merely an API orchestrator"));
assert.match(openapi.info.description, /1\.9\.0/);
assert.ok(openapi.info.description.indexOf("Aziel Runtime is not merely") < openapi.info.description.indexOf("1.9.0"));
const pathKeys = Object.keys(openapi.paths).join(" ");
assert.doesNotMatch(pathKeys, /smtp_send|deanonymize/);
assert.ok(openapi.paths["/p/azchat/handle_new"]);
assert.ok(openapi.paths["/p/azmail/notice_post"]);

const home = await (
  await handler(new Request("https://aziel-runtime.example/", { headers: { "user-agent": "Mozilla/5.0" } }), {})
).text();
assert.match(home, /not merely an API orchestrator or software aggregator/);
assert.match(home, /node-meshed orchestration suite of MCP-connected software/);
assert.match(home, /1\.9\.0/);
assert.ok(home.indexOf("not merely an API orchestrator") < home.indexOf("id=\"version-history\""));
assert.doesNotMatch(home, /Flutter <code>mobile\/<\/code>, local install/);

console.log("ok close-19 ops≡LIVE_OPS remain-OFF mailbox hash-store openapi SEO");

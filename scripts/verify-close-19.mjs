/**
 * AZRT-1.9-CLOSE-1.0: ops[] ≡ LIVE_OPS public verbs, remain-OFF, OpenAPI, hash store.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS, STUB_OPS, NAMED_STUBS, OP_ALIASES, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { engineOps } from "../src/engines/registry.js";
import { executeLocal } from "../src/engines/runner.js";
import { resetHashStore } from "../src/engines/hash-store.js";
import { resetAzmailStore } from "../src/engines/azmail/engine.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { D1_SEARCH_SQL, search } from "../src/engines/aziel-corpus/engine.js";

assert.equal(RUNTIME_VERSION, "2.0.0-rc1");
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
assert.ok(corpus.native_ops.includes("review"));
assert.ok(corpus.native_ops.includes("document-chain"));
assert.ok(corpus.native_ops.includes("jeeves"));
assert.ok(!corpus.proxy_ops.includes("jeeves"));
assert.ok(!corpus.proxy_ops.includes("media-run"));
assert.ok(corpus.binding_gated.transcribe);
assert.ok(corpus.binding_gated.ocr);
assert.ok(corpus.binding_gated["media-run"]);

assert.match(D1_SEARCH_SQL, /\bFROM records\b/);
assert.doesNotMatch(D1_SEARCH_SQL, /\bFROM master\b/);
for (const col of ["record_id", "title", "author", "domain", "subjects", "keywords", "library", "body", "created_utc"]) {
  assert.match(D1_SEARCH_SQL, new RegExp(`\\b${col}\\b`), `searchD1 SQL selects ${col}`);
}
let prepared = "";
let binds = [];
const db = {
  prepare(sql) {
    prepared = sql;
    return {
      bind(...args) {
        binds = args;
        return {
          async all() {
            return {
              results: [
                {
                  record_id: "AZDOC-LIVE-FLORENCE",
                  title: "Florence live shelf",
                  author: "Aziel Eliab",
                  domain: "library",
                  subjects: "Florence",
                  keywords: "Florence",
                  library: "corpus",
                  body: "Live records row used to prove searchD1 targets production records.",
                  created_utc: "2026-09-11T00:00:00Z",
                },
              ],
            };
          },
        };
      },
    };
  },
};
const live = await search({ q: "Florence" }, { CORPUS_D1: db });
assert.equal(prepared, D1_SEARCH_SQL);
assert.equal(binds.length, 5);
assert.equal(live.live_d1, true);
assert.equal(live.sample_master, false);
assert.equal(live.table, "records");
assert.equal(live.count, 1);
assert.equal(live.records[0].record_id, "AZDOC-LIVE-FLORENCE");
assert.match(live.records[0].snippet, /Live records row/);
assert.equal(live.records[0].body, undefined);
const sample = await search({ q: "Florence" }, {});
assert.equal(sample.live_d1, false);
assert.equal(sample.sample_master, true);
assert.ok(sample.records.some((r) => r.record_id === "AZDOC-FLORENCE-SAMPLE"));

const wrangler = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
assert.match(wrangler, /\[browser\]/);
assert.match(wrangler, /binding = "BROWSER"/);
assert.match(wrangler, /\[ai\]/);
assert.match(wrangler, /binding = "AI"/);
assert.match(wrangler, /binding = "CORPUS_D1"/);
assert.match(wrangler, /database_name = "aziel-digital-library"/);
assert.match(wrangler, /database_id = "23f33238-f1ca-4066-b56e-af66a1e72031"/);

const handler = (await import("../src/index.js")).default.fetch;
const openapi = await (
  await handler(new Request("https://aziel-runtime.example/openapi.json", { headers: { "user-agent": "Mozilla/5.0" } }), {})
).json();
assert.ok(openapi.info.description.startsWith("Aziel Runtime is not merely an API orchestrator"));
assert.match(openapi.info.description, /2\.0\.0-rc1/);
assert.match(openapi.info.description, /1\.9\.3/);
assert.ok(openapi.info.description.indexOf("Aziel Runtime is not merely") < openapi.info.description.indexOf("2.0.0-rc1"));
assert.ok(openapi.info.description.indexOf("Aziel Runtime is not merely") < openapi.info.description.indexOf("1.9.3"));
const pathKeys = Object.keys(openapi.paths).join(" ");
assert.doesNotMatch(pathKeys, /smtp_send|deanonymize/);
assert.ok(openapi.paths["/p/azchat/handle_new"]);
assert.ok(openapi.paths["/p/azmail/notice_post"]);

const home = await (
  await handler(new Request("https://aziel-runtime.example/", { headers: { "user-agent": "Mozilla/5.0" } }), {})
).text();
assert.match(home, /not merely an API orchestrator or software aggregator/);
assert.match(home, /node-meshed orchestration suite of MCP-connected software/);
assert.match(home, /2\.0\.0-rc1/);
assert.match(home, /1\.9\.3/);
assert.ok(home.indexOf("not merely an API orchestrator") < home.indexOf("id=\"version-history\""));
assert.doesNotMatch(home, /Flutter <code>mobile\/<\/code>, local install/);

console.log("ok close-19 ops≡LIVE_OPS remain-OFF mailbox hash-store openapi SEO");

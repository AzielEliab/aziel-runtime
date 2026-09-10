/**
 * EmbryoLock in-process engine: cite/health live, destructive ops FG-STUB.
 * Source: AzielEliab/EmbryoLock Open Source Code (Stealth+ v1.1).
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { CATALOG_ALIASES } from "../src/catalog-meta.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall, parseTarget } from "../src/fraggate/registry.js";
import { softwareBucket } from "../src/software-catalog.js";
import { embeddedDigest } from "../src/engines/digest.js";
import { executeLocal } from "../src/engines/runner.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  AUTHOR,
  LIMITATION,
  POLICY,
  PUBLISHED_SHA256,
  REMAIN_OFF,
  SOURCE,
  SOURCE_CITE,
  SPEC,
  SURFACE,
  VERSION,
  embryolockDoctor,
  embryolockHealth,
  embryolockLimitation,
  embryolockPolicy,
  verifyHash,
} from "../src/engines/embryolock/engine.js";

resetLedger();

const product = PRODUCTS.find((p) => p.slug === "embryolock");
assert.ok(product, "embryolock is a catalog product");
assert.equal(product.name, "EmbryoLock");
assert.equal(product.github, "https://github.com/AzielEliab/EmbryoLock");
assert.equal(product.version, "1.1.0");
assert.equal(product.worker, "embryolock-download-tracker");
assert.equal(product.local_destructive_boundary, true);
assert.match(product.oneLine, /destructive-over-recovery|local-only/i);
assert.doesNotMatch(product.oneLine, /runtime \d+\.\d+.*FragGate|FragGate.*runtime \d+\.\d+/);
assert.equal(product.doi, null);
assert.equal(softwareBucket(product.name, product.slug), "lock");

const catalogOps = new Set(product.ops.map((o) => o.op));
for (const op of ["health", "skill", "doctor", "verify_hash", "policy", "limitation"]) {
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}

assert.equal(SPEC, "EL-WP-1.1");
assert.equal(VERSION, "1.1.0");
assert.equal(AUTHOR, "Aziel Eliab");
assert.equal(SOURCE, "https://github.com/AzielEliab/EmbryoLock");
assert.equal(SURFACE, "live-with-local-destructive-boundary");
assert.equal(SOURCE_CITE.kdf.name, "argon2id");
assert.equal(SOURCE_CITE.aead.name, "AESGCM");
assert.equal(SOURCE_CITE.max_attempts, 3);
assert.equal(POLICY.recovery, false);
assert.equal(POLICY.public_mesh_destructive, false);
assert.equal(REMAIN_OFF.id, "REMAIN-OFF-BY-DESIGN-2026-09-10");
assert.deepEqual(REMAIN_OFF.items.slice(), [3, 28]);
assert.equal(POLICY.remain_off, REMAIN_OFF.id);
assert.deepEqual(POLICY.remain_off_items.slice(), [3, 28]);
assert.equal(POLICY.remain_off_do_not_enable, true);
assert.match(LIMITATION, /Never execute on the public mesh/);
assert.equal(PUBLISHED_SHA256, "fa2e7203bd3924170e94c62357e29764b925a82c2cf708807128bd096333250d");

assert.equal(CATALOG_ALIASES["embryo-lock"], "embryolock");
assert.equal(CATALOG_ALIASES.embryo, "embryolock");

const live = LIVE_OPS.embryolock;
for (const op of ["health", "skill", "doctor", "verify_hash", "policy", "limitation"]) {
  assert.ok(live.includes(op), `LIVE_OPS.embryolock has ${op}`);
}
for (const op of STUB_OPS.embryolock) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}
for (const op of ["wipe", "scorch", "unlock", "unlock_after_fail", "encrypt", "decrypt", "initialize", "login", "arm"]) {
  assert.ok(STUB_OPS.embryolock.includes(op), `STUB_OPS has ${op}`);
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.embryolock.status, "live");
assert.equal(registry.bySlug.embryolock.local_destructive_boundary, true);
assert.equal(registry.bySlug.embryolock.domain, "Vault/Custody");
assert.equal(registry.bySlug.embryolock.domain_id, "01");
assert.equal(registry.bySlug.azchat.status, "live");
for (const op of ["health", "skill", "doctor", "verify_hash", "policy", "limitation"]) {
  assert.equal(classifyCall(registry.bySlug.embryolock, op).kind, "live", `${op} is live`);
}
assert.equal(classifyCall(registry.bySlug.embryolock, "wipe").kind, "stub");
assert.equal(classifyCall(registry.bySlug.embryolock, "scorch").kind, "stub");
assert.equal(classifyCall(registry.bySlug.embryolock, "unlock").kind, "stub");
assert.equal(classifyCall(registry.bySlug.embryolock, "unlock-after-fail").kind, "stub");
assert.equal(classifyCall(registry.bySlug.embryolock, "arm").kind, "stub");

const parsedSlash = parseTarget({ name: "embryolock/policy" }, registry);
assert.equal(parsedSlash.slug, "embryolock");
assert.equal(parsedSlash.op, "policy");
const parsedFlat = parseTarget({ name: "embryolock_verify_hash" }, registry);
assert.equal(parsedFlat.slug, "embryolock");
assert.equal(parsedFlat.op, "verify_hash");

const health = embryolockHealth();
assert.equal(health.ok, true);
assert.equal(health.true_engine_runtime, true);
assert.equal(health.public_mesh_destructive, false);
assert.equal(health.remain_off, REMAIN_OFF.id);
assert.deepEqual(health.remain_off_items, [3, 28]);
assert.equal(health.surface, SURFACE);

const doctor = embryolockDoctor();
assert.equal(doctor.ok, true);
assert.equal(doctor.alias_of, "health");
assert.equal(doctor.source_cite.max_attempts, 3);

const policy = embryolockPolicy();
assert.equal(policy.ok, true);
assert.equal(policy.policy.destruction_over_recovery, true);

const limitation = embryolockLimitation();
assert.match(limitation.limitation, /Forgotten password/);

const hashOk = verifyHash({ digest: PUBLISHED_SHA256 });
assert.equal(hashOk.ok, true);
assert.equal(hashOk.match, true);
const hashMiss = verifyHash({ sha256: "0".repeat(64) });
assert.equal(hashMiss.ok, true);
assert.equal(hashMiss.match, false);
const hashNeed = verifyHash({});
assert.equal(hashNeed.ok, false);
assert.equal(hashNeed.code, "EL-HASH-NEED");

const local = await executeLocal({
  slug: "embryolock",
  op: "policy",
  payload: {},
  ranIn: "aziel-runtime",
});
assert.equal(local.true_engine_runtime, true);
assert.equal(local.engine_digest, embeddedDigest("embryolock"));
assert.equal(local.status, 200);
const localBody = JSON.parse(local.responseText);
assert.equal(localBody.ok, true);
assert.equal(localBody.spec, SPEC);
assert.equal(localBody.public_mesh_destructive, false);

const localStub = await executeLocal({ slug: "embryolock", op: "unlock", payload: {}, ranIn: "aziel-runtime" });
assert.equal(localStub.unsupported, true);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

async function post(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );
}

async function get(path) {
  return handler(new Request(origin + path), env);
}

const doorHealth = await (await post("/v1/fraggate/call", { slug: "embryolock", op: "health" })).json();
assert.equal(doorHealth.ok, true);
assert.equal(doorHealth.slug, "embryolock");
assert.equal(doorHealth.result.surface, SURFACE);
assert.ok(doorHealth.gate);
assert.equal(doorHealth.result.public_mesh_destructive, false);

const doorHash = await (
  await post("/v1/fraggate/call", { slug: "embryolock", op: "verify_hash", payload: { digest: PUBLISHED_SHA256 } })
).json();
assert.equal(doorHash.ok, true);
assert.equal(doorHash.result.match, true);

const doorAlias = await (await post("/v1/fraggate/call", { slug: "embryolock", op: "doctor" })).json();
assert.equal(doorAlias.ok, true);
assert.equal(doorAlias.result.alias_of, "health");

for (const op of ["wipe", "scorch", "unlock", "unlock-after-fail", "encrypt", "arm"]) {
  const refused = await (await post("/v1/fraggate/call", { slug: "embryolock", op })).json();
  assert.equal(refused.ok, false, op);
  assert.equal(refused.code, "FG-STUB", op);
  assert.match(String(refused.message || refused.note || ""), /public mesh|stub|local/i, op);
}

const software = await (await get("/v1/software")).json();
const card = software.software.find((s) => s.slug === "embryolock");
assert.ok(card);
assert.equal(card.status, "live");
assert.equal(card.local_destructive_boundary, true);
assert.equal(card.surface, SURFACE);
assert.equal(card.worker_home, "https://embryolock-download-tracker.vibelock.workers.dev/");
assert.equal(card.download_url, "https://embryolock-download-tracker.vibelock.workers.dev/download");
assert.equal(card.domain_id, "01");
assert.ok(software.software.some((s) => s.slug === "azchat" && s.status === "live"));

const healthBody = await (await get("/v1/health")).json();
assert.ok(healthBody.true_engine_slugs.includes("embryolock"));
assert.ok(healthBody.engine_slugs.includes("embryolock"));
assert.equal(healthBody.engines.embryolock.true_engine_runtime, true);
assert.equal(healthBody.engines.embryolock.engine_digest, embeddedDigest("embryolock"));

const hubHtml = await (await get("/")).text();
assert.match(hubHtml, /data-slug="embryolock"/);
assert.match(hubHtml, /FragGate only/);
const pageHtml = await (await get("/p/embryolock")).text();
assert.match(pageHtml, /data-slug="embryolock"/);
assert.match(pageHtml, /data-op="doctor"/);
assert.match(pageHtml, /data-op="policy"/);
assert.doesNotMatch(pageHtml, /POST \/p\/embryolock\/unlock/);

console.log(
  `ok embryolock ${product.version}: LIVE_OPS=${live.join(",")} stub=${STUB_OPS.embryolock.join(",")} digest=${embeddedDigest("embryolock")}`,
);

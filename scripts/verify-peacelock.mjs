/**
 * PeaceLock (PL-WP-0.1) engine invariants + FragGate allowlist.
 * HARD_DUTY refuse. ABSENT transcript / counterfactual / motive.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { embeddedDigest } from "../src/engines/digest.js";
import { executeLocal } from "../src/engines/runner.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  ABSENT,
  HARD_DUTY_CLASSES,
  collectInventedKeys,
  detectHardDuty,
  openLattice,
  sealLattice,
  breakLattice,
  showLattice,
  verifyLattice,
  stampEnvelope,
} from "../src/engines/peacelock/engine.js";

resetLedger();

const product = PRODUCTS.find((p) => p.slug === "peacelock");
assert.ok(product, "peacelock is a catalog product");
assert.equal(product.name, "PeaceLock");
assert.equal(product.worker, "peacelock-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/peacelock");
assert.match(product.oneLine, /Chosen silence \/ chosen inaction as a first-class receipt \(PL-WP-0\.1\)/);
assert.equal(product.doi, null);

const catalogOps = new Set(product.ops.map((o) => o.op));
for (const op of ["open", "seal", "break", "show", "verify", "stamp", "upload_envelope", "health", "skill"]) {
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}

const live = LIVE_OPS.peacelock;
assert.ok(live.includes("open"));
assert.ok(live.includes("seal"));
assert.ok(live.includes("break"));
assert.ok(live.includes("show"));
assert.ok(live.includes("verify"));
assert.ok(live.includes("stamp"));
assert.ok(live.includes("upload_envelope"));
assert.ok(live.includes("health"));
assert.ok(live.includes("skill"));
for (const op of STUB_OPS.peacelock) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.peacelock.status, "live");
assert.equal(classifyCall(registry.bySlug.peacelock, "open").kind, "live");
assert.equal(classifyCall(registry.bySlug.peacelock, "seal").kind, "live");
assert.equal(classifyCall(registry.bySlug.peacelock, "break").kind, "live");
assert.equal(classifyCall(registry.bySlug.peacelock, "show").kind, "live");
assert.equal(classifyCall(registry.bySlug.peacelock, "verify").kind, "live");
assert.equal(classifyCall(registry.bySlug.peacelock, "transcript").kind, "stub");
assert.equal(classifyCall(registry.bySlug.peacelock, "transcribe").kind, "stub");
assert.equal(classifyCall(registry.bySlug.peacelock, "motive").kind, "stub");
assert.equal(classifyCall(registry.bySlug.peacelock, "counterfactual").kind, "stub");
assert.equal(classifyCall(registry.bySlug.peacelock, "invent").kind, "stub");
assert.equal(classifyCall(registry.bySlug.peacelock, "waive-duty").kind, "stub");
assert.equal(classifyCall(registry.bySlug.peacelock, "bypass-duty").kind, "stub");

assert.equal(detectHardDuty({ hard_duty: true }).hit, true);
assert.equal(detectHardDuty({ duty_class: "subpoena" }).hit, true);
assert.equal(detectHardDuty({ waive_duty: true }).hit, true);
assert.ok(HARD_DUTY_CLASSES.includes("imminent_harm"));
assert.equal(detectHardDuty({ scope: "silence" }).hit, false);
assert.deepEqual(collectInventedKeys({ transcript: "hello" }), ["transcript"]);
assert.deepEqual(collectInventedKeys({ transcript: ABSENT, motive: ABSENT }), []);
assert.ok(collectInventedKeys({ why: "because I felt like it" }).includes("why->motive"));

const opened = await openLattice({ scope: "silence", subject: "chamber-1" });
assert.equal(opened.ok, true);
assert.equal(opened.code, "PL-OK");
assert.equal(opened.receipt.kind, "open");
assert.equal(opened.receipt.transcript, ABSENT);
assert.equal(opened.receipt.counterfactual, ABSENT);
assert.equal(opened.receipt.motive, ABSENT);
assert.equal(opened.receipt.hard_duty, "false");
assert.match(opened.receipt.hash, /^[a-f0-9]{64}$/);
assert.equal(opened.true_engine_runtime, true);

const hardOpen = await openLattice({ scope: "silence", hard_duty: true });
assert.equal(hardOpen.ok, false);
assert.equal(hardOpen.code, "PL-HARD-DUTY");
assert.equal(hardOpen.refused, true);

const inventOpen = await openLattice({ scope: "silence", transcript: "I would have said no" });
assert.equal(inventOpen.ok, false);
assert.equal(inventOpen.code, "PL-ABSENT");

const motiveOpen = await openLattice({ scope: "silence", why: "fear" });
assert.equal(motiveOpen.ok, false);
assert.equal(motiveOpen.code, "PL-ABSENT");

const sealed = await sealLattice({
  lattice: opened.lattice,
  kind: "chosen_silence",
});
assert.equal(sealed.ok, true, JSON.stringify(sealed));
assert.equal(sealed.receipt.kind, "chosen_silence");
assert.equal(sealed.receipt.transcript, ABSENT);
assert.equal(sealed.lattice.receipts.length, 2);

const hardSeal = await sealLattice({
  lattice: opened.lattice,
  kind: "chosen_silence",
  duty_class: "mandatory_report",
});
assert.equal(hardSeal.ok, false);
assert.equal(hardSeal.code, "PL-HARD-DUTY");

const inventSeal = await sealLattice({
  lattice: opened.lattice,
  kind: "chosen_inaction",
  counterfactual: "they would have left",
});
assert.equal(inventSeal.ok, false);
assert.equal(inventSeal.code, "PL-ABSENT");

const broken = await breakLattice({ lattice: sealed.lattice });
assert.equal(broken.ok, true, JSON.stringify(broken));
assert.equal(broken.receipt.kind, "seal_break");
assert.equal(broken.receipt.transcript, ABSENT);
assert.match(broken.note, /does not invent/i);

const inventBreak = await breakLattice({
  lattice: sealed.lattice,
  said: "then I spoke",
});
assert.equal(inventBreak.ok, false);
assert.equal(inventBreak.code, "PL-ABSENT");

const shown = await showLattice({ lattice: broken.lattice });
assert.equal(shown.ok, true);
assert.equal(shown.lattice.receipts.every((r) => r.transcript === ABSENT), true);

const inventShow = await showLattice({
  lattice: broken.lattice,
  motive: "anger",
});
assert.equal(inventShow.ok, false);
assert.equal(inventShow.code, "PL-ABSENT");
assert.equal(inventShow.lattice.receipts[0].motive, ABSENT);

const verified = await verifyLattice({ lattice: broken.lattice });
assert.equal(verified.ok, true);
assert.equal(verified.items, 3);
assert.equal(verified.errors.length, 0);

const tampered = JSON.parse(JSON.stringify(broken.lattice));
tampered.receipts[1].transcript = "invented speech";
const badVerify = await verifyLattice({ lattice: tampered });
assert.equal(badVerify.ok, false);
assert.equal(badVerify.code, "PL-CHAIN");
assert.ok(badVerify.errors.some((e) => /ABSENT|transcript/.test(e)));

const stamped = await stampEnvelope({ text: "public bytes only", subject: "note.txt" });
assert.equal(stamped.ok, true);
assert.match(stamped.file_sha256, /^[a-f0-9]{64}$/);
assert.equal(stamped.stored, false);
assert.equal(stamped.receipt.kind, "file_stamp");
assert.equal(stamped.receipt.transcript, ABSENT);

const inventStamp = await stampEnvelope({ text: "x", transcript: "not a hash of speech" });
assert.equal(inventStamp.ok, false);
assert.equal(inventStamp.code, "PL-ABSENT");

const localOpen = await executeLocal({
  slug: "peacelock",
  op: "open",
  payload: { scope: "silence", subject: "chamber-1" },
  ranIn: "aziel-runtime",
});
assert.equal(localOpen.mode, "local");
assert.equal(localOpen.true_engine_runtime, true);
assert.equal(localOpen.engine_digest, embeddedDigest("peacelock"));
assert.match(localOpen.engine_digest, /^[a-f0-9]{64}$/);
assert.equal(localOpen.status, 200);
const localBody = JSON.parse(localOpen.responseText);
assert.equal(localBody.ok, true);
assert.equal(localBody.receipt.transcript, ABSENT);

const localStubOp = await executeLocal({
  slug: "peacelock",
  op: "transcript",
  payload: {},
  ranIn: "aziel-runtime",
});
assert.equal(localStubOp.unsupported, true);

const handler = (await import("../src/index.js")).default.fetch;
const env = { SESSION: memorySessionNamespace({}) };
const origin = "https://aziel-runtime.example";

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

const doorOpen = await post("/v1/fraggate/call", {
  slug: "peacelock",
  op: "open",
  payload: { scope: "inaction", subject: "chamber-2" },
});
assert.equal(doorOpen.ok, true);
assert.equal(doorOpen.code, "FG-OK");
assert.equal(doorOpen.result.receipt.motive, ABSENT);

const doorSeal = await post("/v1/fraggate/call", {
  slug: "peacelock",
  op: "seal",
  payload: { lattice: doorOpen.result.lattice, kind: "chosen_inaction" },
});
assert.equal(doorSeal.ok, true, JSON.stringify(doorSeal));
assert.equal(doorSeal.result.receipt.kind, "chosen_inaction");

const doorDuty = await post("/v1/fraggate/call", {
  slug: "peacelock",
  op: "seal",
  payload: { lattice: doorOpen.result.lattice, kind: "chosen_silence", hard_duty: true },
});
assert.equal(doorDuty.ok, true);
assert.equal(doorDuty.result.ok, false);
assert.equal(doorDuty.result.code, "PL-HARD-DUTY");

const doorStub = await post("/v1/fraggate/call", { name: "PeaceLock", op: "transcript" });
assert.equal(doorStub.ok, false);
assert.equal(doorStub.code, "FG-STUB");

const health = await handler(new Request(origin + "/v1/health"), env);
const healthBody = await health.json();
assert.ok(healthBody.true_engine_slugs.includes("peacelock"));
assert.ok(healthBody.engine_slugs.includes("peacelock"));
assert.equal(healthBody.engines.peacelock.true_engine_runtime, true);
assert.equal(healthBody.engines.peacelock.mode, "local");
assert.equal(healthBody.engines.peacelock.engine_digest, embeddedDigest("peacelock"));
assert.deepEqual(healthBody.proxy_fallback_slugs, []);
assert.ok(!healthBody.proxy_fallback_ops.peacelock);

const llms = await (await handler(new Request(origin + "/llms.txt"), env)).text();
assert.match(llms, /PeaceLock/);
assert.match(llms, /PL-WP-0\.1/);

const openapi = await (await handler(new Request(origin + "/openapi.json"), env)).json();
assert.match(openapi.info.description, /PeaceLock/);

console.log(
  `ok peacelock ${product.version}: HARD_DUTY refuse, ABSENT invariants, lattice chain, FragGate live=${live.join(",")} stub=${STUB_OPS.peacelock.join(",")}`,
);

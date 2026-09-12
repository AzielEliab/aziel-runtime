/**
 * AZCoherence (AZC-0.1) engine invariants + FragGate allowlist.
 * Second-pass triad coherence. Never invents evidence. Confidence ≠ truth.
 * Not AKM-TRIAD fabric. Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { embeddedDigest } from "../src/engines/digest.js";
import { executeLocal } from "../src/engines/runner.js";
import { domainFields, MASTER_33_SLUGS } from "../src/domain-map.js";
import { AZCOHERENCE_CROSS_MAP, AZCLCE_CROSS_MAP } from "../src/cross-map.js";
import { softwareBucket, listSoftwareEntries } from "../src/software-catalog.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import {
  FLAG_DELTA,
  NEUTRALIZE_DELTA,
  STUB_REFUSE,
  VERSION,
  coherenceCheck,
  decideVerdict,
  neutralizeHallucination,
  scorePath,
  parsePath,
} from "../src/engines/azcoherence/engine.js";

resetLedger();

const product = PRODUCTS.find((p) => p.slug === "azcoherence");
assert.ok(product, "azcoherence is a catalog product");
assert.equal(product.name, "AZCoherence");
assert.equal(product.worker, "azcoherence-download-tracker");
assert.equal(product.github, "https://github.com/AzielEliab/AZCoherence");
assert.match(product.oneLine, /second-pass|coherence/i);
assert.doesNotMatch(product.oneLine, /runtime \d+\.\d+.*FragGate|FragGate.*runtime \d+\.\d+/);
assert.equal(product.doi, null);
assert.equal(product.version, VERSION);
assert.equal(softwareBucket(product.name, product.slug), "plain");

const catalogOps = new Set(product.ops.map((o) => o.op));
for (const op of ["health", "skill", "doctor", "verify", "review_triad", "alternate_score", "coherence_check", "neutralize_hallucination"]) {
  assert.ok(catalogOps.has(op), `catalog has ${op}`);
}

const live = LIVE_OPS.azcoherence;
for (const op of ["health", "skill", "doctor", "verify", "review_triad", "alternate_score", "coherence_check", "neutralize_hallucination"]) {
  assert.ok(live.includes(op), `LIVE_OPS has ${op}`);
}
for (const op of STUB_OPS.azcoherence) {
  assert.ok(!live.includes(op), `stub ${op} is not live`);
}
assert.deepEqual(STUB_OPS.azcoherence.slice().sort(), STUB_REFUSE.slice().sort());

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.azcoherence.status, "live");
assert.equal(classifyCall(registry.bySlug.azcoherence, "health").kind, "live");
assert.equal(classifyCall(registry.bySlug.azcoherence, "coherence_check").kind, "live");
assert.equal(classifyCall(registry.bySlug.azcoherence, "invent_evidence").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azcoherence, "truth_score").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azcoherence, "akm_calibrate").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azcoherence, "memory_observe").kind, "stub");

const domain = domainFields("azcoherence");
assert.equal(domain.placement, "scoring-review");
assert.equal(domain.domain, null);
assert.ok(!MASTER_33_SLUGS.includes("azcoherence"), "placement, not a 34th isolation software");

const agree = {
  r: "login button blue submit",
  d: "login form submits",
  p: "login button submits",
  alternate: { r: "login button blue submit", d: "login form submits", p: "login button submits" },
  evidence: ["posted R/D/P layers"],
  confidence: 0.6,
};
const pass = await coherenceCheck(agree);
assert.equal(pass.verdict, "PASS");
assert.equal(pass.schema, "azcoherence.receipt.v0.1");
assert.equal(pass.advisory, true);
assert.equal(pass.invents_evidence, false);
assert.equal(pass.akm_triad, false);
assert.equal(pass.confidence_is_not_truth, true);
assert.equal(pass.evidence_present, true);
assert.match(pass.receipt_sha256, /^[a-f0-9]{64}$/);
assert.equal(pass.author, "Aziel Eliab");

const diverge = await coherenceCheck({
  r: "login button blue submit",
  d: "login form submits",
  p: "login button submits",
  alternate: { r: "checkout cart orange", d: "payment vault encrypts", p: "unrelated mesh hop" },
  evidence: ["two scored paths"],
  confidence: 0.5,
});
assert.ok(diverge.delta == null || diverge.delta >= FLAG_DELTA);
assert.ok(diverge.verdict === "FLAG" || diverge.verdict === "NEUTRALIZE");

const noEvidence = await coherenceCheck({
  r: "alpha",
  d: "beta",
  p: "gamma",
  alternate: { r: "alpha", d: "beta", p: "gamma" },
  confidence: 0.9,
});
assert.equal(noEvidence.verdict, "NEUTRALIZE");
assert.ok(noEvidence.flags.includes("confidence_without_evidence"));

const refuse = await coherenceCheck({
  r: "a",
  d: "b",
  p: "c",
  alternate: { r: "a", d: "b", p: "c" },
  invent_evidence: true,
  truth_claim: true,
});
assert.equal(refuse.verdict, "REFUSE");
assert.equal(refuse.ok, false);

const scored = scorePath(parsePath({ r: "one two", d: "one two", p: "one two" }));
assert.equal(scored.has_layers, true);
assert.ok(scored.triple >= 0.99);
assert.equal(
  decideVerdict({
    primary: scored,
    alternate: scored,
    flags: [],
    invent: false,
    truthClaim: false,
    confidence: 0.4,
    evidence: ["layers"],
  }),
  "PASS",
);

const neu = await neutralizeHallucination({
  r: "login",
  d: "form",
  p: "submit",
  alternate: { r: "vault", d: "encrypt", p: "hop mesh" },
  confidence: 0.95,
});
assert.equal(neu.verdict, "NEUTRALIZE");
assert.equal(neu.neutralize.action, "cap_and_mark_advisory");
assert.ok(neu.neutralize.confidence_capped <= 0.5);
assert.equal(neu.neutralize.invents_evidence, false);

const localHealth = await executeLocal({ slug: "azcoherence", op: "health", payload: {}, ranIn: "aziel-runtime" });
assert.equal(localHealth.status, 200);
assert.equal(localHealth.true_engine_runtime, true);
assert.equal(localHealth.engine_digest, embeddedDigest("azcoherence"));
const healthBody = JSON.parse(localHealth.responseText);
assert.equal(healthBody.ok, true);
assert.equal(healthBody.door, "fraggate");
assert.equal(healthBody.mesh_enabled_default, false);
assert.equal(healthBody.author, "Aziel Eliab");
assert.ok(healthBody.live_ops.includes("coherence_check"));
assert.ok(healthBody.neighbors.includes("azclce"));
assert.ok(healthBody.neighbors.includes("azinterface"));
assert.ok(healthBody.cross_map);
assert.equal(healthBody.cross_map.domain, null);
assert.equal(healthBody.cross_map.placement, "scoring-review");
assert.equal(healthBody.worker_url, AZCOHERENCE_CROSS_MAP.worker_url);
assert.ok(healthBody.peers.some((p) => p.slug === "azclce" && p.role === "peer-scorer"));
assert.ok(healthBody.peers.some((p) => p.slug === "azinterface"));
assert.ok(healthBody.fabric_neighbors.some((p) => p.name === "AKM-TRIAD" && p.kind === "fabric"));
assert.ok(healthBody.hubs.includes("https://azieleliab.com"));
assert.match(healthBody.domain_note, /decisiongate\/forgereceipts/);

const localSkill = await executeLocal({ slug: "azcoherence", op: "skill", payload: {}, ranIn: "aziel-runtime" });
const skillBody = JSON.parse(localSkill.responseText);
assert.match(skillBody.markdown, /azclce|AZ-CLCE/);
assert.match(skillBody.markdown, /AZInterface|azinterface/);
assert.match(skillBody.markdown, /AKM-TRIAD/);
assert.match(skillBody.markdown, /LIVE_OPS/);

const localDoctor = await executeLocal({ slug: "azcoherence", op: "doctor", payload: {}, ranIn: "aziel-runtime" });
const doctorBody = JSON.parse(localDoctor.responseText);
assert.equal(doctorBody.doctor, true);
assert.ok(doctorBody.cross_map);
assert.match(doctorBody.note, /Peer AZ-CLCE|azclce/i);

const localVerify = await executeLocal({
  slug: "azcoherence",
  op: "verify",
  payload: agree,
  ranIn: "aziel-runtime",
});
const verifyBody = JSON.parse(localVerify.responseText);
assert.equal(verifyBody.op, "verify");
assert.ok(verifyBody.cross_map);
assert.ok(verifyBody.peers.some((p) => p.slug === "azclce"));

const localCheck = await executeLocal({
  slug: "azcoherence",
  op: "coherence_check",
  payload: agree,
  ranIn: "aziel-runtime",
});
assert.equal(localCheck.status, 200);
const checkBody = JSON.parse(localCheck.responseText);
assert.equal(checkBody.verdict, "PASS");
assert.ok(checkBody.receipt_sha256);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function post(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify(body),
    }),
    {},
  );
}

async function get(path) {
  return handler(new Request(origin + path, { headers: { "user-agent": "Mozilla/5.0" } }), {});
}

const fgHealth = await (await post("/v1/fraggate/call", { slug: "azcoherence", op: "health" })).json();
assert.equal(fgHealth.ok, true, JSON.stringify(fgHealth));
assert.equal(fgHealth.code, "FG-OK");
assert.equal(fgHealth.slug, "azcoherence");
assert.ok(fgHealth.result && fgHealth.result.ok);
assert.ok(fgHealth.engine && fgHealth.engine.engine_digest);

const fgCheck = await (
  await post("/v1/fraggate/call", { slug: "azcoherence", op: "coherence_check", payload: agree })
).json();
assert.equal(fgCheck.ok, true, JSON.stringify(fgCheck));
assert.equal(fgCheck.code, "FG-OK");
assert.equal(fgCheck.result.verdict, "PASS");
assert.match(fgCheck.result.receipt_sha256, /^[a-f0-9]{64}$/);
assert.equal(fgCheck.result.schema, "azcoherence.receipt.v0.1");

const fgStub = await (await post("/v1/fraggate/call", { slug: "azcoherence", op: "invent_evidence" })).json();
assert.equal(fgStub.ok, false);
assert.equal(fgStub.code, "FG-STUB");

const software = await (await get("/v1/software")).json();
const card = software.software.find((s) => s.slug === "azcoherence");
assert.ok(card, "GET /v1/software lists AZCoherence");
assert.equal(card.status, "live");
assert.equal(card.bucket, "plain");
assert.equal(card.name, "AZCoherence");
assert.equal(card.placement, "scoring-review");
assert.equal(card.domain, null);
assert.ok(card.cross_map);
assert.equal(card.cross_map.domain, null);
assert.equal(card.worker_url, AZCOHERENCE_CROSS_MAP.worker_url);
assert.ok(card.peers.some((p) => p.slug === "azclce" && p.role === "peer-scorer"));
assert.ok(card.peers.some((p) => p.slug === "azinterface"));
assert.ok(card.fabric_neighbors.some((p) => p.name === "AKM-TRIAD"));
assert.ok(card.hubs.includes("https://godlock.uk"));
assert.ok(software.tab_placement_slugs.includes("azcoherence"));

const clceCard = software.software.find((s) => s.slug === "azclce");
assert.ok(clceCard, "GET /v1/software lists AZ-CLCE");
assert.equal(clceCard.domain, "Language");
assert.equal(clceCard.domain_id, "04");
assert.ok(clceCard.cross_map);
assert.ok(clceCard.peers.some((p) => p.slug === "azcoherence" && p.role === "peer-reviewer"));
assert.equal(clceCard.worker_url, AZCLCE_CROSS_MAP.worker_url);
assert.equal(clceCard.cross_map.merged, false);

const catalog = await (await get("/v1/catalog.json")).json();
const catalogAzc = (catalog.products || []).find((p) => p.slug === "azcoherence");
const catalogClce = (catalog.products || []).find((p) => p.slug === "azclce");
assert.ok(catalogAzc && catalogAzc.cross_map);
assert.ok(catalogClce && catalogClce.peers.some((p) => p.slug === "azcoherence"));

const described = await (await get("/v1/fraggate/describe?slug=azcoherence")).json();
assert.equal(described.ok, true);
assert.ok(described.cross_map);
assert.equal(described.placement, "scoring-review");
assert.ok(described.peers.some((p) => p.slug === "azclce"));

const clceHealth = await executeLocal({ slug: "azclce", op: "health", payload: {}, ranIn: "aziel-runtime" });
const clceHealthBody = JSON.parse(clceHealth.responseText);
assert.ok(clceHealthBody.neighbors.includes("azcoherence"));
assert.ok(clceHealthBody.peers.some((p) => p.slug === "azcoherence"));

const azbotSkill = await executeLocal({ slug: "azbot", op: "skill", payload: {}, ranIn: "aziel-runtime" });
const azbotSkillBody = JSON.parse(azbotSkill.responseText);
assert.match(azbotSkillBody.markdown, /azcoherence/);
assert.match(azbotSkillBody.markdown, /LIVE_OPS/);
assert.match(azbotSkillBody.markdown, /coherence_check/);

const plains = software.software.filter((s) => s.bucket === "plain").map((s) => s.name);
const plainsSorted = plains.slice().sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
assert.deepEqual(plains, plainsSorted, "Plain A–Z includes AZCoherence");

const entries = listSoftwareEntries(PRODUCTS, origin);
assert.ok(entries.some((e) => e.slug === "azcoherence" && e.bucket === "plain" && e.status === "live"));

const mesh = await (await get("/v1/mesh")).json();
assert.equal(mesh.enabled, true);
assert.equal(mesh.mesh_default, "on");
assert.equal(mesh.get_never_enables, true);

assert.ok(NEUTRALIZE_DELTA > FLAG_DELTA);
console.log("ok AZCoherence engine catalog FragGate coherence receipt Plain A–Z");

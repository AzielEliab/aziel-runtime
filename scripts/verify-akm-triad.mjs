/**
 * AKM-TRIAD-1.0 — unit / property / security tests from paper §17.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import {
  applyOutcome,
  brierScore,
  computeTriadScore,
  confidenceClass,
  evidenceWeight,
  posteriorReliability,
  rebuildPosterior,
} from "../src/chainlock/adaptive.js";
import { append, loadChain, recall, saveChain, stampSha256, verify } from "../src/chainlock/ops.js";
import { storeFor } from "../src/chainlock/store.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall, parseTarget } from "../src/fraggate/registry.js";
import { fraggateCall } from "../src/fraggate/door.js";
import { boundMemoryMeta } from "../src/memory/meta.js";
import { USE_CASES } from "../src/memory/calibration-manifest.js";
import { assembleTriadDecision, selectThreeOfFour } from "../src/memory/triad.js";
import * as zionProvider from "../src/memory/providers/zionpattern.js";
import {
  AKM_SPEC,
  MEMORY_SLUG,
  adaptiveRecall,
  calibrate,
  contradict,
  explain,
  feedback,
  getNode,
  observe,
  providersFor,
  rebuildFromLearn,
  rebuildIndex,
  resetMemoryIndexForTests,
  resolve,
  runMemoryOp,
  supersede,
} from "../src/memory.js";
import { resetRoseClockForTests, tipOf } from "../src/roseclock/engine.js";
import { listSoftwareEntries } from "../src/software-catalog.js";
import { registryFor } from "../src/mcp-surface.js";

resetMemoryIndexForTests();
resetRoseClockForTests();

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = {};

function freshEnv() {
  return {};
}

// --- not a Softwares-tab product ---
assert.equal(AKM_SPEC, "AKM-TRIAD-1.0");
assert.ok(!PRODUCTS.some((p) => p.slug === "memory"));
assert.ok(!listSoftwareEntries(PRODUCTS).some((s) => s.slug === "memory"));
for (const forbidden of ["akm", "akm-triad", "adaptive-memory"]) {
  assert.ok(!PRODUCTS.some((p) => p.slug === forbidden), `${forbidden} is not a PRODUCTS slug`);
  assert.ok(!listSoftwareEntries(PRODUCTS).some((s) => s.slug === forbidden), `${forbidden} is not Softwares-tab`);
}
assert.ok(LIVE_OPS.memory.includes("observe"));
assert.ok(LIVE_OPS.memory.includes("calibrate"));
assert.ok(STUB_OPS.memory.includes("model_update"));
assert.ok(STUB_OPS.memory.includes("rollback"));
const registry = buildRegistry(PRODUCTS);
const memEntry = registry.entries.find((e) => e.slug === MEMORY_SLUG);
assert.ok(memEntry);
assert.equal(memEntry.software_tab, false);
assert.equal(memEntry.kind, "kernel");
assert.equal(classifyCall(memEntry, "model_update").kind, "stub");
assert.equal(parseTarget({ slug: "akm-triad", op: "recall" }, registry, {}).slug, "memory");

// --- Bayesian math ---
assert.equal(evidenceWeight([0.1]) < evidenceWeight([0.9]), true);
const low = rebuildPosterior([{ kind: "memory_resolution", outcome: 1, weight: evidenceWeight([0.1]) }]);
const high = rebuildPosterior([{ kind: "memory_resolution", outcome: 1, weight: evidenceWeight([0.9]) }]);
assert.ok(high.probability > low.probability, "high-quality evidence moves posterior more");

const unknown = rebuildPosterior([
  { kind: "memory_resolution", outcome: "UNKNOWN", outcome_label: "UNKNOWN", weight: 2 },
  { kind: "memory_resolution", outcome: 1, weight: 1, ai_generated: true },
  { kind: "memory_resolution", outcome: 0, weight: 1, self_corroboration: true },
]);
assert.equal(unknown.applied, 0);
assert.equal(unknown.probability, 0.5);
assert.equal(unknown.unknown, 1);
assert.equal(unknown.belief_is_not_truth, true);

const skipped = applyOutcome({ alpha: 1, beta: 1 }, null, 2);
assert.equal(skipped.skipped, true);
assert.equal(skipped.reason, "UNKNOWN");

const dedup = rebuildPosterior([
  { kind: "memory_resolution", outcome: 1, weight: 1, evidence_hash: "same-ev" },
  { kind: "memory_resolution", outcome: 1, weight: 1, evidence_hash: "same-ev" },
]);
assert.equal(dedup.applied, 1);

const replayA = [
  { kind: "memory_resolution", outcome: 1, weight: 1.2, evidence_hash: "e1" },
  { kind: "memory_resolution", outcome: 0, weight: 0.8, evidence_hash: "e2" },
];
const r1 = rebuildPosterior(replayA);
const r2 = rebuildPosterior(replayA);
assert.equal(r1.alpha, r2.alpha);
assert.equal(r1.beta, r2.beta);
assert.equal(r1.probability, r2.probability);

const tiny = rebuildPosterior([{ kind: "memory_resolution", outcome: 1, weight: 2 }]);
assert.ok(tiny.effective_observations < 4);
assert.ok(tiny.reliability < tiny.probability, "small N cannot present a high posterior as mature");
assert.equal(confidenceClass(90, tiny.effective_observations), "LOW");
assert.ok(posteriorReliability(tiny.alpha, tiny.beta) < 0.9);

const brier = brierScore([
  { predicted: 0.7, observed: 1 },
  { predicted: 0.7, observed: 0 },
]);
assert.equal(Number(brier.toFixed(4)), 0.29);

const triadMath = computeTriadScore(["E", "C", "B"], { E: 0.82, C: 0.74, B: 0.68 }, { E: 1, C: 1, B: 1 }, 1);
assert.equal(triadMath.ok, true);
assert.ok(triadMath.triad_score > 0 && triadMath.triad_score <= 100);
assert.ok(triadMath.component_scores.E != null && triadMath.component_scores.C != null && triadMath.component_scores.B != null);

// --- 3-of-4 selector ---
const incomplete = selectThreeOfFour(USE_CASES.forensic_evidence, { E: 0, C: 0, P: 0, B: 0 }, 0);
assert.equal(incomplete.ok, false);
assert.equal(incomplete.state, "TRIAD_INCOMPLETE");
assert.equal(incomplete.selected.length, 0);

const forensic = selectThreeOfFour(USE_CASES.forensic_evidence, { E: 0.8, C: 0.85, P: 0.8, B: 0.05 }, 0);
assert.equal(forensic.ok, true);
assert.equal(forensic.selected.length, 3);
assert.equal(new Set(forensic.selected).size, 3);
assert.equal(forensic.omitted, "B");
assert.match(forensic.omission_reason, /sparse|suitability|B/i);

const shop1 = assembleTriadDecision({
  use_case: USE_CASES.forensic_evidence,
  availability: { E: 0.8, C: 0.85, P: 0.8, B: 0.05 },
  channel_scores: { E: 0.1, C: 0.1, P: 0.1, B: 0.99 },
  effective_observations: 0,
});
const shop2 = assembleTriadDecision({
  use_case: USE_CASES.forensic_evidence,
  availability: { E: 0.8, C: 0.85, P: 0.8, B: 0.05 },
  channel_scores: { E: 0.99, C: 0.99, P: 0.99, B: 0.01 },
  effective_observations: 0,
});
assert.deepEqual([...shop1.selected].sort(), [...shop2.selected].sort());
assert.equal(shop1.omitted, shop2.omitted);
assert.equal(shop1.authorizes_action, false);
assert.equal(shop1.belief_is_not_truth, true);

const opsFeatures = await providersFor(USE_CASES.operational_decision, {
  fact: "repeated operational forecast claim",
  subject: "forecast-a",
});
assert.ok(!opsFeatures.invoked.includes("spre"), "unrelated use case must not invoke SPRE");
assert.ok(!opsFeatures.invoked.includes("zionpattern"), "unrelated use case must not invoke ZionPattern");
assert.ok(!opsFeatures.invoked.includes("clce"), "CLCE stays dark without R/D/P layers");

const zion = await zionProvider.score({ answers: { a: 1 }, document: "cold case notes" });
assert.ok(zion.score <= 0.75);
assert.equal(zion.domain_cap, 0.75);

// --- privacy ---
const stripped = boundMemoryMeta({
  memory_id: "akm_x",
  kind: "memory_observation",
  secret: "hunter2",
  token: "abc-token",
  password: "p@ss",
  raw: "SENSITIVE-RAW",
  fact: "public fact",
});
const strippedJson = JSON.stringify(stripped);
assert.doesNotMatch(strippedJson, /hunter2|abc-token|p@ss|SENSITIVE-RAW/);

// --- append-only + existing ChainLock hashes unchanged ---
const pre = await append(env, { c: "session", k: "stamp", subject: "pre-akm", fact: "existing fact before adaptive memory" });
assert.equal(pre.ok, true);
const preHash = pre.stamp.stamp_sha256;
assert.equal(await stampSha256(pre.stamp), preHash);
assert.equal(pre.stamp.memory, undefined);

const obs = await observe(env, {
  subject: "claim-H",
  fact: "claim H about a repeated operational decision",
  use_case: "operational_decision",
  completeness: 0.8,
  provenance: 0.7,
});
assert.equal(obs.ok, true, JSON.stringify(obs));
assert.equal(obs.belief_is_not_truth, true);
assert.equal(obs.roseclock.rollback, false);
const learnHash = obs.chainlock.h;
const learnRowsAfterObs = await loadChain(storeFor(env), "learn");
const firstLearn = learnRowsAfterObs.find((r) => r.stamp_sha256 === learnHash);
assert.ok(firstLearn);
assert.equal(await stampSha256(firstLearn), learnHash);

const sessionRows = await loadChain(storeFor(env), "session");
assert.equal(sessionRows[0].stamp_sha256, preHash);
assert.equal(await stampSha256(sessionRows[0]), preHash);

const unknownRes = await resolve(env, {
  subject: "claim-H",
  memory_id: obs.memory_id,
  outcome: "UNKNOWN",
  outcome_label: "UNKNOWN",
});
assert.equal(unknownRes.ok, true);
let node = getNode(obs.memory_id);
assert.equal(node.posterior_probability, 0.5);
assert.equal(node.effective_observations, 0);

const missRefuse = await resolve(env, {
  subject: "claim-H",
  memory_id: obs.memory_id,
  outcome: "UNKNOWN",
  treat_unknown_as_miss: true,
});
assert.equal(missRefuse.ok, false);
assert.equal(missRefuse.code, "AKM-UNKNOWN");

const res1 = await resolve(env, {
  subject: "claim-H",
  memory_id: obs.memory_id,
  outcome: 1,
  weight: 1.2,
  evidence_hash: "ev-1",
  completeness: 0.9,
});
assert.equal(res1.ok, true);
node = getNode(obs.memory_id);
assert.ok(node.posterior_probability > 0.5);
const afterResolveHash = firstLearn.stamp_sha256;
assert.equal(await stampSha256(firstLearn), afterResolveHash);

const cal = await calibrate(env, {
  subject: "claim-H",
  memory_id: obs.memory_id,
  use_case: "operational_decision",
  completeness: 0.82,
  provenance: 0.74,
  r: "ops report",
  d: "ops description",
  p: "ops practice",
});
assert.equal(cal.ok, true, JSON.stringify(cal));
assert.ok(cal.triad);
assert.equal(cal.authorizes_action, false);
assert.equal(cal.belief_is_not_truth, true);
if (cal.triad.ok) {
  assert.equal(cal.triad.selected.length, 3);
  assert.ok(cal.triad.omitted);
  assert.ok(cal.triad.omission_reason);
  assert.ok(cal.triad.component_scores);
}
const stillFirst = (await loadChain(storeFor(env), "learn")).find((r) => r.stamp_sha256 === learnHash);
assert.equal(stillFirst.stamp_sha256, learnHash);
assert.equal(JSON.stringify(stillFirst), JSON.stringify(firstLearn));
assert.equal(await stampSha256(sessionRows[0]), preHash);

// normal recall/verify untouched
const rawRecall = await recall(env, { q: "claim H", depth: 5, c: "learn" });
assert.equal(rawRecall.ok, true);
assert.equal(rawRecall.adaptive, undefined);

const verified = await verify(env, {});
assert.equal(verified.ok, true);

const adapted = await adaptiveRecall(env, { q: "claim H", use_case: "operational_decision", capabilities: ["MODEL_UPDATE"] });
assert.equal(adapted.ok, true);
assert.equal(adapted.adaptive, true);
assert.equal(adapted.authorizes_action, false);
assert.equal(adapted.belief_is_not_truth, true);
assert.ok(adapted.facts.length >= 1);

const noModel = await calibrate(env, {
  subject: "claim-H",
  memory_id: obs.memory_id,
  capabilities: ["MODEL_UPDATE"],
});
assert.equal(noModel.ok, false);
assert.equal(noModel.code, "AKM-NO-AUTO-MODEL");

const stub = await runMemoryOp("model_update", { subject: "claim-H" }, env);
assert.equal(stub.ok, false);
assert.equal(stub.code, "AKM-STUB");

const fb = await feedback(env, { subject: "claim-H", memory_id: obs.memory_id, useful: true });
assert.equal(fb.ok, true);
const afterFb = getNode(obs.memory_id);
assert.equal(afterFb.posterior_probability, node.posterior_probability);

const hist = await explain(obs.memory_id, "history");
assert.ok(hist.events.some((e) => e.k === "memory_observation"));
assert.ok(hist.events.some((e) => e.k === "memory_resolution"));
const calibView = await explain(obs.memory_id, "calibration");
assert.ok("posterior_probability" in calibView);
assert.ok("effective_observations" in calibView);
assert.ok("latest_triad" in calibView);

// supersession: new event; old memory remains queryable
const sup = await supersede(env, {
  subject: "claim-H",
  memory_id: obs.memory_id,
  successor_subject: "claim-H-v2",
  successor_fact: "newer interpretation of claim H",
});
assert.equal(sup.ok, true);
const oldNode = await explain(obs.memory_id, "get");
assert.equal(oldNode.status, "SUPERSEDED");
const oldHist = await explain(obs.memory_id, "history");
assert.ok(oldHist.events.some((e) => e.k === "memory_supersede"));
assert.ok(oldHist.ok);

const contra = await contradict(env, { subject: "claim-H-v2", fact: "conflicting note" });
assert.equal(contra.ok, true);
assert.equal(getNode(contra.memory_id).status, "CONTESTED");

// rebuild index hash identical after delete+replay
const beforeRebuild = getNode(obs.memory_id);
assert.ok(beforeRebuild.index_hash);
resetMemoryIndexForTests();
assert.equal(getNode(obs.memory_id), null);
const rebuilt = await rebuildFromLearn(env);
assert.equal(rebuilt.ok, true);
const afterRebuild = getNode(obs.memory_id);
assert.equal(afterRebuild.index_hash, beforeRebuild.index_hash);
assert.equal(afterRebuild.status, "SUPERSEDED");

const localRebuild = await rebuildIndex(env, { local: true }, null);
assert.equal(localRebuild.ok, true);
const publicRebuild = await rebuildIndex(env, {}, new Request(origin + "/v1/memory/rebuild-index", { method: "POST" }));
assert.equal(publicRebuild.ok, false);
assert.equal(publicRebuild.code, "AKM-OPERATOR");

// concurrency: two calibrations against the same RoseClock tip
const tip = tipOf("aziel-runtime", "akm");
assert.ok(tip && tip.state_hash);
const c1 = await calibrate(env, {
  subject: "claim-H",
  memory_id: obs.memory_id,
  expected_rose_tip: tip.state_hash,
  completeness: 0.7,
  provenance: 0.7,
});
assert.equal(c1.ok, true, JSON.stringify(c1));
const c2 = await calibrate(env, {
  subject: "claim-H",
  memory_id: obs.memory_id,
  expected_rose_tip: tip.state_hash,
  completeness: 0.7,
  provenance: 0.7,
});
assert.equal(c2.ok, false);
assert.equal(c2.code, "AKM-CONFLICT");

// tamper of memory metadata breaks stamp verify
const tamperEnv = freshEnv();
const tObs = await observe(tamperEnv, { subject: "tamper-s", fact: "tamper fact for hash protection" });
assert.equal(tObs.ok, true);
const tRows = await loadChain(storeFor(tamperEnv), "learn");
assert.ok(tRows.length);
const victim = tRows[tRows.length - 1];
const mutated = { ...victim, memory: { ...victim.memory, retrieval_weight: 0.99 } };
assert.notEqual(await stampSha256(mutated), victim.stamp_sha256);
tRows[tRows.length - 1] = mutated;
await saveChain(storeFor(tamperEnv), "learn", tRows);
const broken = await verify(tamperEnv, { c: "learn" });
assert.equal(broken.ok, false);
assert.ok(broken.breaks.some((b) => b.reason === "stamp-hash-miss"));

const closed = await adaptiveRecall(tamperEnv, { q: "tamper" });
assert.equal(closed.ok, false);
assert.equal(closed.code, "CHAIN_VERIFY_FAIL");

// FragGate single door + HTTP explainability
const fg = await fraggateCall(
  { slug: "memory", op: "observe", payload: { subject: "fg-claim", fact: "frag gate observe fact" } },
  registryFor(PRODUCTS),
  {},
  env,
);
assert.equal(fg.ok, true, JSON.stringify(fg));
assert.equal(fg.slug, "memory");
assert.ok(fg.result && fg.result.ok);

const stubFg = await fraggateCall({ slug: "memory", op: "rollback", payload: {} }, registryFor(PRODUCTS), {}, env);
assert.equal(stubFg.ok, false);

const health = await handler(new Request(origin + "/v1/memory"), {});
assert.equal(health.status, 200);
const healthBody = await health.json();
assert.equal(healthBody.spec, "AKM-TRIAD-1.0");
assert.equal(healthBody.software_tab, false);

const getMem = await handler(new Request(origin + `/v1/memory/${obs.memory_id}`), env);
assert.equal(getMem.status, 200);
const got = await getMem.json();
assert.equal(got.memory_id, obs.memory_id);

const getCal = await handler(new Request(origin + `/v1/memory/${obs.memory_id}/calibration`), env);
assert.equal(getCal.status, 200);
const calBody = await getCal.json();
assert.ok("posterior_probability" in calBody);
assert.ok("effective_observations" in calBody);

const mcpList = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  }),
  {},
);
const toolNames = (await mcpList.json()).result.tools.map((t) => t.name);
assert.ok(toolNames.includes("memory_recall"));
assert.ok(toolNames.includes("memory_get"));

console.log("ok akm-triad Bayesian 3-of-4 rebuild tamper concurrency privacy FragGate");

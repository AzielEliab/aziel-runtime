/**
 * RIB-068 / AZRT-MODEL-PROVENANCE-1.0: model-backed receipts record the requested alias
 * plus the provider model id and version. A version change under that alias seals a finding.
 * Non-model calls omit the fields. Old receipts verify unchanged. Not LIVE.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAP7_LOCKS, PAID_SATELLITE_HELD } from "../src/qnm-honesty.js";
import {
  MODEL_PROVENANCE_LIVE,
  checkModelVersion,
  modelCallFields,
  modelProvenance,
  sealModelFinding,
} from "../src/model-provenance.js";
import { appendLedger, currentLedger, ledgerTipView, resetLedger, verifyLedger } from "../src/fraggate/ledger.js";
import {
  applyOpen,
  canonicalize,
  commitExec,
  newSessionId,
  openSession,
  recordIntent,
  sha256Hex,
  verifyChainStrict,
} from "../src/session-core.js";

let n = 0;
const HEX = /^[0-9a-f]{64}$/;
const now = new Date().toISOString();

assert.equal(MODEL_PROVENANCE_LIVE, false);
assert.equal(CAP7_LOCKS.cap7_public_icann, false);
assert.equal(CAP7_LOCKS.public_icann, false);
assert.equal(CAP7_LOCKS.public_icann_registrar, false);
assert.equal(PAID_SATELLITE_HELD.held, true);
assert.equal(PAID_SATELLITE_HELD.live, false);
assert.equal(PAID_SATELLITE_HELD.purchased, false);
assert.equal(PAID_SATELLITE_HELD.spend, false);
n++;

const echoed = modelProvenance({
  request: { model: "fast" },
  response: { model: "fast", id: "chatcmpl-1" },
});
assert.equal(echoed, null); n++;
assert.equal(modelProvenance({ request: { requested_alias: "fast" }, response: { ok: true } }), null); n++;
assert.equal(
  modelProvenance({
    request: {},
    response: { model_id: "gpt-4.1-2026-10-01", model_version: "2026-10-01" },
  }),
  null,
); n++;
assert.equal(
  modelProvenance({
    request: { requested_alias: "fast" },
    response: { model_id: "https://provider.example/m", model_version: "1" },
  }),
  null,
); n++;
assert.equal(
  modelProvenance({
    request: { requested_alias: "fast" },
    response: { model_id: "1.2.3.4", model_version: "1" },
  }),
  null,
); n++;
assert.equal(
  modelProvenance({
    request: { requested_alias: "10.1.2.3" },
    response: { model_id: "local-core", model_version: "0" },
  }),
  null,
); n++;

const named = modelProvenance({
  request: { requested_alias: "desk.aziel" },
  response: { provider: { model: "local-core", model_version: "0" } },
});
assert.equal(named.requested_alias, "desk.aziel");
assert.equal(named.model_id, "local-core");
assert.equal(named.model_version, "0");
assert.notEqual(named.model_id, named.requested_alias);
assert.equal(named.model_basis.names_only, true);
assert.equal(named.model_basis.resolved, false);
n++;

const first = modelProvenance({
  request: { requested_alias: "fast" },
  response: { model_id: "gpt-4.1-2026-10-01", model_version: "2026-10-01", model: "fast" },
});
assert.equal(first.requested_alias, "fast");
assert.equal(first.model_id, "gpt-4.1-2026-10-01");
assert.equal(first.model_version, "2026-10-01");
assert.notEqual(first.model_id, first.requested_alias);
n++;
const second = modelProvenance({
  request: { payload: { model: "fast" } },
  response: { body: { provider: { model_id: "gpt-4.1-2026-11-02", model_version: "2026-11-02" } } },
});
assert.equal(second.requested_alias, "fast");
assert.equal(second.model_id, "gpt-4.1-2026-11-02");
assert.equal(second.model_version, "2026-11-02");
n++;

const quiet = await checkModelVersion([
  { seq: 1, hash: "a".repeat(64), ...first },
  { seq: 2, hash: "b".repeat(64), ...first, model_id: "gpt-4.1-same-day" },
]);
assert.equal(quiet.ok, true);
assert.equal(quiet.findings.length, 0);
assert.equal(quiet.live, false);
assert.equal(quiet.signed, false);
assert.equal(quiet.cap7_is_icann, false);
assert.equal(quiet.paid_satellite, "HELD");
n++;

const swapped = await checkModelVersion([
  { seq: 1, hash: "a".repeat(64), ...first },
  { seq: 2, event: "exec", payload: { intent: { slug: "timelock" } } },
  { seq: 3, hash: "c".repeat(64), ...second },
]);
assert.equal(swapped.ok, false);
assert.equal(swapped.status, "swap");
assert.equal(swapped.findings.length, 1);
assert.equal(swapped.findings[0].code, "MODEL-VERSION-SWAP");
assert.equal(swapped.findings[0].requested_alias, "fast");
assert.equal(swapped.findings[0].model_id, "gpt-4.1-2026-11-02");
assert.equal(swapped.findings[0].model_version, "2026-11-02");
assert.equal(swapped.findings[0].prev_model_version, "2026-10-01");
assert.equal(swapped.findings[0].signed, false);
assert.match(swapped.findings[0].hash, HEX);
assert.equal(swapped.errors[0].error, "MODEL-VERSION-SWAP");
const { hash: findingHash, ...findingBody } = swapped.findings[0];
assert.equal(await sha256Hex(canonicalize(findingBody)), findingHash);
assert.equal(JSON.stringify(swapped.findings[0]).includes("signature"), false);
n++;

const otherAlias = await checkModelVersion([
  { seq: 1, hash: "a".repeat(64), ...first },
  { seq: 2, hash: "d".repeat(64), ...second, requested_alias: "slow" },
]);
assert.equal(otherAlias.ok, true);
assert.equal(otherAlias.findings.length, 0);
n++;

const sealed = await sealModelFinding(
  { ...first, hash: "a".repeat(64) },
  second,
);
const honest = await checkModelVersion([
  { seq: 1, hash: "a".repeat(64), ...first },
  { seq: 2, hash: "e".repeat(64), ...second, model_finding: sealed },
]);
assert.equal(honest.ok, false);
assert.equal(honest.errors.some((e) => e.error === "MODEL-FINDING-TAMPER"), false);
assert.equal(honest.findings[0].hash, sealed.hash);
n++;
const tampered = await checkModelVersion([
  { seq: 1, hash: "a".repeat(64), ...first },
  { seq: 2, hash: "e".repeat(64), ...second, model_finding: { ...sealed, hash: "0".repeat(64) } },
]);
assert.equal(tampered.ok, false);
assert.equal(tampered.errors.some((e) => e.error === "MODEL-FINDING-TAMPER"), true);
n++;

const partial = await checkModelVersion([{ seq: 1, requested_alias: "fast", model_id: "only-id" }]);
assert.equal(partial.ok, false);
assert.equal(partial.errors[0].error, "MODEL-PROVENANCE-PARTIAL");
assert.match(partial.findings[0].hash, HEX);
assert.equal(partial.findings[0].signed, false);
n++;

const none = await checkModelVersion([{ seq: 1, event: "exec" }, { seq: 2, event: "close" }]);
assert.equal(none.ok, null);
assert.equal(none.status, "not_checked");
assert.equal(none.checked, 0);
n++;

const fixture = JSON.parse(readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
const old = await verifyChainStrict(fixture.receipts);
assert.equal(old.ok, true, JSON.stringify(old.errors));
assert.equal(old.model_provenance.status, "not_checked");
assert.equal(old.model_provenance.checked, 0);
for (const rec of fixture.receipts) {
  assert.equal(rec.requested_alias, undefined);
  assert.equal(rec.model_id, undefined);
  assert.equal(rec.model_version, undefined);
}
n++;

resetLedger();
await appendLedger({ asked: true, refused: false, code: "FG-OK", name: "TimeLock", op: "now" });
const plain = currentLedger().entries[0];
assert.equal("requested_alias" in plain, false);
assert.equal("model_id" in plain, false);
assert.equal("model_version" in plain, false);
assert.equal("model_finding" in plain, false);
assert.equal("requested_alias" in ledgerTipView(), false);
const plainVerify = await verifyLedger(currentLedger());
assert.equal(plainVerify.ok, true);
assert.equal(plainVerify.model_provenance.status, "not_checked");
assert.equal(Object.keys(plainVerify)[1], "server_drift_status");
n++;

resetLedger();
const prior = [];
const rowA = await modelCallFields({
  request: { requested_alias: "fast" },
  response: { model_id: "gpt-4.1-2026-10-01", model_version: "2026-10-01" },
  prior,
});
assert.equal(rowA.model_finding, undefined);
await appendLedger({ asked: true, refused: false, code: "FG-OK", name: "AZAI", op: "guide", ...rowA });
const rowB = await modelCallFields({
  request: { requested_alias: "fast" },
  response: { model_id: "gpt-4.1-2026-11-02", model_version: "2026-11-02" },
  prior: currentLedger().entries,
});
assert.equal(rowB.model_finding.code, "MODEL-VERSION-SWAP");
assert.equal(rowB.model_finding.signed, false);
assert.match(rowB.model_finding.hash, HEX);
assert.notEqual(rowB.model_id, rowB.requested_alias);
await appendLedger({ asked: true, refused: false, code: "FG-OK", name: "AZAI", op: "guide", ...rowB });
const led = await verifyLedger(currentLedger());
assert.equal(led.ok, false);
assert.equal(led.model_provenance_status, "swap");
assert.equal(led.breaks.length, 0);
assert.equal(led.model_provenance.findings[0].hash, rowB.model_finding.hash);
assert.equal(ledgerTipView().requested_alias, "fast");
assert.equal(ledgerTipView().model_version, "2026-11-02");
assert.equal(ledgerTipView().model_finding.code, "MODEL-VERSION-SWAP");
n++;

function session() {
  return openSession({ id: newSessionId(), now, version: "test", source: "test" });
}
const engine = {
  mode: "local",
  true_engine_runtime: true,
  engine_digest: "e".repeat(64),
  engine_slug: "timelock",
  engine_op: "now",
};
async function exec(s, additive) {
  const payloadText = JSON.stringify({ requested_alias: additive && additive.requested_alias });
  const recorded = await recordIntent(s, { slug: "timelock", op: "now", payload: {}, payloadText }, now);
  return commitExec(
    s,
    {
      intent: recorded.intent,
      status: 200,
      latencyMs: 1,
      requestDigest: "aa",
      responseDigest: "bb",
      error: null,
      upstream: null,
      responseBytes: 2,
      contentType: "application/json",
      engine,
      additive,
    },
    now,
  );
}

{
  const s = session();
  await applyOpen(s, now);
  await exec(s, null);
  const bare = s.receipts[s.receipts.length - 1];
  assert.equal(bare.event, "exec");
  assert.equal("requested_alias" in bare, false);
  assert.equal("model_id" in bare, false);
  assert.equal("model_version" in bare, false);
  assert.equal("model_finding" in bare, false);
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.model_provenance.status, "not_checked");
  n++;
}

{
  const s = session();
  await applyOpen(s, now);
  const r1 = await exec(s, { ...first, model_finding: { hash: "f".repeat(64), code: "MODEL-VERSION-SWAP" } });
  assert.equal(r1.requested_alias, "fast");
  assert.equal(r1.model_id, "gpt-4.1-2026-10-01");
  assert.equal(r1.model_version, "2026-10-01");
  assert.equal(r1.model_finding, undefined);
  assert.notEqual(r1.model_id, r1.requested_alias);
  const r2 = await exec(s, second);
  assert.equal(r2.model_version, "2026-11-02");
  assert.equal(r2.model_finding.code, "MODEL-VERSION-SWAP");
  assert.equal(r2.model_finding.signed, false);
  assert.equal(r2.model_finding.prev_receipt_hash, r1.hash);
  const { hash, signature, ...unsigned } = r2;
  assert.equal(await sha256Hex(canonicalize(unsigned)), hash);
  const { hash: fh, ...fb } = r2.model_finding;
  assert.equal(await sha256Hex(canonicalize(fb)), fh);
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, false);
  assert.equal(v.errors.some((e) => e.error === "MODEL-VERSION-SWAP" && e.requested_alias === "fast"), true);
  assert.equal(v.errors.some((e) => e.error === "MODEL-FINDING-TAMPER"), false);
  assert.equal(v.model_provenance.live, false);
  assert.equal(v.model_provenance.signed, false);
  n++;
}

{
  const s = session();
  await applyOpen(s, now);
  await exec(s, first);
  await exec(s, { ...first, model_id: "gpt-4.1-same-version" });
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.model_provenance.status, "verified");
  assert.equal(s.receipts.at(-1).model_id, "gpt-4.1-same-version");
  assert.equal(s.receipts.at(-1).model_finding, undefined);
  n++;
}

const src = readFileSync(new URL("../src/model-provenance.js", import.meta.url), "utf8");
assert.equal(src.includes("getaddrinfo"), false);
assert.equal(src.includes("fetch("), false);
assert.equal(src.includes("dns."), false);
n++;

console.log(`verify-model-provenance: ${n} checks ok (RIB-068 / AZRT-MODEL-PROVENANCE-1.0; hash-linked and sealed, not signed; not LIVE)`);

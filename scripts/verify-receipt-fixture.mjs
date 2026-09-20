/**
 * Offline receipt hash re-check. Does not hit the Worker.
 *
 *   node scripts/verify-receipt-fixture.mjs
 *
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalize, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { hashActReceipt } from "../src/library-receipts.js";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));

assert.ok(Array.isArray(fixture.receipts) && fixture.receipts.length >= 4, "fixture needs open/policy/exec/close");
assert.deepEqual(
  fixture.receipts.map((r) => r.event),
  ["open", "policy", "exec", "close"],
);

const chain = await verifyChainStrict(fixture.receipts);
assert.equal(chain.ok, true, JSON.stringify(chain.errors));

for (const rec of fixture.receipts) {
  const { hash, ...unsigned } = rec;
  const expected = await sha256Hex(canonicalize(unsigned));
  assert.equal(hash, expected, `session receipt seq ${rec.seq} hash mismatch`);
  assert.match(hash, /^[a-f0-9]{64}$/);
}

const mutated = structuredClone(fixture.receipts);
mutated[2].payload.result.status = 999;
const broken = await verifyChainStrict(mutated);
assert.equal(broken.ok, false);
assert.ok(broken.errors.some((e) => e.error === "hash_mismatch"));

const act = fixture.act_receipt;
assert.ok(act && act.hash && act.previous_hash && act.request && act.output && act.event);
const actAgain = await hashActReceipt({
  previous_hash: act.previous_hash,
  request: act.request,
  output: act.output,
  event: act.event,
});
assert.equal(act.hash, actAgain, "ACT-RECEIPT hash mismatch");

console.log(
  `ok receipt-fixture: ${fixture.receipts.length} session receipts + ACT-RECEIPT rehashed offline`,
);

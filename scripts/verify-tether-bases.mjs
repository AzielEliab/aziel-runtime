import assert from "node:assert/strict";
import { TETHER_BASES, tetherStatus } from "../src/azos-tether.js";
assert.deepEqual(TETHER_BASES.map((b) => b.base), ["internet", "mail_send", "kernel"]);
assert.ok(TETHER_BASES.every((b) => b.live === false && /^fraggate /.test(b.door) && b.proof_required));
const st = await tetherStatus({}, { fetcher: null });
assert.equal(st.bases_live, false); assert.equal(st.bases.length, 3); assert.equal(st.alt_internet_live, false);
console.log("verify-tether-bases: ok");
assert.ok(TETHER_BASES.filter((b) => b.self_test).every((b) => b.self_test.proves_live === false));
import("node:fs").then(({ readFileSync }) => {
  const lines = readFileSync(new URL("../docs/proofs/BASES-SELFTEST.jsonl", import.meta.url), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.ok(lines.length >= 1 && lines.every((l) => l.public_mail_send_live === false && l.kernel_live === false));
  console.log("verify-tether-bases: self-test log honest");
});

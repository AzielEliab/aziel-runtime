import assert from "node:assert/strict";
import { TETHER_BASES, tetherStatus } from "../src/azos-tether.js";
assert.deepEqual(TETHER_BASES.map((b) => b.base), ["internet", "mail_send", "kernel"]);
assert.ok(TETHER_BASES.every((b) => b.live === false && /^fraggate /.test(b.door) && b.proof_required));
const st = await tetherStatus({}, { fetcher: null });
assert.equal(st.bases_live, false); assert.equal(st.bases.length, 3); assert.equal(st.alt_internet_live, false);
console.log("verify-tether-bases: ok");

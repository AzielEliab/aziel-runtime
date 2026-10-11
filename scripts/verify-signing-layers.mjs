/** RECEIPT-SIGNING-LAYERS-1.0: README matches code. Receipts are not signed; signing sits at anchor/checkpoint/tether (+ mesh transport). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const readme = read("README.md");
let n = 0;
assert.match(readme, /## Receipts and signing \(RECEIPT-SIGNING-LAYERS-1\.0\)/); n++;
assert.match(readme, /hash-linked and sealed, not signed/); n++;
assert.match(readme, /RIB-001 external anchor is shipped/); n++;
assert.match(readme, /RIB-018 refusal receipts are shipped/); n++;
assert.match(read("docs/designs/AZRT-ANCHOR-1.0.md"), /Status: LIVE/); n++;
assert.match(read("docs/designs/AZRT-REFUSAL-RECEIPT-1.0.md"), /Status: LIVE/); n++;
// Receipt paths never sign.
const SIGN = /crypto\.subtle\.sign|\bsign(Object|Bytes|Statement|Packet)?\(|Ed25519/;
for (const f of ["src/session-core.js", "src/receipt-guard.js", "src/chainlock.js", "src/dual-lattice.js"]) {
  assert.equal(SIGN.test(read(f)), false, f + " signs; README says receipts are not signed");
  n++;
}
// The three named layers do sign.
for (const f of ["src/anchor.js", "src/checkpoints/checkpoint.js", "src/azos-tether.js"]) {
  assert.ok(/Ed25519|signature|\bsig\b/i.test(read(f)), f + " named as a signing layer but shows no signature");
  n++;
}
console.log(`ok signing layers: ${n} checks`);

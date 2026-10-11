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

// DOCS-WORDING-1.0: scan every Markdown doc. Receipts are hash-linked and sealed, never "signed
// receipts"; ledgers/receipts/events/evidence/stamps/state are "hash-linked, append-only", never "immutable".
{
  const { readdirSync, statSync } = await import("node:fs");
  const { join: pjoin } = await import("node:path");
  const md = [];
  const walk = (d) => { for (const e of readdirSync(d)) { const f = pjoin(d, e); if (e === "node_modules" || e.startsWith(".")) continue; if (statSync(f).isDirectory()) walk(f); else if (f.endsWith(".md") || (/\/src\//.test(f) && /\.(m?js)$/.test(f))) md.push(f); } };
  walk(new URL("..", import.meta.url).pathname);
  const bad = [];
  const SIGNED = /(?<!not )\bsigned receipts?\b/i;
  const IMM = [/\bimmutable\s+(timeline|timeslate|digital library|lattice)\b/i, /\bFragGate(\s+FG-[\d.]+)?\s+kernel\b/i, /\bimmutable\b(?:\s+[\w-]+,?){0,3}?\s+(ledger|receipts?|events?|evidence|stamps?|ingress)\b/i, /\b(state|ledger|receipts?|evidence)\s+(is|are|remains?)\s+(the\s+)?immutable\b/i];
  for (const f of md) {
    const t = readFileSync(f, "utf8").replace(/\s+/g, " ");
    if (SIGNED.test(t)) bad.push(f + ": signed receipts");
    for (const r of IMM) if (r.test(t)) bad.push(f + ": " + t.match(r)[0]);
  }
  assert.deepEqual(bad, [], "docs + src wording");
  assert.ok(md.length > 20, "scanned all docs");
  assert.ok(md.some((f) => /\/src\/engines\/staticclock\//.test(f)) && md.some((f) => /\/src\/engines\/temporallock\//.test(f)), "engines/ scanned");
  n++;
}
console.log(`ok signing layers: ${n} checks`);

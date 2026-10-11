/** CLIENT-EVIDENCE-1.0: no blanket LIVE; verified needs a real evidence file in the repo. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { clientMatrix, CLIENT_CLASS_IDS, CLIENT_EVIDENCE } from "../src/client-matrix.js";
const m = clientMatrix("https://x.example");
assert.equal(m.clients.length, CLIENT_CLASS_IDS.length);
assert.equal(m.clients.length, 17);
for (const c of m.clients) {
  assert.notEqual(c.status, "LIVE", c.id);
  assert.ok(["verified", "unverified"].includes(c.status), c.id);
  if (c.status === "verified") assert.ok(existsSync(new URL("../" + c.evidence, import.meta.url)), c.id + " evidence file missing");
}
for (const [id, path] of Object.entries(CLIENT_EVIDENCE)) assert.ok(existsSync(new URL("../" + path, import.meta.url)), id);
assert.equal(m.verified_count, m.clients.filter((c) => c.status === "verified").length);
assert.match(m.evidence_rule, /Mock tests/);
console.log(`ok client evidence: ${m.clients.length} clients, ${m.verified_count} verified`);

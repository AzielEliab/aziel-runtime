/**
 * RE-EXPAND-1.0: bytes survive, not summaries. Restore from archive
 * after prev-hash verify. Not mesh from index. Crawlers extra shelves.
 * Training residue is rumor.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryStore } from "../src/chainlock/store.js";
import { append } from "../src/chainlock/ops.js";
import { seal, verify as verifyLockset } from "../src/lockset.js";
import { MESH_LIMITATION, resetMeshStore, runMeshOp } from "../src/mesh.js";
import {
  RE_EXPAND,
  RE_EXPAND_LAW,
  RE_EXPAND_SHORT,
  crawlerShelf,
  meshFromIndex,
  reExpandFromArchive,
  trainingResidue,
} from "../src/re-expand.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const files = [
  "docs/NODE_MESH.md",
  "docs/designs/NODE-OPS-1.0.md",
  "docs/designs/QNM-WP-1.0.md",
  "docs/designs/LS-WP-0.1.md",
  "docs/designs/README.md",
  "src/mesh.js",
  "src/lockset.js",
  "src/re-expand.js",
];
for (const rel of files) {
  const text = read(rel);
  assert.match(text, /[Rr]e-expand/, rel);
  assert.match(text, /bytes survive, not summaries/i, rel);
}

assert.equal(RE_EXPAND, "RE-EXPAND-1.0");
assert.equal(RE_EXPAND_LAW.mesh_from_index, false);
assert.equal(RE_EXPAND_LAW.summaries_survive, false);
assert.match(RE_EXPAND_SHORT, /Not mesh from index/);
assert.match(MESH_LIMITATION, /Re-expand-from-archive/);

const prev = "aa".repeat(32);
const ok = reExpandFromArchive({
  archive_bytes: true,
  held_prev: prev,
  cited_prev: prev,
  verified: true,
});
assert.equal(ok.ok, true);
assert.equal(ok.restore, true);

assert.equal(reExpandFromArchive({ from_index: true, archive_bytes: true, held_prev: prev, cited_prev: prev, verified: true }).ok, false);
assert.equal(meshFromIndex().mesh_from_index, false);
assert.equal(crawlerShelf({ crawler: true }).archive, false);
assert.equal(trainingResidue().rumor, true);

resetMeshStore();
const env = {};
const joined = await runMeshOp("join", { product: "godlock", node_id: "re-expand-peer" }, env);
assert.equal(joined.ok, true);
assert.equal(joined.re_expand, RE_EXPAND);
assert.equal(joined.mesh_from_index, false);

const fromIndex = await runMeshOp("heartbeat", { node_id: "re-expand-peer", from_index: true }, env);
assert.equal(fromIndex.ok, false);
assert.equal(fromIndex.code, "MESH-NO-INDEX");

const rumor = await runMeshOp("status", { training: true }, env);
assert.equal(rumor.ok, false);
assert.equal(rumor.code, "MESH-NO-INDEX");

const vault = new MemoryStore();
await append(vault, { c: "genesis", fact: "re-expand lockset genesis" });
await seal(vault);
const verified = await verifyLockset(vault);
assert.equal(verified.re_expand, RE_EXPAND);
assert.equal(verified.bytes_survive, true);
assert.equal(verified.summaries_survive, false);

const badIndex = await verifyLockset(vault, { from_index: true, archive_bytes: true, held_prev: prev, cited_prev: prev, verified: true });
assert.equal(badIndex.ok, false);

resetMeshStore();
console.log(`ok ${RE_EXPAND}: bytes survive, not summaries; not mesh from index`);

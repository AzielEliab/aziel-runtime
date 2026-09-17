/**
 * REHEAL-1.0: isolation is the cure. Own last good tip + verified
 * trusted pull, or phoenix-WAIT. Never by listening to neighbors.
 * Allowed: live / locked / isolated / tip-hash.
 * Forbidden: bodies / diffs / vote-to-fix.
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
  REHEAL,
  REHEAL_ALLOWED,
  REHEAL_FORBIDDEN,
  REHEAL_LAW,
  REHEAL_SHORT,
  isolationIsCure,
  neighborTalkHeal,
  rehealFromOwnTip,
} from "../src/reheal.js";

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
  "src/reheal.js",
];
for (const rel of files) {
  const text = read(rel);
  assert.match(text, /REHEAL/, rel);
  assert.match(text, /Isolation is the cure|isolation is the cure/, rel);
  assert.doesNotMatch(text, /Phoenix brings/i, rel);
}

assert.equal(REHEAL, "REHEAL-1.0");
assert.equal(REHEAL_LAW.neighbor_heal, false);
assert.equal(REHEAL_LAW.vote_to_fix, false);
assert.deepEqual(REHEAL_ALLOWED.slice(), ["live", "locked", "isolated", "tip-hash"]);
assert.deepEqual(REHEAL_FORBIDDEN.slice(), ["body", "diff", "vote-to-fix"]);
assert.match(REHEAL_SHORT, /group hug over a wound/);
assert.match(MESH_LIMITATION, /REHEAL/);

const hug = neighborTalkHeal();
assert.equal(hug.ok, false);
assert.equal(hug.code, "MESH-NO-NEIGHBOR-HEAL");
assert.equal(hug.reason, "group-hug-over-a-wound");

const tip = "aa".repeat(32);
const own = rehealFromOwnTip({
  own_last_good_tip: tip,
  cited_prev: tip,
  trusted_pull: true,
  verified: true,
});
assert.equal(own.ok, true);
assert.equal(own.path, "own-tip-trusted-pull");

const wait = rehealFromOwnTip({ phoenix_wait: true });
assert.equal(wait.ok, true);
assert.equal(wait.path, "phoenix-WAIT");
assert.equal(wait.heal, false);

assert.equal(rehealFromOwnTip({ neighbor_heal: true }).ok, false);
assert.equal(rehealFromOwnTip({ vote_to_fix: true }).reason, "vote-to-fix-refused");
assert.equal(rehealFromOwnTip({ body: "talk me better" }).reason, "body-or-diff-refused");
assert.equal(rehealFromOwnTip({}).reason, "stay-isolated");
assert.equal(isolationIsCure().isolation_is_the_cure, true);

resetMeshStore();
const env = {};
const joined = await runMeshOp("join", { product: "godlock", node_id: "reheal-peer" }, env);
assert.equal(joined.ok, true);
assert.equal(joined.reheal, REHEAL);
assert.equal(joined.isolation_is_the_cure, true);
assert.equal(joined.neighbor_heal, true);

const listen = await runMeshOp("heartbeat", { node_id: "reheal-peer", neighbor_heal: true }, env);
assert.equal(listen.ok, true, JSON.stringify(listen));
assert.equal(listen.neighbor_heal, true);

const vote = await runMeshOp("heartbeat", { node_id: "reheal-peer", vote_to_fix: true }, env);
assert.equal(vote.ok, false);
assert.equal(vote.code, "MESH-NO-NEIGHBOR-HEAL");

const vault = new MemoryStore();
await append(vault, { c: "genesis", fact: "reheal lockset genesis" });
await seal(vault);
const verified = await verifyLockset(vault);
assert.equal(verified.reheal, REHEAL);
assert.equal(verified.isolation_is_the_cure, true);
assert.equal(verified.neighbor_heal, false);

const badHeal = await verifyLockset(vault, { neighbor_heal: true });
assert.equal(badHeal.ok, false);

resetMeshStore();
console.log(`ok ${REHEAL}: isolation is the cure; never neighbor talk-back-to-health`);

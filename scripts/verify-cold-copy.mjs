/**
 * COLD-COPY-1.0: multiply cold copies; refuse live body sync; tip expensive
 * to erase; unkillable by single-server pull; hash-absolute poison refuse;
 * data outlives creators; payloads pull-only cold; named hosts only.
 * Keeps die-with-pull + split-the-wires.
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
  COLD_COPY,
  COLD_COPY_LAW,
  COLD_COPY_SHORT,
  coldPayloadPlane,
  poisonRefuse,
  refuseLiveBodySync,
  singleServerPull,
  tipEraseCost,
} from "../src/cold-copy.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const files = [
  "docs/NODE_MESH.md",
  "docs/designs/NODE-OPS-1.0.md",
  "docs/designs/QNM-WP-1.0.md",
  "docs/designs/LS-WP-0.1.md",
  "docs/designs/TUN-WP-0.1.md",
  "docs/designs/README.md",
  "src/mesh.js",
  "src/lockset.js",
  "src/cold-copy.js",
];
for (const rel of files) {
  const text = read(rel);
  assert.match(text, /[Cc]old-copy|[Cc]old copies/, rel);
  assert.match(text, /live body sync|Live body sync/, rel);
  assert.doesNotMatch(text, /Phoenix brings/i, rel);
  assert.doesNotMatch(text, /mesh auto-reattaches public hostname/i, rel);
}

assert.equal(COLD_COPY, "COLD-COPY-1.0");
assert.equal(COLD_COPY_LAW.live_body_sync, false);
assert.equal(COLD_COPY_LAW.named_hosts_only, true);
assert.equal(COLD_COPY_LAW.vpn, false);
assert.match(COLD_COPY_SHORT, /Multiply cold copies/);
assert.match(MESH_LIMITATION, /Cold-copy survival/);
assert.match(MESH_LIMITATION, /die with the pull/);
assert.match(MESH_LIMITATION, /Split the wires/);

assert.equal(refuseLiveBodySync({ node_id: "godlock-uk" }).ok, true);
const live = refuseLiveBodySync({ body: "sync me", file: "nope" });
assert.equal(live.ok, false);
assert.equal(live.code, "MESH-NO-BYTES");
assert.equal(live.live_body_sync, false);

assert.equal(tipEraseCost({}).ok, true);
assert.equal(tipEraseCost({ erase: true }).ok, false);
assert.equal(tipEraseCost({ rewrite: true }).reason, "tip-expensive-to-erase");

const pulled = singleServerPull({ pulled: true });
assert.equal(pulled.hostname_down, true);
assert.equal(pulled.cold_copies_alive, true);
assert.equal(pulled.local_verify_append, true);
assert.equal(pulled.climb_public_hostname, false);
assert.equal(pulled.unkillable_by_single_server, true);

const prev = "aa".repeat(32);
const poison = poisonRefuse({ node_id: "peer-1", prev, tips: ["bb".repeat(32), "cc".repeat(32)] });
assert.equal(poison.hash_absolute, true);
assert.equal(poison.isolate_peer, true);
assert.equal(poison.isolate_chain, false);

assert.equal(coldPayloadPlane().live_body_sync, false);
assert.equal(coldPayloadPlane().named_hosts_only, true);

resetMeshStore();
const env = {};
const joined = await runMeshOp("join", { product: "godlock", node_id: "cold-copy-peer" }, env);
assert.equal(joined.ok, true);
assert.equal(joined.cold_copy, COLD_COPY);
assert.equal(joined.live_body_sync, false);
assert.equal(joined.named_hosts_only, true);

const bodySync = await runMeshOp("heartbeat", { node_id: "cold-copy-peer", body: "live sync" }, env);
assert.equal(bodySync.ok, false);
assert.equal(bodySync.code, "MESH-NO-BYTES");

const fanout = await runMeshOp("broadcast", { sha256: "ab".repeat(32), file: "payload.bin" }, env);
assert.equal(fanout.ok, false);
assert.equal(fanout.code, "MESH-NO-BYTES");
assert.equal(fanout.live_body_sync, false);

const vault = new MemoryStore();
await append(vault, { c: "genesis", fact: "cold-copy lockset genesis" });
const sealed = await seal(vault);
const ok = await verifyLockset(vault);
assert.equal(ok.cold_copy, COLD_COPY);
assert.equal(ok.live_body_sync, false);
assert.equal(ok.tip_expensive_to_erase, true);
assert.equal(ok.unkillable_by_single_server, true);
assert.equal(ok.rewrite, false);

const erased = await verifyLockset(vault, { erase: true, held_lockset: sealed.lockset_sha256 });
assert.equal(erased.ok, false);
assert.ok(erased.breaks.some((b) => b.reason === "tip-expensive-to-erase"));

resetMeshStore();
console.log(`ok ${COLD_COPY}: multiply copies, refuse live body sync, tip expensive to erase, survive single-server pull`);

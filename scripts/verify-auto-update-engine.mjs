/** AUTO-UPDATE-1.0 updater: off/paused/no-key refuse, apply, never downgrade, rollback on health fail, receipts chain. */
import assert from "node:assert/strict";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { initialState, checkOnline, pause, resume, updaterStatus } from "../src/auto-update/updater.js";
import { UPDATE_CODES as C } from "../src/auto-update/manifest.js";

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const b64u = (b) => Buffer.from(b).toString("base64url");
const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
async function release(seq, body = "build-" + seq) {
  const bytes = new TextEncoder().encode(body);
  const manifest = { spec: "AZ-UPDATE-MANIFEST-1.0", product: "azos", version: "2.0." + seq, version_seq: seq, git_sha: "c".repeat(40), channel: "stable",
    artifact: { name: "azos.img", size: bytes.length, sha256: await sha256Hex(bytes) }, issued_at: "t", prev_manifest_hash: null };
  const signature = b64u(await crypto.subtle.sign({ name: "Ed25519" }, kp.privateKey, new TextEncoder().encode(canonicalize(manifest))));
  return { manifest, signature, bytes };
}
function mkHost({ enabled = true, rel, healthy = true } = {}) {
  let state = initialState("azos", 1); let t = 0;
  const h = { enabled, nodeId: "node-A", receipts: [], active: "build-1", staged: null, prev: null,
    now: () => "2026-10-22T12:00:" + String(t++).padStart(2, "0") + "Z",
    load: async () => structuredClone(state), save: async (s) => { state = structuredClone(s); },
    fetchRelease: async () => h.rel && { manifest: h.rel.manifest, signature: h.rel.signature },
    fetchArtifact: async () => h.rel.bytes,
    stage: async (b) => { h.staged = new TextDecoder().decode(b); }, swap: async () => { h.prev = h.active; h.active = h.staged; },
    healthCheck: async () => healthy, rollback: async () => { h.active = h.prev; },
    writeReceipt: async (r) => { h.receipts.push(r); }, get state() { return state; } };
  h.rel = rel; return h;
}
const o = { publicKey: pub };
const r5 = await release(5);
ok((await checkOnline(mkHost({ rel: r5 }), {})).code === C.noKey, "pinned null key refuses");
ok((await checkOnline(mkHost({ enabled: false, rel: r5 }), o)).code === C.off, "flag off refuses");
let h = mkHost({ rel: r5 }); await pause(h);
ok((await checkOnline(h, o)).code === C.paused && h.active === "build-1", "paused refuses");
await resume(h);
let r = await checkOnline(h, o);
ok(r.ok && h.active === "build-5" && h.state.installed_seq === 5 && h.state.floor_seq === 5, "applies");
ok((await checkOnline(h, o)).code === C.downgrade, "same seq refused");
h.rel = await release(3); ok((await checkOnline(h, o)).code === C.downgrade && h.active === "build-5", "never downgrade");
const bad = await release(9); bad.bytes = new TextEncoder().encode("evil-9");
h.rel = bad; ok((await checkOnline(h, o)).code === C.hash && h.active === "build-5", "tampered bytes refused");
const sick = mkHost({ rel: await release(6), healthy: false });
r = await checkOnline(sick, o);
ok(r.code === C.health && r.row.outcome === "rolled_back" && sick.active === "build-1" && sick.state.floor_seq === 1, "rollback, floor unchanged");
// receipts: every attempt receipted, primary chain links
const rows = h.receipts; ok(rows.length === 5, "one receipt per attempt");
for (let i = 1; i < rows.length; i++) ok(rows[i].lattice.primary_prev === rows[i - 1].lattice.primary, "primary links");
ok(new Set(rows.map((x) => x.lattice.primary)).size === rows.length, "no duplicate hashes");
ok(!JSON.stringify(rows).includes("node-A"), "raw node id never stored");
ok(updaterStatus(h.state, { enabled: true, publicKey: pub }).last_code === C.hash, "status");
console.log(`verify-auto-update-engine: ${n} checks ok`);

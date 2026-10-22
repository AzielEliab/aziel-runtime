/** AUTO-UPDATE-1.0 mesh peer: carrier order, absent hardware refuses, tampered peer build never applies or spreads, convergence. */
import assert from "node:assert/strict";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { initialState, checkOnline } from "../src/auto-update/updater.js";
import { meshContact, meshAdvert, MESH_CARRIER_ORDER } from "../src/auto-update/mesh-peer.js";
import { UPDATE_CODES as C } from "../src/auto-update/manifest.js";

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
ok(MESH_CARRIER_ORDER.join() === "lan,wifi,bluetooth,rf,photon", "Plane P order " + MESH_CARRIER_ORDER.join());
const b64u = (b) => Buffer.from(b).toString("base64url");
const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
const bytes = new TextEncoder().encode("azos-8");
const manifest = { spec: "AZ-UPDATE-MANIFEST-1.0", product: "azos", version: "2.0.8", version_seq: 8, git_sha: "d".repeat(40), channel: "stable",
  artifact: { name: "azos.img", size: bytes.length, sha256: await sha256Hex(bytes) }, issued_at: "t", prev_manifest_hash: null };
const signature = b64u(await crypto.subtle.sign({ name: "Ed25519" }, kp.privateKey, new TextEncoder().encode(canonicalize(manifest))));

function node(id, carriers, store = {}) {
  let state = initialState("azos", 1); let t = 0;
  const h = { id, enabled: true, nodeId: id, offline: true, receipts: [], active: "azos-1", blob: null, peer: null,
    now: () => `t${t++}`, load: async () => structuredClone(state), save: async (s) => { state = structuredClone(s); },
    fetchRelease: async () => ({ manifest, signature }), fetchArtifact: async () => bytes,
    stage: async (b) => { h.blob = b; }, swap: async () => { h.active = new TextDecoder().decode(h.blob); }, healthCheck: async () => true, rollback: async () => {},
    writeReceipt: async (r) => { h.receipts.push(r); },
    carrierPresent: async (c) => carriers.includes(c),
    peerHello: async () => meshAdvert(await h.peer.load()),
    peerFetch: async () => h.peer.blob, get state() { return state; } };
  return h;
}
const o = { publicKey: pub };
// A gets it online; B (offline, bluetooth only) converges from A
const A = node("A", ["lan"]); A.offline = false;
ok((await checkOnline(A, o)).ok, "A online apply");
const B = node("B", ["bluetooth", "rf"]); B.peer = A;
let r = await meshContact(B, o);
ok(r.ok && r.carrier === "bluetooth" && B.active === "azos-8", "B pulled from peer over first present carrier");
ok(r.row.source === "mesh:bluetooth" && r.row.lattice.offline === true, "mesh receipt, offline lattice");
// C learns from B (second hop)
const C2 = node("C", ["photon"]); C2.peer = B;
ok((await meshContact(C2, o)).ok && C2.active === "azos-8", "two-hop convergence");
ok((await meshContact(C2, o)).code === "UPDATE-PEER-NOT-NEWER", "peer equal -> nothing");
// no hardware -> refuse
const D = node("D", []); D.peer = A;
ok((await meshContact(D, o)).code === C.carrier && D.receipts.at(-1).code === C.carrier, "carrier absent refuses with receipt");
// tampered peer bytes: never applied, never re-advertised
const E = node("E", ["lan"]); E.peer = { load: A.load, blob: new TextEncoder().encode("worm-8") };
r = await meshContact(E, o);
ok(r.code === C.hash && E.active === "azos-1" && meshAdvert(E.state).manifest === undefined, "tamper stops at E");
// forged manifest from peer: sig fails
const F = node("F", ["wifi"]); F.peer = { load: async () => ({ ...A.state, served_manifest: { manifest: { ...manifest, version_seq: 99 }, signature } }), blob: bytes };
ok((await meshContact(F, o)).code === C.sig && F.active === "azos-1", "forged seq refused");
// pinned key placeholder null -> refuse even over mesh
const G = node("G", ["lan"]); G.peer = A;
ok((await meshContact(G)).code === C.noKey, "no key refuses over mesh");
console.log(`verify-auto-update-mesh: ${n} checks ok`);

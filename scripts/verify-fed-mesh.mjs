/**
 * FED-MESH-1.0: Local-First Edge Mesh.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { bytesToB64url, hashStatement, sha256HexBytes, utf8 } from "../src/fed-mesh/codec.js";
import { openAct, sealAct, signAct } from "../src/fed-mesh/client.js";
import { createIdentity, signObject } from "../src/fed-mesh/identity.js";
import { mintIdentityReceipt, verifyIdentityChain, verifyIdentityReceipt } from "../src/fed-mesh/receipt.js";
import {
  actStatement,
  createRelayState,
  directoryEntry,
  objectFetchRequest,
  objectFetchResponse,
  relayBootstrap,
  relayCite,
  relayDeliver,
  relayForward,
  relayHeartbeat,
  relayObject,
  relayObjectGet,
  relayPeers,
  relayPost,
  relayPull,
  relayRef,
  relayRefsRead,
  relayRegister,
  relayRemoteTask,
  relayRollup,
  relaySync,
} from "../src/fed-mesh/relay.js";
import { roleMay } from "../src/fed-mesh/roles.js";
import {
  FED_TITLE,
  HANDLE_RE,
  MAX_OBJECT_BYTES,
  MAX_PEERS,
  MSG_PER_MIN,
  ZERO_HASH,
} from "../src/fed-mesh/spec.js";
import { requestLimitKind } from "../src/request-limits.js";

const SEED_A = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const ENC_A = Uint8Array.from({ length: 32 }, (_, i) => i + 64);
const SEED_B = Uint8Array.from({ length: 32 }, (_, i) => 255 - i);
const ENC_B = Uint8Array.from({ length: 32 }, (_, i) => 128 + (i % 64));
const SEED_C = Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + 3) % 256);
const ENC_C = Uint8Array.from({ length: 32 }, (_, i) => (i * 3 + 9) % 256);

function fail(out, label) {
  assert.equal(out.ok, false, `${label} should refuse, got ${out.code}`);
}

async function person(seed, encSeed) {
  return createIdentity({ seed, encSeed });
}

async function register(state, id, now, extra = {}) {
  const body = await signAct(id, "register", {
    enc_public_key: id.enc_public_key,
    product: "mesh",
    presence: "live",
    relays: extra.relays || [],
    seq: 1,
    prev: ZERO_HASH,
  });
  const out = await relayRegister(state, body, now);
  assert.equal(out.ok, true, out.message || out.code);
  return { seq: 1, prev: out.statement_hash };
}

async function makeRef(id, fields) {
  const body = await signAct(id, "ref", fields);
  const link = await hashStatement(actStatement("ref", body));
  return { body, link };
}

async function buildVectors() {
  const id = await person(SEED_A, ENC_A);
  const objectBytes = utf8("local-first");
  const object_hash = await sha256HexBytes(objectBytes);
  const body_b64 = bytesToB64url(objectBytes);
  const ref = await makeRef(id, {
    ref: "heads/main",
    object_hash,
    prev_ref: ZERO_HASH,
    seq: 2,
    prev: "11".repeat(32),
  });
  const receipt = await mintIdentityReceipt({
    identity: id,
    request: "Anchor a ref update.",
    output: "Ref update anchored.",
    seq: 1,
    prev: ZERO_HASH,
    previous_hash: ZERO_HASH,
  });
  const checked = await verifyIdentityReceipt(receipt);
  return {
    spec: "FED-MESH-1.0",
    title: FED_TITLE,
    author: "Aziel Eliab",
    seed_hex: Buffer.from(SEED_A).toString("hex"),
    enc_seed_hex: Buffer.from(ENC_A).toString("hex"),
    handle: id.handle,
    public_key: id.public_key,
    enc_public_key: id.enc_public_key,
    handle_length: id.handle.length,
    ref_update: ref.body,
    ref_statement_hash: ref.link,
    object: {
      text: "local-first",
      hash: object_hash,
      body_b64,
    },
    object_fetch_request: objectFetchRequest(object_hash),
    object_fetch_response: objectFetchResponse(object_hash, body_b64),
    receipt_hash: receipt.hash,
    identity_anchor: receipt.identity_anchor,
    identity_anchor_ok: checked.ok,
  };
}

const vectors = await buildVectors();
const vectorPath = new URL("../fixtures/fed-mesh-vectors.json", import.meta.url);
if (process.env.WRITE_FED_VECTORS === "1") {
  writeFileSync(vectorPath, `${JSON.stringify(vectors, null, 2)}\n`);
}
const pinned = JSON.parse(readFileSync(vectorPath, "utf8"));
assert.deepEqual(vectors, pinned);
assert.equal(vectors.title, "FED-MESH-1.0: Local-First Edge Mesh");
assert.equal(vectors.handle_length, 12);
assert.match(vectors.handle, HANDLE_RE);
assert.equal(vectors.object_fetch_request.kind, "object-fetch");
assert.equal(vectors.object_fetch_response.kind, "object");
assert.equal(vectors.identity_anchor_ok, true);

assert.equal(roleMay("admin", "ref"), true);
assert.equal(roleMay("developer", "sync"), true);
assert.equal(roleMay("guest", "ref"), false);
assert.equal(requestLimitKind("/v1/mesh/relay/ref", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/sync", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/object", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/object", "GET"), null);
assert.equal(requestLimitKind("/v1/mesh/relay", "GET"), null);

const cite = await relayCite(createRelayState());
assert.equal(cite.title, FED_TITLE);
assert.equal(cite.worker_requires_plaintext, false);
assert.equal(cite.relay_sees_plaintext, false);
assert.equal(cite.local_first, true);
assert.equal(cite.protocol_requires_this_worker, false);
assert.match(cite.neighborhood, /does not discover a LAN/);

const now = 1_758_000_000_000;
const alice = await person(SEED_A, ENC_A);
const bob = await person(SEED_B, ENC_B);
const cara = await person(SEED_C, ENC_C);
assert.notEqual(alice.handle, bob.handle);

{
  const state = createRelayState();
  const unsigned = await signAct(alice, "register", {
    enc_public_key: alice.enc_public_key,
    product: "mesh",
    presence: "live",
    relays: [],
    seq: 1,
    prev: ZERO_HASH,
  });
  delete unsigned.sig;
  fail(await relayRegister(state, unsigned, now), "unsigned");
  assert.equal((await relayRegister(state, unsigned, now)).code, "FED-MESH-UNSIGNED");

  const leaked = { ...unsigned, sig: "aa", private_key: "no" };
  assert.equal((await relayRegister(state, leaked, now)).code, "FED-MESH-PRIVATE-KEY");

  const reg = await register(state, alice, now);
  const again = await signAct(alice, "heartbeat", { presence: "live", seq: 1, prev: ZERO_HASH });
  assert.equal((await relayHeartbeat(state, again, now)).code, "FED-MESH-REPLAY");

  const beat = await signAct(alice, "heartbeat", { presence: "live", seq: 2, prev: reg.prev });
  const beatOut = await relayHeartbeat(state, beat, now);
  assert.equal(beatOut.ok, true, beatOut.message);

  const fork = await signAct(alice, "heartbeat", { presence: "locked", seq: 3, prev: reg.prev });
  assert.equal((await relayHeartbeat(state, fork, now)).code, "FED-MESH-FORK");

  const gap = await signAct(alice, "heartbeat", { presence: "live", seq: 5, prev: beatOut.statement_hash });
  assert.equal((await relayHeartbeat(state, gap, now)).code, "FED-MESH-GAP");

  const mismatched = await signAct(bob, "heartbeat", { presence: "live", seq: 3, prev: beatOut.statement_hash });
  mismatched.handle = alice.handle;
  assert.equal((await relayHeartbeat(state, mismatched, now)).code, "FED-MESH-HANDLE-MISMATCH");

  const tampered = await signAct(alice, "heartbeat", { presence: "live", seq: 3, prev: beatOut.statement_hash });
  tampered.presence = "isolated";
  assert.equal((await relayHeartbeat(state, tampered, now)).code, "FED-MESH-BAD-SIG");
}

{
  const state = createRelayState();
  await register(state, alice, now);
  let seq = 1;
  let prev = (await directoryEntry(state, alice.handle)).tip;
  for (let i = 0; i < MSG_PER_MIN - 1; i++) {
    seq += 1;
    const beat = await signAct(alice, "heartbeat", { presence: "live", seq, prev });
    const out = await relayHeartbeat(state, beat, now);
    assert.equal(out.ok, true, out.message);
    prev = out.statement_hash;
  }
  seq += 1;
  const over = await signAct(alice, "heartbeat", { presence: "live", seq, prev });
  const rated = await relayHeartbeat(state, over, now);
  assert.equal(rated.code, "FED-MESH-RATE");
  assert.equal(rated.http_status, 429);
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  const b = await register(state, bob, now);
  assert.equal(a.seq, 1);
  assert.equal(b.seq, 1);
  const secret = "mesh-secret-token";
  const env = await sealAct(alice, {
    to: bob.handle,
    recipientEncPublicKey: bob.enc_public_key,
    seq: 2,
    prev: a.prev,
    plaintext: secret,
  });
  assert.equal(JSON.stringify(env).includes(secret), false);
  const posted = await relayPost(state, env, now);
  assert.equal(posted.ok, true, posted.message);
  assert.equal(posted.relay_sees_plaintext, false);
  const opened = await openAct(bob, env);
  assert.equal(opened, secret);
  assert.equal(await openAct(alice, env), null);
  const pulled = await relayPull(state, await signAct(bob, "pull", { ts: new Date(now).toISOString() }), now);
  assert.equal(pulled.ok, true, pulled.message);
  assert.equal(JSON.stringify(pulled).includes(secret), false);
  assert.equal(pulled.messages.length, 1);
  const cipher = pulled.messages[0].envelope.ciphertext;
  const mid = Math.floor(cipher.length / 2);
  const flippedChar = cipher[mid] === "A" ? "B" : "A";
  const flipped = { ...pulled.messages[0].envelope, ciphertext: `${cipher.slice(0, mid)}${flippedChar}${cipher.slice(mid + 1)}` };
  assert.equal(await openAct(bob, flipped), null);
  const delivered = await relayDeliver(
    state,
    await signAct(bob, "deliver", { seq: 2, prev: b.prev, ack: [pulled.messages[0].msg_hash] }),
    now,
  );
  assert.equal(delivered.ok, true, delivered.message);
  assert.ok(delivered.delivery_receipt);
  assert.equal(delivered.chainlock.anchored, true);
  assert.ok(delivered.timeslate_hash);
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  await register(state, bob, now);
  const huge = bytesToB64url(new Uint8Array(5000));
  const env = await signAct(alice, "msg", {
    to: bob.handle,
    seq: 2,
    prev: a.prev,
    nonce: "aa",
    eph_public_key: bob.enc_public_key,
    ciphertext: huge,
  });
  const out = await relayPost(state, env, now);
  assert.equal(out.code, "FED-MESH-TOO-LARGE");
  assert.equal(out.http_status, 413);
  assert.equal((await directoryEntry(state, alice.handle)).seq, 1);
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  const changes = [{ handle: alice.handle, op: "set", payload_hash: "ab".repeat(32) }];
  const co = [alice.handle];
  const batch_id = await hashStatement({ changes, co_signers: co, multisig: null, submitter: alice.handle });
  const roll = await signAct(alice, "rollup", {
    seq: 2,
    prev: a.prev,
    batch_id,
    changes,
    co_signers: co,
    multisig: null,
    signatures: [],
  });
  roll.signatures = [{ handle: alice.handle, public_key: alice.public_key, sig: roll.sig }];
  const accepted = await relayRollup(state, roll, now);
  assert.equal(accepted.ok, true, accepted.message);
  assert.equal(accepted.executed, false);
  assert.equal(accepted.chainlock.anchored, true);
  const replay = await signAct(alice, "rollup", {
    seq: 3,
    prev: accepted.statement_hash,
    batch_id,
    changes,
    co_signers: co,
    multisig: null,
    signatures: [],
  });
  replay.signatures = [{ handle: alice.handle, public_key: alice.public_key, sig: replay.sig }];
  assert.equal((await relayRollup(state, replay, now)).code, "FED-MESH-REPLAY");

  const bad = await signAct(alice, "rollup", {
    seq: 3,
    prev: accepted.statement_hash,
    batch_id: "cd".repeat(32),
    changes,
    co_signers: co,
    multisig: null,
    signatures: [],
  });
  bad.signatures = [{ handle: alice.handle, public_key: alice.public_key, sig: "not-a-sig" }];
  assert.equal((await relayRollup(state, bad, now)).code, "FED-MESH-TAMPER");
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  await register(state, bob, now);
  const changes = [{ handle: alice.handle, op: "set", payload_hash: "ef".repeat(32) }];
  async function rollup(seq, prev, multisig, co, signers) {
    const batch_id = await hashStatement({ changes, co_signers: co, multisig, submitter: alice.handle });
    const body = await signAct(alice, "rollup", {
      seq,
      prev,
      batch_id,
      changes,
      co_signers: co,
      multisig,
      signatures: [],
    });
    const statement = actStatement("rollup", body);
    body.signatures = [];
    for (const who of signers) {
      body.signatures.push({ handle: who.handle, public_key: who.public_key, sig: await signObject(who.privateKey, statement) });
    }
    return relayRollup(state, body, now);
  }
  const short = await rollup(
    2,
    a.prev,
    { m: 2, n: 2, signers: [alice.handle, bob.handle] },
    [alice.handle],
    [alice],
  );
  assert.equal(short.code, "FED-MESH-MULTISIG");
  const met = await rollup(
    2,
    a.prev,
    { m: 2, n: 2, signers: [alice.handle, bob.handle] },
    [alice.handle, bob.handle],
    [alice, bob],
  );
  assert.equal(met.ok, true, met.message);
  assert.equal(met.signers.length, 2);
}

{
  const left = createRelayState();
  const right = createRelayState();
  right.selfUrl = "http://127.0.0.1:9/v1/mesh/relay";
  const a = await register(left, alice, now);
  await register(right, bob, now);
  const peersBody = await signAct(alice, "peers", {
    seq: 2,
    prev: a.prev,
    peers: [{ url: right.selfUrl, handle: bob.handle, public_key: bob.public_key }],
  });
  const peers = await relayPeers(left, peersBody, now);
  assert.equal(peers.ok, true, peers.message);
  const poisoned = await signAct(alice, "peers", {
    seq: 3,
    prev: peers.statement_hash,
    peers: [{ url: "https://example.com/poison", handle: bob.handle, public_key: bob.public_key }],
  });
  assert.equal((await relayPeers(left, poisoned, now)).code, "FED-MESH-POISON");
  const tooMany = [];
  for (let i = 0; i < MAX_PEERS + 1; i++) tooMany.push({ url: `https://example.com/r${i}`, handle: bob.handle, public_key: bob.public_key });
  const fat = await signAct(alice, "peers", { seq: 3, prev: peers.statement_hash, peers: tooMany });
  assert.equal((await relayPeers(left, fat, now)).code, "FED-MESH-TOO-LARGE");
  const boot = await signAct(alice, "bootstrap", {
    seq: 3,
    prev: peers.statement_hash,
    relays: [{ url: right.selfUrl, handle: bob.handle, public_key: bob.public_key }],
  });
  const listed = await relayBootstrap(left, boot, now);
  assert.equal(listed.ok, true, listed.message);
  assert.equal(listed.only_source, false);

  const secret = "forward-secret";
  const env = await sealAct(alice, {
    to: bob.handle,
    recipientEncPublicKey: bob.enc_public_key,
    seq: 4,
    prev: listed.statement_hash,
    plaintext: secret,
    via: [right.selfUrl],
  });
  const posted = await relayPost(left, env, now, {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      const out = await relayForward(right, body, now);
      if (!out.ok) throw new Error(out.code);
      return { ok: true };
    },
  });
  assert.equal(posted.ok, true, posted.message);
  assert.equal(posted.forwarded.length, 1);
  const pulled = await relayPull(right, await signAct(bob, "pull", { ts: new Date(now).toISOString() }), now);
  assert.equal(pulled.messages.length, 1);
  assert.equal(await openAct(bob, pulled.messages[0].envelope), secret);
  assert.equal(JSON.stringify(pulled).includes(secret), false);
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  await register(state, bob, now);
  const task = {
    v: "FED-MESH-1.0",
    kind: "remote-task",
    requester: alice.handle,
    requester_public_key: alice.public_key,
    executor: bob.handle,
    executor_public_key: bob.public_key,
    task_hash: "aa".repeat(32),
    result_hash: "bb".repeat(32),
    seq: 2,
    prev: a.prev,
  };
  const statement = actStatement("remote-task", task);
  task.requester_sig = await signObject(alice.privateKey, statement);
  task.executor_sig = await signObject(bob.privateKey, statement);
  const anchored = await relayRemoteTask(state, task, now);
  assert.equal(anchored.ok, true, anchored.message);
  assert.equal(anchored.executed, false);
  assert.equal(anchored.chainlock.anchored, true);
  const withCode = { ...task, seq: 3, prev: anchored.statement_hash, code: "while(true){}" };
  assert.equal((await relayRemoteTask(state, withCode, now)).code, "FED-MESH-NO-EXEC");
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  const objectBytes = utf8("local-first");
  const object_hash = await sha256HexBytes(objectBytes);
  const first = await makeRef(alice, {
    ref: "heads/main",
    object_hash,
    prev_ref: ZERO_HASH,
    seq: 2,
    prev: a.prev,
  });
  const accepted = await relayRef(state, first.body, now);
  assert.equal(accepted.ok, true, accepted.message);
  assert.equal(accepted.object_hosted, false);
  assert.equal(accepted.chainlock.anchored, true);
  assert.equal(accepted.statement_hash, first.link);
  const served = await relayRefsRead(state, alice.handle, "heads/main");
  assert.equal(served.ok, true);
  assert.equal(served.ref.object_hash, object_hash);

  const fork = await makeRef(alice, {
    ref: "heads/main",
    object_hash: "22".repeat(32),
    prev_ref: ZERO_HASH,
    seq: 3,
    prev: accepted.statement_hash,
  });
  const refused = await relayRef(state, fork.body, now);
  assert.equal(refused.code, "FED-MESH-FORK");
  assert.equal((await directoryEntry(state, alice.handle)).seq, 2);

  const nextHash = "33".repeat(32);
  const second = await makeRef(alice, {
    ref: "heads/main",
    object_hash: nextHash,
    prev_ref: accepted.statement_hash,
    seq: 3,
    prev: accepted.statement_hash,
  });
  const followed = await relayRef(state, second.body, now);
  assert.equal(followed.ok, true, followed.message);
  assert.equal((await relayRefsRead(state, alice.handle, "heads/main")).ref.object_hash, nextHash);
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  const h1 = "44".repeat(32);
  const h2 = "55".repeat(32);
  const ref1 = await makeRef(alice, {
    ref: "heads/main",
    object_hash: h1,
    prev_ref: ZERO_HASH,
    seq: 2,
    prev: a.prev,
  });
  const ref2 = await makeRef(alice, {
    ref: "heads/main",
    object_hash: h2,
    prev_ref: ref1.link,
    seq: 3,
    prev: ref1.link,
  });
  const sync = await signAct(alice, "sync", {
    act_hashes: [ref1.link, ref2.link],
    acts: [ref1.body, ref2.body],
  });
  const out = await relaySync(state, sync, now + 1000);
  assert.equal(out.ok, true, out.message);
  assert.equal(out.count, 2);
  assert.equal(out.wrapper_seq, null);
  assert.equal(out.applied[0].chainlock.anchored, true);
  assert.equal(out.applied[1].chainlock.anchored, true);
  assert.equal((await directoryEntry(state, alice.handle)).seq, 3);
  assert.equal((await relayRefsRead(state, alice.handle, "heads/main")).ref.object_hash, h2);

  const forkRef = await makeRef(alice, {
    ref: "heads/main",
    object_hash: "66".repeat(32),
    prev_ref: ZERO_HASH,
    seq: 4,
    prev: ref2.link,
  });
  const badSync = await signAct(alice, "sync", { act_hashes: [forkRef.link], acts: [forkRef.body] });
  const stopped = await relaySync(state, badSync, now + 2000);
  assert.equal(stopped.code, "FED-MESH-FORK");
  assert.equal(stopped.synced, 0);
  assert.equal((await directoryEntry(state, alice.handle)).seq, 3);
}

{
  const state = createRelayState();
  const bytes = utf8("local-first");
  const hash = await sha256HexBytes(bytes);
  const body_b64 = bytesToB64url(bytes);
  const put = await signAct(alice, "object", { hash, body_b64 });
  const cached = await relayObject(state, put, now);
  assert.equal(cached.ok, true, cached.message);
  assert.equal(cached.chain_act, false);
  assert.equal((await directoryEntry(state, alice.handle)).code, "FED-MESH-NO-ROUTE");
  const fetched = await relayObjectGet(state, hash);
  assert.deepEqual(
    { v: fetched.v, kind: fetched.kind, hash: fetched.hash, body_b64: fetched.body_b64 },
    objectFetchResponse(hash, body_b64),
  );
  assert.equal((await relayObjectGet(state, "00".repeat(32))).code, "FED-MESH-NO-OBJECT");

  const big = new Uint8Array(MAX_OBJECT_BYTES + 1);
  big[0] = 7;
  const bigHash = await sha256HexBytes(big);
  const oversized = await signAct(bob, "object", { hash: bigHash, body_b64: bytesToB64url(big) });
  const tooBig = await relayObject(state, oversized, now);
  assert.equal(tooBig.code, "FED-MESH-TOO-LARGE");
  assert.equal(tooBig.http_status, 413);

  const liar = await signAct(cara, "object", { hash: "ab".repeat(32), body_b64 });
  const mismatch = await relayObject(state, liar, now);
  assert.equal(mismatch.code, "FED-MESH-HASH-MISMATCH");
  assert.equal((await relayObjectGet(state, "ab".repeat(32))).code, "FED-MESH-NO-OBJECT");
}

{
  const first = await mintIdentityReceipt({
    identity: alice,
    request: "Register a handle.",
    output: "Handle registered.",
    seq: 1,
    prev: ZERO_HASH,
    previous_hash: ZERO_HASH,
  });
  const second = await mintIdentityReceipt({
    identity: alice,
    request: "Anchor a ref update.",
    output: "Ref update anchored.",
    seq: 2,
    prev: (await verifyIdentityReceipt(first)).statement_hash,
    previous_hash: first.hash,
  });
  const chain = await verifyIdentityChain([first, second]);
  assert.equal(chain.ok, true, JSON.stringify(chain.errors));
  const replay = await verifyIdentityChain([first, first]);
  assert.equal(replay.ok, false);
  assert.ok(replay.errors.some((e) => e.code === "FED-MESH-REPLAY"));
  const gap = await mintIdentityReceipt({
    identity: alice,
    request: "Skip a sequence.",
    output: "Gap refused.",
    seq: 4,
    prev: (await verifyIdentityReceipt(second)).statement_hash,
    previous_hash: second.hash,
  });
  const gapped = await verifyIdentityChain([first, second, gap]);
  assert.ok(gapped.errors.some((e) => e.code === "FED-MESH-GAP"));
}

console.log("verify-fed-mesh: ok");

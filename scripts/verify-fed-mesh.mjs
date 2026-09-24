/**
 * FED-MESH-1.0: Local-First Edge Mesh.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { bytesToB64url, hashStatement, sha256HexBytes, utf8 } from "../src/fed-mesh/codec.js";
import { openAct, sealAct, signAct } from "../src/fed-mesh/client.js";
import { findNamePow, nameBlockHit } from "../src/fed-mesh/guard.js";
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
  relayAdvisory,
  relayAirgap,
  relayAppeal,
  relayEquivocation,
  relayIsland,
  relayIsolation,
  relayIsolationRead,
  relayName,
  relayNameRead,
  relayQuarantine,
  relayRef,
  relayRefsRead,
  dispatchRelay,
  relayRegister,
  relayRemoteTask,
  relayRollup,
  relayRestore,
  relaySlotRead,
  relaySync,
  relayVouch,
  relayWitness,
} from "../src/fed-mesh/relay.js";
import { roleMay } from "../src/fed-mesh/roles.js";
import {
  AZ_STAR_ALLOWLIST,
  BLOCKLIST_VERSION,
  CAP7_AZ_ALLOWLIST,
  NAME_BLOCKLIST,
  FED_TITLE,
  HANDLE_RE,
  MAX_OBJECT_BYTES,
  MAX_PEERS,
  MSG_PER_MIN,
  NAME_CAP,
  NAME_PENDING_MS,
  NAME_POW_BITS,
  RESERVED_SLOT_CAP,
  RESERVED_SLOTS,
  USER_SLOT_CAP,
  WITNESS_K,
  ZERO_HASH,
} from "../src/fed-mesh/spec.js";
import { CAP7_REAL_ALIGNMENT, cap7FactoryMeshNames } from "../src/cap7-shuffle.js";
import { dispatchMeshHttp } from "../src/mesh.js";
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

async function stampPow(signed) {
  const link = await hashStatement(actStatement(signed.kind, signed));
  const pow = await findNamePow(link, signed.sig, NAME_POW_BITS);
  if (!pow) throw new Error("proof-of-work search failed");
  return { ...signed, pow };
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
  const bobId = await person(SEED_B, ENC_B);
  const named = createRelayState();
  const nameNow = 1_758_000_000_000;
  const registered = await relayRegister(
    named,
    await signAct(id, "register", {
      enc_public_key: id.enc_public_key,
      product: "mesh",
      presence: "live",
      relays: [],
      seq: 1,
      prev: ZERO_HASH,
    }),
    nameNow,
  );
  const nameClaim = await stampPow(await signAct(id, "name", {
    name: "library.aziel",
    owner: id.handle,
    target: { type: "hash", value: object_hash },
    expires: null,
    seq: 2,
    prev: registered.statement_hash,
    prev_record: ZERO_HASH,
  }));
  const nameClaimed = await relayName(named, nameClaim, nameNow);
  if (!nameClaimed.ok) throw new Error(nameClaimed.message || nameClaimed.code);
  const nameTransfer = await stampPow(await signAct(id, "name", {
    name: "library.aziel",
    owner: bobId.handle,
    target: { type: "handle", value: bobId.handle },
    expires: null,
    seq: 3,
    prev: nameClaimed.statement_hash,
    prev_record: nameClaimed.statement_hash,
  }));
  const capped = createRelayState();
  const capReg = await relayRegister(
    capped,
    await signAct(id, "register", {
      enc_public_key: id.enc_public_key,
      product: "mesh",
      presence: "live",
      relays: [],
      seq: 1,
      prev: ZERO_HASH,
    }),
    nameNow,
  );
  let capPrev = capReg.statement_hash;
  let capSeq = 1;
  for (let i = 1; i <= NAME_CAP; i++) {
    capSeq += 1;
    const row = await stampPow(await signAct(id, "name", {
      name: `name-${i}.aziel`,
      owner: id.handle,
      target: { type: "ref", value: "heads/main" },
      expires: null,
      seq: capSeq,
      prev: capPrev,
      prev_record: ZERO_HASH,
    }));
    const out = await relayName(capped, row, nameNow);
    if (!out.ok) throw new Error(out.message || out.code);
    capPrev = out.statement_hash;
  }
  capSeq += 1;
  const overCap = await stampPow(await signAct(id, "name", {
    name: `name-${NAME_CAP + 1}.aziel`,
    owner: id.handle,
    target: { type: "hash", value: object_hash },
    expires: null,
    seq: capSeq,
    prev: capPrev,
    prev_record: ZERO_HASH,
  }));
  const overRefused = await relayName(capped, overCap, nameNow);
  const equivLeft = await makeRef(id, {
    ref: "heads/main",
    object_hash,
    prev_ref: ZERO_HASH,
    seq: 4,
    prev: "22".repeat(32),
  });
  const equivRight = await makeRef(id, {
    ref: "heads/main",
    object_hash: "ab".repeat(32),
    prev_ref: ZERO_HASH,
    seq: 4,
    prev: "22".repeat(32),
  });
  const equiv = await relayEquivocation(createRelayState(), {
    v: "FED-MESH-1.0",
    kind: "equivocation",
    left: equivLeft.body,
    right: equivRight.body,
  }, nameNow);
  if (!equiv.ok) throw new Error(equiv.message || equiv.code);
  const manifest = { files: [{ name: "objects/local-first", sha256: object_hash }] };
  const manifest_sha256 = await hashStatement(manifest);
  const airgap = await signAct(id, "airgap-bundle", { manifest, manifest_sha256 });
  const airgapChecked = await relayAirgap(createRelayState(), airgap);
  if (!airgapChecked.ok) throw new Error(airgapChecked.message || airgapChecked.code);
  const blockState = createRelayState();
  const blockReg = await relayRegister(
    blockState,
    await signAct(id, "register", {
      enc_public_key: id.enc_public_key,
      product: "mesh",
      presence: "live",
      relays: [],
      seq: 1,
      prev: ZERO_HASH,
    }),
    nameNow,
  );
  const blockedName = await stampPow(await signAct(id, "name", {
    name: "porn.aziel",
    owner: id.handle,
    target: { type: "hash", value: object_hash },
    expires: null,
    seq: 2,
    prev: blockReg.statement_hash,
    prev_record: ZERO_HASH,
  }));
  const blocked = await relayName(blockState, blockedName, nameNow);
  if (blocked.ok) throw new Error("blocked name was accepted");
  const csamState = createRelayState();
  const csamReg = await relayRegister(
    csamState,
    await signAct(id, "register", {
      enc_public_key: id.enc_public_key,
      product: "mesh",
      presence: "live",
      relays: [],
      seq: 1,
      prev: ZERO_HASH,
    }),
    nameNow,
  );
  const csamName = await stampPow(await signAct(id, "name", {
    name: "csam.aziel",
    owner: id.handle,
    target: { type: "hash", value: object_hash },
    expires: null,
    seq: 2,
    prev: csamReg.statement_hash,
    prev_record: ZERO_HASH,
  }));
  const csamRefused = await relayName(csamState, csamName, nameNow);
  if (csamRefused.ok || csamRefused.reason !== "CSAM") throw new Error(csamRefused.message || csamRefused.code);
  const isoId = await person(SEED_B, ENC_B);
  const isoState = createRelayState();
  const isoReg = await relayRegister(
    isoState,
    await signAct(isoId, "register", {
      enc_public_key: isoId.enc_public_key,
      product: "mesh",
      presence: "live",
      relays: [],
      seq: 1,
      prev: ZERO_HASH,
    }),
    nameNow,
  );
  const isolation = await signAct(isoId, "isolation", {
    subject: isoId.handle,
    reason: "NUDITY",
    check: "image-nudity",
    model: "absent",
    evidence_hash: object_hash,
    seq: 2,
    prev: isoReg.statement_hash,
  });
  const isoOut = await relayIsolation(isoState, isolation, nameNow);
  if (!isoOut.ok) throw new Error(isoOut.message || isoOut.code);
  const appeal = await signAct(isoId, "appeal", {
    isolation_hash: isoOut.statement_hash,
    note: "request a re-check",
    seq: 3,
    prev: isoOut.statement_hash,
  });
  const appealOut = await relayAppeal(isoState, appeal, nameNow);
  if (!appealOut.ok) throw new Error(appealOut.message || appealOut.code);
  const restoreState = createRelayState();
  const restoreReg = await relayRegister(
    restoreState,
    await signAct(id, "register", {
      enc_public_key: id.enc_public_key,
      product: "mesh",
      presence: "live",
      relays: [],
      seq: 1,
      prev: ZERO_HASH,
    }),
    nameNow,
  );
  const put = await relayObject(restoreState, await signAct(id, "object", { hash: object_hash, body_b64 }), nameNow);
  if (!put.ok) throw new Error(put.message || put.code);
  const restore = await signAct(id, "restore", {
    slot: "ae",
    hub: "AZ.AzielEliab.AZ",
    object_hash,
    prev_slot: ZERO_HASH,
    seq: 2,
    prev: restoreReg.statement_hash,
  });
  const restoreOut = await relayRestore(restoreState, restore, nameNow);
  if (!restoreOut.ok) throw new Error(restoreOut.message || restoreOut.code);
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
    name_claim: nameClaim,
    name_claim_statement_hash: nameClaimed.statement_hash,
    name_transfer: nameTransfer,
    name_over_cap: { cap: NAME_CAP, code: overRefused.code, record: overCap },
    name_pow_bits: NAME_POW_BITS,
    name_pending_ms: NAME_PENDING_MS,
    witness_k: WITNESS_K,
    equivocation: {
      left: equivLeft.body,
      right: equivRight.body,
      left_hash: equiv.left_hash,
      right_hash: equiv.right_hash,
      code: equiv.code,
      network_cutoff: equiv.network_cutoff,
    },
    airgap_bundle: airgap,
    airgap_manifest_sha256: airgapChecked.manifest_sha256,
    name_block: {
      code: blocked.code,
      reason: blocked.reason,
      evidence_hash: blocked.evidence_hash,
      content_stored: blocked.content_stored,
      blocklist: blocked.blocklist,
      record: blockedName,
    },
    name_csam: {
      code: csamRefused.code,
      reason: csamRefused.reason,
      evidence_hash: csamRefused.evidence_hash,
      content_stored: csamRefused.content_stored,
      name_stored: csamRefused.name_stored,
      blocklist: csamRefused.blocklist,
      record: csamName,
    },
    blocklist: NAME_BLOCKLIST.map((row) => ({ token: row.token, reason: row.reason, scope: row.scope })),
    isolation: {
      code: isoOut.code,
      reason: isoOut.reason,
      content_stored: isoOut.content_stored,
      statement_hash: isoOut.statement_hash,
      record: isolation,
    },
    appeal: {
      applied: appealOut.applied,
      isolation_remains: appealOut.isolation_remains,
      statement_hash: appealOut.statement_hash,
      record: appeal,
    },
    restore: {
      code: restoreOut.code,
      slot: restoreOut.slot,
      hub: restoreOut.hub,
      object_hash: restoreOut.object_hash,
      verified: restoreOut.verified,
      statement_hash: restoreOut.statement_hash,
      record: restore,
    },
    slots: {
      user_slot_cap: USER_SLOT_CAP,
      reserved_slot_cap: RESERVED_SLOT_CAP,
      reserved: RESERVED_SLOTS.map((row) => ({ slot: row.slot, hub: row.hub, origin: row.origin })),
      blocklist_version: BLOCKLIST_VERSION,
    },
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

assert.equal(roleMay("admin", "name"), true);
assert.equal(roleMay("developer", "name"), true);
assert.equal(roleMay("guest", "name"), false);
assert.equal(roleMay("admin", "ref"), true);
assert.deepEqual(CAP7_AZ_ALLOWLIST, cap7FactoryMeshNames());
assert.deepEqual(AZ_STAR_ALLOWLIST, Object.values(CAP7_REAL_ALIGNMENT).map((row) => row.display_name));
assert.equal(vectors.name_over_cap.code, "FED-MESH-NAME-CAP");
assert.equal(vectors.name_over_cap.cap, USER_SLOT_CAP);
assert.equal(vectors.name_over_cap.record.name, `name-${NAME_CAP + 1}.aziel`);
assert.equal(vectors.slots.user_slot_cap, 3);
assert.equal(vectors.slots.reserved_slot_cap, 4);
assert.equal(vectors.name_block.code, "FED-MESH-NAME-BLOCK");
assert.equal(vectors.name_block.content_stored, false);
assert.equal(vectors.name_csam.code, "FED-MESH-NAME-BLOCK");
assert.equal(vectors.name_csam.reason, "CSAM");
assert.equal(vectors.name_csam.content_stored, false);
assert.equal(vectors.name_csam.name_stored, false);
assert.equal(vectors.name_csam.record.name, "csam.aziel");
assert.ok(vectors.blocklist.some((row) => row.token === "csam" && row.reason === "CSAM"));
assert.equal(vectors.isolation.content_stored, false);
assert.equal(vectors.appeal.applied, false);
assert.equal(vectors.appeal.isolation_remains, true);
assert.equal(vectors.restore.verified, true);
assert.equal(vectors.restore.slot, "ae");
assert.equal(requestLimitKind("/v1/mesh/relay/name", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/name", "GET"), null);
assert.equal(roleMay("developer", "witness"), true);
assert.equal(roleMay("developer", "island"), true);
assert.equal(roleMay("developer", "restore"), true);
assert.equal(roleMay("developer", "isolation"), true);
assert.equal(roleMay("developer", "appeal"), true);
assert.equal(roleMay("guest", "restore"), false);
assert.equal(roleMay("guest", "isolation"), false);
assert.equal(roleMay("guest", "witness"), false);
assert.equal(roleMay("guest", "quarantine"), false);
assert.equal(requestLimitKind("/v1/mesh/relay/witness", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/witness", "GET"), null);
assert.equal(requestLimitKind("/v1/mesh/relay/equivocation", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/island", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/airgap", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/restore", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/isolation", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/fedmesh/isolation", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/fedmesh/isolation", "GET"), null);
assert.equal(requestLimitKind("/v1/fedmesh", "GET"), null);
assert.equal(requestLimitKind("/v1/mesh/relay/appeal", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/relay/slot", "GET"), null);
assert.equal(requestLimitKind("/v1/mesh/relay/isolation", "GET"), null);
assert.equal(vectors.equivocation.network_cutoff, false);
assert.equal(vectors.equivocation.code, "FED-MESH-OK");
assert.equal(vectors.name_pow_bits, NAME_POW_BITS);
assert.equal(vectors.witness_k, WITNESS_K);
assert.equal(vectors.airgap_bundle.manifest_sha256, vectors.airgap_manifest_sha256);
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
assert.equal(cite.zero_knowledge, false);
assert.equal(cite.worker_executes_peer_code, false);
assert.equal(cite.scanner, "absent");
assert.equal(cite.classifiers_run_here, false);
assert.equal(cite.user_slot_cap, USER_SLOT_CAP);
assert.equal(cite.reserved_slot_cap, RESERVED_SLOT_CAP);
assert.equal(cite.blocklist_version, BLOCKLIST_VERSION);
assert.equal(cite.limits.user_slot_cap, 3);
assert.equal(cite.limits.reserved_slot_cap, 4);
assert.equal(cite.witness_k, WITNESS_K);
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
  await register(state, bob, now);
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
  const bobTip = (await directoryEntry(state, bob.handle)).tip;
  const bobBeat = await signAct(bob, "heartbeat", { presence: "live", seq: 2, prev: bobTip });
  const bobOk = await relayHeartbeat(state, bobBeat, now);
  assert.equal(bobOk.ok, true, bobOk.message);
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
  assert.equal(cached.executable, false);
  assert.equal(cached.scanner, "absent");
  assert.equal(cached.verified, true);
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
  assert.equal(mismatch.gate, "FG-GATE-REFUSE");
  assert.equal(mismatch.stored, false);
  assert.equal((await relayObjectGet(state, "ab".repeat(32))).code, "FED-MESH-NO-OBJECT");
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  const hash = await sha256HexBytes(utf8("local-first"));
  const bare = await signAct(alice, "name", {
    name: "library.aziel",
    owner: alice.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 2,
    prev: a.prev,
    prev_record: ZERO_HASH,
  });
  const noPow = await relayName(state, bare, now);
  assert.equal(noPow.code, "FED-MESH-POW");
  assert.equal((await directoryEntry(state, alice.handle)).seq, 1);
  const claim = await stampPow(bare);
  const claimed = await relayName(state, claim, now);
  assert.equal(claimed.ok, true, claimed.message);
  assert.equal(claimed.chainlock.anchored, true);
  assert.equal(claimed.owner, alice.handle);
  assert.equal(claimed.status, "pending");
  assert.equal(claimed.final, false);
  assert.equal(claimed.live, false);
  const served = await relayNameRead(state, { name: "library.aziel" }, now);
  assert.equal(served.record.statement_hash, claimed.statement_hash);
  const fork = await signAct(alice, "name", {
    name: "library.aziel",
    owner: alice.handle,
    target: { type: "ref", value: "heads/main" },
    expires: null,
    seq: 3,
    prev: claimed.statement_hash,
    prev_record: ZERO_HASH,
  });
  assert.equal((await relayName(state, fork, now)).code, "FED-MESH-FORK");
  assert.equal((await directoryEntry(state, alice.handle)).seq, 2);
  const transfer = await stampPow(await signAct(alice, "name", {
    name: "library.aziel",
    owner: bob.handle,
    target: { type: "handle", value: bob.handle },
    expires: null,
    seq: 3,
    prev: claimed.statement_hash,
    prev_record: claimed.statement_hash,
  }));
  const moved = await relayName(state, transfer, now);
  assert.equal(moved.ok, true, moved.message);
  assert.equal(moved.owner, bob.handle);
  assert.equal(moved.status, "pending");
  assert.equal((await relayNameRead(state, { name: "Library.Aziel" }, now)).record.owner, bob.handle);
  const rival = await stampPow(await signAct(cara, "name", {
    name: "library.aziel",
    owner: cara.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 1,
    prev: ZERO_HASH,
    prev_record: ZERO_HASH,
  }));
  const rivalOut = await relayName(state, rival, now);
  assert.equal(rivalOut.ok, true, rivalOut.message);
  assert.equal(rivalOut.status, "pending");
  let prev = a.prev;
  const fresh = createRelayState();
  const reg = await register(fresh, alice, now);
  prev = reg.prev;
  let seq = 1;
  for (let i = 1; i <= NAME_CAP; i++) {
    seq += 1;
    const row = await stampPow(await signAct(alice, "name", {
      name: `cap-${i}.aziel`,
      owner: alice.handle,
      target: { type: "hash", value: hash },
      expires: null,
      seq,
      prev,
      prev_record: ZERO_HASH,
    }));
    const out = await relayName(fresh, row, now);
    assert.equal(out.ok, true, out.message);
    prev = out.statement_hash;
  }
  seq += 1;
  const eighth = await stampPow(await signAct(alice, "name", {
    name: `cap-${NAME_CAP + 1}.aziel`,
    owner: alice.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq,
    prev,
    prev_record: ZERO_HASH,
  }));
  const refused = await relayName(fresh, eighth, now);
  assert.equal(refused.code, "FED-MESH-NAME-CAP");
  assert.equal(refused.http_status, 429);
  assert.equal((await directoryEntry(fresh, alice.handle)).seq, NAME_CAP + 1);
  const self = await signAct(alice, "name", {
    name: `${alice.handle.slice(1).toLowerCase()}.aziel`,
    owner: alice.handle,
    target: { type: "handle", value: alice.handle },
    expires: null,
    seq,
    prev,
    prev_record: ZERO_HASH,
  });
  const selfOut = await relayName(fresh, self, now);
  assert.equal(selfOut.ok, true, selfOut.message);
  assert.equal(selfOut.self_certifying, true);
  assert.equal(selfOut.status, "final");
  assert.equal(selfOut.final, true);
  const dns = await signAct(alice, "name", {
    name: "azgrid.az",
    owner: alice.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: seq + 1,
    prev: selfOut.statement_hash,
    prev_record: ZERO_HASH,
  });
  const dnsOut = await relayName(fresh, dns, now);
  assert.equal(dnsOut.code, "FED-MESH-DNS");
  assert.match(dnsOut.message, /azgrid\.az/);
  assert.match(dnsOut.message, /AZ\.AzielEliab\.AZ/);
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  const b = await register(state, bob, now);
  const c = await register(state, cara, now);
  const hash = await sha256HexBytes(utf8("local-first"));
  const claim = await stampPow(await signAct(alice, "name", {
    name: "atlas.aziel",
    owner: alice.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 2,
    prev: a.prev,
    prev_record: ZERO_HASH,
  }));
  const claimed = await relayName(state, claim, now);
  assert.equal(claimed.ok, true, claimed.message);
  assert.equal(claimed.status, "pending");
  const witnessed = await relayWitness(state, await signAct(bob, "witness", {
    subject_hash: claimed.statement_hash,
    subject_kind: "name",
    seq: 2,
    prev: b.prev,
  }), now);
  assert.equal(witnessed.ok, true, witnessed.message);
  assert.equal(witnessed.witnesses, 1);
  assert.equal((await relayNameRead(state, { name: "atlas.aziel" }, now + NAME_PENDING_MS)).record.status, "pending");
  const second = await relayWitness(state, await signAct(cara, "witness", {
    subject_hash: claimed.statement_hash,
    subject_kind: "name",
    seq: 2,
    prev: c.prev,
  }), now);
  assert.equal(second.ok, true, second.message);
  assert.equal(second.witnesses, WITNESS_K);
  assert.equal((await relayNameRead(state, { name: "atlas.aziel" }, now)).record.final, false);
  const aged = await relayNameRead(state, { name: "atlas.aziel" }, now + NAME_PENDING_MS);
  assert.equal(aged.record.status, "final");
  assert.equal(aged.record.live, true);
  const dana = await person(Uint8Array.from({ length: 32 }, (_, i) => (i * 13 + 5) % 256), ENC_C);
  const taken = await stampPow(await signAct(dana, "name", {
    name: "atlas.aziel",
    owner: dana.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 1,
    prev: ZERO_HASH,
    prev_record: ZERO_HASH,
  }));
  assert.equal((await relayName(state, taken, now + NAME_PENDING_MS)).code, "FED-MESH-NAME-TAKEN");
  const stale = await makeRef(bob, {
    ref: "heads/main",
    object_hash: hash,
    prev_ref: ZERO_HASH,
    seq: 1,
    prev: ZERO_HASH,
  });
  assert.equal((await relayRef(state, stale.body, now)).code, "FED-MESH-ROLLBACK");
  const flip = claim.sig[8] === "A" ? "B" : "A";
  const poisoned = { ...claim, sig: `${claim.sig.slice(0, 8)}${flip}${claim.sig.slice(9)}` };
  assert.equal((await relayName(createRelayState(), poisoned, now)).code, "FED-MESH-BAD-SIG");
  const evil = await stampPow(await signAct(alice, "name", {
    name: "module.aziel",
    owner: alice.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 3,
    prev: claimed.statement_hash,
    prev_record: ZERO_HASH,
  }));
  evil.script = "while(1){}";
  const refusedExec = await relayName(state, evil, now);
  assert.equal(refusedExec.code, "FED-MESH-NO-EXEC");
  assert.equal((await relayNameRead(state, { name: "module.aziel" }, now)).code, "FED-MESH-NO-NAME");
  const eq = await relayEquivocation(state, {
    v: "FED-MESH-1.0",
    kind: "equivocation",
    left: vectors.equivocation.left,
    right: vectors.equivocation.right,
  }, now);
  assert.equal(eq.ok, true, eq.message);
  assert.equal(eq.network_cutoff, false);
  assert.equal(JSON.stringify(eq).includes("score"), false);
  const afterFlag = await makeRef(alice, {
    ref: "heads/main",
    object_hash: hash,
    prev_ref: ZERO_HASH,
    seq: 3,
    prev: claimed.statement_hash,
  });
  assert.equal((await relayRef(state, afterFlag.body, now)).code, "FED-MESH-EQUIVOCATION");
  const bobStill = await relayHeartbeat(state, await signAct(bob, "heartbeat", {
    presence: "live",
    seq: 3,
    prev: (await directoryEntry(state, bob.handle)).tip,
  }), now);
  assert.equal(bobStill.ok, true, bobStill.message);
  const cut = await relayQuarantine(state, await signAct(cara, "quarantine", {
    peer: bob.handle,
    decision: "cut",
    seq: 3,
    prev: (await directoryEntry(state, cara.handle)).tip,
  }), now);
  assert.equal(cut.ok, true, cut.message);
  assert.equal(cut.network_cutoff, false);
  const bobAfterCut = await relayHeartbeat(state, await signAct(bob, "heartbeat", {
    presence: "live",
    seq: 4,
    prev: bobStill.statement_hash,
  }), now);
  assert.equal(bobAfterCut.ok, true, bobAfterCut.message);
  const vouch = await relayVouch(state, await signAct(bob, "vouch", {
    subject: alice.handle,
    subject_public_key: alice.public_key,
    seq: 5,
    prev: bobAfterCut.statement_hash,
  }), now);
  assert.equal(vouch.ok, true, vouch.message);
  assert.equal(vouch.local_trust_only, true);
  assert.equal(JSON.stringify(vouch).includes("score"), false);
  const advisory = await relayAdvisory(state, await signAct(bob, "advisory", {
    subject: alice.handle,
    note: "two acts at one sequence",
    seq: 6,
    prev: vouch.statement_hash,
  }), now);
  assert.equal(advisory.ok, true, advisory.message);
  assert.equal(advisory.applied, false);
}

{
  const state = createRelayState();
  const a = await register(state, alice, now);
  const hash = await sha256HexBytes(utf8("local-first"));
  const ref = await makeRef(alice, {
    ref: "heads/main",
    object_hash: hash,
    prev_ref: ZERO_HASH,
    seq: 2,
    prev: a.prev,
  });
  const anchored = await relayRef(state, ref.body, now);
  assert.equal(anchored.ok, true, anchored.message);
  const off = await relayIsland(state, await signAct(alice, "island", {
    mode: "off",
    seq: 3,
    prev: anchored.statement_hash,
  }), now);
  assert.equal(off.ok, true, off.message);
  assert.equal(off.radios_changed, false);
  const blocked = await makeRef(alice, {
    ref: "heads/next",
    object_hash: hash,
    prev_ref: ZERO_HASH,
    seq: 4,
    prev: off.statement_hash,
  });
  assert.equal((await relayRef(state, blocked.body, now)).code, "FED-MESH-ISLAND");
  const on = await relayIsland(state, await signAct(alice, "island", {
    mode: "on",
    seq: 4,
    prev: off.statement_hash,
  }), now);
  assert.equal(on.ok, true, on.message);
  const resumed = await makeRef(alice, {
    ref: "heads/next",
    object_hash: hash,
    prev_ref: ZERO_HASH,
    seq: 5,
    prev: on.statement_hash,
  });
  const synced = await relayRef(state, resumed.body, now);
  assert.equal(synced.ok, true, synced.message);
  assert.equal((await directoryEntry(state, alice.handle)).seq, 5);
}

{
  const relays = [0, 1, 2, 3, 4].map(() => createRelayState());
  const hash = await sha256HexBytes(utf8("local-first"));
  const reg = await signAct(alice, "register", {
    enc_public_key: alice.enc_public_key,
    product: "mesh",
    presence: "live",
    relays: [],
    seq: 1,
    prev: ZERO_HASH,
  });
  let tip = "";
  for (const relay of relays) {
    const out = await relayRegister(relay, reg, now);
    assert.equal(out.ok, true, out.message);
    tip = out.statement_hash;
  }
  const ref = await makeRef(alice, {
    ref: "heads/main",
    object_hash: hash,
    prev_ref: ZERO_HASH,
    seq: 2,
    prev: tip,
  });
  for (const relay of relays.slice(0, 4)) {
    assert.equal((await relayRef(relay, ref.body, now)).ok, true);
  }
  const late = await relayRef(relays[4], ref.body, now);
  assert.equal(late.ok, true, late.message);
  const fork = await makeRef(alice, {
    ref: "heads/main",
    object_hash: "cd".repeat(32),
    prev_ref: ZERO_HASH,
    seq: 3,
    prev: late.statement_hash,
  });
  assert.equal((await relayRef(relays[4], fork.body, now)).code, "FED-MESH-FORK");
}

{
  const env = await sealAct(alice, {
    to: bob.handle,
    recipientEncPublicKey: bob.enc_public_key,
    seq: 9,
    prev: ZERO_HASH,
    plaintext: "tenant-secret",
  });
  assert.equal(await openAct(bob, env), "tenant-secret");
  assert.equal(await openAct(cara, env), null);
  const badAir = { ...vectors.airgap_bundle, manifest_sha256: "00".repeat(32) };
  const air = await relayAirgap(createRelayState(), badAir);
  assert.equal(air.code, "FED-MESH-HASH-MISMATCH");
  assert.equal(air.gate, "FG-GATE-REFUSE");
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

{
  assert.equal(nameBlockHit("essex"), null);
  assert.equal(nameBlockHit("child"), null);
  assert.equal(nameBlockHit("childcare"), null);
  assert.equal(nameBlockHit("sex").reason, "NAME-BLOCK");
  assert.equal(nameBlockHit("porn").reason, "NAME-BLOCK");
  assert.equal(nameBlockHit("childporn").reason, "CSAM");
  assert.equal(nameBlockHit("csam").reason, "CSAM");
  assert.equal(nameBlockHit("child-sex").reason, "CSAM");
  assert.equal(nameBlockHit("analysis"), null);
  assert.equal(nameBlockHit("kkk").reason, "HATE");
  const hash = await sha256HexBytes(utf8("local-first"));
  const clean = createRelayState();
  const cleanReg = await register(clean, alice, now);
  const essex = await relayName(clean, await stampPow(await signAct(alice, "name", {
    name: "essex.aziel",
    owner: alice.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 2,
    prev: cleanReg.prev,
    prev_record: ZERO_HASH,
  })), now);
  assert.equal(essex.ok, true, essex.message);
  const childName = await relayName(clean, await stampPow(await signAct(alice, "name", {
    name: "child.aziel",
    owner: alice.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 3,
    prev: essex.statement_hash,
    prev_record: ZERO_HASH,
  })), now);
  assert.equal(childName.ok, true, childName.message);
  const analysis = await relayName(clean, await stampPow(await signAct(alice, "name", {
    name: "analysis.aziel",
    owner: alice.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 4,
    prev: childName.statement_hash,
    prev_record: ZERO_HASH,
  })), now);
  assert.equal(analysis.ok, true, analysis.message);

  const sexState = createRelayState();
  const sexReg = await register(sexState, alice, now);
  const sexOut = await relayName(sexState, await stampPow(await signAct(alice, "name", {
    name: "sex.aziel",
    owner: alice.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 2,
    prev: sexReg.prev,
    prev_record: ZERO_HASH,
  })), now);
  assert.equal(sexOut.code, "FED-MESH-NAME-BLOCK");
  assert.equal(sexOut.reason, "NAME-BLOCK");
  assert.equal(sexOut.content_stored, false);
  assert.equal(sexOut.evidence_hash.length, 64);
  assert.equal((await directoryEntry(sexState, alice.handle)).seq, 1);
  const afterBlock = await relayHeartbeat(sexState, await signAct(alice, "heartbeat", {
    presence: "live",
    seq: 2,
    prev: sexReg.prev,
  }), now);
  assert.equal(afterBlock.code, "FED-MESH-ISOLATED");
  const sexRead = await relayIsolationRead(sexState, alice.handle);
  assert.equal(sexRead.reason, "NAME-BLOCK");
  assert.equal(sexRead.content_stored, false);
  assert.equal(sexRead.local_data_deleted, false);

  const csamState = createRelayState();
  const csamReg = await register(csamState, bob, now);
  const csamOut = await relayName(csamState, await stampPow(await signAct(bob, "name", {
    name: "childporn.aziel",
    owner: bob.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 2,
    prev: csamReg.prev,
    prev_record: ZERO_HASH,
  })), now);
  assert.equal(csamOut.code, "FED-MESH-NAME-BLOCK");
  assert.equal(csamOut.reason, "CSAM");
  assert.equal(csamOut.content_stored, false);
  assert.equal(JSON.stringify(csamOut).includes("childporn"), false);
  const csamRead = await relayIsolationRead(csamState, bob.handle);
  assert.equal(csamRead.reason, "CSAM");
  assert.equal(csamRead.name_stored, false);
  assert.equal(csamRead.content_stored, false);
  assert.equal(JSON.stringify(csamRead).includes("childporn"), false);
  assert.equal(csamRead.evidence_hash, csamOut.evidence_hash);
  const csamLabel = createRelayState();
  const csamLabelReg = await register(csamLabel, cara, now);
  const csamLabelOut = await relayName(csamLabel, await stampPow(await signAct(cara, "name", {
    name: "csam.aziel",
    owner: cara.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 2,
    prev: csamLabelReg.prev,
    prev_record: ZERO_HASH,
  })), now);
  assert.equal(csamLabelOut.code, "FED-MESH-NAME-BLOCK");
  assert.equal(csamLabelOut.reason, "CSAM");
  assert.equal(csamLabelOut.content_stored, false);
  assert.equal(csamLabelOut.name_stored, false);
  assert.equal(JSON.stringify(csamLabelOut).includes("csam.aziel"), false);
  const csamLabelRead = await relayIsolationRead(csamLabel, cara.handle);
  assert.equal(csamLabelRead.reason, "CSAM");
  assert.equal(csamLabelRead.name_stored, false);
  assert.equal(JSON.stringify(csamLabelRead).includes("csam.aziel"), false);

  const isoState = createRelayState();
  const caraReg = await register(isoState, cara, now);
  const aliceReg = await register(isoState, alice, now);
  const foreign = await relayIsolation(isoState, await signAct(alice, "isolation", {
    subject: cara.handle,
    reason: "HATE",
    check: "text-hate",
    model: "absent",
    evidence_hash: hash,
    seq: 2,
    prev: aliceReg.prev,
  }), now);
  assert.equal(foreign.code, "FED-MESH-BAD-INPUT");
  assert.equal((await directoryEntry(isoState, alice.handle)).seq, 1);
  const withBytes = await relayIsolation(isoState, await signAct(cara, "isolation", {
    subject: cara.handle,
    reason: "NUDITY",
    check: "image-nudity",
    model: "absent",
    evidence_hash: hash,
    body_b64: "aaaa",
    seq: 2,
    prev: caraReg.prev,
  }), now);
  assert.equal(withBytes.code, "FED-MESH-BAD-INPUT");
  const self = await relayIsolation(isoState, await signAct(cara, "isolation", {
    subject: cara.handle,
    reason: "NUDITY",
    check: "image-nudity",
    model: "absent",
    evidence_hash: hash,
    seq: 2,
    prev: caraReg.prev,
  }), now);
  assert.equal(self.ok, true, self.message);
  assert.equal(self.content_stored, false);
  assert.equal(self.reason, "NUDITY");
  assert.equal(self.chainlock.anchored, true);
  const appeal = await relayAppeal(isoState, await signAct(cara, "appeal", {
    isolation_hash: self.statement_hash,
    note: "request a re-check",
    seq: 3,
    prev: self.statement_hash,
  }), now);
  assert.equal(appeal.ok, true, appeal.message);
  assert.equal(appeal.applied, false);
  assert.equal(appeal.isolation_remains, true);
  const still = await relayName(isoState, await stampPow(await signAct(cara, "name", {
    name: "atlas.aziel",
    owner: cara.handle,
    target: { type: "hash", value: hash },
    expires: null,
    seq: 4,
    prev: appeal.statement_hash,
    prev_record: ZERO_HASH,
  })), now);
  assert.equal(still.code, "FED-MESH-ISOLATED");
  assert.equal((await relayNameRead(isoState, { name: "atlas.aziel" }, now)).code, "FED-MESH-NO-NAME");

  const slotState = createRelayState();
  const slotReg = await register(slotState, alice, now);
  const body_b64 = bytesToB64url(utf8("local-first"));
  const cached = await relayObject(slotState, await signAct(alice, "object", { hash, body_b64 }), now);
  assert.equal(cached.ok, true, cached.message);
  const missing = await relayRestore(slotState, await signAct(alice, "restore", {
    slot: "ae",
    hub: "AZ.AzielEliab.AZ",
    object_hash: "ab".repeat(32),
    prev_slot: ZERO_HASH,
    seq: 2,
    prev: slotReg.prev,
  }), now);
  assert.equal(missing.code, "FED-MESH-NO-OBJECT");
  assert.equal((await directoryEntry(slotState, alice.handle)).seq, 1);
  const wrongHub = await relayRestore(slotState, await signAct(alice, "restore", {
    slot: "ae",
    hub: "AZ.Godlock.AZ",
    object_hash: hash,
    prev_slot: ZERO_HASH,
    seq: 2,
    prev: slotReg.prev,
  }), now);
  assert.equal(wrongHub.code, "FED-MESH-BAD-INPUT");
  const custom = await relayRestore(slotState, await signAct(alice, "restore", {
    slot: "mysite",
    hub: "AZ.AzielEliab.AZ",
    object_hash: hash,
    prev_slot: ZERO_HASH,
    seq: 2,
    prev: slotReg.prev,
  }), now);
  assert.equal(custom.code, "FED-MESH-BAD-INPUT");
  const restored = await relayRestore(slotState, await signAct(alice, "restore", {
    slot: "ae",
    hub: "AZ.AzielEliab.AZ",
    object_hash: hash,
    prev_slot: ZERO_HASH,
    seq: 2,
    prev: slotReg.prev,
  }), now);
  assert.equal(restored.ok, true, restored.message);
  assert.equal(restored.verified, true);
  assert.equal(restored.signed, true);
  const forked = await relayRestore(slotState, await signAct(alice, "restore", {
    slot: "ae",
    hub: "AZ.AzielEliab.AZ",
    object_hash: hash,
    prev_slot: ZERO_HASH,
    seq: 3,
    prev: restored.statement_hash,
  }), now);
  assert.equal(forked.code, "FED-MESH-FORK");
  assert.equal((await directoryEntry(slotState, alice.handle)).seq, 2);
  const slots = await relaySlotRead(slotState, alice.handle);
  assert.equal(slots.reserved.length, 4);
  assert.equal(slots.user_slot_cap, 3);
  assert.equal(slots.reserved[0].slot, "ae");
  assert.equal(slots.reserved[0].user_nameable, false);
  assert.equal(slots.reserved[0].mirror.object_hash, hash);
  assert.equal(slots.reserved[0].mirror.verified, true);
  const island = await relayIsland(slotState, await signAct(alice, "island", {
    mode: "off",
    seq: 3,
    prev: restored.statement_hash,
  }), now);
  assert.equal(island.ok, true, island.message);
  const earlyAppeal = await relayAppeal(slotState, await signAct(alice, "appeal", {
    isolation_hash: hash,
    note: "no isolation yet",
    seq: 4,
    prev: island.statement_hash,
  }), now);
  assert.equal(earlyAppeal.code, "FED-MESH-BAD-INPUT");
  const back = await relayIsland(slotState, await signAct(alice, "island", {
    mode: "on",
    seq: 4,
    prev: island.statement_hash,
  }), now);
  assert.equal(back.ok, true, back.message);
  const slotIso = await relayIsolation(slotState, await signAct(alice, "isolation", {
    subject: alice.handle,
    reason: "HATE",
    check: "text-hate",
    model: "absent",
    evidence_hash: hash,
    seq: 5,
    prev: back.statement_hash,
  }), now);
  assert.equal(slotIso.ok, true, slotIso.message);
  const blockedRestore = await relayRestore(slotState, await signAct(alice, "restore", {
    slot: "corpus",
    hub: "AZ.AzielCorpusLibrary.AZ",
    object_hash: hash,
    prev_slot: ZERO_HASH,
    seq: 6,
    prev: slotIso.statement_hash,
  }), now);
  assert.equal(blockedRestore.code, "FED-MESH-ISOLATED");
  assert.equal((await relayObjectGet(slotState, hash)).code, "FED-MESH-ISOLATED");
  assert.equal((await relaySlotRead(slotState, alice.handle)).code, "FED-MESH-ISOLATED");
  assert.deepEqual(CAP7_AZ_ALLOWLIST, cap7FactoryMeshNames());
  assert.deepEqual(AZ_STAR_ALLOWLIST, Object.values(CAP7_REAL_ALIGNMENT).map((row) => row.display_name));

  const aliasState = createRelayState();
  const aliasReg = await register(aliasState, alice, now);
  const viaDaemon = await dispatchRelay("POST", "/v1/fedmesh/isolation", await signAct(alice, "isolation", {
    subject: alice.handle,
    reason: "NUDITY",
    check: "image-nudity",
    model: "absent",
    evidence_hash: hash,
    seq: 2,
    prev: aliasReg.prev,
  }), aliasState, { now });
  assert.equal(viaDaemon.ok, true, viaDaemon.message);
  assert.equal(viaDaemon.op, "isolation");
  assert.equal(viaDaemon.content_stored, false);
  assert.equal(viaDaemon.reason, "NUDITY");
  assert.equal(viaDaemon.local_data_deleted, false);
  assert.equal(viaDaemon.radios_changed, false);
  const viaRead = await dispatchRelay("GET", "/v1/fedmesh/isolation", {}, aliasState, { handle: alice.handle, now });
  assert.equal(viaRead.ok, true, viaRead.message);
  assert.equal(viaRead.content_stored, false);
  assert.equal(viaRead.statement_hash, viaDaemon.statement_hash);
  const unknownDaemon = await dispatchRelay("POST", "/v1/fedmesh/send", { v: "FED-MESH-1.0" }, aliasState, { now });
  assert.equal(unknownDaemon.ok, false);
  const meshGet = await dispatchMeshHttp("GET", "/v1/fedmesh", {}, {}, "https://example.test", new URLSearchParams());
  assert.equal(meshGet.status, 200);
  assert.equal(meshGet.body.get_never_enables, true);
  assert.equal(meshGet.body.op, "relay-cite");
  const meshGetAgain = await dispatchMeshHttp("GET", "/v1/fedmesh", {}, {}, "https://example.test", new URLSearchParams());
  assert.deepEqual(meshGetAgain.body.bearers, meshGet.body.bearers);
  assert.equal(meshGetAgain.body.enabled, meshGet.body.enabled);
}

console.log("verify-fed-mesh: ok");

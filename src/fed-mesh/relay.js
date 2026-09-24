/**
 * FED-MESH-1.0 relay. Local-First Edge Mesh.
 * Routes signed ciphertext and ref updates. Does not execute tenant tasks.
 * Does not store private keys. Does not require plaintext. One relay among many.
 * Author: Aziel Eliab only.
 */

import { append as chainlockAppend } from "../chainlock/ops.js";
import { storeFor } from "../chainlock/store.js";
import { append as temporalAppend, genesis as temporalGenesis } from "../engines/temporallock/engine.js";
import { b64urlToBytes, bytesToHex, canonicalHandle, handleBody, hashStatement, isHex64, publicKeyMatchesHandle, sha256Bytes } from "./codec.js";
import { nameBlockHit, verifyAirgapBundle, verifyNamePow } from "./guard.js";
import { verifyObject } from "./identity.js";
import {
  BATCH_RING,
  BOOTSTRAP_CAP,
  FED_AUTHOR,
  FED_CITE,
  FED_SPEC,
  INBOX_CAP,
  INBOX_QUOTA_BYTES,
  INBOX_TTL_MS,
  MAX_CHANGES,
  MAX_CIPHERTEXT_BYTES,
  MAX_ENVELOPE_BYTES,
  MAX_OBJECT_BYTES,
  MAX_PEER_LIST_BYTES,
  MAX_PEERS,
  MAX_ROLLUP_BYTES,
  AZ_DNS_RULE,
  AZIEL_NAME_RE,
  BLOCKLIST_VERSION,
  CONTENT_ISOLATION_REASONS,
  MAX_SYNC_ACTS,
  MSG_PER_MIN,
  PEER_ROUTE_PER_MIN,
  NAME_CAP,
  NAME_PENDING_MS,
  NAME_POW_BITS,
  RESERVED_SLOTS,
  RESERVED_SLOT_CAP,
  USER_SLOT_CAP,
  OBJECT_CACHE_BYTES,
  OBJECT_CACHE_CAP,
  REF_NAME_RE,
  SELF_LABEL_RE,
  PREV_WINDOW,
  PRESENCE_TTL_MS,
  PULL_SKEW_MS,
  RATE_WINDOW_MS,
  ROSTER_CAP,
  VERIFIED_HANDLES_NOTE,
  WITNESS_K,
  ZERO_HASH,
} from "./spec.js";

const SECRET_KEYS = new Set(["private_key", "privatekey", "secret", "secret_key", "seed", "pkcs8", "enc_private_key"]);
const EXEC_KEYS = new Set(["code", "wasm", "script", "contract", "smart_contract", "bytecode", "source"]);

const ALLOWED = {
  register: ["v", "kind", "handle", "public_key", "enc_public_key", "product", "presence", "relays", "seq", "prev", "sig"],
  heartbeat: ["v", "kind", "handle", "public_key", "presence", "seq", "prev", "sig"],
  leave: ["v", "kind", "handle", "public_key", "seq", "prev", "sig"],
  msg: ["v", "kind", "handle", "public_key", "to", "seq", "prev", "nonce", "eph_public_key", "ciphertext", "via", "sig"],
  pull: ["v", "kind", "handle", "public_key", "ts", "sig"],
  deliver: ["v", "kind", "handle", "public_key", "seq", "prev", "ack", "sig"],
  peers: ["v", "kind", "handle", "public_key", "seq", "prev", "peers", "sig"],
  bootstrap: ["v", "kind", "handle", "public_key", "seq", "prev", "relays", "sig"],
  rollup: ["v", "kind", "handle", "public_key", "seq", "prev", "batch_id", "changes", "co_signers", "multisig", "signatures", "sig"],
  "remote-task": ["v", "kind", "requester", "requester_public_key", "executor", "executor_public_key", "task_hash", "result_hash", "seq", "prev", "requester_sig", "executor_sig"],
  forward: ["v", "kind", "handle", "public_key", "to", "seq", "prev", "nonce", "eph_public_key", "ciphertext", "sig"],
  ref: ["v", "kind", "handle", "public_key", "ref", "object_hash", "prev_ref", "seq", "prev", "sig"],
  sync: ["v", "kind", "handle", "public_key", "act_hashes", "acts", "sig"],
  object: ["v", "kind", "handle", "public_key", "hash", "body_b64", "sig"],
  name: ["v", "kind", "handle", "public_key", "name", "owner", "target", "expires", "seq", "prev", "prev_record", "pow", "sig"],
  witness: ["v", "kind", "handle", "public_key", "subject_hash", "subject_kind", "seq", "prev", "sig"],
  vouch: ["v", "kind", "handle", "public_key", "subject", "subject_public_key", "seq", "prev", "sig"],
  advisory: ["v", "kind", "handle", "public_key", "subject", "note", "seq", "prev", "sig"],
  quarantine: ["v", "kind", "handle", "public_key", "peer", "decision", "seq", "prev", "sig"],
  island: ["v", "kind", "handle", "public_key", "mode", "seq", "prev", "sig"],
  "airgap-bundle": ["v", "kind", "handle", "public_key", "manifest", "manifest_sha256", "sig"],
  restore: ["v", "kind", "handle", "public_key", "slot", "hub", "object_hash", "prev_slot", "seq", "prev", "sig"],
  isolation: ["v", "kind", "handle", "public_key", "subject", "reason", "check", "model", "evidence_hash", "seq", "prev", "sig"],
  appeal: ["v", "kind", "handle", "public_key", "isolation_hash", "note", "seq", "prev", "sig"],
};

const defaultState = createRelayState(null);
const states = new WeakMap();

export function createRelayState(env = null) {
  return {
    env: env && typeof env === "object" ? env : null,
    selfUrl: "",
    mem: {
      roster: {},
      inboxes: {},
      peers: [],
      bootstraps: [],
      batches: [],
      click: 0,
      rates: {},
      chainEnv: { __fed: true },
    },
  };
}

export function relayStateFor(env) {
  if (!env || typeof env !== "object") return defaultState;
  let state = states.get(env);
  if (!state) {
    state = createRelayState(env);
    states.set(env, state);
  }
  return state;
}

export function resetFedMesh() {
  const fresh = createRelayState(null);
  defaultState.env = null;
  defaultState.selfUrl = "";
  defaultState.mem = fresh.mem;
}

function binding(env) {
  if (env && env.MESH && typeof env.MESH.get === "function" && typeof env.MESH.put === "function") {
    return { kv: env.MESH, prefix: "fed|" };
  }
  if (env && env.USES && typeof env.USES.get === "function" && typeof env.USES.put === "function") {
    return { kv: env.USES, prefix: "mesh|fed|" };
  }
  return null;
}

async function loadKey(state, key, fallback) {
  const bound = binding(state.env);
  if (!bound) return state.mem[key] === undefined ? fallback : state.mem[key];
  try {
    const raw = await bound.kv.get(bound.prefix + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function saveKey(state, key, value) {
  const bound = binding(state.env);
  if (!bound) {
    state.mem[key] = value;
    return;
  }
  await bound.kv.put(bound.prefix + key, JSON.stringify(value));
}

function fail(code, message, extra = {}) {
  const http_status = extra.http_status || (code === "FED-MESH-RATE" || code === "FED-MESH-QUOTA" ? 429 : code === "FED-MESH-TOO-LARGE" ? 413 : 400);
  return {
    ok: false,
    code,
    message,
    author: FED_AUTHOR,
    spec: FED_SPEC,
    http_status,
    ...extra,
  };
}

function ok(extra = {}) {
  return { ok: true, code: "FED-MESH-OK", author: FED_AUTHOR, spec: FED_SPEC, ...extra };
}

function walkKeys(value, found) {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    found.push(key);
    walkKeys(value[key], found);
  }
}

function rejectSecrets(body) {
  const keys = [];
  walkKeys(body, keys);
  const hit = keys.find((k) => SECRET_KEYS.has(String(k).toLowerCase()));
  if (hit) return fail("FED-MESH-PRIVATE-KEY", "Private keys stay on the node. This relay does not accept them.");
  return null;
}

function rejectExec(body) {
  const keys = [];
  walkKeys(body, keys);
  const hit = keys.find((k) => EXEC_KEYS.has(String(k).toLowerCase()));
  if (hit) return fail("FED-MESH-NO-EXEC", "Tenant tasks run on local nodes. This relay does not execute code.");
  return null;
}

function poisonText(value) {
  return /poison/i.test(String(value || ""));
}

function envelopeBytes(body) {
  try {
    return utf8Length(JSON.stringify(body));
  } catch {
    return MAX_ENVELOPE_BYTES + 1;
  }
}

function utf8Length(text) {
  return new TextEncoder().encode(text).length;
}

export function relayUrlAllowed(raw) {
  let url;
  try {
    url = new URL(String(raw || ""));
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (url.protocol === "http:" && loopback) return true;
  if (url.protocol === "https:") return true;
  return false;
}

export function actStatement(kind, body) {
  return statementFor(kind, body);
}

function statementFor(kind, body) {
  if (kind === "remote-task") {
    return {
      v: FED_SPEC,
      kind: "remote-task",
      requester: body.requester,
      requester_public_key: body.requester_public_key,
      executor: body.executor,
      executor_public_key: body.executor_public_key,
      task_hash: body.task_hash,
      result_hash: body.result_hash,
      seq: body.seq,
      prev: body.prev,
    };
  }
  if (kind === "rollup") {
    return {
      v: FED_SPEC,
      kind: "rollup-statement",
      handle: body.handle,
      public_key: body.public_key,
      seq: body.seq,
      prev: body.prev,
      batch_id: body.batch_id,
      changes: body.changes,
      co_signers: body.co_signers,
      multisig: body.multisig || null,
    };
  }
  if (kind === "sync") {
    return {
      v: FED_SPEC,
      kind: "sync",
      handle: body.handle,
      public_key: body.public_key,
      act_hashes: body.act_hashes,
    };
  }
  if (kind === "ref") {
    return {
      v: FED_SPEC,
      kind: "ref",
      handle: body.handle,
      public_key: body.public_key,
      ref: body.ref,
      object_hash: body.object_hash,
      prev_ref: body.prev_ref,
      seq: body.seq,
      prev: body.prev,
    };
  }
  if (kind === "object") {
    return {
      v: FED_SPEC,
      kind: "object",
      handle: body.handle,
      public_key: body.public_key,
      hash: body.hash,
      body_b64: body.body_b64,
    };
  }
  if (kind === "airgap-bundle") {
    return {
      v: FED_SPEC,
      kind: "airgap-bundle",
      handle: body.handle,
      public_key: body.public_key,
      manifest: body.manifest,
    };
  }
  if (kind === "name") {
    return {
      v: FED_SPEC,
      kind: "name",
      handle: body.handle,
      public_key: body.public_key,
      name: body.name,
      owner: body.owner,
      target: body.target,
      expires: body.expires,
      seq: body.seq,
      prev: body.prev,
      prev_record: body.prev_record,
    };
  }
  if (kind === "restore") {
    return {
      v: FED_SPEC,
      kind: "restore",
      handle: body.handle,
      public_key: body.public_key,
      slot: body.slot,
      hub: body.hub,
      object_hash: body.object_hash,
      prev_slot: body.prev_slot,
      seq: body.seq,
      prev: body.prev,
    };
  }
  if (kind === "isolation") {
    return {
      v: FED_SPEC,
      kind: "isolation",
      handle: body.handle,
      public_key: body.public_key,
      subject: body.subject,
      reason: body.reason,
      check: body.check,
      model: body.model,
      evidence_hash: body.evidence_hash,
      seq: body.seq,
      prev: body.prev,
    };
  }
  if (kind === "appeal") {
    return {
      v: FED_SPEC,
      kind: "appeal",
      handle: body.handle,
      public_key: body.public_key,
      isolation_hash: body.isolation_hash,
      note: body.note,
      seq: body.seq,
      prev: body.prev,
    };
  }
  const allow = ALLOWED[kind] || [];
  const out = {};
  for (const key of allow) {
    if (key === "sig" || key === "signatures") continue;
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function unknownKeys(kind, body) {
  const allow = new Set(ALLOWED[kind] || []);
  return Object.keys(body || {}).filter((k) => !allow.has(k));
}

async function noteRate(state, handle, now) {
  const rates = state.mem.rates;
  const row = rates[handle] || { start: now, count: 0 };
  if (now - row.start >= RATE_WINDOW_MS) {
    row.start = now;
    row.count = 0;
  }
  row.count += 1;
  rates[handle] = row;
  if (row.count > MSG_PER_MIN) {
    return fail("FED-MESH-RATE", `Handle ${handle} sent more than ${MSG_PER_MIN} signed acts in one minute.`, {
      limit: MSG_PER_MIN,
      retry_after_ms: RATE_WINDOW_MS - (now - row.start),
    });
  }
  return null;
}

async function loadRoster(state) {
  const roster = await loadKey(state, "roster", {});
  return roster && typeof roster === "object" ? roster : {};
}

async function saveRoster(state, roster) {
  await saveKey(state, "roster", roster);
}

function fresh(record, now) {
  return record && now - (Number(record.last_seen) || 0) <= PRESENCE_TTL_MS;
}

export async function fedPublicCounts(env, now = Date.now()) {
  const state = relayStateFor(env);
  const roster = await loadRoster(state);
  let verified = 0;
  let live = 0;
  let isolated = 0;
  for (const record of Object.values(roster)) {
    if (!record || !record.handle) continue;
    if (!fresh(record, now)) continue;
    verified += 1;
    if (record.presence === "isolated") isolated += 1;
    else live += 1;
  }
  return {
    verified_handles: verified,
    handle_nodes: verified,
    handle_live_nodes: live,
    handle_isolated_nodes: isolated,
    verified_handles_note: VERIFIED_HANDLES_NOTE,
    federated: { ...FED_CITE, counts: "verified_handles" },
  };
}

async function guardHandle(state, handle, kind) {
  const flags = (await loadKey(state, "equivocation", {})) || {};
  if (flags[handle]) {
    return fail("FED-MESH-EQUIVOCATION", "This handle signed two different acts at one sequence. Later acts from this handle are refused on this relay.", {
      seq: flags[handle].seq,
      network_cutoff: false,
    });
  }
  if (kind !== "appeal" && kind !== "island") {
    const ethics = (await loadKey(state, "ethics", {})) || {};
    const row = ethics[handle];
    if (row) {
      return fail("FED-MESH-ISOLATED", "This handle is isolated on this relay. Names and objects are not relayed. The local node keeps its own data. Appeal and island receipts are still accepted.", {
        reason: row.reason,
        check: row.check,
        evidence_hash: row.evidence_hash,
        content_stored: false,
        local_data_deleted: false,
        radios_changed: false,
      });
    }
  }
  if (kind !== "island" && kind !== "appeal") {
    const islands = (await loadKey(state, "islands", {})) || {};
    const row = islands[handle];
    if (row && row.mode === "off") {
      return fail("FED-MESH-ISLAND", "This handle receipted island mode. The local runtime stays up. This relay accepts an island on receipt, then a sync.");
    }
  }
  return null;
}

async function chainCheck(record, seq, prev, link) {
  const tipSeq = record && Number.isInteger(record.seq) ? record.seq : 0;
  const tipPrev = record && record.tip ? record.tip : ZERO_HASH;
  const seen = (record && record.seen_seq) || [];
  if (seq <= tipSeq) {
    if (seen.includes(seq)) {
      return fail("FED-MESH-REPLAY", `Sequence ${seq} was already accepted for this handle.`);
    }
    return fail("FED-MESH-ROLLBACK", `Sequence ${seq} is older than anchored sequence ${tipSeq}.`);
  }
  if (seq !== tipSeq + 1) {
    return fail("FED-MESH-GAP", `Sequence ${seq} does not follow ${tipSeq}.`);
  }
  if (prev !== tipPrev) {
    const prior = record && record.prev_map && record.prev_map[prev];
    if (prior && prior !== link) {
      return fail("FED-MESH-FORK", "Two acts claim the same prev for this handle.");
    }
    return fail("FED-MESH-FORK", "prev does not match this handle's tip.");
  }
  return null;
}

function advance(record, seq, prev, link) {
  const prev_map = { ...(record.prev_map || {}) };
  prev_map[prev] = link;
  const keys = Object.keys(prev_map);
  while (keys.length > PREV_WINDOW) {
    delete prev_map[keys.shift()];
  }
  const seen_seq = [...(record.seen_seq || []), seq].slice(-PREV_WINDOW);
  return { ...record, seq, tip: link, prev_map, seen_seq };
}

async function anchor(state, { handle, kind, link, seq, summary }) {
  const chainEnv = state.env || state.mem.chainEnv;
  let chainlock = { anchored: false };
  try {
    const stamped = await chainlockAppend(storeFor(chainEnv), {
      c: "mesh",
      caller: `fed-${handleBody(handle)}`,
      subject: handle,
      fact: `${kind} seq ${seq} ${String(link).slice(0, 32)}`,
      k: "fed-mesh",
    });
    chainlock = { anchored: stamped.ok === true, durable: Boolean(state.env && state.env.CHAINLOCK), seq: stamped.seq };
  } catch (err) {
    chainlock = { anchored: false, detail: String(err && err.message ? err.message : err) };
  }
  const roster = await loadRoster(state);
  const record = roster[handle] || {};
  const click = (Number(await loadKey(state, "click", 0)) || 0) + 1;
  const evidence = `sha256:${link}`;
  const sum = summary || `${kind} ${handle} seq ${seq}`;
  let temporal;
  try {
    if (!record.timeslate) {
      temporal = await temporalGenesis({ summary: sum, evidence, confidence: 1, click_index: click });
    } else {
      temporal = await temporalAppend({
        chain: [record.timeslate],
        summary: sum,
        evidence,
        confidence: 1,
        click_index: click,
      });
    }
  } catch (err) {
    temporal = { error: String(err && err.message ? err.message : err) };
  }
  const timeslate = temporal && temporal.receipt ? temporal.receipt : record.timeslate || null;
  await saveKey(state, "click", click);
  return { chainlock, timeslate, click_index: click };
}

async function prepare(state, body, kind, now) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail("FED-MESH-BAD-INPUT", "Send one JSON object.");
  }
  const secret = rejectSecrets(body);
  if (secret) return secret;
  const exec = rejectExec(body);
  if (exec) return exec;
  if (body.v !== FED_SPEC) return fail("FED-MESH-BAD-INPUT", `v must be ${FED_SPEC}.`);
  if (body.kind !== kind) return fail("FED-MESH-BAD-INPUT", `kind must be ${kind}.`);
  const extra = unknownKeys(kind, body);
  if (extra.length) return fail("FED-MESH-BAD-INPUT", `Unknown field ${extra[0]}.`);
  if (envelopeBytes(body) > MAX_ENVELOPE_BYTES) {
    return fail("FED-MESH-TOO-LARGE", `Envelope is larger than ${MAX_ENVELOPE_BYTES} bytes.`);
  }
  if (!body.sig && kind !== "remote-task") return fail("FED-MESH-UNSIGNED", "This act needs a signature from the handle's key.");
  const handle = canonicalHandle(kind === "remote-task" ? body.requester : body.handle);
  const public_key = kind === "remote-task" ? body.requester_public_key : body.public_key;
  if (!handle) return fail("FED-MESH-BAD-HANDLE", "Handle must be # and 11 Crockford characters.");
  const match = await publicKeyMatchesHandle(public_key, handle);
  if (!match) return fail("FED-MESH-HANDLE-MISMATCH", "Handle does not match the signing key.");
  const statement = statementFor(kind, { ...body, handle, public_key: kind === "remote-task" ? body.requester_public_key : public_key });
  if (kind !== "remote-task") {
    const good = await verifyObject(public_key, statement, body.sig);
    if (!good) return fail("FED-MESH-BAD-SIG", "Signature did not verify. The relay will not treat a changed message as valid.");
  }
  const guarded = await guardHandle(state, handle, kind);
  if (guarded) return guarded;
  if (kind !== "pull") {
    const rated = await noteRate(state, handle, now);
    if (rated) return rated;
  }
  const link = await hashStatement(statement);
  return { ok: true, handle, public_key, statement, link };
}

async function commitChain(state, handle, seq, prev, link, now, patch) {
  const roster = await loadRoster(state);
  const current = roster[handle] || null;
  const chained = await chainCheck(current, seq, prev, link);
  if (chained) return chained;
  const next = advance(
    {
      handle,
      public_key: patch.public_key,
      enc_public_key: patch.enc_public_key || (current && current.enc_public_key) || "",
      relays: patch.relays || (current && current.relays) || [],
      presence: patch.presence || (current && current.presence) || "live",
      last_seen: now,
      seq: current ? current.seq : 0,
      tip: current ? current.tip : ZERO_HASH,
      prev_map: current ? current.prev_map : {},
      seen_seq: current ? current.seen_seq : [],
      timeslate: current ? current.timeslate : null,
    },
    seq,
    prev,
    link,
  );
  if (!current && Object.keys(roster).length >= ROSTER_CAP) {
    return fail("FED-MESH-ROSTER-FULL", `This relay holds ${ROSTER_CAP} handles. That cap is local to this relay.`);
  }
  roster[handle] = next;
  await saveRoster(state, roster);
  return { ok: true, record: next };
}

function requireSeq(body) {
  if (!Number.isInteger(body.seq) || body.seq < 1) return fail("FED-MESH-BAD-INPUT", "seq must be an integer starting at 1.");
  if (!isHex64(String(body.prev || "").toLowerCase())) return fail("FED-MESH-BAD-INPUT", "prev must be 64 lowercase hex characters.");
  body.prev = String(body.prev).toLowerCase();
  return null;
}

export async function relayCite(state = defaultState) {
  const boot = await loadKey(state, "boot", []);
  return ok({
    op: "relay-cite",
    ...FED_CITE,
    health: "up",
    health_check: "GET /v1/mesh/relay",
    bootstrap_lists: Array.isArray(boot) ? boot.length : 0,
    limits: {
      msg_per_min: MSG_PER_MIN,
      max_ciphertext_bytes: MAX_CIPHERTEXT_BYTES,
      max_rollup_bytes: MAX_ROLLUP_BYTES,
      inbox_ttl_ms: INBOX_TTL_MS,
      inbox_quota_bytes: INBOX_QUOTA_BYTES,
      max_peers: MAX_PEERS,
      max_object_bytes: MAX_OBJECT_BYTES,
      object_cache_cap: OBJECT_CACHE_CAP,
      object_cache_bytes: OBJECT_CACHE_BYTES,
      max_sync_acts: MAX_SYNC_ACTS,
      name_cap: NAME_CAP,
      user_slot_cap: USER_SLOT_CAP,
      reserved_slot_cap: RESERVED_SLOT_CAP,
      blocklist_version: BLOCKLIST_VERSION,
      name_pow_bits: NAME_POW_BITS,
      name_pending_ms: NAME_PENDING_MS,
      witness_k: WITNESS_K,
      peer_route_per_min: PEER_ROUTE_PER_MIN,
    },
    routing_metadata: ["handle", "to", "seq", "prev", "public_key", "eph_public_key", "nonce", "ciphertext", "relays"],
  });
}

export async function relayRegister(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "register", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const encRaw = b64urlToBytes(body.enc_public_key);
  if (!encRaw || encRaw.length !== 32) return fail("FED-MESH-BAD-INPUT", "enc_public_key must be a raw X25519 key.");
  const relays = Array.isArray(body.relays) ? body.relays.map((u) => String(u)) : [];
  if (relays.length > MAX_PEERS) return fail("FED-MESH-TOO-LARGE", `A node may name at most ${MAX_PEERS} relays.`);
  for (const url of relays) {
    if (!relayUrlAllowed(url)) return fail("FED-MESH-BAD-INPUT", "Relay URLs are https, or http on localhost.");
  }
  const presence = ["live", "locked", "isolated"].includes(body.presence) ? body.presence : "live";
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, {
    public_key: ready.public_key,
    enc_public_key: body.enc_public_key,
    relays,
    presence,
  });
  if (!committed.ok) return committed;
  const anchored = await anchor(state, { handle: ready.handle, kind: "register", link: ready.link, seq: body.seq, summary: `register ${ready.handle}` });
  const roster = await loadRoster(state);
  roster[ready.handle].timeslate = anchored.timeslate;
  await saveRoster(state, roster);
  return ok({
    op: "register",
    handle: ready.handle,
    seq: body.seq,
    statement_hash: ready.link,
    presence,
    relays,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
    click_index: anchored.click_index,
  });
}

export async function relayHeartbeat(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "heartbeat", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const presence = ["live", "locked", "isolated"].includes(body.presence) ? body.presence : "live";
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, {
    public_key: ready.public_key,
    presence,
  });
  if (!committed.ok) return committed;
  return ok({ op: "heartbeat", handle: ready.handle, seq: body.seq, statement_hash: ready.link, presence });
}

export async function relayLeave(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "leave", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, {
    public_key: ready.public_key,
    presence: "isolated",
  });
  if (!committed.ok) return committed;
  return ok({ op: "leave", handle: ready.handle, presence: "isolated", statement_hash: ready.link });
}

async function allowedUrls(state) {
  const peers = await loadKey(state, "peers", []);
  const set = new Set();
  for (const peer of peers || []) {
    if (peer && peer.url) set.add(String(peer.url));
  }
  const roster = await loadRoster(state);
  for (const record of Object.values(roster)) {
    for (const url of record.relays || []) set.add(String(url));
  }
  return set;
}

async function storeInbox(state, to, envelope, now) {
  const handle = canonicalHandle(to);
  if (!handle) return fail("FED-MESH-BAD-HANDLE", "Recipient handle is not a #handle.");
  const boxes = await loadKey(state, "inboxes", {});
  const rows = Array.isArray(boxes[handle]) ? boxes[handle] : [];
  const live = rows.filter((row) => now - (Number(row.stored_at) || 0) <= INBOX_TTL_MS);
  const msg_hash = await hashStatement(envelope);
  if (live.some((row) => row.msg_hash === msg_hash)) return { ok: true, msg_hash, duplicate: true };
  const ct = b64urlToBytes(envelope.ciphertext);
  if (!ct || ct.length > MAX_CIPHERTEXT_BYTES) {
    return fail("FED-MESH-TOO-LARGE", `Ciphertext must be 1 to ${MAX_CIPHERTEXT_BYTES} bytes.`);
  }
  const size = live.reduce((n, row) => n + utf8Length(JSON.stringify(row.envelope)), 0);
  const nextSize = size + utf8Length(JSON.stringify(envelope));
  if (live.length >= INBOX_CAP || nextSize > INBOX_QUOTA_BYTES) {
    return fail("FED-MESH-QUOTA", "This handle's mailbox is full on this relay. Quota is per handle.");
  }
  live.push({ msg_hash, stored_at: now, envelope });
  boxes[handle] = live;
  await saveKey(state, "inboxes", boxes);
  return { ok: true, msg_hash };
}

export async function relayPost(state, body, now = Date.now(), opts = {}) {
  const ready = await prepare(state, body, "msg", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const to = canonicalHandle(body.to);
  if (!to) return fail("FED-MESH-BAD-HANDLE", "to must be a #handle.");
  if (to === ready.handle) return fail("FED-MESH-BAD-INPUT", "Send to another handle.");
  if (typeof body.ciphertext !== "string" || typeof body.nonce !== "string" || typeof body.eph_public_key !== "string") {
    return fail("FED-MESH-BAD-INPUT", "A message carries nonce, eph_public_key, and ciphertext.");
  }
  const ct = b64urlToBytes(body.ciphertext);
  if (!ct || ct.length < 1 || ct.length > MAX_CIPHERTEXT_BYTES) {
    return fail("FED-MESH-TOO-LARGE", `Ciphertext must be 1 to ${MAX_CIPHERTEXT_BYTES} bytes.`);
  }
  const roster = await loadRoster(state);
  const recipient = roster[to] || null;
  const allow = await allowedUrls(state);
  const named = [...(recipient && recipient.relays ? recipient.relays : []), ...(Array.isArray(body.via) ? body.via : [])];
  const self = String(state.selfUrl || "");
  const forwardable = named.filter((url) => {
    const target = String(url || "");
    if (!target || target === self) return false;
    if (!relayUrlAllowed(target)) return false;
    return allow.has(target) || Boolean(recipient && (recipient.relays || []).includes(target));
  });
  if (!recipient && forwardable.length === 0) {
    return fail("FED-MESH-NO-ROUTE", "This relay has no mailbox for that handle and no allowed relay to forward to. A shared relay or a signed relay list is required.");
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  let stored = null;
  if (recipient) {
    stored = await storeInbox(state, to, body, now);
    if (!stored.ok) return stored;
  }
  const forwarded = [];
  const skipped = [];
  for (const url of named) {
    const target = String(url || "");
    if (!target || target === self) continue;
    if (!allow.has(target) && !(recipient && (recipient.relays || []).includes(target))) {
      skipped.push({ url: target, code: "FED-MESH-NO-ROUTE" });
      continue;
    }
    if (!relayUrlAllowed(target)) {
      skipped.push({ url: target, code: "FED-MESH-BAD-INPUT" });
      continue;
    }
    const forwardUrl = target.endsWith("/forward") ? target : `${target.replace(/\/$/, "")}/forward`;
    if (typeof opts.fetchImpl === "function") {
      try {
        await opts.fetchImpl(forwardUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...body, kind: "msg" }),
        });
        forwarded.push(forwardUrl);
      } catch (err) {
        skipped.push({ url: forwardUrl, code: "FED-MESH-NO-ROUTE", detail: String(err && err.message ? err.message : err) });
      }
    }
  }
  return ok({
    op: "post",
    handle: ready.handle,
    to,
    seq: body.seq,
    statement_hash: ready.link,
    msg_hash: stored && stored.msg_hash,
    stored: Boolean(stored && stored.ok),
    forwarded,
    skipped,
    relay_sees_plaintext: false,
  });
}

export async function relayForward(state, body, now = Date.now()) {
  const msg = body && body.kind === "forward" ? { ...body, kind: "msg" } : body;
  const ready = await prepare(state, msg, "msg", now);
  if (!ready.ok) return ready;
  const to = canonicalHandle(msg.to);
  if (!to) return fail("FED-MESH-BAD-HANDLE", "to must be a #handle.");
  const roster = await loadRoster(state);
  if (!roster[to]) {
    return fail("FED-MESH-NO-ROUTE", "Forward stores mail only for a handle registered on this relay. It does not forward again.");
  }
  const stored = await storeInbox(state, to, msg, now);
  if (!stored.ok) return stored;
  return ok({
    op: "forward",
    to,
    msg_hash: stored.msg_hash,
    duplicate: stored.duplicate === true,
    forwarded_again: false,
    relay_sees_plaintext: false,
  });
}

export async function relayPull(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "pull", now);
  if (!ready.ok) return ready;
  const ts = Date.parse(body.ts || "");
  if (!Number.isFinite(ts) || Math.abs(now - ts) > PULL_SKEW_MS) {
    return fail("FED-MESH-BAD-INPUT", "Pull ts must be ISO time within five minutes of this relay.");
  }
  const boxes = await loadKey(state, "inboxes", {});
  const rows = Array.isArray(boxes[ready.handle]) ? boxes[ready.handle] : [];
  const live = rows.filter((row) => now - (Number(row.stored_at) || 0) <= INBOX_TTL_MS);
  boxes[ready.handle] = live;
  await saveKey(state, "inboxes", boxes);
  return ok({
    op: "pull",
    handle: ready.handle,
    messages: live.map((row) => ({ msg_hash: row.msg_hash, envelope: row.envelope })),
    relay_sees_plaintext: false,
  });
}

export async function relayDeliver(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "deliver", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  if (!Array.isArray(body.ack) || body.ack.length < 1 || body.ack.length > INBOX_CAP) {
    return fail("FED-MESH-BAD-INPUT", "ack is a list of message hashes.");
  }
  const boxes = await loadKey(state, "inboxes", {});
  const rows = Array.isArray(boxes[ready.handle]) ? boxes[ready.handle] : [];
  const ack = new Set(body.ack.map((h) => String(h)));
  const known = rows.filter((row) => ack.has(row.msg_hash));
  if (known.length !== ack.size) return fail("FED-MESH-BAD-INPUT", "Every ack hash must still be in this mailbox.");
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  boxes[ready.handle] = rows.filter((row) => !ack.has(row.msg_hash));
  await saveKey(state, "inboxes", boxes);
  const anchored = await anchor(state, {
    handle: ready.handle,
    kind: "deliver",
    link: ready.link,
    seq: body.seq,
    summary: `deliver ${ready.handle} seq ${body.seq}`,
  });
  const roster = await loadRoster(state);
  if (roster[ready.handle]) {
    roster[ready.handle].timeslate = anchored.timeslate;
    await saveRoster(state, roster);
  }
  return ok({
    op: "deliver",
    handle: ready.handle,
    seq: body.seq,
    statement_hash: ready.link,
    acked: known.length,
    delivery_receipt: {
      spec: FED_SPEC,
      handle: ready.handle,
      public_key: ready.public_key,
      seq: body.seq,
      prev: body.prev,
      statement_hash: ready.link,
      ack: [...ack],
      sig: body.sig,
    },
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
    click_index: anchored.click_index,
  });
}

function peerPoison(peers) {
  const blob = JSON.stringify(peers);
  return poisonText(blob);
}

export async function relayPeers(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "peers", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  if (!Array.isArray(body.peers)) return fail("FED-MESH-BAD-INPUT", "peers must be a list.");
  if (body.peers.length > MAX_PEERS) return fail("FED-MESH-TOO-LARGE", `A peer list holds at most ${MAX_PEERS} relays.`);
  if (utf8Length(JSON.stringify(body.peers)) > MAX_PEER_LIST_BYTES) {
    return fail("FED-MESH-TOO-LARGE", `Peer list is larger than ${MAX_PEER_LIST_BYTES} bytes.`);
  }
  if (peerPoison(body.peers)) return fail("FED-MESH-POISON", "Poison is refused, not stored.");
  const cleaned = [];
  for (const peer of body.peers) {
    if (!peer || typeof peer !== "object") return fail("FED-MESH-BAD-INPUT", "Each peer needs url, handle, and public_key.");
    if (!relayUrlAllowed(peer.url)) return fail("FED-MESH-BAD-INPUT", "Peer URLs are https, or http on localhost.");
    const handle = canonicalHandle(peer.handle);
    if (!handle) return fail("FED-MESH-BAD-HANDLE", "Peer handle is not a #handle.");
    const match = await publicKeyMatchesHandle(peer.public_key, handle);
    if (!match) return fail("FED-MESH-HANDLE-MISMATCH", "A peer handle does not match its key.");
    cleaned.push({ url: String(peer.url), handle, public_key: peer.public_key });
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  await saveKey(state, "peers", cleaned);
  return ok({ op: "peers", peers: cleaned, statement_hash: ready.link });
}

export async function relayBootstrap(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "bootstrap", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  if (!Array.isArray(body.relays) || body.relays.length < 1) return fail("FED-MESH-BAD-INPUT", "A bootstrap list names at least one relay.");
  if (body.relays.length > MAX_PEERS) return fail("FED-MESH-TOO-LARGE", `A bootstrap list holds at most ${MAX_PEERS} relays.`);
  if (peerPoison(body.relays)) return fail("FED-MESH-POISON", "Poison is refused, not stored.");
  const relays = [];
  for (const peer of body.relays) {
    if (!relayUrlAllowed(peer.url)) return fail("FED-MESH-BAD-INPUT", "Bootstrap URLs are https, or http on localhost.");
    const handle = canonicalHandle(peer.handle);
    if (!handle) return fail("FED-MESH-BAD-HANDLE", "Bootstrap handle is not a #handle.");
    const match = await publicKeyMatchesHandle(peer.public_key, handle);
    if (!match) return fail("FED-MESH-HANDLE-MISMATCH", "A bootstrap handle does not match its key.");
    relays.push({ url: String(peer.url), handle, public_key: peer.public_key });
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  const lists = (await loadKey(state, "boot", [])) || [];
  lists.unshift({ signer: ready.handle, public_key: ready.public_key, relays, sig: body.sig, statement_hash: ready.link, seq: body.seq });
  await saveKey(state, "boot", lists.slice(0, BOOTSTRAP_CAP));
  return ok({
    op: "bootstrap",
    relays,
    statement_hash: ready.link,
    only_source: false,
    note: "This signed list is one bootstrap source. A node still needs an address it already has. This Worker is not required.",
  });
}

export async function relayBootstrapRead(state) {
  const lists = (await loadKey(state, "boot", [])) || [];
  return ok({
    op: "bootstrap-read",
    lists,
    only_source: false,
    needs_starting_address: true,
    note: "A new node needs at least one relay address it already has. These lists are signed advertisements this relay has accepted. They are not the only way to start.",
  });
}

async function seenBatch(state, batchId) {
  const ring = (await loadKey(state, "batches", [])) || [];
  return ring.includes(batchId);
}

async function rememberBatch(state, batchId) {
  const ring = (await loadKey(state, "batches", [])) || [];
  ring.unshift(batchId);
  await saveKey(state, "batches", ring.slice(0, BATCH_RING));
}

export async function relayRollup(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "rollup", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  if (utf8Length(JSON.stringify(body.changes || [])) > MAX_ROLLUP_BYTES) {
    return fail("FED-MESH-TOO-LARGE", `Rollup changes are larger than ${MAX_ROLLUP_BYTES} bytes.`);
  }
  if (!Array.isArray(body.changes) || body.changes.length < 1 || body.changes.length > MAX_CHANGES) {
    return fail("FED-MESH-BAD-INPUT", `changes must hold 1 to ${MAX_CHANGES} hash rows.`);
  }
  for (const change of body.changes) {
    if (!change || !isHex64(change.payload_hash) || !canonicalHandle(change.handle)) {
      return fail("FED-MESH-BAD-INPUT", "Each change has a #handle and a 64-hex payload_hash.");
    }
  }
  const co = Array.isArray(body.co_signers) ? body.co_signers.map((h) => canonicalHandle(h)).filter(Boolean) : [];
  if (!co.includes(ready.handle)) return fail("FED-MESH-BAD-INPUT", "The submitter is one of the co-signers.");
  const batchBody = {
    changes: body.changes,
    co_signers: co,
    multisig: body.multisig || null,
    submitter: ready.handle,
  };
  const batch_id = await hashStatement(batchBody);
  if (body.batch_id !== batch_id) return fail("FED-MESH-TAMPER", "batch_id does not match the changes.");
  if (await seenBatch(state, batch_id)) return fail("FED-MESH-REPLAY", "This rollup batch was already anchored.");
  const statement = statementFor("rollup", { ...body, handle: ready.handle, public_key: ready.public_key, batch_id, co_signers: co });
  const sigs = Array.isArray(body.signatures) ? body.signatures : [];
  const seen = new Set();
  for (const row of sigs) {
    const handle = canonicalHandle(row && row.handle);
    if (!handle) return fail("FED-MESH-BAD-HANDLE", "A co-signer handle is not a #handle.");
    const match = await publicKeyMatchesHandle(row.public_key, handle);
    if (!match) return fail("FED-MESH-HANDLE-MISMATCH", "A co-signer handle does not match its key.");
    const good = await verifyObject(row.public_key, statement, row.sig);
    if (!good) return fail("FED-MESH-BAD-SIG", "A co-signer signature did not verify.");
    if (seen.has(handle)) return fail("FED-MESH-REPLAY", "A handle signed this rollup twice. Distinct signers only.");
    seen.add(handle);
  }
  for (const handle of co) {
    if (!seen.has(handle)) return fail("FED-MESH-BAD-SIG", "Every listed co-signer must sign.");
  }
  if (body.multisig) {
    const m = Number(body.multisig.m);
    const n = Number(body.multisig.n);
    const signers = Array.isArray(body.multisig.signers) ? body.multisig.signers.map((h) => canonicalHandle(h)).filter(Boolean) : [];
    if (!Number.isInteger(m) || !Number.isInteger(n) || m < 1 || n < m || signers.length !== n) {
      return fail("FED-MESH-MULTISIG", "Multisig needs integer m-of-n and a signer list of length n.");
    }
    const fromSet = [...seen].filter((h) => signers.includes(h));
    if (fromSet.length < m) {
      return fail("FED-MESH-MULTISIG", `Need ${m} distinct signatures from the declared set. Found ${fromSet.length}.`);
    }
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  await rememberBatch(state, batch_id);
  const anchored = await anchor(state, { handle: ready.handle, kind: "rollup", link: ready.link, seq: body.seq, summary: `rollup ${ready.handle} ${batch_id.slice(0, 12)}` });
  return ok({
    op: "rollup",
    handle: ready.handle,
    batch_id,
    seq: body.seq,
    statement_hash: ready.link,
    signers: [...seen],
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
    click_index: anchored.click_index,
    executed: false,
  });
}

export async function relayRemoteTask(state, body, now = Date.now()) {
  const secret = rejectSecrets(body);
  if (secret) return secret;
  const exec = rejectExec(body);
  if (exec) return exec;
  if (!body || body.kind !== "remote-task") return fail("FED-MESH-BAD-INPUT", "kind must be remote-task.");
  if (!body.requester_sig || !body.executor_sig) return fail("FED-MESH-UNSIGNED", "A remote-task receipt needs both signatures.");
  const requester = canonicalHandle(body.requester);
  const executor = canonicalHandle(body.executor);
  if (!requester || !executor) return fail("FED-MESH-BAD-HANDLE", "Requester and executor must be #handles.");
  if (!(await publicKeyMatchesHandle(body.requester_public_key, requester))) {
    return fail("FED-MESH-HANDLE-MISMATCH", "Requester handle does not match its key.");
  }
  if (!(await publicKeyMatchesHandle(body.executor_public_key, executor))) {
    return fail("FED-MESH-HANDLE-MISMATCH", "Executor handle does not match its key.");
  }
  if (!isHex64(body.task_hash) || !isHex64(body.result_hash)) {
    return fail("FED-MESH-BAD-INPUT", "task_hash and result_hash are 64 hex characters. The task bytes stay on the nodes.");
  }
  const ready = await prepare(state, body, "remote-task", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const statement = ready.statement;
  const reqOk = await verifyObject(body.requester_public_key, statement, body.requester_sig);
  const exOk = await verifyObject(body.executor_public_key, statement, body.executor_sig);
  if (!reqOk || !exOk) return fail("FED-MESH-BAD-SIG", "Both remote-task signatures must verify.");
  const committed = await commitChain(state, requester, body.seq, body.prev, ready.link, now, { public_key: body.requester_public_key });
  if (!committed.ok) return committed;
  const anchored = await anchor(state, { handle: requester, kind: "remote-task", link: ready.link, seq: body.seq, summary: `remote-task ${requester}` });
  return ok({
    op: "remote-task",
    requester,
    executor,
    task_hash: body.task_hash,
    result_hash: body.result_hash,
    statement_hash: ready.link,
    executed: false,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
    click_index: anchored.click_index,
  });
}

export function objectFetchRequest(hash) {
  return { v: FED_SPEC, kind: "object-fetch", hash: String(hash || "").toLowerCase() };
}

export function objectFetchResponse(hash, body_b64) {
  return { v: FED_SPEC, kind: "object", hash, body_b64 };
}

function emptyCache() {
  return { by_hash: {}, order: [], total: 0 };
}

function cacheShape(raw) {
  const by_hash = raw && raw.by_hash && typeof raw.by_hash === "object" ? { ...raw.by_hash } : {};
  const order = Array.isArray(raw && raw.order) ? raw.order.filter((h) => by_hash[h]) : Object.keys(by_hash);
  let total = 0;
  for (const hash of order) total += Number(by_hash[hash].bytes) || 0;
  return { by_hash, order, total };
}

export async function relayRef(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "ref", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const ref = String(body.ref || "");
  if (!REF_NAME_RE.test(ref)) return fail("FED-MESH-BAD-INPUT", "A ref name is lowercase, starts with a letter or digit, and is at most 64 characters.");
  const object_hash = String(body.object_hash || "");
  const prev_ref = String(body.prev_ref || "");
  if (!isHex64(object_hash) || !isHex64(prev_ref)) {
    return fail("FED-MESH-BAD-INPUT", "object_hash and prev_ref are 64 lowercase hex characters. The object bytes stay on the nodes.");
  }
  const refs = (await loadKey(state, "refs", {})) || {};
  const mine = refs[ready.handle] && typeof refs[ready.handle] === "object" ? refs[ready.handle] : {};
  const current = mine[ref] || null;
  const expected = current && current.statement_hash ? current.statement_hash : ZERO_HASH;
  if (prev_ref !== expected) {
    return fail("FED-MESH-FORK", "prev_ref does not match the stored ref for this name.");
  }
  const roster = await loadRoster(state);
  const tipSeq = roster[ready.handle] && Number.isInteger(roster[ready.handle].seq) ? roster[ready.handle].seq : 0;
  if (body.seq <= tipSeq) {
    return fail("FED-MESH-ROLLBACK", `Ref sequence ${body.seq} does not extend anchored sequence ${tipSeq}.`);
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  mine[ref] = {
    ref,
    object_hash,
    prev_ref,
    statement_hash: ready.link,
    seq: body.seq,
  };
  refs[ready.handle] = mine;
  await saveKey(state, "refs", refs);
  const anchored = await anchor(state, { handle: ready.handle, kind: "ref", link: ready.link, seq: body.seq, summary: `ref ${ready.handle} ${ref}` });
  return ok({
    op: "ref",
    handle: ready.handle,
    ref,
    object_hash,
    prev_ref,
    seq: body.seq,
    statement_hash: ready.link,
    object_hosted: false,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
    click_index: anchored.click_index,
  });
}

export async function relayRefsRead(state, handle, refName = "") {
  const id = canonicalHandle(handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Handle must be # and 11 Crockford characters.");
  const refs = (await loadKey(state, "refs", {})) || {};
  const mine = refs[id] && typeof refs[id] === "object" ? refs[id] : {};
  if (refName) {
    const row = mine[String(refName)];
    if (!row) return fail("FED-MESH-NO-REF", "This relay has no ref by that name.", { http_status: 404 });
    return ok({ op: "refs", handle: id, ref: row, object_hosted: false });
  }
  return ok({ op: "refs", handle: id, refs: mine, object_hosted: false });
}

export async function relayObject(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "object", now);
  if (!ready.ok) return ready;
  const hash = String(body.hash || "").toLowerCase();
  if (!isHex64(hash)) return fail("FED-MESH-BAD-INPUT", "hash is 64 hex characters.");
  const bytes = b64urlToBytes(body.body_b64);
  if (!bytes || bytes.length < 1) return fail("FED-MESH-BAD-INPUT", "body_b64 is the object bytes.");
  if (bytes.length > MAX_OBJECT_BYTES) {
    return fail("FED-MESH-TOO-LARGE", `A cached public object is at most ${MAX_OBJECT_BYTES} bytes.`);
  }
  const digest = bytesToHex(await sha256Bytes(bytes));
  if (digest !== hash) {
    return fail("FED-MESH-HASH-MISMATCH", "The object bytes do not hash to the declared hash.", { gate: "FG-GATE-REFUSE", stored: false });
  }
  const cache = cacheShape(await loadKey(state, "objects", emptyCache()));
  const prior = cache.by_hash[hash];
  if (prior) {
    if (prior.body_b64 !== body.body_b64) {
      return fail("FED-MESH-HASH-MISMATCH", "This hash is already cached with different bytes.", { gate: "FG-GATE-REFUSE", stored: false });
    }
    return ok({ op: "object", hash, bytes: prior.bytes, cached: true, chain_act: false, verified: true, executable: false, scanner: "absent" });
  }
  while (cache.order.length >= OBJECT_CACHE_CAP || cache.total + bytes.length > OBJECT_CACHE_BYTES) {
    const old = cache.order.shift();
    if (!old) break;
    cache.total -= Number(cache.by_hash[old].bytes) || 0;
    delete cache.by_hash[old];
  }
  if (cache.order.length >= OBJECT_CACHE_CAP || cache.total + bytes.length > OBJECT_CACHE_BYTES) {
    return fail("FED-MESH-QUOTA", "The public object cache is full.");
  }
  cache.by_hash[hash] = { body_b64: body.body_b64, bytes: bytes.length, signer: ready.handle, verified: true };
  cache.order.push(hash);
  cache.total += bytes.length;
  await saveKey(state, "objects", cache);
  return ok({
    op: "object",
    hash,
    bytes: bytes.length,
    cached: true,
    chain_act: false,
    signer: ready.handle,
    verified: true,
    executable: false,
    scanner: "absent",
    promotion: "cache-only",
  });
}

export async function relayObjectGet(state, hash) {
  const id = String(hash || "").toLowerCase();
  if (!isHex64(id)) return fail("FED-MESH-BAD-INPUT", "Object fetch needs a 64-hex hash.");
  const cache = cacheShape(await loadKey(state, "objects", emptyCache()));
  const row = cache.by_hash[id];
  if (!row || row.verified === false) return fail("FED-MESH-NO-OBJECT", "This relay has no public object for that hash.", { http_status: 404 });
  const ethics = (await loadKey(state, "ethics", {})) || {};
  if (row.signer && ethics[row.signer]) {
    return fail("FED-MESH-ISOLATED", "This relay does not serve objects signed by an isolated handle.", {
      reason: ethics[row.signer].reason,
      evidence_hash: ethics[row.signer].evidence_hash,
      content_stored: false,
    });
  }
  return ok({ op: "object-fetch", ...objectFetchResponse(id, row.body_b64), found: true, verified: true, executable: false });
}

export async function relaySync(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "sync", now);
  if (!ready.ok) return ready;
  if (!Array.isArray(body.act_hashes) || !Array.isArray(body.acts)) {
    return fail("FED-MESH-BAD-INPUT", "sync carries act_hashes and acts.");
  }
  if (body.acts.length < 1 || body.acts.length > MAX_SYNC_ACTS || body.act_hashes.length !== body.acts.length) {
    return fail("FED-MESH-BAD-INPUT", `A sync holds 1 to ${MAX_SYNC_ACTS} ref updates, name records, or rollups.`);
  }
  const applied = [];
  for (let i = 0; i < body.acts.length; i++) {
    const act = body.acts[i];
    if (!act || (act.kind !== "ref" && act.kind !== "rollup" && act.kind !== "name")) {
      return fail("FED-MESH-BAD-INPUT", "A sync carries ref updates, name records, and rollups. Raw objects stay on the node.", { applied, stopped_at: i });
    }
    const actHandle = canonicalHandle(act.kind === "rollup" ? act.handle : act.handle);
    if (actHandle !== ready.handle) {
      return fail("FED-MESH-HANDLE-MISMATCH", "A sync applies this handle's own chain.", { applied, stopped_at: i });
    }
    const statement = statementFor(act.kind, act);
    const link = await hashStatement(statement);
    const claimed = String(body.act_hashes[i] || "").toLowerCase();
    if (link !== claimed) {
      return fail("FED-MESH-TAMPER", "act_hashes does not match the act.", { applied, stopped_at: i });
    }
    const result = act.kind === "ref" ? await relayRef(state, act, now) : act.kind === "name" ? await relayName(state, act, now) : await relayRollup(state, act, now);
    if (!result.ok) return { ...result, applied, stopped_at: i, synced: applied.length };
    applied.push({
      kind: act.kind,
      seq: result.seq,
      statement_hash: result.statement_hash,
      chainlock: result.chainlock,
      timeslate_hash: result.timeslate_hash,
    });
  }
  return ok({
    op: "sync",
    handle: ready.handle,
    applied,
    count: applied.length,
    wrapper_seq: null,
    late: true,
  });
}

function parseAzielName(raw) {
  const name = String(raw || "").trim().toLowerCase();
  if (name.endsWith(".az") && !name.endsWith(".aziel")) {
    return fail("FED-MESH-DNS", AZ_DNS_RULE);
  }
  if (!AZIEL_NAME_RE.test(name)) {
    return fail("FED-MESH-BAD-INPUT", "A mesh name is one label plus .aziel. .az is not a mesh name.");
  }
  const label = name.slice(0, -".aziel".length);
  const self = SELF_LABEL_RE.test(label);
  const owner_handle = self ? canonicalHandle(`#${label}`) : "";
  return { ok: true, name, label, self, owner_handle };
}

function holdsSlot(row, now) {
  if (!row || row.released || !row.owner || row.target == null) return false;
  if (row.expires != null && Number(row.expires) <= now) return false;
  return true;
}

function emptyNameBucket() {
  return { pending: [], final: null };
}

function asBucket(raw) {
  if (!raw) return emptyNameBucket();
  if (Array.isArray(raw.pending) || raw.final) return { pending: raw.pending || [], final: raw.final || null };
  if (raw.statement_hash) return { pending: [], final: { ...raw, status: raw.status || "final" } };
  return emptyNameBucket();
}

function witnessCount(map, hash, signer) {
  const rows = (map && map[hash]) || [];
  const seen = new Set();
  for (const row of rows) {
    if (row && row.handle && row.handle !== signer) seen.add(row.handle);
  }
  return seen.size;
}

function eligibleFinal(bucket, witnesses, now) {
  if (bucket.final && holdsSlot(bucket.final, now) && bucket.final.status === "final") return bucket.final;
  const ready = (bucket.pending || [])
    .filter((row) => holdsSlot(row, now) && (row.self_certifying || (now - row.accepted_at >= NAME_PENDING_MS && witnessCount(witnesses, row.statement_hash, row.signer) >= WITNESS_K)))
    .sort((a, b) => a.accepted_at - b.accepted_at || String(a.statement_hash).localeCompare(String(b.statement_hash)));
  return ready[0] ? { ...ready[0], status: "final" } : null;
}

function friendlyHeld(names, handle, now) {
  const held = new Set();
  for (const raw of Object.values(names || {})) {
    const bucket = asBucket(raw);
    const rows = [...(bucket.pending || [])];
    if (bucket.final) rows.push(bucket.final);
    for (const row of rows) {
      if (!row || row.self_certifying || row.owner !== handle || !holdsSlot(row, now)) continue;
      held.add(row.name);
    }
  }
  return held.size;
}

function targetError(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return fail("FED-MESH-BAD-INPUT", "target is { type: hash|ref|handle, value }.");
  }
  const type = String(target.type || "");
  const value = String(target.value || "");
  if (type === "hash" && isHex64(value)) return null;
  if (type === "ref" && REF_NAME_RE.test(value)) return null;
  if (type === "handle" && canonicalHandle(value)) return null;
  return fail("FED-MESH-BAD-INPUT", "target type is hash (64 hex), ref (a ref name), or handle (a #handle).");
}

function nameRow(row, now, witnesses = {}) {
  const status = row.status === "final" ? "final" : row.released ? "released" : "pending";
  const witnesses_n = witnessCount(witnesses, row.statement_hash, row.signer);
  const final = status === "final" && holdsSlot(row, now);
  return {
    name: row.name,
    owner: row.owner || "",
    target: row.target,
    seq: row.seq,
    prev_record: row.prev_record,
    statement_hash: row.statement_hash,
    expires: row.expires == null ? null : row.expires,
    self_certifying: row.self_certifying === true,
    released: row.released === true,
    status: row.released ? "released" : final ? "final" : "pending",
    final,
    live: final,
    accepted_at: row.accepted_at || null,
    witnesses: witnesses_n,
    witness_k: WITNESS_K,
    signer: row.signer || "",
  };
}

export async function relayName(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "name", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  if (!Object.prototype.hasOwnProperty.call(body, "expires")) {
    return fail("FED-MESH-BAD-INPUT", "expires is null, or a future unix time in milliseconds.");
  }
  if (body.expires !== null && !Number.isInteger(body.expires)) {
    return fail("FED-MESH-BAD-INPUT", "expires is null, or a future unix time in milliseconds.");
  }
  if (body.expires !== null && body.expires <= now) {
    return fail("FED-MESH-NAME-EXPIRED", "expires is already past. A live claim needs a future time, or null for no expiry.");
  }
  const parsed = parseAzielName(body.name);
  if (!parsed.ok) return parsed;
  const ownerRaw = body.owner == null ? "" : String(body.owner);
  const owner = ownerRaw === "" ? "" : canonicalHandle(ownerRaw);
  if (ownerRaw !== "" && !owner) return fail("FED-MESH-BAD-HANDLE", "owner must be a #handle, or empty on release.");
  const prev_record = String(body.prev_record || "");
  if (!isHex64(prev_record)) return fail("FED-MESH-BAD-INPUT", "prev_record is 64 lowercase hex characters.");
  const names = (await loadKey(state, "names", {})) || {};
  const witnesses = (await loadKey(state, "witnesses", {})) || {};
  const bucket = asBucket(names[parsed.name]);
  const chosen = eligibleFinal(bucket, witnesses, now);
  if (chosen && (!bucket.final || bucket.final.statement_hash !== chosen.statement_hash)) {
    bucket.final = { ...chosen, status: "final" };
    bucket.pending = (bucket.pending || []).filter((row) => row.statement_hash !== chosen.statement_hash);
  }
  const finalRow = bucket.final || null;
  const releasing = owner === "" && body.target === null;
  if (parsed.self) {
    if (ready.handle !== parsed.owner_handle || owner !== parsed.owner_handle || releasing) {
      return fail("FED-MESH-HANDLE-MISMATCH", "A self-certifying <handle>.aziel name belongs to that handle. It is not transferred or released.");
    }
  }
  let mode = "claim";
  if (finalRow && holdsSlot(finalRow, now)) {
    if (ready.handle !== finalRow.owner) {
      return fail("FED-MESH-NAME-TAKEN", "This friendly name already has a final owner. The first valid final claim wins.");
    }
    if (prev_record !== finalRow.statement_hash) {
      return fail("FED-MESH-FORK", "prev_record does not match the final name record.");
    }
    mode = "update-final";
  } else if (finalRow && finalRow.released) {
    if (prev_record !== finalRow.statement_hash) {
      return fail("FED-MESH-FORK", "prev_record does not match the released name record.");
    }
    if (releasing || ready.handle !== owner) {
      return fail("FED-MESH-BAD-INPUT", "A new claim is signed by the owner it names.");
    }
    mode = "claim";
  } else {
    const own = (bucket.pending || []).find((row) => row.statement_hash === prev_record && row.signer === ready.handle);
    const mine = (bucket.pending || []).find((row) => row.signer === ready.handle && holdsSlot(row, now));
    if (prev_record === ZERO_HASH) {
      if (mine) return fail("FED-MESH-FORK", "prev_record does not match this handle's pending name record.");
      if (releasing || ready.handle !== owner) {
        return fail("FED-MESH-BAD-INPUT", "A new claim is signed by the owner it names.");
      }
      mode = "claim";
    } else if (own) {
      mode = "update-pending";
    } else {
      return fail("FED-MESH-FORK", "prev_record does not match a pending claim this handle signed.");
    }
  }
  if (!releasing) {
    const badTarget = targetError(body.target);
    if (badTarget) return badTarget;
  }
  if (!parsed.self) {
    const pow = await verifyNamePow(ready.link, body.sig, body.pow, NAME_POW_BITS);
    if (!pow.ok) {
      return fail("FED-MESH-POW", `A friendly .aziel name needs proof-of-work of ${NAME_POW_BITS} leading zero bits over the signed claim.`, {
        pow_bits: NAME_POW_BITS,
      });
    }
    const hit = nameBlockHit(parsed.label);
    if (hit && !releasing) {
      return refuseBlockedName(state, ready, hit, parsed.name, body.seq, now);
    }
  }
  const ownerAlready = [...(bucket.pending || []), finalRow].some((row) => row && row.owner === owner && holdsSlot(row, now) && !row.self_certifying);
  const gaining = !parsed.self && !releasing && !ownerAlready;
  if (gaining && friendlyHeld(names, owner, now) >= NAME_CAP) {
    return fail("FED-MESH-NAME-CAP", `A handle may hold ${NAME_CAP} user .aziel names. Four reserved hub-mirror slots are not user-nameable. The self-certifying name does not count.`, {
      http_status: 429,
      cap: NAME_CAP,
      user_slot_cap: USER_SLOT_CAP,
      reserved_slot_cap: RESERVED_SLOT_CAP,
    });
  }
  const roster = await loadRoster(state);
  const tipSeq = roster[ready.handle] && Number.isInteger(roster[ready.handle].seq) ? roster[ready.handle].seq : 0;
  if (body.seq <= tipSeq) {
    return fail("FED-MESH-ROLLBACK", `Name sequence ${body.seq} does not extend anchored sequence ${tipSeq}.`);
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  const status = parsed.self || mode === "update-final" ? (releasing ? "released" : "final") : releasing ? "released" : "pending";
  const row = {
    name: parsed.name,
    owner: releasing ? "" : owner,
    target: releasing ? null : { type: body.target.type, value: body.target.type === "handle" ? canonicalHandle(body.target.value) : String(body.target.value) },
    expires: body.expires,
    prev_record,
    statement_hash: ready.link,
    seq: body.seq,
    self_certifying: parsed.self,
    released: releasing,
    signer: ready.handle,
    accepted_at: now,
    status,
  };
  if (status === "final" || (status === "released" && mode === "update-final")) {
    bucket.final = row;
    bucket.pending = (bucket.pending || []).filter((item) => item.statement_hash !== prev_record);
  } else if (mode === "update-pending") {
    bucket.pending = (bucket.pending || []).filter((item) => item.statement_hash !== prev_record);
    bucket.pending.push(row);
  } else {
    bucket.pending = bucket.pending || [];
    bucket.pending.push(row);
  }
  names[parsed.name] = bucket;
  await saveKey(state, "names", names);
  const anchored = await anchor(state, {
    handle: ready.handle,
    kind: "name",
    link: ready.link,
    seq: body.seq,
    summary: `name ${parsed.name}`,
  });
  return ok({
    op: "name",
    ...nameRow(row, now, witnesses),
    signer: ready.handle,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
    click_index: anchored.click_index,
    friendly_cap: NAME_CAP,
    pow_bits: parsed.self ? 0 : NAME_POW_BITS,
  });
}

function shownRow(bucket, witnesses, now) {
  const chosen = eligibleFinal(bucket, witnesses, now);
  if (chosen) return { ...chosen, status: "final" };
  if (bucket.final && bucket.final.released) return bucket.final;
  const pending = [...(bucket.pending || [])].sort((a, b) => (a.accepted_at || 0) - (b.accepted_at || 0));
  return pending[0] || null;
}

export async function relayNameRead(state, query = {}, now = Date.now()) {
  const names = (await loadKey(state, "names", {})) || {};
  const witnesses = (await loadKey(state, "witnesses", {})) || {};
  const ethics = (await loadKey(state, "ethics", {})) || {};
  if (query.name) {
    const parsed = parseAzielName(query.name);
    if (!parsed.ok) return parsed;
    const bucket = asBucket(names[parsed.name]);
    const row = shownRow(bucket, witnesses, now);
    if (!row) return fail("FED-MESH-NO-NAME", "This relay has no name record.", { http_status: 404 });
    if (row.owner && ethics[row.owner]) {
      return fail("FED-MESH-ISOLATED", "This relay does not resolve a name held by an isolated handle.", {
        reason: ethics[row.owner].reason,
        evidence_hash: ethics[row.owner].evidence_hash,
        content_stored: false,
      });
    }
    return ok({
      op: "name",
      record: nameRow(row, now, witnesses),
      competing: (bucket.pending || []).length,
      friendly_cap: NAME_CAP,
      az_dns: AZ_DNS_RULE,
    });
  }
  const id = canonicalHandle(query.handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Pass name= or a #handle.");
  if (ethics[id]) {
    return fail("FED-MESH-ISOLATED", "This relay does not resolve names held by an isolated handle.", {
      reason: ethics[id].reason,
      evidence_hash: ethics[id].evidence_hash,
      content_stored: false,
    });
  }
  const owned = [];
  for (const raw of Object.values(names)) {
    const bucket = asBucket(raw);
    const rows = [...(bucket.pending || [])];
    if (bucket.final) rows.push(bucket.final);
    for (const row of rows) {
      if (row && row.owner === id) owned.push(nameRow(row, now, witnesses));
    }
  }
  return ok({
    op: "names",
    handle: id,
    names: owned,
    friendly_held: friendlyHeld(names, id, now),
    friendly_cap: NAME_CAP,
    az_dns: AZ_DNS_RULE,
  });
}

async function verifyLooseAct(body, kinds) {
  if (!body || typeof body !== "object" || !kinds.includes(body.kind)) {
    return fail("FED-MESH-BAD-INPUT", "The proof needs two signed name or ref acts.");
  }
  if (body.v !== FED_SPEC) return fail("FED-MESH-BAD-INPUT", `v must be ${FED_SPEC}.`);
  const handle = canonicalHandle(body.handle);
  if (!handle) return fail("FED-MESH-BAD-HANDLE", "Handle must be # and 11 Crockford characters.");
  const match = await publicKeyMatchesHandle(body.public_key, handle);
  if (!match) return fail("FED-MESH-HANDLE-MISMATCH", "Handle does not match the signing key.");
  if (!Number.isInteger(body.seq) || body.seq < 1) return fail("FED-MESH-BAD-INPUT", "seq must be an integer starting at 1.");
  const statement = statementFor(body.kind, body);
  const good = await verifyObject(body.public_key, statement, body.sig);
  if (!good) return fail("FED-MESH-BAD-SIG", "Signature did not verify.");
  const link = await hashStatement(statement);
  return { ok: true, handle, link, seq: body.seq, kind: body.kind };
}

export async function relayEquivocation(state, body, now = Date.now()) {
  if (!body || body.v !== FED_SPEC || body.kind !== "equivocation") {
    return fail("FED-MESH-BAD-INPUT", "An equivocation proof carries two signed acts.");
  }
  const left = await verifyLooseAct(body.left, ["name", "ref"]);
  if (!left.ok) return left;
  const right = await verifyLooseAct(body.right, ["name", "ref"]);
  if (!right.ok) return right;
  if (left.handle !== right.handle || left.seq !== right.seq) {
    return fail("FED-MESH-BAD-INPUT", "Equivocation is two acts from one handle at one sequence.");
  }
  if (left.link === right.link) return fail("FED-MESH-REPLAY", "Both acts are the same statement.");
  const rated = await noteRate(state, `eq:${left.handle}`, now);
  if (rated) return rated;
  const flags = (await loadKey(state, "equivocation", {})) || {};
  flags[left.handle] = {
    handle: left.handle,
    seq: left.seq,
    left_hash: left.link,
    right_hash: right.link,
    left: body.left,
    right: body.right,
    accepted_at: now,
  };
  await saveKey(state, "equivocation", flags);
  return ok({
    op: "equivocation",
    handle: left.handle,
    seq: left.seq,
    left_hash: left.link,
    right_hash: right.link,
    flagged: true,
    network_cutoff: false,
  });
}

export async function relayEquivocationRead(state, handle) {
  const id = canonicalHandle(handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Pass a #handle.");
  const flags = (await loadKey(state, "equivocation", {})) || {};
  const row = flags[id];
  if (!row) return fail("FED-MESH-NO-NAME", "This relay has no equivocation proof for that handle.", { http_status: 404 });
  return ok({ op: "equivocation", ...row, network_cutoff: false });
}

export async function relayWitness(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "witness", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const subject_hash = String(body.subject_hash || "").toLowerCase();
  if (!isHex64(subject_hash) || body.subject_kind !== "name") {
    return fail("FED-MESH-BAD-INPUT", "A witness names subject_kind name and a 64-hex subject_hash.");
  }
  const names = (await loadKey(state, "names", {})) || {};
  let claim = null;
  for (const raw of Object.values(names)) {
    const bucket = asBucket(raw);
    const rows = [...(bucket.pending || [])];
    if (bucket.final) rows.push(bucket.final);
    claim = rows.find((row) => row && row.statement_hash === subject_hash) || claim;
  }
  if (!claim) return fail("FED-MESH-NO-NAME", "This relay has no name record with that hash.", { http_status: 404 });
  const ethics = (await loadKey(state, "ethics", {})) || {};
  if (ethics[claim.signer] || (claim.owner && ethics[claim.owner])) {
    return fail("FED-MESH-ISOLATED", "This relay does not witness a name from an isolated handle.", {
      reason: (ethics[claim.signer] || ethics[claim.owner]).reason,
      content_stored: false,
    });
  }
  if (claim.signer === ready.handle || claim.self_certifying) {
    return fail("FED-MESH-WITNESS", "A witness is a different handle. A self-certifying name does not take witnesses.");
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  const witnesses = (await loadKey(state, "witnesses", {})) || {};
  const list = Array.isArray(witnesses[subject_hash]) ? witnesses[subject_hash] : [];
  const duplicate = list.some((row) => row.handle === ready.handle);
  if (!duplicate) {
    list.push({ handle: ready.handle, statement_hash: ready.link, accepted_at: now });
    witnesses[subject_hash] = list;
    await saveKey(state, "witnesses", witnesses);
  }
  const count = witnessCount(witnesses, subject_hash, claim.signer);
  const anchored = await anchor(state, { handle: ready.handle, kind: "witness", link: ready.link, seq: body.seq, summary: `witness ${subject_hash.slice(0, 12)}` });
  return ok({
    op: "witness",
    handle: ready.handle,
    statement_hash: ready.link,
    subject_hash,
    witnesses: count,
    witness_k: WITNESS_K,
    duplicate,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
  });
}

export async function relayWitnessRead(state, subjectHash) {
  const subject_hash = String(subjectHash || "").toLowerCase();
  if (!isHex64(subject_hash)) return fail("FED-MESH-BAD-INPUT", "Pass subject_hash as 64 hex characters.");
  const witnesses = (await loadKey(state, "witnesses", {})) || {};
  const list = witnesses[subject_hash] || [];
  return ok({ op: "witnesses", subject_hash, witnesses: list, count: list.length, witness_k: WITNESS_K });
}

export async function relayVouch(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "vouch", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const subject = canonicalHandle(body.subject);
  if (!subject) return fail("FED-MESH-BAD-HANDLE", "subject must be a #handle.");
  const match = await publicKeyMatchesHandle(body.subject_public_key, subject);
  if (!match) return fail("FED-MESH-HANDLE-MISMATCH", "subject does not match subject_public_key.");
  if (subject === ready.handle) return fail("FED-MESH-BAD-INPUT", "A handle does not vouch for itself.");
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  const book = (await loadKey(state, "vouches", {})) || {};
  const list = Array.isArray(book[subject]) ? book[subject] : [];
  list.push({ handle: ready.handle, subject, statement_hash: ready.link, accepted_at: now });
  book[subject] = list;
  await saveKey(state, "vouches", book);
  const anchored = await anchor(state, { handle: ready.handle, kind: "vouch", link: ready.link, seq: body.seq, summary: `vouch ${subject}` });
  return ok({
    op: "vouch",
    handle: ready.handle,
    statement_hash: ready.link,
    subject,
    vouches: list.length,
    local_trust_only: true,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
  });
}

export async function relayVouchRead(state, handle) {
  const id = canonicalHandle(handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Pass a #handle.");
  const book = (await loadKey(state, "vouches", {})) || {};
  const list = book[id] || [];
  return ok({ op: "vouches", handle: id, vouches: list, count: list.length, local_trust_only: true });
}

export async function relayAdvisory(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "advisory", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const subject = canonicalHandle(body.subject);
  if (!subject) return fail("FED-MESH-BAD-HANDLE", "subject must be a #handle.");
  const note = String(body.note || "");
  if (note.length < 1 || note.length > 160) return fail("FED-MESH-BAD-INPUT", "note is 1 to 160 characters.");
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  const book = (await loadKey(state, "advisories", {})) || {};
  const list = Array.isArray(book[ready.handle]) ? book[ready.handle] : [];
  list.push({ handle: ready.handle, subject, note, statement_hash: ready.link, accepted_at: now });
  book[ready.handle] = list;
  await saveKey(state, "advisories", book);
  const anchored = await anchor(state, { handle: ready.handle, kind: "advisory", link: ready.link, seq: body.seq, summary: `advisory ${subject}` });
  return ok({
    op: "advisory",
    handle: ready.handle,
    statement_hash: ready.link,
    subject,
    applied: false,
    subscribers_only: true,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
  });
}

export async function relayAdvisoryRead(state, handle) {
  const id = canonicalHandle(handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Pass the signing #handle.");
  const book = (await loadKey(state, "advisories", {})) || {};
  const list = book[id] || [];
  return ok({ op: "advisories", handle: id, advisories: list, count: list.length, applied: false });
}

export async function relayQuarantine(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "quarantine", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const peer = canonicalHandle(body.peer);
  if (!peer) return fail("FED-MESH-BAD-HANDLE", "peer must be a #handle.");
  if (body.decision !== "cut" && body.decision !== "clear") {
    return fail("FED-MESH-BAD-INPUT", "decision is cut or clear.");
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  const book = (await loadKey(state, "quarantine", {})) || {};
  const mine = book[ready.handle] && typeof book[ready.handle] === "object" ? book[ready.handle] : {};
  mine[peer] = { peer, decision: body.decision, statement_hash: ready.link, accepted_at: now };
  book[ready.handle] = mine;
  await saveKey(state, "quarantine", book);
  const anchored = await anchor(state, { handle: ready.handle, kind: "quarantine", link: ready.link, seq: body.seq, summary: `quarantine ${peer}` });
  return ok({
    op: "quarantine",
    handle: ready.handle,
    statement_hash: ready.link,
    peer,
    decision: body.decision,
    network_cutoff: false,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
  });
}

export async function relayQuarantineRead(state, handle) {
  const id = canonicalHandle(handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Pass a #handle.");
  const book = (await loadKey(state, "quarantine", {})) || {};
  const mine = book[id] || {};
  return ok({ op: "quarantine", handle: id, peers: mine, network_cutoff: false });
}

export async function relayIsland(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "island", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  if (body.mode !== "off" && body.mode !== "on") return fail("FED-MESH-BAD-INPUT", "mode is off or on.");
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  const islands = (await loadKey(state, "islands", {})) || {};
  islands[ready.handle] = { handle: ready.handle, mode: body.mode, statement_hash: ready.link, accepted_at: now };
  await saveKey(state, "islands", islands);
  const anchored = await anchor(state, { handle: ready.handle, kind: "island", link: ready.link, seq: body.seq, summary: `island ${body.mode}` });
  return ok({
    op: "island",
    handle: ready.handle,
    statement_hash: ready.link,
    mode: body.mode,
    radios_changed: false,
    local_runtime: true,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
  });
}

export async function relayIslandRead(state, handle) {
  const id = canonicalHandle(handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Pass a #handle.");
  const islands = (await loadKey(state, "islands", {})) || {};
  const row = islands[id] || { handle: id, mode: "on" };
  return ok({ op: "island", ...row, radios_changed: false, local_runtime: true });
}

const CHECK_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;

function publicIsolation(row) {
  const out = {
    subject: row.subject,
    reason: row.reason,
    check: row.check,
    model: row.model,
    blocklist: row.blocklist || null,
    evidence_hash: row.evidence_hash,
    content_stored: false,
    name_stored: row.name_stored === true,
    source: row.source,
    signer: row.signer,
    statement_hash: row.statement_hash,
    accepted_at: row.accepted_at,
    local_data_deleted: false,
    radios_changed: false,
    automatic_lift: false,
  };
  if (row.name_stored === true && row.reason !== "CSAM" && row.name) out.name = row.name;
  return out;
}

async function refuseBlockedName(state, ready, hit, name, seq, now) {
  const book = (await loadKey(state, "ethics", {})) || {};
  const csam = hit.reason === "CSAM";
  if (!book[ready.handle]) {
    book[ready.handle] = {
      subject: ready.handle,
      reason: hit.reason,
      check: "name-blocklist",
      model: "absent",
      blocklist: BLOCKLIST_VERSION,
      evidence_hash: ready.link,
      content_stored: false,
      name_stored: !csam,
      ...(csam ? {} : { name }),
      source: "claim",
      signer: ready.handle,
      statement_hash: ready.link,
      accepted_at: now,
      local_data_deleted: false,
      radios_changed: false,
      automatic_lift: false,
    };
    await saveKey(state, "ethics", book);
    await anchor(state, {
      handle: ready.handle,
      kind: "isolation",
      link: ready.link,
      seq,
      summary: `isolation ${hit.reason}`,
    });
  }
  const message = csam
    ? "This name is refused. The relay stores the statement hash only. Operators follow the law in their jurisdiction. In the United States that includes reporting to NCMEC. The name and the bytes are not stored or forwarded."
    : `This name matches blocklist ${BLOCKLIST_VERSION}. The handle is isolated on this relay. The bytes are not stored.`;
  return fail("FED-MESH-NAME-BLOCK", message, {
    reason: hit.reason,
    check: "name-blocklist",
    blocklist: BLOCKLIST_VERSION,
    evidence_hash: ready.link,
    content_stored: false,
    name_stored: !csam,
    isolated: true,
    local_data_deleted: false,
    radios_changed: false,
    ...(csam ? {} : { token: hit.token }),
  });
}

export async function relayRestore(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "restore", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const slotId = String(body.slot || "").toLowerCase();
  const slot = RESERVED_SLOTS.find((row) => row.slot === slotId);
  if (!slot) {
    return fail("FED-MESH-BAD-INPUT", "slot is one of ae, corpus, godlock, hdj. Reserved slots are not user-nameable.");
  }
  if (String(body.hub || "") !== slot.hub) {
    return fail("FED-MESH-BAD-INPUT", `slot ${slot.slot} mirrors ${slot.hub}.`);
  }
  const object_hash = String(body.object_hash || "").toLowerCase();
  if (!isHex64(object_hash)) return fail("FED-MESH-BAD-INPUT", "object_hash is 64 lowercase hex characters.");
  const prev_slot = String(body.prev_slot || "").toLowerCase();
  if (!isHex64(prev_slot)) return fail("FED-MESH-BAD-INPUT", "prev_slot is 64 lowercase hex characters.");
  const cache = cacheShape(await loadKey(state, "objects", emptyCache()));
  const cached = cache.by_hash[object_hash];
  if (!cached || cached.verified !== true) {
    return fail("FED-MESH-NO-OBJECT", "Restore needs an object this relay already hash-verified. The bytes are not accepted on this act.", { http_status: 404 });
  }
  const ethics = (await loadKey(state, "ethics", {})) || {};
  if (cached.signer && ethics[cached.signer]) {
    return fail("FED-MESH-ISOLATED", "This relay does not restore an object signed by an isolated handle.", {
      reason: ethics[cached.signer].reason,
      content_stored: false,
    });
  }
  const mirrors = (await loadKey(state, "mirrors", {})) || {};
  const mine = mirrors[ready.handle] && typeof mirrors[ready.handle] === "object" ? mirrors[ready.handle] : {};
  const prior = mine[slot.slot] || null;
  if (prior) {
    if (prev_slot !== prior.statement_hash) {
      return fail("FED-MESH-FORK", "prev_slot does not match the stored mirror for this reserved slot.");
    }
  } else if (prev_slot !== ZERO_HASH) {
    return fail("FED-MESH-FORK", "The first mirror for a reserved slot uses 64 zeros as prev_slot.");
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  mine[slot.slot] = {
    slot: slot.slot,
    hub: slot.hub,
    origin: slot.origin,
    object_hash,
    prev_slot,
    statement_hash: ready.link,
    signer: ready.handle,
    object_signer: cached.signer || "",
    verified: true,
    executable: false,
    accepted_at: now,
    seq: body.seq,
  };
  mirrors[ready.handle] = mine;
  await saveKey(state, "mirrors", mirrors);
  const anchored = await anchor(state, {
    handle: ready.handle,
    kind: "restore",
    link: ready.link,
    seq: body.seq,
    summary: `restore ${slot.slot}`,
  });
  return ok({
    op: "restore",
    handle: ready.handle,
    statement_hash: ready.link,
    slot: slot.slot,
    hub: slot.hub,
    origin: slot.origin,
    object_hash,
    verified: true,
    signed: true,
    executable: false,
    user_nameable: false,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
  });
}

export async function relaySlotRead(state, handle) {
  const id = canonicalHandle(handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Pass a #handle.");
  const ethics = (await loadKey(state, "ethics", {})) || {};
  if (ethics[id]) {
    return fail("FED-MESH-ISOLATED", "This relay does not serve slot mirrors for an isolated handle.", {
      reason: ethics[id].reason,
      evidence_hash: ethics[id].evidence_hash,
      content_stored: false,
    });
  }
  const mirrors = (await loadKey(state, "mirrors", {})) || {};
  const mine = mirrors[id] && typeof mirrors[id] === "object" ? mirrors[id] : {};
  const names = (await loadKey(state, "names", {})) || {};
  return ok({
    op: "slots",
    handle: id,
    user_slot_cap: USER_SLOT_CAP,
    reserved_slot_cap: RESERVED_SLOT_CAP,
    self_certifying_counts: false,
    reserved: RESERVED_SLOTS.map((slot) => ({
      slot: slot.slot,
      hub: slot.hub,
      origin: slot.origin,
      user_nameable: false,
      mirror: mine[slot.slot] || null,
    })),
    friendly_held: friendlyHeld(names, id, Date.now()),
    friendly_cap: NAME_CAP,
    factory_cap7: "MirageGrid Cap-7 .az factory names are a separate layer. This read does not change them.",
  });
}

export async function relayIsolation(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "isolation", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const subject = canonicalHandle(body.subject);
  if (!subject) return fail("FED-MESH-BAD-HANDLE", "subject must be a #handle.");
  if (subject !== ready.handle) {
    return fail("FED-MESH-BAD-INPUT", "This relay does not accept an isolation signed by a different handle. A name-block isolation is recorded from the claimant's own signed name.");
  }
  const reason = String(body.reason || "");
  if (!CONTENT_ISOLATION_REASONS.includes(reason)) {
    return fail("FED-MESH-BAD-INPUT", "A self-signed isolation reason is NUDITY, CHILD, HATE, or CSAM. NAME-BLOCK comes from the name claim. A missing classifier blocks publish on the node and does not isolate the handle.");
  }
  const check = String(body.check || "");
  if (!CHECK_RE.test(check)) return fail("FED-MESH-BAD-INPUT", "check names the local check that fired, 1 to 64 characters.");
  const model = String(body.model || "");
  if (!MODEL_RE.test(model)) return fail("FED-MESH-BAD-INPUT", "model is a version string, or absent when the classifier is missing.");
  const evidence_hash = String(body.evidence_hash || "").toLowerCase();
  if (!isHex64(evidence_hash)) return fail("FED-MESH-BAD-INPUT", "evidence_hash is 64 lowercase hex characters. Send the hash, not the bytes.");
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  const book = (await loadKey(state, "ethics", {})) || {};
  if (!book[ready.handle]) {
    book[ready.handle] = {
      subject,
      reason,
      check,
      model,
      blocklist: null,
      evidence_hash,
      content_stored: false,
      name_stored: false,
      source: "self",
      signer: ready.handle,
      statement_hash: ready.link,
      accepted_at: now,
      local_data_deleted: false,
      radios_changed: false,
      automatic_lift: false,
    };
    await saveKey(state, "ethics", book);
  }
  const anchored = await anchor(state, {
    handle: ready.handle,
    kind: "isolation",
    link: ready.link,
    seq: body.seq,
    summary: `isolation ${reason}`,
  });
  return ok({
    op: "isolation",
    ...publicIsolation(book[ready.handle]),
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
  });
}

export async function relayIsolationRead(state, handle) {
  const id = canonicalHandle(handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Pass a #handle.");
  const book = (await loadKey(state, "ethics", {})) || {};
  const row = book[id];
  if (!row) return fail("FED-MESH-NO-NAME", "This relay has no isolation record for that handle.", { http_status: 404 });
  const appeals = (await loadKey(state, "appeals", {})) || {};
  return ok({
    op: "isolation",
    ...publicIsolation(row),
    appeals: appeals[id] || [],
    applied: false,
    automatic_lift: false,
  });
}

export async function relayAppeal(state, body, now = Date.now()) {
  const ready = await prepare(state, body, "appeal", now);
  if (!ready.ok) return ready;
  const seqErr = requireSeq(body);
  if (seqErr) return seqErr;
  const isolation_hash = String(body.isolation_hash || "").toLowerCase();
  if (!isHex64(isolation_hash)) return fail("FED-MESH-BAD-INPUT", "isolation_hash is 64 lowercase hex characters.");
  const note = String(body.note || "");
  if (note.length < 1 || note.length > 160) return fail("FED-MESH-BAD-INPUT", "note is 1 to 160 characters.");
  const book = (await loadKey(state, "ethics", {})) || {};
  const row = book[ready.handle];
  if (!row) return fail("FED-MESH-BAD-INPUT", "This handle has no isolation record. An appeal does not clear one.");
  if (isolation_hash !== row.statement_hash && isolation_hash !== row.evidence_hash) {
    return fail("FED-MESH-BAD-INPUT", "isolation_hash does not match the stored isolation record.");
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  const appeals = (await loadKey(state, "appeals", {})) || {};
  const list = Array.isArray(appeals[ready.handle]) ? appeals[ready.handle] : [];
  list.push({
    handle: ready.handle,
    isolation_hash,
    note,
    statement_hash: ready.link,
    accepted_at: now,
    applied: false,
  });
  appeals[ready.handle] = list;
  await saveKey(state, "appeals", appeals);
  const anchored = await anchor(state, {
    handle: ready.handle,
    kind: "appeal",
    link: ready.link,
    seq: body.seq,
    summary: "appeal",
  });
  return ok({
    op: "appeal",
    handle: ready.handle,
    statement_hash: ready.link,
    isolation_hash,
    applied: false,
    isolation_remains: true,
    recheck_requested: true,
    automatic_lift: false,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
  });
}

export async function relayAirgap(state, body) {
  void state;
  const checked = await verifyAirgapBundle(body);
  if (!checked.ok) return fail(checked.code, checked.message, checked.gate ? { gate: checked.gate } : {});
  return ok({
    op: "airgap",
    manifest_sha256: checked.manifest_sha256,
    statement_hash: checked.statement_hash,
    files: checked.files,
    stored: false,
    executable: false,
    scanner: "absent",
    disk_check: checked.disk_check,
  });
}

export async function directoryEntry(state, handle) {
  const roster = await loadRoster(state);
  const record = roster[canonicalHandle(handle)];
  if (!record) return fail("FED-MESH-NO-ROUTE", "This relay has no registration for that handle.");
  return ok({
    op: "directory",
    handle: record.handle,
    public_key: record.public_key,
    enc_public_key: record.enc_public_key,
    relays: record.relays || [],
    presence: fresh(record, Date.now()) ? record.presence : "offline",
    seq: record.seq,
    tip: record.tip,
  });
}

/** Daemon paths under /v1/fedmesh/ are the same relay routes. Unknown tails stay refused. */
export function canonicalRelayPath(pathname) {
  let path = String(pathname || "").split("?")[0].replace(/\/+$/, "").toLowerCase() || "/";
  if (path === "/v1/fedmesh" || path.startsWith("/v1/fedmesh/")) {
    path = "/v1/mesh/relay" + path.slice("/v1/fedmesh".length);
  }
  return path;
}

export async function dispatchRelay(method, pathname, body, state = defaultState, opts = {}) {
  const m = String(method || "GET").toUpperCase();
  const path = canonicalRelayPath(pathname);
  const now = opts.now || Date.now();
  if (path === "/v1/mesh/relay" && (m === "GET" || m === "HEAD")) return relayCite(state);
  if (path === "/v1/mesh/relay/bootstrap" && (m === "GET" || m === "HEAD")) return relayBootstrapRead(state);
  if (path === "/v1/mesh/relay/directory" && (m === "GET" || m === "HEAD")) {
    const handle = opts.handle || "";
    return directoryEntry(state, handle);
  }
  if (path === "/v1/mesh/relay/refs" && (m === "GET" || m === "HEAD")) {
    return relayRefsRead(state, opts.handle || "", opts.ref || "");
  }
  if (path === "/v1/mesh/relay/object" && (m === "GET" || m === "HEAD")) {
    return relayObjectGet(state, opts.hash || "");
  }
  if (path === "/v1/mesh/relay/name" && (m === "GET" || m === "HEAD")) {
    return relayNameRead(state, { name: opts.name || "", handle: opts.handle || "" }, now);
  }
  if (path === "/v1/mesh/relay/witness" && (m === "GET" || m === "HEAD")) return relayWitnessRead(state, opts.subject_hash || "");
  if (path === "/v1/mesh/relay/equivocation" && (m === "GET" || m === "HEAD")) return relayEquivocationRead(state, opts.handle || "");
  if (path === "/v1/mesh/relay/vouch" && (m === "GET" || m === "HEAD")) return relayVouchRead(state, opts.handle || "");
  if (path === "/v1/mesh/relay/advisory" && (m === "GET" || m === "HEAD")) return relayAdvisoryRead(state, opts.handle || "");
  if (path === "/v1/mesh/relay/quarantine" && (m === "GET" || m === "HEAD")) return relayQuarantineRead(state, opts.handle || "");
  if (path === "/v1/mesh/relay/island" && (m === "GET" || m === "HEAD")) return relayIslandRead(state, opts.handle || "");
  if (path === "/v1/mesh/relay/slot" && (m === "GET" || m === "HEAD")) return relaySlotRead(state, opts.handle || "");
  if (path === "/v1/mesh/relay/isolation" && (m === "GET" || m === "HEAD")) return relayIsolationRead(state, opts.handle || "");
  if (m !== "POST") return fail("FED-MESH-BAD-INPUT", "This relay path accepts POST. GET /v1/mesh/relay only cites.", { http_status: 405 });
  if (path.endsWith("/register")) return relayRegister(state, body, now);
  if (path.endsWith("/heartbeat")) return relayHeartbeat(state, body, now);
  if (path.endsWith("/leave")) return relayLeave(state, body, now);
  if (path.endsWith("/post")) return relayPost(state, body, now, opts);
  if (path.endsWith("/pull")) return relayPull(state, body, now);
  if (path.endsWith("/deliver")) return relayDeliver(state, body, now);
  if (path.endsWith("/forward")) return relayForward(state, body, now);
  if (path.endsWith("/peers")) return relayPeers(state, body, now);
  if (path.endsWith("/bootstrap")) return relayBootstrap(state, body, now);
  if (path.endsWith("/rollup")) return relayRollup(state, body, now);
  if (path.endsWith("/remote-task")) return relayRemoteTask(state, body, now);
  if (path.endsWith("/ref")) return relayRef(state, body, now);
  if (path.endsWith("/sync")) return relaySync(state, body, now);
  if (path.endsWith("/object")) return relayObject(state, body, now);
  if (path.endsWith("/name")) return relayName(state, body, now);
  if (path.endsWith("/witness")) return relayWitness(state, body, now);
  if (path.endsWith("/equivocation")) return relayEquivocation(state, body, now);
  if (path.endsWith("/vouch")) return relayVouch(state, body, now);
  if (path.endsWith("/advisory")) return relayAdvisory(state, body, now);
  if (path.endsWith("/quarantine")) return relayQuarantine(state, body, now);
  if (path.endsWith("/island")) return relayIsland(state, body, now);
  if (path.endsWith("/airgap")) return relayAirgap(state, body);
  if (path.endsWith("/restore")) return relayRestore(state, body, now);
  if (path.endsWith("/isolation")) return relayIsolation(state, body, now);
  if (path.endsWith("/appeal")) return relayAppeal(state, body, now);
  return fail("FED-MESH-BAD-INPUT", "Unknown relay path.");
}

export async function runRelayOp(op, payload, env, opts = {}) {
  const state = opts.state || relayStateFor(env);
  const now = opts.now || Date.now();
  const body = payload && typeof payload === "object" ? payload : {};
  if (op === "relay-cite" || op === "relay") return relayCite(state);
  if (op === "relay-register") return relayRegister(state, body, now);
  if (op === "relay-heartbeat") return relayHeartbeat(state, body, now);
  if (op === "relay-leave") return relayLeave(state, body, now);
  if (op === "relay-post") return relayPost(state, body, now, opts);
  if (op === "relay-pull") return relayPull(state, body, now);
  if (op === "relay-deliver") return relayDeliver(state, body, now);
  if (op === "relay-forward") return relayForward(state, body, now);
  if (op === "relay-peers") return relayPeers(state, body, now);
  if (op === "relay-bootstrap") return relayBootstrap(state, body, now);
  if (op === "relay-bootstrap-read") return relayBootstrapRead(state);
  if (op === "relay-rollup") return relayRollup(state, body, now);
  if (op === "relay-remote-task") return relayRemoteTask(state, body, now);
  if (op === "relay-directory") return directoryEntry(state, body.handle);
  if (op === "relay-ref") return relayRef(state, body, now);
  if (op === "relay-sync") return relaySync(state, body, now);
  if (op === "relay-object") return relayObject(state, body, now);
  if (op === "relay-object-read") return relayObjectGet(state, body.hash);
  if (op === "relay-refs") return relayRefsRead(state, body.handle, body.ref);
  if (op === "relay-name") return relayName(state, body, now);
  if (op === "relay-name-read") return relayNameRead(state, body, now);
  if (op === "relay-witness") return relayWitness(state, body, now);
  if (op === "relay-witness-read") return relayWitnessRead(state, body.subject_hash);
  if (op === "relay-equivocation") return relayEquivocation(state, body, now);
  if (op === "relay-equivocation-read") return relayEquivocationRead(state, body.handle);
  if (op === "relay-vouch") return relayVouch(state, body, now);
  if (op === "relay-vouch-read") return relayVouchRead(state, body.handle);
  if (op === "relay-advisory") return relayAdvisory(state, body, now);
  if (op === "relay-advisory-read") return relayAdvisoryRead(state, body.handle);
  if (op === "relay-quarantine") return relayQuarantine(state, body, now);
  if (op === "relay-quarantine-read") return relayQuarantineRead(state, body.handle);
  if (op === "relay-island") return relayIsland(state, body, now);
  if (op === "relay-island-read") return relayIslandRead(state, body.handle);
  if (op === "relay-airgap") return relayAirgap(state, body);
  if (op === "relay-restore") return relayRestore(state, body, now);
  if (op === "relay-slot-read") return relaySlotRead(state, body.handle);
  if (op === "relay-isolation") return relayIsolation(state, body, now);
  if (op === "relay-isolation-read") return relayIsolationRead(state, body.handle);
  if (op === "relay-appeal") return relayAppeal(state, body, now);
  return fail("FED-MESH-BAD-INPUT", "Unknown relay op.");
}

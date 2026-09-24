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
  MAX_SYNC_ACTS,
  MSG_PER_MIN,
  NAME_CAP,
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
  name: ["v", "kind", "handle", "public_key", "name", "owner", "target", "expires", "seq", "prev", "prev_record", "sig"],
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

async function chainCheck(record, seq, prev, link) {
  const tipSeq = record && Number.isInteger(record.seq) ? record.seq : 0;
  const tipPrev = record && record.tip ? record.tip : ZERO_HASH;
  const seen = (record && record.seen_seq) || [];
  if (seen.includes(seq)) {
    return fail("FED-MESH-REPLAY", `Sequence ${seq} was already accepted for this handle.`);
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
  if (digest !== hash) return fail("FED-MESH-HASH-MISMATCH", "The object bytes do not hash to the declared hash.");
  const cache = cacheShape(await loadKey(state, "objects", emptyCache()));
  const prior = cache.by_hash[hash];
  if (prior) {
    if (prior.body_b64 !== body.body_b64) return fail("FED-MESH-HASH-MISMATCH", "This hash is already cached with different bytes.");
    return ok({ op: "object", hash, bytes: prior.bytes, cached: true, chain_act: false });
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
  cache.by_hash[hash] = { body_b64: body.body_b64, bytes: bytes.length, signer: ready.handle };
  cache.order.push(hash);
  cache.total += bytes.length;
  await saveKey(state, "objects", cache);
  return ok({ op: "object", hash, bytes: bytes.length, cached: true, chain_act: false, signer: ready.handle });
}

export async function relayObjectGet(state, hash) {
  const id = String(hash || "").toLowerCase();
  if (!isHex64(id)) return fail("FED-MESH-BAD-INPUT", "Object fetch needs a 64-hex hash.");
  const cache = cacheShape(await loadKey(state, "objects", emptyCache()));
  const row = cache.by_hash[id];
  if (!row) return fail("FED-MESH-NO-OBJECT", "This relay has no public object for that hash.", { http_status: 404 });
  return ok({ op: "object-fetch", ...objectFetchResponse(id, row.body_b64), found: true });
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

function nameLive(row, now) {
  if (!row || row.released || !row.owner || row.target == null) return false;
  if (row.expires != null && Number(row.expires) <= now) return false;
  return true;
}

function friendlyHeld(names, handle, now) {
  let n = 0;
  for (const row of Object.values(names || {})) {
    if (!row || row.self_certifying) continue;
    if (row.owner === handle && nameLive(row, now)) n += 1;
  }
  return n;
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

function nameRow(row, now) {
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
    live: nameLive(row, now),
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
  const current = names[parsed.name] || null;
  const expected = current && current.statement_hash ? current.statement_hash : ZERO_HASH;
  if (prev_record !== expected) {
    return fail("FED-MESH-FORK", "prev_record does not match the anchored name record.");
  }
  const releasing = owner === "" && body.target === null;
  const live = nameLive(current, now);
  if (parsed.self) {
    if (ready.handle !== parsed.owner_handle || owner !== parsed.owner_handle || releasing) {
      return fail("FED-MESH-HANDLE-MISMATCH", "A self-certifying <handle>.aziel name belongs to that handle. It is not transferred or released.");
    }
  }
  if (live) {
    if (ready.handle !== current.owner) {
      return fail("FED-MESH-NAME-TAKEN", "This friendly name already has an anchored owner. The first valid claim wins.");
    }
    if (!releasing && !owner) return fail("FED-MESH-BAD-INPUT", "owner is the #handle that holds the name after this act.");
    if (!releasing && owner !== ready.handle && parsed.self) {
      return fail("FED-MESH-HANDLE-MISMATCH", "A self-certifying name stays with its handle.");
    }
  } else if (releasing || ready.handle !== owner) {
    return fail("FED-MESH-BAD-INPUT", "A new claim is signed by the owner it names.");
  }
  if (!releasing) {
    const badTarget = targetError(body.target);
    if (badTarget) return badTarget;
  }
  const gaining = !parsed.self && !releasing && !(current && current.owner === owner && nameLive(current, now));
  if (gaining && friendlyHeld(names, owner, now) >= NAME_CAP) {
    return fail("FED-MESH-NAME-CAP", `A handle may hold ${NAME_CAP} friendly .aziel names. The self-certifying name does not count.`, {
      http_status: 429,
      cap: NAME_CAP,
    });
  }
  const committed = await commitChain(state, ready.handle, body.seq, body.prev, ready.link, now, { public_key: ready.public_key });
  if (!committed.ok) return committed;
  names[parsed.name] = {
    name: parsed.name,
    owner: releasing ? "" : owner,
    target: releasing ? null : { type: body.target.type, value: body.target.type === "handle" ? canonicalHandle(body.target.value) : String(body.target.value) },
    expires: body.expires,
    prev_record,
    statement_hash: ready.link,
    seq: body.seq,
    self_certifying: parsed.self,
    released: releasing,
  };
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
    ...nameRow(names[parsed.name], now),
    signer: ready.handle,
    chainlock: anchored.chainlock,
    timeslate_hash: anchored.timeslate && anchored.timeslate.timeslate_hash,
    click_index: anchored.click_index,
    friendly_cap: NAME_CAP,
  });
}

export async function relayNameRead(state, query = {}, now = Date.now()) {
  const names = (await loadKey(state, "names", {})) || {};
  if (query.name) {
    const parsed = parseAzielName(query.name);
    if (!parsed.ok) return parsed;
    const row = names[parsed.name];
    if (!row) return fail("FED-MESH-NO-NAME", "This relay has no name record.", { http_status: 404 });
    return ok({ op: "name", record: nameRow(row, now), friendly_cap: NAME_CAP, az_dns: AZ_DNS_RULE });
  }
  const id = canonicalHandle(query.handle);
  if (!id) return fail("FED-MESH-BAD-HANDLE", "Pass name= or a #handle.");
  const owned = Object.values(names).filter((row) => row && row.owner === id).map((row) => nameRow(row, now));
  return ok({
    op: "names",
    handle: id,
    names: owned,
    friendly_held: friendlyHeld(names, id, now),
    friendly_cap: NAME_CAP,
    az_dns: AZ_DNS_RULE,
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

export async function dispatchRelay(method, pathname, body, state = defaultState, opts = {}) {
  const m = String(method || "GET").toUpperCase();
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "").toLowerCase() || "/";
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
  return fail("FED-MESH-BAD-INPUT", "Unknown relay op.");
}

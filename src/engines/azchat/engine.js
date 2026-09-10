/**
 * AZChat in-process engine (1.8.4 / 1.9.0).
 * Bitmesh-class spendable handles, ephemeral rooms, agent bus.
 * Mesh hop default OFF. Not SMTP. Not AZMail. Do not bridge.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import { hashStoreEnvelope } from "../hash-store.js";
import { sha256Hex } from "../../session-core.js";

export const PRODUCT = "azchat";
export const NAME = "AZChat";
export const VERSION = "0.1.0";
export const SPEC = "AZC-CHAT-0.1";
export const AUTHOR = "Aziel Eliab";
export const ROLE = "spendable-handle rooms + agent bus";
export const MOTTO = "Handles spend. Rooms seal. Mesh stays off.";
export const AXES = Object.freeze(["handle", "room", "bus", "receipt"]);
export const NEIGHBORS = Object.freeze(["azmail (not bridged)", "aznet", "peacelock"]);
export const MESH_ENABLED_DEFAULT = false;
export const ROOM_TTL_DEFAULT_MS = 15 * 60 * 1000;
export const ROOM_TTL_MAX_MS = 60 * 60 * 1000;
export const TEXT_CAP = 2000;
export const FRAME_CAP = 64;

export const LIVE_CANON = Object.freeze([
  "health",
  "skill",
  "doctor",
  "handle_new",
  "handle_rotate",
  "room_open",
  "room_post",
  "room_pull",
  "bus_send",
  "bus_poll",
  "verify_receipt",
  "import_export",
]);

export const STUB_REFUSE = Object.freeze([
  "smtp",
  "smtp_send",
  "send",
  "mail",
  "deliver",
  "deanonymize",
  "harvest",
  "mesh_join",
  "mesh_enable",
  "vpn",
  "bridge_azmail",
  "bridge",
  "chromium",
]);

export const LIMITATION =
  "THIS IS: AZChat spendable handles, ephemeral rooms (TTL/sealed), and an agent bus. " +
  "Reached only through FragGate. mesh_enabled_default is false. " +
  "THIS IS NOT: SMTP, a public MTA, AZMail, a mesh hop, deanonymize, or a Chromium chat runner. " +
  "Do not bridge AZChat ↔ AZMail. Stranger room_pull is 404. Author: Aziel Eliab only.";

const store = {
  handles: new Map(),
  rooms: new Map(),
  bus: [],
  seq: 0,
};

export function resetAzchatStore() {
  store.handles.clear();
  store.rooms.clear();
  store.bus = [];
  store.seq = 0;
}

function nowMs() {
  return Date.now();
}

function nowIso(ms = nowMs()) {
  return new Date(ms).toISOString();
}

function clip(raw, cap = TEXT_CAP) {
  return String(raw == null ? "" : raw).slice(0, cap);
}

function nextId(prefix) {
  store.seq += 1;
  return `${prefix}_${store.seq.toString(36)}_${nowMs().toString(36)}`;
}

function tokenBytes() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function envelope() {
  return {
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    role: ROLE,
    motto: MOTTO,
    axes: AXES,
    neighbors: NEIGHBORS,
    live_ops: LIVE_CANON,
    stub_ops: STUB_REFUSE,
    limitation: LIMITATION,
    extra: {
      mesh_enabled_default: MESH_ENABLED_DEFAULT,
      azmail_bridge: false,
      smtp: false,
      mta: false,
      ...hashStoreEnvelope(),
    },
  };
}

export function azchatHealth() {
  return capabilityHealth(envelope());
}

export function azchatSkill() {
  return capabilitySkill({
    ...envelope(),
    lead:
      "AZChat: spendable handles, ephemeral rooms, agent bus. Mesh hop default off. Not SMTP. Not AZMail. Do not bridge. Stranger room_pull is 404.",
  });
}

export function azchatDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "AZChat doctor: handles/rooms/bus only. Mesh stays off. Not a mailer.",
  });
}

function lookupHandle(token) {
  const key = String(token || "").trim();
  if (!key) return null;
  const row = store.handles.get(key);
  if (!row || row.live !== true) return null;
  return row;
}

export async function handleNew(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const token = tokenBytes();
  const id = nextId("h");
  const row = {
    id,
    token,
    live: true,
    rotated: false,
    successor: null,
    label: clip(src.label || src.agent || "handle", 48),
    created: nowIso(),
  };
  store.handles.set(token, row);
  const receipt = await receiptOf({ op: "handle_new", handle_id: id, label: row.label, ts: row.created });
  return {
    ok: true,
    op: "handle_new",
    handle_id: id,
    token,
    label: row.label,
    live: true,
    mesh_enabled_default: MESH_ENABLED_DEFAULT,
    receipt,
    note: "Spendable handle. Rotate unlinks this token. Author: Aziel Eliab.",
    author: AUTHOR,
    limitation: LIMITATION,
  };
}

export async function handleRotate(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const current = lookupHandle(src.token || src.handle_token);
  if (!current) {
    return { ok: false, status: 404, error: "handle-unlinked", op: "handle_rotate" };
  }
  const nextToken = tokenBytes();
  const nextIdValue = nextId("h");
  current.live = false;
  current.rotated = true;
  current.successor = nextIdValue;
  const next = {
    id: nextIdValue,
    token: nextToken,
    live: true,
    rotated: false,
    successor: null,
    label: current.label,
    created: nowIso(),
    previous: current.id,
  };
  store.handles.set(nextToken, next);
  const receipt = await receiptOf({ op: "handle_rotate", from: current.id, to: next.id, ts: next.created });
  return {
    ok: true,
    op: "handle_rotate",
    handle_id: next.id,
    token: nextToken,
    unlinked: current.id,
    live: true,
    receipt,
    note: "Prior token is unlinked. Rooms still list the old handle id as spent.",
    author: AUTHOR,
    limitation: LIMITATION,
  };
}

function roomSealed(room, now = nowMs()) {
  return room.sealed === true || now >= room.expires_at;
}

export async function roomOpen(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const a = lookupHandle(src.token_a || src.handle_a);
  const b = lookupHandle(src.token_b || src.handle_b);
  if (!a || !b) {
    return { ok: false, status: 404, error: "handle-unlinked", op: "room_open" };
  }
  if (a.id === b.id) {
    return { ok: false, status: 400, error: "need-two-handles", op: "room_open" };
  }
  const ttl = Math.min(ROOM_TTL_MAX_MS, Math.max(1, Number(src.ttl_ms) || ROOM_TTL_DEFAULT_MS));
  const opened = nowMs();
  const id = nextId("r");
  const room = {
    id,
    members: [a.id, b.id],
    posts: [],
    opened_at: opened,
    expires_at: opened + ttl,
    ttl_ms: ttl,
    sealed: false,
  };
  store.rooms.set(id, room);
  const receipt = await receiptOf({ op: "room_open", room_id: id, members: room.members, ttl_ms: ttl });
  return {
    ok: true,
    op: "room_open",
    room_id: id,
    members: room.members.slice(),
    ttl_ms: ttl,
    expires_at: nowIso(room.expires_at),
    sealed: false,
    mesh_enabled_default: MESH_ENABLED_DEFAULT,
    receipt,
    author: AUTHOR,
    limitation: LIMITATION,
  };
}

export async function roomPost(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const handle = lookupHandle(src.token || src.handle_token);
  const room = store.rooms.get(String(src.room_id || ""));
  if (!handle || !room || !room.members.includes(handle.id)) {
    return { ok: false, status: 404, error: "stranger-or-missing", op: "room_post" };
  }
  if (roomSealed(room)) {
    room.sealed = true;
    return { ok: false, status: 410, error: "room-sealed", op: "room_post", room_id: room.id, sealed: true };
  }
  const text = clip(src.text != null ? src.text : src.body);
  if (!text) return { ok: false, status: 400, error: "empty-post", op: "room_post" };
  const post = { id: nextId("p"), from: handle.id, text, ts: nowIso() };
  room.posts.push(post);
  const receipt = await receiptOf({ op: "room_post", room_id: room.id, post_id: post.id, from: handle.id });
  return {
    ok: true,
    op: "room_post",
    room_id: room.id,
    post,
    receipt,
    author: AUTHOR,
    limitation: LIMITATION,
  };
}

export async function roomPull(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const handle = lookupHandle(src.token || src.handle_token);
  const room = store.rooms.get(String(src.room_id || ""));
  if (!handle || !room || !room.members.includes(handle.id)) {
    return { ok: false, status: 404, error: "stranger-or-missing", op: "room_pull" };
  }
  if (roomSealed(room)) room.sealed = true;
  return {
    ok: true,
    op: "room_pull",
    room_id: room.id,
    members: room.members.slice(),
    posts: room.posts.slice(),
    sealed: room.sealed,
    expires_at: nowIso(room.expires_at),
    mesh_enabled_default: MESH_ENABLED_DEFAULT,
    author: AUTHOR,
    limitation: LIMITATION,
  };
}

export async function busSend(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const from = clip(src.from || src.agent || "agent", 48);
  const to = clip(src.to || src.peer || "", 48);
  const text = clip(src.text != null ? src.text : src.body);
  if (!text) return { ok: false, status: 400, error: "empty-frame", op: "bus_send" };
  const frame = { id: nextId("b"), from, to, text, ts: nowIso() };
  store.bus.unshift(frame);
  if (store.bus.length > FRAME_CAP) store.bus.length = FRAME_CAP;
  const receipt = await receiptOf({ op: "bus_send", frame_id: frame.id, from, to });
  return {
    ok: true,
    op: "bus_send",
    frame,
    receipt,
    mesh_enabled_default: MESH_ENABLED_DEFAULT,
    azmail_bridge: false,
    author: AUTHOR,
    limitation: LIMITATION,
  };
}

export function busPoll(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const agent = clip(src.agent || src.to || "", 48);
  const limit = Math.min(32, Math.max(1, Number(src.limit) || 16));
  const frames = store.bus
    .filter((f) => !agent || f.to === agent || f.from === agent || !f.to)
    .slice(0, limit);
  return {
    ok: true,
    op: "bus_poll",
    count: frames.length,
    frames,
    mesh_enabled_default: MESH_ENABLED_DEFAULT,
    azmail_bridge: false,
    author: AUTHOR,
    limitation: LIMITATION,
  };
}

async function receiptOf(fields) {
  const hash = await sha256Hex(JSON.stringify(fields));
  return { ...fields, receipt_sha256: hash, author: AUTHOR };
}

export async function verifyReceipt(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const receipt = src.receipt && typeof src.receipt === "object" ? src.receipt : src;
  const { receipt_sha256, ...rest } = receipt;
  const expect = await sha256Hex(JSON.stringify(rest));
  return {
    ok: true,
    op: "verify_receipt",
    match: Boolean(receipt_sha256) && receipt_sha256 === expect,
    receipt_sha256: expect,
    posted: receipt_sha256 || null,
    author: AUTHOR,
    limitation: LIMITATION,
  };
}

export function importExport(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const mode = String(src.mode || "export").toLowerCase();
  if (mode === "import") {
    return {
      ok: true,
      op: "import_export",
      mode: "import",
      accepted: true,
      stored: false,
      note: "Client-held JSON only. Hosted AZChat does not persist an import store.",
      author: AUTHOR,
      limitation: LIMITATION,
    };
  }
  return {
    ok: true,
    op: "import_export",
    mode: "export",
    handles_live: [...store.handles.values()].filter((h) => h.live).map((h) => h.id),
    rooms: [...store.rooms.values()].map((r) => ({ id: r.id, members: r.members.slice(), sealed: roomSealed(r) })),
    bus_count: store.bus.length,
    stored: false,
    author: AUTHOR,
    limitation: LIMITATION,
  };
}

export { envelope };

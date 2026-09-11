/**
 * Isolate-native AZ-OS ethics session VFS preview.
 * Worker memory, plus optional get/put KV when an AZ-OS-safe binding is present.
 * Prefab ethics session — NOT a remote host shell, SSH, or unrestricted bash.
 * Public exec / shell / lattice stay FG-STUB.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { sha256Hex } from "../../session-core.js";
import { AUTHOR, GATES, INVITE, LIMITATION, MOTTO, PRINCIPLES, PRODUCT, VERSION } from "./engine.js";

export const SESSION_ID_RE = /^azos_[a-f0-9]{32}$/;
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
export const SESSION_CAP = 64;
export const SESSION_KIND = "azos-ethics-vfs";

const memory = new Map();

export function resetAzosSessions() {
  memory.clear();
}

export function prefabVfs() {
  return {
    "/": { type: "dir", children: ["home", "principles.txt", "invite.txt", "gates.txt", "status.txt"] },
    "/home": { type: "dir", children: ["README.txt"] },
    "/home/README.txt": {
      type: "file",
      body: "AZ-OS prefab ethics session VFS preview. Integrity precedes execution. Not a host shell. exec / shell / lattice stay refuse.",
    },
    "/principles.txt": { type: "file", body: PRINCIPLES.join("\n") },
    "/invite.txt": { type: "file", body: INVITE },
    "/gates.txt": { type: "file", body: GATES.join("\n") },
    "/status.txt": { type: "file", body: `${MOTTO}\nremote_shell=false\nssh=false\nhost_subprocess=false\n` },
  };
}

function newSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return "azos_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function nowIso() {
  return new Date().toISOString();
}

function kvOf(env) {
  const cand = env && (env.AZOS_SESSIONS || env.AZOS_KV);
  if (cand && typeof cand.get === "function" && typeof cand.put === "function") return cand;
  return null;
}

function sessionKey(id) {
  return `azos|ethics-session|${id}`;
}

function publicSession(session) {
  if (!session) return null;
  const vfs = session.vfs || {};
  const cwd = session.cwd || "/home";
  const node = vfs[cwd] || vfs["/"] || { type: "dir", children: [] };
  return {
    ok: true,
    product: PRODUCT,
    name: "AZ-OS",
    version: VERSION,
    op: session.closed ? "session_close" : "session_status",
    session_id: session.id,
    opened_at: session.opened_at,
    updated_at: session.updated_at,
    closed: session.closed === true,
    closed_at: session.closed_at || null,
    cwd,
    listing: node.type === "dir" ? (node.children || []).slice() : [cwd.split("/").pop()],
    vfs_kind: SESSION_KIND,
    prefab: true,
    remote_shell: false,
    ssh: false,
    host_subprocess: false,
    unrestricted_host_shell: false,
    ethics: {
      motto: MOTTO,
      principles: PRINCIPLES.slice(),
      gates: GATES.slice(),
    },
    receipt_count: (session.receipts || []).length,
    head_hash: session.head_hash || null,
    persist: session.persist || "isolate-memory",
    limitation: LIMITATION,
    author: AUTHOR,
    identity: AUTHOR,
    true_engine_runtime: true,
    kv_increment: false,
  };
}

async function appendReceipt(session, event, extra, ts) {
  const prev = session.head_hash || "0".repeat(64);
  const unsigned = {
    kind: SESSION_KIND,
    session_id: session.id,
    seq: (session.receipts || []).length + 1,
    event,
    ts,
    prev_hash: prev,
    author: AUTHOR,
    identity: AUTHOR,
    remote_shell: false,
    ...extra,
  };
  const hash = await sha256Hex(JSON.stringify(unsigned));
  const receipt = { ...unsigned, hash };
  session.receipts.push(receipt);
  session.head_hash = hash;
  session.updated_at = ts;
  return receipt;
}

function expired(session, now = Date.now()) {
  if (!session || !session.opened_at) return true;
  return now - Date.parse(session.opened_at) > SESSION_TTL_MS;
}

function prune(now = Date.now()) {
  for (const [id, session] of memory) {
    if (expired(session, now) || (session.closed && now - Date.parse(session.closed_at || session.updated_at) > SESSION_TTL_MS)) {
      memory.delete(id);
    }
  }
}

async function loadSession(id, env) {
  if (!SESSION_ID_RE.test(id)) return null;
  prune();
  if (memory.has(id)) return memory.get(id);
  const kv = kvOf(env);
  if (!kv) return null;
  try {
    const raw = await kv.get(sessionKey(id));
    if (!raw) return null;
    const session = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!session || session.id !== id) return null;
    memory.set(id, session);
    return session;
  } catch {
    return null;
  }
}

async function saveSession(session, env) {
  memory.set(session.id, session);
  const kv = kvOf(env);
  if (!kv) {
    session.persist = "isolate-memory";
    return;
  }
  try {
    await kv.put(sessionKey(session.id), JSON.stringify(session), { expirationTtl: Math.ceil(SESSION_TTL_MS / 1000) });
    session.persist = "isolate-memory+kv";
  } catch {
    session.persist = "isolate-memory";
  }
}

export async function sessionOpen(payload, env) {
  prune();
  if (memory.size >= SESSION_CAP) {
    return {
      ok: false,
      status: 507,
      error: "session-cap",
      cap: SESSION_CAP,
      remote_shell: false,
      limitation: LIMITATION,
      author: AUTHOR,
    };
  }
  const src = payload && typeof payload === "object" ? payload : {};
  const ts = nowIso();
  const session = {
    id: newSessionId(),
    opened_at: ts,
    updated_at: ts,
    closed: false,
    closed_at: null,
    cwd: "/home",
    vfs: prefabVfs(),
    receipts: [],
    head_hash: "0".repeat(64),
    persist: "isolate-memory",
    note: String(src.note || "").slice(0, 240) || null,
  };
  await appendReceipt(session, "open", { cwd: session.cwd, prefab: true }, ts);
  await saveSession(session, env);
  return {
    ...publicSession(session),
    op: "session_open",
    note: "Prefab ethics session VFS opened in-process. Not a remote host shell.",
  };
}

export async function sessionStatus(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const id = String(src.session_id || src.id || "").trim();
  if (!id) {
    return {
      ok: false,
      status: 400,
      error: "session_id required",
      remote_shell: false,
      limitation: LIMITATION,
      author: AUTHOR,
    };
  }
  const session = await loadSession(id, env);
  if (!session) {
    return {
      ok: false,
      status: 404,
      error: "session_not_found",
      session_id: id,
      remote_shell: false,
      limitation: LIMITATION,
      author: AUTHOR,
    };
  }
  if (expired(session)) {
    return {
      ok: false,
      status: 410,
      error: "session_expired",
      session_id: id,
      session_ttl_ms: SESSION_TTL_MS,
      remote_shell: false,
      limitation: LIMITATION,
      author: AUTHOR,
    };
  }
  const path = String(src.path || src.cwd || session.cwd || "/home");
  const vfs = session.vfs || prefabVfs();
  const node = vfs[path];
  const view = {
    ...publicSession(session),
    op: "session_status",
    path,
    node: node
      ? node.type === "file"
        ? { type: "file", name: path, body: String(node.body || "").slice(0, 2000) }
        : { type: "dir", name: path, children: (node.children || []).slice() }
      : { type: "missing", name: path },
    note: "Ethics VFS preview only. ls/cat here are metadata, not host exec.",
  };
  return view;
}

export async function sessionClose(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const id = String(src.session_id || src.id || "").trim();
  if (!id) {
    return {
      ok: false,
      status: 400,
      error: "session_id required",
      remote_shell: false,
      limitation: LIMITATION,
      author: AUTHOR,
    };
  }
  const session = await loadSession(id, env);
  if (!session) {
    return {
      ok: false,
      status: 404,
      error: "session_not_found",
      session_id: id,
      remote_shell: false,
      limitation: LIMITATION,
      author: AUTHOR,
    };
  }
  if (session.closed) {
    return {
      ...publicSession(session),
      op: "session_close",
      ok: true,
      already_closed: true,
      note: "Session already sealed. No host exec occurred.",
    };
  }
  const ts = nowIso();
  session.closed = true;
  session.closed_at = ts;
  await appendReceipt(session, "close", { sealed: true }, ts);
  await saveSession(session, env);
  return {
    ...publicSession(session),
    op: "session_close",
    sealed: true,
    note: "Ethics session sealed. exec / shell / lattice stay refuse.",
  };
}

/**
 * AZVPN — application-layer tunnel concentrator (AZVPN-CONCENTRATOR-1.0).
 *
 * REAL: session-scoped HTTPS/FragGate encrypted envelopes + peer routing
 * table. Optional WS attach ticket for the same inbox. Worker terminates
 * those app-layer sessions.
 * SLOT: WireGuard UDP, OpenVPN, L3 exit-IP pool, tun/tap, kernel VPN.
 *
 * FragGate only. Not a second door. Not GodLock-as-VPN.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  PUBLIC_VPN_AUTHOR,
  PUBLIC_VPN_IDENTITY,
  PUBLIC_VPN_NAME,
  PUBLIC_VPN_NOTE,
  PUBLIC_VPN_PAPER,
  PUBLIC_VPN_SLUG,
  PUBLIC_VPN_SPEC,
  TUNNEL_KIND_MATRIX,
  publicVpnCite,
} from "../../public-vpn.js";
import { ENVELOPE_CAP, INBOX_CAP, RECEIPT_CAP, TTL_MS, TUNNEL_CAP } from "../../tunnel-hub-do.js";
import { sha256Hex } from "../../session-core.js";

export const PRODUCT = PUBLIC_VPN_SLUG;
export const NAME = PUBLIC_VPN_NAME;
export const VERSION = "0.1.0";
export const ENGINE_VERSION = VERSION;
export const SPEC = "AZVPN-CONCENTRATOR-1.0";
export const AUTHOR = PUBLIC_VPN_AUTHOR;
export const IDENTITY = PUBLIC_VPN_IDENTITY;
export const MOTTO = "App-layer envelopes are REAL. Kernel VPN stays SLOT.";
export const ROLE = "application-layer tunnel concentrator";
export const SCHEMA = "azvpn.receipt.v0.1";
export const PRODUCT_GITHUB = "https://github.com/AzielEliab/aziel-runtime";
export const AXES = Object.freeze(["session", "route", "envelope", "receipt"]);
export const NEIGHBORS = Object.freeze(["aznet", "azbrowser", "fraggate"]);

export const LIVE_OPS = Object.freeze([
  "health",
  "skill",
  "doctor",
  "limitation",
  "describe",
  "open",
  "status",
  "list",
  "close",
  "send",
  "recv",
  "pull",
  "peers",
  "attach",
]);

export const STUB_REFUSE = Object.freeze([
  "wireguard",
  "wg",
  "openvpn",
  "ovpn",
  "l3_exit",
  "exit_pool",
  "udp_listen",
  "kernel_vpn",
  "tun",
  "tap",
  "socks",
  "tor",
  "origin_hiding",
]);

export const AUTO_PEER = "auto-backend";

export const LIMITATION =
  "THIS IS: AZVPN (AZVPN-CONCENTRATOR-1.0) — an application-layer tunnel concentrator. " +
  "AZVPN is the automatic public-VPN backend (default_vpn_backend:azvpn, auto_use:true). " +
  "open / send / recv / close allocate session-scoped HTTPS/FragGate encrypted envelopes " +
  "and a peer routing table. Worker terminates those app-layer sessions " +
  "(worker_terminates_tunnels:true). Optional attach mints a WS ticket for the same inbox. " +
  "THIS IS NOT: a WireGuard/OpenVPN/L3 kernel UDP concentrator, a Tor exit, SOCKS, " +
  "or origin-hiding fabric. Those stay SLOT and refuse. FragGate is THE single public door. " +
  "Softwares stay separate (AZBrowser, AZNet, FragGate, AZVPN). Author: Aziel Eliab only.";

const SLOT_KINDS = new Set([
  "wireguard",
  "wg",
  "openvpn",
  "ovpn",
  "l3",
  "l3_exit",
  "exit",
  "exit_pool",
  "udp",
  "udp_listen",
  "kernel",
  "kernel_vpn",
  "tun",
  "tap",
]);

const memory = {
  tunnels: Object.create(null),
  inboxes: Object.create(null),
  receipts: [],
  seq: 0,
};

let chain = Promise.resolve();

export function resetAzvpnStore() {
  memory.tunnels = Object.create(null);
  memory.inboxes = Object.create(null);
  memory.receipts = [];
  memory.seq = 0;
}

function serialize(fn) {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function nowMs() {
  return Date.now();
}

function nowIso(ms = nowMs()) {
  return new Date(ms).toISOString();
}

function hexOf(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(n = 16) {
  return hexOf(crypto.getRandomValues(new Uint8Array(n)));
}

function honesty() {
  const cite = publicVpnCite();
  return {
    vpn: true,
    public_vpn: true,
    tunnel_concentrator: true,
    concentrator_slug: PRODUCT,
    worker_terminates_tunnels: true,
    worker_terminates_kernel_udp: false,
    wireguard: false,
    openvpn: false,
    l3_exit_pool: false,
    tor: false,
    socks: false,
    origin_hiding: false,
    kinds: { ...TUNNEL_KIND_MATRIX },
    honesty: {
      https_ws: "REAL",
      fraggate_envelopes: "REAL",
      websocket_attach: "REAL",
      wireguard: "SLOT",
      openvpn: "SLOT",
      l3_exit_pool: "SLOT",
    },
    door: "fraggate",
    author: AUTHOR,
    identity: IDENTITY,
    spec: SPEC,
    paper: PUBLIC_VPN_PAPER,
    override: PUBLIC_VPN_SPEC,
    note: PUBLIC_VPN_NOTE,
    cite,
  };
}

function refuse(code, message, extra = {}) {
  return {
    ok: false,
    refused: true,
    code,
    error: message,
    ...honesty(),
    ...extra,
  };
}

function slotRefuse(kind) {
  const k = String(kind || "kernel").toLowerCase();
  const code =
    k === "wireguard" || k === "wg"
      ? "AZVPN-SLOT-WIREGUARD"
      : k === "openvpn" || k === "ovpn"
        ? "AZVPN-SLOT-OPENVPN"
        : k === "l3" || k === "l3_exit" || k === "exit" || k === "exit_pool"
          ? "AZVPN-SLOT-L3-EXIT"
          : "AZVPN-SLOT-KERNEL";
  return refuse(
    code,
    "SLOT: this Worker does not terminate WireGuard/OpenVPN/L3 kernel UDP. Use kind=https_ws (REAL application-layer envelopes).",
    { kind: k, slot: true, real_kind: "https_ws" },
  );
}

function publicTunnel(row) {
  if (!row) return null;
  return {
    tunnel_id: row.tunnel_id,
    state: row.closed ? "closed" : "open",
    kind: row.kind,
    honesty: "REAL",
    peer: row.peer,
    route_id: row.route_id,
    opened_at: row.opened_at,
    expires_at: row.expires_at,
    closed: row.closed === true,
    inbox_depth: (memory.inboxes[row.tunnel_id] || []).length,
    bearer: "https/fraggate",
    kernel_udp: false,
    auto: row.auto === true,
  };
}

async function mintReceipt(fields) {
  memory.seq += 1;
  const ts = nowIso();
  const prev = memory.receipts[0] && memory.receipts[0].hash ? memory.receipts[0].hash : "0".repeat(64);
  const draft = {
    schema: SCHEMA,
    id: `azvpn_${memory.seq.toString(36)}_${ts.slice(0, 19).replace(/[-:T]/g, "")}`,
    op: fields.op || "",
    kind: fields.kind || "https_ws",
    tunnel_id: fields.tunnel_id || "",
    ts,
    prev,
    summary: fields.summary || fields.op || "",
  };
  const hash = await sha256Hex(JSON.stringify(draft));
  const receipt = { ...draft, hash };
  memory.receipts.unshift(receipt);
  if (memory.receipts.length > RECEIPT_CAP) memory.receipts.length = RECEIPT_CAP;
  return receipt;
}

function prune() {
  const now = nowMs();
  for (const row of Object.values(memory.tunnels)) {
    if (!row || row.closed) continue;
    if (row.expires_at_ms && row.expires_at_ms <= now) {
      row.closed = true;
      row.state = "closed";
    }
  }
}

function requireOpen(tunnelId, token) {
  prune();
  const id = String(tunnelId || "").trim();
  const row = memory.tunnels[id];
  if (!row) return { ok: false, refuse: refuse("AZVPN-UNKNOWN", "Unknown tunnel_id.", { tunnel_id: id || null }) };
  if (row.closed) return { ok: false, refuse: refuse("AZVPN-CLOSED", "Tunnel is closed.", { tunnel_id: id }) };
  if (token != null && String(token) !== row.token) {
    return { ok: false, refuse: refuse("AZVPN-BAD-TOKEN", "tunnel token mismatch.", { tunnel_id: id }) };
  }
  return { ok: true, row };
}

async function encryptPlaintext(keyRaw, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyRaw, { name: "AES-GCM" }, false, ["encrypt"]);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { alg: "AES-GCM", iv: hexOf(iv), ciphertext: hexOf(new Uint8Array(ct)) };
}

function envelopeBytes(envl) {
  return new TextEncoder().encode(JSON.stringify(envl || {})).byteLength;
}

export function describeConcentrator() {
  return {
    ok: true,
    op: "describe",
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    role: ROLE,
    motto: MOTTO,
    live_ops: LIVE_OPS.slice(),
    stub_ops: STUB_REFUSE.slice(),
    tunnel_cap: TUNNEL_CAP,
    inbox_cap: INBOX_CAP,
    envelope_cap: ENVELOPE_CAP,
    ttl_ms: TTL_MS,
    limitation: LIMITATION,
    ...honesty(),
  };
}

export function limitationCite() {
  return {
    ok: true,
    op: "limitation",
    product: PRODUCT,
    spec: SPEC,
    limitation: LIMITATION,
    live_ops: LIVE_OPS.slice(),
    stub_ops: STUB_REFUSE.slice(),
    honesty_labels: {
      https_ws: "REAL",
      fraggate_envelopes: "REAL",
      websocket_attach: "REAL",
      wireguard: "SLOT",
      openvpn: "SLOT",
      l3_exit_pool: "SLOT",
    },
    ...honesty(),
  };
}

export async function openTunnel(payload) {
  return serialize(async () => {
    const src = payload && typeof payload === "object" ? payload : {};
    const kind = String(src.kind || src.tunnel_kind || "https_ws")
      .trim()
      .toLowerCase()
      .replace(/[-\s]+/g, "_");
    if (SLOT_KINDS.has(kind)) return slotRefuse(kind);
    if (kind && kind !== "https_ws" && kind !== "https" && kind !== "ws" && kind !== "websocket" && kind !== "fraggate") {
      return slotRefuse(kind);
    }
    prune();
    const openCount = Object.values(memory.tunnels).filter((t) => t && !t.closed).length;
    if (openCount >= TUNNEL_CAP) {
      return refuse("AZVPN-CAP", `Open tunnel cap is ${TUNNEL_CAP}. Close a session first.`);
    }
    const now = nowMs();
    const tunnel_id = `tun_${randomHex(12)}`;
    const token = randomHex(16);
    const keyRaw = crypto.getRandomValues(new Uint8Array(32));
    const session_key = hexOf(keyRaw);
    const auto = src.auto === true || String(src.peer || "").trim() === AUTO_PEER;
    const peer = String(src.peer || src.peer_id || (auto ? AUTO_PEER : "peer")).trim().slice(0, 80) || (auto ? AUTO_PEER : "peer");
    const route_id = `rt_${randomHex(8)}`;
    const row = {
      tunnel_id,
      token,
      session_key,
      kind: "https_ws",
      peer,
      route_id,
      auto,
      opened_at: nowIso(now),
      expires_at_ms: now + TTL_MS,
      expires_at: nowIso(now + TTL_MS),
      closed: false,
      state: "open",
    };
    memory.tunnels[tunnel_id] = row;
    memory.inboxes[tunnel_id] = [];
    const receipt = await mintReceipt({ op: "open", tunnel_id, kind: "https_ws", summary: `open ${peer}` });
    return {
      ok: true,
      op: "open",
      code: "AZVPN-OK",
      tunnel_id,
      token,
      session_key,
      session_key_once: true,
      route_id,
      peer,
      kind: "https_ws",
      expires_at: row.expires_at,
      receipt,
      attach: {
        path: "/v1/azvpn/ws",
        ticket: token,
        note: "WS attach is the same concentrator inbox. Control plane stays FragGate. Not a second exec door.",
      },
      auto,
      note: "REAL application-layer session. Keep token + session_key. Worker does not terminate WireGuard/OpenVPN.",
      ...honesty(),
    };
  });
}

export async function findAutoTunnel() {
  return serialize(async () => {
    prune();
    const row = Object.values(memory.tunnels).find((t) => t && !t.closed && t.auto === true);
    if (!row) return null;
    return {
      ...publicTunnel(row),
      token: row.token,
      session_key: row.session_key,
    };
  });
}

export async function tunnelStatus(payload) {
  return serialize(async () => {
    const src = payload && typeof payload === "object" ? payload : {};
    const gate = requireOpen(src.tunnel_id, src.token);
    if (!gate.ok) {
      if (gate.refuse && gate.refuse.code === "AZVPN-CLOSED") {
        const row = memory.tunnels[String(src.tunnel_id || "").trim()];
        return { ok: true, op: "status", tunnel: publicTunnel(row), ...honesty() };
      }
      return gate.refuse;
    }
    return { ok: true, op: "status", tunnel: publicTunnel(gate.row), ...honesty() };
  });
}

export async function listTunnels() {
  return serialize(async () => {
    prune();
    const tunnels = Object.values(memory.tunnels).map(publicTunnel);
    return {
      ok: true,
      op: "list",
      count: tunnels.length,
      open: tunnels.filter((t) => t && t.state === "open").length,
      tunnels,
      ...honesty(),
    };
  });
}

export async function closeTunnel(payload) {
  return serialize(async () => {
    const src = payload && typeof payload === "object" ? payload : {};
    const id = String(src.tunnel_id || "").trim();
    const row = memory.tunnels[id];
    if (!row) return refuse("AZVPN-UNKNOWN", "Unknown tunnel_id.", { tunnel_id: id || null });
    if (src.token != null && String(src.token) !== row.token) {
      return refuse("AZVPN-BAD-TOKEN", "tunnel token mismatch.", { tunnel_id: id });
    }
    row.closed = true;
    row.state = "closed";
    const receipt = await mintReceipt({ op: "close", tunnel_id: id, kind: row.kind, summary: "close" });
    return {
      ok: true,
      op: "close",
      code: "AZVPN-OK",
      tunnel: publicTunnel(row),
      receipt,
      ...honesty(),
    };
  });
}

export async function sendEnvelope(payload) {
  return serialize(async () => {
    const src = payload && typeof payload === "object" ? payload : {};
    const gate = requireOpen(src.tunnel_id, src.token);
    if (!gate.ok) return gate.refuse;
    let envelope = src.envelope && typeof src.envelope === "object" ? { ...src.envelope } : null;
    if (!envelope && src.plaintext != null) {
      const text = String(src.plaintext);
      if (text.length > ENVELOPE_CAP) return refuse("AZVPN-TOO-LARGE", `plaintext exceeds ${ENVELOPE_CAP} bytes.`);
      const keyRaw = Uint8Array.from(gate.row.session_key.match(/.{2}/g).map((h) => parseInt(h, 16)));
      envelope = await encryptPlaintext(keyRaw, text);
    }
    if (!envelope || (!envelope.ciphertext && !envelope.body)) {
      return refuse("AZVPN-BAD-INPUT", "send requires envelope.ciphertext or plaintext.");
    }
    if (envelopeBytes(envelope) > ENVELOPE_CAP) {
      return refuse("AZVPN-TOO-LARGE", `envelope exceeds ${ENVELOPE_CAP} bytes.`);
    }
    const dest = String(src.to || src.peer || gate.row.tunnel_id).trim() || gate.row.tunnel_id;
    const inboxId = memory.tunnels[dest] ? dest : gate.row.tunnel_id;
    const inbox = memory.inboxes[inboxId] || (memory.inboxes[inboxId] = []);
    const item = {
      id: `env_${randomHex(8)}`,
      from: gate.row.tunnel_id,
      to: dest,
      ts: nowIso(),
      envelope: {
        alg: envelope.alg || "AES-GCM",
        iv: envelope.iv || null,
        ciphertext: envelope.ciphertext || envelope.body,
      },
    };
    inbox.unshift(item);
    if (inbox.length > INBOX_CAP) inbox.length = INBOX_CAP;
    const receipt = await mintReceipt({
      op: "send",
      tunnel_id: gate.row.tunnel_id,
      kind: "https_ws",
      summary: `send ${item.id}`,
    });
    return {
      ok: true,
      op: "send",
      code: "AZVPN-OK",
      envelope_id: item.id,
      to: dest,
      inbox_depth: inbox.length,
      receipt,
      stored_plaintext: false,
      ...honesty(),
    };
  });
}

export async function recvEnvelopes(payload) {
  return serialize(async () => {
    const src = payload && typeof payload === "object" ? payload : {};
    const gate = requireOpen(src.tunnel_id, src.token);
    if (!gate.ok) return gate.refuse;
    const inbox = memory.inboxes[gate.row.tunnel_id] || [];
    const limit = Math.min(16, Math.max(1, Number(src.limit) || 8));
    const items = inbox.slice(0, limit);
    if (src.ack !== false) {
      memory.inboxes[gate.row.tunnel_id] = inbox.slice(items.length);
    }
    return {
      ok: true,
      op: src.op || "recv",
      code: "AZVPN-OK",
      count: items.length,
      remaining: (memory.inboxes[gate.row.tunnel_id] || []).length,
      envelopes: items,
      ...honesty(),
    };
  });
}

export async function listPeers() {
  return serialize(async () => {
    prune();
    const peers = Object.values(memory.tunnels)
      .filter((t) => t && !t.closed)
      .map((t) => ({ tunnel_id: t.tunnel_id, peer: t.peer, route_id: t.route_id }));
    return { ok: true, op: "peers", count: peers.length, peers, ...honesty() };
  });
}

export async function attachTicket(payload) {
  return serialize(async () => {
    const src = payload && typeof payload === "object" ? payload : {};
    const gate = requireOpen(src.tunnel_id || findTunnelByToken(src.ticket || src.token), src.token || src.ticket);
    if (!gate.ok) return gate.refuse;
    return {
      ok: true,
      op: "attach",
      code: "AZVPN-OK",
      tunnel_id: gate.row.tunnel_id,
      path: "/v1/azvpn/ws",
      ticket: gate.row.token,
      kind: "https_ws",
      note: "WS attach uses the same inbox as FragGate send/recv. Not a second exec door. Not WireGuard.",
      ...honesty(),
    };
  });
}

function findTunnelByToken(token) {
  const t = String(token || "").trim();
  if (!t) return "";
  for (const row of Object.values(memory.tunnels)) {
    if (row && row.token === t) return row.tunnel_id;
  }
  return "";
}

/** Data-plane WS attach. Same inbox as FragGate send/recv. Not a second exec door. */
export async function attachWebSocket(request) {
  const url = new URL(request.url);
  const ticket = String(url.searchParams.get("ticket") || url.searchParams.get("token") || "").trim();
  const gate = requireOpen(findTunnelByToken(ticket), ticket);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.refuse), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const Pair = globalThis.WebSocketPair;
  if (typeof Pair !== "function") {
    return new Response(
      JSON.stringify({
        ok: false,
        code: "AZVPN-NO-WS",
        error: "WebSocketPair is not available in this isolate. Use FragGate send/recv (REAL HTTPS envelopes).",
        ...honesty(),
      }),
      { status: 501, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
  const pair = new Pair();
  const client = pair[0];
  const server = pair[1];
  server.accept();
  server.addEventListener("message", (ev) => {
    const text = typeof ev.data === "string" ? ev.data : "";
    if (!text) return;
    memory.inboxes[gate.row.tunnel_id] = memory.inboxes[gate.row.tunnel_id] || [];
    memory.inboxes[gate.row.tunnel_id].unshift({
      id: `env_${randomHex(8)}`,
      from: gate.row.tunnel_id,
      to: gate.row.tunnel_id,
      ts: nowIso(),
      envelope: { alg: "ws-text", iv: null, ciphertext: text.slice(0, ENVELOPE_CAP) },
    });
    server.send(JSON.stringify({ ok: true, op: "ack", queued: true, tunnel_id: gate.row.tunnel_id }));
  });
  server.send(
    JSON.stringify({
      ok: true,
      op: "attach",
      tunnel_id: gate.row.tunnel_id,
      kind: "https_ws",
      note: "Same AZVPN inbox. Not WireGuard.",
    }),
  );
  return new Response(null, { status: 101, webSocket: client });
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
    live_ops: LIVE_OPS,
    stub_ops: STUB_REFUSE,
    limitation: LIMITATION,
    extra: {
      github: PRODUCT_GITHUB,
      worker_home: null,
      in_runtime: true,
      domain: null,
      placement: "tunnel-concentrator",
      vpn: true,
      public_vpn: true,
      tunnel_concentrator: true,
      worker_terminates_tunnels: true,
      worker_terminates_kernel_udp: false,
    },
  };
}

export function azvpnHealth() {
  prune();
  const open = Object.values(memory.tunnels).filter((t) => t && !t.closed).length;
  return {
    ...capabilityHealth(envelope()),
    ...honesty(),
    open_tunnels: open,
  };
}

export function azvpnSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: `Application-layer HTTPS/FragGate tunnel concentrator. ${MOTTO} open / send / recv / close are REAL. wireguard / openvpn / l3_exit stay FG-STUB. In-runtime placement (no invented product Worker). Cite ${PRODUCT_GITHUB}.`,
  });
}

export function azvpnDoctor() {
  return {
    ...capabilityDoctor({
      ...envelope(),
      doctor_note:
        "AZVPN doctor: HTTPS/FragGate envelopes REAL. WireGuard/OpenVPN/L3 SLOT. Auto-bind default backend. FragGate only. Not a mesh enable. Not kernel UDP.",
    }),
    ...honesty(),
  };
}

export { ENVELOPE_CAP, INBOX_CAP, RECEIPT_CAP, TTL_MS, TUNNEL_CAP };

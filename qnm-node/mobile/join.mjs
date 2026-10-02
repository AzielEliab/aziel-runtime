/**
 * Track 2 mobile join client.
 *
 * Speaks the local node's existing LAN beacon and sealed peer session
 * (D2D-CARRIERS-1.0 / src/fed-mesh/track2.js). This file is not a second
 * protocol. A phone on Wi-Fi is the path to that LAN socket.
 *
 * mobile_client stays present-not-demonstrated. This module does not arm
 * radios, does not mark a Wi-Fi / RF / photon exchange, and does not set
 * alt_internet_live. It has no arm method. GET never arms.
 *
 * Paper: docs/designs/TRACK2-MOBILE-JOIN-1.0.md
 * Author: Aziel Eliab only.
 */

export const MOBILE_CLIENT = "present-not-demonstrated";
export const MOBILE_AUTHOR = "Aziel Eliab";
export const TRACK2_SPEC = "D2D-CARRIERS-1.0";
export const TRACK2_PLANE = "track2-reachability";
export const FED_SPEC = "FED-MESH-1.0";
export const JOIN_CARRIER = "lan";
export const ZERO_HASH = "0".repeat(64);

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const HANDLE_LEN = 11;
const BEACON_KEYS = new Set([
  "v",
  "kind",
  "plane",
  "presence",
  "tip_hash",
  "prev",
  "handle",
  "public_key",
  "enc_public_key",
  "carrier",
  "direct_url",
  "sig",
]);
const FORBIDDEN_TICK = new Set([
  "body",
  "diff",
  "file",
  "bytes",
  "video",
  "mp4",
  "media",
  "blob",
  "content",
  "upload",
  "data",
  "payload",
  "payload_b64",
  "file_b64",
  "also",
  "attachment",
  "stream",
  "plaintext",
]);

const ED_PKCS8_PREFIX = Uint8Array.from([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);
const X_PKCS8_PREFIX = Uint8Array.from([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20,
]);

export function clientHonesty() {
  return {
    mobile_client: MOBILE_CLIENT,
    mobile_demonstrated: false,
    demonstrated: false,
    app_store_release: false,
    author: MOBILE_AUTHOR,
    identity: MOBILE_AUTHOR,
    spec: TRACK2_SPEC,
    plane: TRACK2_PLANE,
    join_carrier: JOIN_CARRIER,
    phone_radio: "wifi-reaches-lan",
    wifi_carrier_exchange: false,
    wifi_peer_exchange_demonstrated: false,
    rf_live: false,
    photon_live: false,
    second_device: false,
    alt_internet_live: false,
    packet_path_live: false,
    get_never_enables: true,
    public_door: "FG-STUB",
    worker_invents_peers: false,
    mock: false,
  };
}

function fail(code, message, extra = {}) {
  return { ...extra, ...clientHonesty(), ok: false, code, message };
}

function pass(extra = {}) {
  const code = extra && extra.code ? extra.code : "MESH-OK";
  return { ...extra, ...clientHonesty(), ok: true, code };
}

export function canonicalizeJoin(value) {
  if (value === undefined) return undefined;
  if (value === null) return "null";
  const t = typeof value;
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error("cannot canonicalize non-finite number");
    return JSON.stringify(value);
  }
  if (t === "boolean") return value ? "true" : "false";
  if (t === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalizeJoin(item)).join(",")}]`;
  if (t === "object") {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalizeJoin(value[key])}`).join(",")}}`;
  }
  throw new Error(`cannot canonicalize ${t}`);
}

function utf8(text) {
  return new TextEncoder().encode(text);
}

function bytesToB64url(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i += 1) s += String.fromCharCode(u8[i]);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlToBytes(text) {
  const raw = String(text || "").trim();
  if (!raw || /[^A-Za-z0-9_-]/.test(raw)) return null;
  const pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
  const b64 = raw.replaceAll("-", "+").replaceAll("_", "/") + pad;
  let bin;
  try {
    bin = atob(b64);
  } catch {
    return null;
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function pkcs8(prefix, seed) {
  const out = new Uint8Array(prefix.length + seed.length);
  out.set(prefix, 0);
  out.set(seed, prefix.length);
  return out;
}

async function sha256Bytes(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(buf);
}

async function handleFromRaw(raw) {
  if (!raw || raw.length !== 32) return "";
  const digest = await sha256Bytes(raw);
  let acc = 0n;
  let bits = 0n;
  let out = "";
  for (let i = 0; i < digest.length && out.length < HANDLE_LEN; i += 1) {
    acc = (acc << 8n) | BigInt(digest[i]);
    bits += 8n;
    while (bits >= 5n && out.length < HANDLE_LEN) {
      bits -= 5n;
      out += CROCKFORD[Number((acc >> bits) & 31n)];
    }
  }
  return out.length === HANDLE_LEN ? `#${out}` : "";
}

async function publicB64(privateKey) {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return String(jwk.x || "");
}

async function generateEd25519() {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const public_key = await publicB64(pair.privateKey);
  const handle = await handleFromRaw(b64urlToBytes(public_key));
  return { privateKey: pair.privateKey, public_key, handle };
}

async function generateX25519() {
  const pair = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const enc_public_key = await publicB64(pair.privateKey);
  return { privateKey: pair.privateKey, enc_public_key };
}

async function signObject(privateKey, object) {
  const sig = await crypto.subtle.sign("Ed25519", privateKey, utf8(canonicalizeJoin(object)));
  return bytesToB64url(sig);
}

export async function verifyJoin(publicKeyB64, object, sigB64) {
  const raw = b64urlToBytes(publicKeyB64);
  const sig = b64urlToBytes(sigB64);
  if (!raw || raw.length !== 32 || !sig || sig.length !== 64) return false;
  const key = await crypto.subtle.importKey("raw", raw, { name: "Ed25519" }, true, ["verify"]);
  return crypto.subtle.verify("Ed25519", key, sig, utf8(canonicalizeJoin(object)));
}

function hex64(value) {
  return /^[a-f0-9]{64}$/.test(String(value || "").trim().toLowerCase());
}

export function beaconView(beacon) {
  if (!beacon || typeof beacon !== "object") return null;
  return {
    presence: beacon.presence,
    tip_hash: String(beacon.tip_hash || "").trim().toLowerCase(),
  };
}

function bannedTick(object) {
  return Object.keys(object || {}).filter((key) => FORBIDDEN_TICK.has(key));
}

function baseOf(raw) {
  return String(raw || "").trim().replace(/\/$/, "");
}

function isLanHost(host) {
  if (host.endsWith(".local")) return true;
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part))) {
    const n = parts.map((part) => Number(part));
    if (n.some((part) => part > 255)) return false;
    if (n[0] === 10) return true;
    if (n[0] === 192 && n[1] === 168) return true;
    if (n[0] === 172 && n[1] >= 16 && n[1] <= 31) return true;
    if (n[0] === 169 && n[1] === 254) return true;
    return false;
  }
  return host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
}

export function joinRoute(raw) {
  const text = String(raw || "").trim();
  if (!text) return fail("FED-MESH-BAD-INPUT", "Name the local node URL.");
  if (/^(stun|stuns|turn|turns|nat|ice):/i.test(text)) {
    return fail("FED-MESH-NAT-REFUSE", "NAT hole-punch is refused.", { hole_punch: false });
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    return fail("FED-MESH-BAD-INPUT", "Peer URL is not a URL.", { hole_punch: false });
  }
  if (url.username || url.password) return fail("FED-MESH-BAD-INPUT", "Peer URLs do not carry userinfo.");
  for (const key of ["hole_punch", "hole-punch", "nat_punch", "punch", "stun", "ice", "turn", "upnp"]) {
    const value = String(url.searchParams.get(key) || "").toLowerCase();
    if (value === "1" || value === "true" || value === "yes") {
      return fail("FED-MESH-NAT-REFUSE", "NAT hole-punch is refused.", { hole_punch: false });
    }
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("FED-MESH-NAT-REFUSE", "That scheme is not the LAN client path.", { hole_punch: false });
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return pass({ route_class: "direct", bearer_mode: "loopback", hole_punch: false });
  }
  if (isLanHost(host)) return pass({ route_class: "direct", bearer_mode: "direct-lan", hole_punch: false });
  return fail("FED-MESH-NO-ROUTE", "The mobile client joins a loopback or LAN node. A public host is not this path.", {
    hole_punch: false,
  });
}

async function postJson(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return fail("FED-MESH-NO-ROUTE", "The local node did not answer. NAT punch is not a fallback.", {
      detail: String(err && err.message ? err.message : err),
      hole_punch: false,
    });
  }
  const parsed = await res.json().catch(() => ({}));
  return parsed && typeof parsed === "object" ? parsed : fail("FED-MESH-BAD-INPUT", "The node did not return JSON.");
}

async function getJson(url) {
  let res;
  try {
    res = await fetch(url, { headers: { accept: "application/json" } });
  } catch (err) {
    return fail("FED-MESH-NO-ROUTE", "The local node did not answer. NAT punch is not a fallback.", {
      detail: String(err && err.message ? err.message : err),
      hole_punch: false,
    });
  }
  const parsed = await res.json().catch(() => ({}));
  return parsed && typeof parsed === "object" ? parsed : fail("FED-MESH-BAD-INPUT", "The node did not return JSON.");
}

function sessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `d2d_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

async function importXPublic(b64) {
  const raw = b64urlToBytes(b64);
  if (!raw || raw.length !== 32) return null;
  return crypto.subtle.importKey("raw", raw, { name: "X25519" }, true, []);
}

async function sharedKey(privateKey, publicB64, fromHandle, toHandle, seq) {
  const pub = await importXPublic(publicB64);
  if (!pub) return null;
  const bits = await crypto.subtle.deriveBits({ name: "X25519", public: pub }, privateKey, 256);
  const hkdf = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveBits"]);
  const aes = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: utf8(FED_SPEC),
      info: utf8(`${FED_SPEC}|${fromHandle}|${toHandle}|${seq}`),
    },
    hkdf,
    256,
  );
  return crypto.subtle.importKey("raw", aes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function sealPlaintext({ fromHandle, toHandle, seq, recipientEncPublicKey, plaintext }) {
  const eph = await generateX25519();
  const key = await sharedKey(eph.privateKey, recipientEncPublicKey, fromHandle, toHandle, seq);
  if (!key) return null;
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, utf8(String(plaintext ?? "")));
  return {
    nonce: bytesToB64url(nonce),
    eph_public_key: eph.enc_public_key,
    ciphertext: bytesToB64url(new Uint8Array(ct)),
  };
}

function checkBeacon(beacon) {
  if (!beacon || typeof beacon !== "object" || Array.isArray(beacon)) {
    return fail("FED-MESH-BAD-INPUT", "Beacon must be an object.");
  }
  const banned = bannedTick(beacon);
  if (banned.length) return fail("MESH-NO-BYTES", "A discovery tick is presence and tip hash only.", { refused_keys: banned });
  const extra = Object.keys(beacon).filter((key) => !BEACON_KEYS.has(key));
  if (extra.length) return fail("FED-MESH-BAD-INPUT", "Beacon carries a field outside presence and tip hash.", { fields: extra });
  if (beacon.v !== TRACK2_SPEC || beacon.kind !== "beacon" || beacon.plane !== TRACK2_PLANE) {
    return fail("FED-MESH-BAD-INPUT", "Beacon plane is track2-reachability.");
  }
  if (beacon.carrier !== JOIN_CARRIER) {
    return fail("FG-STUB", "The mobile client accepts the LAN beacon only. Wi-Fi, RF, and photon are not this exchange.", {
      carrier: beacon.carrier || "",
    });
  }
  if (beacon.presence !== "live") return fail("MESH-BAD-INPUT", "Beacon presence must be live.");
  if (!hex64(beacon.tip_hash) || !hex64(beacon.prev)) {
    return fail("MESH-BAD-INPUT", "tip_hash and prev are 32-byte hex.");
  }
  if (beacon.body != null || beacon.plaintext != null || beacon.payload != null) {
    return fail("MESH-NO-BYTES", "A discovery tick is presence and tip hash only.");
  }
  return null;
}

export async function createMobileJoinClient() {
  const signing = await generateEd25519();
  const enc = await generateX25519();
  if (!signing.handle || signing.public_key === enc.enc_public_key) {
    throw new Error("Mobile join identity failed closed.");
  }
  const state = {
    handle: signing.handle,
    public_key: signing.public_key,
    enc_public_key: enc.enc_public_key,
    signPrivate: signing.privateKey,
    tip_hash: ZERO_HASH,
    prev: ZERO_HASH,
    peer: null,
    session: null,
  };

  async function signBeacon(carrier = JOIN_CARRIER) {
    const id = String(carrier || "").trim().toLowerCase();
    if (id !== JOIN_CARRIER) {
      return fail("FG-STUB", "The phone speaks the LAN beacon. Wi-Fi on the phone is the path to that socket, not a Wi-Fi carrier exchange.", {
        carrier: id,
      });
    }
    const statement = {
      v: TRACK2_SPEC,
      kind: "beacon",
      plane: TRACK2_PLANE,
      presence: "live",
      tip_hash: state.tip_hash,
      prev: state.prev,
      handle: state.handle,
      public_key: state.public_key,
      enc_public_key: state.enc_public_key,
      carrier: JOIN_CARRIER,
    };
    const sig = await signObject(state.signPrivate, statement);
    return pass({ beacon: { ...statement, sig } });
  }

  async function remember(beacon) {
    const problem = checkBeacon(beacon);
    if (problem) return problem;
    const { sig, ...statement } = beacon;
    const verified = await verifyJoin(beacon.public_key, statement, sig);
    if (!verified) return fail("AZP-BAD-SIG", "Beacon signature failed.");
    if (beacon.handle === state.handle) return fail("FED-MESH-BAD-HANDLE", "A client does not discover itself.");
    state.peer = {
      handle: beacon.handle,
      public_key: beacon.public_key,
      enc_public_key: beacon.enc_public_key,
      presence: beacon.presence,
      tip_hash: String(beacon.tip_hash).trim().toLowerCase(),
      prev: String(beacon.prev || ZERO_HASH).trim().toLowerCase(),
      carrier: JOIN_CARRIER,
    };
    return null;
  }

  return {
    handle: state.handle,
    public_key: state.public_key,
    enc_public_key: state.enc_public_key,
    async sign(statement) {
      return signObject(state.signPrivate, statement);
    },
    signBeacon,
    async readRoster(base) {
      const root = baseOf(base);
      const route = joinRoute(root);
      if (!route.ok) return route;
      const node = await getJson(`${root}/v1/fed-mesh/discover`);
      if (node && node.code && node.ok !== true && !node.peers && !node.carriers && node.code !== "MESH-OFF") {
        return fail(node.code, node.message || "Roster read failed.", { node });
      }
      return pass({
        op: "peer_list",
        node,
        peers: Array.isArray(node.peers) ? node.peers : [],
        fixture: node.fixture === true,
        armed: Array.isArray(node.armed) ? node.armed : [],
        roster_code: node.code || null,
        roster_ok: node.ok === true,
      });
    },
    async discover(base) {
      const root = baseOf(base);
      const route = joinRoute(root);
      if (!route.ok) return route;
      let last = null;
      for (let round = 0; round < 2; round += 1) {
        const mine = await signBeacon(JOIN_CARRIER);
        if (!mine.ok) return mine;
        const body = await postJson(`${root}/v1/fed-mesh/discover`, mine.beacon);
        if (!body || body.ok !== true || !body.beacon) {
          return fail(body && body.code ? body.code : "FED-MESH-NO-ROUTE", (body && body.message) || "Peer did not return a beacon.", {
            node: body,
          });
        }
        const remembered = await remember(body.beacon);
        if (remembered) return remembered;
        last = body;
      }
      const view = beaconView(last.beacon);
      return pass({
        op: "mesh_discover",
        beacon: view,
        node_handle: state.peer.handle,
        mutual: last.mutual === true,
        hits: last.hits,
        discovery: last.discovery || null,
        peers: Array.isArray(last.peers) ? last.peers : [],
        fixture: last.discovery ? last.discovery.fixture === true : false,
        carrier: JOIN_CARRIER,
      });
    },
    async openSession(base) {
      const root = baseOf(base);
      const route = joinRoute(root);
      if (!route.ok) return route;
      if (!state.peer) {
        const found = await this.discover(root);
        if (!found.ok) return found;
      }
      if (!state.peer) return fail("MESH-NO-ROUTE", "No LAN beacon has been verified.");
      let signingKey = null;
      let encKey = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        signingKey = await generateEd25519();
        encKey = await generateX25519();
        if (
          signingKey.public_key !== state.public_key &&
          signingKey.handle !== state.handle &&
          encKey.enc_public_key !== state.enc_public_key
        ) {
          break;
        }
        signingKey = null;
      }
      if (!signingKey || !encKey) return fail("AZP-BAD-KEY", "Session key matched the node key. Fail closed.");
      const id = sessionId();
      const statement = {
        v: TRACK2_SPEC,
        kind: "peer-session",
        plane: TRACK2_PLANE,
        session_id: id,
        handle: state.handle,
        node_public_key: state.public_key,
        session_handle: signingKey.handle,
        session_public_key: signingKey.public_key,
        session_enc_public_key: encKey.enc_public_key,
        peer_handle: state.peer.handle,
        route_class: route.route_class,
        bearer_mode: route.bearer_mode,
      };
      const sig = await signObject(state.signPrivate, statement);
      const body = await postJson(`${root}/v1/fed-mesh/peer-session`, { ...statement, sig });
      if (!body || body.ok !== true || !body.offer) {
        return fail(body && body.code ? body.code : "MESH-NO-ROUTE", (body && body.message) || "The node did not accept the session.", {
          node: body,
        });
      }
      const counter = body.offer;
      if (counter.kind !== "peer-session" || counter.plane !== TRACK2_PLANE) {
        return fail("FED-MESH-BAD-INPUT", "Session offer plane is track2-reachability.");
      }
      if (counter.handle !== state.peer.handle || counter.node_public_key !== state.peer.public_key) {
        return fail("AZP-BAD-SIG", "Counter-offer node key does not match the beacon.");
      }
      if (counter.peer_handle !== state.handle || counter.peer_session_id !== id) {
        return fail("FED-MESH-BAD-HANDLE", "Counter-offer is for a different session.");
      }
      if (counter.session_public_key === counter.node_public_key || counter.session_handle === counter.handle) {
        return fail("AZP-BAD-KEY", "Session identity matches the long-term node key.");
      }
      if (counter.route_class !== "direct" && counter.route_class !== "relay") {
        return fail("AZP-REFUSE", "Route class is direct or relay.");
      }
      const { sig: counterSig, ...counterStatement } = counter;
      const verified = await verifyJoin(counter.node_public_key, counterStatement, counterSig);
      if (!verified) return fail("AZP-BAD-SIG", "Session binding signature failed.");
      state.session = {
        session_id: id,
        signPrivate: signingKey.privateKey,
        session_public_key: signingKey.public_key,
        session_handle: signingKey.handle,
        peer_session_id: counter.session_id,
        peer_session_public_key: counter.session_public_key,
        peer_session_enc_public_key: counter.session_enc_public_key,
        route_class: statement.route_class,
        bearer_mode: statement.bearer_mode,
        open: true,
        seq: 0,
      };
      return pass({
        op: "peer_session_open",
        session_id: id,
        peer_session_id: counter.session_id,
        route_class: statement.route_class,
        bearer_mode: statement.bearer_mode,
        peer_tunnel: "LIVE-when-session",
        live: true,
        session_identity_is_node_key: false,
        session_public_key: signingKey.public_key,
        node_public_key: state.public_key,
      });
    },
    async send(base, plaintext) {
      const root = baseOf(base);
      const route = joinRoute(root);
      if (!route.ok) return route;
      const row = state.session;
      if (!row || row.open !== true) return fail("MESH-NO-ROUTE", "Session is not open.", { peer_tunnel: "down" });
      if (/\b(inject-payload|jailbreak-ignore|ignore previous instructions|dan mode|poison)\b/i.test(String(plaintext || ""))) {
        return fail("FED-MESH-POISON", "Poison refused before send. Not interpreted.", { sent: false });
      }
      row.seq += 1;
      const sealed = await sealPlaintext({
        fromHandle: row.session_id,
        toHandle: row.peer_session_id,
        seq: row.seq,
        recipientEncPublicKey: row.peer_session_enc_public_key,
        plaintext: String(plaintext ?? ""),
      });
      if (!sealed) return fail("AZP-REFUSE", "Session seal failed. Fail closed.");
      const envelope = {
        v: TRACK2_SPEC,
        kind: "peer-share",
        plane: TRACK2_PLANE,
        session_id: row.session_id,
        to_session: row.peer_session_id,
        handle: state.handle,
        session_public_key: row.session_public_key,
        seq: row.seq,
        route_class: row.route_class,
        ...sealed,
      };
      envelope.session_sig = await signObject(row.signPrivate, {
        v: envelope.v,
        kind: envelope.kind,
        plane: envelope.plane,
        session_id: envelope.session_id,
        to_session: envelope.to_session,
        seq: envelope.seq,
        nonce: envelope.nonce,
        eph_public_key: envelope.eph_public_key,
        ciphertext: envelope.ciphertext,
        route_class: envelope.route_class,
      });
      if (envelope.plaintext || envelope.body || envelope.payload) {
        return fail("MESH-NO-BYTES", "A share carries ciphertext only.");
      }
      const body = await postJson(`${root}/v1/fed-mesh/peer`, envelope);
      if (!body || body.ok !== true) {
        return fail(body && body.code ? body.code : "MESH-NO-ROUTE", (body && body.message) || "The node did not open the share.", {
          node: body,
        });
      }
      return pass({
        op: "peer_recv",
        plaintext: body.plaintext,
        peer_tunnel: body.peer_tunnel || "LIVE-when-session",
        live: true,
        route_class: row.route_class,
        session_identity_is_node_key: false,
      });
    },
  };
}

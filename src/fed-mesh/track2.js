/**
 * Track 2 local discovery and peer session (Plane P).
 *
 * Phase B: presence + tip-hash beacon, local roster, operator arm.
 * Phase C: session keys distinct from the node key, EnvelopeV2-lineage
 * seal (FED-MESH X25519 + HKDF-SHA-256 + AES-GCM) on direct or relay.
 * Phase D: disk outbox and bounded A→B→C store-forward. In-process peers
 * are a fixture (second_device false). Not an alternative internet.
 * Phase E: signed bootstrap list and shelf cite slots. Scaffold only.
 *
 * The public Worker cites this plane and does not run it.
 * GET never arms a carrier. RF and photon are not mocked LIVE.
 * qnm-node/mobile is a client of this beacon and peer session.
 * mobile_client stays present-not-demonstrated.
 *
 * Author: Aziel Eliab only.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { track2CarrierProbe } from "../../qnm-node/bearers/radio.js";
import { D2D_MOBILE_CLIENT, D2D_STORE_FORWARD } from "../d2d-carriers.js";
import { locksetHash } from "../lockset.js";
import { judgeEquivocation, neighborPhoenix, partitionRejoin, tickAccepts } from "../split-wires.js";
import { negotiateBearer, negotiateRouteClass } from "../transport/routing.js";
import { classifyPeerUrl, natPunchRequest } from "./bearers.js";
import { hashStatement } from "./codec.js";
import { openCiphertext, sealPlaintext } from "./e2e.js";
import { canonicalHandle, generateEd25519, generateX25519, publicKeyMatchesHandle, signObject, verifyObject } from "./identity.js";
import { FED_SPEC, ZERO_HASH } from "./spec.js";

export const TRACK2_SPEC = "D2D-CARRIERS-1.0";
export const TRACK2_AUTHOR = "Aziel Eliab";
export const TRACK2_PLANE = "track2-reachability";
export const TRACK2_ORDER = Object.freeze(["lan", "wifi", "bluetooth", "rf", "photon"]);
/** Nodes on one admitted path. A→B→C is the exit. The hop counter stays below 3. */
export const HOP_MAX = 3;
export const STORE_FORWARD_LABEL = D2D_STORE_FORWARD;

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

const RADIO_CARRIERS = new Set(["wifi", "bluetooth", "rf", "photon"]);
const NO_MOCK_LIVE = new Set(["rf", "photon"]);

function fail(code, message, extra = {}) {
  return {
    ok: false,
    code,
    spec: TRACK2_SPEC,
    author: TRACK2_AUTHOR,
    identity: TRACK2_AUTHOR,
    plane: TRACK2_PLANE,
    alt_internet_live: false,
    packet_path_live: false,
    worker_hardware: false,
    get_never_enables: true,
    mock: false,
    azvpn: false,
    mirage_is_azvpn: false,
    cap7_public_egress: false,
    mesh_fenced_to_loopback: false,
    message,
    ...extra,
  };
}

function ok(extra = {}) {
  return {
    ok: true,
    code: "MESH-OK",
    spec: TRACK2_SPEC,
    author: TRACK2_AUTHOR,
    identity: TRACK2_AUTHOR,
    plane: TRACK2_PLANE,
    alt_internet_live: false,
    packet_path_live: false,
    worker_hardware: false,
    get_never_enables: true,
    mock: false,
    azvpn: false,
    mirage_is_azvpn: false,
    cap7_public_egress: false,
    mesh_fenced_to_loopback: false,
    ...extra,
  };
}

function poisonText(value) {
  return /\b(inject-payload|jailbreak-ignore|ignore previous instructions|dan mode|poison)\b/i.test(String(value || ""));
}

function carrierProbe(state, id) {
  if (id === "lan" && state.fixture) {
    return { present: true, kind: "fixture", fixture: true, code: null };
  }
  const row = track2CarrierProbe().carriers[id];
  if (!row) return { present: false, kind: null, code: "QNM-RADIO-ABSENT" };
  if (row.state === "HW-PRESENT") {
    return { present: true, kind: row.hardware, fixture: false, code: null };
  }
  return { present: false, kind: null, fixture: false, code: "QNM-RADIO-ABSENT" };
}

function publicPeer(row) {
  return {
    handle: row.handle,
    public_key: row.public_key,
    enc_public_key: row.enc_public_key,
    carrier: row.carrier,
    tip_hash: row.tip_hash,
    prev: row.prev,
    direct_url: row.direct_url || null,
    presence: row.presence,
    verified: row.verified === true,
    mutual: row.mutual === true,
    fixture: row.fixture === true,
    second_device: false,
    isolated: row.presence === "isolated",
  };
}

function discoveryFor(state, id) {
  const armed = state.armed.has(id);
  const hw = carrierProbe(state, id);
  if (!hw.present) {
    return {
      id,
      status: "absent",
      code: "QNM-RADIO-ABSENT",
      armed: false,
      live: false,
      peer_exchange_demonstrated: false,
      fixture: false,
      mock: false,
    };
  }
  if (!armed) {
    return {
      id,
      status: "MESH-OFF",
      code: "MESH-OFF",
      armed: false,
      live: false,
      peer_exchange_demonstrated: false,
      fixture: state.fixture === true && id === "lan",
      hardware: hw.kind,
      mock: false,
    };
  }
  const mutual = [...state.roster.values()].filter(
    (row) => row.carrier === id && row.verified === true && row.mutual === true && row.presence !== "isolated",
  );
  if (NO_MOCK_LIVE.has(id) || (RADIO_CARRIERS.has(id) && id !== "lan")) {
    return {
      id,
      status: hw.present ? "HW-PRESENT" : "absent",
      code: NO_MOCK_LIVE.has(id) && !hw.present ? "QNM-RADIO-ABSENT" : "FG-STUB",
      armed: true,
      live: false,
      peer_exchange_demonstrated: false,
      hardware: hw.kind,
      fixture: false,
      mock: false,
      note: "Hardware presence is not a demonstrated peer exchange. No mock LIVE.",
    };
  }
  if (mutual.length > 0) {
    return {
      id,
      status: "LIVE",
      code: "MESH-OK",
      armed: true,
      live: true,
      peer_exchange_demonstrated: true,
      peers: mutual.length,
      fixture: state.fixture === true,
      second_device: false,
      physical_devices: 1,
      hardware: hw.kind,
      mock: false,
      note: state.fixture
        ? "Two local peers verified each other's beacon. Fixture mode: no second physical device. Not alt-internet LIVE."
        : "Two local peers verified each other's LAN beacon. Not a second physical device unless the operator demonstrated one. Not alt-internet LIVE.",
    };
  }
  return {
    id,
    status: "fixture",
    code: "MESH-OK",
    armed: true,
    live: false,
    peer_exchange_demonstrated: false,
    fixture: true,
    hardware: hw.kind,
    mock: false,
    note: "Carrier is armed and no second peer has been verified. Fixture, not LIVE.",
  };
}

async function signBeacon(state, carrier) {
  const statement = {
    v: TRACK2_SPEC,
    kind: "beacon",
    plane: TRACK2_PLANE,
    presence: "live",
    tip_hash: state.tip_hash,
    prev: state.prev,
    handle: state.identity.handle,
    public_key: state.identity.public_key,
    enc_public_key: state.identity.enc_public_key,
    carrier,
    direct_url: state.direct_url || undefined,
  };
  if (!statement.direct_url) delete statement.direct_url;
  const sig = await signObject(state.identity.privateKey, statement);
  return { ...statement, sig };
}

function bearerRefuse(value) {
  const id = String(value || "").trim().toLowerCase();
  if (!id) return null;
  if (id === "cap7-egress" || id === "cap-7-egress" || id === "public-egress" || id === "egress") {
    return fail("MG-NO-IP-EXIT", "Cap-7 is not a discovery bearer and not a public egress IP.", {
      cap7_public_egress: false,
      bearer: id,
    });
  }
  if (id === "cap7" || id === "cap-7" || id === ".aziel" || id === "aziel" || id === "icann" || id === "stun" || id === "turn" || id === "radio") {
    const negotiated = negotiateBearer(id === "cap7" || id === "cap-7" || id === ".aziel" || id === "aziel" ? "icann" : id);
    return fail(negotiated.code || "AZP-BEARER-REFUSE", negotiated.message || "That bearer is refused.", {
      bearer: id,
      cap7_public_egress: false,
    });
  }
  return null;
}

function routeRefuse(input = {}) {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const bearer = String(src.bearer || src.transport || src.discovery_bearer || "").trim().toLowerCase();
  if (bearer === "dht" || bearer === "bgp" || src.dht === true || src.bgp === true) {
    return fail("MESH-NO-ROUTE", "No DHT and no BGP. Forward targets are an admitted list.", { dht: false, bgp: false });
  }
  const refused = bearerRefuse(bearer);
  if (refused) return refused;
  const punch = natPunchRequest("forward", src);
  if (punch) return fail(punch.code || "FED-MESH-NAT-REFUSE", punch.message || "NAT punch is refused.", { hole_punch: false });
  return null;
}

function sealedItem(row) {
  return {
    id: row.id,
    object_hash: row.object_hash,
    from: row.from,
    to: row.to,
    via: row.via || null,
    seq: Number.isInteger(row.seq) ? row.seq : 0,
    hops: Number.isInteger(row.hops) ? row.hops : 0,
    hop_max: HOP_MAX,
    nonce: row.nonce || null,
    eph_public_key: row.eph_public_key || null,
    ciphertext: row.ciphertext,
    tip_hash: row.tip_hash,
    plane: TRACK2_PLANE,
    offered_to: row.offered_to || null,
    last_receipt: row.last_receipt || null,
    fixture: row.fixture === true,
    second_device: false,
    in_process: true,
  };
}

function ticketFor(item) {
  return {
    v: TRACK2_SPEC,
    kind: "pull-ticket",
    plane: TRACK2_PLANE,
    presence: "live",
    tip_hash: item.tip_hash,
    object_hash: item.object_hash,
    id: item.id,
    from: item.from,
    to: item.to,
    hops: item.hops,
  };
}

async function hashSealed(fields) {
  return hashStatement({
    v: TRACK2_SPEC,
    kind: "sealed-share",
    plane: TRACK2_PLANE,
    from: fields.from,
    to: fields.to,
    seq: fields.seq,
    nonce: fields.nonce || "",
    eph_public_key: fields.eph_public_key || "",
    ciphertext: fields.ciphertext,
  });
}

async function mintReceipt(state, action, item, prev) {
  const unsigned = {
    v: TRACK2_SPEC,
    kind: "store-forward-receipt",
    plane: TRACK2_PLANE,
    action,
    object_hash: item.object_hash,
    from: item.from,
    to: item.to,
    hop: state.identity.handle,
    hop_public_key: state.identity.public_key,
    hops: item.hops,
    prev_receipt: prev && /^[a-f0-9]{64}$/.test(prev) ? prev : ZERO_HASH,
    tip_hash: state.tip_hash,
  };
  const receipt_hash = await hashStatement(unsigned);
  const signed = { ...unsigned, receipt_hash };
  const sig = await signObject(state.identity.privateKey, signed);
  const receipt = { ...signed, sig };
  state.receipts.push(receipt);
  state.receipt_tip = receipt_hash;
  return receipt;
}

export async function verifyForwardReceipt(receipt) {
  if (!receipt || receipt.kind !== "store-forward-receipt" || receipt.plane !== TRACK2_PLANE) {
    return { ok: false, code: "FED-MESH-BAD-INPUT", message: "Receipt kind is store-forward-receipt." };
  }
  if (receipt.plaintext || receipt.body || receipt.payload) {
    return { ok: false, code: "MESH-NO-BYTES", message: "A receipt does not carry a body." };
  }
  const { sig, ...signed } = receipt;
  const { receipt_hash, ...unsigned } = signed;
  const again = await hashStatement(unsigned);
  if (again !== receipt_hash) {
    return { ok: false, code: "FED-MESH-TAMPER", message: "Receipt hash does not recompute.", recomputed: again };
  }
  const verified = await verifyObject(receipt.hop_public_key, signed, sig);
  if (!verified) return { ok: false, code: "AZP-BAD-SIG", message: "Receipt signature failed." };
  return {
    ok: true,
    code: "MESH-OK",
    receipt_hash,
    hop: receipt.hop,
    hops: receipt.hops,
    object_hash: receipt.object_hash,
    prev_receipt: receipt.prev_receipt,
    alt_internet_live: false,
    packet_path_live: false,
  };
}

function threeNodeDemonstrated(state) {
  const by = new Map();
  for (const receipt of state.receipts) {
    if (!receipt || !receipt.object_hash || !receipt.hop) continue;
    const row = by.get(receipt.object_hash) || new Set();
    row.add(receipt.hop);
    by.set(receipt.object_hash, row);
  }
  for (const hops of by.values()) if (hops.size >= 3) return true;
  return false;
}

function admittedSet(state, extra = []) {
  const set = new Set();
  for (const row of state.roster.values()) {
    if (row.verified && row.presence !== "isolated" && !state.isolated.has(row.handle)) set.add(row.handle);
  }
  for (const handle of state.allow) set.add(handle);
  for (const handle of extra) {
    const text = String(handle || "").trim();
    if (text) set.add(text);
  }
  return set;
}

function mutualWith(state, handle) {
  const row = state.roster.get(handle);
  return Boolean(row && row.verified === true && row.mutual === true && row.presence !== "isolated" && !state.isolated.has(handle));
}

export function shelfCiteSlots() {
  return {
    ok: true,
    code: "MESH-OK",
    op: "shelf_cite",
    spec: "COLD-MULTI-SHELF-1.0",
    author: TRACK2_AUTHOR,
    identity: TRACK2_AUTHOR,
    plane: TRACK2_PLANE,
    scaffold: true,
    live: false,
    live_multi_provider: false,
    cold_shelf_live: false,
    dns_cut: false,
    origin_cutover: false,
    alt_internet_live: false,
    packet_path_live: false,
    aznet_hosts_payloads: false,
    aznet: "hash-continuity",
    slots: [
      {
        plane: "A",
        id: "plane-a",
        status: "cite",
        live: false,
        cold_shelf_live: false,
        note: "Published surfaces stay one tunnel. This slot does not set live_multi_provider.",
      },
      {
        plane: "B",
        id: "plane-b",
        status: "SLOT",
        live: false,
        cold_shelf_live: false,
        note: "Codeberg and archive.org stay SLOT. Framagit URL stays null. Not LIVE.",
      },
      {
        plane: "C",
        id: "plane-c",
        status: "SLOT",
        live: false,
        cold_shelf_live: false,
        note: "USB airgap stays SLOT.",
      },
    ],
  };
}

export async function signBootstrapPeerList(identity, peers = []) {
  if (!identity || !identity.handle || !identity.privateKey || !identity.public_key) {
    return fail("FED-MESH-BAD-INPUT", "A bootstrap list needs the local node key.");
  }
  if (!Array.isArray(peers)) return fail("FED-MESH-BAD-INPUT", "peers must be a list. An empty list is honest.");
  if (peers.length > 16) return fail("FED-MESH-TOO-LARGE", "A bootstrap list holds at most 16 peers.");
  const cleaned = [];
  for (const peer of peers) {
    if (!peer || typeof peer !== "object") return fail("FED-MESH-BAD-INPUT", "Each peer needs handle and public_key.");
    if (poisonText(JSON.stringify(peer))) return fail("FED-MESH-POISON", "Poison is refused, not stored.");
    const handle = canonicalHandle(peer.handle);
    if (!handle) return fail("FED-MESH-BAD-HANDLE", "Bootstrap handle is not a #handle.");
    const match = await publicKeyMatchesHandle(peer.public_key, handle);
    if (!match) return fail("FED-MESH-HANDLE-MISMATCH", "A bootstrap handle does not match its key.");
    cleaned.push({ handle, public_key: peer.public_key });
  }
  const statement = {
    v: TRACK2_SPEC,
    kind: "bootstrap-peer-list",
    plane: TRACK2_PLANE,
    handle: identity.handle,
    public_key: identity.public_key,
    peers: cleaned,
    needs_starting_address: true,
    only_source: false,
    live_multi_provider: false,
    cold_shelf_live: false,
    live: false,
  };
  const sig = await signObject(identity.privateKey, statement);
  return ok({
    op: "bootstrap_list",
    list: { ...statement, sig },
    peers: cleaned,
    needs_starting_address: true,
    only_source: false,
    live_multi_provider: false,
    cold_shelf_live: false,
    scaffold: true,
    live: false,
    alt_internet_live: false,
    packet_path_live: false,
    note: cleaned.length === 0
      ? "Empty bootstrap list. The node still needs a starting address it already has."
      : "This signed list is one source. The node still needs a starting address it already has.",
  });
}

export async function verifyBootstrapPeerList(list) {
  if (!list || list.kind !== "bootstrap-peer-list" || list.plane !== TRACK2_PLANE) {
    return fail("FED-MESH-BAD-INPUT", "Bootstrap list kind is bootstrap-peer-list.");
  }
  if (list.needs_starting_address !== true || list.live_multi_provider !== false || list.live !== false) {
    return fail("MESH-NO-LIE", "A bootstrap list does not clear needs_starting_address and does not paint live_multi_provider.");
  }
  const { sig, ...statement } = list;
  const verified = await verifyObject(list.public_key, statement, sig);
  if (!verified) return fail("AZP-BAD-SIG", "Bootstrap list signature failed.");
  return ok({
    op: "bootstrap_list",
    peers: Array.isArray(list.peers) ? list.peers.length : 0,
    needs_starting_address: true,
    live_multi_provider: false,
    scaffold: true,
    live: false,
    alt_internet_live: false,
  });
}

export function createTrack2(opts = {}) {
  const identity = opts.identity;
  if (!identity || !identity.handle || !identity.privateKey || !identity.public_key) {
    throw new Error("Track 2 node needs a local FED-MESH identity.");
  }
  const tip = String(opts.tipHash || opts.tip_hash || ZERO_HASH).trim().toLowerCase();
  const state = {
    identity,
    tip_hash: /^[a-f0-9]{64}$/.test(tip) ? tip : ZERO_HASH,
    prev: ZERO_HASH,
    direct_url: opts.directUrl || opts.direct_url || "",
    dataDir: opts.dataDir || "",
    fixture: opts.fixture === true,
    armed: new Set(),
    roster: new Map(),
    sessions: new Map(),
    isolated: new Map(),
    outbox: [],
    receipts: [],
    receipt_tip: ZERO_HASH,
    allow: new Set(),
    partition: { partitioned: false, own_tip: null, rejoined: false, merged: false },
    phoenix: {
      phase: "idle",
      local: true,
      neighbor_phoenix: false,
      public_hostname_resurrection: false,
      phoenix_lock: "wait-reseal",
    },
    seq: 0,
  };

  function summary() {
    const lan = discoveryFor(state, "lan");
    return {
      spec: TRACK2_SPEC,
      plane: TRACK2_PLANE,
      author: TRACK2_AUTHOR,
      handle: identity.handle,
      armed: [...state.armed],
      lan_discovery: lan.live ? "LIVE" : lan.status,
      lan_code: lan.code,
      peer_tunnel: [...state.sessions.values()].some((row) => row.open) ? "LIVE-when-session" : "down",
      peer_count: [...state.roster.values()].filter((row) => row.verified && row.presence !== "isolated").length,
      isolated_count: state.isolated.size,
      store_forward: threeNodeDemonstrated(state) ? STORE_FORWARD_LABEL : "local-outbox",
      store_forward_demonstrated: threeNodeDemonstrated(state),
      partitioned: state.partition.partitioned === true,
      fixture: state.fixture === true,
      second_device: false,
      mobile_client: D2D_MOBILE_CLIENT,
      mobile_demonstrated: false,
      app_store_release: false,
      in_process: true,
      needs_starting_address: true,
      live_multi_provider: false,
      cold_shelf_live: false,
      alt_internet_live: false,
      packet_path_live: false,
      public_live_nodes: false,
      software_workers: false,
      worker_hardware: false,
      get_never_enables: true,
      mock: false,
      cap7_public_egress: false,
      mirage_is_azvpn: false,
      azvpn: false,
      mesh_fenced_to_loopback: false,
    };
  }

  async function loadOutbox() {
    if (!state.dataDir) return;
    try {
      const text = await readFile(join(state.dataDir, "track2-outbox.json"), "utf8");
      const rows = JSON.parse(text);
      if (Array.isArray(rows)) {
        const kept = [];
        for (const row of rows) {
          if (!row || !row.ciphertext || row.plaintext || row.body || row.payload) continue;
          const item = sealedItem(row);
          if (!item.object_hash) item.object_hash = await hashSealed(item);
          kept.push(item);
        }
        state.outbox = kept;
      }
    } catch {
      state.outbox = [];
    }
    try {
      const text = await readFile(join(state.dataDir, "track2-receipts.json"), "utf8");
      const rows = JSON.parse(text);
      if (Array.isArray(rows)) {
        state.receipts = rows.filter((row) => row && row.receipt_hash && row.kind === "store-forward-receipt" && !row.plaintext && !row.body);
      }
      if (state.receipts.length) state.receipt_tip = state.receipts[state.receipts.length - 1].receipt_hash;
    } catch {
      state.receipts = [];
    }
  }

  async function saveOutbox() {
    if (!state.dataDir) return;
    await mkdir(state.dataDir, { recursive: true });
    const items = state.outbox.map((row) => sealedItem(row));
    state.outbox = items;
    await writeFile(join(state.dataDir, "track2-outbox.json"), `${JSON.stringify(items)}\n`);
    const receipts = state.receipts.map(({ plaintext, body, payload, ...row }) => row);
    await writeFile(join(state.dataDir, "track2-receipts.json"), `${JSON.stringify(receipts)}\n`);
  }

  return {
    state,
    summary,
    loadOutbox,
    status() {
      const carriers = {};
      for (const id of TRACK2_ORDER) carriers[id] = discoveryFor(state, id);
      const peers = [...state.roster.values()].map(publicPeer);
      const body = {
        op: "peer_list",
        ...summary(),
        carriers,
        peers,
        roster_scope: "local-node",
        not_public_live_nodes: true,
        not_software_workers: true,
      };
      if (state.armed.size === 0) {
        return fail("MESH-OFF", "No Track 2 carrier is armed. GET never enables radios.", body);
      }
      return ok(body);
    },
    async arm(names, source = "operator") {
      if (source === "get" || source === "GET") {
        return fail("MESH-OFF", "GET never enables suite radios.", { get_never_enables: true, armed: [...state.armed] });
      }
      const list = Array.isArray(names) ? names : String(names || "").split(",");
      const wanted = list.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
      if (wanted.length === 0) {
        return fail("MESH-BAD-INPUT", "Name the carriers to arm. Order is LAN, Wi-Fi, Bluetooth, RF, photon.", {
          order: TRACK2_ORDER.slice(),
        });
      }
      const results = [];
      for (const id of TRACK2_ORDER) {
        if (!wanted.includes(id) && !wanted.includes("order")) continue;
        const hw = carrierProbe(state, id);
        if (!hw.present) {
          state.armed.delete(id);
          results.push({
            id,
            armed: false,
            code: "QNM-RADIO-ABSENT",
            live: false,
            mock: false,
            peer_exchange_demonstrated: false,
            note: `${id} hardware absent. Refuse QNM-RADIO-ABSENT. No mock LIVE.`,
          });
          continue;
        }
        state.armed.add(id);
        const exchange = NO_MOCK_LIVE.has(id) || RADIO_CARRIERS.has(id);
        results.push({
          id,
          armed: true,
          code: exchange ? "FG-STUB" : "MESH-OK",
          live: false,
          hardware: hw.kind,
          fixture: hw.fixture === true,
          mock: false,
          peer_exchange_demonstrated: false,
          packet_live: false,
          note: exchange
            ? "Armed only records hardware presence. A beacon on another carrier is not this exchange. No mock LIVE."
            : "Armed. Discovery stays fixture until two peers verify each other's beacon.",
        });
      }
      const unknown = wanted.filter((id) => id !== "order" && !TRACK2_ORDER.includes(id));
      for (const id of unknown) {
        const refused = bearerRefuse(id) || natPunchRequest(id, {});
        results.push(refused || fail("MESH-BAD-INPUT", `${id} is not a Track 2 carrier.`, { id }));
      }
      return ok({
        op: "arm",
        source: "operator",
        get_never_enables: true,
        results,
        armed: [...state.armed],
        order: TRACK2_ORDER.slice(),
      });
    },
    async beacon(carrier = "lan") {
      const id = String(carrier || "lan").trim().toLowerCase();
      if (!TRACK2_ORDER.includes(id)) return fail("MESH-BAD-INPUT", "Unknown carrier.");
      if (NO_MOCK_LIVE.has(id) || RADIO_CARRIERS.has(id)) {
        const hw = carrierProbe(state, id);
        if (!hw.present) return fail("QNM-RADIO-ABSENT", `${id} hardware is absent. No mock LIVE.`, { carrier: id, live: false });
        if (!state.armed.has(id)) return fail("MESH-OFF", "That carrier is not armed. GET never enables it.", { carrier: id });
        return fail("FG-STUB", `${id} has no demonstrated peer exchange. Presence of hardware is not a LIVE hop.`, {
          carrier: id,
          status: "HW-PRESENT",
          peer_exchange_demonstrated: false,
          live: false,
        });
      }
      if (!state.armed.has(id)) return fail("MESH-OFF", "That carrier is not armed. GET never enables it.", { carrier: id });
      const beacon = await signBeacon(state, id);
      const tick = tickAccepts(beacon);
      if (!tick.ok) return fail(tick.code || "MESH-NO-BYTES", "Beacon refused.", { carrier: id });
      return ok({ op: "peer_advertise", carrier: id, beacon, tick: "presence-tip-hash" });
    },
    async ingest(beacon) {
      if (!beacon || typeof beacon !== "object" || Array.isArray(beacon)) {
        return fail("FED-MESH-BAD-INPUT", "Beacon must be an object.");
      }
      const punch = natPunchRequest("discover", beacon);
      if (punch) return fail(punch.code || "FED-MESH-NAT-REFUSE", punch.message || "NAT punch is refused.", { hole_punch: false });
      const bearer = bearerRefuse(beacon.bearer || beacon.discovery_bearer || beacon.transport);
      if (bearer) return bearer;
      if (beacon.direct_url && natPunchRequest("discover", { direct: beacon.direct_url })) {
        return fail("FED-MESH-NAT-REFUSE", "That direct URL asks for NAT hole-punch.", { hole_punch: false });
      }
      const banned = tickAccepts(beacon);
      if (!banned.ok) {
        return fail(banned.code || "MESH-NO-BYTES", "A discovery tick is presence and tip hash only.", {
          refused_keys: banned.refused_keys || [],
        });
      }
      const extra = Object.keys(beacon).filter((key) => !BEACON_KEYS.has(key));
      if (extra.length) return fail("FED-MESH-BAD-INPUT", "Beacon carries a field outside presence and tip hash.", { fields: extra });
      if (beacon.v !== TRACK2_SPEC || beacon.kind !== "beacon" || beacon.plane !== TRACK2_PLANE) {
        return fail("FED-MESH-BAD-INPUT", "Beacon plane is track2-reachability.");
      }
      const carrier = String(beacon.carrier || "").trim().toLowerCase();
      if (!TRACK2_ORDER.includes(carrier)) return fail("MESH-BAD-INPUT", "Beacon carrier is not in the prefer order.");
      if (carrier !== "lan") {
        return fail("FG-STUB", "Only the LAN beacon path accepts a peer in this slice. RF and photon are not mocked LIVE.", {
          carrier,
          peer_exchange_demonstrated: false,
        });
      }
      if (!state.armed.has("lan")) {
        return fail("MESH-OFF", "LAN discovery is not armed. GET never enables it.", { carrier: "lan" });
      }
      if (beacon.presence !== "live") return fail("MESH-BAD-INPUT", "Beacon presence must be live.");
      const tip = String(beacon.tip_hash || "").trim().toLowerCase();
      const prev = String(beacon.prev || ZERO_HASH).trim().toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(tip) || !/^[a-f0-9]{64}$/.test(prev)) {
        return fail("MESH-BAD-INPUT", "tip_hash and prev are 32-byte hex.");
      }
      const { sig, ...statement } = beacon;
      const verified = await verifyObject(beacon.public_key, statement, sig);
      if (!verified) return fail("AZP-BAD-SIG", "Beacon signature failed.");
      if (beacon.handle === identity.handle) return fail("FED-MESH-BAD-HANDLE", "A node does not discover itself.");
      if (state.isolated.has(beacon.handle)) {
        return fail("FED-MESH-POISON", "That peer is already isolated. The rest of the roster stays.", {
          handle: beacon.handle,
          mesh_fenced_to_loopback: false,
        });
      }
      const prior = state.roster.get(beacon.handle);
      const tips = prior && prior.prev === prev ? prior.tips.slice() : [];
      if (!tips.includes(tip)) tips.push(tip);
      const judged = judgeEquivocation({ prev, tips, node_id: beacon.handle, presence: "live" });
      if (judged.equivocated) {
        state.isolated.set(beacon.handle, { reason: "equivocation", prev });
        state.roster.set(beacon.handle, {
          ...(prior || {}),
          handle: beacon.handle,
          public_key: beacon.public_key,
          enc_public_key: beacon.enc_public_key,
          carrier: "lan",
          tip_hash: tip,
          prev,
          tips,
          hits: (prior && prior.hits) || 1,
          direct_url: beacon.direct_url || null,
          presence: "isolated",
          verified: true,
          mutual: false,
          fixture: state.fixture === true,
        });
        return fail("FED-MESH-FORK", "Equivocation isolates that peer only. Neighbors do not phoenix.", {
          handle: beacon.handle,
          equivocated: true,
          neighbor_phoenix: false,
          mesh_fenced_to_loopback: false,
          phoenix_local_only: true,
        });
      }
      const hits = (prior && prior.hits ? prior.hits : 0) + 1;
      const mutual = hits >= 2;
      const row = {
        handle: beacon.handle,
        public_key: beacon.public_key,
        enc_public_key: beacon.enc_public_key,
        carrier: "lan",
        tip_hash: tip,
        prev,
        tips,
        hits,
        direct_url: beacon.direct_url || null,
        presence: "live",
        verified: true,
        mutual,
        fixture: state.fixture === true,
      };
      state.roster.set(beacon.handle, row);
      const reply = await signBeacon(state, "lan");
      return ok({
        op: "mesh_discover",
        ingested: beacon.handle,
        mutual,
        hits,
        discovery: discoveryFor(state, "lan"),
        beacon: reply,
        peers: [...state.roster.values()].map(publicPeer),
        roster_scope: "local-node",
        not_public_live_nodes: true,
      });
    },
    async exchange(other) {
      let back = null;
      for (let round = 0; round < 2; round += 1) {
        const mine = await this.beacon("lan");
        if (!mine.ok) return mine;
        const ingested = await other.ingest(mine.beacon);
        if (!ingested.ok) return ingested;
        back = await this.ingest(ingested.beacon);
        if (!back.ok) return back;
      }
      return ok({
        op: "mesh_discover",
        local: discoveryFor(state, "lan"),
        remote: other.status().carriers.lan,
        peers: [...state.roster.values()].map(publicPeer),
        remote_peers: other.status().peers,
        back_ok: back.ok === true,
      });
    },
    async discoverUrl(url) {
      let last = null;
      for (let round = 0; round < 2; round += 1) {
        const mine = await this.beacon("lan");
        if (!mine.ok) return mine;
        let res;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify(mine.beacon),
          });
        } catch (err) {
          return fail("FED-MESH-NO-ROUTE", "Discovery peer did not answer. NAT punch is not a fallback.", {
            detail: String(err && err.message ? err.message : err),
            hole_punch: false,
          });
        }
        const body = await res.json().catch(() => ({}));
        if (!body || body.ok !== true || !body.beacon) return body && body.code ? body : fail("FED-MESH-NO-ROUTE", "Peer did not return a beacon.");
        last = await this.ingest(body.beacon);
        if (!last.ok) return last;
      }
      return ok({
        op: "mesh_discover",
        local: discoveryFor(state, "lan"),
        remote_ok: last.ok === true,
        peers: [...state.roster.values()].map(publicPeer),
      });
    },
    async offer(peerHandle, routeOpts = {}) {
      const handle = String(peerHandle || "").trim();
      const peer = state.roster.get(handle);
      if (!peer || peer.verified !== true || peer.mutual !== true || peer.presence === "isolated") {
        return fail("MESH-NO-ROUTE", "No admitted discovered peer for that handle.", { handle });
      }
      if (state.isolated.has(handle)) {
        return fail("FED-MESH-POISON", "That peer is isolated.", { handle, mesh_fenced_to_loopback: false });
      }
      const route = pickRoute(routeOpts.directUrl || routeOpts.direct_url || peer.direct_url, routeOpts.relayUrl || routeOpts.relay);
      if (!route.ok) return route;
      const signing = await generateEd25519();
      const enc = await generateX25519();
      if (signing.public_key === identity.public_key || enc.enc_public_key === identity.enc_public_key || signing.handle === identity.handle) {
        return fail("AZP-BAD-KEY", "Session key matched the node key. Fail closed.");
      }
      const session_id = `d2d_${[...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
      const statement = {
        v: TRACK2_SPEC,
        kind: "peer-session",
        plane: TRACK2_PLANE,
        session_id,
        handle: identity.handle,
        node_public_key: identity.public_key,
        session_handle: signing.handle,
        session_public_key: signing.public_key,
        session_enc_public_key: enc.enc_public_key,
        peer_handle: handle,
        route_class: route.route_class,
        bearer_mode: route.mode,
      };
      const sig = await signObject(identity.privateKey, statement);
      state.sessions.set(session_id, {
        ...statement,
        role: "initiator",
        signPrivate: signing.privateKey,
        encPrivate: enc.privateKey,
        peer_session_public_key: null,
        peer_session_enc_public_key: null,
        peer_session_id: null,
        open: false,
        route,
      });
      return ok({
        op: "peer_session_open",
        offer: { ...statement, sig },
        route_class: route.route_class,
        bearer_mode: route.mode,
        preferred_direct_lan: route.mode === "direct-lan",
        peer_tunnel: "pending",
        live: false,
        session_identity_is_node_key: false,
      });
    },
    async accept(offer) {
      const checked = await verifyOffer(state, offer);
      if (!checked.ok) return checked;
      const signing = await generateEd25519();
      const enc = await generateX25519();
      if (signing.public_key === identity.public_key || enc.enc_public_key === identity.enc_public_key) {
        return fail("AZP-BAD-KEY", "Session key matched the node key. Fail closed.");
      }
      const session_id = `d2d_${[...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
      const statement = {
        v: TRACK2_SPEC,
        kind: "peer-session",
        plane: TRACK2_PLANE,
        session_id,
        handle: identity.handle,
        node_public_key: identity.public_key,
        session_handle: signing.handle,
        session_public_key: signing.public_key,
        session_enc_public_key: enc.enc_public_key,
        peer_handle: offer.handle,
        peer_session_id: offer.session_id,
        route_class: offer.route_class,
        bearer_mode: offer.bearer_mode,
      };
      const sig = await signObject(identity.privateKey, statement);
      state.sessions.set(session_id, {
        ...statement,
        role: "responder",
        signPrivate: signing.privateKey,
        encPrivate: enc.privateKey,
        peer_session_public_key: offer.session_public_key,
        peer_session_enc_public_key: offer.session_enc_public_key,
        peer_session_id: offer.session_id,
        open: true,
        route: { route_class: offer.route_class, mode: offer.bearer_mode },
      });
      return ok({
        op: "peer_session_open",
        offer: { ...statement, sig },
        route_class: offer.route_class,
        peer_tunnel: "LIVE-when-session",
        live: true,
        session_id,
        session_identity_is_node_key: false,
        alt_internet_live: false,
      });
    },
    async complete(counter) {
      const checked = await verifyOffer(state, counter);
      if (!checked.ok) return checked;
      const local = state.sessions.get(counter.peer_session_id);
      if (!local || local.role !== "initiator") return fail("MESH-NO-ROUTE", "No local session matches that counter-offer.");
      if (counter.handle !== local.peer_handle) return fail("FED-MESH-BAD-HANDLE", "Counter-offer is from a different peer.");
      local.peer_session_public_key = counter.session_public_key;
      local.peer_session_enc_public_key = counter.session_enc_public_key;
      local.peer_session_id = counter.session_id;
      local.open = true;
      return ok({
        op: "peer_session_status",
        session_id: local.session_id,
        route_class: local.route_class,
        bearer_mode: local.bearer_mode,
        peer_tunnel: "LIVE-when-session",
        live: true,
        session_handle: local.session_handle,
        node_handle: identity.handle,
        session_identity_is_node_key: local.session_handle === identity.handle,
        alt_internet_live: false,
        azvpn: false,
      });
    },
    sessionStatus(sessionId) {
      const row = state.sessions.get(sessionId);
      if (!row) return fail("MESH-NO-ROUTE", "No such session.", { live: false, peer_tunnel: "down" });
      return ok({
        op: "peer_session_status",
        session_id: row.session_id,
        open: row.open === true,
        live: row.open === true,
        peer_tunnel: row.open ? "LIVE-when-session" : "pending",
        route_class: row.route_class,
        bearer_mode: row.bearer_mode,
        session_handle: row.session_handle,
        node_handle: identity.handle,
        session_identity_is_node_key: false,
        alt_internet_live: false,
        azvpn: false,
      });
    },
    closeSession(sessionId) {
      const row = state.sessions.get(sessionId);
      if (!row) return fail("MESH-NO-ROUTE", "No such session.");
      row.open = false;
      state.sessions.delete(sessionId);
      return ok({ op: "peer_session_close", session_id: sessionId, live: false, peer_tunnel: "down" });
    },
    async send(sessionId, plaintext) {
      const row = state.sessions.get(sessionId);
      if (!row || row.open !== true) return fail("MESH-NO-ROUTE", "Session is not open.", { peer_tunnel: "down" });
      if (poisonText(plaintext)) {
        return fail("FED-MESH-POISON", "Poison refused before send. Not interpreted.", { sent: false });
      }
      if (!row.peer_session_enc_public_key || !row.peer_session_id) {
        return fail("MESH-NO-ROUTE", "Peer session key is missing.");
      }
      state.seq += 1;
      const sealed = await sealPlaintext({
        fromHandle: row.session_id,
        toHandle: row.peer_session_id,
        seq: state.seq,
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
        handle: identity.handle,
        session_public_key: row.session_public_key,
        seq: state.seq,
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
      return ok({
        op: "peer_send",
        envelope,
        route_class: row.route_class,
        peer_tunnel: "LIVE-when-session",
        live: true,
        alt_internet_live: false,
        azvpn: false,
      });
    },
    async recv(envelope) {
      if (!envelope || envelope.kind !== "peer-share" || envelope.plane !== TRACK2_PLANE) {
        return fail("FED-MESH-BAD-INPUT", "Peer share plane is track2-reachability.");
      }
      if (envelope.plaintext || envelope.body || envelope.payload) {
        return fail("MESH-NO-BYTES", "A share carries ciphertext only.");
      }
      const row = [...state.sessions.values()].find((item) => item.session_id === envelope.to_session && item.open === true);
      if (!row) return fail("MESH-NO-ROUTE", "No open session for that share.");
      if (state.isolated.has(envelope.handle)) {
        return fail("FED-MESH-POISON", "That peer is isolated.", { handle: envelope.handle, mesh_fenced_to_loopback: false });
      }
      const signed = await verifyObject(envelope.session_public_key, {
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
      }, envelope.session_sig);
      if (!signed || envelope.session_public_key !== row.peer_session_public_key) {
        return fail("AZP-BAD-SIG", "Session signature failed. The node key is not the session key.");
      }
      const text = await openCiphertext({
        encPrivateKey: row.encPrivate,
        fromHandle: envelope.session_id,
        toHandle: envelope.to_session,
        seq: envelope.seq,
        nonce: envelope.nonce,
        eph_public_key: envelope.eph_public_key,
        ciphertext: envelope.ciphertext,
      });
      if (text == null) return fail("FED-MESH-TAMPER", "Session ciphertext did not open.");
      if (poisonText(text)) {
        state.isolated.set(envelope.handle, { reason: "apg-poison" });
        const peer = state.roster.get(envelope.handle);
        if (peer) {
          peer.presence = "isolated";
          peer.mutual = false;
        }
        return fail("FED-MESH-POISON", "APG poison refused on ingress. That peer is isolated. The mesh is not fenced to loopback.", {
          handle: envelope.handle,
          isolated_only: envelope.handle,
          other_peers_isolated: false,
          neighbor_phoenix: false,
          mesh_fenced_to_loopback: false,
          plaintext: null,
        });
      }
      return ok({
        op: "peer_recv",
        from: envelope.handle,
        session_id: row.session_id,
        route_class: envelope.route_class,
        plaintext: text,
        peer_tunnel: "LIVE-when-session",
        live: true,
        alt_internet_live: false,
        azvpn: false,
      });
    },
    async phoenixLocal() {
      state.phoenix = { phase: "wait", local: true, neighbor_phoenix: false, public_hostname_resurrection: false, phoenix_lock: "wait-reseal" };
      const next = await hashStatement({ prev: state.tip_hash, reseal: identity.handle, n: state.seq + 1 });
      state.prev = state.tip_hash;
      state.tip_hash = next;
      state.seq += 1;
      state.phoenix = {
        phase: "resealed",
        local: true,
        neighbor_phoenix: false,
        public_hostname_resurrection: false,
        phoenix_lock: "wait-reseal",
        tip_hash: next,
      };
      return ok({
        op: "phoenix",
        phoenix_local_only: true,
        neighbor_phoenix: false,
        public_hostname_resurrection: false,
        tip_hash: next,
        mesh_fenced_to_loopback: false,
      });
    },
    phoenixBecauseNeighbor() {
      const judged = neighborPhoenix({ neighbor_phoenixed: true });
      return fail("MESH-STUB", "Neighbors do not phoenix because a neighbor did.", {
        neighbor_phoenix: false,
        phoenix_local_only: true,
        public_hostname_resurrection: false,
        judged: judged.ok === true && judged.emit !== true,
        tip_hash: state.tip_hash,
      });
    },
    async enqueue(item = {}) {
      const refused = routeRefuse(item);
      if (refused) return refused;
      if (item.body || item.plaintext || item.payload || item.diff || item.bytes) {
        return fail("MESH-NO-BYTES", "Outbox accepts a sealed object. A tick does not carry a body.");
      }
      if (!item.ciphertext) return fail("FED-MESH-BAD-INPUT", "Outbox item needs ciphertext.");
      const hops = Number.isInteger(item.hops) ? item.hops : 0;
      if (hops !== 0) return fail("MESH-NO-ROUTE", "A new outbox object starts at hop 0. The bound is three nodes.", { hop_max: HOP_MAX, hops });
      const to = String(item.to || "").trim();
      if (!to) return fail("FED-MESH-BAD-INPUT", "Outbox item needs a final recipient.");
      const via = String(item.via || "").trim();
      if (via && !admittedSet(state).has(via)) {
        return fail("FED-MESH-NO-ROUTE", "The next hop is not an admitted target.", { via, hop_max: HOP_MAX, dht: false, bgp: false });
      }
      const seq = Number.isInteger(item.seq) ? item.seq : state.seq + 1;
      const draft = {
        id: `out_${state.outbox.length + 1}_${[...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, "0")).join("")}`,
        from: identity.handle,
        to,
        via: via || null,
        seq,
        hops: 0,
        nonce: item.nonce || null,
        eph_public_key: item.eph_public_key || null,
        ciphertext: item.ciphertext,
        tip_hash: state.tip_hash,
        fixture: state.fixture === true,
      };
      draft.object_hash = await hashSealed(draft);
      const receipt = await mintReceipt(state, "enqueue", draft, state.receipt_tip === ZERO_HASH ? ZERO_HASH : state.receipt_tip);
      draft.last_receipt = receipt.receipt_hash;
      const row = sealedItem(draft);
      state.outbox.push(row);
      if (via) state.allow.add(via);
      await saveOutbox();
      return ok({
        op: "outbox_enqueue",
        item: row,
        receipt,
        scaffold: false,
        stored: true,
        delivered: false,
        live: false,
        fixture: state.fixture === true,
        second_device: false,
        alt_internet_live: false,
        packet_path_live: false,
        hop_max: HOP_MAX,
        warn5: "STANDS-until-demonstrated",
        warn5_closed: false,
      });
    },
    async forward(to, allow = [], input = {}) {
      const extra = input && typeof input === "object" && !Array.isArray(input) ? input : {};
      const refused = routeRefuse({ ...extra, to });
      if (refused) return refused;
      if (state.partition.partitioned) {
        return fail("FED-MESH-NO-ROUTE", "This island does not forward. Rejoin is a cite plus an operator or lockset gate.", {
          neighbor_heal: false,
          merged: false,
          hop_max: HOP_MAX,
        });
      }
      const handle = String(to || "").trim();
      for (const name of Array.isArray(allow) ? allow : []) {
        const text = String(name || "").trim();
        if (text) state.allow.add(text);
      }
      const admitted = admittedSet(state);
      if (!admitted.has(handle)) {
        return fail("FED-MESH-NO-ROUTE", "No admitted forward target.", { hop_max: HOP_MAX, dht: false, bgp: false });
      }
      const tickets = [];
      let offered = 0;
      for (const item of state.outbox) {
        const next = item.via || item.to;
        if (next !== handle && item.to !== handle) continue;
        if (item.hops + 1 >= HOP_MAX) {
          return fail("MESH-NO-ROUTE", "Next hop would pass the bound.", { hop_max: HOP_MAX, id: item.id, hops: item.hops });
        }
        item.offered_to = handle;
        if (!item.via) item.via = handle === item.to ? null : handle;
        offered += 1;
        const ticket = ticketFor(item);
        const tick = tickAccepts(ticket);
        if (!tick.ok) return fail(tick.code || "MESH-NO-BYTES", "A forward ticket is presence and tip hash only.");
        tickets.push(ticket);
      }
      if (offered === 0) return fail("FED-MESH-NO-ROUTE", "No sealed object is waiting for that target.", { hop_max: HOP_MAX });
      await saveOutbox();
      return ok({
        op: "store_forward",
        to: handle,
        offered,
        moved: offered,
        delivered: false,
        scaffold: false,
        live: false,
        fixture: state.fixture === true,
        second_device: false,
        alt_internet_live: false,
        packet_path_live: false,
        hop_max: HOP_MAX,
        warn5: "STANDS-until-demonstrated",
        warn5_closed: false,
        tickets,
        dht: false,
        bgp: false,
        note: "Offered for receiver-pull. The ticket has no ciphertext. The hop counter advances when the next node pulls.",
      });
    },
    tickets() {
      const tickets = [];
      for (const item of state.outbox) {
        const ticket = ticketFor(item);
        if (!tickAccepts(ticket).ok) continue;
        tickets.push(ticket);
      }
      return ok({
        op: "path_probe",
        tickets,
        ciphertext: false,
        body: false,
        live: false,
        alt_internet_live: false,
        packet_path_live: false,
      });
    },
    async exportPull(id, pullerHandle) {
      if (state.partition.partitioned) {
        return fail("FED-MESH-NO-ROUTE", "A partitioned island does not hand a share across the cut.", { neighbor_heal: false, merged: false });
      }
      const puller = String(pullerHandle || "").trim();
      if (!admittedSet(state).has(puller)) {
        return fail("FED-MESH-NO-ROUTE", "The puller is not an admitted target.", { puller, hop_max: HOP_MAX });
      }
      const item = state.outbox.find((row) => row.id === id || row.object_hash === id);
      if (!item) return fail("FED-MESH-NO-OBJECT", "No sealed object with that id.");
      const next = item.via || item.offered_to || item.to;
      if (puller !== next && puller !== item.to) {
        return fail("FED-MESH-NO-ROUTE", "That peer is not the admitted next hop.", { puller, hop_max: HOP_MAX });
      }
      if (item.hops + 1 >= HOP_MAX) {
        return fail("MESH-NO-ROUTE", "Next hop would pass the bound.", { hop_max: HOP_MAX, hops: item.hops, id: item.id });
      }
      const chain = state.receipts.filter((row) => row.object_hash === item.object_hash);
      const receipt = chain.length ? chain[chain.length - 1] : null;
      const bundle = {
        v: TRACK2_SPEC,
        kind: "sealed-share",
        plane: TRACK2_PLANE,
        item: sealedItem(item),
        receipt,
        receipts: chain,
        holder: identity.handle,
        holder_public_key: identity.public_key,
      };
      if (bundle.item.plaintext || bundle.plaintext || bundle.body) {
        return fail("MESH-NO-BYTES", "A pull bundle is ciphertext only.");
      }
      return ok({
        op: "store_forward",
        bundle,
        delivered: false,
        live: false,
        alt_internet_live: false,
        packet_path_live: false,
        second_device: false,
      });
    },
    async importPull(bundle) {
      if (state.partition.partitioned) {
        return fail("FED-MESH-NO-ROUTE", "A partitioned island keeps its own chain and does not import across the cut.", {
          neighbor_heal: false,
          merged: false,
        });
      }
      if (!bundle || bundle.kind !== "sealed-share" || bundle.plane !== TRACK2_PLANE) {
        return fail("FED-MESH-BAD-INPUT", "Pull bundle kind is sealed-share.");
      }
      if (bundle.plaintext || bundle.body || bundle.payload || (bundle.item && (bundle.item.plaintext || bundle.item.body))) {
        return fail("MESH-NO-BYTES", "A pulled share carries ciphertext only.");
      }
      const refused = routeRefuse(bundle);
      if (refused) return refused;
      const item = bundle.item;
      if (!item || !item.ciphertext || !item.object_hash) return fail("FED-MESH-BAD-INPUT", "Pull bundle needs a sealed object.");
      const holder = String(bundle.holder || "").trim();
      if (!admittedSet(state).has(holder)) {
        return fail("FED-MESH-NO-ROUTE", "The holder is not an admitted peer.", { holder });
      }
      const chain = Array.isArray(bundle.receipts) ? bundle.receipts : bundle.receipt ? [bundle.receipt] : [];
      for (const prior of chain) {
        const checked = await verifyForwardReceipt(prior);
        if (!checked.ok) return checked;
        if (checked.object_hash !== item.object_hash) return fail("FED-MESH-TAMPER", "Receipt object hash does not match the share.");
      }
      if (bundle.receipt) {
        if (bundle.receipt.hop !== holder) return fail("AZP-BAD-SIG", "Receipt hop is not the holder.");
        if (bundle.holder_public_key && bundle.receipt.hop_public_key !== bundle.holder_public_key) {
          return fail("AZP-BAD-SIG", "Receipt key is not the holder key.");
        }
      }
      for (const prior of chain) {
        if (!state.receipts.some((row) => row.receipt_hash === prior.receipt_hash)) state.receipts.push(prior);
      }
      const known = state.roster.get(holder);
      if (known && bundle.holder_public_key && known.public_key !== bundle.holder_public_key) {
        return fail("AZP-BAD-SIG", "Holder key does not match the roster.");
      }
      const again = await hashSealed(item);
      if (again !== item.object_hash) return fail("FED-MESH-TAMPER", "Sealed object hash does not recompute.");
      const prior = state.outbox.find((row) => row.object_hash === item.object_hash);
      if (prior) {
        return ok({
          op: "store_forward",
          item: prior,
          idempotent: true,
          delivered: identity.handle === prior.to,
          live: false,
          alt_internet_live: false,
          packet_path_live: false,
          second_device: false,
          hop_max: HOP_MAX,
        });
      }
      const hops = item.hops + 1;
      if (hops >= HOP_MAX) return fail("MESH-NO-ROUTE", "Next hop would pass the bound.", { hop_max: HOP_MAX, hops: item.hops });
      const nextVia = identity.handle === item.to ? null : admittedSet(state).has(item.to) ? item.to : null;
      const stored = sealedItem({
        ...item,
        id: `out_${state.outbox.length + 1}_${[...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, "0")).join("")}`,
        hops,
        via: nextVia,
        offered_to: nextVia,
        tip_hash: state.tip_hash,
        fixture: state.fixture === true,
      });
      const prev = bundle.receipt ? bundle.receipt.receipt_hash : item.last_receipt;
      const receipt = await mintReceipt(state, "pull", stored, prev);
      stored.last_receipt = receipt.receipt_hash;
      state.outbox.push(stored);
      await saveOutbox();
      return ok({
        op: "store_forward",
        item: stored,
        receipt,
        delivered: false,
        live: false,
        scaffold: false,
        fixture: state.fixture === true,
        second_device: false,
        in_process: true,
        alt_internet_live: false,
        packet_path_live: false,
        hop_max: HOP_MAX,
        hops,
        warn5: "STANDS-until-demonstrated",
        warn5_closed: false,
      });
    },
    async pull(peer, id) {
      if (!peer || typeof peer.exportPull !== "function") return fail("FED-MESH-BAD-INPUT", "Pull needs the holding node.");
      if (peer.state && peer.state.partition && peer.state.partition.partitioned) {
        return fail("FED-MESH-NO-ROUTE", "The holder is partitioned. Islands do not splice.", { neighbor_heal: false, merged: false });
      }
      const exported = await peer.exportPull(id, identity.handle);
      if (!exported.ok) return exported;
      return this.importPull(exported.bundle);
    },
    async openSealed(id) {
      const item = state.outbox.find((row) => row.id === id || row.object_hash === id);
      if (!item) return fail("FED-MESH-NO-OBJECT", "No sealed object with that id.");
      if (item.to !== identity.handle) {
        return fail("FED-MESH-PRIVATE-KEY", "Only the named receiver opens this sealed share. The hop does not.", {
          plaintext: null,
          hosts_payload: false,
          alt_internet_live: false,
        });
      }
      if (!item.nonce || !item.eph_public_key || !identity.encPrivateKey) {
        return fail("FED-MESH-TAMPER", "Sealed share is missing the receiver fields.");
      }
      const text = await openCiphertext({
        encPrivateKey: identity.encPrivateKey,
        fromHandle: item.from,
        toHandle: item.to,
        seq: item.seq,
        nonce: item.nonce,
        eph_public_key: item.eph_public_key,
        ciphertext: item.ciphertext,
      });
      if (text == null) return fail("FED-MESH-TAMPER", "Sealed share did not open.");
      if (poisonText(text)) {
        state.isolated.set(item.from, { reason: "apg-poison" });
        return fail("FED-MESH-POISON", "APG poison refused when the receiver opened the share.", {
          plaintext: null,
          handle: item.from,
          neighbor_phoenix: false,
          mesh_fenced_to_loopback: false,
        });
      }
      const receipt = await mintReceipt(state, "deliver", item, item.last_receipt);
      item.last_receipt = receipt.receipt_hash;
      await saveOutbox();
      return ok({
        op: "store_forward",
        plaintext: text,
        receipt,
        object_hash: item.object_hash,
        hops: item.hops,
        from: item.from,
        live: false,
        alt_internet_live: false,
        packet_path_live: false,
        second_device: false,
        fixture: state.fixture === true,
        aznet_hosts_payloads: false,
      });
    },
    async cut() {
      const items = state.outbox.map((row) => sealedItem(row));
      const manifest = {
        v: TRACK2_SPEC,
        kind: "sneakernet-bundle",
        plane: TRACK2_PLANE,
        handle: identity.handle,
        public_key: identity.public_key,
        tip_hash: state.tip_hash,
        items,
      };
      const manifest_sha256 = await hashStatement({
        v: manifest.v,
        kind: manifest.kind,
        plane: manifest.plane,
        handle: manifest.handle,
        tip_hash: manifest.tip_hash,
        items: items.map((row) => row.object_hash),
      });
      const statement = { ...manifest, manifest_sha256 };
      const sig = await signObject(identity.privateKey, statement);
      const bundle = { ...statement, sig };
      if (state.dataDir) {
        await mkdir(state.dataDir, { recursive: true });
        await writeFile(join(state.dataDir, "track2-sneakernet.json"), `${JSON.stringify(bundle)}\n`);
      }
      return ok({
        op: "outbox_cut",
        bundle,
        manifest_sha256,
        live: false,
        scaffold: false,
        second_device: false,
        alt_internet_live: false,
        packet_path_live: false,
        note: "Operator moves this file. It is ciphertext and receipts. It is not a tick.",
      });
    },
    partition() {
      state.partition = {
        partitioned: true,
        own_tip: state.tip_hash,
        receipt_tip: state.receipt_tip,
        rejoined: false,
        merged: false,
      };
      return ok({
        op: "partition",
        partitioned: true,
        own_tip: state.tip_hash,
        merged: false,
        chains_spliced: false,
        neighbor_heal: false,
        neighbor_phoenix: false,
        alt_internet_live: false,
      });
    },
    async rejoin(input = {}) {
      if (!state.partition.partitioned && input.force !== true) {
        return fail("MESH-BAD-INPUT", "This node is not partitioned.");
      }
      if (input.vote_to_heal === true || input.neighbor_heal === true || input.apply_last_packet === true || input.auto_splice === true) {
        return fail("MESH-NO-NEIGHBOR-HEAL", "Vote-to-heal is refused. Islands keep their own chains.", {
          neighbor_heal: false,
          merged: false,
          chains_spliced: false,
          own_tip: state.tip_hash,
        });
      }
      const cite = String(input.cite || input.cited_tip || "").trim().toLowerCase();
      let lockset_gate = false;
      if (input.lockset && input.lockset_sha256) {
        const hashed = await locksetHash(input.lockset);
        lockset_gate = hashed === String(input.lockset_sha256).trim().toLowerCase();
      }
      const judged = partitionRejoin({
        cite: /^[a-f0-9]{64}$/.test(cite),
        operator: input.operator === true,
        lockset_gate,
        auto_splice: false,
      });
      if (!judged.ok) {
        return fail("MESH-NO-NEIGHBOR-HEAL", "Rejoin is a cited tip plus an operator or lockset gate. No vote-to-heal.", {
          reason: judged.reason,
          neighbor_heal: false,
          merged: false,
          own_tip: state.tip_hash,
        });
      }
      const own = state.tip_hash;
      state.partition = {
        partitioned: false,
        own_tip: own,
        cited_tip: cite,
        rejoined: true,
        merged: false,
        gate: input.operator === true ? "operator" : "lockset",
      };
      return ok({
        op: "rejoin",
        partitioned: false,
        merged: false,
        chains_spliced: false,
        own_tip: own,
        cited_tip: cite,
        neighbor_heal: false,
        neighbor_phoenix: false,
        splice: false,
        alt_internet_live: false,
        warn5_closed: false,
      });
    },
    async bootstrapList(peers = []) {
      return signBootstrapPeerList(identity, peers);
    },
    shelves() {
      return shelfCiteSlots();
    },
    probe(body) {
      const judged = tickAccepts(body || {});
      if (!judged.ok) {
        return fail(judged.code || "MESH-NO-BYTES", "path_probe is presence and tip hash only.", {
          refused_keys: judged.refused_keys || [],
        });
      }
      return ok({
        op: "path_probe",
        tip_hash: judged.tip_hash,
        scaffold: false,
        live: false,
        alt_internet_live: false,
        packet_path_live: false,
        body: false,
      });
    },
  };
}

function pickRoute(directUrl, relayUrl) {
  const direct = String(directUrl || "").trim();
  const relay = String(relayUrl || "").trim();
  if (direct) {
    const punch = natPunchRequest("direct", { direct });
    if (punch) return fail(punch.code || "FED-MESH-NAT-REFUSE", punch.message || "NAT punch is refused.", { hole_punch: false });
    const classified = classifyPeerUrl(direct, { role: "direct" });
    if (!classified.ok) return fail(classified.code || "FED-MESH-NO-ROUTE", classified.message || "Direct URL refused.", { hole_punch: false });
    if (classified.mode === "direct-lan" || classified.mode === "loopback") {
      const route = negotiateRouteClass("direct");
      if (!route.ok) return fail(route.code, route.message);
      return ok({
        route_class: "direct",
        mode: classified.mode,
        url: classified.url,
        preferred_direct_lan: classified.mode === "direct-lan",
        mesh_fenced_to_loopback: false,
        note: classified.mode === "loopback"
          ? "Loopback is an optional L1 bearer. It is not direct-lan and it is not the mesh fence."
          : "direct-lan is the preferred path.",
      });
    }
  }
  if (relay) {
    const punch = natPunchRequest("relay", { relay });
    if (punch) return fail(punch.code || "FED-MESH-NAT-REFUSE", punch.message || "NAT punch is refused.");
    const classified = classifyPeerUrl(relay, { role: "relay" });
    if (!classified.ok) return fail(classified.code || "FED-MESH-NO-ROUTE", classified.message || "Relay URL refused.");
    const route = negotiateRouteClass("relay");
    if (!route.ok) return fail(route.code, route.message);
    return ok({
      route_class: "relay",
      mode: classified.mode,
      url: classified.url,
      preferred_direct_lan: false,
      note: "Admitted relay class. The relay carries ciphertext and does not need plaintext.",
    });
  }
  return fail("FED-MESH-NO-ROUTE", "No direct-lan path and no admitted relay.", { route_class: null });
}

async function verifyOffer(state, offer) {
  if (!offer || offer.kind !== "peer-session" || offer.plane !== TRACK2_PLANE) {
    return fail("FED-MESH-BAD-INPUT", "Session offer plane is track2-reachability.");
  }
  const route = negotiateRouteClass(offer.route_class);
  if (!route.ok) return fail(route.code || "AZP-REFUSE", route.message || "Route class is not admitted.");
  if (offer.route_class !== "direct" && offer.route_class !== "relay") {
    return fail("AZP-REFUSE", "Route class is direct or relay.");
  }
  if (offer.session_public_key === offer.node_public_key || offer.session_handle === offer.handle) {
    return fail("AZP-BAD-KEY", "Session identity matches the long-term node key.");
  }
  const peer = state.roster.get(offer.handle);
  if (!peer || peer.verified !== true || peer.presence === "isolated") {
    return fail("MESH-NO-ROUTE", "Session offer is not from a discovered peer.", { handle: offer.handle });
  }
  if (peer.public_key !== offer.node_public_key) return fail("AZP-BAD-SIG", "Offer node key does not match the roster.");
  const { sig, ...statement } = offer;
  const verified = await verifyObject(offer.node_public_key, statement, sig);
  if (!verified) return fail("AZP-BAD-SIG", "Session binding signature failed.");
  return ok({ offer });
}

export async function openPeerSession(local, remote, routeOpts = {}) {
  const offered = await local.offer(remote.summary().handle, routeOpts);
  if (!offered.ok) return offered;
  const accepted = await remote.accept(offered.offer);
  if (!accepted.ok) return accepted;
  const done = await local.complete(accepted.offer);
  if (!done.ok) return done;
  return ok({
    op: "peer_session_open",
    local: done,
    remote_session_id: accepted.session_id,
    route_class: done.route_class,
    bearer_mode: done.bearer_mode,
    peer_tunnel: "LIVE-when-session",
    live: true,
    alt_internet_live: false,
    azvpn: false,
  });
}

export async function deliverThreeLocal(origin, mid, dest, plaintext) {
  if (!origin || !mid || !dest) return fail("FED-MESH-BAD-INPUT", "Three local nodes are required.");
  if (poisonText(plaintext)) {
    return fail("FED-MESH-POISON", "Poison refused before the share was sealed.", { sent: false, plaintext: null });
  }
  const a = origin.state.identity.handle;
  const b = mid.state.identity.handle;
  const c = dest.state.identity.handle;
  if (a === b || b === c || a === c) return fail("FED-MESH-BAD-HANDLE", "A, B, and C are three handles.");
  if (!mutualWith(origin.state, b) || !mutualWith(mid.state, a) || !mutualWith(mid.state, c) || !mutualWith(dest.state, b)) {
    return fail("FED-MESH-NO-ROUTE", "A→B and B→C must be admitted discovered peers. No DHT.", { dht: false, bgp: false });
  }
  origin.state.seq += 1;
  const sealed = await sealPlaintext({
    fromHandle: a,
    toHandle: c,
    seq: origin.state.seq,
    recipientEncPublicKey: dest.state.identity.enc_public_key,
    plaintext: String(plaintext ?? ""),
  });
  if (!sealed) return fail("AZP-REFUSE", "Seal to the final receiver failed.");
  const queued = await origin.enqueue({ to: c, via: b, seq: origin.state.seq, ...sealed });
  if (!queued.ok) return queued;
  const pulled = await mid.pull(origin, queued.item.id);
  if (!pulled.ok) return pulled;
  const got = await dest.pull(mid, pulled.item.id);
  if (!got.ok) return got;
  const opened = await dest.openSealed(got.item.id);
  if (!opened.ok) return opened;
  const midOpen = await mid.openSealed(pulled.item.id);
  const receipts = [queued.receipt, pulled.receipt, got.receipt, opened.receipt];
  return ok({
    op: "store_forward",
    store_forward: STORE_FORWARD_LABEL,
    fixture: true,
    second_device: false,
    physical_devices: 1,
    in_process: true,
    nodes: 3,
    hops: got.item.hops,
    hop_max: HOP_MAX,
    path: [a, b, c],
    plaintext: opened.plaintext,
    object_hash: queued.item.object_hash,
    receipts,
    mid_opened: midOpen.ok === true,
    mid_code: midOpen.code,
    mid_plaintext: midOpen.plaintext || null,
    dht: false,
    bgp: false,
    live: true,
    local_delivery: true,
    alt_internet_live: false,
    packet_path_live: false,
    public_door: "FG-STUB",
    warn5: "STANDS-until-demonstrated",
    warn5_closed: false,
    peer_exchange_demonstrated: false,
    note: "Three in-process nodes. No second physical device. WARN-5 is not closed.",
  });
}

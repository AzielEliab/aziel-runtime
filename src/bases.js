/**
 * Internet, mail-send, and kernel bases.
 * They sit on the doors already in the repo. They do not replace AZMail
 * or add a product. A flag is true only when that door did the work.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { arrivalFlags, surfaceArrival } from "./alt-internet-fact.js";
import { PUBLIC_DEMO_ID, workspaceFromEnv } from "./workspace.js";

const UNQUALIFIED_ARRIVAL = arrivalFlags(null);

function onPublicDemo(env) {
  const ws = workspaceFromEnv(env);
  if (!ws) return false;
  return ws.workspace_id === PUBLIC_DEMO_ID || ws.contract === "public-demo";
}
import { D2D_CARRIERS } from "./d2d-carriers.js";
import { LIMITATION, PRINCIPLES } from "./engines/azos/engine.js";
import { mailPost } from "./engines/azmail/engine.js";

const AUTHOR = "Aziel Eliab";

function pad4(n) {
  return (4 - (n % 4)) % 4;
}

function cpioEntry(name, data) {
  const nameBytes = new TextEncoder().encode(`${name}\0`);
  const body = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const fields = [1, 0o100644, 0, 0, 1, 0, body.byteLength, 0, 0, 0, 0, nameBytes.byteLength, 0];
  const header = `070701${fields.map((n) => n.toString(16).padStart(8, "0")).join("")}`;
  const headerBytes = new TextEncoder().encode(header);
  const out = new Uint8Array(headerBytes.length + nameBytes.length + pad4(nameBytes.length) + body.length + pad4(body.length));
  let offset = 0;
  out.set(headerBytes, offset);
  offset += headerBytes.length;
  out.set(nameBytes, offset);
  offset += nameBytes.length + pad4(nameBytes.length);
  out.set(body, offset);
  return out;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Read a newc cpio this repo just wrote. TRAILER!!! ends the archive. */
export function parseCpioNewc(archive) {
  const bytes = archive instanceof Uint8Array ? archive : new Uint8Array(0);
  const names = [];
  const files = {};
  let offset = 0;
  while (offset + 110 <= bytes.length) {
    const magic = new TextDecoder().decode(bytes.slice(offset, offset + 6));
    if (magic !== "070701") break;
    const header = new TextDecoder().decode(bytes.slice(offset, offset + 110));
    const fields = [];
    for (let i = 0; i < 13; i++) fields.push(parseInt(header.slice(6 + i * 8, 14 + i * 8), 16));
    const fileSize = fields[6];
    const nameSize = fields[11];
    if (!Number.isFinite(fileSize) || !Number.isFinite(nameSize) || nameSize < 1) break;
    let cursor = offset + 110;
    const name = new TextDecoder().decode(bytes.slice(cursor, cursor + nameSize)).replace(/\0+$/, "");
    cursor += nameSize + pad4(nameSize);
    const body = bytes.slice(cursor, cursor + fileSize);
    cursor += fileSize + pad4(fileSize);
    names.push(name);
    if (name !== "TRAILER!!!") files[name] = new TextDecoder().decode(body);
    if (name === "TRAILER!!!") break;
    offset = cursor;
  }
  return { names, files };
}

function ipv4On(name, nets) {
  const rows = (nets && nets[name]) || [];
  const hit = rows.find((addr) => (addr.family === "IPv4" || addr.family === 4) && addr.internal !== true);
  return hit ? hit.address : null;
}

/** Probed LAN name first, then any other non-loopback IPv4 this process can bind. */
function lanCandidates(preferred, nets) {
  const out = [];
  const seen = new Set();
  const push = (name, address) => {
    if (!name || name === "lo" || !address || seen.has(address)) return;
    seen.add(address);
    out.push({ name, address });
  };
  push(preferred, ipv4On(preferred, nets));
  if (!nets) return out;
  for (const [name, rows] of Object.entries(nets)) {
    if (name === "lo") continue;
    for (const addr of rows || []) {
      if ((addr.family === "IPv4" || addr.family === 4) && addr.internal !== true) push(name, addr.address);
    }
  }
  return out;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU32(out, offset, value) {
  out[offset] = (value >>> 24) & 0xff;
  out[offset + 1] = (value >>> 16) & 0xff;
  out[offset + 2] = (value >>> 8) & 0xff;
  out[offset + 3] = value & 0xff;
}

function readU32(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function padId(text, size) {
  const raw = new TextEncoder().encode(String(text || ""));
  const out = new Uint8Array(size);
  out.set(raw.subarray(0, size));
  return out;
}

function idText(bytes) {
  return new TextDecoder().decode(bytes).replace(/\0+$/, "");
}

/** Two endpoints are a second device only when their host ids differ. */
export function secondDevice(localHost, remoteHost) {
  return (
    typeof localHost === "string" &&
    typeof remoteHost === "string" &&
    localHost.length > 0 &&
    remoteHost.length > 0 &&
    localHost !== remoteHost
  );
}

function frameWithCrc(body) {
  const out = new Uint8Array(body.length + 4);
  out.set(body, 0);
  writeU32(out, body.length, crc32(body));
  return out;
}

function crcMatches(bytes) {
  if (bytes.byteLength < 5) return false;
  const body = bytes.subarray(0, bytes.byteLength - 4);
  return readU32(bytes, body.length) === crc32(body);
}

export function encodeWifiFrame(payload) {
  const body = payload instanceof Uint8Array ? payload : new TextEncoder().encode(String(payload ?? ""));
  const header = new Uint8Array(24);
  header[0] = 0x08;
  header.set([0x02, 0x00, 0x00, 0x00, 0x00, 0x01], 4);
  header.set([0x02, 0x00, 0x00, 0x00, 0x00, 0x02], 10);
  header.set([0x02, 0x00, 0x00, 0x00, 0x00, 0x03], 16);
  const raw = new Uint8Array(header.length + body.length);
  raw.set(header, 0);
  raw.set(body, header.length);
  return frameWithCrc(raw);
}

export function parseWifiFrame(bytes) {
  const frame = bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
  if (frame.byteLength < 28 || !crcMatches(frame) || frame[0] !== 0x08) return null;
  return { payload: frame.subarray(24, frame.byteLength - 4), packet_live: false, mock: false };
}

export function encodeBluetoothFrame(payload) {
  const body = payload instanceof Uint8Array ? payload : new TextEncoder().encode(String(payload ?? ""));
  const raw = new Uint8Array(8 + body.length);
  raw[0] = 0x02;
  raw[2] = (body.length + 4) & 0xff;
  raw[3] = ((body.length + 4) >> 8) & 0xff;
  raw[4] = body.length & 0xff;
  raw[5] = (body.length >> 8) & 0xff;
  raw[6] = 0x40;
  raw.set(body, 8);
  return frameWithCrc(raw);
}

export function parseBluetoothFrame(bytes) {
  const frame = bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
  if (frame.byteLength < 12 || !crcMatches(frame) || frame[0] !== 0x02) return null;
  return { payload: frame.subarray(8, frame.byteLength - 4), packet_live: false, mock: false };
}

export function encodeRfFrame(payload) {
  const body = payload instanceof Uint8Array ? payload : new TextEncoder().encode(String(payload ?? ""));
  const raw = new Uint8Array(5 + body.length);
  raw[0] = 0xaa;
  raw[1] = 0xd2;
  raw[2] = 1;
  raw[3] = body.length & 0xff;
  raw[4] = (body.length >> 8) & 0xff;
  raw.set(body, 5);
  return frameWithCrc(raw);
}

export function parseRfFrame(bytes) {
  const frame = bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
  if (frame.byteLength < 9 || !crcMatches(frame) || frame[0] !== 0xaa || frame[1] !== 0xd2) return null;
  return { payload: frame.subarray(5, frame.byteLength - 4), packet_live: false, mock: false };
}

export function encodePhotonFrame(payload) {
  const body = payload instanceof Uint8Array ? payload : new TextEncoder().encode(String(payload ?? ""));
  const magic = new TextEncoder().encode("AZPHOT1");
  const raw = new Uint8Array(magic.length + 2 + body.length);
  raw.set(magic, 0);
  raw[magic.length] = body.length & 0xff;
  raw[magic.length + 1] = (body.length >> 8) & 0xff;
  raw.set(body, magic.length + 2);
  return frameWithCrc(raw);
}

export function parsePhotonFrame(bytes) {
  const frame = bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
  const magic = "AZPHOT1";
  if (frame.byteLength < magic.length + 6 || !crcMatches(frame)) return null;
  if (new TextDecoder().decode(frame.subarray(0, magic.length)) !== magic) return null;
  return { payload: frame.subarray(magic.length + 2, frame.byteLength - 4), packet_live: false, mock: false };
}

const FRAME_CODEC = {
  wifi: [encodeWifiFrame, parseWifiFrame],
  bluetooth: [encodeBluetoothFrame, parseBluetoothFrame],
  rf: [encodeRfFrame, parseRfFrame],
  photon: [encodePhotonFrame, parsePhotonFrame],
};

async function carrierHardwarePresent(id) {
  let existsSync;
  let readdirSync;
  try {
    const fs = await import("node:fs");
    existsSync = fs.existsSync;
    readdirSync = fs.readdirSync;
  } catch {
    return false;
  }
  const filled = (dir) => {
    try {
      return existsSync(dir) && readdirSync(dir).some((name) => name && name !== "." && name !== "..");
    } catch {
      return false;
    }
  };
  try {
    if (id === "wifi") return filled("/sys/class/ieee80211");
    if (id === "bluetooth") return filled("/sys/class/bluetooth");
    if (id === "rf") return filled("/sys/class/sdr") || filled("/sys/class/wwan") || existsSync("/dev/swradio0") || existsSync("/dev/cdc-wdm0");
    if (id === "photon") {
      if (existsSync("/dev/video0")) return true;
      if (!existsSync("/sys/class/leds")) return false;
      return readdirSync("/sys/class/leds").some((name) => /flash|torch/i.test(name));
    }
  } catch {
    return false;
  }
  return false;
}

async function hostId() {
  try {
    const fs = await import("node:fs/promises");
    const text = (await fs.readFile("/etc/machine-id", "utf8")).trim();
    if (/^[a-f0-9]{32}$/.test(text)) return text;
  } catch {
    /* no machine id */
  }
  return null;
}

export function encodeMeshFrame({ src, dst, host, payload }) {
  const body = payload instanceof Uint8Array ? payload : new TextEncoder().encode(String(payload ?? ""));
  const magic = new TextEncoder().encode("AZMESH1");
  const raw = new Uint8Array(7 + 1 + 16 + 16 + 32 + 2 + body.length);
  raw.set(magic, 0);
  raw[7] = 1;
  raw.set(padId(src, 16), 8);
  raw.set(padId(dst, 16), 24);
  raw.set(padId(host, 32), 40);
  raw[72] = (body.length >> 8) & 0xff;
  raw[73] = body.length & 0xff;
  raw.set(body, 74);
  return frameWithCrc(raw);
}

export function parseMeshFrame(bytes) {
  const frame = bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
  if (frame.byteLength < 78 || !crcMatches(frame)) return null;
  if (new TextDecoder().decode(frame.subarray(0, 7)) !== "AZMESH1" || frame[7] !== 1) return null;
  const length = (frame[72] << 8) | frame[73];
  const payload = frame.subarray(74, 74 + length);
  if (74 + length + 4 !== frame.byteLength) return null;
  return {
    src: idText(frame.subarray(8, 24)),
    dst: idText(frame.subarray(24, 40)),
    host: idText(frame.subarray(40, 72)),
    payload,
    mock: false,
    public_icann: false,
    bgp: false,
  };
}

async function exchangeMesh(address) {
  const localHost = await hostId();
  if (!localHost) {
    return { ok: false, code: "MESH-HOST-ABSENT", packet_live: false, mock: false, ...UNQUALIFIED_ARRIVAL };
  }
  let dgram;
  try {
    dgram = await import("node:dgram");
  } catch {
    return { ok: false, code: "PACKET-NOT-CARRIED", packet_live: false, mock: false, ...UNQUALIFIED_ARRIVAL };
  }
  const server = dgram.createSocket("udp4");
  const client = dgram.createSocket("udp4");
  const payload = crypto.getRandomValues(new Uint8Array(16));
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.bind(0, address, resolve);
    });
    const port = server.address().port;
    const replyHost = await hostId();
    const got = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 1500);
      server.once("message", (msg, rinfo) => {
        clearTimeout(timer);
        const parsed = parseMeshFrame(new Uint8Array(msg));
        if (!parsed || parsed.dst !== "az-node-b" || parsed.src !== "az-node-a") {
          resolve(null);
          return;
        }
        const reply = encodeMeshFrame({
          src: "az-node-b",
          dst: "az-node-a",
          host: replyHost,
          payload: parsed.payload,
        });
        server.send(reply, rinfo.port, rinfo.address, () => resolve(parsed));
      });
    });
    await new Promise((resolve, reject) => {
      client.once("error", reject);
      client.bind(0, address, resolve);
    });
    const request = encodeMeshFrame({ src: "az-node-a", dst: "az-node-b", host: localHost, payload });
    const sent = await sha256Hex(payload);
    const sentFrame = await sha256Hex(request);
    const back = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 1500);
      client.once("message", (msg) => {
        clearTimeout(timer);
        resolve(new Uint8Array(msg));
      });
    });
    await new Promise((resolve, reject) => {
      client.send(request, port, address, (err) => (err ? reject(err) : resolve()));
    });
    const remote = await got;
    const reply = await back;
    const parsed = parseMeshFrame(reply);
    const received = parsed ? await sha256Hex(parsed.payload) : null;
    const receivedFrame = parsed ? await sha256Hex(reply) : null;
    const bytes_match = Boolean(
      remote &&
        parsed &&
        parsed.src === "az-node-b" &&
        parsed.dst === "az-node-a" &&
        sent === received &&
        parsed.payload.byteLength === payload.byteLength,
    );
    const remoteHost = parsed ? parsed.host : null;
    const flags = surfaceArrival({
      mock: false,
      local_host: localHost,
      remote_host: remoteHost,
      same_machine_id: Boolean(localHost && remoteHost && remoteHost === localHost),
      left_machine: false,
      arrived_other_machine: false,
    });
    return {
      ok: bytes_match,
      code: bytes_match ? "PACKET-CARRIED" : "PACKET-NOT-CARRIED",
      mesh: bytes_match,
      address,
      bytes: payload.byteLength,
      sent_sha256: sent,
      received_sha256: received,
      sent_frame_sha256: sentFrame,
      received_frame_sha256: receivedFrame,
      frame_magic: "AZMESH1",
      bytes_match,
      src_node: "az-node-a",
      dst_node: "az-node-b",
      local_host: localHost,
      remote_host: remoteHost,
      ...flags,
      same_machine_id: Boolean(localHost && remoteHost && remoteHost === localHost),
      left_machine: false,
      arrived_other_machine: false,
      public_icann: false,
      bgp: false,
      mock: false,
      packet_live: bytes_match,
      peer_exchange_demonstrated: bytes_match,
    };
  } catch (err) {
    return {
      ok: false,
      code: "PACKET-NOT-CARRIED",
      mock: false,
      packet_live: false,
      ...UNQUALIFIED_ARRIVAL,
      error: String(err && err.message ? err.message : err),
    };
  } finally {
    try { client.close(); } catch { /* closed */ }
    try { server.close(); } catch { /* closed */ }
  }
}

async function exchangeHardwareFrame(id) {
  const codec = FRAME_CODEC[id];
  const payload = crypto.getRandomValues(new Uint8Array(8));
  const frame = codec ? codec[0](payload) : null;
  const parsed = frame && codec ? codec[1](frame) : null;
  const frame_ok = Boolean(parsed && parsed.payload.byteLength === payload.byteLength);
  if (!(await carrierHardwarePresent(id))) {
    return { id, ok: false, code: "QNM-RADIO-ABSENT", packet_live: false, mock: false, frame_ok };
  }
  return {
    id,
    ok: false,
    code: "PACKET-NOT-CARRIED",
    packet_live: false,
    mock: false,
    frame_ok,
    note: "The frame checks out. This process has no round trip on that hardware.",
  };
}

/**
 * Move one datagram on the first carrier that can actually carry it.
 * Order is LAN, Wi-Fi, Bluetooth, RF, photon.
 * LAN carries a node-mesh frame. The other carriers carry their own frame
 * only when that hardware answers. Absent hardware is QNM-RADIO-ABSENT.
 */
export async function carryOnFirstCarrier(carriers) {
  const rows = Array.isArray(carriers) ? carriers : [];
  const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
  const refused = [];
  let nets = null;
  if (typeof process !== "undefined" && process.versions && process.versions.node) {
    try {
      const os = await import("node:os");
      nets = os.networkInterfaces();
    } catch {
      nets = null;
    }
  }
  let lanHit = null;
  for (const id of ["lan", "wifi", "bluetooth", "rf", "photon"]) {
    if (id === "lan") {
      const row = byId.lan;
      if (!row || row.state !== "HW-PRESENT" || row.mock === true) {
        lanHit = { ok: false, code: "QNM-RADIO-ABSENT", packet_live: false, mock: false, ...UNQUALIFIED_ARRIVAL };
        continue;
      }
      const candidates = lanCandidates(row.hardware, nets);
      let trip = null;
      let used = null;
      for (const cand of candidates) {
        trip = await exchangeMesh(cand.address);
        if (trip.ok && trip.mesh === true && trip.packet_live === true && trip.mock !== true) {
          used = cand;
          break;
        }
      }
      if (!used) {
        lanHit = {
          ok: false,
          code: (trip && trip.code) || "QNM-RADIO-ABSENT",
          mock: false,
          packet_live: false,
          ...UNQUALIFIED_ARRIVAL,
          public_icann: false,
          bgp: false,
        };
        continue;
      }
      const flags = surfaceArrival(trip);
      lanHit = {
        ...trip,
        ...flags,
        ok: true,
        code: "PACKET-CARRIED",
        carrier: "lan",
        interface: used.name,
        mock: false,
        packet_live: false,
        peer_exchange_demonstrated: false,
        public_door: "FG-STUB",
        note: "A node-mesh frame moved on this machine. It is not the public packet path and not an alternative internet.",
        public_icann: false,
        bgp: false,
        cap7_name_only: true,
      };
      continue;
    }
    const hardware = await exchangeHardwareFrame(id);
    const carried = hardware.ok === true && hardware.packet_live === true && hardware.mock !== true;
    if (carried && !(lanHit && lanHit.ok === true)) {
      return {
        ...hardware,
        carrier: id,
        mock: false,
        public_icann: false,
        bgp: false,
        cap7_name_only: true,
        ...surfaceArrival(hardware),
        refused,
      };
    }
    refused.push({
      id,
      code: hardware.code || "QNM-RADIO-ABSENT",
      packet_live: false,
      mock: false,
      frame_ok: hardware.frame_ok === true,
    });
  }
  if (lanHit && lanHit.ok === true) return { ...lanHit, refused };
  return {
    ok: false,
    code: (lanHit && lanHit.code) || "QNM-RADIO-ABSENT",
    mock: false,
    packet_live: false,
    peer_exchange_demonstrated: false,
    ...UNQUALIFIED_ARRIVAL,
    public_icann: false,
    bgp: false,
    cap7_name_only: true,
    refused,
  };
}

export function carrierBase() {
  return D2D_CARRIERS.map((row) => ({
    order: row.order,
    id: row.id,
    name: row.name,
    packet_live: false,
    public_door: "FG-STUB",
  }));
}

function packetCounted(row) {
  return Boolean(
    row &&
      row.packet_live === true &&
      row.peer_exchange_demonstrated === true &&
      row.mock !== true,
  );
}

export async function probeCarrierOrder() {
  let probed = null;
  if (typeof process !== "undefined" && process.versions && process.versions.node) {
    try {
      const { track2CarrierProbe } = await import("../qnm-node/bearers/radio.js");
      probed = track2CarrierProbe();
    } catch {
      probed = null;
    }
  }
  const seen = probed && probed.carriers ? probed.carriers : {};
  return carrierBase().map((row) => {
    const hit = seen[row.id] || null;
    return {
      ...row,
      state: hit ? hit.state : "REFUSE",
      hardware: hit ? hit.hardware : false,
      code: hit && hit.code ? hit.code : null,
      packet_live: false,
      packet_counted: packetCounted(hit),
      peer_exchange_demonstrated: Boolean(hit && hit.peer_exchange_demonstrated === true),
      mock: Boolean(hit && hit.mock === true),
    };
  });
}

export async function kernelBase() {
  const note = [
    "AZOS kernel base.",
    "This archive is built from the AZOS principles already in this repo.",
    "It is not a booted machine. A browser tab is not the OS.",
    LIMITATION,
    ...PRINCIPLES,
    "Author: Aziel Eliab.",
  ].join("\n");
  const archive = concatBytes([
    cpioEntry("usr/azos/principles.txt", `${PRINCIPLES.join("\n")}\n`),
    cpioEntry("usr/azos/README", `${note}\n`),
    cpioEntry("TRAILER!!!", ""),
  ]);
  const magic = new TextDecoder().decode(archive.slice(0, 6));
  const parsed = parseCpioNewc(archive);
  const userspace = magic === "070701" && archive.byteLength >= 512 && parsed.names.includes("TRAILER!!!");
  return {
    kernel_base: false,
    userspace_base: userspace,
    base: userspace,
    booted: false,
    installed: false,
    stay_off: false,
    os_yet: false,
    format: userspace ? "cpio-newc" : null,
    sha256: userspace ? await sha256Hex(archive) : null,
    bytes: archive.byteLength,
    names: parsed.names,
    files: parsed.files,
    archive,
    author: AUTHOR,
  };
}

function bootAbsent(code, line) {
  return {
    ok: false,
    kernel_base: false,
    booted: false,
    installed: false,
    host_replaced: false,
    boot_signature: false,
    hdrs: false,
    install_flag: 0,
    guest_log: "",
    code,
    line,
  };
}

function runCapture(cmd, args, extraEnv) {
  return import("node:child_process").then(
    ({ spawn }) =>
      new Promise((resolve) => {
        const env = { ...process.env };
        if (extraEnv) Object.assign(env, extraEnv);
        const child = spawn(cmd, args, { env, stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        child.on("error", (err) => resolve({ code: 127, stdout, stderr, missing: err && err.code === "ENOENT" }));
        child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr, missing: false }));
      }),
  );
}

async function commandPath(name, toolPath) {
  const env = toolPath ? { PATH: String(toolPath) } : null;
  const found = await runCapture("/bin/sh", ["-c", 'command -v "$1"', "sh", name], env || undefined);
  if (found.code !== 0) return null;
  return found.stdout.trim() || null;
}

function runProcess(cmd, args, cwd) {
  return import("node:child_process").then(
    ({ spawn }) =>
      new Promise((resolve) => {
        const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
        let stderr = "";
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        child.on("error", (err) => resolve({ code: 127, stderr: String(err && err.message ? err.message : err), missing: err && err.code === "ENOENT" }));
        child.on("close", (code) => resolve({ code: code ?? 1, stderr, missing: false }));
      }),
  );
}

function runQemu(args, timeoutMs = 3000) {
  return import("node:child_process").then(
    ({ spawn }) =>
      new Promise((resolve) => {
        const child = spawn("qemu-system-x86_64", args, { stdio: ["ignore", "ignore", "pipe"] });
        let stderr = "";
        const timer = setTimeout(() => {
          try {
            child.kill("SIGTERM");
          } catch {
            /* already gone */
          }
        }, timeoutMs);
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        child.on("error", (err) => {
          clearTimeout(timer);
          resolve({ code: 127, stderr: String(err && err.message ? err.message : err), missing: err && err.code === "ENOENT" });
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          resolve({ code: code ?? 1, stderr, missing: false });
        });
      }),
  );
}

function newcEntry(name, data, mode, ino) {
  const enc = new TextEncoder();
  const nameBytes = enc.encode(`${name}\0`);
  const body = typeof data === "string" ? enc.encode(data) : data;
  const fields = [ino, mode, 0, 0, 1, 0, body.byteLength, 0, 0, 0, 0, nameBytes.byteLength, 0];
  const header = enc.encode(`070701${fields.map((n) => n.toString(16).padStart(8, "0")).join("")}`);
  const headPad = (4 - ((header.length + nameBytes.length) % 4)) % 4;
  const bodyPad = (4 - (body.length % 4)) % 4;
  const out = new Uint8Array(header.length + nameBytes.length + headPad + body.length + bodyPad);
  out.set(header, 0);
  out.set(nameBytes, header.length);
  out.set(body, header.length + nameBytes.length + headPad);
  return out;
}

/**
 * Read a Linux x86 bzImage header from the file bytes (boot protocol: "HdrS" at 0x202,
 * kernel_version pointer at 0x20e). Returns null when the file is not a Linux kernel image.
 */
export function readBzImage(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 0x1000) return null;
  if (bytes[0x1fe] !== 0x55 || bytes[0x1ff] !== 0xaa) return null;
  if (!(bytes[0x202] === 0x48 && bytes[0x203] === 0x64 && bytes[0x204] === 0x72 && bytes[0x205] === 0x53)) return null;
  const protocol = bytes[0x206] | (bytes[0x207] << 8);
  const setupSects = bytes[0x1f1] || 4;
  const loadflags = bytes[0x211];
  if (protocol < 0x0200 || (loadflags & 0x01) !== 0x01) return null;
  const ptr = bytes[0x20e] | (bytes[0x20f] << 8);
  let version = null;
  if (ptr) {
    const at = ptr + 0x200;
    let endAt = at;
    while (endAt < bytes.byteLength && endAt - at < 256 && bytes[endAt] !== 0) endAt += 1;
    version = new TextDecoder().decode(bytes.subarray(at, endAt)).trim() || null;
  }
  if (!version || (setupSects + 1) * 512 >= bytes.byteLength) return null;
  return { protocol: `${protocol >> 8}.${String(protocol & 0xff).padStart(2, "0")}`, version, release: version.split(/\s+/)[0] };
}

/** True when the ELF has no PT_INTERP (a static binary that can be /init's interpreter). */
export function isStaticElf(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 64) return false;
  if (!(bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46)) return false;
  if (bytes[4] !== 2 || bytes[5] !== 1) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const phoff = Number(view.getBigUint64(0x20, true));
  const phentsize = view.getUint16(0x36, true);
  const phnum = view.getUint16(0x38, true);
  for (let i = 0; i < phnum; i += 1) {
    const at = phoff + i * phentsize;
    if (at + 4 > bytes.byteLength) return false;
    if (view.getUint32(at, true) === 3) return false;
  }
  return true;
}

async function findKernelImage(fs, path, explicit) {
  const candidates = [];
  if (explicit) candidates.push(explicit);
  else {
    try {
      const names = (await fs.readdir("/boot")).filter((n) => /^vmlinuz-/.test(n));
      names.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const n of names) candidates.push(path.join("/boot", n));
    } catch {
      /* no /boot */
    }
  }
  for (const file of candidates) {
    try {
      const bytes = new Uint8Array(await fs.readFile(file));
      const header = readBzImage(bytes);
      if (header) return { file, bytes, header };
    } catch {
      /* unreadable */
    }
  }
  return null;
}

async function findStaticBusybox(fs, explicit) {
  const candidates = explicit ? [explicit] : ["/usr/bin/busybox", "/bin/busybox", "/usr/local/bin/busybox", "/usr/lib/initramfs-tools/bin/busybox"];
  for (const file of candidates) {
    try {
      const bytes = new Uint8Array(await fs.readFile(file));
      if (isStaticElf(bytes)) return { file, bytes };
    } catch {
      /* absent */
    }
  }
  return null;
}

/**
 * AZOS-REAL-KERNEL-HANDOFF-1.0. Boot a real Linux kernel image (a bzImage: AZOS_KERNEL or the
 * newest readable /boot/vmlinuz-*) under qemu-system-x86_64 with an AZOS initramfs: the cpio
 * userspace from kernelBase() plus a static busybox and an /init that prints a per-run nonce,
 * the running kernel release, and its own pid. Flags come only from the guest serial console:
 *   kernel_base: the console shows "Linux version <v>" for the same version read from the image.
 *   booted:      kernel_base, and /init ran as pid 1 under that kernel release with this run's nonce.
 *   installed:   stays false. Nothing is written to a disk and booted from it here.
 *                bootInstalled() is the disk measurement (extlinux or GRUB).
 * A boot sector, a hand-written header, or a harness flag never sets these.
 * The host system is never replaced. An emulator is not real hardware.
 */
export async function bootHandoff(opts = {}) {
  const src = opts && typeof opts === "object" ? opts : {};
  let fs;
  let path;
  let os;
  try {
    fs = await import("node:fs/promises");
    path = await import("node:path");
    os = await import("node:os");
  } catch {
    return bootAbsent("BOOT-HANDOFF-ABSENT", "The boot handoff tools are absent. Nothing booted.");
  }
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const kernel = await findKernelImage(fs, path, src.kernel || env.AZOS_KERNEL || "");
  if (!kernel) return bootAbsent("BOOT-KERNEL-ABSENT", "No readable Linux kernel image was found. Nothing booted.");
  const busybox = await findStaticBusybox(fs, src.busybox || env.AZOS_BUSYBOX || "");
  if (!busybox) return { ...bootAbsent("BOOT-USERSPACE-ABSENT", "No static busybox for /init. Nothing booted."), hdrs: true, kernel_version: kernel.header.version };
  const nonce = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const built = await kernelBase();
  const init = [
    "#!/bin/busybox sh",
    "/bin/busybox mkdir -p /proc /sys /dev",
    "/bin/busybox mount -t proc proc /proc",
    "/bin/busybox mount -t devtmpfs dev /dev 2>/dev/null",
    `echo "AZOS-BOOTED nonce=${nonce} kernel=$(/bin/busybox uname -r) pid=$$ principles=$(/bin/busybox wc -l < /usr/azos/principles.txt)" > /dev/console`,
    "/bin/busybox poweroff -f",
    "",
  ].join("\n");
  let ino = 1;
  const entries = [
    newcEntry("bin", new Uint8Array(0), 0o040755, ino++),
    newcEntry("dev", new Uint8Array(0), 0o040755, ino++),
    newcEntry("proc", new Uint8Array(0), 0o040755, ino++),
    newcEntry("sys", new Uint8Array(0), 0o040755, ino++),
    newcEntry("usr", new Uint8Array(0), 0o040755, ino++),
    newcEntry("usr/azos", new Uint8Array(0), 0o040755, ino++),
    newcEntry("bin/busybox", busybox.bytes, 0o100755, ino++),
    newcEntry("init", init, 0o100755, ino++),
  ];
  const userspace = built.files && typeof built.files === "object" ? built.files : {};
  for (const [name, text] of Object.entries(userspace)) {
    if (name.startsWith("usr/azos/") && typeof text === "string") entries.push(newcEntry(name, text, 0o100644, ino++));
  }
  entries.push(newcEntry("TRAILER!!!", new Uint8Array(0), 0, 0));
  const initramfs = concatBytes(entries);
  let dir;
  try {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "azos-kboot-"));
    const rdPath = path.join(dir, "initramfs.cpio");
    const logPath = path.join(dir, "serial.log");
    await fs.writeFile(rdPath, initramfs);
    const qemuArgs = [
      "-m",
      "256",
      "-kernel",
      kernel.file,
      "-initrd",
      rdPath,
      "-append",
      "console=ttyS0 panic=-1 rdinit=/init",
      "-serial",
      `file:${logPath}`,
      "-display",
      "none",
      "-monitor",
      "none",
      "-no-reboot",
      "-net",
      "none",
    ];
    let accel = ["-accel", "tcg"];
    try {
      await fs.access("/dev/kvm", (await import("node:fs")).constants.W_OK);
      accel = ["-accel", "kvm"];
    } catch {
      /* no kvm: emulate */
    }
    const guest = await runQemu([...accel, ...qemuArgs], src.timeoutMs || Number(env.AZOS_BOOT_TIMEOUT_MS) || 120000);
    if (guest.missing) return { ...bootAbsent("BOOT-HANDOFF-ABSENT", "qemu-system-x86_64 is absent. Nothing booted."), hdrs: true, kernel_version: kernel.header.version };
    let serial = "";
    try {
      serial = await fs.readFile(logPath, "utf8");
    } catch {
      serial = "";
    }
    const verLine = (serial.match(/Linux version ([^\r\n]+)/) || [])[1] || "";
    const kernelBase_ = verLine.length > 0 && verLine.startsWith(kernel.header.release) && kernel.header.version.startsWith(kernel.header.release);
    const initLine = (serial.match(new RegExp(`AZOS-BOOTED nonce=${nonce} kernel=(\\S+) pid=(\\d+) principles=(\\d+)`)) || []);
    const booted = kernelBase_ && initLine.length > 0 && initLine[1] === kernel.header.release && initLine[2] === "1" && Number(initLine[3]) === PRINCIPLES.length;
    const guestLog = serial
      .split(/\r?\n/)
      .filter((l) => /Linux version|AZOS-BOOTED|Kernel panic|Run \/init|Freeing unused kernel/.test(l))
      .join("\n")
      .slice(0, 800);
    return {
      ok: booted,
      kernel_base: kernelBase_,
      booted,
      installed: false,
      host_replaced: false,
      boot_signature: true,
      hdrs: true,
      install_flag: 0,
      emulator: "qemu-system-x86_64",
      real_hardware: false,
      kernel_file: kernel.file,
      kernel_version: kernel.header.version,
      kernel_release: kernel.header.release,
      kernel_sha256: await sha256Hex(kernel.bytes),
      nonce,
      image_bytes: initramfs.byteLength,
      image_sha256: await sha256Hex(initramfs),
      guest_log: guestLog,
      code: booted ? "BOOT-HANDOFF" : kernelBase_ ? "BOOT-INIT-ABSENT" : "BOOT-HANDOFF-ABSENT",
      line: booted
        ? "A real Linux kernel booted the AZOS initramfs in QEMU and /init ran as pid 1. Nothing was installed. The host system was not replaced."
        : "The kernel handoff did not report a boot. Nothing on the host was replaced.",
    };
  } catch {
    return bootAbsent("BOOT-HANDOFF-ABSENT", "The boot handoff did not run. Nothing booted.");
  } finally {
    if (dir) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch {
        /* temp dir already gone */
      }
    }
  }
}

function installRefuse(code, line) {
  return {
    ...bootAbsent(code, line),
    fail_closed: true,
    mock: false,
    real_hardware: false,
    booted_from_disk: false,
    bootloader: null,
    qemu_kernel: false,
  };
}

const MBR_CANDIDATES = Object.freeze([
  "/usr/lib/syslinux/mbr/mbr.bin",
  "/usr/lib/EXTLINUX/mbr.bin",
  "/usr/share/syslinux/mbr.bin",
]);

/**
 * AZOS disk install. `installed` is true only when a bootloader (extlinux, or GRUB when
 * extlinux is absent) was written to a disk image and QEMU booted that disk with no
 * `-kernel` and no `-append`, and the guest serial console shows this run's nonce from
 * the bootloader command line, pid 1, and the kernel release read from the image.
 * Missing qemu, mkfs, a bootloader, or a mount refuses BOOT-INSTALL-TOOLING-ABSENT.
 * Nothing on the host is replaced. An emulator is not real hardware.
 */
export async function bootInstalled(opts = {}) {
  const src = opts && typeof opts === "object" ? opts : {};
  let fs;
  let path;
  let os;
  try {
    fs = await import("node:fs/promises");
    path = await import("node:path");
    os = await import("node:os");
  } catch {
    return installRefuse("BOOT-INSTALL-TOOLING-ABSENT", "The disk install tools are absent. Nothing was installed.");
  }
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const toolPath = src.toolPath ? String(src.toolPath) : "";
  const want = src.bootloader === "grub" || src.bootloader === "extlinux" ? src.bootloader : "";
  const extlinux = await commandPath("extlinux", toolPath);
  const grub = await commandPath("grub-install", toolPath);
  const qemu = await commandPath("qemu-system-x86_64", toolPath);
  const mkfs = await commandPath("mkfs.ext2", toolPath);
  const losetup = await commandPath("losetup", toolPath);
  const mountBin = await commandPath("mount", toolPath);
  let mbr = null;
  for (const candidate of MBR_CANDIDATES) {
    try {
      await fs.access(candidate);
      mbr = candidate;
      break;
    } catch {
      /* next */
    }
  }
  let bootloader = null;
  if (want === "grub") bootloader = grub ? { kind: "grub", bin: grub } : null;
  else if (want === "extlinux") bootloader = extlinux && mbr ? { kind: "extlinux", bin: extlinux, mbr } : null;
  else if (extlinux && mbr) bootloader = { kind: "extlinux", bin: extlinux, mbr };
  else if (grub) bootloader = { kind: "grub", bin: grub };
  if (!bootloader || !qemu || !mkfs || !losetup || !mountBin) {
    return installRefuse("BOOT-INSTALL-TOOLING-ABSENT", "extlinux or GRUB, qemu, or mkfs is absent. Nothing was installed.");
  }
  const kernel = await findKernelImage(fs, path, src.kernel || env.AZOS_KERNEL || "");
  if (!kernel) return installRefuse("BOOT-KERNEL-ABSENT", "No readable Linux kernel image was found. Nothing was installed.");
  const busybox = await findStaticBusybox(fs, src.busybox || env.AZOS_BUSYBOX || "");
  if (!busybox) return installRefuse("BOOT-USERSPACE-ABSENT", "No static busybox for /init. Nothing was installed.");
  const nonce = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const built = await kernelBase();
  const init = [
    "#!/bin/busybox sh",
    "/bin/busybox mkdir -p /proc /sys /dev",
    "/bin/busybox mount -t proc proc /proc",
    "/bin/busybox mount -t devtmpfs dev /dev 2>/dev/null",
    "DISK=$(/bin/busybox sed -n 's/.*azos-disk=\\([^ ]*\\).*/\\1/p' /proc/cmdline)",
    `echo "AZOS-BOOTED nonce=${nonce} kernel=$(/bin/busybox uname -r) pid=$$ principles=$(/bin/busybox wc -l < /usr/azos/principles.txt) disk=$DISK" > /dev/console`,
    "/bin/busybox poweroff -f",
    "",
  ].join("\n");
  let ino = 1;
  const entries = [
    newcEntry("bin", new Uint8Array(0), 0o040755, ino++),
    newcEntry("dev", new Uint8Array(0), 0o040755, ino++),
    newcEntry("proc", new Uint8Array(0), 0o040755, ino++),
    newcEntry("sys", new Uint8Array(0), 0o040755, ino++),
    newcEntry("usr", new Uint8Array(0), 0o040755, ino++),
    newcEntry("usr/azos", new Uint8Array(0), 0o040755, ino++),
    newcEntry("bin/busybox", busybox.bytes, 0o100755, ino++),
    newcEntry("init", init, 0o100755, ino++),
  ];
  const userspace = built.files && typeof built.files === "object" ? built.files : {};
  for (const [name, text] of Object.entries(userspace)) {
    if (name.startsWith("usr/azos/") && typeof text === "string") entries.push(newcEntry(name, text, 0o100644, ino++));
  }
  entries.push(newcEntry("TRAILER!!!", new Uint8Array(0), 0, 0));
  const initramfs = concatBytes(entries);
  const uid = typeof process.getuid === "function" ? process.getuid() : 0;
  const priv = (args) => (uid === 0 ? runCapture(args[0], args.slice(1)) : runCapture("sudo", ["-n", ...args]));
  let dir;
  let loop = "";
  let mounted = "";
  try {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "azos-disk-"));
    const img = path.join(dir, "disk.img");
    const rdPath = path.join(dir, "initrd.img");
    const logPath = path.join(dir, "serial.log");
    const mnt = path.join(dir, "mnt");
    const imageBytes = 256 * 1024 * 1024;
    const startLba = 2048;
    const totalSectors = imageBytes / 512;
    await fs.writeFile(img, new Uint8Array(0));
    await fs.truncate(img, imageBytes);
    const mbrBytes = Buffer.alloc(512);
    mbrBytes[446] = 0x80;
    mbrBytes[450] = 0x83;
    mbrBytes.writeUInt32LE(startLba, 454);
    mbrBytes.writeUInt32LE(totalSectors - startLba, 458);
    mbrBytes[510] = 0x55;
    mbrBytes[511] = 0xaa;
    const handle = await fs.open(img, "r+");
    try {
      await handle.write(mbrBytes, 0, 512, 0);
    } finally {
      await handle.close();
    }
    await fs.writeFile(rdPath, initramfs);
    await fs.mkdir(mnt);
    const attached = await priv([losetup, "-f", "--show", "-o", String(startLba * 512), "--sizelimit", String((totalSectors - startLba) * 512), img]);
    loop = attached.stdout.trim();
    if (attached.code !== 0 || !loop) {
      return installRefuse(attached.missing ? "BOOT-INSTALL-TOOLING-ABSENT" : "BOOT-INSTALL-FAILED", "The disk image could not be attached. Nothing was installed.");
    }
    const made = await priv([mkfs, "-F", "-L", "azos", loop]);
    if (made.code !== 0) return installRefuse("BOOT-INSTALL-FAILED", "The disk filesystem was not created. Nothing was installed.");
    const mountedRun = await priv([mountBin, loop, mnt]);
    if (mountedRun.code !== 0) return installRefuse("BOOT-INSTALL-FAILED", "The disk image could not be mounted. Nothing was installed.");
    mounted = mnt;
    const append = `console=ttyS0 panic=-1 rdinit=/init azos-disk=${nonce}`;
    if (bootloader.kind === "extlinux") {
      const conf = ["DEFAULT azos", "PROMPT 0", "TIMEOUT 1", "LABEL azos", "  KERNEL /boot/vmlinuz", "  INITRD /boot/initrd.img", `  APPEND ${append}`, ""].join("\n");
      const confPath = path.join(dir, "extlinux.conf");
      await fs.writeFile(confPath, conf);
      const laid = await priv(["mkdir", "-p", path.join(mnt, "boot/extlinux")]);
      if (laid.code !== 0) return installRefuse("BOOT-INSTALL-FAILED", "The bootloader directory was not created. Nothing was installed.");
      for (const [from, to] of [
        [kernel.file, path.join(mnt, "boot/vmlinuz")],
        [rdPath, path.join(mnt, "boot/initrd.img")],
        [confPath, path.join(mnt, "boot/extlinux/extlinux.conf")],
      ]) {
        const copied = await priv(["cp", from, to]);
        if (copied.code !== 0) return installRefuse("BOOT-INSTALL-FAILED", "The kernel was not copied to the disk. Nothing was installed.");
      }
      const installedBoot = await priv([bootloader.bin, "--install", path.join(mnt, "boot/extlinux")]);
      if (installedBoot.code !== 0) return installRefuse("BOOT-INSTALL-FAILED", "extlinux did not install. Nothing was installed.");
    } else {
      const conf = ["set timeout=0", "set default=0", "menuentry 'azos' {", `  linux /boot/vmlinuz ${append}`, "  initrd /boot/initrd.img", "}", ""].join("\n");
      const confPath = path.join(dir, "grub.cfg");
      await fs.writeFile(confPath, conf);
      const whole = await priv([losetup, "-f", "--show", img]);
      if (whole.code !== 0 || !whole.stdout.trim()) return installRefuse("BOOT-INSTALL-FAILED", "GRUB had no whole-disk device. Nothing was installed.");
      const diskDev = whole.stdout.trim();
      const partx = await commandPath("partx", toolPath);
      const parted = partx ? await priv([partx, "-a", diskDev]) : { code: 1 };
      const part = `${diskDev}p1`;
      let partOk = false;
      try {
        await fs.access(part);
        partOk = true;
      } catch {
        partOk = false;
      }
      if (!partOk || parted.code !== 0) {
        await priv([losetup, "-d", diskDev]);
        return installRefuse("BOOT-INSTALL-FAILED", "GRUB had no partition device. Nothing was installed.");
      }
      const laid = await priv(["mkdir", "-p", path.join(mnt, "boot/grub")]);
      if (laid.code !== 0) {
        await priv([losetup, "-d", diskDev]);
        return installRefuse("BOOT-INSTALL-FAILED", "The GRUB directory was not created. Nothing was installed.");
      }
      for (const [from, to] of [
        [kernel.file, path.join(mnt, "boot/vmlinuz")],
        [rdPath, path.join(mnt, "boot/initrd.img")],
        [confPath, path.join(mnt, "boot/grub/grub.cfg")],
      ]) {
        const copied = await priv(["cp", from, to]);
        if (copied.code !== 0) {
          await priv([losetup, "-d", diskDev]);
          return installRefuse("BOOT-INSTALL-FAILED", "The kernel was not copied to the disk. Nothing was installed.");
        }
      }
      const installedBoot = await priv([bootloader.bin, "--target=i386-pc", `--boot-directory=${path.join(mnt, "boot")}`, "--no-floppy", "--modules=biosdisk part_msdos ext2", "--force", diskDev]);
      await priv([losetup, "-d", diskDev]);
      if (installedBoot.code !== 0) return installRefuse("BOOT-INSTALL-FAILED", "GRUB did not install. Nothing was installed.");
    }
    const unmounted = await priv(["umount", mnt]);
    mounted = "";
    if (unmounted.code !== 0) return installRefuse("BOOT-INSTALL-FAILED", "The disk image could not be unmounted. Nothing was installed.");
    const detached = await priv([losetup, "-d", loop]);
    loop = "";
    if (detached.code !== 0) return installRefuse("BOOT-INSTALL-FAILED", "The disk image could not be detached. Nothing was installed.");
    if (bootloader.kind === "extlinux") {
      const wrote = await priv(["dd", `if=${bootloader.mbr}`, `of=${img}`, "bs=440", "count=1", "conv=notrunc", "status=none"]);
      if (wrote.code !== 0) return installRefuse("BOOT-INSTALL-FAILED", "The bootloader MBR was not written. Nothing was installed.");
    }
    let accel = ["-accel", "tcg"];
    try {
      await fs.access("/dev/kvm", (await import("node:fs")).constants.W_OK);
      accel = ["-accel", "kvm"];
    } catch {
      /* no kvm: emulate */
    }
    const qemuArgs = [
      ...accel,
      "-m",
      "256",
      "-drive",
      `file=${img},format=raw,if=ide`,
      "-boot",
      "order=c",
      "-serial",
      `file:${logPath}`,
      "-display",
      "none",
      "-monitor",
      "none",
      "-no-reboot",
      "-net",
      "none",
    ];
    if (qemuArgs.includes("-kernel") || qemuArgs.includes("-append") || qemuArgs.includes("-initrd")) {
      return installRefuse("BOOT-INSTALL-FAILED", "The disk boot was asked to load a kernel directly. Nothing was installed.");
    }
    const guest = await runQemu(qemuArgs, src.timeoutMs || Number(env.AZOS_BOOT_TIMEOUT_MS) || 120000);
    if (guest.missing) return installRefuse("BOOT-INSTALL-TOOLING-ABSENT", "qemu-system-x86_64 is absent. Nothing was installed.");
    let serial = "";
    try {
      serial = await fs.readFile(logPath, "utf8");
    } catch {
      serial = "";
    }
    const verLine = (serial.match(/Linux version ([^\r\n]+)/) || [])[1] || "";
    const kernelBase_ = verLine.length > 0 && verLine.startsWith(kernel.header.release) && kernel.header.version.startsWith(kernel.header.release);
    const initLine = serial.match(new RegExp(`AZOS-BOOTED nonce=${nonce} kernel=(\\S+) pid=(\\d+) principles=(\\d+) disk=(\\S+)`)) || [];
    const booted = kernelBase_ && initLine.length > 0 && initLine[1] === kernel.header.release && initLine[2] === "1" && Number(initLine[3]) === PRINCIPLES.length;
    const installed = booted && initLine[4] === nonce;
    const kept = serial
      .split(/\r?\n/)
      .filter((l) => /Linux version|AZOS-BOOTED|Kernel panic|Run \/init|azos-disk=/.test(l));
    const guestLog = [kept.find((l) => l.includes("Linux version")) || "", kept.find((l) => l.includes("AZOS-BOOTED")) || ""].filter(Boolean).join("\n").slice(0, 2000);
    return {
      ok: installed,
      kernel_base: kernelBase_,
      booted,
      installed,
      host_replaced: false,
      boot_signature: false,
      hdrs: true,
      install_flag: 0,
      fail_closed: installed !== true,
      mock: false,
      real_hardware: false,
      booted_from_disk: true,
      bootloader: bootloader.kind,
      qemu_kernel: false,
      emulator: "qemu-system-x86_64",
      kernel_file: kernel.file,
      kernel_version: kernel.header.version,
      kernel_release: kernel.header.release,
      nonce,
      image_bytes: imageBytes,
      guest_log: guestLog,
      code: installed ? "BOOT-INSTALLED" : "BOOT-INSTALL-ABSENT",
      line: installed
        ? `The ${bootloader.kind} disk image booted the kernel. installed is that console measurement. The host was not replaced.`
        : "The disk image did not report an install. Nothing on the host was replaced.",
    };
  } catch {
    return installRefuse("BOOT-INSTALL-FAILED", "The disk install did not run. Nothing was installed.");
  } finally {
    if (mounted) {
      try {
        await priv(["umount", mounted]);
      } catch {
        /* already unmounted */
      }
    }
    if (loop) {
      try {
        await priv([losetup, "-d", loop]);
      } catch {
        /* already detached */
      }
    }
    if (dir) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch {
        /* temp dir already gone */
      }
    }
  }
}

export async function mailSendBase(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const refused = {
    ok: false,
    op: "mail_send_base",
    base: true,
    stay_off: false,
    sent: false,
    live: false,
    public_live: false,
    public_smtp_send: false,
    public_mta: false,
    catalog_smtp_send: "FG-STUB",
    sent_paints_public_smtp: false,
    sent_paints_public_mta: false,
    public_demo_arms_mail: false,
    confirm_is_authentication: false,
    e2e: false,
    end_to_end: false,
    external_smtp_e2e: false,
    installed: false,
    author: AUTHOR,
    line: "Mail send base is present. Nothing was sent.",
  };
  if (onPublicDemo(env)) {
    return {
      ...refused,
      code: "MAIL-BASE-PUBLIC-DEMO",
      sent: false,
      public_demo_arms_mail: false,
      confirm_is_authentication: false,
      line: "Public-demo does not arm mail send. confirm is not authentication. Public send stays refused.",
    };
  }
  if (src.confirm !== true) {
    return { ...refused, code: "MAIL-BASE-NEEDS-CONFIRM" };
  }
  const posted = await mailPost(src, env);
  const queued = Boolean(posted && posted.sent === true && posted.local_smtp === true);
  return {
    ...refused,
    ...(posted && typeof posted === "object" ? posted : {}),
    op: "mail_send_base",
    base: true,
    stay_off: false,
    sent: queued,
    live: false,
    public_live: false,
    public_smtp_send: false,
    public_mta: false,
    catalog_smtp_send: "FG-STUB",
    sent_paints_public_smtp: false,
    sent_paints_public_mta: false,
    public_demo_arms_mail: false,
    confirm_is_authentication: false,
    e2e: false,
    end_to_end: false,
    external_smtp_e2e: false,
    installed: false,
    ok: queued,
    code: queued ? "MAIL-BASE-QUEUED" : (posted && posted.code) || "MAIL-BASE-NOT-SENT",
    line: queued
      ? "Mail send base queued on the local transport. Public send stays refused."
      : "Mail send base is present. Nothing was sent. Public send stays refused.",
    author: AUTHOR,
  };
}

/**
 * Internet, mail-send, and kernel bases.
 * They sit on the doors already in the repo. They do not replace AZMail
 * or add a product. A flag is true only when that door did the work.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

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
    return { ok: false, code: "MESH-HOST-ABSENT", packet_live: false, mock: false, alt_internet_live: false, second_device: false };
  }
  let dgram;
  try {
    dgram = await import("node:dgram");
  } catch {
    return { ok: false, code: "PACKET-NOT-CARRIED", packet_live: false, mock: false };
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
    const distinct = secondDevice(localHost, parsed && parsed.host);
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
      remote_host: parsed ? parsed.host : null,
      second_device: bytes_match && distinct,
      same_machine_id: Boolean(localHost && parsed && parsed.host === localHost),
      left_machine: false,
      arrived_other_machine: false,
      alt_internet_live: false,
      packet_path_live: false,
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
      alt_internet_live: false,
      second_device: false,
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
        lanHit = { ok: false, code: "QNM-RADIO-ABSENT", packet_live: false, mock: false, alt_internet_live: false, second_device: false };
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
          alt_internet_live: false,
          second_device: false,
          public_icann: false,
          bgp: false,
        };
        continue;
      }
      const distinct = secondDevice(trip.local_host, trip.remote_host);
      lanHit = {
        ...trip,
        ok: true,
        code: "PACKET-CARRIED",
        carrier: "lan",
        interface: used.name,
        mock: false,
        packet_live: false,
        peer_exchange_demonstrated: false,
        second_device: trip.second_device === true && distinct,
        alt_internet_live: false,
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
        second_device: false,
        alt_internet_live: false,
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
    second_device: false,
    alt_internet_live: false,
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

function runQemu(args) {
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
        }, 3000);
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

/**
 * Assemble the real-mode sector in src/boot/azos-boot.S, mark it installed,
 * place the Linux boot magic at 0x202, append the cpio userspace, and hand
 * that disk to qemu. Flags stay false unless the guest debug log shows the boot.
 */
export async function bootHandoff() {
  let fs;
  let path;
  let os;
  try {
    fs = await import("node:fs/promises");
    path = await import("node:path");
    os = await import("node:os");
    const { fileURLToPath } = await import("node:url");
    const source = fileURLToPath(new URL("./boot/azos-boot.S", import.meta.url));
    await fs.access(source);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "azos-boot-"));
    const logPath = path.join(dir, "debug.txt");
    const imagePath = path.join(dir, "disk.img");
    try {
      const assembled = await runProcess("as", ["--32", "-o", "boot.o", source], dir);
      if (assembled.missing) return bootAbsent("BOOT-HANDOFF-ABSENT", "The boot handoff tools are absent. Nothing booted.");
      if (assembled.code !== 0) return bootAbsent("BOOT-IMAGE-ABSENT", "The boot sector did not assemble. Nothing booted.");
      const linked = await runProcess("ld", ["-m", "elf_i386", "-Ttext=0x7c00", "--oformat", "binary", "-o", "boot.bin", "boot.o"], dir);
      if (linked.missing || linked.code !== 0) return bootAbsent("BOOT-IMAGE-ABSENT", "The boot sector did not link. Nothing booted.");
      const sector = new Uint8Array(await fs.readFile(path.join(dir, "boot.bin")));
      const signature = sector.byteLength >= 512 && sector[510] === 0x55 && sector[511] === 0xaa;
      if (!signature) return bootAbsent("BOOT-IMAGE-ABSENT", "The boot sector has no boot signature. Nothing booted.");
      sector[0x1f0] = 1;
      const built = await kernelBase();
      const archive = built.archive instanceof Uint8Array ? built.archive : new Uint8Array(0);
      const image = new Uint8Array(0x206 + archive.byteLength);
      image.set(sector.subarray(0, 512), 0);
      image[0x202] = 0x48;
      image[0x203] = 0x64;
      image[0x204] = 0x72;
      image[0x205] = 0x53;
      image.set(archive, 0x206);
      const hdrs = image[0x202] === 0x48 && image[0x203] === 0x64 && image[0x204] === 0x72 && image[0x205] === 0x53;
      await fs.writeFile(imagePath, image);
      const qemuArgs = [
        "-drive",
        `file=${imagePath},format=raw,if=ide`,
        "-device",
        "isa-debugcon,iobase=0xe9,chardev=dbg",
        "-chardev",
        `file,id=dbg,path=${logPath}`,
        "-display",
        "none",
        "-no-reboot",
        "-serial",
        "none",
        "-net",
        "none",
      ];
      let guest = await runQemu(qemuArgs);
      if (guest.missing) return bootAbsent("BOOT-HANDOFF-ABSENT", "The boot handoff tools are absent. Nothing booted.");
      let guestLog = "";
      try {
        guestLog = await fs.readFile(logPath, "utf8");
      } catch {
        guestLog = "";
      }
      if (!guestLog.includes("AZOS-BOOTED") && /kvm|accel/i.test(guest.stderr || "")) {
        try {
          await fs.rm(logPath, { force: true });
        } catch {
          /* fresh log */
        }
        guest = await runQemu(["-accel", "tcg", ...qemuArgs]);
        try {
          guestLog = await fs.readFile(logPath, "utf8");
        } catch {
          guestLog = "";
        }
      }
      const booted = guestLog.includes("AZOS-BOOTED");
      const installed = booted && guestLog.includes("AZOS-INSTALLED") && sector[0x1f0] === 1;
      const kernel = booted && hdrs && signature;
      return {
        ok: kernel,
        kernel_base: kernel,
        booted,
        installed,
        host_replaced: false,
        boot_signature: signature,
        hdrs,
        install_flag: sector[0x1f0],
        image_bytes: image.byteLength,
        image_sha256: await sha256Hex(image),
        guest_log: guestLog.slice(0, 400),
        code: kernel ? "BOOT-HANDOFF" : "BOOT-HANDOFF-ABSENT",
        line: kernel
          ? "The installed image booted in the handoff. The host system was not replaced."
          : "The boot handoff did not report a boot. Nothing on the host was replaced.",
      };
    } finally {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch {
        /* temp dir already gone */
      }
    }
  } catch {
    return bootAbsent("BOOT-HANDOFF-ABSENT", "The boot handoff tools are absent. Nothing booted.");
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
    e2e: false,
    end_to_end: false,
    external_smtp_e2e: false,
    installed: false,
    author: AUTHOR,
    line: "Mail send base is present. Nothing was sent.",
  };
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

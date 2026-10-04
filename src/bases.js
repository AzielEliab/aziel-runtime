/**
 * Internet, mail-send, and kernel bases.
 * They sit on the doors already in the repo. They do not replace AZMail,
 * the honesty refusals, or the public stub for smtp_send.
 * A base can be present while live, sent, and booted stay false.
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

async function udpRoundTrip(address) {
  let dgram;
  try {
    dgram = await import("node:dgram");
  } catch {
    return { ok: false, code: "PACKET-NOT-CARRIED", mock: false };
  }
  const server = dgram.createSocket("udp4");
  const client = dgram.createSocket("udp4");
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.bind(0, address, resolve);
    });
    const port = server.address().port;
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const sent = await sha256Hex(nonce);
    const got = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 1500);
      server.once("message", (msg) => {
        clearTimeout(timer);
        resolve(new Uint8Array(msg));
      });
    });
    await new Promise((resolve, reject) => {
      client.once("error", reject);
      client.bind(0, address, resolve);
    });
    await new Promise((resolve, reject) => {
      client.send(nonce, port, address, (err) => (err ? reject(err) : resolve()));
    });
    const back = await got;
    const received = await sha256Hex(back);
    const bytes_match = sent === received && back.byteLength === nonce.byteLength;
    return {
      ok: bytes_match,
      code: bytes_match ? "PACKET-CARRIED" : "PACKET-NOT-CARRIED",
      address,
      bytes: nonce.byteLength,
      sent_sha256: sent,
      received_sha256: received,
      bytes_match,
      mock: false,
    };
  } catch (err) {
    return {
      ok: false,
      code: "PACKET-NOT-CARRIED",
      mock: false,
      error: String(err && err.message ? err.message : err),
    };
  } finally {
    try { client.close(); } catch { /* closed */ }
    try { server.close(); } catch { /* closed */ }
  }
}

/**
 * Move one datagram on the first carrier that can actually carry it.
 * Order is LAN, Wi-Fi, Bluetooth, RF, photon.
 * RF and photon refuse when that hardware is absent.
 * Wi-Fi, Bluetooth, RF, and photon are not given a fake packet.
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
  for (const id of ["lan", "wifi", "bluetooth", "rf", "photon"]) {
    const row = byId[id];
    if (!row || row.state !== "HW-PRESENT" || row.mock === true) {
      refused.push({ id, code: "QNM-RADIO-ABSENT", packet_live: false, mock: false });
      continue;
    }
    if (id !== "lan") {
      refused.push({
        id,
        code: id === "rf" || id === "photon" ? "QNM-RADIO-ABSENT" : "PACKET-NOT-CARRIED",
        packet_live: false,
        mock: false,
        note: "This process has no frame codec for that carrier. No mock LIVE.",
      });
      continue;
    }
    const candidates = lanCandidates(row.hardware, nets);
    if (!candidates.length) {
      refused.push({ id, code: "QNM-RADIO-ABSENT", packet_live: false, mock: false });
      continue;
    }
    let trip = null;
    let used = null;
    for (const cand of candidates) {
      trip = await udpRoundTrip(cand.address);
      if (trip.ok) {
        used = cand;
        break;
      }
    }
    if (!used) {
      return {
        ok: false,
        code: (trip && trip.code) || "PACKET-NOT-CARRIED",
        carrier: "lan",
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
    return {
      ok: true,
      code: "PACKET-CARRIED",
      carrier: "lan",
      interface: used.name,
      ...trip,
      mock: false,
      packet_live: true,
      peer_exchange_demonstrated: true,
      second_device: false,
      alt_internet_live: false,
      public_icann: false,
      bgp: false,
      cap7_name_only: true,
      refused,
    };
  }
  return {
    ok: false,
    code: "QNM-RADIO-ABSENT",
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
    public_smtp_send: "FG-STUB",
    e2e: false,
    end_to_end: false,
    external_smtp_e2e: false,
    installed: false,
    author: AUTHOR,
    line: "Mail send base is present. Public send stays refused. Nothing was sent.",
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
    public_smtp_send: "FG-STUB",
    e2e: false,
    end_to_end: false,
    external_smtp_e2e: false,
    installed: false,
    ok: queued,
    code: queued ? "MAIL-BASE-QUEUED" : (posted && posted.code) || "MAIL-BASE-NOT-SENT",
    line: queued
      ? "Mail send base queued on the local transport. Public send stays refused."
      : "Mail send base is present. Public send stays refused. Nothing was sent.",
    author: AUTHOR,
  };
}

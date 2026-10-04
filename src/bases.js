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
  const userspace = magic === "070701" && archive.byteLength >= 512;
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

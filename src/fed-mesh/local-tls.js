/**
 * Local peer TLS. A non-loopback dial is HTTPS with an operator pin.
 * The certificate is minted here for this process. It is not a public CA
 * and it is not proof of a second machine.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { createHash, timingSafeEqual, X509Certificate } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import tls from "node:tls";
import { dialDestination } from "./bearers.js";

export function certSha256(pem) {
  const printed = new X509Certificate(pem).fingerprint256 || "";
  return printed.replace(/:/g, "").toLowerCase();
}

export function fingerprintsEqual(left, right) {
  const a = Buffer.from(String(left || "").toLowerCase());
  const b = Buffer.from(String(right || "").toLowerCase());
  if (a.length !== 64 || b.length !== 64) return false;
  return timingSafeEqual(a, b);
}

/** One-day P-256 certificate for this process. The key is not a mesh secret store. */
export function mintLocalCert() {
  const dir = mkdtempSync(join(tmpdir(), "aziel-lan-tls-"));
  const keyPath = join(dir, "key.pem");
  const certPath = join(dir, "cert.pem");
  try {
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "ec",
        "-pkeyopt",
        "ec_paramgen_curve:prime256v1",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "1",
        "-nodes",
        "-subj",
        "/CN=aziel-local-peer",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    const certPem = readFileSync(certPath, "utf8");
    const keyPem = readFileSync(keyPath, "utf8");
    const fingerprint = certSha256(certPem);
    if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error("local cert fingerprint is not 32 bytes");
    return { certPem, keyPem, fingerprint };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function readBody(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    res.on("error", reject);
  });
}

function decodeChunked(body) {
  let out = "";
  let rest = body;
  while (rest.length) {
    const nl = rest.indexOf("\r\n");
    if (nl < 0) return body;
    const size = Number.parseInt(rest.slice(0, nl), 16);
    if (!Number.isFinite(size)) return body;
    if (size === 0) break;
    const start = nl + 2;
    out += rest.slice(start, start + size);
    rest = rest.slice(start + size);
    if (rest.startsWith("\r\n")) rest = rest.slice(2);
  }
  return out;
}

function parseHttp(buf) {
  const text = buf.toString("utf8");
  const split = text.indexOf("\r\n\r\n");
  if (split < 0) return { status: 0, body: text };
  const head = text.slice(0, split);
  const status = Number((head.match(/^HTTP\/1\.[01] (\d+)/) || [])[1] || 0);
  let body = text.slice(split + 4);
  if (/transfer-encoding:\s*chunked/i.test(head)) body = decodeChunked(body);
  return { status, body };
}

/**
 * One fresh TLS socket per call. The certificate pin is checked on
 * secureConnect, and no HTTP request line, header, or body is written
 * unless it matches. Sockets are not pooled.
 * Cleartext is only a canonical loopback literal. Names are not resolved.
 */
export function peerFetch(url, { method = "GET", json, tlsPin, headers: extraHeaders, timeout = 4000 } = {}) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return Promise.resolve({ transportOk: false, code: "FED-MESH-BAD-INPUT", message: "Peer URL is not a URL.", sent: false, application_bytes: 0 });
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  const dest = dialDestination(host);
  if (parsed.protocol === "http:") {
    if (dest.kind !== "loopback") {
      return Promise.resolve({
        transportOk: false,
        code: dest.kind === "lan" ? "FED-MESH-TLS-REQUIRED" : "FED-MESH-NO-ROUTE",
        message: dest.kind === "lan"
          ? "A non-loopback peer requires TLS. Cleartext LAN is refused."
          : "That host is not a canonical loopback literal. Names are not resolved.",
        sent: false,
        application_bytes: 0,
        tls_required: dest.kind === "lan",
        public_egress: false,
        dial: dest.kind,
      });
    }
  } else if (parsed.protocol !== "https:") {
    return Promise.resolve({
      transportOk: false,
      code: "FED-MESH-NO-ROUTE",
      message: "Peer URL scheme is http on a loopback literal or https with a pin.",
      sent: false,
      application_bytes: 0,
      public_egress: false,
    });
  } else if (dest.kind !== "loopback" && dest.kind !== "lan") {
    return Promise.resolve({
      transportOk: false,
      code: "FED-MESH-NO-ROUTE",
      message: "HTTPS peer dial is a canonical loopback or LAN literal. Names are not resolved.",
      sent: false,
      application_bytes: 0,
      public_egress: false,
      dial: dest.kind,
    });
  } else if (!/^[a-f0-9]{64}$/.test(String(tlsPin || ""))) {
    return Promise.resolve({
      transportOk: false,
      code: "FED-MESH-TLS-PIN",
      message: "HTTPS peer dial needs the operator-supplied certificate sha256.",
      sent: false,
      application_bytes: 0,
    });
  }
  const body = json === undefined ? null : JSON.stringify(json);
  const headers = { accept: "application/json", connection: "close", ...(extraHeaders || {}) };
  if (body) {
    headers["content-type"] = "application/json";
    headers["content-length"] = String(Buffer.byteLength(body));
  }
  if (parsed.protocol === "http:") {
    return new Promise((resolve) => {
      const req = http.request(parsed, { method, headers, timeout }, (res) => {
        readBody(res).then((text) => {
          let parsedBody = {};
          try {
            parsedBody = text ? JSON.parse(text) : {};
          } catch {
            parsedBody = {};
          }
          resolve({
            transportOk: true,
            status: res.statusCode,
            json: parsedBody,
            raw: text,
            application_bytes: Buffer.byteLength(body || ""),
            socket_reused: false,
          });
        }).catch((err) => {
          resolve({ transportOk: false, code: "FED-MESH-NO-ROUTE", message: String(err && err.message ? err.message : err), sent: true, application_bytes: Buffer.byteLength(body || "") });
        });
      });
      req.on("timeout", () => {
        req.destroy();
        resolve({ transportOk: false, code: "FED-MESH-NO-ROUTE", message: "Peer dial timed out.", sent: false, application_bytes: 0 });
      });
      req.on("error", (err) => {
        resolve({ transportOk: false, code: "FED-MESH-NO-ROUTE", message: String(err && err.message ? err.message : err), sent: false, application_bytes: 0 });
      });
      if (body) req.write(body);
      req.end();
    });
  }
  return new Promise((resolve) => {
    let applicationBytes = 0;
    let settled = false;
    let timer = null;
    const finish = (row) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ application_bytes: applicationBytes, socket_reused: false, ...row });
    };
    const socket = tls.connect({
      host,
      port: Number(parsed.port) || 443,
      servername: "aziel-local-peer",
      rejectUnauthorized: false,
      ALPNProtocols: ["http/1.1"],
    });
    timer = setTimeout(() => {
      socket.destroy();
      finish({ transportOk: false, code: "FED-MESH-NO-ROUTE", message: "Peer dial timed out.", sent: applicationBytes > 0 });
    }, timeout);
    socket.once("secureConnect", () => {
      const peer = socket.getPeerCertificate();
      const fp = peer && peer.raw ? createHash("sha256").update(peer.raw).digest("hex") : "";
      if (!fingerprintsEqual(fp, tlsPin)) {
        socket.destroy();
        finish({
          transportOk: false,
          code: "FED-MESH-TLS-PIN",
          message: "Peer certificate does not match the operator pin.",
          sent: false,
          integrity: false,
        });
        return;
      }
      const path = `${parsed.pathname || "/"}${parsed.search || ""}`;
      let head = `${method} ${path} HTTP/1.1\r\nHost: ${parsed.host}\r\n`;
      for (const [key, value] of Object.entries(headers)) head += `${key}: ${value}\r\n`;
      head += "\r\n";
      const payload = Buffer.concat([Buffer.from(head), Buffer.from(body || "")]);
      applicationBytes = payload.length;
      const chunks = [];
      socket.on("data", (chunk) => chunks.push(chunk));
      socket.on("end", () => {
        const parsedHttp = parseHttp(Buffer.concat(chunks));
        let parsedBody = {};
        try {
          parsedBody = parsedHttp.body ? JSON.parse(parsedHttp.body) : {};
        } catch {
          parsedBody = {};
        }
        finish({ transportOk: true, status: parsedHttp.status, json: parsedBody, raw: parsedHttp.body });
      });
      socket.on("error", (err) => {
        finish({ transportOk: false, code: "FED-MESH-NO-ROUTE", message: String(err && err.message ? err.message : err), sent: true });
      });
      socket.write(payload);
    });
    socket.once("error", (err) => {
      finish({ transportOk: false, code: "FED-MESH-NO-ROUTE", message: String(err && err.message ? err.message : err), sent: false });
    });
  });
}

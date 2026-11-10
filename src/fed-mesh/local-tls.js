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
import https from "node:https";
import { isLoopbackHost } from "./bearers.js";

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

/**
 * Dial a peer. Cleartext is only for a loopback literal.
 * HTTPS requires the operator pin. This function does not prove that a
 * deployed edge replaced a client header, and it does not set second_device.
 */
export function peerFetch(url, { method = "GET", json, tlsPin, headers: extraHeaders, timeout = 4000 } = {}) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return Promise.resolve({ transportOk: false, code: "FED-MESH-BAD-INPUT", message: "Peer URL is not a URL.", sent: false });
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (parsed.protocol === "http:") {
    if (!isLoopbackHost(host)) {
      return Promise.resolve({
        transportOk: false,
        code: "FED-MESH-TLS-REQUIRED",
        message: "A non-loopback peer requires TLS. Cleartext LAN is refused.",
        sent: false,
        tls_required: true,
        public_egress: false,
      });
    }
  } else if (parsed.protocol !== "https:") {
    return Promise.resolve({
      transportOk: false,
      code: "FED-MESH-NO-ROUTE",
      message: "Peer URL scheme is http on loopback or https with a pin.",
      sent: false,
      public_egress: false,
    });
  } else if (!/^[a-f0-9]{64}$/.test(String(tlsPin || ""))) {
    return Promise.resolve({
      transportOk: false,
      code: "FED-MESH-TLS-PIN",
      message: "HTTPS peer dial needs the operator-supplied certificate sha256.",
      sent: false,
    });
  }
  const body = json === undefined ? null : JSON.stringify(json);
  const lib = parsed.protocol === "https:" ? https : http;
  const headers = { accept: "application/json", ...(extraHeaders || {}) };
  if (body) {
    headers["content-type"] = "application/json";
    headers["content-length"] = Buffer.byteLength(body);
  }
  return new Promise((resolve) => {
    const req = lib.request(
      parsed,
      {
        method,
        headers,
        rejectUnauthorized: false,
        servername: "aziel-local-peer",
        timeout,
      },
      (res) => {
        if (parsed.protocol === "https:") {
          const peer = res.socket && res.socket.getPeerCertificate ? res.socket.getPeerCertificate() : null;
          const fp = peer && peer.raw ? createHash("sha256").update(peer.raw).digest("hex") : "";
          if (!fingerprintsEqual(fp, tlsPin)) {
            res.resume();
            resolve({
              transportOk: false,
              code: "FED-MESH-TLS-PIN",
              message: "Peer certificate does not match the operator pin.",
              sent: true,
              integrity: false,
            });
            return;
          }
        }
        readBody(res)
          .then((text) => {
            let parsedBody = {};
            try {
              parsedBody = text ? JSON.parse(text) : {};
            } catch {
              parsedBody = {};
            }
            resolve({ transportOk: true, status: res.statusCode, json: parsedBody, raw: text });
          })
          .catch((err) => {
            resolve({ transportOk: false, code: "FED-MESH-NO-ROUTE", message: String(err && err.message ? err.message : err), sent: true });
          });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ transportOk: false, code: "FED-MESH-NO-ROUTE", message: "Peer dial timed out.", sent: false });
    });
    req.on("error", (err) => {
      resolve({ transportOk: false, code: "FED-MESH-NO-ROUTE", message: String(err && err.message ? err.message : err), sent: false });
    });
    if (body) req.write(body);
    req.end();
  });
}

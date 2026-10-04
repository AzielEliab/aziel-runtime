/**
 * AZMail scan, airgap, user-key seal, and local SMTP wire.
 *
 * Airgap boundary:
 * - Dirty side: parse untrusted body, links, and file bytes. Scan them here.
 *   Attachment bytes are written only as inert mode 0600 scan files and removed
 *   after the scan. Nothing on this side is executed.
 * - Crossing: only a scanned sealed object (ciphertext + scan receipt + hashes).
 *   Plaintext and raw attachment bytes do not enter the user mailbox.
 * - Clean side: the mailbox stores ciphertext sealed to the user X25519 key.
 *   The provider does not hold that private key and cannot read the mailbox.
 *
 * Scan is LIVE only when a ClamAV binary (clamscan or clamdscan) is on PATH.
 * If it is absent, the result is AZM-SCAN-ABSENT. A missing scanner is never
 * reported as clean. A fixture scanner is accepted only when fixture_labeled
 * is true, and that result stays live:false.
 *
 * External SMTP is a normal MIME message. It is not end-to-end.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { accessSync, constants as fsConstants } from "node:fs";
import { delimiter, join } from "node:path";
import { once } from "node:events";

export const AZMAIL_HONESTY = Object.freeze({
  scan: "LIVE-when-scanner-present",
  airgap: "present",
  mailbox_at_rest: "encrypted-to-user",
  provider_can_read_mailbox: false,
  external_smtp_e2e: false,
  gmail_e2e: false,
  live_e2e: false,
  yahoo_e2e: false,
  outlook_e2e: false,
  azmail_to_azmail: "sealed-e2e",
  field_1_0: false,
  proton_clone_live: false,
  attachment_exec: false,
  links_fetched: false,
  carried: Object.freeze(["link", "video", "doc", "image", "zip", "file"]),
});

export const AIRGAP_BOUNDARY = Object.freeze({
  present: true,
  dirty_side:
    "Untrusted mail is parsed and scanned here. Body, links, videos, docs, images, zips, and other files are inert bytes. Links are not fetched. Attachments are not executed.",
  cross:
    "Only a scanned sealed object crosses: ciphertext sealed to the user key, a scan receipt, and content hashes. Plaintext and raw attachment bytes stay on the dirty side.",
  clean_side:
    "The user mailbox stores ciphertext sealed to the user public key. The provider does not hold the user private key.",
  exec: false,
  attachment_exec: "refused",
});

const ATTACH_CAP = 256 * 1024;
const PART_CAP = 8;
const LINK_CAP = 2000;
const SEAL_SALT = "AZMAIL-USER-SEAL-1";
const SEAL_INFO = "azmail|mailbox|user-key";

const EXEC_URL = /^(javascript|data|file|vbscript):/i;

function utf8(text) {
  return new TextEncoder().encode(String(text ?? ""));
}

function bytesToB64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

function bytesToB64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function fromB64Flexible(raw) {
  const text = String(raw || "").replace(/\s/g, "");
  if (!text) return null;
  try {
    return new Uint8Array(Buffer.from(text, "base64url"));
  } catch {
    return null;
  }
}

function fromStandardB64(raw) {
  const text = String(raw || "").replace(/\s/g, "");
  if (!text) return null;
  try {
    return new Uint8Array(Buffer.from(text, "base64"));
  } catch {
    return null;
  }
}

async function sha256Hex(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function wantsAttachmentExec(src) {
  if (!src || typeof src !== "object") return false;
  if (src.exec === true || src.execute === true || src.run_attachment === true) return true;
  const lists = [src.attachments, src.files, src.links];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item && typeof item === "object" && (item.exec === true || item.execute === true)) return true;
    }
  }
  return false;
}

function classifyKind(filename, mediaType, hinted) {
  const hint = String(hinted || "").toLowerCase();
  if (AZMAIL_HONESTY.carried.includes(hint)) return hint;
  const mt = String(mediaType || "").toLowerCase();
  const name = String(filename || "").toLowerCase();
  if (mt.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi)$/.test(name)) return "video";
  if (mt.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return "image";
  if (mt.includes("zip") || mt.includes("compressed") || /\.(zip|gz|tgz|7z)$/.test(name)) return "zip";
  if (
    mt.includes("pdf") ||
    mt.includes("word") ||
    mt.includes("document") ||
    mt.includes("text/") ||
    /\.(pdf|docx?|xlsx?|pptx?|txt|md|csv|rtf|odt)$/.test(name)
  ) {
    return "doc";
  }
  return "file";
}

function safeFilename(name, fallback) {
  const cleaned = String(name || fallback || "file")
    .replace(/[\r\n"/\\]/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 80);
  return cleaned || "file";
}

function pushFile(out, item, errors) {
  if (!item || typeof item !== "object") {
    errors.push("attachment");
    return;
  }
  const filename = safeFilename(item.filename || item.name, "file");
  const mediaType = String(item.media_type || item.mediaType || item.type || "application/octet-stream")
    .replace(/[\r\n;]/g, "")
    .slice(0, 120) || "application/octet-stream";
  const raw = item.content_base64 || item.contentBase64 || item.bytes_b64 || item.data_base64;
  const bytes = fromStandardB64(raw) || fromB64Flexible(raw);
  if (!bytes || bytes.byteLength === 0) {
    errors.push(filename);
    return;
  }
  if (bytes.byteLength > ATTACH_CAP) {
    errors.push(`${filename}:cap`);
    return;
  }
  out.push({
    kind: classifyKind(filename, mediaType, item.kind),
    name: filename,
    media_type: mediaType,
    bytes,
  });
}

function pushLink(out, item, errors) {
  const url = String(typeof item === "string" ? item : item && (item.url || item.href) || "").trim();
  if (!url || url.length > LINK_CAP || /[\r\n]/.test(url)) {
    errors.push("link");
    return;
  }
  if (EXEC_URL.test(url)) {
    errors.push("link-exec");
    return;
  }
  out.push({
    kind: "link",
    name: safeFilename(typeof item === "object" && item ? item.title || item.name : "link", "link"),
    media_type: "text/uri-list",
    bytes: utf8(url),
    url,
  });
}

export async function parseCarriedParts(src) {
  const body = String(src && (src.text != null ? src.text : src.body != null ? src.body : src.message) || "").slice(0, 2000);
  if (wantsAttachmentExec(src)) {
    return {
      ok: false,
      code: "AZM-ATTACH-NOEXEC",
      error: "Attachments and links are never executed.",
      exec: false,
      crossed: false,
      clean: false,
    };
  }
  const files = [];
  const errors = [];
  const lists = []
    .concat(Array.isArray(src && src.attachments) ? src.attachments : [])
    .concat(Array.isArray(src && src.files) ? src.files : []);
  for (const item of lists) pushFile(files, item, errors);
  const links = []
    .concat(Array.isArray(src && src.links) ? src.links : [])
    .concat(src && src.link ? [src.link] : []);
  for (const item of links) pushLink(files, item, errors);
  if (errors.some((e) => e === "link-exec")) {
    return {
      ok: false,
      code: "AZM-ATTACH-NOEXEC",
      error: "javascript:, data:, and file: links are refused. Links are not fetched or executed.",
      exec: false,
      crossed: false,
      clean: false,
    };
  }
  if (errors.length) {
    return {
      ok: false,
      code: "AZM-BAD-ATTACHMENT",
      error: "Each file needs content_base64 under the size cap. Each link needs a plain URL.",
      exec: false,
      crossed: false,
      clean: false,
    };
  }
  if (files.length > PART_CAP) {
    return {
      ok: false,
      code: "AZM-BAD-ATTACHMENT",
      error: `At most ${PART_CAP} links and files per message.`,
      exec: false,
      crossed: false,
      clean: false,
    };
  }
  if (!body.trim() && files.length === 0) {
    return {
      ok: false,
      code: "AZM-BAD-INPUT",
      error: "mail needs text, a link, or a file.",
      exec: false,
      crossed: false,
      clean: false,
    };
  }
  const scanParts = [{ name: "body", kind: "body", bytes: utf8(body) }];
  const carried = [];
  for (const file of files) {
    const bytes_b64 = bytesToB64(file.bytes);
    const sha256 = await sha256Hex(file.bytes);
    scanParts.push({ name: file.name, kind: file.kind, bytes: file.bytes });
    carried.push({
      kind: file.kind,
      name: file.name,
      media_type: file.media_type,
      sha256,
      bytes_b64,
      url: file.url || null,
    });
  }
  return { ok: true, body, scanParts, parts: carried };
}

function findClamSync() {
  const bins = ["clamscan", "clamdscan"];
  const dirs = String(process.env.PATH || "").split(delimiter).filter(Boolean);
  for (const bin of bins) {
    for (const dir of dirs) {
      const full = join(dir, bin);
      try {
        accessSync(full, fsConstants.X_OK);
        return { bin, path: full };
      } catch {
        /* next */
      }
    }
  }
  return null;
}

export function probeScannerSync(env) {
  if (env && env.AZMAIL_FORCE_SCANNER_ABSENT === true) {
    return { present: false, live: false, kind: "absent", code: "AZM-SCAN-ABSENT" };
  }
  if (env && "AZMAIL_SCANNER" in env) {
    const scanner = env.AZMAIL_SCANNER;
    if (
      scanner &&
      scanner.kind === "fixture" &&
      scanner.fixture_labeled === true &&
      typeof scanner.scan === "function"
    ) {
      return {
        present: true,
        live: false,
        kind: "fixture",
        fixture_labeled: true,
        scan: scanner.scan,
        code: "AZM-SCAN-FIXTURE",
      };
    }
    return {
      present: false,
      live: false,
      kind: "absent",
      code: "AZM-SCAN-ABSENT",
      unlabeled_override: true,
    };
  }
  const found = findClamSync();
  if (!found) return { present: false, live: false, kind: "absent", code: "AZM-SCAN-ABSENT" };
  return {
    present: true,
    live: true,
    kind: "clamav",
    fixture_labeled: false,
    bin: found.bin,
    path: found.path,
    code: "AZM-SCAN-LIVE",
  };
}

export function fixtureLabeledScanner() {
  return {
    kind: "fixture",
    fixture_labeled: true,
    scan(bytes) {
      const text = Buffer.from(bytes).toString("utf8");
      if (text.includes("AZMAIL-FIXTURE-INFECTED")) {
        return { ok: false, verdict: "infected", signature: "FIXTURE-INFECTED" };
      }
      return { ok: true, verdict: "clean", signature: null };
    },
  };
}

function runProcess(bin, args, timeoutMs) {
  return new Promise((resolve) => {
    import("node:child_process")
      .then(({ spawn }) => {
        const child = spawn(bin, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
        }, timeoutMs);
        child.stdout.on("data", (chunk) => {
          stdout += chunk.toString("utf8");
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString("utf8");
        });
        child.on("error", (err) => {
          clearTimeout(timer);
          resolve({ code: 2, stdout, stderr: String(err && err.message ? err.message : err) });
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          resolve({ code: code == null ? 2 : code, stdout, stderr });
        });
      })
      .catch((err) => {
        resolve({ code: 2, stdout: "", stderr: String(err && err.message ? err.message : err) });
      });
  });
}

async function clamScanBytes(binPath, bytes) {
  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "azmail-scan-"));
  const file = path.join(dir, "part.bin");
  try {
    await fs.writeFile(file, bytes, { mode: 0o600 });
    const result = await runProcess(binPath, ["--no-summary", file], 20000);
    const out = `${result.stdout}\n${result.stderr}`;
    if (result.code === 0) return { ok: true, verdict: "clean", signature: null };
    if (result.code === 1) {
      const sig = (out.match(/:\s*(.+)\s+FOUND/) || [])[1] || "FOUND";
      return { ok: false, verdict: "infected", signature: sig.trim() };
    }
    return { ok: false, verdict: null, code: "AZM-SCAN-ERROR", error: out.slice(0, 400) };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function publicPart(part, verdict) {
  return {
    name: part.name,
    kind: part.kind,
    verdict: verdict.verdict,
    sha256: part.sha256 || null,
  };
}

export async function scanMessageParts({ parts, env }) {
  const probe = probeScannerSync(env);
  const listed = Array.isArray(parts) ? parts : [];
  if (!probe.present || probe.live !== true && probe.kind !== "fixture") {
    return {
      ok: false,
      code: "AZM-SCAN-ABSENT",
      verdict: null,
      clean: false,
      live: false,
      fixture_labeled: false,
      scanner: null,
      signature: null,
      parts: listed.map((part) => publicPart(part, { verdict: null })),
      note: probe.unlabeled_override
        ? "Unlabeled scanner override is refused. No clean verdict was produced."
        : "Malware scanner is absent. No clean verdict was produced.",
    };
  }
  const receipts = [];
  for (const part of listed) {
    let one;
    if (probe.kind === "fixture") {
      one = probe.scan(part.bytes);
      if (!one || (one.verdict !== "clean" && one.verdict !== "infected")) {
        return {
          ok: false,
          code: "AZM-SCAN-ERROR",
          verdict: null,
          clean: false,
          live: false,
          fixture_labeled: true,
          scanner: "fixture-labeled",
          signature: null,
          parts: receipts,
          note: "Fixture scanner returned no verdict. That is not a clean result.",
        };
      }
    } else {
      try {
        one = await clamScanBytes(probe.path, part.bytes);
      } catch (err) {
        one = { ok: false, verdict: null, code: "AZM-SCAN-ERROR", error: String(err && err.message ? err.message : err) };
      }
    }
    const sha256 = part.sha256 || (await sha256Hex(part.bytes));
    receipts.push(publicPart({ ...part, sha256 }, one));
    if (one.verdict === "infected") {
      return {
        ok: false,
        code: "AZM-SCAN-INFECTED",
        verdict: "infected",
        clean: false,
        live: probe.live === true,
        fixture_labeled: probe.fixture_labeled === true,
        scanner: probe.kind === "fixture" ? "fixture-labeled" : "clamav",
        signature: one.signature || "FOUND",
        parts: receipts,
        note: "Infected content does not cross the airgap and is not sent.",
      };
    }
    if (one.verdict !== "clean") {
      return {
        ok: false,
        code: one.code || "AZM-SCAN-ERROR",
        verdict: null,
        clean: false,
        live: probe.live === true,
        fixture_labeled: probe.fixture_labeled === true,
        scanner: probe.kind === "fixture" ? "fixture-labeled" : "clamav",
        signature: null,
        parts: receipts,
        note: one.error || "Scanner failed. That is not a clean result.",
      };
    }
  }
  return {
    ok: true,
    code: "AZM-SCAN-CLEAN",
    verdict: "clean",
    clean: true,
    live: probe.live === true,
    fixture_labeled: probe.fixture_labeled === true,
    scanner: probe.kind === "fixture" ? "fixture-labeled" : "clamav",
    signature: null,
    parts: receipts,
    note: probe.live
      ? "ClamAV reported clean. LIVE because the scanner binary is present."
      : "Fixture-labeled scanner reported clean. This is not a live ClamAV verdict.",
  };
}

export async function inspectBeforeAirgap(src, env) {
  const parsed = await parseCarriedParts(src || {});
  if (!parsed.ok) return { ...parsed, plaintext_crossed: false };
  const scan = await scanMessageParts({ parts: parsed.scanParts, env });
  if (!scan.ok) {
    return {
      ok: false,
      code: scan.code,
      error: scan.note,
      scan,
      crossed: false,
      plaintext_crossed: false,
      exec: false,
      clean: false,
      e2e: false,
      external_smtp_e2e: false,
    };
  }
  return {
    ok: true,
    body: parsed.body,
    parts: parsed.parts,
    scan,
    crossed: false,
    exec: false,
  };
}

export function normalizePublicJwk(input) {
  if (!input || typeof input !== "object") return null;
  if (input.kty !== "OKP" || input.crv !== "X25519") return null;
  if (typeof input.x !== "string" || input.x.length < 8) return null;
  return { kty: "OKP", crv: "X25519", x: input.x };
}

export async function generateUserKeyPair() {
  const pair = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return {
    alg: "X25519",
    public_jwk: { kty: "OKP", crv: "X25519", x: pub.x },
    private_jwk: { kty: "OKP", crv: "X25519", x: priv.x, d: priv.d },
    provider_holds_private: false,
  };
}

async function aesFromShared(privateKey, publicKey) {
  const bits = await crypto.subtle.deriveBits({ name: "X25519", public: publicKey }, privateKey, 256);
  const hkdf = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveBits"]);
  const aesRaw = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: utf8(SEAL_SALT),
      info: utf8(SEAL_INFO),
    },
    hkdf,
    256,
  );
  return crypto.subtle.importKey("raw", aesRaw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealToUserKey(publicJwk, plaintextBytes) {
  const pub = normalizePublicJwk(publicJwk);
  if (!pub) return null;
  const publicKey = await crypto.subtle.importKey("jwk", pub, { name: "X25519" }, true, []);
  const eph = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const ephJwk = await crypto.subtle.exportKey("jwk", eph.publicKey);
  const aes = await aesFromShared(eph.privateKey, publicKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, plaintextBytes));
  return {
    alg: "X25519-HKDF-SHA256-AES-GCM",
    nonce: bytesToB64url(iv),
    eph_public_key: ephJwk.x,
    ciphertext: bytesToB64url(ct),
    provider_can_read: false,
  };
}

export async function openUserSeal(privateJwk, sealed) {
  if (!privateJwk || typeof privateJwk.d !== "string" || !sealed || !sealed.ciphertext) return null;
  try {
    const priv = await crypto.subtle.importKey(
      "jwk",
      { kty: "OKP", crv: "X25519", x: privateJwk.x, d: privateJwk.d },
      { name: "X25519" },
      false,
      ["deriveBits"],
    );
    const ephPub = await crypto.subtle.importKey(
      "jwk",
      { kty: "OKP", crv: "X25519", x: sealed.eph_public_key },
      { name: "X25519" },
      true,
      [],
    );
    const aes = await aesFromShared(priv, ephPub);
    const iv = fromB64Flexible(sealed.nonce);
    const ct = fromB64Flexible(sealed.ciphertext);
    if (!iv || !ct) return null;
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aes, ct);
    return new Uint8Array(plain);
  } catch {
    return null;
  }
}

export async function sealMailboxObject(publicJwk, object) {
  const bytes = utf8(JSON.stringify(object));
  return sealToUserKey(publicJwk, bytes);
}

export async function openMailboxObject(privateJwk, sealed) {
  const bytes = await openUserSeal(privateJwk, sealed);
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function wrapB64(b64) {
  return String(b64 || "").replace(/.{1,76}/g, (line) => `${line}\r\n`).trimEnd();
}

export function buildExternalMime({ from, to, subject, body, parts }) {
  const boundary = `azmail_${bytesToB64url(crypto.getRandomValues(new Uint8Array(8)))}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject || "(no subject)"}`,
    "Date: " + new Date().toUTCString(),
    "MIME-Version: 1.0",
    "X-AZMail-E2E: false",
    "X-AZMail-Encryption: none",
    "X-AZMail-Wire: normal-mime",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    "This message is ordinary MIME. It is not end-to-end encrypted.",
    "",
  ];
  const chunks = [headers.join("\r\n")];
  chunks.push(`--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${body || ""}\r\n`);
  for (const part of parts || []) {
    if (part.kind === "link") {
      const url = part.url || Buffer.from(part.bytes_b64, "base64").toString("utf8");
      chunks.push(
        `--${boundary}\r\nContent-Type: text/uri-list; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\nContent-Disposition: attachment; filename="${part.name}.uri"\r\n\r\n${url}\r\n`,
      );
      continue;
    }
    chunks.push(
      `--${boundary}\r\nContent-Type: ${part.media_type}\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${part.name}"\r\nX-AZMail-Kind: ${part.kind}\r\n\r\n${wrapB64(part.bytes_b64)}\r\n`,
    );
  }
  chunks.push(`--${boundary}--\r\n`);
  return chunks.join("");
}

function smtpChannel(socket, timeoutMs) {
  let buf = "";
  let waiter = null;
  let failed = null;
  socket.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    pump();
  });
  socket.on("error", (err) => {
    failed = err;
    if (waiter) {
      const current = waiter;
      waiter = null;
      current.reject(err);
    }
  });
  function pump() {
    if (!waiter) return;
    const lines = [];
    while (true) {
      const nl = buf.indexOf("\r\n");
      if (nl < 0) break;
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 2);
      lines.push(line);
      if (/^\d{3} /.test(line)) {
        const current = waiter;
        waiter = null;
        current.resolve({ code: Number(line.slice(0, 3)), text: lines.join("\n") });
        return;
      }
    }
  }
  return {
    read() {
      if (failed) return Promise.reject(failed);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("AZM-SMTP-TIMEOUT")), timeoutMs);
        waiter = {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
        };
        pump();
      });
    },
    write(line) {
      socket.write(line.endsWith("\r\n") ? line : `${line}\r\n`);
    },
  };
}

function dotStuff(mime) {
  return String(mime || "")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

const NOT_E2E = Object.freeze({
  e2e: false,
  end_to_end: false,
  external_smtp_e2e: false,
  gmail_e2e: false,
  live_e2e: false,
  yahoo_e2e: false,
  outlook_e2e: false,
  provider_e2e: false,
});

export async function smtpDeliver({ host, port, from, to, mime, allow_cleartext, implicit_tls, rejectUnauthorized, timeout_ms }) {
  let net;
  let tls;
  try {
    net = await import("node:net");
    tls = await import("node:tls");
  } catch {
    return { ok: false, code: "AZM-SMTP-ABSENT", sent: false, tls: false, ...NOT_E2E };
  }
  const timeout = Number(timeout_ms) || 8000;
  const useImplicit = implicit_tls === true || Number(port) === 465;
  const portNum = Number(port) || (useImplicit ? 465 : 587);
  const verify = rejectUnauthorized !== false;
  let socket;
  try {
    const servername = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host === "::1" ? "localhost" : host;
    socket = useImplicit
      ? tls.connect({ host, port: portNum, servername, rejectUnauthorized: verify })
      : net.connect({ host, port: portNum });
    await once(socket, useImplicit ? "secureConnect" : "connect");
    let channel = smtpChannel(socket, timeout);
    const greet = await channel.read();
    if (greet.code !== 220) {
      return { ok: false, code: "AZM-SMTP-REFUSED", sent: false, tls: useImplicit, ...NOT_E2E };
    }
    channel.write("EHLO azmail.local");
    const ehlo = await channel.read();
    if (ehlo.code !== 250) {
      return { ok: false, code: "AZM-SMTP-REFUSED", sent: false, tls: useImplicit, ...NOT_E2E };
    }
    let tlsOn = useImplicit;
    if (!useImplicit && /STARTTLS/i.test(ehlo.text)) {
      channel.write("STARTTLS");
      const ready = await channel.read();
      if (ready.code !== 220) {
        return { ok: false, code: "AZM-SMTP-TLS-ABSENT", sent: false, tls: false, ...NOT_E2E };
      }
      socket.removeAllListeners("data");
      socket.removeAllListeners("error");
      const secure = tls.connect({ socket, servername, rejectUnauthorized: verify });
      await once(secure, "secureConnect");
      socket = secure;
      channel = smtpChannel(socket, timeout);
      channel.write("EHLO azmail.local");
      const again = await channel.read();
      if (again.code !== 250) {
        return { ok: false, code: "AZM-SMTP-REFUSED", sent: false, tls: true, ...NOT_E2E };
      }
      tlsOn = true;
    } else if (!useImplicit && allow_cleartext !== true) {
      return {
        ok: false,
        code: "AZM-SMTP-TLS-ABSENT",
        sent: false,
        tls: false,
        ...NOT_E2E,
        note: "SMTP server did not offer TLS. The message was not sent.",
      };
    }
    channel.write(`MAIL FROM:<${from}>`);
    const mail = await channel.read();
    if (mail.code !== 250) return { ok: false, code: "AZM-SMTP-REFUSED", sent: false, tls: tlsOn, ...NOT_E2E };
    channel.write(`RCPT TO:<${to}>`);
    const rcpt = await channel.read();
    if (rcpt.code !== 250 && rcpt.code !== 251) {
      return { ok: false, code: "AZM-SMTP-REFUSED", sent: false, tls: tlsOn, ...NOT_E2E };
    }
    channel.write("DATA");
    const data = await channel.read();
    if (data.code !== 354) return { ok: false, code: "AZM-SMTP-REFUSED", sent: false, tls: tlsOn, ...NOT_E2E };
    const stuffed = dotStuff(mime);
    socket.write(`${stuffed.endsWith("\r\n") ? stuffed : `${stuffed}\r\n`}.\r\n`);
    const queued = await channel.read();
    channel.write("QUIT");
    if (queued.code !== 250) return { ok: false, code: "AZM-SMTP-REFUSED", sent: false, tls: tlsOn, ...NOT_E2E };
    return {
      ok: true,
      code: "AZM-SMTP-QUEUED",
      sent: true,
      tls: tlsOn,
      tls_peer_verified: tlsOn && verify,
      wire: tlsOn ? "normal-mime-opportunistic-tls" : "normal-mime-cleartext",
      transport: "local-smtp",
      ...NOT_E2E,
    };
  } catch (err) {
    return {
      ok: false,
      code: "AZM-SMTP-ERROR",
      sent: false,
      tls: false,
      ...NOT_E2E,
      error: String(err && err.message ? err.message : err),
    };
  } finally {
    if (socket) socket.destroy();
  }
}

export async function deliverExternal({ from, to, mime, env }) {
  const transport = env && env.AZMAIL_SMTP;
  if (transport && typeof transport.send === "function") {
    let result;
    try {
      result = await transport.send({ mime, from, to });
    } catch (err) {
      return {
        ok: false,
        code: "AZM-SMTP-ERROR",
        sent: false,
        tls: false,
        ...NOT_E2E,
        error: String(err && err.message ? err.message : err),
      };
    }
    const accepted = Boolean(result && result.accepted === true);
    const tls = Boolean(result && result.tls === true);
    return {
      ok: accepted,
      code: accepted ? "AZM-SMTP-QUEUED" : "AZM-SMTP-REFUSED",
      sent: accepted,
      tls,
      tls_peer_verified: Boolean(result && result.tls_peer_verified === true),
      wire: tls ? "normal-mime-opportunistic-tls" : "normal-mime-cleartext",
      transport: "operator-local",
      ...NOT_E2E,
    };
  }
  const host = env && env.AZMAIL_SMTP_HOST;
  if (!host) {
    return {
      ok: false,
      code: "AZM-SMTP-ABSENT",
      sent: false,
      tls: false,
      wire: null,
      transport: null,
      ...NOT_E2E,
      note: "No local SMTP transport. Public smtp_send stays stub. Nothing was sent.",
    };
  }
  const delivered = await smtpDeliver({
    host,
    port: env.AZMAIL_SMTP_PORT,
    from,
    to,
    mime,
    allow_cleartext: env.AZMAIL_SMTP_ALLOW_CLEARTEXT === true,
    implicit_tls: env.AZMAIL_SMTP_IMPLICIT_TLS === true,
    rejectUnauthorized: env.AZMAIL_SMTP_INSECURE === true ? false : true,
  });
  return { ...delivered, ...NOT_E2E };
}

export function externalNote(domain, tls) {
  const names = {
    "gmail.com": "Gmail",
    "googlemail.com": "Gmail",
    "live.com": "Live",
    "outlook.com": "Outlook",
    "hotmail.com": "Outlook",
    "yahoo.com": "Yahoo",
    "ymail.com": "Yahoo",
  };
  const who = names[String(domain || "").toLowerCase()] || "The receiving SMTP provider";
  const hop = tls ? "opportunistic TLS" : "cleartext";
  return `${who} can read this message. It is a normal MIME message over ${hop}. It is not end-to-end encryption. Links, videos, docs, images, zips, and other files ride in that MIME. They are not sealed to the recipient.`;
}

function attachSmtpParser(socket, { messages, flags, cert, key, tlsMod }) {
  let buf = "";
  let mode = "cmd";
  let upgraded = false;
  const write = (line) => socket.write(line);
  socket.on("data", onData);
  if (!socket.__azmailGreeted) {
    socket.__azmailGreeted = true;
    write("220 azmail.local ESMTP\r\n");
  }
  function onData(chunk) {
    buf += chunk.toString("utf8");
    for (;;) {
      if (mode === "data") {
        const end = buf.indexOf("\r\n.\r\n");
        if (end < 0) return;
        const raw = buf.slice(0, end);
        buf = buf.slice(end + 5);
        messages.push(raw.replace(/^\./gm, ""));
        flags.data += 1;
        mode = "cmd";
        write("250 queued\r\n");
        continue;
      }
      const nl = buf.indexOf("\r\n");
      if (nl < 0) return;
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 2);
      const upper = line.toUpperCase();
      if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
        if (cert && key && !upgraded) write("250-azmail.local\r\n250 STARTTLS\r\n");
        else write("250 azmail.local\r\n");
      } else if (upper.startsWith("STARTTLS") && cert && key && tlsMod) {
        write("220 ready\r\n");
        socket.removeListener("data", onData);
        upgraded = true;
        const secure = new tlsMod.TLSSocket(socket, { isServer: true, key, cert });
        secure.__azmailGreeted = true;
        attachSmtpParser(secure, { messages, flags, cert: null, key: null, tlsMod: null });
        return;
      } else if (upper.startsWith("MAIL FROM")) write("250 ok\r\n");
      else if (upper.startsWith("RCPT TO")) write("250 ok\r\n");
      else if (upper === "DATA") {
        mode = "data";
        write("354 end with dot\r\n");
      } else if (upper.startsWith("QUIT")) {
        write("221 bye\r\n");
        socket.end();
      } else if (upper.startsWith("RSET") || upper.startsWith("NOOP")) write("250 ok\r\n");
      else write("502 unimplemented\r\n");
    }
  }
}

export async function listenSmtpSink({ cert, key, implicitTls = false } = {}) {
  const net = await import("node:net");
  const tls = await import("node:tls");
  const messages = [];
  const flags = { data: 0 };
  const handle = (socket) =>
    attachSmtpParser(socket, {
      messages,
      flags,
      cert: implicitTls ? null : cert,
      key: implicitTls ? null : key,
      tlsMod: implicitTls ? null : tls,
    });
  const server = implicitTls ? tls.createServer({ key, cert }, handle) : net.createServer(handle);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    host: "127.0.0.1",
    port: server.address().port,
    messages,
    flags,
    close() {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

export function domainOf(email) {
  const parts = String(email || "").toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
}

export function isEmailAddress(value) {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(String(value || "").trim());
}

export function headerSafe(value) {
  return !/[\r\n]/.test(String(value || ""));
}

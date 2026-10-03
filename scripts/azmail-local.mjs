#!/usr/bin/env node
/**
 * Local AZMail path: scan, airgap, user-key seal, and ordinary SMTP.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resetAzmailStore } from "../src/engines/azmail/engine.js";
import { executeLocal } from "../src/engines/runner.js";
import { fixtureLabeledScanner, generateUserKeyPair, listenSmtpSink } from "../src/engines/azmail/guard.js";

async function call(op, payload, env) {
  const local = await executeLocal({ slug: "azmail", op, payload, env, ranIn: "aziel-runtime" });
  return JSON.parse(local.responseText);
}

export async function proveAzmailLocal() {
  resetAzmailStore();
  const fixture = fixtureLabeledScanner();
  const alice = await generateUserKeyPair();
  const bob = await generateUserKeyPair();
  const sealEnv = { AZMAIL_SCANNER: fixture };
  await call("mailbox_open", { mailbox_id: "alice", address: "alice@azmail.local", user_public_key: alice.public_jwk }, sealEnv);
  await call("mailbox_open", { mailbox_id: "bob", address: "bob@azmail.local", user_public_key: bob.public_jwk }, sealEnv);

  const absent = await call(
    "mail_post",
    { from: "alice", to: "bob", text: "absent", attachments: [{ filename: "a.pdf", media_type: "application/pdf", content_base64: Buffer.from("doc").toString("base64") }] },
    { AZMAIL_FORCE_SCANNER_ABSENT: true },
  );
  const infected = await call(
    "mail_post",
    { from: "alice", to: "bob", text: "no", attachments: [{ filename: "bad.zip", media_type: "application/zip", content_base64: Buffer.from("AZMAIL-FIXTURE-INFECTED").toString("base64") }] },
    sealEnv,
  );
  const sealed = await call(
    "mail_post",
    {
      from: "alice",
      to: "bob@azmail.local",
      text: "local seal",
      links: ["https://example.com/watch"],
      attachments: [
        { filename: "clip.mp4", media_type: "video/mp4", content_base64: Buffer.from("video-bytes").toString("base64") },
        { filename: "note.pdf", media_type: "application/pdf", content_base64: Buffer.from("doc-bytes").toString("base64") },
        { filename: "photo.png", media_type: "image/png", content_base64: Buffer.from("image-bytes").toString("base64") },
        { filename: "pack.zip", media_type: "application/zip", content_base64: Buffer.from("zip-bytes").toString("base64") },
        { filename: "notes.bin", media_type: "application/octet-stream", content_base64: Buffer.from("file-bytes").toString("base64") },
      ],
    },
    sealEnv,
  );
  const opened = await call("inbox_pull", { mailbox_id: "bob", user_private_key: bob.private_jwk }, sealEnv);
  const row = (opened.opened || []).find((item) => item.body === "local seal");

  const dir = mkdtempSync(join(tmpdir(), "azmail-local-"));
  const key = join(dir, "key.pem");
  const cert = join(dir, "cert.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-keyout", key, "-out", cert, "-days", "1", "-nodes", "-subj", "/CN=localhost"], { stdio: "ignore" });
  const sink = await listenSmtpSink({ cert: readFileSync(cert), key: readFileSync(key), implicitTls: true });
  const external = await call(
    "mail_post",
    {
      from: "alice@azmail.local",
      to: "person@gmail.com",
      text: "ordinary",
      attachments: [{ filename: "photo.png", media_type: "image/png", content_base64: Buffer.from("image-bytes").toString("base64") }],
    },
    {
      AZMAIL_SCANNER: fixture,
      AZMAIL_SMTP_HOST: sink.host,
      AZMAIL_SMTP_PORT: sink.port,
      AZMAIL_SMTP_IMPLICIT_TLS: true,
      AZMAIL_SMTP_INSECURE: true,
    },
  );
  const mime = sink.messages[0] || "";
  await sink.close();

  const ok =
    absent.code === "AZM-SCAN-ABSENT" &&
    absent.clean !== true &&
    absent.scan.verdict !== "clean" &&
    infected.code === "AZM-SCAN-INFECTED" &&
    sealed.e2e === true &&
    sealed.external_smtp_e2e === false &&
    sealed.item.plaintext_crossed === false &&
    sealed.item.exec === false &&
    row &&
    row.parts.map((part) => part.kind).sort().join() === "doc,file,image,link,video,zip" &&
    external.e2e === false &&
    external.external_smtp_e2e === false &&
    external.gmail_e2e === false &&
    external.tls === true &&
    mime.includes("X-AZMail-E2E: false") &&
    mime.includes(Buffer.from("image-bytes").toString("base64"));

  return {
    ok,
    scan_absent: absent.code,
    infected: infected.code,
    airgap: sealed.airgap || null,
    e2e: sealed.e2e === true,
    external_smtp_e2e: external.external_smtp_e2e === true,
    gmail_e2e: external.gmail_e2e === true,
    tls: external.tls === true,
    field_1_0: false,
    proton_clone_live: false,
    kinds: row ? row.parts.map((part) => part.kind) : [],
  };
}

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (invoked === import.meta.url) {
  const proved = await proveAzmailLocal();
  process.stdout.write(`${JSON.stringify(proved)}\n`);
  process.exit(proved.ok ? 0 : 1);
}

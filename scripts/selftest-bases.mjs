/**
 * BASES-SELFTEST-1.0: local self-test proofs for the mail-send and kernel bases.
 * Mail: mail_send_base (confirm) -> real SMTP client -> a loopback sink on 127.0.0.1. Nothing leaves the machine.
 * Kernel: bootHandoff assembles the boot sector + cpio userspace and boots it in QEMU (emulated).
 * Neither proves live: no external receiver accepted mail, and an emulator is not real hardware.
 * Appends one line to docs/proofs/BASES-SELFTEST.jsonl (append-only). Author: Aziel Eliab.
 */
import { appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import "../src/index.js";
const { mailSendBase, bootHandoff } = await import("../src/bases.js");
const { listenSmtpSink } = await import("../src/engines/azmail/guard.js");
const sha = (s) => createHash("sha256").update(s).digest("hex");

const sink = await listenSmtpSink();
const env = { AZMAIL_SMTP_HOST: sink.host, AZMAIL_SMTP_PORT: sink.port, AZMAIL_SMTP_ALLOW_CLEARTEXT: true };
const sent = await mailSendBase({ confirm: true, from: "selftest@azmail.local", to: "selftest@example.com", subject: "AZOS mail base self-test", body: "loopback self-test" }, env);
await sink.close();
const got = sink.messages[0] || "";
const mail = {
  ran: true,
  passed: sink.flags.data === 1 && /Subject: AZOS mail base self-test/.test(got),
  sink: "127.0.0.1 loopback",
  code: sent.code,
  messages_received: sink.flags.data,
  mime_sha256: got ? sha(got) : null,
  external_receiver: false,
  proves_live: false,
};
const boot = await bootHandoff();
const kernel = {
  ran: true,
  passed: boot.booted === true && /AZOS-BOOTED/.test(boot.guest_log || ""),
  code: boot.code,
  emulator: boot.code === "BOOT-HANDOFF-ABSENT" ? null : "qemu-system-x86_64",
  image_sha256: boot.image_sha256 || null,
  guest_log: boot.guest_log || "",
  real_hardware: false,
  proves_live: false,
};
const line = { spec: "BASES-SELFTEST-1.0", at: new Date().toISOString(), mail, kernel, public_mail_send_live: false, kernel_live: false };
if (process.argv.includes("--record")) appendFileSync(new URL("../docs/proofs/BASES-SELFTEST.jsonl", import.meta.url), JSON.stringify(line) + "\n");
console.log(JSON.stringify(line));
if (!mail.passed) process.exit(1);

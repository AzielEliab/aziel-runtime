#!/usr/bin/env node
/**
 * aziel-records: OFFLINE-RECORDS-1.0 CLI. Works with the origin gone.
 *   aziel-records append <chain> <fact> [--offline --username <handle>]
 *   aziel-records verify | tips
 *   aziel-records export <out.json>            signed by the local holder key
 *   aziel-records import <bundle.json> [--trust <pubkey>]   rehydrate, forward-only, fails closed
 *   aziel-records pull <origin> <out.json>     snapshot a live origin's public rows (while it exists)
 *   aziel-records anchors <log.jsonl> <bundle.json>   witness log check, no origin
 * State: $AZIEL_RUNTIME_HOME/records (default ~/.aziel-runtime/records). Author: Aziel Eliab.
 */
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
process.on("unhandledRejection", (r) => { process.stderr.write("aziel-records: " + String((r && r.message) || r) + "\n"); process.exitCode = 1; });
const dir = join(process.env.AZIEL_RUNTIME_HOME || join(homedir(), ".aziel-runtime"), "records");
const R = await import("../src/offline-records.js");
const ops = await import("../src/chainlock/ops.js");
const [cmd, ...rest] = process.argv.slice(2);
const flag = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : null; };
const out = (o, code = o && o.ok === false ? 2 : 0) => { process.stdout.write(JSON.stringify(o, null, 2) + "\n"); process.exitCode = code; };
const store = await R.localStore(dir);
if (cmd === "append") {
  const [chain, fact] = rest;
  out(await ops.append(store, { c: chain, f: fact, offline: rest.includes("--offline"), username: flag("--username") || undefined }));
} else if (cmd === "verify") {
  out(await ops.verify(store, {}));
} else if (cmd === "tips") {
  out(await ops.liveTips(store));
} else if (cmd === "export") {
  const b = await R.exportBundle(store, dir);
  await writeFile(rest[0], JSON.stringify(b));
  out({ ok: true, code: "OFFLINE-EXPORTED", file: rest[0], body_sha256: b.body_sha256, public_key: b.public_key, counts: b.counts });
} else if (cmd === "import") {
  const b = JSON.parse(await readFile(rest[0], "utf8"));
  out(await R.importBundle(store, b, { trustKeys: flag("--trust") ? [flag("--trust")] : null }));
} else if (cmd === "pull") {
  const r = await R.pullBundle(rest[0], dir);
  if (r.ok) await writeFile(rest[1], JSON.stringify(r.bundle));
  out(r.ok ? { ok: true, code: "OFFLINE-PULLED", file: rest[1], counts: r.bundle.counts, body_sha256: r.bundle.body_sha256 } : r);
} else if (cmd === "anchors") {
  const log = await readFile(rest[0], "utf8");
  const b = rest[1] ? JSON.parse(await readFile(rest[1], "utf8")) : null;
  out(await R.verifyAnchorsOffline(log, b));
} else {
  out({ ok: false, code: "OFFLINE-USAGE", usage: "append|verify|tips|export|import|pull|anchors" }, 64);
}

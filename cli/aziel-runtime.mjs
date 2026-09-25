#!/usr/bin/env node
/**
 * aziel-runtime CLI — Worker session client, or local-first session log.
 *
 *   node cli/aziel-runtime.mjs session open
 *   node cli/aziel-runtime.mjs session policy --allow-slugs azclce
 *   node cli/aziel-runtime.mjs session exec azclce score '{"r":"...","d":"...","p":"..."}'
 *   node cli/aziel-runtime.mjs session receipt
 *   node cli/aziel-runtime.mjs session close
 *
 * Default talks to the Worker. --local writes an equivalent session file
 * and prefers vendored engine modules (optional --jail child process).
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyClose,
  applyOpen,
  applyPolicy,
  commitExec,
  defaultPolicy,
  digestText,
  newSessionId,
  openSession,
  publicSession,
  recordIntent,
  SESSION_ID_RE,
  verifyChainStrict,
} from "../src/session-core.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { executeLocal, proxyFallbackMeta } from "../src/engines/runner.js";
import { networkRefuseEnvelope } from "../src/remote-transport.js";
import { spawn } from "node:child_process";
import { PRODUCTS } from "../src/index.js";
import { buildRegistry } from "../src/fraggate/registry.js";
import { fraggateCall, previewCatalogAdmission } from "../src/fraggate/door.js";
import {
  humanJobLines,
  newJobId,
  readJobFile,
  sealJob,
  writeJobFile,
} from "../src/background-job.js";
import { probeListener, quietText, runningText, SERVICE_PORT, startRuntimeService } from "../src/runtime-service.js";

const DEFAULT_URL = process.env.AZIEL_RUNTIME_URL || "https://aziel-runtime.vibelock.workers.dev";
const UA = "Mozilla/5.0";
const HOME = process.env.AZIEL_RUNTIME_HOME || join(homedir(), ".aziel-runtime");

function usage() {
  return `aziel-runtime ${RUNTIME_VERSION} — open a session, run one catalog operation, keep the receipt

Author: Aziel Eliab

Usage:
  aziel-runtime call <slug> <op> [payload-json] [--local] [--dry-run] [--background]
  aziel-runtime job <job-id>
  aziel-runtime service
  aziel-runtime service status
  aziel-runtime session open [--local]
  aziel-runtime session status [--local]
  aziel-runtime session policy [--allow-slugs a,b] [--allow-ops x,y] [--max-payload N]
  aziel-runtime session exec <slug> <op> [payload-json] [--background]
  aziel-runtime session receipt
  aziel-runtime session receipts
  aziel-runtime session close

Start:
  aziel-runtime call foldlock fold-preview --local --dry-run
  aziel-runtime session open --local
  aziel-runtime service status

Flags:
  --local            Session file or door call on this machine
  --dry-run          Preview a call. Writes nothing
  --background       Return Running now. Done only after a receipt hash
  --json             Print the machine object
  --url <url>        Worker origin (default ${DEFAULT_URL})
  --id <id>          Session id (default: the current session)
  --port <n>         Listener port for service (default ${SERVICE_PORT})
  -h, --help         Show this help
  --version          Print the version

More:
  aziel-runtime session --help
`;
}

function sessionUsage() {
  return `aziel-runtime session — commands

  open [--local] [--url <url>] [--token <token>]
  status [--local] [--id <id>]
  policy [--allow-slugs a,b] [--allow-ops x,y] [--max-payload N]
  exec <slug> <op> [payload-json]
  receipt [--id <id>] [--all]
  receipts
  close

Flags:
  --local            Session file under ${HOME}; vendored engines in-process
  --json             Print the machine object
  --jail             Run the local engine in a child Node process (ran_in=local-jail)
  --remote           Talk to the Worker
  --token <token>    Sent as X-Aziel-Runtime-Token
  --payload <json>   Exec payload, instead of the positional JSON
  --all              With receipt, print the chain (same as receipts)
  --url <url>        Worker origin (default ${DEFAULT_URL})

Version history is in CHANGELOG.md.
`;
}

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--local") out.flags.local = true;
    else if (a === "--jail") out.flags.jail = true;
    else if (a === "--remote") out.flags.local = false;
    else if (a === "--all") out.flags.all = true;
    else if (a === "--json") out.flags.json = true;
    else if (a === "--dry-run") out.flags.dry_run = true;
    else if (a === "--background") out.flags.background = true;
    else if (a === "--finish-job") out.flags.finish_job = argv[++i];
    else if (a === "--port") out.flags.port = argv[++i];
    else if (a === "--help" || a === "-h") out.flags.help = true;
    else if (a === "--version" || a === "-V") out.flags.version = true;
    else if (a === "--url") out.flags.url = argv[++i];
    else if (a === "--token") out.flags.token = argv[++i];
    else if (a === "--id") out.flags.id = argv[++i];
    else if (a === "--allow-slugs") out.flags.allow_slugs = argv[++i];
    else if (a === "--allow-ops") out.flags.allow_ops = argv[++i];
    else if (a === "--max-payload") out.flags.max_payload = argv[++i];
    else if (a === "--payload") out.flags.payload = argv[++i];
    else if (a.startsWith("--")) out.flags[a.slice(2)] = argv[++i] ?? true;
    else out._.push(a);
  }
  return out;
}

async function ensureHome() {
  await mkdir(join(HOME, "sessions"), { recursive: true });
}

function currentPath() {
  return join(HOME, "current");
}

function sessionPath(id) {
  return join(HOME, "sessions", `${id}.json`);
}

async function readCurrent() {
  try {
    return (await readFile(currentPath(), "utf8")).trim();
  } catch {
    return "";
  }
}

async function writeCurrent(id) {
  await ensureHome();
  await writeFile(currentPath(), id + "\n", "utf8");
}

async function loadLocal(id) {
  const raw = await readFile(sessionPath(id), "utf8");
  return JSON.parse(raw);
}

async function saveLocal(session) {
  await ensureHome();
  await writeFile(sessionPath(session.id), JSON.stringify(session, null, 2) + "\n", "utf8");
  await writeCurrent(session.id);
}

function tokenHeaders(flags) {
  const token = (flags && flags.token) || process.env.AZIEL_RUNTIME_TOKEN || process.env.RUNTIME_TOKEN;
  if (!token) return {};
  return { "X-Aziel-Runtime-Token": String(token) };
}

async function remote(url, path, init = {}, flags = {}) {
  const headers = { "User-Agent": UA, Accept: "application/json", ...tokenHeaders(flags), ...(init.headers || {}) };
  let res;
  try {
    res = await fetch(url.replace(/\/$/, "") + path, { ...init, headers });
  } catch (err) {
    const envelope = networkRefuseEnvelope({ err, origin: url, path });
    const fail = new Error(envelope.message);
    fail.status = 0;
    fail.body = envelope;
    fail.code = envelope.code;
    throw fail;
  }
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function print(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
}

function field(label, value) {
  const shown = value == null || value === "" ? "—" : String(value);
  return `  ${String(label).padEnd(12)}${shown}`;
}

function modePhrase(mode) {
  if (mode === "local") return "on this machine";
  if (mode === "worker") return "on the Worker";
  return mode ? String(mode) : "";
}

function allowPhrase(list) {
  if (!Array.isArray(list) || list.length === 0) return "none";
  if (list.length === 1 && list[0] === "*") return "all";
  return list.join(", ");
}

function chainPhrase(verified) {
  if (!verified || typeof verified !== "object") return "";
  return verified.ok ? "verified" : "check failed";
}

function nextCommand(command, flags, session) {
  const local = flags && flags.local ? " --local" : "";
  if (command === "status" && session && session.closed) return "aziel-runtime session open --local";
  const map = {
    open: `aziel-runtime session status${local}`,
    status: `aziel-runtime session exec <slug> <op>${local}`,
    policy: `aziel-runtime session exec <slug> <op>${local}`,
    exec: `aziel-runtime session receipt${local}`,
    receipt: `aziel-runtime session close${local}`,
    receipts: `aziel-runtime session close${local}`,
    close: "aziel-runtime session open --local",
  };
  return map[command] || "aziel-runtime --help";
}

function formatHuman(command, result, flags) {
  const where = modePhrase(result && result.mode);
  const session = (result && result.session) || {};
  const lines = [];
  const place = where ? ` ${where}` : "";
  if (command === "open") {
    lines.push(`Opened a session${place}.`);
    lines.push(field("id", session.id));
    lines.push(field("receipts", session.receipt_count));
    if (result.mode === "local") lines.push(field("saved", HOME));
  } else if (command === "status") {
    lines.push(`Session ${session.id || ""}${place}.`.replace(" .", "."));
    lines.push(field("opened", session.opened_at));
    lines.push(field("closed", session.closed ? "yes" : "no"));
    lines.push(field("receipts", `${session.receipt_count} of ${session.receipt_cap}`));
    lines.push(field("execs", session.exec_count));
  } else if (command === "policy") {
    const policy = session.policy || {};
    lines.push(`Saved the session policy${place}.`);
    lines.push(field("slugs", allowPhrase(policy.allow_slugs)));
    lines.push(field("ops", allowPhrase(policy.allow_ops)));
    lines.push(field("max bytes", policy.max_payload_bytes));
  } else if (command === "exec") {
    const ex = result.exec || {};
    lines.push(`Ran ${ex.slug || ""} ${ex.op || ""}${place}.`.replace("  ", " ").trim());
    lines.push(field("status", ex.status));
    lines.push(field("ran in", ex.ran_in || ex.mode || ""));
    if (ex.engine_digest) lines.push(field("digest", ex.engine_digest));
    if (ex.error) lines.push(field("error", ex.error));
    if (result.receipt && result.receipt.hash) lines.push(field("receipt", result.receipt.hash));
  } else if (command === "receipt") {
    const rec = result.receipt;
    lines.push(rec ? `Latest receipt${place}.` : `No receipt on this session${place}.`);
    if (rec) {
      lines.push(field("event", rec.event));
      lines.push(field("seq", rec.seq));
      lines.push(field("hash", rec.hash));
    }
    const chain = chainPhrase(result.verified);
    if (chain) lines.push(field("chain", chain));
  } else if (command === "receipts") {
    const n = Array.isArray(result.receipts) ? result.receipts.length : session.receipt_count;
    lines.push(`Receipt chain${place}.`);
    lines.push(field("count", n));
    const chain = chainPhrase(result.verified);
    if (chain) lines.push(field("chain", chain));
  } else if (command === "close") {
    lines.push(`Sealed the session${place}.`);
    lines.push(field("id", session.id));
    lines.push(field("receipts", session.receipt_count));
    const chain = chainPhrase(result.verified);
    if (chain) lines.push(field("chain", chain));
  } else {
    lines.push(`Done${place}.`);
  }
  lines.push("");
  lines.push(`Next: ${nextCommand(command, flags, session)}`);
  return lines.join("\n") + "\n";
}

function dotted(text) {
  const reason = String(text || "The command failed").replace(/\s+/g, " ").trim();
  return /[.!?]$/.test(reason) ? reason : `${reason}.`;
}

async function localSessionId(flags) {
  if (flags && flags.local) return "";
  try {
    const id = (flags && flags.id) || (await readCurrent());
    if (id && SESSION_ID_RE.test(id)) {
      await loadLocal(id);
      return id;
    }
  } catch {
    /* no local file */
  }
  return "";
}

async function humanError(err, flags) {
  const body = err && err.body && typeof err.body === "object" ? err.body : {};
  const code = (err && err.code) || body.code || "";
  const message = (err && err.message) || body.error || body.message || "The command failed";
  const openLocal = "aziel-runtime session open --local";
  const localId = await localSessionId(flags);
  if (code === "ENOENT" || /ENOENT/.test(message)) {
    return `No saved session file.\nNext: ${openLocal}\n`;
  }
  if (/no session id/i.test(message)) {
    return `No session yet.\nNext: ${openLocal}\n`;
  }
  if (code === "session_not_found" || message === "session not found") {
    if (localId) {
      return `Session not found on the Worker.\nA local session file exists for ${localId}.\nNext: aziel-runtime session status --local\n`;
    }
    return `Session not found.\nNext: ${openLocal}\n`;
  }
  if (code === "session_closed" || /sealed/i.test(message)) {
    return `This session is sealed.\nNext: ${openLocal}\n`;
  }
  if (code === "session_expired" || /exceeded 6h/.test(message)) {
    return `This session has expired (6h).\nNext: ${openLocal}\n`;
  }
  const origin = body.origin || (flags && flags.url) || DEFAULT_URL;
  const localNext = localId ? `aziel-runtime session status --local` : openLocal;
  if (code === "FG-DNS" || body.code === "FG-DNS") {
    const where = localId ? `\nA local session file exists for ${localId}.` : "";
    return `Could not resolve the Worker (FG-DNS). The call did not run.${where}\nNext: check DNS for ${origin}\n      or ${localNext}\n`;
  }
  if (code === "FG-NET" || body.code === "FG-NET") {
    const where = localId ? `\nA local session file exists for ${localId}.` : "";
    return `Could not reach the Worker (FG-NET). The call did not run.${where}\nNext: check the connection to ${origin}\n      or ${localNext}\n`;
  }
  if (err instanceof SyntaxError) {
    return `That payload is not JSON.\nNext: pass one JSON object, for example '{"text":"hello"}'\n`;
  }
  if (code === "unknown_slug") {
    return `${dotted(message)}\nNext: aziel-runtime session exec <slug> <op> --local\n`;
  }
  if (code === "slug_not_allowed" || code === "op_not_allowed") {
    return `${dotted(message)}\nNext: aziel-runtime session policy --allow-slugs <slug> --local\n`;
  }
  return `${dotted(message)}\nNext: aziel-runtime --help\n`;
}

function emit(flags, command, result) {
  if (flags && flags.json) print(result);
  else process.stdout.write(formatHuman(command, result, flags));
}

async function fail(flags, err) {
  if (flags && flags.json) {
    if (err && err.body && err.body.fraggate_receipt === false) print(err.body);
    else print({ ok: false, error: err && err.message ? err.message : String(err), status: (err && err.status) || 1, body: (err && err.body) || null });
  } else {
    process.stderr.write(await humanError(err, flags));
  }
  process.exit(1);
}

function failText(flags, text, jsonError) {
  if (flags && flags.json) {
    print({ ok: false, error: jsonError || text, status: 1, body: null });
  } else {
    process.stderr.write(text.endsWith("\n") ? text : `${text}\n`);
  }
  process.exit(1);
}

async function welcomeText() {
  const lines = [
    `aziel-runtime ${RUNTIME_VERSION}`,
    "",
    "Open a session, run one catalog operation, and keep the receipt.",
    "Author: Aziel Eliab.",
    "",
  ];
  let id = "";
  try {
    id = await readCurrent();
  } catch {
    id = "";
  }
  if (id && SESSION_ID_RE.test(id)) {
    try {
      const session = publicSession(await loadLocal(id));
      lines.push(`Current session on this machine: ${session.id}`);
      lines.push(field("receipts", session.receipt_count));
      lines.push(field("closed", session.closed ? "yes" : "no"));
      lines.push("");
      lines.push(session.closed ? "Next: aziel-runtime session open --local" : "Next: aziel-runtime session status --local");
      return `${lines.join("\n")}\n`;
    } catch {
      lines.push(`A session id is saved (${id}) and there is no local session file.`);
      lines.push("");
      lines.push("Next: aziel-runtime session status");
      lines.push("      aziel-runtime session open --local");
      return `${lines.join("\n")}\n`;
    }
  }
  lines.push("Next:");
  lines.push("  aziel-runtime call foldlock fold-preview --local --dry-run");
  lines.push("  aziel-runtime session open --local");
  lines.push("");
  lines.push("Then:");
  lines.push("  aziel-runtime session status --local");
  lines.push("  aziel-runtime --help");
  return `${lines.join("\n")}\n`;
}

function csv(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

async function resolveId(flags) {
  const id = flags.id || (await readCurrent());
  if (!id || !SESSION_ID_RE.test(id)) {
    throw new Error("no session id — run: aziel-runtime session open");
  }
  return id;
}

async function cmdOpen(flags) {
  if (flags.local) {
    const id = newSessionId();
    const now = new Date().toISOString();
    const session = openSession({ id, now, version: RUNTIME_VERSION, source: "cli-local" });
    await applyOpen(session, now);
    await saveLocal(session);
    return { ok: true, mode: "local", session: publicSession(session), receipt: session.receipts[0] };
  }
  const url = flags.url || DEFAULT_URL;
  const body = await remote(url, "/v1/session/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }, flags);
  if (body.session && body.session.id) await writeCurrent(body.session.id);
  return { ok: true, mode: "worker", ...body };
}

async function cmdPolicy(flags) {
  const policy = {};
  if (flags.allow_slugs) policy.allow_slugs = csv(flags.allow_slugs);
  if (flags.allow_ops) policy.allow_ops = csv(flags.allow_ops);
  if (flags.max_payload) policy.max_payload_bytes = Number(flags.max_payload);
  if (flags.local) {
    const id = await resolveId(flags);
    const session = await loadLocal(id);
    const out = await applyPolicy(session, Object.keys(policy).length ? policy : defaultPolicy(), new Date().toISOString());
    await saveLocal(out.session);
    return { ok: true, mode: "local", session: publicSession(out.session), receipt: out.receipt };
  }
  const id = await resolveId(flags);
  const url = flags.url || DEFAULT_URL;
  return {
    ok: true,
    mode: "worker",
    ...(await remote(url, `/v1/session/${id}/policy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(policy),
    }, flags)),
  };
}

async function runJail(slug, op, payload) {
  const jail = fileURLToPath(new URL("../src/engines/jail.mjs", import.meta.url));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [jail], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("close", (code) => {
      if (code !== 0 && !out.trim()) {
        reject(new Error(err || `jail exit ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(new Error(err || out || String(e)));
      }
    });
    child.stdin.write(JSON.stringify({ slug, op, payload }));
    child.stdin.end();
  });
}

async function cmdExec(flags, slug, op, payloadArg) {
  let payload = {};
  const raw = flags.payload != null ? flags.payload : payloadArg;
  if (raw && String(raw).trim()) {
    payload = JSON.parse(raw);
  }
  if (flags.local) {
    const id = await resolveId(flags);
    const session = await loadLocal(id);
    const payloadText = JSON.stringify(payload);
    const now = new Date().toISOString();
    const { intent } = await recordIntent(session, { slug, op, payload, payloadText, knownSlugs: null }, now);
    await saveLocal(session);
    const url = flags.url || DEFAULT_URL;
    let status = 502;
    let responseText = "";
    let error = null;
    let upstream = null;
    let engine = null;
    let latencyMs = 0;
    const local = flags.jail
      ? await runJail(slug, op, payload)
      : await executeLocal({ slug, op, payload, ranIn: "local-jail" });
    if (local && !local.unsupported && local.mode === "local") {
      status = local.status;
      responseText = local.responseText;
      error = local.error;
      latencyMs = local.latency_ms;
      engine = {
        mode: "local",
        true_engine_runtime: true,
        engine_digest: local.engine_digest,
        engine_slug: local.engine_slug,
        engine_op: local.engine_op,
        ran_in: local.ran_in || "local-jail",
      };
    } else {
      const started = Date.now();
      upstream = `${url}/p/${slug}/${op}`;
      try {
        const res = await fetch(upstream, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", "User-Agent": UA },
          body: payloadText,
        });
        status = res.status;
        responseText = await res.text();
      } catch (err) {
        error = String(err && err.message ? err.message : err);
      }
      latencyMs = Date.now() - started;
      engine = proxyFallbackMeta({ slug, op, upstream, status, error });
    }
    const reqDig = await digestText(payloadText);
    const resDig = await digestText(responseText);
    const receipt = await commitExec(
      session,
      {
        intent,
        status,
        latencyMs,
        requestDigest: reqDig.sha256,
        responseDigest: resDig.sha256,
        error,
        upstream: engine && engine.mode === "local" ? null : upstream,
        responseBytes: resDig.bytes,
        contentType: "application/json",
        engine,
      },
      new Date().toISOString(),
    );
    await saveLocal(session);
    return {
      ok: true,
      mode: "local",
      session: publicSession(session),
      receipt,
      exec: {
        slug,
        op,
        status,
        mode: engine && engine.mode,
        true_engine_runtime: engine && engine.true_engine_runtime === true,
        engine_digest: engine && engine.engine_digest,
        ran_in: engine && engine.ran_in,
        upstream: engine && engine.mode === "local" ? null : upstream,
        error,
      },
    };
  }
  const id = await resolveId(flags);
  const url = flags.url || DEFAULT_URL;
  return {
    ok: true,
    mode: "worker",
    ...(await remote(url, `/v1/session/${id}/exec`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, op, payload }),
    }, flags)),
  };
}

async function cmdReceipt(flags, all) {
  if (flags.local) {
    const id = await resolveId(flags);
    const session = await loadLocal(id);
    const verified = await verifyChainStrict(session.receipts);
    if (all || flags.all) return { ok: true, mode: "local", session: publicSession(session), receipts: session.receipts, verified };
    return {
      ok: true,
      mode: "local",
      session: publicSession(session),
      receipt: session.receipts[session.receipts.length - 1] || null,
      verified,
    };
  }
  const id = await resolveId(flags);
  const url = flags.url || DEFAULT_URL;
  const path = all || flags.all ? `/v1/session/${id}/receipts` : `/v1/session/${id}/receipt`;
  return { ok: true, mode: "worker", ...(await remote(url, path, {}, flags)) };
}

async function cmdClose(flags) {
  if (flags.local) {
    const id = await resolveId(flags);
    const session = await loadLocal(id);
    const out = await applyClose(session, new Date().toISOString());
    await saveLocal(out.session);
    const verified = await verifyChainStrict(out.session.receipts);
    return { ok: true, mode: "local", session: publicSession(out.session), receipt: out.receipt, verified };
  }
  const id = await resolveId(flags);
  const url = flags.url || DEFAULT_URL;
  return { ok: true, mode: "worker", ...(await remote(url, `/v1/session/${id}/close`, { method: "POST" }, flags)) };
}

async function cmdStatus(flags) {
  if (flags.local) {
    const id = await resolveId(flags);
    const session = await loadLocal(id);
    return { ok: true, mode: "local", session: publicSession(session) };
  }
  const id = await resolveId(flags);
  const url = flags.url || DEFAULT_URL;
  return { ok: true, mode: "worker", ...(await remote(url, `/v1/session/${id}`, {}, flags)) };
}

const BY_SLUG = Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]));

function doorRegistry() {
  return buildRegistry(PRODUCTS);
}

async function localDoorCall(args) {
  return fraggateCall(args, doorRegistry(), BY_SLUG, {}, null);
}

function parsePayload(flags, payloadArg) {
  const raw = flags.payload != null ? flags.payload : payloadArg;
  if (raw == null || !String(raw).trim()) return {};
  return JSON.parse(raw);
}

function printJob(flags, view, next) {
  if (flags && flags.json) {
    print(view);
    return;
  }
  const lines = humanJobLines(view);
  lines.push("");
  lines.push(`Next: ${next}`);
  process.stdout.write(lines.join("\n") + "\n");
}

function spawnFinish(args) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...args], {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
}

async function cmdCall(flags, slug, op, payloadArg) {
  const payload = parsePayload(flags, payloadArg);
  const args = { slug, op, payload, dry_run: flags.dry_run === true, background: flags.background === true };
  if (flags.finish_job) {
    const body = await localDoorCall({ slug, op, payload });
    const sealed = sealJob({ job_id: flags.finish_job, slug, op, phase: "running", receipt: null }, body);
    await writeJobFile(HOME, sealed);
    return honestFromFile(flags.finish_job);
  }
  if (flags.dry_run) {
    const preview = previewCatalogAdmission(args, doorRegistry(), BY_SLUG);
    if (!preview.proceed) {
      const err = new Error((preview.envelope && preview.envelope.message) || "Refused");
      err.code = preview.envelope && preview.envelope.code;
      err.body = preview.envelope;
      throw err;
    }
    return {
      ok: true,
      dry_run: true,
      mutated: false,
      ledger_written: false,
      code: "MCP-DRY-RUN",
      slug,
      op,
      message: "Preview only. Nothing was written.",
      summary: "Preview only. Nothing was written.",
    };
  }
  if (flags.background && !flags.local) {
    const url = flags.url || DEFAULT_URL;
    return remote(
      url,
      "/v1/fraggate/call",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, op, payload, background: true }),
      },
      flags,
    );
  }
  if (flags.background) {
    const job = { job_id: newJobId(), slug, op, phase: "running", ok: false, receipt: null };
    await writeJobFile(HOME, job);
    const payloadText = JSON.stringify(payload);
    spawnFinish(["call", slug, op, payloadText, "--local", "--finish-job", job.job_id]);
    return readJobFile(HOME, job.job_id);
  }
  if (flags.local) return localDoorCall({ slug, op, payload });
  const url = flags.url || DEFAULT_URL;
  return remote(
    url,
    "/v1/fraggate/call",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, op, payload }) },
    flags,
  );
}

async function honestFromFile(jobId) {
  return readJobFile(HOME, jobId);
}

async function cmdJob(flags, jobId) {
  if (!jobId || !/^job_[a-f0-9]{16}$/.test(jobId)) {
    const err = new Error("job id must match job_ + 16 hex");
    err.code = "bad_job_id";
    throw err;
  }
  const local = await readJobFile(HOME, jobId);
  if (flags.local || local.code !== "job_not_found") return local;
  const url = flags.url || DEFAULT_URL;
  return remote(url, `/v1/fraggate/background/${jobId}`, {}, flags);
}

async function cmdService(flags, sub) {
  const port = Number(flags.port || SERVICE_PORT);
  if (sub === "status") {
    const running = await probeListener(port);
    const payload = { name: "aziel-runtime", status: running ? "running" : "quiet", port, door_called: false };
    if (flags.json) print(payload);
    else process.stdout.write(running ? runningText(port) : quietText(port));
    return null;
  }
  const server = await startRuntimeService({
    port,
    onCall: (args) => localDoorCall(args),
    onJob: (id) => readJobFile(HOME, id),
    onBackground: async (args) => {
      if (args.job_id) return readJobFile(HOME, args.job_id);
      const slug = String(args.slug || args.name || "");
      const op = String(args.op || "");
      const payload = args.payload && typeof args.payload === "object" ? args.payload : {};
      const job = { job_id: newJobId(), slug, op, phase: "running", ok: false, receipt: null };
      await writeJobFile(HOME, job);
      spawnFinish(["call", slug, op, JSON.stringify(payload), "--local", "--finish-job", job.job_id]);
      return readJobFile(HOME, job.job_id);
    },
  });
  const bound = server.address().port;
  if (flags.json) print({ name: "aziel-runtime", status: "running", port: bound, door_called: false });
  else process.stdout.write(runningText(bound));
  await new Promise((resolve) => {
    process.once("SIGINT", () => {
      server.close(() => resolve());
    });
  });
  return null;
}

async function main() {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);
  const [cmd, sub, ...rest] = parsed._;
  const sessionHelp = cmd === "session" && (parsed.flags.help || sub === "help");
  if (parsed.flags.help || cmd === "help" || sessionHelp) {
    process.stdout.write(sessionHelp ? sessionUsage() : usage());
    process.exit(0);
  }
  if (parsed.flags.version) {
    process.stdout.write(`aziel-runtime ${RUNTIME_VERSION}\n`);
    process.exit(0);
  }
  if (parsed._.length === 0) {
    process.stdout.write(await welcomeText());
    process.exit(0);
  }
  if (cmd === "call") {
    const [slug, op, payloadArg] = [sub, ...rest];
    if (!slug || !op) {
      failText(
        parsed.flags,
        "call needs a slug and an op.\nNext: aziel-runtime call foldlock fold-preview --local --dry-run\n",
        "call needs a slug and an op",
      );
    }
    try {
      const result = await cmdCall(parsed.flags, slug, op, payloadArg);
      if (parsed.flags.dry_run && !parsed.flags.json) {
        process.stdout.write(`Preview only. Nothing was written.\n  ${"slug".padEnd(12)}${slug}\n  ${"op".padEnd(12)}${op}\n\nNext: aziel-runtime call ${slug} ${op} --local\n`);
      } else if (parsed.flags.background || parsed.flags.finish_job) {
        printJob(parsed.flags, result, `aziel-runtime job ${result.job_id}`);
      } else if (parsed.flags.json) print(result);
      else {
        const hash = result && result.ledger_tip && result.ledger_tip.hash;
        const lines = [`Called ${slug} ${op}.`, `  ${"code".padEnd(12)}${result.code || "—"}`];
        if (hash && result.ok === true) lines.push(`  ${"receipt".padEnd(12)}${hash}`);
        else lines.push(`  ${"receipt".padEnd(12)}—`);
        if (result.ok === false) lines[0] = `Refused. ${result.message || result.code || "The door refused the call."}`;
        lines.push("", `Next: aziel-runtime call <slug> <op> --local`);
        process.stdout.write(lines.join("\n") + "\n");
        if (result.ok === false) process.exit(1);
      }
    } catch (err) {
      await fail(parsed.flags, err);
    }
    return;
  }
  if (cmd === "job") {
    try {
      const view = await cmdJob(parsed.flags, sub);
      printJob(parsed.flags, view, view && view.job_id ? `aziel-runtime job ${view.job_id}` : "aziel-runtime --help");
      if (view && view.code === "job_not_found") process.exit(1);
    } catch (err) {
      await fail(parsed.flags, err);
    }
    return;
  }
  if (cmd === "service") {
    try {
      await cmdService(parsed.flags, sub);
    } catch (err) {
      await fail(parsed.flags, err);
    }
    return;
  }
  if (cmd !== "session") {
    failText(parsed.flags, `Unknown command "${cmd}".\nNext: aziel-runtime --help\n`, `Unknown command "${cmd}"`);
  }
  if (!sub) {
    failText(
      parsed.flags,
      "Session needs a command.\nNext: aziel-runtime session open --local\n      aziel-runtime session --help\n",
      "Session needs a command",
    );
  }
  try {
    if (sub === "open") emit(parsed.flags, "open", await cmdOpen(parsed.flags));
    else if (sub === "policy") emit(parsed.flags, "policy", await cmdPolicy(parsed.flags));
    else if (sub === "exec") {
      if (!rest[0] || !rest[1]) {
        failText(
          parsed.flags,
          "session exec needs a slug and an op.\nNext: aziel-runtime session exec foldlock fold-preview '{\"text\":\"hello\"}' --local\n",
          "session exec needs a slug and an op",
        );
      }
      if (parsed.flags.background && !parsed.flags.finish_job) {
        const id = await resolveId(parsed.flags);
        await loadLocal(id);
        const job = { job_id: newJobId(), slug: rest[0], op: rest[1], phase: "running", ok: false, receipt: null, session_id: id };
        await writeJobFile(HOME, job);
        const payloadText = rest[2] != null ? rest[2] : parsed.flags.payload != null ? parsed.flags.payload : "{}";
        spawnFinish(["session", "exec", rest[0], rest[1], String(payloadText), "--local", "--finish-job", job.job_id]);
        printJob(parsed.flags, await readJobFile(HOME, job.job_id), `aziel-runtime job ${job.job_id}`);
      } else {
        const result = await cmdExec(parsed.flags, rest[0], rest[1], rest[2]);
        if (parsed.flags.finish_job) {
          const hash = result && result.receipt && result.receipt.hash;
          const honest = typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash) && !/^0{64}$/.test(hash);
          await writeJobFile(HOME, {
            job_id: parsed.flags.finish_job,
            slug: rest[0],
            op: rest[1],
            phase: honest ? "complete" : "running",
            ok: honest,
            receipt: honest ? { hash, event: result.receipt.event || "exec" } : null,
            ledger_tip: honest ? { hash } : null,
            result: honest ? result.result || null : null,
            code: honest ? "FG-OK" : "FG-ERR",
            message: honest ? "Done. Receipt is ready." : "Running. No completion receipt yet.",
          });
        }
        if (!parsed.flags.finish_job) emit(parsed.flags, "exec", result);
      }
    } else if (sub === "receipt") emit(parsed.flags, "receipt", await cmdReceipt(parsed.flags, false));
    else if (sub === "receipts") emit(parsed.flags, "receipts", await cmdReceipt(parsed.flags, true));
    else if (sub === "close") emit(parsed.flags, "close", await cmdClose(parsed.flags));
    else if (sub === "status") emit(parsed.flags, "status", await cmdStatus(parsed.flags));
    else {
      failText(
        parsed.flags,
        `Unknown session command "${sub}".\nNext: aziel-runtime session --help\n`,
        `Unknown session command "${sub}"`,
      );
    }
  } catch (err) {
    await fail(parsed.flags, err);
  }
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === self) {
  main();
}

export { main, parseArgs };

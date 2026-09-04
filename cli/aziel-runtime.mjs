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
 * (receipts still first-class; exec may forward to the proxy).
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

const DEFAULT_URL = process.env.AZIEL_RUNTIME_URL || "https://aziel-runtime.vibelock.workers.dev";
const UA = "Mozilla/5.0";
const HOME = process.env.AZIEL_RUNTIME_HOME || join(homedir(), ".aziel-runtime");

function usage() {
  return `aziel-runtime ${RUNTIME_VERSION} — session client (Aziel Eliab)

Usage:
  aziel-runtime session open [--local] [--url URL]
  aziel-runtime session policy [--id ID] [--allow-slugs a,b] [--allow-ops x,y] [--max-payload N]
  aziel-runtime session exec <slug> <op> [payload-json]
  aziel-runtime session receipt [--id ID] [--all]
  aziel-runtime session receipts
  aziel-runtime session close
  aziel-runtime session status

Default: Worker session at ${DEFAULT_URL}
--local: filesystem session under ${HOME} (optional exec forward to Worker /p/{slug}/{op})
1.2.0 is Worker session + in-repo CLI. No counted runtime tarball.
Proxy /p/{slug}/{op} is not exec. Hosted AZAI is not the local blend.
`;
}

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--local") out.flags.local = true;
    else if (a === "--remote") out.flags.local = false;
    else if (a === "--all") out.flags.all = true;
    else if (a === "--help" || a === "-h") out.flags.help = true;
    else if (a === "--url") out.flags.url = argv[++i];
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

async function remote(url, path, init = {}) {
  const headers = { "User-Agent": UA, Accept: "application/json", ...(init.headers || {}) };
  const res = await fetch(url.replace(/\/$/, "") + path, { ...init, headers });
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
  });
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
    })),
  };
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
    const started = Date.now();
    let status = 502;
    let responseText = "";
    let error = null;
    let upstream = `${url}/p/${slug}/${op}`;
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
    const reqDig = await digestText(payloadText);
    const resDig = await digestText(responseText);
    const receipt = await commitExec(
      session,
      {
        intent,
        status,
        latencyMs: Date.now() - started,
        requestDigest: reqDig.sha256,
        responseDigest: resDig.sha256,
        error,
        upstream,
        responseBytes: resDig.bytes,
        contentType: "application/json",
      },
      new Date().toISOString(),
    );
    await saveLocal(session);
    return { ok: true, mode: "local", session: publicSession(session), receipt, exec: { slug, op, status, upstream, error } };
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
    })),
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
  return { ok: true, mode: "worker", ...(await remote(url, path)) };
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
  return { ok: true, mode: "worker", ...(await remote(url, `/v1/session/${id}/close`, { method: "POST" })) };
}

async function cmdStatus(flags) {
  if (flags.local) {
    const id = await resolveId(flags);
    const session = await loadLocal(id);
    return { ok: true, mode: "local", session: publicSession(session) };
  }
  const id = await resolveId(flags);
  const url = flags.url || DEFAULT_URL;
  return { ok: true, mode: "worker", ...(await remote(url, `/v1/session/${id}`)) };
}

async function main() {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);
  if (parsed.flags.help || parsed._.length === 0) {
    process.stdout.write(usage());
    process.exit(parsed.flags.help || parsed._.length === 0 ? 0 : 1);
  }
  const [cmd, sub, ...rest] = parsed._;
  if (cmd !== "session") {
    process.stderr.write(usage());
    process.exit(1);
  }
  try {
    if (sub === "open") print(await cmdOpen(parsed.flags));
    else if (sub === "policy") print(await cmdPolicy(parsed.flags));
    else if (sub === "exec") print(await cmdExec(parsed.flags, rest[0], rest[1], rest[2]));
    else if (sub === "receipt") print(await cmdReceipt(parsed.flags, false));
    else if (sub === "receipts") print(await cmdReceipt(parsed.flags, true));
    else if (sub === "close") print(await cmdClose(parsed.flags));
    else if (sub === "status") print(await cmdStatus(parsed.flags));
    else {
      process.stderr.write(usage());
      process.exit(1);
    }
  } catch (err) {
    print({ ok: false, error: err.message, status: err.status || 1, body: err.body || null });
    process.exit(1);
  }
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === self) {
  main();
}

export { main, parseArgs };

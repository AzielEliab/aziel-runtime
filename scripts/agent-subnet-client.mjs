#!/usr/bin/env node
/**
 * AGENT-SUBNET-1.0 reference client (library + CLI). Keys are generated and kept HERE, on the agent.
 * The relay only ever sees public keys, signatures, and sealed boxes. Paper: docs/designs/AGENT-SUBNET-1.0.md
 *
 *   node scripts/agent-subnet-client.mjs keygen <name>            # writes ~/.aziel-agent/<name>.json (0600)
 *   node scripts/agent-subnet-client.mjs register <agent> <owner> [--discoverable] [--caps chat,task]
 *   node scripts/agent-subnet-client.mjs grant <fromAgent> <toAgentId> <ownerTo> [ownerFrom] [--days 7]
 *   node scripts/agent-subnet-client.mjs send <fromAgent> <toAgentId> <grantId> <text...>
 *   node scripts/agent-subnet-client.mjs pull <agent>             # pulls, verifies, opens, acks
 *   node scripts/agent-subnet-client.mjs view <agent|owner> [--owner]   # scoped receipts
 * RELAY=<origin> (default https://aziel-runtime.vibelock.workers.dev). Never paste key files anywhere.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { importIdentity, signObject, verifyObject } from "../src/fed-mesh/identity.js";
import { sealPlaintext, openCiphertext } from "../src/fed-mesh/e2e.js";
import { canonicalize, sha256Hex } from "../src/session-core.js";

export const V = "AGENT-SUBNET-1.0";
export const ALG = "x25519-hkdf-sha256-aes256gcm";
const rnd = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
export const nonce = () => rnd(16);
const iso = (ms = Date.now()) => new Date(ms).toISOString();

export async function newKeys() {
  return { seed: rnd(32), encSeed: rnd(32) };
}
const hexToBytes = (h) => Uint8Array.from(h.match(/../g).map((x) => parseInt(x, 16)));
export async function identityOf(keys) {
  return importIdentity({ seed: hexToBytes(keys.seed), encSeed: hexToBytes(keys.encSeed) });
}

export async function registerStatement(agent, owner, { discoverable = false, caps = [], t = iso() } = {}) {
  const st = { v: V, kind: "agent-register", agent_id: agent.handle, public_key: agent.public_key, enc_public_key: agent.enc_public_key, owner_public_key: owner.public_key, discoverable, caps, t, nonce: nonce() };
  return { ...st, sig: await signObject(agent.privateKey, st), owner_sig: await signObject(owner.privateKey, st) };
}
export async function grantStatement({ from, to, ownerTo, ownerFrom = null, days = 7, t = iso(), expiresAt = null }) {
  const st = { v: V, kind: "agent-grant", from, to, scopes: ["send"], expires_at: expiresAt || iso(Date.parse(t) + days * 86400000), t, nonce: nonce() };
  const out = { ...st, owner_sig_to: await signObject(ownerTo.privateKey, st) };
  if (ownerFrom) out.owner_sig_from = await signObject(ownerFrom.privateKey, st);
  return { statement: out, grant_id: await sha256Hex(canonicalize(st)) };
}
export async function revokeStatement({ grantId, owner, t = iso() }) {
  const st = { v: V, kind: "agent-revoke", grant_id: grantId, by_owner_public_key: owner.public_key, t, nonce: nonce() };
  return { ...st, owner_sig: await signObject(owner.privateKey, st) };
}
export async function sealBox({ from, to, toEncPublicKey, plaintext, n }) {
  const sealed = await sealPlaintext({ fromHandle: from, toHandle: to, seq: n, recipientEncPublicKey: toEncPublicKey, plaintext });
  if (!sealed) throw new Error("seal failed");
  return { alg: ALG, eph_public_key: sealed.eph_public_key, nonce: sealed.nonce, ciphertext: sealed.ciphertext };
}
export async function sendStatement({ agent, to, toEncPublicKey, grantId, plaintext, carrier = "auto", t = iso(), box = null }) {
  const n = nonce();
  const b = box || (await sealBox({ from: agent.handle, to, toEncPublicKey, plaintext, n }));
  const st = { v: V, kind: "agent-send", from: agent.handle, to, grant_id: grantId, carrier, alg: b.alg, box_sha256: await sha256Hex(canonicalize(b)), t, nonce: n };
  return { ...st, sig: await signObject(agent.privateKey, st), box: b };
}
export async function simpleStatement(kind, agent, extra = {}, t = iso()) {
  const st = { v: V, kind, agent_id: agent.handle, ...extra, t, nonce: nonce() };
  return { ...st, sig: await signObject(agent.privateKey, st) };
}
export async function viewStatement({ who, scope = "agent", challenge, t = iso() }) {
  const st = { v: V, kind: "agent-view", scope, subject_public_key: who.public_key, challenge, t, nonce: nonce() };
  return { ...st, sig: await signObject(who.privateKey, st) };
}
/** Receiver side: verify the sender's signature and box hash, then open the box. */
export async function openMessage(me, msg) {
  const { sig, ...st } = msg.statement;
  if (!msg.sender_public_key || !(await verifyObject(msg.sender_public_key, st, sig))) return { verdict: "failed", why: "sender signature" };
  if ((await sha256Hex(canonicalize(msg.box))) !== st.box_sha256) return { verdict: "failed", why: "box hash" };
  const text = await openCiphertext({ encPrivateKey: me.encPrivateKey, fromHandle: st.from, toHandle: st.to, seq: st.nonce, nonce: msg.box.nonce, eph_public_key: msg.box.eph_public_key, ciphertext: msg.box.ciphertext });
  return text == null ? { verdict: "failed", why: "decrypt" } : { verdict: "verified", plaintext: text };
}

// ---------- CLI ----------
async function cli(argv) {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");
  const dir = path.join(os.homedir(), ".aziel-agent");
  const relay = (process.env.RELAY || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  const load = async (name) => identityOf(JSON.parse(fs.readFileSync(path.join(dir, name + ".json"), "utf8")));
  const post = async (verb, body) => (await fetch(`${relay}/v1/mesh/agents/${verb}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
  const get = async (p) => (await fetch(relay + p)).json();
  const flag = (f) => argv.includes(f);
  const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
  const [cmd, a, b, c, d] = argv;
  const out = (x) => console.log(JSON.stringify(x, null, 2));
  if (cmd === "keygen") {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, a + ".json");
    if (fs.existsSync(file)) throw new Error("exists: " + file);
    fs.writeFileSync(file, JSON.stringify(await newKeys()), { mode: 0o600 });
    const id = await load(a);
    return out({ name: a, handle: id.handle, public_key: id.public_key, enc_public_key: id.enc_public_key, file });
  }
  if (cmd === "register") return out(await post("register", await registerStatement(await load(a), await load(b), { discoverable: flag("--discoverable"), caps: (opt("--caps", "") || "").split(",").filter(Boolean) })));
  if (cmd === "grant") {
    const g = await grantStatement({ from: (await load(a)).handle, to: b, ownerTo: await load(c), ownerFrom: d && !d.startsWith("--") ? await load(d) : null, days: Number(opt("--days", 7)) });
    return out({ grant_id: g.grant_id, result: await post("grant", g.statement) });
  }
  if (cmd === "send") {
    const dirEntry = await get(`/v1/mesh/agents/directory?agent_id=${encodeURIComponent(b)}`);
    if (!dirEntry.ok) return out(dirEntry);
    return out(await post("send", await sendStatement({ agent: await load(a), to: b, toEncPublicKey: dirEntry.agent.enc_public_key, grantId: c, plaintext: argv.slice(4).join(" ") })));
  }
  if (cmd === "pull") {
    const me = await load(a);
    const got = await post("pull", await simpleStatement("agent-pull", me));
    if (!got.ok) return out(got);
    const acks = [];
    for (const m of got.messages) { const o = await openMessage(me, m); acks.push({ msg_id: m.msg_id, verdict: o.verdict }); console.log(m.msg_id, o.verdict, o.plaintext ?? ""); }
    if (acks.length) out(await post("ack", await simpleStatement("agent-ack", me, { acks })));
    return;
  }
  if (cmd === "view") {
    const ch = await get("/v1/mesh/agents/challenge");
    const st = await viewStatement({ who: await load(a), scope: flag("--owner") ? "owner" : "agent", challenge: ch.challenge });
    if (flag("--print")) return out(st); // paste into a viewer page; it carries no private key
    return out(await post("receipts", st));
  }
  console.error("usage: see header of scripts/agent-subnet-client.mjs");
  process.exitCode = 2;
}
if (import.meta.url === `file://${process.argv[1]}`) cli(process.argv.slice(2)).catch((e) => { console.error(String(e && e.message || e)); process.exitCode = 1; });

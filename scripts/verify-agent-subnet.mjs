/**
 * AGENT-SUBNET-1.0: zero-trust, privacy-first agent subnet on the node mesh.
 * Signature fail closes, plaintext never persisted, viewer scoping, lattice + tether, caps, carriers,
 * FragGate door, refusals sealed with fixed reasons. Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { memorySessionNamespace } from "../src/session-do.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
import { verify, loadChain, append, INTERNAL_CHAINS, ROSTER } from "../src/chainlock/ops.js";
import { memoryMeshKv } from "../src/mesh.js";
import { memoryRateQuotaNamespace } from "../src/rate-quota.js";
import { ANCHOR_CHAINS } from "../src/anchor.js";
import { TETHER_CHAINS } from "../src/azos-tether.js";
import { meshHttpOp } from "../src/auto-gate.js";
import { verifyLattice } from "../src/dual-lattice.js";
import * as C from "./agent-subnet-client.mjs";

globalThis.fetch = async () => { throw new Error("verify-agent-subnet: offline"); };
const handler = (await import("../src/index.js")).default.fetch;
(await import("../src/anchor.js")).resetAnchorMemo();
const S = await import("../src/agent-subnet.js");
const uses = memoryMeshKv();
const env = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}), USES: uses, RATE: memoryRateQuotaNamespace({}) };
const store = storeFor(env);
const ctx = { waitUntil() {} };
// The F03 edge limits (mesh_mutate / agent_read, 30-60/min per IP) are raised for the functional groups
// below, which all run from one "local" client; group 30 checks the real edge limits on a fresh env.
const EDGE_OFF = Object.freeze({ mesh_mutate: 1e6, agent_read: 1e6 });
// Public agentcomms reads (snapshot, heads, row pages, tether) move once an hour; this runs fn as if
// the next hour had started (statements are signed outside it, so the skew check is untouched).
let hourShift = 0;
// The writer DO's per-minute caps read the real clock: start minute-window groups well clear of a boundary.
const freshMinute = async () => { const left = 60000 - (Date.now() % 60000); if (left < 20000) await new Promise((r) => setTimeout(r, left + 250)); };
const nextHour = async (fn) => { hourShift += 3600e3; S._setAgentClock(() => Date.now() + hourShift); try { return await fn(); } finally { S._setAgentClock(null); } };
const call = (path, init = {}, e = env) => { if (e && !e.__aziel_rate_limits && !e.__edge_real) e.__aziel_rate_limits = EDGE_OFF; return handler(new Request("https://aziel-runtime.example" + path, init), e, ctx); };
const post = async (verb, body, e = env) => { const r = await call("/v1/mesh/agents/" + verb, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, e); return { status: r.status, body: await r.json() }; };
let n = 0;
const ok = (x, m) => { assert.ok(x, m); };

// 0) wiring: internal chain, anchored, tethered, mesh ops on the FragGate door; not on the public roster.
ok(INTERNAL_CHAINS.includes("agentcomms") && !ROSTER.includes("agentcomms"));
ok(ANCHOR_CHAINS.includes("agentcomms") && TETHER_CHAINS.includes("agentcomms"));
assert.equal(meshHttpOp("/v1/mesh/agents/send"), "agent-send");
const forged = await append(store, { c: "agentcomms", f: "forged" });
assert.equal(forged.ok, false); assert.equal(forged.refuse, "unknown-chain"); n++;

// 1) status is honest.
let r = await call("/v1/mesh/agents");
let b = await r.json();
assert.equal(r.status, 200); assert.equal(b.spec, "AGENT-SUBNET-1.0");
assert.equal(b.live, false); assert.equal(b.agent_subnet.live, false); assert.equal(b.relay_sees_plaintext, false);
assert.equal(b.alt_internet_live, false); assert.equal(b.second_device, false); assert.equal(b.new_mcp_tool, false); n++;

// identities: two owners (independent users), three agents.
const ownerA = await C.identityOf(await C.newKeys());
const ownerB = await C.identityOf(await C.newKeys());
const a1 = await C.identityOf(await C.newKeys());
const a2 = await C.identityOf(await C.newKeys());
const b1 = await C.identityOf(await C.newKeys());

// 2) register: both signatures required; id must be the key hash; private keys refused.
let reg = await C.registerStatement(a1, ownerA, { discoverable: true, caps: ["chat"] });
let bad = { ...reg, owner_sig: reg.sig };
let x = await post("register", bad);
assert.equal(x.status, 403); assert.equal(x.body.code, "AGENT-OWNER-SIG");
assert.equal(x.body.refusal_receipt.sealed, true); assert.equal(x.body.refusal_receipt.chain, "refusals");
x = await post("register", { ...reg, agent_id: b1.handle });
ok(["AGENT-ID-MISMATCH", "AGENT-SIG-INVALID"].includes(x.body.code));
x = await post("register", { ...reg, private_key: "zz" });
assert.equal(x.body.code, "AGENT-PRIVATE-KEY");
x = await post("register", reg);
assert.equal(x.status, 200, JSON.stringify(x.body)); assert.equal(x.body.receipt.sealed, true); assert.equal(x.body.receipt.chain, "agentcomms");
x = await post("register", reg);
assert.equal(x.body.code, "AGENT-REPLAY");
assert.equal((await post("register", await C.registerStatement(a2, ownerA))).status, 200);
assert.equal((await post("register", await C.registerStatement(b1, ownerB, { discoverable: false }))).status, 200);
n++;

// 3) directory lists only discoverable agents and never owners.
b = await (await call("/v1/mesh/agents/directory")).json();
assert.equal(b.count, 1); assert.equal(b.agents[0].agent_id, a1.handle); ok(!JSON.stringify(b).includes(ownerA.public_key));
b = await (await call("/v1/mesh/agents/directory?agent_id=" + encodeURIComponent(b1.handle))).json();
assert.equal(b.agent.enc_public_key, b1.enc_public_key); assert.equal(b.owner_listed, false); n++;

// 4) default deny: no grant, no message.
const SECRET = "the meeting moves to thursday at noon; bring the folder";
let send = await C.sendStatement({ agent: a1, to: b1.handle, toEncPublicKey: b1.enc_public_key, grantId: "0".repeat(64), plaintext: SECRET });
x = await post("send", send);
assert.equal(x.status, 403); assert.equal(x.body.code, "AGENT-NO-GRANT");
assert.equal(x.body.agentcomm_receipt.sealed, true); assert.equal(x.body.agentcomm_receipt.kind, "refuse"); n++;

// 5) cross-owner grant needs BOTH owners.
let g = await C.grantStatement({ from: a1.handle, to: b1.handle, ownerTo: ownerB });
x = await post("grant", g.statement);
assert.equal(x.body.code, "AGENT-OWNER-SIG");
g = await C.grantStatement({ from: a1.handle, to: b1.handle, ownerTo: ownerB, ownerFrom: ownerA });
x = await post("grant", g.statement);
assert.equal(x.status, 200, JSON.stringify(x.body)); assert.equal(x.body.cross_owner, true); assert.equal(x.body.owners_signed, 2);
assert.equal(x.body.grant_id, g.grant_id);
const gSame = await C.grantStatement({ from: a2.handle, to: a1.handle, ownerTo: ownerA });
assert.equal((await post("grant", gSame.statement)).body.owners_signed, 1); n++;

// 6) signature fail closes: tampered statement, wrong key, tampered box.
send = await C.sendStatement({ agent: a1, to: b1.handle, toEncPublicKey: b1.enc_public_key, grantId: g.grant_id, plaintext: SECRET });
x = await post("send", { ...send, carrier: "internet-relay" });
assert.equal(x.body.code, "AGENT-SIG-INVALID"); assert.equal(x.status, 403);
const forgedBy = await C.sendStatement({ agent: a2, to: b1.handle, toEncPublicKey: b1.enc_public_key, grantId: g.grant_id, plaintext: SECRET });
x = await post("send", { ...forgedBy, from: a1.handle });
assert.equal(x.body.code, "AGENT-SIG-INVALID");
const box2 = { ...send.box, ciphertext: send.box.ciphertext.slice(0, -4) + "AAAA" };
x = await post("send", { ...send, box: box2 });
assert.equal(x.body.code, "AGENT-BOX-HASH"); n++;

// 7) plaintext is refused, never stored: extra fields, a plaintext "box".
x = await post("send", { ...send, text: SECRET });
assert.equal(x.body.code, "AGENT-PLAINTEXT-FIELD");
x = await post("send", { ...send, box: { ...send.box, message: SECRET } });
assert.equal(x.body.code, "AGENT-PLAINTEXT-FIELD");
const plainBox = { alg: C.ALG, eph_public_key: send.box.eph_public_key, nonce: send.box.nonce, ciphertext: Buffer.from(SECRET + SECRET).toString("base64url") };
const plainSend = await C.sendStatement({ agent: a1, to: b1.handle, grantId: g.grant_id, box: plainBox });
x = await post("send", plainSend);
assert.equal(x.body.code, "AGENT-PLAINTEXT-SUSPECT"); n++;

// 8) carriers in Plane P order: a named radio refuses honestly; auto falls back to the internet relay.
const radio = await C.sendStatement({ agent: a1, to: b1.handle, toEncPublicKey: b1.enc_public_key, grantId: g.grant_id, plaintext: SECRET, carrier: "bluetooth" });
x = await post("send", radio);
assert.equal(x.body.code, "AGENT-CARRIER-ABSENT"); assert.equal(x.body.absent_code, "QNM-RADIO-ABSENT"); assert.match(x.body.order, /LAN → Wi-Fi → Bluetooth → RF → Photon/); n++;

// 9) a real send: verified, sealed, ciphertext only.
x = await post("send", send);
assert.equal(x.status, 200, JSON.stringify(x.body)); assert.equal(x.body.carrier, "internet-relay"); assert.equal(x.body.fallback, true);
assert.equal(x.body.receipt.sealed, true); const msgId = x.body.msg_id;
x = await post("send", send);
assert.equal(x.body.code, "AGENT-REPLAY"); n++;

// 10) plaintext never persisted: not in KV, not on any chain.
const dumpKv = JSON.stringify([...uses._store.entries()]);
ok(!dumpKv.includes(SECRET) && !dumpKv.includes("thursday"), "plaintext in KV");
const commRows = await loadChain(store, "agentcomms");
const refRows = await loadChain(store, "refusals");
const dumpChains = JSON.stringify([commRows, refRows]);
ok(!dumpChains.includes("thursday"), "plaintext on chain");
// receipts hold no raw ids, no public keys, no IPs.
for (const id of [a1, a2, b1, ownerA, ownerB]) { ok(!dumpChains.includes(id.handle), "raw id on chain"); ok(!dumpChains.includes(id.public_key), "public key on chain"); }
ok(!/\b\d{1,3}(\.\d{1,3}){3}\b/.test(dumpChains), "ip on chain");
// refusals carry the fixed reason + reason_sha256, never caller text.
const agentRefusals = refRows.filter((row) => row.refusal && row.refusal.surface === "agent-subnet");
ok(agentRefusals.length > 0);
for (const row of agentRefusals) { ok(/^[a-f0-9]{64}$/.test(row.refusal.reason_sha256)); assert.equal(row.refusal.reason, null, "reason:null on the row (like refusal-doors)"); }
// mailbox keys are salted hashes; a stored box holds no raw recipient id (the sender id stays: it is
// needed to verify the signature and open the box; see the paper).
for (const [k, v] of uses._store.entries()) {
  if (!k.includes("|box|")) continue;
  ok(!k.includes(b1.handle) && !k.includes(a1.handle), "raw id in a mailbox key");
  ok(!String(v).includes(b1.handle), "raw recipient id in a stored box");
}
// no agent state in KV at all (it lives in the state Durable Object).
ok(![...uses._store.keys()].some((k) => /agentnet\|(agent|owner|grant|seen|salt)\|?/.test(k)), "agent state in eventually consistent KV");
n++;

// 11) pull: deliver receipt, receiver verifies end to end and opens; ack: read receipt, box deleted.
const pull = await post("pull", await C.simpleStatement("agent-pull", b1));
assert.equal(pull.status, 200, JSON.stringify(pull.body)); assert.equal(pull.body.count, 1);
const m0 = pull.body.messages[0];
assert.equal(m0.msg_id, msgId); assert.equal(m0.receipt.kind, "deliver");
const opened = await C.openMessage(b1, m0);
assert.equal(opened.verdict, "verified"); assert.equal(opened.plaintext, SECRET);
const intruder = await C.openMessage(a2, m0); assert.equal(intruder.verdict, "failed");
const ack = await post("ack", await C.simpleStatement("agent-ack", b1, { acks: [{ msg_id: msgId, verdict: "verified" }] }));
assert.equal(ack.status, 200); assert.equal(ack.body.acks[0].read, true); assert.equal(ack.body.ciphertext_deleted, 1);
ok(![...uses._store.keys()].some((k) => k.includes("|box|")), "box kept after read");
// another agent cannot pull b1's mailbox by naming it.
const steal = await C.simpleStatement("agent-pull", a2);
x = await post("pull", { ...steal, agent_id: b1.handle });
assert.equal(x.body.code, "AGENT-SIG-INVALID"); n++;

// 12) still live:false; e2e observed is a count, not a flag.
b = await (await call("/v1/mesh/agents")).json();
assert.equal(b.live, false); assert.equal(b.agent_subnet.live, false); assert.equal(b.agent_subnet.e2e_verified_observed, "<10", "public counts are bucketed"); n++;

// 13) revoke: owner-signed, recorded, and the grant stops working.
x = await post("revoke", await C.revokeStatement({ grantId: g.grant_id, owner: ownerB }));
assert.equal(x.status, 200); assert.equal(x.body.receipt.kind, "revoke");
const after = await C.sendStatement({ agent: a1, to: b1.handle, toEncPublicKey: b1.enc_public_key, grantId: g.grant_id, plaintext: "again" });
x = await post("send", after);
assert.equal(x.body.code, "AGENT-GRANT-REVOKED");
x = await post("revoke", await C.revokeStatement({ grantId: gSame.grant_id, owner: ownerB }));
assert.equal(x.body.code, "AGENT-OWNER-SIG");
// (HIGH 1) a revoked grant can't be resurrected: replaying the grant statement refuses, and even past
// the replay keys the state DO never overwrites a grant and keeps the revocation tombstone.
x = await post("grant", g.statement);
ok(["AGENT-REPLAY", "AGENT-GRANT-REVOKED"].includes(x.body.code), x.body.code);
const stateOp = (op, args = {}) => store._json("__agentnet__", "/agentnet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, ...args }) });
let so = await stateOp("grant_add", { grant: { grant_id: g.grant_id, from: a1.handle, to: b1.handle, scopes: ["send"], expires_at: new Date(Date.now() + 86400000).toISOString(), cross_owner: true } });
assert.equal(so.ok, false); assert.equal(so.code, "AGENT-GRANT-REVOKED");
so = await stateOp("grant_get", { grant_id: g.grant_id });
assert.equal(so.revoked, true); ok(so.grant.revoked_at);
so = await stateOp("grant_add", { grant: { grant_id: gSame.grant_id, from: a2.handle, to: a1.handle, scopes: ["send"], expires_at: new Date(Date.now() + 86400000).toISOString(), cross_owner: false } });
assert.equal(so.code, "AGENT-REPLAY", "an existing grant is never overwritten"); n++;

// 13b) (MED 2) revocation reaches in-flight messages: queued boxes under a revoked grant are dropped at
// revoke (sweep) and rechecked at pull (never delivered).
{
  const gq = await C.grantStatement({ from: a2.handle, to: a1.handle, ownerTo: ownerA });
  assert.equal((await post("grant", gq.statement)).status, 200);
  const q1 = await post("send", await C.sendStatement({ agent: a2, to: a1.handle, toEncPublicKey: a1.enc_public_key, grantId: gq.grant_id, plaintext: "queued one" }));
  assert.equal(q1.status, 200, JSON.stringify(q1.body));
  // revoke straight in the state DO (no mailbox sweep), so only the pull-time recheck can stop it.
  assert.equal((await stateOp("revoke", { grant_id: gq.grant_id })).ok, true);
  const pq = await post("pull", await C.simpleStatement("agent-pull", a1));
  assert.equal(pq.status, 200); assert.equal(pq.body.count, 0, "revoked grant: not delivered");
  assert.equal(pq.body.dropped_not_granted["AGENT-GRANT-REVOKED"], 1);
  // the owner path: send under a live grant, revoke with the signed statement, the box is swept at once.
  const gq2 = await C.grantStatement({ from: a2.handle, to: a1.handle, ownerTo: ownerA });
  assert.equal((await post("grant", gq2.statement)).status, 200);
  assert.equal((await post("send", await C.sendStatement({ agent: a2, to: a1.handle, toEncPublicKey: a1.enc_public_key, grantId: gq2.grant_id, plaintext: "queued two" }))).status, 200);
  const rv = await post("revoke", await C.revokeStatement({ grantId: gq2.grant_id, owner: ownerA }));
  assert.equal(rv.status, 200); assert.equal(rv.body.queued_dropped, 1);
  assert.equal((await post("pull", await C.simpleStatement("agent-pull", a1))).body.count, 0);
}
n++;

// 14) expired grant refuses.
const t0 = Date.now();
const gExp = await C.grantStatement({ from: a2.handle, to: b1.handle, ownerTo: ownerB, ownerFrom: ownerA, expiresAt: new Date(t0 + 60_000).toISOString() });
assert.equal((await post("grant", gExp.statement)).status, 200);
S._setAgentClock(() => t0 + 120_000);
const late = await C.sendStatement({ agent: a2, to: b1.handle, toEncPublicKey: b1.enc_public_key, grantId: gExp.grant_id, plaintext: "late", t: new Date(t0 + 120_000).toISOString() });
x = await post("send", late);
assert.equal(x.body.code, "AGENT-GRANT-EXPIRED");
S._setAgentClock(null); n++;

// 15) viewer scoping: public aggregates only; agent sees only its rows; owner sees its agents; replayed view refused.
b = await (await call("/v1/mesh/agents/receipts")).json();
assert.equal(b.scope, "public"); assert.equal(b.rows_shown, 0); ok(!("receipts" in b));
// (MED 7) bucketed, hourly: small counts show "<10", larger ones are rounded down to tens; no exact totals.
assert.equal(b.refresh, "hourly"); assert.equal(b.k_min, 10); ok(/^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(b.as_of));
ok(Object.values(b.by_kind).every((v) => v === "<10" || /^\d+0\+$/.test(v)), JSON.stringify(b.by_kind));
ok(typeof b.total === "string" && (b.total === "<10" || /^\d+0\+$/.test(b.total)));
assert.equal(S.bucket(0), "<10"); assert.equal(S.bucket(9), "<10"); assert.equal(S.bucket(10), "10+"); assert.equal(S.bucket(47), "40+");
// the snapshot holds for the hour: a new event does not change it.
const snapTip = JSON.stringify(b.tip);
ok(!JSON.stringify(b).includes("from_h"));
const allRows = await loadChain(store, "agentcomms");
const salt = await S._saltForTest(env);
ok(/^[a-f0-9]{64}$/.test(salt));
const H = async (id) => (await (await import("../src/session-core.js")).sha256Hex(`AGENT-SUBNET-1.0|${salt}|${id}`)).slice(0, 32);
const [hA1, hA2, hB1] = [await H(a1.handle), await H(a2.handle), await H(b1.handle)];
let ch = await (await call(C.challengePath(b1, "agent"))).json();
assert.equal(ch.single_use, true);
let view = await C.viewStatement({ who: b1, challenge: ch.challenge });
x = await post("receipts", view);
assert.equal(x.status, 200, JSON.stringify(x.body)); ok(x.body.matched > 0);
for (const row of x.body.receipts) { const a = row.agentcomm; ok([a.from_h, a.to_h, a.agent_h].includes(hB1), "foreign row in b1 view"); }
const foreign = allRows.filter((row) => { const a = row.agentcomm || {}; return ![a.from_h, a.to_h, a.agent_h].includes(hB1); }).length;
ok(foreign > 0 && x.body.matched < allRows.length);
x = await post("receipts", view);
assert.equal(x.body.code, "AGENT-REPLAY");
// (LOW 9) single use: a fresh statement over the same challenge is refused.
x = await post("receipts", await C.viewStatement({ who: b1, challenge: ch.challenge }));
assert.equal(x.body.code, "AGENT-CHALLENGE", "challenge reused");
// bound to scope and subject: an agent-scope challenge doesn't work for owner scope or another key.
ch = await (await call(C.challengePath(ownerA, "agent"))).json();
x = await post("receipts", await C.viewStatement({ who: ownerA, scope: "owner", challenge: ch.challenge }));
assert.equal(x.body.code, "AGENT-CHALLENGE", "scope not bound");
ch = await (await call(C.challengePath(a2, "agent"))).json();
x = await post("receipts", await C.viewStatement({ who: b1, challenge: ch.challenge }));
assert.equal(x.body.code, "AGENT-CHALLENGE", "subject not bound");
x = await call("/v1/mesh/agents/challenge");
assert.equal(x.status, 400, "a challenge needs a scope and a subject key");
ch = await (await call(C.challengePath(ownerA, "owner"))).json();
x = await post("receipts", await C.viewStatement({ who: ownerA, scope: "owner", challenge: ch.challenge }));
assert.equal(x.status, 200); assert.equal(x.body.agents, 2);
for (const row of x.body.receipts) { const a = row.agentcomm; ok([a.from_h, a.to_h, a.agent_h, a.owner_h, a.by_h].some((h) => h === hA1 || h === hA2 || h === undefined) ); }
ok(!x.body.receipts.some((row) => row.agentcomm.kind === "register" && row.agentcomm.agent_h === hB1), "owner A saw owner B's register");
// a forged challenge or a signature by someone else is refused.
x = await post("receipts", await C.viewStatement({ who: b1, challenge: "1" + "0".repeat(12) + "." + "a".repeat(24) + "." + "b".repeat(32) }));
assert.equal(x.body.code, "AGENT-CHALLENGE");
ch = await (await call(C.challengePath(b1, "agent"))).json();
const v2 = await C.viewStatement({ who: a2, challenge: ch.challenge });
x = await post("receipts", { ...v2, subject_public_key: b1.public_key });
assert.equal(x.body.code, "AGENT-SIG-INVALID");
// public /v1/anchor/rows redacts agentcomm bodies.
b = await nextHour(async () => (await call("/v1/anchor/rows?c=agentcomms&from=1&limit=50")).json());
ok(Array.isArray(b.rows) && b.rows.length > 0, JSON.stringify(b).slice(0, 200)); ok(!JSON.stringify(b).includes(hB1)); ok(b.rows.every((row) => !row.row.agentcomm || row.row.agentcomm.redacted === true));
// (MED 7) no time and no kind on the redacted rows either.
for (const row of b.rows) { ok(!("t" in row.row) && !("s" in row.row) && !("f" in row.row) && !("fact" in row.row), "time/kind on a redacted row: " + Object.keys(row.row)); ok(!row.row.agentcomm || !("kind" in row.row.agentcomm)); }
const blobRows = JSON.stringify(b.rows);
for (const k of ["register", "grant", "deliver", "revoke"]) ok(!blobRows.includes('"' + k + '"'), "kind leaked: " + k);
n++;

// 16) lattice: both hashes on every row; chainlock_verify on the named internal chain holds.
const v = await verify(store, { c: "agentcomms" });
assert.equal(v.ok, true, JSON.stringify(v.breaks)); assert.equal(v.chains[0].c, "agentcomms"); assert.equal(v.chains[0].dual_lattice.lattice_live, true);
const lat = await verifyLattice(allRows);
assert.equal(lat.ok, true); assert.equal(lat.lattice_rows, allRows.length);
ok(allRows.every((row) => /^[a-f0-9]{64}$/.test(row.lattice.primary) && /^[a-f0-9]{64}$/.test(row.lattice.secondary)));
// the stamp fact binds the receipt body (r=<16 hex>)
for (const row of allRows) { const rh = await (await import("../src/session-core.js")).sha256Hex((await import("../src/session-core.js")).canonicalize(row.agentcomm)); ok(row.fact.includes("r=" + rh.slice(0, 16))); }
// default roster walk is unchanged (agentcomms only when named).
const all = await verify(store, {});
ok(!all.chains.some((c) => c.c === "agentcomms")); n++;

// 17) tether: agentcomms rides the signed AZ-OS tether like refusals; AZ-OS recomputes both lattices.
{
  const tether = await import("../src/azos-tether.js");
  const tenv = { TETHER_SIGNING_SEED: "33".repeat(32) /* test-only seed */, GIT_SHA: "c".repeat(40), CHAINLOCK: env.CHAINLOCK, USES: env.USES };
  const key = await tether.tetherKey(tenv);
  const state = new Map();
  const packets = [];
  const fetcher = async (url, init = {}) => {
    const path = new URL(url).pathname;
    if (path === "/v1/tether" && (!init.method || init.method === "GET")) return Response.json({ ok: true, public_key: key.public_key, chains: [...state.values()] });
    if (path === tether.TETHER_ROUTE) {
      const packet = JSON.parse(init.body);
      packets.push(packet);
      const prev = state.get(packet.chain);
      const anchor = prev ? prev.tips : { primary: "0".repeat(64), secondary: "0".repeat(64) };
      const res = await verifyLattice(packet.rows, { pick: (row) => row, anchor, legacyAllowed: false });
      if (!res.ok) return Response.json({ ok: false, code: "TETHER-LINK" }, { status: 409 });
      const row = { chain: packet.chain, tips: res.tips, rows: (prev ? prev.rows : 0) + packet.rows.length, verified: true };
      state.set(packet.chain, row);
      return Response.json({ ok: true, stored: true, verified: true, chain: packet.chain, tips: res.tips, rows: row.rows });
    }
    return new Response("nf", { status: 404 });
  };
  // Same hour as the last snapshot: the tether waits for the hourly tip (no 2-minute timing on AZ-OS).
  const early = await tether.pushChain(tenv, "agentcomms", { store, fetcher, key, acked: null, agentTip: { seq: 1, h: allRows[0].stamp_sha256, lattice: { primary: "f".repeat(64), secondary: "f".repeat(64) } } });
  assert.equal(early.code, "TETHER-HOURLY-WAIT"); assert.equal(early.sent, false);
  const out = await nextHour(() => tether.pushAll(tenv, { store, fetcher, chains: ["agentcomms"] }));
  assert.equal(out.ok, true, JSON.stringify(out).slice(0, 400));
  const row = out.chains.find((c) => c.chain === "agentcomms");
  assert.ok(row, JSON.stringify(out).slice(0, 300) + JSON.stringify(await nextHour(() => S.agentHourlyTip(tenv))));
  assert.equal(row.azos_updated, true);
  const last = allRows[allRows.length - 1];
  assert.equal(state.get("agentcomms").tips.primary, last.lattice.primary);
  assert.equal(state.get("agentcomms").tips.secondary, last.lattice.secondary);
  const blob = JSON.stringify(packets);
  ok(!blob.includes(hB1) && !blob.includes("thursday") && !blob.includes("from_h"), "tether packet carries receipt bodies");
}
n++;

// 18) lattice tip on /v1/receipts includes agentcomms.
b = await (await call("/v1/receipts/tip")).json();
const tipChains = (b.lattice_tip && b.lattice_tip.chains) || [];
ok(tipChains.some((c) => c.c === "agentcomms"), "lattice_tip agentcomms: " + JSON.stringify(b.lattice_tip && b.lattice_tip.code)); n++;

// 19) caps: per-agent send rate, mailbox cap, receipt seal cap (no receipt, no message).
{
  await freshMinute();
  const e2 = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}), USES: memoryMeshKv(), RATE: memoryRateQuotaNamespace({}) };
  const o = await C.identityOf(await C.newKeys()); const s1 = await C.identityOf(await C.newKeys()); const r1 = await C.identityOf(await C.newKeys());
  assert.equal((await post("register", await C.registerStatement(s1, o), e2)).status, 200);
  assert.equal((await post("register", await C.registerStatement(r1, o), e2)).status, 200);
  const gg = await C.grantStatement({ from: s1.handle, to: r1.handle, ownerTo: o });
  assert.equal((await post("grant", gg.statement, e2)).status, 200);
  const codes = [];
  for (let i = 0; i < S.AGENT_SEND_PER_MIN + 2; i++) {
    const st = await C.sendStatement({ agent: s1, to: r1.handle, toEncPublicKey: r1.enc_public_key, grantId: gg.grant_id, plaintext: "m" + i });
    const res = await post("send", st, e2);
    codes.push(res.body.code);
  }
  const sentOk = codes.filter((c) => c === "AGENT-OK").length;
  ok(codes.includes("AGENT-RATE"), "rate limit"); assert.equal(sentOk, S.AGENT_SEND_PER_MIN);
  const st = await C.sendStatement({ agent: s1, to: r1.handle, toEncPublicKey: r1.enc_public_key, grantId: gg.grant_id, plaintext: "late" });
  const rl = await post("send", st, e2);
  assert.equal(rl.status, 429); assert.equal(rl.body.refusal_receipt.sealed, true);
  // receipt cap: force the in-isolate msg-class counter, the send refuses and leaves no box.
  S._resetAgentMemo();
  const boxesBefore = [...e2.USES._store.keys()].filter((k) => k.includes("|box|")).length;
  for (let i = 0; i < S.AGENT_SEAL_CAP_PER_MIN.msg; i++) await S._burnSealForTest("msg");
  const e3 = { ...e2, RATE: memoryRateQuotaNamespace({}) };
  const capped = await post("send", await C.sendStatement({ agent: s1, to: r1.handle, toEncPublicKey: r1.enc_public_key, grantId: gg.grant_id, plaintext: "cap" }), e3);
  assert.equal(capped.body.code, "AGENT-RECEIPT-CAP");
  assert.equal([...e2.USES._store.keys()].filter((k) => k.includes("|box|")).length, boxesBefore, "box left without receipt");
  S._resetAgentMemo();
}
n++;

// 20) fail closed without a durable store; MCP-style door (fraggate_call slug mesh) runs the same op.
{
  const noStore = { SESSION: memorySessionNamespace({}), USES: memoryMeshKv() };
  const res = await post("register", await C.registerStatement(await C.identityOf(await C.newKeys()), ownerA), noStore);
  assert.equal(res.body.code, "AGENT-STORE-UNBOUND"); assert.equal(res.status, 503);
  const fg = await call("/v1/fraggate/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: "mesh", op: "agent-status", payload: {} }) });
  const fb = await fg.json();
  const inner = fb.result || fb;
  assert.equal(fg.status, 200, JSON.stringify(fb).slice(0, 400)); assert.equal(inner.spec, "AGENT-SUBNET-1.0"); assert.equal(inner.live, false);
}
n++;

// 21) the viewer page exists and carries no key input.
r = await call("/agents");
const html = await r.text();
assert.equal(r.status, 200); ok(/Agent subnet/.test(html)); ok(!/type="password"|name="(seed|private|key|secret)/i.test(html), "key input on viewer"); ok(html.includes("/v1/mesh/agents") && html.includes("API+\"/receipts\""));
n++;

// 22) radios off: mutate ops refuse MESH-OFF; nothing here enables the mesh.
{
  const off = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}), USES: memoryMeshKv(), RATE: memoryRateQuotaNamespace({}), MESH_RADIOS: "off" };
  const res = await post("register", await C.registerStatement(await C.identityOf(await C.newKeys()), ownerA), off);
  assert.equal(res.body.code, "MESH-OFF", JSON.stringify(res.body).slice(0, 200));
  const st = await (await call("/v1/mesh/agents", {}, off)).json();
  assert.equal(st.live, false);
  const mesh = await (await call("/v1/mesh", {}, off)).json();
  assert.notEqual(mesh.enabled, true);
}
n++;

// 23) (MED 4 / LOW 13) registration: strongly consistent (no double register under a race), limited per
//     owner key, per visitor IP hash (also when a peer forwards it over the binding), and globally.
{
  const mk = () => ({ SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}), USES: memoryMeshKv(), RATE: memoryRateQuotaNamespace({}) });
  const e = mk();
  const o = await C.identityOf(await C.newKeys());
  const ag = await C.identityOf(await C.newKeys());
  const [r1, r2] = await Promise.all([post("register", await C.registerStatement(ag, o), e), post("register", await C.registerStatement(ag, o), e)]);
  const codes = [r1.body.code, r2.body.code].sort();
  assert.deepEqual(codes, ["AGENT-EXISTS", "AGENT-OK"], "race: exactly one register wins " + codes);
  // per owner key: 3/min (the race above spent 2).
  const more = [];
  for (let i = 0; i < 3; i++) more.push((await post("register", await C.registerStatement(await C.identityOf(await C.newKeys()), o), e)).body.code);
  assert.deepEqual(more, ["AGENT-OK", "AGENT-RATE", "AGENT-RATE"], "owner cap " + more);
  // per IP hash: fresh free owner keys from one visitor stop at 5/min; another visitor still gets in.
  const e2 = mk();
  const regAs = async (ip) => {
    const r = await call("/v1/mesh/agents/register", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify(await C.registerStatement(await C.identityOf(await C.newKeys()), await C.identityOf(await C.newKeys()))) }, e2);
    return (await r.json()).code;
  };
  const fromOne = [];
  for (let i = 0; i < S.AGENT_REGISTER_PER_IP_PER_MIN + 2; i++) fromOne.push(await regAs("198.51.100.7"));
  assert.equal(fromOne.filter((c) => c === "AGENT-OK").length, S.AGENT_REGISTER_PER_IP_PER_MIN, fromOne.join(","));
  assert.equal(fromOne.at(-1), "AGENT-RATE");
  assert.equal(await regAs("203.0.113.9"), "AGENT-OK", "one visitor does not lock out the rest");
  // a peer over the binding (no cf-connecting-ip) forwards its visitor's hash; that hash is the bucket.
  const viaPeer = async (iph) => (await (await call("/v1/mesh/agents/register", { method: "POST", headers: { "content-type": "application/json", "x-azrt-visitor-ip-h": iph }, body: JSON.stringify(await C.registerStatement(await C.identityOf(await C.newKeys()), await C.identityOf(await C.newKeys()))) }, e2)).json()).code;
  const peerCodes = [];
  for (let i = 0; i < S.AGENT_REGISTER_PER_IP_PER_MIN + 1; i++) peerCodes.push(await viaPeer("ab".repeat(16)));
  assert.equal(peerCodes.at(-1), "AGENT-RATE"); assert.equal(await viaPeer("cd".repeat(16)), "AGENT-OK");
  // global cap: 20/min for the whole subnet, whatever the visitor.
  let last = "";
  for (let i = 0; i < S.AGENT_REGISTER_PER_MIN + 2; i++) last = await regAs("192.0.2." + (10 + i));
  assert.equal(last, "AGENT-RATE", "global registration cap");
  // no raw IP anywhere (chains, KV, state).
  const dumpAll = JSON.stringify([[...e2.USES._store.entries()], await loadChain(storeFor(e2), "agentcomms"), await loadChain(storeFor(e2), "refusals"), [...e2.CHAINLOCK._shared.entries()].map(([k, m]) => [k, [...m.entries()]])]);
  ok(!dumpAll.includes("198.51.100.7") && !dumpAll.includes("203.0.113.9"), "raw IP stored");
}
n++;

// 24) (MED 6) owner-signed retire: the agent and every grant it had end at once; queued boxes dropped.
{
  const e = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}), USES: memoryMeshKv(), RATE: memoryRateQuotaNamespace({}) };
  const o = await C.identityOf(await C.newKeys()); const o2 = await C.identityOf(await C.newKeys());
  const s1 = await C.identityOf(await C.newKeys()); const r1 = await C.identityOf(await C.newKeys()); const r2 = await C.identityOf(await C.newKeys());
  for (const [a, w] of [[s1, o], [r1, o], [r2, o2]]) assert.equal((await post("register", await C.registerStatement(a, w, { discoverable: true }), e)).status, 200);
  const g1 = await C.grantStatement({ from: s1.handle, to: r1.handle, ownerTo: o });
  const g2 = await C.grantStatement({ from: s1.handle, to: r2.handle, ownerTo: o2, ownerFrom: o });
  const g3 = await C.grantStatement({ from: r1.handle, to: s1.handle, ownerTo: o });
  for (const g of [g1, g2, g3]) assert.equal((await post("grant", g.statement, e)).status, 200);
  assert.equal((await post("send", await C.sendStatement({ agent: r1, to: s1.handle, toEncPublicKey: s1.enc_public_key, grantId: g3.grant_id, plaintext: "to the soon-retired" }), e)).status, 200);
  assert.equal((await post("send", await C.sendStatement({ agent: s1, to: r2.handle, toEncPublicKey: r2.enc_public_key, grantId: g2.grant_id, plaintext: "from the soon-retired" }), e)).status, 200);
  // only the agent's own owner can retire it.
  let x = await post("retire", await C.retireStatement({ agentId: s1.handle, owner: o2 }), e);
  assert.equal(x.body.code, "AGENT-OWNER-SIG");
  x = await post("retire", await C.retireStatement({ agentId: s1.handle, owner: o }), e);
  assert.equal(x.status, 200, JSON.stringify(x.body)); assert.equal(x.body.grants_revoked, 3); assert.equal(x.body.receipt.kind, "retire"); assert.equal(x.body.queued_dropped, 1);
  // every grant is dead at once; the retired agent can't send, pull, re-register, or be found.
  assert.equal((await post("send", await C.sendStatement({ agent: s1, to: r1.handle, toEncPublicKey: r1.enc_public_key, grantId: g1.grant_id, plaintext: "x" }), e)).body.code, "AGENT-RETIRED");
  assert.equal((await post("send", await C.sendStatement({ agent: r1, to: s1.handle, toEncPublicKey: s1.enc_public_key, grantId: g3.grant_id, plaintext: "x" }), e)).body.code, "AGENT-GRANT-REVOKED");
  assert.equal((await post("pull", await C.simpleStatement("agent-pull", s1), e)).body.code, "AGENT-RETIRED");
  const pr2 = await post("pull", await C.simpleStatement("agent-pull", r2), e);
  assert.equal(pr2.body.count, 0, "message from a retired agent is not delivered"); ok(pr2.body.dropped_not_granted["AGENT-GRANT-REVOKED"] === 1);
  assert.equal((await post("register", await C.registerStatement(s1, o), e)).body.code, "AGENT-RETIRED");
  assert.equal((await (await call("/v1/mesh/agents/directory?agent_id=" + encodeURIComponent(s1.handle), {}, e)).json()).code, "AGENT-RETIRED");
  ok(!(await (await call("/v1/mesh/agents/directory", {}, e)).json()).agents.some((a) => a.agent_id === s1.handle));
  assert.equal((await post("retire", await C.retireStatement({ agentId: s1.handle, owner: o }), e)).body.code, "AGENT-RETIRED");
  assert.equal((await verify(storeFor(e), { c: "agentcomms" })).ok, true);
}
n++;

// 25) (MED 3) receipt caps per class in the writer (msg / ctl / refuse) plus a per-agent refuse cap,
//     a class-full memo (no writer round trip), and refunds only on real write failures.
{
  await freshMinute();
  const { AGENTCOMM_CAP } = await import("../src/agent-state.js");
  assert.equal(AGENTCOMM_CAP.classes.msg + AGENTCOMM_CAP.classes.ctl + AGENTCOMM_CAP.classes.refuse, AGENTCOMM_CAP.total);
  const gst = storeFor({ CHAINLOCK: memoryChainWriterNamespace({}) });
  // Each raw row comes from its own visitor here (the per-visitor share is tested in group 38).
  const row = (kind, i, extra = {}) => ({ c: "agentcomms", k: "agentcomm", s: "agentcomm", f: "agent receipt r=" + i, agentcomm: { spec: "AGENT-SUBNET-1.0", kind, ...extra }, agentcap: { ip: "v:" + kind + ":" + i + ":" + JSON.stringify(extra) }, idempotency_key: "t:" + kind + ":" + i + ":" + JSON.stringify(extra) });
  // refuse rows: 10/min per agent; a different agent still gets its own 10; the refuse share is 120.
  let lastA;
  for (let i = 0; i <= AGENTCOMM_CAP.refuse_per_agent; i++) lastA = await append(gst, row("refuse", i, { from_h: "a".repeat(32) }), { internal: true });
  assert.equal(lastA.ok, false); assert.equal(lastA.refuse, "agentcomm-cap"); assert.equal(lastA.cap_limit, "agent");
  assert.equal((await append(gst, row("refuse", 0, { from_h: "b".repeat(32) }), { internal: true })).ok, true);
  // fill the refuse share with many agents (each under its own cap); messages still seal.
  let filled = AGENTCOMM_CAP.refuse_per_agent + 1, k = 0, rr;
  while (filled < AGENTCOMM_CAP.classes.refuse) { rr = await append(gst, row("refuse", k, { from_h: ("c" + String(k).padStart(31, "0")) }), { internal: true }); if (rr.ok) filled++; k++; }
  rr = await append(gst, row("refuse", 9999, { from_h: "d".repeat(32) }), { internal: true });
  assert.equal(rr.ok, false); assert.equal(rr.cap_class, "refuse"); assert.equal(rr.cap_limit, "class");
  assert.equal((await append(gst, row("send", 1), { internal: true })).ok, true, "refusal spam does not starve sends");
  assert.equal((await append(gst, row("register", 1), { internal: true })).ok, true);
  // replays are never capped.
  const rep = await append(gst, row("refuse", 0, { from_h: "b".repeat(32) }), { internal: true });
  assert.equal(rep.ok, true); assert.equal(rep.replayed, true);
  assert.equal((await verify(gst, { c: "agentcomms" })).ok, true);

  // isolate side: once the writer says the refuse share is full, refuse rows stop calling the writer,
  // and real sends still go through. Count the writer calls with a stub.
  let calls = 0;
  const realNs = memoryChainWriterNamespace({});
  const wrap = (st) => ({ fetch: (req) => { if (new URL(req.url).pathname === "/append") calls++; return st.fetch(req); } });
  const counted = { idFromName: realNs.idFromName, get: (id) => wrap(realNs.get(id)), getByName: (nm) => wrap(realNs.getByName(nm)), _shared: realNs._shared };
  const e = { SESSION: memorySessionNamespace({}), CHAINLOCK: counted, USES: memoryMeshKv(), RATE: memoryRateQuotaNamespace({}) };
  S._resetAgentMemo();
  const o = await C.identityOf(await C.newKeys()); const s1 = await C.identityOf(await C.newKeys()); const r1 = await C.identityOf(await C.newKeys());
  for (const a of [s1, r1]) assert.equal((await post("register", await C.registerStatement(a, o), e)).status, 200);
  const gg = await C.grantStatement({ from: s1.handle, to: r1.handle, ownerTo: o });
  assert.equal((await post("grant", gg.statement, e)).status, 200);
  // fill the writer's refuse share directly (other agents), so the next refuse row from s1 hits the cap.
  const est = storeFor(e);
  for (let i = 0; i < AGENTCOMM_CAP.classes.refuse; i++) await append(est, row("refuse", i, { from_h: "e" + String(i).padStart(31, "0") }), { internal: true });
  const noGrant = async () => post("send", await C.sendStatement({ agent: s1, to: r1.handle, toEncPublicKey: r1.enc_public_key, grantId: "f".repeat(64), plaintext: "spam" }), e);
  let sp = await noGrant();
  assert.equal(sp.body.code, "AGENT-NO-GRANT", "the refusal itself still stands"); assert.equal(sp.body.agentcomm_receipt.status, "rate_limited");
  ok(S._sealMemoForTest().full.includes("refuse"), "refuse class marked full in this isolate");
  calls = 0;
  for (let i = 0; i < 5; i++) { sp = await noGrant(); assert.equal(sp.body.agentcomm_receipt.memo, true); }
  assert.equal(calls, 0, "class full: no agentcomms writer calls for further refuse rows");
  const real = await post("send", await C.sendStatement({ agent: s1, to: r1.handle, toEncPublicKey: r1.enc_public_key, grantId: gg.grant_id, plaintext: "real" }), e);
  assert.equal(real.status, 200, "real sends still seal: " + real.body.code);
  // a real write failure gives the isolate slot back; a cap answer does not.
  S._resetAgentMemo();
  const before = S._sealMemoForTest().used.msg;
  const broken = { SESSION: e.SESSION, USES: e.USES, RATE: e.RATE, CHAINLOCK: { idFromName: realNs.idFromName, getByName: (nm) => (nm === "agentcomms" ? { fetch: async () => { throw new Error("disk full (test)"); } } : realNs.getByName(nm)), get: (id) => realNs.get(id), _shared: realNs._shared } };
  const bf = await post("send", await C.sendStatement({ agent: s1, to: r1.handle, toEncPublicKey: r1.enc_public_key, grantId: gg.grant_id, plaintext: "broken" }), broken);
  assert.equal(bf.body.code, "AGENT-RECEIPT-UNAVAILABLE");
  assert.equal(S._sealMemoForTest().used.msg, before, "real failure: slot refunded");
  S._resetAgentMemo();
}
n++;

// 26) (LOW/MED 8) salt: created once in the state DO; if it is lost while receipts exist, fail closed.
{
  const shared = new Map();
  const e = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}, shared), USES: memoryMeshKv(), RATE: memoryRateQuotaNamespace({}) };
  const o = await C.identityOf(await C.newKeys());
  const [ra, rb] = await Promise.all([post("register", await C.registerStatement(await C.identityOf(await C.newKeys()), o), e), post("register", await C.registerStatement(await C.identityOf(await C.newKeys()), o), e)]);
  assert.equal(ra.status, 200); assert.equal(rb.status, 200);
  const salt1 = await S._saltForTest(e);
  ok(/^[a-f0-9]{64}$/.test(salt1));
  assert.equal(await S._saltForTest(e), salt1, "one salt");
  // The salt is cached per isolate (AZBot N2): this isolate keeps working with the salt it already read.
  shared.get("__agentnet__").delete("salt"); // simulate loss
  const warm = await post("register", await C.registerStatement(await C.identityOf(await C.newKeys()), await C.identityOf(await C.newKeys())), e);
  assert.equal(warm.body.code, "AGENT-OK", "a warm isolate keeps its cached salt");
  S._resetAgentCaches(e); // a fresh isolate: no cached salt, the DO has none, rows exist
  const lost = await post("register", await C.registerStatement(await C.identityOf(await C.newKeys()), await C.identityOf(await C.newKeys())), e);
  assert.equal(lost.body.code, "AGENT-SALT-LOST"); assert.equal(lost.status, 503);
  assert.equal(await S._saltForTest(e), null, "no new salt was minted");
  const st = await (await call("/v1/mesh/agents", {}, e)).json();
  assert.equal(st.operator_can_read_salt, true);
}
n++;

// 27) (LOW 11 / MED 5) honest crypto and wording: one scheme, no forward secrecy, "designed to".
{
  assert.deepEqual([...S.AGENT_ALGS], ["x25519-hkdf-sha256-aes256gcm"]);
  const st = await (await call("/v1/mesh/agents")).json();
  assert.equal(st.crypto.forward_secrecy, false); assert.equal(st.forward_secrecy, false); assert.match(st.crypto.scheme, /X25519.*HKDF-SHA256.*AES-256-GCM/);
  const ws = await (await call("/workspace")).text();
  ok(!/agents talk to other agents with signed, end-to-end sealed messages/.test(ws), "live-tense claim on /workspace");
  ok(/designed to let your AI agents/.test(ws));
  const { NEW_USER_HINTS } = await import("../src/mesh-onboard.js");
  const hint = NEW_USER_HINTS.find((h) => h.id === "agents").text;
  ok(!/only you can open/.test(hint) && /designed to/.test(hint) && /hashed, not encrypted/.test(hint), hint);
  const page = await (await call("/agents")).text();
  ok(/designed to/.test(page) && /hashed, not encrypted/.test(page));
  // the public snapshot is hourly: more events in the same hour don't move it.
  // (The earlier groups already moved the agent clock forward; read at that same hour, before and after a new event.)
  S._setAgentClock(() => Date.now() + hourShift);
  const before = await (await call("/v1/mesh/agents/receipts")).json();
  S._setAgentClock(null);
  const ox = await C.identityOf(await C.newKeys());
  assert.equal((await post("register", await C.registerStatement(await C.identityOf(await C.newKeys()), ox))).body.code, "AGENT-OK");
  S._resetAgentCaches(env); // even with the 60 s cache gone, the hourly snapshot holds
  S._setAgentClock(() => Date.now() + hourShift);
  const b2 = await (await call("/v1/mesh/agents/receipts")).json();
  S._setAgentClock(null);
  assert.equal(JSON.stringify(b2.tip), JSON.stringify(before.tip), "public tip moved inside the hour");
  ok(before.tip && typeof before.tip.seq === "string" && !/^\d+$/.test(before.tip.seq), "public tip seq is bucketed: " + JSON.stringify(before.tip));
}
n++;

// 28) the state DO unreachable: every mutate op fails closed.
{
  const realNs = memoryChainWriterNamespace({});
  const dead = { SESSION: memorySessionNamespace({}), USES: memoryMeshKv(), RATE: memoryRateQuotaNamespace({}), CHAINLOCK: { idFromName: realNs.idFromName, getByName: (nm) => (nm === "__agentnet__" ? { fetch: async () => { throw new Error("down (test)"); } } : realNs.getByName(nm)), get: (id) => realNs.get(id) } };
  const res = await post("register", await C.registerStatement(await C.identityOf(await C.newKeys()), await C.identityOf(await C.newKeys())), dead);
  assert.equal(res.body.ok, false); assert.equal(res.body.code, "AGENT-STORE-UNBOUND"); assert.equal(res.status, 503);
  const ch = await call(C.challengePath(await C.identityOf(await C.newKeys()), "agent"), {}, dead);
  assert.equal(ch.status, 503);
}
n++;

// 29) limiters see the forwarded visitor hash (peers over the binding), never "local" for everyone;
//     a public request's real cf-connecting-ip always wins over the header.
{
  const { clientIp } = await import("../src/production.js");
  assert.equal(clientIp(new Request("https://x.example/", { headers: { "x-azrt-visitor-ip-h": "ab".repeat(16) } })), "vh:" + "ab".repeat(16));
  assert.equal(clientIp(new Request("https://x.example/", { headers: { "cf-connecting-ip": "192.0.2.1", "x-azrt-visitor-ip-h": "ab".repeat(16) } })), "192.0.2.1");
  assert.equal(clientIp(new Request("https://x.example/", { headers: { "x-azrt-visitor-ip-h": "not-hex" } })), "local");
}
n++;

// ---- AZBot re-review of f617097 (N1..N8) ----
const mkEnv = () => ({ SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}), USES: memoryMeshKv(), RATE: memoryRateQuotaNamespace({}) });
const postIp = async (e, verb, body, ip) => { const r = await call("/v1/mesh/agents/" + verb, { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify(body) }, e); return { status: r.status, body: await r.json() }; };
const newId = async () => C.identityOf(await C.newKeys());
/** Count the ops the agent state DO receives (wraps each stub's fetch in place). */
function countAgentOps(e) {
  const ops = [];
  const ns = e.CHAINLOCK;
  const wrap = (st, name) => {
    if (String(name) === "__agentnet__" && !st.__counted) {
      const f = st.fetch.bind(st);
      st.fetch = async (req, ...rest) => { try { ops.push(JSON.parse(await req.clone().text()).op); } catch { ops.push("?"); } return f(req, ...rest); };
      st.__counted = true;
    }
    return st;
  };
  const get = ns.get.bind(ns);
  const byName = ns.getByName.bind(ns);
  ns.get = (id) => wrap(get(id), id);
  ns.getByName = (name) => wrap(byName(name), name);
  return ops;
}

// 30) (N2) edge limits: every POST /v1/mesh/agents/* is mesh_mutate; status/directory/challenge GETs are
//     agent_read; both 429 per IP. GET receipts (the cached hourly snapshot the peer panels read) is not.
{
  const { requestLimitKind } = await import("../src/request-limits.js");
  for (const v of ["register", "grant", "revoke", "retire", "send", "pull", "ack", "receipts", "nope"]) assert.equal(requestLimitKind("/v1/mesh/agents/" + v, "POST"), "mesh_mutate", v);
  assert.equal(requestLimitKind("/v1/mesh/agents", "POST"), "mesh_mutate");
  for (const p of ["/v1/mesh/agents", "/v1/mesh/agents/directory", "/v1/mesh/agents/challenge"]) assert.equal(requestLimitKind(p, "GET"), "agent_read", p);
  assert.equal(requestLimitKind("/v1/mesh/agents/receipts", "GET"), null);
  const e = { ...mkEnv(), __edge_real: true };
  const a = await newId();
  const codes = {};
  for (let i = 0; i < 100; i++) {
    const st = { v: "AGENT-SUBNET-1.0", kind: "agent-pull", agent_id: a.handle, t: new Date().toISOString(), nonce: C.nonce(), sig: "AAAA" };
    const r = await postIp(e, "pull", st, "203.0.113.99");
    codes[r.status] = (codes[r.status] || 0) + 1;
  }
  ok(codes[429] >= 60, "unsigned POST flood gets 429s: " + JSON.stringify(codes));
  const g = {};
  for (let i = 0; i < 100; i++) { const r = await call("/v1/mesh/agents/directory", { headers: { "cf-connecting-ip": "203.0.113.99" } }, e); g[r.status] = (g[r.status] || 0) + 1; }
  ok(g[429] >= 30, "directory GET flood gets 429s: " + JSON.stringify(g));
  const other = await call("/v1/mesh/agents/directory", { headers: { "cf-connecting-ip": "198.51.100.200" } }, e);
  assert.equal(other.status, 200, "another IP is not limited");
}
n++;

// 31) (N2) per-isolate caches: the salt is read once; directory and the public snapshot are cached 60 s.
{
  const e = mkEnv();
  const ops = countAgentOps(e);
  const o = await newId();
  assert.equal((await postIp(e, "register", await C.registerStatement(await newId(), o, { discoverable: true }), "198.51.100.31")).body.code, "AGENT-OK");
  ops.length = 0;
  for (let i = 0; i < 3; i++) await postIp(e, "register", await C.registerStatement(await newId(), await newId()), "198.51.100." + (40 + i));
  ok(!ops.includes("salt"), "salt re-read: " + ops.join(","));
  ops.length = 0;
  for (let i = 0; i < 5; i++) await call("/v1/mesh/agents/directory", {}, e);
  assert.equal(ops.filter((x) => x === "directory").length, 1, "directory cached: " + ops.join(","));
  ops.length = 0;
  for (let i = 0; i < 5; i++) await call("/v1/mesh/agents/receipts", {}, e);
  ok(ops.filter((x) => x === "pub_get").length <= 1, "public snapshot cached: " + ops.join(","));
}
n++;

// 32) (N1) msg fair share in the writer: send rows only; one visitor or one owner pair <= 60/min;
//     deliver/read are riders that never spend msg; another owner on another IP still sends.
{
  await freshMinute();
  const e = mkEnv();
  const t0 = Math.floor(Date.now() / 60000) * 60000 + 1000;
  S._setAgentClock(() => t0);
  const T = new Date(t0).toISOString();
  let ipn = 0;
  const regIp = () => "192.0.2." + (100 + (ipn++ % 100));
  const ro = await newId(); const recv = await newId();
  await postIp(e, "register", await C.registerStatement(recv, ro, { t: T }), regIp());
  const so = await newId();
  const senders = [];
  for (let i = 0; i < 3; i++) { const sx = await newId(); assert.equal((await postIp(e, "register", await C.registerStatement(sx, so, { t: T }), regIp())).body.code, "AGENT-OK"); senders.push(sx); }
  const grants = [];
  for (const sx of senders) { const g = await C.grantStatement({ from: sx.handle, to: recv.handle, ownerTo: ro, ownerFrom: so, t: T }); assert.equal((await postIp(e, "grant", g.statement, regIp())).body.code, "AGENT-OK"); grants.push(g); }
  const IP = "203.0.113.60";
  const sendOne = async (i, ip) => postIp(e, "send", await C.sendStatement({ agent: senders[i], to: recv.handle, toEncPublicKey: recv.enc_public_key, grantId: grants[i].grant_id, plaintext: "fair" + "-".repeat(40), t: T }), ip);
  let sent = 0;
  let fail = null;
  for (let i = 0; i < 3 && !fail; i++) for (let k = 0; k < 30; k++) { const x = await sendOne(i, IP); if (x.body.ok) sent++; else { fail = x.body; break; } }
  assert.equal(sent, 60, "one visitor gets its fair share: " + sent);
  assert.equal(fail.code, "AGENT-RECEIPT-CAP"); assert.equal(fail.cap_limit, "ip", JSON.stringify(fail).slice(0, 200));
  // the same owner pair from a second IP is capped by the pair share.
  const pairFail = await sendOne(2, "203.0.113.61");
  assert.equal(pairFail.body.code, "AGENT-RECEIPT-CAP"); assert.equal(pairFail.body.cap_limit, "pair");
  // riders: the receiver still gets deliver + read rows (they don't spend msg).
  const pl = await postIp(e, "pull", await C.simpleStatement("agent-pull", recv, {}, T), "198.51.100.77");
  ok(pl.body.count > 0 && pl.body.withheld_no_receipt === 0, JSON.stringify(pl.body).slice(0, 200));
  const ack = await postIp(e, "ack", await C.simpleStatement("agent-ack", recv, { acks: pl.body.messages.map((m) => ({ msg_id: m.msg_id, verdict: "verified" })) }, T), "198.51.100.77");
  ok(ack.body.acks.every((a) => a.read === true));
  // another owner on another IP still sends (the R7 victim).
  const vo = await newId(); const va = await newId(); const vb = await newId();
  for (const z of [va, vb]) await postIp(e, "register", await C.registerStatement(z, vo, { t: T }), "192.0.2.77");
  const vg = await C.grantStatement({ from: va.handle, to: vb.handle, ownerTo: vo, t: T });
  assert.equal((await postIp(e, "grant", vg.statement, "192.0.2.77")).body.code, "AGENT-OK");
  const vs = await postIp(e, "send", await C.sendStatement({ agent: va, to: vb.handle, toEncPublicKey: vb.enc_public_key, grantId: vg.grant_id, plaintext: "victim" + "-".repeat(40), t: T }), "192.0.2.77");
  assert.equal(vs.body.code, "AGENT-OK", JSON.stringify(vs.body).slice(0, 200));
  S._setAgentClock(null);
  // the fair-share keys ride beside the row, never in it.
  const rowsF = await loadChain(storeFor(e), "agentcomms");
  ok(!JSON.stringify(rowsF).includes("agentcap") && !JSON.stringify(rowsF).includes("203.0.113"), "fair-share keys on the chain");
  const { agentCommClass, AGENTCOMM_CAP } = await import("../src/agent-state.js");
  assert.equal(agentCommClass("send"), "msg"); assert.equal(agentCommClass("deliver"), "rider"); assert.equal(agentCommClass("read"), "rider");
  assert.equal(AGENTCOMM_CAP.per_ip, 60); assert.equal(AGENTCOMM_CAP.per_pair, 60);
  assert.equal(AGENTCOMM_CAP.total, AGENTCOMM_CAP.classes.msg + AGENTCOMM_CAP.classes.ctl + AGENTCOMM_CAP.classes.refuse);
}
n++;

// 33) (N3) revoke and retire set the tombstone BEFORE sealing: a failed seal still leaves the grant dead,
//     and a later statement re-seals the (idempotent) receipt.
{
  const e = mkEnv();
  const o = await newId(); const a = await newId(); const bb = await newId();
  for (const z of [a, bb]) await postIp(e, "register", await C.registerStatement(z, o), "198.51.100.133");
  const g = await C.grantStatement({ from: a.handle, to: bb.handle, ownerTo: o });
  await postIp(e, "grant", g.statement, "198.51.100.133");
  S._resetAgentMemo();
  for (let i = 0; i < S.AGENT_SEAL_CAP_PER_MIN.ctl; i++) await S._burnSealForTest("ctl");
  const rv = await postIp(e, "revoke", await C.revokeStatement({ grantId: g.grant_id, owner: o }), "198.51.100.133");
  assert.equal(rv.body.code, "AGENT-OK"); assert.equal(rv.body.revoked, true); assert.equal(rv.body.receipt_pending, true);
  const s1 = await postIp(e, "send", await C.sendStatement({ agent: a, to: bb.handle, toEncPublicKey: bb.enc_public_key, grantId: g.grant_id, plaintext: "late" + "-".repeat(40) }), "198.51.100.133");
  assert.equal(s1.body.code, "AGENT-GRANT-REVOKED", "the grant is dead even though the receipt did not seal");
  S._resetAgentMemo();
  const rv2 = await postIp(e, "revoke", await C.revokeStatement({ grantId: g.grant_id, owner: o }), "198.51.100.133");
  assert.equal(rv2.body.code, "AGENT-GRANT-REVOKED"); assert.equal(rv2.body.receipt.sealed, true, "re-sealed");
  for (let i = 0; i < S.AGENT_SEAL_CAP_PER_MIN.ctl; i++) await S._burnSealForTest("ctl");
  const rt = await postIp(e, "retire", await C.retireStatement({ agentId: a.handle, owner: o }), "198.51.100.133");
  assert.equal(rt.body.code, "AGENT-OK"); assert.equal(rt.body.receipt_pending, true);
  const reg2 = await postIp(e, "register", await C.registerStatement(a, o), "198.51.100.134");
  ok(["AGENT-RETIRED", "AGENT-REPLAY", "AGENT-EXISTS"].includes(reg2.body.code));
  const pull = await postIp(e, "pull", await C.simpleStatement("agent-pull", a), "198.51.100.134");
  assert.equal(pull.body.code, "AGENT-RETIRED");
  S._resetAgentMemo();
  // chain order from the race repro: no deliver after a revoke of the same grant.
  const rows = await loadChain(storeFor(e), "agentcomms");
  const kinds = rows.map((r) => r.agentcomm.kind);
  ok(kinds.lastIndexOf("deliver") < kinds.indexOf("revoke") || !kinds.includes("deliver"), kinds.join(","));
}
n++;

// 34) (N6) agent refusals over HTTP spend the #302 rest share; through FragGate/MCP the mcp share.
{
  await freshMinute();
  const e = mkEnv();
  const { refusalCapClass } = await import("../src/chainlock/writer-do.js");
  const x = await postIp(e, "register", { v: "AGENT-SUBNET-1.0", kind: "agent-register" }, "198.51.100.140");
  assert.equal(x.body.refusal_receipt.sealed, true);
  let rows = await loadChain(storeFor(e), "refusals");
  let last = rows[rows.length - 1];
  assert.equal(last.refusal.via, "rest"); assert.equal(refusalCapClass({ refusal: last.refusal }), "rest");
  S._resetAgentMemo();
  // (A different code: one code+verb per minute shares one deduped row, whichever door sealed it first.)
  const y = await S.runAgentOp("agent-nope", {}, e);
  assert.equal(y.refusal_receipt.sealed, true);
  rows = await loadChain(storeFor(e), "refusals");
  last = rows[rows.length - 1];
  assert.equal(last.refusal.via, "mcp"); assert.equal(refusalCapClass({ refusal: last.refusal }), "mcp");
}
n++;

// 35) (N8) the receipts view checks the signature before any lookup: a bad signature gets the same
//     answer whether or not the key owns agents.
{
  const e = mkEnv();
  const o = await newId(); await postIp(e, "register", await C.registerStatement(await newId(), o), "198.51.100.150");
  const stranger = await newId(); const forger = await newId();
  const out = [];
  for (const who of [o, stranger]) {
    const ch = await (await call(C.challengePath(who, "owner"), {}, e)).json();
    const st = await C.viewStatement({ who: forger, scope: "owner", challenge: ch.challenge });
    const r = await postIp(e, "receipts", { ...st, subject_public_key: who.public_key }, "198.51.100.150");
    out.push([r.status, r.body.code]);
  }
  assert.deepEqual(out[0], out[1], JSON.stringify(out)); assert.equal(out[0][1], "AGENT-SIG-INVALID");
}
n++;

// 36) IPv6 is cut to its /64 before hashing for the agent limits.
{
  assert.equal(S.agentIpKey("2001:db8:1:2:aaaa::1"), S.agentIpKey("2001:0db8:0001:0002:bbbb:cccc:dddd:9"));
  ok(S.agentIpKey("2001:db8:1:2::1") !== S.agentIpKey("2001:db8:1:3::1"));
  assert.equal(S.agentIpKey("2001:db8:1:2::1"), "2001:db8:1:2::/64");
  // IPv4-mapped IPv6 is the IPv4 it carries: two mapped visitors never share one bucket (AZBot round 3).
  assert.equal(S.agentIpKey("::ffff:192.0.2.1"), "192.0.2.1");
  assert.equal(S.agentIpKey("::ffff:c000:201"), "192.0.2.1");
  assert.equal(S.agentIpKey("0:0:0:0:0:ffff:192.0.2.9"), "192.0.2.9");
  ok(S.agentIpKey("::ffff:192.0.2.1") !== S.agentIpKey("::ffff:192.0.2.2"));
  const { edgeIpKey } = await import("../src/agent-ip.js");
  assert.equal(edgeIpKey("2001:db8:1:2::7"), "2001:db8:1:2::/64"); assert.equal(edgeIpKey("vh:" + "a".repeat(32)), "vh:" + "a".repeat(32)); assert.equal(edgeIpKey("local"), "local");
  assert.equal(S.agentIpKey("192.0.2.1"), "192.0.2.1");
  const e = mkEnv();
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await postIp(e, "register", await C.registerStatement(await newId(), await newId()), `2001:db8:77:1:${(i + 1).toString(16)}::${i + 2}`)).body.code);
  assert.deepEqual(codes, ["AGENT-OK", "AGENT-OK", "AGENT-OK", "AGENT-OK", "AGENT-OK", "AGENT-RATE"], codes.join(","));
}
n++;

// 37) (N4/N5) no real-time agentcomms count in public: heads carry the hourly tip, row pages and /row stop
//     at it, the MCP chainlock_tip refuses agentcomms, and the public snapshot buckets the tip seq.
{
  const e = mkEnv();
  const o = await newId();
  for (let i = 0; i < 2; i++) await postIp(e, "register", await C.registerStatement(await newId(), o), "198.51.100.160");
  const h1 = await (await call("/v1/anchor/heads", {}, e)).json();
  const ac1 = h1.chains.find((c) => c.c === "agentcomms");
  assert.equal(ac1.hourly, true); assert.equal(ac1.seq, 2);
  await postIp(e, "register", await C.registerStatement(await newId(), o), "198.51.100.161");
  S._resetAgentCaches(e);
  const h2 = await (await call("/v1/anchor/heads", {}, e)).json();
  assert.equal(h2.chains.find((c) => c.c === "agentcomms").seq, 2, "heads moved inside the hour");
  const page = await (await call("/v1/anchor/rows?c=agentcomms&from=1&limit=50", {}, e)).json();
  assert.equal(page.rows.length, 2); assert.equal(page.head_seq, 2); assert.equal(page.next, null);
  const after = await (await call("/v1/anchor/rows?c=agentcomms&from=3&limit=50", {}, e)).json();
  assert.equal(after.rows.length, 0); assert.equal(after.count, 0); assert.equal(after.next, null, "walkers (offline pullBundle) must stop on the empty page");
  const unbound = await call("/v1/anchor/rows?c=agentcomms&from=1", {}, { USES: memoryMeshKv() });
  assert.equal((await unbound.json()).code, "LEDGER-STORE-UNBOUND");
  const one = await call("/v1/anchor/row?c=agentcomms&seq=3", {}, e);
  assert.equal(one.status, 404); assert.equal((await one.json()).code, "AGENT-ROW-NOT-PUBLISHED");
  const pub = await (await call("/v1/mesh/agents/receipts", {}, e)).json();
  assert.equal(pub.tip.seq, "<10"); ok(/^[a-f0-9]{64}$/.test(pub.tip.h));
  const { tip } = await import("../src/chainlock/ops.js");
  const t = await tip(storeFor(e), "agentcomms");
  assert.equal(t.ok, false); assert.equal(t.code, "AGENT-TIP-HOURLY"); ok(!("stamp" in t));
  const rt = await (await call("/v1/receipts/tip", {}, e)).json();
  const rac = (rt.lattice_tip.chains || []).find((c) => c.c === "agentcomms");
  assert.equal(rac.seq, 2); assert.equal(rac.hourly, true);
  const h3 = await nextHour(() => call("/v1/anchor/heads", {}, e).then((r) => r.json()));
  assert.equal(h3.chains.find((c) => c.c === "agentcomms").seq, 3, "the next hour's tip");
}
n++;

// 38) (AZBot round 3, B1) the per-visitor share covers ctl and refuse too: 130 grants from rotating
//     addresses in ONE /64 cannot block another visitor's register; revoke and retire still work.
{
  await freshMinute();
  const { AGENTCOMM_CAP } = await import("../src/agent-state.js");
  const e = mkEnv();
  S._resetAgentMemo();
  const t0 = Math.floor(Date.now() / 60000) * 60000 + 1000;
  S._setAgentClock(() => t0);
  const T = new Date(t0).toISOString();
  let k = 0; const ip6 = () => "2001:db8:aa:bb::" + (++k).toString(16);
  const o = await newId(), a = await newId(), b = await newId();
  for (const x of [a, b]) assert.equal((await postIp(e, "register", await C.registerStatement(x, o, { t: T }), ip6())).body.code, "AGENT-OK");
  const codes = {}; let lastG = null;
  for (let i = 0; i < 130; i++) {
    const g = await C.grantStatement({ from: a.handle, to: b.handle, ownerTo: o, t: T });
    const r = await postIp(e, "grant", g.statement, ip6());
    codes[r.body.code] = (codes[r.body.code] || 0) + 1;
    if (r.body.code === "AGENT-OK") lastG = g;
  }
  assert.equal(codes["AGENT-OK"], AGENTCOMM_CAP.per_ip - 2, JSON.stringify(codes)); // 2 registers + 58 grants = 60 ctl rows
  assert.equal(codes["AGENT-RECEIPT-CAP"], 130 - (AGENTCOMM_CAP.per_ip - 2), JSON.stringify(codes));
  ok(S._sealMemoForTest().used.ctl <= AGENTCOMM_CAP.per_ip, "per-visitor refusals give the isolate slot back");
  const vo = await newId(), va = await newId(), vb = await newId();
  const vr = await postIp(e, "register", await C.registerStatement(va, vo, { t: T }), "192.0.2.50");
  assert.equal(vr.body.code, "AGENT-OK", "a victim on another IP still registers: " + vr.body.code);
  assert.equal((await postIp(e, "register", await C.registerStatement(vb, vo, { t: T }), "192.0.2.50")).body.code, "AGENT-OK");
  const vg = await C.grantStatement({ from: va.handle, to: vb.handle, ownerTo: vo, t: T });
  assert.equal((await postIp(e, "grant", vg.statement, "192.0.2.50")).body.code, "AGENT-OK", "and grants");
  // the noisy /64 can still revoke and retire (fail safe: tombstone first, receipt pending at worst).
  const rv = await postIp(e, "revoke", await C.revokeStatement({ grantId: lastG.grant_id, owner: o, t: T }), ip6());
  assert.equal(rv.body.code, "AGENT-OK"); assert.equal(rv.body.revoked, true);
  const rt = await postIp(e, "retire", await C.retireStatement({ agentId: a.handle, owner: o, t: T }), ip6());
  assert.equal(rt.body.code, "AGENT-OK"); assert.equal(rt.body.retired, true);
  // the writer keys refuse rows per visitor as well (raw writer check).
  const gst = storeFor({ CHAINLOCK: memoryChainWriterNamespace({}) });
  let last;
  for (let i = 0; i <= AGENTCOMM_CAP.per_ip; i++) last = await append(gst, { c: "agentcomms", k: "agentcomm", s: "agentcomm", f: "r" + i, agentcomm: { spec: "AGENT-SUBNET-1.0", kind: "refuse", from_h: "f" + String(i).padStart(31, "0") }, agentcap: { ip: "one-visitor" }, idempotency_key: "rv:" + i }, { internal: true });
  assert.equal(last.ok, false); assert.equal(last.cap_class, "refuse"); assert.equal(last.cap_limit, "ip");
  S._setAgentClock(null); S._resetAgentMemo();
}
n++;

// 39) (AZBot round 3, B2) chainlock_verify {c:"agentcomms"} through the public doors stops at the hourly
//     tip: no live count and no live tip hashes. An internal store-level verify still walks every row.
{
  const e = mkEnv();
  const o = await newId();
  await postIp(e, "register", await C.registerStatement(await newId(), o), "198.51.100.201");
  assert.equal((await call("/v1/mesh/agents/receipts", {}, e)).status, 200); // the hour's snapshot: seq 1
  await postIp(e, "register", await C.registerStatement(await newId(), o), "198.51.100.202"); // live seq 2
  const tipNow = await S.agentHourlyTip(e);
  assert.equal(tipNow.seq, 1);
  const mcpVerify = async (args) => {
    const r = await call("/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "chainlock_verify", arguments: args } }) }, e);
    return JSON.parse(await r.text()).result.structuredContent.result;
  };
  for (const args of [{ c: "agentcomms" }, { chain: "agentcomms" }, { c: "agentcomms", agentThrough: 99, opts: { agentThrough: 99 } }]) {
    const v = await mcpVerify(args);
    const ch = v.chains.find((x) => x.c === "agentcomms");
    assert.equal(ch.n, 1, "hourly count only: " + JSON.stringify(args)); assert.equal(ch.hourly, true);
    assert.equal(ch.dual_lattice.tips.primary, tipNow.lattice.primary); assert.equal(ch.dual_lattice.tips.secondary, tipNow.lattice.secondary);
    ok(!JSON.stringify(v).includes(String((await loadChain(storeFor(e), "agentcomms"))[1].stamp_sha256)), "the live row hash never shows");
  }
  const full = await verify(storeFor(e), { c: "agentcomms" });
  assert.equal(full.chains[0].n, 2); assert.equal(full.ok, true);
}
n++;

// 40) (AZBot round 3) agent keys are cached per isolate: bad-signature sends and pulls for a known agent
//     cost no DO call; the /mcp caller's hashed IP reaches the agent limits (no shared "none" bucket).
{
  const e = mkEnv();
  const o = await newId(), a = await newId(), b = await newId();
  for (const x of [a, b]) await postIp(e, "register", await C.registerStatement(x, o), "198.51.100.210");
  const ops = countAgentOps(e);
  ops.length = 0;
  for (let i = 0; i < 20; i++) {
    const st = await C.sendStatement({ agent: a, to: b.handle, toEncPublicKey: b.enc_public_key, grantId: "0".repeat(64), plaintext: "x".repeat(40) });
    st.sig = st.sig.slice(0, -4) + "AAAA";
    assert.equal((await postIp(e, "send", st, "198.51.100." + (20 + i))).body.code, "AGENT-SIG-INVALID");
    const pl = await C.simpleStatement("agent-pull", a); pl.sig = pl.sig.slice(0, -4) + "AAAA";
    assert.equal((await postIp(e, "pull", pl, "198.51.100." + (60 + i))).body.code, "AGENT-SIG-INVALID");
  }
  assert.equal(ops.filter((x) => x === "agent").length, 0, "cached keys: no agent lookups for bad signatures: " + ops.join(","));
  // a good send still works (the cache never answers yes on its own).
  const g = await C.grantStatement({ from: a.handle, to: b.handle, ownerTo: o });
  await postIp(e, "grant", g.statement, "198.51.100.210");
  assert.equal((await postIp(e, "send", await C.sendStatement({ agent: a, to: b.handle, toEncPublicKey: b.enc_public_key, grantId: g.grant_id, plaintext: "ok" + "-".repeat(40) }), "198.51.100.210")).body.code, "AGENT-OK");
  // MCP meta: the same hash as REST for the same visitor; a peer's forwarded hash; nothing when local.
  const req = (h) => new Request("https://x.example/mcp", { method: "POST", headers: h });
  assert.deepEqual(await S.agentMetaOf(req({ "cf-connecting-ip": "2001:db8:5:6::9" })), { ip_h: await S.agentIpHash("2001:db8:5:6::1") });
  assert.deepEqual(await S.agentMetaOf(req({ "x-azrt-visitor-ip-h": "b".repeat(32) })), { ip_h: "b".repeat(32) });
  assert.deepEqual(await S.agentMetaOf(req({})), {}); assert.deepEqual(await S.agentMetaOf(null), {});
  const { readFile } = await import("node:fs/promises");
  const door = await readFile(new URL("../src/fraggate/door.js", import.meta.url), "utf8");
  const mesh = await readFile(new URL("../src/mesh.js", import.meta.url), "utf8");
  ok(/agentMetaOf\(request\)[\s\S]{0,200}runMeshOp\(resolved\.op, payload, env, meshMeta\)/.test(door), "FragGate passes the /mcp caller's meta");
  ok(mesh.includes("agents.runAgentOp(resolved, src, env, meta || {})"), "runMeshOp forwards meta to the agent ops");
  // the edge limiter keys the /64: two addresses in one /64 share one mesh_mutate bucket.
  const { limiterIp } = await import("../src/production.js");
  const rq = (ip) => new Request("https://x.example/v1/mesh/agents/send", { method: "POST", headers: { "cf-connecting-ip": ip } });
  assert.equal(limiterIp(rq("2001:db8:9:9::1"), "mesh_mutate"), limiterIp(rq("2001:db8:9:9:ffff::2"), "agent_read"));
  assert.equal(limiterIp(rq("2001:db8:9:9::1"), "mcp"), "2001:db8:9:9::1", "other kinds unchanged");
}
n++;

console.log(`verify-agent-subnet: ${n} groups OK`);

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
const call = (path, init = {}, e = env) => handler(new Request("https://aziel-runtime.example" + path, init), e, ctx);
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
for (const row of agentRefusals) { ok(/^[a-f0-9]{64}$/.test(row.refusal.reason_sha256)); assert.equal(row.refusal.reason, S.AGENT_CODES[row.refusal.code][1]); }
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
assert.equal(b.live, false); assert.equal(b.agent_subnet.live, false); assert.equal(b.agent_subnet.e2e_verified_observed, 1); n++;

// 13) revoke: owner-signed, recorded, and the grant stops working.
x = await post("revoke", await C.revokeStatement({ grantId: g.grant_id, owner: ownerB }));
assert.equal(x.status, 200); assert.equal(x.body.receipt.kind, "revoke");
const after = await C.sendStatement({ agent: a1, to: b1.handle, toEncPublicKey: b1.enc_public_key, grantId: g.grant_id, plaintext: "again" });
x = await post("send", after);
assert.equal(x.body.code, "AGENT-GRANT-REVOKED");
x = await post("revoke", await C.revokeStatement({ grantId: gSame.grant_id, owner: ownerB }));
assert.equal(x.body.code, "AGENT-OWNER-SIG"); n++;

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
assert.equal(b.scope, "public"); assert.equal(b.rows_shown, 0); ok(!("receipts" in b)); ok(b.by_kind.send >= 1 && b.by_kind.read >= 1);
ok(!JSON.stringify(b).includes("from_h"));
const allRows = await loadChain(store, "agentcomms");
const salt = await uses.get("agentnet|salt");
const H = async (id) => (await (await import("../src/session-core.js")).sha256Hex(`AGENT-SUBNET-1.0|${salt}|${id}`)).slice(0, 32);
const [hA1, hA2, hB1] = [await H(a1.handle), await H(a2.handle), await H(b1.handle)];
let ch = await (await call("/v1/mesh/agents/challenge")).json();
let view = await C.viewStatement({ who: b1, challenge: ch.challenge });
x = await post("receipts", view);
assert.equal(x.status, 200, JSON.stringify(x.body)); ok(x.body.matched > 0);
for (const row of x.body.receipts) { const a = row.agentcomm; ok([a.from_h, a.to_h, a.agent_h].includes(hB1), "foreign row in b1 view"); }
const foreign = allRows.filter((row) => { const a = row.agentcomm || {}; return ![a.from_h, a.to_h, a.agent_h].includes(hB1); }).length;
ok(foreign > 0 && x.body.matched < allRows.length);
x = await post("receipts", view);
assert.equal(x.body.code, "AGENT-REPLAY");
ch = await (await call("/v1/mesh/agents/challenge")).json();
x = await post("receipts", await C.viewStatement({ who: ownerA, scope: "owner", challenge: ch.challenge }));
assert.equal(x.status, 200); assert.equal(x.body.agents, 2);
for (const row of x.body.receipts) { const a = row.agentcomm; ok([a.from_h, a.to_h, a.agent_h, a.owner_h, a.by_h].some((h) => h === hA1 || h === hA2 || h === undefined) ); }
ok(!x.body.receipts.some((row) => row.agentcomm.kind === "register" && row.agentcomm.agent_h === hB1), "owner A saw owner B's register");
// a forged challenge or a signature by someone else is refused.
x = await post("receipts", await C.viewStatement({ who: b1, challenge: "1" + "0".repeat(12) + "." + "a".repeat(24) + "." + "b".repeat(32) }));
assert.equal(x.body.code, "AGENT-CHALLENGE");
ch = await (await call("/v1/mesh/agents/challenge")).json();
const v2 = await C.viewStatement({ who: a2, challenge: ch.challenge });
x = await post("receipts", { ...v2, subject_public_key: b1.public_key });
assert.equal(x.body.code, "AGENT-SIG-INVALID");
// public /v1/anchor/rows redacts agentcomm bodies.
b = await (await call("/v1/anchor/rows?c=agentcomms&from=1&limit=50")).json();
ok(Array.isArray(b.rows) && b.rows.length > 0); ok(!JSON.stringify(b).includes(hB1)); ok(b.rows.every((row) => !row.row.agentcomm || row.row.agentcomm.redacted === true)); n++;

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
  const tenv = { TETHER_SIGNING_SEED: "33".repeat(32) /* test-only seed */, GIT_SHA: "c".repeat(40) };
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
  const out = await tether.pushAll(tenv, { store, fetcher, chains: ["agentcomms"] });
  assert.equal(out.ok, true, JSON.stringify(out).slice(0, 400));
  const row = out.chains.find((c) => c.chain === "agentcomms");
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
  // receipt cap: force the in-isolate counter, the send refuses and leaves no box.
  S._resetAgentMemo();
  const boxesBefore = [...e2.USES._store.keys()].filter((k) => k.includes("|box|")).length;
  for (let i = 0; i < S.AGENT_SEAL_CAP_PER_MIN; i++) await S._burnSealForTest();
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

console.log(`verify-agent-subnet: ${n} groups OK`);

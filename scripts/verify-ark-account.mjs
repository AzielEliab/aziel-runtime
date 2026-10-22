// USER-SIGNIN-ARK-1.0 §4-§9: credential firewall + ark account_* ops through FragGate.
import assert from "node:assert/strict";
const handler = (await import("../src/index.js")).default.fetch;
const { arkFirewall, arkKeysFor } = await import("../src/account/firewall.js");
const { runArkAccountOp, verifyArkRows, appendMessage, recallMessage, RL_PER_SUBJECT } = await import("../src/account/ops.js");
const { deriveArkAccount, sealData, signBytes, sha256, hex } = await import("../src/account/ark-kdf.js");
const { LIVE_OPS, STUB_OPS } = await import("../src/fraggate/registry.js");
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const U = "zq7sentinel", P = "Pw-SENTINEL-93f1x", P2 = "Pw-SENTINEL-93f1y";
function mkKv() {
  const m = new Map();
  return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, delete: async (k) => m.delete(k), list: async ({ prefix = "" } = {}) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) };
}
const kv = mkKv();
const env = { ARK_ACCOUNTS: "on", USES: kv };
let ip = 1;
const post = (path, body, e = env) => handler(new Request("https://x" + path, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "cf-connecting-ip": `198.51.100.${ip}` }, body: JSON.stringify(body) }), e, { waitUntil() {} });
const call = async (body, e) => (await (await post("/v1/fraggate/call", { slug: "ark", ...body }, e)).json());
const leaks = (s) => s.includes(U) || s.includes(P) || s.includes(P2);

// Registry: three live ops on the existing ark slug; stubs untouched (363 lock lives elsewhere).
ok(["account_open", "account_append", "account_recall"].every((o) => LIVE_OPS.ark.includes(o)), "ark live ops");
ok(STUB_OPS.ark.join() === "scorch,wipe,unlock,encrypt", "ark stubs unchanged");

// Firewall: scrubs top-level and payload creds, keeps keys off JSON, idempotent, ignores other slugs.
const fw = await arkFirewall({ slug: "ark", op: "account_open", username: U, payload: { password: P, x: 1 } });
ok(!leaks(JSON.stringify(fw)) && fw.payload.x === 1 && fw.credential_mode === "hosted", "creds scrubbed");
ok(arkKeysFor(fw) && arkKeysFor(fw).vault_id.length === 64, "keys held off-JSON");
ok((await arkFirewall(fw)) === fw, "idempotent");
const other = { slug: "memory", op: "recall", password: "x" };
ok((await arkFirewall(other)) === other, "non-ark args untouched");
const bad = await arkFirewall({ slug: "ark", op: "account_open", username: "a", password: P });
ok(bad.credential_error === "ARK-INPUT" && !arkKeysFor(bad) && !leaks(JSON.stringify(bad)), "bad input fails closed");

// Default OFF and durable-store-only.
let r = await call({ op: "account_open", username: U, password: P }, { USES: mkKv() });
ok(r.result.code === "ARK-ACCOUNTS-OFF", "default off");
r = await call({ op: "account_open", username: U, password: P }, { ARK_ACCOUNTS: "on" });
ok(r.result.code === "ARK-STORE-OFF", "no durable store refuses");

// Hosted: append + recall round trip, both sealed and user-signed.
r = await call({ op: "account_open", username: U, password: P });
ok(r.ok && r.result.code === "ARK-OK" && r.result.count === 0 && r.result.deniable, "new vault is empty");
const vid = r.result.vault_id;
for (const d of ["first", "second"]) {
  r = await call({ op: "account_append", username: U, password: P, payload: { data: d, kind: "note" } });
  ok(r.result.written && r.result.sealed && r.result.runtime_signed === false && r.result.row.signed_by === "user", "append " + d);
}
r = await call({ op: "account_recall", payload: { username: U, password: P } });
ok(r.result.rows.map((x) => x.data).join() === "second,first", "hosted recall decrypts newest-first");
ok(r.result.rows.every((x) => !("ct_b64" in x)), "recall view hides ciphertext blob");

// Deniable: wrong password = a different, empty vault. Same shape, no oracle.
const w = await call({ op: "account_open", username: U, password: P2 });
ok(w.ok && w.result.code === "ARK-OK" && w.result.count === 0 && w.result.vault_id !== vid, "wrong password opens empty vault");
ok(JSON.stringify(Object.keys(w.result).sort()) === JSON.stringify(Object.keys((await call({ op: "account_open", username: U, password: P })).result).sort()), "same response shape");
const wr = await call({ op: "account_recall", username: U, password: P2 });
ok(wr.result.ok && wr.result.rows.length === 0, "wrong password recalls nothing");

// Stored rows verify (seq/prev/row_hash/dual lattice/user_sig) and carry no secret or username.
const rows = [];
for (let s = 1; s <= 2; s++) rows.push(JSON.parse(kv.m.get(`chainlock|ark:acct:${vid}:${s}`)));
ok((await verifyArkRows(rows)).ok, "rows verify");
const tampered = rows.map((x) => ({ ...x })); tampered[0].kind = "evil";
ok(!(await verifyArkRows(tampered)).ok, "tamper detected");
ok(!leaks(JSON.stringify([...kv.m.entries()])), "no username/password anywhere in storage (ledger, session, refusals, rows)");

// Device mode: client derives + signs locally; server sees pub, sig, ciphertext only.
const dev = await deriveArkAccount("devuser1", "device-only-pass");
r = await call({ op: "account_open", payload: { vault_pub: dev.pub } });
ok(r.result.vault_id === dev.vault_id && r.result.count === 0, "device open");
const ct = await sealData(dev.encKey, dev.vault_id, 1, "on-device note");
const ct_sha256 = hex(await sha256(ct));
const ts = Date.now();
const body = { spec: "ARK-ACCOUNT-1.0", vault_id: dev.vault_id, seq: 1, prev: "0".repeat(64), kind: "note", ct_sha256, ts };
const sig = await signBytes(dev.signKey, appendMessage(body));
r = await call({ op: "account_append", payload: { vault_pub: dev.pub, seq: 1, prev: body.prev, kind: "note", ct_b64: ct, ct_sha256, ts, user_sig: sig } });
ok(r.result.written && r.result.row.user_sig === sig, "device append");
r = await call({ op: "account_append", payload: { vault_pub: dev.pub, seq: 1, prev: body.prev, kind: "note", ct_b64: ct, ct_sha256, ts, user_sig: sig } });
ok(r.result.code === "ARK-STALE" && r.result.written === false, "replay/append-only refused");
const other2 = await deriveArkAccount("devuser2", "device-only-pass");
const forged = await signBytes(other2.signKey, appendMessage({ ...body, seq: 2, prev: "f".repeat(64) }));
r = await call({ op: "account_append", payload: { vault_pub: dev.pub, seq: 2, prev: JSON.parse(kv.m.get(`chainlock|ark:acct:${dev.vault_id}:tip`)).row_hash, kind: "note", ct_b64: ct, ct_sha256, ts, user_sig: forged } });
ok(r.result.code === "ARK-SIG-BAD", "foreign signature refused");
const rts = Date.now();
r = await call({ op: "account_recall", payload: { vault_pub: dev.pub, ts: rts, user_sig: await signBytes(dev.signKey, recallMessage(dev.vault_id, rts)) } });
ok(r.result.rows.length === 1 && r.result.rows[0].ct_b64 === ct, "device recall returns ciphertext");
r = await call({ op: "account_recall", payload: { vault_pub: dev.pub, ts: rts - 10 * 60 * 1000, user_sig: "00" } });
ok(r.result.code === "ARK-STALE", "stale recall refused");

// MCP door: secrets never echo back (the confirm hint is built from scrubbed args).
const mcp = await (await post("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "fraggate_call", arguments: { slug: "ark", op: "account_recall", username: U, password: P } } })).text();
ok(!leaks(mcp), "MCP response carries no secret");
const mcp2 = await (await post("/mcp", { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "fraggate_call", arguments: { slug: "ark", op: "account_recall", username: U, password: P, confirm: true } } })).text();
ok(mcp2.includes("ARK-OK") && mcp2.includes("second") && !leaks(mcp2), "MCP hosted recall works with confirm");
ok(!leaks(JSON.stringify([...kv.m.entries()])), "still no secret in storage after MCP calls");

// Rate limit per subject: identical for any password, so lockout reveals nothing.
const rlKv = mkKv(); const rlEnv = { ARK_ACCOUNTS: "on", USES: rlKv };
let last;
for (let i = 0; i <= RL_PER_SUBJECT; i++) { ip = 10 + (i % 5); last = await call({ op: "account_open", username: "rluser", password: i % 2 ? "rl-pass-aaaa" : "rl-pass-bbbb" }, rlEnv); }
ok(last.result.code === "ARK-RATE", "subject rate limit");
ok(!leaks(JSON.stringify([...rlKv.m.entries()])) && ![...rlKv.m.values()].join().includes("rl-pass"), "rate store has no secret");

// Fail closed on store errors.
const boom = { ARK_ACCOUNTS: "on", USES: { get: async () => { throw new Error("x"); }, put: async () => { throw new Error("x"); } } };
const fk = await arkFirewall({ slug: "ark", op: "account_open", username: U, password: P });
r = await runArkAccountOp("account_open", {}, boom, null, arkKeysFor(fk), {});
ok(r.ok === false && r.code === "ARK-FAIL-CLOSED", "store error fails closed");
console.log(`verify-ark-account: ${n} checks ok`);
// /p/ark/account_* must never proxy credentials to the ARK product Worker.
{
  const res = await post("/p/ark/account_open", { username: U, password: P });
  const t = await res.text();
  assert.equal(res.status, 400); assert.ok(t.includes("ARK-DOOR-ONLY") && !leaks(t));
  const { run: runArkEngine } = await import("../src/engines/ark.js");
  assert.equal((await runArkEngine("account_open", { username: U, password: P })).code, "ARK-DOOR-ONLY");
  console.log("verify-ark-account: /p and engine paths are door-only (2 checks)");
}

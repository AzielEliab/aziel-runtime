// USER-SIGNIN-ARK-1.0 §4-§9: credential firewall + ark account_* ops through FragGate.
import assert from "node:assert/strict";
const handler = (await import("../src/index.js")).default.fetch;
const { arkFirewall, arkKeysFor, arkCredsFor, arkDeriveFor, isArkAccountCall, scrubCredentialKeys } = await import("../src/account/firewall.js");
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
const env = { ARK_ACCOUNTS: "on", ARK_PLAINTEXT_DOOR: "deprecated-on", USES: kv }; // legacy hosted sections exercise the deprecated door
let ip = 1; // kept for sections that name a bucket; every request also gets a fresh address (flake fix:
let ipc = 0; //  runtime-wide per-IP limiters on /v1/fraggate/call and /mcp can no longer trip mid-test)
const post = (path, body, e = env) => { ipc++; return handler(new Request("https://x" + path, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "cf-connecting-ip": `10.${ip % 250}.${Math.floor(ipc / 250) % 250}.${ipc % 250}` }, body: JSON.stringify(body) }), e, { waitUntil() {} }); };
const call = async (body, e) => (await (await post("/v1/fraggate/call", { slug: "ark", ...body }, e)).json());
const leaks = (s) => s.includes(U) || s.includes(P) || s.includes(P2);

// Registry: three live ops on the existing ark slug; stubs untouched (363 lock lives elsewhere).
ok(["account_open", "account_append", "account_recall"].every((o) => LIVE_OPS.ark.includes(o)), "ark live ops");
ok(STUB_OPS.ark.join() === "scorch,wipe,unlock,encrypt", "ark stubs unchanged");

// Firewall: scrubs top-level and payload creds, keeps keys off JSON, idempotent, ignores other slugs.
const fw = await arkFirewall({ slug: "ark", op: "account_open", username: U, payload: { password: P, x: 1 } });
ok(!leaks(JSON.stringify(fw)) && fw.payload.x === 1 && fw.credential_mode === "hosted", "creds scrubbed");
ok(!arkKeysFor(fw) && arkCredsFor(fw), "creds held off-JSON; no PBKDF2 in the firewall (MED-2)");
ok((await arkFirewall(fw)) === fw, "idempotent");
const other = { slug: "memory", op: "recall", password: "x" };
ok((await arkFirewall(other)) === other, "non-ark args untouched");
const bad = await arkFirewall({ slug: "ark", op: "account_open", username: "a", password: P });
ok(!arkKeysFor(bad) && !leaks(JSON.stringify(bad)), "bad input holds no keys");
await assert.rejects(arkDeriveFor(bad)); n++;

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
const tip0 = JSON.parse(kv.m.get(`chainlock|ark:acct:${vid}:tip`));
ok((await verifyArkRows(rows, tip0)).ok, "rows verify");
ok((await verifyArkRows(rows)).why === "tip-required", "tip argument is required");
const tampered = rows.map((x) => ({ ...x })); tampered[0].kind = "evil";
ok(!(await verifyArkRows(tampered, tip0)).ok, "tamper detected");
ok(!leaks(JSON.stringify([...kv.m.entries()])), "no username/password anywhere in storage (ledger, session, refusals, rows)");

// Device mode: client derives + signs locally; server sees pub, sig, ciphertext only.
ip = 77; // own rate bucket so earlier sections can never push this one over (flake fix)
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
ok(r.result.code === "ARK-STALE" && r.result.written === false, "replay/append-only refused " + JSON.stringify(r.result));
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
const rlKv = mkKv(); const rlEnv = { ARK_ACCOUNTS: "on", ARK_PLAINTEXT_DOOR: "deprecated-on", USES: rlKv };
let last;
// Fixed clock: the hosted subject is window-salted, so a real clock crossing a window mid-loop was a flake.
const T0 = 1_800_000_000_000;
for (let i = 0; i <= RL_PER_SUBJECT; i++) {
  const h = await arkFirewall({ slug: "ark", op: "account_open", username: "rluser", password: i % 2 ? "rl-pass-aaaa" : "rl-pass-bbbb" });
  const rq = new Request("https://x/", { headers: { "cf-connecting-ip": `10.9.${i % 250}.${i % 7}` } });
  last = { result: await runArkAccountOp("account_open", {}, rlEnv, rq, null, { handle: h, credential_mode: "hosted" }, T0) };
}
ok(last.result.code === "ARK-RATE", "subject rate limit");
ok(!leaks(JSON.stringify([...rlKv.m.entries()])) && ![...rlKv.m.values()].join().includes("rl-pass"), "rate store has no secret");

// Fail closed on store errors.
const boom = { ARK_ACCOUNTS: "on", ARK_PLAINTEXT_DOOR: "deprecated-on", USES: { get: async () => { throw new Error("x"); }, put: async () => { throw new Error("x"); } } };
const fk = await arkFirewall({ slug: "ark", op: "account_open", username: U, password: P });
r = await runArkAccountOp("account_open", {}, boom, null, null, { handle: fk, credential_mode: "hosted" });
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
// USER-SIGNIN-ARK-1.0 §10: challenge → signed session. The LLM/MCP client sees only vault_pub, nonce, sig, session.
{
  const { sessionMessage, CHALLENGE_TTL_MS } = await import("../src/account/ops.js");
  const { KvStore } = await import("../src/chainlock/store.js");
  let c = 0; const k = (x, m) => { assert.ok(x, m); c++; };
  // A store with the ChainWriter DO's atomic first-claim-wins docClaim (what CHAINLOCK provides in deploy).
  const withClaim = (uses) => {
    const st = new KvStore(uses); const claims = new Map();
    st.docClaim = async (doc) => { await null; if (claims.has(doc)) return { ok: false, code: "LATTICE-DOUBLE" }; claims.set(doc, 1); return { ok: true, fresh: true }; };
    return { ARK_ACCOUNTS: "on", USES: uses, __aziel_kvstore: st };
  };
  const e2 = withClaim(mkKv());
  const me = await deriveArkAccount("sessuser1", "sess-pass-1234");
  const sign = async (who, n) => signBytes(who.signKey, sessionMessage(who.vault_id, n));
  const arkKeys = (e) => [...e.USES.m.keys()].filter((x) => x.includes("ark:")).length;
  const puts0 = arkKeys(e2);
  let r = await call({ op: "account_challenge", payload: { vault_pub: me.pub } }, e2);
  k(r.result.code === "ARK-OK" && /^[0-9a-f]{64}$/.test(r.result.nonce), "challenge issued");
  k(arkKeys(e2) === puts0, "challenge writes no ark KV keys (no nonce row, no rate counter)");
  const nonce = r.result.nonce;
  r = await call({ op: "account_session", payload: { vault_pub: me.pub, nonce, user_sig: "00".repeat(64) } }, e2);
  k(r.result.code === "ARK-SIG-BAD", "bad sig refused");
  k(![...e2.USES.m.keys()].some((x) => x.includes("ark:rl:s:")), "forged signature never touches the vault counter");
  r = await call({ op: "account_session", payload: { vault_pub: me.pub, nonce, user_sig: await sign(me, nonce) } }, e2);
  k(r.result.code === "ARK-OK" && /^[0-9a-f]{64}$/.test(r.result.session) && r.result.count === 0, "session opens");
  const tok = r.result.session;
  r = await call({ op: "account_session", payload: { vault_pub: me.pub, nonce, user_sig: await sign(me, nonce) } }, e2);
  k(r.result.code === "ARK-STALE", "nonce is single use");
  // Concurrent spends of one nonce (as if from several data centers): exactly one wins.
  const nc = (await call({ op: "account_challenge", payload: { vault_pub: me.pub } }, e2)).result.nonce;
  const sigc = await sign(me, nc);
  const many = await Promise.all([...Array(6)].map(() => call({ op: "account_session", payload: { vault_pub: me.pub, nonce: nc, user_sig: sigc } }, e2)));
  k(many.filter((x) => x.result.code === "ARK-OK").length === 1, "concurrent spends: exactly one session");
  // Expired and future nonces.
  const old = (Date.now() - CHALLENGE_TTL_MS - 1000).toString(16).padStart(16, "0") + "ab".repeat(24);
  r = await call({ op: "account_session", payload: { vault_pub: me.pub, nonce: old, user_sig: await sign(me, old) } }, e2);
  k(r.result.code === "ARK-STALE", "expired nonce refused");
  const fut = (Date.now() + 60 * 60 * 1000).toString(16).padStart(16, "0") + "cd".repeat(24);
  r = await call({ op: "account_session", payload: { vault_pub: me.pub, nonce: fut, user_sig: await sign(me, fut) } }, e2);
  k(r.result.code === "ARK-STALE", "future nonce refused");
  // Strict: KV-only store has no atomic claim, so sessions refuse instead of risking a cross-DC replay.
  const kvOnly = { ARK_ACCOUNTS: "on", USES: mkKv() };
  const nk = (await call({ op: "account_challenge", payload: { vault_pub: me.pub } }, kvOnly)).result.nonce;
  r = await call({ op: "account_session", payload: { vault_pub: me.pub, nonce: nk, user_sig: await sign(me, nk) } }, kvOnly);
  k(r.result.code === "ARK-STORE-OFF", "KV-only store refuses sessions (no cross-DC single use)");
  r = await call({ op: "account_recall", payload: { session: tok } }, e2);
  k(r.result.code === "ARK-OK" && r.result.rows.length === 0, "session recall");
  r = await call({ op: "account_recall", payload: { session: "ab".repeat(32) } }, e2);
  k(r.result.code === "ARK-SESSION", "unknown session refused");
  k(![...e2.USES.m.keys()].some((x) => x.includes(tok)), "session token not stored in clear");
  // Wrong password: a different key, its own valid signature, same response shape, empty vault.
  const wrong = await deriveArkAccount("sessuser1", "sess-pass-WRONG");
  const n4 = (await call({ op: "account_challenge", payload: { vault_pub: wrong.pub } }, e2)).result.nonce;
  const w = await call({ op: "account_session", payload: { vault_pub: wrong.pub, nonce: n4, user_sig: await sign(wrong, n4) } }, e2);
  k(w.result.code === "ARK-OK" && w.result.count === 0 && w.result.vault_id !== me.vault_id, "wrong password → empty vault, no oracle");
  r = await call({ op: "account_challenge", payload: { vault_pub: me.pub } }, { USES: mkKv() });
  k(r.result.code === "ARK-ACCOUNTS-OFF", "challenge default OFF");
  console.log(`verify-ark-account: session ${c} checks ok`);
}

// AZBot #333 MED-1/MED-2/LOW regressions.
{
  let c = 0; const k = (x, m) => { assert.ok(x, m); c++; };
  for (const shape of [{ name: "ark/account_open" }, { name: "ark_account_open" }, { slug: "zz", name: "ark", op: "account_open" }, { slug: "ark", verb: "account_open" }, { tool: "ark", op: "account_open" }]) {
    k(isArkAccountCall(shape), "detect " + JSON.stringify(shape));
    const f = await arkFirewall({ ...shape, Password: P, USERNAME: U, payload: { PassWord: P } });
    k(!leaks(JSON.stringify(f)), "scrub (case-insensitive) " + JSON.stringify(shape));
  }
  k(!leaks(JSON.stringify(scrubCredentialKeys({ a: { Password: P, b: [{ user: U }] } }))), "deep scrub");
  const e3 = { ARK_ACCOUNTS: "on", USES: mkKv() };
  ip = 90;
  const m = await (await post("/mcp", { jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "fraggate_call", arguments: { name: "ark_account_append", Password: P, username: U, payload: { data: "x" } } } }, e3)).text();
  k(!leaks(m), "MCP confirm retry hint carries no password");
  // Flag OFF / rate-limited: no PBKDF2 at all. Deterministic (no wall-clock timing): the handle's raw
  // credentials are still pending and no keys were ever derived.
  {
    const h = await arkFirewall({ slug: "ark", op: "account_open", username: U, password: P });
    const off = await runArkAccountOp("account_open", {}, { USES: mkKv() }, null, null, { handle: h, credential_mode: "hosted" });
    k(off.code === "ARK-ACCOUNTS-OFF" && arkCredsFor(h) && !arkKeysFor(h), "flag off refuses before key derivation");
    const full = mkKv(); const fenv = { ARK_ACCOUNTS: "on", ARK_PLAINTEXT_DOOR: "deprecated-on", USES: full };
    const h2 = await arkFirewall({ slug: "ark", op: "account_open", username: U, password: P });
    const T = 1_800_000_000_000, w = Math.floor(T / 1000 / 900);
    const { RL_PER_PREFIX } = await import("../src/account/ops.js");
    const pre = hex(await sha256("ARK-ACCOUNT:v1:ip|local"));
    full.m.set(`chainlock|ark:rl:p:${pre}:${w}`, String(RL_PER_PREFIX));
    const rl = await runArkAccountOp("account_open", {}, fenv, null, null, { handle: h2, credential_mode: "hosted" }, T);
    k(rl.code === "ARK-RATE" && arkCredsFor(h2) && !arkKeysFor(h2), "rate limit refuses before key derivation");
  }
  // Rate limit before derive: exhausted subject refuses without deriving.
  const { RL_PER_SUBJECT: L } = await import("../src/account/ops.js");
  k(L === 100, "lockout eased to 100/15min");
  // Rate subject is a truncated, window-salted hash, never sha256(username).
  const keysSeen = [...kv.m.keys()].filter((x) => x.includes("ark:rl:s:"));
  const plain = hex(await sha256("ARK-ACCOUNT:v1:rl|" + U));
  k(keysSeen.length > 0 && keysSeen.every((x) => !x.includes(plain) && /ark:rl:s:([0-9a-f]{6}|[0-9a-f]{64}):/.test(x)), "rate subject salted+truncated");
  // verifyArkRows binds to the tip and rechecks ct_sha256.
  const vid2 = [...kv.m.keys()].find((x) => /ark:acct:[0-9a-f]{64}:tip$/.test(x));
  const tip = JSON.parse(kv.m.get(vid2));
  const v = vid2.split(":")[2];
  const rs = []; for (let s2 = 1; s2 <= tip.seq; s2++) rs.push(JSON.parse(kv.m.get(`chainlock|ark:acct:${v}:${s2}`)));
  k((await verifyArkRows(rs, tip)).ok, "rows verify against tip");
  k(tip.seq < 2 || (await verifyArkRows(rs.slice(0, -1), tip)).why === "tip", "truncation detected");
  const bad2 = rs.map((x) => ({ ...x })); bad2[0].ct_b64 = "AAAA";
  k(!(await verifyArkRows(bad2, tip)).ok, "ct_sha256 rechecked");
  console.log(`verify-ark-account: azbot-333 ${c} checks ok`);
}

// AZBot round 2: separator variants; vault counter only after a valid signature.
{
  let c = 0; const k = (x, m) => { assert.ok(x, m); c++; };
  for (const key of ["pass_word", "pass-word", "passWord", "PASS WORD", "user-name", "userName", "Pass_Phrase"]) {
    const f = await arkFirewall({ slug: "ark", op: "account_open", [key]: "SECRET-r2-" + key });
    k(!JSON.stringify(f).includes("SECRET-r2"), "variant scrubbed: " + key);
  }
  const e5 = { ARK_ACCOUNTS: "on", ARK_PLAINTEXT_DOOR: "deprecated-on", USES: mkKv() };
  const v = await deriveArkAccount("r2vaultuser", "r2-vault-pass");
  const { RL_PER_SUBJECT: L } = await import("../src/account/ops.js");
  let r;
  for (let i = 0; i < L + 5; i++) {
    const ts2 = Date.now();
    r = await call({ op: "account_recall", payload: { vault_pub: v.pub, ts: ts2, user_sig: "00".repeat(64) } }, e5);
  }
  k(r.result.code === "ARK-SIG-BAD", "unsigned flood never reaches the vault counter");
  const ts3 = Date.now();
  r = await call({ op: "account_recall", payload: { vault_pub: v.pub, ts: ts3, user_sig: await signBytes(v.signKey, recallMessage(v.vault_id, ts3)) } }, e5);
  k(r.result.code === "ARK-OK", "owner not locked out by forged-signature flood");
  console.log(`verify-ark-account: azbot-r2 ${c} checks ok`);
}

// §12.2: plaintext door refused by default; firewall still scrubs; nothing derived or stored.
{
  let c = 0; const k = (x, m) => { assert.ok(x, m); c++; };
  const e4 = { ARK_ACCOUNTS: "on", USES: mkKv() };
  for (const op of ["account_open", "account_append", "account_recall", "account_session"]) {
    const before = [...e4.USES.m.keys()].filter((x) => x.includes("ark:")).length;
    const r = await call({ op, username: U, password: P, payload: { data: "x" } }, e4);
    k(r.result.code === "ARK-PLAINTEXT-REFUSED" && r.result.written === false, "plaintext refused: " + op);
    k([...e4.USES.m.keys()].filter((x) => x.includes("ark:")).length === before, "refused plaintext writes no ark KV key (no rate counter): " + op);
  }
  k(![...e4.USES.m.keys()].some((x) => x.includes("ark:acct:")) && !leaks(JSON.stringify([...e4.USES.m.entries()])), "nothing stored, no secret");
  const m = await (await post("/mcp", { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "fraggate_call", arguments: { slug: "ark", op: "account_open", Password: P, username: U, confirm: true } } }, e4)).text();
  k(m.includes("ARK-PLAINTEXT-REFUSED") && !leaks(m), "MCP plaintext refused, no echo");
  const wt = (await import("node:fs")).readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  k(!wt.includes("ARK_PLAINTEXT_DOOR"), "deprecated door not configured in wrangler.toml");
  console.log(`verify-ark-account: plaintext-refused ${c} checks ok`);
}

// Flake root cause (verify-ark-account:81): SweepGate's "MZ" mark matched random ciphertext. Opaque base64 now
// passes; the same marks in any other field (or non-base64 ct_b64) are still isolated.
{
  let c = 0; const k = (x, m) => { assert.ok(x, m); c++; };
  const e6 = { ARK_ACCOUNTS: "on", ARK_PLAINTEXT_DOOR: "deprecated-on", USES: mkKv() };
  const d6 = await deriveArkAccount("sweepuser", "sweep-pass-123");
  const mk = async (ct, extra = {}) => {
    const sha = hex(await sha256(ct)); const t = Date.now();
    const tipRaw = e6.USES.m.get(`chainlock|ark:acct:${d6.vault_id}:tip`);
    const tp = tipRaw ? JSON.parse(tipRaw) : { seq: 0, row_hash: "0".repeat(64) };
    const b = { spec: "ARK-ACCOUNT-1.0", vault_id: d6.vault_id, seq: tp.seq + 1, prev: tp.row_hash, kind: "note", ct_sha256: sha, ts: t };
    return call({ op: "account_append", payload: { vault_pub: d6.pub, seq: b.seq, prev: b.prev, kind: "note", ct_b64: ct, ct_sha256: sha, ts: t, user_sig: await signBytes(d6.signKey, appendMessage(b)), ...extra } }, e6);
  };
  let r = await mk("AAAAMZAAAATVpAAAAAAAAAAA");
  k(r.result && r.result.written, "base64 ciphertext containing MZ / TVp marks is admitted");
  r = await mk("<script>eval(1)</script>");
  k(r.code === "FG-SWEEP-ISOLATE", "non-base64 ct_b64 is still swept");
  r = await mk("AAAA", { note: "MZ meterpreter" });
  k(r.code === "FG-SWEEP-ISOLATE", "other fields still swept");
  for (let i = 0; i < 40; i++) { const ct = await sealData(d6.encKey, d6.vault_id, 99, "n" + i); r = await mk(ct); if (!r.result || !r.result.written) break; }
  k(r.result && r.result.written, "40 random-ciphertext appends all admitted");
  const rt = Date.now();
  r = await call({ op: "account_recall", payload: { vault_pub: d6.pub, ts: rt, limit: 50, user_sig: await signBytes(d6.signKey, recallMessage(d6.vault_id, rt)) } }, e6);
  k(r.result && r.result.rows.length > 1 && r.result.rows.some((x) => x.ct_b64.includes("MZ")), "recall returns real ciphertext incl. an MZ-marked row (outbound sweep stand-in)");
  console.log(`verify-ark-account: sweep-opaque ${c} checks ok`);
}

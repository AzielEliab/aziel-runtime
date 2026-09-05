/**
 * 1.4.1 production gates (kept in 1.6.0): ready, token, rate-limit, receipt cap, TTL, HEAD, no-store.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_ROLE, RUNTIME_VERSION, VERSION_HISTORY, authoritySnapshot } from "../src/runtime-api.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  applyClose,
  applyOpen,
  applyPolicy,
  newSessionId,
  openSession,
  recordIntent,
} from "../src/session-core.js";
import {
  RATE_EXEC_PER_MIN,
  RATE_OPEN_PER_MIN,
  RECEIPT_CAP,
  ROLE_HEADER,
  SESSION_TTL_MS,
  VERSION_HEADER,
  clientIp,
  evaluateReady,
  extractRuntimeToken,
  isSessionExpired,
  rateLimitDecision,
  receiptCapReached,
  sessionMutateAuth,
  timingSafeEqualString,
  tokenGateState,
} from "../src/production.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

function baseEnv(extra = {}) {
  const env = { ...extra };
  env.SESSION = extra.SESSION === null ? undefined : extra.SESSION || memorySessionNamespace(env);
  return env;
}

async function req(env, path, init = {}) {
  return handler(new Request(origin + path, init), env);
}

async function jsonReq(env, path, method, body, headers = {}) {
  const res = await req(env, path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, headers: res.headers };
}

// --- helpers ---
assert.equal(RUNTIME_VERSION, "1.6.0");
assert.equal(RECEIPT_CAP, 64);
assert.equal(SESSION_TTL_MS, 6 * 60 * 60 * 1000);
assert.equal(RATE_OPEN_PER_MIN, 20);
assert.equal(RATE_EXEC_PER_MIN, 60);
assert.equal(authoritySnapshot().version, "1.6.0");
assert.ok(VERSION_HISTORY.some((row) => row.version === "1.6.0" && row.status === "current"));
assert.ok(VERSION_HISTORY.some((row) => row.version === "1.5.0" && row.status === "superseded"));
assert.ok(VERSION_HISTORY.some((row) => row.version === "1.4.1"));
assert.ok(VERSION_HISTORY.every((row) => row.version && row.note));
assert.equal(timingSafeEqualString("secret", "secret"), true);
assert.equal(timingSafeEqualString("secret", "secreT"), false);
assert.equal(timingSafeEqualString("", ""), false);

const tokenReq = new Request(origin + "/", {
  headers: { Authorization: "Bearer abc", "X-Aziel-Runtime-Token": "named" },
});
assert.equal(extractRuntimeToken(tokenReq), "named");
assert.equal(extractRuntimeToken(new Request(origin + "/", { headers: { Authorization: "Bearer only" } })), "only");
assert.equal(clientIp(new Request(origin + "/", { headers: { "CF-Connecting-IP": "1.2.3.4" } })), "1.2.3.4");

const devGate = tokenGateState({});
assert.equal(devGate.mutate_requires_token, false);
assert.equal(devGate.ready_blocked, false);
assert.equal(tokenGateState({ REQUIRE_TOKEN: "1" }).ready_blocked, true);
assert.equal(tokenGateState({ REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "x" }).ready_blocked, false);
assert.equal(tokenGateState({ RUNTIME_TOKEN: "x" }).mutate_requires_token, false);
assert.equal(tokenGateState({ REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "x" }).mutate_requires_token, true);

const noBind = evaluateReady({});
assert.equal(noBind.status, 503);
assert.equal(noBind.code, "session_binding_missing");
const missingSecret = evaluateReady({ SESSION: { idFromName() {} }, REQUIRE_TOKEN: "1" });
assert.equal(missingSecret.status, 503);
assert.equal(missingSecret.code, "token_not_configured");
const readyOk = evaluateReady({ SESSION: { idFromName() {} } });
assert.equal(readyOk.status, 200);

const denied = sessionMutateAuth(new Request(origin + "/v1/session/open", { method: "POST" }), { REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "s3cret" });
assert.equal(denied.status, 401);
assert.equal(denied.body.code, "token_required");
const mismatch = sessionMutateAuth(
  new Request(origin + "/v1/session/open", { method: "POST", headers: { Authorization: "Bearer nope" } }),
  { REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "s3cret" },
);
assert.equal(mismatch.status, 401);
assert.equal(mismatch.body.code, "token_mismatch");
const allowed = sessionMutateAuth(
  new Request(origin + "/v1/session/open", { method: "POST", headers: { "X-Aziel-Runtime-Token": "s3cret" } }),
  { REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "s3cret" },
);
assert.equal(allowed.ok, true);

const old = openSession({
  id: newSessionId(),
  now: new Date(Date.now() - SESSION_TTL_MS - 1000).toISOString(),
  version: RUNTIME_VERSION,
  source: "test",
});
assert.equal(isSessionExpired(old), true);
const fresh = openSession({ id: newSessionId(), now: new Date().toISOString(), version: RUNTIME_VERSION, source: "test" });
assert.equal(isSessionExpired(fresh), false);

// --- HTTP ready ---
const envOk = baseEnv();
const ready = await jsonReq(envOk, "/v1/ready", "GET");
assert.equal(ready.status, 200);
assert.equal(ready.data.ok, true);
assert.equal(ready.data.version, RUNTIME_VERSION);
assert.equal(ready.data.role, RUNTIME_ROLE);
assert.equal(ready.data.session_binding, true);
assert.equal(ready.headers.get(VERSION_HEADER), RUNTIME_VERSION);
assert.match(ready.headers.get("Cache-Control") || "", /no-store/);
assert.match(ready.headers.get("CDN-Cache-Control") || "", /no-store/);

const envNoSession = { ASSETS: undefined };
const readyDown = await jsonReq(envNoSession, "/v1/ready", "GET");
assert.equal(readyDown.status, 503);
assert.equal(readyDown.data.code, "session_binding_missing");
assert.equal(readyDown.data.ok, false);
assert.equal(readyDown.data.version, RUNTIME_VERSION);
assert.equal(readyDown.data.role, RUNTIME_ROLE);

const envRequire = baseEnv({ REQUIRE_TOKEN: "1" });
const readyTok = await jsonReq(envRequire, "/v1/ready", "GET");
assert.equal(readyTok.status, 503);
assert.equal(readyTok.data.code, "token_not_configured");
assert.equal(readyTok.data.require_token, true);
assert.equal(readyTok.data.token_configured, false);

const envRequireSet = baseEnv({ REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "prod-token" });
const readyTokOk = await jsonReq(envRequireSet, "/v1/ready", "GET");
assert.equal(readyTokOk.status, 200);
assert.equal(readyTokOk.data.token_configured, true);

// public surfaces stay open (secret alone does NOT lock session mutate)
const publicEnv = baseEnv({ RUNTIME_TOKEN: "prod-token" });
for (const path of ["/v1/health", "/v1/runtime.json", "/v1/catalog.json", "/v1/skill", "/v1/bundle"]) {
  const res = await req(publicEnv, path);
  assert.equal(res.status, 200, path);
}
const openWhileFlagOff = await jsonReq(publicEnv, "/v1/session/open", "POST", {});
assert.equal(openWhileFlagOff.status, 200, "REQUIRE_TOKEN=0 keeps session open even with secret set");

// --- token on mutate only when REQUIRE_TOKEN=1 ---
const gatedEnv = baseEnv({ REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "prod-token" });
const noTok = await jsonReq(gatedEnv, "/v1/session/open", "POST", {});
assert.equal(noTok.status, 401);
assert.equal(noTok.data.code, "token_required");

const badTok = await jsonReq(gatedEnv, "/v1/session/open", "POST", {}, { Authorization: "Bearer wrong" });
assert.equal(badTok.status, 401);
assert.equal(badTok.data.code, "token_mismatch");

const opened = await jsonReq(gatedEnv, "/v1/session/open", "POST", {}, { Authorization: "Bearer prod-token" });
assert.equal(opened.status, 200);
assert.equal(opened.data.ok, true);
const sid = opened.data.session.id;
assert.equal(opened.data.session.receipt_cap, RECEIPT_CAP);
assert.ok(opened.data.session.expires_at);

const namedTok = await jsonReq(
  gatedEnv,
  `/v1/session/${sid}/policy`,
  "POST",
  { allow_slugs: ["azclce"] },
  { "X-Aziel-Runtime-Token": "prod-token" },
);
assert.equal(namedTok.status, 200);

const execDenied = await jsonReq(
  gatedEnv,
  `/v1/session/${sid}/exec`,
  "POST",
  { slug: "azclce", op: "score", payload: { r: "a", d: "b", p: "c" } },
);
assert.equal(execDenied.status, 401);

const execOk = await jsonReq(
  gatedEnv,
  `/v1/session/${sid}/exec`,
  "POST",
  { slug: "azclce", op: "score", payload: { r: "login button blue", d: "login form submits", p: "login button submits" } },
  { Authorization: "Bearer prod-token" },
);
assert.equal(execOk.status, 200);
assert.equal(execOk.data.exec.mode, "local");
assert.equal(execOk.data.exec.true_engine_runtime, true);
assert.match(execOk.data.exec.engine_digest, /^[a-f0-9]{64}$/);
assert.equal(execOk.data.exec.ran_in, "aziel-runtime");

const closeNoTok = await jsonReq(gatedEnv, `/v1/session/${sid}/close`, "POST", {});
assert.equal(closeNoTok.status, 401);
const closed = await jsonReq(gatedEnv, `/v1/session/${sid}/close`, "POST", {}, { Authorization: "Bearer prod-token" });
assert.equal(closed.status, 200);

// REQUIRE_TOKEN=1 without secret blocks mutate
const requireBare = await jsonReq(envRequire, "/v1/session/open", "POST", {});
assert.equal(requireBare.status, 503);
assert.equal(requireBare.data.code, "token_not_configured");

// --- rate limits ---
const rateEnv = baseEnv();
let lastOpen = null;
for (let i = 0; i < RATE_OPEN_PER_MIN; i++) {
  lastOpen = await jsonReq(rateEnv, "/v1/session/open", "POST", {}, { "CF-Connecting-IP": "9.9.9.9" });
  assert.equal(lastOpen.status, 200, `open ${i + 1}`);
}
const limitedOpen = await jsonReq(rateEnv, "/v1/session/open", "POST", {}, { "CF-Connecting-IP": "9.9.9.9" });
assert.equal(limitedOpen.status, 429);
assert.equal(limitedOpen.data.code, "rate_limited");
assert.equal(limitedOpen.data.scope, "session_open");
assert.equal(limitedOpen.data.limit, RATE_OPEN_PER_MIN);
assert.ok(limitedOpen.data.retry_after >= 1);
assert.ok(limitedOpen.headers.get("Retry-After"));

const otherIp = await jsonReq(rateEnv, "/v1/session/open", "POST", {}, { "CF-Connecting-IP": "8.8.8.8" });
assert.equal(otherIp.status, 200);

const execEnv = baseEnv();
const execSid = (await jsonReq(execEnv, "/v1/session/open", "POST", {}, { "CF-Connecting-IP": "7.7.7.7" })).data.session.id;
for (let i = 0; i < RATE_EXEC_PER_MIN; i++) {
  const ex = await jsonReq(
    execEnv,
    `/v1/session/${execSid}/exec`,
    "POST",
    { slug: "azclce", op: "health", payload: {} },
    { "CF-Connecting-IP": "7.7.7.7" },
  );
  assert.equal(ex.status, 200, `exec ${i + 1}`);
}
const limitedExec = await jsonReq(
  execEnv,
  `/v1/session/${execSid}/exec`,
  "POST",
  { slug: "azclce", op: "health", payload: {} },
  { "CF-Connecting-IP": "7.7.7.7" },
);
assert.equal(limitedExec.status, 429);
assert.equal(limitedExec.data.code, "rate_limited");
assert.equal(limitedExec.data.scope, "session_exec");
assert.equal(limitedExec.data.limit, RATE_EXEC_PER_MIN);

const helperEnv = {};
for (let i = 0; i < RATE_OPEN_PER_MIN; i++) {
  assert.equal(rateLimitDecision(helperEnv, new Request(origin, { headers: { "CF-Connecting-IP": "10.0.0.1" } }), "open").ok, true);
}
assert.equal(rateLimitDecision(helperEnv, new Request(origin, { headers: { "CF-Connecting-IP": "10.0.0.1" } }), "open").ok, false);

// --- receipt cap ---
const capNow = "2026-09-05T00:00:00.000Z";
const capSession = openSession({ id: newSessionId(), now: capNow, version: RUNTIME_VERSION, source: "cap" });
await applyOpen(capSession, capNow);
while (!receiptCapReached(capSession)) {
  await applyPolicy(capSession, { note: `n${capSession.receipts.length}` }, capNow);
}
assert.equal(capSession.receipts.length, RECEIPT_CAP);
let capHit = false;
try {
  await applyPolicy(capSession, { note: "overflow" }, capNow);
} catch (err) {
  capHit = err.code === "receipt_cap";
  assert.equal(err.status, 409);
}
assert.equal(capHit, true);
const sealed = await applyClose(capSession, capNow);
assert.equal(sealed.receipt.event, "close");
assert.ok(sealed.session.receipts.length > RECEIPT_CAP);

// --- TTL expire (core) ---
const expired = openSession({
  id: newSessionId(),
  now: new Date(Date.parse(capNow) - SESSION_TTL_MS - 1).toISOString(),
  version: RUNTIME_VERSION,
  source: "ttl",
});
await applyOpen(expired, expired.opened_at);
let ttlHit = false;
try {
  await recordIntent(
    expired,
    { slug: "azclce", op: "health", payload: {}, payloadText: "{}", knownSlugs: new Set(["azclce"]) },
    capNow,
  );
} catch (err) {
  ttlHit = err.code === "session_expired";
  assert.equal(err.status, 410);
}
assert.equal(ttlHit, true);

// HEAD + catalog authority
const headReady = await req(envOk, "/v1/ready", { method: "HEAD" });
assert.equal(headReady.status, 200);
assert.equal(headReady.headers.get(VERSION_HEADER), RUNTIME_VERSION);
assert.equal(headReady.headers.get(ROLE_HEADER), RUNTIME_ROLE);
assert.equal(await headReady.text(), "");

const catalog = await jsonReq(envOk, "/v1/catalog.json", "GET");
assert.equal(catalog.status, 200);
assert.equal(catalog.data.version, RUNTIME_VERSION);
assert.ok(!Object.prototype.hasOwnProperty.call(catalog.data, "honest"));
assert.equal(catalog.data.authoritySnapshot.version, RUNTIME_VERSION);
assert.match(catalog.headers.get("Cache-Control") || "", /no-store/);

assert.ok(PRODUCTS.length >= 20);
console.log(
  `ok production ${RUNTIME_VERSION}: ready/token/rate-limit/${RECEIPT_CAP}-cap/TTL ${SESSION_TTL_MS}ms/HEAD/no-store`,
);

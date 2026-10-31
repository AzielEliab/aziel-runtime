/**
 * Every session route the handler serves appears in /openapi.json with the right method and auth, and
 * in the "not a session route" hint. Routes are read from src/session-http.js itself, so a new route
 * without docs fails here. Auth is derived from behavior, not a hardcoded list: RuntimeToken must match
 * the token gate (isSessionMutatePath, cross-checked by a no-token request under REQUIRE_TOKEN=1) and
 * IssuerKey must match the routes that actually answer 403 CL-NOT-ISSUER (missing_key) to a token-only call.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { isSessionMutatePath } from "../src/production.js";
import { memorySessionNamespace } from "../src/session-do.js";

let n = 0;

/**
 * Parse `if (...)` route conditions in either order:
 *   if (action === "x" && request.method === "POST")
 *   if ((action === "a" || action === "b") && request.method === "POST")
 *   if (request.method === "POST" && action === "x")
 *   if (request.method === "POST" && (action === "a" || action === "b"))
 * A condition naming an action but no method (or several methods) fails the parse instead of being skipped.
 */
export function parseRoutes(src) {
  const out = [];
  for (const line of src.split("\n")) {
    const m = line.match(/^\s*if \((.*)\)\s*\{\s*$/);
    if (!m || !/\baction === "/.test(m[1])) continue;
    const methods = [...m[1].matchAll(/request\.method === "([A-Z]+)"/g)].map((x) => x[1]);
    const actions = [...m[1].matchAll(/\baction === "([a-z]+)"/g)].map((x) => x[1]);
    assert.equal(methods.length, 1, `route condition must name exactly one method: ${line.trim()}`);
    assert.doesNotMatch(m[1], /action !==|request\.method !==/, `negated route condition is not parsable: ${line.trim()}`);
    for (const a of actions) out.push({ action: a, method: methods[0] });
  }
  return out;
}
// Guard the parser itself on both orderings (AZBot nit: reversed order used to be missed).
{
  const sample = [
    '  if (action === "a" && request.method === "GET") {',
    '  if ((action === "b" || action === "c") && request.method === "POST") {',
    '  if (request.method === "POST" && action === "d") {',
    '  if (request.method === "POST" && (action === "e" || action === "f")) {',
  ].join("\n");
  assert.deepEqual(parseRoutes(sample).map((r) => r.method + " " + r.action), ["GET a", "POST b", "POST c", "POST d", "POST e", "POST f"]);
  assert.throws(() => parseRoutes('  if (action === "g") {'), /exactly one method/);
  n++;
}

/** An empty object in a security array makes auth optional (AZBot nit); several objects are OR. Both refused. */
function assertSecurityShape(sec, path) {
  assert.ok(Array.isArray(sec), `${path}: security must be an array`);
  for (const s of sec) assert.ok(s && typeof s === "object" && Object.keys(s).length > 0, `${path}: optional auth ({}) in security`);
  assert.ok(sec.length <= 1, `${path}: schemes are AND, not OR`);
}

const src = fs.readFileSync(new URL("../src/session-http.js", import.meta.url), "utf8");
const routes = parseRoutes(src);
const actions = routes.map((r) => r.action).sort();
for (const a of ["close", "exec", "pause", "policy", "receipt", "receipts", "resume", "revoke", "spec", "stale", "status"]) assert.ok(actions.includes(a), `parser missed ${a}`);
n++;

const handler = (await import("../src/index.js")).default.fetch;
const doc = await (await handler(new Request("https://rt.example/openapi.json"), {})).json();
const SID = "sess_" + "a".repeat(32);

// Derive token-gated and issuer-only routes from behavior (REQUIRE_TOKEN=1, fresh session per route).
const TOKEN = "rt_" + "d".repeat(40);
const env = { SESSION: memorySessionNamespace({}), REQUIRE_TOKEN: "1", RUNTIME_TOKEN: TOKEN, __aziel_rate_limits: { anon_mutate: 100 } };
const call = (m, p, body, token) => handler(new Request("https://rt.example" + p, { method: m, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, ...(m === "POST" ? { body: JSON.stringify(body || {}) } : {}) }), env);
const VALID = { stale: { new_world_version: "w-2", reason: "r" }, revoke: { reason: "r" }, exec: { slug: "foldlock", op: "health", payload: {} } };
const ISSUER = new Set();
for (const r of routes) {
  const open = await (await call("POST", "/v1/session/open", { expect: { spec: "s", verdict_criteria: "c", world_version: "w-1" } }, TOKEN)).json();
  const p = r.action === "status" ? `/v1/session/${open.session.id}` : `/v1/session/${open.session.id}/${r.action}`;
  const noTok = await call(r.method, p, VALID[r.action]);
  const gated = isSessionMutatePath(p, r.method);
  assert.equal(noTok.status === 401, gated, `${r.method} ${r.action}: no-token 401 must match isSessionMutatePath`);
  const res = await call(r.method, p, VALID[r.action], TOKEN);
  const body = await res.json();
  if (res.status === 403 && body.code === "CL-NOT-ISSUER" && body.reason === "missing_key") ISSUER.add(r.action);
}
// These four must stay issuer-only; a regression that drops the check fails here, not only in the docs.
for (const a of ["stale", "revoke", "pause", "resume"]) assert.ok(ISSUER.has(a), `${a} must be issuer-only`);
n++;

const all = [
  { path: "/v1/session/open", method: "POST", action: "open" },
  ...routes.map((r) => ({ ...r, path: r.action === "status" ? "/v1/session/{id}" : `/v1/session/{id}/${r.action}` })),
  ...routes.filter((r) => r.action === "status").map((r) => ({ ...r, path: "/v1/session/{id}/status" })),
];
for (const r of all) {
  const op = doc.paths[r.path] && doc.paths[r.path][r.method.toLowerCase()];
  assert.ok(op, `openapi.json is missing ${r.method} ${r.path}`);
  const sec = op.security || [];
  assertSecurityShape(sec, r.path);
  const schemes = new Set(sec.flatMap((s) => Object.keys(s)));
  const concrete = r.path.replace("{id}", SID);
  assert.equal(schemes.has("RuntimeToken"), isSessionMutatePath(concrete, r.method), `${r.path}: RuntimeToken must match the token gate`);
  assert.equal(schemes.has("IssuerKey"), ISSUER.has(r.action), `${r.path}: IssuerKey must match issuer-only routes`);
  const resp = op.responses || {};
  const d = (c) => (resp[c] && resp[c].description) || "";
  if (ISSUER.has(r.action)) {
    assert.ok((op.parameters || []).some((p) => p.in === "header" && p.name === "X-Azrt-Issuer-Key" && p.required), `${r.path}: issuer header param`);
    assert.match(d("403"), /CL-NOT-ISSUER/, `${r.path}: 403 code`);
  }
  if (schemes.has("RuntimeToken") && ISSUER.has(r.action)) {
    assert.match(d("401"), /token_required/, `${r.path}: 401 token_required`);
    assert.match(d("401"), /token_mismatch/, `${r.path}: 401 token_mismatch`);
    assert.match(d("400"), /TOKEN-QUERY-REFUSED/, `${r.path}: 400 TOKEN-QUERY-REFUSED`);
    assert.match(d("503"), /token_not_configured/, `${r.path}: 503 token_not_configured`);
    assert.match(d("429"), /rate limit/, `${r.path}: 429 documented`);
  }
  if (schemes.has("RuntimeToken") && r.action !== "open") assert.ok(resp["401"] || ["policy", "exec", "close"].includes(r.action), `${r.path}: 401 documented`);
  // Every session route goes through the SESSION Durable Object.
  assert.match(d("503"), /session_binding_missing/, `${r.path}: 503 session_binding_missing`);
  assert.match(d("500"), /session_error/, `${r.path}: 500 session_error`);
}
n++;

// The shape check really fails closed on the AZBot examples.
assert.throws(() => assertSecurityShape([{ IssuerKey: [] }, {}], "x"), /optional auth/);
assert.throws(() => assertSecurityShape([{}], "x"), /optional auth/);
assert.throws(() => assertSecurityShape([{ RuntimeToken: [] }, { IssuerKey: [] }], "x"), /AND, not OR/);
assertSecurityShape([{ RuntimeToken: [], IssuerKey: [] }], "x");

// Refusal codes for the routes AZBot flagged.
const codes = (p) => JSON.stringify(doc.paths[p].post.responses);
for (const c of ["SPEC-STALE-NO-SPEC", "SPEC-STALE-SAME-VERSION", "SPEC-STALE-INVALID", "session_closed", "SESSION-PAUSED"]) assert.ok(codes("/v1/session/{id}/stale").includes(c), c);
for (const c of ["REVOKE-DUPLICATE", "REVOKE-INVALID", "SESSION-PAUSED"]) assert.ok(codes("/v1/session/{id}/revoke").includes(c), c);
assert.ok(codes("/v1/session/{id}/pause").includes("SESSION-PAUSED"));
for (const c of ["RESUME-ANCHOR-MISMATCH", "RESUME-ANCHOR-NOT-CHECKED", "token_required"]) assert.ok(codes("/v1/session/{id}/resume").includes(c), c);
const issuerScheme = doc.components.securitySchemes.IssuerKey;
assert.deepEqual([issuerScheme.type, issuerScheme.in, issuerScheme.name], ["apiKey", "header", "X-Azrt-Issuer-Key"]);
assert.match(doc.components.securitySchemes.RuntimeToken.description, /pause\/resume\/stale\/revoke/); n++;
// The 404 hint lists every route.
const res = await handler(new Request(`https://rt.example/v1/session/${SID}/nope/x`, { method: "GET" }), {});
const hint = (await res.json()).hint || "";
for (const r of all.filter((x) => x.action !== "status")) assert.ok(hint.includes(`${r.method} ${r.path}`), `hint missing ${r.method} ${r.path}`);
n++;
console.log(`ok session routes documented in openapi.json + hint: ${n} checks`);

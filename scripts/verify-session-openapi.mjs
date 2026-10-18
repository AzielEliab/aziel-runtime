/**
 * Every session route the handler serves appears in /openapi.json with the right method and auth, and
 * in the "not a session route" hint. Routes are read from src/session-http.js itself, so a new route
 * without docs fails here. Docs only: no behavior is tested beyond what the handler already does.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { isSessionMutatePath } from "../src/production.js";

let n = 0;
const src = fs.readFileSync(new URL("../src/session-http.js", import.meta.url), "utf8");
const routes = [];
for (const m of src.matchAll(/if \(\(?((?:action === "[a-z]+"(?: \|\| )?)+)\)? && request\.method === "([A-Z]+)"\)/g)) {
  for (const a of m[1].matchAll(/"([a-z]+)"/g)) routes.push({ action: a[1], method: m[2] });
}
const actions = routes.map((r) => r.action).sort();
// Guard the parser itself: it must see every route this PR documents.
for (const a of ["close", "exec", "pause", "policy", "receipt", "receipts", "resume", "revoke", "spec", "stale", "status"]) assert.ok(actions.includes(a), `parser missed ${a}`);
n++;

const handler = (await import("../src/index.js")).default.fetch;
const doc = await (await handler(new Request("https://rt.example/openapi.json"), {})).json();
const SID = "sess_" + "a".repeat(32);
const ISSUER = new Set(["stale", "revoke", "pause", "resume"]);
const all = [{ path: "/v1/session/open", method: "POST", action: "open" }, ...routes.map((r) => ({ ...r, path: r.action === "status" ? "/v1/session/{id}" : `/v1/session/{id}/${r.action}` }))];
for (const r of all) {
  const op = doc.paths[r.path] && doc.paths[r.path][r.method.toLowerCase()];
  assert.ok(op, `openapi.json is missing ${r.method} ${r.path}`);
  const schemes = new Set((op.security || []).flatMap((s) => Object.keys(s)));
  const concrete = r.path.replace("{id}", SID);
  assert.equal(schemes.has("RuntimeToken"), isSessionMutatePath(concrete, r.method), `${r.path}: RuntimeToken must match the token gate`);
  assert.equal(schemes.has("IssuerKey"), ISSUER.has(r.action), `${r.path}: IssuerKey must match issuer-only routes`);
  // Token and issuer must be required together (one security object = AND), never as alternatives.
  if (schemes.size > 1) assert.equal(op.security.length, 1, `${r.path}: schemes are AND, not OR`);
  if (ISSUER.has(r.action)) {
    assert.ok((op.parameters || []).some((p) => p.in === "header" && p.name === "X-Azrt-Issuer-Key" && p.required), `${r.path}: issuer header param`);
    assert.match(op.responses["403"].description, /CL-NOT-ISSUER/, `${r.path}: 403 code`);
  }
  if (schemes.has("RuntimeToken") && r.action !== "open") assert.ok(op.responses["401"] || ["policy", "exec", "close"].includes(r.action), `${r.path}: 401 documented`);
}
n++;
// Refusal codes for the routes AZBot flagged.
const codes = (p) => JSON.stringify(doc.paths[p].post.responses);
for (const c of ["SPEC-STALE-NO-SPEC", "SPEC-STALE-SAME-VERSION", "SPEC-STALE-INVALID", "session_closed"]) assert.ok(codes("/v1/session/{id}/stale").includes(c), c);
for (const c of ["REVOKE-DUPLICATE", "REVOKE-INVALID"]) assert.ok(codes("/v1/session/{id}/revoke").includes(c), c);
assert.ok(codes("/v1/session/{id}/pause").includes("SESSION-PAUSED"));
for (const c of ["RESUME-ANCHOR-MISMATCH", "RESUME-ANCHOR-NOT-CHECKED", "token_required"]) assert.ok(codes("/v1/session/{id}/resume").includes(c), c);
const issuerScheme = doc.components.securitySchemes.IssuerKey;
assert.deepEqual([issuerScheme.type, issuerScheme.in, issuerScheme.name], ["apiKey", "header", "X-Azrt-Issuer-Key"]);
assert.match(doc.components.securitySchemes.RuntimeToken.description, /pause\/resume/); n++;
// The 404 hint lists every route.
const res = await handler(new Request(`https://rt.example/v1/session/${SID}/nope/x`, { method: "GET" }), {});
const hint = (await res.json()).hint || "";
for (const r of all.filter((x) => x.action !== "status")) assert.ok(hint.includes(`${r.method} ${r.path}`), `hint missing ${r.method} ${r.path}`);
n++;
console.log(`ok session routes documented in openapi.json + hint: ${n} checks`);

/** GET /v1/version: fixed shape, honest (enabled:false, key_pinned:false), HEAD ok, existing /v1/health unchanged. */
import assert from "node:assert/strict";
const handler = (await import("../src/index.js")).default.fetch;
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const env = { GIT_SHA: "a4f8a17" };
const res = await handler(new Request("https://aziel-runtime.example/v1/version", { headers: { "user-agent": "Mozilla/5.0" } }), env);
ok(res.status === 200, "200");
const b = await res.json();
ok(Object.keys(b.auto_update).sort().join() === "enabled,key_pinned,last_applied,last_check,last_code,paused", "auto_update keys");
for (const k of ["ok", "product", "version", "git_sha", "manifest_hash", "update_channel", "auto_update", "live"]) ok(k in b, "has " + k);
ok(b.version === "2.0.0-rc1" && b.product === "aziel-runtime", "version lock");
ok(b.auto_update.enabled === false && b.auto_update.key_pinned === false && b.auto_update.last_code === "UPDATE-NO-KEY" && b.live === false, "honest off");
ok(b.manifest_hash === null, "no manifest yet");
const head = await handler(new Request("https://aziel-runtime.example/v1/version", { method: "HEAD" }), env);
ok(head.status === 200 && (await head.text()) === "", "HEAD");
const h = await (await handler(new Request("https://aziel-runtime.example/v1/health"), env)).json();
ok(!("auto_update" in h), "/v1/health shape unchanged");
console.log(`verify-auto-update-version: ${n} checks ok`);

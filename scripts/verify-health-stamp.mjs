/** HEALTH-BUILD-STAMP-1.0: /v1/health carries git_sha and version_id, matching /v1/software; null when unset. */
import assert from "node:assert/strict";
import worker from "../src/index.js";
let n = 0;
const get = async (p, env) => (await worker.fetch(new Request("https://x.example" + p), env, { waitUntil() {} })).json();
const sha = "a".repeat(40);
const env = { GIT_SHA: sha, CF_VERSION_METADATA: { id: "11111111-2222-3333-4444-555555555555", tag: "", timestamp: "2026-10-11T00:00:00Z" } };
const h = await get("/v1/health", env);
assert.equal(h.git_sha, sha); assert.equal(h.version_id, env.CF_VERSION_METADATA.id); assert.equal(h.version_id_source, "cf_version_metadata"); n++;
const sw = await get("/v1/software", env);
assert.equal(h.git_sha, sw.git_sha); assert.equal(h.version_id, sw.version_id); n++;
const bare = await get("/v1/health", {});
assert.ok("git_sha" in bare && "version_id" in bare); assert.equal(bare.version_id, null); assert.match(bare.version_id_note, /No version_id was invented|unbound/); n++;
console.log(`ok health stamp: ${n} checks`);

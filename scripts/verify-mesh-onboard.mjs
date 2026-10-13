import assert from "node:assert/strict";
const { default: worker } = await import("../src/index.js");
const { installPlan, installScript, bootstrapList, NEW_USER_HINTS } = await import("../src/mesh-onboard.js");
const o = "https://aziel-runtime.example";
const get = (p) => worker.fetch(new Request(o + p), {}, { waitUntil() {} });
let r = await get("/v1/mesh/install?slug=vibelock&version=1.2.0");
let b = await r.json();
assert.equal(r.status, 200); assert.equal(b.ok, true); assert.equal(b.node_per_version, true);
assert.equal(b.live, false); assert.equal(b.alt_internet_live, false); assert.ok(b.hints.length >= 4);
assert.match(b.steps[2].body.node_id, /^vibelock-1\.2\.0-<random>$/);
r = await get("/v1/mesh/install?slug=Not%20A%20Slug"); assert.equal(r.status, 400); assert.equal((await r.json()).code, "ONBOARD-BAD-SLUG");
r = await get("/v1/mesh/install?slug=nope-not-real"); assert.equal((await r.json()).code, "ONBOARD-UNKNOWN-SLUG");
r = await get("/v1/mesh/install.sh?slug=vibelock&version=1.2.0");
const sh = await r.text();
assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /shellscript/);
assert.match(sh, /^#!\/bin\/sh/); assert.match(sh, /https:\/\/[a-z0-9-]+\.vibelock\.workers\.dev\/install\.sh/); assert.match(sh, /\/v1\/mesh\/join/); assert.match(sh, /not live yet/);
r = await get("/v1/mesh/install.sh?slug=bad%27slug"); assert.equal(r.status, 400); assert.match(await r.text(), /exit 1/);
r = await get("/v1/mesh/bootstrap");
b = await r.json();
assert.equal(r.status, 200); assert.equal(b.phase, "E"); assert.equal(b.needs_starting_address, true);
assert.equal(b.live_multi_provider, false); assert.equal(b.live, false); assert.equal(b.starting_address_count, 1);
const bl = bootstrapList({ origin: o, nodes: [{ node_id: "a", presence_class: "live" }, { node_id: "b", presence_class: "stale" }] });
assert.equal(bl.peer_count, 1);
assert.ok(NEW_USER_HINTS.every((h) => !/aziel/i.test(h.text)));
console.log("verify-mesh-onboard: ok");
{
  const r = await worker.fetch(new Request(o + "/workspace"), {}, { waitUntil() {} });
  const html = await r.text();
  assert.match(html, /id="azrt-hints"/); assert.match(html, /azrt\.hints\.v1/); assert.match(html, /Got it/);
  { const { newUserHintsHtml } = await import("../src/mesh-onboard.js"); const h = newUserHintsHtml(); assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(h)); assert.equal((h.match(/"id":/g) || []).length, 4); }
  console.log("verify-mesh-onboard: hints popup ok");
}
function newUserHintsHtml_() { return ""; }

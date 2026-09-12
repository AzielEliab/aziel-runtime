/**
 * REMAIN-OFF-BY-DESIGN-2026-09-10 constitutional OFF set.
 * 33 items. Correctly OFF/REFUSED/GATED is not a gap. Do not enable.
 * ARK scorch/wipe/unlock/encrypt stay REFUSE. EmbryoLock wipe/scorch stay
 * LOCAL-ONLY / FG-STUB on the public mesh. Health/skill/doctor/policy may be LIVE.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTS } from "../src/index.js";
import { REMAIN_OFF_BY_DESIGN } from "../src/seo.js";
import { LIVE_OPS, NAMED_STUBS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { POLICY, REMAIN_OFF, SURFACE } from "../src/engines/embryolock/engine.js";
import { memorySessionNamespace } from "../src/session-do.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const paperPath = join(root, "docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md");
const paper = await readFile(paperPath, "utf8");

assert.equal(REMAIN_OFF_BY_DESIGN.id, "REMAIN-OFF-BY-DESIGN-2026-09-10");
assert.equal(REMAIN_OFF_BY_DESIGN.kind, "law");
assert.match(paper, /^# AZIEL RUNTIME — Functions That Should Remain Off, Refused, or Gated by Design/m);
assert.match(paper, /\*\*REMAIN-OFF-BY-DESIGN-2026-09-10\*\*/);
assert.match(paper, /## Inventory \(33\)/);
assert.match(paper, /This paper is the constitutional OFF set\*\* \(33 items\)/);

const inventoryRows = [...paper.matchAll(/^\| (\d+) \|/gm)].map((m) => Number(m[1]));
assert.deepEqual(inventoryRows, Array.from({ length: 33 }, (_, i) => i + 1), "inventory stays 33 numbered items");
assert.ok(!paper.includes("| 34 |"), "do not add a 34th remain-off item");

assert.match(paper, /ARK stub `scorch` \/ `wipe` \/ `unlock` \/ `encrypt`/);
assert.match(paper, /EmbryoLock wipe\/scorch `FG-STUB` on public mesh/);
assert.match(paper, /\*\*ARK\*\* stub ops stay \*\*REFUSE\*\* on the public runtime/);
assert.match(paper, /Never execute on the public mesh/);
assert.match(paper, /Do not execute EmbryoLock wipe \/ scorch on the public mesh/);
assert.match(paper, /Do not host ARK unlock \/ wipe \/ encrypt/);
assert.match(paper, /Do not enable mesh from GET/);
assert.match(paper, /Do not add rollback/);
assert.match(paper, /Do not put AZPIPE or AKM on the Softwares-tab/);
assert.match(paper, /health \/ skill \/ doctor \/ policy \/ limitation \/ verify-hash \*\*LIVE\*\*/);
assert.match(paper, /Not permission to enable EmbryoLock wipe\/scorch\/unlock on the public mesh/);

assert.equal(REMAIN_OFF.id, "REMAIN-OFF-BY-DESIGN-2026-09-10");
assert.deepEqual(REMAIN_OFF.items.slice(), [3, 28]);
assert.equal(REMAIN_OFF.do_not_enable, true);
assert.deepEqual(REMAIN_OFF.ark_refuse.slice(), ["scorch", "wipe", "unlock", "encrypt"]);
assert.equal(POLICY.remain_off, REMAIN_OFF.id);
assert.deepEqual(POLICY.remain_off_items.slice(), [3, 28]);
assert.equal(POLICY.remain_off_do_not_enable, true);
assert.equal(POLICY.public_mesh_destructive, false);
assert.equal(SURFACE, "live-with-local-destructive-boundary");

for (const op of ["scorch", "wipe", "unlock", "encrypt"]) {
  assert.ok(STUB_OPS.ark.includes(op), `ARK ${op} stays STUB_OPS`);
}
for (const op of ["wipe", "scorch", "unlock", "unlock_after_fail", "encrypt"]) {
  assert.ok(STUB_OPS.embryolock.includes(op), `EmbryoLock ${op} stays STUB_OPS`);
}
for (const op of ["health", "skill", "doctor", "policy", "limitation", "verify_hash"]) {
  assert.ok(LIVE_OPS.embryolock.includes(op), `EmbryoLock ${op} may be LIVE`);
  assert.ok(!STUB_OPS.embryolock.includes(op), `EmbryoLock ${op} is not stub`);
}

const registry = buildRegistry(PRODUCTS);
assert.equal(classifyCall(registry.bySlug.ark, "scorch").kind, "stub");
assert.equal(classifyCall(registry.bySlug.ark, "wipe").kind, "stub");
assert.equal(classifyCall(registry.bySlug.ark, "unlock").kind, "stub");
assert.equal(classifyCall(registry.bySlug.ark, "encrypt").kind, "stub");
assert.equal(classifyCall(registry.bySlug.embryolock, "wipe").kind, "stub");
assert.equal(classifyCall(registry.bySlug.embryolock, "scorch").kind, "stub");
assert.equal(classifyCall(registry.bySlug.embryolock, "unlock").kind, "stub");
assert.equal(classifyCall(registry.bySlug.embryolock, "health").kind, "live");
assert.equal(classifyCall(registry.bySlug.embryolock, "skill").kind, "live");
assert.equal(classifyCall(registry.bySlug.embryolock, "doctor").kind, "live");
assert.equal(classifyCall(registry.bySlug.embryolock, "policy").kind, "live");
assert.equal(NAMED_STUBS.length, 0);
assert.equal(registry.bySlug.azchat.status, "live");

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

async function get(path) {
  return handler(new Request(origin + path, { headers: { "user-agent": "Mozilla/5.0" } }), env);
}

async function post(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify(body),
    }),
    env,
  );
}

const cite = await (await get("/cite.json")).json();
assert.equal(cite.audits.remain_off_by_design.id, "REMAIN-OFF-BY-DESIGN-2026-09-10");
assert.equal(cite.audits.remain_off_by_design.kind, "law");
assert.equal(cite.audits.remain_off_by_design.item_count, 33);
assert.equal(cite.audits.remain_off_by_design.do_not_enable, true);
assert.equal(cite.audits.remain_off_by_design.software_tab, false);
assert.equal(cite.audits.remain_off_by_design.fraggate_slug, false);
assert.equal(cite.audits.mesh_get_never_enables, true);
assert.equal(cite.mesh_get_never_enables, true);
assert.equal(cite.suite_presence, "on");
assert.equal(cite.mesh.get_never_enables, true);

const software = await (await get("/v1/software")).json();
assert.ok(!software.software.some((s) => s.slug === "azpipe"), "AZPIPE is not a Softwares-tab slug");
assert.ok(!software.software.some((s) => s.slug === "master-33"));
assert.ok(software.software.some((s) => s.slug === "embryolock" && s.status === "live"));
assert.ok(software.software.some((s) => s.slug === "azchat" && s.status === "live"));
assert.ok(software.software.every((s) => !s.mesh || s.mesh.enabled_default === true));

const mesh = await (await get("/v1/mesh")).json();
assert.equal(mesh.enabled, true, "read-only suite-presence is ON by default");
assert.equal(mesh.mesh_default, "on");
assert.equal(mesh.get_never_enables, true);
const meshStatus = await (await get("/v1/mesh/status")).json();
assert.equal(meshStatus.enabled, true, "GET /v1/mesh/status reports default-on presence");
assert.equal(meshStatus.get_never_enables, true);
const meshDisable = await post("/v1/mesh/disable", {});
const meshDisableBody = await meshDisable.json();
assert.equal(meshDisableBody.ok, false);
assert.equal(meshDisableBody.code, "MESH-DISABLE-REFUSED");
assert.equal(meshDisableBody.enabled, true);

const rollback = await get("/v1/rollback");
assert.equal(rollback.status, 404, "/v1/rollback stays 404");

for (const op of ["scorch", "wipe", "unlock", "encrypt"]) {
  const refused = await (await post("/v1/fraggate/call", { slug: "ark", op })).json();
  assert.equal(refused.ok, false, `ARK ${op}`);
  assert.equal(refused.code, "FG-STUB", `ARK ${op} stays FG-STUB`);
}

for (const op of ["health", "skill", "doctor", "policy"]) {
  const live = await (await post("/v1/fraggate/call", { slug: "embryolock", op })).json();
  assert.equal(live.ok, true, `EmbryoLock ${op} LIVE`);
  assert.equal(live.result.remain_off, "REMAIN-OFF-BY-DESIGN-2026-09-10", op);
  assert.deepEqual(live.result.remain_off_items, [3, 28], op);
  assert.equal(live.result.public_mesh_destructive, false, op);
}

for (const op of ["wipe", "scorch", "unlock", "unlock-after-fail"]) {
  const refused = await (await post("/v1/fraggate/call", { slug: "embryolock", op })).json();
  assert.equal(refused.ok, false, `EmbryoLock ${op}`);
  assert.equal(refused.code, "FG-STUB", `EmbryoLock ${op} stays FG-STUB`);
  assert.match(String(refused.message || refused.note || ""), /public mesh|stub|local/i, op);
}

const skill = await (await get("/v1/skill")).text();
assert.match(skill, /REMAIN-OFF-BY-DESIGN-2026-09-10/);
assert.match(skill, /live-with-local-destructive-boundary/);
assert.doesNotMatch(skill, /EmbryoLock is STUB at FEATURE-STATE ingest/);
assert.match(skill, /wipe\/scorch\/unlock stay FG-STUB/);
assert.match(skill, /ARK scorch\/wipe\/unlock\/encrypt stay REFUSE/);
assert.match(skill, /Do not enable Remain-OFF products, rollback, AZPIPE/);

console.log(
  "ok remain-off 33 items; ARK scorch/wipe/unlock/encrypt FG-STUB; EmbryoLock wipe/scorch FG-STUB; health/skill/doctor/policy LIVE; no azpipe slug; suite-presence ON; disable refused; /v1/rollback 404",
);

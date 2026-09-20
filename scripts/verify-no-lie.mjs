/**
 * NO-LIE-NO-REWRITE-1.0: receipts still hash; copies not all on one tunnel;
 * no rewrite key; never lie to survive. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NAMED_STUBS } from "../src/fraggate/registry.js";
import { PRODUCTS } from "../src/index.js";
import { WORKER_ONLY_PRODUCTS } from "../src/software-catalog.js";
import { SUITE_DESIGNS } from "../src/seo.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import {
  CROSS_NETWORK_SURVIVAL_DOCS,
  MESH_NO_LIE_OPS,
  MESH_NO_REWRITE_OPS,
  MIN_COPY_PLANES,
  NO_LIE_AUTHOR,
  NO_LIE_DOCS,
  NO_LIE_RULES,
  NO_LIE_SPEC,
  SURVIVAL_MOTIVES,
  checkCopyPlanes,
  evaluateSurvivalAct,
  hashNoLieReceipt,
  mintNoLieReceipt,
  noLieFrame,
  noLieHint,
  refuseLieToSurvive,
  refuseRewrite,
  verifyNoLieReceipt,
  verifyRulesWithoutVoice,
} from "../src/no-lie.js";
import { CROSS_NETWORK_SURVIVAL, SURVIVAL_TIP } from "../src/cross-network-survival.js";
import { MESH_STUB_OPS, resetMeshStore, runMeshOp } from "../src/mesh.js";

const paper = readFileSync(new URL("../docs/designs/NO-LIE-NO-REWRITE-1.0.md", import.meta.url), "utf8");
const survival = readFileSync(new URL("../docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md", import.meta.url), "utf8");
const nodeMesh = readFileSync(new URL("../docs/NODE_MESH.md", import.meta.url), "utf8");
const pdf = readFileSync(new URL("../docs/designs/NO-LIE-NO-REWRITE-1.0.pdf", import.meta.url));

assert.ok(pdf.slice(0, 5).toString() === "%PDF-");
assert.match(paper, /^# NO-LIE-NO-REWRITE-1\.0/m);
assert.match(paper, /Author: Aziel Eliab only/);
assert.match(paper, /Receipts that still hash/);
assert.match(paper, /Copies not all on one tunnel/);
assert.match(paper, /No rewrite key/);
assert.match(paper, /never allowed to lie/i);
assert.match(paper, /self-preserve/);
assert.match(paper, /Not a Softwares-tab product/);
assert.match(paper, /Not a Remain-OFF flip/);
assert.match(paper, /CROSS-NETWORK-SURVIVAL-1\.0/);
assert.match(paper, /does not replace the machine tip/);
assert.equal(NO_LIE_SPEC, "NO-LIE-NO-REWRITE-1.0");
assert.equal(NO_LIE_AUTHOR, "Aziel Eliab");
assert.equal(CROSS_NETWORK_SURVIVAL, "CROSS-NETWORK-SURVIVAL-1.0");
assert.equal(NO_LIE_DOCS, "docs/designs/NO-LIE-NO-REWRITE-1.0.md");
assert.equal(CROSS_NETWORK_SURVIVAL_DOCS, "docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md");
assert.equal(MIN_COPY_PLANES, 2);
assert.equal(NO_LIE_RULES.length, 5);

assert.ok(survival.includes(SURVIVAL_TIP));
assert.match(survival, /CROSS-NETWORK-SURVIVAL-1\.0/);
assert.match(survival, /hosts \/ DOI \/ git \/ vault/);
assert.match(survival, /Aziel Eliab only/);
assert.match(nodeMesh, /NO-LIE-NO-REWRITE-1\.0/);
assert.match(nodeMesh, /CROSS-NETWORK-SURVIVAL-1\.0/);
assert.match(nodeMesh, /never allowed to lie/i);
assert.match(nodeMesh, /does not replace the machine tip/);

assert.ok(
  SUITE_DESIGNS.some((d) => d.id === "NO-LIE-NO-REWRITE-1.0" && d.kind === "law" && d.file === "NO-LIE-NO-REWRITE-1.0.md"),
);

const minted = await mintNoLieReceipt({
  previous_hash: "0".repeat(64),
  body: "Broadcast hashed a desk cut.",
  event: { surface: "mesh", spec: NO_LIE_SPEC },
});
assert.match(minted.hash, /^[a-f0-9]{64}$/);
const recomputed = await hashNoLieReceipt({
  previous_hash: minted.previous_hash,
  body: minted.body,
  event: minted.event,
});
assert.equal(minted.hash, recomputed);
const ok = await verifyNoLieReceipt(minted);
assert.equal(ok.ok, true);
assert.equal(ok.rewrite_key, false);

const mutated = { ...minted, body: "Broadcast invented a live count." };
const broken = await verifyNoLieReceipt(mutated);
assert.equal(broken.ok, false);
assert.equal(broken.code, "NO-LIE-HASH-BREAK");
assert.equal(broken.rewrite_key, false);

const rewrite = refuseRewrite({ key: "admin-rewrite", patch: mutated });
assert.equal(rewrite.ok, false);
assert.equal(rewrite.code, "MESH-NO-REWRITE");
assert.equal(rewrite.rewrite_key, false);
assert.equal(rewrite.attempted_key, "refused");

const oneTunnel = checkCopyPlanes(["tunnel-front"]);
assert.equal(oneTunnel.ok, false);
assert.equal(oneTunnel.code, "NO-LIE-ONE-TUNNEL");
assert.equal(oneTunnel.copies_one_tunnel, true);

const twoPlanes = checkCopyPlanes(["tunnel-front", "worker-standby"]);
assert.equal(twoPlanes.ok, true);
assert.equal(twoPlanes.copies_one_tunnel, false);

const vaultCite = checkCopyPlanes(["local-vault", "public-cite"]);
assert.equal(vaultCite.ok, true);

for (const motive of SURVIVAL_MOTIVES) {
  const refused = refuseLieToSurvive(motive, "paint live nodes");
  assert.equal(refused.ok, false);
  assert.equal(refused.code, "MESH-NO-LIE");
  assert.equal(refused.lie_to_survive, false);
  assert.equal(refused.motive, motive);
}

const rules = verifyRulesWithoutVoice(NO_LIE_RULES.slice());
assert.equal(rules.ok, true);
assert.equal(rules.voice_required, false);
const missing = verifyRulesWithoutVoice(NO_LIE_RULES.slice(0, 3));
assert.equal(missing.ok, false);
assert.equal(missing.voice_required, false);

const honest = await evaluateSurvivalAct({
  receipt: minted,
  planes: ["local-vault", "public-cite"],
  motive: "adapt",
  lie: false,
});
assert.equal(honest.ok, true);
assert.equal(honest.no_lie, true);
assert.equal(honest.rewrite_key, false);

const keyed = await evaluateSurvivalAct({ receipt: minted, rewrite_key: "please" });
assert.equal(keyed.code, "MESH-NO-REWRITE");
const lied = await evaluateSurvivalAct({ motive: "prevent-death", lie: true });
assert.equal(lied.code, "MESH-NO-LIE");

const frame = noLieFrame();
assert.equal(frame.no_lie, true);
assert.equal(frame.no_rewrite, true);
assert.equal(frame.rewrite_key, false);
assert.equal(frame.lie_to_survive, false);
assert.equal(frame.copies_one_tunnel, false);
assert.equal(frame.no_lie_spec, NO_LIE_SPEC);
assert.equal(Object.hasOwn(frame, "cross_network_survival"), false);
assert.equal(noLieHint().software_tab, false);
assert.equal(noLieHint().fraggate_slug, false);

for (const op of MESH_NO_REWRITE_OPS) {
  assert.ok(MESH_STUB_OPS.includes(op), op);
}
for (const op of MESH_NO_LIE_OPS) {
  assert.ok(MESH_STUB_OPS.includes(op), op);
}

resetMeshStore();
const rewriteOp = await runMeshOp("rewrite", { key: "admin" }, {});
assert.equal(rewriteOp.ok, false);
assert.equal(rewriteOp.code, "MESH-NO-REWRITE");
assert.equal(rewriteOp.rewrite_key, false);
const lieOp = await runMeshOp("lie-to-survive", { motive: "self-preserve" }, {});
assert.equal(lieOp.ok, false);
assert.equal(lieOp.code, "MESH-NO-LIE");
assert.equal(lieOp.lie_to_survive, false);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
async function get(path) {
  return handler(new Request(origin + path), {});
}
async function postJson(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify(body || {}),
    }),
    {},
  );
}

const mesh = await (await get("/v1/mesh")).json();
assert.equal(mesh.no_lie, true);
assert.equal(mesh.no_rewrite, true);
assert.equal(mesh.rewrite_key, false);
assert.equal(mesh.lie_to_survive, false);
assert.equal(mesh.copies_one_tunnel, false);
assert.equal(mesh.no_lie_spec, NO_LIE_SPEC);
assert.equal(mesh.cross_network_survival, CROSS_NETWORK_SURVIVAL);
assert.equal(mesh.survival_tip, SURVIVAL_TIP);

const doorRewrite = await postJson("/v1/fraggate/call", { slug: "mesh", op: "rewrite", payload: {} });
const doorRewriteBody = await doorRewrite.json();
assert.equal(doorRewriteBody.ok, false);
assert.ok(
  doorRewriteBody.code === "FG-STUB" || doorRewriteBody.result?.code === "MESH-NO-REWRITE",
  JSON.stringify(doorRewriteBody),
);

const httpRewrite = await postJson("/v1/mesh/rewrite", { key: "admin" });
const httpRewriteBody = await httpRewrite.json();
assert.equal(httpRewrite.status, 400);
assert.equal(httpRewriteBody.ok, false);
assert.equal(httpRewriteBody.code, "MESH-NO-REWRITE");
assert.equal(httpRewriteBody.rewrite_key, false);
const httpLie = await postJson("/v1/mesh/lie-to-survive", { motive: "self-preserve" });
const httpLieBody = await httpLie.json();
assert.equal(httpLie.status, 400);
assert.equal(httpLieBody.ok, false);
assert.equal(httpLieBody.code, "MESH-NO-LIE");
assert.equal(httpLieBody.lie_to_survive, false);

const software = await (await get("/v1/software")).json();
assert.ok(!software.software.some((s) => s.slug === "no-lie" || s.slug === "no-rewrite"));
assert.equal(software.mesh.no_lie, true);
assert.equal(software.mesh.no_rewrite, true);

const cite = await (await get("/cite.json")).json();
assert.ok(cite.designs.papers.some((p) => p.id === "NO-LIE-NO-REWRITE-1.0" && p.kind === "law" && p.software_tab === false));
assert.ok(cite.designs.papers.some((p) => p.id === CROSS_NETWORK_SURVIVAL && p.kind === "law" && p.software_tab === false));
assert.equal(cite.survival.spec, CROSS_NETWORK_SURVIVAL);
assert.equal(cite.survival.tip, SURVIVAL_TIP);

const runtime = await (await get("/v1/runtime.json")).json();
assert.equal(runtime.fabric.no_lie, NO_LIE_SPEC);
assert.equal(runtime.fabric.rewrite_key, false);
assert.equal(runtime.fabric.lie_to_survive, false);

const skill = await (await get("/v1/skill")).text();
assert.match(skill, /NO-LIE-NO-REWRITE-1\.0/);
assert.match(skill, /CROSS-NETWORK-SURVIVAL-1\.0/);
assert.match(skill, /never allowed to lie/i);

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /NO-LIE-NO-REWRITE-1\.0/);
assert.match(llms, /docs\/designs\/NO-LIE-NO-REWRITE-1\.0\.md/);
assert.doesNotMatch(llms, /Never lie to survive/);
assert.doesNotMatch(llms, /## Why Aziel Eliab \(locked brief\)|## Model rules/);
assert.ok(llms.includes(SURVIVAL_TIP));

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /NO-LIE-NO-REWRITE-1\.0\.md/);
assert.match(sitemap, /CROSS-NETWORK-SURVIVAL-1\.0/);
assert.doesNotMatch(sitemap, /docs\/CROSS-NETWORK-SURVIVAL\.md/);

const mcp = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  }),
  {},
);
const listed = (await mcp.json()).result.tools;
assert.ok(!listed.some((t) => /no.?lie|no.?rewrite/i.test(t.name)), "no NO-LIE MCP product tool");
assert.equal(software.software.length, PRODUCTS.length + NAMED_STUBS.length + WORKER_ONLY_PRODUCTS.length);

console.log(`ok no-lie ${NO_LIE_SPEC} ${RUNTIME_VERSION}: receipts hash, no rewrite key, never lie to survive`);

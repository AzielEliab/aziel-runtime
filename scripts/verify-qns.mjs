/**
 * QNS-CD-1.0: cite + catalog field on every live product and mesh extra.
 * Not a Softwares-tab slug. Public Worker cites only — never proxies qnsd.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { NAMED_STUBS } from "../src/fraggate/registry.js";
import { SUITE_DESIGNS } from "../src/seo.js";
import {
  QNS_SPEC,
  QNS_LOCAL,
  QNS_NOTE,
  QNS_PHOTON,
  qnsHint,
  qnsStatus,
  dispatchQnsHttp,
} from "../src/qns.js";

const paper = readFileSync(new URL("../docs/designs/QNS-CD-1.0.md", import.meta.url), "utf8");
const pdf = readFileSync(new URL("../docs/designs/QNS-CD-1.0.pdf", import.meta.url));
assert.ok(pdf.slice(0, 5).toString() === "%PDF-");
assert.match(paper, /^# QNS-CD-1\.0/m);
assert.match(paper, /photon QNS1 1\.3/);
assert.match(paper, /qnsd/);
assert.match(paper, /127\.0\.0\.1/);
assert.match(paper, /AzielEliab\/qnm-node/);
assert.match(paper, /Worker cites only/);
assert.match(paper, /Not a Softwares-tab product/);
assert.doesNotMatch(paper, /qubit computer|Bell pair hardware/i);

assert.equal(QNS_SPEC, "QNS-CD-1.0");
assert.equal(QNS_LOCAL, "https://github.com/AzielEliab/qnm-node");
assert.equal(QNS_NOTE, "Photon vias on local qnsd; Worker cites only");
assert.equal(QNS_PHOTON, "QNS1 1.3");
assert.deepEqual(qnsHint(), { spec: QNS_SPEC, local: QNS_LOCAL, note: QNS_NOTE });

const cite = qnsStatus();
assert.equal(cite.ok, true);
assert.equal(cite.identity, "Aziel Eliab");
assert.equal(cite.public_proxy, false);
assert.equal(cite.emit, false);
assert.equal(cite.wipe, false);
assert.equal(cite.control_plane, false);
assert.equal(cite.software_tab, false);
assert.equal(cite.fraggate_slug, false);
assert.equal(cite.bind, "127.0.0.1");
assert.ok(cite.local_api.paths.every((p) => p.path.startsWith("/local/qns/")));
assert.equal(cite.laws.mesh_get_never_enables, true);
assert.equal(cite.laws.node_gate, false);
assert.equal(cite.laws.embryolock, "live_local_destructive");
assert.equal(cite.worker_fabric.azpipe, "AP-WP-0.2");
assert.equal(cite.worker_fabric.sweepgate, "SG-WP-0.1");
assert.equal(cite.worker_fabric.chainlock, "CL-WP-0.4");

const post = dispatchQnsHttp("POST", "/v1/qns", {});
assert.equal(post.status, 405);
assert.equal(post.body.code, "QNS-CITE-ONLY");

const via = dispatchQnsHttp("POST", "/v1/qns/via", { emit: true });
assert.equal(via.status, 403);
assert.equal(via.body.code, "QNS-NO-PROXY");

const wipe = dispatchQnsHttp("GET", "/v1/qns/wipe", {});
assert.equal(wipe.status, 404);
assert.equal(wipe.body.code, "QNS-CITE-ONLY");

assert.ok(SUITE_DESIGNS.some((d) => d.id === "QNS-CD-1.0" && d.file === "QNS-CD-1.0.md" && d.kind === "fabric"));

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path) {
  return handler(new Request(origin + path), {});
}

async function postJson(path, body) {
  return handler(
    new Request(origin + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    }),
    {},
  );
}

const res = await get("/v1/qns");
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.spec, "QNS-CD-1.0");
assert.equal(body.photon, "QNS1 1.3");
assert.equal(body.process, "qnsd");
assert.equal(body.local, QNS_LOCAL);
assert.equal(body.public_proxy, false);
assert.equal(body.emit, false);
assert.equal(body.qns_cd.spec, "QNS-CD-1.0");
assert.match(body.note, /Worker cites only/);
assert.ok(!JSON.stringify(body).includes("http://127.0.0.1") || body.bind === "127.0.0.1");

const head = await handler(new Request(origin + "/v1/qns", { method: "HEAD" }), {});
assert.equal(head.status, 200);
assert.equal(await head.text(), "");

const refused = await postJson("/v1/qns", { via: "photon" });
assert.ok(refused.status === 403 || refused.status === 405);
const refusedBody = await refused.json();
assert.ok(["QNS-CITE-ONLY", "QNS-NO-PROXY"].includes(refusedBody.code));

const viaHttp = await postJson("/v1/qns/via", { emit: "frame" });
assert.equal(viaHttp.status, 403);
assert.equal((await viaHttp.json()).code, "QNS-NO-PROXY");

const software = await (await get("/v1/software")).json();
assert.ok(!software.software.some((s) => s.slug === "qns" || s.slug === "qnsd" || s.slug === "photon"));
assert.equal(software.software.length, PRODUCTS.length + NAMED_STUBS.length);
assert.ok(software.software.every((s) => s.qns_cd && s.qns_cd.spec === "QNS-CD-1.0"), "every software card has qns_cd");
assert.ok(software.software.every((s) => s.qns_cd.local === QNS_LOCAL));
assert.ok(software.software.every((s) => s.qns_cd.note === QNS_NOTE));
assert.equal(software.qns_cd.spec, "QNS-CD-1.0");
assert.equal(software.mesh.qns_cd.spec, "QNS-CD-1.0");
assert.match(software.qns, /\/v1\/qns$/);

const catalog = await (await get("/v1/catalog.json")).json();
assert.ok(catalog.products.every((p) => p.qns_cd && p.qns_cd.spec === "QNS-CD-1.0"));
assert.ok(catalog.extras.some((e) => e.slug === "mesh" && e.qns_cd && e.qns_cd.spec === "QNS-CD-1.0"));
assert.ok(!catalog.products.some((p) => p.slug === "qns"));
assert.ok(!catalog.extras.some((e) => e.slug === "qns"));

const mesh = await (await get("/v1/mesh")).json();
assert.equal(mesh.enabled, false);
assert.equal(mesh.qns_cd.spec, "QNS-CD-1.0");
assert.equal(mesh.qns_cd.local, QNS_LOCAL);
assert.match(mesh.local_node_note, /QNS-CD-1\.0/);

const skill = await (await get("/v1/skill")).text();
assert.match(skill, /QNS-CD-1\.0/);
assert.match(skill, /qnsd/);
assert.match(skill, /GET \/v1\/qns/);

const llms = await (await get("/llms.txt")).text();
assert.match(llms, /QNS-CD-1\.0/);

const citeJson = await (await get("/cite.json")).json();
assert.ok(citeJson.designs.papers.some((p) => p.id === "QNS-CD-1.0" && p.path === "docs/designs/QNS-CD-1.0.md"));
assert.ok(citeJson.extras.some((e) => e.slug === "mesh" && e.qns_cd && e.qns_cd.spec === "QNS-CD-1.0"));
assert.ok(citeJson.products.every((p) => p.qns_cd && p.qns_cd.spec === "QNS-CD-1.0"));

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(sitemap, /QNS-CD-1\.0\.md/);
assert.match(sitemap, /\/v1\/qns/);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/v1/qns"]);
assert.match(openapi.paths["/v1/qns"].get.summary, /QNS-CD-1\.0/);
assert.match(openapi.paths["/v1/mesh"].get.summary, /QNS-CD-1\.0/);

const mcp = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  }),
  {},
);
const init = await mcp.json();
assert.match(init.result.instructions, /QNS-CD-1\.0/);
assert.match(init.result.instructions, /qnsd/);

const tools = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  }),
  {},
);
const listed = (await tools.json()).result.tools;
assert.ok(!listed.some((t) => t.name.startsWith("qns_")), "no QNS Softwares-tab / MCP product tools");
const meshStatus = listed.find((t) => t.name === "mesh_status");
assert.match(meshStatus.description, /QNS-CD-1\.0/);

const runtime = await (await get("/v1/runtime.json")).json();
assert.equal(runtime.fabric.qns_cd, "QNS-CD-1.0");
assert.equal(runtime.endpoints.qns, origin + "/v1/qns");

console.log(
  `ok qns ${QNS_SPEC}: cite door, catalog field on ${software.software.length} cards + mesh extra, no software slug`,
);

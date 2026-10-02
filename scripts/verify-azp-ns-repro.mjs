/**
 * AZP-NS-1.0 fixture reproduction.
 * Runs the gate scripts in order. Exits non-zero if a fixture gate fails.
 * SKIP and SLOT rows are not passes. Live provider destruction stays SKIP.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { PRODUCTS } from "../src/index.js";
import { CLAIM_LIMITS } from "../src/security/claims.js";
import { negotiateBearer } from "../src/transport/routing.js";
import { softwareCatalog } from "../src/software-catalog.js";

const root = fileURLToPath(new URL("..", import.meta.url));

const GATES = [
  "scripts/verify-keystore.mjs",
  "scripts/verify-envelope-v2.mjs",
  "scripts/verify-replay.mjs",
  "scripts/verify-relay.mjs",
  "scripts/verify-checkpoint.mjs",
  "scripts/verify-checkpoint-quorum.mjs",
  "scripts/verify-replication.mjs",
  "scripts/verify-provider-loss.mjs",
  "scripts/verify-disaster-recovery.mjs",
  "scripts/verify-transport-adversarial.mjs",
  "scripts/verify-key-compromise.mjs",
  "scripts/verify-privacy-metadata.mjs",
];

const REQUIRED_HONESTY = [
  {
    id: "live-vps",
    why: "Node B, an independent VPS, is not provisioned. OPERATOR. SKIP until that host exists.",
  },
  {
    id: "plane-b-framagit",
    why: "Plane B Framagit URL is null. SLOT until a real deposit exists. Do not invent a URL.",
  },
  {
    id: "live-multi-provider",
    why: "No second live provider. live_multi_provider stays false. Do not paint this PASS.",
  },
  {
    id: "destroy-live-provider",
    why: "Live destruction of Cloudflare, a VPS, or a home node is operator work. SKIP.",
  },
];

/** Operator lock 2026-10-02: WARN-5 is STANDS-until-demonstrated, not a permanent ceiling. */
const MESH_WARNS = [
  {
    id: "WARN-1",
    status: "STANDS",
    why: "One LIVE production edge plus same-host fixtures. Nodes B, C, and D are OPERATOR SKIP. Software-workers are not independent hosts. live_multi_provider stays false.",
  },
  {
    id: "WARN-2",
    status: "STANDS",
    why: "Fixture kill and rebuild only. destroy-live-provider stays SKIP. Plane B stays SLOT. Survivable in fixtures is not unkillable.",
  },
  {
    id: "WARN-3",
    status: "STANDS",
    why: "Fixture adversarial coverage is real. A live partition between independent hosts is missing.",
  },
  {
    id: "WARN-4",
    status: "STANDS",
    why: "Metadata inventory is fixture-LIVE. FIXTURE-MEASURE is not an anonymity PASS. anonymous stays false.",
  },
  {
    id: "WARN-5",
    status: "STANDS-until-demonstrated",
    until: "demonstrated",
    by_design: "separate-from-icann",
    why: "Track 1 is the Cap-7 and .aziel mesh name plane. Cap-7 is not the public Internet. Track 2 is a separate node-mesh internet. BY-DESIGN it stays separate from ICANN. It is not BGP. It is not demonstrated. This is not a refusal to build.",
  },
];

assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(softwareCatalog("https://aziel-runtime.example", PRODUCTS).count, 42);
assert.equal(CLAIM_LIMITS.anonymous, false);
assert.equal(CLAIM_LIMITS.unkillable, false);
assert.equal(CLAIM_LIMITS.live_multi_provider, false);
assert.equal(CLAIM_LIMITS.encryption_addressed_is_anonymity, false);
assert.equal(CLAIM_LIMITS.plane_b_framagit, "SLOT");
assert.equal(CLAIM_LIMITS.cap7_public_icann, false);
assert.equal(CLAIM_LIMITS.cap7_public_egress, false);
assert.equal(CLAIM_LIMITS.mirage_is_azvpn, false);
assert.equal(CLAIM_LIMITS.aznet_replaces_internet, false);

for (const bearer of ["icann", "cap7-egress"]) {
  const refused = negotiateBearer(bearer);
  assert.equal(refused.ok, false, bearer);
  assert.equal(refused.live, false, bearer);
  assert.equal(refused.code, "AZP-BEARER-REFUSE", bearer);
  assert.equal(refused.public_icann, false, bearer);
  assert.equal(refused.cap7_public_egress, false, bearer);
}

const paper = readFileSync(new URL("../docs/designs/AZP-NS-1.0.md", import.meta.url), "utf8");
const planeP = readFileSync(new URL("../docs/designs/PLANE-P-D2D-1.0.md", import.meta.url), "utf8");
const repro = readFileSync(new URL("../docs/designs/AZP-NS-REPRO-1.0.md", import.meta.url), "utf8");
const warnsPaper = readFileSync(new URL("../docs/designs/MESH-INTERNET-WARNS-1.0.md", import.meta.url), "utf8");
const fedPaper = readFileSync(new URL("../docs/designs/FED-MESH-1.0.md", import.meta.url), "utf8");
const nodeMesh = readFileSync(new URL("../docs/NODE_MESH.md", import.meta.url), "utf8");
assert.match(paper, /What's left/);
assert.match(paper, /OPERATOR/);
assert.match(paper, /FIXTURE/);
assert.match(paper, /SKIP/);
assert.match(paper, /Framagit URL is null/);
assert.match(paper, /Encryption of the payload is not anonymity/);
assert.match(paper, /Softwares stay 42/);
assert.match(repro, /npm install/);
assert.match(repro, /node scripts\/verify-azp-ns-repro\.mjs/);
assert.match(repro, /Softwares stay 42/);
assert.match(repro, /tools\/list` stays 36/);
for (const gate of GATES) assert.match(repro, new RegExp(gate.replace(/[.]/g, "\\.")));
for (const row of REQUIRED_HONESTY) assert.match(repro, new RegExp(row.id));
for (const warn of MESH_WARNS) {
  assert.equal(warn.status === "PASS" || warn.status === "STAY-OFF" || warn.status === "LIVE", false, warn.id);
  assert.match(repro, new RegExp(warn.id));
  assert.match(repro, new RegExp(warn.status.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(warnsPaper, new RegExp(warn.id));
  assert.match(warnsPaper, new RegExp(warn.status.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(warnsPaper, /Track 1/);
assert.match(warnsPaper, /Track 2/);
assert.match(warnsPaper, /Plane N/);
assert.match(warnsPaper, /Plane P/);
assert.match(warnsPaper, /PLANE-P-D2D-1\.0/);
assert.match(planeP, /Plane N/);
assert.match(planeP, /Plane P/);
assert.match(planeP, /Cap-7 is not the public Internet/);
assert.match(planeP, /STANDS-until-demonstrated/);
assert.match(planeP, /not a permanent ceiling/);
assert.match(planeP, /not BGP/);
assert.match(planeP, /No mock LIVE/);
assert.match(planeP, /QNM-RADIO-ABSENT/);
assert.match(planeP, /FED-MESH-NAT-REFUSE/);
assert.match(planeP, /QNS-CITE-ONLY/);
assert.match(planeP, /QNS-NO-PROXY/);
assert.match(planeP, /QNM-AWARENESS-BIND/);
assert.match(planeP, /0\.0\.0\.0/);
assert.match(planeP, /phoenix_lock/);
assert.match(planeP, /single-node security-awareness/);
assert.match(planeP, /AZVPN is the suite VPN concentrator/);
assert.match(planeP, /Mirage is not AZVPN/);
assert.match(planeP, /bc-c5243c31-a34c-5ed5-80a9-186f7d8f9297/);
assert.match(planeP, /does not edit the Softwares catalog/);
assert.match(planeP, /Softwares stay 42/);
assert.match(planeP, /tools\/list` stays 36/);
assert.match(planeP, /not a LIVE public packet egress/);
{
  const order = ["1 | LAN", "2 | Wi-Fi", "3 | Bluetooth", "4 | RF", "5 | Photon"];
  let at = -1;
  for (const label of order) {
    const next = planeP.indexOf(label);
    assert.ok(next > at, label);
    at = next;
  }
}
assert.match(nodeMesh, /PLANE-P-D2D-1\.0/);
assert.match(fedPaper, /PLANE-P-D2D-1\.0/);
assert.match(warnsPaper, /separate from ICANN/);
assert.match(warnsPaper, /not a refusal to build/);
assert.match(warnsPaper, /Cap-7 is not the public Internet/);
assert.match(warnsPaper, /not BGP/);
assert.match(warnsPaper, /FIXTURE-MEASURE/);
assert.match(warnsPaper, /not an anonymity PASS/);
assert.match(warnsPaper, /live_multi_provider/);
assert.match(warnsPaper, /Softwares stay 42/);
assert.match(warnsPaper, /tools\/list` stays 36/);
assert.equal(warnsPaper.includes("STAY-OFF"), false);
for (const cite of [fedPaper, nodeMesh]) {
  assert.match(cite, /MESH-INTERNET-WARNS-1\.0/);
  assert.match(cite, /Cap-7 is not the public Internet/);
  assert.match(cite, /AZBrowser #17/);
  assert.match(cite, /Runtime #201/);
  assert.match(cite, /negotiateBearer/);
  assert.match(cite, /cap7-egress/);
  assert.match(cite, /STANDS-until-demonstrated/);
  assert.match(cite, /separate from ICANN/);
  assert.match(cite, /Track 1/);
  assert.match(cite, /Track 2/);
  assert.match(cite, /not BGP/);
}
assert.equal(MESH_WARNS.filter((warn) => warn.status === "STANDS").map((warn) => warn.id).join(","), "WARN-1,WARN-2,WARN-3,WARN-4");
assert.equal(MESH_WARNS.find((warn) => warn.id === "WARN-5").until, "demonstrated");
assert.equal(MESH_WARNS.find((warn) => warn.id === "WARN-5").by_design, "separate-from-icann");

function reportsFrom(text) {
  const reports = [];
  let start = -1;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          const value = JSON.parse(text.slice(start, i + 1));
          if (value && Array.isArray(value.report)) reports.push(value);
        } catch {
          /* prose around the JSON is ignored */
        }
        start = -1;
      }
    }
  }
  return reports;
}

const results = [];
const honesty = [];
let failed = 0;
for (const gate of GATES) {
  const child = spawnSync(process.execPath, [gate], { cwd: root, encoding: "utf8" });
  const ok = child.status === 0;
  if (!ok) failed += 1;
  results.push({ gate, status: child.status, ok });
  process.stdout.write(`\n----- ${gate} exit ${child.status} -----\n`);
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  for (const report of reportsFrom(`${child.stdout || ""}\n${child.stderr || ""}`)) {
    for (const row of report.report) {
      if (row.mode === "LIVE") {
        failed += 1;
        results.push({ gate, status: 1, ok: false, note: `painted LIVE: ${row.id}` });
      }
      if (row.mode === "SKIP" || row.mode === "SLOT") honesty.push({ script: report.script, ...row });
    }
  }
}

for (const required of REQUIRED_HONESTY) {
  const found = honesty.filter((row) => row.id === required.id);
  if (!found.length) {
    failed += 1;
    console.error(`missing honesty row ${required.id}`);
    continue;
  }
  for (const row of found) {
    if (row.ok !== false || (row.mode !== "SKIP" && row.mode !== "SLOT")) {
      failed += 1;
      console.error(`honesty row ${required.id} was painted as a pass`);
    }
  }
}

const warns = MESH_WARNS.map((warn) => ({
  id: warn.id,
  status: warn.status,
  ...(warn.until ? { until: warn.until } : {}),
  ...(warn.by_design ? { by_design: warn.by_design } : {}),
}));
for (const warn of warns) {
  if (warn.status === "PASS" || warn.status === "STAY-OFF" || warn.status === "LIVE") {
    failed += 1;
    console.error(`warn ${warn.id} was painted ${warn.status}`);
  }
}
for (const warn of MESH_WARNS.filter((row) => row.status === "STANDS")) {
  console.log(`WARN STANDS ${warn.id}`);
}
console.log("WARN-5 STANDS-until-demonstrated BY-DESIGN separate from ICANN");

console.log(JSON.stringify({
  script: "verify-azp-ns-repro",
  softwares: 42,
  tools: 36,
  live_multi_provider: false,
  anonymous: false,
  unkillable: false,
  gates: results,
  warns,
  honesty: honesty.map((row) => ({
    id: row.id,
    mode: row.mode,
    ok: row.ok,
    script: row.script,
    why: REQUIRED_HONESTY.find((item) => item.id === row.id)?.why || row.note || "",
  })),
  required_honesty: REQUIRED_HONESTY,
}, null, 2));

if (failed) {
  console.error(`verify-azp-ns-repro: ${failed} failure(s)`);
  process.exit(1);
}
console.log("verify-azp-ns-repro: fixture gates ok; SKIP/SLOT rows stayed honest");

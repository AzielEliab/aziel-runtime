/**
 * AZ-LOCKSTEP-1.0: the shared contract and design source are derived from code and match the
 * committed snapshot; the consumer check fails closed; every non-gap runtime feature answers.
 * Cross-repo: LOCKSTEP_REMOTE=1 also checks AZInterface and AZ-OS main pin this contract.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PRODUCTS } from "../src/index.js";
import { buildLockstepContract, lockstepDocument, designCss } from "../src/lockstep/contract.js";
import { DESIGN_TOKENS } from "../src/lockstep/design-tokens.js";
import { tokensCss } from "../src/lockstep/tokens-css.js";
import { verifyLockstep, displayFlags, checkTether, hashOf, sha256Hex, canonicalize, LOCKSTEP_CODES } from "../src/lockstep/consumer.js";
import { FEATURE_UNION, LEGS, featureGaps } from "../src/lockstep/features.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const handler = (await import("../src/index.js")).default.fetch;
const get = (p, method = "GET") => handler(new Request("https://aziel-runtime.example" + p, { method, headers: { "user-agent": "Mozilla/5.0", "content-type": "application/json" }, body: method === "GET" ? undefined : "{}" }), {});
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// 1. derived from code == committed snapshot
const tokensFile = JSON.parse(readFileSync(root + "design/tokens.json", "utf8"));
ok(canonicalize(tokensFile) === canonicalize(DESIGN_TOKENS), "src/lockstep/design-tokens.js is stale: npm run lockstep:build");
ok(readFileSync(root + "design/tokens.css", "utf8") === tokensCss(tokensFile), "design/tokens.css is stale: npm run lockstep:build");
const snap = JSON.parse(readFileSync(root + "contract/lockstep.json", "utf8"));
const doc = await lockstepDocument(PRODUCTS);
if (canonicalize(snap) !== canonicalize(doc)) {
  const keys = (a, b, pre) => Object.keys({ ...a, ...b }).filter((k) => canonicalize(a[k]) !== canonicalize(b[k])).map((k) => pre + k);
  const where = [...keys(snap, doc, ""), ...keys(snap.contract || {}, doc.contract, "contract.")];
  for (const k of where.filter((x) => x.startsWith("contract."))) {
    const kk = k.slice(9);
    console.error(`drift ${k}: snapshot=${canonicalize(snap.contract[kk]).slice(0, 600)}\n        code=${canonicalize(doc.contract[kk]).slice(0, 600)}`);
  }
  assert.fail(`contract/lockstep.json drifted from code (${where.join(", ")}): npm run lockstep:build, then re-vendor AZInterface and AZ-OS`);
}
n++;
ok((await hashOf(snap.contract)) === snap.contract_sha256, "snapshot contract hash");

// 2. locks unchanged, every live flag false
const c = buildLockstepContract(PRODUCTS);
assert.deepEqual(c.locks, { softwares: 42, mcp_tools: 36, stub_op_count: 363, software_count: 33, health_count: 41 }); n++;
ok(c.runtime.version === "2.0.0-rc1", "version");
for (const [k, v] of Object.entries(c.flags)) ok(v === false, `flag ${k} must stay false until the code does it`);
ok(c.doors.mcp_tools.length === 36 && c.doors.door === "fraggate", "doors");
ok(c.chains.lattice_names.join() === "primary,secondary" && /^0{64}$/.test(c.chains.lattice_genesis), "lattice names + genesis");
ok(c.chains.tether_chains.includes("refusals") && c.chains.anchor_chains.includes("session"), "chains");
ok(c.mesh.path === "/v1/mesh" && c.mesh.nodes_are_not_unique_humans === true, "mesh identity");
for (const l of LEGS) ok(c.legs[l].independent === true && c.legs[l].optional === true, `leg ${l} independent + optional`);

// 3. served routes carry the same hashes
const served = await (await get("/v1/lockstep")).json();
ok(served.contract_sha256 === snap.contract_sha256 && served.tokens_sha256 === snap.tokens_sha256 && served.writes === false, "served /v1/lockstep");
const css = await (await get("/design/tokens.css")).text();
ok((await sha256Hex(css)) === snap.css_sha256 && css === designCss(), "served /design/tokens.css");
const tj = await (await get("/design/tokens.json")).json();
ok((await hashOf(tj)) === snap.tokens_sha256, "served /design/tokens.json");
const ws = await (await get("/workspace")).text();
ok(ws.includes("--az-bg:#0e1014") && ws.includes("var(--az-warm-panel"), "runtime pages consume the tokens (root vars + hints popup)");

// 4. consumer fails closed
const pinned = { contract: snap.contract, contract_sha256: snap.contract_sha256, tokens_sha256: snap.tokens_sha256 };
const local = { tether_pubkey: c.chains.tether_pubkey, lattice_names: ["primary", "secondary"], mesh_path: "/v1/mesh", mesh_spec: c.mesh.spec };
let v = await verifyLockstep({ leg: "t", pinned, fetchDoc: async () => served, local });
ok(v.state === "agree" && v.code === LOCKSTEP_CODES.agree, "agree");
ok(Object.values(v.flags).every((x) => x === false), "agree still shows false flags (contract says false)");
v = await verifyLockstep({ leg: "t", pinned, fetchDoc: async () => { throw new Error("down"); }, local });
ok(v.state === "absent" && v.ok === false && v.standalone === true, "absent: throw");
v = await verifyLockstep({ leg: "t", pinned, fetchDoc: async () => null, local });
ok(v.state === "absent", "absent: null");
v = await verifyLockstep({ leg: "t", pinned, fetchDoc: () => new Promise(() => {}), local, timeoutMs: 50 });
ok(v.state === "absent", "absent: timeout");
const moved = structuredClone(served); moved.contract.locks.softwares = 43; moved.contract_sha256 = await hashOf(moved.contract);
v = await verifyLockstep({ leg: "t", pinned, fetchDoc: async () => moved, local });
ok(v.state === "drift" && v.code === LOCKSTEP_CODES.drift, "drift: runtime contract moved");
const forged = structuredClone(served); forged.contract.flags.alt_internet_live = true;
v = await verifyLockstep({ leg: "t", pinned, fetchDoc: async () => forged, local });
ok(v.state === "drift" && v.code === LOCKSTEP_CODES.bad && v.flags.alt_internet_live === false, "forged flag with stale hash refused");
v = await verifyLockstep({ leg: "t", pinned, fetchDoc: async () => ({ ...served, tokens_sha256: "0".repeat(64) }), local });
ok(v.state === "drift", "drift: design tokens moved");
v = await verifyLockstep({ leg: "t", pinned, fetchDoc: async () => served, local: { ...local, tether_pubkey: "other" } });
ok(v.state === "drift" && v.tether.problems.includes("tether_pubkey"), "drift: different tether key");
ok(!checkTether(c, { mesh_path: "/v2/mesh" }).ok && !checkTether(c, { lattice_names: ["primary"] }).ok, "mesh/lattice mismatch");
v = await verifyLockstep({ leg: "t", pinned: { ...pinned, contract_sha256: "f".repeat(64) }, fetchDoc: async () => served });
ok(v.code === LOCKSTEP_CODES.pin, "pin tamper");
ok(displayFlags({ a: true }, "agree", { a: true }).a === true && displayFlags({ a: true }, "agree", {}).a === false && displayFlags({ a: true }, "absent", { a: true }).a === false, "displayFlags needs agree + contract + leg proof");

// 5. union: every non-gap runtime route answers here; gaps are listed, never painted
for (const row of FEATURE_UNION) {
  const leg = row.legs["aziel-runtime"];
  if (leg.status === "gap") continue;
  const r = await get(leg.route, leg.method || "GET");
  ok(r.status !== 404, `runtime ${row.id} ${leg.route} -> ${r.status}`);
}
ok(Array.isArray(featureGaps()), "gaps list");

// 6. cross-repo (opt-in; network): legs on main pin this contract
if (process.env.LOCKSTEP_REMOTE === "1") {
  for (const repo of ["azinterface", "azos"]) {
    const url = `https://raw.githubusercontent.com/AzielEliab/${repo}/main/workers/download-tracker/LOCKSTEP.pin.json`;
    const r = await fetch(url);
    assert.equal(r.status, 200, `${repo}: no LOCKSTEP.pin.json on main`);
    const pin = await r.json();
    assert.equal(pin.contract_sha256, snap.contract_sha256, `${repo} pins a different contract`);
    assert.equal(pin.tokens_sha256, snap.tokens_sha256, `${repo} pins different design tokens`);
    n += 2;
  }
}
// openapi lists the lockstep surface
{
  const oa = await (await handler(new Request("https://runtime.test/openapi.json"), {}, { waitUntil() {} })).json();
  for (const p of ["/v1/lockstep", "/design/tokens.json", "/design/tokens.css"]) ok(oa.paths && oa.paths[p] && oa.paths[p].get, `openapi missing ${p}`);
}
// host-data scan: contract and design files carry nothing specific to the build host
{
  const { hostDataFinding } = await import(root + "scripts/lockstep-hostscan.mjs");
  ok(hostDataFinding("LAN interface enp0s3 at 172.30.0.2") && hostDataFinding("eth0") && hostDataFinding("fe80::1") && !hostDataFinding("203.0.113.9 via the binding"), "host-data scan catches what it should");
  for (const bad of ["100.64.0.1", "100.127.255.254", "::1", "[::1]:8787", "fe80::1", "febf::2", "fe9a::3", "fea0::4"]) ok(hostDataFinding(`x ${bad} y`), `host-data scan misses ${bad}`);
  // R5 (AZBot #323): parsed forms: 0.0.0.0/8 and inet_aton spellings, IPv4-mapped IPv6
  for (const bad of ["0.0.0.0", "0.1.2.3", "2130706433", "0177.0.0.1", "0x7f.1", "0x7f000001", "127.1", "10.1", "0xa.0.0.1", "0300.0250.1.1", "100.0x40.0.1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "::", "0:0:0:0:0:0:0:1", "fd12::1", "FE80::1"]) ok(hostDataFinding(`x ${bad} y`), `parsed host-data scan misses ${bad}`);
  for (const fine of ["8.8.8.8", "134744072", "0x1234", "0", "42", "0.5", "1.5", "2.0.0-rc1", "v1.2.3", "000000", "::ffff:8.8.8.8", "12:30:45", "1729000000000"]) ok(!hostDataFinding(`x ${fine} y`), `parsed host-data scan false positive on ${fine}`);
  for (const fine of ["100.63.255.255", "100.128.0.1", "203.0.113.9", "2001:db8::1", "a::1b", "std::10"]) ok(!hostDataFinding(`x ${fine} y`), `host-data scan false positive on ${fine}`);
  for (const f of ["contract/lockstep.json", "design/tokens.json", "design/tokens.css", "src/lockstep/design-tokens.js"]) {
    const leak = hostDataFinding(readFileSync(root + f, "utf8"));
    ok(!leak, `${f} carries host-specific data: ${leak}`);
  }
}
console.log(`ok lockstep contract + design source: ${n} checks (contract ${snap.contract_sha256.slice(0, 12)}, gaps ${featureGaps().length})`);

/**
 * 2.0.0-rc1 certification pack: docs, version freeze, clean-room sample, Glama.
 * Not a third-party lab. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { RUNTIME_ABSTRACT, RUNTIME_ONE_LINE, auditsCiteField } from "../src/seo.js";
import { RUNTIME_VERSION, VERSION_HISTORY } from "../src/runtime-api.js";
import { runCleanRoomProbe } from "./clean-room-probe.mjs";

assert.equal(RUNTIME_VERSION, "2.0.0-rc1");
assert.ok(VERSION_HISTORY.some((row) => row.version === "2.0.0-rc1" && row.status === "current"));
assert.ok(VERSION_HISTORY.some((row) => row.version === "1.9.3" && row.status === "superseded"));
assert.equal(VERSION_HISTORY.filter((row) => row.status === "current").length, 1);

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(pkg.version, "2.0.0-rc1");
assert.match(pkg.scripts.test, /verify-2\.0-rc1\.mjs/);
assert.match(pkg.scripts.test, /verify-mcp-tdqs\.mjs/);
assert.equal(pkg.scripts["clean-room:2.0"], "bash scripts/clean-room-2.0.sh");
assert.equal(pkg.scripts["adversarial:external"], "bash scripts/external-adversarial-2.0.sh");

const requiredDocs = [
  "docs/2.0/README.md",
  "docs/2.0/PUBLIC-CONTRACT.md",
  "docs/2.0/COMPATIBILITY-POLICY.md",
  "docs/2.0/RECEIPT-SCHEMA.md",
  "docs/2.0/REFUSAL-CONTRACT.md",
  "docs/2.0/BREAKING-CHANGE-POLICY.md",
  "docs/2.0/CHANGELOG.md",
  "docs/2.0/CLEAN-ROOM.md",
  "docs/2.0/EXTERNAL-ADVERSARIAL-PACK.md",
  "docs/2.0/clean-room-result.schema.json",
  "docs/2.0/clean-room-result.sample.json",
  "docs/GLAMA-TDQS.md",
];
for (const rel of requiredDocs) {
  assert.ok(existsSync(new URL(`../${rel}`, import.meta.url)), rel);
}

const scripts = [
  "scripts/clean-room-2.0.sh",
  "scripts/clean-room-2.0.mjs",
  "scripts/clean-room-probe.mjs",
  "scripts/external-adversarial-2.0.sh",
  "scripts/external-adversarial-2.0.mjs",
];
for (const rel of scripts) {
  const url = new URL(`../${rel}`, import.meta.url);
  assert.ok(existsSync(url), rel);
  if (rel.endsWith(".sh")) {
    assert.ok((statSync(url).mode & 0o111) !== 0, `${rel} must be executable`);
  }
}

const contract = readFileSync(new URL("../docs/2.0/PUBLIC-CONTRACT.md", import.meta.url), "utf8");
for (const name of PUBLIC_MCP_TOOLS) {
  assert.match(contract, new RegExp(`\`${name}\``), `PUBLIC-CONTRACT names ${name}`);
}
assert.match(contract, /fraggate_list/);
assert.match(contract, /fraggate_describe/);
assert.match(contract, /fraggate_call/);
assert.match(contract, /proxy_is_not_exec/);
assert.match(contract, /engine_digest/);
assert.match(contract, /GET \/v1\/health/);
assert.match(contract, /GET \/v1\/runtime\.json/);
assert.doesNotMatch(contract, /enable Remain-OFF|turn on mesh from GET/i);

const refusal = readFileSync(new URL("../docs/2.0/REFUSAL-CONTRACT.md", import.meta.url), "utf8");
assert.match(refusal, /REMAIN-OFF-BY-DESIGN-2026-09-10/);
assert.match(refusal, /inventory \(33\)|33 items/i);
assert.match(refusal, /FG-HALLUC-TOOL/);
assert.match(refusal, /FG-STUB/);
assert.match(refusal, /MESH-NEED-BEARER/);
assert.match(refusal, /QNS-NO-PROXY/);
assert.match(refusal, /do not enable/i);
const remainCite = auditsCiteField().remain_off_by_design;
assert.equal(remainCite.do_not_enable, true);
assert.equal(remainCite.item_count, 33);

const breaking = readFileSync(new URL("../docs/2.0/BREAKING-CHANGE-POLICY.md", import.meta.url), "utf8");
assert.match(breaking, /future major/);
assert.match(breaking, /PUBLIC_MCP_TOOLS/);

const compat = readFileSync(new URL("../docs/2.0/COMPATIBILITY-POLICY.md", import.meta.url), "utf8");
assert.match(compat, /Glama/);
assert.match(compat, /TDQS/);
assert.match(compat, /no intentional behavioral breaks/i);
assert.match(compat, /2025-03-26/);

const packIndex = readFileSync(new URL("../docs/2.0/README.md", import.meta.url), "utf8");
assert.match(packIndex, /Gate 4/);
assert.match(packIndex, /TDQS/);
assert.match(packIndex, /glama\.json/);

const tdqs = readFileSync(new URL("../docs/GLAMA-TDQS.md", import.meta.url), "utf8");
assert.match(tdqs, /2\.0\.0-rc1/);
assert.match(tdqs, /No tool rename|names/);
assert.match(tdqs, /does not change (?:runtime )?behavior|does \*\*not\*\* change runtime behavior/i);
assert.doesNotMatch(tdqs, /this (?:PR|pass) changes (?:runtime )?behavior|routing change required/i);

const changelog = readFileSync(new URL("../docs/2.0/CHANGELOG.md", import.meta.url), "utf8");
assert.match(changelog, /1\.9\.x/);
assert.match(changelog, /2\.0\.0-rc1/);
assert.match(changelog, /No intentional behavioral breaks/);
assert.match(changelog, /TDQS/);

const clean = readFileSync(new URL("../docs/2.0/CLEAN-ROOM.md", import.meta.url), "utf8");
assert.match(clean, /scripts\/clean-room-2\.0\.sh/);
assert.match(clean, /AZIEL_RUNTIME_MCP=local/);
assert.match(clean, /No undocumented secrets|no undocumented secrets/i);
assert.match(clean, /without `wrangler deploy`/);
assert.match(clean, /or `wrangler deploy`/);
assert.doesNotMatch(clean, /(?:^|\n)\s*(?:npx\s+)?wrangler deploy/m);
assert.doesNotMatch(packIndex, /(?:^|\n)\s*(?:npx\s+)?wrangler deploy/m);
assert.match(packIndex, /Do not run `wrangler deploy`/);

const adv = readFileSync(new URL("../docs/2.0/EXTERNAL-ADVERSARIAL-PACK.md", import.meta.url), "utf8");
assert.match(adv, /Self-test ≠ third-party lab|self-test ≠ third-party lab/i);
assert.match(adv, /verify-adversarial/);
assert.match(adv, /verify-remain-off/);
assert.match(adv, /run unchanged/i);

const schema = JSON.parse(readFileSync(new URL("../docs/2.0/clean-room-result.schema.json", import.meta.url), "utf8"));
const sample = JSON.parse(readFileSync(new URL("../docs/2.0/clean-room-result.sample.json", import.meta.url), "utf8"));
assert.equal(schema.title, "Aziel Runtime 2.0 clean-room result");
assert.equal(sample.kind, "aziel-runtime.clean-room-2.0");
assert.equal(sample.runtime_version, "2.0.0-rc1");
assert.equal(sample.author, "Aziel Eliab");
assert.equal(sample.identity, "Aziel Eliab");
assert.equal(sample.third_party_lab, false);
assert.equal(sample.court_audit, false);
assert.equal(sample.remain_off_untouched, true);
assert.equal(sample.fraggate_single_door, true);
assert.equal(sample.mesh_get_never_enables, true);
assert.equal(sample.secrets_required, false);
assert.equal(sample.verdict, "PASS");
assert.ok(Array.isArray(sample.steps) && sample.steps.length >= 6);
assert.equal(sample.mcp.tools_list_count, PUBLIC_MCP_TOOLS.length);
assert.deepEqual(sample.mcp.tools_list_names.slice().sort(), PUBLIC_MCP_TOOLS.slice().sort());
for (const key of schema.required) {
  assert.ok(Object.prototype.hasOwnProperty.call(sample, key), `sample has ${key}`);
}
assert.match(sample.result_sha256, /^[a-f0-9]{64}$/);
assert.doesNotMatch(JSON.stringify(sample), /CLOUDFLARE_API_TOKEN|wrangler secret|BEGIN [A-Z]+ PRIVATE KEY/);

const glama = JSON.parse(readFileSync(new URL("../glama.json", import.meta.url), "utf8"));
assert.deepEqual(glama.maintainers, ["AzielEliab"]);
assert.equal(glama.name, "Aziel Runtime");
assert.ok(Array.isArray(glama.keywords) && glama.keywords.length >= 8);
assert.ok(Array.isArray(glama.categories) && glama.categories.length >= 3);
assert.match(glama.description, /forensic|audit|provenance/i);

assert.match(RUNTIME_ABSTRACT, /^Aziel Runtime is not merely an API orchestrator/);
assert.equal(RUNTIME_ONE_LINE.startsWith("Aziel Runtime is not merely an API orchestrator"), true);

const probe = await runCleanRoomProbe();
assert.equal(probe.mcp.server_version, "2.0.0-rc1");
assert.equal(probe.mcp.tools_list_count, PUBLIC_MCP_TOOLS.length);
assert.equal(probe.mcp.harmless_call.code, "FG-OK");
assert.equal(probe.receipt.chain_ok, true);
assert.match(probe.receipt.session_id, /^sess_[a-f0-9]{32}$/);

console.log("ok 2.0.0-rc1 contract freeze pack (not a lab)");

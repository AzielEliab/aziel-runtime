/**
 * Independent validation path is published and honest.
 * Not a third-party lab. Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildAttestation, junitXml } from "./write-attestation.mjs";
import { RUNTIME_VERSION } from "../src/runtime-api.js";

const paper = readFileSync(new URL("../docs/audit/INDEPENDENT-VALIDATION.md", import.meta.url), "utf8");
assert.match(paper, /Not a court|not a court/i);
assert.match(paper, /third-party lab/);
assert.match(paper, /scripts\/independent-validate\.sh/);
assert.match(paper, /validate\.yml/);
assert.match(paper, /npm test/);
assert.doesNotMatch(paper, /court audited|accredited lab certified|we were independently audited by/i);
assert.match(paper, /Aziel Eliab/);
assert.match(paper, /mesh`? never enables/);

const harness = readFileSync(new URL("../docs/audit/VALIDATION-HARNESS-2026-09-10.md", import.meta.url), "utf8");
assert.match(harness, /externally reproducible|published attestation/i);
assert.match(harness, /INDEPENDENT-VALIDATION/);
assert.doesNotMatch(harness, /third-party lab has signed|court has audited/i);

const gaps = readFileSync(new URL("../docs/designs/AZRT-1.9-GAPS-CLOSE.md", import.meta.url), "utf8");
assert.match(gaps, /CLOSED as externally reproducible self-check/);
assert.match(gaps, /INDEPENDENT-VALIDATION/);

assert.ok(existsSync(new URL("./independent-validate.sh", import.meta.url)));
const wf = readFileSync(new URL("../.github/workflows/validate.yml", import.meta.url), "utf8");
assert.match(wf, /Independent validate/);
assert.match(wf, /attestation\.json/);
assert.match(wf, /attest-build-provenance/);
assert.match(wf, /upload-artifact/);
assert.doesNotMatch(wf, /^\s+run: wrangler deploy/m);
assert.match(wf, /No wrangler deploy/);

const att = buildAttestation({ npm_test: "pass", exit_code: 0, git_sha: "abc1234" });
assert.equal(att.kind, "aziel-runtime.independent-validation");
assert.equal(att.runtime_version, RUNTIME_VERSION);
assert.equal(att.git_sha, "abc1234");
assert.equal(att.third_party_lab, false);
assert.equal(att.court_audit, false);
assert.match(att.attestation_sha256, /^[a-f0-9]{64}$/);
const xml = junitXml(att);
assert.match(xml, /<testsuite/);
assert.match(xml, /runtime_version/);
assert.ok(xml.includes(att.runtime_version));

console.log("ok independent-validation published attestation path (not a lab)");

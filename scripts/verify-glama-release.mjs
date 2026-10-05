/**
 * Glama Install Server release constant vs frozen Worker package.
 * GLAMA_INSTALL_RELEASE is Glama's listing counter (Latest / latestRelease).
 * package.json / glama.json version stay 2.0.0-rc1 (certification freeze).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLAMA_INSTALL_RELEASE, glamaInstallCite } from "../src/seo.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const glama = JSON.parse(readFileSync(new URL("../glama.json", import.meta.url), "utf8"));
const server = JSON.parse(readFileSync(new URL("../server.json", import.meta.url), "utf8"));

assert.equal(RUNTIME_VERSION, "2.0.0-rc1");
assert.equal(pkg.version, "2.0.0-rc1");
assert.equal(glama.version, "2.0.0-rc1");
assert.equal(server.version, "2.0.0-rc1");

assert.equal(GLAMA_INSTALL_RELEASE, "2.0.11");
assert.equal(glamaInstallCite().glama_release, GLAMA_INSTALL_RELEASE);
assert.notEqual(GLAMA_INSTALL_RELEASE, pkg.version);
assert.match(GLAMA_INSTALL_RELEASE, /^\d+\.\d+\.\d+$/);

const namedRelease = glama.description.match(/Glama Install Server release (\d+\.\d+\.\d+)\b/);
assert.ok(namedRelease, "glama.json description names the Install Server release");
assert.equal(namedRelease[1], GLAMA_INSTALL_RELEASE);

console.log(
  "ok glama release: listing",
  GLAMA_INSTALL_RELEASE,
  "package frozen",
  pkg.version,
);

/**
 * Operator probe: compare public Glama Latest to GLAMA_INSTALL_RELEASE.
 * Not required in CI (page HTML can change). Run after Auto-Release / Make Release:
 *   node scripts/check-glama-latest.mjs
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { GLAMA_INSTALL_RELEASE, RUNTIME_GLAMA } from "../src/seo.js";

const url = RUNTIME_GLAMA;
const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
});
if (!res.ok) {
  console.error(`FAIL: GET ${url} → ${res.status}`);
  process.exit(2);
}
const html = await res.text();
const badge = html.match(
  /updates<code[^>]*>v?<!-- -->([^<]+)<\/code><\/span><time[^>]*dateTime="([^"]+)"/,
);
if (!badge) {
  console.error("FAIL: could not parse public Latest badge from Glama HTML");
  process.exit(2);
}
const latest = badge[1].trim();
const observedAt = badge[2].trim();
console.log(`Glama Latest: ${latest} (observedAt ${observedAt})`);
console.log(`GLAMA_INSTALL_RELEASE: ${GLAMA_INSTALL_RELEASE}`);
console.log(`Worker package stays 2.0.0-rc1 (not compared here).`);
if (latest !== GLAMA_INSTALL_RELEASE) {
  console.error(
    `FAIL: constant lags Glama Latest. Bump src/seo.js GLAMA_INSTALL_RELEASE to ${latest} (and docs/glama.json description). Do not bump package.json version.`,
  );
  process.exit(1);
}
console.log("ok: GLAMA_INSTALL_RELEASE matches public Glama Latest");

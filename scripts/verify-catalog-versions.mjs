// Corpus banner and tarball names derive from VERSIONS (no drift).
import assert from "node:assert/strict";
import { VERSIONS, softwareTarball } from "../src/catalog-meta.js";
import { PRODUCTS } from "../src/index.js";

const corpus = PRODUCTS.find((p) => p.slug === "aziel-corpus");
const m = /Aziel Digital Library v(\d+\.\d+\.\d+)\./.exec(corpus.banner || "");
assert.ok(m, "corpus banner carries a version");
assert.equal(m[1], VERSIONS["aziel-corpus"], "corpus banner version == VERSIONS['aziel-corpus']");
assert.equal(corpus.version, VERSIONS["aziel-corpus"]);

const z = softwareTarball("zsolver", VERSIONS.zsolver, "https://x/download");
assert.equal(z.filename, `zion-pattern-solver-${VERSIONS.zsolver}.tar.gz`, "zsolver tarball uses real asset basename");
const g = softwareTarball("godlock", "1.0.0", "https://x/download");
assert.equal(g.filename, "godlock-1.0.0.tar.gz", "other slugs unchanged");
console.log("ok catalog versions: banner + tarball names: 5 checks");

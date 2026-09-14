/**
 * Locked truth: public tunnels/sites die with the pull.
 * Phoenix is wait / re-seal only — not public hostname resurrection.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MESH_LIMITATION } from "../src/mesh.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const papers = {
  "docs/designs/TUN-WP-0.1.md": read("docs/designs/TUN-WP-0.1.md"),
  "docs/designs/NODE-OPS-1.0.md": read("docs/designs/NODE-OPS-1.0.md"),
  "docs/designs/QNM-WP-1.0.md": read("docs/designs/QNM-WP-1.0.md"),
  "docs/designs/ACT-RECEIPT-1.0.md": read("docs/designs/ACT-RECEIPT-1.0.md"),
  "docs/NODE_MESH.md": read("docs/NODE_MESH.md"),
  "docs/designs/README.md": read("docs/designs/README.md"),
  "src/mesh.js": read("src/mesh.js"),
};

const forbidden = [
  /Phoenix brings/i,
  /phoenix brings the \.uk/i,
  /mesh auto-reattaches public hostname/i,
  /When the tunnel returns, it becomes primary again/i,
];

for (const [name, text] of Object.entries(papers)) {
  for (const re of forbidden) {
    assert.doesNotMatch(text, re, `${name} must not claim ${re}`);
  }
}

const tun = papers["docs/designs/TUN-WP-0.1.md"];
assert.match(tun, /Die with the pull/);
assert.match(tun, /nowhere legal to land/);
assert.match(tun, /operator kit, not the public contract/);
assert.match(tun, /wait \/ re-seal/);
assert.match(tun, /not public hostname resurrection/i);
assert.match(tun, /does not climb back onto the public hostname/i);
assert.match(tun, /Named hosts only/);

const ops = papers["docs/designs/NODE-OPS-1.0.md"];
assert.match(ops, /wait \/ re-seal/);
assert.match(ops, /not “bring the \.uk node back/i);
assert.match(ops, /does not restore godlock\.uk/);
assert.match(ops, /does not climb back onto the public hostname/i);
assert.match(ops, /operator kit, not this paper/);

const qnm = papers["docs/designs/QNM-WP-1.0.md"];
assert.match(qnm, /wait \/ re-seal/);
assert.match(qnm, /No public hostname resurrection/);
assert.match(qnm, /does not restore godlock\.uk/);
assert.match(qnm, /die with the pull/);
assert.match(qnm, /nowhere legal to land/);

const meshDoc = papers["docs/NODE_MESH.md"];
assert.match(meshDoc, /Die with the pull/);
assert.match(meshDoc, /not public hostname resurrection/i);
assert.match(meshDoc, /does not climb back onto the public hostname/i);

assert.match(MESH_LIMITATION, /die with the pull/);
assert.match(MESH_LIMITATION, /not public hostname resurrection/);
assert.match(MESH_LIMITATION, /bringing the \.uk node back/);
assert.match(papers["src/mesh.js"], /local wait \/ re-seal — no controller hunt; not public hostname resurrection/);

assert.match(papers["docs/designs/ACT-RECEIPT-1.0.md"], /die with the pull/i);
assert.match(papers["src/mesh.js"], /operator kit, not this contract/);

console.log("ok die-with-pull: tunnel/Phoenix/public-rollup wording matches locked truth");

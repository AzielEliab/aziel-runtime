/**
 * CROSS-NETWORK-SURVIVAL-1.0: if network and data die tomorrow, the
 * chain survives on cold shelves (hosts / DOI / git / vault).
 * Cites die-with-the-pull, split-the-wires, cold-copy, re-expand, REHEAL.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryStore } from "../src/chainlock/store.js";
import { append } from "../src/chainlock/ops.js";
import { seal, verify as verifyLockset } from "../src/lockset.js";
import { MESH_LIMITATION, resetMeshStore, runMeshOp } from "../src/mesh.js";
import { COLD_COPY } from "../src/cold-copy.js";
import { RE_EXPAND } from "../src/re-expand.js";
import { REHEAL } from "../src/reheal.js";
import { SPLIT_WIRES } from "../src/split-wires.js";
import {
  CROSS_NETWORK_SURVIVAL,
  CROSS_NETWORK_SURVIVAL_LAW,
  CROSS_NETWORK_SURVIVAL_SENTENCE,
  CROSS_NETWORK_SURVIVAL_SHORT,
  DIE_WITH_PULL,
  PRIOR_LAWS,
  SURVIVAL_SHELVES,
  SURVIVAL_TIP,
  citePriorLaws,
  isSurvivalShelf,
  networkDataDie,
  survivalCiteField,
  survivalHint,
} from "../src/cross-network-survival.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const files = [
  "docs/NODE_MESH.md",
  "docs/designs/NODE-OPS-1.0.md",
  "docs/designs/QNM-WP-1.0.md",
  "docs/designs/LS-WP-0.1.md",
  "docs/designs/TUN-WP-0.1.md",
  "docs/designs/README.md",
  "src/mesh.js",
  "src/lockset.js",
  "src/cross-network-survival.js",
  "docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md",
];
for (const rel of files) {
  const text = read(rel);
  assert.match(text, /CROSS-NETWORK-SURVIVAL-1\.0/, rel);
  assert.match(text, /if network and data die tomorrow[\s\S]{0,80}chain survives on cold shelves/i, rel);
  assert.match(text, /hosts \/ DOI \/ git \/ vault/, rel);
  assert.doesNotMatch(text, /Phoenix brings/i, rel);
}

assert.equal(CROSS_NETWORK_SURVIVAL, "CROSS-NETWORK-SURVIVAL-1.0");
assert.equal(CROSS_NETWORK_SURVIVAL_LAW.live_network_is_shelf, false);
assert.deepEqual(SURVIVAL_SHELVES.slice(), ["hosts", "doi", "git", "vault"]);
assert.match(CROSS_NETWORK_SURVIVAL_SENTENCE, /cold shelves/);
assert.match(CROSS_NETWORK_SURVIVAL_SHORT, /die-with-the-pull/);
assert.match(CROSS_NETWORK_SURVIVAL_SHORT, /split-the-wires/);
assert.match(CROSS_NETWORK_SURVIVAL_SHORT, /cold-copy/);
assert.match(CROSS_NETWORK_SURVIVAL_SHORT, /re-expand/);
assert.match(CROSS_NETWORK_SURVIVAL_SHORT, /REHEAL/);
assert.match(MESH_LIMITATION, /CROSS-NETWORK-SURVIVAL-1\.0/);

const cited = citePriorLaws();
assert.equal(cited.spec, CROSS_NETWORK_SURVIVAL);
assert.equal(cited.sentence, CROSS_NETWORK_SURVIVAL_SENTENCE);
assert.deepEqual(
  cited.prior.map((p) => p.spec),
  [DIE_WITH_PULL, SPLIT_WIRES, COLD_COPY, RE_EXPAND, REHEAL],
);
assert.equal(PRIOR_LAWS.length, 5);
assert.equal(isSurvivalShelf("git"), true);
assert.equal(isSurvivalShelf("mesh"), false);

const dead = networkDataDie({ network_dead: true, data_dead: true });
assert.equal(dead.ok, true);
assert.equal(dead.chain_survives, true);
assert.deepEqual(dead.shelves, ["hosts", "doi", "git", "vault"]);
assert.deepEqual(dead.prior_laws, [DIE_WITH_PULL, SPLIT_WIRES, COLD_COPY, RE_EXPAND, REHEAL]);

const live = networkDataDie({ live_network_is_shelf: true });
assert.equal(live.ok, false);
assert.equal(live.code, "MESH-NO-LIVE-SHELF");
assert.equal(live.live_network_is_shelf, false);

resetMeshStore();
const env = {};
const joined = await runMeshOp("join", { product: "godlock", node_id: "survival-peer" }, env);
assert.equal(joined.ok, true);
assert.equal(joined.cross_network_survival, CROSS_NETWORK_SURVIVAL);
assert.deepEqual(joined.survival_shelves, ["hosts", "doi", "git", "vault"]);
assert.equal(joined.live_network_is_shelf, false);
assert.equal(joined.split_wires, SPLIT_WIRES);
assert.equal(joined.cold_copy, COLD_COPY);
assert.equal(joined.re_expand, RE_EXPAND);
assert.equal(joined.reheal, REHEAL);

const shelf = await runMeshOp("status", { survive_on_network: true }, env);
assert.equal(shelf.ok, false);
assert.equal(shelf.code, "MESH-NO-LIVE-SHELF");
assert.deepEqual(shelf.prior, [DIE_WITH_PULL, SPLIT_WIRES, COLD_COPY, RE_EXPAND, REHEAL]);

const vault = new MemoryStore();
await append(vault, { c: "genesis", fact: "cross-network survival lockset genesis" });
await seal(vault);
const verified = await verifyLockset(vault);
assert.equal(verified.cross_network_survival, CROSS_NETWORK_SURVIVAL);
assert.equal(verified.chain_survives, true);
assert.equal(verified.live_network_is_shelf, false);

const badShelf = await verifyLockset(vault, { live_network_is_shelf: true });
assert.equal(badShelf.ok, false);

resetMeshStore();

const paper = read("docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md");
const pdf = readFileSync(join(root, "docs/designs/CROSS-NETWORK-SURVIVAL-1.0.pdf"));
assert.ok(pdf.slice(0, 5).toString() === "%PDF-");
assert.match(paper, /^# CROSS-NETWORK-SURVIVAL-1\.0/m);
assert.ok(paper.includes(SURVIVAL_TIP));
assert.match(paper, /INGEST-AS-RECEIPT/);
assert.match(paper, /Named hosts only/);
assert.match(paper, /No unmarked hydra/);
assert.match(paper, /No visible 15:20 chrome/);
assert.equal(survivalHint().tip, SURVIVAL_TIP);
assert.equal(survivalCiteField().tip, SURVIVAL_TIP);
assert.equal(survivalCiteField().ingest_as_receipt.spec, "INGEST-AS-RECEIPT");

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const cite = await (await handler(new Request(`${origin}/cite.json`), {})).json();
const llms = await (await handler(new Request(`${origin}/llms.txt`), {})).text();
assert.equal(cite.survival.tip, SURVIVAL_TIP);
assert.equal(cite.designs.umbrella, CROSS_NETWORK_SURVIVAL);
assert.ok(cite.designs.papers.some((p) => p.id === CROSS_NETWORK_SURVIVAL && p.kind === "law"));
assert.ok(llms.includes(SURVIVAL_TIP));

console.log(
  `ok ${CROSS_NETWORK_SURVIVAL}: chain survives on hosts/DOI/git/vault; cites ${cited.prior.map((p) => p.spec).join(", ")}; machine tip wired`,
);

/**
 * L2–L4 runtime cites. L0 stays the default. L1 stays opt-in.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { l2Cap7Stamp, l3Registry, l4AzosLayers, offlineNodePlan, aznetLayerCite } from "../src/fed-mesh/aznet-layers.js";
import { startRelayServer } from "../src/fed-mesh/local-http.js";
import { PRODUCTS } from "../src/index.js";
import { dispatchMeshHttp } from "../src/mesh.js";
import { listSoftwareEntries } from "../src/software-catalog.js";

const cite = aznetLayerCite();
assert.equal(cite.default, "L0");
assert.equal(cite.fork, false);
assert.equal(cite.replaces_l0, false);
assert.equal(cite.public_icann, false);
assert.equal(cite.name, "AZnet");
assert.equal(cite.slug, "aznet");
assert.equal(cite.catalog_label, "AZNet");
assert.equal(cite.same_software, true);
assert.equal(cite.aznet_replaces_internet, false);
assert.equal(cite.get_never_enables, true);
assert.equal(cite.softwares_count, 42);
assert.equal(cite.doi, null);
assert.equal(cite.cid, null);

const cap7 = l2Cap7Stamp();
assert.equal(cap7.dns_publish, false);
assert.equal(cap7.status, "live");
assert.equal(cap7.live, true);
assert.equal(cap7.factory_exec, true);
assert.equal(cap7.public_egress_ip, false);
assert.equal(cap7.worker_live, false);
assert.equal(cap7.hosted, false);
assert.equal(cap7.miragegrid_pr_landed, false);
assert.equal(cap7.public_icann, false);
assert.equal(cap7.resolves_to_hub, false);
assert.equal(cap7.internet_reachable, false);
assert.equal(cap7.icann_tld_az, false);
assert.equal(cap7.cite.status, "live");
assert.equal(cap7.cite.path, "/v1/mesh/az-generator");
assert.equal(cap7.refuse.icann.ok, false);
assert.equal(cap7.refuse.icann.public_icann, false);
assert.equal(cap7.refuse.register.live_registrar, false);
assert.equal(cap7.aznet_azbrowser.in_tree, true);
assert.equal(cap7.aznet_azbrowser.peer, "azbrowser");
assert.equal(cap7.aznet_azbrowser.door, "fraggate");
assert.equal(cap7.aznet_azbrowser.pairing_is_tunnel, false);
assert.equal(cap7.aznet_azbrowser.payload_host, false);
assert.equal(cap7.aznet_azbrowser.public_icann, false);
assert.match(cap7.aznet_azbrowser.repos.aznet, /^https:\/\/github\.com\/AzielEliab\/aznet$/);
assert.match(cap7.aznet_azbrowser.repos.azbrowser, /^https:\/\/github\.com\/AzielEliab\/azbrowser$/);

const shelf = l3Registry();
assert.equal(shelf.home_origin.id, "home-origin-mini-pc");
assert.equal(shelf.home_origin.spec, "ORIGIN-CUTOVER-1.0");
assert.equal(shelf.home_origin.status, "slot");
assert.equal(shelf.home_origin.cutover, false);
assert.equal(shelf.home_origin.live, false);
assert.equal(shelf.home_origin.dns_rented, false);
assert.equal(shelf.home_origin.live_dns_changed, false);
assert.equal(shelf.home_origin.deposited, false);
assert.equal(shelf.home_origin.hash_verify, null);
assert.equal(shelf.home_origin.serves, "aznet");
assert.equal(shelf.home_origin.display, "AZNet");
assert.equal(shelf.home_origin.separate_brand, false);
assert.equal(shelf.home_origin.aznet_side_net, "unbroken");
assert.equal(shelf.home_origin.public_path_default, "L0");
assert.equal(shelf.home_origin.refuse, "OC-HOME-ORIGIN-SLOT");
assert.equal(shelf.cold_shelves.status, "slot");
assert.equal(shelf.cold_shelves.live, false);
assert.equal(shelf.cold_shelves.codeberg.hash_verify, "pass");
assert.equal(shelf.cold_shelves.codeberg.live, false);
assert.equal(shelf.cold_shelves.archive_org.live, false);
assert.equal(shelf.cold_shelves.gitflic.status, "refused");
assert.equal(shelf.cold_shelves.gitflic.live, false);
assert.equal(shelf.cold_shelves.third_forge.url, null);
assert.equal(shelf.cold_shelves.zenodo.zenodo_live, false);
assert.equal(shelf.cold_shelves.zenodo.doi, null);
assert.equal(shelf.doi, null);
assert.equal(shelf.cid, null);
assert.equal(shelf.phoenix.status, "live");
assert.equal(shelf.phoenix.controller_hunt, false);
assert.equal(shelf.phoenix.vote_to_fix, false);
assert.equal(shelf.phoenix.replaces_l0, false);

const azos = l4AzosLayers();
assert.equal(azos.full_os, false);
assert.equal(azos.softwares_ui, false);
assert.equal(azos.exec, false);
assert.equal(azos.replaces_l0, false);
assert.deepEqual(
  azos.by_need.map((row) => row.need),
  ["read", "reach", "execute"],
);
assert.equal(azos.by_need[0].network, false);
assert.equal(azos.by_need[1].talks, "L0");
assert.equal(azos.by_need[2].status, "refuse");
assert.deepEqual(azos.by_need[2].ops, ["exec", "shell", "lattice"]);

const offline = offlineNodePlan({});
assert.equal(offline.mode, "offline-stub");
assert.equal(offline.when_online.use_l0, false);
assert.equal(offline.when_offline.mesh_enable, false);
assert.equal(offline.when_offline.exec, false);
assert.equal(offline.softwares_ui, false);
assert.equal(offline.public_icann, false);

const online = offlineNodePlan({ relay: "http://127.0.0.1:8780/v1/mesh/relay" });
assert.equal(online.mode, "online-l0");
assert.equal(online.when_online.use_l0, true);
assert.equal(online.when_online.talk, "L0");
assert.equal(online.get_never_enables, true);
assert.equal(online.hole_punch, false);
assert.equal(online.default_layer, "L0");
assert.equal(offlineNodePlan({ relay: "http://127.0.0.1:8780/v1/mesh/relay", online: false }).mode, "offline-stub");

const mesh = await dispatchMeshHttp("GET", "/v1/mesh", {}, {}, "https://example.test", new URLSearchParams());
assert.equal(mesh.status, 200);
assert.equal(mesh.body.code, "MESH-OK");
assert.equal(mesh.body.enabled, true);
assert.deepEqual(mesh.body.bearers, ["suite-presence"]);
assert.equal(mesh.body.get_never_enables, true);
assert.equal(mesh.body.aznet_layers.default, "L0");
assert.equal(mesh.body.aznet_layers.L2.dns_publish, false);
assert.equal(mesh.body.aznet_layers.L2.public_icann, false);
assert.equal(mesh.body.aznet_layers.L3.home_origin.status, "slot");
assert.equal(mesh.body.aznet_layers.L3.cold_shelves.zenodo.doi, null);
assert.equal(mesh.body.aznet_layers.L4.full_os, false);
assert.equal(mesh.body.aznet_layers.L4.softwares_ui, false);
assert.equal(mesh.body.peer_bearers.survival.runtime.default, "L0");
assert.equal(JSON.stringify(mesh.body).includes("framagit"), false);
assert.equal(mesh.body.spore.naming_lock.sidenet, "aznet");
assert.equal(mesh.body.spore.naming_lock.separate_brand, false);
assert.equal(mesh.body.spore.naming_lock.display, "AZNet");
const withoutLock = JSON.stringify(mesh.body).replace('"sidenet":"aznet"', '"slug":"aznet"');
assert.equal(withoutLock.toLowerCase().includes("sidenet"), false);
assert.equal(JSON.stringify(mesh.body.aznet_layers).toLowerCase().includes("sidenet"), false);
assert.equal(mesh.body.aznet_layers.name, "AZnet");

const cards = listSoftwareEntries(PRODUCTS, "https://example.test");
assert.equal(cards.length, 42);
assert.equal(cards.every((card) => card.mesh && card.mesh.aznet_layers == null), true);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);

const relay = await startRelayServer();
const dir = await mkdtemp(join(tmpdir(), "offline-node-"));
try {
  const out = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["qnm-node/offline-node.mjs", "--relay", relay.url, "--data", dir], {
      cwd: new URL("..", import.meta.url).pathname,
    });
    let buf = "";
    let err = "";
    child.stdout.on("data", (chunk) => {
      buf += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("exit", (code) => (code === 0 ? resolve(buf) : reject(new Error(err || buf || String(code)))));
  });
  const lines = out
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(lines[0].mode, "online-l0");
  assert.equal(lines[0].when_online.use_l0, true);
  assert.equal(lines[1].registered, true);
  assert.equal(lines[1].get_never_enables, true);
  assert.equal(lines[1].public_icann, false);
} finally {
  await relay.stop();
  await rm(dir, { recursive: true, force: true });
}

console.log("verify-aznet-layers: ok");

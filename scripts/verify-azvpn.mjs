/**
 * AZVPN concentrator + auto-bind.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { CATALOG_ALIASES } from "../src/catalog-meta.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { executeLocal } from "../src/engines/runner.js";
import { resetAzvpnStore, openTunnel, describeConcentrator } from "../src/engines/azvpn/engine.js";
import { ensureDefaultVpnSession, vpnArmed, vpnAutoCite } from "../src/azvpn-auto.js";
import { publicVpnCite } from "../src/public-vpn.js";
import { launchHashtagParts } from "../src/launch-parts.js";
import { BUILD_GIT_SHA } from "../src/build-meta.js";

resetAzvpnStore();

const product = PRODUCTS.find((p) => p.slug === "azvpn");
assert.ok(product, "azvpn is a catalog product");
assert.equal(product.name, "AZVPN");
assert.equal(product.github, "https://github.com/AzielEliab/aziel-runtime");
assert.match(product.banner, /AZVPN/);
assert.match(product.banner, /auto_use/);
assert.equal(CATALOG_ALIASES["az-vpn"], "azvpn");
assert.equal(CATALOG_ALIASES.tunnelconcentrator, "azvpn");

const live = LIVE_OPS.azvpn;
for (const op of ["describe", "open", "status", "list", "close", "send", "recv", "health", "skill"]) {
  assert.ok(live.includes(op), `LIVE_OPS.azvpn has ${op}`);
}
assert.ok(STUB_OPS.azvpn.includes("wireguard"));
assert.ok(STUB_OPS.azvpn.includes("openvpn"));

const registry = buildRegistry(PRODUCTS);
assert.equal(classifyCall(registry.bySlug.azvpn, "open").kind, "live");
assert.equal(classifyCall(registry.bySlug.azvpn, "wireguard").kind, "stub");
assert.equal(classifyCall(registry.bySlug.azvpn, "openvpn").kind, "stub");

const cite = publicVpnCite();
assert.equal(cite.vpn, true);
assert.equal(cite.public_vpn, true);
assert.equal(cite.tunnel_concentrator, true);
assert.equal(cite.concentrator_slug, "azvpn");
assert.equal(cite.default_vpn_backend, "azvpn");
assert.equal(cite.auto_use, true);
assert.equal(cite.worker_terminates_tunnels, true);
assert.equal(cite.worker_terminates_kernel_udp, false);
assert.equal(cite.kinds.https_ws, "REAL");
assert.equal(cite.kinds.wireguard, "SLOT");

assert.equal(vpnArmed({ vpn: true }), true);
assert.equal(vpnArmed({ public_vpn: true }), true);
assert.equal(vpnArmed({ tunnel: true }), true);
assert.equal(vpnArmed({}), false);
assert.equal(vpnAutoCite({ open: false }).get_never_opens, true);
assert.equal(vpnAutoCite({ open: true }).get_never_opens, false);

const described = describeConcentrator();
assert.equal(described.ok, true);
assert.equal(described.product, "azvpn");
assert.equal(described.name, "AZVPN");

const opened = await openTunnel({ kind: "https_ws", peer: "peer-a" });
assert.equal(opened.ok, true);
assert.equal(opened.kind, "https_ws");
assert.ok(opened.tunnel_id);
assert.ok(opened.receipt && opened.receipt.hash);

const wg = await openTunnel({ kind: "wireguard" });
assert.equal(wg.ok, false);
assert.equal(wg.code, "AZVPN-SLOT-WIREGUARD");
assert.equal(wg.connected, undefined);

const ovpn = await executeLocal({ slug: "azvpn", op: "openvpn", payload: {}, ranIn: "aziel-runtime" });
assert.equal(ovpn.status, 400);
const ovpnBody = JSON.parse(ovpn.responseText);
assert.equal(ovpnBody.code, "AZVPN-SLOT-OPENVPN");

resetAzvpnStore();
const auto = await ensureDefaultVpnSession({});
assert.equal(auto.ok, true);
assert.equal(auto.auto, true);
assert.equal(auto.connected, true);
assert.equal(auto.fake_connected, false);
assert.equal(auto.default_vpn_backend, "azvpn");
assert.ok(auto.tunnel_id);
const again = await ensureDefaultVpnSession({});
assert.equal(again.ok, true);
assert.equal(again.already, true);
assert.equal(again.tunnel_id, auto.tunnel_id);

const tags = launchHashtagParts(product).map((p) => p.tag);
assert.ok(tags.includes("#azvpn"));
assert.ok(tags.includes("#azvpn-concentrator"));
assert.ok(tags.includes("#azvpn-session"));

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
async function get(path, env = {}) {
  return handler(
    new Request(origin + path, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0" } }),
    env,
  );
}

const catalog = await (await get("/v1/software")).json();
const card = catalog.software.find((s) => s.slug === "azvpn");
assert.equal(card.worker_home, null);
assert.match(card.worker_home_note, /Do not invent a download-tracker/);
assert.equal(card.in_repo_home, `${origin}/p/azvpn`);
assert.equal(card.plain_status, "VPN on at boot");
assert.equal(card.opt_out, false);
assert.equal(catalog.git_sha, BUILD_GIT_SHA);
assert.equal(catalog.git_sha_source, "build_meta");
assert.equal(catalog.git_sha_tracks_deployed_tip, false);
assert.equal(catalog.deploy_lag, "deploy lag");

const health = await get("/p/azvpn/health");
assert.equal(health.status, 200);
const healthBody = await health.json();
assert.equal(healthBody.ok, false);
assert.equal(healthBody.code, "PROXY-NOT-EXEC");
assert.equal(healthBody.in_repo_door, true);
assert.equal(healthBody.worker_home, null);
assert.equal(healthBody.plain, "VPN on at boot.");

const tipped = await (await get("/v1/software", { GIT_SHA: "468a80fd4dc98726ee9586056fbc83029ce3fc16" })).json();
assert.equal(tipped.git_sha, "468a80fd4dc98726ee9586056fbc83029ce3fc16");
assert.equal(tipped.git_sha_source, "deploy_var");
assert.equal(tipped.git_sha_tracks_deployed_tip, true);
assert.equal(tipped.deploy_lag, null);

const page = await (
  await handler(new Request(origin + "/p/azvpn", { headers: { accept: "text/html", "user-agent": "Mozilla/5.0" } }), {})
).text();
assert.match(page, /id="azvpn-always-on"/);
assert.match(page, /VPN on at boot/);
assert.match(page, /In-runtime door/);
assert.doesNotMatch(page, /\/p\/azvpn\/health/);
assert.doesNotMatch(page, /Turn VPN off|Disable AZVPN|data-azvpn="opt-out"/);

console.log("ok azvpn: catalog AZVPN, REAL https_ws, SLOT wireguard/openvpn, auto-bind reuse, hashtags");

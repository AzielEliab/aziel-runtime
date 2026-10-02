/**
 * Page controller for the Track 2 LAN join shell.
 * Protocol lives in join.mjs. This file paints what the node returned.
 * Author: Aziel Eliab only.
 */

import { MOBILE_CLIENT, createMobileJoinClient } from "./join.mjs";

const banner = document.querySelector("#banner");
const selfList = document.querySelector("#self");
const baseInput = document.querySelector("#base");
const status = document.querySelector("#status");
const beaconList = document.querySelector("#beacon");
const rosterOut = document.querySelector("#roster-out");
const sessionList = document.querySelector("#session-out");
const log = document.querySelector("#log");
const buttons = [...document.querySelectorAll("button")];

banner.textContent = `mobile_client: ${MOBILE_CLIENT}. alt_internet_live: false. Not an app-store release. The public Worker stays FG-STUB.`;

const client = await createMobileJoinClient();
baseInput.value = location.origin && location.origin !== "null" ? location.origin : "";

fill(selfList, [
  ["handle", client.handle],
  ["carrier", "lan"],
  ["mobile_client", MOBILE_CLIENT],
  ["keys", "Held in this page only. A reload makes a new handle. That is not a demonstrated device."],
]);

function fill(list, rows) {
  list.replaceChildren();
  for (const [name, value] of rows) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = name;
    dd.textContent = value == null || value === "" ? "—" : String(value);
    list.append(dt, dd);
  }
}

function paintRoster(peers, discovery) {
  rosterOut.replaceChildren();
  const summary = document.createElement("p");
  summary.className = "hint";
  const fixture = discovery && Object.prototype.hasOwnProperty.call(discovery, "fixture") ? discovery.fixture : "—";
  const second = discovery && Object.prototype.hasOwnProperty.call(discovery, "second_device") ? discovery.second_device : false;
  summary.textContent = `fixture: ${fixture}. second_device: ${second}.`;
  rosterOut.append(summary);
  if (!peers || peers.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No peers on this node's local roster.";
    rosterOut.append(empty);
    return;
  }
  const table = document.createElement("table");
  const head = document.createElement("tr");
  for (const name of ["handle", "carrier", "fixture", "second_device", "verified", "mutual"]) {
    const th = document.createElement("th");
    th.textContent = name;
    head.append(th);
  }
  table.append(head);
  for (const peer of peers) {
    const tr = document.createElement("tr");
    for (const key of ["handle", "carrier", "fixture", "second_device", "verified", "mutual"]) {
      const td = document.createElement("td");
      td.textContent = peer[key] == null ? "—" : String(peer[key]);
      tr.append(td);
    }
    table.append(tr);
  }
  rosterOut.append(table);
}

function show(result) {
  log.textContent = JSON.stringify(result, null, 2);
  if (!result) return;
  status.textContent = result.ok === true ? result.code || "MESH-OK" : `${result.code || "error"}: ${result.message || ""}`;
}

async function run(task) {
  for (const button of buttons) button.disabled = true;
  status.textContent = "Talking to the local node…";
  try {
    show(await task());
  } catch (err) {
    show({
      ok: false,
      code: "FED-MESH-NO-ROUTE",
      message: String(err && err.message ? err.message : err),
      mobile_client: MOBILE_CLIENT,
      alt_internet_live: false,
    });
  } finally {
    for (const button of buttons) button.disabled = false;
  }
}

document.querySelector("#roster").addEventListener("click", () => {
  run(async () => {
    const result = await client.readRoster(baseInput.value);
    const node = result.node || {};
    paintRoster(result.peers || node.peers || [], node.carriers ? node.carriers.lan : null);
    fill(beaconList, [
      ["roster", result.roster_code || (result.ok ? "read" : result.code)],
      ["armed", Array.isArray(result.armed) ? result.armed.join(", ") || "none" : "none"],
      ["fixture", String(result.fixture === true)],
      ["second_device", String(node.second_device === true)],
      ["mobile_client", result.mobile_client],
      ["alt_internet_live", String(result.alt_internet_live)],
    ]);
    return result;
  });
});

document.querySelector("#discover").addEventListener("click", () => {
  run(async () => {
    const result = await client.discover(baseInput.value);
    const view = result.beacon || {};
    fill(beaconList, [
      ["presence", view.presence || "—"],
      ["tip_hash", view.tip_hash || "—"],
      ["node", result.node_handle || "—"],
      ["fixture", String(result.fixture === true)],
      ["second_device", String(result.second_device === true)],
      ["wifi_peer_exchange_demonstrated", String(result.wifi_peer_exchange_demonstrated)],
      ["mobile_client", result.mobile_client],
    ]);
    paintRoster(result.peers || [], result.discovery);
    return result;
  });
});

document.querySelector("#session").addEventListener("click", () => {
  run(async () => {
    const opened = await client.openSession(baseInput.value);
    if (!opened.ok) {
      fill(sessionList, [
        ["code", opened.code],
        ["mobile_client", opened.mobile_client],
        ["alt_internet_live", String(opened.alt_internet_live)],
      ]);
      return opened;
    }
    const sent = await client.send(baseInput.value, "lan-join");
    fill(sessionList, [
      ["peer_tunnel", opened.peer_tunnel],
      ["route_class", opened.route_class],
      ["bearer_mode", opened.bearer_mode],
      ["session_identity_is_node_key", String(opened.session_identity_is_node_key)],
      ["opened_plaintext", sent.ok ? sent.plaintext : sent.code],
      ["wifi_peer_exchange_demonstrated", String(opened.wifi_peer_exchange_demonstrated)],
      ["rf_live", String(opened.rf_live)],
      ["photon_live", String(opened.photon_live)],
      ["second_device", String(opened.second_device)],
      ["mobile_client", opened.mobile_client],
      ["alt_internet_live", String(opened.alt_internet_live)],
    ]);
    return sent.ok ? { ...opened, share: sent.plaintext, share_ok: true } : sent;
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/mobile/sw.js", { scope: "/mobile/" }).catch(() => {});
}

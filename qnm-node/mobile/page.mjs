/**
 * Page controller for the Track 2 LAN join shell.
 * Protocol lives in join.mjs. This file paints sentences from what the node returned.
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

banner.textContent = `This phone page is present and has not been demonstrated (mobile_client is ${MOBILE_CLIENT}). An alternative internet is not live (alt_internet_live is false). This is not an app-store release. The public Worker stays FG-STUB.`;

const client = await createMobileJoinClient();
baseInput.value = location.origin && location.origin !== "null" ? location.origin : "";

say(selfList, [
  `The handle on this page is ${client.handle}.`,
  "The carrier for this page is the local network.",
  `mobile_client is ${MOBILE_CLIENT}.`,
  "Keys stay in this page only. A reload makes a new handle. That is not a demonstrated device.",
]);

function say(list, sentences) {
  list.replaceChildren();
  for (const sentence of sentences) {
    const p = document.createElement("p");
    p.textContent = sentence;
    list.append(p);
  }
}

function yesNo(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "not reported";
}

function paintRoster(peers, discovery) {
  rosterOut.replaceChildren();
  const fixture = discovery && Object.prototype.hasOwnProperty.call(discovery, "fixture") ? discovery.fixture : null;
  const second = discovery && Object.prototype.hasOwnProperty.call(discovery, "second_device") ? discovery.second_device : false;
  const summary = document.createElement("p");
  summary.className = "hint";
  summary.textContent =
    fixture === true
      ? "This roster is a fixture. There is no second device (second_device is false)."
      : `fixture is ${yesNo(fixture)}. second_device is ${yesNo(second)}.`;
  rosterOut.append(summary);
  if (!peers || peers.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No peers on this node's local roster.";
    rosterOut.append(empty);
    return;
  }
  for (const peer of peers) {
    const p = document.createElement("p");
    const handle = peer.handle == null ? "unnamed" : String(peer.handle);
    p.textContent = `${handle} is on carrier ${peer.carrier == null ? "unreported" : peer.carrier}. fixture is ${yesNo(peer.fixture)}. second_device is ${yesNo(peer.second_device)}. verified is ${yesNo(peer.verified)}. mutual is ${yesNo(peer.mutual)}.`;
    rosterOut.append(p);
  }
}

function sentencesFor(result) {
  if (!result) return ["No reply."];
  const lines = [];
  const code = result.code || (result.ok === false ? "error" : "");
  if (result.ok === false) {
    const message = result.message ? ` ${result.message}` : "";
    lines.push(`The node refused. Code: ${code || "error"}.${message} Reading this page does not turn radios on.`);
  } else if (code) {
    lines.push(`The node answered. Code: ${code}.`);
  } else {
    lines.push("The node answered.");
  }
  const fixture =
    result.fixture === true ||
    (result.discovery && result.discovery.fixture === true) ||
    (result.node && result.node.carriers && result.node.carriers.lan && result.node.carriers.lan.fixture === true);
  const second =
    result.second_device === true || (result.node && result.node.second_device === true) || (result.discovery && result.discovery.second_device === true);
  if (fixture && second) lines.push("This is a fixture. The node says a second device is present (second_device is true).");
  else if (fixture) lines.push("This is a fixture. There is no second device (second_device is false).");
  else if (second) lines.push("The node says a second device is present (second_device is true).");
  else lines.push("There is no second device (second_device is false).");
  if (result.alt_internet_live === true) lines.push("An alternative internet is marked live (alt_internet_live is true).");
  else lines.push("An alternative internet is not live (alt_internet_live is false).");
  lines.push("The public worker door stays FG-STUB.");
  lines.push(`This phone page is present and has not been demonstrated (mobile_client is ${result.mobile_client || MOBILE_CLIENT}).`);
  return lines;
}

function show(result) {
  const sentences = sentencesFor(result);
  log.textContent = sentences.join("\n\n");
  status.textContent = sentences[0] || "No reply.";
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
    say(beaconList, [
      `Roster result: ${result.roster_code || (result.ok ? "read" : result.code || "refused")}.`,
      `Armed carriers: ${Array.isArray(result.armed) && result.armed.length ? result.armed.join(", ") : "none"}.`,
      `fixture is ${yesNo(result.fixture === true)}.`,
      `second_device is ${yesNo(node.second_device === true)}.`,
      `mobile_client is ${result.mobile_client || MOBILE_CLIENT}.`,
      result.alt_internet_live === true
        ? "An alternative internet is marked live (alt_internet_live is true)."
        : "An alternative internet is not live (alt_internet_live is false).",
    ]);
    return result;
  });
});

document.querySelector("#discover").addEventListener("click", () => {
  run(async () => {
    const result = await client.discover(baseInput.value);
    const view = result.beacon || {};
    say(beaconList, [
      `Presence is ${view.presence || "not reported"}.`,
      `The tip hash is ${view.tip_hash || "not reported"}.`,
      `The node handle is ${result.node_handle || "not reported"}.`,
      `fixture is ${yesNo(result.fixture === true)}.`,
      `second_device is ${yesNo(result.second_device === true)}.`,
      `wifi_peer_exchange_demonstrated is ${yesNo(result.wifi_peer_exchange_demonstrated)}.`,
      `mobile_client is ${result.mobile_client || MOBILE_CLIENT}.`,
    ]);
    paintRoster(result.peers || [], result.discovery);
    return result;
  });
});

document.querySelector("#session").addEventListener("click", () => {
  run(async () => {
    const opened = await client.openSession(baseInput.value);
    if (!opened.ok) {
      say(sessionList, [
        `The session was refused. Code: ${opened.code || "refused"}.`,
        `mobile_client is ${opened.mobile_client || MOBILE_CLIENT}.`,
        opened.alt_internet_live === true
          ? "An alternative internet is marked live (alt_internet_live is true)."
          : "An alternative internet is not live (alt_internet_live is false).",
      ]);
      return opened;
    }
    const sent = await client.send(baseInput.value, "lan-join");
    say(sessionList, [
      `The peer tunnel is ${opened.peer_tunnel || "not reported"}.`,
      `The route class is ${opened.route_class || "not reported"}.`,
      `The bearer mode is ${opened.bearer_mode || "not reported"}.`,
      `session_identity_is_node_key is ${yesNo(opened.session_identity_is_node_key)}.`,
      sent.ok ? `The sealed session opened. The share is ${sent.plaintext}.` : `The share was refused. Code: ${sent.code || "refused"}.`,
      `wifi_peer_exchange_demonstrated is ${yesNo(opened.wifi_peer_exchange_demonstrated)}.`,
      `rf_live is ${yesNo(opened.rf_live)}.`,
      `photon_live is ${yesNo(opened.photon_live)}.`,
      `second_device is ${yesNo(opened.second_device)}.`,
      `mobile_client is ${opened.mobile_client || MOBILE_CLIENT}.`,
      opened.alt_internet_live === true
        ? "An alternative internet is marked live (alt_internet_live is true)."
        : "An alternative internet is not live (alt_internet_live is false).",
    ]);
    return sent.ok ? { ...opened, share: sent.plaintext, share_ok: true } : sent;
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/mobile/sw.js", { scope: "/mobile/" }).catch(() => {});
}

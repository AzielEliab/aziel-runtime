/**
 * Local qnm-node radio hooks: LIVE-when-HW-present / refuse-when-absent.
 * Worker channel_plane stays cite-only. No mock LIVE.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  RADIO_ABSENT,
  RADIO_CHANNELS,
  RADIO_HOOK_SPEC,
  probeBluetooth,
  probePhoton,
  probeRf,
  probeWifi,
  radioRefuseAbsent,
  radioStatus,
} from "../qnm-node/bearers/radio.js";
import { CHANNEL_PLANE, channelPlaneCite } from "../src/mesh-channel-plane.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

const status = radioStatus();
assert.equal(status.spec, RADIO_HOOK_SPEC);
assert.equal(status.author, "Aziel Eliab");
assert.equal(status.worker_hardware, false);
assert.equal(status.invented_hardware, false);
assert.equal(status.mock, false);
assert.equal(status.public_proxy, false);
assert.equal(status.worker_channel_plane, "cite-only");
assert.equal(status.spore.spec, "SPORE-1.0");
assert.equal(status.spore.invented_heartbeats, false);
assert.ok(status.spore.mode === "live" || status.spore.mode === "dormant");
assert.deepEqual(Object.keys(status.channels).sort(), RADIO_CHANNELS.slice().sort());

for (const channel of RADIO_CHANNELS) {
  const row = status.channels[channel];
  assert.ok(row.state === "LIVE" || row.state === "REFUSE", `${channel} state`);
  assert.equal(row.mock, false, `${channel} no mock`);
  if (row.state === "REFUSE") {
    assert.equal(row.code, RADIO_ABSENT);
    assert.equal(row.hardware, false);
    const refuse = radioRefuseAbsent(channel);
    assert.equal(refuse.ok, false);
    assert.equal(refuse.code, RADIO_ABSENT);
  } else {
    assert.ok(row.hardware, `${channel} LIVE must name hardware`);
    assert.equal(radioRefuseAbsent(channel).ok, true);
  }
}

const wifi = probeWifi();
const bt = probeBluetooth();
const rf = probeRf();
const photon = probePhoton();
assert.equal(typeof wifi.present, "boolean");
assert.equal(typeof bt.present, "boolean");
assert.equal(typeof rf.present, "boolean");
assert.equal(typeof photon.present, "boolean");
if (!wifi.present) assert.equal(status.channels.wifi.state, "REFUSE");
if (!bt.present) assert.equal(status.channels.bluetooth.state, "REFUSE");
if (!rf.present) assert.equal(status.channels.rf.state, "REFUSE");
if (!photon.present) assert.equal(status.channels.photon.state, "REFUSE");

const plane = channelPlaneCite();
assert.equal(plane.worker_hardware, false);
assert.equal(plane.invented_hardware, false);
assert.equal(plane.local_radio_hooks.mock, false);
assert.equal(plane.local_radio_hooks.worker_hardware, false);
assert.equal(plane.local_radio_hooks.path, "qnm-node/bearers/radio.js");
assert.equal(CHANNEL_PLANE.worker_hardware, false);

const meshSrc = readFileSync(new URL("../src/mesh-channel-plane.js", import.meta.url), "utf8");
assert.doesNotMatch(meshSrc, /from ["'].*qnm-node\/bearers\/radio/);
assert.match(meshSrc, /worker_hardware: false/);

const mesh = await (await handler(new Request(origin + "/v1/mesh"), env)).json();
assert.equal(mesh.channel_plane.worker_hardware, false);
assert.equal(mesh.worker_hardware, false);
assert.equal(mesh.channel_plane.invented_hardware, false);
assert.equal(mesh.channel_plane.local_radio_hooks.mock, false);
assert.equal(mesh.wifi, "on");
assert.equal(mesh.bluetooth, "on");
assert.equal(mesh.rf, "on");
assert.equal(mesh.photon, "on");

console.log(
  JSON.stringify(
    {
      ok: true,
      spec: RADIO_HOOK_SPEC,
      worker_hardware: false,
      channels: Object.fromEntries(RADIO_CHANNELS.map((c) => [c, status.channels[c].state])),
    },
    null,
    2,
  ),
);

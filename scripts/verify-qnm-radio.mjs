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
  probeSdr,
  probeSiriusXm,
  probeSatelliteTerminal,
  probeWifi,
  radioRefuseAbsent,
  radioStatus,
  readRfBand,
  readSatelliteRelay,
} from "../qnm-node/bearers/radio.js";
import { CHANNEL_ORDER, CHANNEL_PLANE, RF_BAND_IDS, channelPlaneCite, workerClaimsRadioHardware } from "../src/mesh-channel-plane.js";
import { CARRIER_ORDER } from "../src/d2d-carriers.js";

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
assert.equal(status.packet_hop, false);
assert.equal(status.d2d_packet_status, "NOT-READY");
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
assert.equal(mesh.wifi, "cite");
assert.equal(mesh.bluetooth, "cite");
assert.equal(mesh.rf, "cite");
assert.equal(mesh.photon, "cite");
assert.equal(mesh.channel_plane.worker_radios_live, false);
assert.equal(mesh.channel_plane.display, "cite/operator-armed");
for (const name of ["wifi", "bluetooth", "rf", "photon"]) {
  assert.notEqual(mesh[name], "on", name);
  assert.notEqual(mesh[name], true, name);
  assert.notEqual(mesh.channel_plane[name], "on", name);
  assert.equal(mesh.channel_plane.rows[name].hardware, false, name);
  assert.equal(mesh.channel_plane.rows[name].live, false, name);
  if (mesh.worker_hardware === false && (mesh[name] === "on" || mesh[name] === "live" || mesh[name] === "LIVE" || mesh[name] === true)) {
    assert.fail(`${name} claims radio hardware the worker cannot see`);
  }
}

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

assert.deepEqual(CHANNEL_ORDER, ["lan", "wifi", "bluetooth", "rf", "photon", "satellite_relay"]);
assert.deepEqual(CARRIER_ORDER, CHANNEL_ORDER);
assert.equal(workerClaimsRadioHardware(mesh), false);
assert.equal(workerClaimsRadioHardware(status), false);
assert.equal(mesh.mesh_node_live, true);
assert.equal(mesh.alt_internet_live, true);
assert.equal(mesh.packet_path_live, true);
assert.equal(mesh.get_never_enables, true);
assert.equal(mesh.d2d_carriers.cap7_name_only, true);
assert.equal(mesh.d2d_carriers.public_icann, false);
assert.equal(mesh.d2d_carriers.paid_registrar, false);
assert.equal(mesh.d2d_carriers.cap7_registrar_live, false);
assert.equal(mesh.d2d_carriers.registrar_live, false);
assert.equal(mesh.d2d_carriers.dns_publish, false);
assert.equal(mesh.d2d_carriers.cap7_public_egress, false);
assert.equal(mesh.d2d_carriers.public_egress_ip, false);
for (const id of RF_BAND_IDS) {
  const cited = mesh.channel_plane.rows.rf.bands[id];
  const probed = status.rf_bands[id];
  assert.equal(cited.enabled, false, id);
  assert.equal(cited.live, false, id);
  assert.equal(cited.transmit, false, id);
  assert.equal(cited.receive_only, true, id);
  assert.equal(cited.purchased, false, id);
  assert.equal(cited.code, RADIO_ABSENT, id);
  assert.equal(probed.enabled, false, id);
  assert.equal(probed.live, false, id);
  assert.equal(probed.transmit, false, id);
  assert.equal(probed.purchased, false, id);
}
assert.equal(mesh.channel_plane.satellite_relay.enabled, false);
assert.equal(mesh.channel_plane.satellite_relay.live, false);
assert.equal(mesh.channel_plane.satellite_relay.transmit, false);
assert.equal(mesh.channel_plane.satellite_relay.purchased, false);
assert.equal(status.satellite_relay.enabled, false);
assert.equal(status.satellite_relay.live, false);
assert.equal(status.satellite_relay.transmit, false);
assert.equal(status.satellite_relay.purchased, false);
if (!probeSdr().present) {
  for (const id of ["am", "fm", "sat_rx"]) assert.equal(status.rf_bands[id].code, RADIO_ABSENT, id);
}
if (!probeSiriusXm().present) assert.equal(status.rf_bands.xm_sdars.code, RADIO_ABSENT);
if (!probeSatelliteTerminal().present) assert.equal(status.satellite_relay.code, RADIO_ABSENT);
assert.equal(workerClaimsRadioHardware({
  worker_hardware: false,
  channel_plane: { worker_hardware: false, rows: { rf: { bands: { am: { live: true, hardware: false } } } } },
}), true);
assert.equal(workerClaimsRadioHardware({
  worker_hardware: false,
  satellite_relay: { transmit: true, live: false, hardware: false },
}), true);
assert.equal(workerClaimsRadioHardware({
  rf_bands: { fm: { enabled: true, hardware: false, code: RADIO_ABSENT } },
}), true);
assert.equal(workerClaimsRadioHardware({
  worker_hardware: false,
  d2d_carriers: { carriers: [{ id: "satellite_relay", live: true, hardware: false }] },
}), true);

{
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = mkdtempSync(join(tmpdir(), "rf-bands-"));
  try {
    for (const id of ["am", "fm", "sat_rx"]) {
      const row = readRfBand(id, { root, live: true, enabled: true });
      assert.equal(row.code, RADIO_ABSENT, id);
      assert.equal(row.state, "REFUSE", id);
      assert.equal(row.live, false, id);
      assert.equal(row.enabled, false, id);
      assert.equal(row.transmit, false, id);
    }
    const xmAbsent = readRfBand("xm_sdars", { root, live: true, enabled: true });
    assert.equal(xmAbsent.code, RADIO_ABSENT);
    assert.equal(xmAbsent.live, false);
    assert.equal(xmAbsent.device, "siriusxm-tuner");
    const relayAbsent = readSatelliteRelay({ root, live: true, transmit: true, enabled: true });
    assert.equal(relayAbsent.code, RADIO_ABSENT);
    assert.equal(relayAbsent.live, false);
    assert.equal(relayAbsent.transmit, false);
    assert.equal(relayAbsent.purchased, false);
    assert.equal(relayAbsent.paid_ok, false);
    mkdirSync(join(root, "dev"), { recursive: true });
    writeFileSync(join(root, "dev/swradio0"), "");
    for (const id of ["am", "fm", "sat_rx"]) {
      const row = readRfBand(id, { root, live: true, enabled: true });
      assert.equal(row.hardware, "sdr", id);
      assert.equal(row.state, "OFF", id);
      assert.equal(row.code, null, id);
      assert.equal(row.live, false, id);
      assert.equal(row.enabled, false, id);
      assert.equal(row.transmit, false, id);
    }
    const xmStill = readRfBand("xm_sdars", { root, live: true });
    assert.equal(xmStill.code, RADIO_ABSENT, "an SDR is not a SiriusXM tuner");
    assert.equal(xmStill.live, false);
    writeFileSync(join(root, "dev/siriusxm0"), "");
    const xm = readRfBand("xm_sdars", { root, live: true, enabled: true });
    assert.equal(xm.hardware, "siriusxm-tuner");
    assert.equal(xm.live, false);
    assert.equal(xm.enabled, false);
    assert.equal(xm.transmit, false);
    assert.equal(xm.mesh_traffic, false);
    const relayStill = readSatelliteRelay({ root, live: true, transmit: true });
    assert.equal(relayStill.code, RADIO_ABSENT, "an SDR is not a satellite terminal");
    assert.equal(relayStill.transmit, false);
    writeFileSync(join(root, "dev/starlink0"), "");
    const relay = readSatelliteRelay({ root, live: true, transmit: true, enabled: true });
    assert.equal(relay.hardware, "starlink");
    assert.equal(relay.state, "OFF");
    assert.equal(relay.live, false);
    assert.equal(relay.enabled, false);
    assert.equal(relay.transmit, false);
    assert.equal(relay.purchased, false);
    assert.equal(relay.paid_ok, false);
    assert.equal(relay.encryption_allowed, false);
    assert.equal(relay.envelope_spec, "FED-MESH-1.0");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  console.log("verify-qnm-radio: rf bands and satellite relay stay off");
}

// QNM-PHOTON-CARRIER-1.0: photon is light. A local qnsd socket is not light hardware.
{
  const { createServer } = await import("node:net");
  const { mkdtempSync, mkdirSync, writeFileSync: wfs, readFileSync: rfs, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const photonMod = await import("../qnm-node/bearers/photon.js");
  const { probeLightHardware, photonChips, decodeChips, samplesToChips, photonSend, photonReceive, photonReceiveCamera, frameLuminance, framesToLuminance, readCameraFrames, crc32, PHOTON_ABSENT, PHOTON_CAMERA_FRAME } = photonMod;

  // 1) qnsd on loopback alone must not make photon LIVE (old code said LIVE kind qnsd-loopback).
  const dir = mkdtempSync(join(tmpdir(), "qnsd-"));
  const sock = join(dir, "qnsd.sock");
  const server = createServer(() => {});
  await new Promise((resolve) => server.listen(sock, resolve));
  const prev = process.env.QNSD_SOCK;
  process.env.QNSD_SOCK = sock;
  try {
    const realLight = probeLightHardware();
    const p = probePhoton();
    assert.notEqual(p.kind, "qnsd-loopback", "qnsd loopback is not photon hardware");
    if (!realLight.present) {
      assert.equal(p.present, false, "photon absent without light hardware even with qnsd up");
      const st = radioStatus();
      assert.equal(st.channels.photon.state, "REFUSE");
      assert.equal(st.channels.photon.code, RADIO_ABSENT);
      assert.equal(st.channels.photon.mock, false);
    }
  } finally {
    if (prev === undefined) delete process.env.QNSD_SOCK;
    else process.env.QNSD_SOCK = prev;
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }

  // 2) Probe needs a real emitter AND a real receiver. A sysfs tree stands in for /sys here.
  const root = mkdtempSync(join(tmpdir(), "photon-sys-"));
  try {
    assert.equal(probeLightHardware({ root }).present, false);
    assert.equal(probePhoton({ root }).present, false);
    mkdirSync(join(root, "sys/class/leds/input3::capslock"), { recursive: true });
    wfs(join(root, "sys/class/leds/input3::capslock/brightness"), "0");
    assert.equal(probeLightHardware({ root }).tx, false, "a keyboard LED is not a flash / torch emitter");
    mkdirSync(join(root, "sys/class/leds/white:flash"), { recursive: true });
    wfs(join(root, "sys/class/leds/white:flash/brightness"), "0");
    wfs(join(root, "sys/class/leds/white:flash/max_brightness"), "255");
    const txOnly = probeLightHardware({ root });
    assert.equal(txOnly.tx, true);
    assert.equal(txOnly.present, false, "emitter without a receiver is not a light carrier");
    assert.equal(txOnly.camera, null, "a sysfs root is not a camera");
    mkdirSync(join(root, "dev"), { recursive: true });
    wfs(join(root, "dev/video0"), "");
    assert.equal(probeLightHardware({ root }).present, false, "a video node file is not a light receiver");
    assert.equal(probeLightHardware({ root }).rx, false);
    assert.equal((await photonReceive({ root })).code, PHOTON_ABSENT);
    mkdirSync(join(root, "sys/bus/iio/devices/iio:device0"), { recursive: true });
    wfs(join(root, "sys/bus/iio/devices/iio:device0/in_illuminance_raw"), "12\n");
    const both = probeLightHardware({ root });
    assert.equal(both.present, true);
    assert.equal(probePhoton({ root }).present, true);
    assert.match(probePhoton({ root }).kind, /^led:white:flash\+iio:iio:device0$/);

    // 3) Codec: Manchester OOK frame round-trips, and a flipped chip fails the CRC.
    assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
    const chips = photonChips("AZ hello light");
    assert.equal(new TextDecoder().decode(decodeChips([0, 0, 1, ...chips, 0, 1])), "AZ hello light");
    const bad = chips.slice();
    const at = bad.length - 40;
    bad[at] ^= 1;
    bad[at + 1] ^= 1;
    assert.equal(decodeChips(bad), null, "corrupted frame refuses");
    assert.equal(new TextDecoder().decode(decodeChips(samplesToChips(chips.map((c) => (c ? 480 : 30) + (Math.random() * 10))))), "AZ hello light");

    // 4) Send drives the LED brightness file chip by chip, then leaves it off.
    const writes = [];
    const sent = await photonSend("hi", { root, write: (p, v) => { writes.push(v); wfs(p, v); }, sleep: async () => {} });
    assert.equal(sent.ok, true);
    assert.equal(sent.chips, photonChips("hi").length);
    assert.deepEqual(writes.slice(0, -1), photonChips("hi").map((c) => (c ? "255" : "0")));
    assert.equal(rfs(join(root, "sys/class/leds/white:flash/brightness"), "utf8"), "0");

    // 5) Receive samples the sensor at chip rate and decodes what the emitter sent.
    const replay = photonChips("lit").map((c) => (c ? "900" : "40"));
    let i = 0;
    const got = await photonReceive({ root, read: () => (i < replay.length ? replay[i++] : "40"), sleep: async () => {}, maxChips: replay.length + 64 });
    assert.equal(got.ok, true);
    assert.equal(new TextDecoder().decode(got.payload), "lit");

    // 6) V4L2 frame luminance is a second receiver beside IIO. No camera refuses. No invented frame.
    const dark = new Uint8Array(PHOTON_CAMERA_FRAME);
    dark.fill(20);
    const bright = new Uint8Array(PHOTON_CAMERA_FRAME);
    bright.fill(220);
    assert.equal(frameLuminance(dark), 20);
    assert.equal(frameLuminance(new Uint8Array(0)), null);
    assert.equal(framesToLuminance(dark.subarray(0, 10)), null, "a short frame is not padded into a luminance");
    const chipsCam = photonChips("lit");
    const frames = new Uint8Array(chipsCam.length * PHOTON_CAMERA_FRAME);
    chipsCam.forEach((chip, n) => frames.set(chip ? bright : dark, n * PHOTON_CAMERA_FRAME));
    const cam = await photonReceiveCamera({
      maxChips: chipsCam.length,
      spawnCapture: async () => frames,
    });
    assert.equal(cam.ok, true);
    assert.equal(cam.rx, "v4l2");
    assert.equal(cam.live, false, "a decoded camera buffer is not the photon channel LIVE");
    assert.equal(cam.mock, false);
    assert.equal(new TextDecoder().decode(cam.payload), "lit");
    const uneven = frames.subarray(0, frames.byteLength - 1);
    const badCam = await photonReceive({ rx: "v4l2", spawnCapture: async () => uneven });
    assert.equal(badCam.code, PHOTON_ABSENT);
    assert.equal(badCam.state, "REFUSE");
    assert.equal(badCam.mock, false);
    assert.equal(badCam.live, false);
    const emptyCam = await photonReceiveCamera({ spawnCapture: async () => null });
    assert.equal(emptyCam.code, PHOTON_ABSENT);
    assert.equal(emptyCam.mock, false);
    const numberCam = await readCameraFrames({ spawnCapture: async () => 255 });
    assert.equal(numberCam, null, "a bare luminance number is not a frame");
    const noDev = await photonReceive({ rx: "v4l2" });
    assert.equal(noDev.ok, false);
    assert.equal(noDev.state, "REFUSE");
    assert.equal(noDev.code, PHOTON_ABSENT);
    assert.equal(noDev.mock, false);
    assert.equal(noDev.live, false);
    const hostCam = await photonReceive({ rx: "v4l2", device: "/dev/null" });
    assert.equal(hostCam.ok, false);
    assert.equal(hostCam.state, "REFUSE");
    assert.equal(hostCam.code, PHOTON_ABSENT);
    assert.equal(hostCam.mock, false);
    assert.equal(hostCam.live, false);
    assert.equal(hostCam.payload, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  console.log("verify-qnm-radio: photon carrier ok");
}

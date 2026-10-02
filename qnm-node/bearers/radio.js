/**
 * Local qnm-node radio bearer hooks.
 *
 * LIVE when host hardware / qnsd is present. Refuse when absent.
 * No mock LIVE. No invented RF / BT / Wi-Fi / photon.
 *
 * Worker channel_plane stays cite-only (`worker_hardware: false`).
 * This module is local process law — not a FragGate slug, not MCP.
 *
 * Author: Aziel Eliab only.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const RADIO_HOOK_SPEC = "QNM-RADIO-HOOKS-1.0";
export const RADIO_HOOK_AUTHOR = "Aziel Eliab";
export const RADIO_ABSENT = "QNM-RADIO-ABSENT";
export const RADIO_CHANNELS = Object.freeze(["wifi", "bluetooth", "rf", "photon"]);

const IEEE80211 = "/sys/class/ieee80211";
const NET = "/sys/class/net";
const BLUETOOTH = "/sys/class/bluetooth";
const SDR_CLASS = "/sys/class/sdr";
const USB_RTL = "/sys/bus/usb/drivers/dvb_usb_rtl28xxu";
const SWRADIO0 = "/dev/swradio0";
const QNSD_SOCK = "/tmp/qnsd.sock";

function dirHasEntries(path) {
  try {
    if (!existsSync(path)) return false;
    const st = statSync(path);
    if (!st.isDirectory()) return false;
    return readdirSync(path).filter((n) => n && n !== "." && n !== "..").length > 0;
  } catch {
    return false;
  }
}

function netHasWireless() {
  try {
    if (!existsSync(NET)) return false;
    for (const name of readdirSync(NET)) {
      if (existsSync(join(NET, name, "wireless"))) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function qnsdLoopbackPresent() {
  if (existsSync(QNSD_SOCK)) {
    try {
      return statSync(QNSD_SOCK).isSocket();
    } catch {
      return false;
    }
  }
  const override = String(process.env.QNSD_SOCK || "").trim();
  if (override && existsSync(override)) {
    try {
      return statSync(override).isSocket();
    } catch {
      return false;
    }
  }
  try {
    const comms = readdirSync("/proc").filter((n) => /^\d+$/.test(n));
    for (const pid of comms) {
      let comm = "";
      try {
        comm = readFileSync(`/proc/${pid}/comm`, "utf8").trim();
      } catch {
        continue;
      }
      if (comm === "qnsd") return true;
    }
  } catch {
    /* no /proc */
  }
  return false;
}

export function probeWifi() {
  if (dirHasEntries(IEEE80211) || netHasWireless()) {
    return { present: true, kind: "ieee80211" };
  }
  return { present: false, kind: null };
}

export function probeBluetooth() {
  if (dirHasEntries(BLUETOOTH)) {
    return { present: true, kind: "bluetooth" };
  }
  return { present: false, kind: null };
}

/** SDR / dedicated RF — not Wi-Fi. */
export function probeRf() {
  if (existsSync(SWRADIO0) || dirHasEntries(SDR_CLASS) || dirHasEntries(USB_RTL)) {
    return { present: true, kind: "sdr" };
  }
  return { present: false, kind: null };
}

/** Local qnsd binds 127.0.0.1. That bind is not a mesh-wide loopback fence and is not open-world awareness. Open-world awareness binds 0.0.0.0. Never fetch 127.0.0.1 from the Worker. */
export function probePhoton() {
  if (qnsdLoopbackPresent()) {
    return { present: true, kind: "qnsd-loopback" };
  }
  return { present: false, kind: null };
}

function liveOrRefuse(channel, probe) {
  if (probe.present) {
    return {
      channel,
      state: "LIVE",
      hardware: probe.kind,
      code: null,
      mock: false,
    };
  }
  return {
    channel,
    state: "REFUSE",
    hardware: false,
    code: RADIO_ABSENT,
    mock: false,
    note: `${channel} hardware / local process absent — refuse. No mock LIVE.`,
  };
}

export function radioStatus() {
  const wifi = liveOrRefuse("wifi", probeWifi());
  const bluetooth = liveOrRefuse("bluetooth", probeBluetooth());
  const rf = liveOrRefuse("rf", probeRf());
  const photon = liveOrRefuse("photon", probePhoton());
  const anyLive = [wifi, bluetooth, rf, photon].some((row) => row.state === "LIVE");
  return {
    spec: RADIO_HOOK_SPEC,
    author: RADIO_HOOK_AUTHOR,
    identity: RADIO_HOOK_AUTHOR,
    worker_hardware: false,
    invented_hardware: false,
    mock: false,
    public_proxy: false,
    worker_channel_plane: "cite-only",
    packet_hop: false,
    d2d_packet_status: "NOT-READY",
    law: "LIVE-when-HW-present / refuse-when-absent",
    channels: { wifi, bluetooth, rf, photon },
    spore: {
      spec: "SPORE-1.0",
      mode: anyLive ? "live" : "dormant",
      metabolism: anyLive ? "on" : "paused",
      invented_heartbeats: false,
      note: anyLive
        ? "Local radio hardware present. Transmission metabolism can run."
        : "No local radio hardware. SPORE-1.0 dormant — pause, preserve DNA, wait. Do not invent LIVE radios.",
    },
    note:
      "Local qnm-node radio hooks. Worker GET /v1/mesh channel_plane stays cite-only (worker_hardware:false). A channel state of LIVE means host hardware or local qnsd is present. It is not a device-to-device packet hop (packet_hop false, d2d_packet_status NOT-READY). Photon here is local qnsd on loopback — not a camera/flash LiFi hop and not the open-world awareness bind (0.0.0.0). Dedicated RF packet hops and photon flashes stay on the D2D carrier plane. forced_loopback and loopback_isolation are not the mesh fence. SPORE-1.0: hardware absent is dormant, not a mock LIVE beat.",
  };
}

function probeLan() {
  try {
    if (!existsSync(NET)) return { present: false, kind: null };
    for (const name of readdirSync(NET)) {
      if (!name || name === "lo" || name === "." || name === "..") continue;
      return { present: true, kind: name };
    }
  } catch {
    /* no sysfs */
  }
  return { present: false, kind: null };
}

function probeModem() {
  if (dirHasEntries("/sys/class/wwan") || existsSync("/dev/cdc-wdm0")) {
    return { present: true, kind: "modem" };
  }
  try {
    if (!existsSync(NET)) return { present: false, kind: null };
    for (const name of readdirSync(NET)) {
      if (/^wwan|^rmnet|^cdc-wdm/i.test(name)) return { present: true, kind: name };
    }
  } catch {
    /* no sysfs */
  }
  return { present: false, kind: null };
}

function probeFlashCamera() {
  if (existsSync("/dev/video0")) return { present: true, kind: "camera" };
  const leds = "/sys/class/leds";
  try {
    if (!existsSync(leds)) return { present: false, kind: null };
    for (const name of readdirSync(leds)) {
      if (/flash|torch/i.test(name)) return { present: true, kind: name };
    }
  } catch {
    /* no leds */
  }
  return { present: false, kind: null };
}

/**
 * Track 2 carrier probe. Functional carriers in failover order.
 * Hardware absence is QNM-RADIO-ABSENT. Hardware presence is HW-PRESENT.
 * Neither state is a LIVE packet hop. No mock LIVE.
 */
export function track2CarrierProbe() {
  const rfHw = probeRf();
  const modem = probeModem();
  const rf = rfHw.present ? rfHw : modem;
  const rows = [
    ["lan", probeLan()],
    ["wifi", probeWifi()],
    ["bluetooth", probeBluetooth()],
    ["rf", rf],
    ["photon", probeFlashCamera()],
  ];
  const carriers = {};
  for (const [id, probe] of rows) {
    carriers[id] = probe.present
      ? {
          id,
          state: "HW-PRESENT",
          hardware: probe.kind,
          code: null,
          packet_live: false,
          mock: false,
          peer_exchange_demonstrated: false,
          note: "Hardware seen. Peer exchange is not demonstrated. Not a LIVE packet hop.",
        }
      : {
          id,
          state: "REFUSE",
          hardware: false,
          code: RADIO_ABSENT,
          packet_live: false,
          mock: false,
          peer_exchange_demonstrated: false,
          note: `${id} hardware absent. Refuse ${RADIO_ABSENT}. No mock LIVE.`,
        };
  }
  return {
    spec: "D2D-CARRIERS-1.0",
    plane: "track2-reachability",
    author: RADIO_HOOK_AUTHOR,
    order: ["lan", "wifi", "bluetooth", "rf", "photon"],
    order_arrow: "LAN → Wi-Fi → Bluetooth → RF → Photon light flashes",
    packet_live: false,
    alt_internet_live: false,
    mock: false,
    functional: true,
    carriers,
    note: "RF is beyond Wi-Fi and Bluetooth. Photon flashes are camera or flash, not qnsd. No carrier here is LIVE.",
  };
}

export function radioRefuseAbsent(channel) {
  const status = radioStatus();
  const row = status.channels[channel];
  if (!row) {
    return { ok: false, code: RADIO_ABSENT, channel, mock: false, note: "unknown channel" };
  }
  if (row.state === "LIVE") return { ok: true, ...row };
  return { ok: false, ...row };
}

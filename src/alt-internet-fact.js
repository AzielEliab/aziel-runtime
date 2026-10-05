/**
 * One not-live fact for the assistant JSON, the human sentence, and AZOS.
 * Flags stay false until a packet leaves this machine and arrives on a
 * different machine id. A same-machine frame, missing hardware, or a
 * refused carrier does not flip them.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { hostHardwareVisible, readMachineId, track2CarrierProbe } from "../qnm-node/bearers/radio.js";

const RADIO_ABSENT = "QNM-RADIO-ABSENT";
const ORDER = ["lan", "wifi", "bluetooth", "rf", "photon"];

const HEAD =
  "An alternative internet is not live (alt_internet_live is false). A packet path is not live (packet_path_live is false).";

const TAIL = [
  "Still missing: a packet that leaves this machine and arrives on a different machine id.",
  "A same-machine mesh frame does not count.",
  "Cap-7 and .aziel stay names, not a public registrar and not ICANN or BGP.",
  "WireGuard, OpenVPN, an L3 exit pool, kernel UDP, and TUN/TAP stay SLOT.",
  "Public mail send, the kernel, and boot stay not live.",
  "The public door stays FG-STUB.",
  "Isolation is single-node security-awareness.",
  "Phoenix is a local wait and re-seal.",
  "That is not a loopback fence.",
].join(" ");

export const ALT_INTERNET_SLOTS = Object.freeze({
  wireguard: "SLOT",
  openvpn: "SLOT",
  l3: "SLOT",
  kernel_udp: "SLOT",
  tun_tap: "SLOT",
});

function carrierClause(id, row) {
  const code = (row && row.code) || RADIO_ABSENT;
  if (!row || row.state === "REFUSE") {
    if (id === "lan" && row && row.up === false && row.hardware) {
      return `LAN interface ${row.hardware} is down (${code}).`;
    }
    if (id === "lan") return `LAN hardware is absent (${code}).`;
    if (id === "wifi") return `Wi-Fi hardware is absent (${code}).`;
    if (id === "bluetooth") return `Bluetooth hardware is absent (${code}).`;
    if (id === "rf") return `RF hardware is absent (${code}).`;
    return `Photon camera or flash is absent (${code}).`;
  }
  if (id === "lan") {
    const where = row.address ? ` at ${row.address}` : "";
    const name = row.hardware || "unnamed";
    return `LAN interface ${name}${where} is present on this machine and is not a second device.`;
  }
  const hw = row.hardware ? ` ${row.hardware}` : "";
  if (id === "wifi") return `Wi-Fi hardware${hw} is present on this machine and is not a second device.`;
  if (id === "bluetooth") return `Bluetooth hardware${hw} is present on this machine and is not a second device.`;
  if (id === "rf") return `RF hardware${hw} is present on this machine and is not a second device.`;
  return `Photon camera or flash hardware${hw} is present on this machine and is not a second device.`;
}

function machineClause(machineId) {
  if (machineId) {
    return `This machine id is ${machineId}. A second device stays false while both ends share that id.`;
  }
  return "This machine id is absent (MESH-HOST-ABSENT). A second device stays false without two different ids.";
}

/**
 * A watch qualifies only when the packet left this machine and the other
 * end has a different machine id. Caller-supplied flags do not qualify.
 */
export function watchQualifies(watch) {
  if (!watch || watch.mock === true) return false;
  if (watch.left_machine !== true || watch.arrived_other_machine !== true) return false;
  if (watch.same_machine_id !== false) return false;
  const local = typeof watch.machine_id === "string" ? watch.machine_id : "";
  const peer = typeof watch.peer_machine_id === "string" ? watch.peer_machine_id : "";
  return local.length > 0 && peer.length > 0 && local !== peer;
}

function pack(sentence, extra) {
  const qualified = watchQualifies(extra && extra.watch);
  return {
    alt_internet_live: qualified,
    packet_path_live: qualified,
    second_device: qualified,
    machine_id: extra.machine_id || null,
    missing: extra.missing,
    not_live_sentence: sentence,
    missing_line: sentence,
    path_slots: { ...ALT_INTERNET_SLOTS },
    public_door: "FG-STUB",
    public_mail_send_live: false,
    kernel_live: false,
    boot_live: false,
    cap7_name_only: true,
    public_icann: false,
    bgp: false,
    worker_hardware: false,
    host_hardware_visible: extra.visible === true,
    mock: false,
  };
}

/** Standing fact. Does not send a packet. Does not accept a caller watch. */
export function currentAltInternetFact() {
  if (!hostHardwareVisible()) {
    const sentence = `${HEAD} This isolate cannot see host hardware (worker_hardware is false). ${TAIL}`;
    return pack(sentence, {
      visible: false,
      machine_id: null,
      missing: [
        "host hardware (worker_hardware is false)",
        "a packet that leaves this machine and arrives on a different machine id",
      ],
    });
  }
  let probe = null;
  try {
    probe = track2CarrierProbe();
  } catch {
    probe = null;
  }
  const carriers = probe && probe.carriers ? probe.carriers : {};
  const machineId = readMachineId();
  const clauses = ORDER.map((id) => carrierClause(id, carriers[id]));
  const missing = ["a packet that leaves this machine and arrives on a different machine id"];
  for (const id of ORDER) {
    const row = carriers[id];
    if (!row || row.state === "REFUSE") missing.push(`${id} (${(row && row.code) || RADIO_ABSENT})`);
  }
  if (!machineId) missing.push("machine id (MESH-HOST-ABSENT)");
  const sentence = `${HEAD} ${clauses.join(" ")} ${machineClause(machineId)} ${TAIL}`;
  return pack(sentence, { visible: true, machine_id: machineId, missing });
}

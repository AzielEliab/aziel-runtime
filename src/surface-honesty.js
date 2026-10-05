/**
 * Shared facts for the runtime door, the human pages, and AZOS.
 * A stub, slot, warning, or refusal uses the same words on every surface.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { currentAltInternetFact } from "./alt-internet-fact.js";

export const SURFACE_HONESTY = Object.freeze({
  packet_path_live: false,
  alt_internet_live: false,
  d2d_status: "NOT-READY",
  warn5: "STANDS-until-demonstrated",
  veillock: "local_only",
  whitestone_worker_only: true,
  whitestone_public_door: false,
  smtp_send: "FG-STUB",
  stub_op_count: 363,
  booted: false,
  installed: false,
  os_yet: false,
  kernel_base: false,
  public_smtp_send: false,
  wireguard: "SLOT",
  openvpn: "SLOT",
  l3: "SLOT",
  kernel_udp: "SLOT",
  tun_tap: "SLOT",
  health_count: 41,
  softwares: 42,
  mcp_tools: 36,
});

export const HONESTY_SENTENCES = Object.freeze({
  internet: "Internet base is present. Not live.",
  mail: "Public send stays refused.",
  kernel: "The kernel base is present. It has not booted a machine.",
  os: "Not an OS yet",
  d2d: "Device-to-device packet carriers stay NOT-READY.",
  warn5: "WARN-5 stands.",
  vpn_slot: "WireGuard, OpenVPN, L3, kernel UDP, and TUN-TAP stay SLOT.",
  veillock: "VeilLock stays local_only.",
  whitestone: "Whitestone is worker-only and has no public door.",
  smtp: "Public smtp_send stays refused.",
  packet: "The packet path is not live.",
  alt: "The alternative internet is not live.",
});

export function sharedFactBlock() {
  const fact = currentAltInternetFact();
  return {
    packet_path_live: fact.packet_path_live === true,
    alt_internet_live: fact.alt_internet_live === true,
    second_device: fact.second_device === true,
    watch_qualifies: fact.watch_qualifies === true,
    confirm_is_authentication: false,
    public_mta: false,
    missing_line: fact.missing_line,
    not_live_sentence: fact.not_live_sentence,
    missing: fact.missing,
    machine_id: fact.machine_id,
    booted: false,
    installed: false,
    os_yet: false,
    kernel_base: false,
    public_smtp_send: false,
    is_os: false,
    d2d_status: SURFACE_HONESTY.d2d_status,
    warn5: SURFACE_HONESTY.warn5,
    public_door: "FG-STUB",
    smtp_send: SURFACE_HONESTY.smtp_send,
    lines: { ...HONESTY_SENTENCES },
  };
}

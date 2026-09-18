/**
 * azvpn in-process ops. Engine artifact is ./engine.js.
 * Author: Aziel Eliab.
 */
import {
  LIMITATION,
  LIVE_OPS,
  STUB_REFUSE,
  VERSION,
  attachTicket,
  azvpnDoctor,
  azvpnHealth,
  azvpnSkill,
  closeTunnel,
  describeConcentrator,
  limitationCite,
  listPeers,
  listTunnels,
  openTunnel,
  recvEnvelopes,
  sendEnvelope,
  tunnelStatus,
} from "./engine.js";

export const AZVPN_OPS = LIVE_OPS.slice();

export async function runAzvpn(op, payload) {
  if (op === "health") return azvpnHealth();
  if (op === "skill") return azvpnSkill();
  if (op === "doctor") return azvpnDoctor();
  if (op === "limitation") return limitationCite();
  if (op === "describe") return describeConcentrator();
  if (op === "open") return openTunnel(payload);
  if (op === "status") return tunnelStatus(payload);
  if (op === "list") return listTunnels(payload);
  if (op === "close") return closeTunnel(payload);
  if (op === "send") return sendEnvelope(payload);
  if (op === "recv" || op === "pull") return recvEnvelopes({ ...(payload || {}), op: op === "pull" ? "pull" : "recv" });
  if (op === "peers") return listPeers(payload);
  if (op === "attach") return attachTicket(payload);
  if (STUB_REFUSE.includes(op)) {
    return {
      ok: false,
      unsupported: false,
      refused: true,
      error: "SLOT: kernel VPN / WireGuard / OpenVPN / L3 exit is not implemented on this Worker.",
      code:
        op === "wireguard" || op === "wg"
          ? "AZVPN-SLOT-WIREGUARD"
          : op === "openvpn" || op === "ovpn"
            ? "AZVPN-SLOT-OPENVPN"
            : "AZVPN-SLOT-KERNEL",
      op,
      slot: true,
      vpn: true,
      public_vpn: true,
      worker_terminates_kernel_udp: false,
      real_kind: "https_ws",
      status: 400,
    };
  }
  return { unsupported: true };
}

export { LIMITATION, VERSION };

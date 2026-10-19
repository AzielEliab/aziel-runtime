/**
 * AZ-LOCKSTEP-1.0 host-data scan: generated contracts and design files must not carry anything specific to the
 * build host: no RFC1918 / link-local / loopback / ULA addresses and no network interface names.
 * Build refuses to write a contract that fails it; verify-lockstep fails on a committed one.
 * The legs' vendored verify-lockstep carries the same patterns. Author: Aziel Eliab.
 */
export const PRIVATE_IP = /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|127(?:\.\d{1,3}){3})\b|\b(?:fe80|fc[0-9a-f]{2}|fd[0-9a-f]{2}):[0-9a-f:]*/i;
export const IFACE = /\b(?:enp\d+s\d+|enx[0-9a-f]{12}|ens\d+|eno\d+|eth\d+|wlan\d+|wlp\d+s\d+|docker\d+|veth[0-9a-f]{4,}|br-[0-9a-f]{12}|virbr\d+|wg\d+|tailscale\d+|utun\d+)\b/;
export function hostDataFinding(text) {
  const ip = String(text).match(PRIVATE_IP);
  if (ip) return ip[0];
  const nic = String(text).match(IFACE);
  return nic ? nic[0] : null;
}

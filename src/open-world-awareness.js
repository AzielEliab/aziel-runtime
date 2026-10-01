/**
 * OPEN-WORLD-AWARENESS-1.0
 *
 * Operator lock 3 beside single-node security-awareness and the phoenix
 * reboot loop. The outward awareness bind is 0.0.0.0 (all interfaces).
 *
 * The law is LIVE on every suite mesh read. The Worker does not open a
 * socket. A local qnm-node listen is LIVE only while that process is bound
 * to 0.0.0.0; otherwise the socket stays live-when-configured. No mock LIVE.
 *
 * forced_loopback and loopback_isolation are not the mesh fence.
 * This bind is not a loopback fence, not a Cap-7 public egress IP, and not
 * a replacement for the ICANN internet.
 *
 * Author: Aziel Eliab only.
 */

export const OPEN_WORLD_AWARENESS_SPEC = "OPEN-WORLD-AWARENESS-1.0";
export const OPEN_WORLD_AWARENESS_BIND = "0.0.0.0";
export const OPEN_WORLD_AWARENESS_AUTHOR = "Aziel Eliab";

export const OPEN_WORLD_AWARENESS_NOTE =
  "Open-world awareness is the outward awareness bind on 0.0.0.0 (all interfaces). The operator lock is LIVE. The OS socket is live-when-configured on local qnm-node and is not a Worker listen. forced_loopback and loopback_isolation are not the mesh fence. This bind is not a loopback fence, not a Cap-7 public egress IP, and not a replacement for the ICANN internet.";

/**
 * Machine stamp. socketLive is true only when a local process is actually
 * listening on 0.0.0.0. The Worker always calls this with the default.
 */
export function openWorldAwarenessCite({ socketLive = false } = {}) {
  const listening = socketLive === true;
  const socket = listening ? "LIVE" : "live-when-configured";
  return {
    spec: OPEN_WORLD_AWARENESS_SPEC,
    author: OPEN_WORLD_AWARENESS_AUTHOR,
    identity: OPEN_WORLD_AWARENESS_AUTHOR,
    open_world_awareness: true,
    bind: OPEN_WORLD_AWARENESS_BIND,
    all_interfaces: true,
    law: "LIVE",
    status: socket,
    live: listening,
    socket,
    worker_socket: false,
    qnm_node_bind: socket,
    mock: false,
    forced_loopback: false,
    loopback_isolation: false,
    forced_loopback_is_mesh_fence: false,
    loopback_isolation_is_mesh_fence: false,
    mesh_fenced_to_loopback: false,
    public_egress_ip: false,
    residential: false,
    cf_geo_exit: false,
    cf_geo_exit_pool: false,
    sticky_public_ip: false,
    packet_forward: false,
    packet_forwarding: false,
    public_icann: false,
    cap7_is_icann: false,
    replaces_internet: false,
    not_a_second_internet: true,
    hosted_vpn: false,
    payload_host: false,
    vpn_hop: false,
    wireguard: false,
    openvpn: false,
    l3_exit: false,
    note: OPEN_WORLD_AWARENESS_NOTE,
  };
}

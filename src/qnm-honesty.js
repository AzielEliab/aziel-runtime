/**
 * Softwares / QNM named-flag honesty. Operator 2026-10-23.
 *
 * mesh_node_live, alt_internet_live, and packet_path_live are ON.
 * QNM separates those three from radio PHY: a carrier with no hardware
 * stays QNM-RADIO-ABSENT, packet_live on that carrier stays false, and
 * worker_hardware stays false. second_device stays a measured watch
 * (a packet that leaves this machine and arrives on a different machine id).
 * GET /v1/mesh never enables radios.
 *
 * Operator 2026-10-23 Cap-7: factory name-plane active use is ON for mesh
 * DNS factory coordination. Cap-7 is not public ICANN. No spend, no buy,
 * no register. cap7_name_only means a name is not an ICANN registration
 * and not BGP. It is not a stay-off of factory active use.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const QNM_NAMED_LIVE = Object.freeze({
  mesh_node_live: true,
  alt_internet_live: true,
  packet_path_live: true,
});

export const QNM_MEMBERSHIP = Object.freeze({
  mesh_membership: "on",
  mesh_default: "on",
  product_mesh: "default_on",
  mesh_radios: "on",
  radios: "on",
  get_never_enables: true,
});

/** Cap-7 mesh name-plane / factory. LIVE for active use. Not a packet carrier. */
export const CAP7_ACTIVE = Object.freeze({
  cap7_live: true,
  cap7_factory_live: true,
  cap7_active_use: true,
  cap7_name_plane_live: true,
  cap7_is_name_plane: true,
});

/**
 * Hard locks. Active use does not buy, register, or publish ICANN DNS
 * and does not open a public egress.
 */
export const CAP7_LOCKS = Object.freeze({
  cap7_registrar_live: false,
  paid_registrar: false,
  public_icann: false,
  cap7_public_icann: false,
  public_icann_registrar: false,
  dns_publish: false,
  icann_dns_publish: false,
  cap7_public_egress: false,
  public_egress_ip: false,
  packet_forwarding: false,
  ip_exit: false,
  hosted_vpn: false,
  registrar_live: false,
});

/** Active use plus the ICANN / egress locks. cap7_name_only is not a factory stay-off. */
export function cap7Honesty() {
  return {
    ...CAP7_ACTIVE,
    ...CAP7_LOCKS,
    cap7_name_only: true,
  };
}

export const QNM_SEPARATED = Object.freeze({
  radio_phy: false,
  worker_hardware: false,
  worker_radios_live: false,
  mock_radio: false,
  public_door: "FG-STUB",
  ...CAP7_ACTIVE,
  ...CAP7_LOCKS,
});

/** Copy of the three named flags. Callers must not treat this as radio PHY. */
export function qnmNamedLive() {
  return { ...QNM_NAMED_LIVE };
}

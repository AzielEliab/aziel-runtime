/**
 * Softwares / QNM named-flag honesty. Operator 2026-10-23.
 *
 * mesh_node_live, alt_internet_live, and packet_path_live are ON.
 * QNM separates those three from radio PHY: a carrier with no hardware
 * stays QNM-RADIO-ABSENT, packet_live on that carrier stays false, and
 * worker_hardware stays false. Cap-7 mesh-name factory active use is ON.
 * Cap-7 / .aziel are still not ICANN. public_icann, a paid registrar,
 * ICANN DNS publish, a public egress IP, packet forwarding, and
 * AZVPN-as-Cap-7 stay false. MG-NO-IP-EXIT stays. second_device stays a
 * measured watch (a packet that leaves this machine and arrives on a
 * different machine id). GET /v1/mesh never enables radios.
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

export const QNM_SEPARATED = Object.freeze({
  radio_phy: false,
  worker_hardware: false,
  worker_radios_live: false,
  mock_radio: false,
  cap7_is_name_plane: true,
  cap7_public_icann: false,
  cap7_public_egress: false,
  public_icann: false,
  registrar_live: false,
  public_door: "FG-STUB",
});

/**
 * Cap-7 mesh-name factory is ON for active use.
 * The name plane is not public ICANN and not a public egress IP.
 * Reading this object does not enable radios. GET /v1/mesh never enables.
 */
export const CAP7_ACTIVE_USE = Object.freeze({
  cap7_live: true,
  cap7_active_use: true,
  cap7_operator_hold: false,
  cap7_factory_active: true,
  cap7_name_only: false,
  cap7_names_only: false,
  paid_registrar: false,
  icann_dns_publish: false,
  dns_publish: false,
  packet_forwarding: false,
  azvpn_as_cap7: false,
  public_egress_ip: false,
  public_icann: false,
  cap7_public_icann: false,
  cap7_public_egress: false,
  registrar_live: false,
});

export const CAP7_ACTIVE_SENTENCE =
  "Cap-7 active use is ON. Cap-7 and .aziel are still not ICANN, not a public registrar, and not BGP.";

/** Copy of the three named flags. Callers must not treat this as radio PHY. */
export function qnmNamedLive() {
  return { ...QNM_NAMED_LIVE };
}

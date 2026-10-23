/**
 * Softwares / QNM named-flag honesty. Operator 2026-10-23.
 *
 * mesh_node_live, alt_internet_live, and packet_path_live are ON.
 * QNM separates those three from radio PHY: a carrier with no hardware
 * stays QNM-RADIO-ABSENT, packet_live on that carrier stays false, and
 * worker_hardware stays false. Cap-7 / .aziel stay names. second_device
 * stays a measured watch (a packet that leaves this machine and arrives
 * on a different machine id). GET /v1/mesh never enables radios.
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

/** Copy of the three named flags. Callers must not treat this as radio PHY. */
export function qnmNamedLive() {
  return { ...QNM_NAMED_LIVE };
}

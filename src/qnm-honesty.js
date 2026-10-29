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

/**
 * Operator 2026-10-29 (Aziel via AuditBot), locked the same day.
 * Paid satellite terminals and plans stay HELD. No spend, no SKU, no plan,
 * no checkout. This object is not a catalog of things to buy.
 */
export const PAID_SATELLITE_HELD = Object.freeze({
  held: true,
  enabled: false,
  live: false,
  transmit: false,
  purchased: false,
  paid_ok: false,
  paid_terminal: false,
  checkout: false,
  skus: false,
  plans: false,
  spend: false,
});

/**
 * Traffic-path switches. ON where the path is already designed and is not a
 * paid satellite terminal or plan. live stays false until code on that path
 * actually carries traffic. A switch is not a PHY and not a live hop.
 * XM SDARS stays HELD: it needs a paid SiriusXM plan. The satellite relay
 * stays HELD: a commercial terminal is a paid path. SDR satellite receive
 * (sat_rx) is not a terminal and not a plan.
 */
export const TRAFFIC_PATHS = Object.freeze({
  spec: "QNM-TRAFFIC-PATHS-1.0",
  operator: "2026-10-29",
  enabled: true,
  live: false,
  radio_phy: false,
  worker_hardware: false,
  worker_radios_live: false,
  public_icann: false,
  purchased: false,
  paid_ok: false,
  mock: false,
  paid_satellite: PAID_SATELLITE_HELD,
  open_paths: Object.freeze(["lan", "wifi", "bluetooth", "rf", "photon", "am", "fm", "sat_rx"]),
  held_paths: Object.freeze(["xm_sdars", "satellite_relay"]),
  paths: Object.freeze({
    lan: Object.freeze({ id: "lan", enabled: true, live: false, packet_live: false, phy: "absent-until-interface" }),
    wifi: Object.freeze({ id: "wifi", enabled: true, live: false, packet_live: false, phy: "absent-until-hardware" }),
    bluetooth: Object.freeze({ id: "bluetooth", enabled: true, live: false, packet_live: false, phy: "absent-until-hardware" }),
    rf: Object.freeze({ id: "rf", enabled: true, live: false, packet_live: false, phy: "absent-until-sdr" }),
    photon: Object.freeze({ id: "photon", enabled: true, live: false, packet_live: false, phy: "absent-until-light" }),
    am: Object.freeze({ id: "am", parent: "rf", enabled: true, live: false, receive_only: true, transmit: false, purchased: false, checkout: false, phy: "absent-until-sdr" }),
    fm: Object.freeze({ id: "fm", parent: "rf", enabled: true, live: false, receive_only: true, transmit: false, purchased: false, checkout: false, phy: "absent-until-sdr" }),
    xm_sdars: Object.freeze({
      id: "xm_sdars",
      parent: "rf",
      enabled: false,
      live: false,
      held: true,
      receive_only: true,
      transmit: false,
      mesh_traffic: false,
      purchased: false,
      paid_ok: false,
      subscription_held: false,
      checkout: false,
      skus: false,
      plans: false,
      spend: false,
      phy: "absent-until-siriusxm-tuner",
    }),
    sat_rx: Object.freeze({
      id: "sat_rx",
      parent: "rf",
      enabled: true,
      live: false,
      receive_only: true,
      transmit: false,
      purchased: false,
      paid_terminal: false,
      checkout: false,
      phy: "absent-until-sdr",
    }),
    satellite_relay: Object.freeze({
      id: "satellite_relay",
      held: true,
      enabled: false,
      live: false,
      transmit: false,
      purchased: false,
      paid_ok: false,
      paid_terminal: false,
      checkout: false,
      skus: false,
      plans: false,
      spend: false,
      software_path: false,
      packet_live: false,
      phy: "absent",
    }),
  }),
});

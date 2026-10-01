/**
 * Public MirageGrid Worker Cap-7 control-plane cite.
 * geo-target / session-stick / egress-rotate are LIVE there as a region
 * label, a sticky mesh node plus factory land, and a land rotate among
 * 7 sites. Not a public egress IP. Not a residential IP. Not a Cloudflare
 * geo-exit pool. Not a sticky public IP. Not packet forwarding. Not AZVPN.
 * Not an ICANN registrar. Author: Aziel Eliab only.
 */
export const MIRAGEGRID_WORKER_PR = "https://github.com/AzielEliab/miragegrid/pull/28";
export const MIRAGEGRID_EGRESS_CITE = "https://miragegrid.vibelock.workers.dev/v1/egress";
export const MIRAGEGRID_PLANNED_CITE = "https://miragegrid.vibelock.workers.dev/v1/planned";

export const CAP7_PUBLIC_WORKER_LIVE =
  `The public MirageGrid Worker Cap-7 control plane is LIVE (${MIRAGEGRID_EGRESS_CITE} and ${MIRAGEGRID_PLANNED_CITE}).`;

export const CAP7_PLANE_BOUNDARY =
  "They are not a public egress IP, not a residential IP, not a Cloudflare geo-exit pool, not a sticky public IP, not packet forwarding, not ICANN DNS, and not AZVPN.";

/** Control-plane host flags. hosted is the Worker plane, not hosted_vpn. */
export const CAP7_WORKER_FLAGS = Object.freeze({
  worker_live: true,
  hosted: true,
  hosted_vpn: false,
  hosted_note: "Public MirageGrid Worker Cap-7 control plane. Not a hosted VPN and not a public egress IP.",
  miragegrid_worker_pr: MIRAGEGRID_WORKER_PR,
  miragegrid_pr_landed: true,
  worker_egress: MIRAGEGRID_EGRESS_CITE,
  worker_planned: MIRAGEGRID_PLANNED_CITE,
  public_egress_ip: false,
  residential: false,
  cf_geo_exit_pool: false,
  sticky_public_ip: false,
  packet_forwarding: false,
  azvpn: false,
  public_icann: false,
});

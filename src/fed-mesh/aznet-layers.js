/**
 * Runtime-side L2–L4. Cites, refuse stamps, and an offline stub.
 * They do not replace L0. No public ICANN DNS. No invented DOI.
 * Author: Aziel Eliab only.
 */

import {
  CAP7_INTERNET_REACHABLE,
  CAP7_PUBLIC_ICANN,
  CAP7_RESOLVES_TO_HUB,
  cap7InjectionRefuse,
} from "../semantic-bridge.js";
import { PAIR_FLAG, PAIR_KIND, PAIR_NOTE, PAIR_PEER, SPEC as AZNET_SPEC } from "../engines/aznet/engine.js";
import { MOTTO, PRINCIPLES, PRODUCT as AZOS_PRODUCT } from "../engines/azos/engine.js";
import { ARCHIVE_ORG_TIP_PACK, CODEBERG_TIP_PACK, REFUSE } from "../cold-multi-shelf.js";
import {
  AZNET_DISPLAY,
  AZNET_SLUG,
  HOME_ORIGIN_ID,
  HOME_ORIGIN_SHELF,
  ORIGIN_CUTOVER,
} from "../origin-cutover.js";

export const AZBROWSER_GITHUB = "https://github.com/AzielEliab/azbrowser";
export const AZNET_GITHUB = "https://github.com/AzielEliab/aznet";
export const AZOS_GITHUB = "https://github.com/AzielEliab/azos";

export function l2Cap7Stamp() {
  const icann = cap7InjectionRefuse("icann_tld");
  const register = cap7InjectionRefuse("register");
  return {
    layer: "L2",
    id: "cap7-mesh-dns",
    dns_publish: false,
    status: "live",
    live: true,
    factory_exec: true,
    factory_status: "live",
    plane: "cap7",
    public_egress_ip: false,
    packet_egress: false,
    public_icann: CAP7_PUBLIC_ICANN,
    resolves_to_hub: CAP7_RESOLVES_TO_HUB,
    internet_reachable: CAP7_INTERNET_REACHABLE,
    icann_tld_az: false,
    standard_internet_reaches_cap7: false,
    radio_phy: false,
    replaces_l0: false,
    cite: {
      status: "live",
      path: "/v1/mesh/az-generator",
      code: "CAP7-CITE",
      note: "Factory duplication cite stays LIVE. Factory exec is a separate stamp (geo-target, session-stick, egress-rotate). Not a public resolver. Not a public egress IP.",
    },
    refuse: {
      icann: { ok: false, code: icann.code, public_icann: icann.public_icann === true ? true : false },
      register: { ok: false, code: register.code, live_registrar: false },
    },
    aznet_azbrowser: {
      in_tree: true,
      spec: AZNET_SPEC,
      peer: PAIR_PEER,
      pair_flag: PAIR_FLAG,
      kind: PAIR_KIND,
      door: "fraggate",
      pairing_is_tunnel: false,
      payload_host: false,
      public_icann: false,
      replaces_l0: false,
      repos: { aznet: AZNET_GITHUB, azbrowser: AZBROWSER_GITHUB },
      note: PAIR_NOTE,
    },
  };
}

export function l3Registry() {
  return {
    layer: "L3",
    replaces_l0: false,
    doi: null,
    cid: null,
    invented_doi: false,
    invented_cid: false,
    no_fan: true,
    zenodo_live: false,
    home_origin: {
      id: HOME_ORIGIN_ID,
      spec: ORIGIN_CUTOVER,
      status: HOME_ORIGIN_SHELF.status,
      live: false,
      configured: false,
      cutover: false,
      replaces_l0: false,
      deposited: HOME_ORIGIN_SHELF.deposited === true,
      hash_verify: HOME_ORIGIN_SHELF.hash_verify,
      hostname: HOME_ORIGIN_SHELF.hostname,
      ip: HOME_ORIGIN_SHELF.ip,
      url: HOME_ORIGIN_SHELF.url,
      dns_rented: HOME_ORIGIN_SHELF.dns_rented === true,
      live_dns_changed: HOME_ORIGIN_SHELF.live_dns_changed === true,
      doi: null,
      breaks_live_cf_hubs: false,
      published_surface: false,
      software_tab: false,
      serves: AZNET_SLUG,
      display: AZNET_DISPLAY,
      separate_brand: false,
      aznet_side_net: "unbroken",
      public_path_default: "L0",
      refuse: HOME_ORIGIN_SHELF.refuse,
      note: "No mini-PC origin is bound. No rented DNS, no live DNS change, no deposited bytes. The public path stays L0. The AZNet side-net stays unbroken. Live Cloudflare hubs stay.",
    },
    cold_shelves: {
      status: "slot",
      live: false,
      hash_verify_pass_is_not_live: true,
      codeberg: { url: CODEBERG_TIP_PACK.url, hash_verify: "pass", status: "slot", live: false },
      archive_org: { url: ARCHIVE_ORG_TIP_PACK.url, hash_verify: "pass", status: "slot", live: false },
      third_forge: { url: null, status: "slot", live: false, refuse: REFUSE.NO_FORGE },
      gitflic: { url: null, status: "refused", live: false, refuse: REFUSE.GITFLIC_EMAIL },
      usb: { status: "slot", live: false, refuse: REFUSE.OPERATOR_ATTEST },
      zenodo: { status: "slot", zenodo_live: false, doi: null, refuse: REFUSE.ZENODO_NOT_LIVE },
    },
    phoenix: {
      id: "phoenix",
      spec: "REHEAL-1.0",
      status: "live",
      live: true,
      controller_hunt: false,
      vote_to_fix: false,
      neighbor_vote: false,
      public_hostname_resurrection: false,
      replaces_l0: false,
      note: "Local wait / re-seal. Isolation is the cure. Not public hostname resurrection.",
    },
  };
}

export function l4AzosLayers() {
  return {
    layer: "L4",
    product: AZOS_PRODUCT,
    source: AZOS_GITHUB,
    motto: MOTTO,
    replaces_l0: false,
    full_os: false,
    softwares_ui: false,
    remote_shell: false,
    exec: false,
    by_need: [
      {
        need: "read",
        status: "live",
        network: false,
        live: true,
        note: `Principles and status can be read with no network. ${PRINCIPLES[0]}`,
      },
      {
        need: "reach",
        status: "live-when-online",
        talks: "L0",
        live: false,
        note: "When a relay URL is configured, the offline stub uses that L0 HTTPS path. It does not enable the mesh.",
      },
      {
        need: "execute",
        status: "refuse",
        live: false,
        ops: ["exec", "shell", "lattice"],
        note: "Host exec stays refuse. This stub does not run a shell.",
      },
    ],
  };
}

export function offlineNodePlan({ relay = "", online } = {}) {
  const relayUrl = String(relay || "").trim();
  const useL0 = Boolean(relayUrl) && online !== false;
  return {
    layer: "L4",
    replaces_l0: false,
    softwares_ui: false,
    full_os: false,
    public_icann: false,
    radio_phy: false,
    get_never_enables: true,
    hole_punch: false,
    default_layer: "L0",
    mode: useL0 ? "online-l0" : "offline-stub",
    when_offline: {
      talk: "local-stub",
      mesh_enable: false,
      exec: false,
    },
    when_online: {
      talk: "L0",
      use_l0: useL0,
      relay: useL0 ? relayUrl : null,
      get_never_enables: true,
      note: useL0
        ? "Online path is the relay the operator already named. That is L0. GET never enables."
        : "No relay is configured. The stub stays local and does not invent a door.",
    },
    layers: l4AzosLayers().by_need,
  };
}

export const AZNET_NAME = "AZnet";

export function aznetLayerCite() {
  return {
    name: AZNET_NAME,
    slug: "aznet",
    catalog_label: "AZNet",
    same_software: true,
    model: "stack",
    fork: false,
    default: "L0",
    replaces_l0: false,
    aznet_replaces_internet: false,
    not_a_second_internet: true,
    public_icann: false,
    radio_phy: false,
    get_never_enables: true,
    softwares_frozen: true,
    softwares_count: 42,
    doi: null,
    cid: null,
    L2: l2Cap7Stamp(),
    L3: l3Registry(),
    L4: l4AzosLayers(),
    note: "L2 Cap-7 factory exec is LIVE on the Cap-7 plane (metadata and session land). It does not publish ICANN DNS and it is not a public egress IP. L3 names SLOT shelves and does not cut the edge over to a home machine. L4 reads offline and uses L0 when a relay is configured. None replace L0.",
  };
}

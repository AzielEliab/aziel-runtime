/**
 * MASTER-33 domain map — 11 isolation domains / 33 softwares.
 *
 * Domains are isolation labels, not doors. FragGate is THE single door.
 * Softwares stay on the Softwares-tab. Extra live catalog items that are
 * not in the 33 (AZInterface, DecisionGATE, ForgeReceipts, FragGate Worker,
 * mesh) keep a placement — they are not extra doors.
 *
 * Author: Aziel Eliab only.
 */

export const DOMAIN_MAP_SPEC = "MASTER-33";
export const DOMAIN_MAP_AUTHOR = "Aziel Eliab";

export const DOMAINS = Object.freeze([
  {
    id: "01",
    slug: "vault-custody",
    name: "Vault/Custody",
    softwares: ["ark", "embryolock"],
  },
  {
    id: "02",
    slug: "media",
    name: "Media",
    softwares: ["vibelock", "veillock", "spectrallock", "trajectorylock"],
  },
  {
    id: "03",
    slug: "evidence",
    name: "Evidence",
    softwares: ["employeelock", "whistlelock", "peacelock", "shadowlock", "mialock", "chronolock"],
  },
  {
    id: "04",
    slug: "language",
    name: "Language",
    softwares: ["codelock", "foldlock", "glossafilter", "zsolver", "godlock", "azclce"],
  },
  {
    id: "05",
    slug: "ai",
    name: "AI",
    softwares: ["azai", "azbot", "azhub"],
  },
  {
    id: "06",
    slug: "research",
    name: "Research",
    softwares: ["azbrowser", "aziel-corpus", "4dmap"],
  },
  {
    id: "07",
    slug: "comms",
    name: "Comms",
    softwares: ["azmail", "azchat"],
  },
  {
    id: "08",
    slug: "network",
    name: "Network",
    softwares: ["aznet", "miragegrid", "azieltether"],
  },
  {
    id: "09",
    slug: "system",
    name: "System",
    softwares: ["azos"],
  },
  {
    id: "10",
    slug: "simulation",
    name: "Simulation",
    softwares: ["postking"],
  },
  {
    id: "11",
    slug: "core-time",
    name: "Core Time",
    softwares: ["staticclock", "temporallock"],
  },
]);

/**
 * Live catalog items not in the 33-software list.
 * Not extra doors. Isolation / surface labels only.
 */
export const PLACEMENTS = Object.freeze({
  azinterface: {
    placement: "human-ui",
    domain: null,
    domain_id: null,
    note: "AZInterface is the human UI before FragGate. Catalog software. Not an extra door.",
  },
  decisiongate: {
    placement: "fabric-product",
    domain: null,
    domain_id: null,
    note: "DecisionGATE is the policy hop on the locked strip. Catalog engine. Not an extra door.",
  },
  forgereceipts: {
    placement: "fabric-product",
    domain: null,
    domain_id: null,
    note: "ForgeReceipts packages Return. Catalog engine. Not an extra door.",
  },
  fraggate: {
    placement: "fabric-kernel",
    domain: null,
    domain_id: null,
    note: "FragGate is THE single door. Human Worker UI + counted download is the separate FragGate app.",
  },
  mesh: {
    placement: "fabric-mesh",
    domain: null,
    domain_id: null,
    note: "QNM-BUILD-1.0 suite rollup. Fabric/hub. Not a Softwares-tab product. Read-only suite-presence ON by default.",
  },
  memory: {
    placement: "fabric-memory",
    domain: null,
    domain_id: null,
    note: "AKM-TRIAD-1.0 adaptive knowledge memory. Fabric. Not a Softwares-tab product. Behind FragGate.",
  },
  azcoherence: {
    placement: "scoring-review",
    domain: null,
    domain_id: null,
    note: "AZCoherence is the second-pass coherence reviewer for triad scores. Scoring-adjacent to AZ-CLCE (Language isolation). Catalog software. Not an extra door. Not AKM-TRIAD fabric. Domain stays null — same pattern as decisiongate/forgereceipts: scoring-review is a placement, not a 34th isolation software. Domains are isolation labels, not doors. Cross-map peers: azclce (peer scorer), azinterface (human-UI), AKM-TRIAD (fabric neighbor, not merged).",
  },
  zkattest: {
    placement: "receipt-attest",
    domain: null,
    domain_id: null,
    note: "ZKAttest is a hash-commitment attest helper. Adjacent to ForgeReceipts. Catalog placement, not a 34th isolation software. Not Groth16/SNARK. In-runtime (no invented product Worker). FragGate only.",
  },
  mmconsensus: {
    placement: "consensus-review",
    domain: null,
    domain_id: null,
    note: "MMConsensus tallies caller-supplied opinions. Adjacent to DecisionGATE — not a replacement hop. Not live multi-model calls. Catalog placement, not a 34th isolation software. FragGate only.",
  },
  toolbench: {
    placement: "tool-playground",
    domain: null,
    domain_id: null,
    note: "ToolBench is a synthetic FragGate refuse playground. Self-test ≠ third-party lab. Not . Catalog placement, not a 34th isolation software. FragGate only.",
  },
  azvpn: {
    placement: "tunnel-concentrator",
    domain: null,
    domain_id: null,
    note: "AZVPN is the automatic application-layer HTTPS/WS tunnel concentrator (default_vpn_backend:azvpn, auto_use:true). Adjacent to AZNet (pairing stays order/token). Catalog placement, not a 34th isolation software. WireGuard/OpenVPN/L3 stay SLOT. In-runtime (no invented product Worker). FragGate only.",
  },
});

const BY_SLUG = (() => {
  const out = Object.create(null);
  for (const domain of DOMAINS) {
    for (const slug of domain.softwares) {
      out[slug] = {
        domain: domain.name,
        domain_id: domain.id,
        domain_slug: domain.slug,
        placement: "domain-software",
        note: `${domain.name} isolation label. Not a door. FragGate is the single door.`,
      };
    }
  }
  for (const [slug, row] of Object.entries(PLACEMENTS)) {
    out[slug] = { ...row };
  }
  return Object.freeze(out);
})();

export const MASTER_33_SLUGS = Object.freeze(DOMAINS.flatMap((d) => d.softwares.slice()));

/** Softwares-tab live cards that are not in the 33-software isolation set. Not extra doors. */
export const TAB_PLACEMENT_SLUGS = Object.freeze([
  "azinterface",
  "decisiongate",
  "forgereceipts",
  "azcoherence",
  "zkattest",
  "mmconsensus",
  "toolbench",
  "azvpn",
]);

export const CATALOG_COUNT_NOTE =
  "Softwares-tab count includes placements (azinterface / decisiongate / forgereceipts / azcoherence / zkattest / mmconsensus / toolbench / azvpn). Isolation domain software_count is 33 (domains_are_doors:false). Do not equate the two. EmbryoLock is live-with-local-destructive-boundary (Vault/Custody with ARK); wipe/unlock stay FG-STUB on the public mesh. AZChat is LIVE+bound (mesh default off; not AZMail). AZVPN is the automatic public VPN concentrator placement (HTTPS/WS REAL; WireGuard/OpenVPN SLOT; auto_use true). FragGate remains THE single door.";

export function domainForSlug(slug) {
  const key = String(slug || "")
    .trim()
    .toLowerCase();
  return BY_SLUG[key] || null;
}

export function domainFields(slug) {
  const row = domainForSlug(slug);
  if (!row) {
    return {
      domain: null,
      domain_id: null,
      domain_slug: null,
      placement: "catalog",
      domain_note: "Catalog item. Not an extra door. FragGate is the single door.",
    };
  }
  return {
    domain: row.domain || null,
    domain_id: row.domain_id || null,
    domain_slug: row.domain_slug || null,
    placement: row.placement,
    domain_note: row.note,
  };
}

export function domainMapView() {
  return {
    spec: DOMAIN_MAP_SPEC,
    author: DOMAIN_MAP_AUTHOR,
    identity: "Aziel Eliab",
    door: "fraggate",
    domains_are_doors: false,
    software_tab: true,
    domain_count: DOMAINS.length,
    software_count: MASTER_33_SLUGS.length,
    tab_placement_slugs: TAB_PLACEMENT_SLUGS.slice(),
    domains: DOMAINS.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      softwares: d.softwares.slice(),
    })),
    placements: { ...PLACEMENTS },
    note:
      "11 domains / 33 softwares are isolation labels. Softwares-tab count is larger because it includes placements (azinterface / decisiongate / forgereceipts / azcoherence / zkattest / mmconsensus / toolbench / azvpn). Internal Domain Layer executes isolated softwares after AZPIPE. Not additional doors. domains_are_doors:false.",
  };
}

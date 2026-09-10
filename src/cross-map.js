/**
 * Explicit catalog / engine peer maps.
 *
 * Domains are isolation labels, not doors. FragGate is THE single door.
 * AZCoherence stays a scoring-review placement (domain null) — same
 * pattern as DecisionGATE / ForgeReceipts. Not a 34th MASTER-33 software.
 * AKM-TRIAD is a fabric neighbor, not merged, not Softwares-tab.
 *
 * Author: Aziel Eliab only.
 */

export const SOFTWARE_HUBS = Object.freeze([
  "https://azieleliab.com",
  "https://www.azielcorpuslibrary.net",
  "https://godlock.uk",
]);

export const AZCOHERENCE_WORKER_URL = "https://azcoherence-download-tracker.vibelock.workers.dev/";
export const AZCLCE_WORKER_URL = "https://azclce-download-tracker.vibelock.workers.dev/";

export const DOMAIN_NULL_NOTE =
  "Leave domain null — same pattern as decisiongate/forgereceipts. Scoring-review is a placement, not a 34th isolation software. Domains are isolation labels, not doors. FragGate remains THE single door.";

const AZCLCE_PEER = Object.freeze({
  slug: "azclce",
  name: "AZ-CLCE",
  role: "peer-scorer",
  kind: "software",
  domain: "Language",
  domain_id: "04",
  worker_url: AZCLCE_WORKER_URL,
  github: "https://github.com/AzielEliab/az-clce",
  note: "Separate product. Detects R/D/P inconsistency. AZCoherence reviews primary vs alternate. Not a replacement.",
});

const AZCOHERENCE_PEER = Object.freeze({
  slug: "azcoherence",
  name: "AZCoherence",
  role: "peer-reviewer",
  kind: "software",
  placement: "scoring-review",
  domain: null,
  domain_id: null,
  worker_url: AZCOHERENCE_WORKER_URL,
  github: "https://github.com/AzielEliab/AZCoherence",
  note: "Separate product. Second-pass triad coherence (AZC-0.1). Not a replacement for AZ-CLCE. Not AKM-TRIAD.",
});

const AZINTERFACE_PEER = Object.freeze({
  slug: "azinterface",
  name: "AZInterface",
  role: "human-ui",
  kind: "software",
  placement: "human-ui",
  domain: null,
  domain_id: null,
  worker_url: "https://azinterface-download-tracker.vibelock.workers.dev/",
  github: "https://github.com/AzielEliab/azinterface",
  note: "AZInterface is the human UI before FragGate. Separate software. Same door. Not merged.",
});

const AKM_TRIAD_FABRIC = Object.freeze({
  slug: "memory",
  name: "AKM-TRIAD",
  spec: "AKM-TRIAD-1.0",
  role: "fabric-neighbor",
  kind: "fabric",
  domain: null,
  domain_id: null,
  note: "Not merged. Memory stays fabric, not Softwares. Posterior ≠ truth. AZCoherence is not AKM-TRIAD.",
});

export const AZCOHERENCE_CROSS_MAP = Object.freeze({
  slug: "azcoherence",
  name: "AZCoherence",
  spec: "AZC-0.1",
  placement: "scoring-review",
  domain: null,
  domain_id: null,
  domain_note: DOMAIN_NULL_NOTE,
  worker_url: AZCOHERENCE_WORKER_URL,
  github: "https://github.com/AzielEliab/AZCoherence",
  hubs: SOFTWARE_HUBS,
  peers: [AZCLCE_PEER, AZINTERFACE_PEER],
  fabric_neighbors: [AKM_TRIAD_FABRIC],
  merged: false,
  extra_door: false,
});

export const AZCLCE_CROSS_MAP = Object.freeze({
  slug: "azclce",
  name: "AZ-CLCE",
  placement: "domain-software",
  domain: "Language",
  domain_id: "04",
  domain_note: "Language isolation label. Not a door. FragGate is the single door.",
  worker_url: AZCLCE_WORKER_URL,
  github: "https://github.com/AzielEliab/az-clce",
  hubs: SOFTWARE_HUBS,
  peers: [AZCOHERENCE_PEER],
  fabric_neighbors: [],
  merged: false,
  extra_door: false,
});

const BY_SLUG = Object.freeze({
  azcoherence: AZCOHERENCE_CROSS_MAP,
  azclce: AZCLCE_CROSS_MAP,
});

export function crossMapFor(slug) {
  const key = String(slug || "")
    .trim()
    .toLowerCase();
  return BY_SLUG[key] || null;
}

export function peersOf(slug) {
  const row = crossMapFor(slug);
  return row ? row.peers.slice() : [];
}

export function neighborSlugsOf(slug) {
  const row = crossMapFor(slug);
  if (!row) return [];
  return row.peers.map((p) => p.slug);
}

/** Catalog / describe / registry attach. Empty object when the slug has no map. */
export function crossMapFields(slug) {
  const row = crossMapFor(slug);
  if (!row) return {};
  return {
    peers: row.peers.slice(),
    fabric_neighbors: row.fabric_neighbors.slice(),
    hubs: row.hubs.slice(),
    worker_url: row.worker_url,
    cross_map: {
      slug: row.slug,
      name: row.name,
      spec: row.spec || null,
      placement: row.placement,
      domain: row.domain,
      domain_id: row.domain_id,
      domain_note: row.domain_note,
      worker_url: row.worker_url,
      github: row.github,
      hubs: row.hubs.slice(),
      peers: row.peers.slice(),
      fabric_neighbors: row.fabric_neighbors.slice(),
      merged: row.merged,
      extra_door: row.extra_door,
    },
  };
}

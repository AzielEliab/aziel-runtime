/**
 * AZP-NS-1.0 public claim language.
 * These sentences are the only capability claims this layer makes.
 * Author: Aziel Eliab only.
 */

export const AZP_SPEC = "AZP-NS-1.0";
export const AZP_AUTHOR = "Aziel Eliab";

export const CLAIM_TAMPER_EVIDENT =
  "Records are tamper-evident: hash-linked and signed. Independent replication is fixture-tested. This is not a claim of immutability.";

export const CLAIM_PRIVACY_PRESERVING =
  "Payloads are privacy-preserving: encrypted end to end, with node identity separated from session identity. This is not anonymity.";

export const CLAIM_SURVIVABLE =
  "Checkpoints are survivable and federated in the fixture model. This is not an unkillable network.";

export const CLAIM_ZERO_TRUST =
  "Relays are untrusted transport. They cannot decrypt payloads. That design rule is not a production zero-trust certification.";

export const CLAIM_LIMITS = Object.freeze({
  anonymous: false,
  unkillable: false,
  immutable: false,
  cap7_public_icann: false,
  cap7_public_egress: false,
  mirage_is_azvpn: false,
  aznet_replaces_internet: false,
  tor_live: false,
  udp_live: false,
  radio_live: false,
  sandbox_live: false,
  live_multi_provider: false,
  plane_b_framagit: "SLOT",
  encryption_addressed_is_anonymity: false,
});

/**
 * Observer-visible classes that encryption does not remove.
 * necessary false: the protocol does not need to publish these as fields.
 * A network observer can still infer them. This is not an anonymity claim.
 */
export const OBSERVER_LEAKAGE = Object.freeze([
  Object.freeze({
    field: "timing",
    observer: "network",
    reveals: "send time and inter-message gaps",
    necessary: false,
    class: "leakage",
  }),
  Object.freeze({
    field: "ip_connection_frequency",
    observer: "network",
    reveals: "source address and how often a node connects",
    necessary: false,
    class: "leakage",
  }),
  Object.freeze({
    field: "message_size",
    observer: "relay",
    reveals: "ciphertext and envelope byte length",
    necessary: false,
    class: "leakage",
  }),
  Object.freeze({
    field: "relay_relationships",
    observer: "relay",
    reveals: "which relay carried which recipient hint",
    necessary: false,
    class: "leakage",
  }),
  Object.freeze({
    field: "node_uptime",
    observer: "network",
    reveals: "when a node is reachable",
    necessary: false,
    class: "leakage",
  }),
]);

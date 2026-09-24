/**
 * FED-MESH-1.0: Local-First Edge Mesh. Author: Aziel Eliab only.
 * Paper: docs/designs/FED-MESH-1.0.md
 * The Worker is one relay. The protocol does not require it.
 * Raw data, keys, and heavy compute stay on the local node.
 */

export const FED_SPEC = "FED-MESH-1.0";
export const FED_AUTHOR = "Aziel Eliab";
export const FED_RECEIPT_SPEC = "ACT-RECEIPT-1.1";
export const HANDLE_LEN = 11;
export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const ZERO_HASH = "0".repeat(64);
export const HANDLE_RE = /^#[0-9A-HJKMNP-TV-Z]{11}$/;

/** 11 Crockford characters = 55 bits. Birthday ~2^27.5 identities for ~50% collision. */
export const HANDLE_BITS = HANDLE_LEN * 5;

export const MSG_PER_MIN = 30;
export const RATE_WINDOW_MS = 60_000;
export const MAX_CIPHERTEXT_BYTES = 4096;
export const MAX_ROLLUP_BYTES = 16384;
export const MAX_CHANGES = 32;
export const MAX_PEERS = 16;
export const MAX_PEER_LIST_BYTES = 4096;
export const MAX_ENVELOPE_BYTES = 20_000;
export const INBOX_TTL_MS = 24 * 60 * 60 * 1000;
export const INBOX_QUOTA_BYTES = 64 * 1024;
export const INBOX_CAP = 32;
export const ROSTER_CAP = 256;
export const BATCH_RING = 256;
export const BOOTSTRAP_CAP = 8;
export const PULL_SKEW_MS = 5 * 60 * 1000;
export const PRESENCE_TTL_MS = 5 * 60 * 1000;
export const PREV_WINDOW = 32;
export const REF_NAME_RE = /^[a-z0-9][a-z0-9_./-]{0,63}$/;
export const MAX_OBJECT_BYTES = 4096;
export const OBJECT_CACHE_CAP = 64;
export const OBJECT_CACHE_BYTES = 64 * 1024;
export const MAX_SYNC_ACTS = 16;
export const NAME_CAP = 7;
export const AZIEL_NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.aziel$/;
export const SELF_LABEL_RE = /^[0-9a-hjkmnp-tv-z]{11}$/;
/** Factory mesh names. Same set as cap7FactoryMeshNames(). Not FED-MESH records. */
export const CAP7_AZ_ALLOWLIST = Object.freeze([
  "azgrid.az",
  "azbooth.az",
  "azcloak.az",
  "azvault.az",
  "azshift.az",
  "azflag.az",
  "azstandby.az",
]);
/** Hub display names. Same set as CAP7_REAL_ALIGNMENT. Not FED-MESH records. */
export const AZ_STAR_ALLOWLIST = Object.freeze([
  "AZ.AzielEliab.AZ",
  "AZ.Godlock.AZ",
  "AZ.AzielCorpusLibrary.AZ",
  "AZ.HeDidntJump.AZ",
]);
export const AZ_DNS_RULE =
  ".az is normal DNS. The exception is the Cap-7 allowlist (azgrid.az, azbooth.az, azcloak.az, azvault.az, azshift.az, azflag.az, azstandby.az) and the AZ.* hub names (AZ.AzielEliab.AZ, AZ.Godlock.AZ, AZ.AzielCorpusLibrary.AZ, AZ.HeDidntJump.AZ). Those are cites, not .aziel name records. Standard internet does not reach Cap-7. AZ.* resolves through hub HTTPS. icann_tld_az is false.";

export const ROLES = Object.freeze({
  admin: Object.freeze({
    name: "Admin",
    is: "node owner",
    may: Object.freeze(["register", "heartbeat", "leave", "post", "pull", "deliver", "rollup", "peers", "bootstrap", "multisig-policy", "remote-task", "direct", "ref", "sync", "object", "name"]),
  }),
  developer: Object.freeze({
    name: "Developer",
    is: "builder on this node",
    may: Object.freeze(["post", "pull", "deliver", "rollup", "remote-task", "direct", "ref", "sync", "object", "name"]),
  }),
  guest: Object.freeze({
    name: "Guest",
    is: "reader of this node",
    may: Object.freeze(["pull", "direct-receive"]),
  }),
});

export const VERIFIED_HANDLES_NOTE =
  "verified_handles counts distinct #handles whose signing key matches the handle and whose presence was seen inside 5 minutes. One handle is one node. Three local instances with three keys are three nodes. The count is handles, not people. software_nodes stays the {slug}-worker roster. instance_nodes stays downloaded Softwares. The published nodes pill stays human mesh users plus cited human uses. The published live_nodes pill stays human mesh users plus site viewers. Handles are not added into those pills.";

export const FED_TITLE = "FED-MESH-1.0: Local-First Edge Mesh";

export const FED_CITE = Object.freeze({
  spec: FED_SPEC,
  title: FED_TITLE,
  author: FED_AUTHOR,
  local_first: true,
  inner_core: "Raw data, signing keys, and heavy compute stay on the local node.",
  outer_mesh: "By default the mesh carries signed receipts, state digests (engine_digest-style), and ref updates. Raw data moves only on an explicit end-to-end encrypted share.",
  worker_requires_plaintext: false,
  neighborhood: "LAN discovery, preferring cluster peers, and offline work run on the local node. This relay does not discover a LAN. It accepts a later sync of rollups and ref updates whose chains are valid, and it refuses forks.",
  content_model: "Content-addressed objects. A signed ref update names the handle, ref name, object hash, previous ref hash, sequence, and signature. This relay stores and serves that index and anchors it. It does not need the object bytes.",
  object_cache: "Optional cache of small public objects. Each object is at most 4096 bytes. The cache holds at most 64 objects and 64KiB. The hash is checked. A mismatch or an oversized body is refused.",
  object_fetch: "A peer asks { v, kind: object-fetch, hash } and answers { v, kind: object, hash, body_b64 } or FED-MESH-NO-OBJECT.",
  name_records: "Signed .aziel name records. A self-certifying name is the handle body plus .aziel. A friendly name goes to the first valid anchored claim. A handle may hold 7 friendly names. Transfer and release are signed by the current owner. A fork is refused.",
  az_dns: AZ_DNS_RULE,
  worker_is_one_relay: true,
  protocol_requires_this_worker: false,
  tenant_exec_on_worker: false,
  tenant_tasks: "local nodes",
  edge_compute_on_worker: false,
  private_keys_on_worker: false,
  message_bodies: "X25519-HKDF-SHA256-AES-GCM ciphertext",
  relay_sees_plaintext: false,
  receipt_sentences_public: true,
  transport_confidentiality: "TLS to the relay, when the URL is https. The relay still sees routing metadata. Loopback tests may use http.",
  nat: "A peer with no public address sends and receives through a relay. This protocol does not punch holes through NAT.",
  direct_transport: "Same signed envelope on loopback or a configured LAN URL. The relay is the fallback.",
  bootstrap: "A new node needs at least one relay address it already has (config, CLI, or a signed list from any relay). A signed list on this Worker is one source. It is not the only source.",
  failover: "A node may register with more than one relay. GET /v1/mesh/relay is the health check. A failed check selects the next configured relay. GET never enables.",
  single_point_of_failure: false,
  relay_hop: "one forward to relays named on the recipient registration or on an accepted peer list",
  get_never_enables: true,
  e2e: true,
});

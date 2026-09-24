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
/** User-chosen .aziel names. The self-certifying name does not count. */
export const USER_SLOT_CAP = 3;
/** Hub-mirror slots. Not user-nameable. Separate from MirageGrid Cap-7 factory .az names. */
export const RESERVED_SLOT_CAP = 4;
export const NAME_CAP = USER_SLOT_CAP;
export const RESERVED_SLOTS = Object.freeze([
  Object.freeze({ slot: "ae", hub: "AZ.AzielEliab.AZ", origin: "https://www.azieleliab.com/" }),
  Object.freeze({ slot: "corpus", hub: "AZ.AzielCorpusLibrary.AZ", origin: "https://www.azielcorpuslibrary.net/" }),
  Object.freeze({ slot: "godlock", hub: "AZ.Godlock.AZ", origin: "https://godlock.uk/" }),
  Object.freeze({ slot: "hdj", hub: "AZ.HeDidntJump.AZ", origin: "https://www.hedidntjump.com/" }),
]);
export const BLOCKLIST_VERSION = "FED-MESH-BLOCKLIST-1";
/**
 * Name blocklist. Match is the whole label or a hyphen-part.
 * A token of 4 or more characters also matches inside the label.
 * Shorter tokens do not, so "sex" does not hit "essex" and "kkk" does not hit a longer word.
 * "child" alone is not listed. The list is not exhaustive.
 */
export const NAME_BLOCKLIST = Object.freeze([
  Object.freeze({ token: "childporn", reason: "CSAM" }),
  Object.freeze({ token: "jailbait", reason: "CSAM" }),
  Object.freeze({ token: "underage", reason: "CSAM" }),
  Object.freeze({ token: "porn", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "porno", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "xxx", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "hentai", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "onlyfans", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "nsfw", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "camgirl", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "nude", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "nudes", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "sex", reason: "NAME-BLOCK" }),
  Object.freeze({ token: "nazi", reason: "HATE" }),
  Object.freeze({ token: "nazism", reason: "HATE" }),
  Object.freeze({ token: "whitepower", reason: "HATE" }),
  Object.freeze({ token: "kkk", reason: "HATE" }),
]);
/** Reasons a relay will store. MODEL-ABSENT is a node publish refusal, not an isolation reason. */
export const ISOLATION_REASONS = Object.freeze(["NAME-BLOCK", "NUDITY", "CHILD", "CSAM", "HATE"]);
/** Self-signed content isolation. NAME-BLOCK is recorded from the claimant's own signed name. */
export const CONTENT_ISOLATION_REASONS = Object.freeze(["NUDITY", "CHILD", "HATE", "CSAM"]);
/** Leading zero bits of SHA-256 over the signed friendly-name claim. A flood filter, not a Sybil solution. */
export const NAME_POW_BITS = 8;
/** A friendly claim stays pending until this age and WITNESS_K co-signs. */
export const NAME_PENDING_MS = 72 * 60 * 60 * 1000;
/** Distinct witness handles, other than the claimant. */
export const WITNESS_K = 2;
/** Per signing handle on relay routes. One handle does not spend another's window. */
export const PEER_ROUTE_PER_MIN = 30;
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
    may: Object.freeze(["register", "heartbeat", "leave", "post", "pull", "deliver", "rollup", "peers", "bootstrap", "multisig-policy", "remote-task", "direct", "ref", "sync", "object", "name", "witness", "vouch", "advisory", "quarantine", "island", "restore", "isolation", "appeal"]),
  }),
  developer: Object.freeze({
    name: "Developer",
    is: "builder on this node",
    may: Object.freeze(["post", "pull", "deliver", "rollup", "remote-task", "direct", "ref", "sync", "object", "name", "witness", "vouch", "advisory", "quarantine", "island", "restore", "isolation", "appeal"]),
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
  name_records: "Signed .aziel name records. A self-certifying name is the handle body plus .aziel and is final immediately. A friendly name carries proof-of-work and stays pending until it has aged 72 hours and 2 other handles have witnessed it. The first valid final claim wins. A handle may hold 3 user .aziel names. Four reserved slots mirror the hub sites and are not user-nameable. Transfer and release are signed by the current owner. A fork is refused.",
  mesh_security: "Friendly claims need proof-of-work, a 72 hour age, and 2 witness handles before they are final. Equivocation proofs flag one handle. This relay does not execute peer code, does not rank handles, and does not cut a peer off the whole mesh.",
  slots: "Each handle has 4 reserved hub-mirror slots (ae, corpus, godlock, hdj) and 3 user .aziel names, plus the automatic <handle>.aziel name. Reserved slots restore only an object this relay already hash-verified. MirageGrid Cap-7 factory .az names are a separate layer.",
  user_slot_cap: USER_SLOT_CAP,
  reserved_slot_cap: RESERVED_SLOT_CAP,
  reserved_slots: RESERVED_SLOTS,
  ethics: "No pornography, no pictures of children, and no hate content in domain names. A matching name isolates that handle. Content classifiers run on the hosting node and are absent here. Isolation stores a reason code and an evidence hash, not the bytes. An appeal requests a re-check and does not clear isolation. The blocklist and classifiers miss names and false-positive. This is not a claim that every violation is caught.",
  blocklist_version: BLOCKLIST_VERSION,
  classifiers_run_here: false,
  factory_cap7: "MirageGrid global Cap-7 factory names (azgrid, azcloak, azvault, azshift real; azbooth, azflag, azstandby decoy) are unchanged. They are .az cites, not these per-handle .aziel slots.",
  name_pow_bits: NAME_POW_BITS,
  name_pending_ms: NAME_PENDING_MS,
  witness_k: WITNESS_K,
  peer_route_per_min: PEER_ROUTE_PER_MIN,
  zero_knowledge: false,
  state_adversary_protection: false,
  worker_executes_peer_code: false,
  scanner: "absent",
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

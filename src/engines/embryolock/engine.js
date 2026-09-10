/**
 * EmbryoLock in-process engine — cite / policy / hash verify.
 *
 * Ports the *declared* local-vault contract from
 * https://github.com/AzielEliab/EmbryoLock (`Open Source Code`, Stealth+ v1.1).
 * Does not reimplement Argon2id / AES-GCM unlock, encrypt, or wipe.
 * Does not store phrases, salts, verifiers, or vault blobs on this Worker.
 *
 * Public mesh: health / skill / doctor / verify-hash / policy / limitation
 * may run. Destructive vault wipe / scorch / unlock-after-fail stay
 * local-only — FragGate FG-STUB ("Never execute on the public mesh").
 *
 * Domain: Vault/Custody (with ARK) — isolation label, not a second door.
 * Author: Aziel Eliab only.
 */

export const PRODUCT = "embryolock";
export const NAME = "EmbryoLock";
export const VERSION = "1.1.0";
export const SPEC = "EL-WP-1.1";
export const AUTHOR = "Aziel Eliab";
export const SOURCE = "https://github.com/AzielEliab/EmbryoLock";
export const SOURCE_PATH = "Open Source Code";
export const WHITEPAPER = "EmbryoLock_Whitepaper.pdf";
export const DOMAIN = "Vault/Custody";
export const DOMAIN_ID = "01";
export const NEIGHBOR = "ark";
export const SURFACE = "live-with-local-destructive-boundary";

/** Constitutional OFF set. Cite only. Do not enable remain-off items. */
export const REMAIN_OFF = Object.freeze({
  id: "REMAIN-OFF-BY-DESIGN-2026-09-10",
  items: Object.freeze([3, 28]),
  ark_refuse: Object.freeze(["scorch", "wipe", "unlock", "encrypt"]),
  embryolock_local_only: Object.freeze(["wipe", "scorch", "unlock", "unlock_after_fail"]),
  do_not_enable: true,
});

/**
 * Published product SHA-256 from the EmbryoLock repo `SHA256HASH` file.
 * Cite / compare only. Not a vault key and not an unlock proof.
 */
export const PUBLISHED_SHA256 =
  "fa2e7203bd3924170e94c62357e29764b925a82c2cf708807128bd096333250d";

/**
 * Constants cited from `Open Source Code` (Stealth+ v1.1). Documentation
 * of the local product — this isolate never runs the KDF or AEAD.
 */
export const SOURCE_CITE = Object.freeze({
  app_id: "embryolock_stealth_plus",
  header: "EMBRYOLOCK STEALTH+ v1.1",
  max_attempts: 3,
  kdf: Object.freeze({
    name: "argon2id",
    time_cost: 3,
    memory_cost_kib: 64 * 1024,
    parallelism: 2,
    hash_len: 32,
    cite: "argon2.low_level.hash_secret_raw Type.ID",
  }),
  file_key: Object.freeze({
    name: "pbkdf2_hmac",
    hash: "sha256",
    iterations: 200_000,
    dklen: 32,
    note: "Per-file key from master_key + file_salt. Cited only.",
  }),
  aead: Object.freeze({
    name: "AESGCM",
    nonce_bytes: 12,
    file_salt_bytes: 16,
    layout: "file_salt(16) + nonce(12) + ciphertext",
    cite: "cryptography.hazmat.primitives.ciphers.aead.AESGCM",
  }),
  verifier: "SHA-256(derived_key) written to verifier.bin",
  wipe: "Three incorrect attempts → shutil.rmtree(APP_DIR). No recovery.",
  local_dir: "~/.embryolock_stealth_plus",
  no_network: true,
  no_remote_kill: true,
  no_backups: true,
});

export const LIMITATION =
  "THIS IS: an offline destructive-over-recovery local file vault (EmbryoLock Stealth+ v1.1). " +
  "This Worker cites policy, limitations, and the published product SHA-256. " +
  "Health / skill / doctor / verify-hash / policy / limitation may run on the public FragGate door. " +
  "THIS IS NOT: a hosted unlock, encrypt, decrypt, initialize, login, or wipe. " +
  "Forgotten password = permanent loss. Unlimited offline cloning reduces to password/KDF strength. " +
  "Does not defeat live OS compromise, keyloggers, or forensic-lab adversaries. " +
  "No recovery, no master key, no remote kill switch, no backups. " +
  "Wipe / scorch / unlock-after-fail MUST remain local-only — Never execute on the public mesh. " +
  "Cites REMAIN-OFF-BY-DESIGN-2026-09-10 items 3 and 28. ARK scorch/wipe/unlock/encrypt stay REFUSE. " +
  "Vault/Custody domain isolation label (with ARK). Not a second door. Author: Aziel Eliab only.";

export const POLICY = Object.freeze({
  threat_in: [
    "Post-unlock device theft",
    "Delayed or opportunistic access",
    "Casual / non-expert forensic inspection",
    "Scenarios where loss is preferable to later compromise",
  ],
  threat_out: [
    "Unlimited offline cloning",
    "Live malware, keyloggers, or memory inspection",
    "Attackers with long-term interactive access",
    "Nation-state or forensic-lab adversaries",
  ],
  principle: "The only copy that matters is the one that exists right now.",
  destruction_over_recovery: true,
  recovery: false,
  public_mesh_destructive: false,
  remain_off: "REMAIN-OFF-BY-DESIGN-2026-09-10",
  remain_off_items: Object.freeze([3, 28]),
  remain_off_do_not_enable: true,
  local_only_ops: [
    "wipe",
    "scorch",
    "unlock",
    "unlock_after_fail",
    "encrypt",
    "decrypt",
    "initialize",
    "login",
  ],
});

export const LIVE_ENGINE_OPS = Object.freeze([
  "health",
  "skill",
  "doctor",
  "verify_hash",
  "policy",
  "limitation",
]);

function envelope(extra = {}) {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    author: AUTHOR,
    identity: AUTHOR,
    source: SOURCE,
    source_path: SOURCE_PATH,
    whitepaper: WHITEPAPER,
    domain: DOMAIN,
    domain_id: DOMAIN_ID,
    neighbor: NEIGHBOR,
    surface: SURFACE,
    local_destructive_boundary: true,
    public_mesh_destructive: false,
    remain_off: REMAIN_OFF.id,
    remain_off_items: REMAIN_OFF.items.slice(),
    remain_off_do_not_enable: true,
    true_engine_runtime: true,
    kv_increment: false,
    limitation: LIMITATION,
    ...extra,
  };
}

export function embryolockHealth() {
  return envelope({
    door: "fraggate",
    live_ops: LIVE_ENGINE_OPS.slice(),
    note:
      "True in-process engine. Cite / health / verify-hash only on the public mesh. " +
      "Never execute wipe / scorch / unlock-after-fail on the public mesh. " +
      "Cites REMAIN-OFF-BY-DESIGN-2026-09-10 items 3 and 28.",
  });
}

export function embryolockSkill() {
  return {
    ...envelope({
      markdown: `# EmbryoLock (in-process)

Offline encrypted vault. **Destruction over recovery.** FragGate is THE single door.

**LIVE** on the public mesh: health, skill, doctor, verify-hash, policy, limitation cite.

**LOCAL-ONLY / FG-STUB:** wipe, scorch, unlock, unlock-after-fail, encrypt, decrypt, initialize, login.
Never execute those on the public mesh. Constitutional cite: REMAIN-OFF-BY-DESIGN-2026-09-10 items 3 and 28.

Source: ${SOURCE} (\`${SOURCE_PATH}\`, ${WHITEPAPER}).
Cited KDF/AEAD: Argon2id + AES-GCM as declared in Stealth+ v1.1 — this isolate does not run them.

Author: **${AUTHOR}**.
Limitation: ${LIMITATION}
`,
    }),
  };
}

export function embryolockDoctor() {
  return envelope({
    doctor: true,
    alias_of: "health",
    policy: POLICY,
    source_cite: SOURCE_CITE,
    published_sha256: PUBLISHED_SHA256,
    note:
      "Doctor is a cite of posture + local-destructive boundary. It does not unlock a vault.",
  });
}

export function embryolockPolicy() {
  return envelope({
    policy: POLICY,
    source_cite: SOURCE_CITE,
    published_sha256: PUBLISHED_SHA256,
    note: "Policy cite. Not an unlock. Not a wipe.",
  });
}

export function embryolockLimitation() {
  return envelope({
    policy: POLICY,
    note: "Limitation cite. Not an unlock. Not a wipe.",
  });
}

function normalizeHex(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^sha-?256:/, "")
    .replace(/\s+/g, "");
}

export function verifyHash(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const hex = normalizeHex(src.digest || src.sha256 || src.hash || src.hex || src.published);
  if (!hex) {
    return {
      ...envelope({
        ok: false,
        match: false,
        code: "EL-HASH-NEED",
        published_sha256: PUBLISHED_SHA256,
        error: "Pass digest / sha256 / hash (64 hex). Cites the published product SHA-256 only.",
      }),
      ok: false,
    };
  }
  if (!/^[a-f0-9]{64}$/.test(hex)) {
    return {
      ...envelope({
        ok: false,
        match: false,
        code: "EL-HASH-SHAPE",
        published_sha256: PUBLISHED_SHA256,
        error: "digest must be 64 lowercase hex characters.",
      }),
      ok: false,
    };
  }
  return envelope({
    match: hex === PUBLISHED_SHA256,
    presented: hex,
    published_sha256: PUBLISHED_SHA256,
    source_file: "SHA256HASH",
    note:
      "Compares against the published EmbryoLock product hash. Does not decrypt, unlock, or prove vault integrity.",
  });
}

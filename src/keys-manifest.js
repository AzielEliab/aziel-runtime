/**
 * AZRT-KEYS-1.0: one public, read-only list of every public key this runtime's records are checked
 * against, at GET /.well-known/azrt-keys.json (alias GET /v1/keys). Public keys and epochs only; no private
 * key, no secret name, nothing that can sign. Additive: /v1/receipt-key and /v1/anchor stay as they are.
 *   receipt   the held receipt key (AZRT-HELD-KEY-1.0): current published key or signing:false + reason,
 *             pinned keys, and retired epochs (RECEIPT_KEY_EPOCHS)
 *   witness   slot-1 witness key + retired epochs (AZRT-ANCHOR-1.0), auditor key + retired epochs
 *   witness2  slot-2 key when configured (AZRT-WITNESS-QUORUM-1.0), else not_configured
 * `heads.receipt_key` (AZRT-ANCHOR-1.0 additive field, /v1/anchor/heads) is served now; the witness log
 * will record it, and so each receipt key epoch, once the aziel-anchors patch lands
 * (docs/patches/aziel-anchors-witness-receipt-key.patch). Until then nothing outside records it.
 * Author: Aziel Eliab.
 */
export const KEYS_SPEC = "AZRT-KEYS-1.0";

/** The receipt key as the witness should record it (public parts only), or null when nothing is held. */
export async function receiptKeyHead(env) {
  const rs = await import("./receipt-signing.js");
  const held = await rs.heldSignerFromEnv(env);
  const retired = [];
  for (const e of rs.RECEIPT_KEY_EPOCHS) retired.push({ key_id: await rs.keyIdOf(e.public_key), until: e.until });
  return held.ok ? { spec: KEYS_SPEC, key_id: held.provenance.key_id, public_key: held.provenance.public_key, retired } : (retired.length ? { spec: KEYS_SPEC, key_id: null, public_key: null, retired } : null);
}

export async function keysManifest(env) {
  const rs = await import("./receipt-signing.js");
  const an = await import("./anchor.js");
  const wq = await import("./witness-quorum.js");
  const held = await rs.heldSignerFromEnv(env);
  const pinned = [];
  for (const k of rs.PINNED_RECEIPT_KEYS) pinned.push({ key_id: await rs.keyIdOf(k), public_key: k });
  const retired = [];
  for (const e of rs.RECEIPT_KEY_EPOCHS) retired.push({ key_id: await rs.keyIdOf(e.public_key), public_key: e.public_key, from: e.from || null, until: e.until });
  const current = held.ok
    ? { key_id: held.provenance.key_id, public_key: held.provenance.public_key, provisioned_by: held.provenance.provisioned_by, attestation_sha256: held.provenance.attestation_sha256, pinned: pinned.some((p) => p.key_id === held.provenance.key_id) }
    : null;
  const w2 = wq.witness2Config(env);
  return {
    spec: KEYS_SPEC,
    alg: "Ed25519",
    encoding: "raw public key, base64url",
    receipt: {
      spec: rs.HELD_KEY_SPEC,
      signing: Boolean(held.ok),
      ...(held.ok ? {} : { reason: held.reason, ...(held.code ? { code: held.code, refused_key_id: held.key_id } : {}) }),
      sig_domain: rs.SIG_DOMAIN,
      current,
      key_source: current ? (current.pinned ? "pinned" : "published (self, unpinned)") : null,
      pinned,
      retired,
      rule: "A retired key verifies only receipts whose ts is inside its epoch (RECEIPT-KEY-RETIRED otherwise); retired wins over pinned. The runtime refuses to sign with a retired key (RECEIPT-KEY-IS-RETIRED) and never generates or exports a receipt key.",
    },
    witness: {
      spec: "AZRT-ANCHOR-1.0",
      repo: an.WITNESS_REPO_URL,
      log: an.WITNESS_LOG_URL,
      current: an.WITNESS_PUBLIC_KEY,
      retired: an.WITNESS_RETIRED_KEYS,
      auditor: { log: an.AUDIT_LOG_URL, current: an.AUDITOR_PUBLIC_KEY, retired: an.AUDITOR_RETIRED_KEYS },
    },
    witness2: w2.configured ? { spec: "AZRT-WITNESS-QUORUM-1.0", configured: true, name: w2.name, log: w2.url, current: w2.public_key } : { configured: false, code: w2.code },
    note: "Public keys only. Compare this list with an outside record before trusting an unpinned key. The witness log will record heads.receipt_key once the aziel-anchors patch lands; until then there is no outside record of the receipt key.",
  };
}

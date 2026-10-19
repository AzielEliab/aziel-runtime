# aziel-witness2: second witness for aziel-runtime (AZRT-WITNESS-QUORUM-1.0, slot 2)

A second witness (different key, host and provider; same account holder) next to slot 1.

This repo is designed to sign aziel-runtime's `/v1/anchor/heads` every 15 minutes once set up, in the
same statement format as slot 1 (AzielEliab/aziel-anchors), and to append the result to
`anchors/log.jsonl`. It is meant to run on Codeberg, so it shares no host with GitHub or Cloudflare.
Before each append it re-verifies its own log (order, links, hashes, pinned key, signatures) and refuses
to append to a log that does not verify. The workflow's actions are pinned to commit SHAs.

- `keys/witness2.pub` is the pinned public key. The private key exists only as this repo's Actions secret
  `WITNESS2_ED25519_PKCS8` (base64 PKCS#8 DER).
- The log is append-only. Each statement links to the previous one by `prev_statement_hash`.
- The runtime reads `https://codeberg.org/<owner>/aziel-witness2/raw/branch/main/anchors/log.jsonl`
  through `WITNESS2_LOG_URL` + `WITNESS2_PUBLIC_KEY`. It has no write path here.
- No RFC 3161 token and no Rekor entry (`tsa: null`, `rekor: null`). Slot 1 still has both.

Author: Aziel Eliab.

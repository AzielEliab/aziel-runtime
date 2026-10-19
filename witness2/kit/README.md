# aziel-witness2: second independent witness for aziel-runtime (AZRT-WITNESS-QUORUM-1.0, slot 2)

This repo signs aziel-runtime's `/v1/anchor/heads` every 15 minutes, in the same statement format as
slot 1 (AzielEliab/aziel-anchors), and appends the result to `anchors/log.jsonl`. It runs on Codeberg,
so it shares no host with GitHub or Cloudflare.

- `keys/witness2.pub` is the pinned public key. The private key exists only as this repo's Actions secret
  `WITNESS2_ED25519_PKCS8` (base64 PKCS#8 DER).
- The log is append-only. Each statement links to the previous one by `prev_statement_hash`.
- The runtime reads `https://codeberg.org/<owner>/aziel-witness2/raw/branch/main/anchors/log.jsonl`
  through `WITNESS2_LOG_URL` + `WITNESS2_PUBLIC_KEY`. It has no write path here.
- No RFC 3161 token and no Rekor entry (`tsa: null`, `rekor: null`). Slot 1 still has both.

Author: Aziel Eliab.

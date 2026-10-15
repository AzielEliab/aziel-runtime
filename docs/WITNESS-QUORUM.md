# AZRT-WITNESS-QUORUM-1.0 — second independent witness + quorum (RIB-047)

Idea: @RohanBhanotAI (https://x.com/RohanBhanotAI/status/2110363663999672582). Author: Aziel Eliab.

Goal: the anchor should survive the first outside log going down at the same time as the runtime. Each ChainLock head can be mirrored to a second, independent witness provider, and verify can accept or require a quorum.

## Slots
- **Slot 1** is the existing witness, AzielEliab/aziel-anchors, with its pinned key. It is **always required**: if slot 1 fails, verify fails no matter what slot 2 says.
- **Slot 2** is configured only by its own variables: `WITNESS2_LOG_URL` (https, a signed JSONL log in the same format as slot 1), `WITNESS2_PUBLIC_KEY` (32-byte base64url Ed25519 key), and optionally `WITNESS2_NAME`. Partial or malformed config is `WITNESS2-BAD-CONFIG`: the key must be canonical (decodes to 32 bytes and re-encodes to exactly the same text, so spare-bit variants are refused), and the host must be a public DNS name (no IP literal, localhost, `.local`/`.internal`, or credentials). A key whose bytes equal slot 1's current or retired key, or a log in slot 1's repo, is `WITNESS2-NOT-INDEPENDENT`. The repo check lowercases and percent-decodes the path and treats raw.githubusercontent.com, github.com/…/raw|blob and jsDelivr `/gh/` as the same owner/repo.
- The slot-2 fetch uses `redirect: "manual"` (Workers reject `redirect: "error"`) and refuses any 3xx / opaqueredirect / status-0 response; it streams the body and stops at 2 MB (`WITNESS2-TOO-LARGE`). With no config the slot reports `WITNESS2-NOT-CONFIGURED`. There is **no mock** or fallback witness.
- Slot 2 is read exactly like slot 1: statement hash, contiguous `n`, prev link, and an Ed25519 signature by the pinned slot-2 key. Then its newest statement's heads are checked against the runtime rows, and every `(chain, seq)` both witnesses state must carry the same head hash. Slot 2 **counts toward quorum only** when its newest statement states every chain head in slot 1's newest statement with the same seq and h; otherwise it is `partial` (`WITNESS2-PARTIAL`), not counted, and the level stays `single`.

## Codes
`WITNESS2-NOT-CONFIGURED`, `WITNESS2-BAD-CONFIG`, `WITNESS2-NOT-INDEPENDENT`, `WITNESS2-MISSING` (log 404 or empty), `WITNESS2-UNREACHABLE`, `WITNESS2-LOG-INVALID` (signature, key, hash or order break), `WITNESS2-MISMATCH` (a head differs from the runtime or from slot 1), `WITNESS2-PARTIAL` (verified but does not cover slot 1's newest heads), `WITNESS2-TOO-LARGE`, `WITNESS2-OK`, `WITNESS-QUORUM-NOT-MET`, `WITNESS-QUORUM-BAD-POLICY`.

## Quorum
`GET /v1/anchor/verify` returns `witness_quorum { witnesses: [slot1, slot2], quorum: { required, have, level } }` with `level` = `none` | `single` | `dual`.
- Default `required = 1`: the current behavior, so slot 1 alone passes.
- Require-quorum mode: env `WITNESS_QUORUM="2"` or `?require_quorum=1` (or `=2`) sets `required = 2`. Anything less than two verified slots is `409 WITNESS-QUORUM-NOT-MET`. An unknown policy value is `WITNESS-QUORUM-BAD-POLICY` (fail closed).
- A configured slot 2 that **disagrees** fails verify even at quorum 1. A slot 2 that is merely down does not, unless quorum 2 is required.

## Honest limits
- **No second witness provider is configured yet.** `wrangler.toml` sets no `WITNESS2_*`, so live verify reports slot 2 `not_configured` and level `single`. Nothing here is live until a real independent provider (a separate signer and host) publishes a log and its key is set.
- The runtime has no write path to either log and does not push heads to slot 2; the provider's own job must read `/v1/anchor/heads` and sign them.
- "Independent" is checked only as a different key and a different log location. The runtime cannot prove that two providers do not share an operator or infrastructure.
- Quorum applies to `/v1/anchor/verify`. Row integrity levels (`/v1/anchor/row`) and RIB-044 resume still use slot 1 only.
- Receipts are hash-linked and sealed, not signed.

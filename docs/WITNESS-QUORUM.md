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

## Addendum (2026-10-19): slot 2 on Codeberg (kit built, not live)

Laws: this spec, AZRT-ANCHOR-1.0 (same statement format and signature), REMAIN-OFF (nothing is enabled),
docs/2.0/COMPATIBILITY-POLICY.md (additive: one stricter config refusal; 36 / 42 / 2.0.0-rc1 unchanged).

**Host search (box, 2026-10-19).** The box has no glab, tea, berg or Forgejo CLI, no netrc, and no
Codeberg, GitLab or Forgejo token. Git credentials exist only for github.com (via gh). The only non-GitHub,
non-Cloudflare credential is an archive.org access key, and it has no secret half, so it cannot write.
The account holder already has a public Codeberg account (`codeberg.org/AzielEliab`, which holds the
`aziel-lockset-tip` shelf), so the kit targets Codeberg.

**What is built.**
- `witness2/kit/` is a ready-to-push repo:
  - a Forgejo Actions workflow (`codeberg-tiny` runner, every 15 min plus manual runs) that runs
    `scripts/witness2.mjs`. The script reads `/v1/anchor/heads`, signs a chained AZRT-ANCHOR-1.0
    statement with the repo secret `WITNESS2_ED25519_PKCS8`, checks it against the pinned
    `keys/witness2.pub`, and appends `anchors/log.jsonl`;
  - an append-only commit step;
  - no RFC 3161 token and no Rekor entry.
- `witness2/setup-witness2.mjs` is a dry run by default. With `--apply` and `CODEBERG_TOKEN` it creates
  `codeberg.org/AzielEliab/aziel-witness2`, turns on Actions, generates the key in memory, stores the private
  half only as the Actions secret, pushes the kit with the public key, and prints the three public vars.
  The token goes only into headers and git's environment and is never printed.
- `witness2Config` now also refuses a Cloudflare-hosted slot-2 log (`*.workers.dev`, `*.pages.dev`, `*.r2.dev`,
  `*.r2.cloudflarestorage.com`) as `WITNESS2-NOT-INDEPENDENT`.
- `scripts/verify-witness2-kit.mjs` runs the kit's statements through the runtime's slot-2 reader. It checks
  `verified`, quorum level `dual`, and that require-quorum 2 passes.

**Still needed (account holder):**
1. A Codeberg access token (scopes `write:repository`, `write:user`), or the account holder runs
   `CODEBERG_TOKEN=... node witness2/setup-witness2.mjs --apply` on their own machine.
2. One manual run of the workflow. Codeberg's hosted runners must be available to the account.
3. A follow-up PR that sets `WITNESS2_LOG_URL`, `WITNESS2_PUBLIC_KEY` and `WITNESS2_NAME="codeberg"` in
   `wrangler.toml [vars]`, plus a deploy.

Until then, live verify keeps reporting slot 2 `WITNESS2-NOT-CONFIGURED` and level `single`. The vars are
deliberately not set before a signed log exists.

**Honest limits.**
- If the key is made with the setup script on the shared box, it is in memory only for the run. (Slot 1's
  key was generated inside Actions.)
- "Independent" still means a different key, host and provider. One account holder runs both witnesses.

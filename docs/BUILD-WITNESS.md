# AZRT-BUILD-WITNESS-1.0 (RIB-041, idea from @TheNabeelKhan)

The runtime's description of its own build should not rest on its own word.

**Publish.** `GET /v1/anchor/heads` now carries `build { spec, git_sha, version_id }`, read at serve
time from the same source as `/v1/health` (GIT_SHA deploy var / CF version metadata; null when unbound,
never guessed). The outside witness, AzielEliab/aziel-anchors (a GitHub Actions job whose Ed25519 key
is only that repo's Actions secret), signs it into its statement next to the chain heads. The companion
aziel-anchors PR adds `statement.build` and also anchors when only the build changed. Before that
PR, statements already carried top-level `git_sha` (no version_id).

**Verify.** `GET /v1/anchor` (`/status`, `/verify`) adds `build_witness`. Only the NEWEST verified
statement is compared; an older statement never stands in for it.

| status | ok | HTTP | when |
|---|---|---|---|
| `verified` | true | 200 if the rest passes | both fields witnessed and equal to live |
| `partial` | true | 200 if the rest passes | the witness statement predates a field (legacy rows: git_sha only); the rest matched |
| `failed` | false | 409 | `BUILD-WITNESS-MISMATCH`: a witnessed field differs from live, a witnessed field is unknown live, or the newest statement has no build though earlier ones did |
| `pending` | null | 503 + Retry-After | `BUILD-WITNESS-PENDING`: strict window below. Never 200 / ANCHOR-OK |
| `not_checked` | null | (log state) | no verified witness log, or no statement has ever carried a build. Never a pass |

`partial` is only for a field the WITNESS lacks. If the witness has a field and the live build does
not, that is a mismatch. Once any statement carries a build, an unknown live build is never 200.

**Pending window.** `pending` applies only when ALL hold; anything else is a hard 409, including
rollbacks and old uploads:
1. version_id comes from `CF_VERSION_METADATA` (`version_id_source: cf_version_metadata`), not the VERSION_ID var;
2. the metadata timestamp is newer than the newest statement's signed `observed_at`;
3. now − timestamp ≤ the pending window (default **4 h**; operator var `BUILD_WITNESS_PENDING_MAX_MIN`, whole minutes, clamped to 22 min–12 h, junk falls back to 4 h), and the timestamp is not in the future (5 s skew).

Pending reports `pending_since`, `pending_until`, `pending_max_minutes`, `pending_max_source` and `last_witnessed`.
Pending is `ok:null`, HTTP 503 with `Retry-After` (30–600 s), never 200 or `ANCHOR-OK`.

**Why 4 h, not 22 min.** The witness cron says `*/15`, but GitHub runs scheduled workflows best-effort.
The real log (statements 1–34) shows gaps of about 2–7 hours (19:00, 22:03, 00:25 UTC on 2026-10-16).
With a 22-minute window, every honest deploy was a hard 409 `BUILD-WITNESS-MISMATCH` ("pending window
expired") for hours (AZBot live probe of 22ba95e / f50445ee). 4 h covers the usual 2–3 h cadence; a gap
longer than the window is still a 409. A longer window also means a deploy that is never witnessed can
report pending (503, not a pass) for up to 4 h before it turns into a 409.

**Witness on deploy.** The fix for freshness is to run the witness right after deploy, not to wait for
the cron. `aziel-anchors/.github/workflows/witness.yml` already has `workflow_dispatch`, so after a deploy:

```
GH_TOKEN=<token with actions:write on AzielEliab/aziel-anchors> node scripts/trigger-witness.mjs --wait
```

It dispatches the witness (force=0; a changed build is anchored anyway) and polls `/v1/anchor/verify`
until `build_witness` is `verified`; pending, failed, unreadable or a timeout exit non-zero. The runtime
still cannot write the witness log. Wiring this into `.github/workflows/deploy.yml` (and a
`repository_dispatch` trigger in aziel-anchors) needs a token with the `workflow` scope and a
cross-repo dispatch secret; neither is in this PR.

**Why statements 24–34 carry `version_id: null`.** The witness copies `build` from `/v1/anchor/heads`.
The runtime that was live until 2026-10-17 01:08 UTC (cbb3509) predates #286 and published no `build`
object, so aziel-anchors fell back to the top-level `git_sha` and left `version_id` null (never
guessed). 22ba95e publishes `build.version_id` (f50445ee-…), so the next statement carries it. Nothing
in aziel-anchors was writing it wrong.
- A further redeploy inside the window restarts it, so repeated redeploys can extend pending.
- A build deployed and reverted between two witness runs is never witnessed.

**Threat model, plainly.** git_sha comes from the GIT_SHA deploy var or baked build-meta, and version_id
can come from the VERSION_ID var; whoever deploys can set both. The witness records what the runtime's
heads endpoint reports. This catches honest deploys that were not witnessed, not a hostile deployer.

**Other limits.**
- Receipt-level comparison (each receipt's RIB-039 server_basis vs the witnessed build at that time) is
  not in this PR.
- The witness log is signed (Ed25519); anchors, checkpoints and tether are signed. Receipts stay
  hash-linked and sealed, not signed. This is a PR, not a live claim.

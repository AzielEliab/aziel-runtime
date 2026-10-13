# AZRT-BUILD-WITNESS-1.0 (RIB-041, idea from @TheNabeelKhan)

The runtime's description of its own build should not rest on its own word.

**Publish.** `GET /v1/anchor/heads` now carries `build { spec, git_sha, version_id }`, read at serve
time from the same source as `/v1/health` (GIT_SHA deploy var / CF version metadata; null when unbound,
never guessed). The outside witness, AzielEliab/aziel-anchors (a GitHub Actions job whose Ed25519 key
is only that repo's Actions secret), signs it into its statement next to the chain heads. The companion
aziel-anchors PR adds `statement.build` and also anchors when only the build changed. Before that
PR, statements already carried top-level `git_sha` (no version_id).

**Verify.** `GET /v1/anchor` (`/status`, `/verify`) adds `build_witness`:

| status | ok | when |
|---|---|---|
| `verified` | true | newest witnessed build equals live on both git_sha and version_id |
| `partial` | true | only one field comparable (older statements: git_sha only); it matched |
| `failed` | false | any compared field differs: `BUILD-WITNESS-MISMATCH`, the whole verify becomes 409 (fail closed) |
| `not_checked` | null | no verified witness log, no statement carries a build, or the live build is unknown. Never a pass. |

The newest statement that carries a build is the one compared; an older matching statement does not
rescue a newer mismatch.

**Honest limits.**
- After a deploy, verify fails with BUILD-WITNESS-MISMATCH until the witness runs (cron every 15 min).
  That is intended: an unwitnessed build is not reported as matching.
- The witness records what the runtime's heads endpoint reports. It proves the runtime said the same
  build to an outside, signed, timestamped log; it does not independently inspect Cloudflare's deploy.
- Receipt-level comparison (each receipt's RIB-039 server_basis vs the witnessed build at that time) is
  not in this PR.
- The witness log is signed (Ed25519); anchors, checkpoints and tether are signed. Receipts stay
  hash-linked and sealed, not signed. This is a PR, not a live claim.

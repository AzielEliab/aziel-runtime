# AZRT-SERVER-PROVENANCE-1.0 (RIB-039, idea from @Quantitit)

Every call receipt records which server answered, so a swapped binary answering under a
duplicate tool name becomes visible.

| field | meaning |
|---|---|
| `server_path` | `worker://aziel-runtime/fraggate/<slug>` on the hosted Worker; `stdio://<resolved module file>#<slug>` for `aziel-runtime-mcp --local`; the upstream URL on proxy fallback |
| `server_hash` | sha256 of `server_basis` (canonical JSON) |
| `server_basis` | hosted: `version_id` (CF_VERSION_METADATA) + deploy-time `GIT_SHA` + the tool's `engine_digest` (or FragGate `registry_digest`); stdio: sha256 of the resolved module file + tool digest |
| `server_reason` | why a value is null. Values are never guessed; the baked build-meta sha is not a deploy stamp and is not used |

Written on: FragGate ledger call rows (accepted calls, DecisionGATE, library_lookup) and
session `exec` receipts. Refusals and session open/policy/close carry none. All fields are
additive, so receipts written before this spec hash and verify exactly as before.

Verify: `chainlock_verify` (over the FragGate call ledger), `verifyLedger`, and the session
chain check behind `runtime_session_receipt(s)` walk receipts per tool name and report:

- `SERVER-DRIFT` when `server_path` or `server_hash` differs from the previous receipt for that tool;
- `SERVER-PROVENANCE-MISSING` (fail closed) when a value is null or absent after a prior receipt had one.

- `SERVER-REDEPLOY` (informational, listed under `redeploys`) when a hosted `server_hash` changed
  together with `server_basis.version_id` or `git_sha` and the path is unchanged.

`SERVER-DRIFT` and `SERVER-PROVENANCE-MISSING` make the verify `ok:false`; `SERVER-REDEPLOY` alone
does not. A hash change on the same version_id and git_sha, any path change, and any stdio hash
change stay `SERVER-DRIFT`. The hash chain itself (`chain_ok`, `breaks`) is reported apart.

Limits: on the Worker the "binary" is the deployed Worker bundle, identified by its version, not a
hash of the bundle bytes. In stdio `--local` mode the hashed file is the resolved entry module
(cli/mcp-stdio.mjs); imported modules are covered through the tool's engine digest, not by the file hash.
Upstream (proxy) servers cannot be hashed from here: `server_hash` is null with a reason.
Receipts are hash-linked and sealed, not signed.

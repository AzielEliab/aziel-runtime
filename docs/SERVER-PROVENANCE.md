# AZRT-SERVER-PROVENANCE-1.0 (RIB-039, idea from @Quantitit)

Every call receipt records which server answered, so a swapped binary answering under a
duplicate tool name becomes visible.

| field | meaning |
|---|---|
| `server_path` | `worker://aziel-runtime/fraggate/<slug>` on the hosted Worker; `stdio://<resolved module file>#<slug>` for `aziel-runtime-mcp --local`; the upstream URL on proxy fallback |
| `server_hash` | sha256 of `server_basis` (canonical JSON): recomputing it from the served `server_basis` gives `server_hash` exactly |
| `server_tool` | the tool name used as the drift key; kept outside `server_basis` so the hash recomputes. Receipts written before this field keep `tool` inside `server_basis` and are still read |
| `server_basis` | hosted: `version_id` (CF_VERSION_METADATA) + deploy-time `GIT_SHA` + the tool's `engine_digest` (or FragGate `registry_digest`); stdio: sha256 of the resolved module file + tool digest |
| `server_basis.kind` | `worker`, `stdio`, `upstream` (proxy answered) or `unreached` (failed call, nothing answered) |
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

- `SERVER-UNREACHED` (info): a failed/unreached call. It names no server, is not compared, and does not reset the baseline, so a timeout never fails the chain.
- `SERVER-PROXY` (info): a proxy upstream answered instead of the local engine. The local baseline is kept. Proxy answers have their own per-tool upstream baseline: any upstream path change (or hash change when both exist) is `SERVER-DRIFT`, even with no local reading.

`SERVER-DRIFT` and `SERVER-PROVENANCE-MISSING` make the verify `ok:false`; `SERVER-REDEPLOY` alone
does not. A hash change on the same version_id and git_sha, any path change, and any stdio hash
change stay `SERVER-DRIFT`. The hash chain itself (`chain_ok`, `breaks`) is reported apart.

Limits: on the Worker the "binary" is the deployed Worker bundle, identified by its version, not a
hash of the bundle bytes. In stdio `--local` mode the hashed file is the resolved entry module
(cli/mcp-stdio.mjs); imported modules are covered through the tool's engine digest, not by the file hash.
Upstream (proxy) servers cannot be hashed from here: `server_hash` is null with a reason.
Read-only exposure: the FragGate call envelope and `ledgerTipView` return the same `server_path` / `server_hash` / `server_reason` / `server_basis` as the stamped row (no extra writes).
With nothing stamped to compare (for example an empty per-isolate ledger), `server_drift` reports `status:"not_checked"`, `ok:null`, `checked:0` and the receipt count. That is not a pass. A proxied hash that goes from real to null fails closed with `SERVER-PROVENANCE-MISSING`, as local readings do. The FragGate registry is deep-frozen at build, and its digest is cached by object identity.
Privacy: in stdio `--local` mode `server_path` is package-relative (`stdio://cli/mcp-stdio.mjs#<slug>`), or the bare file name when the file sits outside the package. An absolute path is never recorded, because it would leak the home or account folder name. The hash is still taken over the real file. Older receipts that recorded an absolute path are compared by file name, so moving to the relative form does not show as drift; a different file name still does.
Summaries: `chainlock_verify` and the ledger verify lead with `server_drift_status` (`verified`, `drift` or `not_checked`) and `server_drift_note`, so `ok:true` with `not_checked` is never read as "provenance verified".
Re-checking old receipts: receipts written before `server_tool` existed carry `tool` inside `server_basis`, but their `server_hash` was computed without it. Drop `server_basis.tool` before recomputing `sha256(canonical(server_basis))`. Newer receipts need no adjustment.
Path privacy: `privatePath` keeps only package-relative paths under `cli/`, `src/`, `bin/`, `scripts/`, `qnm-node/` or `tools/`. Anything containing `:` or `..`, any absolute or `~` path, and any other multi-segment path (for example `home/aziel/...`) is cut to the bare file name.
A stdio CLI upgrade (a new `aziel-runtime-mcp` version) changes the module file hash, so it is expected to show as `SERVER-DRIFT`; check `server_basis.module_sha256` against the release you installed.
`server_hash` is the sha256 of `server_basis` (deploy identity + tool digest), not a hash of the code bytes.
Receipts are hash-linked and sealed, not signed.

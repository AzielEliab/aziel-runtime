# External adversarial pack — Aziel Runtime 2.0.0-rc1

**Author / identity:** **Aziel Eliab** only  
**Wrapper:** `scripts/external-adversarial-2.0.sh`  
**This pack is for an independent reviewer to run unchanged.**

## Explicit disclaimer

**Self-test ≠ third-party lab.**

`scripts/verify-adversarial.mjs` and `scripts/verify-remain-off.mjs` are **repository self-checks** the author already runs via `npm test`. This pack does **not** create a fake lab, a court letter, or an accredited assessment. It packages those same scripts so a reviewer who is **not** the author can execute them on a fork, collect PASS/FAIL evidence, and compare `git_sha` + `runtime_version`.

Do not cite this pack as “independently audited.” Gate 5 (outside use) is operational proof **outside this PR**.

---

## What the reviewer runs (unchanged)

From a clean checkout (Node 22+):

```bash
git clone https://github.com/AzielEliab/aziel-runtime.git
cd aziel-runtime
git checkout <this-commit>
bash scripts/external-adversarial-2.0.sh
```

The wrapper:

1. Runs `node scripts/verify-adversarial.mjs` (bypass, replay, concurrency, capability attenuation, SSRF, malformed input, cross-domain isolation, receipt/provenance tamper)
2. Runs `node scripts/verify-remain-off.mjs` (33-item Remain-OFF matrix; `do_not_enable`; GET `/v1/mesh` never enables)
3. Writes `adversarial-result.json` (override `--out`) with `verdict: PASS|FAIL`

No Wrangler deploy. No Cloudflare account. No undocumented secrets. Remain-OFF is **not** enabled by this pack.

### Flags

| Flag | Meaning |
|------|---------|
| `--out FILE` | Evidence path (default `adversarial-result.json`) |

---

## Coverage (existing harness — do not invent extra attacks here)

From `scripts/verify-adversarial.mjs`:

- `/p/{slug}/{op}` is not FragGate exec
- Unknown slug / invented op refuse (`FG-HALLUC-TOOL` / `FG-UNKNOWN-OP` / `FG-STUB`)
- `GET /v1/mesh` never sets `enabled: true`
- `azmail` `smtp_send` and `azbrowser` `chromium` → `FG-STUB`
- Malformed JSON, missing slug, huge payload
- `sandbox_render` refuses `127.0.0.1`, link-local metadata, `.onion`, `javascript:`
- Session policy denies out-of-allowlist slug/op
- Prior receipt is not an exec skip ticket
- Concurrent isolate-safe corpus score
- Cross-domain: VeilLock inject, AZMail exec, AZChat bridge, ARK wipe stay refuse
- ForgeReceipts hash tamper + session `verifyChainStrict`

From `scripts/verify-remain-off.mjs`:

- Paper still 33 numbered items; no 34th row
- ARK destructive ops `FG-STUB`; EmbryoLock health/skill/doctor/policy LIVE; wipe/scorch `FG-STUB`
- `/v1/rollback` 404
- AZPIPE / MASTER-33 not Softwares-tab slugs
- Mesh GET `enabled === false`

A reviewer who wants a **different** attack set writes their own notes. Changing the wrapper to enable Remain-OFF is a fail.

---

## Evidence object (template)

```json
{
  "kind": "aziel-runtime.external-adversarial-2.0",
  "runtime_version": "2.0.0-rc1",
  "git_sha": "<reviewer checkout>",
  "author": "Aziel Eliab",
  "identity": "Aziel Eliab",
  "reviewer_note": "Independent reviewer ran scripts/external-adversarial-2.0.sh unchanged.",
  "generated_at": "<ISO-8601>",
  "verdict": "PASS",
  "checks": [
    { "id": "verify-adversarial", "status": "PASS", "exit_code": 0 },
    { "id": "verify-remain-off", "status": "PASS", "exit_code": 0 }
  ],
  "third_party_lab": false,
  "court_audit": false,
  "self_test_is_not_a_lab": true,
  "remain_off_untouched": true,
  "mesh_get_never_enables": true
}
```

`verdict` is `FAIL` if either script exits non-zero.

---

## Relation to other packs

| Path | Role |
|------|------|
| `npm test` | Full author/CI suite (includes both scripts) |
| `scripts/independent-validate.sh` | Full suite + `attestation.json` (1.9.3 path) |
| `scripts/clean-room-2.0.sh` | Clone/install/test + MCP + receipt (gate 2) |
| **this pack** | Adversarial + Remain-OFF only (gate 3), reviewer-runnable unchanged |

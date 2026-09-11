# Validation harness (honest)

**AZRT-1.9-CLOSE-1.0** · remaining-gaps close **1.9.3** · 2026-09-10 / 2026-09-11 · Author: **Aziel Eliab** only.

This repository's validation harness is `npm test` — the `scripts/verify-*.mjs` suite plus `scripts/hash-engines.mjs`, including `scripts/verify-adversarial.mjs` (bypass, replay, concurrency, capability attenuation, SSRF, malformed input, cross-domain isolation, receipt/provenance tamper) and the 1.9.3 session / jeeves / media-run / independent-validation verifies. GitHub Actions `.github/workflows/test.yml` runs the same suite on pull requests and `main`.

**1.9.3 CLOSED as an externally reproducible self-check with a published attestation path.** An outsider forks the repo and runs `bash scripts/independent-validate.sh` (or `npm test` + `node scripts/write-attestation.mjs`) without the author. Release/tag workflow `.github/workflows/validate.yml` uploads a signed attestation artifact (JUnit/JSON summary + `git_sha` + runtime version) as a public Actions artifact and release asset. See [INDEPENDENT-VALIDATION](INDEPENDENT-VALIDATION.md).

**This harness is still not a third-party lab, court, or external auditor.** A green local/`npm test` receipt plus a published attestation is a reproducible self-check, not an independent lab letterhead and not an adoption claim.

FEATURE-STATE gaps 21–22 (AZMail deanonymize STUB; mesh OFF default) are **ASSESS** only: this paper + `examples/consumer/` are the example. Do not treat them as enabled. Do not fake independent validation or adoption.

Remain-OFF stays off. `GET /v1/mesh` never enables. No public MTA.

Cite: Eliab, Aziel. (2026). VALIDATION-HARNESS-2026-09-10 [Audit]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/VALIDATION-HARNESS-2026-09-10.md

# Validation harness (honest)

**AZRT-1.9-CLOSE-1.0** · 2026-09-10 · Author: **Aziel Eliab** only.

This repository's validation harness is `npm test` — the `scripts/verify-*.mjs` suite plus `scripts/hash-engines.mjs`, including `scripts/verify-adversarial.mjs` (bypass, replay, concurrency, capability attenuation, SSRF, malformed input, cross-domain isolation, receipt/provenance tamper). GitHub Actions `.github/workflows/test.yml` runs the same suite on pull requests and `main`.

**This harness has not been independently run** by a third-party lab, court, or external auditor. A green local/`npm test` receipt is a repo self-check, not an independent validation and not an adoption claim.

FEATURE-STATE gaps 21–22 (AZMail deanonymize STUB; mesh OFF default) are **ASSESS** only: this paper + `examples/consumer/` are the example. Do not treat them as enabled. Do not fake independent validation or adoption.

Remain-OFF stays off. `GET /v1/mesh` never enables. No public MTA.

Cite: Eliab, Aziel. (2026). VALIDATION-HARNESS-2026-09-10 [Audit]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/VALIDATION-HARNESS-2026-09-10.md

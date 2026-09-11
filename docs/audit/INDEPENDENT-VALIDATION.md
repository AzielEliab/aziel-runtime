# Independent validation (outsider path)

**Runtime:** aziel-runtime **1.9.3**  
**Author / identity:** **Aziel Eliab** only  
**Repo:** https://github.com/AzielEliab/aziel-runtime

This is **not** a court audit, **not** a third-party lab certification, and **not** an adoption claim. It is the published path so an outsider can fork this repository and reproduce the same self-check the author runs — without the author present.

Remain-OFF stays off. `GET /v1/mesh` never enables. FragGate is THE single door. No `wrangler deploy` is required to validate.

---

## What an outsider runs

From a clean checkout of this repository (any fork, any machine with Node 22+):

```bash
git clone https://github.com/AzielEliab/aziel-runtime.git
cd aziel-runtime
bash scripts/independent-validate.sh
```

That script is the one-command entrypoint. It runs the full `npm test` suite (engine digests, SEO/cite guards, FragGate door, remain-OFF, adversarial self-check, and the 1.9.3 session / jeeves / media-run / attestation verifies) and writes a local attestation JSON + JUnit summary.

Equivalently:

```bash
npm test
node scripts/write-attestation.mjs
```

No Cloudflare account, no author token, and no live Worker deploy are required. Isolate-native engines run in-process. Binding-gated ops (Whisper / OCR / media-run) honest-refuse when `env.AI` is absent — they do not invent transcripts.

---

## Published attestation path

GitHub Actions workflow [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml) runs the same suite on **release** and **tag** (and `workflow_dispatch`):

1. `npm test`
2. `node scripts/write-attestation.mjs` — JSON summary with `runtime_version`, `git_sha`, test outcome, and a SHA-256 of the summary
3. Upload `attestation.json` + `attestation.junit.xml` as a public Actions artifact
4. On a GitHub Release, attach those files as release assets
5. Optional Actions build provenance (`actions/attest-build-provenance`) signs the attestation subject when the job has `id-token` / `attestations` permissions

Anyone can download the artifact or release asset and compare `git_sha` + `runtime_version` to the tagged commit. A green receipt is a **reproducible self-check**, not a lab letterhead.

---

## What this does not claim

- Not a court, regulator, or accredited lab audit
- Not an independent security assessment of remain-OFF items
- Not proof that production bindings (`BROWSER`, `CORPUS_D1`, `AI`) were live in the outsider's environment
- Not a license to enable mesh radios, public SMTP, remote shell, AZAI blend, Tor/phoenix, or unknown-tool fallback

Cite: Eliab, Aziel. (2026). INDEPENDENT-VALIDATION [Audit]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/INDEPENDENT-VALIDATION.md

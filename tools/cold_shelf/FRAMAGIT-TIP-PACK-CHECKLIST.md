# Framagit Plane B tip-pack — operator upload + hash-verify

Author: Aziel Eliab only
Spec: COLD-MULTI-SHELF-1.0
Umbrella: CROSS-NETWORK-SURVIVAL-1.0 · NO-LIE-NO-REWRITE-1.0
Lockset: AZLOCK-INGEST-REEXPAND-1.0

This is a checklist, not a deposit and not a LIVE flip. Corpus
[GET /shelves](https://www.azielcorpuslibrary.net/shelves) is the shelves
source of truth. This runtime **cites**; it does not invent a project URL.

## Status (this verify pass)

| Field | Value |
| --- | --- |
| Framagit `url` | **null** (public project search + guessed `AzielEliab/aziel-lockset-tip` paths returned no project) |
| Hash | **unverifiable** — no remote bytes to download |
| Framagit row refuse | `CNS-NO-FORGE-MIRROR` |
| Plane B refuse | `CNS-PLANE-B-ALL-TARGETS` (Codeberg + archive.org PASS; Framagit missing) |
| Plane B | **SLOT** — not LIVE |
| GitFlic | **refused** `CNS-GITFLIC-EMAIL` (email confirm blocked; stay refused) |

Do not invent a Framagit URL. Do not mark LIVE without bytes↔hash PASS.

## Published expect (already PASS elsewhere)

- Pack SHA-256 (inner `aziel-tip-pack.tar`):
  `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`
- Lockset tip (`lockset.json` `sha256` field):
  `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`
- Required files: `aziel-tip-pack.tar` · `SHA256SUMS` · `lockset.json` · `verify-airgap.sh`

Already-PASS independent copies (same pack; still SLOT):

- Codeberg: https://codeberg.org/AzielEliab/aziel-lockset-tip (`main`)
- archive.org: https://archive.org/details/aziel-lockset-tip
- archive.org (same blast_radius, not a new shelf): https://archive.org/details/aziel-lockset-tip_202609

Local historical pack (operator machine, not this repo): `_tippacks/lockset-tip/`.

## Exact operator steps

1. **Confirm source bytes still hash.** From the local `_tippacks/lockset-tip/`
   directory, or after downloading the Codeberg raw files:

   ```bash
   curl -fsSL \
     https://codeberg.org/AzielEliab/aziel-lockset-tip/raw/branch/main/aziel-tip-pack.tar \
     -o aziel-tip-pack.tar
   sha256sum aziel-tip-pack.tar
   # must print:
   # b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37  aziel-tip-pack.tar
   ```

   Also fetch `SHA256SUMS`, `lockset.json`, `verify-airgap.sh` from the same
   Codeberg `raw/branch/main/` prefix. Run `sha256sum -c SHA256SUMS --ignore-missing`.
   `lockset.json` field `sha256` must equal the published lockset tip above.
   `doi` must stay `null`.

2. **Create a Framagit.org account** (host `framagit.org` — not gitlab.com,
   not GitFlic). Confirm the signup email. If email confirm fails, **stop**.
   Leave Framagit `url` null and `CNS-NO-FORGE-MIRROR`. Do not invent. GitFlic
   stays `CNS-GITFLIC-EMAIL` even if Framagit later works.

3. **Create a public project.** Suggested slug `aziel-lockset-tip` under the
   operator's real Framagit namespace (Codeberg uses `AzielEliab`; use that
   namespace only if Framagit actually assigned it). Visibility **public**.
   Default branch `main`. No Cloudflare front. If the host assigns a different
   path, record **that** URL. Never write a guessed `framagit.org/…` path into
   `/shelves` before the project exists.

4. **Upload the four files** from step 1 (same bytes, not a paraphrase):

   ```bash
   git init
   git checkout -b main
   git add aziel-tip-pack.tar SHA256SUMS lockset.json verify-airgap.sh
   git commit -m "lockset tip pack b549362c"
   git remote add origin <real-framagit-git-url-the-host-prints>
   git push -u origin main
   ```

   Optional: a one-line README that cites COLD-MULTI-SHELF-1.0 and the two
   hashes. Do not add a fake DOI.

5. **Remote hash-verify** (this is the LIVE gate). Use the **real** raw URL
   the host prints (GitLab-style hosts usually expose
   `/<namespace>/<project>/-/raw/main/aziel-tip-pack.tar`):

   ```bash
   curl -fsSL "<real-raw-url-for-aziel-tip-pack.tar>" -o /tmp/framagit-aziel-tip-pack.tar
   sha256sum /tmp/framagit-aziel-tip-pack.tar
   ```

   **PASS** only if the digest is exactly
   `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`.
   Also confirm remote `lockset.json` `sha256` equals
   `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`.

6. **Record, then promote only after PASS.**
   - FAIL or URL still missing: keep `url` null (or record the real URL with
     `hash_verify: fail` + `CNS-TIP-NOT-ON-DEPOSIT`). Status stays **slot**.
     Never LIVE.
   - PASS: set the Framagit row `url` to the **real** project URL,
     `hash_verify: pass`, `tip_verified: true`. Framagit row refuse leaves
     `CNS-NO-FORGE-MIRROR`. Plane B stays **slot** until all three working
     targets pass (`CNS-PLANE-B-ALL-TARGETS`). Only then flip Plane B LIVE
     on corpus `/shelves` first; runtime cites corpus — do not flip runtime
     ahead of corpus.

7. **Hubs to update after a real PASS** (corpus SoT first):
   - https://www.azielcorpuslibrary.net/shelves (source of truth)
   - then aziel-runtime `src/cold-multi-shelf.js` + this checklist status table
   - then other Plane A mirrors (azieleliab, godlock, hedidntjump)

## Refuse map (do not collapse)

| Code | When |
| --- | --- |
| `CNS-NO-FORGE-MIRROR` | Framagit `url` is null, or no downloadable project |
| `CNS-TIP-NOT-ON-DEPOSIT` | Real URL exists but remote bytes ≠ published pack/tip |
| `CNS-PLANE-B-ALL-TARGETS` | Codeberg + archive.org + Framagit have not all PASS |
| `CNS-GITFLIC-EMAIL` | GitFlic signup mail blocked — stay refused, not a substitute |
| `CNS-GITLAB-CF-LOOP` | GitLab.com is not a working path |
| `CNS-ZENODO-NOT-LIVE` | Zenodo is not a working path |
| `CNS-NO-TIP-DOI` | lockset / cite `doi` stays null |

## Do not

- Invent a Framagit project URL to fill the slot.
- Mark Framagit or Plane B LIVE because Codeberg + archive.org already PASS.
- Treat GitFlic, GitLab.com, Launchpad, OSF, or a second archive.org item as
  the third ALL-TARGETS shelf.
- Count 4 CF hubs + GitHub as extra independent shelves.

Companion: `tools/cold_shelf/ALT-FORGE-TIP-PACK-CHECKLIST.md`.

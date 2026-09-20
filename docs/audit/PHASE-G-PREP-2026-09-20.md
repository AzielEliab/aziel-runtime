# Phase G prep — aziel-runtime 2.0.0-rc1 → 2.0.0 final

**Date written:** 2026-09-20 UTC  
**Phase:** PREP / AUDIT only. **Do not cut or tag `2.0.0`.**  
**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Tip audited:** `origin/main` `7ac9ad8` — Merge pull request #139 (SEO not-phrase scrub + `invent_completeness` rename)  
**This paper tip:** this PR on `cursor/phase-g-prep-audit-98ce`  
**Identity:** **Aziel Eliab** only  
**Hard stop:** `docs/2.0/` says this rc pack does **not** cut `2.0.0` final. Phase G = cut `2.0.0` **only after gates pass.** This note is not a tag, not a lab letter, and not Gate 5.

Lamb Lens for this write-up: **Service** (what the scripts and live bytes actually returned) → **Clarity** (LIVE vs SLOT vs blocked) → **Peace** (next operator steps; no panic flip).

Self-test ≠ third-party lab. Remain-OFF stays off. FragGate remains THE single public executable door. `GET /v1/mesh` never enables.

---

## Verdict in one page

| Gate | In-repo pack | This prep run | Blocks `2.0.0` cut? |
|------|----------------|---------------|---------------------|
| 1. Stable public contract | `docs/2.0/PUBLIC-CONTRACT.md` + sibling policies | **PASS** (`npm test` includes `verify-2.0-rc1.mjs`) | No |
| 2. Independent reproducibility | `CLEAN-ROOM.md` + `scripts/clean-room-2.0.sh` | **PASS** (documented local MCP; Docker unavailable here) | No — Docker path still recommended on a reviewer machine |
| 3. External adversarial | `EXTERNAL-ADVERSARIAL-PACK.md` + wrapper | **PASS** (self-check; **not** a lab) | No |
| 4. Distribution identity | `glama.json` + TDQS + GitHub topics; Aziel Eliab only | **PACK PASS** / **live follow-up open** | Coordinator apply + Glama Install Server / Make Release still operator work |
| 5. Outside use | Operational proof **outside** the pack | **NOT CLAIMED** | **Yes — this is the hard block** |

**Scoring-metric SEO on crawler surfaces:** none remaining that must be scrubbed. `#139` already renamed ToolBench `fielded_100` → `invent_completeness` (SLOT stub, **kept**) and dropped definition-by-negation / ban-story prose from `/llms.txt` `/cite.json` `/who-is` Softwares `one_line`. This PR only restores empty `docs/2.0/` SLOT cites left by that rename.

**Do not tag `2.0.0`.** Only existing release tag on `origin` is `v2.0.0-rc1`.

---

## Evidence (this session)

Checkout after `git fetch origin main` / fast-forward:

| Item | Value |
|------|--------|
| `git rev-parse origin/main` (audit tip) | `7ac9ad8ababc33cc2aaf22d2f502a8bf62741f86` |
| `package.json` / `RUNTIME_VERSION` | `2.0.0-rc1` |
| Node | `v22.14.0` |
| Docker | **not found** (clean-room used documented local `AZIEL_RUNTIME_MCP=local`) |
| Author / identity on health + runtime.json | Aziel Eliab / Aziel Eliab |

### Commands

| Command | Result |
|---------|--------|
| `node scripts/verify-2.0-rc1.mjs` | **PASS** — `ok 2.0.0-rc1 contract freeze pack (not a lab)` |
| `npm test` | **PASS** — full `scripts/verify-*.mjs` suite, including `verify-2.0-rc1`, `verify-mcp-tdqs` (36 names frozen), `verify-remain-off` (33 items), `verify-adversarial`, `verify-software` (no `fielded_100` in Softwares `one_line` / `description`) |
| `bash scripts/clean-room-2.0.sh --skip-install --skip-npm-test` | **PASS** — `verdict=PASS` `result_sha256=d1800af0abb842027a21b27424d88e73a42d1c42ea840d31e41b22682653c5c8`. MCP `tools/list` = 36; harmless `fraggate_call` `decisiongate`/`health` `FG-OK`; session `verifyChainStrict` `chain_ok=true`. `npm_test` recorded **skip** in that file because the suite already ran green in this same checkout. Docker step **SKIP** (binary absent). |
| `bash scripts/external-adversarial-2.0.sh` | **PASS** — `verdict=PASS` `result_sha256=f3c3f47c38c4453955a9804fbad5b8c99342e7ba1cb81609c133eee1d0845172`. `verify-adversarial` + `verify-remain-off`. `third_party_lab: false`. |

Actions on `main` after #139: Test run [35479926853](https://github.com/AzielEliab/aziel-runtime/actions/runs/35479926853) **success**; Deploy run [35479926817](https://github.com/AzielEliab/aziel-runtime/actions/runs/35479926817) **success**.

Live Worker (UA `Mozilla/5.0`, 2026-09-20):

| Surface | Bytes |
|---------|--------|
| `GET /v1/health` | `ok: true`, `version: "2.0.0-rc1"`, `author` / `identity` Aziel Eliab |
| `GET /v1/runtime.json` | same version + identity; `proxy_is_not_exec: true`; `isolate_is_the_jail: true` |
| `GET /llms.txt` | no `fielded_100` / `scoreboard` / `unkillability` / `pissed-off-gov` / `operator_preempt` / `CLAIM_COMPLETE` |
| `GET /cite.json` | `version: "2.0.0-rc1"`; same tokens **absent** |
| `GET /v1/software` | 42 cards; ToolBench `one_line` = “Run synthetic door cases to see how FragGate classifies them.”; same tokens **absent** |

---

## Gate matrix (detail)

### Gate 1 — Stable public contract — PASS

Pack present and asserted by `verify-2.0-rc1.mjs`:

- `PUBLIC-CONTRACT.md` names all 36 `PUBLIC_MCP_TOOLS`; FragGate list → describe → call; `engine_digest`; `/v1/health` + `/v1/runtime.json`; `/p/{slug}/{op}` is proxy.
- `COMPATIBILITY-POLICY.md`, `RECEIPT-SCHEMA.md`, `REFUSAL-CONTRACT.md` (Remain-OFF 33; do not enable), `BREAKING-CHANGE-POLICY.md` (future major to break; **this rc is not `2.0.0` final**).
- `glama.json` maintainers `["AzielEliab"]`, `version` `2.0.0-rc1`, identity Aziel Eliab only.
- No `wrangler deploy` dependency in the 2.0 pack or `package.json` scripts.

### Gate 2 — Independent reproducibility — PASS (local path)

`scripts/clean-room-2.0.sh` ran to `verdict: PASS` without Cloudflare credentials and without `wrangler deploy`.

| Step | This environment |
|------|------------------|
| `npm install` | Already present; skipped in the wrapper (`--skip-install`) |
| `npm test` | **PASS** in this session (wrapper skip after that green run) |
| Docker image | **SKIP** — `docker` not installed |
| In-process MCP initialize → `tools/list` → harmless call → receipt verify → close | **PASS** |

A reviewer with Docker should re-run **without** `--skip-npm-test` / `--skip-docker` and keep the written `clean-room-result.json` (gitignored). Sample + schema in `docs/2.0/` are **not** a live run.

### Gate 3 — External adversarial — PASS (self-test only)

Wrapper ran **unchanged**. Coverage is the existing harness (`verify-adversarial` + `verify-remain-off`). Explicit pack disclaimer stands: **self-test ≠ third-party lab.** Do not cite this as independently audited.

### Gate 4 — Distribution identity — PACK PASS; live follow-up open

**Green in-repo**

- `glama.json` + `docs/GLAMA.md` + `docs/GLAMA-TDQS.md` + `docs/GITHUB.md`
- Topics on GitHub (live `gh api`): `mcp`, `openapi`, `fraggate`, `digital-forensics`, `glama`, `mcp-server`, `nodemesh`, plus the rest of the lock set. No scoring-metric topics.
- Identity Aziel Eliab only on Worker, `glama.json` maintainers, README, 2.0 pack.
- `verify-mcp-tdqs.mjs` **PASS** (36 names frozen).

**Coordinator / live (not invented PASS)**

| Surface | Observed 2026-09-20 | Honesty |
|---------|---------------------|---------|
| GitHub About description | `Aziel Runtime by Aziel Eliab — FragGate MCP Softwares door. …` | Differs from `docs/GITHUB.md` lock text (NodeMesh'd forensics lead + “Try on Glama”). PR cannot patch About. Coordinator `gh repo edit` if the lock is SoT. |
| GitHub About homepage | `https://aziel-runtime.vibelock.workers.dev/` | Lock asks for the **live MCP endpoint** `…/mcp`. Coordinator apply. |
| Glama listing | `https://glama.ai/mcp/servers/AzielEliab/aziel-runtime` HTTP 200; page scrape shows `overallScore` **4.1**, `scoredToolCount` 36, `scoredAt` `2026-09-18T23:00:55.550749Z` | In-repo TDQS note still cites an older **A 3.9** observation (2026-09-12). Do not invent a new letter grade. Install Server / **Make Release** remains operator work (`docs/GLAMA.md`). This scrape is not proof that Install Server is on. |
| GitHub release | Only `2.0.0-rc1` / `v2.0.0-rc1` | Correct. No `2.0.0` tag. |

### Gate 5 — Outside use — NOT CLAIMED (blocked)

`docs/2.0/README.md` and `EXTERNAL-ADVERSARIAL-PACK.md`: operational proof **outside this pack / PR**. `BREAKING-CHANGE-POLICY.md`: cut `2.0.0` only after gates 1–4 artifacts land **and** gate 5 is proven operationally.

This prep **does not** treat any of the following as Gate 5:

- Green `npm test` / clean-room / adversarial (Gates 1–3)
- Live Worker answering `/mcp` (author-operated surface)
- Glama card existing
- `examples/consumer/`
- 1.9.3 independent-validation attestation path

**No PASS is recorded for Gate 5.**

---

## Scoring-metric residual audit

Searched tip + live crawler surfaces for affirmative leftovers:

`fielded_100` · `scoreboard` · `unkillability` (as a score) · `pissed-off-gov` · `operator_preempt` · `CLAIM_COMPLETE=100` / `claim_complete`

| Location | Result | Action |
|----------|--------|--------|
| `/llms.txt` `/ai.txt` `/cite.json` `/who-is` `/person.jsonld` Softwares `one_line` / `description` | Tokens absent | None |
| README Softwares / lead | Tokens absent | None |
| GitHub topics + About | Tokens absent | None |
| Live `GET /v1/software` | Tokens absent | None |
| `scripts/verify-software.mjs` | Negative `doesNotMatch` / `!fielded_100` on catalog copy | **KEEP** |
| ToolBench engine / registry / architecture-fit | `invent_completeness` SLOT / `FG-STUB` | **KEEP** |
| Cold-copy doctrine | `unkillable_by_single_server` / “unkillable by single-server pull” | **KEEP** (doctrine, not a scoreboard) |
| GodLock / AZ-CLCE / AZCoherence / ZionPattern / AKM triad | Product `score` / `triad_score` / `score_100` | **KEEP** |
| `docs/2.0/ARCHITECTURE-FIT-FIVE.md` + `docs/2.0/CHANGELOG.md` | Empty SLOT hole after `fielded_100` rename (` `` ` / “Inventing a  score” / “playground;  SLOT”) | **Restored** to `invent_completeness` SLOT in this PR |
| Heritage audit papers (`HUMAN-UI-MCP-AUDIT`, OUTLAST, etc.) | Empty `` left by earlier `claim_complete` history-scrub | **Not crawler SEO.** Do not rewrite heritage papers in Phase G. |
| ToolBench suite case id `tb-stub-fielded` | Internal case id only | **KEEP** (not a crawler surface) |

No affirmative scoreboard SEO remains on GitHub crawler surfaces. No second SEO-scrub PR is required beyond this honesty restore.

Recent related landings (do not re-litigate):

- #139 — SEO not-phrases + `invent_completeness` rename (`7ac9ad8`)
- #141 — Whitestone Case Mode placement
- `claim_complete` history-scrub repairs (`2e1f9fb`, `c8e60a6`)

---

## What is green (ready to keep)

1. Contract freeze pack under `docs/2.0/` with hard stop: no `2.0.0` final in the rc1 pack.
2. `npm test` + `verify-2.0-rc1` on tip `7ac9ad8`.
3. Clean-room local MCP path + external adversarial wrapper.
4. FragGate single door; isolation `software_count` 33; `PUBLIC_MCP_TOOLS` 36.
5. Remain-OFF 33; suite-presence ON; `POST /v1/mesh/disable` refused; GET never enables.
6. Crawler lead `RUNTIME_ABSTRACT` intact; scoring-metric tokens off llms/cite/README Softwares.
7. Live Worker already on `2.0.0-rc1` after #139 deploy.
8. Identity Aziel Eliab only.

---

## What is blocked for the `2.0.0` cut

1. **Gate 5 outside use** — no operational proof outside the author pack is claimed here.
2. **Coordinator GitHub About apply** — homepage `/mcp` + lock description if `docs/GITHUB.md` remains SoT (`gh repo edit`; not a git patch).
3. **Glama operator loop** — re-claim `glama.json`, Deploy, **Make Release** so Install Server matches `2.0.0-rc1` (`docs/GLAMA.md`). This prep did not operate Glama admin.
4. **Docker clean-room** — not executed here; a reviewer machine with Docker should run the wrapper unchanged.
5. **Tip-pack / Plane B LIVE** — Framagit URL null; Plane B/C stay **SLOT** (`tools/cold_shelf/FRAMAGIT-TIP-PACK-CHECKLIST.md`). Do not invent a Framagit URL or flip LIVE without hash-verify.
6. **Remain-OFF / fantasy verbs** — still off. Do not enable to “look complete.”
7. **No `2.0.0` git tag** until the coordinator records Gate 5 outside the repo.

---

## Recommended next steps (operator / coordinator)

1. **Gate 5 (required for the cut).** Collect operational proof **outside** this repository: an independent consumer, a non-author machine following `CLEAN-ROOM.md` without `--skip-*`, and/or a real Glama **Install Server** session that is not the author Worker homepage. File that proof off-repo (or a later paper that cites **fetched** outsider bytes). Do not stamp PASS from this checklist.
2. **Glama.** Score/claim → Dockerfile CMD `node cli/mcp-stdio.mjs` → Deploy → Make Release. Re-read `glama.json` after merge. Do not invent a Glama UUID.
3. **GitHub About.** Apply `docs/GITHUB.md` (`description`, homepage `…/mcp`, topics already present).
4. **Optional reviewer clean-room.** `git clone` + `bash scripts/clean-room-2.0.sh` with Docker, no skip flags; keep `clean-room-result.json`.
5. **Tip-pack.** Keep Plane B SLOT until Framagit exists **and** remote bytes hash-verify. archive.org + Codeberg PASS still SLOT. No invented DOI.
6. **Only then** cut `2.0.0` (annotated tag + GitHub Release) from a green `main` that still says Aziel Eliab only. Do not force-push `main`. Do not enable Remain-OFF. Do not add a 34th isolation software or a 37th public MCP tool for the cut.

---

## This PR

- Adds this Phase G prep checklist.
- Restores `invent_completeness` SLOT wording in `docs/2.0/ARCHITECTURE-FIT-FIVE.md` and the matching `docs/2.0/CHANGELOG.md` architecture-fit bullet (empty leftover after #139). That is the **kept** ToolBench SLOT stub, not a scoreboard.
- Does **not** tag `2.0.0`.
- Does **not** change FragGate, MCP names, Remain-OFF, or crawler `RUNTIME_ABSTRACT`.

Cite: Eliab, Aziel. (2026). PHASE-G-PREP-2026-09-20 [Audit]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/PHASE-G-PREP-2026-09-20.md

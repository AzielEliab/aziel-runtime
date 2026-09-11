# AZRT-1.9-GAPS-CLOSE

**Target:** aziel-runtime **1.9.3** (1.9.2 / 1.9.1 heritage)  
**Repo:** https://github.com/AzielEliab/aziel-runtime  
**Identity / author:** **Aziel Eliab** only  
**Ingest date:** 2026-09-10 · **Bind close:** 2026-09-11 · **Remaining-gaps close:** 2026-09-11  
**Baseline:** latest `main` **1.9.2** on **1.9.1** (AZRT-1.9-GAPS-CLOSE) / **1.9.0** (AZRT-1.9-CLOSE-1.0)

Not a Softwares-tab product. Not a FragGate slug. This paper does **not** enable remain-OFF items. `GET /v1/mesh` never enables. FragGate is THE single door. SEO crawler abstract stays LEAD on homepage meta / llms / cite / about; changelog stays below.

Companion law: [REMAIN-OFF-BY-DESIGN-2026-09-10](REMAIN-OFF-BY-DESIGN-2026-09-10.md).  
Companion close: [AZRT-1.9-CLOSE-1.0](AZRT-1.9-CLOSE-1.0.md).  
Companion inventory: [UNIVERSAL-EXEC-FALLBACK-1.9](../audit/UNIVERSAL-EXEC-FALLBACK-1.9.md).  
Companion outsider path: [INDEPENDENT-VALIDATION](../audit/INDEPENDENT-VALIDATION.md).

---

## Closed in 1.9.3 (remaining OPEN/ASSESS)

| Gap | Disposition |
| --- | --- |
| AZ-OS session/close | **CLOSED in-process** — isolate-native `session_open` / `session_status` / `session_close` (aliases `session` / `close`) are a prefab ethics session VFS preview in Worker memory (optional get/put KV when an AZ-OS-safe binding is present). Not a remote host shell. Public `exec` / `shell` / `lattice` stay FG-STUB / refuse. |
| jeeves | **CLOSED isolate-native** — Ask Jeeves over sample MASTER / `CORPUS_D1` `records`. Refuse bypass / password / triad-tamper / operator secrets. Jesus-image-only if the user says the devil is not real. No AZAI blend/chat. No invented visits. |
| media-run | **CLOSED binding-gated** — hash-chained media job runs Whisper / vision only when `env.AI.run` is present. Unbound path is an honest refuse. Does not fake OCR or transcripts. Removed from `PROXY_OPS`. |
| Independent lab | **CLOSED as externally reproducible self-check with published attestation path** — `docs/audit/INDEPENDENT-VALIDATION.md` + `scripts/independent-validate.sh` + Actions `validate.yml` (JUnit/JSON + `git_sha` + runtime version; optional provenance attest). Still not a third-party lab or court audit. |

## Closed in 1.9.2 (bindings)

| Gap | Disposition |
| --- | --- |
| AZBrowser Chromium | **CLOSED (bound)** — `wrangler.toml` `[browser] binding = "BROWSER"`. `sandbox_status` / `sandbox_render` already use `env.BROWSER` + `@cloudflare/puppeteer`. Do not fake Chromium when unbound. Tor / phoenix stay refuse. Chromium product UI is not claimed. |
| Live D1 MASTER | **CLOSED (bound)** — `CORPUS_D1` → production `aziel-digital-library` (`23f33238-f1ca-4066-b56e-af66a1e72031`). `searchD1` queries `records` (record_id, title, author, domain, subjects, keywords, library, body, created_utc). Sample MASTER remains the unbound fallback. |
| Whisper / OCR native | **CLOSED (bound)** — `wrangler.toml` `[ai] binding = "AI"`. `transcribe` / `ocr` stay native only when `env.AI.run` is present. Not a fake native OCR. |

## Closed in 1.9.1

| Gap | Disposition |
| --- | --- |
| Universal in-process | **CLOSED (partial, honest)** — corpus `review` / `score` / `verify-backfill` / `verify-geo` / `document-chain` / `import_export` are isolate-native. 1.9.3 shrinks the named inventory further (session/close + jeeves + media-run). Unknown tools still refuse (`FG-HALLUC-TOOL`). |
| Corpus native | **CLOSED (labels + gated APIs)** — sample MASTER search stays native. Live D1 search runs only when `CORPUS_D1` is bound. Whisper / OCR run only when Workers AI (`env.AI`) is bound. Health `native_vs_proxy` + `binding_gated` stay honest. Not a fake native OCR. |
| Thin engines (waves 2–3) | **CLOSED** — health / skill / doctor richness (axes, neighbors, live_ops, stub_ops, THIS IS limitation) on remaining live slugs. No fantasy ops. |
| Human-surface parity | **CLOSED** — catalog `ops[]` ≡ FragGate `LIVE_OPS` ≡ engine `*_OPS` for new public verbs (doctor, corpus verify, `sandbox_*`, `transport_status`, 1.9.3 session/jeeves/media-run). `/p` stays proxy-not-exec. Flutter `mobile/` remains not vendored. |
| Adversarial validation | **CLOSED as repo self-check** — `scripts/verify-adversarial.mjs` covers bypass, replay, concurrency, capability attenuation, SSRF, malformed input, cross-domain isolation, receipt/provenance tamper. Not a third-party lab. |
| CI | **CLOSED** — `.github/workflows/test.yml` runs full `npm test` on pull requests and `main`. `validate.yml` publishes attestation on release/tag. Deploy workflow is unchanged and is not invoked by this paper. |
| Outside adoption | **CLOSED (skeleton → install path)** — `examples/consumer/` documents MCP stdio + OpenAPI `fraggate_call` so an independent developer can integrate without the author. |
| Outbound mail | **CLOSED as gated refuse** — `transport_status` is live and honest. Public MTA / `smtp_send` stay NOT IMPLEMENTED / FG-STUB. No public send. |
| Y1 software digests | **CLOSED** — each `/v1/software` live card carries `engine_digest` from the same embed `GET /v1/health` `engines[]` uses (37/37). |
| Y6 Live Nodes rollup | **CLOSED** — `live_nodes` is Softwares `{slug}-worker` only. Auto-minted `mesh_*` ids are `ephemeral_nodes` / `rollup.ephemeral`. Named extras stay `rollup.named`. Hubs no longer see 37+2=39. |
| Y7 EmbryoLock catalog | **CLOSED** — catalog / update-check version is **1.2.0** (matches product Worker health). In-process cite contract stays Stealth+ v1.1 (`engine VERSION` 1.1.0). Wipe stays FG-STUB. |
| W2 catalog git_sha | **CLOSED (practical)** — `GET /v1/software` `git_sha` prefers `GIT_SHA` (`wrangler deploy --var`, Actions already passes `github.sha`), then `CF_VERSION_METADATA.tag`, then stamped `src/build-meta.js`. |

---

## Still open / deferred (honesty)

| Gap | Disposition | Concrete next step |
| --- | --- | --- |
| AZBrowser Chromium | **CLOSED (bound in 1.9.2)** | Workers Browser Rendering is bound. Coordinator deploys. Do not enable Tor / phoenix. |
| Live D1 MASTER | **CLOSED (bound in 1.9.2)** | `CORPUS_D1` → `aziel-digital-library`. Search uses production `records`. |
| Whisper / OCR native | **CLOSED (bound in 1.9.2)** | Workers AI (`AI`) is bound. Native only when `env.AI.run` is present. |
| AZ-OS session/close | **CLOSED in-process (1.9.3)** | Ethics VFS is isolate-native. Public `exec` / `shell` stay refuse. Do not enable remote shell. |
| jeeves / media-run | **CLOSED (1.9.3)** | jeeves isolate-native; media-run binding-gated. Blend stays refuse. |
| Independent lab | **CLOSED as externally reproducible self-check with published attestation path** | Still not a third-party lab. See [INDEPENDENT-VALIDATION](../audit/INDEPENDENT-VALIDATION.md). |
| Flutter `mobile/` | **STRUCK** | Not vendored. Do not fake `mobile/`. |
| Public SMTP / MTA | **NOT IMPLEMENTED (remain)** | Stay refuse. Local operator MTA, if ever added, must stay gated off this public mesh. |

---

## Remain-OFF (not gaps)

Mesh auto-enable, public SMTP, deanonymize, WhistleLock send/mail/release, VPN-hop, AZ-OS shell/exec on the public mesh, AZAI blend/chat, Tor/phoenix wipe, EmbryoLock public wipe, AZNet payload CDN, unknown-tool fallback — stay OFF / REFUSE / GATED.

No `wrangler deploy` from this paper.

Cite: Eliab, Aziel. (2026). AZRT-1.9-GAPS-CLOSE [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/AZRT-1.9-GAPS-CLOSE.md

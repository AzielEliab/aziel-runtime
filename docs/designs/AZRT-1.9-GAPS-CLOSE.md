# AZRT-1.9-GAPS-CLOSE

**Target:** aziel-runtime **1.9.1**  
**Repo:** https://github.com/AzielEliab/aziel-runtime  
**Identity / author:** **Aziel Eliab** only  
**Ingest date:** 2026-09-10  
**Baseline:** latest `main` **1.9.0** (AZRT-1.9-CLOSE-1.0)

Not a Softwares-tab product. Not a FragGate slug. This paper does **not** enable remain-OFF items. `GET /v1/mesh` never enables. FragGate is THE single door. SEO crawler abstract stays LEAD on homepage meta / llms / cite / about; changelog stays below.

Companion law: [REMAIN-OFF-BY-DESIGN-2026-09-10](REMAIN-OFF-BY-DESIGN-2026-09-10.md).  
Companion close: [AZRT-1.9-CLOSE-1.0](AZRT-1.9-CLOSE-1.0.md).  
Companion inventory: [UNIVERSAL-EXEC-FALLBACK-1.9](../audit/UNIVERSAL-EXEC-FALLBACK-1.9.md).

---

## Closed in 1.9.1

| Gap | Disposition |
| --- | --- |
| Universal in-process | **CLOSED (partial, honest)** — corpus `review` / `score` / `verify-backfill` / `verify-geo` / `document-chain` / `import_export` are isolate-native. Named proxy inventory shrinks to azos `session/exec/close/lattice` and corpus `jeeves/transcribe/ocr/media-run`. Unknown tools still refuse (`FG-HALLUC-TOOL`). |
| Corpus native | **CLOSED (labels + gated APIs)** — sample MASTER search stays native. Live D1 search runs only when `CORPUS_D1` is bound. Whisper / OCR run only when Workers AI (`env.AI`) is bound. Health `native_vs_proxy` + `binding_gated` stay honest. Not a fake native OCR. |
| Thin engines (waves 2–3) | **CLOSED** — health / skill / doctor richness (axes, neighbors, live_ops, stub_ops, THIS IS limitation) on remaining live slugs. No fantasy ops. |
| Human-surface parity | **CLOSED** — catalog `ops[]` ≡ FragGate `LIVE_OPS` ≡ engine `*_OPS` for new public verbs (doctor, corpus verify, `sandbox_*`, `transport_status`). `/p` stays proxy-not-exec. Flutter `mobile/` remains not vendored. |
| Adversarial validation | **CLOSED as repo self-check** — `scripts/verify-adversarial.mjs` covers bypass, replay, concurrency, capability attenuation, SSRF, malformed input, cross-domain isolation, receipt/provenance tamper. Not a third-party lab. |
| CI | **CLOSED** — `.github/workflows/test.yml` runs full `npm test` on pull requests and `main`. Deploy workflow is unchanged and is not invoked by this paper. |
| Outside adoption | **CLOSED (skeleton → install path)** — `examples/consumer/` documents MCP stdio + OpenAPI `fraggate_call` so an independent developer can integrate without the author. |
| Outbound mail | **CLOSED as gated refuse** — `transport_status` is live and honest. Public MTA / `smtp_send` stay NOT IMPLEMENTED / FG-STUB. No public send. |

---

## Still open / deferred (honesty)

| Gap | Disposition | Concrete next step |
| --- | --- | --- |
| AZBrowser Chromium | **DEFERRED** | Bind Workers Browser Rendering (`browser.binding = BROWSER`) on a paid plan, `npm i @cloudflare/puppeteer`, then deploy. `sandbox_render` already refuses private / onion / Tor targets and does not fake Chromium when unbound. Do not enable Tor / phoenix. |
| Live D1 MASTER | **OPEN (gated)** | Create the library D1 database and bind `CORPUS_D1`. Search already uses it when present. |
| Whisper / OCR native | **OPEN (gated)** | Bind Workers AI (`AI`). `transcribe` / `ocr` stay `proxy_fallback` until bound. |
| AZ-OS session/exec/close | **OPEN (named proxy)** | Product-Worker VFS / ethics shell stays proxy. Public `exec` / `shell` stay refuse. Do not enable remote shell. |
| jeeves / media-run | **OPEN (named proxy)** | Jeeves is AZAI-adjacent (blend stays refuse). media-run needs live media bindings. |
| Independent lab | **ASSESS** | `npm test` is a repo self-check. Do not claim a third-party lab. |
| Flutter `mobile/` | **STRUCK** | Not vendored. Do not fake `mobile/`. |
| Public SMTP / MTA | **NOT IMPLEMENTED (remain)** | Stay refuse. Local operator MTA, if ever added, must stay gated off this public mesh. |

---

## Remain-OFF (not gaps)

Mesh auto-enable, public SMTP, deanonymize, WhistleLock send/mail/release, VPN-hop, AZ-OS shell/exec on the public mesh, AZAI blend/chat, Tor/phoenix wipe, EmbryoLock public wipe, AZNet payload CDN, unknown-tool fallback — stay OFF / REFUSE / GATED.

No `wrangler deploy` from this paper.

Cite: Eliab, Aziel. (2026). AZRT-1.9-GAPS-CLOSE [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/AZRT-1.9-GAPS-CLOSE.md

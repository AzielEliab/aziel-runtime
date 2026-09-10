# AZRT-1.9-CLOSE-1.0

**Target:** aziel-runtime **1.9.0** (freeze at 1.9.1)  
**Repo:** https://github.com/AzielEliab/aziel-runtime  
**Identity / author:** **Aziel Eliab** only  
**Ingest date:** 2026-09-10  
**Baseline:** rebase onto latest `main` (1.7.10+). This close lands on that heritage.

Not a Softwares-tab product. Not a FragGate slug. This paper does **not** enable remain-OFF items.

Companion law: [REMAIN-OFF-BY-DESIGN-2026-09-10](REMAIN-OFF-BY-DESIGN-2026-09-10.md).  
Companion gaps: [FEATURE-STATE-2026-09-10](../audit/FEATURE-STATE-2026-09-10.md).  
Companion checklist: [SUITE-CAPABILITY-CHECKLIST](../audit/SUITE-CAPABILITY-CHECKLIST.md).

---

## Hard law (every PR)

Never enable remain-OFF:

- mesh auto-enable
- public SMTP / MTA
- deanonymize / harvest
- WhistleLock send / mail / release
- VPN-hop
- AZ-OS shell / exec
- AZAI blend / chat runner
- Tor / phoenix wipe
- EmbryoLock public wipe
- AZNet payload CDN
- unknown-tool fallback

`GET /v1/mesh` never enables. AZChat / AZMail mesh hop opt-in default **false**. Do not bridge AZChat ↔ AZMail.

---

## Wave order (landed in this close; version freeze 1.9.0)

| Wave | Scope |
| --- | --- |
| **1.8.1** | Promote existing public-safe ops into LIVE_OPS + OpenAPI + Worker buttons: CodeLock `gate-status`, VibeLock `detect`, GlossaFilter `peers`, AZBot `example`, AZ-OS `invite` + `principles` (exec/shell stay refuse), AZAI `models` metadata only (blend/chat refuse). |
| **1.8.2** | ShadowLock `hook` (zero-retention, not OS hook). MirageGrid `verify-receipt` + `nodes` only (no hop). AzielTether `tip` / `dual-chain` / `reconcile` / `pulse` / `peer-preview` only (no VPN / mesh-join / arm). |
| **1.8.3** | AZMail mailbox. Keep airlock / classify / mesh_* / keyword_alert_*. ADD: `mailbox_open`, `notice_post` (agent→user class `error` \| `update` \| `health` \| `receipt`), `mail_post` (user→user local), `inbox_pull` (caller only), `ack`, `verify_receipt`, `import_export`. NO `smtp_send`. Limitation: no public MTA. |
| **1.8.4** | AZChat replaces name-only stub. LIVE_OPS only: health / skill / doctor, `handle_new`, `handle_rotate`, `room_open`, `room_post`, `room_pull`, `bus_send`, `bus_poll`, `verify_receipt`, `import_export`. Bitmesh-class spendable handles; ephemeral rooms TTL/sealed; agent bus frames. `mesh_enabled_default` false. FEATURE-STATE item 5 → LIVE+bound. |
| **1.8.5** | Worker buttons + download / skill / OpenAPI parity. FEATURE-STATE + checklist updated same commit. |
| **1.9.0** | Isolate hash object store for TrajectoryLock media + WhistleLock files (no CDN; send/mail/release refuse). Corpus native-vs-proxy labels. Named fallback inventory for universal exec. |
| **1.9.1** | Wave-3 R2 (round-2) capability baseline sweep. Flutter: strike README `mobile/` claim (not vendored). Validation harness doc (honest not-independently-run). Minimal public consumer skeleton. Freeze version **1.9.0**. |
| **DEFER** | AZBrowser Chromium — leave NOT IMPLEMENTED. Tor / phoenix refuse. |
| **ASSESS** | Gaps 21–22 (FEATURE-STATE deanonymize STUB + mesh OFF default): harness + example only. Do not fake independent validation or adoption. Do not enable. |

---

## SEO

Keep the canonical Aziel Runtime **abstract** as lead crawler copy (not an API aggregator; node-meshed MCP Softwares forensic / audit suite). Put the 1.9 changelog **below** the abstract.

---

## Success

- catalog `ops[]` ≡ FragGate `LIVE_OPS` ≡ engine `*_OPS` on public verbs (UI aliases may extra-list on LIVE_OPS)
- `engine_digest` required; tests refuse a stale embed
- R2 (round-2) health / skill envelope (`capabilityHealth` + honest `r2.bound: false`, isolate hash store)
- tests green
- remain-OFF untouched
- PRs ready
- wrangler deploy if OAuth available

---

## G0 report (CLOSED / DEFERRED / ASSESS)

| G0 | FEATURE-STATE | Disposition |
| ---: | --- | --- |
| 1–3 | Mesh radios / QNS proxy / auto-enable | CLOSED — remain correctly OFF |
| 4 | EmbryoLock live-with-local-destructive-boundary | CLOSED — already 1.7.8; wipe stays FG-STUB |
| 5 | AZChat STUB | CLOSED — LIVE+bound (1.8.4) |
| 6–18 | VeilLock local / inject; ARK / Whistle send / hop / tether VPN / AZ-OS exec / AZAI blend / court / PeaceLock fabricate / 4DMap truth / Tor / phoenix | CLOSED — remain correctly OFF / REFUSE |
| 19 | AZBrowser Chromium | **DEFERRED** — NOT IMPLEMENTED |
| 20 | AZMail SMTP | CLOSED — remain NOT IMPLEMENTED (no public MTA) |
| 21 | AZMail deanonymize | **ASSESS** — harness + example only; stay STUB |
| 22 | AZMail mesh OFF default | **ASSESS** — harness + example only; stay OFF |
| 23 | TrajectoryLock media store | CLOSED — isolate hash object store (no CDN) |
| 24 | WhistleLock file store | CLOSED — isolate hash object store (no CDN); send/mail/release refuse |
| 25–28 | AZNet payloads / unpaired / Hub auto-unlock / Interface cycles | CLOSED — remain correctly OFF |
| 29 | Corpus D1/Whisper/OCR PARTIAL | CLOSED — native-vs-proxy labels (not a fake native OCR) |
| 30 | Universal local execution NOT COMPLETE | CLOSED — named fallback inventory (honest) |
| 31–44 | Rollback / LambGate / ASE / ZD30 / AZPIPE / AKM / session / refuse | CLOSED — remain correctly OFF / GATED / REFUSE |
| 45 | Complete OpenAPI INCOMPLETE | CLOSED — catalog proxy paths + LIVE_OPS parity |
| 46–50 | `/p` not exec / FragGate not engine / mesh not engine / domains not doors / Zenodo inactive | CLOSED — remain correctly OFF; Zenodo still inactive (no invented DOI) |

---

Cite: Eliab, Aziel. (2026). AZRT-1.9-CLOSE-1.0 [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/AZRT-1.9-CLOSE-1.0.md

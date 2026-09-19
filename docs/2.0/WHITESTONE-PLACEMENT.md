# Whitestone placement — Softwares catalog / Worker-only / FragGate none

**Author / identity:** **Aziel Eliab** only  
**Product:** Whitestone **1.6.0** (historical as-of + **Case Mode**)  
**NO-LIE:** Whitestone is **not** the FragGate kernel. Session-only. Author Aziel Eliab.

This note is an architecture placement check, not a sixth [ARCHITECTURE-FIT-FIVE](ARCHITECTURE-FIT-FIVE.md) capability. Those five fits (`zkattest` / `mmconsensus` / edge `POST /mcp` / isolate `runtime_session_*` / `toolbench`) stay behind FragGate. Whitestone does **not**.

---

## Where it belongs

| Surface | Placement |
|---------|-----------|
| Softwares catalog `GET /v1/software` | Live Worker-only card. Slug `whitestone`. Bucket **Plain**. Placement `pro-se-advisor`. Domain **null**. |
| `worker_only` | **true** |
| FragGate registry / door | **none**. `fraggate_describe` / `fraggate_call` refuse `FG-HALLUC-TOOL`. Do not invent `LIVE_OPS` or `engine_digest`. |
| Isolation `software_count` | Stays **33**. Not a 34th isolation software. `domains_are_doors: false`. |
| `PUBLIC_MCP_TOOLS` | Unchanged. No `whitestone_*` MCP tool. |
| Dual-surface AI discovery | Runtime `/v1/software` + `/llms.txt` + `/ai.txt` + `/cite.json` + `/who-is` (and `/who-is-aziel-eliab.txt`). Product Worker `GET https://whitestone.vibelock.workers.dev/v1/software`. Agents discover the card; they do **not** get a FragGate door. Humans use the live web app. |

Hubs refresh from this Worker SSoT. Counted zip stays ARK-style:

- `worker_home` `https://whitestone-download-tracker.vibelock.workers.dev/`
- `download_url` `https://whitestone-download-tracker.vibelock.workers.dev/download`
- Live web app `https://whitestone.vibelock.workers.dev/` (`web_app`)
- GitHub `https://github.com/AzielEliab/Whitestone`

Aliases (`case-mode`, `casemode`, `whitestone-case`, `pro-se`, `pro-se-advisor`) resolve to `whitestone` for install / update check. They are not extra Softwares.

---

## Case Mode (product feature, not a door)

Same Worker. Same session. Not a fourth practice area and not a FragGate op.

- Optional **historical as-of** evaluation (year/month; UNKNOWN without a dated record).
- **Suppression / honesty axes:** `truth_upheld`, `narrative_suppression`, `systemic_suppression`, `personal_professional_suppression`, plus `truth_buried` / `truth_overcame_lie` / `honesty_overall`.
- **TrajectoryLock-lite** — labeled / heuristic victim × impact × location over session text and upload kinds. Does not name a shooter. Full physics SLOT.
- **Export** (Case Mode only): hash-chain + score-card JSON. End & erase still wipes the live session.
- **Confidence ≤75%** (`confidence_cap: 0.75`). UNKNOWN without dated hashchained sources.
- **Not legal advice.** Not a lawyer. Educational procedural guidance.

---

## Dual-surface discovery (MCP / AI clients)

1. **Runtime Softwares tab** — `GET /v1/software` (also `/v1/fraggate/software` mirror). Card carries `worker_only: true`, `engine: false`, `door: "none"`, `fraggate_status: "none"`, `agent.fraggate_call: null`.
2. **Runtime crawler / agent files** — `/llms.txt` (alias `/ai.txt`), `/cite.json`, `/who-is`. Softwares lists name Whitestone Case Mode.
3. **Whitestone Worker catalog** — `GET /v1/software` on the product origin. Standalone SPA door. Not `fraggate_call`.
4. **Human software** — live web app + optional counted zip. Unchanged dual-surface law: agents get discovery copy; humans get the complete Worker UI.

`POST /p/whitestone/{op}` must not appear. Proxy-not-exec does not become a Whitestone door.

---

## NO-LIE placement

- Whitestone is **catalog software**, not FragGate kernel (`https://github.com/AzielEliab/fraggate`).
- Case content is **session-only**. Closing the tab / End & erase wipes chat, uploads, as-of dates, and Case Mode scores. This runtime does not persist case bytes.
- Identity **Aziel Eliab** only. GodLock remains a product name, not identity.
- Do not invent court-grade claims, a complete U.S. law corpus since 1776, a FragGate health op, or a durable AKM/ChainLock store on the Whitestone Worker.

See [CLIENT_UPDATE.md](../CLIENT_UPDATE.md) and [ARCHITECTURE-FIT-FIVE.md](ARCHITECTURE-FIT-FIVE.md).

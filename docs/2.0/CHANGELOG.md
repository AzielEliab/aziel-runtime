# Changelog / migration — 1.9.x → 2.0.0-rc1

**Author / identity:** **Aziel Eliab** only  
**Kind:** contract freeze. **No intentional behavioral breaks.**

Crawler abstract (`RUNTIME_ABSTRACT`) is unchanged and stays the lead on homepage / `/llms.txt` / `/cite.json` / `/about` / OpenAPI `info.description`. These notes belong **below** that abstract.

---

## 2.0.0-rc1 (current)

Certification point — not a feature dump.

- Public contract frozen under `docs/2.0/` (FragGate flow, MCP names, OpenAPI parity, health/version, `engine_digest`, live/stub/proxy-fallback).
- Compatibility, receipt, refusal, and breaking-change policies published.
- Clean-room reproducibility script + machine-readable evidence schema.
- External adversarial pack wrapping the existing `verify-adversarial` + Remain-OFF matrix (reviewer-ready; **self-test ≠ third-party lab**).
- Version strings: `package.json`, `RUNTIME_VERSION`, `VERSION_HISTORY`, SEO changelog **below** the abstract.
- Remain-OFF untouched. FragGate remains THE single door. `GET /v1/mesh` never enables.
- No new Softwares engines. No remote shell / VPN / deanonymize / public SMTP.
- No `2.0.0` final tag in this PR.

### Migration for 1.9.x clients

| Client habit (1.9.x) | 2.0.0-rc1 |
|----------------------|-----------|
| `fraggate_list` → `fraggate_describe` → `fraggate_call` | Unchanged |
| `POST /v1/fraggate/call` | Unchanged |
| `POST /mcp` initialize `2025-03-26` | Unchanged |
| 36 `PUBLIC_MCP_TOOLS` | Unchanged |
| `/p/{slug}/{op}` is proxy | Unchanged |
| Remain-OFF verbs refuse | Unchanged |
| Glama stdio `node cli/mcp-stdio.mjs` | Unchanged |
| Read `version` from health / runtime.json | Now `2.0.0-rc1` (same snapshot shape) |

If you pinned `1.9.3` in a client assertion, update the version string only. Do not change call shapes.

---

## Heritage (superseded, still true)

- **1.9.3** — remaining AZRT-1.9-GAPS-CLOSE: isolate AZ-OS session VFS; isolate-safe jeeves; binding-gated media-run; published independent-validation attestation path (not a third-party lab).
- **1.9.2** — bind Workers Browser Rendering (`BROWSER`) and live D1 MASTER (`CORPUS_D1`); Workers AI (`AI`) for Whisper/OCR honesty. Sample MASTER unbound fallback. Tor/phoenix refuse.
- **1.9.1** — isolate-safe corpus verify; adversarial self-check + Actions `npm test`; `/v1/software` `engine_digest`.
- **1.9.0** — AZRT-1.9-CLOSE-1.0 public-safe LIVE_OPS; AZMail isolate mailbox; AZChat LIVE+bound; isolate hash store; OpenAPI proxy-path parity.
- **1.7.11** — SEO abstract locked as crawler lead.

Full structured history: `VERSION_HISTORY` in `src/runtime-api.js`.

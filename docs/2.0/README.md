# Aziel Runtime 2.0.0-rc1 — certification pack

**Runtime:** `2.0.0-rc1` (contract freeze on 1.9.3 heritage)  
**Author / identity:** **Aziel Eliab** only  
**Repo:** https://github.com/AzielEliab/aziel-runtime

This directory is the **certification-point** freeze for 2.0.0-rc1. It is **not** a feature dump, **not** a third-party lab letter, and **not** permission to enable Remain-OFF items.

FragGate remains THE single public executable door. `GET /v1/mesh` never enables. New Softwares engines are deferred to 2.1+. This tag does **not** cut `2.0.0` final.

## Gates

| Gate | This pack |
|------|-----------|
| 1. Stable public contract | `PUBLIC-CONTRACT.md`, `COMPATIBILITY-POLICY.md`, `RECEIPT-SCHEMA.md`, `REFUSAL-CONTRACT.md`, `BREAKING-CHANGE-POLICY.md` |
| 2. Independent reproducibility | `CLEAN-ROOM.md` + `scripts/clean-room-2.0.sh` + evidence schema |
| 3. External adversarial | `EXTERNAL-ADVERSARIAL-PACK.md` + `scripts/external-adversarial-2.0.sh` |
| 4. Distribution identity | Unchanged Glama claim (`glama.json`) + GitHub listing; identity **Aziel Eliab** only. TDQS metadata-only pass (`docs/GLAMA-TDQS.md`) — names frozen, no behavior change |
| 5. Outside use | Operational proof **outside this PR** — not claimed here |

## Documents

| File | Role |
|------|------|
| [PUBLIC-CONTRACT.md](PUBLIC-CONTRACT.md) | FragGate flow, MCP names, OpenAPI parity, health/version, `engine_digest`, live/stub/proxy-fallback |
| [COMPATIBILITY-POLICY.md](COMPATIBILITY-POLICY.md) | What 2.0.0-rc1 promises not to break (Glama / MCP / OpenAPI clients) |
| [RECEIPT-SCHEMA.md](RECEIPT-SCHEMA.md) | Session receipts, FragGate envelopes, ledger tip, ForgeReceipts, pipe stamps |
| [REFUSAL-CONTRACT.md](REFUSAL-CONTRACT.md) | Remain-OFF + stable refuse codes as intentional boundaries |
| [BREAKING-CHANGE-POLICY.md](BREAKING-CHANGE-POLICY.md) | Breaking changes require a future major |
| [CHANGELOG.md](CHANGELOG.md) | 1.9.x → 2.0.0-rc1 migration notes (no intentional behavioral breaks) |
| [../GLAMA-TDQS.md](../GLAMA-TDQS.md) | Fold-in: Glama TDQS schema/metadata quality (names frozen) |
| [CLEAN-ROOM.md](CLEAN-ROOM.md) | Independent clone → test → MCP → receipt path |
| [clean-room-result.schema.json](clean-room-result.schema.json) | Machine-readable clean-room evidence |
| [clean-room-result.sample.json](clean-room-result.sample.json) | Sample evidence (not a live run) |
| [EXTERNAL-ADVERSARIAL-PACK.md](EXTERNAL-ADVERSARIAL-PACK.md) | Reviewer-ready wrapper over existing self-checks |

## Hard stops

- Do not enable Remain-OFF / REFUSE items (`docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md`).
- Do not weaken FragGate as the single door.
- Do not add Softwares engines in this release.
- Do not invent remote shell, VPN, deanonymize, public SMTP, or unknown-tool fallback.
- Do not run `wrangler deploy` from this pack (coordinator).
- Do not treat `npm test` or this pack as a third-party lab.

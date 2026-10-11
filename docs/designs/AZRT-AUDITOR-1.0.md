# AZRT-AUDITOR-1.0 — a separate auditor seals its own check receipts

Author: Aziel Eliab only. Status: LIVE. Source: RIB-023 (@cnye36).

The auditor is a separate GitHub Actions job (`auditor.yml`) in <https://github.com/AzielEliab/aziel-anchors>, with its own Ed25519 key (`AUDITOR_ED25519_PKCS8` Actions secret; public half pinned as `AUDITOR_PUBLIC_KEY` in `src/anchor.js`). It runs hourly and after every witness run. It:

1. re-verifies every witness statement (hash, order, pinned witness key, signature);
2. verifies every RFC 3161 token with `openssl ts -verify` against freetsa.org's CA and every Rekor entry's body hash against the statement;
3. checks, with read-only GETs, that the live runtime still holds every head of the newest statement (`/v1/anchor/row`, `/v1/{aznews,4dmap}/checkpoints`);
4. appends a chained, signed audit receipt `{spec, n, prev_audit_hash, audited_at, witness_head, tsa_verified, rekor_verified, live_checks, findings, verdict}` to `audits/log.jsonl`. Verdicts: `AUDIT-PASS`, `AUDIT-FAIL`, `AUDIT-EMPTY`.

The runtime reads and verifies the audit log in `GET /v1/anchor` (`auditor` block). The auditor never writes the runtime and never executes through FragGate. Law fit: separate process and key (not self-audit), append-only, fail closed, no new tool.

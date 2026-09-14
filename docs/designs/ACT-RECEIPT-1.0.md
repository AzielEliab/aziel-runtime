# ACT-RECEIPT-1.0 — public four-field action receipts

Author: Aziel Eliab only.

Status: LIVE fabric (2026-09-13). Not a Softwares-tab product. Not a FragGate slug. Operator-approved runtime plugin.

**NO-LIE / NO-REWRITE:** receipts that still hash. There is no rewrite key. Fail-open skip (no token / corpus dark) is a missing append, not a fake receipt. Companion [NO-LIE-NO-REWRITE-1.0](NO-LIE-NO-REWRITE-1.0.md).

---

Aziel Eliab · fabric · public mesh copy · corpus /receipts


    ACT-RECEIPT-1.0
    Four-field action receipts for FragGate / MCP / significant POST /v1/*

    Origin: https://www.azielcorpuslibrary.net/receipts
    Append: POST https://www.azielcorpuslibrary.net/v1/receipts/append
    Header: x-aziel-receipt  when RECEIPT_APPEND_TOKEN is set
    Fail-open: missing token or corpus dark must not break engines
    Identity: Aziel Eliab only


0. Sentence
An ACT receipt is a hash-chained public mesh copy of one act: what was asked,
what came back, and event metadata. The public chain lives on the Digital Library.
This runtime appends. It does not host the chain.

1. Claim
FragGate already lists and calls. POST /mcp already speaks JSON-RPC. Session and
mesh already mint local receipts. Those stay local truth.

This paper is the **public mesh copy**. After FragGate list/call, POST /mcp, and
significant POST /v1/*, the runtime may POST a four-field receipt to corpus
`/v1/receipts/append` when `RECEIPT_APPEND_TOKEN` is set. Header `x-aziel-receipt`
carries the token. MESH-VAULT lite may mint catalog / download / mesh events.

2. What it is not
•         Not a Softwares-tab product. Do not add slug act-receipt or receipts.
•         Not a FragGate engine. No fraggate_call { slug: "act-receipt" }.
•         Not a new MCP tool. PUBLIC_MCP_TOOLS stays frozen.
•         Not user, IP, or geo logging. Those fields are absent.
•         Not a Remain-OFF flip. Do not enable remain-off items.
•         Not hub UI chrome. This paper is runtime-only.
•         Not a substitute for session receipts, FragGate ledger, or ForgeReceipts.
•         Not public hostname resurrection. A pulled site dies with the pull. Die with the pull.
          Receipts do not bring godlock.uk or any public hostname back. Phoenix is wait / re-seal only.

3. Four fields

  Field              Law

  hash               SHA-256 of canonical { previous_hash, request, output, event }.
                     previous_hash is the prior tip, or 64 zero hex at genesis.

  request            One sentence. What was asked. No bodies, tokens, or PII.

  output             One sentence. What came back (status class). No response body.

  event              Metadata only: surface, path, method, status, tool, spec,
                     runtime version. No user / IP / geo.

4. Fail-open
If the token is missing, skip append. If corpus is dark or times out, skip append.
Engines still return. GET /v1/receipts still cites the public chain.

5. Optional read
GET /v1/receipts cites this paper and names the corpus origin.
GET /v1/receipts/tip and GET /v1/receipts/proxy are best-effort tip proxies.
They document that the public chain lives on corpus /receipts.

6. MESH-VAULT lite
Catalog GET /v1/software, pull / download, and POST /v1/mesh/* may mint an ACT
receipt when the token is set. This is not a Softwares vault product.
Software pull / download is a catalog event. It is not site resurrection.
A site pull (revoke token, drop Worker, kill DNS) ends the public mesh copy on
that hostname. cloudflared has nowhere legal to land. Local node may keep
verifying and appending. Mesh does not climb back onto the public hostname by
itself. Receipts do not restore godlock.uk. Phoenix is wait / re-seal after
poison or isolation — not “bring the .uk node back.”

7. Identity
Author / identity: Aziel Eliab only. Apache-2.0.

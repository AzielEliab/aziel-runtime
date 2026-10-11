# Document index backfill (LATTICE-DOC-UNIQUE-1.0)

Document rows written before LATTICE-DOC-UNIQUE-1.0 are not in the document index yet, so
a later copy of the same text could still be written once. The backfill claims each existing
row's content hash in the CHAINLOCK Durable Object index (`__docindex__`).

- Operator only. `POST` with the runtime token in a header (`Authorization: Bearer` or
  `X-Aziel-Runtime-Token`). A token in the query string is refused.
- Paged and resumable: `cursor` is the 1-based row to start from, `limit` is 1..100. Each
  response has `next_cursor` and `done`. Re-running a page is safe (the row id is the
  idempotency key; already-indexed rows count as `already`).
- Chains: `evidence`, `library`, `identity`. `caller` is the handle of a caller-scoped chain,
  or empty for the public chain.
- Fail closed: without the Durable Object it returns `LATTICE-DOC-INDEX-UNAVAILABLE` (503) and
  indexes nothing; the next run resumes from the returned cursor.
- Pre-existing doubles (the same text already stored by another user or chain) are listed in
  `doubles` with the row seq and id. Nothing is deleted or rewritten.

## Enumerating chains (no hand-made caller list)

`GET /v1/admin/doc-index/writers?cursor=0&limit=100` (same token header) lists every
`{ caller, chain }` pair to backfill, paged with `next_cursor` / `done`:

- the three public document chains (`caller` empty), always on the first page;
- every caller chain registered in the document index. A caller chain is registered the first
  time it claims a document (any write to evidence / library / identity after this deploy).

Limit: a caller chain whose only rows were written before this deploy, and that never writes
again, is not registered, and the Worker cannot list Durable Object names to find it. Its rows
are still checked whenever that caller writes again (that write registers the chain, and the
next backfill run picks it up). If an operator knows such a handle, the backfill route still
accepts it directly (`caller=<handle>`).

## How Chief runs it on prod

Run after the LATTICE-DOC-UNIQUE-1.0 deploy. It is safe to re-run end to end at any time.

```bash
export RT=https://<runtime host>          # the production runtime Worker
export TOKEN=...                          # RUNTIME_TOKEN (wrangler secret), never in the URL
H="Authorization: Bearer $TOKEN"
WCUR=0
while :; do
  PAGE=$(curl -fsS -H "$H" "$RT/v1/admin/doc-index/writers?cursor=$WCUR&limit=100") || { echo "writers stopped at $WCUR"; exit 1; }
  echo "$PAGE" | jq -c '.writers[]' | while read -r W; do
    C=$(echo "$W" | jq -r .chain); WHO=$(echo "$W" | jq -r .caller)
    CUR=1
    while :; do
      OUT=$(curl -fsS -X POST -H "$H" \
        "$RT/v1/admin/doc-index/backfill?c=$C&caller=$WHO&cursor=$CUR&limit=100") || { echo "stopped at $C/$WHO cursor $CUR"; break; }
      echo "$OUT" | jq -c '{chain,caller,cursor,indexed,already,doubles:(.doubles|length),next_cursor,done}'
      [ "$(echo "$OUT" | jq -r .done)" = "true" ] && break
      CUR=$(echo "$OUT" | jq -r .next_cursor)
    done
  done
  [ "$(echo "$PAGE" | jq -r .done)" = "true" ] && break
  WCUR=$(echo "$PAGE" | jq -r .next_cursor)
done
```

If a run stops, rerun it; already-indexed rows count as `already`. Keep the printed `doubles`
lines as the record of pre-existing doubles.

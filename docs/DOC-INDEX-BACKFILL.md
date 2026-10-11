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

## How Chief runs it on prod

Run it after the LATTICE-DOC-UNIQUE-1.0 deploy. Run the public chains first, then each known
caller handle.

```bash
export RT=https://<runtime host>          # the production runtime Worker
export TOKEN=...                          # RUNTIME_TOKEN (wrangler secret), never in the URL
for C in evidence library identity; do
  for WHO in "" $CALLERS; do              # CALLERS: space-separated caller handles
    CUR=1
    while :; do
      OUT=$(curl -fsS -X POST -H "Authorization: Bearer $TOKEN" \
        "$RT/v1/admin/doc-index/backfill?c=$C&caller=$WHO&cursor=$CUR&limit=100") || { echo "stopped at $C/$WHO cursor $CUR"; break 2; }
      echo "$OUT" | jq -c '{chain,caller,cursor,indexed,already,doubles:(.doubles|length),next_cursor,done}'
      [ "$(echo "$OUT" | jq -r .done)" = "true" ] && break
      CUR=$(echo "$OUT" | jq -r .next_cursor)
    done
  done
done
```

If a run stops, rerun the same loop starting at the printed cursor. Keep the printed `doubles`
lines as the record of pre-existing doubles.

# /v1/stats and /v1/uses

- **Cache (STATS-CACHE-1.0):** complete KV reads are cached for up to 60s; partial reads are never cached. Each response says `cache.read_at`, `cache.age_s` and `cache.max_age_s`.
- **Floor (STATS-FLOOR-1.0):** the served `uses` is lifted to a shared floor kept in the CHAINLOCK Durable Object (no KV). Across colos the count may lag by up to 10s; within an isolate it never drops. The 10s comes from STATS-FLOOR-REUSE-1.0: an isolate reuses its last floor read for an unchanged KV count while that read is under 10s old.
- **Fail closed:** no CHAINLOCK binding, an unreachable floor, or more than 6 floor calls per isolate per minute -> HTTP 503 with `Retry-After`, and no count.
- **Breakdown:** `by_host` / `by_path` / `by_day` / `by_method` / `by_op` are the raw KV read and may lag the total (`breakdown`).
- **Speed (USES-SNAPSHOT-1.0):** the request path reads three KV keys (`total`, `log`, `agg|snapshot`) and never scans. The cron rebuilds the per-host/path/day/method/op maps about every 2 minutes, resumably across ticks, and publishes them only after a full pass. Responses carry `maps_source`, `maps_snapshot_at`, `maps_age_s` and `maps_complete`; `uses` (the total) is always the live read. A snapshot older than 30 minutes is labelled stale.

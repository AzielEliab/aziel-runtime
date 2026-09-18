# Client update check (install.sh / local UI / mobile)

Public identity: **Aziel Eliab** only.

Hubs (`azieleliab.com`, `azielcorpuslibrary.net`, `godlock.uk`) refresh Software
tabs from the live runtime. Do not hand-edit hub copy after a GitHub drop.

## Authoritative catalog

```bash
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/software
```

Mirror (FragGate path):

```bash
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/fraggate/software
```

`one_line` is plain use-purpose (what you use the product for).
`description` is 1–3 short sentences: the job + why this software exists.
Do not write `THIS IS:` / `THIS IS NOT:` in those fields. Do not mash
`runtime X.Y` with `FragGate`. Softwares capability checklist:
`docs/audit/SUITE-CAPABILITY-CHECKLIST.md` (1.7.5 wave 1).
AKM-TRIAD-1.0 is LIVE fabric (`/v1/memory/*`, MCP `memory_*`), not a
Softwares-tab card — do not invent an `akm` product on hubs.

Each entry: `slug`, `name`, `bucket` (`plain` | `gate` | `lock`), `status`
(`live` | `stub` | `local_only`), `version`, `one_line`, `description`, `worker_home`, `download_url`,
`github`, `mcp` / `agent` path hints, `updated_at`, `git_sha` when the deploy
Action stamped one. Whitestone is `status: "live"` with `worker_only: true` and
`fraggate_status: "none"` (live Worker, not a FragGate engine).

Sort law: **Plain A–Z → Gate A–Z → Lock A–Z**. Clock ≠ Lock (StaticClock is
plain). Sibling software under **one FragGate door** — never “separate FragGate
engines”. EmbryoLock is included as `status: "live"` with `local_destructive_boundary: true` and `worker_home` `https://embryolock-download-tracker.vibelock.workers.dev/` (wipe/unlock stay FG-STUB on the public mesh). AZChat remains `status: "stub"`.

Softwares-tab `count` includes placements (`azinterface`, `decisiongate`,
`forgereceipts`, `azcoherence`, `zkattest`, `mmconsensus`, `toolbench`,
`azvpn`, `whitestone`).
Isolation `domains.software_count` is **33**
(`domains_are_doors: false`). See `count_note`. Do not equate the two.
In-runtime placements have `worker_home` null — do not invent a download-tracker.
Whitestone is Worker-only. Counted package is
`https://whitestone-download-tracker.vibelock.workers.dev/download`
(`worker_home` `https://whitestone-download-tracker.vibelock.workers.dev/`,
ARK-style). Live web app stays `https://whitestone.vibelock.workers.dev/`.
Do not invent FragGate ops for it.

`azcoherence` is Softwares-tab Plain (AZCoherence, AZC-0.1). Scoring-review
placement adjacent to AZ-CLCE. Not AKM-TRIAD fabric. Not a 34th MASTER-33
isolation software. Domain stays null (same pattern as `decisiongate` /
`forgereceipts`). Catalog + engine `cross_map` / `peers`: azclce (peer
scorer), AZInterface (human UI), AKM-TRIAD (fabric neighbor — not merged),
Softwares hubs, product Worker URL. `azclce` reciprocates.

## Update check

```bash
curl -s -A 'Mozilla/5.0' \
  'https://aziel-runtime.vibelock.workers.dev/v1/update/check?slug=foldlock&version=0.7.0'
```

Response:

```json
{
  "ok": true,
  "slug": "foldlock",
  "current": "0.7.0",
  "latest": "0.8.0",
  "update_available": true,
  "download_url": "https://foldlock-download-tracker.vibelock.workers.dev/download",
  "notes": "…"
}
```

`slug` may be a product, `embryolock`, or `aziel-runtime`. Aliases from the
catalog (e.g. `az-clce`, `embryo-lock`) resolve.

## Manifest (all latest versions)

```bash
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/update/manifest
```

## install.sh / local UI / mobile

1. Read installed version (`foldlock --version`, app settings, or package.json).
2. `GET /v1/update/check?slug=<product>&version=<installed>`.
3. If `update_available`, fetch `download_url` (counted Worker `/download`) or
   point the user at `github`.
4. Aziel Eliab Runtime itself has no counted tarball — `download_url` is null;
   pull GitHub or redeploy the Worker.

Always send `User-Agent: Mozilla/5.0`.

## Ban / blocked-endpoint failover (BAN-SURVIVAL-1.0)

If `workers.dev` or `POST /mcp` is banned or blocked, do **not** invent a
live door and do **not** claim the banned host is still LIVE.

1. Try the primary Worker: `https://aziel-runtime.vibelock.workers.dev`
   (`POST /mcp` or `POST /v1/fraggate/call`).
2. If that hostname or exec path fails (403 / 429 / 502 / 503 / network):
   try the next **named** hub `/runtime` prefix (same FragGate door via
   service binding — not a second door):
   - `https://www.azielcorpuslibrary.net/runtime`
   - `https://www.azieleliab.com/runtime`
   - `https://godlock.uk/runtime`
3. If exec is gone: remaining read surfaces still cite the tip
   (`GET /survival`, `/cite.json`, `/llms.txt`, `/shelves`, `/v1/mesh`,
   `/v1/software`, `/v1/health`). Mode is **DEGRADED**.
4. If the live CF tunnel is gone: verify lockset tip on GitHub / corpus
   `/shelves` / Codeberg + archive.org tip-packs (**SLOT**, hash-verify
   PASS). Plane C USB stays SLOT. `doi` null. Never invent LIVE.

Machine map: `GET /survival` (aliases `/v1/survival`, `/doors`, `/failover`).
Stdio MCP (`cli/mcp-stdio.mjs`) follows that order unless `--url` is pinned
or `AZIEL_RUNTIME_FAILOVER=0`.

Agent exec is still FragGate: `fraggate_list` → `fraggate_describe` →
`fraggate_call` (or `POST /mcp`). Catalog helpers do not exec.

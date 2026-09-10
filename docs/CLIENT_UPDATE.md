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

`one_line` is capability-forward (live act + refuse). Do not mash
`runtime X.Y` with `FragGate`. Softwares capability checklist:
`docs/audit/SUITE-CAPABILITY-CHECKLIST.md` (1.7.5 wave 1).
AKM-TRIAD-1.0 is LIVE fabric (`/v1/memory/*`, MCP `memory_*`), not a
Softwares-tab card — do not invent an `akm` product on hubs.

Each entry: `slug`, `name`, `bucket` (`plain` | `gate` | `lock`), `status`
(`live` | `stub`), `version`, `one_line`, `worker_home`, `download_url`,
`github`, `mcp` / `agent` path hints, `updated_at`, `git_sha` when the deploy
Action stamped one.

Sort law: **Plain A–Z → Gate A–Z → Lock A–Z**. Clock ≠ Lock (StaticClock is
plain). Sibling software under **one FragGate door** — never “separate FragGate
engines”. EmbryoLock is included as `status: "stub"` (name only; no Worker).

Softwares-tab `count` includes placements (`azinterface`, `decisiongate`,
`forgereceipts`). Isolation `domains.software_count` is **33**
(`domains_are_doors: false`). See `count_note`. Do not equate the two.

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

Agent exec is still FragGate: `fraggate_list` → `fraggate_describe` →
`fraggate_call` (or `POST /mcp`). Catalog helpers do not exec.

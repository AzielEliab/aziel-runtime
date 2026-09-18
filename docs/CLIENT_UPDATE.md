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

Live multi-front and cold shelves **back each other up**. Do not invent a
live door. Do not claim a banned host is still LIVE. Do not treat a
tip-pack as `/mcp`. Do not drop either backup. Door list = **LIVE only**;
shelves stay on the map as the death-by-ban backup.

1. Try the primary Worker: `https://aziel-runtime.vibelock.workers.dev`
   (`POST /mcp` or `POST /v1/fraggate/call`).
2. If that hostname or exec path fails (403 / 429 / 502 / 503 / network):
   try the next **LIVE** custom-domain hub `/runtime` prefix (same FragGate
   door via service binding — not a second door):
   - `https://www.azielcorpuslibrary.net/runtime`
   - `https://www.azieleliab.com/runtime`
   - `https://godlock.uk/runtime`
3. If one exec path is quarantined: remaining LIVE exec paths on remaining
   LIVE fronts still run.
4. If exec is gone on a front: remaining LIVE read surfaces on remaining
   LIVE fronts still publish the door map (`GET /survival`, `/cite.json`,
   `/llms.txt`, `/v1/software`, `/v1/health`). Mode on the banned front is
   **DEGRADED**.
5. If every named live front is gone (death-by-ban): verify the lockset
   tip on GitHub / corpus `/shelves` / Codeberg + archive.org SLOT packs.
   That is the **shelf backup**, not a live door.
6. Vice versa: if a shelf or alt-forge dies, keep the LIVE named fronts.

Live-node API (other mesh nodes as `/mcp`) is **SLOT** until a node
publishes an attested named FragGate origin. Do not treat `GET /v1/mesh`
`live_nodes` as an API roster.

Cap-7 cite (`GET /v1/mesh/az-generator` or MirageGrid `/bridge`) and
AZNet `stamp` / `verify_hash` stay **LIVE** via FragGate (name metadata
+ hash continuity). Cap-7/AZNet **hosted exec endpoints** stay **SLOT**.
Update shuffle: all nodes ping MirageGrid
(`fraggate_call { slug: "miragegrid", op: "shuffle" }`) until they land
on **one** distinct-name Cap-7 site — that landed site is the update
endpoint for that round. Do not hardcode a single Cap-7 host. Public
workers.dev shuffle stays **SLOT** (MirageGrid product follow-on).
Subset of Cap-7 is browser-reachable class; remainder is AZNet-side.
Do not invent a hosted door. Do not claim AZNet hosts payloads.
`radio_phy: false`. `resolves_to_hub: false`.

AKM-TRIAD-1.0 stays true on this stack: ranked adaptive recall vs
verified ChainLock (`belief_is_not_truth`; posterior ≠ truth);
`memory_get` append-only (no delete / overwrite); `memory_resolve`
additive stamps. stub_ops `model_update` / `rollback` / `rewrite` /
`delete_history` / `auto_update` stay refused.

Calling-name rotation is **discovery metadata only**. Pipeline:
trigger → mesh alert → metadata rewrite → client rediscovery. On honest
ban signals the public calling name may rotate (open-ended + random; no
hard cap at 6: Whitestone AI → Bills / Bills Runtime as needed → Runtime →
Eliab Runtime → Potato Runtime → Elroi Runtime → Softwares-family
`*-runtime` → endless distinct names, including `BAN_SURVIVAL_NAME_RANDOM`
alongside the seeds). On trigger, rewrite **all** live discovery metadata
(OpenAPI `info`, MCP name/instructions, cite/llms/ai/who-is/person calling
strings, `/survival` live product, Softwares vanity, hub-facing runtime
labels) so the banned name is not the live call target. Live mesh nodes
pull `*new name alert: <name>` from `GET /v1/mesh` and `GET /survival`
(GET never enables; not a publish path). User-uploaded data is a
DecisionGATE/AKM observe signal — unmarked uploads are not a ban. Call
routes stay `POST /mcp` / `POST /v1/fraggate/call`. Identity stays Aziel
Eliab. No ChainLock / AKM rewrite. No third-party trademarks.

Platforms are **LIVE** on every listed OS — Windows, Mac, Linux,
Android, iPhone — via browser + PWA (`/manifest.webmanifest`) + Worker
fronts + Softwares `/download` + MCP/OpenAPI. Not native store apps.

Machine map: `GET /survival` (aliases `/v1/survival`, `/doors`, `/failover`).
`live_doors` / `exec_origins` omit blocked fronts. Hubs (ae / corpus /
godlock / HDJ) pull that SoT for live doors + `*new name alert:` rather
than hardcode — follow-on hub PRs, not this repo. Stdio MCP
(`cli/mcp-stdio.mjs`) follows the live-front order unless `--url` is pinned
or `AZIEL_RUNTIME_FAILOVER=0`.

Agent exec is still FragGate: `fraggate_list` → `fraggate_describe` →
`fraggate_call` (or `POST /mcp`). Catalog helpers do not exec.

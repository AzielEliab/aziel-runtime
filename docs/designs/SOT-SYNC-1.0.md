# SOT-SYNC-1.0 — one suite tip, every outlet

Author: Aziel Eliab only.

Status: draft in this runtime. Not deployed. Not a Softwares-tab product. Not a new `tools/list` name.

`mesh_broadcast` remains a SHA-256 receipt. It does not publish catalog bodies. `live_body_sync` stays false. This paper is the pull plane that carries the suite tip.

## Authority

The live Worker `GET /v1/software` is the source of truth for:

- suite version (`version`)
- git sha (`git_sha`)
- Softwares count (`count`)
- card versions (`software[].slug` + `software[].version`)

`GET /v1/health` publishes the same suite version constant. It does not publish `version_id`. This plane cites `version_id: null` and does not invent one.

Ask Jeeves is suite help on Aziel Corpus (`software_tab: false`, FragGate op `jeeves`, interface `jeeves_help`). It is not a Softwares card and it is not counted in `count`.

In-process, this Worker is the live catalog. A separate `live_base` pull is used only when the operator sets an allowlisted https host. If that pull fails and a last-known tip exists, the last-known tip is kept. If none exists, the sync refuses `SOT-UNREACHABLE` and does not fill a count.

## Doors

| Door | Call |
| --- | --- |
| HTTP read | `GET /v1/mesh/sot`, `GET /v1/mesh/outlets` |
| HTTP mutate | `POST /v1/mesh/sot-sync` with `dry_run: true` or `confirm: true` |
| FragGate | `fraggate_call` `{ slug: "mesh", op: "outlets" \| "sot-status" \| "sot-sync" }` |
| Interface | `POST /v1/interface` calls `mesh_outlets`, `mesh_sot_status`, `mesh_sot_sync` |

Missing `dry_run` and `confirm` returns `SOT-CONFIRM-REQUIRED` and writes nothing. `dry_run` wins when both are set. Confirm runs DecisionGATE on a fixed proposal. A block returns `SOT-GATE-BLOCK` and writes nothing. A pass mints ACT-RECEIPT-1.0 (`hash`, `request`, `output`, `event`) and fail-open appends to the corpus chain when `RECEIPT_APPEND_TOKEN` is set.

`tools/list` stays the 36 `PUBLIC_MCP_TOOLS`. Promoting `mesh_outlets` / `mesh_sot_status` / `mesh_sot_sync` onto that list is a later additive minor (cap 40). This draft does not do that.

Nodes, Live Nodes, download counters, and `mesh_broadcast` are unchanged.

## Outlet registry

Each outlet has `id`, `kind`, `pull_url` or a push contract, `last_applied`, `last_known`, and `status`.

Status is `ok` (exposed tip fields match), `drifted` (an exposed field differs), `unreachable` (pull or hook failed), or `unexposed` (the body did not contain the field). A missing field is not copied from the SoT.

Static outlets, addressed by the mesh:

| id kind | pull |
| --- | --- |
| `{hub}-cite` | hub `cite.json` for azieleliab.com, azielcorpuslibrary.net, godlock.uk |
| `{hub}-llms` | hub `llms.txt` |
| `{hub}-catalog` | hub Softwares catalog URL already published in `softwareHubCrawl()` |
| `azieleliab-jsonld` | `https://www.azieleliab.com/person.jsonld` |
| `corpus-runtime-mirror` | `https://www.azielcorpuslibrary.net/runtime/v1/software` |
| `runtime-frozen-cite` | stamped `BUILD_GIT_SHA` and `RUNTIME_VERSION` in this repo (source files are not rewritten) |
| `mesh-sot-ledger` | this runtime's ledger (`GET /v1/mesh/sot`) |
| `mesh-{node_id}` | a joined node that sent allowlisted `outlet_hook` |

`dry_run` returns every outlet and `fields[]` (`suite_version`, `git_sha`, `softwares_count`, `version_id`, `software_versions`) with `would_change`.

Confirm updates `last_applied` when:

- the outlet is the mesh ledger
- the probed fields already match the tip
- `push_url` accepts the tip POST

An unreachable outlet does not get a new inventory. `last_known` stays the previous successful observation, or null. No Softwares row is added.

## Push contract (sister repos)

Hubs do not get a push until they serve this hook. The documented URL is `{origin}/v1/mesh/outlet` (not called while `push_url` is null).

```json
{
  "spec": "SOT-SYNC-1.0",
  "outlet_id": "godlock.uk-catalog",
  "author": "Aziel Eliab",
  "identity": "Aziel Eliab",
  "live_body_sync": false,
  "mesh_broadcast": false,
  "pull": "/v1/software",
  "version_id": null,
  "tip": {
    "suite_version": "2.0.0-rc1",
    "git_sha": "<catalog git_sha>",
    "softwares_count": 42,
    "version_id": null
  },
  "software_versions": { "<slug>": "<version>" }
}
```

Success is HTTP 200 with `ok` not false. The hook should then render cites from that tip, or ignore the body and pull `GET /v1/software` on the runtime. It must not invent a 43rd Softwares card. Ask Jeeves stays off the Softwares tab.

Joined product nodes advertise the same hook with `POST /v1/mesh/join` field `outlet_hook` (https, hub host or `*.vibelock.workers.dev`). Any other host is refused `SOT-HOOK-HOST` and is not fetched. Join still registers presence. Roster pills ignore the hook.

## Sister adapters still required

This repo is the fan-out hub. These surfaces become outlets by implementing the hook (or by pulling `GET /v1/software` on each render and exposing `suite_version`, `git_sha`, and `softwares_count`):

- AzielEliab/azieleliab — draft cite work is PR #81. JSON-LD, `cite.json`, and `llms.txt` on www.azieleliab.com.
- AzielEliab/godlock — draft cite work is PR #94. Softwares tab and runtime cites on godlock.uk.
- AzielEliab/aziel-corpus — corpus `/cite.json`, `/llms.txt`, and `/runtime` should read this tip. A down library keeps the last-known shelf. It does not invent rows.
- VeilLock, AZChat, and other product Workers — send `outlet_hook` on mesh join when the product cites the suite sha. No adapter is invented here.

## Local check

```bash
npm test
```

`scripts/verify-sot-sync.mjs` covers the dry run, the confirm receipt, an unreachable outlet that keeps a one-card last-known inventory, Softwares count 42, and `version_id` null.

This change is draft-only. It is not merged and not deployed.

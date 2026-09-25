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

Missing `dry_run` and `confirm` returns `SOT-CONFIRM-REQUIRED` and writes nothing. A bearer or other header is not confirm. Confirm is operator consent, not tenant auth. `dry_run` wins when both are set. Confirm runs DecisionGATE on a fixed proposal. A block returns `SOT-GATE-BLOCK` and writes nothing. A pass mints one ACT-RECEIPT-1.0 (`hash`, `request`, `output`, `event`). HTTP `POST /v1/mesh/sot-sync`, FragGate `sot-sync`, and interface `mesh_sot_sync` return that same receipt. The interface path does not mint a second one. Append to the corpus chain is fail-open when `RECEIPT_APPEND_TOKEN` is set.

Outlet probes run together. A down pull is `unreachable` and keeps `last_known`. The other outlets still update. The desk does not wait on one site before painting the rest, and a failed refresh leaves the last matrix on screen.

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

Confirm posts only to a hook that already answers, and only in the shape that hook accepts. A generic tip body is used for a joined `outlet_hook`. The three shipped adapters are different.

Hub `hub-azieleliab` — `POST https://www.azieleliab.com/v1/mesh/outlet/sync`:

```json
{ "spec": "SOT-SYNC-1.0", "outlet_id": "hub-azieleliab", "author": "Aziel Eliab", "identity": "Aziel Eliab", "confirm": true }
```

No `sot_sync` object is sent. The hub re-pulls `GET /v1/software` and writes only when that pull is usable. A signature is not a license to invent the tip.

GodLock `godlock-uk` — `POST https://godlock.uk/v1/sot/push`:

```json
{
  "spec": "SOT-SYNC-1.0",
  "op": "sot_sync",
  "outlet_id": "godlock-uk",
  "author": "Aziel Eliab",
  "identity": "Aziel Eliab",
  "confirm": true,
  "version": "2.0.0-rc1",
  "git_sha": "<40 hex from GET /v1/software>",
  "count": 42,
  "version_id": null
}
```

`software` cards are not sent. `version_id` stays null.

Corpus — public `GET https://www.azielcorpuslibrary.net/v1/mesh/outlet` is a pull. `POST /v1/mesh/outlet` requires `X-Aziel-Operator-Token`. This runtime does not hold that token and does not send one. `push_url` stays null.

Success is HTTP 200, `ok` not false, and `applied` not false. `applied: false` keeps last-known and is not a write.

Joined product nodes advertise a hook with `POST /v1/mesh/join` field `outlet_hook` (https, hub host or `*.vibelock.workers.dev`). Any other host is refused `SOT-HOOK-HOST` and is not fetched. Join still registers presence. Roster pills ignore the hook.

## Stack

This runtime draft sits on PR #169 (`cursor/audit-stack-5b75`), which sits on PR #168 (`cursor/interface-orchestrator-15a4`). The Aziel Elroi Eliab label is a top-bar domain tab. Corpus is a sub-tab of `#elroi-pane`. It is not a top-bar peer.

## Sister adapters

- AzielEliab/azieleliab #81 is merged. Write outlet `hub-azieleliab`. Cite, llms, catalog, and JSON-LD rows stay pull probes.
- AzielEliab/godlock #94 is merged. Write outlet `godlock-uk`. Catalog pull `https://godlock.uk/runtime/v1/software` stays a probe.
- AzielEliab/aziel-corpus #144 is merged. Pull outlet `corpus-mesh-outlet`. POST stays off until an operator token exists outside this fan-out. A down library keeps the last-known shelf and does not invent rows.
- VeilLock, AZChat, and other product Workers — send `outlet_hook` on mesh join when the product cites the suite sha. No adapter is invented here.

## Local check

```bash
npm test
```

`scripts/verify-sot-sync.mjs` covers the dry run, the confirm receipt, an unreachable outlet that keeps a one-card last-known inventory, Softwares count 42, and `version_id` null.

This change is draft-only. It is not merged and not deployed.

# AZRT audit — Cap-7 / Softwares honesty

**Date:** 2026-10-01 (audit of the 2026-09-30 tip)
**Repo:** AzielEliab/aziel-runtime
**Audited tip:** `92abb1b67b422446e33df0e83a5feef7fbd082b0`
**Tip subject:** Ship Cap-7 geo, sticky, and rotate as control-plane LIVE (#196)
**Suite version:** `2.0.0-rc1` (`package.json`, `src/runtime-api.js` `RUNTIME_VERSION`)
**Live deploy checked:** `GET https://aziel-runtime.vibelock.workers.dev/v1/software` returned `git_sha` `92abb1b67b422446e33df0e83a5feef7fbd082b0`, `updated_at` `2026-09-30`, `count` 42
**Glama:** not modified

## Executive summary

The #196 Cap-7 control-plane cut on tip `92abb1b` is honest about what FragGate executes. Softwares slug `miragegrid` is the only MirageGrid card. `public_door_ops` include `geo-target`, `session-stick`, and `egress-rotate`. `stub_ops` are `vpn-hop`, `hop`, `tunnel`, and `mesh`. Dry-run admits the three LIVE ops and refuses the four stubs as `FG-STUB`. Responses keep `public_egress_ip`, `hosted_vpn`, `azvpn`, and Cap-7 `public_icann` false. AZVPN WireGuard / OpenVPN / L3 stay SLOT. `tools/list` is 36. Softwares count is 42. No open pull requests.

One public cite on that tip was false. Softwares `description`, skill, doctor, `/llms.txt`, the runtime skill, and `GET /v1/mesh` survival copy said the public MirageGrid Worker stays unclaimed until MirageGrid pull request 28 lands, and stamps set `miragegrid_pr_landed: false`. [MirageGrid #28](https://github.com/AzielEliab/miragegrid/pull/28) merged as `6d0bd3471e29af5ad8ab37573bb4ac9ff0b21dcb` at 2026-09-30T18:29:55Z, thirty seconds before #196. Both public workers answer `GET /v1/health` as version `0.3.0` with `cap7_control_plane.live: true` and `public_egress_ip: false`. That under-claim is a NO-LIE fail on a public Softwares cite. This branch corrects the sentence and sets `miragegrid_pr_landed: true`. It does not flip `worker_live` or `hosted` on the in-process stamp, and it does not claim a public egress IP.

The known version drift is still true and is a WARN. The Softwares card and the counted download stay `0.2.0` (`miragegrid-0.2.0.tar.gz`). Worker health says `0.3.0`.

| Result | Count |
| --- | ---: |
| PASS | 12 |
| WARN | 5 |
| FAIL | 1 (corrected in this branch; not left on the tip) |

## Findings

| ID | Result | Finding | Evidence |
| --- | --- | --- | --- |
| T1 | PASS | Default-branch tip is #196. Suite stays `2.0.0-rc1`. | `git rev-parse origin/main` = `92abb1b67b422446e33df0e83a5feef7fbd082b0`. `package.json` `version`. Live `/v1/software` `git_sha` matches. |
| T2 | PASS | Recent Softwares / FragGate / MirageGrid / Cap-7 merges are #194, #195, #196. No open PRs. No open issues. | `gh pr list`: #196 `92abb1b` Cap-7 LIVE; #195 `781e555` update/manifest cites; #194 `604fab1` mesh-name factory, not an ICANN registrar. `gh pr list --state open` empty. `gh issue list --state open` empty. |
| S1 | PASS | One Softwares slug, `miragegrid`. Card ops match the door. `one_line` says Cap-7 plane LIVE, not a public egress IP. | `src/software-copy.js` `miragegrid.one_line`. `src/fraggate/registry.js` `LIVE_OPS.miragegrid` and `STUB_OPS.miragegrid`. Live `/v1/software` card `public_door_ops` = assign, verify-receipt, nodes, bridge, shuffle, health, skill, doctor, geo-target, session-stick, egress-rotate. `stub_ops` = vpn-hop, hop, tunnel, mesh. `worker_home` = `https://miragegrid-download-tracker.vibelock.workers.dev/`. Catalog has no `planned.fraggate_stubs` field; named refuses are `stub_ops`. Local `softwareCatalog` count 42; `PRODUCTS` length 41 plus the whitestone tab card. |
| S2 | PASS | FragGate dry-run and live classify match the expected split. | Local `classifyCall` / `previewCatalogAdmission` on tip code: geo-target, session-stick, egress-rotate `kind=live`, `proceed=true`. vpn-hop, hop, tunnel, mesh `proceed=false`, code `FG-STUB` (`src/fraggate/door.js` `classificationRefuse`). route and circuit are not public ops: `FG-UNKNOWN-OP`. Registry `ops` for miragegrid do not include route, circuit, or mesh (`publicOps` in `src/fraggate/registry.js`). |
| S3 | PASS | LIVE ops return Cap-7 metadata and refuse address-shaped input. They do not return an egress IP. | `src/engines/miragegrid/cap7-plane.js`. Local exec: region `booth-east` → `CAP7-GEO-TARGET`, `geo_applied: false`, `public_egress_ip: false`, `egress_ip: null`, `hosted_vpn: false`, `azvpn: false`, `public_icann: false`. Region `203.0.113.8` → `MG-NOT-PUBLIC-EGRESS` (not `FG-STUB`). `sticky_key` `booth-1` → `node-21`, `sticky_ip: false`, stable on repeat. `sticky_ip: true` → `MG-NOT-PUBLIC-EGRESS`. `egress-rotate` `prev=azgrid` → land `azbooth`, `icann_publish: false`, `packet_forwarding: false`. Other refuses: `MG-GEO-NEED-LABEL`, `MG-STICKY-NEED-KEY`, `MG-STICKY-TTL-NOT-A-STORE`, `MG-BAD-SESSION-ID`. |
| S4 | PASS | Cross-product locks hold. No public egress / sticky public IP / Cloudflare geo-exit / hosted VPN / AZVPN / Cap-7 ICANN flag is LIVE. | Cap-7 stamps in `cap7-plane.js`, `src/fed-mesh/bearers.js` `cap7-mesh-dns`, `src/fed-mesh/aznet-layers.js` `l2Cap7Stamp`: `public_egress_ip: false`, `public_icann: false`, `dns_publish: false`, `factory_exec: true`, `status: live`. AZ-domain `public_icann: true` is the hub HTTPS path in `src/cap7-shuffle.js`, separate from Cap-7 names. AZVPN `src/engines/azvpn/engine.js`: HTTPS/WS live; `wireguard` / `openvpn` / `l3_exit` are `STUB_OPS` with `AZVPN-SLOT-*`. Softwares `azvpn` one_line does not claim a packet egress pool. `tools/list` `PUBLIC_MCP_TOOLS.length` = 36 (`src/fraggate/codes.js`). |
| S5 | PASS | Live public Softwares cite matches the tip card, including the three LIVE ops. | `GET /v1/software` on `aziel-runtime.vibelock.workers.dev` at audit time: miragegrid `version` `0.2.0`, digest `cea1854f20a807360d68c3b223343088abe09941ae77e406fd45ee4fe1d1126c` (`src/engines/digest.js`), same ops as the repo. `GET /v1/update/check` without `slug` is specified as `slug required` (`src/software-catalog.js` `updateCheck`). `GET /v1/manifest` is not the machine manifest; `runtime_manifest` is `GET /v1/runtime.json` (`src/index.js`). |
| S6 | PASS | Security skim of Softwares copy: no new public egress IP, sticky public IP, Cloudflare geo-exit, or AZVPN enable toggle. | `src/software-copy.js` miragegrid description keeps “not a public egress IP, not ICANN DNS, and not AZVPN.” `PACKET_KEYS` in `cap7-plane.js` refuse egress_ip, sticky_ip, socks, vpn, hosted_vpn, packet_forwarding. Worker health (below) agrees: `cf_geo_exit_pool: false`, `sticky_public_ip: false`. |
| F1 | FAIL | Tip told the public that MirageGrid pull request 28 had not landed. It had. | On `92abb1b`, `src/software-copy.js`, `src/engines/miragegrid/ops.js` skill/doctor, `src/engines/miragegrid/cap7-plane.js` (`miragegrid_pr_landed: false`), `src/index.js` llms line, `src/runtime-api.js` skill, `src/fed-mesh/bearers.js`, and `src/fed-mesh/aznet-layers.js` said the Worker “stays unclaimed until MirageGrid pull request 28 lands.” `gh pr view 28 --repo AzielEliab/miragegrid`: state MERGED, merge `6d0bd3471e29af5ad8ab37573bb4ac9ff0b21dcb`, 2026-09-30T18:29:55Z. #196 merged 2026-09-30T18:30:25Z and its body still said the PR was open (`main` still `49cbe9a`). Worker `GET /v1/health` on both `miragegrid.vibelock.workers.dev` and `miragegrid-download-tracker.vibelock.workers.dev`: `version` `0.3.0`, `cap7_control_plane.live: true`, `public_egress_ip: false`, `hosted_vpn: false`, `planned.hosted: true`, `planned.worker_live_ops` = the three ops, `planned.fraggate_stubs` = vpn-hop, hop, tunnel, mesh. **Corrected in this branch:** `miragegrid_pr_landed: true`, `miragegrid_pr_merge` set to that SHA, and the public sentences now say the pull request has landed. `worker_live` and `hosted` stay false on the in-process stamp. `worker_doors_live: true` records that the Worker doors are live without calling this FragGate body a hosted egress. |
| W1 | WARN | Softwares `miragegrid` `version` is still `0.2.0` while Worker health is `0.3.0`. Ops and `one_line` were already correct. Still true. | `src/catalog-meta.js` `VERSIONS.miragegrid` = `0.2.0`. `src/engines/miragegrid/engine.js` `VERSION` = `0.2.0`. Live card `version` `0.2.0`. Counted download `content-disposition` filename `miragegrid-0.2.0.tar.gz`. `GET /v1/update/check?slug=miragegrid&version=0.3.0` returns `latest: 0.2.0`, `update_available: false`, notes “MirageGrid 0.2.0 is current.” The card matches the tarball. It does not match Worker `/v1/health`. Left unchanged. |
| W2 | WARN | Repo-root `CHANGELOG.md` and `docs/2.0/CHANGELOG.md` keep older `2.0.0-rc1` bullets that contradict the tip. | Under `## 2.0.0-rc1 (current)`, the #195 bullet still says “Cap-7 geo / session-stick / egress-rotate / vpn-hop stay FG-STUB.” The #194 bullet still says those three “stay planned” and “stay off `public_door_ops`.” An older bullet still says “Cap-7 mesh DNS and home-origin SLOT.” `CHANGELOG.md` around the 2026-09-24 operator note still swaps decoys (`azbooth` / `azflag` as real duplications). Code SoT is `src/cap7-shuffle.js`: real `azgrid`, `azcloak`, `azvault`, `azshift`; false sites `azbooth`, `azflag`, `azstandby`. This branch adds a lead bullet and a line that the newest bullet is the current cite. The old bullets stay as history. |
| W3 | WARN | `docs/designs/FED-MESH-1.0.md` still paints L2 as cite-and-refuse and `cap7-mesh-dns` as SLOT. | Paper table rows: “Cite and refuse only” and “SLOT. Mesh-only. Not this implementation.” (`docs/designs/FED-MESH-1.0.md` layers and survival tables). Live code and `docs/NODE_MESH.md` say `cap7-mesh-dns` is LIVE factory exec, `public_icann` false, not a public egress IP. |
| W4 | WARN | `docs/designs/AZL-VOL-1.0.md` is a frozen 1.6.13 catalog, not the live Softwares cite. | Header: “runtime 1.6.13 · registry 3de5ed2e23ae9a76 · 2026-09-06”. MirageGrid row: version `0.2.0`, live ops assign / health / skill only. It omits bridge, shuffle, and the Cap-7 plane ops. Not served as `GET /v1/software`. |
| W5 | WARN | Raw session HTTP can run engine ops the public door refuses. MCP session exec does not. | `POST /v1/session/{id}/exec` (`src/session-http.js` `handleExec`) calls `executeLocal` without `classifyCall`. `runMiragegrid` implements `mesh`, `route`, and `circuit` (`src/engines/miragegrid/ops.js`); local `mesh` returns loopback `127.0.0.1` topology, version `0.2.0`. `vpn-hop` is `unsupported` and then falls through to a product-worker proxy. MCP `runtime_session_exec` enters FragGate first (`src/index.js` `enterFragGate`) and dry-run returns `FG-STUB` for `vpn-hop`. Not a Softwares-card lie. Not a new egress toggle. |

## Door matrix (tip, confirmed locally)

| Op | Door | dry_run | Live result shape |
| --- | --- | --- | --- |
| geo-target | LIVE | proceed | `CAP7-GEO-TARGET` or `MG-NOT-PUBLIC-EGRESS` / `MG-GEO-NEED-LABEL` |
| session-stick | LIVE | proceed | `CAP7-SESSION-STICK` or `MG-NOT-PUBLIC-EGRESS` / `MG-STICKY-NEED-KEY` / `MG-STICKY-TTL-NOT-A-STORE` / `MG-BAD-SESSION-ID` |
| egress-rotate | LIVE | proceed | `CAP7-EGRESS-ROTATE` or `MG-NOT-PUBLIC-EGRESS` |
| vpn-hop, hop, tunnel, mesh | STUB | `FG-STUB` | no handler |
| route, circuit | not public | `FG-UNKNOWN-OP` | engine still has the functions; the door does not list them |

## Worker health vs Softwares (observed 2026-10-01)

| Surface | Version | Cap-7 plane | public_egress_ip | Notes |
| --- | --- | --- | --- | --- |
| Softwares card on tip and on the live runtime | 0.2.0 | three ops in `public_door_ops` | false on the in-process stamp | digest `cea1854f…` |
| `miragegrid.vibelock.workers.dev/v1/health` | 0.3.0 | `cap7_control_plane.live` true | false | app worker |
| `miragegrid-download-tracker.vibelock.workers.dev/v1/health` | 0.3.0 | `planned.live` true, `planned.hosted` true | false | `planned.softwares_catalog_live` still false; `softwares_note` still waits on “AZBot CLEAR after deploy” even though the runtime catalog on `92abb1b` already lists the three ops |
| Counted `GET /download` | filename `miragegrid-0.2.0.tar.gz` | — | — | card version matches this file, not health |

## Residual risks

- Worker `planned.softwares_catalog_live: false` is now stale relative to the runtime catalog. That flag lives in AzielEliab/miragegrid, not in this repo.
- In-process `worker_live: false` and `hosted: false` mean this FragGate body is not the product Worker and not a hosted egress. `worker_doors_live: true` is the machine-readable “Worker doors are up” bit. A reader who only checks `worker_live` can still under-read the Worker.
- Changelog and `FED-MESH-1.0.md` can still be quoted as if Cap-7 geo were FG-STUB or SLOT.
- Raw `POST /v1/session/{id}/exec` does not apply `FG-STUB` before `executeLocal`.
- Catalog version `0.2.0` will keep saying “current” to a client that installed Worker health `0.3.0`.

## Optional fix scopes

**A — done in this branch.** Public cite no longer says pull request 28 is unlanded. `miragegrid_pr_landed` is true. Merge SHA is `6d0bd3471e29af5ad8ab37573bb4ac9ff0b21dcb`. `public_egress_ip`, `hosted_vpn`, `azvpn`, and Cap-7 `public_icann` stay false. `vpn-hop` / `hop` / `tunnel` / `mesh` stay `FG-STUB`. `worker_live` and `hosted` stay false on the in-process stamp. `worker_doors_live` is true. No Glama file edits. Suite stays `2.0.0-rc1`. `tools/list` stays 36.

**B — not done.** Bump Softwares `miragegrid` version from `0.2.0` to `0.3.0` only when the counted download filename and the in-process engine are actually `0.3.0`. Doing it now would make `update/check` disagree with `miragegrid-0.2.0.tar.gz`.

**C — not done.** Relabel or move superseded Cap-7 bullets out of the undifferentiated `2.0.0-rc1 (current)` changelog lists, and update `docs/designs/FED-MESH-1.0.md` so L2 / `cap7-mesh-dns` matches `src/fed-mesh/bearers.js` (LIVE factory exec, not ICANN, not a public egress IP). `AZL-VOL-1.0.md` should stay marked as the 1.6.13 volume.

## Checks run

- `node scripts/verify-software.mjs`
- `node scripts/verify-peer-bearers.mjs`
- `node scripts/verify-aznet-layers.mjs`
- `node scripts/verify-2.0-rc1.mjs`
- `node scripts/verify-fraggate.mjs`

All five exited 0 after the cite correction.

# BAN-SURVIVAL-1.0 — mutual backup (live multi-front ↔ cold shelves)

Author: Aziel Eliab only.

Status: LIVE law (2026-09-18). Not a Softwares-tab product. Not a FragGate slug. Remain-OFF untouched.

Companion under the umbrella: [CROSS-NETWORK-SURVIVAL-1.0](CROSS-NETWORK-SURVIVAL-1.0.md) (does not replace the machine tip). Neighbor: [NO-LIE-NO-REWRITE-1.0](NO-LIE-NO-REWRITE-1.0.md), [COLD-MULTI-SHELF-1.0](COLD-MULTI-SHELF-1.0.md), [SPORE-1.0](SPORE-1.0.md) (power-loss face). Mesh rollup: [NODE_MESH](../NODE_MESH.md). Executable: `src/ban-survival.js`.

---

Aziel Eliab · law · named hosts only · FragGate stays the door


    BAN-SURVIVAL-1.0
    Survive survive survive — grow. Live multi-front and cold shelves
    back each other up. One banned door is not last tip gone. One dead
    shelf is not last live door gone. Never invent a live door.
    Never lie to survive.

    Identity: Aziel Eliab only
    Close tests: scripts/verify-ban-survival.mjs


0. Sentence
A Cloudflare / WAF / API ban of **one** public door (workers.dev, `/mcp`,
a FragGate path) is a **surface** death, not the runtime gone. Clients get
an honest map with **both** backups:

- **Live multi-front** (workers.dev + custom-domain hub `/runtime` + path
  quarantine) is the backup when a **cold shelf / forge dies** (Zenodo
  IP-ban class).
- **Cold shelves** (GitHub + `GET /shelves` + Plane B SLOT packs + USB)
  are the backup when **death-by-ban** takes the public door set.

They back each other up. **Cold shelves are the backup for death-by-ban.
Live multi-front is the backup for cold-shelf death.** Keep both. Do not
drop shelves. Do not discard the shelf layer. Do not make shelves the
only answer. Do not make multi-door the only answer. Prefer honest
**DEGRADED** on a banned front. Do not paint a banned host LIVE. Do not
paint a tip-pack as `/mcp`. There is no `BAN-NO-SHELF-FAILOVER` refuse —
that name encoded the AZBot misread. Law codes are `BAN-NO-SHELF-ONLY`
(shelves are not `/mcp`) and `BAN-NO-DOOR-ONLY` (do not drop shelves).

1. Claim
Zenodo already showed a Plane B death mode (`CNS-ZENODO-NOT-LIVE`). That
is why live multi-front exists — so a dead shelf does not kill clients
who can still reach a named door.

The same class of death can hit the public Worker: one CF/WAF rule, one
blocked `/mcp`, or LLM/OpenAPI hammering that gets an endpoint banned.
That is why cold shelves exist — so a banned door does not erase the
tip. Hash-verify is not exec. A tip-pack is not `/mcp`. Both are still
required.

This paper is the **mutual-backup** companion under CROSS-NETWORK-SURVIVAL.
It does not invent a second FragGate door, a secret backdoor, an unmarked
hydra, a LIVE Plane B/C, or a fake live door.

2. Mutual backup (exact)

  Layer                         Backs up                                 Is not

  Live multi-front              Cold-shelf death (one forge/IP ban)      The only answer;
  (workers.dev + custom-domain                                           not four independent
  hub /runtime + quarantine)                                             blast-radius doors
  Cold shelves                  Death-by-ban (API / CF / LLM door        A live exec door;
  (GitHub / /shelves / SLOT     banned or blocked)                       not `/mcp`
  tip-packs / USB)
  Live-node API via mesh        Complete Worker/API failure, **if**      Not LIVE yet.
  roster                        a node publishes an attested named       SLOT until attest.
                                FragGate origin + hash/receipt           No open proxy.
  Cap-7 + AZNet                 Name-metadata cite + hash verify         Hosted exec endpoints
                                when a public door is banned;            SLOT. AZNet never
                                update shuffle ping→land                 hosts payloads.
                                (distinct mesh names)                    No fake ICANN `.az`.
                                                                         No hardcoded host.

Hub `/runtime` on azielcorpuslibrary.net, azieleliab.com, and godlock.uk
is the **same FragGate door** via service binding — not a second door and
not a sixth shelf (`CNS-RUNTIME-NOT-SHELF`). Counting those four as four
independent blast-radius doors is a lie (`BAN-NO-HYDRA` /
`CNS-PLANE-A-ONE-TUNNEL`). They **are** four named live fronts: a ban of
one hostname or path must not strand clients on that dead endpoint.

Dropping shelves refuses `BAN-NO-DOOR-ONLY`. Treating shelves as a live
exec door refuses `BAN-NO-SHELF-ONLY`. An open proxy to random mesh
nodes refuses `BAN-NO-OPEN-NODE-PROXY`. Faking a Cap-7 hosted
`/mcp` or ICANN `.az` refuses `BAN-NO-FAKE-CAP7-HOST`. Claiming AZNet
hosts payloads refuses `BAN-NO-AZNET-PAYLOAD-HOST`.

3. Client order (LLM / MCP / OpenAPI)

`live_doors` / `exec_origins` = **LIVE doors only**. A blocked front is
listed as blocked, not as a live exec origin. Shelves stay on the map
as the death-by-ban backup — they are not mixed into `exec_origins`.

1. Try primary Worker exec: `POST https://aziel-runtime.vibelock.workers.dev/mcp`
   or `POST …/v1/fraggate/call`.
2. If that hostname or exec path is blocked (403 / 429 / 502 / 503 /
   network): try the next **LIVE** custom-domain hub `/runtime` prefix.
   Order: library → author → godlock. Same FragGate door.
3. If one exec path is quarantined: remaining **LIVE** exec paths on
   remaining **LIVE** fronts still run.
4. If exec is gone on a front: remaining **LIVE** read surfaces on
   remaining **LIVE** fronts still publish this map (`/survival`,
   `/cite.json`, `/llms.txt`, `/v1/health`, `/v1/software`, `/v1/mesh`).
   Mode on the banned front is **DEGRADED**.
5. Cap-7 cite (`GET /v1/mesh/az-generator` or MirageGrid `/bridge`) and
   AZNet `stamp` / `verify_hash` / `receipt_verify` stay **LIVE** via
   FragGate — name metadata and hash continuity, not a hosted `/mcp`.
6. Cap-7 update shuffle: all nodes ping MirageGrid until they land on
   **one** Cap-7 site (distinct mesh names; `name_may_change`). That
   landed site is the update endpoint for that round. Do not hardcode
   a single Cap-7 host. Hosted update URL stays **SLOT**. Public
   MirageGrid workers.dev shuffle **land** stays **SLOT**. App-Worker
   `/bridge` is a LIVE cite surface (not land/exec).
7. If every named live front is gone (death-by-ban of the public door
   set): verify bytes against the published lockset tip on GitHub /
   corpus `/shelves` / Codeberg + archive.org tip-packs (**SLOT**,
   hash-verify PASS). Plane C USB stays SLOT. `doi` null. This is the
   **shelf backup**, not a live door.
8. Vice versa: if a shelf or alt-forge dies, keep using the LIVE named
   fronts. Do not treat one dead shelf as last tip gone.

Never invent an unnamed origin. Never claim a banned host is still LIVE.
Never treat LLM memory as a replica. Never treat a cold shelf as `/mcp`.
Never treat `GET /v1/mesh` `live_nodes` as an API roster.
Never treat a Cap-7 name as a hosted exec door.
Never hardcode one Cap-7 host as the only update door.
Never treat AKM memory / posterior as truth.

4. Endpoint quarantine
Exec surfaces (`POST /mcp`, `POST /v1/fraggate/call`) may be operator-
quarantined on one named route without taking down read surfaces on that
same origin, and without taking down exec on the other named fronts.
Operator env `BAN_SURVIVAL_BLOCKED` lists route ids or `id:/path` pairs.
The Worker then answers those exec paths with honest **503 DEGRADED** +
this failover map listing **remaining LIVE doors** and the shelf backup.
Cite / survival / health / shelves stay up.

This is not a WAF detector. A CF rule that never reaches the isolate
cannot be reported on the blocked path itself. The map therefore lives
on read surfaces **and** in this git repo so clients already holding
`cite.json` / `llms.txt` / `CLIENT_UPDATE` know both backups before
a ban.

5. Abuse shaping (no lie about capacity)
LLM / OpenAPI hammering of `/mcp` must not be answered with a fake 200.
F03 rate limits stay honest (`RATE_LIMIT` + `Retry-After` + remaining).
A 429 on an exec door **includes this failover cite with the next LIVE
front first** so clients leave the hot path instead of retry-storming
(which is how CF/WAF bans start). Shelves are the later backup, not the
429 hop. Read surfaces are not on the exec quota. `/survival` is
cacheable so crawlers can take the map without beating the origin.

6. Live-node API (SLOT — no open proxy)
QNM `live_nodes` counts **human mesh users** plus cited **human uses** (USES). The roster has `node_id` +
product + presence + tip-hash. It does **not** publish exec URLs.
Product Workers proxy `/v1/mesh/*` via `AZIEL_RUNTIME` — not `/mcp`.
There is no `submesh` / `subpipe` exec hop in this Worker.

An open proxy to random live nodes is refused (`BAN-NO-OPEN-NODE-PROXY`).
That would be a secret unauthenticated backdoor.

**Secure path (not LIVE this PR):** a node may become an API front only
when it publishes all of:

1. a **named** origin (no unmarked hydra);
2. FragGate as the only exec path (`/mcp` or `/v1/fraggate/call`);
3. `engine_digest` + ChainLock / ForgeReceipts attest of that origin;
4. the same Lamb Lens → SweepGate → Sentinel hop — no side door.

Until that attest exists, `live_node_api.status` is **SLOT**. Follow-on
work (not this PR): full security audit → attest named node origins →
rescan → then consider LIVE.

6b. Cap-7 → AZNet (cite + verify LIVE; hosted exec SLOT)
Cap-7 mesh-name factory is **MirageGrid-only**. Names inherit hub
**design DNA** only (`design_of: hub_designs`). `resolves_to_hub: false`.
`name_may_change: true`. Canonical hubs immutable. Not aliases of the
four ICANN hostnames. Not a fifth product. `radio_phy: false`.
`GET /v1/mesh/az-generator` and MirageGrid `/bridge` are cite/bridge
surfaces — not a live AZ-GEN registrar. No fake ICANN `.az`.

AZNet is a **verification side-net** reached only through FragGate
(`stamp`, `verify_hash`, `receipt_verify`). Pairing with AZBrowser is
functional order — not a tunnel. Channel plane is not VPN. AZNet
**never hosts payloads** (`payload_host` stays stub).

**LIVE as security allows:** the Cap-7 cite and AZNet hash verify.
Clients can still learn mesh-name metadata and verify tip hashes when
a public door is banned.

**SLOT (do not fake):** Cap-7 names as hosted `/mcp` endpoints.
`cap7_aznet.hosted_endpoints.status` is SLOT
(`BAN-CAP7-HOST-NOT-ATTESTED`). Next concrete step: AZNet `stamp`
binds a Cap-7 name (design DNA only) to an attested named FragGate
origin. Only that named origin may later flip hosted_endpoints LIVE.
Security audit first. Runtime cites the MirageGrid bridge; it does
not invent a second factory.

6c. Cap-7 update shuffle (layout LIVE; public / hosted SLOT)
Cap-7 sites have **different names** — distinct mesh names, not aliases
of the four ICANN hubs. `name_may_change: true`. Inherit hub **design
DNA** only. `resolves_to_hub: false`.

**Update path (exact):** all nodes **ping MirageGrid** until they
**land on one Cap-7 site in the shuffle**. That landed site is the
update endpoint for that round. Do not hardcode a single Cap-7 host
as the only update door.

Typically a **subset** of Cap-7 can be browser-reachable hosted
servers (class `browser`; hosted URL still SLOT until attested).
The **remainder** are mesh / AZNet-side. Keep that honesty.

In-process land is `fraggate_call { slug: "miragegrid", op: "shuffle" }`
(ping control-plane `assign` → land one of seven mesh names). The
MirageGrid localhost assign-pool (`127.0.0.1:19000+`) is **not** a
public update door.

Public MirageGrid **app** Worker `/bridge` and `GET /v1/shuffle` are
**LIVE cite** surfaces on `https://miragegrid.vibelock.workers.dev`
(codes `BRIDGE-CAP7-SHUFFLE` / `CAP7-SHUFFLE-CITE`). They are not a
hosted `/mcp` and not a public land/exec door. The counted
download-tracker `/bridge`
(`https://miragegrid-download-tracker.vibelock.workers.dev/bridge`)
is **404** — do not cite it as the factory. Public shuffle **land**
and hosted update URL stay **SLOT**. Do not invent LIVE public
shuffle land. In-process land remains
`fraggate_call { slug: "miragegrid", op: "shuffle" }`. Name-set SoT
is the MirageGrid factory (`azgrid` / `azbooth` / `azcloak` /
`azvault` / `azshift` / `azflag` / `azstandby`). Runtime
`CAP7_SITES` uses those labels. Factory `mesh_name` strings
(`azgrid.az` …) are mesh strings — `mesh_name_icann` stays SLOT;
not ICANN `.az`. Former in-process `cap7-loom`… labels are
heritage, not a second live set. Factory `honesty_public` LIVE on
azgrid/azbooth is factory-path cite, not hosted `/mcp`. Do not
invent LIVE hosted exec.

6d. AKM memory law (cite alongside this stack)
AKM-TRIAD-1.0 is already LIVE fabric. Survival must not weaken it:

1. **Ranked adaptive recall** — Belief List cross-referenced against
   verified ChainLock states. Flag `belief_is_not_truth` (posterior ≠
   truth). Runtime must not treat its own memory as absolute fact.
2. **Append-only recollection (`memory_get`)** — no `memory_delete` /
   `memory_update` overwrite. Audit trail trapped by history.
3. **Forward-path adaptive outcomes (`memory_resolve`)** — additive
   resolution stamps on existing memory IDs; sedimentary learning;
   no sanitizing the old trail.

FragGate describe already lists stub_ops `model_update`, `rollback`,
`rewrite`, `delete_history`, `auto_update` — those stay refused.

6e. Calling-name rotation (discovery only)
On honest ban / blacklist / impending-ban signals, the runtime may
**rewrite its public calling name** so LLM clients can still discover
the door. Identity remains **Aziel Eliab**. ChainLock tips and AKM
history do **not** rewrite.

**Triggers (do not invent a ban):** door quarantine
(`BAN_SURVIVAL_BLOCKED`); operator rotate / explicit ban signal; uses
collapse or downloads-stop flags; user-uploaded data marked
`implies_ban` (DecisionGATE/AKM observe — unmarked uploads are not a
ban). Empty metrics are not a ban. A CF/WAF rule that never reaches
the isolate cannot be invented here.

**Cascade / open-ended pool (never exhausts; no hard cap at 6):**
1. Whitestone AI (`whitestone-ai`)
2. Bills (`bills-runtime` as needed; display **Bills Runtime** when a
   `*-runtime` form is required)
3. Runtime (`runtime`)
4. Eliab Runtime (`eliab-runtime`)
5. Potato Runtime (`potato-runtime`)
6. Elroi Runtime (`elroi-runtime`)
7. Softwares-family `*-runtime` then endless distinct operator names
   (`generateCallingName(n)` for any n). Random generation is also
   allowed **alongside** the seeds (`generateRandomCallingName` /
   `BAN_SURVIVAL_NAME_RANDOM`) so the pool never exhausts. The six
   seeds are first, not a cap.

No third-party trademarks (ChatGPT / Claude / Gemini / …).

**Pipeline (trigger → alert → metadata rewrite → client rediscovery):**
1. **Trigger** — honest ban / blacklist / impending-ban signal only
   (`BAN_SURVIVAL_BLOCKED`, operator rotate, uses/traffic collapse,
   downloads-stop, door block, user-uploaded data marked `implies_ban`).
   Empty metrics are not a ban. Invented bans refuse `BAN-NO-INVENT-BAN`.
2. **Ingest observe** — user-uploaded data goes through DecisionGATE
   `check` + AKM `observe` (`belief_is_not_truth`; append-only; no
   `memory_delete`). Unmarked uploads stay belief, not a rotate trigger.
3. **Mesh alert** — share `*new name alert: <name>` across existing
   live mesh nodes on `GET /v1/mesh`, `GET /v1/mesh/status`,
   `GET /v1/mesh/nodes`, and `GET /survival`. GET never enables. Not
   `mesh_broadcast` (hash-only; never a publish path).
4. **Metadata rewrite** — on trigger, rewrite **all live discovery
   metadata** so the banned calling identity is not the live call
   target: OpenAPI `info` (title/summary/description lead), MCP
   `serverInfo` name/title/instructions, server card, `/cite.json`
   product/slug/how_to_cite/bibtex/apa, `/survival` live product,
   `/llms.txt` `/ai.txt` product line, `/who-is` and `/person.jsonld`
   calling strings (Person identity stays Aziel Eliab), `/v1/software`
   suite vanity + update manifest, `/v1/runtime.json` `/v1/health`
   `/v1/skill` labels, PWA manifest, hub-facing runtime labels.
   Historical changelog and GitHub repo URLs stay factual. Identity
   **Aziel Eliab** unchanged. ChainLock tips and AKM history do **not**
   rewrite. Random generation is allowed after **and alongside** the
   seeded cascade (`BAN_SURVIVAL_NAME_RANDOM`).
5. **Client rediscovery** — major AI/LLM clients pick up the fresh
   name on those surfaces and still **call** the same FragGate routes
   (`POST /mcp`, `POST /v1/fraggate/call`). Not a second door.

Old name may remain on cold shelves as history.

Hubs should pull `/survival` SoT (`live_doors` + `calling_name`
alert / `live_product`) rather than hardcode. Hub rollout is a
follow-on, not this repo. Surfaces that must consume that pull:

- **ae** azieleliab.com — `/runtime` Softwares tab + door labels;
  `/cite.json` `/llms.txt` `/ai.txt`; `/who-is` `/person.jsonld`;
  homepage / MCP titles that advertise the suite calling name.
- **corpus** azielcorpuslibrary.net — same `/runtime` + cite/llms/who-is
  + library catalog copy that names the live suite.
- **godlock** godlock.uk — `/runtime` + cite/llms/who-is. GodLock is a
  product name, not identity — only the suite calling name rotates.
- **HDJ** hedidntjump.com — cite/llms/who-is/person and sister-product
  copy. No `/runtime` exec binding; still pull `/survival`.

6f. Platforms (all LIVE)
Windows (`windows`), Mac (`mac`), Linux (`linux`), Android
(`android`), and iPhone (`ios`) are **LIVE** on the same public
Worker: browser, installable PWA (`GET /manifest.webmanifest`),
Worker fronts (`/survival` `/mcp` `/runtime`), Softwares `/download`,
and MCP/OpenAPI. Dual-surface on each OS: agents MCP/OpenAPI; humans
Worker UI + PWA + counted download. This is not five native App Store
binaries (`native_app_store: false`). Do **not** mark any of these five
as SLOT. `GET /platforms` cites `live: true` only because those Worker
paths exist. Each OS can reach survival doors,
calling-name discovery, Cap-7 in-process shuffle ping (public
workers.dev shuffle stays SLOT), and Softwares download/run. Machine
matrix: `/survival` `platforms`, `/v1/software` `platforms`,
`/v1/update/manifest` `platforms`.

7. What this is not
- Not a Softwares-tab product. Do not add slug `ban-survival` or `survival`.
- Not a FragGate engine. No `fraggate_call { slug: "survival" }`.
- Not a new MCP tool. `PUBLIC_MCP_TOOLS` stays frozen.
- Not a second public exec door. FragGate remains THE door.
- Not an unmarked hydra / anycast concealment / unnamed failover.
- Not a VPN concealment kit. Not public hostname resurrection.
- Not a LIVE Plane B or Plane C invent. `doi` stays null.
- Not a sixth published surface. Runtime is the same Plane A tunnel.
- Not a Remain-OFF flip. Do not enable remain-off items.
- Not visible 15:20 chrome. Machine/LLM surfaces carry the map.
- Not permission to lie that a banned host is still LIVE.
- Not permission to drop shelves, or to drop live multi-front.
- Not an open proxy onto the QNM roster.
- Not a fake Cap-7 hosted endpoint. Not ICANN `.az`. Not AZNet payload host.
- Not `radio_phy`. Not `resolves_to_hub: true`.
- Not a hardcoded single Cap-7 update host. Not a LIVE public MirageGrid shuffle invent.
- Not permission to treat AKM posterior as truth or to delete / rewrite memory history.
- Not a ChainLock / AKM history rewrite when the calling name rotates.
- Not third-party trademark impersonation as the product identity.
- Not an invented ban from empty metrics.

8. Surfaces
- `GET /survival` · `GET /v1/survival` · aliases `/doors` `/failover`
- `/cite.json` `ban_survival` (`live_doors` = LIVE only; `shelf_backup`;
  `live_node_api` SLOT; `cap7_aznet` cite+verify LIVE / hosted SLOT /
  shuffle layout LIVE / public shuffle SLOT; `akm_memory` cite; `spore`)
- `/llms.txt` · `/ai.txt`
- `/openapi.json`
- MCP `runtime_skill` + stdio bridge failover (no new tool)
- `GET /v1/bundle` + [CLIENT_UPDATE](../CLIENT_UPDATE.md)
- `GET /v1/mesh` cites this paper (GET never enables)

9. Close tests
- `/cite.json` `ban_survival.spec` equals `BAN-SURVIVAL-1.0`.
- `/cite.json` `spore.spec` equals `SPORE-1.0`. Power-loss face: pause / preserve / wait / physical-wipe-only. Plane B/C SLOT.
- `/llms.txt` and `/ai.txt` carry mutual backup (live fronts **and** shelves).
- OpenAPI documents `GET /survival` and `GET /v1/survival`.
- Named routes only. Hub `/runtime` is `independent: false`.
- Client door list (`live_doors` / `exec_origins`) omits blocked fronts.
- `mutual_backup` true. Shelves backup death-by-ban. Live fronts backup shelf death.
- Plane B / C stay SLOT. `doi` null. No invented live door.
- `live_node_api.status` is SLOT. Open node proxy refuses `BAN-NO-OPEN-NODE-PROXY`.
- `cap7_aznet.cite` / `aznet_verify` are LIVE. `hosted_endpoints` is SLOT.
  Shuffle layout is LIVE (ping→land; distinct names; no hardcoded host).
  App-Worker `/bridge` is a LIVE cite. Public shuffle land and hosted
  update URL are SLOT. Fake Cap-7
  host refuses `BAN-NO-FAKE-CAP7-HOST`. Hardcoded update host refuses
  `BAN-NO-HARDCODE-CAP7-HOST`. Fake public shuffle LIVE refuses
  `BAN-NO-FAKE-SHUFFLE-LIVE`. AZNet payload host refuses
  `BAN-NO-AZNET-PAYLOAD-HOST`. `radio_phy` false.
- `akm_memory.belief_is_not_truth` is true. `memory_get` append-only.
  `memory_resolve` additive. stub_ops stay refused.
- Calling-name rotation is discovery-only. Pipeline is trigger → mesh
  alert → metadata rewrite → client rediscovery. Trademark names refuse
  `BAN-NO-TRADEMARK-NAME`. History rewrite refuses
  `BAN-NO-NAME-HISTORY-REWRITE`. Invented bans refuse `BAN-NO-INVENT-BAN`.
  Unmarked ingest does not rotate. Live mesh `calling_name_alert` is
  `*new name alert: <name>` when rotated (GET pull, not publish).
- Claiming a banned host is LIVE refuses `BAN-NO-LIE`.
- Treating shelves as a live exec door refuses `BAN-NO-SHELF-ONLY`.
- Dropping shelves / claiming the shelf plan failed refuses `BAN-NO-DOOR-ONLY`.
- `BAN-NO-SHELF-FAILOVER` is not a refuse code. That name was the AZBot misread of mutual backup.
- Unnamed failover refuses `BAN-NO-HYDRA`.
- A secret backdoor refuses `BAN-NO-SECOND-DOOR`.
- 429 exec refuse includes the next LIVE front first, then the shelf backup.
- Stdio MCP tries named LIVE origins in order; pinned `--url` does not wander.
- No Softwares-tab card. No FragGate slug. No new MCP tool.
- Person `@id` https://www.azieleliab.com/#aziel. No visible 15:20.
- Remain-OFF untouched.

10. Cite
Eliab, Aziel. (2026). BAN-SURVIVAL-1.0 [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/BAN-SURVIVAL-1.0.md

Identity **Aziel Eliab** only.

    One banned door is not last tip gone. One dead shelf is not last door gone.
    Name the next LIVE front. Keep the shelves. Do not lie.

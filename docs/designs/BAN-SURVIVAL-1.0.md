# BAN-SURVIVAL-1.0 — mutual backup (live multi-front ↔ cold shelves)

Author: Aziel Eliab only.

Status: LIVE law (2026-09-18). Not a Softwares-tab product. Not a FragGate slug. Remain-OFF untouched.

Companion under the umbrella: [CROSS-NETWORK-SURVIVAL-1.0](CROSS-NETWORK-SURVIVAL-1.0.md) (does not replace the machine tip). Neighbor: [NO-LIE-NO-REWRITE-1.0](NO-LIE-NO-REWRITE-1.0.md), [COLD-MULTI-SHELF-1.0](COLD-MULTI-SHELF-1.0.md). Mesh rollup: [NODE_MESH](../NODE_MESH.md). Executable: `src/ban-survival.js`.

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

They back each other up. Do not drop shelves. Do not make shelves the
only answer. Do not make multi-door the only answer. Prefer honest
**DEGRADED** on a banned front. Do not paint a banned host LIVE. Do not
paint a tip-pack as `/mcp`.

1. Claim
Zenodo already showed a Plane B death mode (`CNS-ZENODO-IP-BAN`). That
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
                                when a public door is banned             SLOT. AZNet never
                                                                         hosts payloads.
                                                                         No fake ICANN `.az`.

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
6. If every named live front is gone (death-by-ban of the public door
   set): verify bytes against the published lockset tip on GitHub /
   corpus `/shelves` / Codeberg + archive.org tip-packs (**SLOT**,
   hash-verify PASS). Plane C USB stays SLOT. `doi` null. This is the
   **shelf backup**, not a live door.
7. Vice versa: if a shelf or alt-forge dies, keep using the LIVE named
   fronts. Do not treat one dead shelf as last tip gone.

Never invent an unnamed origin. Never claim a banned host is still LIVE.
Never treat LLM memory as a replica. Never treat a cold shelf as `/mcp`.
Never treat `GET /v1/mesh` `live_nodes` as an API roster.
Never treat a Cap-7 name as a hosted exec door.

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
QNM `live_nodes` is **mesh size** (presence). The roster has `node_id` +
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

8. Surfaces
- `GET /survival` · `GET /v1/survival` · aliases `/doors` `/failover`
- `/cite.json` `ban_survival` (`live_doors` = LIVE only; `shelf_backup`;
  `live_node_api` SLOT; `cap7_aznet` cite+verify LIVE / hosted SLOT)
- `/llms.txt` · `/ai.txt`
- `/openapi.json`
- MCP `runtime_skill` + stdio bridge failover (no new tool)
- `GET /v1/bundle` + [CLIENT_UPDATE](../CLIENT_UPDATE.md)
- `GET /v1/mesh` cites this paper (GET never enables)

9. Close tests
- `/cite.json` `ban_survival.spec` equals `BAN-SURVIVAL-1.0`.
- `/llms.txt` and `/ai.txt` carry mutual backup (live fronts **and** shelves).
- OpenAPI documents `GET /survival` and `GET /v1/survival`.
- Named routes only. Hub `/runtime` is `independent: false`.
- Client door list (`live_doors` / `exec_origins`) omits blocked fronts.
- `mutual_backup` true. Shelves backup death-by-ban. Live fronts backup shelf death.
- Plane B / C stay SLOT. `doi` null. No invented live door.
- `live_node_api.status` is SLOT. Open node proxy refuses `BAN-NO-OPEN-NODE-PROXY`.
- `cap7_aznet.cite` / `aznet_verify` are LIVE. `hosted_endpoints` is SLOT.
  Fake Cap-7 host refuses `BAN-NO-FAKE-CAP7-HOST`. AZNet payload host
  refuses `BAN-NO-AZNET-PAYLOAD-HOST`. `radio_phy` false.
- Claiming a banned host is LIVE refuses `BAN-NO-LIE`.
- Treating shelves as a live exec door refuses `BAN-NO-SHELF-ONLY`.
- Dropping shelves / claiming the shelf plan failed refuses `BAN-NO-DOOR-ONLY`.
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

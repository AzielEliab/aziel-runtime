# BAN-SURVIVAL-1.0 — live multi-front door survival (no lie to stay alive)

Author: Aziel Eliab only.

Status: LIVE law (2026-09-18). Not a Softwares-tab product. Not a FragGate slug. Remain-OFF untouched.

Companion under the umbrella: [CROSS-NETWORK-SURVIVAL-1.0](CROSS-NETWORK-SURVIVAL-1.0.md) (does not replace the machine tip). Neighbor: [NO-LIE-NO-REWRITE-1.0](NO-LIE-NO-REWRITE-1.0.md). [COLD-MULTI-SHELF-1.0](COLD-MULTI-SHELF-1.0.md) remains an existing cite — **it is not the ban-survival answer**. Mesh rollup: [NODE_MESH](../NODE_MESH.md). Executable: `src/ban-survival.js`.

---

Aziel Eliab · law · named hosts only · FragGate stays the door


    BAN-SURVIVAL-1.0
    One banned hostname or blocked exec path does not kill the runtime
    for clients. Live multi-front: workers.dev + custom-domain hub
    /runtime proxies + path quarantine. Client door list = LIVE doors
    only. Never invent a live door. Never claim shelves saved you.

    Identity: Aziel Eliab only
    Close tests: scripts/verify-ban-survival.mjs


0. Sentence
A Cloudflare / WAF / API ban of **one** public door (workers.dev, `/mcp`,
a FragGate path) is a **surface** death, not the runtime gone. Clients get
an honest **live** failover map: the next named front that is still LIVE,
then remaining LIVE exec paths, then remaining LIVE read paths that still
publish this map. Prefer honest **DEGRADED** on the banned front. Do not
paint a banned host LIVE. Do not send clients to cold shelves as if that
were a live door.

1. Claim
Zenodo already showed a Plane B death mode (`CNS-ZENODO-IP-BAN`). Cold
shelves / tip-packs / archive.org / Framagit are a **failed** plan for
keeping LLM, MCP, OpenAPI, Softwares, and hub clients alive. Hash-verify
is not exec. A tip-pack is not `/mcp`.

The same class of death can hit the public Worker: one CF/WAF rule, one
blocked `/mcp`, or LLM/OpenAPI hammering that gets an endpoint banned.
Hubs and agents then “die” even though **other live fronts** still answer
— workers.dev, custom-domain hub `/runtime` service bindings, and
unblocked paths on the remaining named hosts.

This paper is the **live door-path** companion under CROSS-NETWORK-SURVIVAL.
It does not invent a second FragGate door, a secret backdoor, an unmarked
hydra, a LIVE Plane B/C, or a fake live door. It does not claim shelves
saved the runtime.

2. What actually works (named live fronts only)

  Layer                         What it survives                         What it does not

  workers.dev hostname          WAF / platform ban of one advertised     Whole Cloudflare account
                                Worker host                              pull / die-with-pull
  Custom-domain hub /runtime    Public `*.workers.dev` hostname ban      Same CF account death;
                                (library / author / godlock fronts       hub itself banned
                                bind internally; they do not fetch
                                workers.dev)
  Endpoint quarantine           `/mcp` or `/v1/fraggate/call` blocked    Whole-origin ban
                                on one front while remaining LIVE
                                exec + read paths on remaining LIVE
                                fronts still answer
  Abuse shaping                 429 points at the next LIVE front        Unlimited capacity
                                instead of retry-storming the same
                                path (which is how CF/WAF bans start)

Hub `/runtime` on azielcorpuslibrary.net, azieleliab.com, and godlock.uk
is the **same FragGate door** via service binding — not a second door and
not a sixth shelf (`CNS-RUNTIME-NOT-SHELF`). Counting those four as four
independent blast-radius doors is a lie (`BAN-NO-HYDRA` /
`CNS-PLANE-A-ONE-TUNNEL`). They **are** four named live fronts: a ban of
one hostname or path must not strand clients on that dead endpoint.

Cold shelves stay cited where they already live (`GET /shelves`). They
are **not** a failover step (`BAN-NO-SHELF-FAILOVER`). Never claim
shelves saved you.

3. Client order (LLM / MCP / OpenAPI)

Door list = **LIVE doors only**. A blocked front is listed as blocked, not
as a live exec origin.

1. Try primary Worker exec: `POST https://aziel-runtime.vibelock.workers.dev/mcp`
   or `POST …/v1/fraggate/call`.
2. If that hostname or exec path is blocked (403 / 429 / 502 / 503 /
   network): try the next **LIVE** custom-domain hub `/runtime` prefix
   (`…/runtime/mcp`, `…/runtime/v1/fraggate/call`). Same door philosophy.
   Order: library → author → godlock.
3. If one exec path is quarantined: remaining **LIVE** exec paths on
   remaining **LIVE** fronts still run.
4. If exec is gone on a front: remaining **LIVE** read surfaces on
   remaining **LIVE** fronts still publish this map (`/survival`,
   `/cite.json`, `/llms.txt`, `/v1/health`, `/v1/software`, `/v1/mesh`).
   Mode on the banned front is **DEGRADED**.

Never invent an unnamed origin. Never claim a banned host is still LIVE.
Never treat LLM memory as a replica. Never treat a cold shelf, tip-pack,
or archive.org item as a live door.

4. Endpoint quarantine
Exec surfaces (`POST /mcp`, `POST /v1/fraggate/call`) may be operator-
quarantined on one named route without taking down read surfaces on that
same origin, and without taking down exec on the other named fronts.
Operator env `BAN_SURVIVAL_BLOCKED` lists route ids or `id:/path` pairs.
The Worker then answers those exec paths with honest **503 DEGRADED** +
this failover map listing **remaining LIVE doors**. Cite / survival /
health stay up so clients can still reach the runtime.

This is not a WAF detector. A CF rule that never reaches the isolate
cannot be reported on the blocked path itself. The map therefore lives
on read surfaces **and** in this git repo so clients already holding
`cite.json` / `llms.txt` / `CLIENT_UPDATE` know the live fronts before
a ban.

5. Abuse shaping (no lie about capacity)
LLM / OpenAPI hammering of `/mcp` must not be answered with a fake 200.
F03 rate limits stay honest (`RATE_LIMIT` + `Retry-After` + remaining).
A 429 on an exec door **includes this failover cite with the next LIVE
front only** so clients leave the hot path instead of retry-storming
(which is how CF/WAF bans start). Read surfaces are not on the exec
quota. `/survival` is cacheable so crawlers can take the map without
beating the origin.

6. What this is not
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
- **Not cold-shelf failover.** Shelves / tip-packs / archive.org /
  Framagit / USB do not keep LLM/MCP/OpenAPI clients alive.
  `BAN-NO-SHELF-FAILOVER`.

7. Surfaces
- `GET /survival` · `GET /v1/survival` · aliases `/doors` `/failover`
- `/cite.json` `ban_survival` (`live_doors`, `exec_origins` = LIVE only)
- `/llms.txt` · `/ai.txt`
- `/openapi.json`
- MCP `runtime_skill` + stdio bridge failover (no new tool)
- `GET /v1/bundle` + [CLIENT_UPDATE](../CLIENT_UPDATE.md)
- `GET /v1/mesh` cites this paper (GET never enables)

8. Close tests
- `/cite.json` `ban_survival.spec` equals `BAN-SURVIVAL-1.0`.
- `/llms.txt` and `/ai.txt` carry the same live-front rule.
- OpenAPI documents `GET /survival` and `GET /v1/survival`.
- Named routes only. Hub `/runtime` is `independent: false`.
- Client door list (`live_doors` / `exec_origins`) omits blocked fronts.
- Plane B / C stay SLOT. `doi` null. No invented live door.
- Claiming a banned host is LIVE refuses `BAN-NO-LIE`.
- Claiming shelves saved you refuses `BAN-NO-SHELF-FAILOVER`.
- Unnamed failover refuses `BAN-NO-HYDRA`.
- A secret backdoor refuses `BAN-NO-SECOND-DOOR`.
- 429 exec refuse includes the next LIVE front, not the hot path, not a shelf.
- Stdio MCP tries named LIVE origins in order; pinned `--url` does not wander.
- No Softwares-tab card. No FragGate slug. No new MCP tool.
- Person `@id` https://www.azieleliab.com/#aziel. No visible 15:20.
- Remain-OFF untouched.

9. Cite
Eliab, Aziel. (2026). BAN-SURVIVAL-1.0 [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/BAN-SURVIVAL-1.0.md

Identity **Aziel Eliab** only.

    One banned door is not the runtime gone. Name the next LIVE front. Do not lie.

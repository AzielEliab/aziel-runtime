# BAN-SURVIVAL-1.0 — door / path survival (no lie to stay alive)

Author: Aziel Eliab only.

Status: LIVE law (2026-09-18). Not a Softwares-tab product. Not a FragGate slug. Remain-OFF untouched.

Companion under the umbrella: [CROSS-NETWORK-SURVIVAL-1.0](CROSS-NETWORK-SURVIVAL-1.0.md) (does not replace the machine tip). Neighbor: [NO-LIE-NO-REWRITE-1.0](NO-LIE-NO-REWRITE-1.0.md), [COLD-MULTI-SHELF-1.0](COLD-MULTI-SHELF-1.0.md). Mesh rollup: [NODE_MESH](../NODE_MESH.md). Executable: `src/ban-survival.js`.

---

Aziel Eliab · law · named hosts only · FragGate stays the door


    BAN-SURVIVAL-1.0
    One banned hostname or blocked exec path does not kill the runtime
    for clients. Named same-tunnel routes + read-surface quarantine +
    cold tip-hash verify. Never invent a live door. Never lie to survive.

    Identity: Aziel Eliab only
    Close tests: scripts/verify-ban-survival.mjs


0. Sentence
A Cloudflare / WAF / API ban of **one** public door (workers.dev, `/mcp`,
a FragGate path) is a **surface** death, not last tip gone. Clients get an
honest failover map: named alternate routes on the same Plane A tunnel,
remaining read surfaces, then cold-shelf hash verify. Prefer honest
**DEGRADED** + shelf pointers. Do not paint a banned host LIVE.

1. Claim
Zenodo already showed a Plane B death mode (`CNS-ZENODO-IP-BAN`). The same
class of death can hit the public Worker: one CF/WAF rule, one blocked
`/mcp`, or LLM/OpenAPI hammering that gets an endpoint banned. Hubs and
agents then “die” even though cold tips and named hub `/runtime` service
bindings still exist.

This paper is the **door-path** companion under CROSS-NETWORK-SURVIVAL.
It does not invent a second FragGate door, a secret backdoor, an unmarked
hydra, or a LIVE Plane B/C.

2. What actually works (named hosts only)

  Layer                         What it survives                         What it does not

  Same-tunnel named routes      workers.dev hostname ban; one hub        Whole Cloudflare account
                                blocked; WAF on one hostname             pull / die-with-pull
  Endpoint quarantine           `/mcp` or `/v1/fraggate/call` blocked    Whole-origin ban
                                while `/cite.json` `/shelves` `/survival`
                                still answer
  Hub `/runtime` service bind   Public `*.workers.dev` hostname ban      Same CF account death
                                (hubs bind internally; they do not
                                fetch workers.dev)
  Cold tip-hash verify          Whole live network / CF account death    A living exec door
                                (GitHub + Plane B SLOT packs + USB)

Hub `/runtime` on azielcorpuslibrary.net, azieleliab.com, and godlock.uk
is the **same FragGate door** via service binding — not a second door and
not a sixth shelf (`CNS-RUNTIME-NOT-SHELF`). Counting those four as four
independent live doors is a lie (`BAN-NO-HYDRA` / `CNS-PLANE-A-ONE-TUNNEL`).

3. Client order (LLM / MCP / OpenAPI)

1. Try primary Worker exec: `POST https://aziel-runtime.vibelock.workers.dev/mcp`
   or `POST …/v1/fraggate/call`.
2. If that hostname or exec path is blocked (403 / 429 / 502 / 503 /
   network): try the next **named** hub `/runtime` prefix
   (`…/runtime/mcp`, `…/runtime/v1/fraggate/call`). Same door philosophy.
3. If every exec route fails: remaining **read** surfaces still cite the
   tip and this map (`/survival`, `/cite.json`, `/llms.txt`, `/shelves`,
   `/v1/mesh`, `/v1/health`, `/v1/software`). Mode is **DEGRADED**.
4. If the live CF tunnel is gone: verify bytes against the published
   lockset tip. Plane B Codeberg + archive.org tip-packs hash-verify PASS
   and stay **SLOT**. Plane C USB stays **SLOT**. Do not invent LIVE.

Never invent an unnamed origin. Never claim a banned host is still LIVE.
Never treat LLM memory as a replica.

4. Endpoint quarantine
Exec surfaces (`POST /mcp`, `POST /v1/fraggate/call`) may be operator-
quarantined on one named route without taking down read surfaces on that
same origin. Operator env `BAN_SURVIVAL_BLOCKED` lists route ids or
`id:/path` pairs. The Worker then answers those exec paths with honest
**503 DEGRADED** + this failover map. Cite / shelves / survival stay up.

This is not a WAF detector. A CF rule that never reaches the isolate
cannot be reported on the blocked path itself. The map therefore lives
on read surfaces **and** in this git repo so clients already holding
`cite.json` / `llms.txt` / `CLIENT_UPDATE` know the order before a ban.

5. Abuse shaping (no lie about capacity)
LLM / OpenAPI hammering of `/mcp` must not be answered with a fake 200.
F03 rate limits stay honest (`RATE_LIMIT` + `Retry-After` + remaining).
A 429 on an exec door **includes this failover cite** so clients try the
next named route instead of retry-storming the same path (which is how
CF/WAF bans start). Read surfaces are not on the exec quota. `/survival`
is cacheable so crawlers can take the map without beating the origin.

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

7. Surfaces
- `GET /survival` · `GET /v1/survival` · aliases `/doors` `/failover`
- `/cite.json` `ban_survival`
- `/llms.txt` · `/ai.txt`
- `/openapi.json`
- MCP `runtime_skill` + stdio bridge failover (no new tool)
- `GET /v1/bundle` + [CLIENT_UPDATE](../CLIENT_UPDATE.md)
- `GET /v1/mesh` cites this paper (GET never enables)

8. Close tests
- `/cite.json` `ban_survival.spec` equals `BAN-SURVIVAL-1.0`.
- `/llms.txt` and `/ai.txt` carry the same door-path rule.
- OpenAPI documents `GET /survival` and `GET /v1/survival`.
- Named routes only. Hub `/runtime` is `independent: false`.
- Plane B / C stay SLOT. `doi` null. No invented live door.
- Claiming a banned host is LIVE refuses `BAN-NO-LIE`.
- Unnamed failover refuses `BAN-NO-HYDRA`.
- A secret backdoor refuses `BAN-NO-SECOND-DOOR`.
- 429 exec refuse includes the failover cite.
- Stdio MCP tries named origins in order; pinned `--url` does not wander.
- No Softwares-tab card. No FragGate slug. No new MCP tool.
- Person `@id` https://www.azieleliab.com/#aziel. No visible 15:20.
- Remain-OFF untouched.

9. Cite
Eliab, Aziel. (2026). BAN-SURVIVAL-1.0 [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/BAN-SURVIVAL-1.0.md

Identity **Aziel Eliab** only.

    One banned door is not last tip gone. Name the next route. Do not lie.

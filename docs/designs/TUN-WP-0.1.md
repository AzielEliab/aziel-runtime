# TUN-WP-0.1 — Library Tunnel Front

Author: Aziel Eliab only.

Status: local specification (2026-09-09; die-with-the-pull lock 2026-09-14). Not a Softwares-tab product. Not a fleet-completeness claim.

---

Aziel Eliab · local specification · not a fleet-completeness claim




    Library Tunnel Front
    Rate-limit frontend for azielcorpuslibrary.net with Worker failover

    TUN-WP-0.1 9 September 2026 Author: Aziel Eliab / GodLock.AZ Status: local plan. Companion to RL-WP-0.1
    (library scope). Origin in scope: https://www.azielcorpuslibrary.net only.


    0. Sentence
    Tunnel first. Cloudflare Worker only if the tunnel process is down and the site is still published. Visitors never
    receive a home IP. “Untraceable” is not a claim this paper makes. Public tunnels and sites die with the pull.
    Phoenix is wait / re-seal only — not public hostname resurrection.

    1. What is already true
    The library already answers with server: cloudflare and a CF-Ray. Public clients hit Cloudflare, not a
    residential address.

    The cost problem in RL-WP-0.1 is KV reads on the Worker behind that edge (~191 KV ops per request, $131 of
    $142 in eight days). Hiding an IP does not by itself cut that bill. A cache that sits in front of KV does.

    GodLock already uses Cloudflare Tunnel from a US machine as a public node. This plan reuses that pattern as a read
    frontend, not as a new public identity surface.

    2. Claim
    Priority:

    1. Tunnel (primary). Named cloudflared frontend. Packed disk index. Rate bucket. Outbound only. 2.
    Cloudflare Worker (standby). Same hostname. Packed library:index:v1. No KV.list() on the hot path. Takes
    traffic only when the tunnel process is down or 5xx and the site is still published (token, DNS, Worker, account
    still exist). A pulled site has no standby and no legal landing.

    Cloudflare edge is not a third origin. It is the always-on switch: TLS, orange-cloud DNS, cache, health check. It
    forwards to (1), and if (1) fails it forwards to (2) only while those published assets remain.

    3. What it is not
•         Not a public Node Gate panel or IP allow/block UI.
•         Not an untraceable-origin path. AZbot will not build that.
•         Not a promise that Cloudflare, the registrar, or a payment processor cannot see an account.
•         Not a VPN that hides the operator from Cloudflare. The tunnel connector IP is visible to Cloudflare. It is not
          visible to library visitors. Named hosts only. No VPN / concealment kit.
•         Not rate limits on godlock.uk or on local ChainLock.
•         Not a second catalog of truth. The Worker remains the record of public AZDOC cards. The tunnel serves a
          replica.
•         Not Phoenix resurrection of a pulled site. Phoenix does not bring godlock.uk or this hostname back.
•         Not a public contract that a process supervisor can re-land cloudflared after the token, Worker, or DNS is gone.

    4. Target topology
     visitor
       → Cloudflare edge          (azielcorpuslibrary.net, proxy ON)



TUN-WP-0.1 Library Tunnel Front                                                                                             1


Aziel Eliab · local specification · not a fleet-completeness claim




             ■■ cache hit                         → packed search / card
             ■■ tunnel healthy          PRIMARY   → named tunnel → local frontend
             ■■ tunnel down / timeout / 5xx STANDBY → Worker

    Local frontend reads AZDOC id, title, content_sha256, chain_tip. No PDF bodies in the index.

    5. Failover — tunnel first
    Two ways. Both keep the apex orange-cloud. Neither publishes a raw IP.

    A. Edge steer (preferred when Zero Trust public hostname + health check exist). Public hostname
    azielcorpuslibrary.net → tunnel service. Health check GET /v1/health. Unhealthy → Cloudflare
    route/Workers custom domain on the same hostname takes the zone.

    B. Thin switch on the Worker (no Load Balancing add-on). Worker is bound to the hostname but is not the app
    while the tunnel lives:
     on request:
       if cache hit: return
       if operator token: skip bucket
       if visitor over bucket: 429 + last cached page
       try fetch(TUNNEL_ORIGIN + path) 800ms
       if 2xx: cache and return          # tunnel first
       else: serve Worker packed index   # Cloudflare takes over

    Do not swap A records. Do not point the apex at a VPS.

    Health: GET /v1/health → {ok, role:"tunnel-front", index_sha256, ts}. Timeout or non-ok = tunnel
    down.

    6. Rate limit at two places
    Edge (Cloudflare Rate Limiting / WAF custom rule, server-side only):

•         30 search req/min / visitor
•         120 record views/hour
•         bot score / known scraper isolate

    Tunnel frontend (same numbers, hashed CF-Connecting-IP + cookie). Soft 429 returns last cached search.

    Worker failover keeps the same bucket so a down tunnel does not become a free KV scrape.

    Operator exclude: secret header or Access service token in gate_config.json only. Never a button.

    7. Origin-IP and operator safety
    What visitors see. Cloudflare anycast. No A record to a home or VPS IP. Proxy status stays orange.

    What the tunnel does. cloudflared makes only outbound connections to Cloudflare. No port-forward, no UPnP,
    no inbound 443 on the host. The host firewall default-denies inbound.

    What Cloudflare sees. The connector IP of whatever machine runs cloudflared. That is the remaining origin leak
    toward the vendor, not toward the public.

    Reduce that leak (honest list):


TUN-WP-0.1 Library Tunnel Front                                                                                       2


Aziel Eliab · local specification · not a fleet-completeness claim




•         Run cloudflared on a host that is not the daily phone or the court-evidence laptop.
•         Prefer a small US VPS or the same class of machine already used for GodLock. A home box works technically
          and puts the residential IP in Cloudflare’s tunnel logs.
•         Do not place the home county, legal name, or LAN hostname in tunnel config, cert files, or HTML.
•         Operator browsing and admin use a separate VPN or WARP session. That hides the operator from other sites.
          It does not hide the connector from Cloudflare.
•         WHOIS privacy on the domain. No personal address in registrar fields.
•         Scoped Cloudflare API token for tunnel + DNS only. Not the global key in a git repo.
•         No inbound management ports. No public SSH on 22 to the world.
•         Slingshot Prep on any exported frontend bundle.

    What this does not do.

•         It does not erase the Cloudflare account, the domain payment, or historical CF-Ray logs.
•         It does not survive the operator logging into the dashboard from an identified session and then calling that
          “hidden.”
•         It does not create a second, unlinked identity. Do not ask this runtime to assemble that.

    If the threat model is “random visitor and scraper,” orange-cloud + outbound tunnel is enough. If the threat model is
    “vendor or payer can be compelled,” the only honest mitigation is: do not put privileged plaintext on the library
    Worker, and keep sealed work in EmbryoLock / ARK locally.

    8. Build order
    1. Stand up named tunnel library-front. Public hostname = azielcorpuslibrary.net (tunnel first). 2. Local
    frontend serves packed index from disk. No KV.list. /v1/health live. 3. Ship RL-WP-0.1 on the Worker as
    standby only (packed index, cacheTtl, 8 KV cap). 4. Wire health check: tunnel 2xx stays primary; down/5xx/timeout
    → Worker. 5. Edge rate rules + cache on the zone (apply to both origins). 6. Donate tab static on both copies. No
    KV. 7. Measure: fraction of requests served by tunnel vs Worker, KV reads per request on standby only.

    Do not flip the apex A record to a raw VPS. That publishes an IP.

    9. When the tunnel process is down (site still published)
    If the named token, DNS name, Worker, and account still exist, a down cloudflared process is a temporary miss.
    Cloudflare Worker may answer on the same hostname (standby). Search still works from the packed index. Some
    freshness lag. Soft rate limit still on. ChainLock library-sync still uses /v1/search on that hostname.

    A process supervisor restarting cloudflared is operator kit, not the public contract. It can land again only while
    the credential and hostname remain. It fails if the credential or hostname is gone. That restart is not Phoenix.
    It is not public hostname resurrection.

    Local ChainLock vault/library.jsonl is the site-fail shelf for the operator and for any client that already synced.
    That path does not need the tunnel.

    10. Die with the pull
    Cloudflare Tunnel lives on a token, a DNS name, and an account. Pull the site, revoke the token, drop the Worker,
    or kill DNS and cloudflared has nowhere legal to land.

    Sites pulled → public rollup on that hostname is down. A local node may keep verifying and appending.
    Mesh does not climb back onto the public hostname by itself. Phoenix is wait / re-seal after poison or isolation — not
    “bring the .uk node back” and not public hostname resurrection.

    Cold-copy survival: multiply cold copies. The pulled hostname is dead; vaults that already hold the hashes
    keep verifying and appending. Live body sync across the network is refused. Payloads stay pull-only cold.
    Named hosts only. FragGate / public contract elsewhere stays intact.

    CROSS-NETWORK-SURVIVAL-1.0: if network and data die tomorrow, the chain survives on cold shelves
    (hosts / DOI / git / vault). Die-with-the-pull, split-the-wires, cold-copy, re-expand, and REHEAL
    sit under that sentence. The live mesh is not a shelf.

    11. Cap
    This is a plan. It is not a cloudflared install script and not a new public panel. Connector IP is hidden from visitors,
    not from Cloudflare. Untraceable-origin hosting is refused. Phoenix does not restore azielcorpuslibrary.net or
    godlock.uk after a pull.

    Companion: RL-WP-0.1, CL-WP-0.4 § library tether, SG-WP-0.1, NODE-OPS-1.0, QNM-WP-1.0.



TUN-WP-0.1 Library Tunnel Front                                                                                                3

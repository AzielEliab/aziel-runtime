# RL-WP-0.1-runtime — Rate Limit (runtime scope)

Author: Aziel Eliab only.

Status: local specification (2026-09-09). Not a Softwares-tab product.

---

Aziel Eliab · local specification · not a fleet-completeness claim




    Rate Limit and Donation Plan
    Keep aziel-runtime public. Stop paying for KV walks. Operator uncapped.

    RL-WP-0.1 9 September 2026 Author: Aziel Eliab / GodLock.AZ Status: local specification and cost plan. Not a
    fleet-completeness claim. Evidence window: Cloudflare billable usage, 2–9 September 2026 (8 of 30 cycle days).


    0. Sentence
    Users are cheap. The catalog walk is not. Limit visitors on the Worker. Do not limit the operator. Do not hide the
    runtime.

    1. What the bill said
    Observed 2–9 September 2026:

•         Total cost: $142.26
•         Projected cycle cost: $533.47 (2 September – 1 October, 8 of 30 days)
•         Average daily: $17.78
•         KV Read Operations: 271.91M — $131.00
•         KV List Operations: 1.33M — $5.00
•         KV Write Operations: 1.37M — $5.00
•         Workers CPU ms: 92.36M — $1.26
•         Workers Standard Requests: 1.42M — inside the 10M included
•         D1 rows read: 5.44B — inside the 25B included ($0)
•         KV / D1 storage: 0 GB-month

    Workers KV paid plan: first 10 million reads per month included, then $0.50 per million. $131 / $0.50 = 262 million
    billable reads. Plus the 10 million included ≈ 272 million. That matches the dashboard.

    1.42 million Worker requests against 271.91 million KV reads is about 191 KV operations per request. The public
    is not hitting the Worker 272 million times. Something on the hot path lists or gets that many keys per page.

    CPU and request counts are fine. D1 is fine. Storage is fine. The bill is almost entirely KV reads.

    This paper does not name a private account id, a home address, or an IP.

    2. Claim
    A packed catalog key, an edge cache, a per-visitor request cap, and a server-side operator token cut billed KV reads
    by an order of magnitude without shrinking the public surface and without rate-limiting the operator.

    Donation is a static tab. It does not touch KV.

    3. What it is not
•         Not a public Node Gate panel.




RL-WP-0.1 Rate Limit and Donation Plan                                                                                     1


Aziel Eliab · local specification · not a fleet-completeness claim




•         Not an IP allow/block UI on azieleliab.com, godlock.uk, or the library.
•         Not a shutdown of aziel-runtime.
•         Not a claim that Cloudflare WAF replaces this plan.
•         Not invented wallet addresses. Addresses are an operator paste at publish time.
•         Not a GodLock ledger write.

    4. Root cause
    Hot-path patterns that produce 191 reads per request:

•         KV.list() to build the software / FragGate / library index on every hit

•         key-by-key KV.get of every catalog row instead of one packed JSON
•         cacheTtl omitted, so every get bills

•         dashboard and wrangler list/get counting as billable KV
•         scrapers walking every software tab, each tab repeating the list

    Fix the walk first. Rate limit second. Donation third.

    5. Plan, in order
    Step 1 — Pack the catalog. One key: catalog:v1 (or software.json plus library-index.json). Shape is the
    AZL-VOL door list already specified: slug, title, one-liner, hash, href. No PDF bodies. list() leaves the hot path.

    Step 2 — Cache. env.KV.get(key, { cacheTtl: 3600 }). Public JSON responses carry Cache-Control:
    public, s-maxage=300, stale-while-revalidate=3600. Repeat visitors hit the Cloudflare cache, not KV.
    Static software tabs move to assets where possible. Static asset requests are free.

    Step 3 — Cap KV work inside one invocation. A request may perform at most 30 KV operations. If a handler
    would exceed that, return the packed catalog plus truncated. Do not walk the rest.

    Step 4 — Per-visitor limit, server-side. Identify a visitor as SHA-256 of CF-Connecting-IP plus optional cookie.
    No public “who am I” control.

    Default bucket (everyone except operator):

•         60 requests / minute
•         600 requests / hour
•         5,000 requests / day

    Soft exceed: HTTP 429, Retry-After: 30, body is the last cached catalog so the site still “runs.” Hard isolate:
    SweepGate poison / scraper class only. Cite, drop tether, do not merge.

    Step 5 — Operator exclude. A secret request header or Cloudflare Access service token, stored only in
    gate_config.json on the Worker. Same token the standing rules already keep off the public surface. Operator
    traffic skips the bucket. Operator still uses packed catalog and cache. Operator is not a reason to list() KV.

    Step 6 — Cycle cap. Cloudflare budget alert at $80–$100 for the billing cycle. A scrape cannot run the projection to
    $533.



RL-WP-0.1 Rate Limit and Donation Plan                                                                                     2


Aziel Eliab · local specification · not a fleet-completeness claim




    Step 7 — Measure. After ship: KV reads / Worker request should fall from ~191 toward 1–3 on catalog pages and
    toward 1 on cached hits. If it does not, the packed key is not on the hot path yet.

    6. Visitor still has the runtime
    A limited visitor receives:

•          the last good catalog
•          FragGate / search / mesh within quota
•          SweepGate airlock (unchanged)
•          ChainLock local memory on their machine, which does not bill this Worker

    They lose only unbounded crawl. They do not lose the doctrine, the library cards they already fetched, or the local
    vault.

    QNM launch does not change this. Bridges still pull=false. Sweep still runs before ingest.

    7. Donation tab
    Add a Donate strip on azieleliab.com, the library, and godlock.uk.

    Rules:

•          Static page or static island. No Worker. No KV.
•          Networks the operator already controls: Bitcoin, Lightning, Ethereum, Solana. Paste addresses at publish. Do
           not invent them in this paper.
•          Copy button plus a one-line receipt note: date, network, tx hash if the donor sends it. Receipt is optional and
           public-plane only.
•          No legal name. No home. No “support my custody case” copy on the public tab.
•          Do not route donations through Workers KV, D1, or Durable Objects.

    The tab does not lower the KV bill. It funds the cycle cap so the public surface can stay up.

    8. Wire sketch
     IN:     frag → sweep → [bucket] → fold → static → fold → entry → frag → toolkits

    [bucket] sits after SweepGate. Poison never spends a rate token that matters. Operator token short-circuits the
    bucket only.

    Refuse classes:

•          sweep-isolate — payload

•          rate-soft — 429 + cached catalog

•          rate-hard — scraper isolate

•          kv-cap — truncated packed response

    None of those are a public panel.




RL-WP-0.1 Rate Limit and Donation Plan                                                                                        3


Aziel Eliab · local specification · not a fleet-completeness claim




    9. Success
•         KV reads / request ≤ 3 on catalog pages
•         Monthly KV reads near or under the 10 million included, or low enough that $0.50/million is noise
•         Projected cycle cost back under $50 unless traffic is real humans at scale
•         Operator verify / seal / library-sync still works at full depth
•         No Node Gate ships

    10. Cap
    This paper is a plan plus a doctrine cap. It is not the Worker patch itself. The patch lives in aziel-runtime and stays
    server-side.

    Companion papers: CL-WP-0.4, AP-WP-0.2, SG-WP-0.1, LS-WP-0.1.




RL-WP-0.1 Rate Limit and Donation Plan                                                                                        4

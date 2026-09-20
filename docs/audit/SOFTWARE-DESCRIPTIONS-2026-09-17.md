# Softwares descriptions — designed-purpose addendum (2026-09-20)

**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**SoT:** `src/software-copy.js` → `GET /v1/software` `one_line` + `description`  
**Identity:** Aziel Eliab only. GodLock is a product name, not identity.  
**Door:** FragGate is THE Softwares door. Softwares stay separate products.

Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) refresh Softwares tabs from this catalog. Every card names **the designed action** and **why the software exists**.

Operator addendum 2026-09-20: Softwares `one_line` + `description` state only what each product is designed to do. Do **not** write `THIS IS:` / `THIS IS NOT:`, never-invent bans, verified-status marketing, or SLOT / REAL / LIVE placement tags in those fields. Engine `limitation` strings and README honesty banners may still carry placement/refuse copy — those are not catalog Softwares-tab purpose.

Operator override 2026-09-18 (kept): do **not** write `THIS IS:` / `THIS IS NOT:` in Softwares `one_line` or `description`.

Sort law is unchanged: Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock). VeilLock stays `local_only` / `door: none`.

## What changed

| Area | Change |
| --- | --- |
| `src/software-copy.js` | SoT for Softwares slugs: verb-led `one_line` + 1–2 sentence `description` (41 engines + Whitestone Worker-only) |
| `src/software-catalog.js` | Emits `description` on each card; mesh note cites `worker_hardware:false` |
| `src/index.js` | PRODUCTS `oneLine` / `description` / banner fallback read the SoT |
| `scripts/verify-software.mjs` | No empty fields; no THIS-IS / never-invent / verified-status / SLOT-REAL tags; every description has Use + exists |

No capabilities, DOIs, or `` were invented. AZVPN honesty stays HTTPS/WS REAL; WireGuard / OpenVPN / L3 SLOT.

## Shape

- **`one_line`** — one sentence: the designed action. Lead with a verb humans recognize.
- **`description`** — 1–2 sentences: Use X to … It exists so …. No never-invent bans, verified-status marketing, or SLOT / REAL / LIVE tags.

## Examples (before → after)

| Slug | Previous `one_line` | Current `one_line` |
| --- | --- | --- |
| `4dmap` | THIS IS: a four-axis inspection frame T/Δ/Γ/Π after AZPIPE (4DM-WP-1.0). … THIS IS NOT: a sequential gate… | Inspect the same event on time, change, graph, and place axes at once. |
| `azclce` | THIS IS: Jaccard triple / pairwise / CLCE+ inconsistency scoring. THIS IS NOT: intent… | Score how consistently three written layers agree with each other. |
| `godlock` | THIS IS: an offline ABAD / hardening score (GodLock is a product name). … THIS IS NOT: identity, a VPN… | Score text for offline hardening and receive an ephemeral receipt. |
| `azbrowser` | THIS IS: the Lamb Lens ethical research browser… THIS IS NOT: Chromium-by-default… | Browse and search with citations for ethical research. |
| `peacelock` | THIS IS: Chosen silence / chosen inaction as a first-class receipt (PL-WP-0.1). THIS IS NOT: a transcript… | Record chosen silence or chosen inaction as a hash-chained receipt. |

**Rewritten Softwares slugs: 41 engines + Whitestone 1.4.0 Worker-only placement.** Whitestone is live Worker / no FragGate engine / not a lawyer. Mesh extras `one_line` is not a Softwares card; it may still name `THIS IS NOT: a Softwares-tab product` so extras stay distinct from the tab.

Hubs pick up the new copy from `GET /v1/software`. No hub mirror is required unless a hub hardcodes blurbs.

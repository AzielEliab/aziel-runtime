# Softwares descriptions — THIS-IS / THIS-IS-NOT (2026-09-17)

**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**SoT:** `src/software-copy.js` → `GET /v1/software` `one_line` + `description`  
**Identity:** Aziel Eliab only. GodLock is a product name, not identity.  
**Door:** FragGate is THE Softwares door. Softwares stay separate products.

Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) refresh Softwares tabs from this catalog. Every live card now names what it is and what it is not so humans and agents cannot confuse products.

Sort law is unchanged: Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock). VeilLock stays `local_only` / `door: none`.

## What changed

| Area | Change |
| --- | --- |
| `src/software-copy.js` | New SoT: `one_line` + longer `description` for all 41 Softwares slugs |
| `src/software-catalog.js` | Emits `description` on each card; mesh note cites `worker_hardware:false` |
| `src/index.js` | PRODUCTS `oneLine` / `description` / banner fallback read the SoT |
| `src/mesh.js` | extras mesh `one_line` + `MESH_LIMITATION` name Worker cite-only radios |
| `scripts/verify-software.mjs` | No empty `one_line` / `description`; THIS-IS / THIS-IS-NOT; key disambiguation phrases |

No capabilities, DOIs, or `fielded_100` were invented. AZVPN honesty stays HTTPS/WS REAL; WireGuard / OpenVPN / L3 SLOT.

## Disambiguation closes

| Confusion | How the card now refuses it |
| --- | --- |
| AZ-OS vs Lumen / kernel | AZ-OS is isolate ethics status / VFS. THIS IS NOT Lumen, a kernel, or a remote host shell. |
| AZAI vs foundation model | Local OpenAI-compatible runtime + hosted Lamb-check. THIS IS NOT a new foundation model. |
| AZBot vs model | Skill router; `/v1/skill` markdown. THIS IS NOT a foundation model or chat blend. |
| AzielTether vs VPN | Hash-chain survival for downloaded software. THIS IS NOT a VPN or AZVPN. |
| StaticClock vs Lock | Plain Clock; Clock ≠ Lock. THIS IS NOT a Lock product. |
| ARK vs EmbryoLock | ARK is Mode E sweep + deniable-vault cite. THIS IS NOT EmbryoLock. EmbryoLock cites ARK as a Vault/Custody isolation label only. |
| Sister archives vs Softwares | Corpus: azcorpus + azlibrary are website designs. He Didn't Jump is a sister archive, not Softwares. |
| Mesh radios on the Worker | extras mesh + catalog mesh note: `worker_hardware:false` — cite-only, not live Worker RF. |
| GodLock vs identity | GodLock is a product name. Identity is Aziel Eliab only. |

## Slug → old `one_line` → new `one_line`

| Slug | Old | New |
| --- | --- | --- |
| `4dmap` | 4DMap (4DM-WP-1.0): four-axis inspection frame T/Δ/Γ/Π. Inspection frame after AZPIPE, not an extra door (domains_are_doors:false). FragGate only. | THIS IS: a four-axis inspection frame T/Δ/Γ/Π after AZPIPE (4DM-WP-1.0). Inspection frame after AZPIPE, not an extra door (domains_are_doors:false). THIS IS NOT: a sequential gate, a truth score, or a Lumen panel. |
| `azclce` | Jaccard triple / pairwise / CLCE+. Detects inconsistency, not intent. AZCoherence is a separate peer reviewer. | THIS IS: Jaccard triple / pairwise / CLCE+ inconsistency scoring. THIS IS NOT: intent, malice, or a truth score. AZCoherence is a separate peer reviewer. |
| `azos` | Read-only status / principles. Does not grant remote shell. | THIS IS: isolate ethics status, principles, and a prefab session VFS. THIS IS NOT: Lumen, a kernel, SSH, or a remote host shell. |
| `azai` | Local OpenAI-compatible runtime. Not a new foundation model. Jeeves is not sovereign. | THIS IS: a local OpenAI-compatible runtime plus hosted Lamb-check / protocol mirror. THIS IS NOT: a new foundation model, a paid-key proxy, or sovereign Jeeves. |
| `azbot` | Skill, not a foundation model. Hosted /v1/skill returns markdown. | THIS IS: a skill router onto catalog slugs; hosted /v1/skill returns markdown. THIS IS NOT: a foundation model or a chat blend. |
| `azbrowser` | AZBrowser (AZB-1.0): Lamb Lens ethical research browser. Cite; refuse harvest; no invented visits. FragGate only. pairs with AZNet (order/token). AZNet is a separate software (order/token pairing only). | THIS IS: the Lamb Lens ethical research browser (cite; refuse harvest; no invented visits). FragGate only. pairs with AZNet (order/token). AZNet is a separate software (order/token pairing only). THIS IS NOT: Chromium-by-default, a VPN product, or AZNet. |
| `azchat` | AZChat: spendable handles, ephemeral rooms, agent bus. Mesh hop default off. Not SMTP. Not AZMail. FragGate only. | THIS IS: spendable handles, ephemeral rooms, and an agent bus. Mesh hop default off. THIS IS NOT: SMTP, AZMail, or a public mailer. |
| `azcoherence` | AZCoherence: second-pass triad coherence review (primary vs alternate → PASS/FLAG/NEUTRALIZE/REFUSE). Never invents evidence. Confidence ≠ truth. Not AKM-TRIAD. Peer AZ-CLCE is a separate product. | THIS IS: second-pass triad coherence review (primary vs alternate → PASS/FLAG/NEUTRALIZE/REFUSE). THIS IS NOT: AKM-TRIAD or AZ-CLCE. Peer AZ-CLCE is a separate product. |
| `azhub` | AZHub (AIH-WP-1.0): Blank Key / neutral spatial container. Does not interpret. FragGate only. AZInterface is sibling software under the same FragGate door. | THIS IS: the Blank Key / neutral spatial container. THIS IS NOT: an interpreter, AZInterface, or a second FragGate door. AZInterface is sibling software under the same FragGate door. |
| `aziel-corpus` | Self-contained immutable digital library. Public MASTER. Mesh-resident website designs azcorpus + azlibrary downloadable to nodes. Not a 26-card index. | THIS IS: the self-contained public MASTER digital library. Mesh-resident website designs azcorpus + azlibrary download to nodes. THIS IS NOT: a 26-card Softwares index or a sister archive (He Didn't Jump is a sister archive, not Softwares). |
| `azieltether` | AzielTether 0.1.0: central × decentral survival mesh for downloaded Aziel software. Prefer-central; peer sync when down; public HTTPS stays mesh-free. Not a VPN. Author Aziel Eliab. | THIS IS: central × decentral hash-chain survival for downloaded Aziel software. THIS IS NOT: a VPN, AZVPN, or a radio mesh. |
| `azinterface` | AZInterface (AIH-WP-1.0): custodial operating environment. Pre-locked page cycles OFF/integrity/ON/FULL SHUTDOWN/MEMORIAL. FragGate only. AZHub is sibling software under the same FragGate door. | THIS IS: the custodial operating environment with pre-locked page cycles OFF/integrity/ON/FULL SHUTDOWN/MEMORIAL. THIS IS NOT: AZHub, AZ-OS, or Lumen. AZHub is sibling software under the same FragGate door. |
| `azmail` | AZMail (APP 1.0): advisory airlock + local isolate mailbox + anonymous mesh (default off). Not a full internet MTA. FragGate only. | THIS IS: AZMail (APP 1.0) advisory airlock + isolate mailbox + anonymous mail ring (default off). THIS IS NOT: a full internet MTA, SMTP, or AZChat. |
| `aznet` | AZNet (AZN-WP-0.1): silent verification side-net. Hash continuity without hosting. Separate software; functional-order pair with AZBrowser. | THIS IS: a silent verification side-net. Hash continuity without hosting. Separate software; functional-order pair with AZBrowser. THIS IS NOT: a VPN, AZVPN, or AZBrowser. |
| `azvpn` | AZVPN: automatic public VPN concentrator. HTTPS/FragGate envelopes REAL. WireGuard/OpenVPN/L3 SLOT. default_vpn_backend azvpn; auto_use true. FragGate only. Separate from AZNet and AZBrowser. | THIS IS: the automatic public VPN concentrator. HTTPS/WS REAL. WireGuard/OpenVPN/L3 SLOT. THIS IS NOT: a kernel UDP VPN, Tor, or AZNet/AZBrowser. |
| `forgereceipts` | Local receipt mint + verify / import_export. Not legal advice. Does not contact courts. | THIS IS: local receipt mint + verify / import_export. THIS IS NOT: legal advice, a court filing, or TemporalLock. |
| `glossafilter` | Render an intent across bundled peer ids. Human opinion remains human. | THIS IS: deterministic linguistic mediation across bundled peer ids. THIS IS NOT: a live translator, concealment, or a canonical phrasing. |
| `miragegrid` | Ephemeral session node assignment plus Cap-7 name-metadata cite. Not a VPN, not ICANN, not a live registrar. | THIS IS: ephemeral session node assignment plus Cap-7 name-metadata cite. THIS IS NOT: a VPN, ICANN, or a live registrar. |
| `mmconsensus` | MMConsensus: structured consensus over posted opinions. Adjacent to DecisionGATE. No live model calls. FragGate only. | THIS IS: structured consensus over opinions you already posted. THIS IS NOT: live model calls, DecisionGATE, or a truth score. |
| `postking` | Continuity chess. The goal is not to win. The goal is to remain. | THIS IS: continuity chess — the goal is to remain. THIS IS NOT: a win-condition engine or a king for the AI side. |
| `staticclock` | Forward-only gear-click timeline + companion advisory. click, verify, timeslate. Not a rollback clock. | THIS IS: a forward-only gear-click timeline plus companion advisory (plain Clock; Clock ≠ Lock). THIS IS NOT: a Lock product, a rollback clock, or a scheduler. |
| `ark` | Mode E heuristics sweep. Not a kernel. Hosted never unlocks or stores vaults. | THIS IS: Mode E heuristics sweep plus deniable-vault cite. THIS IS NOT: a kernel, EmbryoLock, or a hosted vault unlock. |
| `toolbench` | ToolBench: synthetic FragGate refuse playground. Self-test ≠ third-party lab. Not fielded-100. FragGate only. | THIS IS: a synthetic FragGate refuse playground. THIS IS NOT: a third-party lab or fielded-100. |
| `zsolver` | Nine ontology nodes (Zioncheck seed). Hard 75% cap. Does not solve cases. | THIS IS: nine ontology nodes (Zioncheck seed) with a hard 75% confidence cap. THIS IS NOT: a case solver or a verdict. |
| `zkattest` | ZKAttest: hash-commitment attest without returning the witness. Not Groth16/SNARK. FragGate only. | THIS IS: hash-commitment attest without returning the witness. THIS IS NOT: Groth16, SNARK, or STARK. |
| `decisiongate` | Five sequential gates (Definition, Evidence, Impact, Integrity, Responsibility). PASS/REVISE/BLOCK. wrap is not hosted. | THIS IS: five sequential gates (Definition, Evidence, Impact, Integrity, Responsibility) → PASS/REVISE/BLOCK. THIS IS NOT: wrap-hosted, 4DMap, or MMConsensus. |
| `chronolock` | Temporal Neutral Window advisory 08:30–10:30 local. Distinct from TemporalLock. Not a scheduler. | THIS IS: Temporal Neutral Window advisory 08:30–10:30 local. THIS IS NOT: TemporalLock, StaticClock, or a scheduler. |
| `codelock` | Canonical or Rosetta HTML view of source. Alters perception, not meaning. | THIS IS: a Canonical or Rosetta HTML view of source. THIS IS NOT: a meaning change, a compiler, or a lock on execution. |
| `embryolock` | Offline destructive-over-recovery vault. Cite live on FragGate; wipe/unlock stay local-only. Never execute on the public mesh. | THIS IS: an offline destructive-over-recovery vault (cite live on FragGate; wipe/unlock stay local-only). THIS IS NOT: a hosted unlock, ARK, or a public-mesh wipe. |
| `employeelock` | Hash-chained accountability workbook. Not a court, not UL, not a truth score. | THIS IS: a hash-chained accountability workbook. THIS IS NOT: a court, UL, or a truth score. |
| `foldlock` | Algorithmic tether-word suppression on UTF-8 text. Not zip. | THIS IS: algorithmic tether-word suppression on UTF-8 text. THIS IS NOT: zip or a general compressor. |
| `godlock` | Offline ABAD / hardening score. Not a VPN and not an anonymity network. | THIS IS: an offline ABAD / hardening score (GodLock is a product name). THIS IS NOT: identity, a VPN, or an anonymity network. Identity is Aziel Eliab only. |
| `mialock` | M.I.A.Lock 0.1.1: event map + Doe matching + uncertainty ellipses + coverage heat. Doe leads ≠ ID. Heat ≠ presence. Author Aziel Eliab. | THIS IS: event map + Doe matching + uncertainty ellipses + coverage heat. THIS IS NOT: an ID, live tracking, or presence. Doe leads ≠ ID. Heat ≠ presence. |
| `peacelock` | Chosen silence / chosen inaction as a first-class receipt (PL-WP-0.1). | THIS IS: Chosen silence / chosen inaction as a first-class receipt (PL-WP-0.1). THIS IS NOT: a transcript, a court, or TemporalLock. |
| `shadowlock` | Zero-retention observation of a job list you already have. No OS hook. | THIS IS: zero-retention observation of a job list you already have. THIS IS NOT: an OS hook or process intercept. |
| `spectrallock` | 256px overlay preview (zero/tazel/vyrn/uv/rosetta/zen/chaos/balance). Not a spectrometer. | THIS IS: a 256px overlay preview (zero/tazel/vyrn/uv/rosetta/zen/chaos/balance). THIS IS NOT: a spectrometer or a forensic claim. |
| `temporallock` | Hash-chained receipts + timeslate lattice. genesis, append, verify, timeslate, gate. Not a truth claim. | THIS IS: hash-chained receipts + timeslate lattice (genesis, append, verify, timeslate, gate). THIS IS NOT: a truth claim, a scheduler, or StaticClock. |
| `trajectorylock` | Auditable geometric compatibility vs a declared line. Research prototype. Hosted never stores media. | THIS IS: an auditable geometric-compatibility test vs a declared line (research prototype). THIS IS NOT: a certified forensic instrument. Hosted never stores media. |
| `veillock` | Local camera/screen steps for YOUR device only. Not a call interceptor. | THIS IS: local camera/screen steps for YOUR device only (local_only; no public FragGate door). THIS IS NOT: a call interceptor or a virtual camera. |
| `vibelock` | Physical-consistency evaluation of speech audio. Risk assessment, not a liveness proof. | THIS IS: physical-consistency evaluation of speech audio (risk assessment). THIS IS NOT: a liveness proof or a live microphone. |
| `whistlelock` | Local drop ledger + dead-man copy. Not a mailer. | THIS IS: a local drop ledger + dead-man copy. THIS IS NOT: a mailer or a public CDN. |

**Rewritten Softwares slugs: 41.** Mesh extras `one_line` is not a Softwares card; it was clarified for `worker_hardware:false` only.

Longer `description` fields (previously empty on hub snapshots) now carry the same THIS-IS / THIS-IS-NOT law with neighbor / refuse detail already honest in PRODUCT banners.

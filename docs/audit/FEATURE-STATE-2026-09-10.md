# AZIEL RUNTIME — Disabled, Off, Stubbed, Gated & Not-Yet-Implemented Feature Audit

Baseline aziel-runtime 1.7.3 | close 1.9.0 (AZRT-1.9-CLOSE-1.0) | 2026-09-10.

Identity: Aziel Eliab.

PDF: binary was provided as `FEATURE-STATE-2026-09-10.pdf`. Path for GitBaby: `docs/audit/FEATURE-STATE-2026-09-10.pdf`. If the original binary cannot be embedded, this markdown is the full inventory; keep that PDF path.

This file is the authoritative intentional-OFF vs gaps inventory for 1.7.3+. Not a Softwares-tab product. Not a FragGate slug. Do not enable mesh or safety stubs. Runtime **1.7.9** cross-maps AZCoherence (peers / `cross_map`; domain stays null). Runtime **1.7.8** lands EmbryoLock as live-with-local-destructive-boundary (wipe/scorch/unlock stay FG-STUB). Runtime **1.7.7** lands AZCoherence as a Softwares-tab placement. Neither land enables any remain-off item or puts AKM-TRIAD on the Softwares-tab.

Companion constitutional OFF set (33 items that do NOT count as missing when correctly off/refused/gated): [REMAIN-OFF-BY-DESIGN-2026-09-10](../designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md). FEATURE-STATE lists gaps vs intentional OFF; that paper is the must-stay-off set. Do not enable remain-off items from either cite.

---

States: OFF/disabled, STUB, LOCAL ONLY/gated, NOT IMPLEMENTED, PARTIAL/fallback.

Inventory 1–50:

1 QNM/Node Mesh radios OFF default
2 QNS proxying OFF (QNS-NO-PROXY)
3 Public mesh auto-enable DISABLED
4 EmbryoLock LIVE + local-destructive-boundary (1.7.8; wipe/scorch/unlock stay FG-STUB on public mesh)
5 AZChat LIVE+bound (1.8.4 / 1.9.0; mesh_enabled_default false; not AZMail)
6 VeilLock public execution LOCAL ONLY
7 VeilLock inject/intercept/facetime STUB
8 ARK scorch/wipe/unlock/encrypt STUB
9 WhistleLock send/mail/release STUB
10 MirageGrid VPN-hop STUB
11 AzielTether mesh-join/vpn/arm STUB
12 AZ-OS exec/shell STUB
13 AZAI blend/complete/chat STUB (protocol mirror)
14 EmployeeLock court/judge STUB
15 PeaceLock transcript/motive/etc STUB
16 4DMap truth_score/lumen/invent_mark/backdate STUB
17–18 AZBrowser tor_exit/phoenix_wipe STUB
19 AZBrowser Chromium NOT IMPLEMENTED (DEFERRED)
20 AZMail SMTP NOT IMPLEMENTED (no public MTA)
21 AZMail deanonymization STUB (ASSESS — harness + example only)
22 AZMail anonymous mesh OFF default (ASSESS — stay OFF)
23 TrajectoryLock media store CLOSED — isolate hash object store (no CDN; store_media refuse)
24 WhistleLock file store CLOSED — isolate hash object store (no CDN; send/mail/release refuse)
25 AZNet payload hosting DISABLED BY DESIGN
26 AZNet unpaired privileged CONDITIONALLY OFF
27 AZHub auto-unlock OFF
28 AZInterface page cycles PRE-LOCKED
29 Corpus D1/Whisper/OCR PARTIAL/PROXY — native-vs-proxy labels (1.9.0)
30 Universal local execution NOT COMPLETE — named fallback inventory (1.9.0)
31–32 Public/RoseClock rollback OFF
33 LambGate OFF not a hop
34 ASE OPTIONAL
35 ZD30 ABSENT
36–37 AZPIPE public engine/mutation DISABLED/OFF
38 AKM Softwares-tab DISABLED BY DESIGN (live fabric)
39 AKM rebuild-index OPERATOR-GATED
40 Memory posterior auth OFF
41 Unauth session mutate OFF in prod
42 Unknown tools REFUSE
43 Destructive/fantasy REFUSE
44 Full internal MCP LIMITED
45 Complete OpenAPI CLOSED — catalog /p/{slug}/{op} proxy paths (not exec)
46 /p default agent path OFF BY DESIGN
47 FragGate not catalog engine
48 Node Mesh not normal catalog engine
49 Per-domain public doors OFF
50 Zenodo live publication INACTIVE

Bottom line: most catalog wired in-process; unfinished concentrated in networking, external action, stubs, distribution. Security/architecture intentional OFF must stay. Identity Aziel Eliab.

---

EmbryoLock at 1.7.8: item 4 is live-with-local-destructive-boundary (true in-process engine, `engine_digest`, Softwares `worker_home` https://embryolock-download-tracker.vibelock.workers.dev/). Wipe / scorch / unlock-after-fail stay `FG-STUB` on the public mesh — Never execute on the public mesh. This ingest does not host public wipe/unlock.

Cite: Eliab, Aziel. (2026). FEATURE-STATE-2026-09-10 [Audit]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/FEATURE-STATE-2026-09-10.md

Companion: Eliab, Aziel. (2026). REMAIN-OFF-BY-DESIGN-2026-09-10 [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md

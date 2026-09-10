# AZL-VOL-1.0

Author: Aziel Eliab only.

---

AZL-VOL-1.0                                                                                                      Aziel Eliab · public work identity only




Software Catalog and Lattice Ledger
AZL-VOL-1.0 · runtime 1.6.13 · registry 3de5ed2e23ae9a76 · 2026-09-06 · Aziel Eliab

Volume of each named software on the public FragGate door, plus the hash-chained temporal question × act record an agent
is allowed to read. Not a kit. Not a new FragGate slug. Clock is not Lock. Mesh default OFF.

    AI reads the lattice by citing record hashes. It does not remember answers. Encryption, when used, is a
    local envelope whose hash enters the chain. The chain itself is not a ciphertext.

1. How an AI reads this lattice
Attach at POST /mcp or POST /v1/fraggate/call. Pipeline: fraggate_list → fraggate_describe → fraggate_call. Every call that
matters writes an AZL-LEDGER record whose payload is the question or act bytes, slug, op, and engine digest. The model
sentence is render only.

  • Cite record.hash + kind + question + payload_sha256. That is recollection.
  • If ZionPattern is missing, cite triad and say solver not run. Do not invent a blended percent.
  • If the door refuses, cite the refuse record. Do not retry under a new name.
  • Do not put passwords, token bodies, cookies, or model sentences in payload.
  • To verify: python3 azl-ledger/reader.py verify acts.jsonl then export-ai.
  • Catalog file for agents: azl-ledger/catalog.json (live slugs, ops, stubs as of 1.6.13).


2. Hash chain versus encryption
Two different machines. People collapse them into one sentence.

  Layer                                  What it does                                              What it does not do

  Hash chain (this ledger +              Proves order and integrity of questions and acts.         Does not hide bytes. Public records are readable.
  TemporalLock)                          Anyone can verify SHA-256 over canonical JSON.

  Local envelope (ARK / OS               Encrypts secrets on the operator disk. Ledger stores      Hosted Workers do not unlock vaults. Public door
  keychain)                              envelope_sha256 only.                                     stubs unlock / encrypt / scorch.

  EmbryoLock                             Local-not-hosted destructive vault. Name on the           Not a FragGate engine. Not a hosted Worker.
                                         software tab.

  Publish gate                           Official API token in env/keychain +                      Not encryption. Not browser login.
                                         AZBOT_PUBLISH=1.




3. Exec pipe
    open → DecisionGATE → fraggate_call(slug, op, payload) → timeslate(question|act) → render
    (disposable) → close

Call URL: https://aziel-runtime.vibelock.workers.dev/v1/fraggate/call · MCP: https://aziel-runtime.vibelock.workers.dev/mcp · OpenAPI:
https://aziel-runtime.vibelock.workers.dev/openapi.json · Kernel: https://github.com/AzielEliab/fraggate (FG-0.1)


4. Counts (2026-09-06, runtime 1.6.13)
  Measure                                       N               Note

  Software-tab entries                          34              plain → gate → lock. EmbryoLock is the stub product.




Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                                                     page 1


AZL-VOL-1.0                                                                                                             Aziel Eliab · public work identity only




  Measure                                     N                 Note

  Live software-tab                           33                Hosted card exists.

  FragGate live slugs                         33                Allowlist on the door.

  FragGate stub ops                           124               Named refuse. Not silent 404.

  Local-only count                            1                 Full node / vault stays local.

  FG product_count                            35                live + local_only + stub must still sum.


Separate software / sibling software under one FragGate door. Never separate FragGate engines. Clock is not Lock. Sort law:
plain A–Z → gate A–Z → lock A–Z (Clock ≠ Lock).


5. How to call any live slug
POST          /v1/fraggate/call        with        header        User-Agent:  Mozilla/5.0    and      JSON
{"slug":"temporallock","op":"verify","payload":{...}}. Unknown slug → FG-HALLUC-TOOL. Stub op → named refuse
receipt. Mesh enable is operator bearer only; GET /v1/mesh never enables.


6. Index of software
  Bucket             Slug                     Ver                      Door              Live ops

  plain              azclce                   0.3.0                    yes               score, classify, gate, health, skill

  plain              azos                     0.3.0                    yes               status, health, skill

  plain              azai                     0.3.1                    yes               lamb-check, lamb_check, health, skill

  plain              azbot                    0.2.0                    yes               route, health, skill

  plain              azbrowser                0.1.0                    yes               ethical_search, lamb_lens_search, navigate, airlock_ingest,
                                                                                         tab_open, tab_list, receipt_list, verify, receipt_verify, health,
                                                                                         skill, airlock, home

  plain              azhub                    0.1.0                    yes               health, skill, region_list, place_module, remove_module,
                                                                                         tether_declare, tether_cut, tether_list, blank_key_status,
                                                                                         list_modules, place

  plain              aziel-corpus             2.6.2                    yes               search, example, skill, health

  plain              azieltether              0.1.0                    yes               verify, health, skill

  plain              azinterface              0.1.0                    yes               health, skill, genesis_status, site_state_get, site_state_set,
                                                                                         integrity_check, witness_list, page_cycle_status, genesis_boot,
                                                                                         hold

  plain              azmail                   0.1.0                    yes               airlock_classify, scrub, trust_score, mesh_post, mesh_poll,
                                                                                         mesh_listen, mesh_enable, mesh_disable, keyword_alert_set,
                                                                                         keyword_alert_list, keyword_alert_check, health, skill, classify

  plain              aznet                    0.1.0                    yes               health, pair_status, garden_list, stamp, verify_hash,
                                                                                         memorial_list, memorial_append, receipt_verify, skill, doctor,
                                                                                         pair

  plain              forgereceipts            0.3.0                    yes               receipt, health, skill

  plain              glossafilter             0.1.0                    yes               render, health, skill

  plain              miragegrid               0.2.0                    yes               assign, health, skill

  plain              postking                 0.1.0                    yes               new, move, status, health, skill




Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                                                                page 2


AZL-VOL-1.0                                                                                                 Aziel Eliab · public work identity only




  Bucket           Slug                       Ver               Door       Live ops

  plain            staticclock                0.2.0             yes        advise, health, skill

  plain            ark                        0.1.0             yes        sweep, levels, health, skill

  plain            zsolver                    0.2.0             yes        patterns, score, session, health, skill

  gate             decisiongate               0.1.0             yes        check, evaluate, health, skill

  lock             chronolock                 0.1.0             yes        advisory, anchors, health, skill

  lock             codelock                   0.1.0             yes        render, health, skill

  lock             embryolock                 —                 tab-only   —

  lock             employeelock               0.1.0             yes        append-preview, verify-canonical, health, skill

  lock             foldlock                   0.8.0             yes        fold-preview, unfold-preview, health, skill

  lock             godlock                    0.1.0             yes        score, submit, health, skill

  lock             mialock                    0.1.1             yes        map, search-options, queries, doe-match, coverage, example,
                                                                           health, skill

  lock             peacelock                  0.1.0             yes        open, seal, break, show, verify, stamp, upload_envelope, health,
                                                                           skill, doctor

  lock             shadowlock                 0.2.0             yes        observe, health, skill

  lock             spectrallock               0.3.0             yes        modes, overlay, health, skill

  lock             temporallock               0.2.0             yes        genesis, append, verify, health, skill

  lock             trajectorylock             0.1.0             yes        example, analyze, health, skill

  lock             veillock                   0.2.0             tab-only   —

  lock             vibelock                   0.3.0             yes        analyze, health, skill

  lock             whistlelock                0.1.0             yes        hash-preview, canon-preview, health, skill

  kernel           mesh                       QNM-BUILD-1.0     yes        status, enable, disable, join, heartbeat, leave, nodes, broadcast,
                                                                           health, skill, mesh_status, mesh_enable, mesh_disable,
                                                                           mesh_join, mesh_heartbeat, mesh_leave, mesh_nodes,
                                                                           mesh_broadcast




Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                                               page 3


AZL-VOL-1.0                                                                                                              Aziel Eliab · public work identity only




7. Individual software — how each one works
Each card is the public door truth as of runtime 1.6.13. How = official one-line + live ops + what is stub-refused + the Q×act
note. GitHub and counted Worker URLs are listed so an agent can pull, not so a human has to hunt.

AZ-CLCE · azclce · 0.3.0 · live
Jaccard triple / pairwise / CLCE+. Detects inconsistency, not intent.

How. Jaccard / CLCE+ inconsistency detection. Detects inconsistency, not intent.
Live ops. score, classify, gate, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/az-clce


AZ-OS · azos · 0.3.0 · live
Read-only status / principles. Does not grant remote shell.

How. Read-only principles and status. exec is stub. Does not grant remote shell.
Live ops. status, health, skill
Stub-refused ops. exec, shell, lattice
GitHub. https://github.com/AzielEliab/azos


AZAI · azai · 0.3.1 · live
Local OpenAI-compatible runtime. Not a new foundation model. Jeeves is not sovereign.

How. Local OpenAI-compatible runtime. Not a new foundation model. Jeeves is not sovereign. lamb-check only on the
public door.
Live ops. lamb-check, lamb_check, health, skill
Stub-refused ops. blend, complete, chat
GitHub. https://github.com/AzielEliab/azai


AZBot · azbot · 0.2.0 · live
Skill, not a foundation model. Hosted /v1/skill returns markdown.

How. Harness / skill. Hosted /v1/skill is markdown. Local 1.1 adds profiles, act ledger, publish gate. Does not ship model
weights. route is the public op.
Live ops. route, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/azbot


AZBrowser · azbrowser · 0.1.0 · live
AZBrowser (AZB-1.0): Lamb Lens ethical research browser. Cite; refuse harvest; no invented visits. FragGate only. AZNet
is a separate software (order/token pairing only).

How. Lamb Lens ethical research browser. Cite. Refuse harvest. No invented visits. Pair-order with AZNet only.
airlock_ingest is ingest-to-receipt, not login.
Live ops. ethical_search, lamb_lens_search, navigate, airlock_ingest, tab_open, tab_list, receipt_list, verify, receipt_verify, health, skill, airlock, home
Stub-refused ops. tor_exit, tor, onion, phoenix_wipe, wipe, scorch, chromium, chromium_exec, chrome, exec, playwright, puppeteer, proxy,
unrestricted_proxy, socks, vpn, keylog, keylogger, clipboard, harvest, spy, surveillance, wiretap, intercept, inject, track
GitHub. https://github.com/AzielEliab/azbrowser




Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                                                              page 4


AZL-VOL-1.0                                                                                                           Aziel Eliab · public work identity only




AZHub · azhub · 0.1.0 · live
AZHub (AIH-WP-1.0): Blank Key / neutral spatial container. Does not interpret. FragGate only. AZInterface is sibling
software under the same FragGate door.

How. Blank Key spatial container. Places modules. Does not interpret them. Sibling of AZInterface under the same door.
Live ops. health, skill, region_list, place_module, remove_module, tether_declare, tether_cut, tether_list, blank_key_status, list_modules, place
Stub-refused ops. scorch_remote, auto_unlock, ranking, completeness_detect, unlock, complete, completeness, rank, scorch
GitHub. https://github.com/AzielEliab/azhub


Aziel Digital Library · aziel-corpus · 2.6.2 · live
Self-contained immutable digital library. Public MASTER. Not a 26-card index.

How. Content-addressed library. search / example are lookups. The object is the record hash, not a gloss. ZionPattern may be
empty; then return triad + solver-not-run.
Live ops. search, example, skill, health
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/aziel-corpus


AzielTether · azieltether · 0.1.0 · live
AzielTether 0.1.0: central × decentral survival mesh for downloaded Aziel software. Prefer-central; peer sync when down;
public HTTPS stays mesh-free. Not a VPN. Author Aziel Eliab.

How. Survival mesh for downloaded copies. Prefer-central; peer sync when down. Public HTTPS stays mesh-free. vpn / arm
/ mesh-join stub.
Live ops. verify, health, skill
Stub-refused ops. mesh-join, vpn, arm
GitHub. https://github.com/AzielEliab/azieltether


AZInterface · azinterface · 0.1.0 · live
AZInterface (AIH-WP-1.0): custodial operating environment. Pre-locked page cycles OFF/integrity/ON/FULL
SHUTDOWN/MEMORIAL. FragGate only. AZHub is sibling software under the same FragGate door.

How. Custodial operating environment. Page cycles OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. Does not
exec catalog engines itself.
Live ops. health, skill, genesis_status, site_state_get, site_state_set, integrity_check, witness_list, page_cycle_status, genesis_boot, hold
Stub-refused ops. scorch_remote, auto_unlock, ranking, completeness_detect, unlock, complete, completeness, rank, scorch, skip_cycle, invent_cycle
GitHub. https://github.com/AzielEliab/azinterface


AZMail · azmail · 0.1.0 · live
AZMail (APP 1.0): anonymous MCP mesh + advisory airlock. Not a full internet MTA. Mesh default off. FragGate only.

How. Advisory airlock + optional anonymous ring. Not an MTA. smtp / send / login / harvest are stub-refused. Mesh default
off.
Live ops. airlock_classify, scrub, trust_score, mesh_post, mesh_poll, mesh_listen, mesh_enable, mesh_disable, keyword_alert_set, keyword_alert_list,
keyword_alert_check, health, skill, classify
Stub-refused ops. smtp, smtp_send, send, mail, deliver, imap, pop3, mx, identify, deanonymize, unmask, whois, harvest, credential_capture, login
GitHub. https://github.com/AzielEliab/azmail




Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                                                         page 5


AZL-VOL-1.0                                                                                                       Aziel Eliab · public work identity only




AZNet · aznet · 0.1.0 · live
AZNet (AZN-WP-0.1): silent verification side-net. Hash continuity without hosting. Separate software; functional-order pair
with AZBrowser.

How. Silent verification side-net. Hash continuity without hosting payloads. Memorial list/append are verification objects,
not a social feed.
Live ops. health, pair_status, garden_list, stamp, verify_hash, memorial_list, memorial_append, receipt_verify, skill, doctor, pair
Stub-refused ops. payload_host, serve_content_for_peer, analytics, ranking, repair_integrity_bypass, interface, lumen, hub, interface_hook, lumen_hook,
hub_hook
GitHub. https://github.com/AzielEliab/aznet


ForgeReceipts · forgereceipts · 0.3.0 · live
ForgeReceipts 0.3.0: Local receipt / checklist helper with jurisdiction-aware state picker (all 50 states + federal baseline)
customizing UI/legal framing. Not legal advice. Does not contact courts. Author Aziel Eliab.

How. Local checklist / receipt helper. Jurisdiction picker changes framing, not a court filing. Does not contact courts. An act
here is ‘issued a local receipt’, not a submission.
Live ops. receipt, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/forgereceipts


Glossa Filter · glossafilter · 0.1.0 · live
Render an intent across bundled peer ids. Human opinion remains human.

How. Render an intent across bundled peer ids. Human opinion remains human.
Live ops. render, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/glossafilter


MirageGrid · miragegrid · 0.2.0 · live
Ephemeral session node assignment. Not a VPN and not an anonymity network.

How. Ephemeral session node assignment. Not a VPN. vpn-hop / hop / tunnel / mesh stub.
Live ops. assign, health, skill
Stub-refused ops. vpn-hop, hop, tunnel, mesh
GitHub. https://github.com/AzielEliab/miragegrid


Post-King Chess · postking · 0.1.0 · live
Continuity chess. The goal is not to win. The goal is to remain.

How. Continuity chess. The goal is not to win. The goal is to remain.
Live ops. new, move, status, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/postking-chess


StaticClock · staticclock · 0.2.0 · live
Five advisory fields for a geo. Not a scheduler.

How. Five advisory fields for a geo. Not a scheduler. Clock ≠ Lock.
Live ops. advise, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/staticclock



Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                                                     page 6


AZL-VOL-1.0                                                                                 Aziel Eliab · public work identity only




The ARK · ark · 0.1.0 · live
Mode E heuristics sweep. Not a kernel. Hosted never unlocks or stores vaults.

How. Mode E heuristics sweep and levels. Hosted never unlocks or stores vaults. scorch / wipe / unlock / encrypt are stub on
the public door.
Live ops. sweep, levels, health, skill
Stub-refused ops. scorch, wipe, unlock, encrypt
GitHub. https://github.com/AzielEliab/ark


ZionPattern Solver · zsolver · 0.2.0 · live
Nine ontology nodes (Zioncheck seed). Hard 75% cap. Does not solve cases.

How. Nine ontology nodes. Hard 75% cap. Does not solve cases. Missing run must not be averaged into trust.
Live ops. patterns, score, session, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/zion-pattern-solver


DecisionGATE · decisiongate · 0.1.0 · live
Five sequential gates on a proposal. Freedom without clarity is chaos.

How. Five sequential gates on a proposal: Definition, Evidence, Impact, Integrity, Responsibility. Pre-exec only. PASS /
REVISE / BLOCK. BLOCK is a hashed refuse.
Live ops. check, evaluate, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/decisiongate


ChronoLock · chronolock · 0.1.0 · live
Advisory temporal window 08:30–10:30 local. Distinct from TemporalLock.

How. Advisory temporal window 08:30–10:30 local. Distinct from TemporalLock (receipts).
Live ops. advisory, anchors, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/chronolock


CodeLock · codelock · 0.1.0 · live
Canonical or Rosetta HTML view of source. Alters perception, not meaning.

How. Canonical or Rosetta HTML view of source. Alters perception, not meaning.
Live ops. render, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/codelock


EmbryoLock · embryolock · 1.1.0 · live-with-local-destructive-boundary
True in-process engine. Health / skill / doctor / verify-hash / policy / limitation cite on the public FragGate door. Wipe / scorch / unlock-after-fail stay local-only — Never execute on the public mesh. Author: Aziel Eliab.

How. Cite the Stealth+ v1.1 local-vault contract (Argon2id + AES-GCM as declared in Open Source Code). This isolate does not run the KDF or AEAD. Forgotten password = permanent loss.
Destructive-by-design local vault stays local.
Live ops. health, skill, doctor, verify_hash, policy, limitation
Stub-refused ops. wipe, scorch, unlock, unlock-after-fail, encrypt, decrypt, initialize, login
GitHub. https://github.com/AzielEliab/EmbryoLock




Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                               page 7


AZL-VOL-1.0                                                                                         Aziel Eliab · public work identity only




EmployeeLock · employeelock · 0.1.0 · live
Hash-chained accountability workbook. Not a court, not UL, not a truth score.

How. Hash-chained accountability workbook. Not a court, not Unowned Lattice, not a truth score.
Live ops. append-preview, verify-canonical, health, skill
Stub-refused ops. court, judge
GitHub. https://github.com/AzielEliab/employeelock


FoldLock · foldlock · 0.8.0 · live
Algorithmic tether-word suppression on UTF-8 text. Not zip.

How. Algorithmic tether-word suppression on UTF-8 text. Preview fold/unfold. Not zip. Not encryption of a file format.
Live ops. fold-preview, unfold-preview, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/foldlock


GodLock · godlock · 0.1.0 · live
Offline ABAD / hardening score. Not a VPN and not an anonymity network.

How. Offline ABAD / hardening score and public stress-test node. score and submit are catalog ops. Not a VPN.
Hash-chained public ledger on godlock.uk.
Live ops. score, submit, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/godlock


M.I.A.Lock · mialock · 0.1.1 · live
M.I.A.Lock 0.1.1: event map + Doe matching + uncertainty ellipses + coverage heat. Doe leads ≠ ID. Heat ≠ presence.
Author Aziel Eliab.

How. Event map + Doe matching + uncertainty ellipses + coverage heat. Doe leads are not an ID. Heat is not presence.
Live ops. map, search-options, queries, doe-match, coverage, example, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/mialock


PeaceLock · peacelock · 0.1.0 · live
Chosen silence / chosen inaction as a first-class receipt (PL-WP-0.1).

How. Chosen silence or chosen inaction as a first-class receipt. No transcript of the unspoken. No counterfactual act.
Live ops. open, seal, break, show, verify, stamp, upload_envelope, health, skill, doctor
Stub-refused ops. transcript, transcribe, motive, counterfactual, invent, waive-duty, bypass-duty
GitHub. https://github.com/AzielEliab/peacelock


ShadowLock · shadowlock · 0.2.0 · live
Zero-retention observation of a job list you already have. No OS hook.

How. Zero-retention observation of a job list the operator already has. No OS hook.
Live ops. observe, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/shadowlock




Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                                       page 8


AZL-VOL-1.0                                                                                    Aziel Eliab · public work identity only




SpectralLock · spectrallock · 0.3.0 · live
Overlay preview modes. 256px hosted preview, not a spectrometer.

How. Overlay preview modes. 256px hosted preview, not a spectrometer.
Live ops. modes, overlay, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/spectrallock


TemporalLock · temporallock · 0.2.0 · live
Hash-chained receipts anyone can verify. Explicit genesis, append, verify.

How. Genesis writes prev=0×64. Append takes prior tip + new record bytes. Verify recomputes SHA-256 over canonical
JSON. This is the receipt primitive the Q×act ledger specializes. Hosted ops do not store operator vaults.
Live ops. genesis, append, verify, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/temporallock


TrajectoryLock · trajectorylock · 0.1.0 · live
Auditable geometric test. Research prototype, not a certified forensic instrument.

How. Auditable geometric test. Research prototype, not a certified forensic instrument.
Live ops. example, analyze, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/trajectorylock


VeilLock · veillock · 0.2.0 · live
Local camera/screen steps for YOUR device only. Not a call interceptor.

How. Local camera/screen steps for the operator device only. Not a call interceptor. inject / intercept / facetime stub. Listed
on the software tab; ops are local-first.
Live ops. (none on public door)
Stub-refused ops. inject, intercept, facetime
GitHub. https://github.com/AzielEliab/veillock


VibeLock · vibelock · 0.3.0 · live
Physical-consistency evaluation of speech audio. Risk assessment, not a liveness proof.

How. Physical-consistency evaluation of speech audio. Risk assessment, not a liveness proof.
Live ops. analyze, health, skill
Stub-refused ops. —
GitHub. https://github.com/AzielEliab/vibelock


WhistleLock · whistlelock · 0.1.0 · live
Local drop ledger + dead-man copy. Not a mailer.

How. Local drop ledger + dead-man copy. hash-preview / canon-preview only on the door. send / mail / release stub. Not a
mailer.
Live ops. hash-preview, canon-preview, health, skill
Stub-refused ops. send, mail, release
GitHub. https://github.com/AzielEliab/whistlelock




Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                                  page 9


AZL-VOL-1.0                                                                                                            Aziel Eliab · public work identity only




Quantum Node Mesh · mesh · QNM-BUILD-1.0 · live-default-off
Suite rollup. Default OFF. Not a Softwares-tab product. Full node is local qnm-node/.

How. QNM suite rollup. GET /v1/mesh never enables. Operator bearer enable only. Default radios off.
Views/MCP/downloads do not enter QNM-S. Full node is local qnm-node/.
Live ops. status, enable, disable, join, heartbeat, leave, nodes, broadcast, health, skill, mesh_status, mesh_enable, mesh_disable, mesh_join,
mesh_heartbeat, mesh_leave, mesh_nodes, mesh_broadcast
Stub-refused ops. arm, wipe, vpn, hop, tunnel, scorch, login, recover, recovery, resurrection, resurrect, account, gate, ip-panel, ippanel, publish,
phoenix-hunt, phoenix_hunt, heal, controller
GitHub. —


8. AZL-LEDGER-1.0 record
Canonical JSON, sort_keys true, separators comma-colon. hash = SHA-256 of {prev, kind, profile, question, payload, utc}.
Genesis prev is 64 zeros. File format is JSONL, one record per line. Schema: azl-ledger/schema.json. Reader:
azl-ledger/reader.py. Example chain: azl-ledger/acts.example.jsonl.

  Field                        Rule

  prev / hash                  64 hex. hash covers prev + body. Break either and verify fails.

  kind                         genesis | question | act | ask | call | queue | hold | refuse | verify | seal

  profile                      operator | shelf | runtime | publisher | coder | or local slug

  question                     The typed question or the act verb. Never the model reply.

  payload                      slug, op, input, verdict, why, http, text_sha256, envelope_sha256, engine_digest, token_present. No password, no token
                               body, no cookie, no model_sentence.

  utc                          YYYY-MM-DDTHH:MM:SSZ


TemporalLock remains the catalog engine (genesis / append / verify). AZL-LEDGER is the question × act specialization
written beside it so a model has a single cite rule. It is not a 36th software-tab product.


9. Surfaces an agent may use
  Surface                                              URL / path

  Runtime / MCP / OpenAPI                              https://aziel-runtime.vibelock.workers.dev/

  Library front door                                   https://www.azielcorpuslibrary.net/runtime

  Library MASTER                                       https://www.azielcorpuslibrary.net/

  GodLock node                                         https://godlock.uk

  Host (not login-recovery)                            https://azieleliab.com

  This volume’s machine pack                           /home/workdir/artifacts/azl-ledger/




10. Never
  • Treat a generated sentence as a chained object.
  • Invent a slug that is not on the FragGate allowlist.
  • Call a stub op and pretend it executed.
  • Put secrets in the ledger.
  • Enable mesh from a GET or from a public UI switch.


Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                                                          page 10


AZL-VOL-1.0                                                                               Aziel Eliab · public work identity only




  • Claim this volume ships model weights.
  • Place a legal name or home location on a public copy of this file.
  • Average a missing ZionPattern into a trust percent.


11. Restraint
Live one-lines and ops are copied from aziel-runtime 1.6.13 on 2026-09-06. Internal unpublished code is not claimed. Hash
chains and content-addressed stores pre-exist. The cut is the cite rule: next agent points at the record hash.

Public identity on this file is Aziel Eliab only. Provisional. Dated 2026-09-06.

    If the files hold, the name was never the point.




Software catalog + Q×act ledger · runtime 1.6.13 · 2026-09-06                                                            page 11

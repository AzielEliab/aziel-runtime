# Architecture fit — five capabilities (2.0 public contract)

**Author / identity:** **Aziel Eliab** only  
**Runtime:** `2.0.0-rc1`  
**Lamb Lens:** Service → Clarity → Peace (fabric ethics **after** FragGate, not a second door)  
**NO-LIE / NO-REWRITE:** receipts that still hash; no rewrite key; never claim crypto / consensus / VMs that this isolate does not run.

This map fits five operator asks onto the **frozen MASTER-33 hop order** without breaking FragGate, Cap-7 honesty, individual engines, or the 40-tool MCP cap.

Locked strip (cite `GET /v1/azpipe/arch`):

> Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return

FragGate is THE single public executable door: `fraggate_list` → `fraggate_describe` → `fraggate_call`.  
`POST /p/{slug}/{op}` is **proxy, not exec**. Worker / Durable Object isolate **is** the jail.

---

## Honesty labels

| Label | Meaning |
|-------|---------|
| **REAL** | Code in this repo performs the named act. |
| **HEURISTIC** | Deterministic scoring / tally over caller-supplied data. Not a model. Not a truth score. |
| **SLOT** | Named and refused (`FG-STUB` or `guest_vm_refused`). Not implemented. Do not claim LIVE. |

---

## 1. Zero-knowledge proofs → `zkattest`

| Field | Fit |
|-------|-----|
| Hop | **ForgeReceipts / Return** neighbor. Attest after ChainLock-OUT packaging. Not a new door. |
| Slug | `zkattest` (Softwares-tab **placement** `receipt-attest`, domain **null** — not a 34th isolation software) |
| LIVE_OPS | `health`, `skill`, `doctor`, `commit`, `attest`, `open`, `verify`, `limitation` |
| REAL | SHA-256 commitment of `{ salt, witness }`. `attest` binds a public statement to that commitment **without returning the witness**. `verify` recomputes the public receipt hash. |
| REAL-not-ZK | `open` checks an opening the caller already holds (reveals the witness to that caller). |
| SLOT | `groth16`, `snark`, `stark`, `plonk`, `bulletproofs`, `pairing`, `trusted_setup`, `prove`, `full_zk`, `zk_snark`, `reveal_witness` |
| OUT OF SCOPE | Pairing curves, trusted setups, live proving keys, court-grade ZK. |

MCP tools added: **none**. GitHub cite is this runtime repo. No invented product Worker / Zenodo DOI.

---

## 2. Multi-model consensus → `mmconsensus`

| Field | Fit |
|-------|-----|
| Hop | **DecisionGATE** adjacent (after ChainLock-IN). Structured opinions → majority / agreement. **Does not replace** DecisionGATE. |
| Slug | `mmconsensus` (placement `consensus-review`, domain **null**) |
| LIVE_OPS | `health`, `skill`, `doctor`, `tally`, `agree`, `limitation` |
| HEURISTIC | `tally` counts posted verdicts. `agree` is token Jaccard over posted texts. |
| SLOT | `live_model_call`, `openai`, `anthropic`, `grok`, `blend_models`, `remote_infer`, `truth_score`, `court` |
| OUT OF SCOPE | Live foundation-model calls, remote inference, blending hosted AZAI. |

Hosted AZAI remains protocol mirror + Lamb check, **not** the blend.

---

## 3. Edge-native MCP gateway → existing `POST /mcp`

| Field | Fit |
|-------|-----|
| Hop | **PUBLIC/UI/AGENT/API** — the public MCP surface **before** FragGate. |
| Decision | Harden and **label** the live Worker. **Do not** invent a second MCP door. |
| REAL | `POST /mcp` JSON-RPC (`initialize`, `tools/list`, `tools/call`, `ping`). Session + protocol headers. `DELETE /mcp` teardown. Well-known server card + RFC 9728 public resource (`authorization_servers: []`). |
| Cite | `gateway` on `GET /mcp` and `GET /.well-known/mcp/server-card.json`: `role=edge-mcp-gateway`, `terminates_at=fraggate_call`, `second_door=false`, `backdoor_exec=false`. |
| SLOT | A separate gateway Worker that execs without FragGate. OAuth IdP. Glama UUID. |

If a future gateway Worker is ever proposed, it **must** terminate into `POST /v1/fraggate/call` only.

Mutating MCP tools still require `confirm=true` or `dry_run=true` at call (optional in schema). HTTP FragGate call is unchanged. `PUBLIC_MCP_TOOLS` stays **36** / cap **40**.

---

## 4. Dynamic sandbox virtualization → `runtime_session_*`

| Field | Fit |
|-------|-----|
| Hop | Session object (advanced/internal) wrapping the same FragGate engines. Isolate is the jail **today**. |
| REAL | Dynamic policy envelopes: `allow_slugs`, `allow_ops`, `max_payload_bytes`, `max_ops` (default 64), `wipe_on_close`. Honesty: `isolate_class=worker-do`, `sandbox_kind=isolate`. |
| SLOT | `qemu`, `kvm`, `hypervisor`, `guest_vm`, `virtual_machine`, `full_vm` — refuse `guest_vm_refused`. |
| OUT OF SCOPE | A real hypervisor / KVM guest on Cloudflare Workers (not implementable here). Do not label isolate policy as QEMU. |

`isolate_is_the_jail: true` stays on authority JSON. No MCP tool added.

---

## 5. Automated tool-use benchmarking → `toolbench` + scripts

| Field | Fit |
|-------|-----|
| Hop | **Sentinel** neighbor (refuse packs) + FragGate door regression. Not a second door. |
| Slug | `toolbench` (placement `tool-playground`, domain **null**) |
| LIVE_OPS | `health`, `skill`, `doctor`, `suite`, `run_case`, `limitation` |
| REAL | Synthetic cases classify against the live FragGate kind table (`halluc` / `stub` / `live` / `unknown_op`). `scripts/verify-architecture-fit.mjs` hits `POST /v1/fraggate/call` + the suite. |
| SLOT | `invent_completeness`, `live_remote_harness`, `invent_pass`, `third_party_lab` |
| OUT OF SCOPE | Inventing an invent_completeness pass, a third-party lab letter, or a remote harness. |

Self-test ≠ third-party lab.

---

## Surface changes (honest, additive)

| Surface | Change |
|---------|--------|
| `PUBLIC_MCP_TOOLS` | **Unchanged** (36 / cap 40). No flat `{slug}_{op}` names. |
| Isolation `software_count` | **Unchanged** (33). `domains_are_doors: false`. |
| Softwares-tab placements | Adds `zkattest`, `mmconsensus`, `toolbench` (in-runtime; `worker_home` null). |
| MCP well-known / `GET /mcp` | Additive `gateway` cite. |
| Session policy | Additive isolate envelopes + guest-VM refuse. |
| Remain-OFF | Untouched. |

See [PUBLIC-CONTRACT.md](PUBLIC-CONTRACT.md) and [CHANGELOG.md](CHANGELOG.md).

---

## Worker-only placement (not a sixth fit)

**Whitestone** (`slug: whitestone`) is a live Softwares-tab card with `worker_only: true` and FragGate **none**. Case Mode (historical as-of, suppression axes, TrajectoryLock-lite, export, confidence ≤75%) is a **product feature**, not a FragGate door and not a sixth architecture-fit capability. Dual-surface AI discovery is `GET /v1/software` + `/llms.txt` / `/ai.txt` / `/cite.json` / `/who-is` plus the Whitestone Worker catalog — do **not** invent `fraggate_call` ops. Isolation 33 unchanged. Session-only. Author **Aziel Eliab** only.

See [WHITESTONE-PLACEMENT.md](WHITESTONE-PLACEMENT.md).

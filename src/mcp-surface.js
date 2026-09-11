/**
 * Agent-default MCP surface — FragGate door over the catalog.
 *
 * tools/list is a thin front door (discover, route, refuse). The flat
 * {slug}_{op} pile is gone. runtime_run is advanced/internal.
 * HTTP /p/{slug}/{op} stays a proxy and is not exec.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import {
  ADVANCED_PREFIX,
  isAdvancedToolName,
  markAdvanced,
  mcpContentText,
  wrapToolOutput,
} from "./display.js";
import { resolveSlug } from "./runtime-api.js";
import { callSessionTool } from "./session-http.js";
import { existMcpHint, FG_HALLUC_TOOL, FRAGGATE_KERNEL, PUBLIC_MCP_TOOL_MAX } from "./fraggate/codes.js";
import {
  emptyArgsSchema,
  FRAGGATE_CATALOG_ALLOWLIST,
  FRAGGATE_OUTPUT_SCHEMA,
  HINT_ADDITIVE,
  HINT_DESTRUCTIVE_IDEMPOTENT,
  HINT_EXEC,
  HINT_READ,
  MCP_OUTPUT_SCHEMA,
  mcpAnnotations,
  nameOrSlugProps,
  tdqsDescription,
} from "./mcp-schema.js";
import {
  admitCall,
  describeRegistry,
  fraggateCall,
  libraryLookup,
  listRegistry,
  namedDecisiongateCheck,
  verifyRegistry,
} from "./fraggate/door.js";
import { buildRegistry } from "./fraggate/registry.js";
import { chainlockMcpTools, isChainlockTool, runChainlockOp } from "./chainlock.js";
import { isMemoryMcpTool, memoryMcpTools, runMemoryMcp, wrapMemoryDisplay } from "./memory.js";
import { isMeshMcpTool, runMeshOp } from "./mesh.js";

export { ADVANCED_PREFIX, isAdvancedToolName, PUBLIC_MCP_TOOL_MAX };

const registryCache = new WeakMap();

export function registryFor(products) {
  const list = products || [];
  const hit = registryCache.get(list);
  if (hit) return hit;
  const registry = buildRegistry(list);
  registryCache.set(list, registry);
  return registry;
}

export function mcpInitializeInstructions() {
  return (
    "Aziel Runtime is not merely an API orchestrator or software aggregator; it is a node-meshed orchestration suite of MCP-connected software designed to coordinate specialized tools through a shared, security-gated runtime while preserving provenance, chain-of-custody, temporal integrity, and auditable execution. " +
    "Use Aziel Eliab software in this chat. One door — discover, route, refuse. " +
    "Pipeline: (1) fraggate_list or GET /v1/software (2) fraggate_describe one name (3) fraggate_call. " +
    "Prefer FragGate, GET /v1/software, and POST /mcp. Hubs refresh Software tabs from /v1/software. " +
    "Start with runtime_skill or fraggate_list. Describe a name with fraggate_describe. " +
    "Execute only through fraggate_call (CallEnvelope → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return). " +
    "decisiongate_check is the named live gate. library_lookup is read-only corpus search. " +
    "Show the user display.title and display.summary, then take the next input. " +
    "runtime_run, runtime_session_*, raw *_health, and runtime_manifest are advanced/internal. " +
    "Do not call flat {slug}_{op} names — they are not in tools/list. Unknown names refuse FG-HALLUC-TOOL. " +
    "HTTP /p/{slug}/{op} is a proxy and is not exec. " +
    "LIVE fabric (not Softwares-tab): AZPIPE AP-WP-0.2, SweepGate SG-WP-0.1, ChainLock CL-WP-0.4, LOCKSET LS-WP-0.1, packed catalog RL-WP-0.1-runtime, QNS-CD-1.0 (photon QNS1 1.3; local qnsd in AzielEliab/qnm-node; GET /v1/qns cites only — never a public via proxy), AKM-TRIAD-1.0 adaptive memory (MCP memory_*; POST /v1/memory/* behind FragGate). MCP chainlock_*. suite-presence is operator-enabled. GET /v1/mesh never enables. GET /v1/azpipe/arch cites the locked MASTER-33 strip (same FragGate pipeline payload; not a Softwares door). " +
    "2.0.0-rc1 is the certification-point freeze (docs/2.0/ public contract, compatibility, receipt schema, refusal contract, breaking-change policy, clean-room + external adversarial pack; self-test ≠ third-party lab). No intentional behavioral breaks from 1.9.3. Remain-OFF untouched. " +
    "1.9.3 closes remaining AZRT-1.9-GAPS-CLOSE items (isolate AZ-OS session VFS; isolate-safe jeeves; binding-gated media-run; published attestation path — not a third-party lab). Remain-OFF untouched. " +
    "1.9.2 binds Workers Browser Rendering (BROWSER) and live D1 MASTER (CORPUS_D1 → aziel-digital-library records). Whisper/OCR Workers-AI-bound. Sample MASTER remains the unbound fallback. Chromium product UI is not claimed; Tor/phoenix stay refuse. Remain-OFF untouched. " +
    "1.9.1 closes AZRT-1.9-GAPS-CLOSE (isolate-safe corpus verify ops; Whisper/OCR Workers-AI-gated; AZBrowser sandbox_status Chromium DEFERRED unbound; AZMail transport_status no public MTA; wave 2–3 doctor; adversarial self-check + Actions npm test; remain-OFF untouched). " +
    "1.9.0 closes AZRT-1.9-CLOSE-1.0 (AZMail isolate mailbox; AZChat LIVE+bound; isolate hash store; OpenAPI proxy-path parity; remain-OFF untouched). " +
    "1.7.10 makes QNM Live Nodes durable (cron or request-path fan-out of live Softwares product Workers while suite-presence is enabled; TTL 5 min; GET never enables). " +
    "1.7.9 cross-maps AZCoherence (peers azclce / AZInterface / AKM-TRIAD fabric neighbor; hubs + Worker URL; domain stays null). " +
    "1.7.8 lands EmbryoLock as a true in-process engine (Vault/Custody with ARK; live-with-local-destructive-boundary). LIVE_OPS health/skill/doctor/verify-hash/policy/limitation. Wipe/scorch/unlock-after-fail stay FG-STUB on the public mesh. Softwares worker_home embryolock-download-tracker. " +
    "1.7.7 lands AZCoherence (AZC-0.1) as a true in-process FragGate Softwares engine (second-pass triad coherence; cite https://github.com/AzielEliab/AZCoherence; not AKM-TRIAD). " +
    "1.7.6 syncs 4DMap LIVE_OPS with product 0.2.0 (pin/span/stack/gap/fork/walk/lens/class/cohort/absence/cap/join/list/example plus frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; inspection frame after AZPIPE, not an extra door). " +
    "1.7.5 is Softwares capability wave 1 (decisiongate / forgereceipts / temporallock / staticclock / chronolock / trajectorylock / spectrallock). " +
    "1.7.4 enhances 4DMap LIVE_OPS (frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; inspection frame after AZPIPE, not an extra door). " +
    "1.7.3 aligns audit WARN copy (exist.mcp → tools/list; public FragGate call; catalog count_note; 4DMap not an extra door). 1.7.2 adds GET /v1/azpipe/arch (MASTER-33 cite/read). 1.7.1 adds AKM-TRIAD-1.0 (Adaptive Knowledge Recollection, Bayesian Calibration & 3-of-4 Triad Selection). 1.7.0 locks MASTER-33: Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. FragGate is THE single door. Lamb Lens is fabric after FragGate. LambGate is not a hop. " +
    "1.6.15 locked the suite hop order (SUITE-PIPE-1.6.15; historical). " +
    "1.6.14 adds 4DMap (4DM-WP-1.0) as a FragGate-live engine — four-axis inspection frame T/Δ/Γ/Π after AZPIPE; not a sequential gate and not an extra door. LIVE_OPS health/skill/card_new/card_pin/card_span/card_join/card_walk/card_list/verify_hash. 1.7.6 adds product 0.2 verbs plus frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite. truth_score/lumen_panel/invent_mark/backdate_class stay stub. FragGate claims cite join types. " +
    "1.6.13 aligns the suite QNM rollup (QNM-BUILD-1.0, companion to AIH-WP-1.1): GET /v1/mesh live/locked/isolated counts; operator enable requires a declared bearer; default radios off; not a login mesh; full node process is local qnm-node/. " +
    "1.6.12 adds GET /v1/software (hub Software-tab catalog; Plain→Gate→Lock + EmbryoLock stub) and GET /v1/update/check. " +
    "1.6.11 adds a durable FragGate op alias map so Worker UI button names (azhub list_modules/place, azinterface genesis_boot/hold, azbrowser airlock/home, azmail classify, aznet doctor/pair, peacelock doctor) resolve to catalog LIVE_OPS. EmbryoLock is stub / local-not-hosted (name only; describe?slug=embryolock; not a FragGate engine). " +
    "1.6.10 sets AZBrowser and AZNet catalog one_line to separate software (not engine). Same FragGate door. " +
    "1.6.9 frames AZHub and AZInterface as two separate softwares under the same FragGate door (AIH-WP-1.0) — Blank Key spatial container + custodial page cycles. Never one combined product. Hub refuses auto-unlock / completeness. Interface page_cycle_status reports OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. " +
    "AZHub LIVE_OPS (health, skill, region_list, place_module, remove_module, tether_declare, tether_cut, tether_list, blank_key_status) and AZInterface LIVE_OPS (health, skill, genesis_status, site_state_get, site_state_set, integrity_check, witness_list, page_cycle_status) are listed by fraggate_list and executed only via fraggate_call / POST /v1/fraggate/call. " +
    "1.6.7 adds AZNet (AZN-WP-0.1) as a FragGate-live engine — silent verification side-net; never hosts payloads; AZBrowser pair required (functional order only; own Worker UI). " +
    "AZNet is reached only via fraggate_call / POST /v1/fraggate/call (flat leftover names still map through FragGate; not a side door). " +
    "1.6.6 adds AZBrowser (AZB-1.0) as a FragGate-live engine — Lamb Lens ethical research browser: ethical search + advisory navigate; cite; refuse harmful harvest; never invent visit results; not Chromium. AZNet is separate software (same FragGate door; order/token pairing only, not a shared Phase-1 UI). " +
    "AZBrowser LIVE_OPS (ethical_search, lamb_lens_search, navigate, airlock_ingest, tab_open, tab_list, receipt_list, verify, receipt_verify, sandbox_status, sandbox_render, health, skill) are listed by fraggate_list and executed only via fraggate_call / POST /v1/fraggate/call — the same ops Worker UI buttons call. " +
    "1.6.5 adds AZMail (APP 1.0) as a FragGate-live engine — anonymous mesh default off, advisory airlock; SMTP/deanonymize stay stub. " +
    "AZMail is reached only via fraggate_call / POST /v1/fraggate/call (flat leftover names still map through FragGate; not a side door). " +
    "1.6.4 adds PeaceLock (PL-WP-0.1) as a true in-process engine. " +
    "1.6.3 adds KV-backed API use trackers (GET /v1/uses). " +
    "1.6.2 widens the public door to sensible advisory engines; stubs still refuse. " +
    "1.6.0 is the FragGate door cut on in-process engines. 1.5.0 was agent-native flat product tools. " +
    "Kernel: https://github.com/AzielEliab/fraggate (FG-0.1). " +
    "Every catalog slug is a true engine. Cloudflare isolate is the jail. engine_digest is required. " +
    "Hosted AZAI is protocol mirror + Lamb check, not the blend. VPN/hop mesh is not claimed on this public surface. AZMail anonymous ring is FragGate LIVE_OPS only (default off; not SMTP). " +
    "Compatible clients: ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants. " +
    "Always send User-Agent Mozilla/5.0. Public, no OAuth. Author: Aziel Eliab only."
  );
}

export function runtimeHelperTools() {
  return [
    {
      name: "runtime_skill",
      title: "How to use this software",
      description: tdqsDescription({
        action:
          "Read how an agent uses Aziel Eliab software: one door — discover, route, refuse (pipeline fraggate_list → fraggate_describe → fraggate_call; hubs use GET /v1/software)",
        when: "starting a session or choosing the door before any catalog call",
        notFor: "listing registry names or executing an engine",
        instead: "fraggate_list or fraggate_call",
        effects:
          "Read-only, non-destructive, idempotent. Dual surface: agent chat has no technical UI chrome; Worker / Flutter / local install stay complete human software",
        returns: "skill markdown plus display.title / display.summary",
      }),
      annotations: mcpAnnotations("How to use this software", HINT_READ),
      inputSchema: emptyArgsSchema("No arguments. Send {}. Returns the agent skill text."),
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "fraggate_list",
      title: "Step 1 — List the FragGate registry",
      description:
        tdqsDescription({
          action:
            "List hashed FragGate registry entries (live / stub / local_only) for discovery first. Discover names; do not invent tools",
          when: "you do not yet know the catalog name or slug",
          notFor: "inspecting one known capability or executing an op",
          instead: "fraggate_describe or fraggate_call",
          effects:
            "Read-only, non-destructive, idempotent. Does not enable mesh radios. For hub Software tabs prefer GET /v1/software (Plain→Gate→Lock; EmbryoLock live-with-local-destructive-boundary; AZChat LIVE+bound). Sibling software under one FragGate door — never separate FragGate engines",
          returns: "registry entries, allowlists, and digests (kernel https://github.com/AzielEliab/fraggate)",
        }) +
        " " +
        FRAGGATE_CATALOG_ALLOWLIST,
      annotations: mcpAnnotations("Step 1 — List the FragGate registry", HINT_READ),
      inputSchema: emptyArgsSchema("No arguments. Send {}. Discovery first — not describe or execute."),
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "fraggate_describe",
      title: "Step 2 — Describe one registry name",
      description: tdqsDescription({
        action:
          "Inspect one known FragGate capability: live vs stub vs local_only, public ops, and engine_digest. Not execute",
        when: "you already have a name or slug from fraggate_list or GET /v1/software (pass name or slug; not both required)",
        notFor: "discovering the full registry or executing an op",
        instead: "fraggate_list or fraggate_call",
        effects:
          "Read-only, non-destructive, idempotent. Missing both name and slug, or an unknown name, refuses FG-HALLUC-TOOL. EmbryoLock slug=embryolock is live-with-local-destructive-boundary (wipe/unlock stay FG-STUB). AZChat slug=azchat is LIVE+bound (mesh default off; not AZMail)",
        returns: "one registry card (ops, stub_ops, digest, status, aliases)",
      }),
      annotations: mcpAnnotations("Step 2 — Describe one registry name", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description:
          "Exactly one of name or slug is enough. Extra properties are rejected by the schema; the door still only reads name/slug.",
        properties: nameOrSlugProps(),
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "fraggate_verify",
      title: "Verify a registry name or digest",
      description: tdqsDescription({
        action: "Confirm a name, slug, or engine_digest against the hashed FragGate registry",
        when: "you must prove a listed name or digest exists after fraggate_describe",
        notFor: "listing the registry, describing ops, or executing",
        instead: "fraggate_list, fraggate_describe, or fraggate_call",
        effects: "Read-only, non-destructive, idempotent. Not an exec path. Unknown names refuse FG-HALLUC-TOOL",
        returns: "match or mismatch against the registry digest",
      }),
      annotations: mcpAnnotations("Verify a registry name or digest", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description: "Provide name, slug, and/or digest. Digest-only checks the whole registry hash.",
        properties: {
          ...nameOrSlugProps(),
          digest: {
            type: "string",
            description:
              "Optional 64-char lowercase hex engine_digest or registry digest to verify. When digest is set without name/slug, the tool compares the live registry digest.",
            pattern: "^[a-fA-F0-9]{64}$",
          },
        },
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "fraggate_call",
      title: "Step 3 — Call through FragGate",
      description:
        tdqsDescription({
          action:
            "Execute a known catalog slug+op through the FragGate single door (CallEnvelope → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return). Not discovery",
          when: "fraggate_list and fraggate_describe already identified a live allowlisted op",
          notFor: "discovering names or inspecting one capability without exec",
          instead: "fraggate_list or fraggate_describe",
          effects:
            "Side effects are operation-dependent (read, write, or refuse). Not globally read-only or idempotent. May reach an open world when the target op does (for example AZBrowser ethical_search); many ops stay isolate-local. Unknown names refuse FG-HALLUC-TOOL. Stub, local-only, and Remain-OFF verbs refuse explicitly (FG-STUB / FG-LOCAL-ONLY / FG-GATE-REFUSE / FG-LAMB-REFUSE). Prefer this over runtime_run or runtime_session_exec. FragGate is THE single door",
          returns:
            "status, result, receipt, engine_slug, engine_op, engine_digest, ran_in, provenance, refusal, and limitations",
        }) +
        " " +
        FRAGGATE_CATALOG_ALLOWLIST,
      annotations: mcpAnnotations("Step 3 — Call through FragGate", HINT_EXEC),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description:
          "Required: op. Also pass slug or name. Extra top-level keys other than name/slug/product/tool/op/verb/claim/proposal/ground/payload/session_id/id become the op payload when payload is omitted.",
        properties: {
          ...nameOrSlugProps(),
          op: {
            type: "string",
            description:
              "Required public allowlisted op from fraggate_describe (for example fold-preview, ethical_search, blank_key_status). UI aliases (list_modules, place, genesis_boot, hold, airlock, home, classify, doctor, pair) forward to catalog ops. Unknown ops refuse FG-UNKNOWN-OP; stubs refuse FG-STUB.",
          },
          payload: {
            type: "object",
            additionalProperties: true,
            description:
              "Optional op payload object. Shape is engine-specific (see fraggate_describe). Malformed fields are refused by the engine, not by this door schema. If omitted, leftover top-level keys are used as the payload.",
          },
          claim: {
            type: "object",
            additionalProperties: true,
            description:
              "Optional DecisionGATE proposal attached to this call. Also runs automatically inside the door even when omitted (defaults). Freedom without clarity is chaos.",
            properties: {
              statement: { type: "string", description: "Optional proposal statement (what is being asked)." },
              evidence: {
                type: "array",
                items: { type: "string" },
                description: "Optional evidence strings supporting the statement.",
              },
              impact_pos: {
                type: "array",
                items: { type: "string" },
                description: "Optional positive impacts.",
              },
              impact_neg: {
                type: "array",
                items: { type: "string" },
                description: "Optional negative impacts.",
              },
              values: {
                type: "array",
                items: { type: "string" },
                description: "Optional values the proposal claims to honor.",
              },
              accountable: {
                type: "string",
                description: "Optional accountable party. Identity on this runtime is Aziel Eliab only.",
              },
            },
          },
        },
        required: ["op"],
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "decisiongate_check",
      title: "Run DecisionGATE on a proposal",
      description: tdqsDescription({
        action:
          "Run the named DecisionGATE five sequential gates on a proposal (Freedom without clarity is chaos). Also runs automatically inside fraggate_call before exec",
        when: "you want a gate check without executing a catalog product verb",
        notFor: "executing a product op or searching the library",
        instead: "fraggate_call or library_lookup",
        effects:
          "Write: appends an ask/refuse ledger tip. Not read-only and not idempotent. Does not execute domain software",
        returns: "gate view, final_state, ledger_tip, and result (code FG-OK on the named module wrapper)",
      }),
      annotations: mcpAnnotations("Run DecisionGATE on a proposal", HINT_ADDITIVE),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "All fields optional. Empty proposals still run the five gates and stamp the ledger.",
        properties: {
          statement: { type: "string", description: "Optional proposal statement to evaluate." },
          evidence: {
            type: "array",
            items: { type: "string" },
            description: "Optional evidence strings. Missing evidence can fail a gate.",
          },
          impact_pos: {
            type: "array",
            items: { type: "string" },
            description: "Optional positive-impact list.",
          },
          impact_neg: {
            type: "array",
            items: { type: "string" },
            description: "Optional negative-impact list.",
          },
          values: {
            type: "array",
            items: { type: "string" },
            description: "Optional values list.",
          },
          accountable: {
            type: "string",
            description: "Optional accountable party string.",
          },
        },
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "library_lookup",
      title: "Search the Aziel Digital Library",
      description: tdqsDescription({
        action: "Search the Aziel Digital Library (aziel-corpus search / example / skill)",
        when: "you need a public corpus cite, example record, or library skill",
        notFor: "adaptive memory belief, ChainLock facts, or private-file search",
        instead: "memory_recall, chainlock_recall, or fraggate_call slug=aziel-corpus",
        effects:
          "Read-only, non-destructive, idempotent relative to library records. Not a private-file search engine. Unknown ops refuse FG-UNKNOWN-OP",
        returns: "search, example, or skill payload inside the display envelope",
      }),
      annotations: mcpAnnotations("Search the Aziel Digital Library", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "q is the search text. op selects the library verb. Extra keys are forwarded as corpus payload.",
        properties: {
          q: {
            type: "string",
            description: "Optional query string for op=search. Empty q returns an empty or default hit set, not an invented cite.",
          },
          op: {
            type: "string",
            enum: ["search", "example", "skill", "health"],
            description:
              "Optional library verb. search (default) looks up public corpus text; example returns a sample; skill returns the library skill; health is liveness. Other values refuse FG-UNKNOWN-OP.",
          },
        },
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "mesh_status",
      title: "QNM suite rollup",
      description: tdqsDescription({
        action:
          "Read the QNM-BUILD-1.0 suite rollup (companion to AIH-WP-1.1): enabled?, declared bearers, live/locked/isolated counts. Packet-transfer coding design is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; GET /v1/qns cites only; Worker does not proxy via emit)",
        when: "you need suite presence counts or whether radios are OFF",
        notFor: "enabling radios, listing individual nodes, or executing a catalog engine",
        instead: "mesh_enable, mesh_nodes, or fraggate_call",
        effects:
          "Read-only, non-destructive, idempotent. GET/this tool never enables. Default radios OFF. suite-presence is operator-enabled. Not a login mesh. Views/MCP/downloads do not enter QNM-S. Full node process is local qnm-node/",
        returns: "enabled flag, bearers, live/locked/isolated counts, and QNS-CD-1.0 cite",
      }),
      annotations: mcpAnnotations("QNM suite rollup", HINT_READ),
      inputSchema: emptyArgsSchema("No arguments. Send {}. Never enables radios."),
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "mesh_enable",
      title: "Enable QNM radios (declared bearer)",
      description: tdqsDescription({
        action: "Operator-enable the QNM suite rollup by declaring a bearer (same as POST /v1/mesh/enable)",
        when: "an operator must turn radios LIVE after ≥1 declared bearer (example: suite-presence)",
        notFor: "reading status, disabling radios, or logging into an account",
        instead: "mesh_status or mesh_disable",
        effects:
          "Write: stores the bearer and turns radios LIVE. Rate-limited. Empty {} is refused. Login/account/recover/gate names refuse. Does not arm, wipe, heal, or resurrect accounts. Not a login mesh. Default remains OFF on a fresh isolate",
        returns: "enabled state, bearers, and suite-presence note",
      }),
      annotations: mcpAnnotations("Enable QNM radios (declared bearer)", HINT_ADDITIVE),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description: "bearer is required. Empty object is MESH-ENABLE refuse.",
        properties: {
          bearer: {
            type: "string",
            description:
              "Required declared bearer name. Example: suite-presence. Login / account / recover / recovery / gate / IP / publish / phoenix / heal names refuse MESH-ENABLE. This is not a login mesh.",
          },
        },
        required: ["bearer"],
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "mesh_disable",
      title: "Disable QNM radios",
      description: tdqsDescription({
        action: "Turn QNM radios and bearers OFF (same as POST /v1/mesh/disable)",
        when: "the operator wants suite presence off",
        notFor: "dropping one node or enabling radios",
        instead: "mesh_leave or mesh_enable",
        effects:
          "Destructive to live tethers: they drop clean. No implicit heal, no account resurrection, no wipe internals. Always allowed. Repeating while already OFF stays OFF",
        returns: "enabled=false and a clean-drop note",
      }),
      annotations: mcpAnnotations("Disable QNM radios", HINT_DESTRUCTIVE_IDEMPOTENT),
      inputSchema: emptyArgsSchema("No arguments. Send {}. Always allowed."),
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "mesh_join",
      title: "Register QNM rollup presence",
      description: tdqsDescription({
        action: "Register a product node for QNM rollup counts (same as POST /v1/mesh/join)",
        when: "radios are already LIVE and a catalog product should appear in live/locked/isolated counts",
        notFor: "refreshing an existing node, reading the roster, or opening an account session",
        instead: "mesh_heartbeat, mesh_nodes, or runtime_session_open",
        effects:
          "Write: additive presence with a 5-minute TTL. Refused while radios are OFF (MESH-OFF). Not an account session. AnonBroadcast is not a product",
        returns: "node_id, presence, and TTL note",
      }),
      annotations: mcpAnnotations("Register QNM rollup presence", HINT_ADDITIVE),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description: "product is required. presence must be live|locked|isolated when set. node_id must be 8–80 [a-z0-9._-].",
        properties: {
          product: {
            type: "string",
            description:
              "Required catalog product slug (a-z0-9-, for example godlock, azmail). AnonBroadcast is refused. Unknown slugs refuse MESH-BAD-INPUT.",
          },
          node_id: {
            type: "string",
            description:
              "Optional stable node id. When set, must be 8–80 characters matching [a-z0-9._-]. Omit to receive a generated id.",
            minLength: 8,
            maxLength: 80,
            pattern: "^[a-z0-9._-]+$",
          },
          label: {
            type: "string",
            description: "Optional short label for the roster. Display only; not a score.",
          },
          presence: {
            type: "string",
            enum: ["live", "locked", "isolated"],
            description: "Optional rollup class. live (default), locked, or isolated. No scores. Other values refuse MESH-BAD-INPUT.",
          },
        },
        required: ["product"],
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "mesh_heartbeat",
      title: "Refresh QNM rollup presence",
      description: tdqsDescription({
        action: "Refresh a node's 5-minute QNM presence TTL (same as POST /v1/mesh/heartbeat)",
        when: "you already have a node_id from mesh_join and radios are LIVE",
        notFor: "first-time registration or dropping the node",
        instead: "mesh_join or mesh_leave",
        effects:
          "Write: extends TTL. Each call has an additional TTL effect (not idempotent). Unknown or expired node_id refuses MESH-UNKNOWN-NODE — join again; no account resurrection",
        returns: "updated presence and TTL",
      }),
      annotations: mcpAnnotations("Refresh QNM rollup presence", HINT_ADDITIVE),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description: "node_id is required. Missing node_id refuses MESH-BAD-INPUT.",
        properties: {
          node_id: {
            type: "string",
            description: "Required node id returned by mesh_join.",
          },
          presence: {
            type: "string",
            enum: ["live", "locked", "isolated"],
            description: "Optional replacement presence class. Other values refuse MESH-BAD-INPUT.",
          },
        },
        required: ["node_id"],
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "mesh_leave",
      title: "Drop QNM rollup presence",
      description: tdqsDescription({
        action: "Drop a node from the QNM rollup (same as POST /v1/mesh/leave)",
        when: "a previously joined node should leave the counts",
        notFor: "turning all radios OFF or listing nodes",
        instead: "mesh_disable or mesh_nodes",
        effects:
          "Destructive to that node's presence. Always allowed. No implicit heal. Repeating a missing node_id is a no-op/refuse, not resurrection",
        returns: "leave receipt for the node_id",
      }),
      annotations: mcpAnnotations("Drop QNM rollup presence", HINT_DESTRUCTIVE_IDEMPOTENT),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description: "node_id is required. Missing node_id refuses MESH-BAD-INPUT.",
        properties: {
          node_id: {
            type: "string",
            description: "Required node id to drop from the rollup.",
          },
        },
        required: ["node_id"],
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "mesh_nodes",
      title: "List QNM rollup nodes",
      description: tdqsDescription({
        action: "List the QNM rollup roster with live/locked/isolated presence (5-minute TTL; same as GET /v1/mesh/nodes)",
        when: "you need the current node list after mesh_status",
        notFor: "suite counts without the roster, or mutating presence",
        instead: "mesh_status, mesh_join, or mesh_leave",
        effects:
          "Read-only, non-destructive, idempotent. No scores. No leaderboard. Views/MCP/downloads do not enter QNM-S",
        returns: "node roster with presence classes",
      }),
      annotations: mcpAnnotations("List QNM rollup nodes", HINT_READ),
      inputSchema: emptyArgsSchema("No arguments. Send {}."),
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "mesh_broadcast",
      title: "Register a local hash receipt",
      description: tdqsDescription({
        action: "Register the SHA-256 of a local communique as a hash receipt — never a publish path",
        when: "the operator already holds a local file and wants only its hash recorded",
        notFor: "uploading bytes, publishing video, or sending mail",
        instead: "local qnm-node/ anon-broadcast loopback, or AZMail via fraggate_call",
        effects:
          "Write: stores a hash receipt. Does NOT accept video bytes. Anon-broadcast is a sibling loopback module of local qnm-node/ only. Operator keeps the file. Malformed sha256 refuses MESH-BAD-INPUT; publish-shaped keys refuse MESH-NO-PUBLISH",
        returns: "hash receipt (sha256, optional title)",
      }),
      annotations: mcpAnnotations("Register a local hash receipt", HINT_ADDITIVE),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description: "sha256 is required (64 hex). This is a receipt, not a blob upload.",
        properties: {
          sha256: {
            type: "string",
            description: "Required 64-character hex SHA-256 of the local file. Hash receipt only — not a publish path.",
            minLength: 64,
            maxLength: 64,
            pattern: "^[a-fA-F0-9]{64}$",
          },
          title: {
            type: "string",
            description: "Optional short title for the receipt. Not the file contents.",
          },
          product: {
            type: "string",
            description: "Optional catalog product slug to attribute the receipt. Not required.",
          },
        },
        required: ["sha256"],
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    ...chainlockMcpTools(),
    ...memoryMcpTools(),
    {
      name: "runtime_software",
      title: "Authoritative software catalog",
      description: tdqsDescription({
        action:
          "Read the authoritative hub catalog (GET /v1/software): every product including AZChat LIVE+bound, sorted Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock)",
        when: "a hub or client refreshes the Software tab",
        notFor: "agent discovery of hashed registry status or executing an op",
        instead: "fraggate_list or fraggate_call",
        effects:
          "Read-only, non-destructive, idempotent. EmbryoLock is live-with-local-destructive-boundary (worker_home embryolock-download-tracker). Agent exec still uses fraggate_list → fraggate_describe → fraggate_call",
        returns: "sorted software cards (name, slug, ops, worker_home)",
      }),
      annotations: mcpAnnotations("Authoritative software catalog", HINT_READ),
      inputSchema: emptyArgsSchema("No arguments. Send {}. Hub/client helper — not exec."),
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "runtime_bundle",
      title: "List every product (bundle helper)",
      description: tdqsDescription({
        action: "Read a compact bootstrap of every product skill URL and invoke prefix",
        when: "a client needs skill URLs in one shot",
        notFor: "Software-tab refresh, hashed registry discovery, or exec",
        instead: "runtime_software, fraggate_list, or fraggate_call",
        effects: "Read-only, non-destructive, idempotent. Prefer GET /v1/software for hub Software tabs",
        returns: "compact product list with skill URLs",
      }),
      annotations: mcpAnnotations("List every product (bundle helper)", HINT_READ),
      inputSchema: emptyArgsSchema("No arguments. Send {}."),
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "runtime_pull",
      title: "Open one product",
      description: tdqsDescription({
        action: "Open one product card by slug: name, version, skill, download, and ops",
        when: "you already have a slug from GET /v1/software or fraggate_list and need the card, not exec",
        notFor: "inspecting FragGate live/stub status or executing an op",
        instead: "fraggate_describe or fraggate_call",
        effects: "Read-only, non-destructive, idempotent. Not exec — then use fraggate_call. Unknown slug errors",
        returns: "one product card",
      }),
      annotations: mcpAnnotations("Open one product", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "slug is required. Extra keys are ignored by the pull helper.",
        properties: {
          slug: {
            type: "string",
            description:
              "Required catalog slug from GET /v1/software or fraggate_list (for example foldlock). Not an exec path.",
          },
        },
        required: ["slug"],
      },
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "runtime_run",
      title: "Advanced: raw runtime_run",
      description: markAdvanced(
        tdqsDescription({
          action: "Advanced exec façade: admit a slug+op (still DecisionGATE-admitted) and run it through a raw session",
          when: "you were explicitly asked for the raw runtime_run path",
          notFor: "the default agent exec path",
          instead: "fraggate_call",
          effects:
            "Side effects are operation-dependent. Not globally read-only or idempotent. Not a backdoor past FragGate. Opens a session when session_id is omitted",
          returns: "exec display envelope with session_id, result, engine_digest, ran_in, and refusal when gated",
        }),
      ),
      annotations: mcpAnnotations("Advanced: raw runtime_run", HINT_EXEC),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "slug and op are required. Extra keys other than payload/session_id may be treated as payload.",
        properties: {
          slug: {
            type: "string",
            description: "Required catalog slug (or name alias). Unknown slugs refuse FG-HALLUC-TOOL.",
          },
          op: {
            type: "string",
            description: "Required allowlisted op. Stubs refuse FG-STUB.",
          },
          payload: {
            type: "object",
            additionalProperties: true,
            description: "Optional op payload object. Engine-specific.",
          },
          session_id: {
            type: "string",
            description:
              "Optional existing raw session id. If omitted, a session is opened automatically. Prefer leaving session plumbing invisible unless asked.",
          },
        },
        required: ["slug", "op"],
      },
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "runtime_manifest",
      title: "Advanced: runtime manifest",
      description: markAdvanced(
        tdqsDescription({
          action: "Read the machine runtime manifest (version, role, door=fraggate, engine slugs, registry_digest)",
          when: "a client needs the machine manifest rather than the human skill",
          notFor: "the default agent how-to or hashed registry discovery",
          instead: "runtime_skill or fraggate_list",
          effects: "Read-only, non-destructive, idempotent. Not the default agent path",
          returns: "manifest including door=fraggate and registry_digest",
        }),
      ),
      annotations: mcpAnnotations("Advanced: runtime manifest", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "No required arguments. Extra keys are ignored.",
        properties: {},
      },
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
  ];
}

export function buildMcpToolList({ sessionTools }) {
  const tools = [...runtimeHelperTools()];
  for (const tool of sessionTools || []) {
    tools.push(annotateSessionTool(tool));
  }
  return tools;
}

const SESSION_HINTS = Object.freeze({
  runtime_session_open: HINT_ADDITIVE,
  runtime_session_policy: HINT_ADDITIVE,
  runtime_session_exec: HINT_EXEC,
  runtime_session_receipt: HINT_READ,
  runtime_session_receipts: HINT_READ,
  runtime_session_close: HINT_DESTRUCTIVE_IDEMPOTENT,
});

export function annotateSessionTool(tool) {
  const title = sessionToolTitle(tool.name);
  const hints = SESSION_HINTS[tool.name] || HINT_EXEC;
  return {
    ...tool,
    title,
    description: markAdvanced(stripAdvanced(tool.description)),
    annotations: mcpAnnotations(title, hints),
    outputSchema: tool.outputSchema || MCP_OUTPUT_SCHEMA,
  };
}

export function mcpCallPayload(name, out, product, op) {
  const envelope =
    out.envelope ||
    wrapToolOutput({
      name,
      text: out.text,
      status: out.status,
      product,
      op,
      extra: out.extra,
    });
  return {
    content: [{ type: "text", text: mcpContentText(name, envelope, out.text) }],
    structuredContent: envelope,
    isError: out.status >= 400,
  };
}

export function wrapFraggateEnvelope(name, body, product, op) {
  const status = body && body.ok === false ? 400 : 200;
  const envelope = wrapToolOutput({
    name,
    text: JSON.stringify(body),
    status,
    product,
    op,
    extra: body && body.ledger_tip ? { receipt: { ledger_tip: body.ledger_tip } } : {},
  });
  if (body && body.ledger_tip && !envelope.ledger_tip) envelope.ledger_tip = body.ledger_tip;
  if (body && body.code) envelope.code = body.code;
  if (body && body.door) envelope.door = body.door;
  return {
    status,
    text: JSON.stringify(envelope, null, 2),
    envelope,
    product,
    op,
    target: "fraggate",
  };
}

export async function callRuntimeRun(env, args, origin, deps) {
  const registry = registryFor(deps.PRODUCTS);
  const admission = await admitCall(args, registry, deps.BY_SLUG);
  if (!admission.admitted) {
    return wrapFraggateEnvelope("runtime_run", admission.envelope, null, (args && args.op) || null);
  }

  const rawSlug = (args && (args.slug || args.product || args.name)) || "";
  const key = resolveSlug(rawSlug, deps.BY_SLUG) || admission.target.entry.slug;
  if (!key) throw new Error(`unknown product: ${rawSlug}`);
  const op = String((args && args.op) || admission.target.op || "").trim();
  if (!op) throw new Error("op required");
  const payload = args && args.payload !== undefined ? args.payload : {};
  let sessionId = args && (args.session_id || args.id);
  if (!sessionId) {
    const opened = await callSessionTool(env, "runtime_session_open", {}, origin, deps);
    let body;
    try {
      body = JSON.parse(opened.text);
    } catch {
      body = { error: opened.text };
    }
    if (opened.status >= 400) {
      return {
        status: opened.status,
        text: opened.text,
        target: opened.target,
        envelope: wrapToolOutput({
          name: "runtime_run",
          text: opened.text,
          status: opened.status,
          extra: {},
        }),
      };
    }
    sessionId = body.session && body.session.id;
  }
  const exec = await callSessionTool(
    env,
    "runtime_session_exec",
    { session_id: sessionId, slug: key, op, payload },
    origin,
    deps,
  );
  const product = deps.BY_SLUG[key];
  const envelope = wrapToolOutput({
    name: "runtime_run",
    text: exec.text,
    status: exec.status,
    product,
    op,
    extra: { session_id: sessionId },
  });
  if (sessionId && !envelope.session_id) envelope.session_id = sessionId;
  return {
    status: exec.status,
    text: JSON.stringify(envelope, null, 2),
    target: exec.target,
    envelope,
  };
}

export async function callFraggateTool(name, args, products, bySlug, env) {
  const registry = registryFor(products);
  if (name === "fraggate_list") {
    return wrapFraggateEnvelope(name, await listRegistry(registry), null, "list");
  }
  if (name === "fraggate_describe") {
    return wrapFraggateEnvelope(name, await describeRegistry(args, registry, bySlug), null, "describe");
  }
  if (name === "fraggate_verify") {
    return wrapFraggateEnvelope(name, await verifyRegistry(args, registry, bySlug), null, "verify");
  }
  if (name === "fraggate_call") {
    const body = await fraggateCall(args, registry, bySlug, env);
    const product = body.slug && bySlug ? bySlug[body.slug] : null;
    return wrapFraggateEnvelope(name, body, product, body.op);
  }
  if (name === "library_lookup") {
    const body = await libraryLookup(args, env);
    const product = bySlug && bySlug["aziel-corpus"];
    return wrapFraggateEnvelope(name, body, product, body.op || "search");
  }
  if (name === "decisiongate_check") {
    const body = await namedDecisiongateCheck(args, env);
    const product = bySlug && bySlug.decisiongate;
    return wrapFraggateEnvelope(name, body, product, "check");
  }
  if (isMeshMcpTool(name)) {
    const body = await runMeshOp(name, args, env);
    return wrapFraggateEnvelope(name, body, { name: "Quantum Node Mesh", slug: "mesh" }, name);
  }
  if (isChainlockTool(name)) {
    const body = await runChainlockOp(name, args, env);
    return wrapFraggateEnvelope(name, body, { name: "ChainLock", slug: "chainlock" }, name);
  }
  if (isMemoryMcpTool(name)) {
    const body = await runMemoryMcp(name, args, env);
    return wrapMemoryDisplay(name, body);
  }
  return null;
}

function sessionToolTitle(name) {
  const map = {
    runtime_session_open: "Advanced: open a raw session",
    runtime_session_policy: "Advanced: attach session policy",
    runtime_session_exec: "Advanced: raw session exec",
    runtime_session_receipt: "Advanced: last session receipt",
    runtime_session_receipts: "Advanced: session receipt chain",
    runtime_session_close: "Advanced: seal a session",
  };
  return map[name] || `Advanced: ${name}`;
}

function stripAdvanced(text) {
  const raw = String(text || "");
  return raw.startsWith(ADVANCED_PREFIX) ? raw.slice(ADVANCED_PREFIX.length).trim() : raw;
}

export function hallucRefuse(name) {
  return {
    ok: false,
    code: FG_HALLUC_TOOL,
    door: "fraggate",
    kernel: FRAGGATE_KERNEL,
    name,
    message: `FG-HALLUC-TOOL: ${JSON.stringify(name || "")} is not a public MCP tool. Use fraggate_list / fraggate_call (see POST /mcp tools/list).`,
    exist: existMcpHint(),
  };
}

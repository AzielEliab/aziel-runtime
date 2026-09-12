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
import { resolveSlug, RUNTIME_VERSION } from "./runtime-api.js";
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
  toolEnvelopeOutputSchema,
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
    `Current MCP serverInfo.version: ${RUNTIME_VERSION} (same as package.json). 1.6.2 is superseded heritage, not this server. Author: Aziel Eliab only. ` +
    "Aziel Runtime is not merely an API orchestrator or software aggregator; it is a node-meshed orchestration suite of MCP-connected software designed to coordinate specialized tools through a shared, security-gated runtime while preserving provenance, chain-of-custody, temporal integrity, and auditable execution. " +
    "Use Aziel Eliab software in this chat. One door — discover, route, refuse. " +
    "Pipeline: (1) fraggate_list or GET /v1/software (2) fraggate_describe one name (3) fraggate_call. " +
    "Prefer FragGate, GET /v1/software, and POST /mcp. Hubs refresh Software tabs from /v1/software. " +
    "Start with runtime_skill or fraggate_list. Describe a name with fraggate_describe. " +
    "Execute only through fraggate_call (CallEnvelope → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return). " +
    "Neighbor map (do not confuse siblings): runtime_skill = how-to markdown; runtime_manifest = machine JSON (advanced/internal); runtime_software = hub Software-tab cards; runtime_bundle = skill-URL bootstrap; runtime_pull = one product card; fraggate_list = hashed live/stub/digest roster; fraggate_describe = one registry card; fraggate_verify = digest proof; fraggate_call = default exec. " +
    "decisiongate_check gates a proposal without exec. library_lookup is public corpus cite (not memory, not ChainLock). " +
    "ChainLock lifecycle is append-only: append → tip or recall → verify → seal (no chainlock_delete). chainlock_seal writes a local LOCKSET; runtime_session_close seals a raw session — they are not the same. " +
    "Memory lifecycle is append-only belief (≠ truth): observe → resolve → calibrate → recall or get (no memory_delete). " +
    "QNM mesh lifecycle: mesh_enable/disable (suite radios), mesh_join/heartbeat/leave (one node), mesh_status (counts), mesh_nodes (roster), mesh_broadcast (hash receipt, never publish). GET /v1/mesh never enables. " +
    "Raw session lifecycle (advanced/internal): open → policy → exec → receipt or receipts → close. Prefer fraggate_call. " +
    "Show the user display.title and display.summary, then take the next input. " +
    "runtime_run, runtime_session_*, raw *_health, and runtime_manifest are advanced/internal. " +
    "Do not call flat {slug}_{op} names — they are not in tools/list. Unknown names refuse FG-HALLUC-TOOL. " +
    "HTTP /p/{slug}/{op} is a proxy and is not exec. " +
    "LIVE fabric (not Softwares-tab): AZPIPE AP-WP-0.2, SweepGate SG-WP-0.1, ChainLock CL-WP-0.4, LOCKSET LS-WP-0.1, packed catalog RL-WP-0.1-runtime, QNS-CD-1.0 (photon QNS1 1.3; local qnsd in AzielEliab/qnm-node; GET /v1/qns cites only — never a public via proxy), AKM-TRIAD-1.0 adaptive memory (MCP memory_*; POST /v1/memory/* behind FragGate). MCP chainlock_*. suite-presence is operator-enabled. GET /v1/azpipe/arch cites the locked MASTER-33 strip (same FragGate pipeline payload; not a Softwares door). " +
    `${RUNTIME_VERSION} is the certification-point freeze (docs/2.0/ public contract, compatibility, receipt schema, refusal contract, breaking-change policy, clean-room + external adversarial pack; self-test ≠ third-party lab). No intentional behavioral breaks from 1.9.3. Remain-OFF untouched. ` +
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
    "Superseded heritage note (not current serverInfo.version): 1.6.2 widened the public door to sensible advisory engines; stubs still refuse. " +
    "1.6.0 is the FragGate door cut on in-process engines. 1.5.0 was agent-native flat product tools. " +
    "Kernel: https://github.com/AzielEliab/fraggate (FG-0.1). " +
    "Every catalog slug is a true engine. Cloudflare isolate is the jail. engine_digest is required. " +
    "Hosted AZAI is protocol mirror + Lamb check, not the blend. VPN/hop mesh is not claimed on this public surface. AZMail anonymous ring is FragGate LIVE_OPS only (default off; not SMTP). " +
    "Compatible clients: ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants. " +
    `Always send User-Agent Mozilla/5.0. Public, no OAuth. Author: Aziel Eliab only. Current version remains ${RUNTIME_VERSION}.`
  );
}

export function runtimeHelperTools() {
  return [
    {
      name: "runtime_skill",
      title: "How to use this software",
      description: tdqsDescription({
        action:
          "Read the agent how-to (one door — discover, route, refuse; pipeline fraggate_list → fraggate_describe → fraggate_call). This is playbook markdown, not a catalog and not a machine manifest",
        when: "starting a session or choosing the door before any catalog call",
        notFor: "listing hashed registry names, hub Software-tab cards, or executing an engine",
        instead: "fraggate_list, runtime_software, or fraggate_call",
        effects:
          "Dual surface: agent chat has no technical UI chrome; Worker / Flutter / local install stay complete human software. Does not list slugs or run ops",
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
            "List the hashed FragGate registry (live / stub / local_only + digests) so you can discover names. Discovery first — not a hub Software tab and not exec",
          when: "you do not yet know the catalog name or slug",
          notFor: "hub Software-tab refresh, inspecting one known capability, or executing an op",
          instead: "runtime_software (GET /v1/software), fraggate_describe, or fraggate_call",
          effects:
            "Empty {} only. Never enables mesh radios. Never invents tools or ops. Compact LIVE_OPS tokens below are discovery hints required by product verify scripts — they are not exec. Call fraggate_describe for the live card; later unknown names refuse FG-HALLUC-TOOL",
          returns: "registry entries, allowlists, digests, and the MASTER-33 pipeline cite",
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
          "Inspect one known FragGate card (live vs stub vs local_only, public ops, engine_digest). Not execute and not a digest-only proof",
        when: "you already have a name or slug from fraggate_list or GET /v1/software",
        notFor: "discovering the full registry, proving a digest, pulling a hub product card, or executing an op",
        instead: "fraggate_list, fraggate_verify, runtime_pull, or fraggate_call",
        effects:
          "Missing both name and slug, or an unknown name, refuses FG-HALLUC-TOOL. Wipe/unlock on embryolock stay FG-STUB. AZChat is LIVE+bound (mesh default off; not AZMail)",
        params: "Pass name or slug — one is enough. Combined name/op forms such as foldlock/fold-preview are accepted",
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
        action: "Confirm a name, slug, or 64-hex engine_digest against the hashed FragGate registry — a proof, not a card listing",
        when: "you must prove a listed name or digest exists after fraggate_describe",
        notFor: "listing the registry, describing ops, or executing",
        instead: "fraggate_list, fraggate_describe, or fraggate_call",
        effects:
          "Not an exec path and not a describe card. Empty {} (no name, slug, or digest) refuses FG-HALLUC-TOOL. Digest without name/slug compares the whole registry hash (kind=registry). Name or slug with an optional digest compares that entry (kind=entry); unknown names refuse FG-HALLUC-TOOL. Mismatch returns ok=false with matched=false — it does not invent a digest",
        params:
          "Send digest alone to proof the live registry_digest. Send name or slug (one is enough) to proof one card. Combined name+digest must equal that card's engine_digest",
        returns: "match or mismatch (kind registry|entry, matched, registry_digest)",
      }),
      annotations: mcpAnnotations("Verify a registry name or digest", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description:
          "Provide name, slug, and/or digest. Empty {} refuses FG-HALLUC-TOOL. Digest-only checks the whole registry hash.",
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
            "Execute a known catalog slug+op through the FragGate single door (CallEnvelope → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return). Default exec path — not discovery and not a raw session",
          when: "fraggate_list and fraggate_describe already identified a live allowlisted op",
          notFor: "discovering names, inspecting one capability without exec, or raw session plumbing",
          instead: "fraggate_list, fraggate_describe, or (only if asked) runtime_run / runtime_session_exec",
          effects:
            "Side effects are operation-dependent (read, write, or refuse). May reach an open world when the target op does (for example AZBrowser ethical_search); many ops stay isolate-local. Unknown names refuse FG-HALLUC-TOOL. Stub, local-only, and Remain-OFF verbs refuse FG-STUB / FG-LOCAL-ONLY / FG-GATE-REFUSE / FG-LAMB-REFUSE. FragGate is THE single door",
          params:
            "Required: op. Also pass slug or name. Extra top-level keys other than name/slug/product/tool/op/verb/claim/proposal/ground/payload/session_id/id become the op payload when payload is omitted. UI aliases (list_modules, place, genesis_boot, hold, airlock, home, classify, doctor, pair) forward to catalog ops",
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
          "Run the named DecisionGATE five sequential gates on a proposal (Freedom without clarity is chaos) without executing a catalog product. Also runs automatically inside fraggate_call before exec",
        when: "you want a gate check without executing a catalog product verb",
        notFor: "executing a product op or searching the library",
        instead: "fraggate_call or library_lookup",
        effects:
          "Write: appends an ask/refuse ledger tip (not idempotent). Empty {} still runs the five gates and stamps the ledger. Does not execute domain software",
        params: "All proposal fields are optional. Missing evidence can fail a gate. accountable identity on this runtime is Aziel Eliab only",
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
        action: "Search the public Aziel Digital Library (aziel-corpus search / example / skill) — cites, not beliefs and not vault stamps",
        when: "you need a public corpus cite, example record, or library skill",
        notFor: "adaptive memory belief, ChainLock facts, or private-file search",
        instead: "memory_recall, chainlock_recall, or fraggate_call slug=aziel-corpus",
        effects:
          "Not a private-file search engine and not AKM/ChainLock. Empty q does not invent a cite. Unknown ops refuse FG-UNKNOWN-OP (allowed: search, example, skill, health). Prefer this helper over a raw aziel-corpus fraggate_call only when you want the named library door",
        params:
          "q is public corpus text — not memory_recall q and not ChainLock q. Omit op to search. Extra keys besides q/op/payload ride along as aziel-corpus payload (same as passing payload{})",
        returns: "search, example, skill, or health payload inside the display envelope",
      }),
      annotations: mcpAnnotations("Search the Aziel Digital Library", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "q is the search text. op selects the library verb. Extra keys are forwarded as corpus payload.",
        properties: {
          q: {
            type: "string",
            description:
              "Optional public-corpus query for op=search. Empty q returns an empty or default hit set, not an invented cite. Not a memory or ChainLock query.",
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
          "Read QNM suite rollup totals (enabled?, bearers, live/locked/isolated counts) — not the node roster. Packet-transfer cite is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; GET /v1/qns cites only; Worker does not proxy via emit)",
        when: "you need suite presence counts or whether radios are OFF",
        notFor: "listing individual nodes, enabling radios, or executing a catalog engine",
        instead: "mesh_nodes, mesh_enable, or fraggate_call",
        effects:
          "Never enables. Default radios OFF. suite-presence is operator-enabled. Not a login mesh. Views/MCP/downloads do not enter QNM-S. Full node process is local qnm-node/",
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
        action: "Operator-enable QNM suite radios by declaring a bearer (POST /v1/mesh/enable) — turns the whole suite LIVE, not one node",
        when: "an operator must turn radios LIVE after ≥1 declared bearer (example: suite-presence)",
        notFor: "reading status, joining one node, disabling radios, or logging into an account",
        instead: "mesh_status, mesh_join, or mesh_disable",
        effects:
          "Write: stores the bearer and turns radios LIVE. Rate-limited. Empty {} is refused (MESH-ENABLE). Login/account/recover/gate names refuse. Does not arm, wipe, heal, or resurrect accounts. Not a login mesh. Default remains OFF on a fresh isolate",
        params: "bearer is required. Example: suite-presence",
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
        action: "Turn all QNM radios and bearers OFF (POST /v1/mesh/disable) — suite-wide, not one node",
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
        action: "Register one product node into the QNM rollup (POST /v1/mesh/join) — first presence, not a TTL refresh",
        when: "radios are already LIVE and a catalog product should appear in live/locked/isolated counts",
        notFor: "refreshing an existing node, reading the roster, enabling radios, or opening an account session",
        instead: "mesh_heartbeat, mesh_nodes, mesh_enable, or runtime_session_open",
        effects:
          "Write: additive presence with a 5-minute TTL. Refused while radios are OFF (MESH-OFF). Not an account session. AnonBroadcast is not a product",
        params: "product is required (catalog slug). node_id optional 8–80 [a-z0-9._-]. presence is live|locked|isolated (default live)",
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
        action: "Refresh one existing node's 5-minute QNM TTL (POST /v1/mesh/heartbeat) — not a first join",
        when: "you already have a node_id from mesh_join and radios are LIVE",
        notFor: "first-time registration or dropping the node",
        instead: "mesh_join or mesh_leave",
        effects:
          "Write: extends TTL (not idempotent). Unknown or expired node_id refuses MESH-UNKNOWN-NODE — join again; no account resurrection",
        params: "node_id is required. presence may replace the class (live|locked|isolated)",
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
        action: "Drop one node from the QNM rollup (POST /v1/mesh/leave) — not a suite-wide radio off",
        when: "a previously joined node should leave the counts",
        notFor: "turning all radios OFF or listing nodes",
        instead: "mesh_disable or mesh_nodes",
        effects:
          "Destructive to that node's presence only. Always allowed. No implicit heal. Repeating a missing node_id is a no-op/refuse, not resurrection",
        params: "node_id is required",
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
        action: "List the QNM node roster (node_id + presence + 5-minute TTL) — not suite totals",
        when: "you need the current node list after mesh_status",
        notFor: "suite counts without the roster, or mutating presence",
        instead: "mesh_status, mesh_join, or mesh_leave",
        effects: "No scores. No leaderboard. Views/MCP/downloads do not enter QNM-S",
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
        action: "Register the SHA-256 of a local file as a hash receipt — never a publish or upload path",
        when: "the operator already holds a local file and wants only its hash recorded",
        notFor: "uploading bytes, publishing video, sending mail, or joining a mesh node",
        instead: "local qnm-node/ anon-broadcast loopback, AZMail via fraggate_call, or mesh_join",
        effects:
          "Write: stores a hash receipt only. Does NOT accept video bytes. Operator keeps the file. Malformed sha256 refuses MESH-BAD-INPUT; publish-shaped keys refuse MESH-NO-PUBLISH",
        params: "sha256 is required (64 hex). title and product are optional labels, not file contents",
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
          "Read hub Software-tab cards (GET /v1/software): every product including AZChat LIVE+bound, sorted Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock). Not the hashed live/stub registry",
        when: "a hub or client refreshes the Software tab",
        notFor: "agent discovery of hashed registry status, compact skill URLs, or executing an op",
        instead: "fraggate_list, runtime_bundle, or fraggate_call",
        effects:
          "Empty {} only. Never enables mesh radios and never execs. Same JSON as GET /v1/software (also /v1/fraggate/software). Cards carry name, slug, ops, worker_home — not live/stub/digest hashes. EmbryoLock is live-with-local-destructive-boundary (worker_home embryolock-download-tracker). Agent exec still uses fraggate_list → fraggate_describe → fraggate_call",
        returns: "sorted software cards (name, slug, ops, worker_home) matching GET /v1/software",
      }),
      annotations: mcpAnnotations("Authoritative software catalog", HINT_READ),
      inputSchema: emptyArgsSchema("No arguments. Send {}. Hub/client helper — not exec and not fraggate_list."),
      outputSchema: toolEnvelopeOutputSchema(
        "Software-tab catalog JSON (products/cards with name, slug, ops, worker_home, sort lanes Plain→Gate→Lock). Not a hashed registry roster.",
      ),
    },
    {
      name: "runtime_bundle",
      title: "List every product (bundle helper)",
      description: tdqsDescription({
        action: "Read a compact bootstrap of every product skill URL and invoke prefix — not Software-tab cards and not the hashed registry",
        when: "a client needs skill URLs in one shot",
        notFor: "Software-tab refresh, hashed registry discovery, or exec",
        instead: "runtime_software, fraggate_list, or fraggate_call",
        effects: "Prefer GET /v1/software for hub Software tabs. This helper is URL bootstrap only",
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
        action: "Open one hub product card by slug (name, version, skill, download, ops) — not FragGate live/stub status",
        when: "you already have a slug from GET /v1/software or fraggate_list and need the card, not exec",
        notFor: "inspecting FragGate live/stub status or executing an op",
        instead: "fraggate_describe or fraggate_call",
        effects:
          "Not exec — then use fraggate_call. Unknown slug throws unknown product (it does not invent a card and does not refuse FG-HALLUC-TOOL; that code is FragGate-only). Missing skill falls back to in-repo markdown",
        params:
          "slug is required. product is an accepted alias of slug. Extra keys besides those two are ignored and are not an op payload",
        returns: "one product card (name, version, skill, download, ops, skill_source)",
      }),
      annotations: mcpAnnotations("Open one product", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "slug or product required. Extra keys are ignored by the pull helper — not an exec payload.",
        properties: {
          slug: {
            type: "string",
            description:
              "Required catalog slug from GET /v1/software or fraggate_list (for example foldlock). Alias: product. Not an exec path.",
          },
          product: {
            type: "string",
            description: "Alias of slug. Do not send two different values.",
          },
        },
        required: ["slug"],
      },
      outputSchema: toolEnvelopeOutputSchema(
        "One hub product card: name, version, skill markdown, download, ops, skill_source. Unknown slug is unknown product — not a FragGate FG-HALLUC-TOOL envelope.",
      ),
    },
    {
      name: "runtime_run",
      title: "Advanced: raw runtime_run",
      description: markAdvanced(
        tdqsDescription({
          action: "Advanced exec façade: admit a slug+op (still DecisionGATE-admitted) and run it through a raw session. Not the default door",
          when: "you were explicitly asked for the raw runtime_run path",
          notFor: "the default agent exec path or an already-open session you were asked to exec on",
          instead: "fraggate_call (default) or runtime_session_exec (existing session_id)",
          effects:
            "Side effects are operation-dependent. Not a backdoor past FragGate. Opens a session when session_id is omitted",
          params: "slug and op are required. session_id optional; omit to auto-open. Extra keys other than payload/session_id may be treated as payload",
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
          action: "Read the machine runtime manifest JSON (version, role, door=fraggate, engine slugs, registry_digest) — not the human how-to",
          when: "a client needs the machine manifest rather than the human skill",
          notFor: "the default agent how-to or hashed registry discovery",
          instead: "runtime_skill or fraggate_list",
          effects: "Not the default agent path. Does not list hub cards or execute",
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

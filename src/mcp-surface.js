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
import { FG_HALLUC_TOOL, FRAGGATE_KERNEL, PUBLIC_DOOR_TOOLS, PUBLIC_MCP_TOOL_MAX } from "./fraggate/codes.js";
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
    "Use Aziel Eliab software in this chat. One door — discover, route, refuse. " +
    "Pipeline: (1) fraggate_list or GET /v1/software (2) fraggate_describe one name (3) fraggate_call. " +
    "Prefer FragGate, GET /v1/software, and POST /mcp. Hubs refresh Software tabs from /v1/software. " +
    "Start with runtime_skill or fraggate_list. Describe a name with fraggate_describe. " +
    "Execute only through fraggate_call (CallEnvelope → DecisionGATE → handler or refuse). " +
    "decisiongate_check is the named live gate. library_lookup is read-only corpus search. " +
    "Show the user display.title and display.summary, then take the next input. " +
    "runtime_run, runtime_session_*, raw *_health, and runtime_manifest are advanced/internal. " +
    "Do not call flat {slug}_{op} names — they are not in tools/list. Unknown names refuse FG-HALLUC-TOOL. " +
    "HTTP /p/{slug}/{op} is a proxy and is not exec. " +
    "1.6.13 aligns the suite QNM rollup (QNM-BUILD-1.0, companion to AIH-WP-1.1): GET /v1/mesh live/locked/isolated counts; operator enable requires a declared bearer; default radios off; not a login mesh; full node process is local qnm-node/. " +
    "1.6.12 adds GET /v1/software (hub Software-tab catalog; Plain→Gate→Lock + EmbryoLock stub) and GET /v1/update/check. " +
    "1.6.11 adds a durable FragGate op alias map so Worker UI button names (azhub list_modules/place, azinterface genesis_boot/hold, azbrowser airlock/home, azmail classify, aznet doctor/pair, peacelock doctor) resolve to catalog LIVE_OPS. EmbryoLock is stub / local-not-hosted (name only; describe?slug=embryolock; not a FragGate engine). " +
    "1.6.10 sets AZBrowser and AZNet catalog one_line to separate software (not engine). Same FragGate door. " +
    "1.6.9 frames AZHub and AZInterface as two separate softwares under the same FragGate door (AIH-WP-1.0) — Blank Key spatial container + custodial page cycles. Never one combined product. Hub refuses auto-unlock / completeness. Interface page_cycle_status reports OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. " +
    "AZHub LIVE_OPS (health, skill, region_list, place_module, remove_module, tether_declare, tether_cut, tether_list, blank_key_status) and AZInterface LIVE_OPS (health, skill, genesis_status, site_state_get, site_state_set, integrity_check, witness_list, page_cycle_status) are listed by fraggate_list and executed only via fraggate_call / POST /v1/fraggate/call. " +
    "1.6.7 adds AZNet (AZN-WP-0.1) as a FragGate-live engine — silent verification side-net; never hosts payloads; AZBrowser pair required (functional order only; own Worker UI). " +
    "AZNet is reached only via fraggate_call / POST /v1/fraggate/call (flat leftover names still map through FragGate; not a side door). " +
    "1.6.6 adds AZBrowser (AZB-1.0) as a FragGate-live engine — Lamb Lens ethical research browser: ethical search + advisory navigate; cite; refuse harmful harvest; never invent visit results; not Chromium. AZNet is separate software (same FragGate door; order/token pairing only, not a shared Phase-1 UI). " +
    "AZBrowser LIVE_OPS (ethical_search, lamb_lens_search, navigate, airlock_ingest, tab_open, tab_list, receipt_list, verify, receipt_verify, health, skill) are listed by fraggate_list and executed only via fraggate_call / POST /v1/fraggate/call — the same ops Worker UI buttons call. " +
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
      description:
        "Read how an agent uses Aziel Eliab software: one door — discover, route, refuse. Pipeline: fraggate_list → fraggate_describe → fraggate_call. Hubs/clients: GET /v1/software. Dual surface: agent chat has no technical UI chrome; Worker / Flutter / local install / counted download stay complete human software.",
      annotations: { title: "How to use this software", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
    },
    {
      name: "fraggate_list",
      title: "Step 1 — List the FragGate registry",
      description:
        "Step 1 of the agent pipeline (list → describe → call). List hashed registry entries (live / stub / local_only). Discover names. Do not invent tools. For hub Software tabs prefer GET /v1/software (Plain→Gate→Lock + EmbryoLock stub). Sibling software under one FragGate door — never separate FragGate engines. allowlist.azhub LIVE_OPS: health, skill, region_list, place_module, remove_module, tether_declare, tether_cut, tether_list, blank_key_status, list_modules, place. allowlist.azinterface LIVE_OPS: health, skill, genesis_status, site_state_get, site_state_set, integrity_check, witness_list, page_cycle_status, genesis_boot, hold. allowlist.azbrowser LIVE_OPS: ethical_search, lamb_lens_search, navigate, airlock_ingest, airlock, home, tab_open, tab_list, receipt_list, verify, receipt_verify, health, skill. allowlist.aznet LIVE_OPS: health, doctor, pair_status, pair, garden_list, stamp, verify_hash, memorial_list, memorial_append, receipt_verify, skill — same ops MCP fraggate_call and the Worker UI buttons execute. UI aliases forward to catalog ops. EmbryoLock is stub / local-not-hosted (name only). AZHub, AZInterface, AZNet, and AZBrowser are separate products. Kernel: https://github.com/AzielEliab/fraggate",
      annotations: { title: "Step 1 — List the FragGate registry", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
    },
    {
      name: "fraggate_describe",
      title: "Step 2 — Describe one registry name",
      description:
        "Step 2 of the agent pipeline. After fraggate_list, describe one catalog name: live vs stub vs local_only, public ops, digest. Pass name or slug (not both required). EmbryoLock: slug=embryolock (stub / local-not-hosted; not a FragGate engine).",
      annotations: { title: "Step 2 — Describe one registry name", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Registry display name (e.g. FoldLock, EmbryoLock)" },
          slug: { type: "string", description: "Catalog slug (e.g. foldlock, embryolock, azhub)" },
        },
      },
    },
    {
      name: "fraggate_verify",
      title: "Verify a registry name or digest",
      description:
        "Confirm a name, slug, or digest against the hashed FragGate registry. Not an exec path. Prefer after fraggate_describe when the agent must prove a name exists.",
      annotations: { title: "Verify a registry name or digest", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Registry display name" },
          slug: { type: "string", description: "Catalog slug" },
          digest: { type: "string", description: "engine_digest hex to verify" },
        },
      },
    },
    {
      name: "fraggate_call",
      title: "Step 3 — Call through FragGate",
      description:
        "Step 3 of the agent pipeline (after list + describe). CallEnvelope in → DecisionGATE → handler or refuse → ResultEnvelope + ledger tip. Pass slug (or name) plus a public allowlisted op. Optional claim (DecisionGATE proposal). Default exec path. Unknown names refuse FG-HALLUC-TOOL. UI aliases (list_modules, place, genesis_boot, hold, airlock, home, classify, doctor, pair) forward to catalog ops. AZHub LIVE_OPS (region_list, place_module, remove_module, tether_declare, tether_cut, tether_list, blank_key_status, list_modules, place, health, skill) and AZInterface LIVE_OPS (genesis_status, site_state_get, site_state_set, integrity_check, witness_list, page_cycle_status, genesis_boot, hold, health, skill) and AZBrowser LIVE_OPS (ethical_search, lamb_lens_search, navigate, airlock_ingest, airlock, home, tab_open, tab_list, receipt_list, verify, receipt_verify, health, skill) map here — same backend as the Worker UI buttons. Sibling software under one FragGate door.",
      annotations: { title: "Step 3 — Call through FragGate", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          name: { type: "string", description: "Registry display name (alternative to slug)" },
          slug: { type: "string", description: "Catalog slug from fraggate_list / GET /v1/software" },
          op: { type: "string", description: "Public allowlisted op from fraggate_describe" },
          payload: { type: "object", additionalProperties: true, description: "Op payload object" },
          claim: {
            type: "object",
            additionalProperties: true,
            description: "Optional DecisionGATE proposal (statement, evidence, impacts, values, accountable)",
          },
        },
        required: ["op"],
      },
    },
    {
      name: "decisiongate_check",
      title: "Run DecisionGATE on a proposal",
      description:
        "Named live module. Five sequential gates on a proposal. Freedom without clarity is chaos. Also runs automatically inside fraggate_call before exec.",
      annotations: { title: "Run DecisionGATE on a proposal", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          statement: { type: "string" },
          evidence: { type: "array", items: { type: "string" } },
          impact_pos: { type: "array", items: { type: "string" } },
          impact_neg: { type: "array", items: { type: "string" } },
          values: { type: "array", items: { type: "string" } },
          accountable: { type: "string" },
        },
      },
    },
    {
      name: "library_lookup",
      title: "Search the Aziel Digital Library",
      description:
        "Read-only library lookup (aziel-corpus search / example / skill). Not a private-file search engine.",
      annotations: { title: "Search the Aziel Digital Library", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          q: { type: "string" },
          op: { type: "string", description: "search (default), example, or skill" },
        },
      },
    },
    {
      name: "mesh_status",
      title: "QNM suite rollup",
      description:
        "QNM-BUILD-1.0 suite rollup (companion to AIH-WP-1.1): enabled?, declared bearers, live/locked/isolated counts. Default radios OFF. GET/this tool never enables. Not a login mesh. Views/MCP/downloads do not enter QNM-S. Full node process is local qnm-node/. Pipeline: fraggate_list → fraggate_describe slug=mesh → fraggate_call, or this named tool.",
      annotations: { title: "QNM suite rollup", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
    },
    {
      name: "mesh_enable",
      title: "Enable QNM radios (declared bearer)",
      description:
        "Operator enable for the QNM suite rollup. LIVE only after ≥1 declared bearer (example: suite-presence). Empty {} is refused. Default OFF. Rate-limited. Not a login mesh. Does not arm, wipe, heal, or resurrect accounts. Same as POST /v1/mesh/enable.",
      annotations: { title: "Enable QNM radios (declared bearer)", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          bearer: {
            type: "string",
            description: "Declared bearer name (example: suite-presence). Login/account/recover/gate names refuse.",
          },
        },
        required: ["bearer"],
      },
    },
    {
      name: "mesh_disable",
      title: "Disable QNM radios",
      description:
        "Radios/bearers OFF. Tethers drop clean — no implicit heal, no account resurrection, no wipe internals. Always allowed.",
      annotations: { title: "Disable QNM radios", readOnlyHint: false, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
    },
    {
      name: "mesh_join",
      title: "Register QNM rollup presence",
      description:
        "Register a product node for rollup counts. Body: { product, node_id?, label?, presence? }. presence is live|locked|isolated. Refused while radios are OFF. Not an account session. Same as POST /v1/mesh/join.",
      annotations: { title: "Register QNM rollup presence", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          product: { type: "string", description: "Catalog product slug (e.g. godlock, azmail)" },
          node_id: { type: "string", description: "Optional stable node id" },
          label: { type: "string", description: "Optional short label" },
          presence: { type: "string", description: "live (default), locked, or isolated — rollup only, no scores" },
        },
        required: ["product"],
      },
    },
    {
      name: "mesh_heartbeat",
      title: "Refresh QNM rollup presence",
      description: "Refresh 5-minute presence. Body: { node_id, presence? }. Same as POST /v1/mesh/heartbeat.",
      annotations: { title: "Refresh QNM rollup presence", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          node_id: { type: "string", description: "Node id from mesh_join" },
          presence: { type: "string", description: "Optional live|locked|isolated" },
        },
        required: ["node_id"],
      },
    },
    {
      name: "mesh_leave",
      title: "Drop QNM rollup presence",
      description: "Drop a node from the rollup. Body: { node_id }. Always allowed. No implicit heal. Same as POST /v1/mesh/leave.",
      annotations: { title: "Drop QNM rollup presence", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { node_id: { type: "string" } },
        required: ["node_id"],
      },
    },
    {
      name: "mesh_nodes",
      title: "List QNM rollup nodes",
      description:
        "Roster with live/locked/isolated presence (5-minute TTL). No scores. No leaderboard. Views/MCP/downloads do not enter QNM-S. Same as GET /v1/mesh/nodes.",
      annotations: { title: "List QNM rollup nodes", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
    },
    {
      name: "mesh_broadcast",
      title: "Register a local hash receipt",
      description:
        "Register SHA-256 of a local communique. NEVER a publish path. Does NOT accept video bytes. Anon-broadcast is a sibling loopback module of local qnm-node/ only. Operator keeps the file. Body: { sha256, title? }.",
      annotations: { title: "Register a local hash receipt", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          sha256: { type: "string", description: "64-char hex SHA-256 of the local file" },
          title: { type: "string", description: "Optional short title" },
          product: { type: "string", description: "Optional product slug" },
        },
        required: ["sha256"],
      },
    },
    {
      name: "runtime_software",
      title: "Authoritative software catalog",
      description:
        "Hub/client helper: GET /v1/software. Every product plus EmbryoLock stub, sorted Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock). Prefer this for Software-tab refresh. Agent exec still uses fraggate_list → fraggate_describe → fraggate_call.",
      annotations: { title: "Authoritative software catalog", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
    },
    {
      name: "runtime_bundle",
      title: "List every product (bundle helper)",
      description:
        "Compact bootstrap of every product skill URL + invoke prefix. Prefer GET /v1/software for hub Software tabs and fraggate_list for the agent door.",
      annotations: { title: "List every product (bundle helper)", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
    },
    {
      name: "runtime_pull",
      title: "Open one product",
      description:
        "Open one product by slug: name, version, skill, download, and ops. Argument: slug from GET /v1/software or fraggate_list. Not exec — then use fraggate_call.",
      annotations: { title: "Open one product", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
    {
      name: "runtime_run",
      title: "Advanced: raw runtime_run",
      description: markAdvanced(
        "Advanced exec façade. Prefer fraggate_call. Still DecisionGATE-admitted; not a backdoor past the door.",
      ),
      annotations: { title: "Advanced: raw runtime_run", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          slug: { type: "string" },
          op: { type: "string" },
          payload: { type: "object" },
          session_id: { type: "string" },
        },
        required: ["slug", "op"],
      },
    },
    {
      name: "runtime_manifest",
      title: "Advanced: runtime manifest",
      description: markAdvanced(
        "Machine manifest (version, role, door=fraggate, engine slugs). Prefer runtime_skill or fraggate_list. Not the default agent path.",
      ),
      annotations: { title: "Advanced: runtime manifest", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: true },
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

export function annotateSessionTool(tool) {
  const title = sessionToolTitle(tool.name);
  return {
    ...tool,
    title,
    description: markAdvanced(stripAdvanced(tool.description)),
    annotations: {
      title,
      readOnlyHint: tool.name === "runtime_session_receipt" || tool.name === "runtime_session_receipts",
      openWorldHint: false,
    },
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
    message: `FG-HALLUC-TOOL: ${JSON.stringify(name || "")} is not a public MCP tool. Use fraggate_list / fraggate_call.`,
    exist: { mcp: PUBLIC_DOOR_TOOLS.slice() },
  };
}

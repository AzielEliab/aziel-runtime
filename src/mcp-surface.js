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
    "Start with runtime_skill or fraggate_list. Describe a name with fraggate_describe. " +
    "Execute only through fraggate_call (CallEnvelope → DecisionGATE → handler or refuse). " +
    "decisiongate_check is the named live gate. library_lookup is read-only corpus search. " +
    "Show the user display.title and display.summary, then take the next input. " +
    "runtime_run, runtime_session_*, raw *_health, and runtime_manifest are advanced/internal. " +
    "Do not call flat {slug}_{op} names — they are not in tools/list. Unknown names refuse FG-HALLUC-TOOL. " +
    "HTTP /p/{slug}/{op} is a proxy and is not exec. " +
    "1.6.0 is the FragGate door cut on in-process engines. 1.5.0 was agent-native flat product tools. " +
    "Kernel: https://github.com/AzielEliab/fraggate (FG-0.1). " +
    "Every catalog slug is a true engine. Cloudflare isolate is the jail. engine_digest is required. " +
    "Hosted AZAI is protocol mirror + Lamb check, not the blend. Mesh is not claimed on this public surface. " +
    "Always send User-Agent Mozilla/5.0. Public, no OAuth. Author: Aziel Eliab only."
  );
}

export function runtimeHelperTools() {
  return [
    {
      name: "runtime_skill",
      title: "How to use this software",
      description:
        "Read how an agent uses Aziel Eliab software: one door — discover, route, refuse. Dual surface: agent chat has no technical UI chrome; Worker / Flutter / local install / counted download stay complete human software.",
      annotations: { title: "How to use this software", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: true },
    },
    {
      name: "fraggate_list",
      title: "List the FragGate registry",
      description:
        "List hashed registry entries (live / stub / local_only). Discover names. Do not invent tools. Kernel: https://github.com/AzielEliab/fraggate",
      annotations: { title: "List the FragGate registry", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: true },
    },
    {
      name: "fraggate_describe",
      title: "Describe one registry name",
      description:
        "Describe one catalog name: live vs stub vs local_only, public ops, digest. Argument: name or slug.",
      annotations: { title: "Describe one registry name", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: { name: { type: "string" }, slug: { type: "string" } },
      },
    },
    {
      name: "fraggate_verify",
      title: "Verify a registry name or digest",
      description:
        "registry.verify — confirm a name or digest against the hashed FragGate registry.",
      annotations: { title: "Verify a registry name or digest", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          name: { type: "string" },
          slug: { type: "string" },
          digest: { type: "string" },
        },
      },
    },
    {
      name: "fraggate_call",
      title: "Call through FragGate",
      description:
        "CallEnvelope in → DecisionGATE → handler or refuse → ResultEnvelope + ledger tip. Pass name/slug, op, payload. Optional claim (DecisionGATE proposal). Default exec path. Unknown names refuse FG-HALLUC-TOOL.",
      annotations: { title: "Call through FragGate", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          name: { type: "string", description: "Registry name or slug" },
          slug: { type: "string" },
          op: { type: "string", description: "Public allowlisted op" },
          payload: { type: "object" },
          claim: { type: "object", description: "Optional DecisionGATE proposal (statement, evidence, impacts, values, accountable)" },
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
      name: "runtime_bundle",
      title: "List every product",
      description:
        "List every Aziel Eliab product (human/catalog helper). Prefer fraggate_list for the agent door.",
      annotations: { title: "List every product", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: true },
    },
    {
      name: "runtime_pull",
      title: "Open one product",
      description: "Open one product by slug: name, version, skill, download, and ops. Argument: slug.",
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

export async function callFraggateTool(name, args, products, bySlug) {
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
    const body = await fraggateCall(args, registry, bySlug);
    const product = body.slug && bySlug ? bySlug[body.slug] : null;
    return wrapFraggateEnvelope(name, body, product, body.op);
  }
  if (name === "library_lookup") {
    const body = await libraryLookup(args);
    const product = bySlug && bySlug["aziel-corpus"];
    return wrapFraggateEnvelope(name, body, product, body.op || "search");
  }
  if (name === "decisiongate_check") {
    const body = await namedDecisiongateCheck(args);
    const product = bySlug && bySlug.decisiongate;
    return wrapFraggateEnvelope(name, body, product, "check");
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

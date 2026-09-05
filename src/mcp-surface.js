/**
 * Agent-default MCP surface.
 *
 * Product verbs first. Session / raw health / machine manifest are advanced.
 * Product tools run the in-process engine when the op is implemented here.
 * runtime_run is the auto-session façade (true exec + receipt).
 * HTTP /p/{slug}/{op} stays a proxy and is not exec.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import {
  ADVANCED_PREFIX,
  isAdvancedToolName,
  markAdvanced,
  mcpContentText,
  productInputHint,
  productToolDescription,
  productVerbTitle,
  wrapToolOutput,
} from "./display.js";
import { resolveSlug } from "./runtime-api.js";
import { executeLocal } from "./engines/runner.js";
import { callSessionTool } from "./session-http.js";

export { ADVANCED_PREFIX, isAdvancedToolName };

export function mcpInitializeInstructions() {
  return (
    "Use Aziel Eliab software in this chat. Prefer product tools (godlock_submit, foldlock_fold-preview, decisiongate_check, azclce_score) or runtime_run {slug, op, payload}. " +
    "Show the user display.title and display.summary, then take the next input. " +
    "runtime_session_*, raw *_health, and runtime_manifest are advanced/internal — do not walk the user through session/OpenAPI/HTTP plumbing. " +
    "Product MCP tools run the in-process engines when that op is implemented here; binding-only ops stay per-op proxy_fallback. " +
    "HTTP /p/{slug}/{op} is a proxy and is not exec. runtime_run auto-opens a session and runs true in-process exec (receipt includes engine_digest + ran_in). " +
    "1.5.0 is the agent-native cut on 1.4.1 production gates (ready, HEAD, no-store, receipt cap 64, TTL 6h, rate limits, optional token). " +
    "Every catalog slug is a true engine. Cloudflare isolate is the jail. Hosted AZAI is protocol mirror + Lamb check, not the blend. " +
    "Always send User-Agent Mozilla/5.0. Public, no OAuth. Author: Aziel Eliab only."
  );
}

export function runtimeHelperTools() {
  return [
    {
      name: "runtime_skill",
      title: "How to use this software",
      description:
        "Read how an agent uses Aziel Eliab software in this chat: open a product, show the output, take the next input. Dual surface: agent chat has no technical UI chrome; Worker / Flutter / local install / counted download stay complete human software.",
      annotations: { title: "How to use this software", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: true },
    },
    {
      name: "runtime_run",
      title: "Use Aziel Eliab software",
      description:
        "Use Aziel Eliab software. Pass slug, op, and payload. Opens a session automatically (or reuse session_id), runs the true in-process engine — not the HTTP proxy — and returns a display-ready result. Prefer named product tools when you already know the product (godlock_submit, foldlock_fold-preview).",
      annotations: { title: "Use Aziel Eliab software", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          slug: { type: "string", description: "Product slug, e.g. foldlock, godlock, azclce" },
          op: { type: "string", description: "Product verb, e.g. fold-preview, submit, score" },
          payload: { type: "object", description: "What the software needs as input" },
          session_id: { type: "string", description: "Optional. Reuse an open session." },
        },
        required: ["slug", "op"],
      },
    },
    {
      name: "runtime_bundle",
      title: "List every product",
      description: "List every Aziel Eliab product and how to open it. Then pick a product tool or runtime_run.",
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
      name: "runtime_manifest",
      title: "Advanced: runtime manifest",
      description: markAdvanced(
        "Machine manifest (version, role, engine slugs). Prefer runtime_skill or product tools. Not the default agent path.",
      ),
      annotations: { title: "Advanced: runtime manifest", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: true },
    },
  ];
}

export function productMcpTool(product, opSpec) {
  const title = productVerbTitle(product, opSpec.op);
  const advanced = isAdvancedToolName(`${product.slug}_${opSpec.op}`, opSpec.op);
  return {
    name: `${product.slug}_${opSpec.op}`,
    title,
    description: productToolDescription(product, opSpec),
    annotations: {
      title: advanced ? `Advanced: ${title}` : title,
      readOnlyHint: opSpec.method === "GET",
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      additionalProperties: true,
      description: productInputHint(product, opSpec),
    },
  };
}

export function buildMcpToolList({ products, sessionTools }) {
  const tools = [...runtimeHelperTools()];
  for (const product of products || []) {
    const ops = product.ops || [];
    const primary = ops.filter((o) => o.op !== "health");
    const health = ops.filter((o) => o.op === "health");
    for (const spec of primary) tools.push(productMcpTool(product, spec));
    for (const spec of health) tools.push(productMcpTool(product, spec));
  }
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

export async function runProductMcpOp({ env, product, op, args, upstreamFetch }) {
  const payload = args && typeof args === "object" ? args : {};
  const local = await executeLocal({ slug: product.slug, op, payload, ranIn: "aziel-runtime" });
  if (local && !local.unsupported) {
    return {
      status: local.status,
      text: local.responseText,
      target: "in-process",
      mode: "local",
    };
  }
  const spec = product.ops.find((o) => o.op === op);
  const method = spec && spec.method === "GET" ? "GET" : "POST";
  const init = {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
  };
  if (method !== "GET") init.body = JSON.stringify(payload);
  const { res, target } = await upstreamFetch(env, product, `/v1/${op}`, init);
  const text = await res.text();
  return { status: res.status, text, target, mode: "proxy_fallback" };
}

export async function callRuntimeRun(env, args, origin, deps) {
  const rawSlug = (args && (args.slug || args.product)) || "";
  const key = resolveSlug(rawSlug, deps.BY_SLUG);
  if (!key) throw new Error(`unknown product: ${rawSlug}`);
  const op = String((args && args.op) || "").trim();
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

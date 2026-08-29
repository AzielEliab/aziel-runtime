/**
 * aziel-runtime — one URL for every AzielEliab product runtime.
 *
 * GET  /              HTML catalog
 * GET  /openapi.json  combined OpenAPI 3.1 (paths /p/{product}/{op})
 * POST /p/{product}/{op}  proxy → https://{worker}.vibelock.workers.dev/v1/{op}
 * GET  /p/{product}/{op}  proxy GET
 * GET  /v1/health
 * POST /mcp           JSON-RPC MCP-over-HTTP (initialize, tools/list, tools/call)
 *
 * No download-KV increment. CORS *. Apache-2.0. Forks welcome.
 */
const CATALOG_HOST = "https://aziel-runtime.vibelock.workers.dev";
const PROTOCOL = "2025-03-26";

export const PRODUCTS = [
  {
    slug: "vibelock",
    name: "VibeLock",
    worker: "vibelock-download-tracker",
    github: "https://github.com/AzielEliab/vibelock",
    ops: [{ op: "analyze", method: "POST", summary: "Audio forensic risk assessment (JSON metrics)." }],
    example: { summary: "synthetic dual-channel notes; local WAV scoring is in the Python package" },
    banner: null,
  },
  {
    slug: "veillock",
    name: "VeilLock",
    worker: "veillock-download-tracker",
    github: "https://github.com/AzielEliab/veillock",
    ops: [{ op: "apps", method: "POST", summary: "Local-app steps. YOUR camera/screen only." }],
    example: { app: "zoom" },
    banner: "VeilLock does not inject into FaceTime, Zoom, Meet, Teams, or Skype. YOUR camera/screen only. Not a call interceptor.",
  },
  {
    slug: "codelock",
    name: "CodeLock",
    worker: "codelock-download-tracker",
    github: "https://github.com/AzielEliab/codelock",
    ops: [{ op: "render", method: "POST", summary: "Canonical or CodeLock/Rosetta HTML view of source." }],
    example: { source: "print('hello')", mode: "normalize" },
    banner: "This tool alters perception, not meaning.",
  },
  {
    slug: "godlock",
    name: "GodLock",
    worker: "godlock-download-tracker",
    github: "https://github.com/AzielEliab/godlock",
    ops: [
      { op: "score", method: "POST", summary: "Offline ABAD / hardening score for a text." },
      { op: "submit", method: "POST", summary: "Submit text; returns a receipt id (no VPN)." },
    ],
    example: { text: "ABAD does not layer on phi." },
    banner: "GodLock is not a VPN and not an anonymity network.",
  },
  {
    slug: "shadowlock",
    name: "ShadowLock",
    worker: "shadowlock-download-tracker",
    github: "https://github.com/AzielEliab/shadowlock",
    ops: [{ op: "observe", method: "POST", summary: "Zero-retention observation of a job list you already have." }],
    example: { jobs: [{ id: "a", status: "ok" }] },
    banner: "ShadowLock is a gate on an outcome you already have. No OS hook. No process intercept.",
  },
  {
    slug: "temporallock",
    name: "TemporalLock",
    worker: "temporallock-download-tracker",
    github: "https://github.com/AzielEliab/temporallock",
    ops: [
      { op: "genesis", method: "POST", summary: "First receipt of a chain (explicit genesis)." },
      { op: "append", method: "POST", summary: "Append a receipt to an existing chain payload." },
      { op: "verify", method: "POST", summary: "Recompute hashes. Anyone can verify." },
    ],
    example: { summary: "sky was overcast", evidence: "photo:./sky.jpg", confidence: 0.9 },
    banner: null,
  },
  {
    slug: "forgereceipts",
    name: "ForgeReceipts",
    worker: "forgereceipts-download-tracker",
    github: "https://github.com/AzielEliab/forgereceipts",
    ops: [{ op: "receipt", method: "POST", summary: "Local receipt / checklist helper. No court connection." }],
    example: { summary: "filed locally", evidence: "sha256:…" },
    banner: "ForgeReceipts is not legal advice. It does not contact courts, Odyssey, email, or any cloud filing service.",
  },
  {
    slug: "decisiongate",
    name: "DecisionGATE",
    worker: "decisiongate-download-tracker",
    github: "https://github.com/AzielEliab/decisiongate",
    ops: [{ op: "check", method: "POST", summary: "Run the five sequential gates on a proposal." }],
    example: {
      statement: "Release the catalog Worker this week.",
      evidence: ["OpenAPI 3.1 combined spec."],
      impact_pos: ["One URL for GPT Actions."],
      impact_neg: ["A vague draft takes longer."],
      values: ["Clarity without force"],
      accountable: "Aziel Eliab",
    },
    banner: "Freedom without clarity is chaos.",
  },
  {
    slug: "zsolver",
    name: "ZionPattern Solver",
    worker: "zsolver-download-tracker",
    github: "https://github.com/AzielEliab/zion-pattern-solver",
    ops: [
      { op: "patterns", method: "GET", summary: "Nine ontology nodes (Zioncheck seed). Not a verdict." },
      { op: "score", method: "POST", summary: "Score answers. Hard 75% cap, 25% floor." },
      { op: "session", method: "POST", summary: "Stateless session snapshot from answers." },
    ],
    example: { answers: [{ pattern_id: "P1", value: "yes" }, { pattern_id: "P2", value: "unknown" }] },
    banner: "Hard 75% confidence cap / 25% uncertainty floor. Provisional and assistive. Does not solve Zioncheck or any case.",
  },
  {
    slug: "azos",
    name: "AZ-OS",
    worker: "azos-download-tracker",
    github: "https://github.com/AzielEliab/azos",
    ops: [{ op: "status", method: "POST", summary: "Read-only status / principles. No remote exec." }],
    example: {},
    banner: "AZ-OS does not grant remote shell. Invite prints principles; exec requires a local token.",
  },
  {
    slug: "glossafilter",
    name: "Glossa Filter",
    worker: "glossafilter-download-tracker",
    github: "https://github.com/AzielEliab/glossafilter",
    ops: [{ op: "render", method: "POST", summary: "Render an intent across bundled peer ids." }],
    example: { subject: "package", rel: "release", object: "filter", channel: "tooling" },
    banner: "Human opinion remains human, and tools remain tools.",
  },
  {
    slug: "miragegrid",
    name: "MirageGrid",
    worker: "miragegrid-download-tracker",
    github: "https://github.com/AzielEliab/miragegrid",
    ops: [{ op: "assign", method: "POST", summary: "Assign a session node id. Mapping is ephemeral." }],
    example: {},
    banner: "MirageGrid is not a VPN and not an anonymity network. It does not guarantee anonymity against global surveillance.",
  },
  {
    slug: "staticclock",
    name: "StaticClock",
    worker: "staticclock-download-tracker",
    github: "https://github.com/AzielEliab/staticclock",
    ops: [{ op: "advise", method: "POST", summary: "Five advisory fields for a geo. Not a scheduler." }],
    example: { geo: "Indiana" },
    banner: "StaticClock is not a scheduler and not a clock you set. Advisory fields only.",
  },
  {
    slug: "chronolock",
    name: "ChronoLock",
    worker: "chronolock-download-tracker",
    github: "https://github.com/AzielEliab/chronolock",
    ops: [
      { op: "advisory", method: "POST", summary: "One advisory for a last-known geo. Not a scheduler." },
      { op: "anchors", method: "GET", summary: "List Top-30 geographic anchors." },
    ],
    example: { geo: "Indiana" },
    banner: "ChronoLock is advisory only — not a scheduler, not targeting, not virality. Temporal Neutral Window 08:30–10:30 local. Distinct from TemporalLock.",
  },
  {
    slug: "postking",
    name: "Post-King Chess",
    worker: "postking-download-tracker",
    github: "https://github.com/AzielEliab/postking-chess",
    ops: [
      { op: "new", method: "POST", summary: "Start a game {difficulty, seed}." },
      { op: "move", method: "POST", summary: "Human UCI move + AI 1-ply continuity reply." },
      { op: "status", method: "POST", summary: "Continuity status for a FEN/state." },
    ],
    example: { difficulty: "steward", seed: 1 },
    banner: "The goal is not to win. The goal is to remain. Human is king-bound; AI has a Node, not a king.",
  },
  {
    slug: "azclce",
    name: "AZ-CLCE",
    worker: "azclce-download-tracker",
    github: "https://github.com/AzielEliab/az-clce",
    ops: [
      { op: "score", method: "POST", summary: "Jaccard triple / pairwise / CLCE+." },
      { op: "classify", method: "POST", summary: "Mismatch types. Type D is a label only." },
      { op: "gate", method: "POST", summary: "Pass iff triple ≥ min (default 0.7). Advisory." },
    ],
    example: { r: "login button blue", d: "login form submits", p: "login button submits" },
    banner: "CLCE detects inconsistency, not intent. Type D is a label, not a finding of malice. Threshold 0.7 is advisory.",
  },
  {
    slug: "ark",
    name: "The ARK",
    worker: "ark-download-tracker",
    github: "https://github.com/AzielEliab/ark",
    ops: [
      { op: "sweep", method: "POST", summary: "Mode E heuristics only (PE/ELF/Mach-O, powershell -enc, curl|sh). No clamscan. Payload is not stored." },
      { op: "levels", method: "GET", summary: "Auto-lock seconds and decoy counts. Behavior, not cryptography." },
    ],
    example: { text: "hello world" },
    banner: "The ARK is not a kernel. Hosted API never unlocks or encrypts with a passphrase and never stores vaults. Sweep is Mode E heuristics only.",
  },
  {
    slug: "azai",
    name: "AZAI",
    worker: "azai-download-tracker",
    github: "https://github.com/AzielEliab/azai",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Protocol mirror. Not a provider proxy." },
      { op: "lamb-check", method: "POST", summary: "Run Lamb Lens (peace/clarity/service) on {text}. No provider call." },
      { op: "lamb_check", method: "POST", summary: "Alias of lamb-check for MCP azai_lamb_check." },
    ],
    example: { text: "hello" },
    banner: "AZAI is a local OpenAI-compatible runtime, not a new foundation model. Hosted /v1 is a protocol mirror + Lamb check, NOT a proxy that spends the author's paid keys. Jeeves is not sovereign. Live blend is local azai serve.",
  },
  {
    slug: "spectrallock",
    name: "SpectralLock",
    worker: "spectrallock-download-tracker",
    github: "https://github.com/AzielEliab/spectrallock",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Does not increment download KV." },
      { op: "modes", method: "GET", summary: "List live overlay modes (zero, tazel, vyrn, uv, rosetta, zen, chaos, balance)." },
      { op: "overlay", method: "POST", summary: "Simplified overlay preview. PNG b64 in, longest side capped at 256 px. Not the full Python pipeline." },
    ],
    example: { mode: "rosetta", b64: "<png-base64>" },
    banner: "Hosted overlay is a 256px preview, not a spectrometer, not forensic.",
  },
];

const BY_SLUG = Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]));

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function html(body) {
  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
  });
}

function originOf(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return CATALOG_HOST;
  }
}

function workerUrl(product, op) {
  return `https://${product.worker}.vibelock.workers.dev/v1/${op}`;
}

function catalogHtml(origin) {
  const cards = PRODUCTS.map((p) => {
    const ops = p.ops
      .map((o) => `<code>${o.method} /p/${p.slug}/${o.op}</code> — ${escapeHtml(o.summary)}`)
      .join("<br>");
    const banner = p.banner ? `<p class="banner">${escapeHtml(p.banner)}</p>` : "";
    const example = JSON.stringify(p.example, null, 2);
    const firstPost = p.ops.find((o) => o.method === "POST") || p.ops[0];
    return `<article class="card">
  <h2>${escapeHtml(p.name)} <span class="slug">${escapeHtml(p.slug)}</span></h2>
  ${banner}
  <p>Worker: <a href="https://${p.worker}.vibelock.workers.dev/">${p.worker}.vibelock.workers.dev</a>
     · <a href="https://${p.worker}.vibelock.workers.dev/openapi.json">product OpenAPI</a>
     · <a href="${p.github}">GitHub</a></p>
  <p>${ops}</p>
  <pre>curl -X ${firstPost.method} ${origin}/p/${p.slug}/${firstPost.op} \\
  -H 'content-type: application/json' \\
  -d '${example.replace(/'/g, "’")}'</pre>
</article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aziel runtime catalog</title>
<style>
  :root { color-scheme: dark; }
  body { font: 16px/1.45 system-ui, sans-serif; max-width: 52rem; margin: 2.5rem auto; padding: 0 1.25rem 4rem; background: #0e1014; color: #e8eaef; }
  h1 { font-size: 1.85rem; margin: 0 0 .35rem; }
  h2 { font-size: 1.2rem; margin: 0 0 .4rem; }
  .slug { font-weight: 500; color: #9aa3b2; font-size: .95rem; }
  a { color: #c9d4ff; }
  .lead { color: #9aa3b2; margin: 0 0 1.25rem; }
  .honesty { border: 1px solid #5c4a1a; background: #241c0d; color: #f0d78c; padding: .9rem 1.05rem; border-radius: 10px; margin: 0 0 1.4rem; }
  .honesty ul { margin: .4rem 0 0; padding-left: 1.2rem; }
  .card { border: 1px solid #2a3140; border-radius: 12px; padding: 1.1rem 1.2rem; background: #151922; margin: 0 0 1rem; }
  .banner { border: 1px solid #3d3420; background: #1b160c; color: #e6d19a; padding: .55rem .7rem; border-radius: 8px; font-size: .92rem; }
  pre { background: #0e1014; padding: .75rem .9rem; overflow: auto; border-radius: 8px; font-size: .82rem; }
  code { font-size: .88rem; }
  .links a { margin-right: 1rem; }
</style>
<body>
  <h1>Aziel runtime catalog</h1>
  <p class="lead">One URL for Grok, ChatGPT GPT Actions, and Venice. Forks welcome. Apache-2.0. Author: Aziel Eliab.</p>
  <div class="honesty">
    <strong>Honesty banners</strong>
    <ul>
      <li>GodLock and MirageGrid are <em>not</em> VPNs and not anonymity networks.</li>
      <li>ForgeReceipts is <em>not</em> legal advice and does not contact courts.</li>
      <li>ZionPattern Solver never claims more than 75% confidence. It does not solve cases.</li>
      <li>VeilLock does <em>not</em> inject into FaceTime or any calling app.</li>
      <li>AZ-CLCE detects inconsistency, not intent. Type D is a label only.</li>
      <li>ChronoLock is advisory only — not a scheduler, not targeting, not virality. 08:30–10:30 local. Distinct from TemporalLock.</li>
      <li>The ARK is <em>not</em> a kernel. Hosted API never unlocks or encrypts with a passphrase and never stores vaults. Sweep is Mode E heuristics only.</li>
      <li>AZAI is a local OpenAI-compatible runtime, not a new foundation model. Hosted /v1 is a protocol mirror + Lamb check, not a provider proxy. Jeeves is not sovereign.</li>
      <li>SpectralLock hosted overlay is a 256px preview, not a spectrometer, not forensic.</li>
    </ul>
  </div>
  <p class="links">
    <a href="${origin}/openapi.json">Combined OpenAPI 3.1</a>
    <a href="${origin}/mcp">MCP (POST JSON-RPC)</a>
    <a href="${origin}/v1/health">/v1/health</a>
    <a href="https://github.com/AzielEliab/aziel-runtime">GitHub</a>
  </p>
  <h2>Add this URL</h2>
  <ul>
    <li><strong>ChatGPT</strong> — GPT Actions → Import from URL → <code>${origin}/openapi.json</code></li>
    <li><strong>Grok</strong> — custom tool / OpenAPI / MCP remote → <code>${origin}/openapi.json</code> or <code>${origin}/mcp</code></li>
    <li><strong>Venice</strong> — custom HTTP tools / OpenAPI → same OpenAPI URL</li>
  </ul>
  ${cards}
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function staticPaths(origin) {
  const paths = {
    "/v1/health": {
      get: {
        operationId: "catalog_health",
        summary: "Catalog liveness.",
        responses: { "200": { description: "ok" } },
      },
    },
  };
  for (const p of PRODUCTS) {
    for (const o of p.ops) {
      const path = `/p/${p.slug}/${o.op}`;
      const method = o.method.toLowerCase();
      const item = {
        operationId: `${p.slug}_${o.op}`,
        summary: `${p.name}: ${o.summary}`,
        description: [p.banner, `Proxies to ${workerUrl(p, o.op)}`].filter(Boolean).join("\n\n"),
        tags: [p.slug],
        responses: {
          "200": { description: "Upstream JSON" },
          "4XX": { description: "Upstream or catalog error" },
        },
      };
      if (method === "post") {
        item.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" },
              example: p.example,
            },
          },
        };
      }
      paths[path] = { [method]: item };
    }
  }
  return paths;
}

function rewriteLivePaths(spec, product) {
  const out = {};
  const src = spec && spec.paths;
  if (!src || typeof src !== "object") return out;
  for (const [path, item] of Object.entries(src)) {
    const m = path.match(/^\/v1\/([^/]+)$/);
    if (!m) continue;
    const op = m[1];
    if (op === "health") continue;
    const prefixed = `/p/${product.slug}/${op}`;
    const copy = JSON.parse(JSON.stringify(item));
    for (const method of Object.keys(copy)) {
      const opObj = copy[method];
      if (opObj && typeof opObj === "object") {
        opObj.operationId = `${product.slug}_${op}`;
        opObj.tags = [product.slug];
        const extra = `Proxies to ${workerUrl(product, op)}.`;
        opObj.description = [opObj.description || opObj.summary || "", product.banner || "", extra]
          .filter(Boolean)
          .join("\n\n");
      }
    }
    out[prefixed] = copy;
  }
  return out;
}

async function combinedOpenApi(request, env) {
  const origin = originOf(request);
  const paths = staticPaths(origin);
  await Promise.all(
    PRODUCTS.map(async (p) => {
      try {
        const bind = env && env[bindingName(p)];
        let res;
        if (bind && typeof bind.fetch === "function") {
          res = await bind.fetch(new Request("https://internal/openapi.json", { headers: { accept: "application/json" } }));
        } else {
          res = await fetch(`https://${p.worker}.vibelock.workers.dev/openapi.json`, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(2500),
          });
        }
        if (!res.ok) return;
        const spec = await res.json();
        Object.assign(paths, rewriteLivePaths(spec, p));
      } catch {
        /* static fallback */
      }
    }),
  );
  return {
    openapi: "3.1.0",
    info: {
      title: "Aziel Eliab product runtime catalog",
      version: "1.0.0",
      summary: "One OpenAPI file for every AzielEliab runtime Worker.",
      description:
        "Import this file in ChatGPT GPT Actions, Grok custom tools, or Venice HTTP tools. " +
        "Paths /p/{product}/{op} proxy to each product Worker /v1/{op}. " +
        "GodLock/MirageGrid are not VPNs. ForgeReceipts is not legal advice. " +
        "ZionPattern Solver caps confidence at 75% and does not solve cases. " +
        "VeilLock does not inject into FaceTime. AZ-CLCE detects inconsistency, not intent. " +
        "ChronoLock is advisory only (not a scheduler, not targeting, not virality; 08:30–10:30 local; distinct from TemporalLock). " +
        "The ARK is not a kernel. Hosted API never unlocks or encrypts with a passphrase and never stores vaults. Sweep is Mode E heuristics only. " +
        "AZAI is a local OpenAI-compatible runtime, not a new foundation model. Hosted /v1 is a protocol mirror + Lamb check, not a provider proxy. Jeeves is not sovereign. " +
        "SpectralLock hosted overlay is a 256px preview, not a spectrometer, not forensic. " +
        "Forks welcome. Apache-2.0. Author: Aziel Eliab.",
      license: { name: "Apache-2.0", identifier: "Apache-2.0" },
      contact: { name: "Aziel Eliab", url: "https://github.com/AzielEliab/aziel-runtime" },
    },
    servers: [{ url: origin }],
    tags: PRODUCTS.map((p) => ({ name: p.slug, description: p.name })),
    paths,
  };
}

function bindingName(product) {
  return String(product.slug || "").toUpperCase().replace(/-/g, "_");
}

async function upstreamFetch(env, product, path, init) {
  const bind = env && env[bindingName(product)];
  const target = `https://${product.worker}.vibelock.workers.dev${path}`;
  if (bind && typeof bind.fetch === "function") {
    const req = new Request("https://internal" + path, init);
    return { res: await bind.fetch(req), target: target + " (service binding)" };
  }
  return { res: await fetch(target, init), target };
}

async function proxy(product, op, request, env) {
  const targetPath = `/v1/${op}`;
  const method = request.method === "GET" ? "GET" : "POST";
  const headers = {
    "content-type": request.headers.get("content-type") || "application/json",
    accept: "application/json",
  };
  const init = { method, headers };
  if (method !== "GET") {
    const text = await request.text();
    init.body = text && text.trim() ? text : "{}";
  }
  try {
    const { res, target } = await upstreamFetch(env, product, targetPath, init);
    const buf = await res.arrayBuffer();
    const outHeaders = new Headers(corsHeaders());
    const ct = res.headers.get("content-type") || "application/json; charset=utf-8";
    outHeaders.set("Content-Type", ct);
    outHeaders.set("X-Aziel-Upstream", target);
    return new Response(buf, { status: res.status, headers: outHeaders });
  } catch (err) {
    return json(
      {
        error: "upstream unreachable",
        product: product.slug,
        worker: product.worker,
        op,
        detail: String(err && err.message ? err.message : err),
      },
      502,
    );
  }
}

function toolList() {
  const tools = [];
  for (const p of PRODUCTS) {
    for (const o of p.ops) {
      tools.push({
        name: `${p.slug}_${o.op}`,
        description: `${p.name}: ${o.summary}${p.banner ? " " + p.banner : ""}`,
        inputSchema: {
          type: "object",
          additionalProperties: true,
          description: `JSON body posted to /v1/${o.op} on ${p.worker}.`,
        },
      });
    }
  }
  return tools;
}

async function callTool(env, name, args) {
  const idx = name.indexOf("_");
  if (idx < 1) throw new Error(`unknown tool: ${name}`);
  const slug = name.slice(0, idx);
  const op = name.slice(idx + 1);
  const product = BY_SLUG[slug];
  if (!product) throw new Error(`unknown product: ${slug}`);
  const spec = product.ops.find((o) => o.op === op);
  const method = spec && spec.method === "GET" ? "GET" : "POST";
  const init = {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
  };
  if (method !== "GET") init.body = JSON.stringify(args && typeof args === "object" ? args : {});
  const { res, target } = await upstreamFetch(env, product, `/v1/${op}`, init);
  const text = await res.text();
  return { status: res.status, text, target };
}

function rpcResult(id, result) {
  return json({ jsonrpc: "2.0", id: id ?? null, result });
}

function rpcError(id, code, message) {
  return json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

async function handleMcp(request, env) {
  if (request.method === "GET") {
    return json({
      ok: true,
      transport: "JSON-RPC MCP-over-HTTP",
      endpoint: "POST /mcp",
      methods: ["initialize", "tools/list", "tools/call", "ping"],
      auth: "none (public)",
      note: "Durable Objects / agents McpAgent not used. Minimal HTTP JSON-RPC.",
    });
  }
  if (request.method !== "POST") {
    return json({ error: "POST JSON-RPC to /mcp" }, 405);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  const id = body && body.id !== undefined ? body.id : null;
  const method = body && body.method;
  const params = (body && body.params) || {};
  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "aziel-runtime", version: "1.0.0" },
      instructions:
        "Tools are named {product}_{op} and proxy to each AzielEliab Worker /v1/{op}. Public, no OAuth.",
    });
  }
  if (method === "notifications/initialized" || method === "initialized") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (method === "ping") {
    return rpcResult(id, {});
  }
  if (method === "tools/list") {
    return rpcResult(id, { tools: toolList() });
  }
  if (method === "tools/call") {
    const name = params.name;
    const args = params.arguments || params.input || {};
    try {
      const out = await callTool(env, name, args);
      return rpcResult(id, {
        content: [
          {
            type: "text",
            text: out.text,
          },
        ],
        isError: out.status >= 400,
      });
    } catch (err) {
      return rpcResult(id, {
        content: [{ type: "text", text: JSON.stringify({ error: String(err.message || err) }) }],
        isError: true,
      });
    }
  }
  return rpcError(id, -32601, `Method not found: ${method}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return html(catalogHtml(originOf(request)));
    }

    if (url.pathname === "/openapi.json" && request.method === "GET") {
      return json(await combinedOpenApi(request, env));
    }

    if (url.pathname === "/v1/health" && request.method === "GET") {
      return json({
        ok: true,
        product: "aziel-runtime",
        products: PRODUCTS.map((p) => p.slug),
        openapi: "/openapi.json",
        mcp: "/mcp",
        kv_increment: false,
      });
    }

    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      return handleMcp(request, env);
    }

    const m = url.pathname.match(/^\/p\/([a-z0-9-]+)\/([a-z0-9_-]+)$/i);
    if (m && (request.method === "GET" || request.method === "POST")) {
      const product = BY_SLUG[m[1].toLowerCase()];
      if (!product) {
        return json({ error: "unknown product", slug: m[1], known: PRODUCTS.map((p) => p.slug) }, 404);
      }
      return proxy(product, m[2], request, env);
    }

    return json({ error: "not found", hint: "GET /  GET /openapi.json  POST /p/{product}/{op}  POST /mcp" }, 404);
  },
};

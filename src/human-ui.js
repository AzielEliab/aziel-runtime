/**
 * Human workspace UI — dual-surface (agents MCP + humans Worker UI).
 * Same FragGate door as POST /v1/fraggate/call / MCP fraggate_call.
 * Addresses audit F04 (HTML headers) and F06–F08 (task-first, labels, live mesh).
 * Does not add, remove, or rename MCP tools.
 * Author: Aziel Eliab only.
 */

import { LIVE_OPS } from "./fraggate/registry.js";
import {
  AUTHOR_ALTERNATE_NAME,
  AUTHOR_NAME,
  DONATE_CANONICAL,
  DONATE_FOOTER_RUNTIME,
  PRODUCT_NAME,
} from "./seo.js";
import { brandRow, ecosystemBlockHtml, headMeta } from "./seo-html.js";

export const WORKSPACE_PAGE_TITLE = `Workspace — ${PRODUCT_NAME}`;
export const WORKSPACE_PAGE_DESCRIPTION =
  "Human workspace for Aziel Runtime: FragGate list → describe → call, labeled Softwares tasks, live mesh counts, optional session strip. Same door as MCP. Identity Aziel Eliab only.";

const CALL_TIMEOUT_MS = 20000;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Browser hardening for HTML responses. No OAuth invented. */
export function browserSecurityHeaders() {
  return {
    "Content-Security-Policy":
      "default-src 'none'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
}

/**
 * Parse a labeled payload field. Empty → {}. Valid JSON → object.
 * Invalid JSON is an error — never silently coerced to {q,text}.
 */
export function parseHumanPayload(raw) {
  const text = String(raw == null ? "" : raw).trim();
  if (!text) return { ok: true, value: {} };
  try {
    const value = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "Payload JSON must be an object (not an array or scalar).", raw: text };
    }
    return { ok: true, value };
  } catch (err) {
    return {
      ok: false,
      error: "Invalid JSON — not sent. " + String(err && err.message ? err.message : err),
      raw: text,
    };
  }
}

export function hasLiveDoor(slug) {
  const ops = LIVE_OPS[slug];
  return Array.isArray(ops) && ops.length > 0;
}

export const HUMAN_TASKS = Object.freeze([
  {
    slug: "decisiongate",
    name: "DecisionGATE",
    op: "check",
    title: "Check a proposal",
    blurb: "Five sequential gates. Not a court, not a truth score.",
    fields: [
      {
        name: "statement",
        label: "Proposal statement",
        type: "textarea",
        example: "Release the catalog Worker this week so agents share one FragGate door.",
      },
      { name: "evidence", label: "Evidence (one fact per line)", type: "textarea", example: "OpenAPI 3.1 combined spec.", list: true },
      { name: "impact_pos", label: "Positive impact (one per line)", type: "textarea", example: "One URL for GPT Actions.", list: true },
      { name: "impact_neg", label: "Negative impact (one per line)", type: "textarea", example: "A vague draft takes longer.", list: true },
      { name: "values", label: "Values (one per line)", type: "textarea", example: "Clarity without force", list: true },
      { name: "accountable", label: "Accountable owner", type: "text", example: "Aziel Eliab" },
    ],
  },
  {
    slug: "foldlock",
    name: "FoldLock",
    op: "fold-preview",
    title: "Fold text (preview)",
    blurb: "Tether-word suppression on small UTF-8. Not zip. This runs fold-preview — it does not copy an install command.",
    fields: [{ name: "text", label: "Text to fold", type: "textarea", example: "the cat and the dog" }],
  },
  {
    slug: "azbrowser",
    name: "AZBrowser",
    op: "ethical_search",
    title: "Lamb Lens search",
    blurb: "Advisory citations from a sealed index. visited=false. Not retrieved article evidence. Not Chromium.",
    fields: [{ name: "q", label: "Search query", type: "text", example: "medieval manuscripts" }],
    result_note: "advisory",
  },
  {
    slug: "forgereceipts",
    name: "ForgeReceipts",
    op: "receipt",
    title: "Mint a local receipt",
    blurb: "Not legal advice. Does not contact courts. Hosted never stores files.",
    fields: [
      { name: "summary", label: "Receipt note / summary", type: "textarea", example: "filed locally" },
      { name: "evidence", label: "Evidence string", type: "text", example: "sha256:demo" },
    ],
  },
  {
    slug: "godlock",
    name: "GodLock",
    op: "score",
    title: "Score text (ABAD)",
    blurb: "Offline hardening score. Not a VPN and not an anonymity network.",
    fields: [{ name: "text", label: "Text to score", type: "textarea", example: "ABAD does not layer on phi." }],
  },
  {
    slug: "temporallock",
    name: "TemporalLock",
    op: "genesis",
    title: "Start a receipt chain",
    blurb: "First receipt of a client-held chain. Hosted does not store.",
    fields: [
      { name: "summary", label: "Summary", type: "textarea", example: "sky was overcast" },
      { name: "evidence", label: "Evidence", type: "text", example: "photo:./sky.jpg" },
      { name: "confidence", label: "Confidence (0–1)", type: "text", example: "0.9" },
    ],
  },
]);

export const HUMAN_UI_CSS = `
  .skip-workspace{position:absolute;left:-999px;top:auto;width:1px;height:1px;overflow:hidden}
  .skip-workspace:focus{position:static;width:auto;height:auto;padding:.35rem .7rem;background:#241c0d;color:#f0d78c}
  .human-nav{display:flex;flex-wrap:wrap;gap:.45rem .75rem;margin:0 0 1.1rem;padding:.55rem .7rem;border:1px solid #3d3420;border-radius:10px;background:#16120a}
  .human-nav a{color:#f0d78c;font-weight:600;text-decoration:none}
  .human-nav a:hover,.human-nav a:focus{text-decoration:underline}
  .workspace{border:1px solid #5c4a1a;background:#14110a;border-radius:12px;padding:1rem 1.1rem 1.2rem;margin:0 0 1.5rem}
  .workspace h2{margin-top:0}
  .workspace .hint{color:#c9bfa0;font-size:.92rem;margin:.2rem 0 .85rem}
  .ws-filter{margin:0 0 1rem}
  .ws-grid{display:grid;gap:1rem}
  @media (min-width:52rem){ .ws-grid.tasks{grid-template-columns:1fr 1fr} }
  .task{border:1px solid #2a3140;border-radius:10px;padding:.85rem .95rem;background:#151922}
  .task h3{margin:.1rem 0 .25rem;font-size:1.05rem}
  .task .blurb{color:#9aa3b2;font-size:.9rem;margin:0 0 .65rem}
  .field{display:flex;flex-direction:column;gap:.25rem;margin:0 0 .65rem}
  .field label{font-weight:600;font-size:.88rem;color:#e6d19a}
  .field input,.field select,.field textarea{width:100%;background:#0e1014;color:#e8eaef;border:1px solid #2a3140;border-radius:8px;padding:.45rem .55rem;font:inherit;box-sizing:border-box}
  .field textarea{min-height:4.2rem;font:.82rem/1.4 ui-monospace,monospace}
  .field input,.field select{font-size:.95rem}
  .actions{display:flex;flex-wrap:wrap;gap:.4rem;margin:.35rem 0}
  .actions button,.fg-ops button{background:#241c0d;color:#f0d78c;border:1px solid #5c4a1a;border-radius:8px;padding:.4rem .75rem;cursor:pointer;font:inherit;font-size:.85rem}
  .actions button:hover,.fg-ops button:hover{background:#33280f}
  .actions button:disabled,.fg-ops button:disabled{opacity:.55;cursor:wait}
  .fg-out,.ws-out{margin:.55rem 0 0;max-height:18rem;overflow:auto;background:#0e1014;padding:.7rem .8rem;border-radius:8px;font-size:.8rem;white-space:pre-wrap;word-break:break-word}
  .ws-out[data-kind="error"]{border:1px solid #6b2a2a;color:#f3c0c0}
  .ws-status{color:#9aa3b2;font-size:.88rem;margin:.25rem 0 .5rem}
  .ws-status[data-state="loading"]{color:#e6d19a}
  .docs-after{margin:1.6rem 0 .4rem;padding-top:1rem;border-top:1px solid #2a3140;color:#9aa3b2}
  .fg-door .field{margin:.55rem 0}
  .copy-install{font-size:.85rem}
  .task-hidden{display:none}
  .receipt-row{margin:.45rem 0 0}
  .receipt-row a,.receipt-row button{font-size:.85rem}
`;

function fieldHtml(task, field, idx) {
  const id = `task-${task.slug}-${field.name}-${idx}`;
  const example = field.example == null ? "" : String(field.example);
  const control =
    field.type === "textarea"
      ? `<textarea id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" data-list="${field.list ? "1" : ""}">${escapeHtml(example)}</textarea>`
      : field.type === "select"
        ? `<select id="${escapeHtml(id)}" name="${escapeHtml(field.name)}">${(field.options || [])
            .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
            .join("")}</select>`
        : `<input id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" type="${escapeHtml(field.type || "text")}" value="${escapeHtml(example)}" autocomplete="off">`;
  return `<div class="field">
    <label for="${escapeHtml(id)}">${escapeHtml(field.label)}</label>
    ${control}
  </div>`;
}

function taskCardHtml(task) {
  const fields = (task.fields || []).map((f, i) => fieldHtml(task, f, i)).join("\n");
  return `<article class="task az-task" id="task-${escapeHtml(task.slug)}" data-slug="${escapeHtml(task.slug)}" data-op="${escapeHtml(task.op)}" data-kind="fraggate">
  <h3>${escapeHtml(task.name)} — ${escapeHtml(task.title)}</h3>
  <p class="blurb">${escapeHtml(task.blurb)}</p>
  ${fields}
  <div class="actions">
    <button type="button" class="run-task" data-op="${escapeHtml(task.op)}">Run ${escapeHtml(task.op)}</button>
  </div>
  <pre class="ws-out fg-out" role="status" aria-live="polite">Ready. Same door: POST /v1/fraggate/call { slug: "${escapeHtml(task.slug)}", op: "${escapeHtml(task.op)}" }</pre>
</article>`;
}

function productOptions(products) {
  return (products || [])
    .map((p) => `<option value="${escapeHtml(p.slug)}">${escapeHtml(p.name)}</option>`)
    .join("");
}

export function workspacePaneHtml(origin, products) {
  const base = String(origin || "").replace(/\/$/, "");
  const tasks = HUMAN_TASKS.map(taskCardHtml).join("\n");
  const slugs = productOptions(products);
  return `<section class="workspace" id="workspace" aria-labelledby="workspace-title">
  <h2 id="workspace-title">What do you want to do?</h2>
  <p class="hint">Human workspace first. Same FragGate door as MCP <code>fraggate_call</code> / <code>POST ${escapeHtml(base)}/v1/fraggate/call</code>. Architecture, cite, and version history stay below. Identity ${escapeHtml(AUTHOR_NAME)} only.</p>
  <div class="ws-filter field">
    <label for="task-filter">Search tasks</label>
    <input id="task-filter" type="search" placeholder="decisiongate, fold, mesh…" autocomplete="off">
  </div>

  <section class="task" id="fg-console" data-kind="console" data-origin="${escapeHtml(base)}">
    <h3>FragGate console</h3>
    <p class="blurb">List → describe → call. THE single public executable door. Refuse codes stay visible.</p>
    <div class="actions">
      <button type="button" data-console="list">List names</button>
    </div>
    <div class="field">
      <label for="fg-name">Name / slug</label>
      <input id="fg-name" name="name" type="text" value="decisiongate" autocomplete="off" spellcheck="false">
    </div>
    <div class="actions">
      <button type="button" data-console="describe">Describe</button>
    </div>
    <div class="field">
      <label for="fg-op">Operation</label>
      <input id="fg-op" name="op" type="text" value="health" autocomplete="off" spellcheck="false">
    </div>
    <div class="field">
      <label for="fg-payload-console">Payload JSON</label>
      <textarea id="fg-payload-console" class="fg-payload" name="payload">{}</textarea>
    </div>
    <div class="actions">
      <button type="button" data-console="call">Run call</button>
    </div>
    <pre class="ws-out fg-out" id="fg-console-out" role="status" aria-live="polite">GET ${escapeHtml(base)}/v1/fraggate/list → describe → POST /v1/fraggate/call</pre>
  </section>

  <h3 id="tasks">Primary tasks</h3>
  <p class="hint">Labeled fields. Bad JSON is shown as an error — it is not rewritten to <code>{q,text}</code>.</p>
  <div class="ws-grid tasks">
    ${tasks}

    <article class="task az-task" id="task-chainlock" data-kind="chainlock" data-origin="${escapeHtml(base)}">
      <h3>ChainLock — tip / verify</h3>
      <p class="blurb">LIVE fabric (CL-WP-0.4), not a Softwares-tab product and not a FragGate catalog slug. Uses existing MCP <code>chainlock_tip</code> / <code>chainlock_verify</code> on this Worker — inventory unchanged.</p>
      <div class="field">
        <label for="cl-chain">Chain name (c)</label>
        <input id="cl-chain" name="c" type="text" value="evidence" autocomplete="off" spellcheck="false">
      </div>
      <div class="actions">
        <button type="button" data-cl="tip">Read tip</button>
        <button type="button" data-cl="verify">Verify</button>
      </div>
      <pre class="ws-out fg-out" role="status" aria-live="polite">Fabric tools. Not a second FragGate slug.</pre>
    </article>
  </div>

  <section class="task" id="mesh-panel" data-kind="mesh" data-origin="${escapeHtml(base)}">
    <h3>Mesh status</h3>
    <p class="blurb">Live / locked / isolated from <code>GET /v1/mesh</code>. GET never enables radios. Join needs a catalog product. Presence TTL is 5 minutes.</p>
    <p class="ws-status" id="mesh-status-line" data-state="loading" role="status" aria-live="polite">Loading status</p>
    <pre class="ws-out fg-out" id="mesh-out" role="status" aria-live="polite">Loading status…</pre>
    <div class="field">
      <label for="mesh-product">Product slug (required to join)</label>
      <input id="mesh-product" name="product" type="text" list="mesh-product-list" placeholder="foldlock" autocomplete="off" spellcheck="false">
      <datalist id="mesh-product-list">${slugs}</datalist>
    </div>
    <div class="field">
      <label for="mesh-node">Node id (optional; 8–80 chars [a-z0-9._-])</label>
      <input id="mesh-node" name="node_id" type="text" placeholder="leave blank to mint" autocomplete="off" spellcheck="false">
    </div>
    <div class="field">
      <label for="mesh-presence">Presence</label>
      <select id="mesh-presence" name="presence">
        <option value="live" selected>live</option>
        <option value="locked">locked</option>
        <option value="isolated">isolated</option>
      </select>
    </div>
    <p class="hint">Join is first presence. Heartbeat refreshes the 5-minute TTL. MESH-OFF means radios are not LIVE — GET will not turn them on. AnonBroadcast is not a product.</p>
    <div class="actions">
      <button type="button" data-mesh="status">Refresh status</button>
      <button type="button" data-mesh="join">Join (product required)</button>
    </div>
  </section>

  <details class="task" id="session-strip">
    <summary><strong>Session strip (advanced)</strong> — open / policy / exec / receipt / close</summary>
    <p class="blurb">Optional. Public FragGate call stays open — the tasks above do not need a session. When <code>REQUIRE_TOKEN=1</code>, mutate needs a header-only operator token (<code>Authorization: Bearer</code> or <code>X-Aziel-Runtime-Token</code>). Never put the token in the query string or JSON body.</p>
    <p class="ws-status" id="session-gate" data-state="loading">Loading token-gate status…</p>
    <div class="field">
      <label for="sess-token">Operator token (header only)</label>
      <input id="sess-token" name="token" type="password" autocomplete="off" placeholder="leave empty if the public session gate is open">
    </div>
    <div class="field">
      <label for="sess-id">Session id</label>
      <input id="sess-id" name="session_id" type="text" placeholder="filled after open" autocomplete="off" spellcheck="false">
    </div>
    <div class="field">
      <label for="sess-policy">Policy JSON</label>
      <textarea id="sess-policy" name="policy">{}</textarea>
    </div>
    <div class="field">
      <label for="sess-slug">Exec slug</label>
      <input id="sess-slug" name="slug" type="text" value="decisiongate" autocomplete="off">
    </div>
    <div class="field">
      <label for="sess-op">Exec op</label>
      <input id="sess-op" name="op" type="text" value="health" autocomplete="off">
    </div>
    <div class="field">
      <label for="sess-payload">Exec payload JSON</label>
      <textarea id="sess-payload" name="payload">{}</textarea>
    </div>
    <div class="actions">
      <button type="button" data-sess="open">Open</button>
      <button type="button" data-sess="policy">Policy</button>
      <button type="button" data-sess="exec">Exec</button>
      <button type="button" data-sess="receipt">Receipt</button>
      <button type="button" data-sess="close">Close</button>
    </div>
    <pre class="ws-out fg-out" id="sess-out" role="status" aria-live="polite">Advanced session. Prefer FragGate for everyday tasks.</pre>
  </details>
</section>`;
}

export function humanNavHtml(origin, { current } = {}) {
  const base = String(origin || "").replace(/\/$/, "");
  const ws = current === "workspace" ? `${base}/workspace#workspace` : "#workspace";
  const home = `${base}/`;
  return `<a class="skip-workspace" href="${current === "workspace" ? "#workspace" : "#workspace"}">Skip to workspace</a>
<nav class="human-nav" aria-label="Human workspace">
  <a href="${escapeHtml(ws)}">Workspace</a>
  <a href="${current === "workspace" ? "#fg-console" : "#fg-console"}">FragGate console</a>
  <a href="${current === "workspace" ? "#tasks" : "#tasks"}">Tasks</a>
  <a href="${current === "workspace" ? "#mesh-panel" : "#mesh-panel"}">Mesh</a>
  <a href="${current === "workspace" ? "#session-strip" : "#session-strip"}">Session</a>
  <a href="${escapeHtml(home)}#cite">Cite / docs</a>
  <a href="${escapeHtml(base)}/v1/software">Softwares</a>
</nav>`;
}

export function workspacePageHtml(origin, products, css) {
  const base = String(origin || "").replace(/\/$/, "");
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: WORKSPACE_PAGE_TITLE,
    description: WORKSPACE_PAGE_DESCRIPTION,
    url: `${base}/workspace`,
    author: { name: AUTHOR_NAME },
  });
  return `<!doctype html>
<html lang="en">
<head>
${headMeta(origin, WORKSPACE_PAGE_TITLE, WORKSPACE_PAGE_DESCRIPTION, "/workspace")}
<script type="application/ld+json">${ld}</script>
<style>${css}${HUMAN_UI_CSS}</style>
</head>
<body>
${brandRow()}
${humanNavHtml(origin, { current: "workspace" })}
  <h1>${escapeHtml(PRODUCT_NAME)} workspace</h1>
  <p class="lead">Human pane. ${escapeHtml(WORKSPACE_PAGE_DESCRIPTION)}</p>
  <p class="hint">Author: <strong>${escapeHtml(AUTHOR_NAME)}</strong> (also known as ${escapeHtml(AUTHOR_ALTERNATE_NAME)}). Crawler abstract and machine surfaces stay on <a href="${escapeHtml(base)}/">the homepage</a>.</p>
${workspacePaneHtml(origin, products)}
  <p class="docs-after"><a href="${escapeHtml(base)}/">${escapeHtml(PRODUCT_NAME)} docs / Softwares / cite</a> · <a href="${escapeHtml(base)}/about">About</a></p>
${ecosystemBlockHtml()}
  <footer class="donate"><p><a href="${DONATE_CANONICAL}">${escapeHtml(DONATE_FOOTER_RUNTIME)}</a></p></footer>
${humanDoorScript()}
</body>
</html>`;
}

export function fragGateDoorHtml(p, origin) {
  if (!p || !hasLiveDoor(p.slug)) return "";
  const live = (LIVE_OPS[p.slug] || [])
    .filter((op) => op !== "health" && op !== "skill");
  const buttons = [...live, "health", "skill"]
    .filter((op, i, all) => all.indexOf(op) === i)
    .map((op) => `<button type="button" data-op="${escapeHtml(op)}">${escapeHtml(op)}</button>`)
    .join("");
  const example = JSON.stringify(p.example || {}, null, 2);
  const areaId = `fg-payload-${p.slug}`;
  return `<div class="fg-door" data-slug="${escapeHtml(p.slug)}" data-origin="${escapeHtml(origin)}" data-kind="door">
  <p>FragGate only — same LIVE_OPS as MCP <code>fraggate_call</code> / <code>POST /v1/fraggate/call</code>. One backend, two surfaces.</p>
  <div class="fg-ops">${buttons}</div>
  <div class="field">
    <label for="${escapeHtml(areaId)}">Payload JSON for ${escapeHtml(p.name)}</label>
    <textarea id="${escapeHtml(areaId)}" class="fg-payload" name="payload">${escapeHtml(example)}</textarea>
  </div>
  <pre class="fg-out ws-out" role="status" aria-live="polite">POST ${escapeHtml(origin)}/v1/fraggate/call
{ "slug": "${escapeHtml(p.slug)}", "op": "${escapeHtml(live[0] || "health")}", "payload": ${example} }</pre>
</div>`;
}

export function catalogFilterScript() {
  return `<script>
(function () {
  let input = document.getElementById("software-filter");
  let lane = document.getElementById("software-lane");
  let items = document.querySelectorAll("[data-software-row]");
  if (!input && !lane) return;
  function apply() {
    let q = String(input && input.value || "").toLowerCase().trim();
    let want = String(lane && lane.value || "all");
    items.forEach(function (li) {
      let hay = String(li.getAttribute("data-search") || "");
      let bucket = String(li.getAttribute("data-bucket") || "");
      let okQ = !q || hay.indexOf(q) !== -1;
      let okL = want === "all" || bucket === want;
      li.classList.toggle("task-hidden", !(okQ && okL));
    });
  }
  if (input) input.addEventListener("input", apply);
  if (lane) lane.addEventListener("change", apply);
})();
</script>`;
}

export function humanDoorScript() {
  return `<script>
(function () {
  let TIMEOUT_MS = ${CALL_TIMEOUT_MS};
  function parsePayload(raw) {
    let text = String(raw == null ? "" : raw).trim();
    if (!text) return { ok: true, value: {} };
    try {
      let value = JSON.parse(text);
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return { ok: false, error: "Payload JSON must be an object (not an array or scalar)." };
      }
      return { ok: true, value: value };
    } catch (err) {
      return { ok: false, error: "Invalid JSON — not sent. " + String(err && err.message ? err.message : err) };
    }
  }
  function show(out, text, kind) {
    if (!out) return;
    out.textContent = text;
    if (kind) out.setAttribute("data-kind", kind);
    else out.removeAttribute("data-kind");
  }
  function linesToList(raw) {
    return String(raw || "").split(/\\n|;/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function collectFields(box) {
    let payload = {};
    box.querySelectorAll("[name]").forEach(function (el) {
      if (el.closest("#fg-console") && box.id !== "fg-console") return;
      let name = el.getAttribute("name");
      if (!name || name === "token") return;
      if (el.getAttribute("data-list") === "1") payload[name] = linesToList(el.value);
      else if (name === "confidence") {
        let n = Number(el.value);
        payload[name] = Number.isFinite(n) ? n : el.value;
      } else payload[name] = el.value;
    });
    return payload;
  }
  function formatBody(res, body) {
    let title = body && body.display && body.display.title ? body.display.title : "";
    let summary = body && body.display && body.display.summary ? body.display.summary : "";
    let code = (body && (body.code || body.refuse || (body.error && body.error.code))) || "";
    let http = res ? ("HTTP " + res.status) : "";
    let head = [http, code, title].filter(Boolean).join(" · ");
    let note = "";
    if (body && (body.visited === false || body.advisory === true || (body.note && /advisory|visited=false|sealed index/i.test(String(body.note))))) {
      note = "Advisory citations / metadata — not retrieved article evidence.\\n";
    }
    return (head ? head + "\\n" : "") + note + (summary ? summary + "\\n\\n" : "") + JSON.stringify(body, null, 2);
  }
  function request(url, init, out, btn) {
    let ctrl = new AbortController();
    let timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    if (btn) btn.disabled = true;
    show(out, "calling " + url + " …");
    return fetch(url, Object.assign({ signal: ctrl.signal }, init)).then(function (res) {
      return res.text().then(function (text) {
        let body = text;
        try { body = text ? JSON.parse(text) : {}; } catch (e) { body = { ok: false, error: "Response was not JSON", raw: text, parse_error: String(e && e.message ? e.message : e) }; }
        show(out, formatBody(res, body), res.ok && body && body.ok !== false ? "" : "error");
        return { res: res, body: body };
      });
    }).catch(function (err) {
      let msg = err && err.name === "AbortError" ? "Request timed out after " + TIMEOUT_MS + "ms." : String(err && err.message ? err.message : err);
      show(out, msg, "error");
    }).finally(function () {
      clearTimeout(timer);
      if (btn) btn.disabled = false;
    });
  }
  function fraggateCall(origin, slug, op, payload, out, btn) {
    return request(origin + "/v1/fraggate/call", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ slug: slug, op: op, payload: payload })
    }, out, btn);
  }
  document.querySelectorAll(".fg-door").forEach(function (box) {
    let slug = box.getAttribute("data-slug");
    let origin = box.getAttribute("data-origin") || "";
    let out = box.querySelector(".fg-out");
    let area = box.querySelector(".fg-payload");
    box.querySelectorAll("[data-op]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let parsed = parsePayload(area && area.value);
        if (!parsed.ok) {
          show(out, parsed.error, "error");
          return;
        }
        fraggateCall(origin, slug, btn.getAttribute("data-op"), parsed.value, out, btn);
      });
    });
  });
  let consoleBox = document.getElementById("fg-console");
  if (consoleBox) {
    let origin = consoleBox.getAttribute("data-origin") || "";
    let out = document.getElementById("fg-console-out");
    let nameEl = document.getElementById("fg-name");
    let opEl = document.getElementById("fg-op");
    let payloadEl = document.getElementById("fg-payload-console");
    consoleBox.querySelectorAll("[data-console]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let act = btn.getAttribute("data-console");
        let name = String(nameEl && nameEl.value || "").trim();
        if (act === "list") {
          request(origin + "/v1/fraggate/list", { headers: { accept: "application/json" } }, out, btn);
          return;
        }
        if (act === "describe") {
          if (!name) { show(out, "Name / slug is required.", "error"); return; }
          request(origin + "/v1/fraggate/describe?slug=" + encodeURIComponent(name), { headers: { accept: "application/json" } }, out, btn);
          return;
        }
        let parsed = parsePayload(payloadEl && payloadEl.value);
        if (!parsed.ok) { show(out, parsed.error, "error"); return; }
        let op = String(opEl && opEl.value || "").trim();
        if (!name || !op) { show(out, "Name / slug and operation are required.", "error"); return; }
        fraggateCall(origin, name, op, parsed.value, out, btn);
      });
    });
  }
  document.querySelectorAll(".az-task[data-kind='fraggate']").forEach(function (box) {
    let slug = box.getAttribute("data-slug");
    let origin = (document.getElementById("fg-console") && document.getElementById("fg-console").getAttribute("data-origin")) || "";
    let out = box.querySelector(".ws-out");
    box.querySelectorAll(".run-task").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let payload = collectFields(box);
        fraggateCall(origin, slug, btn.getAttribute("data-op") || box.getAttribute("data-op"), payload, out, btn);
      });
    });
  });
  let cl = document.getElementById("task-chainlock");
  if (cl) {
    let origin = cl.getAttribute("data-origin") || "";
    let out = cl.querySelector(".ws-out");
    let chainEl = document.getElementById("cl-chain");
    cl.querySelectorAll("[data-cl]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let op = btn.getAttribute("data-cl");
        let name = op === "tip" ? "chainlock_tip" : "chainlock_verify";
        request(origin + "/mcp", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: name, arguments: { c: String(chainEl && chainEl.value || "evidence") } } })
        }, out, btn);
      });
    });
  }
  let mesh = document.getElementById("mesh-panel");
  function refreshMesh(btn) {
    if (!mesh) return;
    let origin = mesh.getAttribute("data-origin") || "";
    let out = document.getElementById("mesh-out");
    let line = document.getElementById("mesh-status-line");
    if (line) { line.textContent = "Loading status"; line.setAttribute("data-state", "loading"); }
    request(origin + "/v1/mesh", { headers: { accept: "application/json" } }, out, btn).then(function (got) {
      if (!got || !got.body) return;
      let b = got.body;
      let roll = b.rollup || {};
      let live = roll.live != null ? roll.live : b.live_nodes;
      let locked = roll.locked != null ? roll.locked : b.locked_nodes;
      let isolated = roll.isolated != null ? roll.isolated : b.isolated_nodes;
      let radios = b.radios || (b.enabled ? "on" : "off");
      if (line) {
        line.textContent = "live " + live + " · locked " + locked + " · isolated " + isolated + " · radios " + radios + " · suite-presence " + (b.suite_presence || "on") + " · GET never enables";
        line.setAttribute("data-state", "ready");
      }
    });
  }
  if (mesh) {
    let origin = mesh.getAttribute("data-origin") || "";
    let out = document.getElementById("mesh-out");
    mesh.querySelectorAll("[data-mesh]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let act = btn.getAttribute("data-mesh");
        if (act === "status") { refreshMesh(btn); return; }
        let product = String(document.getElementById("mesh-product").value || "").trim();
        let node_id = String(document.getElementById("mesh-node").value || "").trim();
        let presence = String(document.getElementById("mesh-presence").value || "live");
        if (!product) { show(out, "Product slug is required. MESH-BAD-INPUT if omitted. AnonBroadcast is not a product.", "error"); return; }
        let payload = { product: product, presence: presence };
        if (node_id) payload.node_id = node_id;
        fraggateCall(origin, "mesh", "join", payload, out, btn).then(function () { refreshMesh(); });
      });
    });
    refreshMesh();
  }
  let sessOut = document.getElementById("sess-out");
  let gateLine = document.getElementById("session-gate");
  function tokenHeaders() {
    let headers = { "content-type": "application/json", accept: "application/json" };
    let tok = document.getElementById("sess-token");
    let value = tok && tok.value ? String(tok.value).trim() : "";
    if (value) headers["X-Aziel-Runtime-Token"] = value;
    return headers;
  }
  function loadReady() {
    let origin = (document.getElementById("fg-console") && document.getElementById("fg-console").getAttribute("data-origin")) || "";
    if (!gateLine || !origin) return;
    fetch(origin + "/v1/ready", { headers: { accept: "application/json" } }).then(function (res) { return res.json(); }).then(function (body) {
      let need = body && (body.mutate_requires_token || (body.token && body.token.mutate_requires_token));
      let msg = need
        ? "Session mutate requires a header-only operator token. Public FragGate call stays open."
        : "Session mutate is open on this Worker (no REQUIRE_TOKEN gate). Public FragGate call stays open either way.";
      if (body && body.error) msg = String(body.error) + " — " + (body.hint || "");
      gateLine.textContent = msg;
      gateLine.setAttribute("data-state", "ready");
    }).catch(function () {
      gateLine.textContent = "Could not read /v1/ready. If open/policy/exec returns token_required, send the operator token as a header only.";
      gateLine.setAttribute("data-state", "ready");
    });
  }
  if (document.getElementById("session-strip")) {
    loadReady();
    let origin = (document.getElementById("fg-console") && document.getElementById("fg-console").getAttribute("data-origin")) || "";
    document.querySelectorAll("[data-sess]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let act = btn.getAttribute("data-sess");
        let idEl = document.getElementById("sess-id");
        let id = String(idEl && idEl.value || "").trim();
        if (act === "open") {
          request(origin + "/v1/session/open", { method: "POST", headers: tokenHeaders(), body: "{}" }, sessOut, btn).then(function (got) {
            let sid = got && got.body && got.body.session && got.body.session.id;
            if (sid && idEl) idEl.value = sid;
          });
          return;
        }
        if (!id) { show(sessOut, "Open a session first (session id required).", "error"); return; }
        if (act === "receipt") {
          request(origin + "/v1/session/" + encodeURIComponent(id) + "/receipt", { headers: tokenHeaders() }, sessOut, btn);
          return;
        }
        if (act === "close") {
          request(origin + "/v1/session/" + encodeURIComponent(id) + "/close", { method: "POST", headers: tokenHeaders(), body: "{}" }, sessOut, btn);
          return;
        }
        if (act === "policy") {
          let policy = parsePayload(document.getElementById("sess-policy").value);
          if (!policy.ok) { show(sessOut, policy.error, "error"); return; }
          request(origin + "/v1/session/" + encodeURIComponent(id) + "/policy", { method: "POST", headers: tokenHeaders(), body: JSON.stringify(policy.value) }, sessOut, btn);
          return;
        }
        let parsed = parsePayload(document.getElementById("sess-payload").value);
        if (!parsed.ok) { show(sessOut, parsed.error, "error"); return; }
        request(origin + "/v1/session/" + encodeURIComponent(id) + "/exec", {
          method: "POST",
          headers: tokenHeaders(),
          body: JSON.stringify({
            slug: document.getElementById("sess-slug").value,
            op: document.getElementById("sess-op").value,
            payload: parsed.value
          })
        }, sessOut, btn);
      });
    });
  }
  let filter = document.getElementById("task-filter");
  if (filter) {
    filter.addEventListener("input", function () {
      let q = String(filter.value || "").toLowerCase().trim();
      document.querySelectorAll("#workspace .task, #workspace .az-task").forEach(function (el) {
        if (el.id === "workspace") return;
        let hay = (el.textContent || "").toLowerCase();
        el.classList.toggle("task-hidden", !!(q && hay.indexOf(q) === -1));
      });
    });
  }
})();
</script>`;
}

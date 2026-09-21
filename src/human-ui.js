/**
 * Human workspace UI — dual-surface (agents MCP + humans Worker UI).
 * Same FragGate door as POST /v1/fraggate/call / MCP fraggate_call.
 * Addresses audit F06–F08 (task-first, labels, live mesh).
 * HTML security headers live in security-headers.js (F03–F05 / #111).
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
import { aboutAzielStripHtml, workerLaunchHtml } from "./about-aziel.js";
import { launchHashtagChipsHtml } from "./launch-parts.js";
import { brandRow, ecosystemBlockHtml, headMeta } from "./seo-html.js";
import { suiteDownloadHref } from "./human-hrefs.js";
import { suiteDownloadHtml } from "./suite-pack.js";

export const WORKSPACE_PAGE_TITLE = `Workspace — ${PRODUCT_NAME}`;
export const WORKSPACE_PAGE_DESCRIPTION =
  "Human workspace for Aziel Runtime: operator control panel, dashboard (Softwares grid + live mesh + receipts), and FragGate list → describe → call. Same door as MCP. Identity Aziel Eliab only.";

const CALL_TIMEOUT_MS = 20000;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    slug: "aznet",
    name: "AZNet",
    op: "pair_status",
    title: "Pair status",
    blurb: "Functional-order pair with AZBrowser (order/token). Hash continuity / side-net. Pairing ≠ tunnel. Public VPN auto-binds AZVPN. Products stay separate.",
    fields: [
      { name: "pair_token", label: "Pair token (optional; min 8 chars)", type: "text", example: "aznet-azbrowser-pair" },
      { name: "pair_flag", label: "Pair flag (must be azbrowser)", type: "text", example: "azbrowser" },
    ],
  },
  {
    slug: "azvpn",
    name: "AZVPN",
    op: "describe",
    title: "Describe concentrator",
    blurb: "Automatic public VPN backend. HTTPS/WS REAL. WireGuard/OpenVPN SLOT. Callers do not name software=azvpn on auto paths.",
    fields: [{ name: "kind", label: "Kind (https_ws)", type: "text", example: "https_ws" }],
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
  {
    slug: "azmail",
    name: "AZMail",
    op: "airlock_classify",
    title: "Airlock classify",
    blurb: "Advisory APP 1.0 airlock. Not an MTA. SMTP / deanonymize stay stub. Mesh default off.",
    fields: [{ name: "text", label: "Text to classify", type: "textarea", example: "hello from the anonymous ring" }],
  },
  {
    slug: "azhub",
    name: "AZHub",
    op: "region_list",
    title: "List Blank Key regions",
    blurb: "Neutral spatial container. Does not interpret meaning. Auto-unlock / completeness stay refused.",
    fields: [{ name: "region", label: "Region filter (optional)", type: "text", example: "core" }],
  },
  {
    slug: "azinterface",
    name: "AZInterface",
    op: "genesis_status",
    title: "Genesis status",
    blurb: "Custodial page cycles: OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. Sibling of AZHub. Same door.",
    fields: [{ name: "cycle", label: "Cycle (optional)", type: "text", example: "OFF" }],
  },
  {
    slug: "aziel-corpus",
    name: "Aziel Digital Library",
    op: "search",
    title: "Search the public corpus",
    blurb: "Published MASTER cites. Not a 26-card index. Not AKM belief. Not ChainLock.",
    fields: [{ name: "q", label: "Search query", type: "text", example: "Florence" }],
  },
  {
    slug: "4dmap",
    name: "4DMap",
    op: "pin",
    title: "Pin a declared mark",
    blurb: "Inspection frame T/Δ/Γ/Π after AZPIPE. Not a sequential gate. Not a truth score. Not a Lumen panel.",
    fields: [{ name: "label", label: "Declared mark label", type: "text", example: "inspect-1" }],
  },
  {
    slug: "embryolock",
    name: "EmbryoLock",
    op: "limitation",
    title: "Cite limitations",
    blurb: "Live-with-local-destructive-boundary. Wipe / scorch / unlock stay FG-STUB on the public mesh. Not an unlock.",
    fields: [
      {
        name: "digest",
        label: "Digest (optional; used by verify_hash)",
        type: "text",
        example: "fa2e7203bd3924170e94c62357e29764b925a82c2cf708807128bd096333250d",
      },
    ],
  },
  {
    slug: "peacelock",
    name: "PeaceLock",
    op: "open",
    title: "Open a lattice",
    blurb: "Chosen silence or chosen inaction. Transcript / counterfactual / motive stay ABSENT. HARD_DUTY refuses.",
    fields: [
      { name: "scope", label: "Scope", type: "text", example: "silence" },
      { name: "subject", label: "Subject", type: "text", example: "chamber-1" },
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
  .suite-dl{border:1px solid #7a6224;background:#1f1a0d;border-radius:10px;padding:.7rem .85rem;margin:.55rem 0 1rem}
  .suite-dl .hint{margin:0 0 .45rem}
  .suite-dl-btn{display:inline-block;background:#241c0d;color:#f0d78c;border:1px solid #5c4a1a;border-radius:8px;padding:.45rem .85rem;font-weight:700;text-decoration:none}
  .suite-dl-btn:hover,.suite-dl-btn:focus{background:#33280f;text-decoration:underline}
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
  .op-panel{border:1px solid #7a6224;background:#1a160c;border-radius:12px;padding:.85rem .95rem 1rem;margin:0 0 1.15rem}
  .op-panel h3{margin:.05rem 0 .35rem}
  .op-rack{display:flex;flex-direction:column;gap:.65rem}
  .op-row{display:grid;gap:.45rem .55rem;align-items:end;border:1px solid #3d3420;border-radius:10px;padding:.55rem .65rem;background:#14110a}
  @media (min-width:56rem){
    .op-row.fg{grid-template-columns:minmax(7rem,1fr) minmax(6rem,.8fr) minmax(8rem,1.4fr) auto}
    .op-row.mesh{grid-template-columns:auto auto auto minmax(7rem,1fr) auto auto}
    .op-row.sess{grid-template-columns:minmax(8rem,1fr) minmax(8rem,1fr) auto}
  }
  .op-row .field{margin:0}
  .op-soft{display:flex;flex-wrap:wrap;gap:.35rem}
  .metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem;margin:0 0 1rem}
  @media (min-width:40rem){ .metric-grid{grid-template-columns:repeat(4,minmax(0,1fr))} }
  .metric{border:1px solid #2a3140;border-radius:10px;padding:.7rem .8rem;background:#151922}
  .metric .label{display:block;color:#9aa3b2;font-size:.78rem;letter-spacing:.03em;text-transform:uppercase}
  .metric .value{display:block;font-size:1.45rem;font-weight:700;color:#f0d78c;margin:.15rem 0 0}
  .dash{margin:1.2rem 0 0}
  .sw-grid{display:grid;gap:.7rem;margin:.5rem 0 1rem}
  @media (min-width:40rem){ .sw-grid{grid-template-columns:1fr 1fr} }
  @media (min-width:64rem){ .sw-grid{grid-template-columns:1fr 1fr 1fr} }
  .dash-card{border:1px solid #2a3140;border-radius:10px;padding:.7rem .8rem;background:#151922}
  .dash-card h4{margin:.05rem 0 .25rem;font-size:.98rem}
  .dash-card .blurb{min-height:2.4rem}
  .receipt-board{border:1px solid #2a3140;border-radius:10px;padding:.75rem .85rem;background:#12151c}
  .receipt-log{list-style:none;margin:.4rem 0 0;padding:0}
  .receipt-log li{border-top:1px solid #2a3140;padding:.45rem 0;font-size:.88rem}
  .op-out{max-height:12rem}
  .launch-chips{margin:.35rem 0 .2rem;display:flex;flex-wrap:wrap;gap:.3rem .55rem}
  .launch-chips .hashtag{color:#d4af37;font-size:.82rem;font-weight:600}
  .about-aziel-strip{margin:.2rem 0 .7rem;padding:.45rem .6rem;border:1px solid #3d3420;border-radius:8px;background:#16120a;color:#e6d19a;font-size:.88rem}
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
  const chips = launchHashtagChipsHtml({
    slug: task.slug,
    name: task.name,
    oneLine: task.blurb,
    ops: [{ op: task.op, summary: task.title }],
  });
  return `<article class="task az-task" id="task-${escapeHtml(task.slug)}" data-slug="${escapeHtml(task.slug)}" data-op="${escapeHtml(task.op)}" data-kind="fraggate">
  <h3>${escapeHtml(task.name)} — ${escapeHtml(task.title)}</h3>
  <p class="blurb">${escapeHtml(task.blurb)}</p>
  ${chips}
  ${fields}
  <div class="actions">
    <button type="button" class="run-task" data-op="${escapeHtml(task.op)}">Run ${escapeHtml(doorOpLabel(task.slug, task.op))}</button>
    ${task.slug === "aznet" ? `<button type="button" class="run-task" data-op="pair">pair</button>` : ""}
    ${task.slug === "embryolock" ? `<button type="button" class="run-task" data-op="doctor">doctor</button><button type="button" class="run-task" data-op="verify_hash">verify_hash</button>` : ""}
  </div>
  <pre class="ws-out fg-out" role="status" aria-live="polite">Ready. Same door: POST /v1/fraggate/call { slug: "${escapeHtml(task.slug)}", op: "${escapeHtml(task.op)}" }</pre>
</article>`;
}

function productOptions(products) {
  return (products || [])
    .map((p) => `<option value="${escapeHtml(p.slug)}">${escapeHtml(p.name)}</option>`)
    .join("");
}

function primaryOpFor(slug) {
  const task = HUMAN_TASKS.find((t) => t.slug === slug);
  if (task) return task.op;
  const ops = LIVE_OPS[slug] || [];
  return ops.find((op) => op !== "health" && op !== "skill") || ops[0] || "health";
}

function doorOpLabel(slug, op) {
  if (slug === "aznet" && op === "pair_status") return "Pair status";
  if (slug === "aznet" && op === "pair") return "pair";
  return op;
}

function dashCardHtml(p, origin) {
  const base = String(origin || "").replace(/\/$/, "");
  const live = hasLiveDoor(p.slug);
  const op = primaryOpFor(p.slug);
  const task = HUMAN_TASKS.find((t) => t.slug === p.slug);
  let door = live
    ? `<button type="button" class="dash-run" data-slug="${escapeHtml(p.slug)}" data-op="${escapeHtml(op)}">Run ${escapeHtml(doorOpLabel(p.slug, op))}</button>`
    : `<span class="slug">local only — no public FragGate door</span>`;
  if (p.slug === "aznet" && live) {
    door = `<button type="button" class="dash-run" data-slug="aznet" data-op="pair_status">Pair status</button>
    <button type="button" class="dash-run" data-slug="aznet" data-op="pair">pair</button>`;
  }
  const pairCite =
    p.slug === "azbrowser"
      ? `<p class="hint">pairs with AZNet (order/token) — separate software; not a VPN; pairing ≠ tunnel</p>`
      : p.slug === "aznet"
        ? `<p class="hint">pairs with AZBrowser (order/token) — hash continuity / side-net; pairing ≠ tunnel</p>`
        : "";
  const fields = task
    ? `<a href="#task-${escapeHtml(p.slug)}">Labeled fields</a>`
    : `<a href="${escapeHtml(base)}/p/${escapeHtml(p.slug)}">Product card</a>`;
  const hay = `${p.name} ${p.slug} ${p.oneLine || ""} pair aznet azbrowser`.toLowerCase();
  return `<article class="dash-card" data-dash-slug="${escapeHtml(p.slug)}" data-search="${escapeHtml(hay)}">
  <h4><a href="${escapeHtml(base)}/p/${escapeHtml(p.slug)}">${escapeHtml(p.name)}</a> <span class="slug">${escapeHtml(p.slug)}</span></h4>
  <p class="blurb">${escapeHtml(p.oneLine || "")}</p>
  ${launchHashtagChipsHtml(p)}
  ${pairCite}
  <div class="actions">${door} ${fields} <a href="${escapeHtml(base)}/mcp">Connect AI</a></div>
</article>`;
}

function operatorSoftButtons() {
  return HUMAN_TASKS.map((t) => {
    const label = t.slug === "aznet" ? "AZNet Pair status" : `${t.name} ${t.op}`;
    return `<button type="button" data-op-soft="${escapeHtml(t.slug)}" data-op="${escapeHtml(t.op)}">${escapeHtml(label)}</button>`;
  }).join("\n      ");
}

export function workspacePaneHtml(origin, products) {
  const base = String(origin || "").replace(/\/$/, "");
  const tasks = HUMAN_TASKS.map(taskCardHtml).join("\n");
  const slugs = productOptions(products);
  const dashCards = (products || []).map((p) => dashCardHtml(p, base)).join("\n");
  return `<section class="workspace" id="workspace" aria-labelledby="workspace-title">
  <h2 id="workspace-title">What do you want to do?</h2>
  <p class="hint">Human workspace first. Operator control panel + dashboard below. Same FragGate door as MCP <code>fraggate_call</code> / <code>POST ${escapeHtml(base)}/v1/fraggate/call</code>. Architecture, cite, and version history stay below. Identity ${escapeHtml(AUTHOR_NAME)} only.</p>
  <div class="ws-filter field">
    <label for="task-filter">Search tasks</label>
    <input id="task-filter" type="search" placeholder="decisiongate, fold, mesh…" autocomplete="off">
  </div>

  <section class="op-panel" id="op-panel" data-origin="${escapeHtml(base)}" aria-labelledby="op-panel-title">
    <h3 id="op-panel-title">Operator control panel</h3>
    ${aboutAzielStripHtml({ id: "about-aziel-strip-op" })}
    <p class="blurb">Off-the-shelf rack. FragGate call, Softwares ops, mesh, session. Same door — not a second exec path.</p>
    ${suiteDownloadHtml(base, { id: "suite-download-op" })}
    <div class="op-rack">
      <div class="op-row fg">
        <div class="field">
          <label for="op-fg-name">Name / slug</label>
          <input id="op-fg-name" name="op_name" type="text" value="decisiongate" autocomplete="off" spellcheck="false">
        </div>
        <div class="field">
          <label for="op-fg-op">Operation</label>
          <input id="op-fg-op" name="op_op" type="text" value="health" autocomplete="off" spellcheck="false">
        </div>
        <div class="field">
          <label for="op-fg-payload">Payload JSON</label>
          <textarea id="op-fg-payload" name="op_payload">{}</textarea>
        </div>
        <div class="actions">
          <button type="button" data-op-console="list">List</button>
          <button type="button" data-op-console="describe">Describe</button>
          <button type="button" data-op-console="call">Call</button>
        </div>
      </div>
      <div class="op-row">
        <p class="hint" style="margin:0">Softwares ops (labeled primary verbs)</p>
        <div class="op-soft">
      ${operatorSoftButtons()}
        </div>
      </div>
      <div class="op-row pair" id="op-aznet-pair">
        <p class="hint" style="margin:0">AZNet ↔ AZBrowser functional-order pair (order/token — hash continuity / side-net). Pairing ≠ tunnel. Public VPN auto-binds AZVPN.</p>
        <div class="actions">
          <button type="button" data-op-pair="pair_status">Pair status</button>
          <button type="button" data-op-pair="pair">pair</button>
        </div>
      </div>
      <div class="op-row mesh">
        <p class="ws-status" id="op-mesh-line" data-state="loading">Loading status</p>
        <div class="field">
          <label for="op-mesh-product">Product slug</label>
          <input id="op-mesh-product" name="op_product" type="text" list="mesh-product-list" placeholder="foldlock" autocomplete="off" spellcheck="false">
        </div>
        <div class="actions">
          <button type="button" data-op-mesh="status">Refresh mesh</button>
          <button type="button" data-op-mesh="nodes">Nodes</button>
          <button type="button" data-op-mesh="join">Join</button>
          <button type="button" data-op-mesh="heartbeat">Heartbeat</button>
          <button type="button" data-op-mesh="leave">Leave</button>
          <button type="button" data-op-mesh="vpn">VPN cite</button>
          <button type="button" data-op-mesh="enable">Enable extra bearer</button>
        </div>
      </div>
      <div class="op-row sess">
        <div class="field">
          <label for="op-sess-token">Operator token (header only)</label>
          <input id="op-sess-token" name="op_token" type="password" autocomplete="off" placeholder="empty if public session is open">
        </div>
        <div class="field">
          <label for="op-sess-id">Session id</label>
          <input id="op-sess-id" name="op_session_id" type="text" placeholder="filled after open" autocomplete="off" spellcheck="false">
        </div>
        <div class="actions">
          <button type="button" data-op-sess="open">Open</button>
          <button type="button" data-op-sess="receipt">Receipt</button>
          <button type="button" data-op-sess="close">Close</button>
        </div>
      </div>
    </div>
    <pre class="ws-out fg-out op-out" id="op-panel-out" role="status" aria-live="polite">Operator rack ready. FragGate list → describe → call.</pre>
  </section>

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
    <p class="blurb"><strong>Nodes</strong> from <code>nodes</code> / <code>rollup.nodes</code> count human mesh users plus cited human uses (<code>human_uses</code> / USES). <strong>Live Nodes</strong> from <code>live_nodes</code> / <code>rollup.mesh</code> count human mesh users plus concurrent website viewers (<code>site_live_viewers</code>) on godlock.uk + azieleliab.com + azielcorpuslibrary.net. <code>software_nodes</code> is the <code>{slug}-worker</code> roster. hedidntjump.com, bots, Softwares, and downloads are excluded. GET never pulls hub /count and never enables radios. Incomplete uses stay honest (no invented users). Channel plane cites wifi / bluetooth / rf / photon ON (local qnm-node; <code>worker_hardware:false</code> — not live Worker RF). Nine QNM laws stay machine-true on that JSON. Join needs a catalog product. Public VPN auto-binds AZVPN (HTTPS/WS REAL; WireGuard/OpenVPN SLOT).</p>
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
    <p class="hint">Join is first presence. Heartbeat / Leave need a node id. Heartbeat refreshes the 5-minute TTL. MESH-OFF refuses join/heartbeat/broadcast when transmission radios are not LIVE — GET will not turn them on. Channel plane is CITE-only. AnonBroadcast is not a product. VPN cite is FragGate <code>mesh/vpn</code> (AZVPN auto; never fake connected). Extra bearer is rate-limited; GET still never enables.</p>
    <div class="field">
      <label for="mesh-bearer">Extra bearer (optional; GET never enables)</label>
      <input id="mesh-bearer" name="bearer" type="text" value="suite-presence" autocomplete="off" spellcheck="false">
    </div>
    <div class="actions">
      <button type="button" data-mesh="status">Refresh status</button>
      <button type="button" data-mesh="nodes">Nodes</button>
      <button type="button" data-mesh="join">Join (product required)</button>
      <button type="button" data-mesh="heartbeat">Heartbeat</button>
      <button type="button" data-mesh="leave">Leave</button>
      <button type="button" data-mesh="vpn">VPN cite (AZVPN auto)</button>
      <button type="button" data-mesh="enable">Enable extra bearer</button>
    </div>
  </section>

  <section class="dash" id="dashboard" aria-labelledby="dashboard-title">
    <h3 id="dashboard-title">Dashboard</h3>
    ${aboutAzielStripHtml({ id: "about-aziel-strip" })}
    <p class="hint">Browseable Softwares + live mesh counts + receipts. Metrics come from <code>GET /v1/mesh</code> and <code>GET /v1/receipts</code>. GET never enables radios. Each card has slug-specific <code>#hashtag</code> parts — not one identical blob. Channel plane (wifi / bluetooth / rf / photon) is a cite — live hardware is local qnm-node. Public VPN auto-binds AZVPN (HTTPS/WS; GET cites only).</p>
    <div class="metric-grid" id="dash-metrics">
      <div class="metric" title="Nodes: human mesh users plus cited human uses (USES)."><span class="label">Nodes</span><span class="value" id="metric-nodes">—</span></div>
      <div class="metric" title="Live Nodes: human mesh users plus concurrent website viewers (site_live_viewers)."><span class="label">Live Nodes</span><span class="value" id="metric-live">—</span></div>
      <div class="metric" title="Inactive (locked) mesh nodes."><span class="label">Inactive</span><span class="value" id="metric-locked">—</span></div>
      <div class="metric" title="Isolated mesh nodes. Isolated humans stay on isolated_nodes."><span class="label">Isolated</span><span class="value" id="metric-isolated">—</span></div>
      <div class="metric" title="Softwares product Workers ({slug}-worker)."><span class="label">Software</span><span class="value" id="metric-software">—</span></div>
      <div class="metric"><span class="label">Radios</span><span class="value" id="metric-radios">—</span></div>
      <div class="metric"><span class="label">VPN</span><span class="value" id="metric-vpn">—</span></div>
      <div class="metric"><span class="label">Hardware</span><span class="value" id="metric-hardware">—</span></div>
    </div>
    ${suiteDownloadHtml(base, { id: "suite-download-dash" })}
    <h3 id="dash-softwares-title">Softwares</h3>
    <div class="field">
      <label for="dash-filter">Search Softwares</label>
      <input id="dash-filter" type="search" placeholder="foldlock, receipt, browser…" autocomplete="off">
    </div>
    <div class="sw-grid" id="dash-softwares">
${dashCards}
    </div>
    <pre class="ws-out fg-out" id="dash-out" role="status" aria-live="polite">Pick a Software card. FragGate only.</pre>
    <div class="receipt-board" id="dash-receipts">
      <h3>Receipts</h3>
      <p class="blurb">ACT-RECEIPT-1.0 cite from <code>GET /v1/receipts</code>. Public chain lives on the corpus. Fail-open is append-skip without a token. Empty or dark public tip is SLOT, not success. Local mints from this pane are listed below — hosted never stores files.</p>
      <p class="ws-status" id="receipt-cite-line" data-state="loading">Loading receipts cite…</p>
      <pre class="ws-out fg-out" id="receipt-cite-out" role="status">GET ${escapeHtml(base)}/v1/receipts</pre>
      <div class="actions">
        <button type="button" id="receipt-refresh">Refresh receipts cite</button>
      </div>
      <ol class="receipt-log" id="dash-receipt-log"></ol>
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
  <a href="#op-panel">Control panel</a>
  <a href="${current === "workspace" ? "#fg-console" : "#fg-console"}">FragGate console</a>
  <a href="${current === "workspace" ? "#tasks" : "#tasks"}">Tasks</a>
  <a href="#dashboard">Dashboard</a>
  <a href="${current === "workspace" ? "#mesh-panel" : "#mesh-panel"}">Mesh</a>
  <a href="${current === "workspace" ? "#session-strip" : "#session-strip"}">Session</a>
  <a href="${escapeHtml(suiteDownloadHref(base))}" download="aziel-runtime-suite.json">Download suite</a>
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
${workerLaunchHtml(origin, { slug: "aziel-runtime", name: "Aziel Runtime" })}
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
  const extras = p.slug === "aznet" && !live.includes("pair") ? ["pair"] : [];
  const buttons = [...live, ...extras, "health", "skill"]
    .filter((op, i, all) => all.indexOf(op) === i)
    .map((op) => `<button type="button" data-op="${escapeHtml(op)}">${escapeHtml(doorOpLabel(p.slug, op))}</button>`)
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
      if (el.closest("#op-panel") && box.id !== "op-panel") return;
      if (el.closest("#dashboard") && box.id !== "dashboard") return;
      let name = el.getAttribute("name");
      if (!name || name === "token" || name === "op_token") return;
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
  document.querySelectorAll(".fg-door:not(#fold-pack-verify)").forEach(function (box) {
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
        fraggateCall(origin, slug, btn.getAttribute("data-op") || box.getAttribute("data-op"), payload, out, btn).then(function (got) {
          if (slug === "forgereceipts") rememberReceipt("forgereceipts", got && got.body);
        });
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
    let opLine = document.getElementById("op-mesh-line");
    if (opLine) { opLine.textContent = "Loading status"; opLine.setAttribute("data-state", "loading"); }
    request(origin + "/v1/mesh", { headers: { accept: "application/json" } }, out, btn).then(function (got) {
      if (!got || !got.body) return;
      let b = got.body;
      let roll = b.rollup || {};
      let humans = b.human_mesh_users != null ? b.human_mesh_users : (b.human_live_nodes != null ? b.human_live_nodes : 0);
      let humanUses = b.human_uses != null ? b.human_uses : 0;
      let siteViewers = b.site_live_viewers != null ? b.site_live_viewers : 0;
      let live = b.live_nodes != null ? b.live_nodes : (roll.mesh != null ? roll.mesh : humans + siteViewers);
      let nodesCount = typeof b.nodes === "number" ? b.nodes : (typeof roll.nodes === "number" ? roll.nodes : humans + humanUses);
      let locked = b.inactive_nodes != null ? b.inactive_nodes : (b.locked_nodes != null ? b.locked_nodes : roll.locked);
      let isolated = b.isolated_nodes != null ? b.isolated_nodes : roll.isolated;
      let software = b.software_nodes != null ? b.software_nodes : (roll.software && (roll.software.live + roll.software.locked + roll.software.isolated));
      let radios = b.radios || (b.enabled ? "on" : "off");
      let ch = b.channel_plane || b.channels || {};
      let channelsOn = (ch.wifi || b.wifi) === "on" && (ch.bluetooth || b.bluetooth) === "on" && (ch.rf || b.rf) === "on" && (ch.photon || b.photon) === "on";
      let text = "Nodes " + nodesCount + " · Live Nodes " + live + " (human mesh users " + humans + " + site viewers " + siteViewers + ") · software_nodes " + software + " · inactive " + locked + " · isolated " + isolated + " · radios " + radios + " · suite-presence " + (b.suite_presence || "on") + " · GET never enables";
      if (channelsOn) text += " · channels wifi/bt/rf/photon cite-on";
      if (b.vpn === true) text += " · public VPN AZVPN auto";
      else if (b.vpn === false) text += " · vpn false";
      if (b.worker_hardware === false || (b.channel_plane && b.channel_plane.worker_hardware === false)) text += " · worker_hardware false";
      if (b.nine_laws && b.nine_laws.hard_true === true) text += " · nine laws hard-true";
      if (line) {
        line.textContent = text;
        line.setAttribute("data-state", "ready");
      }
      if (opLine) {
        opLine.textContent = text;
        opLine.setAttribute("data-state", "ready");
      }
      let setMetric = function (id, value) {
        let el = document.getElementById(id);
        if (el) el.textContent = value == null ? "—" : String(value);
      };
      setMetric("metric-nodes", nodesCount);
      setMetric("metric-live", live);
      setMetric("metric-locked", locked);
      setMetric("metric-isolated", isolated);
      setMetric("metric-software", software);
      setMetric("metric-radios", radios);
      setMetric("metric-vpn", b.vpn === true ? "AZVPN auto" : (b.vpn === false ? "false" : "—"));
      let hw = b.worker_hardware;
      if (hw == null && b.channel_plane) hw = b.channel_plane.worker_hardware;
      setMetric("metric-hardware", hw === false ? "cite only" : (hw == null ? "—" : String(hw)));
    });
  }
  if (mesh) {
    let origin = mesh.getAttribute("data-origin") || "";
    let out = document.getElementById("mesh-out");
    mesh.querySelectorAll("[data-mesh]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let act = btn.getAttribute("data-mesh");
        if (act === "status") { refreshMesh(btn); return; }
        if (act === "nodes") {
          request(origin + "/v1/mesh/nodes", { headers: { accept: "application/json" } }, out, btn);
          return;
        }
        if (act === "vpn") {
          fraggateCall(origin, "mesh", "vpn", {}, out, btn);
          return;
        }
        if (act === "enable") {
          let bearer = String(document.getElementById("mesh-bearer") && document.getElementById("mesh-bearer").value || "").trim();
          if (!bearer) { show(out, "Bearer is required (MESH-NEED-BEARER). GET never enables.", "error"); return; }
          fraggateCall(origin, "mesh", "enable", { bearer: bearer }, out, btn);
          return;
        }
        let product = String(document.getElementById("mesh-product").value || "").trim();
        let node_id = String(document.getElementById("mesh-node").value || "").trim();
        let presence = String(document.getElementById("mesh-presence").value || "live");
        if (act === "heartbeat" || act === "leave") {
          if (!node_id) { show(out, "Node id is required for heartbeat / leave.", "error"); return; }
          let payload = act === "leave" ? { node_id: node_id } : { node_id: node_id, presence: presence };
          fraggateCall(origin, "mesh", act, payload, out, btn).then(function () { refreshMesh(); });
          return;
        }
        if (!product) { show(out, "Product slug is required. MESH-BAD-INPUT if omitted. AnonBroadcast is not a product.", "error"); return; }
        let payload = { product: product, presence: presence, kind: "human", bearer: "human" };
        if (node_id) payload.node_id = node_id;
        fraggateCall(origin, "mesh", "join", payload, out, btn).then(function () { refreshMesh(); });
      });
    });
    refreshMesh();
  }
  let opPanel = document.getElementById("op-panel");
  if (opPanel) {
    let origin = opPanel.getAttribute("data-origin") || "";
    let out = document.getElementById("op-panel-out");
    opPanel.querySelectorAll("[data-op-console]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let act = btn.getAttribute("data-op-console");
        let name = String(document.getElementById("op-fg-name") && document.getElementById("op-fg-name").value || "").trim();
        if (act === "list") {
          request(origin + "/v1/fraggate/list", { headers: { accept: "application/json" } }, out, btn);
          return;
        }
        if (act === "describe") {
          if (!name) { show(out, "Name / slug is required.", "error"); return; }
          request(origin + "/v1/fraggate/describe?slug=" + encodeURIComponent(name), { headers: { accept: "application/json" } }, out, btn);
          return;
        }
        let parsed = parsePayload(document.getElementById("op-fg-payload") && document.getElementById("op-fg-payload").value);
        if (!parsed.ok) { show(out, parsed.error, "error"); return; }
        let op = String(document.getElementById("op-fg-op") && document.getElementById("op-fg-op").value || "").trim();
        if (!name || !op) { show(out, "Name / slug and operation are required.", "error"); return; }
        fraggateCall(origin, name, op, parsed.value, out, btn);
      });
    });
    opPanel.querySelectorAll("[data-op-soft]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let slug = btn.getAttribute("data-op-soft");
        let card = document.getElementById("task-" + slug);
        if (card) {
          card.scrollIntoView({ block: "nearest" });
          let run = card.querySelector(".run-task");
          if (run) run.click();
          return;
        }
        fraggateCall(origin, slug, btn.getAttribute("data-op") || "health", {}, out, btn);
      });
    });
    opPanel.querySelectorAll("[data-op-pair]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let op = btn.getAttribute("data-op-pair") || "pair_status";
        let task = document.getElementById("task-aznet");
        let payload = {};
        if (task) {
          task.querySelectorAll("[name]").forEach(function (el) {
            let key = el.getAttribute("name");
            if (!key) return;
            payload[key] = el.value;
          });
        }
        fraggateCall(origin, "aznet", op, payload, out, btn);
      });
    });
    opPanel.querySelectorAll("[data-op-mesh]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let act = btn.getAttribute("data-op-mesh");
        if (act === "status") { refreshMesh(btn); return; }
        if (act === "nodes") {
          request(origin + "/v1/mesh/nodes", { headers: { accept: "application/json" } }, out, btn);
          return;
        }
        if (act === "vpn") {
          fraggateCall(origin, "mesh", "vpn", {}, out, btn);
          return;
        }
        if (act === "enable") {
          let bearer = String(document.getElementById("mesh-bearer") && document.getElementById("mesh-bearer").value || "").trim();
          if (!bearer) { show(out, "Bearer is required (MESH-NEED-BEARER). GET never enables.", "error"); return; }
          fraggateCall(origin, "mesh", "enable", { bearer: bearer }, out, btn);
          return;
        }
        let product = String(document.getElementById("op-mesh-product") && document.getElementById("op-mesh-product").value || "").trim();
        let nodeEl = document.getElementById("mesh-node");
        let node_id = String(nodeEl && nodeEl.value || "").trim();
        if (act === "heartbeat" || act === "leave") {
          if (!node_id) { show(out, "Node id is required for heartbeat / leave (use the mesh panel field).", "error"); return; }
          let payload = act === "leave" ? { node_id: node_id } : { node_id: node_id, presence: "live" };
          fraggateCall(origin, "mesh", act, payload, out, btn).then(function () { refreshMesh(); });
          return;
        }
        if (!product) { show(out, "Product slug is required. MESH-BAD-INPUT if omitted. AnonBroadcast is not a product.", "error"); return; }
        let meshProduct = document.getElementById("mesh-product");
        if (meshProduct) meshProduct.value = product;
        fraggateCall(origin, "mesh", "join", { product: product, presence: "live", kind: "human", bearer: "human" }, out, btn).then(function () { refreshMesh(); });
      });
    });
  }
  let sessOut = document.getElementById("sess-out");
  let gateLine = document.getElementById("session-gate");
  function tokenHeaders() {
    let headers = { "content-type": "application/json", accept: "application/json" };
    let tok = document.getElementById("sess-token") || document.getElementById("op-sess-token");
    let alt = document.getElementById("op-sess-token");
    let value = tok && tok.value ? String(tok.value).trim() : "";
    if (!value && alt && alt.value) value = String(alt.value).trim();
    if (value) headers["X-Aziel-Runtime-Token"] = value;
    return headers;
  }
  function syncSessionId(sid) {
    let a = document.getElementById("sess-id");
    let b = document.getElementById("op-sess-id");
    if (sid && a) a.value = sid;
    if (sid && b) b.value = sid;
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
            syncSessionId(sid);
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
  let opSessOut = document.getElementById("op-panel-out") || sessOut;
  document.querySelectorAll("[data-op-sess]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      let origin = (document.getElementById("op-panel") && document.getElementById("op-panel").getAttribute("data-origin")) || "";
      let act = btn.getAttribute("data-op-sess");
      let idEl = document.getElementById("op-sess-id") || document.getElementById("sess-id");
      let id = String(idEl && idEl.value || "").trim();
      if (act === "open") {
        request(origin + "/v1/session/open", { method: "POST", headers: tokenHeaders(), body: "{}" }, opSessOut, btn).then(function (got) {
          let sid = got && got.body && got.body.session && got.body.session.id;
          syncSessionId(sid);
        });
        return;
      }
      if (!id) { show(opSessOut, "Open a session first (session id required).", "error"); return; }
      if (act === "receipt") {
        request(origin + "/v1/session/" + encodeURIComponent(id) + "/receipt", { headers: tokenHeaders() }, opSessOut, btn).then(function (got) {
          rememberReceipt("session", got && got.body);
        });
        return;
      }
      if (act === "close") {
        request(origin + "/v1/session/" + encodeURIComponent(id) + "/close", { method: "POST", headers: tokenHeaders(), body: "{}" }, opSessOut, btn);
      }
    });
  });
  let dashOut = document.getElementById("dash-out");
  document.querySelectorAll(".dash-run").forEach(function (btn) {
    btn.addEventListener("click", function () {
      let origin = (document.getElementById("fg-console") && document.getElementById("fg-console").getAttribute("data-origin")) || "";
      let slug = btn.getAttribute("data-slug");
      let op = btn.getAttribute("data-op") || "health";
      if (slug === "aznet" && (op === "pair_status" || op === "pair")) {
        let pairTask = document.getElementById("task-aznet");
        let payload = {};
        if (pairTask) {
          pairTask.querySelectorAll("[name]").forEach(function (el) {
            let key = el.getAttribute("name");
            if (!key) return;
            payload[key] = el.value;
          });
        }
        fraggateCall(origin, "aznet", op, payload, dashOut, btn);
        return;
      }
      let task = document.getElementById("task-" + slug);
      if (task && task.querySelector(".run-task")) {
        task.scrollIntoView({ block: "nearest" });
        task.querySelector(".run-task").click();
        return;
      }
      fraggateCall(origin, slug, op, {}, dashOut, btn).then(function (got) {
        if (slug === "forgereceipts") rememberReceipt("forgereceipts", got && got.body);
      });
    });
  });
  function rememberReceipt(kind, body) {
    let log = document.getElementById("dash-receipt-log");
    if (!log || !body) return;
    let hash = (body.hash || (body.result && body.result.hash) || (body.receipt && body.receipt.hash) || "").toString();
    let code = body.code || (body.result && body.result.code) || "";
    let li = document.createElement("li");
    li.textContent = new Date().toISOString() + " · " + kind + (code ? " · " + code : "") + (hash ? " · " + hash.slice(0, 16) : " · local mint (hosted does not store)");
    log.insertBefore(li, log.firstChild);
  }
  function loadReceipts(btn) {
    let origin = (document.getElementById("fg-console") && document.getElementById("fg-console").getAttribute("data-origin")) || "";
    let line = document.getElementById("receipt-cite-line");
    let out = document.getElementById("receipt-cite-out");
    if (line) { line.textContent = "Loading receipts cite…"; line.setAttribute("data-state", "loading"); }
    request(origin + "/v1/receipts", { headers: { accept: "application/json" } }, out, btn).then(function (got) {
      if (!got || !got.body) return;
      let b = got.body;
      let spec = b.spec || (b.cite && b.cite.spec) || "ACT-RECEIPT-1.0";
      let chain = b.public_chain || b.path || "/v1/receipts";
      if (line) {
        line.textContent = spec + " · " + chain + (b.fail_open || (b.note && /fail-open/i.test(String(b.note))) ? " · fail-open" : "") + " · not a Softwares-tab product";
        line.setAttribute("data-state", "ready");
      }
    });
  }
  let receiptBtn = document.getElementById("receipt-refresh");
  if (receiptBtn) receiptBtn.addEventListener("click", function () { loadReceipts(receiptBtn); });
  if (document.getElementById("dash-receipts")) loadReceipts();
  let filter = document.getElementById("task-filter");
  if (filter) {
    filter.addEventListener("input", function () {
      let q = String(filter.value || "").toLowerCase().trim();
      document.querySelectorAll("#workspace .task, #workspace .az-task, #workspace .op-panel").forEach(function (el) {
        if (el.id === "workspace") return;
        let hay = (el.textContent || "").toLowerCase();
        el.classList.toggle("task-hidden", !!(q && hay.indexOf(q) === -1));
      });
    });
  }
  let dashFilter = document.getElementById("dash-filter");
  if (dashFilter) {
    dashFilter.addEventListener("input", function () {
      let q = String(dashFilter.value || "").toLowerCase().trim();
      document.querySelectorAll("[data-dash-slug]").forEach(function (el) {
        let hay = String(el.getAttribute("data-search") || el.textContent || "").toLowerCase();
        el.classList.toggle("task-hidden", !!(q && hay.indexOf(q) === -1));
      });
    });
  }
})();
</script>`;
}

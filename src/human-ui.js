/**
 * Human workspace UI — dual-surface (agents MCP + humans Worker UI).
 * Same FragGate door as POST /v1/fraggate/call / MCP fraggate_call.
 * Addresses audit F06–F08 (task-first, labels, live mesh).
 * HTML security headers live in security-headers.js (F03–F05 / #111).
 * Does not add, remove, or rename MCP tools.
 * Author: Aziel Eliab only.
 */

import { LIVE_OPS, STUB_OPS } from "./fraggate/registry.js";
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
import { softwareOneLine } from "./software-copy.js";
import { UI_DOMAIN_DEFAULT, UI_DOMAINS, uiDomainForSlug } from "./ui-domains.js";

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
    blurb: "Suite shell for Softwares on this computer. Custodial page cycles: OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. Sibling of AZHub. Same door.",
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
  .domain-tabs{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:.4rem;margin:0 0 .65rem;padding:.55rem .7rem;border:1px solid #3d3420;border-radius:10px;background:#16120a}
  .domain-tabs button{background:#241c0d;color:#f0d78c;border:1px solid #5c4a1a;border-radius:8px;padding:.4rem .75rem;cursor:pointer;font:inherit;font-size:.85rem;font-weight:600;white-space:nowrap}
  .domain-tabs button:hover,.domain-tabs button:focus{background:#33280f}
  .domain-tabs button[aria-selected="true"]{background:#33280f;box-shadow:0 0 0 1px #d4af37}
  .dash-card.domain-off{display:none}
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
  .fg-ops button.fg-stub:disabled{opacity:.85;cursor:not-allowed;background:#12100c;color:#9aa3b2;border-color:#3d3420}
  .fg-ops button.fg-stub:disabled:hover{background:#12100c}
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
  .desk-fields{display:grid;gap:.65rem}
  @media (min-width:40rem){ .desk-fields{grid-template-columns:1fr 1fr} }
  .desk-fields .field{margin:0}
  .receipt-board{border:1px solid #2a3140;border-radius:10px;padding:.75rem .85rem;background:#12151c}
  .receipt-log{list-style:none;margin:.4rem 0 0;padding:0}
  .receipt-log li{border-top:1px solid #2a3140;padding:.45rem 0;font-size:.88rem}
  .op-out{max-height:12rem}
  .launch-chips{margin:.35rem 0 .2rem;display:flex;flex-wrap:wrap;gap:.3rem .55rem}
  .launch-chips .hashtag{color:#d4af37;font-size:.82rem;font-weight:600}
  .about-aziel-strip{margin:.2rem 0 .7rem;padding:.45rem .6rem;border:1px solid #3d3420;border-radius:8px;background:#16120a;color:#e6d19a;font-size:.88rem}
  .first-hour{border:1px solid #7a6224;background:#1a160c;border-radius:12px;padding:.75rem .9rem;margin:0 0 1rem}
  .first-hour h3{margin:.05rem 0 .35rem}
  .first-hour-steps{margin:.2rem 0 .55rem;padding-left:1.2rem;color:#e6d19a}
  .first-hour-steps li{margin:.28rem 0}
  .first-hour button{background:#241c0d;color:#f0d78c;border:1px solid #5c4a1a;border-radius:8px;padding:.35rem .7rem;cursor:pointer;font:inherit;font-size:.85rem}
  .first-hour button:hover,.first-hour button:focus{background:#33280f}
  .first-hour-tour{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.2rem 0 0}
  #first-hour-caption{flex-basis:100%;margin:.35rem 0 0;color:#c9bfa0;font-size:.9rem}
  .first-hour-mark{outline:2px solid #d4af37;outline-offset:3px;border-radius:8px}
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

function aiPeerDeskHtml(p, origin) {
  const base = String(origin || "").replace(/\/$/, "");
  const hay = `${p.name} ${p.slug} worker learner intake plan handoff`.toLowerCase();
  const shell = (id, role, inner) => `<article class="dash-card domain-off" id="${id}" data-desk="${escapeHtml(p.slug)}" data-dash-slug="${escapeHtml(p.slug)}" data-domain="ai" data-role="${role}" data-origin="${escapeHtml(base)}" data-search="${escapeHtml(hay)}">
  ${inner}
</article>`;
  if (p.slug === "azbot") {
    return shell(
      "desk-azbot",
      "worker",
      `<h4><a href="${escapeHtml(base)}/p/azbot">AZBot</a> <span class="slug">worker</span></h4>
  <p class="blurb">Worker peer. Task intake, a Software plan, status, and handoff. A plan does not run, merge, or deploy. Seal needs the confirm box. A live step then goes through FragGate. Public receipt append stays on that confirm path.</p>
  <div class="field">
    <label for="bot-task">Task</label>
    <textarea id="bot-task" placeholder="fold this note"></textarea>
  </div>
  <div class="field">
    <label for="bot-handoff">Handoff slug</label>
    <input id="bot-handoff" type="text" placeholder="foldlock" autocomplete="off" spellcheck="false">
  </div>
  <div class="field">
    <label for="bot-confirm"><input id="bot-confirm" type="checkbox"> Confirm seal (required before a planned step is dispatched)</label>
  </div>
  <div class="actions">
    <button type="button" data-bot="intake">Intake</button>
    <button type="button" data-bot="plan">Plan</button>
    <button type="button" data-bot="status">Status</button>
    <button type="button" data-bot="handoff">Handoff</button>
    <button type="button" data-bot="seal">Seal</button>
  </div>
  <pre class="ws-out fg-out" id="azbot-out" role="status" aria-live="polite">Worker desk. Nothing has run.</pre>`,
    );
  }
  return shell(
    "desk-azai",
    "learner",
    `<h4><a href="${escapeHtml(base)}/p/azai">AZAI</a> <span class="slug">learner</span></h4>
  <p class="hint" id="azai-coach">What is this desk: AZAI Guide is the other coach. Ask where to click. Learn still needs the confirm box. The note below is the contract.</p>
  <p class="blurb">Learner and guide. Guide runs Lamb Lens first (Service, then Clarity, then Peace), then the public shelf and the Library tab, then any other source. The suite triad scores every candidate from those layers the same way. A shelf hit is not believed. Nothing is believed by default. It does not write memory and does not invent a Softwares row. Adaptive counts are topic and hash totals, not the question, and a suggested path is not believed. Learn still stores cited notes. VibeLock notes keep physics and related signals heuristic, linguistics experimental, and vibration as a measurement only with a body-coupled track. A file name does not decode the file. Raw container bytes are refused. Scores appear only from posted features or an analysis you supply. No accuracy percentage is stored. A live 4DMap read, mesh roster read, or corpus search on Learn runs only when that pull is asked for, and the flag is true only after the read returns. Pin bodies, roster rows, and corpus hit text stay out of the receipt sentence. A memory write needs the confirm box and an operator subject. Belief is not truth.</p>
  <div class="field">
    <label for="ai-guide">Guide question</label>
    <input id="ai-guide" type="text" placeholder="Where do I click to run a card?" autocomplete="off" spellcheck="false">
  </div>
  <label for="ai-guide-dry"><input id="ai-guide-dry" type="checkbox"> dry_run guide (store nothing)</label>
  <label for="ai-guide-adapt"><input id="ai-guide-adapt" type="checkbox"> confirm adaptive count (topic counts only, not the question)</label>
  <div class="actions">
    <button type="button" data-ai="guide">Guide</button>
    <button type="button" data-ai="starter" data-q="Where is Florence?">Library: Florence</button>
    <button type="button" data-ai="starter" data-q="How do I run a Softwares card?">FragGate Run</button>
    <button type="button" data-ai="starter" data-q="Where is the Corpus sub-tab?">Corpus sub-tab</button>
  </div>
  <ul id="azai-next"></ul>
  <div class="field">
    <label for="ai-pin">Pin id (optional, operator supplied)</label>
    <input id="ai-pin" type="text" placeholder="pin-1" autocomplete="off" spellcheck="false">
  </div>
  <div class="field">
    <label for="ai-vibe">VibeLock file name (optional, not opened)</label>
    <input id="ai-vibe" type="text" placeholder="clip.mp4" autocomplete="off" spellcheck="false">
  </div>
  <div class="field">
    <label for="ai-query">Recall query</label>
    <input id="ai-query" type="text" placeholder="foldlock" autocomplete="off" spellcheck="false">
  </div>
  <div class="field">
    <label for="ai-confirm"><input id="ai-confirm" type="checkbox"> Confirm memory write (AKM observe). Local notes still cite sources either way. Guide ignores this box.</label>
  </div>
  <div class="actions">
    <button type="button" data-ai="learn">Learn</button>
    <button type="button" data-ai="recall">Recall</button>
  </div>
  <pre class="ws-out fg-out" id="azai-out" role="status" aria-live="polite">Start with Guide or a starter button. Guide runs Lamb Lens, then the shelf, then the triad. Nothing is believed by default. Learn stores cited notes only after confirm. Nothing stored yet.</pre>`,
  );
}

function dashCardHtml(p, origin) {
  if (p && (p.slug === "azbot" || p.slug === "azai")) return aiPeerDeskHtml(p, origin);
  const base = String(origin || "").replace(/\/$/, "");
  const live = hasLiveDoor(p.slug);
  const op = primaryOpFor(p.slug);
  const task = HUMAN_TASKS.find((t) => t.slug === p.slug);
  let door = p.worker_only
    ? `<span class="slug">worker only — FragGate status none</span>`
    : live
      ? `<button type="button" class="dash-run" data-slug="${escapeHtml(p.slug)}" data-op="${escapeHtml(op)}">Run ${escapeHtml(doorOpLabel(p.slug, op))}</button>`
      : `<span class="slug">local only — no public FragGate door</span>`;
  if (p.slug === "veillock") {
    door += ` <a href="#desk-veillock">Open desk</a>`;
  }
  if (p.slug === "aznet" && live) {
    door = `<button type="button" class="dash-run" data-slug="aznet" data-op="pair_status">Pair status</button>
    <button type="button" class="dash-run" data-slug="aznet" data-op="pair">pair</button>`;
  }
  const pairCite =
    p.slug === "azbrowser"
      ? `<p class="hint">pairs with AZNet (order/token) — separate software; not a VPN; pairing ≠ tunnel</p>`
      : p.slug === "aznet"
        ? `<p class="hint">pairs with AZBrowser (order/token) — hash continuity / side-net; pairing ≠ tunnel</p>`
        : p.slug === "embryolock"
          ? `<p class="hint">Public door is health, policy, and hash cite. wipe, scorch, and unlock stay disabled on this mesh.</p>`
          : p.slug === "azchat"
            ? `<p class="hint">LIVE+bound. Product mesh hop starts off. Suite mesh is a separate surface.</p>`
            : "";
  const fields = task
    ? `<a href="#task-${escapeHtml(p.slug)}">Labeled fields</a>`
    : `<a href="${escapeHtml(base)}/p/${escapeHtml(p.slug)}">Product card</a>`;
  const hay = `${p.name} ${p.slug} ${p.oneLine || ""} pair aznet azbrowser`.toLowerCase();
  const domain = uiDomainForSlug(p.slug) || "catalog";
  const off = domain === UI_DOMAIN_DEFAULT ? "" : " domain-off";
  return `<article class="dash-card${off}" data-dash-slug="${escapeHtml(p.slug)}" data-domain="${escapeHtml(domain)}" data-search="${escapeHtml(hay)}">
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
  const catalog = (products || []).slice();
  if (!catalog.some((p) => p.slug === "whitestone")) {
    catalog.push({
      slug: "whitestone",
      name: "Whitestone",
      oneLine: softwareOneLine("whitestone"),
      worker_only: true,
    });
  }
  const dashCards = catalog.map((p) => dashCardHtml(p, base)).join("\n");
  const veilProduct = (products || []).find((p) => p.slug === "veillock");
  const veilChips = veilProduct ? launchHashtagChipsHtml(veilProduct) : "";
  return `<section class="workspace" id="workspace" aria-labelledby="workspace-title">
  <h2 id="workspace-title">What do you want to do?</h2>
  <p class="hint">Human workspace first. Operator control panel + dashboard below. Same FragGate door as MCP <code>fraggate_call</code> / <code>POST ${escapeHtml(base)}/v1/fraggate/call</code>. Architecture, cite, and version history stay below. Identity ${escapeHtml(AUTHOR_NAME)} only.</p>
  <section class="first-hour" id="first-hour" aria-labelledby="first-hour-title">
    <h3 id="first-hour-title">Start here</h3>
    <p class="hint">Three steps for the first hour. Call the Softwares tool. The door runs first. ChainLock, TemporalLock, and ForgeReceipts stamp when the call needs a ledger. confirm when a call writes, dry_run to preview, background for a long job. The reply says Running until a receipt exists. Tabs, Softwares, receipts, mesh, MCP, and Corpus stay one click away. Nothing below is removed. Corpus is the Elroi sub-tab under Aziel Elroi Eliab, not a top-bar tab. Ask Jeeves and AZAI Guide are the coaches.</p>
    <ol class="first-hour-steps">
      <li><a href="#elroi-jeeves">Ask Jeeves</a> — suite help. Use a suggested question or your own words. Lamb Lens runs first, then the shelf, then the triad.</li>
      <li><button type="button" data-first-hour="ai">Open AZAI Guide</button> — the other coach, on the AI tab. Guide does not write memory. Learn still needs confirm.</li>
      <li><button type="button" data-first-hour="tabs">Show domain tabs</button> — every Software stays on those tabs. Search still lists matches across tabs.</li>
    </ol>
    <div class="first-hour-tour">
      <button type="button" data-tour="start">Show me around</button>
      <button type="button" data-tour="next" hidden>Next</button>
      <button type="button" data-tour="done" hidden>Done</button>
      <p id="first-hour-caption">The tour scrolls and highlights. It does not cover the desks or turn a tab off.</p>
    </div>
  </section>
  <div class="ws-filter field">
    <label for="task-filter">Search tasks</label>
    <input id="task-filter" type="search" placeholder="decisiongate, fold, mesh…" autocomplete="off">
  </div>

  <h3 id="dash-softwares-title">Softwares</h3>
  <p class="hint" id="desk-hint-softwares">What is this desk: the Softwares cards. A domain tab filters the grid. Search shows matches from every tab. Unsure which card? Ask Jeeves or AZAI Guide. The cards stay.</p>
  <div class="field">
    <label for="dash-filter">Search Softwares</label>
    <input id="dash-filter" type="search" placeholder="foldlock, receipt, browser…" autocomplete="off">
  </div>
  <div class="sw-grid" id="dash-softwares" data-active="${escapeHtml(UI_DOMAIN_DEFAULT)}">
${dashCards}
  </div>
  <pre class="ws-out fg-out" id="dash-out" role="status" aria-live="polite">Pick a Software card. FragGate only. New here? Ask Jeeves first. The cards stay.</pre>

  <section class="op-panel" id="op-panel" data-origin="${escapeHtml(base)}" aria-labelledby="op-panel-title">
    <h3 id="op-panel-title">Operator control panel</h3>
    ${aboutAzielStripHtml({ id: "about-aziel-strip-op" })}
    <p class="hint" id="desk-hint-operator">What is this desk: the operator rack. List, describe, call, mesh, and session stay here. Ask Jeeves for the plain version first. This rack stays.</p>
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
    <p class="hint" id="desk-hint-fraggate">What is this desk: list, describe, then call. Everyday questions go to Ask Jeeves. A named slug and op still run here.</p>
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

  <section class="dash" id="interface-panel" data-kind="interface" data-origin="${escapeHtml(base)}">
    <h3>Interface</h3>
    <p class="hint" id="desk-hint-interface">What is this desk: plans, receipts, mesh awareness, Ask Jeeves, and MCP. A plan does not launch. Seal still needs confirm.</p>
    <div class="sw-grid" id="interface-desks">
      <article class="dash-card" id="desk-veillock" data-desk="veillock">
        <h4><a href="${escapeHtml(base)}/p/veillock">VeilLock</a> <span class="slug">veillock</span></h4>
        <p class="blurb">local_only. Public door ops stay empty. Schema <code>veillock-runtime-ui-1</code>. A plan does not launch, join, register a camera, return a key, or lift a veil.</p>
        ${veilChips}
        <p class="banner">Catalog wrap, engulf, join, link, play, and record stay on the local desk. This host does not run them.</p>
        <div class="actions">
          <button type="button" data-if="runtime_ui">Contract</button>
          <button type="button" data-if="status_report">Status</button>
          <button type="button" data-if="join_plan">Join plan</button>
          <button type="button" data-if="engulf_plan">Engulf plan</button>
          <button type="button" data-if="describe">Describe</button>
        </div>
      </article>
      <article class="dash-card" id="desk-mesh" data-desk="mesh">
        <h4>Node mesh <span class="slug">awareness</span></h4>
        <p class="blurb">Same mesh laws as the status panel. This tile does not join, heartbeat, leave, enable radios, or read Live Nodes.</p>
        <div class="actions">
          <button type="button" data-if="mesh_awareness">Mesh awareness</button>
          <a href="#mesh-panel">Mesh status</a>
        </div>
      </article>
      <article class="dash-card" id="desk-forensic" data-desk="forensic">
        <h4>Forensic <span class="slug">ACT-RECEIPT-1.0</span></h4>
        <p class="blurb">Fields stay hash, request, output, and event. Attempt ids stay request_id, attempt_n, parent_receipt_id, and correlation_id. Isolate memory. Not a court filing.</p>
        <div class="actions">
          <button type="button" data-if="forensic_tip">Audit tip</button>
        </div>
      </article>
      <article class="dash-card" id="desk-jeeves-link" data-desk="jeeves">
        <h4>Ask Jeeves <span class="slug">suite help</span></h4>
        <p class="blurb">Help for this build. Corpus op <code>jeeves</code> on the Aziel Corpus card (<code>suite_help</code>, <code>software_tab</code> false). The desk is the Ask Jeeves sub-tab under Aziel Elroi Eliab (alternateName).</p>
        <div class="actions">
          <a href="#elroi-jeeves">Open Ask Jeeves</a>
        </div>
      </article>
      <article class="dash-card" id="desk-mcp" data-desk="mcp">
        <h4>MCP <span class="slug">interface/orchestrate</span></h4>
        <p class="blurb">Agents and this pane share one planner. tools/list stays 36 names. Live dispatch still goes through FragGate.</p>
        <div class="actions">
          <a href="${escapeHtml(base)}/mcp">Connect AI</a>
        </div>
      </article>
    </div>
    <div class="op-rack" id="interface-rack">
      <div class="op-row">
        <p class="hint" style="margin:0">Plan fields. Sent with Join plan, Engulf plan, Status, and Describe. A URL is not fetched and is not stored.</p>
        <div class="desk-fields">
          <div class="field">
            <label for="if-url">Meeting URL (optional, plan only)</label>
            <input id="if-url" type="text" placeholder="https://teams.microsoft.com/..." autocomplete="off" spellcheck="false">
          </div>
          <div class="field">
            <label for="if-app">App name (optional)</label>
            <input id="if-app" type="text" placeholder="zoom" autocomplete="off" spellcheck="false">
          </div>
          <div class="field">
            <label for="if-platform">Platform (optional)</label>
            <input id="if-platform" type="text" placeholder="linux" autocomplete="off" spellcheck="false">
          </div>
        </div>
      </div>
      <div class="op-row">
        <p class="hint" style="margin:0">Seal needs the confirm box. An empty slug seals veillock locally and does not launch. A live slug and op still go through FragGate. Passphrase fields are refused and are not a room-join form.</p>
        <div class="desk-fields">
          <div class="field">
            <label for="if-slug">Door slug (seal dispatch only)</label>
            <input id="if-slug" type="text" placeholder="leave empty for a local seal" autocomplete="off" spellcheck="false">
          </div>
          <div class="field">
            <label for="if-op">Door op (seal dispatch only)</label>
            <input id="if-op" type="text" placeholder="fold-preview" autocomplete="off" spellcheck="false">
          </div>
        </div>
        <div class="field">
          <label for="if-confirm"><input id="if-confirm" type="checkbox"> Confirm seal (required before anything is sealed or dispatched)</label>
        </div>
        <div class="actions">
          <button type="button" data-if="seal">Seal</button>
        </div>
      </div>
    </div>
    <div class="receipt-board" id="interface-receipt">
      <h3>Desk output</h3>
      <p class="blurb">Same status line as the other desks. A plan does not append the public receipt chain.</p>
      <pre class="ws-out fg-out" id="interface-out" role="status" aria-live="polite">GET ${escapeHtml(base)}/v1/interface — plans do not launch. New here? Ask Jeeves. This board stays.</pre>
    </div>
  </section>

  <section class="task" id="mesh-panel" data-kind="mesh" data-origin="${escapeHtml(base)}">
    <h3>Mesh status</h3>
    <p class="hint" id="desk-hint-mesh">What is this desk: who is on the mesh. Refresh reads status. Join needs a product slug. GET does not turn radios on. Ask Jeeves can point here. This panel stays.</p>
    <p class="blurb"><strong>Nodes</strong> from <code>nodes</code> / <code>rollup.nodes</code> count human mesh users plus cited human uses (<code>human_uses</code> / USES). <strong>Live Nodes</strong> from <code>live_nodes</code> / <code>rollup.mesh</code> count human mesh users plus concurrent website viewers (<code>site_live_viewers</code>) on godlock.uk + azieleliab.com + azielcorpuslibrary.net. Paint <code>live_nodes</code> / <code>rollup.mesh</code> only — do not add a local <code>/count</code>. <code>live_nodes_tip</code> is the seal. <code>rollup.live</code> is not published. Never paint <code>software_nodes</code>, <code>rollup.live</code>, <code>rollup.all.live</code>, or <code>rollup.software.live</code> as Live Nodes. <code>software_nodes</code> is the <code>{slug}-worker</code> roster. hedidntjump.com, bots, Softwares, and downloads are excluded. GET never pulls hub /count and never enables radios. Incomplete uses stay honest (no invented users). Channel plane cites wifi / bluetooth / rf / photon ON (local qnm-node; <code>worker_hardware:false</code> — not live Worker RF). Nine QNM laws stay machine-true on that JSON. Join needs a catalog product. Public VPN auto-binds AZVPN (HTTPS/WS REAL; WireGuard/OpenVPN SLOT).</p>
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

  <section class="task" id="sot-desk" data-kind="sot" data-origin="${escapeHtml(base)}">
    <h3>Suite tip sync</h3>
    <p class="blurb">One source of truth: live <code>GET /v1/software</code> for suite version, git sha, Softwares count, and card versions. <code>version_id</code> stays null. Ask Jeeves is not a Softwares card. Sync is a pull plane (<code>POST /v1/mesh/sot-sync</code>), not <code>mesh_broadcast</code>. Outlets are read together. A down site stays on screen as last-known inventory plus an unreachable status, and the other outlets still update. Dry run lists every outlet and the fields that would change. Confirm is consent, not a login. It writes an ACT-RECEIPT and updates <code>last_applied</code> only where the write succeeded.</p>
    <p class="ws-status" id="sot-status-line" data-state="ready" role="status" aria-live="polite">Refresh tip to load the outlet matrix</p>
    <pre class="ws-out fg-out" id="sot-out" role="status" aria-live="polite">GET ${escapeHtml(base)}/v1/mesh/sot</pre>
    <label><input id="sot-confirm" type="checkbox"> confirm apply</label>
    <div class="actions">
      <button type="button" data-sot="status">Refresh tip</button>
      <button type="button" data-sot="outlets">Outlets</button>
      <button type="button" data-sot="dry">Dry run</button>
      <button type="button" data-sot="apply">Apply</button>
    </div>
  </section>
  <script>
  (function () {
    var desk = document.getElementById("sot-desk");
    if (!desk || desk.getAttribute("data-bound") === "1") return;
    desk.setAttribute("data-bound", "1");
    var origin = desk.getAttribute("data-origin") || "";
    var out = document.getElementById("sot-out");
    var line = document.getElementById("sot-status-line");
    var seq = 0;
    var last = null;
    function paint(body, mine) {
      if (mine !== seq) return;
      last = body;
      var sot = body && body.sot ? body.sot : body;
      var version = sot && sot.suite_version != null ? sot.suite_version : "—";
      var sha = sot && sot.git_sha != null ? sot.git_sha : "—";
      var count = sot && sot.softwares_count != null ? sot.softwares_count : "—";
      var outlets = body && body.outlets ? body.outlets : [];
      var bits = { ok: 0, drifted: 0, unreachable: 0, unexposed: 0 };
      outlets.forEach(function (row) {
        if (bits[row.status] != null) bits[row.status] += 1;
      });
      if (line) {
        line.textContent = "SoT " + version + " · sha " + sha + " · Softwares " + count + " · version_id null · ok " + bits.ok + " · drifted " + bits.drifted + " · unreachable " + bits.unreachable + " · unexposed " + bits.unexposed;
        line.setAttribute("data-state", "ready");
      }
      if (out) out.textContent = JSON.stringify(body, null, 2);
    }
    function fail(err, mine) {
      if (mine !== seq) return;
      if (line) {
        line.textContent = "Suite tip unreachable. Last-known rows stay on screen. Nothing was invented.";
        line.setAttribute("data-state", "ready");
      }
      if (out && !last) out.textContent = String(err && err.message ? err.message : err);
    }
    function load(path) {
      var mine = ++seq;
      if (line) { line.textContent = "Loading suite tip. A down site does not stop the others."; line.setAttribute("data-state", "loading"); }
      return fetch(origin + path, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) })
        .then(function (res) { return res.json(); })
        .then(function (body) { paint(body, mine); })
        .catch(function (err) { fail(err, mine); });
    }
    desk.querySelectorAll("[data-sot]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-sot");
        if (act === "status") { load("/v1/mesh/sot"); return; }
        if (act === "outlets") { load("/v1/mesh/outlets"); return; }
        var body = { dry_run: act === "dry" };
        if (act === "apply") {
          var box = document.getElementById("sot-confirm");
          if (!box || !box.checked) {
            if (out) out.textContent = "Apply needs the confirm box. Nothing was sent.";
            return;
          }
          body = { confirm: true };
        }
        var mine = ++seq;
        if (line) { line.textContent = act === "dry" ? "Dry run. Other outlets still update if one site is down." : "Applying. A down site keeps its last-known row."; line.setAttribute("data-state", "loading"); }
        fetch(origin + "/v1/mesh/sot-sync", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(8000)
        }).then(function (res) { return res.json(); }).then(function (payload) { paint(payload, mine); }).catch(function (err) { fail(err, mine); });
      });
    });
  })();
  </script>

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
    <div class="receipt-board" id="dash-receipts">
      <h3>Receipts</h3>
      <p class="hint" id="desk-hint-receipts">What is this desk: the public receipt cite. dry_run stores nothing. A write still needs confirm. Ask Jeeves can explain the fields. This board stays.</p>
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
  const tabs = UI_DOMAINS.map((domain) => {
    const on = domain.id === UI_DOMAIN_DEFAULT;
    const controls = "dash-softwares";
    return `<button type="button" role="tab" id="domain-tab-${escapeHtml(domain.id)}" data-domain-tab="${escapeHtml(domain.id)}" aria-selected="${on ? "true" : "false"}" aria-controls="${controls}">${escapeHtml(domain.label)}</button>`;
  }).join("\n    ");
  return `<a class="skip-workspace" href="${current === "workspace" ? "#workspace" : "#workspace"}">Skip to workspace</a>
<div class="domain-tabs" role="tablist" aria-label="Software domains">
    ${tabs}
</div>
<nav class="human-nav" aria-label="Human workspace">
  <a href="${escapeHtml(ws)}">Workspace</a>
  <a href="#op-panel">Control panel</a>
  <a href="${current === "workspace" ? "#fg-console" : "#fg-console"}">FragGate console</a>
  <a href="${current === "workspace" ? "#tasks" : "#tasks"}">Tasks</a>
  <a href="#dashboard">Dashboard</a>
  <a href="${current === "workspace" ? "#interface-panel" : "#interface-panel"}">Interface</a>
  <a href="${current === "workspace" ? "#mesh-panel" : "#mesh-panel"}">Mesh</a>
  <a href="#sot-desk">SoT sync</a>
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
  const stubs = (STUB_OPS[p.slug] || []).slice();
  const stubButtons = stubs
    .map(
      (op) =>
        `<button type="button" class="fg-stub" disabled data-stub="${escapeHtml(op)}" title="FG-STUB — not on the public door">${escapeHtml(op)} — stub</button>`,
    )
    .join("");
  const stubBlock = stubs.length
    ? `<p class="hint">Disabled verbs refuse FG-STUB. They stay named and are not a live public door.</p><div class="fg-ops fg-stubs">${stubButtons}</div>`
    : "";
  const boundNote =
    p.slug === "azchat"
      ? `<p class="hint">LIVE+bound. Product mesh hop starts off. Suite mesh is a separate surface.</p>`
      : p.slug === "embryolock"
        ? `<p class="hint">wipe, scorch, and unlock stay on the device. The disabled verbs do not run on this public mesh.</p>`
        : "";
  const example = JSON.stringify(p.example || {}, null, 2);
  const areaId = `fg-payload-${p.slug}`;
  return `<div class="fg-door" data-slug="${escapeHtml(p.slug)}" data-origin="${escapeHtml(origin)}" data-kind="door">
  <p>FragGate only — same LIVE_OPS as MCP <code>fraggate_call</code> / <code>POST /v1/fraggate/call</code>. One backend, two surfaces.</p>
  ${boundNote}
  <div class="fg-ops">${buttons}</div>
  ${stubBlock}
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
      let live = b.live_nodes != null ? b.live_nodes : (roll.mesh != null ? roll.mesh : null);
      let tip = b.live_nodes_tip != null ? b.live_nodes_tip : (b.live_nodes_generation != null ? b.live_nodes_generation : "");
      let nodesCount = typeof b.nodes === "number" ? b.nodes : (typeof roll.nodes === "number" ? roll.nodes : humans + humanUses);
      let locked = b.inactive_nodes != null ? b.inactive_nodes : (b.locked_nodes != null ? b.locked_nodes : roll.locked);
      let isolated = b.isolated_nodes != null ? b.isolated_nodes : roll.isolated;
      let software = b.software_nodes != null ? b.software_nodes : (roll.software && (roll.software.live + roll.software.locked + roll.software.isolated));
      let radios = b.radios || (b.enabled ? "on" : "off");
      let ch = b.channel_plane || b.channels || {};
      let channelsOn = (ch.wifi || b.wifi) === "on" && (ch.bluetooth || b.bluetooth) === "on" && (ch.rf || b.rf) === "on" && (ch.photon || b.photon) === "on";
      let text = "Nodes " + nodesCount + " · Live Nodes " + (live == null ? "—" : live) + " · tip " + tip + " · software_nodes " + software + " · inactive " + locked + " · isolated " + isolated + " · radios " + radios + " · suite-presence " + (b.suite_presence || "on") + " · GET never enables";
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
      setMetric("metric-live", live == null ? "—" : live);
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
      document.querySelectorAll("#workspace .task, #workspace .az-task, #workspace .op-panel, #interface-panel").forEach(function (el) {
        if (el.id === "workspace") return;
        let hay = (el.textContent || "").toLowerCase();
        el.classList.toggle("task-hidden", !!(q && hay.indexOf(q) === -1));
      });
    });
  }
  let interfacePanel = document.getElementById("interface-panel");
  if (interfacePanel) {
    let origin = interfacePanel.getAttribute("data-origin") || "";
    let out = document.getElementById("interface-out");
    interfacePanel.querySelectorAll("[data-if]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let call = btn.getAttribute("data-if");
        if (call === "runtime_ui") {
          request(origin + "/v1/interface", { headers: { accept: "application/json" } }, out, btn);
          return;
        }
        if (call === "forensic_tip") {
          request(origin + "/v1/interface/forensic", { headers: { accept: "application/json" } }, out, btn);
          return;
        }
        let body = { call: call };
        let urlEl = document.getElementById("if-url");
        let appEl = document.getElementById("if-app");
        let platEl = document.getElementById("if-platform");
        let slugEl = document.getElementById("if-slug");
        let opEl = document.getElementById("if-op");
        if (urlEl && String(urlEl.value || "").trim()) body.url = String(urlEl.value).trim();
        if (appEl && String(appEl.value || "").trim()) body.app = String(appEl.value).trim();
        if (platEl && String(platEl.value || "").trim()) body.platform = String(platEl.value).trim();
        if (call === "seal") {
          let box = document.getElementById("if-confirm");
          if (!box || !box.checked) {
            show(out, "Seal needs the confirm box. Nothing was sent.", "error");
            return;
          }
          body.confirm = true;
          if (slugEl && String(slugEl.value || "").trim()) body.slug = String(slugEl.value).trim();
          if (opEl && String(opEl.value || "").trim()) body.op = String(opEl.value).trim();
          if (!body.slug) body.slug = "veillock";
        }
        request(origin + "/v1/interface", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body)
        }, out, btn);
      });
    });
  }
  let dashFilter = document.getElementById("dash-filter");
  let activeDomain = "${UI_DOMAIN_DEFAULT}";
  function applyDomain() {
    let q = dashFilter ? String(dashFilter.value || "").toLowerCase().trim() : "";
    document.querySelectorAll("[data-domain-tab]").forEach(function (tab) {
      tab.setAttribute("aria-selected", tab.getAttribute("data-domain-tab") === activeDomain ? "true" : "false");
    });
    let grid = document.getElementById("dash-softwares");
    if (grid) grid.setAttribute("data-active", q ? "search" : activeDomain);
    document.querySelectorAll("[data-dash-slug]").forEach(function (el) {
      let hay = String(el.getAttribute("data-search") || el.textContent || "").toLowerCase();
      let searchMiss = !!(q && hay.indexOf(q) === -1);
      let domainMiss = el.getAttribute("data-domain") !== activeDomain;
      el.classList.toggle("task-hidden", searchMiss);
      el.classList.toggle("domain-off", domainMiss);
    });
  }
  document.querySelectorAll("[data-domain-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      activeDomain = tab.getAttribute("data-domain-tab") || activeDomain;
      if (dashFilter) dashFilter.value = "";
      applyDomain();
      let grid = document.getElementById("dash-softwares");
      if (grid && grid.scrollIntoView) grid.scrollIntoView({ block: "start" });
    });
  });
  if (dashFilter) dashFilter.addEventListener("input", applyDomain);
  applyDomain();
  let botPlan = { slug: "", op: "" };
  let botDesk = document.getElementById("desk-azbot");
  if (botDesk) {
    let origin = botDesk.getAttribute("data-origin") || "";
    let out = document.getElementById("azbot-out");
    botDesk.querySelectorAll("[data-bot]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let action = btn.getAttribute("data-bot");
        let task = (document.getElementById("bot-task") && document.getElementById("bot-task").value) || "";
        let handoff = (document.getElementById("bot-handoff") && document.getElementById("bot-handoff").value) || "";
        if (action === "seal") {
          let box = document.getElementById("bot-confirm");
          if (!box || !box.checked) {
            show(out, "Seal needs the confirm box. Nothing was sent.", "error");
            return;
          }
          if (!botPlan.slug) {
            show(out, "Seal needs a plan. Nothing was sent.", "error");
            return;
          }
          request(origin + "/v1/interface", {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({ call: "seal", confirm: true, slug: botPlan.slug, op: botPlan.op })
          }, out, btn);
          return;
        }
        let body = { call: action === "intake" ? "worker_intake" : action === "plan" ? "worker_plan" : action === "status" ? "worker_status" : "worker_handoff" };
        if (action !== "status") body.task = task;
        if (action === "handoff") body.handoff = handoff;
        request(origin + "/v1/interface", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body)
        }, out, btn).then(function (got) {
          let steps = got && got.body && got.body.steps;
          if (steps && steps[0]) botPlan = { slug: steps[0].slug || "", op: steps[0].op || "" };
        });
      });
    });
  }
  let aiDesk = document.getElementById("desk-azai");
  if (aiDesk) {
    let origin = aiDesk.getAttribute("data-origin") || "";
    let out = document.getElementById("azai-out");
    aiDesk.querySelectorAll("[data-ai]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let action = btn.getAttribute("data-ai");
        let pin = (document.getElementById("ai-pin") && document.getElementById("ai-pin").value) || "";
        let vibe = (document.getElementById("ai-vibe") && document.getElementById("ai-vibe").value) || "";
        let query = (document.getElementById("ai-query") && document.getElementById("ai-query").value) || "";
        let box = document.getElementById("ai-confirm");
        if (action === "guide" || action === "starter") {
          let guideQ = action === "starter" ? (btn.getAttribute("data-q") || "") : ((document.getElementById("ai-guide") && document.getElementById("ai-guide").value) || "");
          let dry = document.getElementById("ai-guide-dry");
          let adapt = document.getElementById("ai-guide-adapt");
          let guideBody = { call: "learner_guide", q: guideQ };
          if (dry && dry.checked) guideBody.dry_run = true;
          if (adapt && adapt.checked && !(dry && dry.checked)) guideBody.confirm = true;
          request(origin + "/v1/interface", {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify(guideBody)
          }, out, btn).then(function (got) {
            let next = document.getElementById("azai-next");
            if (!next) return;
            next.textContent = "";
            let actions = got && got.body && got.body.next_actions;
            if (!actions || !actions.forEach) return;
            actions.forEach(function (actionRow) {
              if (!actionRow || String(actionRow.href || "").charAt(0) !== "#") return;
              let li = document.createElement("li");
              let link = document.createElement("a");
              link.href = String(actionRow.href);
              link.textContent = String(actionRow.label || actionRow.href);
              li.appendChild(link);
              next.appendChild(li);
            });
          });
          return;
        }
        let body = { call: action === "recall" ? "learner_recall" : "learner_learn" };
        if (action === "recall") body.q = query;
        if (pin && String(pin).trim()) body.pins = [{ pin_id: String(pin).trim() }];
        if (vibe && String(vibe).trim()) body.vibelock = { file: String(vibe).trim() };
        if (box && box.checked) body.confirm = true;
        request(origin + "/v1/interface", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body)
        }, out, btn);
      });
    });
  }
  let hour = document.getElementById("first-hour");
  if (hour) {
    let steps = [
      { id: "elroi-jeeves", caption: "Ask Jeeves answers in plain language. Lamb Lens, then the shelf, then the triad." },
      { id: "domain-tab-ai", caption: "AZAI Guide is on the AI tab. Open that tab, then Guide. Learn still needs confirm." },
      { id: "dash-softwares", caption: "Softwares stay on this grid. A domain tab filters it. Search shows every match." },
      { id: "interface-panel", caption: "Interface holds plans, receipts, Ask Jeeves, and MCP. A plan does not launch." },
      { id: "mesh-panel", caption: "Mesh status stays on this page. Join needs a product. GET does not turn radios on." },
      { id: "fg-console", caption: "FragGate is the single door. List, describe, then call." },
      { id: "dash-receipts", caption: "Receipts stay on the dashboard. dry_run stores nothing. A write still needs confirm." }
    ];
    let cursor = -1;
    let mark = null;
    let cap = document.getElementById("first-hour-caption");
    let nextBtn = hour.querySelector("[data-tour='next']");
    let doneBtn = hour.querySelector("[data-tour='done']");
    function clearMark() {
      if (mark) {
        mark.classList.remove("first-hour-mark");
        mark = null;
      }
    }
    function showStep(i) {
      clearMark();
      cursor = i;
      let step = steps[i];
      let el = document.getElementById(step.id);
      if (cap) cap.textContent = step.caption;
      if (el) {
        el.classList.add("first-hour-mark");
        mark = el;
        if (el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
      }
      if (nextBtn) nextBtn.hidden = false;
      if (doneBtn) doneBtn.hidden = false;
    }
    hour.querySelectorAll("[data-first-hour]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let kind = btn.getAttribute("data-first-hour");
        if (kind === "ai") {
          let tab = document.getElementById("domain-tab-ai");
          if (tab) tab.click();
          let desk = document.getElementById("desk-azai");
          if (desk && desk.scrollIntoView) desk.scrollIntoView({ block: "nearest" });
        }
        if (kind === "tabs") {
          let tabs = document.querySelector("[role='tablist']");
          if (tabs && tabs.scrollIntoView) tabs.scrollIntoView({ block: "nearest" });
        }
      });
    });
    let start = hour.querySelector("[data-tour='start']");
    if (start) start.addEventListener("click", function () { showStep(0); });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      let n = cursor + 1;
      if (n >= steps.length) n = 0;
      showStep(n);
    });
    if (doneBtn) doneBtn.addEventListener("click", function () {
      clearMark();
      cursor = -1;
      if (nextBtn) nextBtn.hidden = true;
      if (doneBtn) doneBtn.hidden = true;
      if (cap) cap.textContent = "Tour closed. Tabs, Softwares, receipts, mesh, MCP, Corpus, Ask Jeeves, and AZAI are still on this page.";
      try { sessionStorage.setItem("aziel-first-hour", "seen"); } catch (err) {}
    });
    try {
      if (sessionStorage.getItem("aziel-first-hour") === "seen" && cap) {
        cap.textContent = "You have seen the tour. Show me around runs it again. Nothing was hidden.";
      }
    } catch (err2) {}
  }
})();
</script>`;
}

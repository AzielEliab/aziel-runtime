/**
 * Close UI hold. The shell can go away. The Worker keeps running.
 *
 * NO-LIE: this does not seal a session, leave the mesh, stop FragGate,
 * or stop library sync. A browser tab cannot keep a timer after it is gone.
 * The 2-minute Worker cron refreshes a held mesh node only while that node
 * is still on the roster and radios are live. A refused heartbeat stays
 * refused. A dropped node is not rejoined. invented_heartbeats stays false.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { meshHeartbeat, sanitizeNodeId } from "./mesh.js";
import { SESSION_TTL_MS } from "./production.js";
import { SESSION_ID_RE } from "./session-core.js";

export const UI_HOLD_NOTE =
  "Close UI detached the shell. The Worker still holds the session and the mesh record. " +
  "This is not a browser timer. A held non-worker mesh session stays registered until leave or 14 days after the last beat. " +
  "The cron runs every 2 minutes and only heartbeats a node that is already on the roster, which keeps that row in the live class. " +
  "Missed beats mark the row stale. They do not delete it. {slug}-worker suite-presence still drops after 5 minutes. " +
  "A refused heartbeat stays refused. A row past grace is not rejoined. " +
  "FragGate, library sync, and MCP are not stopped by this hold.";

const CLIENT_RE = /^[a-z0-9._-]{8,80}$/;
const PRODUCT_RE = /^[a-z0-9-]{1,64}$/;
const HOLD_CAP = 200;
const HOLD_NAME = "aziel-ui-hold";

let memoryHolds = {};

function sessionStub(env, id) {
  if (!env || !env.SESSION || typeof env.SESSION.idFromName !== "function") return null;
  if (typeof env.SESSION.getByName === "function") return env.SESSION.getByName(id);
  return env.SESSION.get(env.SESSION.idFromName(id));
}

function holdStub(env) {
  return sessionStub(env, HOLD_NAME);
}

async function readHolds(env) {
  const stub = holdStub(env);
  if (!stub) return { ...memoryHolds };
  const res = await stub.fetch(new Request("https://session/ui-hold-get", { method: "GET" }));
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  const holds = body && body.holds && typeof body.holds === "object" && !Array.isArray(body.holds) ? body.holds : {};
  return { ...holds };
}

async function writeHolds(env, holds) {
  const capped = capHolds(holds);
  const stub = holdStub(env);
  if (!stub) {
    memoryHolds = capped;
    return;
  }
  await stub.fetch(
    new Request("https://session/ui-hold-put", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ holds: capped }),
    }),
  );
}

function capHolds(holds) {
  const keys = Object.keys(holds || {});
  if (keys.length <= HOLD_CAP) return holds || {};
  keys.sort((a, b) => String(holds[a] && holds[a].detached_at).localeCompare(String(holds[b] && holds[b].detached_at)));
  const next = { ...holds };
  for (const key of keys.slice(0, keys.length - HOLD_CAP)) delete next[key];
  return next;
}

function fail(status, code, error) {
  return { ok: false, status, body: { ok: false, code, error, session_sealed_by_ui: false, mesh_left_by_ui: false } };
}

function parseHoldBody(body) {
  const src = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const client_key = String(src.client_key || "").trim();
  if (!CLIENT_RE.test(client_key)) {
    return fail(400, "UI-BAD-CLIENT", "client_key must be 8–80 chars [a-z0-9._-].");
  }
  let session_id = null;
  if (Object.prototype.hasOwnProperty.call(src, "session_id") && src.session_id != null && String(src.session_id).trim() !== "") {
    session_id = String(src.session_id).trim();
    if (!SESSION_ID_RE.test(session_id)) {
      return fail(400, "UI-BAD-SESSION", "session_id must match sess_ + 32 hex.");
    }
  }
  let node_id = null;
  if (Object.prototype.hasOwnProperty.call(src, "node_id") && src.node_id != null && String(src.node_id).trim() !== "") {
    node_id = sanitizeNodeId(src.node_id);
    if (!node_id) return fail(400, "UI-BAD-NODE", "node_id must be 8–80 chars [a-z0-9._-].");
  }
  let product = null;
  if (src.product != null && String(src.product).trim() !== "") {
    product = String(src.product).trim().toLowerCase();
    if (!PRODUCT_RE.test(product)) return fail(400, "UI-BAD-PRODUCT", "product must be a catalog slug.");
  }
  return { ok: true, client_key, session_id, node_id, product, hasSession: session_id != null, hasNode: node_id != null };
}

async function readJson(request) {
  try {
    const text = await request.text();
    if (!text || !text.trim()) return {};
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail(400, "UI-BAD-JSON", "JSON body must be an object.");
    }
    return body;
  } catch {
    return fail(400, "UI-BAD-JSON", "invalid JSON");
  }
}

async function readSessionStatus(env, id) {
  const stub = sessionStub(env, id);
  if (!stub) {
    return {
      found: false,
      live: false,
      closed: null,
      note: "Session binding is missing. Close UI did not seal a session.",
    };
  }
  try {
    const res = await stub.fetch(new Request("https://session/status", { method: "GET" }));
    const body = await res.json();
    if (!res.ok || !body || !body.session) {
      return {
        found: false,
        live: false,
        closed: null,
        note: "No session for that id. Close UI did not open or seal one.",
      };
    }
    const closed = body.session.closed === true;
    return {
      found: true,
      live: closed !== true,
      closed,
      note: closed
        ? "That session is already sealed. Close UI did not seal it."
        : "Session is still open on the Worker.",
    };
  } catch {
    return {
      found: false,
      live: false,
      closed: null,
      note: "Session status could not be read. Close UI did not seal it.",
    };
  }
}

function publicHold(hold, session) {
  return {
    ok: true,
    runtime: "running",
    browser_timer: false,
    invented_heartbeats: false,
    session_sealed_by_ui: false,
    mesh_left_by_ui: false,
    fraggate: "untouched",
    library_sync: "untouched",
    mcp: "untouched",
    client_key: hold ? hold.client_key : null,
    session_id: hold ? hold.session_id || null : null,
    node_id: hold ? hold.node_id || null : null,
    product: hold ? hold.product || null : null,
    ui_detached: hold ? hold.ui_detached === true : false,
    detached_at: hold ? hold.detached_at || null : null,
    expires_at: hold ? hold.expires_at || null : null,
    session_live: session ? session.live === true : false,
    session_closed: session ? session.closed : null,
    session_note: session ? session.note : "No session id on this hold.",
    mesh_note: hold && hold.mesh_note ? hold.mesh_note : null,
    note: UI_HOLD_NOTE,
  };
}

function holdLive(hold, now = Date.now()) {
  if (!hold || typeof hold !== "object") return false;
  const exp = Date.parse(hold.expires_at || "");
  if (Number.isFinite(exp) && exp <= now) return false;
  return true;
}

export function holdContract() {
  return {
    ok: true,
    runtime: "worker",
    browser_timer: false,
    invented_heartbeats: false,
    session_sealed_by_ui: false,
    mesh_left_by_ui: false,
    paths: {
      detach: "POST /v1/ui/detach",
      resume: "GET /v1/ui/resume?client_key=",
      attach: "POST /v1/ui/attach",
      contract: "GET /v1/ui/hold",
      service_worker: "/sw.js",
    },
    close_ui: "Hides the shell and records a hold. Does not seal a session or leave the mesh.",
    seal_session: "POST /v1/session/{id}/close is a separate shutdown. The shell labels that Seal session.",
    service_worker:
      "The service worker delivers the shell and a close beacon. It does not run the runtime. Browsers may kill it when idle.",
    note: UI_HOLD_NOTE,
  };
}

export async function detachUi(env, body) {
  const parsed = parseHoldBody(body);
  if (parsed.ok !== true) return parsed;
  const holds = await readHolds(env);
  const prev = holds[parsed.client_key] && typeof holds[parsed.client_key] === "object" ? holds[parsed.client_key] : {};
  const now = new Date();
  const session_id = parsed.hasSession ? parsed.session_id : prev.session_id || null;
  const node_id = parsed.hasNode ? parsed.node_id : prev.node_id || null;
  const product = parsed.product || prev.product || null;
  const session = session_id ? await readSessionStatus(env, session_id) : null;
  const hold = {
    client_key: parsed.client_key,
    session_id,
    node_id,
    product,
    detached_at: now.toISOString(),
    expires_at: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    ui_detached: true,
    session_sealed_by_ui: false,
    mesh_left_by_ui: false,
    mesh_note: prev.mesh_note || null,
  };
  holds[parsed.client_key] = hold;
  await writeHolds(env, holds);
  return {
    ok: true,
    status: 200,
    body: { ...publicHold(hold, session), ui: "detached" },
  };
}

export async function attachUi(env, body) {
  const parsed = parseHoldBody(body);
  if (parsed.ok !== true) return parsed;
  const holds = await readHolds(env);
  const prev = holds[parsed.client_key];
  if (!prev || !holdLive(prev)) {
    return {
      ok: true,
      status: 200,
      body: {
        ...publicHold(null, null),
        ui: "open",
        hold: false,
        session_note: "No live hold. Nothing was sealed.",
      },
    };
  }
  const hold = {
    ...prev,
    ui_detached: false,
    session_sealed_by_ui: false,
    mesh_left_by_ui: false,
  };
  holds[parsed.client_key] = hold;
  await writeHolds(env, holds);
  const session = hold.session_id ? await readSessionStatus(env, hold.session_id) : null;
  return { ok: true, status: 200, body: { ...publicHold(hold, session), ui: "open", hold: true } };
}

export async function resumeUi(env, clientKey) {
  const parsed = parseHoldBody({ client_key: clientKey });
  if (parsed.ok !== true) return parsed;
  const holds = await readHolds(env);
  const prev = holds[parsed.client_key];
  if (!prev || !holdLive(prev)) {
    if (prev) {
      delete holds[parsed.client_key];
      await writeHolds(env, holds);
    }
    return {
      ok: true,
      status: 200,
      body: {
        ...publicHold(null, null),
        hold: false,
        session_note: "No live hold. Reopen did not cold-start a session.",
      },
    };
  }
  const session = prev.session_id ? await readSessionStatus(env, prev.session_id) : null;
  return { ok: true, status: 200, body: { ...publicHold(prev, session), hold: true } };
}

/**
 * Cron path. Heartbeat an existing held node. Never join. Never leave.
 * Skips holds whose shell is open again (attach). Skips expired holds.
 */
export async function refreshUiHolds(env) {
  const holds = await readHolds(env);
  const now = Date.now();
  let changed = false;
  const beats = [];
  for (const key of Object.keys(holds)) {
    const hold = holds[key];
    if (!holdLive(hold, now)) {
      delete holds[key];
      changed = true;
      beats.push({ client_key: key, dropped: "expired", invented_heartbeats: false });
      continue;
    }
    if (hold.ui_detached !== true || !hold.node_id) {
      beats.push({
        client_key: key,
        mesh: hold.node_id ? "shell-open" : "no-node",
        invented_heartbeats: false,
      });
      continue;
    }
    const beat = await meshHeartbeat({ node_id: hold.node_id }, env);
    const code = beat && beat.code ? beat.code : null;
    if (code === "MESH-UNKNOWN-NODE") {
      hold.node_id = null;
      hold.mesh_note = "Node already gone. Close UI did not rejoin it.";
      holds[key] = hold;
      changed = true;
    }
    beats.push({
      client_key: key,
      ok: beat && beat.ok === true,
      code,
      invented_heartbeats: false,
    });
  }
  if (changed) await writeHolds(env, holds);
  return {
    ok: true,
    invented_heartbeats: false,
    refreshed: beats.filter((row) => row.ok === true).length,
    beats,
  };
}

export async function dispatchUiHold(request, url, env) {
  const path = url.pathname;
  if (path === "/sw.js") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return fail(405, "UI-METHOD", "GET /sw.js");
    }
    return { kind: "script", status: 200, body: UI_SERVICE_WORKER_JS };
  }
  if (!path.startsWith("/v1/ui/")) return null;
  if (path === "/v1/ui/hold" && (request.method === "GET" || request.method === "HEAD")) {
    return { kind: "json", status: 200, body: holdContract() };
  }
  if (path === "/v1/ui/resume" && (request.method === "GET" || request.method === "HEAD")) {
    const out = await resumeUi(env, url.searchParams.get("client_key") || "");
    return { kind: "json", status: out.status, body: out.body };
  }
  if (path === "/v1/ui/detach" && request.method === "POST") {
    const body = await readJson(request);
    if (body && body.ok === false && body.status) return { kind: "json", status: body.status, body: body.body };
    const out = await detachUi(env, body);
    return { kind: "json", status: out.status, body: out.body };
  }
  if (path === "/v1/ui/attach" && request.method === "POST") {
    const body = await readJson(request);
    if (body && body.ok === false && body.status) return { kind: "json", status: body.status, body: body.body };
    const out = await attachUi(env, body);
    return { kind: "json", status: out.status, body: out.body };
  }
  const method = request.method === "GET" || request.method === "HEAD" || request.method === "POST";
  if (!method) return fail(405, "UI-METHOD", "Use GET /v1/ui/hold, GET /v1/ui/resume, POST /v1/ui/detach, or POST /v1/ui/attach.");
  return { kind: "json", status: 404, body: { ok: false, code: "UI-UNKNOWN", error: "not a ui hold route", session_sealed_by_ui: false, mesh_left_by_ui: false } };
}

export function uiShellBootHtml() {
  return `<script>
try { if (localStorage.getItem("aziel-ui-shell") === "closed") document.documentElement.setAttribute("data-ui-shell", "closed"); } catch (e) {}
</script>`;
}

export const UI_SHELL_CSS = `
  .human-nav button.nav-secondary{display:inline-flex;align-items:center;min-height:44px;background:transparent;color:#9aa3b2;border:1px solid #3d3420;border-radius:8px;padding:.35rem .65rem;font:inherit;font-weight:600;font-size:.82rem;cursor:pointer}
  #ui-standby{border:1px solid #5c4a1a;background:#241c0d;color:#f0d78c;padding:.9rem 1.05rem;border-radius:10px;margin:0 0 1rem}
  #ui-standby .hint{color:#e6d19a}
  #ui-standby button{background:#241c0d;color:#f0d78c;border:1px solid #d4af37;border-radius:8px;padding:.5rem .9rem;min-height:44px;cursor:pointer;font:inherit;font-weight:700}
  #ui-standby[hidden]{display:none !important}
  html[data-ui-shell="closed"] body > :not(#ui-standby){display:none !important}
  html[data-ui-shell="closed"] #ui-standby{display:block !important}
`;

export function uiShellClientScript() {
  return `
  function uiStorageGet(key) {
    try { return localStorage.getItem(key) || ""; } catch (err) { return ""; }
  }
  function uiStorageSet(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (err) {}
  }
  function uiClientKey() {
    var id = uiStorageGet("aziel-ui-client");
    if (!/^[a-z0-9._-]{8,80}$/.test(id)) {
      var bytes = new Uint8Array(8);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
      else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      id = "ui";
      for (var j = 0; j < bytes.length; j++) id += bytes[j].toString(16).padStart(2, "0");
      uiStorageSet("aziel-ui-client", id);
    }
    return id;
  }
  function uiOrigin() {
    var standby = document.getElementById("ui-standby");
    var from = standby && standby.getAttribute("data-origin");
    if (from) return String(from).replace(/\\/$/, "");
    var marked = document.querySelector("[data-origin]");
    from = marked && marked.getAttribute("data-origin");
    if (from) return String(from).replace(/\\/$/, "");
    return location.origin;
  }
  function uiRemember() {
    var sid = "";
    var a = document.getElementById("sess-id");
    var b = document.getElementById("op-sess-id");
    sid = String((a && a.value) || (b && b.value) || "").trim();
    if (/^sess_[a-f0-9]{32}$/.test(sid)) uiStorageSet("aziel-ui-session", sid);
    else sid = uiStorageGet("aziel-ui-session");
    var nodeEl = document.getElementById("mesh-node");
    var node = String((nodeEl && nodeEl.value) || "").trim();
    if (/^[a-z0-9._-]{8,80}$/.test(node)) uiStorageSet("aziel-ui-node", node);
    else node = uiStorageGet("aziel-ui-node");
    var productEl = document.getElementById("mesh-product") || document.getElementById("op-mesh-product");
    var product = String((productEl && productEl.value) || "").trim().toLowerCase();
    if (/^[a-z0-9-]{1,64}$/.test(product)) uiStorageSet("aziel-ui-product", product);
    return {
      client_key: uiClientKey(),
      session_id: /^sess_[a-f0-9]{32}$/.test(sid) ? sid : undefined,
      node_id: /^[a-z0-9._-]{8,80}$/.test(node) ? node : undefined,
      product: uiStorageGet("aziel-ui-product") || undefined
    };
  }
  function keepJoinedNode(got) {
    var body = got && got.body;
    var id = meshNodeFrom(body);
    if (!id) return;
    var field = document.getElementById("mesh-node");
    if (field) field.value = id;
    uiStorageSet("aziel-ui-node", id);
  }
  function meshNodeFrom(body) {
    var seen = [];
    function walk(node, depth) {
      if (!node || typeof node !== "object" || depth > 5) return "";
      if (seen.indexOf(node) !== -1) return "";
      seen.push(node);
      if (typeof node.node_id === "string" && /^[a-z0-9._-]{8,80}$/.test(node.node_id)) return node.node_id;
      var keys = Object.keys(node);
      for (var i = 0; i < keys.length; i++) {
        var found = walk(node[keys[i]], depth + 1);
        if (found) return found;
      }
      return "";
    }
    return walk(body, 0);
  }
  function noteMeshLeave(got) {
    var body = got && got.body;
    if (!body || body.ok === false) return;
    if (body.result && body.result.ok === false) return;
    uiStorageSet("aziel-ui-node", "");
    var field = document.getElementById("mesh-node");
    if (field) field.value = "";
  }
  function uiAddText(parent, tag, text, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }
  function uiOnReopen() {
    uiSetShell(false);
    fetch(uiOrigin() + "/v1/ui/attach", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ client_key: uiClientKey() }),
      keepalive: true
    }).then(function () { uiResume(); }).catch(function () { uiResume(); });
  }
  function uiEnsureStandby() {
    var standby = document.getElementById("ui-standby");
    if (standby) return standby;
    standby = document.createElement("div");
    standby.id = "ui-standby";
    standby.setAttribute("data-origin", uiOrigin());
    var headline = document.createElement("p");
    var strong = document.createElement("strong");
    strong.textContent = "UI closed.";
    headline.appendChild(strong);
    headline.appendChild(document.createTextNode(" The Worker is still running."));
    standby.appendChild(headline);
    uiAddText(standby, "p", "Close UI does not seal the session, leave the mesh, or stop FragGate, library sync, or MCP.");
    uiAddText(standby, "p", "This browser cannot keep a timer after the tab is gone. The Worker refreshes a held mesh node on its 2-minute cron while radios are live. A refused heartbeat stays refused. A dropped node is not rejoined.", "hint");
    var line = uiAddText(standby, "p", "Checking the background hold…");
    line.id = "ui-resume-line";
    var button = document.createElement("button");
    button.type = "button";
    button.id = "ui-reopen";
    button.textContent = "Reopen UI";
    button.addEventListener("click", uiOnReopen);
    standby.appendChild(button);
    if (document.body.firstChild) document.body.insertBefore(standby, document.body.firstChild);
    else document.body.appendChild(standby);
    return standby;
  }
  function uiSetShell(closed) {
    if (closed) uiEnsureStandby();
    if (closed) document.documentElement.setAttribute("data-ui-shell", "closed");
    else document.documentElement.removeAttribute("data-ui-shell");
    uiStorageSet("aziel-ui-shell", closed ? "closed" : "open");
    var standby = document.getElementById("ui-standby");
    if (!standby) return;
    if (closed) standby.hidden = false;
    else if (standby.parentNode) standby.parentNode.removeChild(standby);
  }
  function uiPostDetach(mode) {
    var url = uiOrigin() + "/v1/ui/detach";
    var body = JSON.stringify(uiRemember());
    if (mode === "beacon" && navigator.sendBeacon) {
      try {
        var blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(url, blob)) return;
      } catch (err) {}
    }
    var req = fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: body,
      keepalive: true
    });
    if (mode === "paint") {
      req.then(function (res) { return res.json(); }).then(uiPaintResume).catch(function () {
        var line = document.getElementById("ui-resume-line");
        if (line) line.textContent = "Hold was sent. The reply did not come back. This page did not seal the session.";
      });
    }
  }
  function uiPaintResume(body) {
    var line = document.getElementById("ui-resume-line");
    var sid = body && body.session_id;
    var node = body && body.node_id;
    if (sid && /^sess_[a-f0-9]{32}$/.test(sid)) {
      uiStorageSet("aziel-ui-session", sid);
      var a = document.getElementById("sess-id");
      var b = document.getElementById("op-sess-id");
      if (a) a.value = sid;
      if (b) b.value = sid;
    }
    if (node && /^[a-z0-9._-]{8,80}$/.test(node)) {
      uiStorageSet("aziel-ui-node", node);
      var field = document.getElementById("mesh-node");
      if (field && !field.value) field.value = node;
    }
    if (!line) return;
    if (body && body.ui === "detached") line.textContent = "Hold is on the Worker. Close UI did not seal a session or leave the mesh.";
    else if (body && body.session_live === true) line.textContent = "Reconnected. The same session is still open on the Worker.";
    else if (body && body.session_id && body.session_live === false) line.textContent = body.session_note || "That session is not live. Reopen did not start a new one.";
    else if (body && body.hold === true) line.textContent = "Runtime hold is on the Worker. Close UI did not seal it.";
    else line.textContent = "No background hold yet. Close UI leaves the Worker running.";
  }
  function uiResume() {
    var key = uiClientKey();
    fetch(uiOrigin() + "/v1/ui/resume?client_key=" + encodeURIComponent(key), { headers: { accept: "application/json" } })
      .then(function (res) { return res.json(); })
      .then(uiPaintResume)
      .catch(function () {
        var line = document.getElementById("ui-resume-line");
        if (line) line.textContent = "Resume did not answer. This page did not seal the session.";
      });
  }
  var uiClose = document.getElementById("ui-close");
  if (uiClose) {
    uiClose.addEventListener("click", function () {
      uiRemember();
      uiSetShell(true);
      var pending = document.getElementById("ui-resume-line");
      if (pending) pending.textContent = "Sending the hold to the Worker…";
      uiPostDetach("paint");
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "ui-detach", url: uiOrigin() + "/v1/ui/detach", body: uiRemember() });
      }
    });
  }
  window.addEventListener("pagehide", function () {
    uiRemember();
    uiPostDetach("beacon");
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") uiRemember();
  });
  window.addEventListener("pageshow", function (ev) {
    if (!ev.persisted) return;
    if (document.documentElement.getAttribute("data-ui-shell") === "closed") return;
    fetch(uiOrigin() + "/v1/ui/attach", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ client_key: uiClientKey() }),
      keepalive: true
    }).catch(function () {});
  });
  if (document.getElementById("ui-standby") || document.getElementById("ui-close")) {
    var storedSid = uiStorageGet("aziel-ui-session");
    var storedNode = uiStorageGet("aziel-ui-node");
    if (storedSid) {
      var sidA = document.getElementById("sess-id");
      var sidB = document.getElementById("op-sess-id");
      if (sidA && !sidA.value) sidA.value = storedSid;
      if (sidB && !sidB.value) sidB.value = storedSid;
    }
    if (storedNode) {
      var storedField = document.getElementById("mesh-node");
      if (storedField && !storedField.value) storedField.value = storedNode;
    }
    if (uiStorageGet("aziel-ui-shell") === "closed") uiSetShell(true);
    uiResume();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
    }
  }
`;
}

export const UI_SERVICE_WORKER_JS = `/*
 * NO-LIE: this service worker does not run Aziel Runtime.
 * The Cloudflare Worker does. This file does not seal a session,
 * leave the mesh, or stop FragGate. Browsers may kill it when idle.
 * A killed worker is not a live heartbeat.
 */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("message", function (event) {
  var data = event.data || {};
  if (data.type !== "ui-detach" || !data.url) return;
  var url = String(data.url);
  if (url.indexOf("/v1/ui/detach") === -1) return;
  if (url.indexOf("/close") !== -1 || url.indexOf("/leave") !== -1) return;
  event.waitUntil(fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(data.body || {}),
    keepalive: true
  }));
});
`;

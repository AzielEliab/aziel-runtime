/**
 * Primary lattice door for godlock bidirectional wrap/pull (godlock #111).
 *
 * POST /v1/lattice/wrap  append one verified block onto this Worker's primary chain.
 * GET|POST /v1/lattice/pull  read one row by entry_hash. Aggregate planes require the operator header.
 *
 * This Worker is primary (aziel-runtime). Secondary is aziel-corpus and is not written here.
 * LATTICE_REMOTE defaults off. A miss is not ok. Operator token stays header-only.
 * Aggregate (planes, aggregate=1, or a pull with no entry_hash) requires that header.
 * Unauthenticated aggregate fails closed and lists no usernames.
 * This Worker accepts a submitting-user LATTICE-TIEBREAK-1.0 wrap. Offline secondary rows stay on corpus.
 * An entry_hash pull without the operator header strips offline usernames. The operator header may include them.
 * The primary chain is one blob capped at 1024 rows.
 * live stays false. auto_update, RF, and sat stay off. Mesh membership is not changed.
 * Cap-7 is not ICANN. No spend. Not a Softwares card. Not an MCP tool.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { hybridKv } from "./durable-kv.js";
import {
  LATTICE_GENESIS,
  LATTICE_SPEC,
  LATTICE_USER_RE,
  checkLatticeRow,
  isHex64,
  latticeOfflineSecondary,
  latticeTiebreak,
  latticeTips,
  tiebreakTip,
  verifyLattice,
} from "./dual-lattice.js";
import {
  extractRuntimeToken,
  requireTokenFlag,
  sessionMutateAuth,
  timingSafeEqualString,
  tokenConfigured,
  tokenPresentedInQuery,
  tokenSecret,
} from "./production.js";
import { TOKEN_BODY_KEYS, tokenBodyRefuse, tokenQueryRefuse } from "./redline.js";
import { bodyTooDeepRefuse, jsonStructureStats, parseJsonBytes, readCappedBytes } from "./request-limits.js";

export const LATTICE_REMOTE_SPEC = "AZRT-LATTICE-REMOTE-1.0";
export const LATTICE_WRAP_PATH = "/v1/lattice/wrap";
export const LATTICE_PULL_PATH = "/v1/lattice/pull";
export const PRIMARY_TARGET = "aziel-runtime";
export const SECONDARY_TARGET = "aziel-corpus";
export const CHAIN_KEY = "lattice|primary|v1";
export const CHAIN_CAP = 1024;
export const BODY_CAP = 64 * 1024;

export const AGGREGATE_PLANES = Object.freeze([
  "users",
  "sites",
  "uses",
  "host_sites",
  "access_points",
  "nodes",
  "node_mesh",
]);

const CAP7_NAMES = Object.freeze([
  "azgrid",
  "azcloak",
  "azvault",
  "azshift",
  "azbooth",
  "azflag",
  "azstandby",
]);

const SECRET_KEY_RE = /^(runtime_token|authorization|password|private_key|secret|legal_name|seed|passphrase)$/i;
const NODE_ID_RE = /^[a-z0-9._-]{1,80}$/;
const ID_CAP = 64;

const memoryChains = new WeakMap();
const chainLocks = new WeakMap();

export function latticeRemoteEnabled(env) {
  const v = env && env.LATTICE_REMOTE;
  if (v === true || v === 1) return true;
  const s = String(v == null ? "" : v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export function latticePolicy(enabled) {
  return {
    spec: LATTICE_REMOTE_SPEC,
    live: false,
    implemented: true,
    enabled: enabled === true,
    auto_update: false,
    rf: false,
    sat: false,
    cap7_is_icann: false,
    spend: false,
    primary_target: PRIMARY_TARGET,
    secondary_target: SECONDARY_TARGET,
    secondary_on_this_worker: false,
    membership_changed: false,
    software_card: false,
    mcp_tool: false,
    role: "primary",
  };
}

function fail(status, code, extra = {}) {
  return {
    status,
    body: {
      ok: false,
      live: false,
      code,
      written: false,
      rebuilt_from_zero: false,
      role: "primary",
      primary_target: PRIMARY_TARGET,
      secondary_target: SECONDARY_TARGET,
      secondary_on_this_worker: false,
      policy: latticePolicy(extra.enabled === true),
      ...extra,
      ok: false,
      live: false,
    },
  };
}

function latticeKv(env) {
  if (env && env.LATTICE && typeof env.LATTICE.get === "function" && typeof env.LATTICE.put === "function") {
    return env.LATTICE;
  }
  if (env && env.RUNTIME_KV) {
    const kv = hybridKv(env.RUNTIME_KV, null);
    if (kv && typeof kv.get === "function" && typeof kv.put === "function") return kv;
  }
  return null;
}

function withLock(env, fn) {
  const prev = chainLocks.get(env) || Promise.resolve();
  const run = prev.then(fn, fn);
  chainLocks.set(
    env,
    run.then(
      () => {},
      () => {},
    ),
  );
  return run;
}

async function loadRows(env) {
  const kv = latticeKv(env);
  if (kv) {
    let raw;
    try {
      raw = await kv.get(CHAIN_KEY);
    } catch {
      return { ok: false, code: "LATTICE-STORE-UNREADABLE", durable: true };
    }
    if (raw == null || raw === "") return { ok: true, rows: [], durable: true, raw: "" };
    const rawText = typeof raw === "string" ? raw : JSON.stringify(raw);
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const rows = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.rows) ? parsed.rows : null;
      if (!rows) return { ok: false, code: "LATTICE-STORE-SHAPE", durable: true };
      return { ok: true, rows, durable: true, raw: rawText };
    } catch {
      return { ok: false, code: "LATTICE-STORE-SHAPE", durable: true };
    }
  }
  if (!env || typeof env !== "object") return { ok: false, code: "LATTICE-STORE-UNREADABLE", durable: false };
  const rows = memoryChains.get(env) || [];
  return { ok: true, rows: rows.slice(), durable: false, raw: "" };
}

async function saveRows(env, rows, loaded) {
  const payload = JSON.stringify({ spec: LATTICE_REMOTE_SPEC, rows });
  if (loaded && loaded.durable) {
    const kv = latticeKv(env);
    if (!kv) return { ok: false, code: "LATTICE-STORE-UNWRITABLE" };
    try {
      if (typeof kv.cas === "function") {
        const got = await kv.cas(CHAIN_KEY, loaded.raw || "", payload);
        if (!got || got.ok !== true) return { ok: false, code: "LATTICE-CONFLICT" };
        return { ok: true, durable: true };
      }
      await kv.put(CHAIN_KEY, payload);
      return { ok: true, durable: true };
    } catch {
      return { ok: false, code: "LATTICE-STORE-UNWRITABLE" };
    }
  }
  memoryChains.set(env, rows.slice());
  return { ok: true, durable: false };
}

function findRow(rows, entryHash) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row && row.entry_hash === entryHash) return row;
  }
  return null;
}

function secretKey(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 8) return null;
  for (const key of Object.keys(value)) {
    if (SECRET_KEY_RE.test(key) || TOKEN_BODY_KEYS.includes(key)) return key;
    const nested = secretKey(value[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

function sameBlock(stored, block, submittingUser) {
  const lat = stored && stored.lattice;
  if (!lat || !block) return false;
  if (lat.document_hash !== block.document_hash || lat.primary !== block.primary || lat.secondary !== block.secondary) return false;
  const prevTb = lat.tiebreak;
  const nextTb = block.tiebreak;
  if (prevTb == null && nextTb == null) return true;
  if (!prevTb || !nextTb) return false;
  return prevTb.hash === nextTb.hash && prevTb.offline_secondary === nextTb.offline_secondary && (stored.submitting_user || null) === (submittingUser || null);
}

function latticeForChainWalk(row) {
  const lat = row && row.lattice;
  if (!lat || lat.tiebreak == null) return lat;
  const copy = { ...lat };
  delete copy.tiebreak;
  return copy;
}

function submittingUserName(body, block) {
  const tb = block && block.tiebreak;
  const fromBody = body && body.submitting_user != null ? body.submitting_user : body && body.username;
  const fromTie = tb && typeof tb === "object" ? tb.username : null;
  if (fromBody != null && fromTie != null && String(fromBody).trim() !== String(fromTie).trim()) return "";
  return String((fromBody != null ? fromBody : fromTie) ?? "").trim();
}

/** Online tie-break on this primary. Username is the submitting user. Offline secondary stays on corpus. */
async function checkSubmittingTiebreak(block, body, rows, { replay = null } = {}) {
  const tb = block.tiebreak;
  if (tb == null) return { ok: true, username: null };
  if (typeof tb !== "object" || Array.isArray(tb) || tb.status !== "synced") return { ok: false, code: "LATTICE-TIEBREAK" };
  if (!isHex64(tb.hash) || !isHex64(tb.prev) || !isHex64(tb.offline_secondary)) return { ok: false, code: "LATTICE-TIEBREAK" };
  const username = submittingUserName(body, block);
  if (!username || !LATTICE_USER_RE.test(username)) return { ok: false, code: "LATTICE-USERNAME-ABSENT" };
  const offSecondary = await latticeOfflineSecondary(block.document_hash, username);
  if (tb.offline_secondary !== offSecondary) return { ok: false, code: "LATTICE-TIEBREAK-MISS" };
  const want = await latticeTiebreak({ prev: tb.prev, primary: block.primary, secondary: offSecondary, username });
  if (want !== tb.hash) return { ok: false, code: "LATTICE-TIEBREAK-MISS" };
  if (replay && sameBlock(replay, block, username)) return { ok: true, username };
  if (tb.prev !== tiebreakTip(rows)) return { ok: false, code: "LATTICE-TIEBREAK-PREV" };
  for (const row of rows || []) {
    const lat = row && row.lattice;
    if (!lat || lat.document_hash !== block.document_hash || !lat.tiebreak || lat.tiebreak.status !== "synced") continue;
    if (row.submitting_user === username) return { ok: false, code: "LATTICE-DOUBLE" };
  }
  return { ok: true, username };
}

function rowBody(row, durable, code) {
  return {
    ok: true,
    live: false,
    code,
    written: code === "LATTICE-WRAP-OK",
    entry_hash: row.entry_hash,
    position: row.position,
    target: row.target,
    spec: row.spec || LATTICE_SPEC,
    lattice: row.lattice,
    role: "primary",
    primary_target: PRIMARY_TARGET,
    secondary_target: SECONDARY_TARGET,
    secondary_on_this_worker: false,
    durable: durable === true,
    rebuilt_from_zero: false,
    lookup: "entry_hash",
    policy: latticePolicy(true),
  };
}

function parsePlanes(value) {
  if (value == null || value === "") return { ok: true, planes: AGGREGATE_PLANES.slice() };
  const list = Array.isArray(value)
    ? value.map((item) => String(item).trim())
    : String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  if (!list.length) return { ok: false, code: "LATTICE-PLANE" };
  for (const name of list) {
    if (!AGGREGATE_PLANES.includes(name)) return { ok: false, code: "LATTICE-PLANE", plane: name };
  }
  return { ok: true, planes: list };
}

function handlesFrom(rows) {
  const seen = [];
  for (const row of rows || []) {
    const names = [row && row.lattice && row.lattice.username, row && row.submitting_user];
    for (const name of names) {
      if (typeof name === "string" && LATTICE_USER_RE.test(name) && !seen.includes(name)) seen.push(name);
    }
  }
  return seen;
}

function safeNodeIds(list) {
  const ids = [];
  const source = Array.isArray(list) ? list : [];
  for (const node of source) {
    const id = node && typeof node.node_id === "string" ? node.node_id : "";
    if (!NODE_ID_RE.test(id)) continue;
    ids.push(id);
    if (ids.length >= ID_CAP) break;
  }
  return { ids, ids_complete: ids.length === source.length, roster_rows: source.length };
}

async function readMesh(env) {
  try {
    const { meshNodes } = await import("./mesh.js");
    const roster = await meshNodes({}, env);
    if (!roster || typeof roster !== "object") return { ok: false, code: "LATTICE-MESH-UNREADABLE" };
    return { ok: true, roster };
  } catch {
    return { ok: false, code: "LATTICE-MESH-UNREADABLE" };
  }
}

async function readUses(env) {
  try {
    const { peekHumanUses } = await import("./uses.js");
    const got = await peekHumanUses(env);
    if (!got || typeof got !== "object") return { ok: false, complete: false, uses: null, source: "unreadable" };
    return got;
  } catch {
    return { ok: false, complete: false, uses: null, source: "unreadable" };
  }
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function aggregatePlanes(env, rows, wanted) {
  const mesh = wanted.some((name) => name === "users" || name === "sites" || name === "nodes" || name === "node_mesh")
    ? await readMesh(env)
    : null;
  const uses = wanted.includes("uses") ? await readUses(env) : null;
  const roster = mesh && mesh.ok ? mesh.roster : null;
  const planes = {};

  if (wanted.includes("users")) {
    const meshKnown = Boolean(roster) && numberOrNull(roster.human_mesh_users) != null;
    planes.users = {
      ok: meshKnown,
      complete: meshKnown,
      live: false,
      human_mesh_users: meshKnown ? roster.human_mesh_users : null,
      lattice_handles: handlesFrom(rows),
      lattice_rows: Array.isArray(rows) ? rows.length : 0,
      ark_vaults_opened: false,
      legal_names: false,
      note: "Short lattice handles plus the mesh human count. ARK vaults stay sealed. Not a unique-person census.",
    };
  }

  if (wanted.includes("sites")) {
    const { SITE_LIVE_HOSTS, SITE_LIVE_EXCLUDED_HOSTS } = await import("./site-viewers.js");
    const known = Boolean(roster) && roster.site_live_viewers_complete === true && numberOrNull(roster.site_live_viewers) != null;
    planes.sites = {
      ok: known,
      complete: known,
      live: false,
      hosts: SITE_LIVE_HOSTS.slice(),
      excluded_hosts: SITE_LIVE_EXCLUDED_HOSTS.slice(),
      site_live_viewers: known ? roster.site_live_viewers : null,
      site_live_viewers_components: known && roster.site_live_viewers_components ? roster.site_live_viewers_components : null,
      site_live_viewers_pull: false,
      invent_viewers: false,
    };
  }

  if (wanted.includes("uses")) {
    const complete = Boolean(uses) && uses.complete === true && uses.uses_kv === true && Number.isSafeInteger(uses.uses) && uses.uses >= 0;
    planes.uses = {
      ok: complete,
      complete,
      live: false,
      uses: complete ? uses.uses : null,
      uses_kv: Boolean(uses && uses.uses_kv),
      source: uses && uses.source ? uses.source : "unreadable",
      note: uses && uses.note ? uses.note : "USES counter was not read. Nothing was invented.",
    };
  }

  if (wanted.includes("host_sites")) {
    const { ICANN_HUB_HOSTS, CAP7_PUBLIC_ICANN } = await import("./semantic-bridge.js");
    const hosts = ICANN_HUB_HOSTS.slice();
    const cap7IsIcann = CAP7_PUBLIC_ICANN === true;
    planes.host_sites = {
      ok: hosts.length === 4 && cap7IsIcann === false,
      complete: hosts.length === 4 && cap7IsIcann === false,
      live: false,
      hosts,
      public_icann: true,
      cap7_is_icann: cap7IsIcann,
      cap7_public_icann: cap7IsIcann,
      cap7_names_excluded: CAP7_NAMES.slice(),
      note: "Four ICANN hub websites. Cap-7 names are not these hosts and are not ICANN.",
    };
  }

  if (wanted.includes("access_points")) {
    const { CHANNEL_ORDER, RF_BANDS, SATELLITE_RELAY_SWITCH } = await import("./mesh-channel-plane.js");
    const points = CHANNEL_ORDER.map((id) => ({
      id,
      live: false,
      enabled: false,
      hardware: false,
      worker_hardware: false,
      transmit: false,
    }));
    const rfOn = Object.values(RF_BANDS).some((band) => band && band.enabled === true);
    const satOn = SATELLITE_RELAY_SWITCH.enabled === true || SATELLITE_RELAY_SWITCH.live === true;
    planes.access_points = {
      ok: points.length > 0 && rfOn === false && satOn === false,
      complete: points.length > 0 && rfOn === false && satOn === false,
      live: false,
      hardware: false,
      worker_hardware: false,
      spend: false,
      purchased: false,
      rf: false,
      sat: false,
      points,
      note: "Worker access-point cite. Radios stay off. RF and satellite stay off. Nothing is purchased.",
    };
  }

  if (wanted.includes("nodes")) {
    const ids = safeNodeIds(roster && roster.nodes);
    const humans = roster ? numberOrNull(roster.human_mesh_users) : null;
    const software = roster ? numberOrNull(roster.software_nodes) : null;
    const known = humans != null && software != null;
    planes.nodes = {
      ok: known && roster.nodes_complete === true,
      complete: known && roster.nodes_complete === true,
      live: false,
      human_mesh_users: humans,
      human_uses: roster && roster.human_uses_complete === true ? numberOrNull(roster.human_uses) : null,
      human_uses_complete: roster ? roster.human_uses_complete === true : false,
      software_nodes: software,
      instance_nodes: roster ? numberOrNull(roster.instance_nodes) : null,
      live_nodes: roster ? numberOrNull(roster.live_nodes) : null,
      roster_rows: ids.roster_rows,
      node_ids: ids.ids,
      node_ids_complete: known && ids.ids_complete,
      membership_changed: false,
      nodes_are_not_unique_humans: true,
    };
  }

  if (wanted.includes("node_mesh")) {
    const known = Boolean(roster) && typeof roster.enabled === "boolean";
    planes.node_mesh = {
      ok: known,
      complete: known,
      live: false,
      suite_presence_enabled: known ? roster.enabled === true : null,
      get_never_enables: true,
      mesh_enable_called: false,
      mesh_join_called: false,
      membership_changed: false,
      radios_changed: false,
      auto_update: false,
      rf: false,
      sat: false,
      cap7_is_icann: false,
      spend: false,
      live_nodes: roster ? numberOrNull(roster.live_nodes) : null,
      software_nodes: roster ? numberOrNull(roster.software_nodes) : null,
      note: "Read of the suite rollup. This door does not join, leave, enable, or disable the mesh.",
    };
  }

  const ordered = {};
  for (const name of AGGREGATE_PLANES) {
    if (planes[name]) ordered[name] = planes[name];
  }
  const ok = wanted.every((name) => ordered[name] && ordered[name].ok === true);
  return {
    ok,
    live: false,
    planes: wanted.slice(),
    spend: false,
    cap7_is_icann: false,
    auto_update: false,
    rf: false,
    sat: false,
    membership_changed: false,
    rebuilt_from_zero: false,
    ...ordered,
  };
}

async function readBody(request, enabled) {
  const capped = await readCappedBytes(request, BODY_CAP);
  if (!capped.ok) {
    return fail(413, capped.refuse && capped.refuse.code ? capped.refuse.code : "BODY_TOO_LARGE", {
      enabled,
      error: capped.refuse && capped.refuse.error,
    });
  }
  const parsed = parseJsonBytes(capped.bytes);
  if (!parsed.ok) return fail(400, "LATTICE-BODY", { enabled });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return fail(400, "LATTICE-BODY", { enabled });
  }
  const stats = jsonStructureStats(parsed.value);
  if (stats.too_deep || stats.too_wide) {
    const refuse = bodyTooDeepRefuse(stats);
    return fail(400, refuse.code || "BODY_TOO_DEEP", { enabled });
  }
  if (secretKey(parsed.value)) return { status: 400, body: { ...tokenBodyRefuse(), live: false, policy: latticePolicy(enabled), written: false } };
  return { ok: true, value: parsed.value };
}

async function appendWrap(env, body) {
  const entry_hash = typeof body.entry_hash === "string" ? body.entry_hash : "";
  if (!isHex64(entry_hash)) return fail(400, "LATTICE-DOCUMENT", { enabled: true, entry_hash: "" });
  const block = body.lattice;
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    return fail(400, "LATTICE-DOCUMENT", { enabled: true, entry_hash });
  }
  if (Object.prototype.hasOwnProperty.call(block, "position")) {
    return fail(400, "LATTICE-POSITION-INSIDE", { enabled: true, entry_hash });
  }
  if (block.document_hash !== entry_hash) return fail(400, "LATTICE-DOCUMENT", { enabled: true, entry_hash });
  if (body.spec != null && body.spec !== LATTICE_SPEC) return fail(400, "LATTICE-SPEC", { enabled: true, entry_hash });
  if (body.target != null && body.target !== PRIMARY_TARGET) {
    return fail(409, "LATTICE-SECONDARY-ELSEWHERE", { enabled: true, entry_hash, target: PRIMARY_TARGET });
  }
  if (block.offline === true) return fail(409, "LATTICE-PRIMARY-ONLINE", { enabled: true, entry_hash });
  if (block.spec != null && block.spec !== LATTICE_SPEC) return fail(400, "LATTICE-SPEC", { enabled: true, entry_hash });

  return withLock(env, async () => {
    const loaded = await loadRows(env);
    if (!loaded.ok) return fail(503, loaded.code, { enabled: true, entry_hash });
    const rows = loaded.rows;
    const prior = findRow(rows, entry_hash);
    const tied = await checkSubmittingTiebreak(block, body, rows, { replay: prior });
    if (!tied.ok) return fail(409, tied.code, { enabled: true, entry_hash, written: false });
    if (prior) {
      if (!sameBlock(prior, block, tied.username)) return fail(409, "LATTICE-DOUBLE", { enabled: true, entry_hash, written: false });
      return { status: 200, body: rowBody(prior, loaded.durable, "LATTICE-ALREADY") };
    }
    if (rows.length >= CHAIN_CAP) return fail(409, "LATTICE-CAP", { enabled: true, entry_hash });
    const position = rows.length + 1;
    if (body.position != null && Number(body.position) !== position) {
      return fail(409, "LATTICE-POSITION", { enabled: true, entry_hash, position });
    }
    const tips = latticeTips(rows);
    const reason = await checkLatticeRow(block, { primary: tips.primary || LATTICE_GENESIS, secondary: tips.secondary || LATTICE_GENESIS });
    if (reason) return fail(409, "LATTICE-VERIFY", { enabled: true, entry_hash, reason });
    const stored = {
      entry_hash,
      document_hash: entry_hash,
      target: PRIMARY_TARGET,
      offline: 0,
      position,
      spec: LATTICE_SPEC,
      lattice: block,
      ...(tied.username ? { submitting_user: tied.username } : {}),
    };
    const verified = await verifyLattice(rows.concat([stored]), { pick: latticeForChainWalk });
    if (!verified.ok) {
      const br = verified.breaks && verified.breaks[0] ? verified.breaks[0].reason : "verify";
      return fail(409, "LATTICE-VERIFY", { enabled: true, entry_hash, reason: br });
    }
    const saved = await saveRows(env, rows.concat([stored]), loaded);
    if (!saved.ok) return fail(503, saved.code, { enabled: true, entry_hash });
    const again = await loadRows(env);
    const pulled = again.ok ? findRow(again.rows, entry_hash) : null;
    if (!pulled || pulled.entry_hash !== entry_hash) {
      return fail(503, "LATTICE-PULL-MISS", { enabled: true, entry_hash, rebuilt_from_zero: false });
    }
    return { status: 201, body: rowBody(pulled, saved.durable, "LATTICE-WRAP-OK") };
  });
}

function publicLattice(block) {
  if (!block || typeof block !== "object") return block;
  const copy = { ...block };
  let changed = false;
  if (copy.username != null) {
    delete copy.username;
    changed = true;
  }
  if (copy.tiebreak && typeof copy.tiebreak === "object" && copy.tiebreak.username != null) {
    copy.tiebreak = { ...copy.tiebreak };
    delete copy.tiebreak.username;
    changed = true;
  }
  return changed ? copy : block;
}

function operatorGate(request, env) {
  const presented = extractRuntimeToken(request);
  if (!presented) return { ok: false, presented: false };
  if (requireTokenFlag(env) && !tokenConfigured(env)) {
    return { ok: false, presented: true, status: 503, code: "token_not_configured", error: "REQUIRE_TOKEN=1 but RUNTIME_TOKEN secret is missing" };
  }
  const secret = tokenSecret(env);
  if (!secret) return { ok: false, presented: true, status: 503, code: "token_not_configured", error: "RUNTIME_TOKEN secret is missing" };
  if (!timingSafeEqualString(presented, secret)) {
    return { ok: false, presented: true, status: 401, code: "token_mismatch", error: "runtime token mismatch" };
  }
  return { ok: true, presented: true };
}

function aggregateAuthRefuse(status, code, error) {
  return {
    ok: false,
    status,
    body: {
      ok: false,
      live: false,
      code,
      error,
      hint: "Authorization: Bearer … or X-Aziel-Runtime-Token",
      written: false,
      rebuilt_from_zero: false,
      username_listing: false,
      policy: latticePolicy(true),
    },
  };
}

/** Same operator header as REQUIRE_TOKEN=1. Aggregate never proceeds without it. */
function aggregateOperatorAuth(request, env) {
  if (requireTokenFlag(env) && !tokenConfigured(env)) {
    return aggregateAuthRefuse(503, "token_not_configured", "REQUIRE_TOKEN=1 but RUNTIME_TOKEN secret is missing");
  }
  const secret = tokenSecret(env);
  if (!secret) return aggregateAuthRefuse(503, "token_not_configured", "RUNTIME_TOKEN secret is missing");
  const presented = extractRuntimeToken(request);
  if (!presented) return aggregateAuthRefuse(401, "token_required", "runtime token required");
  if (!timingSafeEqualString(presented, secret)) return aggregateAuthRefuse(401, "token_mismatch", "runtime token mismatch");
  return { ok: true };
}

function aggregateRequested(source, url, entryHash) {
  if (!entryHash) return true;
  if (source && Object.prototype.hasOwnProperty.call(source, "planes")) return true;
  if (url.searchParams.has("planes")) return true;
  const agg = source && source.aggregate != null ? source.aggregate : url.searchParams.get("aggregate");
  return agg === true || agg === 1 || agg === "1" || agg === "true" || agg === "all";
}

async function pullEntry(env, entryHash, planes, revealUser) {
  if (!isHex64(entryHash)) return fail(400, "LATTICE-DOCUMENT", { enabled: true });
  const snap = await withLock(env, () => loadRows(env));
  if (!snap.ok) return fail(503, snap.code, { enabled: true, entry_hash: entryHash });
  const row = findRow(snap.rows, entryHash);
  if (!row) {
    return fail(404, "LATTICE-PULL-MISS", {
      enabled: true,
      entry_hash: entryHash,
      rebuilt_from_zero: false,
    });
  }
  const body = rowBody(row, snap.durable, "LATTICE-PULL-OK");
  if (revealUser && row.submitting_user) body.submitting_user = row.submitting_user;
  if (!revealUser) body.lattice = publicLattice(body.lattice);
  if (planes) body.aggregate = await aggregatePlanes(env, snap.rows, planes);
  return { status: 200, body };
}

export async function handleLatticeRemote(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path !== LATTICE_WRAP_PATH && path !== LATTICE_PULL_PATH) return null;
  if (tokenPresentedInQuery(request)) {
    return { status: 400, body: { ...tokenQueryRefuse(), live: false, policy: latticePolicy(latticeRemoteEnabled(env)), written: false } };
  }
  const enabled = latticeRemoteEnabled(env);
  if (!enabled) return fail(403, "LATTICE-REMOTE-OFF", { enabled: false });

  if (path === LATTICE_WRAP_PATH) {
    if (request.method !== "POST") return fail(405, "LATTICE-WRAP-POST", { enabled: true });
    const auth = sessionMutateAuth(request, env);
    if (!auth.ok) {
      return {
        status: auth.status || 401,
        body: { ...auth.body, live: false, policy: latticePolicy(true), written: false, rebuilt_from_zero: false },
      };
    }
    const body = await readBody(request, true);
    if (!body.ok) return body;
    return appendWrap(env, body.value);
  }

  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST") {
    return fail(405, "LATTICE-PULL-METHOD", { enabled: true });
  }
  let source = {};
  if (request.method === "POST") {
    const body = await readBody(request, true);
    if (!body.ok) return body;
    source = body.value;
  }
  const fromQuery = url.searchParams.get("entry_hash");
  const fromBody = source.entry_hash != null ? String(source.entry_hash) : "";
  if (fromQuery && fromBody && fromQuery !== fromBody) {
    return fail(400, "LATTICE-ENTRY-MISMATCH", { enabled: true });
  }
  const entryHash = fromQuery || fromBody;
  const wantsAggregate = aggregateRequested(source, url, entryHash);
  if (wantsAggregate) {
    const auth = aggregateOperatorAuth(request, env);
    if (!auth.ok) return { status: auth.status, body: auth.body };
  }
  let revealUser = wantsAggregate;
  if (!wantsAggregate) {
    const gate = operatorGate(request, env);
    if (gate.presented && !gate.ok) return aggregateAuthRefuse(gate.status, gate.code, gate.error);
    revealUser = gate.ok === true;
  }
  const planeRaw = source.planes != null ? source.planes : url.searchParams.has("planes") ? url.searchParams.get("planes") : null;
  const planes = wantsAggregate ? parsePlanes(planeRaw) : { ok: true, planes: null };
  if (!planes.ok) return fail(400, planes.code, { enabled: true, plane: planes.plane });
  if (!entryHash) {
    const snap = await withLock(env, () => loadRows(env));
    if (!snap.ok) return fail(503, snap.code, { enabled: true });
    const aggregate = await aggregatePlanes(env, snap.rows, planes.planes);
    if (!aggregate.ok) {
      return fail(503, "LATTICE-AGGREGATE-INCOMPLETE", { enabled: true, aggregate });
    }
    return {
      status: 200,
      body: {
        ok: true,
        live: false,
        code: "LATTICE-AGGREGATE",
        role: "primary",
        primary_target: PRIMARY_TARGET,
        secondary_target: SECONDARY_TARGET,
        secondary_on_this_worker: false,
        rebuilt_from_zero: false,
        policy: latticePolicy(true),
        aggregate,
      },
    };
  }
  return pullEntry(env, entryHash, wantsAggregate ? planes.planes : null, revealUser);
}

export function latticeRemoteOpenApiPaths() {
  const planeList = AGGREGATE_PLANES.join(", ");
  const shared =
    "Primary lattice on this Worker (aziel-runtime). Secondary is aziel-corpus and is not written here. " +
    "LATTICE_REMOTE defaults off (403 LATTICE-REMOTE-OFF). A missing entry_hash is 404 LATTICE-PULL-MISS and ok false. " +
    "live stays false. auto_update, RF, and sat stay off. Mesh membership is not changed. Cap-7 is not ICANN. No spend. " +
    "Not a Softwares card. Not an MCP tool. Operator token is header-only. " +
    "The primary chain is one JSON blob capped at " + CHAIN_CAP + " rows (LATTICE-CAP). Pull walks that blob by entry_hash and does not rebuild a ledger from zero. " +
    "This Worker accepts a submitting-user LATTICE-TIEBREAK-1.0 wrap. Offline secondary rows stay on aziel-corpus. " +
    "An entry_hash pull without the operator header strips offline usernames. The operator header may include them.";
  return {
    [LATTICE_WRAP_PATH]: {
      post: {
        operationId: "lattice_wrap",
        security: [{ RuntimeToken: [] }],
        summary: "Append one dual-lattice block onto the primary chain. Flag LATTICE_REMOTE must be on. Fail closed.",
        description:
          shared +
          " Body: { entry_hash, lattice, position, target: \"aziel-runtime\", spec: \"AZRT-DUAL-LATTICE-1.0\" }. " +
          "lattice.position is refused. Offline secondary rows stay on aziel-corpus (LATTICE-PRIMARY-ONLINE). " +
          "This primary accepts a submitting-user tie-break: send submitting_user or username with lattice.tiebreak. The tie-break username is that submitting user. " +
          "201 LATTICE-WRAP-OK. Replay of the same block is 200 LATTICE-ALREADY.",
        tags: ["lattice"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["entry_hash", "lattice"],
                properties: {
                  entry_hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
                  lattice: { type: "object" },
                  position: { type: "integer", minimum: 1 },
                  target: { type: "string", enum: [PRIMARY_TARGET] },
                  spec: { type: "string", enum: [LATTICE_SPEC] },
                  submitting_user: { type: "string", description: "Submitting user for a LATTICE-TIEBREAK-1.0 wrap. Alias: username." },
                  username: { type: "string", description: "Alias of submitting_user. Required with lattice.tiebreak." },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Appended. ok true, live false." },
          "200": { description: "Same block already stored. ok true, live false." },
          "400": { description: "Bad hash, body, or token in query/body." },
          "401": { description: "Operator token required." },
          "403": { description: "LATTICE-REMOTE off." },
          "409": { description: "Chain, position, double, offline secondary, cap " + CHAIN_CAP + ", or a tie-break that does not match the submitting user. A valid submitting-user tie-break is accepted. Nothing is written on refuse." },
          "503": { description: "Store unread or read-back miss. ok false." },
        },
      },
    },
    [LATTICE_PULL_PATH]: {
      get: {
        operationId: "lattice_pull",
        summary: "Pull one primary row by entry_hash. Aggregate planes require the operator header. Flag LATTICE_REMOTE must be on.",
        description:
          shared +
          " Query entry_hash alone returns that one row. Without the operator header, offline usernames are stripped. With Authorization: Bearer or X-Aziel-Runtime-Token, the row may include the submitting user. " +
          "planes (" +
          planeList +
          "), aggregate=1, or a pull with no entry_hash is an aggregate across users, sites, uses, host sites, access points, nodes, and the node mesh. " +
          "Aggregate requires Authorization: Bearer or X-Aziel-Runtime-Token, the same operator header REQUIRE_TOKEN=1 uses. " +
          "Unauthenticated aggregate fails closed and returns no username listing. A missing entry_hash row is 404 LATTICE-PULL-MISS. " +
          "An authenticated aggregate is 503 LATTICE-AGGREGATE-INCOMPLETE when a plane was not actually read.",
        tags: ["lattice"],
        parameters: [
          {
            name: "entry_hash",
            in: "query",
            required: false,
            schema: { type: "string", pattern: "^[a-f0-9]{64}$" },
            description: "SHA-256 document hash. Miss is 404 ok false.",
          },
          {
            name: "planes",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: planeList + ". Present only with the operator header. Lists no usernames when the header is missing.",
          },
          {
            name: "aggregate",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["1", "true", "all"] },
            description: "Ask for every plane. Requires the operator header.",
          },
        ],
        responses: {
          "200": { description: "One row, or an authenticated aggregate. live false. No public username list." },
          "400": { description: "Bad hash or unknown plane." },
          "401": { description: "Aggregate without the operator header. No username listing." },
          "403": { description: "LATTICE-REMOTE off." },
          "404": { description: "LATTICE-PULL-MISS. ok false." },
          "503": { description: "Token not configured, store unread, or aggregate plane unread. ok false. No username listing." },
        },
      },
      post: {
        operationId: "lattice_pull_post",
        summary: "Same pull as GET. Body may carry entry_hash and planes. Aggregate requires the operator header.",
        description:
          shared +
          " Body: { entry_hash?, planes?: string[], aggregate?: true }. Query entry_hash must match the body when both are set. " +
          "entry_hash alone is one row and lists no usernames. planes or a body with no entry_hash is an aggregate and requires the operator header. Unauthenticated aggregate fails closed.",
        tags: ["lattice"],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  entry_hash: { type: "string" },
                  planes: { type: "array", items: { type: "string", enum: AGGREGATE_PLANES.slice() } },
                  aggregate: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "One row, or an authenticated aggregate. live false. No public username list." },
          "400": { description: "Bad hash, body, or token in body." },
          "401": { description: "Aggregate without the operator header. No username listing." },
          "403": { description: "LATTICE-REMOTE off." },
          "404": { description: "LATTICE-PULL-MISS. ok false." },
          "503": { description: "Token not configured, store unread, or aggregate plane unread. ok false. No username listing." },
        },
      },
    },
  };
}

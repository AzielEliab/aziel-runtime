/**
 * Human-side interface orchestration (IFACE-ORCH-1.0).
 *
 * The human UI is this runtime, not a separate AZInterface product.
 * VeilLock's veillock-runtime-ui-1 contract is read here. Safe calls
 * describe / join_plan / engulf_plan / status_report / runtime_ui do not
 * launch, join, register a camera, return a key, lift a veil, or append
 * the public ACT-RECEIPT chain.
 *
 * Seal is explicit (confirm true). It mints the same four receipt fields
 * (hash, request, output, event) and attempt ids. Public append uses the
 * existing fail-open path. A sealed VeilLock plan still does not run the
 * local desk. A sealed live Software op dispatches only through FragGate.
 *
 * tools/list is unchanged. Agents use JSON-RPC method interface/orchestrate
 * on POST /mcp, the same body as POST /v1/interface.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LEARNER_CALLS,
  LEARNER_GUIDE_CALL,
  guideAzai,
  WORKER_CALLS,
  buildLearningNotes,
  learnerBody,
  matchingPlan,
  operatorLearningNote,
  recallLearningNotes,
  resetAiDesks,
  storeLearningNotes,
  workerHandoff,
  workerIntake,
  workerPlan,
  workerStatus,
} from "./ai-desks.js";
import { LIVE_LIBRARY_INDEX } from "./engines/aziel-corpus/tip-pack.js";
import { LIVE_OPS } from "./fraggate/registry.js";
import {
  appendActReceipt,
  fetchCorpusTip,
  isEmptyActTipHash,
  mintActReceipt,
  receiptAppendToken,
} from "./library-receipts.js";
import { isTruthyFlag } from "./mcp-safeguard.js";
import { normalizeAttemptLink } from "./receipt-attempt.js";
import { sealAdaptive } from "./jeeves-adapt.js";
import { askJeevesHelp, JEEVES_HELP_CALL } from "./jeeves-desk.js";
import { RUNTIME_VERSION } from "./runtime-api.js";
import { ZERO_HASH } from "./session-core.js";

export const INTERFACE_SPEC = "IFACE-ORCH-1.0";
export const VEILLOCK_UI_SCHEMA = "veillock-runtime-ui-1";
export const INTERFACE_AUTHOR = "Aziel Eliab";
export const INTERFACE_MCP_METHOD = "interface/orchestrate";
export const INTERFACE_LEDGER_CAP = 128;

export const VEILLOCK_SAFE_CALLS = Object.freeze([
  "describe",
  "join_plan",
  "engulf_plan",
  "status_report",
  "runtime_ui",
]);

export const HOST_READ_CALLS = Object.freeze(["mesh_awareness", "forensic_tip", "plan", JEEVES_HELP_CALL, LEARNER_GUIDE_CALL]);

export const INTERFACE_CALLS = Object.freeze([
  ...VEILLOCK_SAFE_CALLS,
  ...HOST_READ_CALLS,
  ...WORKER_CALLS,
  ...LEARNER_CALLS,
  "seal",
]);

const VEILLOCK_CALL_PIN = Object.freeze(["wrap", "engulf", "join", "link", "play", "record", "status"]);

function veilContractDrift() {
  const names = Object.keys(VEILLOCK_RUNTIME_UI.calls);
  return names.length !== VEILLOCK_CALL_PIN.length || names.some((name, index) => name !== VEILLOCK_CALL_PIN[index]);
}

const LOCAL_COMMANDS = new Set(["wrap", "engulf", "join", "link", "play", "record", "inject", "intercept", "facetime"]);

const PLATFORMS = new Set(["linux", "windows", "darwin", "ios", "android", "chromium", "firefox", "safari"]);

const CONTROL = /[\u0000-\u001f\u007f]/;
const SHELL = /[;&|$`<>(){}]/;
const VIDEO = /^\/dev\/video[0-9]{1,3}$/;
const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const OP_RE = /^[a-z0-9_-]{1,80}$/;

const SECRET_KEY = /^(key|keys|secret|secrets|token|password|passphrase|passcode|passwd|pwd|private_key|argv|env|authorization|api_key|session_key|call_key|credential|credentials|bearer)$/i;

/** Software contract as handed off. Host overlay is applied on read. */
export const VEILLOCK_RUNTIME_UI = Object.freeze({
  schema: VEILLOCK_UI_SCHEMA,
  product: "veillock",
  title: "VeilLock",
  author: INTERFACE_AUTHOR,
  identity: "Aziel Eliab only",
  lamb_lens: ["Service", "Clarity", "Peace"],
  human_ui: "aziel-runtime",
  human_ui_repo: "https://github.com/AzielEliab/aziel-runtime",
  human_ui_catalog: "https://aziel-runtime.vibelock.workers.dev/v1/software",
  software_slug: "veillock",
  catalog_status: "local_only",
  public_door_ops: [],
  local_only: true,
  separate_azinterface_product: false,
  handoff:
    "The human side is aziel-runtime. Its software card for slug veillock is local_only and the public door lists no ops. Cross-updates should read this contract and open the local desk. This file does not boot that UI, does not add public door ops, and does not append the public receipt chain.",
  desk: {
    launch: ["veillock", "ui"],
    url: "http://127.0.0.1:8761/",
    bind: "127.0.0.1",
    port: 8761,
    status: "GET /api/status",
  },
  calls: {
    wrap: { command: ["veillock", "wrap", "--mic"], aes_256_gcm: false, effect: "local veil or keyed scramble" },
    engulf: { command: ["veillock", "engulf", "--"], launches: "cli-only", plan_returns_argv: false },
    join: { command: ["veillock", "join"], joins_call: false },
    link: { command: ["veillock", "link"], aes_256_gcm: true },
    play: { command: ["veillock", "play"], aes_256_gcm: true, plaintext_file: false },
    record: { command: ["veillock", "record"], aes_256_gcm: true, key_in_file: false },
    status: { local: ["veillock", "azos"], http: "GET /api/status", lifts_veil: false },
  },
  honesty: {
    aes_on_call_path: false,
    recording_aes_256_gcm: true,
    call_video: "keyed scramble, not AES-256-GCM",
    e2e: "veillock link and Chromium encoded frames are AES-256-GCM between VeilLock peers",
    join_does_not_join_the_call: true,
    engulf_plan_does_not_launch: true,
    increments_downloads: false,
    hosted_worker_does_not_register_a_camera: true,
  },
  receipts: {
    spec: "ACT-RECEIPT-1.0",
    writes_public_chain: false,
    public_chain: "https://www.azielcorpuslibrary.net/receipts",
    fields_owned_by_runtime: ["hash", "request", "output", "event"],
    attempt_fields_filled_by_runtime: ["request_id", "attempt_n", "parent_receipt_id", "correlation_id"],
    local_consent_fields: [
      "ok",
      "product",
      "azos_hook",
      "overlay",
      "veil",
      "obfuscate",
      "obfuscation_on",
      "call_accepted",
      "reason",
      "actor",
      "call_id",
      "kernel",
      "kills_caller_os",
    ],
    note: "Hosted /v1/call-accept and the local AZ-OS hook keep the consent fields above. A later aziel-runtime append may hash a VeilLock plan as output. VeilLock does not mint hash, request_id, or parent_receipt_id. An empty public tip is not success. Fail-open append-skip belongs to aziel-runtime, not this package.",
  },
  safe_calls: VEILLOCK_SAFE_CALLS.slice(),
});

const ledger = [];
/** request_id → last ACT hash actually appended to the public chain. */
const publishedByRequest = new Map();

export function resetInterfaceLedger() {
  ledger.length = 0;
  publishedByRequest.clear();
  resetAiDesks();
}

export function interfaceLedgerSnapshot() {
  return ledger.map((row) => ({
    hash: row.hash,
    request: row.request,
    output: row.output,
    event: row.event,
    previous_hash: row.previous_hash,
  }));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function closed(extra = {}) {
  return {
    executed: false,
    joined_call: false,
    registered_camera: false,
    returns_argv: false,
    returns_key: false,
    lifts_veil: false,
    writes_recording: false,
    plaintext_file: false,
    aes_on_call_path: false,
    increments_downloads: false,
    writes_public_chain: false,
    launched: false,
    boots_local_desk: false,
    separate_azinterface_product: false,
    ...extra,
  };
}

function fail(status, code, error, extra = {}) {
  return {
    status,
    body: closed({
      ok: false,
      code,
      error,
      spec: INTERFACE_SPEC,
      author: INTERFACE_AUTHOR,
      identity: "Aziel Eliab only",
      lamb_lens: ["Service", "Clarity", "Peace"],
      sealed: false,
      published: false,
      ...extra,
    }),
  };
}

function walkSecrets(value, path = "$") {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = walkSecrets(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const key of Object.keys(value)) {
    if (SECRET_KEY.test(key)) return `${path}.${key}`;
    const hit = walkSecrets(value[key], `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}

function oneLine(value, limit, field) {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string" && typeof value !== "number") {
    return { ok: false, error: `${field} must be one short line` };
  }
  const text = String(value).trim();
  if (!text) return { ok: true, value: null };
  if (CONTROL.test(text) || text.length > limit) {
    return { ok: false, error: `${field} must be one short line` };
  }
  return { ok: true, value: text };
}

function token(value, field, limit = 120) {
  const line = oneLine(value, limit, field);
  if (!line.ok || line.value == null) return line;
  if (SHELL.test(line.value) || line.value.startsWith("-") || line.value.split("/").includes("..")) {
    return { ok: false, error: `${field} must be a single program or profile name` };
  }
  return line;
}

function platformOf(value) {
  const line = oneLine(value, 32, "platform");
  if (!line.ok || line.value == null) return line;
  const plat = line.value.toLowerCase();
  if (!PLATFORMS.has(plat)) return { ok: false, error: "unknown platform" };
  return { ok: true, value: plat };
}

function videoDevice(value) {
  if (value == null || value === "") return { ok: true, value: null };
  const line = oneLine(value, 16, "video_device");
  if (!line.ok) return line;
  if (!VIDEO.test(line.value)) return { ok: false, error: "video_device must be a /dev/videoN node" };
  return { ok: true, value: line.value, opened: false };
}

function windowsBuild(value) {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value === "boolean" || typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, error: "windows_build must be an integer" };
  }
  if (value < 0 || value > 300000) return { ok: false, error: "windows_build is out of range" };
  return { ok: true, value };
}

function priorFor(requestId) {
  if (!requestId) return null;
  for (let i = ledger.length - 1; i >= 0; i--) {
    const event = ledger[i] && ledger[i].event;
    if (event && event.request_id === requestId) return ledger[i];
  }
  return null;
}

function hostOverlay() {
  return {
    built: true,
    mcp: true,
    node_mesh: true,
    node_mesh_means: "awareness-only",
    mesh_joined: false,
    roster_read: false,
    suite_json_pulled: false,
    remote_contract: "not-fetched",
    contract_drift: veilContractDrift(),
    forensic: true,
    tools_list_unchanged: true,
    mcp_method: INTERFACE_MCP_METHOD,
    http: "POST /v1/interface",
    human_pane: "/workspace#interface-panel",
    software_contract_said_built: false,
    note: "This host reads describe, join_plan, engulf_plan, status_report, and runtime_ui. Those calls do not launch, join, register a camera, return a key, lift the veil, or append the public ACT-RECEIPT chain. Seal with confirm true is the receipt path. Live Software dispatch goes through FragGate only.",
  };
}

export function runtimeUiDocument() {
  const tile = clone(VEILLOCK_RUNTIME_UI);
  tile.present_on_host = true;
  tile.boots_local_desk = false;
  tile.launches_local_desk = false;
  tile.entries = ["wrap", "engulf", "join", "link", "play", "record"];
  tile.host_calls = INTERFACE_CALLS.slice();
  tile.orchestration_host = hostOverlay();
  tile.spec = INTERFACE_SPEC;
  tile.runtime_version = RUNTIME_VERSION;
  return closed({
    ok: true,
    call: "runtime_ui",
    schema: VEILLOCK_UI_SCHEMA,
    human_ui: "aziel-runtime",
    local_only: true,
    public_door_ops: [],
    author: INTERFACE_AUTHOR,
    identity: "Aziel Eliab only",
    lamb_lens: ["Service", "Clarity", "Peace"],
    contract: tile,
  });
}

export function forensicTip() {
  const tip = ledger.length ? ledger[ledger.length - 1] : null;
  return closed({
    ok: true,
    call: "forensic_tip",
    spec: INTERFACE_SPEC,
    author: INTERFACE_AUTHOR,
    identity: "Aziel Eliab only",
    store: "isolate-memory",
    durable: false,
    rewrite_key: false,
    court_filing: false,
    forensic_finding: false,
    audit_trail: true,
    count: ledger.length,
    cap: INTERFACE_LEDGER_CAP,
    tip_hash: tip ? tip.hash : ZERO_HASH,
    empty_tip_is_not_success: !tip,
    public_chain: "https://www.azielcorpuslibrary.net/receipts",
    fields: ["hash", "request", "output", "event"],
  });
}

function meshAwarenessBody() {
  return closed({
    ok: true,
    call: "mesh_awareness",
    spec: "QNM-BUILD-1.0",
    author: INTERFACE_AUTHOR,
    identity: "Aziel Eliab only",
    joined: false,
    heartbeat: false,
    left: false,
    radios_changed: false,
    live_nodes_changed: false,
    downloads_changed: false,
    roster_read: false,
    get_never_enables: true,
    suite_presence_default: "on",
    public_disable: "MESH-DISABLE-REFUSED",
    node_id_rule: "8-80 [a-z0-9._-]",
    presence: ["live", "locked", "isolated"],
    ttl_ms: 5 * 60 * 1000,
    product_required_to_join: true,
    note: "Awareness only. This call did not join, heartbeat, leave, enable, or read the live roster. Live Nodes math is unchanged.",
  });
}

async function remember(call, status, requestSentence, outputSentence, link, sealed) {
  if (ledger.length >= INTERFACE_LEDGER_CAP) {
    return { ok: false, code: "IF-LEDGER-FULL", error: "Interface audit ledger is full. Nothing was dropped or rewritten." };
  }
  const previous = ledger.length ? ledger[ledger.length - 1].hash : ZERO_HASH;
  const event = {
    surface: "interface",
    path: "/v1/interface",
    method: "POST",
    status,
    tool: String(call || "").slice(0, 80),
    spec: "ACT-RECEIPT-1.0",
    runtime_version: RUNTIME_VERSION,
    request_id: link.request_id,
    attempt_n: link.attempt_n,
    parent_receipt_id: link.parent_receipt_id,
    correlation_id: link.correlation_id,
    outcome: link.outcome,
  };
  const receipt = await mintActReceipt({
    previous_hash: previous,
    request: requestSentence,
    output: outputSentence,
    event,
  });
  const row = {
    hash: receipt.hash,
    request: receipt.request,
    output: receipt.output,
    event: receipt.event,
    previous_hash: receipt.previous_hash,
    sealed: sealed === true,
    call,
  };
  ledger.push(row);
  return { ok: true, receipt: row };
}

function attemptFrom(input, outcome) {
  const norm = normalizeAttemptLink(
    { ...(input || {}), outcome: input && input.outcome ? input.outcome : outcome },
    { generate: true, defaultOutcome: outcome },
  );
  if (!norm.ok) return norm;
  const prior = priorFor(norm.request_id);
  if (prior && !norm.attempt_supplied) {
    const prevN = Number(prior.event && prior.event.attempt_n);
    norm.attempt_n = Number.isInteger(prevN) && prevN >= 1 ? prevN + 1 : 2;
  }
  if (prior && !norm.parent_supplied) {
    norm.parent_receipt_id = prior.hash || null;
  }
  return norm;
}

function receiptView(row, published, chain) {
  if (!row) return null;
  return {
    hash: row.hash,
    request: row.request,
    output: row.output,
    event: row.event,
    previous_hash: row.previous_hash,
    spec: "ACT-RECEIPT-1.0",
    chain: chain || "isolate-memory",
    sealed: row.sealed === true,
    writes_public_chain: published === true,
    published: published === true,
    court_filing: false,
    forensic_finding: false,
    rewrite_key: false,
  };
}

/**
 * Public ACT copy. previous_hash is the corpus tip, never the isolate ledger.
 * parent_receipt_id is the last public hash for this request_id, or null.
 * A plan row that was not appended is not named as a public parent.
 */
async function publishSealedReceipt(env, localReceipt, fetchImpl) {
  const tip = await fetchCorpusTip(env, fetchImpl);
  if (!tip.ok) {
    return {
      published: false,
      appendRefuse: tip.fail_open ? "corpus-unreachable" : "corpus-dark",
      publicReceipt: null,
      publicTipEmpty: true,
    };
  }
  const event = { ...(localReceipt.event || {}) };
  const priorPublic = event.request_id ? publishedByRequest.get(event.request_id) : null;
  event.parent_receipt_id = priorPublic || null;
  const publicReceipt = await mintActReceipt({
    previous_hash: tip.hash,
    request: localReceipt.request,
    output: localReceipt.output,
    event,
  });
  const appended = await appendActReceipt(env, publicReceipt, fetchImpl);
  const published = appended.published === true;
  if (published && event.request_id) publishedByRequest.set(event.request_id, publicReceipt.hash);
  return {
    published,
    appendRefuse: published ? null : appended.refuse || "append-skipped",
    publicReceipt: published ? publicReceipt : null,
    publicTipEmpty: isEmptyActTipHash(tip.hash),
  };
}

function reconcileSealOutcome(link, door) {
  if (door && door.ran) {
    const honest = door.ok === true && door.code === "FG-OK" ? "completed" : "failed";
    if (honest === "failed" && link.outcome === "retry") return "retry";
    return honest;
  }
  if (link.outcome_supplied && (link.outcome === "failed" || link.outcome === "retry")) return link.outcome;
  return "completed";
}

async function finishAdaptive(done, env) {
  if (!done || !done.body || !done.body.adaptive || done.body.adaptive.stored !== true) return done;
  const hash = done.body.receipt && done.body.receipt.hash;
  const sealed = await sealAdaptive(env, hash);
  if (sealed.ok) done.body.adaptive.receipt_hash = sealed.receipt_hash;
  return done;
}

async function finish(call, status, link, requestSentence, outputSentence, body, opts, sealed) {
  const kept = await remember(call, status, requestSentence, outputSentence, link, sealed);
  if (!kept.ok) return fail(503, kept.code, kept.error);
  let published = false;
  let appendRefuse = null;
  let publicReceipt = null;
  let publicTipEmpty = null;
  if (sealed && receiptAppendToken(opts.env)) {
    const pub = await publishSealedReceipt(opts.env, kept.receipt, opts.fetchImpl || fetch);
    published = pub.published === true;
    appendRefuse = pub.appendRefuse;
    publicReceipt = pub.publicReceipt;
    publicTipEmpty = pub.publicTipEmpty === true;
  } else if (sealed) {
    appendRefuse = "no-token";
  }
  return {
    status,
    body: {
      ...body,
      ok: body.ok !== false && status < 400,
      spec: INTERFACE_SPEC,
      author: INTERFACE_AUTHOR,
      identity: "Aziel Eliab only",
      lamb_lens: ["Service", "Clarity", "Peace"],
      request_id: link.request_id,
      attempt_n: link.attempt_n,
      parent_receipt_id: link.parent_receipt_id,
      correlation_id: link.correlation_id,
      outcome: link.outcome,
      receipt: receiptView(kept.receipt, false, "isolate-memory"),
      public_receipt: publicReceipt ? receiptView(publicReceipt, true, "act-public") : null,
      sealed: sealed === true,
      published,
      writes_public_chain: published === true,
      append_refuse: appendRefuse,
      public_tip_empty: publicTipEmpty,
      parent_on_public_chain: !!(publicReceipt && publicReceipt.event && publicReceipt.event.parent_receipt_id),
      audit_trail: true,
      forensic_finding: false,
      court_filing: false,
      store: "isolate-memory",
      durable: false,
      rewrite_key: false,
    },
  };
}

function liveDispatch(slug, op) {
  if (!slug) return { ok: true, would: false, local_only: false, reason: "no-slug" };
  if (!SLUG_RE.test(slug)) return { ok: false, error: "slug must be a catalog slug" };
  if (slug === "veillock") return { ok: true, would: false, local_only: true, reason: "local-only" };
  if (!LIVE_OPS[slug]) return { ok: true, would: false, local_only: false, reason: "not-on-public-door" };
  if (!op) return { ok: true, would: false, local_only: false, reason: "no-op" };
  if (!OP_RE.test(op)) return { ok: false, error: "op must be a single operation name" };
  if (!LIVE_OPS[slug].includes(op)) return { ok: true, would: false, local_only: false, reason: "op-not-live" };
  return { ok: true, would: true, local_only: false, slug, op };
}

async function runAiDesk(call, input, link, opts) {
  if (isTruthyFlag(input.dry_run)) {
    return fail(400, "IF-CONFIRM-REQUIRED", "Dry run stored nothing and dispatched nothing.", { call, dry_run: true });
  }
  if (WORKER_CALLS.includes(call)) {
    const built =
      call === "worker_intake"
        ? workerIntake(input)
        : call === "worker_plan"
          ? workerPlan(input)
          : call === "worker_status"
            ? workerStatus()
            : workerHandoff(input);
    if (!built.ok) return fail(built.status, built.code, built.error, { call });
    return finish(call, 200, link, `AZBot ${call}.`, built.output, built.body, opts, false);
  }
  if (call === "learner_recall") {
    const query = input.q || input.query || input.task || "";
    const found = recallLearningNotes(query);
    let akm = { attempted: false, reason: "confirm required" };
    if (isTruthyFlag(input.confirm)) {
      akm = await recallAkm(opts, query);
    }
    return finish(
      call,
      200,
      link,
      "AZAI recalled local learning notes.",
      `Learner recall returned ${found.length} cited notes. Belief is not truth.`,
      learnerBody(call, { query: query || null, notes: found, count: found.length, akm }),
      opts,
      false,
    );
  }
  const pull = await liveLearningPull(input, opts);
  const built = await buildLearningNotes(input, interfaceLedgerSnapshot(), pull);
  if (!built.ok) return fail(built.status, built.code, built.error, { call });
  const stored = await storeLearningNotes(built);
  if (!stored.ok) return fail(stored.status, stored.code, stored.error, { call });
  let memory = { attempted: false, reason: "confirm required", writes_public_chain: false };
  if (isTruthyFlag(input.confirm)) {
    const subject = operatorLearningNote(stored.notes, input);
    memory = subject
      ? await observeLearning(opts, subject)
      : { attempted: false, reason: "no-operator-subject", writes_public_chain: false };
  }
  return finish(
    call,
    200,
    link,
    "AZAI stored cited learning notes.",
    `Learner stored ${stored.notes.length} cited notes. The public chain was not appended.`,
    learnerBody(call, {
      notes: stored.notes,
      note_count: stored.notes.length,
      pins_supplied: built.pins_supplied,
      memory,
      pins_read: pull.flags.pins_read,
      mesh_read: pull.flags.mesh_read,
      corpus_searched: pull.flags.corpus_searched,
      pull: { attempted: pull.attempted, reasons: pull.reasons },
      sources: ["domain", "paper", "software", "receipt", "pin", "aznet", "vibelock"],
    }),
    opts,
    false,
  );
}

async function searchCorpusIndex(fetchImpl, query) {
  const source = LIVE_LIBRARY_INDEX;
  try {
    const res = await fetchImpl(source, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res || !res.ok) return { corpus_searched: false, count: 0, record_ids: [], reason: "http-error", source };
    const json = await res.json().catch(() => null);
    const bucket = Array.isArray(json)
      ? json
      : json && (json.records || json.items || json.documents || json.entries || (Array.isArray(json.hits) ? json.hits : json.hits && json.hits.hits));
    if (!Array.isArray(bucket)) return { corpus_searched: false, count: 0, record_ids: [], reason: "inventory-unparsed", source };
    const q = String(query || "").trim().toLowerCase();
    const record_ids = [];
    let count = 0;
    for (const row of bucket) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const id = row.record_id || row.id;
      const title = typeof row.title === "string" ? row.title : "";
      if (q && !`${id || ""} ${title}`.toLowerCase().includes(q)) continue;
      count += 1;
      if (id && record_ids.length < 8) record_ids.push(String(id).slice(0, 80));
    }
    return { corpus_searched: true, count, record_ids, reason: null, source };
  } catch {
    return { corpus_searched: false, count: 0, record_ids: [], reason: "unreachable", source };
  }
}

async function liveLearningPull(input, opts) {
  const flags = { pins_read: false, mesh_read: false, corpus_searched: false };
  const cites = [];
  const reasons = [];
  const asked = isTruthyFlag(input.read_pins) || isTruthyFlag(input.read_mesh) || isTruthyFlag(input.search_corpus);
  if (!asked) return { attempted: false, flags, cites, reasons };
  if (isTruthyFlag(input.read_pins)) {
    if (typeof opts.dispatch !== "function") {
      reasons.push("pins-unbound");
    } else {
      let envelope = null;
      try {
        envelope = await opts.dispatch({ slug: "4dmap", op: "card_list", payload: {} });
      } catch {
        envelope = { ok: false, code: "IF-DISPATCH-ERROR" };
      }
      const result = envelope && envelope.result && typeof envelope.result === "object" ? envelope.result : null;
      const ok = !!(envelope && envelope.ok === true && envelope.code === "FG-OK" && result && result.ok !== false);
      flags.pins_read = ok;
      const cards = ok && Array.isArray(result.cards) ? result.cards : [];
      const pinIds = [];
      for (const card of cards) {
        if (!card || typeof card !== "object") continue;
        const id = card.card_id || card.pin_id || card.id;
        if (typeof id === "string" && id) pinIds.push(id.slice(0, 80));
        if (pinIds.length >= 8) break;
      }
      cites.push({ kind: "4dmap", source: "4dmap/card_list", pins_read: ok, count: ok ? cards.length : 0, pin_ids: ok ? pinIds : [] });
      if (!ok) reasons.push(envelope && envelope.code ? String(envelope.code) : "pins-unread");
    }
  }
  if (isTruthyFlag(input.read_mesh)) {
    let roster = null;
    try {
      const read = opts.meshRead || (async (env) => {
        const { meshNodes } = await import("./mesh.js");
        return meshNodes({}, env || {});
      });
      roster = await read(opts.env || {});
    } catch {
      roster = null;
    }
    const nodes = roster && Array.isArray(roster.nodes) ? roster.nodes : null;
    const ok = !!(roster && roster.ok !== false && nodes);
    flags.mesh_read = ok;
    cites.push({ kind: "mesh", source: "mesh_nodes", mesh_read: ok, count: ok ? nodes.length : 0 });
    if (!ok) reasons.push("mesh-unread");
  }
  if (isTruthyFlag(input.search_corpus)) {
    const corpus = await searchCorpusIndex(opts.fetchImpl || fetch, input.q || input.query || "");
    flags.corpus_searched = corpus.corpus_searched;
    cites.push({
      kind: "corpus",
      source: corpus.source,
      corpus_searched: corpus.corpus_searched,
      count: corpus.count,
      record_ids: corpus.record_ids,
      reason: corpus.reason,
    });
    if (!flags.corpus_searched) reasons.push(corpus.reason || "corpus-unsearched");
  }
  return { attempted: true, flags, cites, reasons };
}

async function observeLearning(opts, note) {
  if (!note) return { attempted: false, reason: "no-note", writes_public_chain: false };
  try {
    const observe = opts.observeImpl || (await import("./memory.js")).observe;
    const result = await observe(opts.env || {}, {
      subject: "azai-learn",
      fact: String(note.text || "").slice(0, 160),
      provenance_hash: note.cite_hash,
    });
    const code = result && (result.code || result.refuse) ? String(result.code || result.refuse) : null;
    return {
      attempted: true,
      ok: !!(result && result.ok !== false && !result.refuse),
      code,
      belief_is_not_truth: true,
      writes_public_chain: false,
    };
  } catch {
    return { attempted: true, ok: false, code: "IF-MEMORY-REFUSED", writes_public_chain: false };
  }
}

async function recallAkm(opts, query) {
  try {
    const recall = opts.recallImpl || (await import("./memory.js")).adaptiveRecall;
    const result = await recall(opts.env || {}, { q: query });
    const code = result && (result.code || result.refuse) ? String(result.code || result.refuse) : null;
    return {
      attempted: true,
      ok: !!(result && result.ok === true),
      code,
      count: result && Number.isFinite(result.count) ? result.count : 0,
      belief_is_not_truth: true,
      authorizes_action: false,
    };
  } catch {
    return { attempted: true, ok: false, code: "IF-MEMORY-REFUSED", belief_is_not_truth: true, authorizes_action: false };
  }
}

export async function orchestrate(input, opts = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail(400, "IF-BAD-INPUT", "Body must be a JSON object.");
  }
  const secret = walkSecrets(input);
  if (secret) {
    return fail(400, "IF-SECRET-REFUSED", "Secret-shaped fields are refused. Nothing was stored.");
  }

  const callRaw = input.call == null || input.call === "" ? "runtime_ui" : input.call;
  if (typeof callRaw !== "string") return fail(400, "IF-BAD-INPUT", "call must be a string.");
  const call = callRaw.trim();
  if (LOCAL_COMMANDS.has(call)) {
    return fail(400, "IF-LOCAL-COMMAND", "That name is a local VeilLock command. This host did not run it.", { call });
  }
  if (!INTERFACE_CALLS.includes(call)) {
    return fail(400, "IF-UNKNOWN-CALL", "Unknown interface call. Nothing ran.", { call });
  }

  const link = attemptFrom(input, call === "seal" ? "completed" : "completed");
  if (!link.ok) return fail(link.status || 400, "IF-BAD-ATTEMPT", link.error);

  const plat = platformOf(input.platform);
  if (!plat.ok) return fail(400, "IF-BAD-INPUT", plat.error);
  const app = token(input.app || input.process, "app");
  if (!app.ok) return fail(400, "IF-BAD-INPUT", app.error);
  const url = oneLine(input.url, 2000, "url");
  if (!url.ok) return fail(400, "IF-BAD-INPUT", url.error);
  const video = videoDevice(input.video_device);
  if (!video.ok) return fail(400, "IF-BAD-INPUT", video.error);
  const build = windowsBuild(input.windows_build);
  if (!build.ok) return fail(400, "IF-BAD-INPUT", build.error);

  const capabilityIgnored =
    input.have_vcam != null || input.have_bwrap != null || input.opens_v4l2 != null || input.sandboxed != null;

  if (call === "forensic_tip") {
    const tip = forensicTip();
    tip.note = "tip_hash is the tip before this read is stored. receipt.hash is the new local row. The public chain was not appended.";
    return finish(call, 200, link, "Interface read the local audit tip.", "Local audit tip returned. The public chain was not appended.", tip, opts, false);
  }

  if (call === "runtime_ui") {
    const doc = runtimeUiDocument();
    return finish(
      call,
      200,
      link,
      "Interface returned the VeilLock runtime UI contract.",
      "Runtime UI contract returned. The local desk was not booted.",
      doc,
      opts,
      false,
    );
  }

  if (call === "mesh_awareness") {
    return finish(
      call,
      200,
      link,
      "Interface recorded mesh awareness.",
      "Mesh awareness recorded. The roster was not read and no node was joined.",
      meshAwarenessBody(),
      opts,
      false,
    );
  }

  if (call === LEARNER_GUIDE_CALL) {
    const guided = await guideAzai(input, opts.env);
    if (!guided.ok) return fail(guided.status, guided.code, guided.error, { call });
    const dry = isTruthyFlag(input.dry_run);
    const body = closed({
      ...guided.body,
      call: LEARNER_GUIDE_CALL,
      dry_run: dry,
      confirm_ignored: isTruthyFlag(input.confirm),
      dispatched_fraggate: false,
      writes_public_chain: false,
      stored_notes: false,
    });
    if (dry) {
      return {
        status: 200,
        body: {
          ...body,
          ok: true,
          spec: INTERFACE_SPEC,
          author: INTERFACE_AUTHOR,
          identity: "Aziel Eliab only",
          receipt: null,
          sealed: false,
          published: false,
          stored: false,
          store: "none",
          durable: false,
          writes_public_chain: false,
          note: "Dry run stored nothing.",
        },
      };
    }
    return finishAdaptive(
      await finish(call, 200, link, "AZAI guided from the corpus and this build.", guided.output, body, opts, false),
      opts.env,
    );
  }

  if (call === JEEVES_HELP_CALL) {
    const help = await askJeevesHelp(input, opts.env);
    if (help.status === 400) return fail(400, "IF-BAD-INPUT", help.error || "question required", { call });
    const dry = isTruthyFlag(input.dry_run);
    const body = closed({
      ...help,
      call: JEEVES_HELP_CALL,
      dry_run: dry,
      dispatched_fraggate: false,
      second_door: false,
      software_tab: false,
      writes_public_chain: false,
    });
    if (dry) {
      return {
        status: 200,
        body: {
          ...body,
          ok: help.ok !== false,
          spec: INTERFACE_SPEC,
          author: INTERFACE_AUTHOR,
          identity: "Aziel Eliab only",
          receipt: null,
          sealed: false,
          published: false,
          stored: false,
          store: "none",
          durable: false,
          writes_public_chain: false,
          note: "Dry run stored nothing.",
        },
      };
    }
    const output = help.answer ? String(help.answer).slice(0, 240) : "Ask Jeeves replied.";
    return finishAdaptive(
      await finish(call, 200, link, "Interface asked Jeeves for help on this build.", output, body, opts, false),
      opts.env,
    );
  }

  if (WORKER_CALLS.includes(call) || LEARNER_CALLS.includes(call)) {
    return runAiDesk(call, input, link, opts);
  }

  if (call === "describe" || call === "join_plan" || call === "engulf_plan" || call === "status_report") {
    const base = closed({
      ok: true,
      call,
      schema: VEILLOCK_UI_SCHEMA,
      human_ui: "aziel-runtime",
      local_only: true,
      public_door_ops: [],
      detector: "not-run",
      matched: null,
      capability_flags_ignored: capabilityIgnored,
      capability_source: "not-observed",
      video_device_opened: false,
      url_fetched: false,
      url_accepted: url.value != null,
      app_accepted: app.value != null,
      assumed_have_vcam: null,
    });
    if (call === "describe") {
      base.report =
        "Host describe only. Local VeilLock detection did not run. No camera strategy was chosen and no command was returned.";
      return finish(call, 200, link, "Interface described a VeilLock plan.", "Describe recorded a host plan. Local detection did not run.", base, opts, false);
    }
    if (call === "join_plan") {
      base.meeting = null;
      base.camera = null;
      base.mic = null;
      base.e2e = null;
      base.command = null;
      base.note = "Join plan only. This host did not join a call.";
      return finish(call, 200, link, "Interface planned a VeilLock join.", "Join plan recorded. The call was not joined and no camera was registered.", base, opts, false);
    }
    if (call === "engulf_plan") {
      base.engulfs = false;
      base.launch = "not-run";
      base.note = "Engulf plan only. No app was started and no argv was returned.";
      return finish(call, 200, link, "Interface planned a VeilLock engulf.", "Engulf plan recorded. No app was launched and no argv was returned.", base, opts, false);
    }
    base.product = "veillock";
    base.consent = {
      known: false,
      veil: null,
      obfuscate: null,
      obfuscation_on: null,
      call_accepted: null,
      reason: "local AZ-OS hook is not attached on this host",
      actor: null,
      call_id: null,
      azos_hook: null,
    };
    base.veil = null;
    base.azos_hook = null;
    return finish(call, 200, link, "Interface reported VeilLock status.", "Status report recorded. The veil was not lifted and local consent is unknown.", base, opts, false);
  }

  if (input.payload != null && (typeof input.payload !== "object" || Array.isArray(input.payload))) {
    return fail(400, "IF-BAD-INPUT", "payload must be an object.");
  }
  const slug = input.slug == null || input.slug === "" ? null : String(input.slug).trim();
  const op = input.op == null || input.op === "" ? null : String(input.op).trim();
  const dispatchPlan = liveDispatch(slug, op);
  if (!dispatchPlan.ok) return fail(400, "IF-BAD-INPUT", dispatchPlan.error);

  if (call === "plan") {
    const body = closed({
      ok: true,
      call: "plan",
      schema: VEILLOCK_UI_SCHEMA,
      slug: slug,
      op: op,
      would_dispatch: dispatchPlan.would === true,
      dispatch_through: dispatchPlan.would ? "fraggate" : null,
      local_only: dispatchPlan.local_only === true,
      reason: dispatchPlan.reason || null,
      note: dispatchPlan.would
        ? "Plan only. FragGate was not called."
        : "Plan only. This host did not launch a local command.",
    });
    return finish(call, 200, link, "Interface planned a Software action.", "Dispatch plan recorded. FragGate was not called.", body, opts, false);
  }

  const confirm = isTruthyFlag(input.confirm);
  const dryRun = isTruthyFlag(input.dry_run);
  if (!confirm || dryRun) {
    return fail(400, "IF-CONFIRM-REQUIRED", dryRun ? "Dry run stored nothing and dispatched nothing." : "Seal requires confirm true. Nothing ran.", {
      call: "seal",
      dry_run: dryRun,
      would_dispatch: confirm && dryRun ? dispatchPlan.would === true : false,
    });
  }

  let door = null;
  let executed = false;
  let output = "Seal recorded. Nothing launched.";
  if (dispatchPlan.would && !matchingPlan(dispatchPlan.slug, dispatchPlan.op).tied) {
    return fail(409, "IF-UNTIED-PLAN", "Seal of a live op needs a prior worker plan for that slug and op. FragGate was not called.", {
      call: "seal",
      tied_to_plan: false,
      slug: dispatchPlan.slug,
      op: dispatchPlan.op,
    });
  }
  if (dispatchPlan.would) {
    if (typeof opts.dispatch !== "function") {
      return fail(503, "IF-DISPATCH-UNBOUND", "Live dispatch is unbound. FragGate was not called.", { call: "seal" });
    }
    const payload = input.payload && typeof input.payload === "object" && !Array.isArray(input.payload) ? input.payload : {};
    const doorArgs = {
      slug: dispatchPlan.slug,
      op: dispatchPlan.op,
      payload,
      request_id: link.request_id,
      attempt_n: link.attempt_n,
      parent_receipt_id: link.parent_receipt_id,
      correlation_id: link.correlation_id,
    };
    if (link.outcome_supplied) doorArgs.outcome = link.outcome;
    let envelope = null;
    try {
      envelope = await opts.dispatch(doorArgs);
    } catch {
      envelope = { ok: false, code: "IF-DISPATCH-ERROR" };
    }
    const code = envelope && envelope.code ? String(envelope.code) : "";
    const engineRefused = !!(envelope && envelope.result && envelope.result.ok === false);
    executed = !!(envelope && envelope.ok === true && code === "FG-OK" && !engineRefused);
    door = {
      ran: true,
      through: "fraggate",
      slug: dispatchPlan.slug,
      op: dispatchPlan.op,
      ok: !!(envelope && envelope.ok === true) && !engineRefused,
      code: code || null,
      engine_refused: engineRefused,
    };
    output = engineRefused
      ? `Seal recorded FragGate ${dispatchPlan.slug}/${dispatchPlan.op} as an engine refuse. The body was not copied.`
      : `Seal recorded FragGate ${dispatchPlan.slug}/${dispatchPlan.op} as ${code || "no-code"}.`;
  } else if (slug === "veillock") {
    output = "Seal recorded for a local-only plan. Nothing launched.";
    door = { ran: false, through: null, slug, op, ok: false, code: "IF-LOCAL-ONLY" };
  } else if (slug) {
    output = "Seal recorded. FragGate was not called.";
    door = { ran: false, through: null, slug, op, ok: false, code: "IF-NOT-DISPATCHED" };
  }

  link.outcome = reconcileSealOutcome(link, door);
  const actionFailed = !!(door && door.ran && !executed);
  const body = closed({
    ok: !actionFailed,
    call: "seal",
    executed,
    action_ok: executed,
    schema: VEILLOCK_UI_SCHEMA,
    slug: slug,
    op: op,
    door,
    tied_to_plan: dispatchPlan.would === true,
    note: executed
      ? "FragGate returned FG-OK. The receipt output names that code."
      : actionFailed
        ? "FragGate did not return FG-OK. The receipt outcome is failed. A local desk command did not run."
        : "Seal stored the attempt. A local desk command did not run.",
  });
  const requestSentence = slug
    ? `Operator sealed interface action ${slug}${op ? "/" + op : ""}.`
    : "Operator sealed an interface plan.";
  return finish(call, 200, link, requestSentence, output, body, opts, true);
}

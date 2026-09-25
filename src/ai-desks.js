/**
 * AI-tab desks. AZBot is a worker peer (intake, plan, status, handoff).
 * AZAI is a learner. Notes cite a domain, paper, software slug, receipt
 * hash, or operator-supplied pin id. They do not invent facts.
 *
 * Plans do not call FragGate. Memory writes wait for confirm. Public
 * receipt append stays on the seal path.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { route } from "./engines/azbot/engine.js";
import { handleAnalyze } from "./engines/vibelock/engine.js";
import { LIVE_OPS } from "./fraggate/registry.js";
import { reasonGuide } from "./guide-reason.js";
import { applyAdaptive } from "./jeeves-adapt.js";
import { SUITE_DESIGNS } from "./seo.js";
import { sha256Hex } from "./session-core.js";
import { UI_DOMAINS, uiDomainForSlug } from "./ui-domains.js";

export const AI_DESK_SPEC = "AI-DESK-1.0";
export const WORKER_CALLS = Object.freeze(["worker_intake", "worker_plan", "worker_status", "worker_handoff"]);
export const LEARNER_CALLS = Object.freeze(["learner_learn", "learner_recall"]);
export const LEARNER_GUIDE_CALL = "learner_guide";

const TASK_CAP = 64;
const NOTE_CAP = 64;
const FORBIDDEN = /\b(merge|deploy|wrangler|git\s+push|npm\s+publish)\b/i;
const PIN_RE = /^[a-zA-Z0-9._-]{1,80}$/;
const FILE_RE = /^[A-Za-z0-9._-]{1,80}$/;

/** Channels the in-process analyze/detect path actually emits. */
export const VIBELOCK_CHECK_NAMES = Object.freeze([
  "spectral",
  "phase_continuity",
  "formant",
  "decay",
  "temporal",
  "buzz",
  "pitch",
  "spatial_freq",
  "noise",
  "block",
  "chroma",
  "blend",
  "lighting",
  "flicker",
  "motion",
  "identity",
  "interp",
  "av_sync",
]);

const VIBELOCK_DESIGN_CHANNELS = Object.freeze(["physics", "linguistics", "vibration", "related"]);

const tasks = [];
const notes = [];

export function resetAiDesks() {
  tasks.length = 0;
  notes.length = 0;
}

function refuse(status, code, error) {
  return { ok: false, status, code, error };
}

function clip(value, limit) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > limit ? text.slice(0, limit) : text;
}

function taskText(input) {
  const raw = input.task != null ? input.task : input.text != null ? input.text : input.q;
  if (raw == null || raw === "") return { ok: false, error: "Task text is required." };
  if (typeof raw !== "string") return { ok: false, error: "Task text must be a string." };
  if (/[\u0000-\u001f\u007f]/.test(raw) || raw.length > 500) return { ok: false, error: "Task text must be one short line." };
  return { ok: true, value: raw.trim() };
}

function stepFor(slug, op, matched) {
  const key = String(slug || "");
  const name = String(op || "");
  if (key === "veillock") {
    return { slug: key, op: name, matched: matched || [], executed: false, would_dispatch: false, through: null, reason: "local-only" };
  }
  const live = LIVE_OPS[key];
  if (!live) {
    return { slug: key, op: name, matched: matched || [], executed: false, would_dispatch: false, through: null, reason: "not-on-public-door" };
  }
  if (!live.includes(name)) {
    return { slug: key, op: name, matched: matched || [], executed: false, would_dispatch: false, through: null, reason: "op-not-live" };
  }
  return { slug: key, op: name, matched: matched || [], executed: false, would_dispatch: true, through: "fraggate", reason: "plan-only" };
}

function stepsFromRoute(text) {
  const routed = route({ q: text });
  return (routed.matches || []).map((row) => annotateVibelock(stepFor(row.slug, row.op, row.matched)));
}

function annotateVibelock(step) {
  if (step.slug !== "vibelock") return step;
  return {
    ...step,
    contract: "softwares",
    file_decoded: false,
    accuracy: null,
    note: "Plan only. Hosted analyze scores posted features or limited PCM. mp4 and mp3 container decode stays on the local package. No accuracy number.",
  };
}

function stepsFromList(list) {
  if (!Array.isArray(list)) return refuse(400, "IF-BAD-INPUT", "steps must be a list.");
  const steps = [];
  for (const row of list.slice(0, 8)) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return refuse(400, "IF-BAD-INPUT", "Each step must be an object.");
    const slug = clip(row.slug, 64);
    const op = clip(row.op, 80);
    if (!slug || !uiDomainForSlug(slug)) return refuse(400, "IF-UNKNOWN-SOFTWARE", "A plan step must name a catalog Software.");
    steps.push(annotateVibelock(stepFor(slug, op, [])));
  }
  return { ok: true, steps };
}

function pushTask(row) {
  if (tasks.length >= TASK_CAP) return refuse(503, "IF-WORKER-FULL", "Worker desk is full. Nothing was dropped.");
  tasks.push(row);
  return { ok: true };
}

export function workerIntake(input) {
  const task = taskText(input);
  if (!task.ok) return refuse(400, "IF-BAD-INPUT", task.error);
  if (FORBIDDEN.test(task.value)) {
    return refuse(400, "IF-WORKER-REFUSED", "Merge and deploy are refused. Nothing ran.");
  }
  const steps = stepsFromRoute(task.value);
  const row = { kind: "intake", task: task.value, steps, executed: false };
  const kept = pushTask(row);
  if (!kept.ok) return kept;
  return {
    ok: true,
    body: workerBody("worker_intake", {
      task: task.value,
      steps,
      matched: steps.length > 0,
      note: steps.length
        ? "Intake planned catalog steps. FragGate was not called."
        : "No catalog keyword matched. No Software was invented.",
    }),
    output: steps.length
      ? `Worker intake planned ${steps.map((s) => s.slug + "/" + s.op).join(", ")}. Nothing ran.`
      : "Worker intake found no catalog match. Nothing ran.",
  };
}

export function workerPlan(input) {
  const task = taskText(input);
  if (!task.ok && !Array.isArray(input.steps)) return refuse(400, "IF-BAD-INPUT", task.error || "Task text is required.");
  const text = task.ok ? task.value : "";
  if (text && FORBIDDEN.test(text)) return refuse(400, "IF-WORKER-REFUSED", "Merge and deploy are refused. Nothing ran.");
  const listed = Array.isArray(input.steps) ? stepsFromList(input.steps) : { ok: true, steps: stepsFromRoute(text) };
  if (!listed.ok) return listed;
  const row = { kind: "plan", task: text, steps: listed.steps, executed: false };
  const kept = pushTask(row);
  if (!kept.ok) return kept;
  return {
    ok: true,
    body: workerBody("worker_plan", {
      task: text || null,
      steps: listed.steps,
      note: "Plan only. FragGate was not called. Seal with confirm runs a live step through FragGate.",
    }),
    output: "Worker plan recorded. FragGate was not called.",
  };
}

export function workerStatus() {
  return {
    ok: true,
    body: workerBody("worker_status", {
      count: tasks.length,
      cap: TASK_CAP,
      tasks: tasks.map((row) => ({
        kind: row.kind,
        task: row.task,
        to: row.to || null,
        steps: row.steps || [],
        executed: false,
      })),
      note: "Status of this isolate desk. Nothing was dispatched.",
    }),
    output: `Worker status lists ${tasks.length} local tasks. Nothing ran.`,
  };
}

export function workerHandoff(input) {
  const task = taskText(input);
  if (!task.ok) return refuse(400, "IF-BAD-INPUT", task.error);
  if (FORBIDDEN.test(task.value)) return refuse(400, "IF-WORKER-REFUSED", "Merge and deploy are refused. Nothing ran.");
  const to = clip(input.to || input.handoff || input.slug, 64);
  if (!to || !uiDomainForSlug(to)) return refuse(400, "IF-UNKNOWN-SOFTWARE", "Handoff needs a catalog Software slug.");
  const steps = stepsFromRoute(task.value);
  const row = { kind: "handoff", task: task.value, to, steps, executed: false };
  const kept = pushTask(row);
  if (!kept.ok) return kept;
  return {
    ok: true,
    body: workerBody("worker_handoff", {
      task: task.value,
      to,
      domain: uiDomainForSlug(to),
      steps,
      note: "Handoff recorded. The target Software was not called.",
    }),
    output: `Worker handoff to ${to} recorded. Nothing ran.`,
  };
}

function workerBody(call, extra) {
  return {
    ok: true,
    call,
    spec: AI_DESK_SPEC,
    role: "worker",
    product: "azbot",
    executed: false,
    merges: false,
    deploys: false,
    writes_public_chain: false,
    invented: false,
    ...extra,
  };
}

function paperById(id) {
  return SUITE_DESIGNS.find((row) => row.id === id) || null;
}

function domainNotes() {
  return UI_DOMAINS.filter((domain) => domain.kind !== "author" && domain.softwares.length).map((domain) => ({
    text: `Domain ${domain.label} lists ${domain.softwares.join(", ")}.`,
    cites: domain.softwares.map((slug) => ({ kind: "domain", id: domain.id, slug })),
  }));
}

export function matchingPlan(slug, op) {
  const key = String(slug || "");
  const name = String(op || "");
  for (let i = tasks.length - 1; i >= 0; i--) {
    const steps = tasks[i].steps || [];
    if (steps.some((step) => step.slug === key && step.op === name)) {
      return { tied: true, kind: tasks[i].kind };
    }
  }
  return { tied: false };
}

export function operatorLearningNote(notes, input) {
  const list = Array.isArray(notes) ? notes : [];
  const src = input && typeof input === "object" ? input : {};
  if (src.pins != null) return list.find((note) => (note.cites || []).some((cite) => cite.kind === "pin")) || null;
  if (src.papers != null) return list.find((note) => (note.cites || []).some((cite) => cite.kind === "paper")) || null;
  if (src.vibelock != null) return list.find((note) => (note.cites || []).some((cite) => cite.kind === "vibelock")) || null;
  const q = clip(src.q || src.query, 80).toLowerCase();
  if (!q) return null;
  return list.find((note) => String(note.text || "").toLowerCase().includes(q)) || null;
}

function paperNote(papers) {
  if (papers && papers.length === 0) return { text: "No paper id was requested.", cites: [] };
  const rows = papers ? papers.map((id) => paperById(id)).filter(Boolean) : SUITE_DESIGNS;
  return {
    text: "Design papers named on this runtime.",
    cites: rows.map((row) => ({ kind: "paper", id: row.id, path: `docs/designs/${row.file}` })),
  };
}

function receiptNotes(rows) {
  const out = [];
  for (const row of (rows || []).slice(-4)) {
    if (!row || !row.hash) continue;
    const tool = row.event && row.event.tool ? String(row.event.tool) : "";
    const requestId = row.event && row.event.request_id ? String(row.event.request_id) : null;
    out.push({
      text: `Local receipt ${row.hash} is call ${tool || "interface"}.`,
      cites: [{ kind: "receipt", hash: row.hash, request_id: requestId, tool: tool || null }],
    });
  }
  return out;
}

function pinNotes(pins) {
  const out = [];
  for (const pin of pins) {
    out.push({
      text: `Operator supplied pin ${pin}. 4DMap was not queried.`,
      cites: [{ kind: "pin", pin_id: pin, verified_on_4dmap: false }],
    });
  }
  return out;
}

function vibeContractNote(file) {
  return {
    text: file
      ? `VibeLock Softwares contract names ${file}. Physics and related signals are heuristic. Linguistics is experimental. Vibration is a measurement only with a body-coupled track. This call did not decode a container. Compressed local files need ffmpeg. No accuracy percentage.`
      : "VibeLock assesses AI deepfake risk in audio and video. Physics and related signals are heuristic. Linguistics is experimental. Vibration is a measurement only with a body-coupled track. This learn call did not run detect. No accuracy percentage.",
    cites: [
      {
        kind: "vibelock",
        slug: "vibelock",
        domain: "forensics",
        contract: "softwares",
        local_only: true,
        plan: true,
        file: file,
        file_kinds: ["mp4", "mp3"],
        design_channels: VIBELOCK_DESIGN_CHANNELS.slice(),
        evidence: { physics: "heuristic", linguistics: "experimental", vibration: "body-coupled-track", related: "heuristic" },
        file_decoded: false,
        decodes_containers: false,
        ffmpeg_for_compressed_local: true,
        detector_ran: false,
        accuracy: null,
      },
    ],
  };
}

function vibeFile(src) {
  if (src.file == null || src.file === "") return { ok: true, file: null };
  const file = clip(src.file, 80);
  if (!FILE_RE.test(file)) return refuse(400, "IF-UNCITED", "VibeLock file name must be a short name. Nothing was stored.");
  return { ok: true, file };
}

function citedChecks(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return refuse(400, "IF-UNCITED", "VibeLock analysis needs named signal channels. Nothing was stored.");
  }
  const channels = [];
  for (const row of list.slice(0, 24)) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return refuse(400, "IF-UNCITED", "Each VibeLock channel must be an object. Nothing was stored.");
    }
    const name = clip(row.name, 40);
    if (!VIBELOCK_CHECK_NAMES.includes(name)) {
      return refuse(400, "IF-UNCITED", "Unknown VibeLock signal channel. Nothing was stored.");
    }
    const score = Number(row.score);
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      return refuse(400, "IF-UNCITED", "A VibeLock channel score must be a number from the analysis. Nothing was stored.");
    }
    channels.push({ name, score, reason_code: row.reason_code ? clip(row.reason_code, 48) : null });
  }
  return { ok: true, channels };
}

async function vibeLearning(src) {
  if (src == null) return { ok: true, notes: [vibeContractNote(null)] };
  if (typeof src !== "object" || Array.isArray(src)) return refuse(400, "IF-BAD-INPUT", "vibelock must be an object.");
  if (src.accuracy != null || src.benchmark != null || src.accuracy_percent != null) {
    return refuse(400, "IF-UNCITED", "VibeLock accuracy numbers are not stored.");
  }
  if (src.container_b64 || src.file_b64 || src.mp4_b64 || src.mp3_b64 || src.media_b64) {
    return refuse(400, "IF-UNCITED", "VibeLock container bytes are not decoded here. Nothing was stored.");
  }
  const named = vibeFile(src);
  if (!named.ok) return named;
  const notes = [vibeContractNote(named.file)];
  const runInput = src.features || src.pcm_b64 || src.visual || src.video || src.av || src.pitch;
  if (runInput) {
    const out = await handleAnalyze({
      features: src.features,
      pcm_b64: src.pcm_b64,
      visual: src.visual,
      video: src.video,
      av: src.av,
      pitch: src.pitch,
      rate: src.rate,
      sample_rate: src.sample_rate,
      pcm_dtype: src.pcm_dtype,
    });
    if (!out || out.ok === false) return refuse(400, "IF-UNCITED", "VibeLock analyze did not return checks. Nothing was stored.");
    const checks = citedChecks(out.checks);
    if (!checks.ok) return checks;
    notes.push({
      text: `VibeLock advisory on posted signals. Channels ${checks.channels.map((row) => row.name).join(", ")}. Combined score ${out.score} is advisory. Container decode did not run. No accuracy number.`,
      cites: [
        {
          kind: "vibelock",
          slug: "vibelock",
          domain: "forensics",
          contract: "in-process-advisory",
          file: named.file,
          file_decoded: false,
          detector_ran: true,
          accuracy: null,
          score: out.score,
          score_kind: "advisory",
          verdict: out.verdict,
          signals: out.signals || [],
          channels: checks.channels,
        },
      ],
    });
    return { ok: true, notes };
  }
  if (src.analysis != null) {
    const analysis = src.analysis;
    if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
      return refuse(400, "IF-BAD-INPUT", "vibelock.analysis must be an object.");
    }
    if (analysis.accuracy != null) return refuse(400, "IF-UNCITED", "VibeLock accuracy numbers are not stored.");
    const checks = citedChecks(analysis.checks);
    if (!checks.ok) return checks;
    notes.push({
      text: `Operator supplied VibeLock channel scores for ${checks.channels.map((row) => row.name).join(", ")}. This host did not re-run detect and did not decode a container. No accuracy number.`,
      cites: [
        {
          kind: "vibelock",
          slug: "vibelock",
          domain: "forensics",
          contract: "operator-supplied",
          file: named.file,
          file_decoded: false,
          detector_ran: false,
          accuracy: null,
          score_kind: "operator-supplied",
          channels: checks.channels,
        },
      ],
    });
  }
  return { ok: true, notes };
}

export async function buildLearningNotes(input, ledgerRows, pull) {
  const pins = [];
  if (input.pins != null) {
    if (!Array.isArray(input.pins)) return refuse(400, "IF-BAD-INPUT", "pins must be a list.");
    for (const pin of input.pins.slice(0, 8)) {
      const id = pin && typeof pin === "object" ? pin.pin_id || pin.id : pin;
      const text = clip(id, 80);
      if (!text || !PIN_RE.test(text)) return refuse(400, "IF-UNCITED", "A pin note needs a pin id. Nothing was stored.");
      pins.push(text);
    }
  }
  if (input.papers != null) {
    if (!Array.isArray(input.papers)) return refuse(400, "IF-BAD-INPUT", "papers must be a list.");
    for (const id of input.papers) {
      if (!paperById(clip(id, 80))) return refuse(400, "IF-UNCITED", "Unknown paper id. Nothing was stored.");
    }
  }
  const aznet = UI_DOMAINS.find((domain) => domain.id === "aznet");
  const built = [
    ...domainNotes(),
    paperNote(input.papers ? input.papers.map((id) => clip(id, 80)) : null),
    {
      text: pull && pull.flags && pull.flags.mesh_read === true
        ? "Mesh roster was read. Rows were not stored."
        : "AZnet catalog signals. The live roster was not read.",
      cites: (aznet ? aznet.softwares : []).map((slug) => ({ kind: "software", slug, domain: "aznet" })),
    },
    {
      text: pull && pull.flags && pull.flags.corpus_searched === true
        ? "Corpus search ran. Hit bodies were not stored."
        : "Corpus card aziel-corpus is listed. This call did not search the library.",
      cites: [{ kind: "software", slug: "aziel-corpus", domain: "library" }],
    },
    ...receiptNotes(ledgerRows),
    ...pinNotes(pins),
  ];
  const vibe = await vibeLearning(input.vibelock);
  if (!vibe.ok) return vibe;
  built.push(...vibe.notes);
  if (pull && Array.isArray(pull.cites) && pull.cites.length) {
    const flags = pull.flags || {};
    built.push({
      text: `Live pull summary. pins_read ${flags.pins_read === true}. mesh_read ${flags.mesh_read === true}. corpus_searched ${flags.corpus_searched === true}. Counts only.`,
      cites: pull.cites,
    });
  }
  return {
    ok: true,
    notes: built,
    pins_supplied: pins.length,
  };
}

export async function storeLearningNotes(built) {
  if (notes.length + built.notes.length > NOTE_CAP) {
    return refuse(503, "IF-LEARN-FULL", "Learner desk is full. Nothing was dropped.");
  }
  const stamped = [];
  for (const note of built.notes) {
    const cite_hash = await sha256Hex(JSON.stringify(note.cites));
    const row = { text: note.text, cites: note.cites, cite_hash, invented: false };
    notes.push(row);
    stamped.push(row);
  }
  return { ok: true, notes: stamped };
}

export function recallLearningNotes(query) {
  const q = clip(query, 80).toLowerCase();
  const rows = !q
    ? notes.slice(-16)
    : notes.filter((note) => {
        if (note.text.toLowerCase().includes(q)) return true;
        return (note.cites || []).some((cite) =>
          [cite.id, cite.slug, cite.hash, cite.pin_id, cite.request_id, cite.path, cite.tool, cite.file, cite.kind, ...(cite.design_channels || []), ...(cite.channels || []).map((row) => row.name)]
            .filter(Boolean)
            .some((part) => String(part).toLowerCase().includes(q)),
        );
      });
  return rows.slice(-16);
}

export async function guideAzai(input, env) {
  const src = input && typeof input === "object" ? input : {};
  const raw = src.q != null ? src.q : src.question != null ? src.question : src.query != null ? src.query : src.task;
  const q = clip(raw, 2000);
  if (!q) return refuse(400, "IF-BAD-INPUT", "question required (q / query / question)");
  const reasoned = await applyAdaptive(await reasonGuide(q, env, { assistant: "AZAI" }), input, env, "azai");
  return {
    ok: true,
    body: learnerBody(LEARNER_GUIDE_CALL, {
      ...reasoned,
      corpus_searched: reasoned.library_search === true,
      stored_notes: false,
      memory: { attempted: false, reason: "guide does not write memory" },
      pins_read: false,
      mesh_read: false,
    }),
    output: String(reasoned.answer || "AZAI guide replied.").slice(0, 240),
  };
}

export function learnerBody(call, extra) {
  return {
    ok: true,
    call,
    spec: AI_DESK_SPEC,
    role: "learner",
    product: "azai",
    executed: false,
    writes_public_chain: false,
    invented: false,
    belief_is_not_truth: true,
    pins_read: false,
    mesh_read: false,
    corpus_searched: false,
    lamb_lens: ["Service", "Clarity", "Peace"],
    ...extra,
  };
}

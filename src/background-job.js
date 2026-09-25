/**
 * Background jobs for long FragGate calls.
 *
 * The reply is Running until a receipt hash exists. Done is not claimed
 * without that hash. A missing record is Quiet, not Done.
 * FragGate remains the single door. Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { previewCatalogAdmission } from "./fraggate/door.js";
import { backgroundStub } from "./session-do.js";
import { infraFromDoorBody, peersQuiet, runningInfra } from "./auto-gate.js";

export const FG_BACKGROUND = "FG-BACKGROUND";
export const JOB_ID_RE = /^job_[a-f0-9]{16}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const ZERO_HASH = "0".repeat(64);

const MEMORY = new Map();
const inflight = new Set();

export function resetBackgroundJobs() {
  MEMORY.clear();
  inflight.clear();
}

export function newJobId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "job_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isReceiptHash(hash) {
  return typeof hash === "string" && HASH_RE.test(hash) && hash !== ZERO_HASH;
}

export function missingJobView(jobId) {
  return {
    ok: false,
    code: "job_not_found",
    door: "fraggate",
    background: true,
    job_id: jobId || null,
    status: "quiet",
    done: false,
    receipt: null,
    ledger_tip: null,
    result: null,
    mutated: false,
    ledger_written: false,
    message: "Quiet. No record of that job. Running is not claimed.",
    summary: "Quiet. No record of that job. Running is not claimed.",
    infra: {
      fraggate: { ran: false, role: "absent", reason: "no record" },
      chainlock: { ran: false, reason: "no record" },
      peers: peersQuiet("no record"),
    },
  };
}

/**
 * Public view. done is true only when phase completed, the door said ok,
 * and a non-zero receipt hash is present.
 */
export function honestJobView(record) {
  if (!record || typeof record !== "object") return missingJobView(null);
  const hash = record.receipt && record.receipt.hash;
  const honest = isReceiptHash(hash);
  const done = record.phase === "complete" && record.ok === true && honest;
  const refused = record.phase === "complete" && record.ok !== true;
  const status = done ? "done" : refused ? "refused" : "running";
  const message = done
    ? "Done. Receipt is ready."
    : refused
      ? record.message || "Refused. No completion receipt."
      : "Running. No completion receipt yet.";
  const stored = record.infra && typeof record.infra === "object" ? record.infra : runningInfra();
  const infra =
    status === "running"
      ? {
          ...runningInfra(),
          fraggate: stored.fraggate && stored.fraggate.ran === true ? stored.fraggate : runningInfra().fraggate,
          chainlock: { ran: false, reason: "running" },
          peers: peersQuiet("running"),
        }
      : stored;
  return {
    ok: status !== "refused",
    code: done ? "FG-OK" : refused ? record.code || "FG-GATE-REFUSE" : FG_BACKGROUND,
    door: "fraggate",
    background: true,
    job_id: record.job_id,
    slug: record.slug || null,
    op: record.op || null,
    status,
    done,
    receipt: done ? { hash, event: record.receipt.event || "exec" } : null,
    ledger_tip: done ? record.ledger_tip || null : null,
    result: done ? record.result ?? null : null,
    mutated: done,
    ledger_written: done,
    message,
    summary: message,
    infra,
  };
}

export function sealJob(job, body) {
  const tip = body && body.ledger_tip;
  const hash = tip && typeof tip.hash === "string" ? tip.hash : "";
  const honest = isReceiptHash(hash);
  const accepted = Boolean(body && body.ok === true && honest);
  const doorInfra = infraFromDoorBody(body);
  if (body && body.ok === true && !honest) {
    return {
      ...job,
      phase: "running",
      ok: false,
      receipt: null,
      ledger_tip: null,
      result: null,
      message: "Running. No completion receipt yet.",
      infra: {
        ...doorInfra,
        chainlock: { ran: false, reason: "running" },
        peers: peersQuiet("running"),
      },
    };
  }
  return {
    ...job,
    phase: "complete",
    ok: accepted,
    code: body && body.code ? body.code : accepted ? "FG-OK" : "FG-GATE-REFUSE",
    message: body && body.message ? body.message : accepted ? "Done. Receipt is ready." : "Refused. No completion receipt.",
    ledger_tip: honest ? tip : null,
    receipt: accepted ? { hash, event: "exec" } : null,
    result: accepted ? body.result ?? null : null,
    infra: doorInfra,
  };
}

function track(promise) {
  const tracked = Promise.resolve(promise).finally(() => {
    inflight.delete(tracked);
  });
  inflight.add(tracked);
  return tracked;
}

export function drainBackground() {
  return Promise.all([...inflight]);
}

async function putDurable(env, record) {
  const stub = backgroundStub(env);
  if (!stub) return;
  await stub.fetch(
    new Request("https://bg/job-put", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ job_id: record.job_id, record }),
    }),
  );
}

async function getDurable(env, jobId) {
  const stub = backgroundStub(env);
  if (!stub) return null;
  const res = await stub.fetch(
    new Request("https://bg/job-get", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    }),
  );
  if (!res.ok) return null;
  const body = await res.json();
  return body && body.record ? body.record : null;
}

export async function putJob(env, record) {
  MEMORY.set(record.job_id, record);
  await putDurable(env, record);
  return honestJobView(record);
}

export async function getJob(env, jobId) {
  const durable = await getDurable(env, jobId);
  if (durable) return honestJobView(durable);
  const mem = MEMORY.get(jobId);
  if (mem) return honestJobView(mem);
  return missingJobView(jobId);
}

export function jobFilePath(dir, jobId) {
  return join(dir, "jobs", `${jobId}.json`);
}

export async function writeJobFile(dir, record) {
  const folder = join(dir, "jobs");
  await mkdir(folder, { recursive: true });
  await writeFile(jobFilePath(dir, record.job_id), JSON.stringify(record, null, 2) + "\n", "utf8");
  return honestJobView(record);
}

export async function readJobFile(dir, jobId) {
  try {
    const raw = await readFile(jobFilePath(dir, jobId), "utf8");
    return honestJobView(JSON.parse(raw));
  } catch (err) {
    if (err && err.code === "ENOENT") return missingJobView(jobId);
    throw err;
  }
}

export function humanJobLines(view) {
  const job = view && view.job_id ? view.job_id : "—";
  if (!view || view.code === "job_not_found" || view.status === "quiet") {
    return ["Quiet. No record of that job. Running is not claimed.", `  ${"job".padEnd(12)}${job}`, `  ${"receipt".padEnd(12)}—`];
  }
  if (view.done === true && view.receipt && isReceiptHash(view.receipt.hash)) {
    return ["Done. Receipt is ready.", `  ${"job".padEnd(12)}${job}`, `  ${"receipt".padEnd(12)}${view.receipt.hash}`];
  }
  if (view.status === "refused") {
    return [
      "Refused. No completion receipt.",
      `  ${"code".padEnd(12)}${view.code || "—"}`,
      `  ${"detail".padEnd(12)}${view.message || "—"}`,
    ];
  }
  return ["Running. No completion receipt yet.", `  ${"job".padEnd(12)}${job}`, `  ${"receipt".padEnd(12)}—`];
}

/**
 * Admit through the existing door preview. Refuses return the live door body
 * (same code, with ledger) and do not schedule. An admitted call returns
 * Running immediately; the door runs on waitUntil or the in-process drain.
 */
export async function beginBackground({ env, ctx, args, registry, bySlug, run }) {
  const src = args && typeof args === "object" ? args : {};
  const jobId = typeof src.job_id === "string" ? src.job_id.trim() : "";
  if (jobId) return { kind: "job", view: await getJob(env, jobId) };

  const preview = previewCatalogAdmission(src, registry, bySlug);
  if (!preview.proceed) {
    const body = await run();
    return { kind: "door", body: { ...body, infra: infraFromDoorBody(body) } };
  }
  const job = {
    job_id: newJobId(),
    slug: preview.target.entry.slug,
    op: preview.target.op,
    phase: "running",
    ok: false,
    receipt: null,
    started_at: new Date().toISOString(),
    infra: runningInfra(),
  };
  await putJob(env, job);
  const work = track(
    (async () => {
      try {
        const body = await run();
        await putJob(env, sealJob(job, body));
      } catch (err) {
        await putJob(env, {
          ...job,
          phase: "complete",
          ok: false,
          code: "FG-ERR",
          message: err && err.message ? String(err.message) : String(err),
          receipt: null,
          result: null,
        });
      }
    })(),
  );
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(work);
  return { kind: "job", view: honestJobView(job) };
}

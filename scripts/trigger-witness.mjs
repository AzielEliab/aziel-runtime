#!/usr/bin/env node
/**
 * Run the outside witness right after a deploy, instead of waiting for GitHub's best-effort cron
 * (observed every 2-3 hours, not 15 minutes). Dispatches AzielEliab/aziel-anchors witness.yml through
 * its existing `workflow_dispatch` trigger, then (with --wait) polls GET /v1/anchor/verify until the
 * newest witnessed build equals the live build.
 *
 * The runtime still has no write path to the witness log: this only asks GitHub to run the witness
 * job, which signs with a key held only as that repo's Actions secret. Fail closed: a missing token,
 * a non-204 dispatch, or a timeout exits non-zero and never reports the build as witnessed.
 *
 *   GH_TOKEN=<token with actions:write on aziel-anchors> node scripts/trigger-witness.mjs [--wait] [--timeout-min 20] [--dry-run]
 *
 * Author: Aziel Eliab.
 */
export const ANCHORS_REPO = "AzielEliab/aziel-anchors";
export const WITNESS_WORKFLOW = "witness.yml";
export const RUNTIME_URL = "https://aziel-runtime.vibelock.workers.dev";
/** Every network call is bounded: a hung GitHub or runtime fetch aborts instead of blocking forever. */
export const FETCH_TIMEOUT_MS = 15_000;
export const TIMEOUT_MIN_MIN = 1;
export const TIMEOUT_MAX_MIN = 120;

/**
 * --timeout-min: only a finite number of minutes in [1, 120]. Missing value, NaN, another flag, 0,
 * negative or >120 throws WITNESS-BAD-TIMEOUT (exit 1). Absent flag -> 20.
 */
export function parseTimeoutMin(args = []) {
  const i = args.indexOf("--timeout-min");
  if (i < 0) return 20;
  const raw = args[i + 1];
  const bad = () => Object.assign(new Error(`--timeout-min must be a number of minutes from ${TIMEOUT_MIN_MIN} to ${TIMEOUT_MAX_MIN}; got ${raw === undefined ? "no value" : JSON.stringify(raw)}`), { code: "WITNESS-BAD-TIMEOUT" });
  if (raw === undefined || raw.startsWith("--") || !/^\d+(\.\d+)?$/.test(raw.trim())) throw bad();
  const min = Number(raw);
  if (!Number.isFinite(min) || min < TIMEOUT_MIN_MIN || min > TIMEOUT_MAX_MIN) throw bad();
  return min;
}

export function dispatchRequest({ token, ref = "main", repo = ANCHORS_REPO, workflow = WITNESS_WORKFLOW } = {}) {
  if (!token) throw Object.assign(new Error("GH_TOKEN (or GITHUB_TOKEN) is required; nothing was dispatched"), { code: "WITNESS-DISPATCH-NO-TOKEN" });
  return {
    url: `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    init: {
      method: "POST",
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", "content-type": "application/json", "user-agent": "aziel-runtime-trigger-witness" },
      // force=0: the witness anchors anyway because the build (git_sha / version_id) changed.
      body: JSON.stringify({ ref, inputs: { force: "0" } }),
    },
  };
}

export async function dispatchWitness({ token, fetchImpl = fetch, fetchTimeoutMs = FETCH_TIMEOUT_MS, ...rest } = {}) {
  const { url, init } = dispatchRequest({ token, ...rest });
  let res;
  try {
    res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(fetchTimeoutMs) });
  } catch (err) {
    throw Object.assign(new Error(`witness dispatch did not complete: ${err && err.name === "TimeoutError" ? `no response within ${fetchTimeoutMs} ms` : String(err && err.message ? err.message : err)}`), { code: "WITNESS-DISPATCH-FAILED", status: null });
  }
  if (res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(`witness dispatch refused: HTTP ${res.status} ${text.slice(0, 200)}`), { code: "WITNESS-DISPATCH-FAILED", status: res.status });
  }
  return { ok: true, dispatched: `${ANCHORS_REPO}/${WITNESS_WORKFLOW}` };
}

/** Poll /v1/anchor/verify until build_witness is verified. Pending/failed/not_checked never count. */
export async function waitWitnessed({ runtime = RUNTIME_URL, timeoutMs = 20 * 60_000, intervalMs = 30_000, fetchTimeoutMs = FETCH_TIMEOUT_MS, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now } = {}) {
  // Deadline guard: a non-finite or out-of-range timeout never becomes an endless poll.
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > TIMEOUT_MAX_MIN * 60_000) {
    return { ok: false, code: "WITNESS-BAD-TIMEOUT", build_witness: null, error: `timeoutMs must be finite, > 0 and <= ${TIMEOUT_MAX_MIN} min` };
  }
  const deadline = now() + timeoutMs;
  if (!Number.isFinite(deadline)) return { ok: false, code: "WITNESS-BAD-TIMEOUT", build_witness: null };
  let last = null;
  for (;;) {
    try {
      const res = await fetchImpl(`${runtime}/v1/anchor/verify?fresh=1`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(fetchTimeoutMs) });
      const body = await res.json();
      last = body && body.build_witness ? body.build_witness : null;
      if (last && last.status === "verified" && last.ok === true) return { ok: true, build_witness: last };
    } catch (err) {
      last = { status: "unreadable", error: String(err && err.message ? err.message : err) };
    }
    if (!(now() < deadline)) return { ok: false, code: "WITNESS-WAIT-TIMEOUT", build_witness: last };
    await sleep(intervalMs);
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  try {
    const timeoutMs = parseTimeoutMin(args) * 60_000;
    if (args.includes("--dry-run")) {
      const { url, init } = dispatchRequest({ token: token || "DRY-RUN" });
      console.log(JSON.stringify({ dry_run: true, url, method: init.method, body: JSON.parse(init.body) }));
      process.exit(0);
    }
    console.log(JSON.stringify(await dispatchWitness({ token })));
    if (args.includes("--wait")) {
      const r = await waitWitnessed({ timeoutMs });
      console.log(JSON.stringify(r));
      process.exit(r.ok ? 0 : 2);
    }
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || "WITNESS-DISPATCH-FAILED", error: err.message }));
    process.exit(1);
  }
}

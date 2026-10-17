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

export async function dispatchWitness({ token, fetchImpl = fetch, ...rest } = {}) {
  const { url, init } = dispatchRequest({ token, ...rest });
  const res = await fetchImpl(url, init);
  if (res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(`witness dispatch refused: HTTP ${res.status} ${text.slice(0, 200)}`), { code: "WITNESS-DISPATCH-FAILED", status: res.status });
  }
  return { ok: true, dispatched: `${ANCHORS_REPO}/${WITNESS_WORKFLOW}` };
}

/** Poll /v1/anchor/verify until build_witness is verified. Pending/failed/not_checked never count. */
export async function waitWitnessed({ runtime = RUNTIME_URL, timeoutMs = 20 * 60_000, intervalMs = 30_000, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now } = {}) {
  const deadline = now() + timeoutMs;
  let last = null;
  for (;;) {
    try {
      const res = await fetchImpl(`${runtime}/v1/anchor/verify?fresh=1`, { headers: { accept: "application/json" } });
      const body = await res.json();
      last = body && body.build_witness ? body.build_witness : null;
      if (last && last.status === "verified" && last.ok === true) return { ok: true, build_witness: last };
    } catch (err) {
      last = { status: "unreadable", error: String(err && err.message ? err.message : err) };
    }
    if (now() >= deadline) return { ok: false, code: "WITNESS-WAIT-TIMEOUT", build_witness: last };
    await sleep(intervalMs);
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  const timeoutIdx = args.indexOf("--timeout-min");
  const timeoutMs = (timeoutIdx >= 0 ? Number(args[timeoutIdx + 1]) : 20) * 60_000;
  try {
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

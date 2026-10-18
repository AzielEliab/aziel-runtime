/**
 * RIB-041 / AZRT-BUILD-WITNESS-1.0 (idea from @TheNabeelKhan).
 *
 * The runtime publishes its build identity (deploy version_id + git_sha) in GET /v1/anchor/heads,
 * next to the chain heads. The outside witness (AzielEliab/aziel-anchors, GitHub Actions, Ed25519
 * key held only as that repo's Actions secret) copies it into its signed statement. Verify compares
 * the NEWEST witnessed statement only with the live build:
 *   verified      both fields witnessed and equal
 *   partial       the witness statement predates a field (legacy git_sha-only rows); the rest matched
 *   failed        a witnessed field differs from live or is unknown live -> BUILD-WITNESS-MISMATCH (409)
 *   pending       fresh platform deploy not yet witnessed (window, default 4 h, see pendingWindow): ok null, 503
 *   not_checked   no verified log, or no statement has ever carried a build: ok null, never a pass
 * Threat model: git_sha (deploy var / baked build-meta) and VERSION_ID can be set by whoever deploys.
 * This catches honest deploys that were not witnessed, not a hostile deployer.
 * The runtime cannot write the witness log. Anchors/checkpoints/tether are signed; receipts are
 * hash-linked and sealed, not signed. Author: Aziel Eliab.
 */
export const BUILD_WITNESS_SPEC = "AZRT-BUILD-WITNESS-1.0";
const SHA = /^[a-f0-9]{7,40}$/;
const clean = (v) => (v == null || v === "" ? null : String(v).trim().toLowerCase() || null);

/**
 * The witness cron says every 15 minutes, but GitHub runs scheduled workflows best-effort: the real
 * aziel-anchors log (n=1..34) shows gaps of about 2-7 hours (19:00, 22:03, 00:25 UTC on 2026-10-16).
 * A 22-minute window made every honest deploy a hard 409 for hours, so the window now covers the real
 * schedule. Pending stays ok:null / 503 + Retry-After and is never a pass. The real fix for freshness is
 * to dispatch the witness right after deploy (scripts/trigger-witness.mjs); the window is the backstop.
 */
export const WITNESS_INTERVAL_MS = 15 * 60_000; // nominal cron only; not what GitHub delivers
export const PENDING_GRACE_MS = 5 * 60_000;
export const LOG_CACHE_MS = 120_000;
/** Default longest a fresh, unwitnessed deploy may report pending: 4 h (covers the observed 2-3 h cadence). */
export const PENDING_MAX_MS = 4 * 60 * 60_000;
/** Bounds for BUILD_WITNESS_PENDING_MAX_MIN: never below the old strict window, never above 12 h. */
export const PENDING_MIN_BOUND_MS = WITNESS_INTERVAL_MS + PENDING_GRACE_MS + LOG_CACHE_MS; // 22 min
export const PENDING_MAX_BOUND_MS = 12 * 60 * 60_000;

/**
 * Operator override: env.BUILD_WITNESS_PENDING_MAX_MIN (whole minutes). Unset or blank -> 4 h default.
 * Anything set but not a plain whole number (negative, NaN, 1e3, 0x10, 1.5) clamps to the 22 min minimum,
 * never to the wider default; in-range numbers are used as is, the rest clamp to [22 min, 12 h].
 */
export function pendingMaxMsOf(env) {
  const raw = env && env.BUILD_WITNESS_PENDING_MAX_MIN;
  if (raw == null || String(raw).trim() === "") return { ms: PENDING_MAX_MS, source: "default" };
  const t = String(raw).trim();
  if (!/^\d+$/.test(t)) return { ms: PENDING_MIN_BOUND_MS, source: "BUILD_WITNESS_PENDING_MAX_MIN (unreadable; clamped to minimum)" };
  const min = Number(t);
  const ms = Math.min(PENDING_MAX_BOUND_MS, Math.max(PENDING_MIN_BOUND_MS, min * 60_000));
  return { ms, source: ms === min * 60_000 ? "BUILD_WITNESS_PENDING_MAX_MIN" : "BUILD_WITNESS_PENDING_MAX_MIN (clamped)" };
}

export const FUTURE_SKEW_MS = 5_000;

/** Live build identity, read at serve time (never guessed). */
export function liveBuildOf(meta = {}, { versionTimestamp = null } = {}) {
  const sha = clean(meta.git_sha);
  return {
    git_sha: sha && SHA.test(sha) ? sha : null,
    version_id: clean(meta.version_id),
    git_sha_source: meta.git_sha_source || null,
    version_id_source: meta.version_id_source || null,
    // Only meaningful when version_id came from CF_VERSION_METADATA (the platform binding).
    version_timestamp: meta.version_id_source === "cf_version_metadata" && versionTimestamp ? String(versionTimestamp) : null,
  };
}

/** Build a statement witnessed. Older statements carry only top-level git_sha. */
export function witnessedBuildOf(statement) {
  if (!statement || typeof statement !== "object") return null;
  const b = (statement.build && typeof statement.build === "object" ? statement.build : null) || (statement.heads && statement.heads.build) || null;
  const git_sha = clean((b && b.git_sha) || statement.git_sha || (statement.heads && statement.heads.git_sha));
  const version_id = clean(b && b.version_id);
  if (!git_sha && !version_id) return null;
  return { git_sha, version_id, n: Number(statement.n) || null, observed_at: statement.observed_at || null };
}

/**
 * Pending applies only when ALL hold: version_id is from cf_version_metadata (not the var), the
 * metadata timestamp is newer than the newest statement's signed observed_at, and it is at most
 * maxMs old (default PENDING_MAX_MS, 4 h) and not in the future. Anything else is a hard mismatch.
 */
export function pendingWindow(live, newestStatement, now = Date.now(), maxMs = PENDING_MAX_MS) {
  if (!live || live.version_id_source !== "cf_version_metadata" || !live.version_timestamp) return { pending: false, reason: "version_id not from cf_version_metadata" };
  const ts = Date.parse(live.version_timestamp);
  const seen = Date.parse(newestStatement && newestStatement.observed_at);
  if (!Number.isFinite(ts)) return { pending: false, reason: "metadata timestamp unreadable" };
  if (!Number.isFinite(seen)) return { pending: false, reason: "newest statement has no signed observed_at" };
  if (ts <= seen) return { pending: false, reason: "deploy is not newer than the newest witness statement (rollback or old upload)" };
  if (ts > now + FUTURE_SKEW_MS) return { pending: false, reason: "metadata timestamp is in the future" };
  if (now - ts > maxMs) return { pending: false, reason: "pending window expired; the witness should have run", pending_max_ms: maxMs };
  return { pending: true, pending_since: new Date(ts).toISOString(), pending_until: new Date(ts + maxMs).toISOString(), pending_max_ms: maxMs };
}

/**
 * @param {{ok:boolean, entries?:object[], latest?:object, code?:string}} anchors verified witness log state
 * @param {object} live liveBuildOf(...)
 */
export function checkBuildWitness(anchors, live, { now = Date.now(), pendingMaxMs = PENDING_MAX_MS, pendingMaxSource = "default" } = {}) {
  const base = { spec: BUILD_WITNESS_SPEC, live: live || null };
  const notChecked = (reason, extra = {}) => ({ ...base, ok: null, status: "not_checked", code: "BUILD-WITNESS-NOT-CHECKED", reason, ...extra });
  if (!anchors || !anchors.ok) return notChecked("no verified witness log", { log_code: (anchors && anchors.code) || null });
  const rows = Array.isArray(anchors.entries) && anchors.entries.length ? anchors.entries : anchors.latest ? [anchors.latest] : [];
  const newest = rows.length ? rows[rows.length - 1].statement : null;
  // Only the newest statement is compared; an older one never stands in for it.
  const witnessed = witnessedBuildOf(newest);
  const everWitnessed = rows.some((r) => witnessedBuildOf(r && r.statement));
  if (!witnessed) {
    if (!everWitnessed) return notChecked("no witness statement carries a build identity yet");
    return { ...base, ok: false, status: "failed", code: "BUILD-WITNESS-MISMATCH", reason: "the newest witness statement carries no build, though earlier ones did", witnessed: null };
  }
  const compared = [];
  const diffs = [];
  const legacy = [];
  for (const k of ["git_sha", "version_id"]) {
    if (!witnessed[k]) { legacy.push(k); continue; } // only a field the WITNESS lacks may be skipped
    compared.push(k);
    if (witnessed[k] !== (live && live[k])) diffs.push({ field: k, witnessed: witnessed[k], live: (live && live[k]) || null });
  }
  if (diffs.length) {
    const win = pendingWindow(live, newest, now, pendingMaxMs);
    const window_ = { pending_max_minutes: Math.round(pendingMaxMs / 60_000), pending_max_source: pendingMaxSource };
    if (win.pending) {
      return { ...base, ok: null, status: "pending", code: "BUILD-WITNESS-PENDING", pending_since: win.pending_since, pending_until: win.pending_until, ...window_, last_witnessed: witnessed, compared, diffs,
        note: "A newer platform deploy has not been witnessed yet. Never reported as a pass." };
    }
    return { ...base, ok: false, status: "failed", code: "BUILD-WITNESS-MISMATCH", witnessed, last_witnessed: witnessed, compared, diffs, pending_rejected: win.reason, ...window_,
      note: "The live build differs from (or is unknown against) the newest witnessed build, outside the pending window." };
  }
  const full = legacy.length === 0;
  return { ...base, ok: true, status: full ? "verified" : "partial", code: full ? "BUILD-WITNESS-OK" : "BUILD-WITNESS-PARTIAL", witnessed, compared,
    ...(full ? {} : { not_compared: legacy, not_compared_reason: "the witness statement predates this field" }) };
}

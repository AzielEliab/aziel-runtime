/**
 * RIB-041 / AZRT-BUILD-WITNESS-1.0 (idea from @TheNabeelKhan).
 *
 * The runtime publishes its build identity (deploy version_id + git_sha) in GET /v1/anchor/heads,
 * next to the chain heads. The outside witness (AzielEliab/aziel-anchors, GitHub Actions, Ed25519
 * key held only as that repo's Actions secret) copies it into its signed statement. Verify compares
 * the newest witnessed build with the live build:
 *   verified      every field both sides carry is equal (git_sha and version_id)
 *   partial       only one field could be compared (e.g. statements before version_id was witnessed); it matched
 *   failed        any compared field differs -> BUILD-WITNESS-MISMATCH (fail closed)
 *   not_checked   no verified witness log, no statement carries a build, or the live build is unknown.
 *                 never a pass: ok is null, not true.
 * The runtime cannot write the witness log. Anchors/checkpoints/tether are signed; receipts are
 * hash-linked and sealed, not signed. Author: Aziel Eliab.
 */
export const BUILD_WITNESS_SPEC = "AZRT-BUILD-WITNESS-1.0";
const SHA = /^[a-f0-9]{7,40}$/;
const clean = (v) => (v == null || v === "" ? null : String(v).trim().toLowerCase() || null);

/** Live build identity, read at serve time (never guessed). */
export function liveBuildOf(meta = {}) {
  const sha = clean(meta.git_sha);
  return {
    git_sha: sha && SHA.test(sha) ? sha : null,
    version_id: clean(meta.version_id),
    git_sha_source: meta.git_sha_source || null,
    version_id_source: meta.version_id_source || null,
  };
}

/** Build a statement witnessed (newest first). Older statements carry only top-level git_sha. */
export function witnessedBuildOf(statement) {
  if (!statement || typeof statement !== "object") return null;
  const b = (statement.build && typeof statement.build === "object" ? statement.build : null) || (statement.heads && statement.heads.build) || null;
  const git_sha = clean((b && b.git_sha) || statement.git_sha || (statement.heads && statement.heads.git_sha));
  const version_id = clean(b && b.version_id);
  if (!git_sha && !version_id) return null;
  return { git_sha, version_id, n: Number(statement.n) || null, observed_at: statement.observed_at || null };
}

/**
 * @param {{ok:boolean, entries?:object[], latest?:object, code?:string}} anchors verified witness log state
 * @param {object} live liveBuildOf(...)
 */
export function checkBuildWitness(anchors, live) {
  const base = { spec: BUILD_WITNESS_SPEC, live: live || null };
  const notChecked = (reason, extra = {}) => ({ ...base, ok: null, status: "not_checked", code: "BUILD-WITNESS-NOT-CHECKED", reason, ...extra });
  if (!anchors || !anchors.ok) return notChecked("no verified witness log", { log_code: (anchors && anchors.code) || null });
  const rows = Array.isArray(anchors.entries) && anchors.entries.length ? anchors.entries : anchors.latest ? [anchors.latest] : [];
  let witnessed = null;
  for (let i = rows.length - 1; i >= 0 && !witnessed; i--) witnessed = witnessedBuildOf(rows[i] && rows[i].statement);
  if (!witnessed) return notChecked("no witness statement carries a build identity yet");
  if (!live || (!live.git_sha && !live.version_id)) return notChecked("live build identity is unknown (no GIT_SHA / version metadata bound)", { witnessed });
  const compared = [];
  const diffs = [];
  for (const k of ["git_sha", "version_id"]) {
    if (witnessed[k] && live[k]) {
      compared.push(k);
      if (witnessed[k] !== live[k]) diffs.push({ field: k, witnessed: witnessed[k], live: live[k] });
    }
  }
  if (!compared.length) return notChecked("witnessed and live builds share no comparable field", { witnessed });
  if (diffs.length) {
    return { ...base, ok: false, status: "failed", code: "BUILD-WITNESS-MISMATCH", witnessed, compared, diffs,
      note: "The live build differs from the newest witnessed build. Either an unwitnessed deploy, or the witness has not run since the deploy (it runs every 15 min)." };
  }
  const full = compared.length === 2;
  return { ...base, ok: true, status: full ? "verified" : "partial", code: full ? "BUILD-WITNESS-OK" : "BUILD-WITNESS-PARTIAL", witnessed, compared,
    ...(full ? {} : { not_compared: ["git_sha", "version_id"].filter((k) => !compared.includes(k)) }) };
}

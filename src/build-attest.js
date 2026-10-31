/**
 * RIB-048 / AZRT-BUILD-ATTEST-1.0 (idea from @eveliqTrace).
 *
 * Bind source revision, build environment, builder identity, and the artifact digest.
 * The attestation is produced by scripts/build-attest.mjs and is meant to be signed outside
 * this runtime (CI OIDC / the witness). This module never signs it. Before exec, the runtime
 * compares its running artifact digest to the newest witnessed attestation.
 *   verified     digests match
 *   failed       BUILD-ATTEST-MISMATCH (one changed byte fails)
 *   not_checked  no witnessed attestation: ok null, never a pass; strict mode refuses
 * Builder identity is read only from that witnessed statement (workflow + run id). A deploy
 * var is ignored. Authorization in force at exec time is part of the check.
 * Not live. Cap-7 is not ICANN. Paid satellite stays HELD.
 * Receipts are hash-linked and sealed, not signed.
 * Author: Aziel Eliab.
 */
import { BUILD_BUNDLE_DIGEST } from "./build-meta.js";
import { canonicalize, sha256Hex } from "./session-core.js";

export const BUILD_ATTEST_SPEC = "AZRT-BUILD-ATTEST-1.0";
export const LIVE = false;
export const CAP7_IS_ICANN = false;
export const PAID_SAT = "HELD";
const HEX64 = /^[a-f0-9]{64}$/;

let witnessedAttest = null;

export function runningBundleDigest() {
  const raw = typeof BUILD_BUNDLE_DIGEST === "string" ? BUILD_BUNDLE_DIGEST.toLowerCase() : "";
  return HEX64.test(raw) ? raw : null;
}

/** Digest of bundle bytes. Changing one byte changes the digest. */
export async function digestBytes(bytes) {
  return sha256Hex(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}

/** Deterministic artifact digest over {path, sha256} entries. Same bytes, same digest. */
export async function artifactDigestFromEntries(entries) {
  const files = (entries || [])
    .map((e) => ({ path: String(e.path), sha256: String(e.sha256 || "").toLowerCase() }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return sha256Hex(canonicalize({ spec: BUILD_ATTEST_SPEC, kind: "artifact", files }));
}

export function attestFromStatement(statement) {
  const raw = statement && (statement.build_attest || (statement.heads && statement.heads.build_attest));
  if (!raw || typeof raw !== "object") return null;
  const artifact_digest = typeof raw.artifact_digest === "string" ? raw.artifact_digest.toLowerCase() : "";
  if (!HEX64.test(artifact_digest)) return null;
  const builder = raw.builder_identity && typeof raw.builder_identity === "object" ? raw.builder_identity : null;
  return {
    spec: BUILD_ATTEST_SPEC,
    source_revision: typeof raw.source_revision === "string" ? raw.source_revision : null,
    artifact_digest,
    build_environment: raw.build_environment && typeof raw.build_environment === "object" ? raw.build_environment : null,
    builder_identity: builder
      ? {
          workflow: typeof builder.workflow === "string" ? builder.workflow : null,
          run_id: typeof builder.run_id === "string" ? builder.run_id : null,
        }
      : null,
    authorization_epoch: Number.isInteger(raw.authorization_epoch) ? raw.authorization_epoch : null,
    digest: HEX64.test(String(raw.digest || "")) ? String(raw.digest).toLowerCase() : null,
  };
}

export function setWitnessedBuildAttest(attest) {
  witnessedAttest = attest && HEX64.test(String(attest.artifact_digest || "")) ? attestFromStatement({ build_attest: attest }) : null;
  return witnessedAttest;
}

export function witnessedBuildAttest() {
  return witnessedAttest;
}

export function resetBuildAttestState() {
  witnessedAttest = null;
}

/**
 * Compare the running digest to the witnessed attestation.
 * `deployVars` is accepted and ignored: builder identity never comes from a deploy var.
 */
export function checkBuildAttest({ runningDigest = null, witnessed = null, strict = false, authorization = null, deployVars = null } = {}) {
  void deployVars;
  const base = {
    spec: BUILD_ATTEST_SPEC,
    live: LIVE,
    signed: false,
    cap7_is_icann: CAP7_IS_ICANN,
    paid_sat: PAID_SAT,
    authorization_effective: authorization || null,
  };
  const builder_identity = witnessed && witnessed.builder_identity ? witnessed.builder_identity : null;
  if (!witnessed) {
    const view = {
      ...base,
      ok: null,
      status: "not_checked",
      code: "BUILD-ATTEST-NOT-CHECKED",
      reason: "no witnessed build attestation",
      builder_identity: null,
    };
    if (strict) {
      return { allowed: false, code: "BUILD-ATTEST-NOT-CHECKED", message: "Strict mode: no witnessed build attestation. Nothing ran.", view };
    }
    return { allowed: true, view };
  }
  const diffs = [];
  const liveDigest = HEX64.test(String(runningDigest || "")) ? String(runningDigest).toLowerCase() : null;
  if (!liveDigest || liveDigest !== witnessed.artifact_digest) {
    diffs.push({ field: "artifact_digest", witnessed: witnessed.artifact_digest, live: liveDigest });
  }
  if (witnessed.authorization_epoch != null && authorization && witnessed.authorization_epoch !== authorization.writer_epoch) {
    diffs.push({ field: "authorization_epoch", witnessed: witnessed.authorization_epoch, live: authorization.writer_epoch ?? null });
  }
  if (diffs.length) {
    const view = {
      ...base,
      ok: false,
      status: "failed",
      code: "BUILD-ATTEST-MISMATCH",
      diffs,
      source_revision: witnessed.source_revision || null,
      builder_identity,
    };
    return { allowed: false, code: "BUILD-ATTEST-MISMATCH", message: "Running artifact does not match the witnessed build attestation. Nothing ran.", view };
  }
  return {
    allowed: true,
    view: {
      ...base,
      ok: true,
      status: "verified",
      code: "BUILD-ATTEST-OK",
      source_revision: witnessed.source_revision || null,
      artifact_digest: witnessed.artifact_digest,
      builder_identity,
    },
  };
}

export async function assertBuildAttestForExec(session) {
  let policy_hash = null;
  if (session && session.policy) {
    const { policyHashOf } = await import("./evidence-fields.js");
    policy_hash = await policyHashOf(session.policy);
  }
  const authorization = {
    writer_epoch: session && Number.isInteger(session.writer_epoch) ? session.writer_epoch : null,
    policy_hash,
  };
  const strict = Boolean(session && session.policy && session.policy.build_attest_strict === true);
  return checkBuildAttest({
    runningDigest: runningBundleDigest(),
    witnessed: witnessedAttest,
    strict,
    authorization,
  });
}

/** What GET /v1/anchor/heads publishes for the witness to copy. Not a signature. Not live. */
export function buildAttestHead(meta = {}) {
  const running = runningBundleDigest();
  return {
    spec: BUILD_ATTEST_SPEC,
    live: false,
    signed: false,
    source_revision: meta && meta.git_sha ? meta.git_sha : null,
    artifact_digest: running,
    builder_identity: null,
    builder_identity_note: "Builder identity is taken only from a witnessed attestation (CI workflow + run id), never from a deploy var.",
    witnessed: witnessedAttest
      ? {
          artifact_digest: witnessedAttest.artifact_digest,
          source_revision: witnessedAttest.source_revision,
          builder_identity: witnessedAttest.builder_identity,
        }
      : null,
    status: witnessedAttest ? "witnessed" : "not_checked",
    ok: null,
    note: "Not live. No attestation is not a pass. Receipts are hash-linked and sealed, not signed. Cap-7 is not ICANN. Paid satellite stays HELD.",
  };
}

/**
 * RIB-052 / AZRT-FROZEN-ARTIFACT-1.0: frozen-artifact delivery check (silent-edit detector).
 *
 * - Session open (stamp #1, the same stamp that seals an expected-state spec) may carry
 *   frozen_artifacts [{ id | path, sha256 }]. They are sealed with frozen_hash before anything runs.
 * - In-session, POST /v1/session/{id}/change appends an `artifact_change` stamp
 *   { artifact, new_sha256, reason } declaring that a frozen artifact will change.
 * - On close the harness (this module, called from applyClose) hashes the delivered bytes
 *   (close body delivered_artifacts [{ id | path, content | content_b64 }]) itself and seals one
 *   `delivery_check` receipt marking each artifact unchanged / changed / missing. The caller cannot
 *   write that receipt (no additive field reaches it) and cannot skip it (it is appended whenever
 *   stamp #1 froze anything; nothing delivered = every artifact missing).
 * - A changed artifact with no matching declared change (same artifact, same new digest, a reason)
 *   refuses the verdict: FROZEN-ARTIFACT-SILENT-EDIT, sealed in the delivery_check receipt; the close
 *   receipt then carries no verdict. A missing artifact refuses FROZEN-ARTIFACT-MISSING the same way.
 * - verifyFrozenArtifacts recomputes the check from the receipts alone and fails closed.
 * Sessions without frozen_artifacts are untouched (status "no_frozen"). Receipts are hash-linked and
 * sealed, not signed. Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "./session-core.js";

export const FROZEN_SPEC = "AZRT-FROZEN-ARTIFACT-1.0";
export const MAX_FROZEN = 32;
export const MAX_KEY = 256;
export const MAX_ARTIFACT_BYTES = 65_536;
export const MAX_REASON = 512;
const HEX64 = /^[a-f0-9]{64}$/;

function bad(code, message) {
  return { ok: false, code, spec: FROZEN_SPEC, message, executed: false };
}

function keyOf(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const hasId = raw.id != null;
  const hasPath = raw.path != null;
  if (hasId === hasPath) return null; // exactly one of id / path
  const value = String(hasId ? raw.id : raw.path);
  if (!value || value.length > MAX_KEY || /[\u0000-\u001f]/.test(value)) return null;
  return { kind: hasId ? "id" : "path", key: value };
}

/** Normalize open-time frozen_artifacts. null = none given (old behaviour). */
export async function frozenArtifactsOf(raw) {
  if (raw == null) return null;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_FROZEN) {
    return bad("FROZEN-ARTIFACT-INVALID", `frozen_artifacts must be a non-empty array of at most ${MAX_FROZEN} { id | path, sha256 }.`);
  }
  const seen = new Set();
  const list = [];
  for (const item of raw) {
    const k = keyOf(item);
    if (!k) return bad("FROZEN-ARTIFACT-INVALID", `each frozen artifact needs exactly one of id or path (1-${MAX_KEY} chars).`);
    const sha = String(item.sha256 || "").toLowerCase();
    if (!HEX64.test(sha)) return bad("FROZEN-ARTIFACT-INVALID", "each frozen artifact needs sha256 (64 hex).");
    if (seen.has(k.key)) return bad("FROZEN-ARTIFACT-INVALID", "frozen artifact ids/paths must be unique.");
    seen.add(k.key);
    list.push({ [k.kind]: k.key, sha256: sha });
  }
  return { ok: true, frozen_artifacts: list, frozen_hash: await frozenHashOf(list) };
}

export async function frozenHashOf(list) {
  return sha256Hex(canonicalize({ spec: FROZEN_SPEC, frozen_artifacts: list }));
}

const artifactKey = (a) => (a && (a.id != null ? String(a.id) : a.path != null ? String(a.path) : null));

/** The frozen set sealed on stamp #1, or null. */
export function frozenOf(receipts) {
  const first = (receipts || [])[0];
  return first && Array.isArray(first.frozen_artifacts) ? first.frozen_artifacts : null;
}

/** Validate a declared change body against the sealed frozen set. */
export function changeRequestOf(raw, receipts) {
  const frozen = frozenOf(receipts);
  if (!frozen) return bad("FROZEN-ARTIFACT-NONE", "stamp #1 froze no artifacts; nothing to declare a change against.");
  if (!raw || typeof raw !== "object") return bad("FROZEN-CHANGE-INVALID", "change needs { artifact, new_sha256, reason }.");
  const artifact = raw.artifact != null ? String(raw.artifact) : "";
  if (!frozen.some((a) => artifactKey(a) === artifact)) return bad("FROZEN-CHANGE-UNKNOWN", "artifact must be an id/path frozen at stamp #1.");
  const sha = String(raw.new_sha256 || "").toLowerCase();
  if (!HEX64.test(sha)) return bad("FROZEN-CHANGE-INVALID", "new_sha256 must be 64 hex.");
  const reason = raw.reason != null ? String(raw.reason).trim() : "";
  if (!reason || reason.length > MAX_REASON) return bad("FROZEN-CHANGE-INVALID", `reason is required (1-${MAX_REASON} chars).`);
  return { ok: true, change: { spec: FROZEN_SPEC, artifact, new_sha256: sha, reason } };
}

function bytesOf(item) {
  if (item.content_b64 != null) {
    const bin = atob(String(item.content_b64));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new TextEncoder().encode(String(item.content));
}

async function sha256Bytes(bytes) {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Harness side: hash what was delivered at close. Returns { key -> observed sha256 }. Bad input refuses. */
export async function observeDelivered(raw) {
  const observed = {};
  if (raw == null) return { ok: true, observed };
  if (!Array.isArray(raw) || raw.length > MAX_FROZEN) return bad("FROZEN-DELIVERY-INVALID", `delivered_artifacts must be an array of at most ${MAX_FROZEN}.`);
  for (const item of raw) {
    const k = keyOf(item);
    if (!k) return bad("FROZEN-DELIVERY-INVALID", "each delivered artifact needs exactly one of id or path.");
    if (item.content == null && item.content_b64 == null) return bad("FROZEN-DELIVERY-INVALID", "each delivered artifact needs content or content_b64 (bytes, never a digest).");
    let bytes;
    try {
      bytes = bytesOf(item);
    } catch {
      return bad("FROZEN-DELIVERY-INVALID", "content_b64 is not base64.");
    }
    if (bytes.length > MAX_ARTIFACT_BYTES) return bad("FROZEN-DELIVERY-INVALID", `each delivered artifact is at most ${MAX_ARTIFACT_BYTES} bytes.`);
    if (observed[k.key] != null) return bad("FROZEN-DELIVERY-INVALID", "delivered artifacts must be unique.");
    observed[k.key] = await sha256Bytes(bytes);
  }
  return { ok: true, observed };
}

/** Declared changes appended in-session (latest declaration per artifact wins). */
export function declaredChanges(receipts) {
  const out = {};
  for (const r of receipts || []) {
    if (r && r.event === "artifact_change" && r.artifact_change) out[r.artifact_change.artifact] = { ...r.artifact_change, receipt_hash: r.hash, seq: r.seq };
  }
  return out;
}

/** Pure: derive the check from frozen set + observed digests + declared changes. */
export function computeCheck(frozen, observed, declared) {
  const artifacts = [];
  let refused = null;
  for (const a of frozen) {
    const key = artifactKey(a);
    const got = observed[key] != null ? observed[key] : null;
    const status = got == null ? "missing" : got === a.sha256 ? "unchanged" : "changed";
    const row = { artifact: key, frozen_sha256: a.sha256, observed_sha256: got, status };
    if (status === "changed") {
      const d = declared[key];
      if (d && d.new_sha256 === got && d.reason) {
        row.declared = true;
        row.change = { new_sha256: d.new_sha256, reason: d.reason, receipt_hash: d.receipt_hash };
      } else {
        row.declared = false;
        refused = "FROZEN-ARTIFACT-SILENT-EDIT";
      }
    }
    if (status === "missing" && !refused) refused = "FROZEN-ARTIFACT-MISSING";
    artifacts.push(row);
  }
  const counts = { unchanged: 0, changed: 0, missing: 0 };
  for (const r of artifacts) counts[r.status]++;
  return {
    spec: FROZEN_SPEC,
    written_by: "harness",
    artifacts,
    counts,
    verdict_allowed: refused == null,
    refused: refused ? { code: refused, sealed: true } : null,
  };
}

/** Harness: build the delivery_check payload for close (or null when nothing was frozen). */
export async function deliveryCheckFor(receipts, deliveredRaw) {
  const frozen = frozenOf(receipts);
  if (!frozen) return null;
  const obs = await observeDelivered(deliveredRaw);
  if (!obs.ok) return obs;
  return { ok: true, check: computeCheck(frozen, obs.observed, declaredChanges(receipts)) };
}

/**
 * Verify from the chain alone (fail closed):
 *   FROZEN-ARTIFACT-LATE        frozen_artifacts / frozen_hash on any stamp but #1
 *   FROZEN-ARTIFACT-TAMPERED    stamp #1 frozen_hash != recomputed hash
 *   FROZEN-CHANGE-UNSEALED      artifact_change on a chain that froze nothing, or naming an unknown artifact
 *   FROZEN-CHECK-MISSING        a closed chain that froze artifacts has no delivery_check in the close tail
 *                                 (RIB-055 unaudited_gap / reconcile may sit between it and close)
 *   FROZEN-CHECK-DUPLICATE      more than one delivery_check
 *   FROZEN-CHECK-FORGED         delivery_check not written by the harness, or its rows/verdict differ from recompute
 *   FROZEN-ARTIFACT-SILENT-EDIT a changed artifact has no matching declared change
 *   FROZEN-VERDICT-REFUSED      a verdict was sealed although the check refused it
 */
export async function verifyFrozenArtifacts(receipts) {
  const list = (receipts || []).filter(Boolean);
  const errors = [];
  const first = list[0] || null;
  const frozen = first && Array.isArray(first.frozen_artifacts) ? first.frozen_artifacts : null;
  if (first && (first.frozen_hash != null || first.frozen_artifacts != null)) {
    if (!frozen || first.frozen_hash !== (await frozenHashOf(frozen))) errors.push({ seq: first.seq ?? 1, code: "FROZEN-ARTIFACT-TAMPERED" });
  }
  const keys = new Set((frozen || []).map(artifactKey));
  const checks = [];
  for (let i = 1; i < list.length; i++) {
    const r = list[i];
    const seq = r.seq ?? i + 1;
    if (r.frozen_artifacts != null || r.frozen_hash != null) errors.push({ seq, code: "FROZEN-ARTIFACT-LATE" });
    if (r.artifact_change != null) {
      if (r.event !== "artifact_change" || !frozen || !keys.has(r.artifact_change.artifact)) errors.push({ seq, code: "FROZEN-CHANGE-UNSEALED" });
    }
    if (r.delivery_check != null || r.event === "delivery_check") checks.push({ r, i, seq });
  }
  if (checks.length > 1) errors.push({ seq: checks[1].seq, code: "FROZEN-CHECK-DUPLICATE" });
  const close = list.find((r) => r.event === "close");
  let status = frozen ? "open" : "no_frozen";
  let check = null;
  if (frozen && close) {
    const c = checks[0];
    const closeIdx = list.indexOf(close);
    // RIB-055 harness rows (unaudited_gap, reconcile) may sit between delivery_check and close.
    let expectAt = closeIdx - 1;
    while (expectAt >= 0 && (list[expectAt].event === "unaudited_gap" || list[expectAt].event === "reconcile")) expectAt -= 1;
    if (!c || c.i !== expectAt) {
      errors.push({ seq: close.seq, code: "FROZEN-CHECK-MISSING" });
    } else {
      const got = c.r.delivery_check || {};
      const observed = {};
      for (const row of got.artifacts || []) if (row && row.observed_sha256 != null) observed[row.artifact] = row.observed_sha256;
      // Only changes sealed BEFORE the check count.
      const want = computeCheck(frozen, observed, declaredChanges(list.slice(0, c.i)));
      if (got.written_by !== "harness" || canonicalize(want) !== canonicalize(got)) errors.push({ seq: c.seq, code: "FROZEN-CHECK-FORGED" });
      if (want.refused && want.refused.code === "FROZEN-ARTIFACT-SILENT-EDIT") errors.push({ seq: c.seq, code: "FROZEN-ARTIFACT-SILENT-EDIT" });
      if (!want.verdict_allowed && close.verdict != null) errors.push({ seq: close.seq, code: "FROZEN-VERDICT-REFUSED" });
      check = want;
      status = want.verdict_allowed ? "delivered" : "refused";
    }
  } else if (!frozen && checks.length) {
    errors.push({ seq: checks[0].seq, code: "FROZEN-CHECK-FORGED" });
  }
  return {
    spec: FROZEN_SPEC,
    ok: errors.length === 0,
    status: errors.length ? "failed" : status,
    frozen_hash: frozen ? first.frozen_hash : null,
    counts: check ? check.counts : null,
    refused: check ? check.refused : null,
    errors,
  };
}

/**
 * FED-MESH-1.0 mesh security helpers.
 * Proof-of-work, airgap manifest checks. No scanner and no code execution.
 * Author: Aziel Eliab only.
 */

import { canonicalStatement, hashStatement, isHex64, publicKeyMatchesHandle } from "./codec.js";
import { verifyObject } from "./identity.js";
import { FED_SPEC, NAME_BLOCKLIST, NAME_POW_BITS } from "./spec.js";
import { sha256Hex } from "../session-core.js";

export function leadingZeroBits(hex) {
  const s = String(hex || "").toLowerCase();
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const v = Number.parseInt(s[i], 16);
    if (!Number.isFinite(v)) return n;
    if (v === 0) {
      n += 4;
      continue;
    }
    if (v >= 8) return n;
    if (v >= 4) return n + 1;
    if (v >= 2) return n + 2;
    return n + 3;
  }
  return n;
}

/** Hashcash over the signed claim. The nonce is outside the signature. */
export async function namePowDigest(statementHash, sig, nonce) {
  return sha256Hex(`${statementHash}\n${sig}\n${nonce}`);
}

export async function findNamePow(statementHash, sig, minBits = NAME_POW_BITS) {
  const bits = Number(minBits);
  for (let i = 0; i < 250000; i++) {
    const nonce = i.toString(16);
    const digest = await namePowDigest(statementHash, sig, nonce);
    if (leadingZeroBits(digest) >= bits) return { nonce, bits, digest };
  }
  return null;
}

export async function verifyNamePow(statementHash, sig, pow, minBits = NAME_POW_BITS) {
  if (!pow || typeof pow !== "object" || Array.isArray(pow)) return { ok: false, reason: "missing" };
  const nonce = String(pow.nonce || "");
  if (!/^[0-9a-f]{1,64}$/.test(nonce)) return { ok: false, reason: "nonce" };
  const bits = Number(pow.bits);
  if (!Number.isInteger(bits) || bits < minBits || bits > 256) return { ok: false, reason: "bits" };
  const digest = await namePowDigest(statementHash, sig, nonce);
  if (pow.digest != null && String(pow.digest) !== digest) return { ok: false, reason: "digest", digest };
  if (leadingZeroBits(digest) < bits) return { ok: false, reason: "work", digest };
  return { ok: true, digest, bits };
}

/**
 * Blocklist check for one .aziel label (no suffix).
 * Substring tokens match inside the letters-and-digits fold, longest first.
 * Exact tokens match the whole label or one hyphen-part only.
 */
export function nameBlockHit(label) {
  const raw = String(label || "").toLowerCase();
  if (!raw) return null;
  const folded = raw.replace(/[^a-z0-9]/g, "");
  const parts = raw.split("-").filter(Boolean);
  const substrings = NAME_BLOCKLIST.filter((row) => row.scope !== "exact" && row.token.length >= 4).slice().sort((a, b) => b.token.length - a.token.length);
  for (const row of substrings) {
    if (folded.includes(row.token) || raw.includes(row.token)) {
      return { token: row.token, reason: row.reason, match: "substring" };
    }
  }
  for (const row of NAME_BLOCKLIST) {
    if (raw === row.token || folded === row.token || parts.includes(row.token)) {
      return { token: row.token, reason: row.reason, match: "label" };
    }
  }
  return null;
}

const AIRGAP_NAME = /^[a-z0-9][a-z0-9._/-]{0,127}$/;

export function airgapStatement(body) {
  return {
    v: FED_SPEC,
    kind: "airgap-bundle",
    handle: body.handle,
    public_key: body.public_key,
    manifest: body.manifest,
  };
}

export async function verifyAirgapBundle(body) {
  if (!body || body.v !== FED_SPEC || body.kind !== "airgap-bundle") {
    return { ok: false, code: "FED-MESH-BAD-INPUT", message: "An airgap bundle is a signed manifest." };
  }
  const handleOk = await publicKeyMatchesHandle(body.public_key, body.handle);
  if (!handleOk) return { ok: false, code: "FED-MESH-HANDLE-MISMATCH", message: "Handle does not match the signing key." };
  const manifest = body.manifest;
  if (!manifest || !Array.isArray(manifest.files) || manifest.files.length < 1 || manifest.files.length > 64) {
    return { ok: false, code: "FED-MESH-BAD-INPUT", message: "manifest.files holds 1 to 64 sha256 rows." };
  }
  for (const file of manifest.files) {
    if (!file || !AIRGAP_NAME.test(String(file.name || "")) || !isHex64(String(file.sha256 || "").toLowerCase())) {
      return { ok: false, code: "FED-MESH-BAD-INPUT", message: "Each file is a relative name and a 64-hex sha256." };
    }
    if (String(file.name).includes("..")) {
      return { ok: false, code: "FED-MESH-BAD-INPUT", message: "Airgap paths stay inside the bundle." };
    }
  }
  const manifest_sha256 = await sha256Hex(canonicalStatement(manifest));
  if (String(body.manifest_sha256 || "").toLowerCase() !== manifest_sha256) {
    return { ok: false, code: "FED-MESH-HASH-MISMATCH", message: "manifest_sha256 does not match the manifest.", gate: "FG-GATE-REFUSE" };
  }
  const statement = airgapStatement(body);
  const good = await verifyObject(body.public_key, statement, body.sig);
  if (!good) return { ok: false, code: "FED-MESH-BAD-SIG", message: "Airgap signature did not verify." };
  const link = await hashStatement(statement);
  return {
    ok: true,
    code: "FED-MESH-OK",
    manifest_sha256,
    statement_hash: link,
    files: manifest.files.length,
    stored: false,
    executable: false,
    scanner: "absent",
    disk_check: "sha256sum -c on the disconnected machine",
  };
}

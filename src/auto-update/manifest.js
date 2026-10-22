/**
 * AZ-UPDATE-MANIFEST-1.0: signed release manifest verify (AUTO-UPDATE-1.0). Fail closed.
 * Python twin: tools/auto_update_verify.py (same hash, same codes). live:false.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { canonicalize, sha256Hex } from "../session-core.js";

export const MANIFEST_SPEC = "AZ-UPDATE-MANIFEST-1.0";
/**
 * Pinned release public key (raw Ed25519, base64url). Private half lives only in the GitHub Actions secret
 * AUTO_UPDATE_SIGNING_KEY on AzielEliab/aziel-runtime. fingerprint = sha256(raw 32-byte key).
 * Scoped: the pinned key only vouches for RELEASE_KEY_PRODUCTS; any other build, or an explicit null key, refuses UPDATE-NO-KEY.
 */
export const RELEASE_PUBLIC_KEY = "_3mc9CfQWexUWcyqDadNoQLjb6fFFPRv_XfWirwuH9s";
export const RELEASE_KEY_FINGERPRINT = "822b409723b81a0dc3fe3f132a2cb95b72b1ec2b2b16c055c526b627132a4ce8";
export const RELEASE_KEY_PRODUCTS = Object.freeze(["aziel-runtime"]);
/** Devices follow the stable channel only (Aziel, 2026-10-22). Anything else refuses UPDATE-CHANNEL-REFUSED, mesh peers included. */
export const ACCEPTED_CHANNELS = Object.freeze(["stable"]);
export const UPDATE_CODES = Object.freeze({
  off: "UPDATE-OFF", paused: "UPDATE-PAUSED", noKey: "UPDATE-NO-KEY", shape: "UPDATE-MANIFEST-SHAPE",
  product: "UPDATE-PRODUCT", channel: "UPDATE-CHANNEL-REFUSED", sig: "UPDATE-SIG", downgrade: "UPDATE-DOWNGRADE", hash: "UPDATE-HASH",
  carrier: "UPDATE-CARRIER-ABSENT", state: "UPDATE-STATE", chain: "UPDATE-CHAIN", health: "UPDATE-HEALTH", ok: "UPDATE-OK",
});
/** Safe artifact filename: no slashes, no "..", no leading dot. */
export const ARTIFACT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const HEX64 = /^[a-f0-9]{64}$/, HEX40 = /^[a-f0-9]{40}$/;
const KEYS = ["artifact", "channel", "git_sha", "issued_at", "prev_manifest_hash", "product", "spec", "version", "version_seq"];

const b64u = (s) => { const b = atob(String(s).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(s).length + 3) % 4)); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

export function manifestShapeOk(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) return false;
  if (Object.keys(m).sort().join() !== KEYS.join()) return false;
  const a = m.artifact;
  return m.spec === MANIFEST_SPEC && typeof m.product === "string" && /^[a-z0-9-]{1,64}$/.test(m.product)
    && typeof m.version === "string" && m.version.length <= 40 && Number.isSafeInteger(m.version_seq) && m.version_seq > 0
    && HEX40.test(m.git_sha || "") && (m.channel === "stable" || m.channel === "rc") && typeof m.issued_at === "string"
    && (m.prev_manifest_hash === null || HEX64.test(m.prev_manifest_hash))
    && a && typeof a === "object" && Object.keys(a).sort().join() === "name,sha256,size"
    && typeof a.name === "string" && ARTIFACT_NAME.test(a.name) && !a.name.includes("..") && Number.isSafeInteger(a.size) && a.size >= 0 && HEX64.test(a.sha256 || "");
}

export const manifestHash = (m) => sha256Hex(canonicalize(m));

async function sigOk(pub, m, sig) {
  try {
    const key = await crypto.subtle.importKey("raw", b64u(pub), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, b64u(sig), new TextEncoder().encode(canonicalize(m)));
  } catch { return false; }
}

/**
 * Decide whether a manifest may be applied. Pure except for crypto. Returns {ok, code, manifest_hash?}.
 * state: { product, installed_seq, floor_seq }. publicKey defaults to the pinned key (null -> refuse).
 */
export async function verifyManifest(manifest, signature, state, { publicKey = RELEASE_PUBLIC_KEY } = {}) {
  if (!publicKey) return { ok: false, code: UPDATE_CODES.noKey };
  if (!manifestShapeOk(manifest)) return { ok: false, code: UPDATE_CODES.shape };
  if (!state || manifest.product !== state.product) return { ok: false, code: UPDATE_CODES.product };
  if (publicKey === RELEASE_PUBLIC_KEY && !RELEASE_KEY_PRODUCTS.includes(manifest.product)) return { ok: false, code: UPDATE_CODES.noKey };
  if (!ACCEPTED_CHANNELS.includes(manifest.channel)) return { ok: false, code: UPDATE_CODES.channel };
  if (typeof signature !== "string" || !(await sigOk(publicKey, manifest, signature))) return { ok: false, code: UPDATE_CODES.sig };
  const seqOk = (x) => x === undefined || x === null || (Number.isSafeInteger(x) && x >= 0);
  if (!seqOk(state.installed_seq) || !seqOk(state.floor_seq)) return { ok: false, code: UPDATE_CODES.state };
  const floor = Math.max(state.installed_seq ?? 0, state.floor_seq ?? 0);
  if (manifest.version_seq <= floor) return { ok: false, code: UPDATE_CODES.downgrade };
  if (typeof state.last_manifest_hash === "string" && manifest.prev_manifest_hash !== state.last_manifest_hash) return { ok: false, code: UPDATE_CODES.chain };
  return { ok: true, code: UPDATE_CODES.ok, manifest_hash: await manifestHash(manifest) };
}

/** Artifact bytes must match size and sha256 exactly. */
export async function verifyArtifact(manifest, bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== manifest.artifact.size) return { ok: false, code: UPDATE_CODES.hash };
  return (await sha256Hex(bytes)) === manifest.artifact.sha256 ? { ok: true, code: UPDATE_CODES.ok } : { ok: false, code: UPDATE_CODES.hash };
}

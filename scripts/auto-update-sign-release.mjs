/**
 * AUTO-UPDATE-1.0 release signer (CI only). Reads the Ed25519 PKCS8 PEM from env AUTO_UPDATE_SIGNING_KEY,
 * builds AZ-UPDATE-MANIFEST-1.0 for one artifact, signs canonical bytes, self-verifies against the PINNED key,
 * writes an envelope {manifest, signature, url, key_fingerprint}. Fails closed: missing secret, prerelease,
 * non-stable channel, wrong key, bad shape -> exit 1. Never prints the key.
 * Usage: node scripts/auto-update-sign-release.mjs <artifact> <out.json>
 *   env: TAG, VERSION_SEQ, GIT_SHA, RELEASE_URL_BASE, PRERELEASE, PREV_MANIFEST_HASH(optional)
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { createPrivateKey, sign as edSign } from "node:crypto";
import { canonicalize, sha256Hex } from "../src/session-core.js";
import { verifyManifest, manifestShapeOk, MANIFEST_SPEC, RELEASE_PUBLIC_KEY, RELEASE_KEY_FINGERPRINT } from "../src/auto-update/manifest.js";

const die = (m) => { console.error("AUTO-UPDATE-SIGN refused: " + m); process.exit(1); };
export async function buildAndSign({ pem, artifactPath, out, env }) {
  if (!pem || !String(pem).includes("PRIVATE KEY")) die("AUTO_UPDATE_SIGNING_KEY secret missing");
  if (String(env.PRERELEASE) !== "false") die("prerelease or unknown release type: devices follow stable only");
  const seq = Number(env.VERSION_SEQ);
  if (!Number.isSafeInteger(seq) || seq <= 0) die("VERSION_SEQ");
  const tag = String(env.TAG || "").replace(/^v/, "");
  const bytes = new Uint8Array(readFileSync(artifactPath));
  const prev = env.PREV_MANIFEST_HASH && /^[a-f0-9]{64}$/.test(env.PREV_MANIFEST_HASH) ? env.PREV_MANIFEST_HASH : null;
  const manifest = { spec: MANIFEST_SPEC, product: "aziel-runtime", version: tag, version_seq: seq, git_sha: String(env.GIT_SHA || ""),
    channel: "stable", artifact: { name: basename(artifactPath), size: bytes.length, sha256: await sha256Hex(bytes) },
    issued_at: new Date().toISOString(), prev_manifest_hash: prev };
  if (!manifestShapeOk(manifest)) die("manifest shape");
  let key; try { key = createPrivateKey(pem); } catch { die("secret is not a valid key"); }
  if (key.asymmetricKeyType !== "ed25519") die("secret is not Ed25519");
  const signature = edSign(null, Buffer.from(canonicalize(manifest)), key).toString("base64url");
  const v = await verifyManifest(manifest, signature, { product: "aziel-runtime", installed_seq: 0, floor_seq: 0 });
  if (!v.ok) die("self-verify against pinned key failed (" + v.code + "): secret does not match pinned key " + RELEASE_KEY_FINGERPRINT.slice(0, 12));
  const env2 = { manifest, signature, manifest_hash: v.manifest_hash, url: `${env.RELEASE_URL_BASE}/${manifest.artifact.name}`, key_fingerprint: RELEASE_KEY_FINGERPRINT };
  writeFileSync(out, JSON.stringify(env2, null, 2) + "\n");
  return env2;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [artifactPath, out] = process.argv.slice(2);
  if (!artifactPath || !out) die("usage");
  if (!RELEASE_PUBLIC_KEY) die("no pinned key");
  const e = await buildAndSign({ pem: process.env.AUTO_UPDATE_SIGNING_KEY, artifactPath, out, env: process.env });
  console.log(`signed ${e.manifest.product} ${e.manifest.version} seq ${e.manifest.version_seq} manifest_hash ${e.manifest_hash}`);
}

/**
 * GET /v1/version body (AUTO-UPDATE-1.0). Read-only. Shape is fixed for adoption monitoring:
 * {ok, product, version, git_sha, manifest_hash, update_channel, auto_update:{enabled, paused, key_pinned,
 *  last_check, last_applied, last_code}, live:false, writes:false}
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { RELEASE_PUBLIC_KEY, RELEASE_KEY_FINGERPRINT, ACCEPTED_CHANNELS, MANIFEST_SPEC } from "./manifest.js";
import { UPDATER_SPEC } from "./updater.js";

export async function versionBody(env, meta, version, product = "aziel-runtime") {
  const sha = meta && meta.git_sha;
  return {
    ok: true, product, version,
    git_sha: typeof sha === "string" && /^[a-f0-9]{7,40}$/.test(sha) ? sha : null,
    manifest_hash: null, // no signed release manifest published yet
    update_channel: ACCEPTED_CHANNELS[0], // "stable" only (Aziel 2026-10-22); not env-switchable
    auto_update: { enabled: false, paused: false, key_pinned: !!RELEASE_PUBLIC_KEY, last_check: null, last_applied: null, last_code: RELEASE_PUBLIC_KEY ? null : "UPDATE-NO-KEY" },
    release_key_fingerprint: RELEASE_PUBLIC_KEY ? RELEASE_KEY_FINGERPRINT : null,
    spec: UPDATER_SPEC, manifest_spec: MANIFEST_SPEC,
    note: "Workers cannot self-replace; the updater applies on device/node installs. enabled stays false until AUTO_UPDATE=on on a node. Stable channel only.",
    live: false, writes: false,
  };
}

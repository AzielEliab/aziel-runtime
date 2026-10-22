/**
 * GET /v1/version body (AUTO-UPDATE-1.0). Read-only. Shape is fixed for adoption monitoring:
 * {ok, product, version, git_sha, manifest_hash, update_channel, auto_update:{enabled, paused, key_pinned,
 *  last_check, last_applied, last_code}, live:false, writes:false}
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { RELEASE_PUBLIC_KEY, MANIFEST_SPEC } from "./manifest.js";
import { UPDATER_SPEC } from "./updater.js";

export async function versionBody(env, meta, version, product = "aziel-runtime") {
  const sha = meta && meta.git_sha;
  return {
    ok: true, product, version,
    git_sha: typeof sha === "string" && /^[a-f0-9]{7,40}$/.test(sha) ? sha : null,
    manifest_hash: null, // no signed release manifest exists yet (no release key)
    update_channel: env && env.UPDATE_CHANNEL === "stable" ? "stable" : "rc",
    auto_update: { enabled: false, paused: false, key_pinned: !!RELEASE_PUBLIC_KEY, last_check: null, last_applied: null, last_code: RELEASE_PUBLIC_KEY ? null : "UPDATE-NO-KEY" },
    spec: UPDATER_SPEC, manifest_spec: MANIFEST_SPEC,
    note: "Workers cannot self-replace; the updater applies on device/node installs. enabled stays false until a release key is pinned and AUTO_UPDATE=on on a node.",
    live: false, writes: false,
  };
}

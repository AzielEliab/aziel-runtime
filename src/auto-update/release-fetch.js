/**
 * Fetch the latest non-prerelease GitHub release envelope (auto-update-manifest.json).
 * Prerelease, draft, and any channel other than ACCEPTED_CHANNELS are not offered.
 * Missing asset or a bad envelope returns null. The caller still verifies signature and hash.
 * live:false. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { ACCEPTED_CHANNELS } from "./manifest.js";

export const RELEASE_REPO = "AzielEliab/aziel-runtime";
export const RELEASE_MANIFEST_NAME = "auto-update-manifest.json";

export async function fetchStableRelease(opts = {}) {
  const fetchFn = Object.prototype.hasOwnProperty.call(opts, "fetchImpl") ? opts.fetchImpl : globalThis.fetch;
  if (typeof fetchFn !== "function") return null;
  const repo = opts.repo || RELEASE_REPO;
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : 8000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const pull = (url, headers) => fetchFn(url, { headers, signal: ac.signal });
  let listed;
  try {
    const res = await pull(`https://api.github.com/repos/${repo}/releases/latest`, {
      accept: "application/vnd.github+json",
      "user-agent": "aziel-runtime",
    });
    if (!res || res.ok !== true) return null;
    listed = await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!listed || listed.prerelease === true || listed.draft === true) return null;
  const assets = Array.isArray(listed.assets) ? listed.assets : [];
  const asset = assets.find((a) => a && a.name === RELEASE_MANIFEST_NAME && typeof a.browser_download_url === "string");
  if (!asset) return null;
  let envelope;
  const ac2 = new AbortController();
  const timer2 = setTimeout(() => ac2.abort(), timeoutMs);
  try {
    const res = await fetchFn(asset.browser_download_url, { headers: { accept: "application/json", "user-agent": "aziel-runtime" }, signal: ac2.signal });
    if (!res || res.ok !== true) return null;
    envelope = await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer2);
  }
  const manifest = envelope && envelope.manifest;
  if (!manifest || typeof envelope.signature !== "string") return null;
  if (!ACCEPTED_CHANNELS.includes(manifest.channel)) return null;
  const artifactUrl = typeof envelope.url === "string" ? envelope.url : null;
  return { manifest, signature: envelope.signature, artifactUrl };
}

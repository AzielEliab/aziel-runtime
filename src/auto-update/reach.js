/**
 * Real internet reachability probe for AUTO-UPDATE-1.0. One HTTPS HEAD, short timeout.
 * Any HTTP status means the network answered. A throw, abort, or missing fetch is not reachable.
 * This does not download a release. live:false.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
export const REACH_PROBE_URL = "https://github.com/AzielEliab/aziel-runtime";

export async function probeInternetReach(opts = {}) {
  const fetchFn = Object.prototype.hasOwnProperty.call(opts, "fetchImpl") ? opts.fetchImpl : globalThis.fetch;
  if (typeof fetchFn !== "function") return { ok: false, reachable: false, code: "UPDATE-NO-REACH-PROBE", live: false };
  const url = typeof opts.url === "string" && opts.url ? opts.url : REACH_PROBE_URL;
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : 2000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { method: "HEAD", redirect: "manual", signal: ac.signal });
    const status = res && typeof res.status === "number" ? res.status : 0;
    const reachable = status >= 100 && status < 600;
    return { ok: reachable, reachable, status, code: reachable ? "UPDATE-REACHABLE" : "UPDATE-INTERNET-UNREACHABLE", live: false };
  } catch {
    return { ok: false, reachable: false, code: "UPDATE-INTERNET-UNREACHABLE", live: false };
  } finally {
    clearTimeout(timer);
  }
}

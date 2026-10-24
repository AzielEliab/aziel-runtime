/**
 * Reconnect signal for AUTO-UPDATE-1.0. On Linux, route-table changes show up on /proc/net/route
 * (a link coming back installs a route). The watch is debounced, then onInternetReach runs the
 * HTTPS HEAD probe. A route event is not itself reachability. If this platform cannot open that
 * watch, the result is UPDATE-NO-RECONNECT-WATCH and no event is invented. Start still probes once.
 * live:false. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { watch } from "node:fs";
import { onInternetReach } from "./triggers.js";

export const RECONNECT_DEBOUNCE_MS = 2000;
export const RECONNECT_WATCH_PATHS = Object.freeze(["/proc/net/route"]);
export const UPDATE_RECONNECT_WATCH = "UPDATE-RECONNECT-WATCH";
export const UPDATE_NO_RECONNECT_WATCH = "UPDATE-NO-RECONNECT-WATCH";

function closeQuiet(watcher) {
  try { if (watcher && typeof watcher.close === "function") watcher.close(); } catch { /* already closed */ }
}

export function attachInternetReconnect(host, opts = {}) {
  const stopIdle = () => {};
  if (!host || host.enabled !== true) {
    return { ok: false, code: "UPDATE-OFF", enabled: false, live: false, stop: stopIdle };
  }
  const debounceMs = Number.isFinite(opts.debounceMs) && opts.debounceMs >= 0 ? opts.debounceMs : RECONNECT_DEBOUNCE_MS;
  const onReach = typeof opts.onReach === "function" ? opts.onReach : (item) => onInternetReach(item);
  let timer = null;
  let watcher = null;
  let stopped = false;
  const fire = () => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (stopped) return;
      Promise.resolve(onReach(host)).catch(() => {});
    }, debounceMs);
    if (timer && typeof timer.unref === "function") timer.unref();
  };
  const stop = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
    closeQuiet(watcher);
    watcher = null;
  };
  if (typeof opts.watchImpl === "function") {
    try { watcher = opts.watchImpl(fire) || { close() {} }; }
    catch { return { ok: false, code: UPDATE_NO_RECONNECT_WATCH, enabled: true, live: false, stop }; }
    return { ok: true, code: UPDATE_RECONNECT_WATCH, enabled: true, live: false, debounceMs, path: "watchImpl", stop };
  }
  const paths = Array.isArray(opts.paths) && opts.paths.length ? opts.paths : RECONNECT_WATCH_PATHS;
  let opened = null;
  for (const path of paths) {
    try {
      watcher = watch(path, () => fire());
      if (watcher && typeof watcher.unref === "function") watcher.unref();
      opened = path;
      break;
    } catch {
      watcher = null;
    }
  }
  if (!opened) return { ok: false, code: UPDATE_NO_RECONNECT_WATCH, enabled: true, live: false, stop };
  return { ok: true, code: UPDATE_RECONNECT_WATCH, enabled: true, live: false, debounceMs, path: opened, stop };
}

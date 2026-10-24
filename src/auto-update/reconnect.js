/**
 * Reconnect signal for AUTO-UPDATE-1.0. live:false.
 * The route file is re-read on an interval and hashed. A content change starts the debounce,
 * then onInternetReach runs the HTTPS HEAD probe. The route text is not reachability.
 * inotify is not used: Linux procfs does not emit those events, so fs.watch on /proc/net/route
 * stays silent while the file contents change.
 * If the route file cannot be read, `ip monitor route` (netlink) is the fallback.
 * If neither works, the result is UPDATE-NO-RECONNECT-WATCH. No reconnect is invented.
 * The start probe still runs. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { onInternetReach } from "./triggers.js";

export const RECONNECT_DEBOUNCE_MS = 2000;
export const RECONNECT_POLL_MS = 1000;
export const RECONNECT_ROUTE_PATH = "/proc/net/route";
export const UPDATE_RECONNECT_WATCH = "UPDATE-RECONNECT-WATCH";
export const UPDATE_NO_RECONNECT_WATCH = "UPDATE-NO-RECONNECT-WATCH";

function hashText(text) {
  return createHash("sha256").update(String(text)).digest("hex");
}

function readRoute(path) {
  return readFileSync(path, "utf8");
}

function ipMonitorStaysUp() {
  const probe = spawnSync("ip", ["monitor", "route"], { timeout: 200, stdio: "ignore" });
  if (probe.error && probe.error.code === "ETIMEDOUT") return true;
  return probe.signal === "SIGTERM" || probe.signal === "SIGKILL";
}

function startIpMonitor(fire) {
  if (!ipMonitorStaysUp()) return null;
  let child;
  try {
    child = spawn("ip", ["monitor", "route"], { stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
  child.on("error", () => {});
  child.stdout.on("data", () => fire());
  if (typeof child.unref === "function") child.unref();
  if (child.stdout && typeof child.stdout.unref === "function") child.stdout.unref();
  return child;
}

export function attachInternetReconnect(host, opts = {}) {
  const stopIdle = () => {};
  if (!host || host.enabled !== true) {
    return { ok: false, code: "UPDATE-OFF", enabled: false, live: false, method: null, stop: stopIdle };
  }
  const debounceMs = Number.isFinite(opts.debounceMs) && opts.debounceMs >= 0 ? opts.debounceMs : RECONNECT_DEBOUNCE_MS;
  const pollMs = Number.isFinite(opts.pollMs) && opts.pollMs > 0 ? opts.pollMs : RECONNECT_POLL_MS;
  const routePath = typeof opts.routePath === "string" && opts.routePath ? opts.routePath : RECONNECT_ROUTE_PATH;
  const onReach = typeof opts.onReach === "function" ? opts.onReach : (item) => onInternetReach(item);
  let timer = null;
  let poller = null;
  let child = null;
  let stopped = false;
  let last = null;
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
    if (poller) clearInterval(poller);
    poller = null;
    if (child) {
      try { child.kill(); } catch { /* already gone */ }
      child = null;
    }
  };
  let opened = false;
  try {
    last = hashText(readRoute(routePath));
    opened = true;
  } catch {
    opened = false;
  }
  if (opened) {
    poller = setInterval(() => {
      if (stopped) return;
      let next;
      try { next = hashText(readRoute(routePath)); } catch { return; }
      if (next === last) return;
      last = next;
      fire();
    }, pollMs);
    if (typeof poller.unref === "function") poller.unref();
    return {
      ok: true, code: UPDATE_RECONNECT_WATCH, enabled: true, live: false,
      method: "poll", path: routePath, debounceMs, pollMs, stop,
    };
  }
  if (opts.ipMonitor !== false) child = startIpMonitor(fire);
  if (!child) return { ok: false, code: UPDATE_NO_RECONNECT_WATCH, enabled: true, live: false, method: null, stop };
  return {
    ok: true, code: UPDATE_RECONNECT_WATCH, enabled: true, live: false,
    method: "ip-monitor", debounceMs, stop,
  };
}

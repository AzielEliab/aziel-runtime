/**
 * AUTO-UPDATE-1.0 triggers. Default OFF (host.enabled). live:false.
 * onInternetReach uses probeInternetReach unless the host supplies internetReachable (tests).
 * Channel acceptance is ACCEPTED_CHANNELS inside verifyManifest. No second channel list.
 * An empty release key refuses UPDATE-NO-KEY before any release fetch.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { RELEASE_PUBLIC_KEY, UPDATE_CODES as C } from "./manifest.js";
import { meshContact } from "./mesh-peer.js";
import { probeInternetReach } from "./reach.js";
import { checkOnline } from "./updater.js";

export const TRIGGER_CODES = Object.freeze({
  offline: "UPDATE-INTERNET-UNREACHABLE",
  noProbe: "UPDATE-NO-REACH-PROBE",
});

function off(trigger) {
  return { ok: false, code: C.off, trigger, enabled: false, live: false, applied: false };
}

function releaseKey(host, opts) {
  if (opts && Object.prototype.hasOwnProperty.call(opts, "publicKey")) return opts.publicKey;
  if (host && Object.prototype.hasOwnProperty.call(host, "publicKey")) return host.publicKey;
  return RELEASE_PUBLIC_KEY;
}

export async function onInternetReach(host, opts = {}) {
  if (!host || host.enabled !== true) return off("internet");
  const key = releaseKey(host, opts);
  if (!key) return { ok: false, code: C.noKey, trigger: "internet", live: false, applied: false, enabled: true };
  let up = false;
  let code = TRIGGER_CODES.offline;
  if (typeof host.internetReachable === "function") {
    try { up = (await host.internetReachable()) === true; } catch { up = false; }
  } else {
    const probed = await probeInternetReach(host.probe || {});
    up = probed.reachable === true;
    code = probed.code || TRIGGER_CODES.offline;
  }
  if (!up) return { ok: false, code, trigger: "internet", live: false, applied: false, enabled: true };
  const applied = await checkOnline(host, { ...opts, publicKey: key });
  return { ...applied, trigger: "internet", live: false, enabled: true };
}

export async function onPeerContact(host, opts = {}) {
  if (!host || host.enabled !== true) return off("mesh");
  const key = releaseKey(host, opts);
  if (!key) return { ok: false, code: C.noKey, trigger: "mesh", live: false, applied: false, enabled: true };
  const applied = await meshContact(host, { ...opts, publicKey: key });
  return { ...applied, trigger: "mesh", live: false, enabled: true };
}

/** Route one event. Unknown events refuse. Disabled hosts do not probe or fetch. */
export async function onNetworkEvent(host, event, opts = {}) {
  if (event === "internet") return onInternetReach(host, opts);
  if (event === "peer") return onPeerContact(host, opts);
  return { ok: false, code: "UPDATE-EVENT-UNKNOWN", trigger: String(event), live: false, applied: false };
}

/**
 * Adoption hooks for AUTO-UPDATE-1.0 inside this repo. Default OFF. live:false.
 * GET /v1/mesh and the Worker catalog call these with enabled false, so they do not fetch or apply.
 * A node applies only when adoptNodeInstall is called with enabled true (AUTO_UPDATE=on).
 * AZ-OS and AZInterface product repos are gaps: the engines here call adoptProduct and do not pretend
 * those repos apply a build. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { RELEASE_PUBLIC_KEY, ACCEPTED_CHANNELS } from "./manifest.js";
import { softwaresCheckOnline, softwaresDecision } from "./softwares.js";
import { onInternetReach, onPeerContact } from "./triggers.js";

export const AUTO_UPDATE_LIVE = false;
export const AUTO_UPDATE_ENABLED_DEFAULT = false;

export const ADOPTION_GAPS = Object.freeze([
  Object.freeze({
    leg: "azos",
    repo: "https://github.com/AzielEliab/azos",
    here: "src/engines/azos/ops.js runAzos calls adoptProduct('azos')",
    gap: "The AZ-OS repository does not vendor this updater and does not apply a signed build on device. This hook does not pretend that leg is wired.",
  }),
  Object.freeze({
    leg: "azinterface",
    repo: "https://github.com/AzielEliab/azinterface",
    here: "src/engines/azinterface/ops.js runAzinterface calls adoptProduct('azinterface')",
    gap: "The AZInterface repository does not vendor this updater and does not apply a signed build. This hook does not pretend that leg is wired.",
  }),
]);

export function adoptionOff(trigger, product) {
  return {
    ok: false,
    code: "UPDATE-OFF",
    trigger,
    product: product || null,
    enabled: false,
    live: false,
    applied: false,
    paused: false,
    key_pinned: !!RELEASE_PUBLIC_KEY,
    channel: ACCEPTED_CHANNELS[0],
    pause: "pause() and resume() on the updater. A paused node does not apply or seed.",
  };
}

export { softwaresDecision };

export async function adoptNodeInstall({ enabled = false, product = "aziel-runtime", host = null } = {}) {
  if (enabled !== true) return adoptionOff("install", product);
  if (!host) return { ...adoptionOff("install", product), code: "UPDATE-OFF" };
  const result = await onInternetReach({ ...host, enabled: true });
  return { ...result, product, live: false };
}

export async function adoptSoftwares(slugs, host = {}) {
  if (!host || host.enabled !== true) return softwaresDecision(slugs, host);
  const out = await softwaresCheckOnline(host, slugs, { publicKey: host.publicKey });
  return { ...out, live: false };
}

export async function adoptProduct(leg) {
  const gap = ADOPTION_GAPS.find((row) => row.leg === leg) || null;
  try {
    const decision = await onInternetReach({ enabled: false, product: leg });
    return {
      ...decision,
      leg,
      repo: gap ? gap.repo : null,
      gap: gap ? gap.gap : null,
      wired_here: true,
      live: false,
    };
  } catch {
    return { ok: false, code: "UPDATE-OFF", enabled: false, live: false, applied: false, leg, wired_here: true };
  }
}

export function updateFailureCode(err) {
  const code = err && typeof err.code === "string" ? err.code : "";
  return code.startsWith("UPDATE-") ? code : "UPDATE-STATE";
}

function hostFromTrack2(state) {
  return {
    enabled: true,
    nodeId: state && state.identity ? state.identity.handle : "node",
    offline: false,
    now: () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    load: async () => ({ product: "aziel-runtime", installed_seq: 0, floor_seq: 0, paused: false, manifest_hash: null, last_check: null, last_applied: null, last_code: null, tips: null, served_manifest: null }),
    save: async () => {},
    writeReceipt: async () => {},
    carrierPresent: async () => false,
    peerHello: async () => ({ refused: true, code: "UPDATE-PEER-NO-ROUTE" }),
    peerFetch: async () => ({ refused: true, code: "UPDATE-PEER-NO-ARTIFACT" }),
    stage: async () => {},
    swap: async () => {},
    healthCheck: async () => false,
    rollback: async () => {},
  };
}

async function notify(state, path) {
  if (!state || state.autoUpdateEnabled !== true) {
    return { ok: false, code: "UPDATE-OFF", trigger: "mesh", path, enabled: false, live: false, applied: false };
  }
  try {
    const host = state.autoUpdateHost || hostFromTrack2(state);
    const result = await onPeerContact({ ...host, enabled: true });
    return { ...result, path, live: false, enabled: true };
  } catch (err) {
    return {
      ok: false,
      code: updateFailureCode(err),
      trigger: "mesh",
      path,
      enabled: true,
      live: false,
      applied: false,
      message: String(err && err.message ? err.message : err),
    };
  }
}

/** Mesh peer session opened (track2 accept / complete). Does not arm a carrier. */
export function notifyPeerContact(state) {
  return notify(state, "peer");
}

/** Carrier beacon accepted (track2 ingest). Does not arm a carrier. GET never enables. */
export function notifyCarrierContact(state) {
  return notify(state, "carrier");
}

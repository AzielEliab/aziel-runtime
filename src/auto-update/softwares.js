/**
 * ONE shared updater for every Softwares slug. Per-slug state and floor, one lattice chain,
 * one global pause. Reads slugs. Does not change the Softwares count. Default OFF. live:false.
 * Channel gate is verifyManifest / ACCEPTED_CHANNELS. Empty release key refuses before fetch.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { RELEASE_PUBLIC_KEY, UPDATE_CODES as C } from "./manifest.js";
import { applyOffer, initialState } from "./updater.js";

export const SOFTWARES_UPDATER_SPEC = "AZ-AUTO-UPDATE-SOFTWARES-1.0";
const SLUG = /^[a-z0-9-]{1,64}$/;

export function softwaresDecision(slugs, host = {}) {
  const list = Array.isArray(slugs) ? slugs.filter((s) => typeof s === "string") : [];
  const results = {};
  for (const slug of list) results[slug] = C.off;
  return {
    ok: false, code: C.off, spec: SOFTWARES_UPDATER_SPEC, count: list.length, results,
    enabled: false, live: false, applied: false, paused: !!(host && host.paused),
    key_pinned: !!RELEASE_PUBLIC_KEY,
  };
}

function slugHost(shared, all, slug) {
  return {
    enabled: shared.enabled, nodeId: shared.nodeId, offline: shared.offline, now: shared.now,
    load: async () => {
      const s = structuredClone(all.items[slug] || initialState(slug, 0));
      s.tips = all.tips;
      s._own_paused = !!s.paused;
      if (all.paused) s.paused = true;
      return s;
    },
    save: async (s) => {
      all.tips = s.tips;
      const own = s._own_paused === true || (s.paused === true && all.paused !== true);
      const { tips, _own_paused, ...rest } = s;
      rest.paused = own;
      all.items[slug] = rest;
    },
    stage: (b, m) => shared.stage(slug, b, m),
    swap: () => shared.swap(slug),
    healthCheck: () => shared.healthCheck(slug),
    rollback: () => shared.rollback(slug),
    writeReceipt: shared.writeReceipt,
  };
}

export async function softwaresCheckOnline(host, slugs, { publicKey = RELEASE_PUBLIC_KEY } = {}) {
  const list = [...new Set(slugs)].filter((s) => typeof s === "string" && SLUG.test(s));
  if (!host || host.enabled !== true) return softwaresDecision(list, host);
  if (!publicKey) {
    const results = {};
    for (const slug of list) results[slug] = C.noKey;
    return { ok: false, code: C.noKey, spec: SOFTWARES_UPDATER_SPEC, count: list.length, results, enabled: true, live: false, applied: false, key_pinned: false };
  }
  const all = (await host.loadAll()) || { items: {}, tips: null, paused: false };
  const results = {};
  for (const slug of list) {
    let offer = null;
    try { offer = await host.fetchRelease(slug); } catch { offer = null; }
    const view = slugHost(host, all, slug);
    const r = await applyOffer(view, offer, "online", (m) => host.fetchArtifact(slug, m), { publicKey });
    results[slug] = r.code;
  }
  await host.saveAll(all);
  return {
    ok: list.length > 0 && Object.values(results).every((c) => c === C.ok),
    spec: SOFTWARES_UPDATER_SPEC, count: list.length, results, enabled: true, live: false,
    applied: Object.values(results).some((c) => c === C.ok),
  };
}

export async function softwaresPause(host, paused = true) {
  const all = (await host.loadAll()) || { items: {}, tips: null, paused: false };
  all.paused = paused === true;
  await host.saveAll(all);
  return { paused: all.paused, enabled: host.enabled === true, live: false };
}

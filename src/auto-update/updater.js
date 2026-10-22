/**
 * AUTO-UPDATE-1.0 updater core: online check, stage/health/swap with rollback, never-downgrade floor,
 * user pause/opt-out, and a dual-lattice receipt per attempt. Host-agnostic: the host injects I/O.
 * Default OFF (flag AUTO_UPDATE=on). Fail closed. live:false.
 * host = { enabled, nodeId, now(), load(), save(state), fetchRelease(), fetchArtifact(manifest),
 *          stage(bytes, manifest), healthCheck(), swap(), rollback(), writeReceipt(row), offline? }
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { verifyManifest, verifyArtifact, UPDATE_CODES as C, RELEASE_PUBLIC_KEY } from "./manifest.js";
import { latticeDocumentHash, planLattice } from "../dual-lattice.js";
import { sha256Hex } from "../session-core.js";

export const UPDATER_SPEC = "AZ-AUTO-UPDATE-1.0";
export const initialState = (product, installed_seq = 0) => ({
  product, installed_seq, floor_seq: installed_seq, paused: false, manifest_hash: null,
  last_check: null, last_applied: null, last_code: null, tips: null, served_manifest: null,
});

export function updaterStatus(state, { enabled = false, publicKey = RELEASE_PUBLIC_KEY } = {}) {
  return { enabled: enabled === true, paused: !!state.paused, key_pinned: !!publicKey,
    last_check: state.last_check, last_applied: state.last_applied, last_code: state.last_code };
}

export async function pause(host) { const s = await host.load(); s.paused = true; await host.save(s); return updaterStatus(s, host); }
export async function resume(host) { const s = await host.load(); s.paused = false; await host.save(s); return updaterStatus(s, host); }

/** Write one additive lattice receipt (primary + secondary). Node handle is hashed; no username stored. */
export async function updateReceipt(host, state, doc) {
  const handle = "node-" + (await sha256Hex(String(host.nodeId || "unknown"))).slice(0, 16);
  const document_hash = await latticeDocumentHash({ kind: "update", spec: UPDATER_SPEC, ...doc });
  const lattice = await planLattice({ document_hash, offline: host.offline === true, username: handle, tips: state.tips });
  state.tips = { primary: lattice.primary, secondary: lattice.secondary };
  const row = { kind: "update", ...doc, lattice };
  if (host.writeReceipt) await host.writeReceipt(row);
  return row;
}

/**
 * Apply one offered (manifest, signature) from a source ("online" or "mesh:<carrier>"). Returns {ok, code, row}.
 * fetchBytes(manifest) supplies the artifact (release asset online, peer bytes on mesh).
 */
export async function applyOffer(host, offer, source, fetchBytes, { publicKey = RELEASE_PUBLIC_KEY } = {}) {
  const s = await host.load();
  const at = host.now();
  s.last_check = at;
  const done = async (code, extra = {}) => {
    s.last_code = code;
    const row = await updateReceipt(host, s, { product: s.product, from_seq: s.installed_seq, to_seq: offer && offer.manifest && Number.isSafeInteger(offer.manifest.version_seq) ? offer.manifest.version_seq : null,
      manifest_hash: extra.manifest_hash || null, source, outcome: extra.outcome || "refused", code, at });
    await host.save(s);
    return { ok: code === C.ok, code, row };
  };
  if (host.enabled !== true) return done(C.off);
  if (s.paused) return done(C.paused);
  const v = await verifyManifest(offer && offer.manifest, offer && offer.signature, s, { publicKey });
  if (!v.ok) return done(v.code);
  let bytes; try { bytes = await fetchBytes(offer.manifest); } catch { bytes = null; }
  const a = await verifyArtifact(offer.manifest, bytes);
  if (!a.ok) return done(a.code, { manifest_hash: v.manifest_hash });
  const pausedNow = async () => { try { const cur = await host.load(); return !cur || cur.paused === true; } catch { return true; } };
  if (await pausedNow()) { s.paused = true; return done(C.paused, { manifest_hash: v.manifest_hash }); } // pause re-checked before stage
  try {
    await host.stage(bytes, offer.manifest);
    await host.swap();
    if (!(await host.healthCheck())) throw new Error("health");
    if (await pausedNow()) { try { await host.rollback(); } catch { /* reported below */ } s.paused = true; return done(C.paused, { manifest_hash: v.manifest_hash, outcome: "rolled_back" }); }
  } catch {
    try { await host.rollback(); } catch { /* rollback failure is reported by the same code */ }
    return done(C.health, { manifest_hash: v.manifest_hash, outcome: "rolled_back" });
  }
  s.installed_seq = offer.manifest.version_seq;
  s.floor_seq = Math.max(s.floor_seq, s.installed_seq); // floor only rises, after health passes
  s.manifest_hash = v.manifest_hash;
  s.served_manifest = { manifest: offer.manifest, signature: offer.signature }; // only verified builds are seeded
  s.last_applied = at;
  return done(C.ok, { manifest_hash: v.manifest_hash, outcome: "applied" });
}

/** Trigger 1: internet reachable -> check release channel. */
export async function checkOnline(host, opts) {
  let offer = null;
  try { offer = await host.fetchRelease(); } catch { offer = null; }
  return applyOffer(host, offer, "online", (m) => host.fetchArtifact(m), opts);
}

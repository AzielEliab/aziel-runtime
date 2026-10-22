/**
 * AUTO-UPDATE-1.0 trigger 2: mesh peer update. On contact with another node over Plane P carriers
 * (order from D2D_CARRIERS: LAN -> Wi-Fi -> Bluetooth -> RF -> Photon), compare {product, version_seq}
 * and pull a newer signed build from that peer. The peer is never trusted: the same signature, sha256 and
 * never-downgrade checks as online apply. A carrier with no hardware refuses UPDATE-CARRIER-ABSENT (no mock).
 * host adds: carrierPresent(id), peerHello(carrier), peerFetch(carrier, manifest).
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { D2D_CARRIERS } from "../d2d-carriers.js";
import { applyOffer, updateReceipt } from "./updater.js";
import { UPDATE_CODES as C, RELEASE_PUBLIC_KEY } from "./manifest.js";

export const MESH_CARRIER_ORDER = Object.freeze(D2D_CARRIERS.slice().sort((a, b) => a.order - b.order).map((c) => c.id));

/** What this node advertises: only a build it verified and applied itself. */
export function meshAdvert(state) {
  const s = state.served_manifest;
  return s ? { product: state.product, version_seq: s.manifest.version_seq, manifest: s.manifest, signature: s.signature } : { product: state.product, version_seq: state.installed_seq };
}

/** Pick the first present carrier in order; refuse (with receipt) when none has hardware. */
export async function pickCarrier(host) {
  for (const id of MESH_CARRIER_ORDER) { try { if (await host.carrierPresent(id)) return id; } catch { /* absent */ } }
  return null;
}

export async function meshContact(host, opts = {}) {
  const carrier = await pickCarrier(host);
  if (!carrier) {
    const s = await host.load(); s.last_code = C.carrier;
    await updateReceipt(host, s, { product: s.product, from_seq: s.installed_seq, to_seq: null, manifest_hash: null, source: "mesh:none", outcome: "refused", code: C.carrier, at: host.now() });
    await host.save(s);
    return { ok: false, code: C.carrier };
  }
  let hello = null; try { hello = await host.peerHello(carrier); } catch { hello = null; }
  const s = await host.load();
  if (!hello || hello.product !== s.product || !Number.isSafeInteger(hello.version_seq) || hello.version_seq <= s.installed_seq) {
    return { ok: true, code: "UPDATE-PEER-NOT-NEWER", carrier, applied: false }; // nothing to pull; no receipt spam
  }
  const r = await applyOffer(host, { manifest: hello.manifest, signature: hello.signature }, "mesh:" + carrier, (m) => host.peerFetch(carrier, m), { publicKey: opts.publicKey === undefined ? RELEASE_PUBLIC_KEY : opts.publicKey });
  return { ...r, carrier };
}

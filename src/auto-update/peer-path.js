/**
 * Track 2 peer path for AUTO-UPDATE-1.0. Hello and artifact bytes move as sealed peer-share
 * envelopes on an open LAN session (direct-lan or loopback). Signature and hash stay in the updater.
 * Wi-Fi, Bluetooth, RF, and photon have no demonstrated peer exchange here: carrierPresent stays false
 * and the contact refuses UPDATE-CARRIER-ABSENT. No open session refuses UPDATE-PEER-NO-ROUTE.
 * A node with no health-passed artifact refuses UPDATE-PEER-NO-ARTIFACT. Neither code is an apply.
 * live:false. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { meshAdvert } from "./mesh-peer.js";

export const PEER_UPDATE_V = 1;
export const UPDATE_PEER_NO_ROUTE = "UPDATE-PEER-NO-ROUTE";
export const UPDATE_PEER_NO_ARTIFACT = "UPDATE-PEER-NO-ARTIFACT";

export function carrierForSession(row) {
  if (!row) return null;
  const mode = row.bearer_mode || (row.route && row.route.mode) || "";
  if (mode === "direct-lan" || mode === "loopback") return "lan";
  return null;
}

export function sessionForCarrier(track2, carrier) {
  const sessions = track2 && track2.state && track2.state.sessions;
  if (!sessions || typeof sessions.values !== "function") return null;
  for (const row of sessions.values()) {
    if (row && row.open === true && carrierForSession(row) === carrier) return row;
  }
  return null;
}

/** Armed is not enough. Radio without an open session on that bearer is absent. */
export function carrierPresentOnTrack2(track2, id) {
  const state = track2 && track2.state;
  if (!state || !state.armed || typeof state.armed.has !== "function" || !state.armed.has(id)) return false;
  if (id === "lan") {
    if (sessionForCarrier(track2, "lan")) return true;
    const roster = state.roster;
    if (!roster || typeof roster.values !== "function") return false;
    for (const peer of roster.values()) {
      if (peer && peer.carrier === "lan" && peer.verified === true && peer.presence === "live" && peer.mutual === true) return true;
    }
    return false;
  }
  const sessions = state.sessions;
  if (!sessions || typeof sessions.values !== "function") return false;
  for (const row of sessions.values()) {
    if (row && row.open === true && row.bearer_mode === id) return true;
  }
  return false;
}

export function peerForSession(track2, session) {
  const roster = track2 && track2.state && track2.state.roster;
  if (!roster || !session || !session.peer_handle || typeof roster.get !== "function") return null;
  return roster.get(session.peer_handle) || null;
}

export function parseUpdateMessage(text) {
  if (typeof text !== "string" || !text) return null;
  let msg;
  try { msg = JSON.parse(text); } catch { return null; }
  if (!msg || msg.v !== PEER_UPDATE_V) return null;
  if (msg.op !== "update-hello" && msg.op !== "update-fetch") return null;
  return msg;
}

/**
 * Answer one sealed update request from local state. Bytes are returned only when this node
 * already stored a health-passed served_manifest. Otherwise UPDATE-PEER-NO-ARTIFACT.
 * Returns null when the plaintext is not an update request.
 */
export function answerUpdateMessage(state, servedBytes, text) {
  const msg = parseUpdateMessage(text);
  if (!msg) return null;
  if (msg.op === "update-hello") return meshAdvert(state || { product: null, installed_seq: 0 });
  const served = state && state.served_manifest && state.served_manifest.manifest;
  const art = served && served.artifact;
  if (!art || !(servedBytes instanceof Uint8Array)) return { refused: true, code: UPDATE_PEER_NO_ARTIFACT };
  if (msg.sha256 && msg.sha256 !== art.sha256) return { refused: true, code: UPDATE_PEER_NO_ARTIFACT };
  return { v: PEER_UPDATE_V, op: "update-artifact", sha256: art.sha256, artifact_b64: Buffer.from(servedBytes).toString("base64") };
}

export function bytesFromArtifactReply(body) {
  if (!body || body.refused === true || typeof body.artifact_b64 !== "string" || !body.artifact_b64) {
    return { refused: true, code: (body && body.code) || UPDATE_PEER_NO_ARTIFACT };
  }
  const bytes = Buffer.from(body.artifact_b64, "base64");
  if (!bytes.length) return { refused: true, code: UPDATE_PEER_NO_ARTIFACT };
  return new Uint8Array(bytes);
}

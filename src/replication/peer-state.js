/**
 * Protocol state a peer may exchange for recovery.
 * Secrets and application payloads are refused.
 * Author: Aziel Eliab only.
 */

const SECRET_KEYS = ["seed", "seed_b64", "private_key", "privatekey", "passphrase", "password", "token", "plaintext", "payload", "authorization", "pkcs8"];

function walk(value, path, hits) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, hits));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEYS.includes(key.toLowerCase())) hits.push(`${path}.${key}`);
    else walk(child, `${path}.${key}`, hits);
  }
}

export function inspectPeerState(state) {
  if (!state || typeof state !== "object") {
    return { ok: false, code: "AZP-REFUSE", fail_closed: true, message: "Peer state is missing." };
  }
  const hits = [];
  walk(state, "state", hits);
  if (hits.length) {
    return { ok: false, code: "AZP-REFUSE", fail_closed: true, message: "Peer state names secret material.", fields: hits };
  }
  if (state.protocol_version && state.protocol_version !== "AZP-NS-1.0") {
    return { ok: false, code: "AZP-DOWNGRADE", fail_closed: true, message: "Peer protocol version is refused." };
  }
  return { ok: true };
}

export function exportPeerState(opts = {}) {
  const identity = opts.identity || {};
  const state = {
    protocol_version: "AZP-NS-1.0",
    provider_id: String(opts.providerId || ""),
    network_id: String(opts.networkId || "aziel-runtime"),
    identity: {
      handle: identity.handle || "",
      node_public_key: identity.node_public_key || identity.public_key || "",
      enc_public_key: identity.enc_public_key || "",
    },
    peers: (opts.peers || []).map((peer) => ({
      id: String(peer.id || ""),
      address: String(peer.address || ""),
    })),
    checkpoints: opts.checkpoints || [],
    records: opts.records || [],
  };
  const inspected = inspectPeerState(state);
  if (!inspected.ok) return inspected;
  return { ok: true, state };
}

export function directoryWithoutDomain(peers, domain) {
  const banned = String(domain || "").toLowerCase();
  return (peers || []).filter((peer) => {
    const address = String(peer.address || "").toLowerCase();
    if (!banned) return true;
    return !address.includes(banned);
  });
}

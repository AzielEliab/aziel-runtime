/**
 * Provenance / Input Packet — normalize source before ChainLock-IN.
 *
 * Source trust is metadata, not truth. ChainLock proves preservation.
 * Not a Softwares-tab product.
 *
 * Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "./session-core.js";

export const PROVENANCE_VERSION = "IP-1.0";
export const PROVENANCE_AUTHOR = "Aziel Eliab";

const TRUST = new Set(["UNTRUSTED", "LOW", "NORMAL", "HIGH", "CUSTODIAL"]);

function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_` + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildInputPacket(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const received_at = src.received_at || new Date().toISOString();
  const content = src.content !== undefined ? src.content : src.payload;
  const content_hash = src.content_hash || (await sha256Hex(canonicalize(content == null ? "" : content)));
  let trust = String(src.trust_level || (src.untrusted === false ? "NORMAL" : "UNTRUSTED")).toUpperCase();
  if (!TRUST.has(trust)) trust = "UNTRUSTED";
  const tags = Array.isArray(src.tags) ? src.tags.map((t) => String(t)) : [];
  if (src.slug && !tags.includes(src.slug)) tags.push(String(src.slug));
  if (src.op && !tags.includes(src.op)) tags.push(String(src.op));

  const packet = {
    packet_id: src.packet_id || newId("ip"),
    source_id: src.source_id || src.slug || "public",
    source_type: src.source_type || "fraggate-call",
    observed_at: src.observed_at || null,
    received_at,
    content_hash,
    metadata: {
      door: "fraggate",
      ...(src.metadata && typeof src.metadata === "object" ? src.metadata : {}),
    },
    trust_level: trust,
    tags,
    claims: Array.isArray(src.claims) ? src.claims : undefined,
    v: PROVENANCE_VERSION,
    author: PROVENANCE_AUTHOR,
    software_tab: false,
    truth: false,
  };
  return packet;
}

export function provenanceView(packet) {
  if (!packet || typeof packet !== "object") return null;
  return {
    packet_id: packet.packet_id || null,
    source_id: packet.source_id || null,
    source_type: packet.source_type || null,
    content_hash: packet.content_hash || null,
    trust_level: packet.trust_level || null,
    tags: Array.isArray(packet.tags) ? packet.tags.slice() : [],
    truth: false,
  };
}

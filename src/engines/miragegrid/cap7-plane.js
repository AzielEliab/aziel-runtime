/**
 * Cap-7 control plane. geo-target, session-stick, and egress-rotate
 * land metadata and a session node on factory names.
 * Not a public egress IP. Not ICANN. Not AZVPN. Not packet forwarding.
 * Author: Aziel Eliab only.
 */
import { CAP7_FACTORY_LABELS, CAP7_SITES, siteForMirageNode } from "../../cap7-shuffle.js";
import { CAP7_WORKER_FLAGS, MIRAGEGRID_WORKER_PR } from "./cap7-public.js";

export const CAP7_PLANE = "CAP7-PLANE-1.0";
export { MIRAGEGRID_WORKER_PR };
export const STICKY_PREFIX = "mg-sticky-v1|";
const POOL_SIZE = 25;
const LABEL_RE = /^[A-Za-z0-9._-]{1,80}$/;
const FALSE_WORDS = new Set(["false", "0", "no", "off"]);
const PACKET_KEYS = Object.freeze([
  "egress_ip",
  "exit_ip",
  "public_ip",
  "sticky_ip",
  "residential",
  "socks",
  "socks5",
  "proxy",
  "anyip",
  "new_ip",
  "ip_exit",
  "vpn",
  "vpn_hop",
  "hosted_vpn",
  "packet_forwarding",
  "packet_hop",
]);
const TTL_KEYS = Object.freeze(["session_ttl", "ttl", "ttl_seconds", "duration"]);

function asObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  return body;
}

function present(value) {
  if (value == null || value === false || value === "") return false;
  if (typeof value === "string" && FALSE_WORDS.has(value.trim().toLowerCase())) return false;
  if (typeof value === "number" && value === 0) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function looksLikeIp(value) {
  const s = String(value || "").trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return true;
  if (s.includes(":") && /[0-9a-f]/i.test(s) && /\d/.test(s)) return true;
  return false;
}

export function cap7PlaneHonesty() {
  return {
    spec: CAP7_PLANE,
    product: "miragegrid",
    plane: "cap7",
    live: true,
    factory_exec: true,
    ...CAP7_WORKER_FLAGS,
    public_icann: false,
    public_icann_registrar: false,
    resolves_to_hub: false,
    internet_reachable: false,
    standard_internet_reaches_cap7: false,
    dns_publish: false,
    packet_forwarding: false,
    packet_egress: false,
    public_egress_ip: false,
    egress_ip: null,
    ip_exit: false,
    sticky_ip: false,
    hosted_vpn: false,
    azvpn: false,
    azvpn_separate: true,
    suite_vpn: "azvpn",
    anonymity_network: false,
    packet_mesh: false,
    radio_phy: false,
    not_a_second_internet: true,
    author: "Aziel Eliab",
  };
}

function siteStamp(site) {
  return {
    id: site.id,
    mesh_name: site.mesh_name,
    factory_label: site.id,
    false_site: site.false_site === true,
    surface: site.surface,
    public_icann: false,
    resolves_to_hub: false,
    internet_reachable: false,
    is_live_door: false,
    name_may_change: true,
  };
}

function refuse(op, code, message) {
  const body = {
    ok: false,
    code,
    op,
    verdict: "refuse",
    message,
    ...cap7PlaneHonesty(),
    live: true,
    factory_exec: true,
  };
  if (code === "MG-NOT-PUBLIC-EGRESS") body.honesty_class = "MG-NO-IP-EXIT";
  return body;
}

function packetAsked(fields) {
  return PACKET_KEYS.some((key) => present(fields[key]) || looksLikeIp(fields[key]));
}

function refusePacket(op, fields) {
  if (!packetAsked(fields)) return null;
  return refuse(
    op,
    "MG-NOT-PUBLIC-EGRESS",
    "Cap-7 geo, sticky session, and rotation are the Cap-7 plane. They are not a public egress IP, not AZVPN, and not packet forwarding.",
  );
}

async function sha256Bytes(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(buf);
}

async function digestMod(text, modulus) {
  const digest = await sha256Bytes(text);
  let n = 0n;
  for (const b of digest) n = (n << 8n) + BigInt(b);
  return Number(n % BigInt(modulus));
}

export async function stickyMeshIndex(stickyKey) {
  return digestMod(`${STICKY_PREFIX}${stickyKey}`, POOL_SIZE);
}

export function stickyNodeId(index) {
  return `node-${String(index + 1).padStart(2, "0")}`;
}

export async function geoTarget(payload) {
  const fields = asObject(payload);
  const packet = refusePacket("geo-target", fields);
  if (packet) return packet;
  const region = String(fields.region || fields.label || fields.geo || "").trim();
  if (!region) {
    return refuse("geo-target", "MG-GEO-NEED-LABEL", "region is a Cap-7 metadata label. It is not a public egress IP.");
  }
  if (looksLikeIp(region) || !LABEL_RE.test(region)) {
    return refuse("geo-target", "MG-NOT-PUBLIC-EGRESS", "A region label is Cap-7 metadata. An address is not applied.");
  }
  const site = CAP7_SITES[await digestMod(`cap7-geo-v1|${region}`, CAP7_SITES.length)];
  return {
    ok: true,
    code: "CAP7-GEO-TARGET",
    op: "geo-target",
    verdict: "yes",
    region,
    region_label: region,
    geo_applied: false,
    geo_is_metadata: true,
    metadata_only: true,
    land: siteStamp(site),
    message: "Region label applied on the Cap-7 plane. No public egress IP. No ICANN DNS. AZVPN stays separate.",
    ...cap7PlaneHonesty(),
  };
}

export async function sessionStick(payload) {
  const fields = asObject(payload);
  const packet = refusePacket("session-stick", fields);
  if (packet) return packet;
  if (TTL_KEYS.some((key) => present(fields[key]))) {
    return refuse(
      "session-stick",
      "MG-STICKY-TTL-NOT-A-STORE",
      "Mesh-label stick is LIVE. There is no durable TTL store, so an expiry is refused rather than ignored. sticky_ip stays false.",
    );
  }
  const key = String(fields.sticky_key || fields.session_key || "").trim();
  if (!key) {
    return refuse("session-stick", "MG-STICKY-NEED-KEY", "sticky_key selects a mesh node label on the Cap-7 plane. It is not an IP.");
  }
  if (!LABEL_RE.test(key)) {
    return refuse("session-stick", "MG-BAD-SESSION-ID", "sticky_key must be 1–80 [A-Za-z0-9._-].");
  }
  const index = await stickyMeshIndex(key);
  const mirage_node = index + 1;
  const site = siteForMirageNode(mirage_node);
  return {
    ok: true,
    code: "CAP7-SESSION-STICK",
    op: "session-stick",
    verdict: "yes",
    sticky_key: key,
    sticky_mesh_node: true,
    ttl_enforced: false,
    index,
    node_id: stickyNodeId(index),
    mirage_node,
    land: siteStamp(site),
    message: "Same sticky_key, same mesh node label, same Cap-7 land. Not a sticky public IP. Not AZVPN.",
    ...cap7PlaneHonesty(),
  };
}

export async function egressRotate(payload) {
  const fields = asObject(payload);
  const packet = refusePacket("egress-rotate", fields);
  if (packet) return packet;
  const labels = CAP7_FACTORY_LABELS;
  const prev = String(fields.prev || fields.from || fields.current || fields.land || "").trim();
  let from = null;
  let idx;
  if (prev && labels.includes(prev)) {
    from = prev;
    idx = (labels.indexOf(prev) + 1) % labels.length;
  } else if (Number.isInteger(fields.round)) {
    idx = ((fields.round % labels.length) + labels.length) % labels.length;
  } else {
    const seed = String(fields.seed || fields.session_id || "cap7-rotate").trim();
    if (looksLikeIp(seed) || !LABEL_RE.test(seed)) {
      return refuse("egress-rotate", "MG-NOT-PUBLIC-EGRESS", "Rotation stays on Cap-7 factory names. An address is not an egress.");
    }
    idx = await digestMod(`cap7-rotate-v1|${seed}`, labels.length);
  }
  const site = CAP7_SITES[idx];
  return {
    ok: true,
    code: "CAP7-EGRESS-ROTATE",
    op: "egress-rotate",
    verdict: "yes",
    from,
    land: siteStamp(site),
    rotated_among: labels.slice(),
    icann_publish: false,
    message: "Rotated the Cap-7 update land among factory names. Not a public egress IP. Not ICANN publish. Not a packet hop.",
    ...cap7PlaneHonesty(),
  };
}

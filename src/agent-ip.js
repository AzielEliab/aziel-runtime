/**
 * AGENT-SUBNET-1.0: the limiter key of a visitor IP. IPv4 as is; IPv4-mapped/compatible IPv6
 * (::ffff:a.b.c.d, ::ffff:c000:201) is the IPv4 it carries; any other IPv6 is cut to its /64 (one subscriber
 * usually holds a whole /64, so the full address would let one caller rotate buckets). Used by the agent
 * limits and the edge mesh_mutate / agent_read limiter; AZ-OS and azinterface use the same rule.
 * Author: Aziel Eliab.
 */
export function agentIpKey(ip) {
  const raw = String(ip || "").trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (!raw.includes(":")) return raw;
  const [head, tail] = raw.includes("::") ? raw.split("::") : [raw, null];
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const v4ToHex = (parts) => {
    const last = parts[parts.length - 1];
    if (!last || !last.includes(".")) return parts;
    const o = last.split(".").map((x) => Number(x) & 255);
    return [...parts.slice(0, -1), ((o[0] << 8) | o[1]).toString(16), ((o[2] << 8) | o[3]).toString(16)];
  };
  const hh = tail === null ? v4ToHex(h) : h;
  const tt = tail === null ? [] : v4ToHex(t);
  const fill = tail === null ? [] : Array(Math.max(0, 8 - hh.length - tt.length)).fill("0");
  const g = [...hh, ...fill, ...tt].slice(0, 8).map((x) => parseInt(x || "0", 16) || 0);
  while (g.length < 8) g.push(0);
  // ::ffff:a.b.c.d (mapped) is that IPv4, so each mapped address keeps its own bucket.
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0xffff) {
    return [g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255].join(".");
  }
  return g.slice(0, 4).map((x) => x.toString(16)).join(":") + "::/64";
}

/** The edge limiter key: a peer's forwarded visitor hash (vh:...) as is, else agentIpKey. */
export function edgeIpKey(ip) {
  const s = String(ip || "");
  if (!s || s === "local" || s.startsWith("vh:")) return s;
  return agentIpKey(s);
}

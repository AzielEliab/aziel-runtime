/**
 * /p/{slug}/{op} is proxy-not-exec. Forward only documented tracker / catalog ops.
 * Never factory /mcp. Never a second FragGate door.
 * Author: Aziel Eliab only.
 */

export const CATALOG_PROXY_OPS = Object.freeze(["health", "skill", "download", "doctor"]);
export const PROXY_REFUSED_OPS = Object.freeze(["mcp", "tools", "initialize", "call", "tools-call", "tools_call"]);
export const PROXY_OP_REFUSE = "PROXY-OP-REFUSED";

export function normalizeProxyOp(op) {
  return String(op || "")
    .trim()
    .toLowerCase();
}

export function proxyOpAllowed(product, op) {
  const name = normalizeProxyOp(op);
  if (!name) return false;
  if (PROXY_REFUSED_OPS.includes(name)) return false;
  if (name === "mcp" || name.endsWith("/mcp")) return false;
  if (CATALOG_PROXY_OPS.includes(name)) return true;
  const ops = product && Array.isArray(product.ops) ? product.ops : [];
  return ops.some((row) => normalizeProxyOp(row && row.op) === name);
}

export function proxyOpRefuse(product, op) {
  const slug = product && product.slug ? product.slug : null;
  const allowed = [
    ...CATALOG_PROXY_OPS,
    ...((product && product.ops) || []).map((row) => normalizeProxyOp(row && row.op)).filter(Boolean),
  ];
  return {
    ok: false,
    error: "proxy op is not on the documented tracker allowlist",
    code: PROXY_OP_REFUSE,
    product: slug,
    op: normalizeProxyOp(op),
    allowed: [...new Set(allowed)],
    proxy_is_not_exec: true,
    factory_mcp: false,
    hint: slug
      ? `Use POST /v1/fraggate/call with { slug: "${slug}", op } for exec. /p is proxy-not-exec and never factory /mcp.`
      : "Use POST /v1/fraggate/call. /p is proxy-not-exec and never factory /mcp.",
  };
}

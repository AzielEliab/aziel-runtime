/**
 * F04 — security headers on runtime HTML + API (and product pages this Worker serves).
 * CSP / X-Frame-Options / nosniff / Referrer-Policy / HSTS.
 * HTML CSP allows the existing inline style + FragGate door script (honest, not a fake lock).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const CSP_HTML =
  "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; " +
  "script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' https: data:; " +
  "connect-src 'self' https:; font-src 'self'";

export const CSP_API = "default-src 'none'; base-uri 'none'; frame-ancestors 'none'";

export const HSTS = "max-age=31536000; includeSubDomains";

export function securityHeaders(kind = "api") {
  return {
    "Content-Security-Policy": kind === "html" ? CSP_HTML : CSP_API,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": HSTS,
  };
}

export function applySecurityHeaders(response) {
  if (!response || !response.headers) return response;
  const ct = String(response.headers.get("content-type") || "");
  const kind = /\btext\/html\b/i.test(ct) ? "html" : "api";
  const next = new Headers(response.headers);
  const add = securityHeaders(kind);
  for (const [key, value] of Object.entries(add)) {
    if (!next.has(key)) next.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: next,
  });
}

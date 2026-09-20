#!/usr/bin/env node
/**
 * Independent OpenAPI / HTTP caller for Aziel Runtime.
 * Prefer fraggate_call. /p is proxy, not exec. Author: Aziel Eliab.
 */
const origin = (process.env.AZIEL_RUNTIME_ORIGIN || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");

function networkRefuse(err, path) {
  const blob = [err && err.code, err && err.cause && err.cause.code, err && err.message, err && err.cause && err.cause.message]
    .filter(Boolean)
    .join(" ");
  const dns = /ENOTFOUND|getaddrinfo|EAI_AGAIN|ERR_NAME_NOT_RESOLVED/i.test(blob);
  return {
    ok: false,
    remote: false,
    code: dns ? "FG-DNS" : "FG-NET",
    fraggate_receipt: false,
    local_validation: false,
    message: String(err && err.message ? err.message : err),
    origin,
    path,
  };
}

async function getJson(path, init) {
  try {
    const res = await fetch(origin + path, init);
    return res.json();
  } catch (err) {
    console.error(JSON.stringify(networkRefuse(err, path), null, 2));
    process.exit(1);
  }
}

const spec = await getJson("/openapi.json", { headers: { "user-agent": "Mozilla/5.0" } });
console.log("title", spec.info?.title);
console.log("lead", String(spec.info?.description || "").slice(0, 160));
console.log("has_fraggate_call", Boolean(spec.paths?.["/v1/fraggate/call"]));
console.log("proxy_note", spec.paths?.["/p/{slug}/{op}"] ? "proxy paths present (not exec)" : "no /p template");

const body = await getJson("/v1/fraggate/call", {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
  body: JSON.stringify({ slug: "aziel-corpus", op: "health", payload: {} }),
});
console.log("health_ok", body.ok, "native_ops", (body.result?.native_ops || body.native_ops || []).slice(0, 6));

#!/usr/bin/env node
/**
 * Independent OpenAPI / HTTP caller for Aziel Runtime.
 * Prefer fraggate_call. /p is proxy, not exec. Author: Aziel Eliab.
 */
const origin = (process.env.AZIEL_RUNTIME_ORIGIN || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");

const spec = await (await fetch(origin + "/openapi.json", { headers: { "user-agent": "Mozilla/5.0" } })).json();
console.log("title", spec.info?.title);
console.log("lead", String(spec.info?.description || "").slice(0, 160));
console.log("has_fraggate_call", Boolean(spec.paths?.["/v1/fraggate/call"]));
console.log("proxy_note", spec.paths?.["/p/{slug}/{op}"] ? "proxy paths present (not exec)" : "no /p template");

const call = await fetch(origin + "/v1/fraggate/call", {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
  body: JSON.stringify({ slug: "aziel-corpus", op: "health", payload: {} }),
});
const body = await call.json();
console.log("health_ok", body.ok, "native_ops", (body.result?.native_ops || body.native_ops || []).slice(0, 6));

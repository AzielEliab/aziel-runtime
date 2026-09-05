/**
 * In-process (or local-jail) engine exec.
 * Resolve slug → local module, hash the artifact, run the op, wipe scratch.
 * Author: Aziel Eliab.
 */
import { digestText } from "../session-core.js";
import { embeddedDigest, ENGINE_RUNNERS, isTrueEngineSlug } from "./registry.js";

export function wipeScratch(scratch) {
  if (!scratch || !scratch.length) return;
  for (const item of scratch) {
    try {
      if (item instanceof Uint8Array) item.fill(0);
      else if (ArrayBuffer.isView(item) && item.buffer) {
        new Uint8Array(item.buffer, item.byteOffset, item.byteLength).fill(0);
      } else if (item instanceof ArrayBuffer) {
        new Uint8Array(item).fill(0);
      }
    } catch {
      /* best-effort wipe */
    }
  }
  scratch.length = 0;
}

export async function executeLocal({ slug, op, payload, ranIn }) {
  const key = String(slug || "").trim().toLowerCase();
  const action = String(op || "").trim();
  const entry = ENGINE_RUNNERS[key];
  if (!entry) return null;

  const digest = embeddedDigest(key);
  const started = Date.now();
  const scratch = [];
  let body;
  let status = 200;
  let error = null;
  try {
    body = await entry.run(action, payload && typeof payload === "object" ? payload : {}, scratch);
    if (body && body.unsupported) {
      wipeScratch(scratch);
      return { unsupported: true, slug: key, op: action, engine_digest: digest };
    }
    if (body && body.error) {
      status = Number(body.status) || 400;
      error = String(body.error);
    }
  } catch (err) {
    error = String(err && err.message ? err.message : err);
    status = err && err.status ? err.status : 400;
    body = { error, slug: key, op: action };
  }
  const latencyMs = Date.now() - started;
  const responseText = JSON.stringify(body);
  const resDig = await digestText(responseText);
  wipeScratch(scratch);
  body = null;
  return {
    mode: "local",
    true_engine_runtime: true,
    ran_in: ranIn || "aziel-runtime",
    engine_digest: digest,
    engine_slug: key,
    engine_op: action,
    status,
    error,
    responseText,
    response_digest: resDig.sha256,
    response_bytes: resDig.bytes,
    content_type: "application/json; charset=utf-8",
    latency_ms: latencyMs,
    upstream: null,
  };
}

export function proxyFallbackMeta({ slug, op, upstream, status, error }) {
  return {
    mode: "proxy_fallback",
    true_engine_runtime: false,
    ran_in: null,
    engine_digest: null,
    engine_slug: slug,
    engine_op: op,
    upstream: upstream || null,
    status,
    error: error || null,
    note: isTrueEngineSlug(slug)
      ? "Local engine exists but this op is not implemented in-process; proxy_fallback is explicit."
      : "No local engine module for this slug. Proxy is not exec. Receipt marks proxy_fallback.",
  };
}

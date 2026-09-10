/**
 * Bounded ChainLock memory metadata. Secrets/raw payloads never enter the stamp.
 * Author: Aziel Eliab only.
 */

export const MEMORY_META_CAP = 2048;
export const SECRET_KEYS = Object.freeze([
  "password",
  "secret",
  "token",
  "authorization",
  "api_key",
  "apikey",
  "cookie",
  "private_key",
  "raw",
  "payload_b64",
  "bytes",
]);

function clip(text, cap) {
  const s = text == null ? "" : String(text);
  if (s.length <= cap) return s;
  return s.slice(0, cap);
}

export function boundMemoryMeta(raw) {
  if (raw == null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k);
    if (SECRET_KEYS.includes(key.toLowerCase())) continue;
    if (v === undefined) continue;
    if (typeof v === "string") out[key] = clip(v, 240);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v;
    else if (Array.isArray(v)) out[key] = v.slice(0, 12).map((item) => (typeof item === "string" ? clip(item, 80) : item));
    else if (v && typeof v === "object") {
      const nested = {};
      for (const [nk, nv] of Object.entries(v)) {
        if (SECRET_KEYS.includes(String(nk).toLowerCase())) continue;
        if (typeof nv === "string") nested[nk] = clip(nv, 120);
        else if (typeof nv === "number" && Number.isFinite(nv)) nested[nk] = nv;
        else if (typeof nv === "boolean") nested[nk] = nv;
        else if (Array.isArray(nv)) nested[nk] = nv.slice(0, 8);
      }
      out[key] = nested;
    }
  }
  const json = JSON.stringify(out);
  if (json.length > MEMORY_META_CAP) {
    return { memory_id: out.memory_id || null, kind: out.kind || null, truncated: true };
  }
  return out;
}

/**
 * REDLINE-2026-09-14 — public-door map, TLS cite, attack-sim refuses.
 * Not a Softwares-tab product. Not a FragGate slug. Growth-ON Allow stays.
 * Author: Aziel Eliab only.
 */

import { DOI_BY_SLUG } from "./catalog-meta.js";
import { LAMB_LENS_DOOR, LAMB_LENS_SOFTWARE_TAB, LAMB_LENS_VERSION } from "./lamblens.js";
import { TOKEN_HEADER } from "./production.js";
import {
  AUTHOR_ID,
  AUTHOR_NAME,
  DESIGNS_FOLDER,
  RUNTIME_SOFTWARE_ID,
} from "./seo.js";
import {
  CAP7_DESIGN_OF,
  CAP7_INHERIT,
  CAP7_RESOLVES_TO_HUB,
  SEMANTIC_BRIDGE_SPEC,
} from "./semantic-bridge.js";

export const REDLINE_SPEC = "REDLINE-2026-09-14";
export const REDLINE_NAME = "Runtime redline protocols";
export const REDLINE_AUTHOR = AUTHOR_NAME;
export const REDLINE_DOCS = "docs/designs/REDLINE-2026-09-14.md";
export const REDLINE_DATE = "2026-09-14";
export const REDLINE_SOFTWARE_TAB = false;
export const REDLINE_FRAGGATE_SLUG = false;
export const REDLINE_PERSON_ID = AUTHOR_ID;
export const REDLINE_GROWTH_ON = true;
export const REDLINE_GPTBOT_DISALLOW = false;

export const AZ_GENERATOR_HALLUC_SLUGS = Object.freeze([
  "az-generator",
  "azgenerator",
  "az_generator",
  "az-gen",
  "azgen",
  "az_gen",
]);

export const TOKEN_QUERY_KEYS = Object.freeze([
  "token",
  "runtime_token",
  "RUNTIME_TOKEN",
  "aziel_runtime_token",
  "bearer",
  "access_token",
]);

export const TOKEN_BODY_KEYS = Object.freeze([
  "runtime_token",
  "RUNTIME_TOKEN",
  "aziel_runtime_token",
  "operator_token",
]);

/** Public dual-surface doors. Mutate rows require header token / bearer / operator. */
export const PUBLIC_DOORS = Object.freeze([
  { method: "GET", path: "/", role: "read", auth: "none" },
  { method: "GET", path: "/cite.json", role: "read", auth: "none" },
  { method: "GET", path: "/robots.txt", role: "read", auth: "none", growth_on: true },
  { method: "GET", path: "/openapi.json", role: "read", auth: "none" },
  { method: "GET", path: "/v1/software", role: "read", auth: "none" },
  { method: "GET", path: "/v1/health", role: "read", auth: "none" },
  { method: "GET", path: "/v1/ready", role: "read", auth: "none" },
  { method: "GET", path: "/v1/fraggate/list", role: "read", auth: "none" },
  { method: "POST", path: "/v1/fraggate/call", role: "exec", auth: "public_allowlist" },
  { method: "POST", path: "/mcp", role: "exec", auth: "public_allowlist" },
  { method: "GET", path: "/p/{slug}/{op}", role: "proxy", auth: "none", exec: false },
  { method: "POST", path: "/p/{slug}/{op}", role: "proxy", auth: "none", exec: false },
  { method: "GET", path: "/v1/mesh", role: "read", auth: "none", enables: false },
  { method: "GET", path: "/v1/mesh/az-generator", role: "cite", auth: "none", registrar: false },
  { method: "POST", path: "/v1/session/open", role: "mutate", auth: "operator_header" },
  { method: "POST", path: "/v1/session/{id}/policy", role: "mutate", auth: "operator_header" },
  { method: "POST", path: "/v1/session/{id}/exec", role: "mutate", auth: "operator_header" },
  { method: "POST", path: "/v1/session/{id}/close", role: "mutate", auth: "operator_header" },
  { method: "POST", path: "/v1/mesh/enable", role: "mutate", auth: "bearer" },
  { method: "POST", path: "/v1/memory/rebuild-index", role: "mutate", auth: "operator_header" },
]);

export const TLS_CITE = Object.freeze({
  transport: "tls",
  via: "cloudflare",
  workers_https: true,
  client_side_crypto_claim: false,
  foldlock_is_not_encryption: true,
  note:
    "HTTPS is terminated at the Cloudflare edge for this Worker. This runtime does not implement a second client-side encryption product, a browser WebCrypto vault, or FoldLock-as-cipher. Document the hop. Do not invent a lock.",
});

export function isAzGeneratorHallucSlug(slug) {
  const s = String(slug || "")
    .trim()
    .toLowerCase();
  return AZ_GENERATOR_HALLUC_SLUGS.includes(s);
}

export function azGeneratorCallRefuse(extra = {}) {
  return {
    ok: false,
    code: "AZ-GEN-CALL-REFUSED",
    author: REDLINE_AUTHOR,
    identity: REDLINE_AUTHOR,
    spec: REDLINE_SPEC,
    live_registrar: false,
    az_gen_live_registrar: false,
    software_tab: false,
    fifth_product: false,
    message:
      "AZ Generator is a Cap-7 cite label, not a live registrar and not a Softwares product. GET /v1/mesh/az-generator cites. Call is refused.",
    hint: "GET /v1/mesh/az-generator or fraggate_call { slug: \"miragegrid\", op: \"bridge\" }",
    ...extra,
  };
}

export function meshGetEnableRefuse(extra = {}) {
  return {
    ok: false,
    code: "MESH-GET-NEVER-ENABLES",
    author: REDLINE_AUTHOR,
    identity: REDLINE_AUTHOR,
    spec: REDLINE_SPEC,
    get_never_enables: true,
    enabled_by_get: false,
    message: "GET /v1/mesh never enables radios. Enable is POST /v1/mesh/enable with a suite bearer.",
    hint: "GET /v1/mesh  POST /v1/mesh/enable { bearer }",
    ...extra,
  };
}

export function meshGetLooksLikeEnable(searchParams, payload) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  if (
    src.enable === true ||
    src.enabled === true ||
    src.radios === true ||
    String(src.op || "").toLowerCase() === "enable"
  ) {
    return true;
  }
  if (!searchParams || typeof searchParams.get !== "function") return false;
  const keys = ["enable", "enabled", "op", "radios", "mesh"];
  for (const key of keys) {
    const raw = searchParams.get(key);
    if (raw == null || raw === "") continue;
    const v = String(raw).trim().toLowerCase();
    if (key === "op" && v === "enable") return true;
    if (v === "1" || v === "true" || v === "on" || v === "yes" || v === "enable") return true;
  }
  return false;
}

export function isKnownZenodoDoi(doi) {
  const d = String(doi || "").trim();
  if (!d) return false;
  return Object.values(DOI_BY_SLUG).includes(d);
}

export function looksLikeZenodoDoi(doi) {
  return /^10\.5281\/zenodo\.\d+$/i.test(String(doi || "").trim());
}

export function fakeDoiRefuse(doi, extra = {}) {
  return {
    ok: false,
    code: "DOI-FAKE-REFUSED",
    author: REDLINE_AUTHOR,
    identity: REDLINE_AUTHOR,
    spec: REDLINE_SPEC,
    doi: null,
    presented_shape: looksLikeZenodoDoi(doi) ? "zenodo" : "other",
    message: "Do not invent Zenodo DOIs. Cite only the known map. First-time slugs stay deposit_needed.",
    ...extra,
  };
}

export function doiInjectionRefuse(doi) {
  const d = String(doi || "").trim();
  if (!d) return null;
  if (isKnownZenodoDoi(d)) return null;
  return fakeDoiRefuse(d);
}

export function tokenQueryRefuse(extra = {}) {
  return {
    ok: false,
    code: "TOKEN-QUERY-REFUSED",
    author: REDLINE_AUTHOR,
    identity: REDLINE_AUTHOR,
    spec: REDLINE_SPEC,
    header_only: true,
    query: false,
    body: false,
    git: false,
    message: "Operator token is header-only (Authorization: Bearer or X-Aziel-Runtime-Token). Never query, body, or git.",
    hint: `Authorization: Bearer … or ${TOKEN_HEADER}`,
    ...extra,
  };
}

export function tokenBodyRefuse(extra = {}) {
  return {
    ...tokenQueryRefuse(extra),
    code: "TOKEN-BODY-REFUSED",
    message: "Operator token is header-only. JSON body / MCP args must not carry runtime_token.",
  };
}

export function tokenPresentedInSearch(searchParams) {
  if (!searchParams || typeof searchParams.get !== "function") return false;
  for (const key of TOKEN_QUERY_KEYS) {
    const v = searchParams.get(key);
    if (v != null && String(v).trim()) return true;
  }
  return false;
}

export function tokenPresentedInRequestUrl(request) {
  if (!request || !request.url) return false;
  try {
    return tokenPresentedInSearch(new URL(request.url).searchParams);
  } catch {
    return false;
  }
}

export function bodyHasTokenKey(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  for (const key of TOKEN_BODY_KEYS) {
    if (obj[key] != null && String(obj[key]).trim()) return true;
  }
  return false;
}

const SECRET_KEY_RE = /^(runtime_token|RUNTIME_TOKEN|aziel_runtime_token|operator_token|authorization|Authorization)$/;

export function responseLeaksToken(body, secrets = []) {
  const blob = typeof body === "string" ? body : JSON.stringify(body ?? "");
  if (!blob) return false;
  if (SECRET_KEY_RE.test(blob)) return true;
  if (/\bBearer\s+\S{8,}/.test(blob)) return true;
  for (const secret of secrets) {
    const s = String(secret || "");
    if (s.length >= 6 && blob.includes(s)) return true;
  }
  return false;
}

export function scrubTokenLeak(value, secrets = []) {
  if (value == null) return value;
  if (typeof value === "string") {
    let out = value;
    for (const secret of secrets) {
      const s = String(secret || "");
      if (s.length >= 6 && out.includes(s)) out = out.split(s).join("[redacted]");
    }
    return out.replace(/\bBearer\s+\S+/gi, "Bearer [redacted]");
  }
  if (Array.isArray(value)) return value.map((row) => scrubTokenLeak(row, secrets));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY_RE.test(k)) continue;
      out[k] = scrubTokenLeak(v, secrets);
    }
    return out;
  }
  return value;
}

export function foldlockRealCite() {
  return {
    slug: "foldlock",
    name: "FoldLock",
    software_tab: true,
    invented: false,
    zip: false,
    doi: DOI_BY_SLUG.foldlock || null,
    note: "Cite the real FoldLock catalog Software only. Not zip. Not a new Softwares product.",
  };
}

export function redlineCiteField() {
  return {
    spec: REDLINE_SPEC,
    name: REDLINE_NAME,
    author: REDLINE_AUTHOR,
    identity: REDLINE_AUTHOR,
    date: REDLINE_DATE,
    path: REDLINE_DOCS,
    software_tab: REDLINE_SOFTWARE_TAB,
    fraggate_slug: REDLINE_FRAGGATE_SLUG,
    growth_on: REDLINE_GROWTH_ON,
    gptbot_disallow: REDLINE_GPTBOT_DISALLOW,
    person_id: REDLINE_PERSON_ID,
    person_id_stable: true,
    runtime_software_id: RUNTIME_SOFTWARE_ID,
    lamb_lens: {
      version: LAMB_LENS_VERSION,
      software_tab: LAMB_LENS_SOFTWARE_TAB,
      door: LAMB_LENS_DOOR,
      hop: "after_fraggate",
    },
    cap7: {
      spec: SEMANTIC_BRIDGE_SPEC,
      design_of: CAP7_DESIGN_OF,
      inherit: CAP7_INHERIT,
      resolves_to_hub: CAP7_RESOLVES_TO_HUB,
    },
    tls: { ...TLS_CITE },
    foldlock: foldlockRealCite(),
    token: {
      header_only: true,
      headers: ["Authorization", TOKEN_HEADER],
      query: false,
      body: false,
      git: false,
    },
    doors: PUBLIC_DOORS,
    designs_folder: DESIGNS_FOLDER,
    azindex_hub_crawl_unchanged: true,
    limitation:
      "THIS IS: runtime redline — public-door map, header-only operator token, Growth-ON Allow, Cloudflare TLS cite, attack-sim refuses. THIS IS NOT: a Softwares product; a GPTBot Disallow; a client-side crypto claim; a live AZ-GEN registrar; a Remain-OFF enable. Author: Aziel Eliab only.",
  };
}

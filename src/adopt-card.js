/**
 * Compact adopt card for GET /adopt.json.
 * Fields come from the served Softwares tip (git_sha, version_id, count).
 * No DOI, OAuth IdP, Glama UUID, or ICANN registration is invented.
 * Author: Aziel Eliab only. NO-LIE.
 */

import { PUBLIC_MCP_TOOLS } from "./fraggate/codes.js";
import { RUNTIME_VERSION } from "./runtime-api.js";
import { CONTENT_SIGNAL } from "./security-headers.js";
import { MCP_PROTOCOL_PREFERRED } from "./mcp-transport.js";
import { CLIENT_CLASS_IDS } from "./client-matrix.js";
import {
  AUTHOR_ID,
  PRODUCT_NAME,
  PRODUCT_SLUG,
  RUNTIME_GLAMA,
} from "./seo.js";

const SHA = /^[0-9a-f]{7,40}$/;

export const LLMS_BODY_CANONICAL = Object.freeze({
  "/llms.txt": "/llms.txt",
  "/ai.txt": "/ai.txt",
  "/.well-known/llms.txt": "/llms.txt",
  "/.well-known/ai.txt": "/ai.txt",
});

export function llmsBodyCanonical(pathname) {
  return LLMS_BODY_CANONICAL[pathname] || null;
}

function cleanSha(raw) {
  const s = String(raw || "").trim().toLowerCase();
  return SHA.test(s) ? s : null;
}

/**
 * tip_lag is true only when HEAD_SHA is bound and differs from the served Softwares git_sha.
 * Unbound HEAD does not invent a match or a lag.
 */
export function tipLagFields(gitSha, env = {}) {
  const head = cleanSha(env && (env.HEAD_SHA || env.GIT_HEAD));
  const served = cleanSha(gitSha);
  if (!head) {
    return {
      tip_lag: null,
      head_sha: null,
      tip_lag_note: "HEAD_SHA is unbound. Softwares git_sha is the served tip. Lag is not claimed.",
    };
  }
  const lag = served !== head;
  return {
    tip_lag: lag,
    head_sha: head,
    tip_lag_note: lag
      ? "Softwares git_sha differs from bound HEAD_SHA. The served sha is unchanged."
      : "Softwares git_sha matches bound HEAD_SHA.",
  };
}

export function adoptCard({ origin, env = {}, catalog = {} }) {
  const base = String(origin || "").replace(/\/$/, "");
  const count = Number.isInteger(catalog.count) ? catalog.count : null;
  const tools = PUBLIC_MCP_TOOLS.length;
  const git_sha = catalog.git_sha || null;
  const version_id = catalog.version_id || null;
  return {
    product: catalog.suite_calling_name || PRODUCT_NAME,
    slug: catalog.suite_calling_slug || PRODUCT_SLUG,
    version: catalog.version || RUNTIME_VERSION,
    git_sha,
    version_id,
    version_id_source: catalog.version_id_source || null,
    version_id_note: catalog.version_id_note || null,
    softwares_count: count,
    tools_list_count: tools,
    door: "fraggate",
    second_door: false,
    mcp: `${base}/mcp`,
    openapi: `${base}/openapi.json`,
    openapi_actions: `${base}/openapi/adopt-actions.json`,
    glama: RUNTIME_GLAMA,
    first_call: {
      order: "Softwares → pick slug → fraggate_call",
      examples: [
        "Softwares {}",
        "fraggate_call { slug: foldlock, op: fold-preview, dry_run: true }",
        "decisiongate_check { dry_run: true }",
      ],
      library: "library_lookup",
      refuse_codes: ["FG-HALLUC-TOOL", "MCP-CONFIRM-REQUIRED"],
    },
    protocol_preferred: MCP_PROTOCOL_PREFERRED,
    auth: "none",
    confirm_is_not_auth: true,
    public_demo: "shared ephemeral isolate — labeled, not a private tenant",
    why_adopt: `One FragGate door. MCP tools/list is ${tools} tools in front of ${count} Softwares. dry_run previews without a ledger write. confirm is consent, not tenant auth. Public MCP auth is none. ChainLock, TemporalLock, and ForgeReceipts stamp a hash when the call needs a ledger. No latency figure, DOI, OAuth IdP, Glama UUID, or ICANN registration is claimed.`,
    clients: CLIENT_CLASS_IDS.slice(),
    clients_matrix: `${base}/v1/clients.json`,
    install: {
      cursor: `${base}/install/cursor.json`,
      claude_desktop: `${base}/install/claude-desktop.json`,
    },
    author_id: AUTHOR_ID,
    content_signal: CONTENT_SIGNAL,
    ...tipLagFields(git_sha, env),
  };
}

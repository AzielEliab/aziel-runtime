/**
 * Slim OpenAPI for Actions-class importers.
 * Softwares catalog + FragGate call + skill + health. Not the 508-path catalog spec.
 * Not a second door. Author: Aziel Eliab only. NO-LIE.
 */

import { RUNTIME_VERSION } from "./runtime-api.js";
import { AUTHOR_ID, AUTHOR_NAME, RUNTIME_GITHUB, RUNTIME_GLAMA } from "./seo.js";

export function adoptActionsOpenApi(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    openapi: "3.1.0",
    info: {
      title: "Aziel Runtime — Actions adopt subset",
      version: RUNTIME_VERSION,
      summary: "Slim import: Softwares, FragGate call, skill, and health. Not a second door.",
      description:
        "HTTP face of Softwares is GET /v1/software. Exec is POST /v1/fraggate/call only. MCP tools/list name Softwares is the same first call on POST /mcp. Skill and health are read-only. Auth is none. confirm is consent, not tenant auth. The full catalog spec stays at /openapi.json. No DOI and no OAuth IdP.",
      license: { name: "Apache-2.0", identifier: "Apache-2.0" },
      contact: { name: AUTHOR_NAME, url: "https://www.azieleliab.com/" },
      "x-sameAs": [AUTHOR_ID, RUNTIME_GITHUB, RUNTIME_GLAMA],
      "x-author-id": AUTHOR_ID,
      "x-door": "fraggate",
      "x-second-door": false,
      "x-full-openapi": `${base}/openapi.json`,
      "x-adopt": `${base}/adopt.json`,
    },
    servers: [{ url: base }],
    paths: {
      "/v1/software": {
        get: {
          operationId: "softwares_catalog",
          summary: "Softwares catalog. Pick a slug, then POST /v1/fraggate/call.",
          tags: ["software"],
          responses: { "200": { description: "Software catalog JSON" } },
        },
        head: {
          operationId: "softwares_catalog_head",
          summary: "HEAD of /v1/software.",
          tags: ["software"],
          responses: { "200": { description: "headers only" } },
        },
      },
      "/v1/fraggate/call": {
        post: {
          operationId: "fraggate_call",
          summary: "FragGate is the single exec door. dry_run previews. confirm is consent, not auth.",
          tags: ["fraggate"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["slug", "op"],
                  properties: {
                    slug: { type: "string" },
                    op: { type: "string" },
                    payload: { type: "object" },
                    dry_run: { type: "boolean" },
                    confirm: { type: "boolean", description: "Consent to run. Not tenant auth." },
                  },
                },
                examples: {
                  fold_preview: {
                    summary: "dry_run preview",
                    value: { slug: "foldlock", op: "fold-preview", dry_run: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "FragGate result envelope" },
            "400": { description: "Refuse envelope. Codes include FG-HALLUC-TOOL and MCP-CONFIRM-REQUIRED." },
          },
        },
      },
      "/v1/skill": {
        get: {
          operationId: "runtime_skill",
          summary: "Runtime skill markdown.",
          tags: ["runtime"],
          responses: { "200": { description: "text/markdown skill" } },
        },
        head: {
          operationId: "runtime_skill_head",
          summary: "HEAD of /v1/skill.",
          tags: ["runtime"],
          responses: { "200": { description: "headers only" } },
        },
      },
      "/v1/health": {
        get: {
          operationId: "runtime_health",
          summary: "Liveness.",
          tags: ["runtime"],
          responses: { "200": { description: "health JSON" } },
        },
        head: {
          operationId: "runtime_health_head",
          summary: "HEAD of /v1/health.",
          tags: ["runtime"],
          responses: { "200": { description: "headers only" } },
        },
      },
    },
  };
}

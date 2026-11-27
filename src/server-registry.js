/**
 * GET /server.json — official MCP registry file.
 * Served only when version, title, streamable-http remote URL, and auth:none
 * match this origin's live server card. Otherwise 404. No OAuth server.
 * /.well-known/mcp/server.json stays unserved (that path is not the registry file).
 * Author: Aziel Eliab only. NO-LIE.
 */

import registryFile from "../server.json" with { type: "json" };
import { mcpServerCard } from "./mcp-discovery.js";

export function serverJsonDecision(origin, env = {}) {
  const file = registryFile && typeof registryFile === "object" ? registryFile : null;
  const card = mcpServerCard(origin, env);
  const remote = file && Array.isArray(file.remotes) ? file.remotes[0] : null;
  const cardRemote = card && Array.isArray(card.remotes) ? card.remotes[0] : null;
  const mismatch = [];
  if (!file) mismatch.push("file");
  if (!file || file.version !== card.version) mismatch.push("version");
  if (!file || file.title !== card.title) mismatch.push("title");
  if (!remote || remote.type !== "streamable-http") mismatch.push("remote.type");
  if (!cardRemote || !remote || remote.type !== cardRemote.type) mismatch.push("card.remote.type");
  if (!remote || remote.url !== card.url) mismatch.push("remote.url");
  if (card.transport !== "streamable-http") mismatch.push("transport");
  if (!card.auth || card.auth.type !== "none" || card.auth.public !== true) mismatch.push("auth");
  if (file && (file.packages || file.auth || file.authorization || file.oauth)) mismatch.push("extra-auth");
  const slug = String((card && card.name) || "");
  const regName = String((file && file.name) || "");
  if (!slug || !regName.endsWith("/" + slug)) mismatch.push("name");
  if (mismatch.length) {
    return {
      ok: false,
      status: 404,
      body: {
        error: "server.json withheld",
        code: "SERVER-CARD-MISMATCH",
        mismatch,
        note: "GET /server.json is served only when the registry file matches this origin's server card (version, title, streamable-http URL, auth none). No OAuth server is invented.",
      },
    };
  }
  return { ok: true, status: 200, body: file };
}

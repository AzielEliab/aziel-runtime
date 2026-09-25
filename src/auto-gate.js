/**
 * FragGate runs before a Softwares or runtime tool.
 * Callers do not call fraggate_* first. Diagnostic door tools stay available.
 * tools/list stays 36. Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { check as decisiongateCheck } from "./engines/decisiongate/engine.js";
import { admitCall, defaultClaim, previewCatalogAdmission, refuseRuntimeGate } from "./fraggate/door.js";

const DOOR_DIAGNOSTIC = new Set(["fraggate_list", "fraggate_describe", "fraggate_verify", "fraggate_call"]);

export function isDoorDiagnostic(name) {
  return DOOR_DIAGNOSTIC.has(String(name || ""));
}

/**
 * Catalog target for a public tool, when one exists.
 * chainlock_* and raw session plumbing have no catalog slug.
 */
export function catalogArgsForTool(name, args) {
  const tool = String(name || "");
  const src = args && typeof args === "object" ? args : {};
  if (tool === "runtime_run" || tool === "runtime_session_exec" || tool === "use_software") {
    return { ...src };
  }
  if (tool === "library_lookup") {
    const op = String(src.op || "search").trim() || "search";
    return { slug: "aziel-corpus", name: "aziel-corpus", op, payload: src.payload };
  }
  if (tool === "decisiongate_check" || tool.startsWith("mesh_") || tool.startsWith("memory_")) {
    return { name: tool };
  }
  return null;
}

export function meshHttpOp(pathname) {
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
  if (!path.startsWith("/v1/mesh/")) return "";
  const rest = path.slice("/v1/mesh/".length);
  if (!rest || rest.includes("/")) return "";
  if (rest === "site-heartbeat") return "site-presence";
  return rest;
}

function dryGateMiss(name, gate) {
  return {
    ok: false,
    code: "FG-GATE-REFUSE",
    door: "fraggate",
    tool: name,
    mutated: false,
    dry_run: true,
    ledger_written: false,
    message: `DecisionGATE ${gate && gate.final_state ? gate.final_state : "REFUSE"} — preview only. Nothing was written.`,
  };
}

/**
 * Enter FragGate before the tool body.
 * Catalog tools: classify, then DecisionGATE (admitCall). dry_run uses the same
 * refuse code and writes no ledger tip.
 * Tools with no catalog slug: DecisionGATE on the runtime claim, then the tool.
 * Door diagnostic tools are already FragGate.
 * A non-live mesh HTTP verb is left to the mesh handler so published mesh
 * refuse codes stay (MESH-NO-REWRITE, MESH-NO-LIE).
 */
export async function enterFragGate({ name, args, registry, bySlug, dryRun = false }) {
  if (isDoorDiagnostic(name)) return { proceed: true, role: "diagnostic" };
  const catalog = catalogArgsForTool(name, args);
  if (dryRun) {
    if (catalog) {
      const preview = previewCatalogAdmission(catalog, registry, bySlug);
      if (!preview.proceed) return { proceed: false, envelope: preview.envelope };
    } else {
      const gate = decisiongateCheck(defaultClaim("runtime", name));
      if (!gate || gate.final_state !== "PASS") return { proceed: false, envelope: dryGateMiss(name, gate) };
    }
    return { proceed: true, role: "preview" };
  }
  if (catalog) {
    const admission = await admitCall(catalog, registry, bySlug);
    if (!admission.admitted) return { proceed: false, envelope: admission.envelope };
    return { proceed: true, role: "catalog", target: admission.target };
  }
  const gate = decisiongateCheck(defaultClaim("runtime", name));
  if (!gate || gate.final_state !== "PASS") {
    return { proceed: false, envelope: await refuseRuntimeGate(name, gate) };
  }
  return { proceed: true, role: "gate" };
}

/**
 * Live mesh HTTP posts enter FragGate before the mesh handler.
 * Non-live verbs return proceed so the mesh handler keeps its published code.
 */
export async function enterMeshPost({ pathname, payload, registry, bySlug }) {
  const op = meshHttpOp(pathname);
  if (!op) return { proceed: true, role: "skip" };
  const preview = previewCatalogAdmission({ slug: "mesh", op, payload }, registry, bySlug);
  if (!preview.proceed) return { proceed: true, role: "mesh-code" };
  const admission = await admitCall({ slug: "mesh", op, payload }, registry, bySlug);
  if (!admission.admitted) return { proceed: false, envelope: admission.envelope };
  return { proceed: true, role: "catalog" };
}

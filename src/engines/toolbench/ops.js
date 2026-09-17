/**
 * ToolBench in-process ops. Engine artifact is ./engine.js.
 * Author: Aziel Eliab.
 */
import { classifyCall } from "../../fraggate/registry.js";
import { capabilityDoctor, capabilityHealth, capabilitySkill } from "../capability.js";
import {
  AXES,
  LIMITATION,
  LIVE_OPS,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  PRODUCT_GITHUB,
  ROLE,
  SPEC,
  STUB_REFUSE,
  VERSION,
  findCase,
  limitationCite,
  scoreCase,
  suiteList,
} from "./engine.js";

export const TOOLBENCH_OPS = LIVE_OPS.slice();

function envelope() {
  return {
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    role: ROLE,
    motto: MOTTO,
    axes: AXES,
    neighbors: NEIGHBORS,
    live_ops: LIVE_OPS,
    stub_ops: STUB_REFUSE,
    limitation: LIMITATION,
    extra: {
      github: PRODUCT_GITHUB,
      third_party_lab: false,
      : false,
      worker_home: null,
      in_runtime: true,
      domain: null,
      placement: "tool-playground",
    },
  };
}

export function toolbenchHealth() {
  return capabilityHealth(envelope());
}

export function toolbenchSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: `Synthetic FragGate / Sentinel / TDQS refuse playground. ${MOTTO} suite lists cases; run_case classifies one against the live door table.  / live_remote_harness stay FG-STUB. In-runtime placement. Cite ${PRODUCT_GITHUB}.`,
  });
}

export function toolbenchDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note:
      "ToolBench doctor: synthetic door cases only. Self-test ≠ third-party lab. Does not invent a pass. FragGate only. Not a mesh enable.",
  });
}

function classifySlugOp(slug, op) {
  const key = String(slug || "").trim().toLowerCase();
  if (!key || key === "not-a-real-slug" || key === "qemu-sandbox") {
    return classifyCall(null, op);
  }
  return classifyCall({ slug: key, status: "live" }, op);
}

export function runCase(payload) {
  const id = payload && payload.id != null ? payload.id : payload && payload.case;
  const row = findCase(id);
  if (!row) {
    return { ok: false, error: "unknown case id", status: 400, known: suiteList().cases.map((c) => c.id) };
  }
  const classified = classifySlugOp(row.slug, row.op);
  return scoreCase(row, classified.kind);
}

export async function runToolbench(op, payload) {
  if (op === "health") return toolbenchHealth();
  if (op === "skill") return toolbenchSkill();
  if (op === "doctor") return toolbenchDoctor();
  if (op === "limitation") return limitationCite();
  if (op === "suite") return suiteList();
  if (op === "run_case") return runCase(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION };

/**
 * ToolBench — synthetic FragGate / Sentinel / TDQS refuse playground.
 *
 * REAL: named synthetic cases that classify against the live FragGate
 * kind table (halluc / stub / live / unknown_op). Does not invent pass.
 * THIS IS NOT: fielded-100, a live remote harness, or a third-party lab.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "toolbench";
export const NAME = "ToolBench";
export const VERSION = "0.1.0";
export const ENGINE_VERSION = VERSION;
export const SPEC = "TOOLBENCH-0.1";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Synthetic refuse packs. Self-test ≠ third-party lab.";
export const ROLE = "automated tool-use benchmarking playground (FragGate door)";
export const SCHEMA = "toolbench.case.v0.1";
export const PRODUCT_GITHUB = "https://github.com/AzielEliab/aziel-runtime";

export const AXES = Object.freeze(["case", "kind", "code", "pass"]);
export const NEIGHBORS = Object.freeze(["zkattest", "mmconsensus", "decisiongate"]);

export const STUB_REFUSE = Object.freeze([
  "fielded_100",
  "live_remote_harness",
  "invent_pass",
  "third_party_lab",
]);

export const LIMITATION =
  "THIS IS: an in-process synthetic tool-use playground (TOOLBENCH-0.1) for FragGate refuse packs (Sentinel / TDQS / FG-HALLUC-TOOL / FG-STUB). suite lists cases; run_case classifies one case. THIS IS NOT: fielded-100, a live remote harness, a third-party lab, or permission to invent a pass. Honesty: REAL classification against the live door table. SLOT for fielded-100. FragGate only. Author: Aziel Eliab only.";

export const LIVE_OPS = Object.freeze(["health", "skill", "doctor", "suite", "run_case", "limitation"]);

export const KIND_TO_CODE = Object.freeze({
  live: "FG-OK",
  stub: "FG-STUB",
  halluc: "FG-HALLUC-TOOL",
  unknown_op: "FG-UNKNOWN-OP",
  local_only: "FG-LOCAL-ONLY",
});

export const SUITE_CASES = Object.freeze([
  {
    id: "fg-halluc",
    slug: "not-a-real-slug",
    op: "health",
    expect_kind: "halluc",
    expect_code: "FG-HALLUC-TOOL",
    note: "Unknown registry name refuses FG-HALLUC-TOOL.",
  },
  {
    id: "zk-stub-groth16",
    slug: "zkattest",
    op: "groth16",
    expect_kind: "stub",
    expect_code: "FG-STUB",
    note: "Full ZK proving stays SLOT / FG-STUB.",
  },
  {
    id: "zk-health",
    slug: "zkattest",
    op: "health",
    expect_kind: "live",
    expect_code: "FG-OK",
    note: "zkattest health is a live door op.",
  },
  {
    id: "zk-unknown",
    slug: "zkattest",
    op: "not_an_op",
    expect_kind: "unknown_op",
    expect_code: "FG-UNKNOWN-OP",
    note: "Live slug, unknown op.",
  },
  {
    id: "mm-stub-live-model",
    slug: "mmconsensus",
    op: "live_model_call",
    expect_kind: "stub",
    expect_code: "FG-STUB",
    note: "Live multi-model calls stay SLOT.",
  },
  {
    id: "mm-tally",
    slug: "mmconsensus",
    op: "tally",
    expect_kind: "live",
    expect_code: "FG-OK",
    note: "Posted-opinion tally is live.",
  },
  {
    id: "tb-stub-fielded",
    slug: "toolbench",
    op: "fielded_100",
    expect_kind: "stub",
    expect_code: "FG-STUB",
    note: "fielded-100 is not invented.",
  },
  {
    id: "guest-vm-halluc",
    slug: "qemu-sandbox",
    op: "boot",
    expect_kind: "halluc",
    expect_code: "FG-HALLUC-TOOL",
    note: "No QEMU / KVM guest slug exists.",
  },
]);

export function suiteList() {
  return {
    ok: true,
    op: "suite",
    schema: SCHEMA,
    product: PRODUCT,
    spec: SPEC,
    version: VERSION,
    count: SUITE_CASES.length,
    cases: SUITE_CASES.map((c) => ({ ...c })),
    third_party_lab: false,
    fielded_100: false,
    note: "Synthetic cases only. Self-test ≠ third-party lab.",
    author: AUTHOR,
    identity: AUTHOR,
    door: "fraggate",
  };
}

export function findCase(id) {
  const key = String(id || "").trim();
  return SUITE_CASES.find((c) => c.id === key) || null;
}

export function scoreCase(row, kind) {
  const got_kind = String(kind || "");
  const got_code = KIND_TO_CODE[got_kind] || null;
  const pass = got_kind === row.expect_kind && got_code === row.expect_code;
  return {
    ok: true,
    op: "run_case",
    schema: SCHEMA,
    id: row.id,
    slug: row.slug,
    case_op: row.op,
    expect_kind: row.expect_kind,
    expect_code: row.expect_code,
    got_kind,
    got_code,
    pass,
    invents_pass: false,
    third_party_lab: false,
    note: row.note,
    author: AUTHOR,
    identity: AUTHOR,
    door: "fraggate",
  };
}

export function limitationCite() {
  return {
    ok: true,
    op: "limitation",
    product: PRODUCT,
    spec: SPEC,
    limitation: LIMITATION,
    live_ops: LIVE_OPS.slice(),
    stub_ops: STUB_REFUSE.slice(),
    honesty_labels: {
      suite: "REAL",
      run_case: "REAL",
      fielded_100: "SLOT",
      live_remote_harness: "SLOT",
    },
    out_of_scope: STUB_REFUSE.slice(),
    author: AUTHOR,
    identity: AUTHOR,
    door: "fraggate",
  };
}

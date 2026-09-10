/**
 * Shared health / skill envelope for Softwares capability baseline.
 * Not a FragGate slug. Engines stay isolated; this is display/ops richness only.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const AUTHOR = "Aziel Eliab";

export function capabilityHealth(spec) {
  const extra = spec.extra && typeof spec.extra === "object" ? spec.extra : {};
  return {
    ok: true,
    op: "health",
    status: "ok",
    product: spec.product,
    name: spec.name || spec.product,
    version: spec.version,
    spec: spec.spec || null,
    role: spec.role || null,
    motto: spec.motto || null,
    axes: Array.isArray(spec.axes) ? spec.axes.slice() : [],
    neighbors: Array.isArray(spec.neighbors) ? spec.neighbors.slice() : [],
    live_ops: Array.isArray(spec.live_ops) ? spec.live_ops.slice() : [],
    stub_ops: Array.isArray(spec.stub_ops) ? spec.stub_ops.slice() : [],
    true_engine_runtime: true,
    kv_increment: false,
    door: "fraggate",
    mesh_enabled_default: false,
    limitation: spec.limitation,
    author: AUTHOR,
    ...extra,
  };
}

export function capabilityDoctor(spec) {
  const health = capabilityHealth(spec);
  return {
    ...health,
    op: "doctor",
    doctor: true,
    note:
      spec.doctor_note ||
      "Doctor is richer liveness: ops table, refuse list, neighbors. Not a mesh enable. FragGate only.",
  };
}

export function capabilitySkill(spec) {
  const name = spec.name || spec.product;
  const specId = spec.spec ? ` (${spec.spec})` : "";
  const live = Array.isArray(spec.live_ops) ? spec.live_ops : [];
  const stubs = Array.isArray(spec.stub_ops) ? spec.stub_ops : [];
  const neighbors = Array.isArray(spec.neighbors) ? spec.neighbors : [];
  const axes = Array.isArray(spec.axes) ? spec.axes : [];
  const lead = spec.lead || "";
  const markdown = `# ${name}${specId}

${lead}

- MCP: \`fraggate_call\` with \`{ slug: "${spec.product}", op: "..." }\`
- HTTP: \`POST /v1/fraggate/call\` with the same envelope
- Leftover flat names such as \`${spec.product}_health\` still go through FragGate (\`parseTarget\`) — they are not a side door and are not listed on \`tools/list\`

LIVE_OPS: ${live.join(", ") || "(none)"}.

Stubs (refuse): ${stubs.join(", ") || "(none)"}.

Axes / order: ${axes.join(", ") || "(none)"}.
Neighbors: ${neighbors.join(", ") || "(none)"}.

Author: Aziel Eliab only.
Limitation: ${spec.limitation}
`;
  return {
    op: "skill",
    markdown,
    skill: markdown,
    kv_increment: false,
    limitation: spec.limitation,
    live_ops: live.slice(),
    stub_ops: stubs.slice(),
    neighbors: neighbors.slice(),
    axes: axes.slice(),
    door: "fraggate",
    mesh_enabled_default: false,
    author: AUTHOR,
    product: spec.product,
    name,
    version: spec.version,
    spec: spec.spec || null,
    true_engine_runtime: true,
  };
}

export function srcOf(payload) {
  return payload && typeof payload === "object" ? payload : {};
}

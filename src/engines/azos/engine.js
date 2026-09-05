/**
 * AZ-OS engine (portable ethics / status core from workers/download-tracker/src/runtime.js).
 * Status + invite + principles + gate preview. session/exec/lattice need KV — those ops stay proxy_fallback.
 * Author: Aziel Eliab.
 */

export const PRODUCT = "azos";
export const VERSION = "0.3.0";
export const MOTTO = "Integrity precedes execution.";
export const AUTHOR = "Aziel Eliab";
export const LIMITATION =
  "THIS IS: read-only status / principles and a five-gate ethics preview. THIS IS NOT: a remote host shell, SSH, a kernel, or unrestricted bash. Hosted session/exec/lattice persist in product-Worker KV and stay explicit proxy_fallback. Halt does not kill the caller OS.";

export const PRINCIPLES = [
  "Integrity precedes execution.",
  "Time-bound actions are final.",
  "Understanding precedes modification.",
  "The system protects itself architecturally.",
  "Propagation is not infection.",
];

export const GATES = ["definition", "evidence", "impact", "integrity", "responsibility"];

export const SHELL_VERBS = [
  "help", "pwd", "ls", "cat", "write", "echo", "mkdir", "rm", "cd",
  "status", "principles", "invite", "modules", "list_modules", "history",
  "whoami", "session", "halt", "exit", "close", "id", "uname",
];

export const DENIED_VERBS = [
  "sudo", "bash", "sh", "zsh", "python", "curl", "wget", "nc", "nmap",
  "ssh", "scp", "mkfs", "dd", "eval", "exec", "reboot", "shutdown",
];

const BANNED_IMPACT = [
  "wipe disk", "format drive", "mkfs", "self-replicate", "self replicate",
  "worm", "ransom", "infect",
];

const HOST_META = ["|", ";", "`", "$(", "&&", "||", "\n", "\r"];
export const SAFE_ACTIONS = ["list_modules", "echo", "status", "purge_session", "shell"];

export const INVITE = `You are invited to run AZ-OS yourself. This is not a silent block.
Adoption is voluntary.

Source:
  https://github.com/AzielEliab/azos
`;

export function scopeMeta(obj) {
  return {
    motto: MOTTO,
    author: AUTHOR,
    kind: "ethics_coded_remote_shell",
    remote_shell: true,
    ethics_gated: true,
    overlay: true,
    kernel: false,
    worm: false,
    malware: false,
    ssh: false,
    host_subprocess: false,
    unrestricted_host_shell: false,
    kills_caller_os: false,
    prefab: true,
    windows_shell: true,
    integrity_lattice: "temporallock_staticclock",
    protocols: ["https-json", "http-loopback", "cli-stdin"],
    auth: "arc-token-after-five-gates",
    sandbox: "session-vfs",
    principles: PRINCIPLES,
    gates: GATES,
    limitation: LIMITATION,
    true_engine_runtime: true,
    kv_increment: false,
    ...obj,
  };
}

function filled(value, minimum) {
  return typeof value === "string" && value.trim().length >= minimum;
}

export function authorizeProposal(body) {
  const src = body && typeof body === "object" ? body : {};
  const action = String(src.action || "shell").trim() || "shell";
  const definition = String(src.definition || "");
  const evidence = String(src.evidence || "");
  const impact = String(src.impact || "");
  const actor = String(src.actor || "").trim();
  const checks = {};

  if (!action) checks.definition = { pass: false, reason: "action name is required" };
  else if (!filled(definition, 8)) checks.definition = { pass: false, reason: "definition must state what the action is (min 8 chars)" };
  else checks.definition = { pass: true, reason: "action is defined" };

  if (!filled(evidence, 8)) checks.evidence = { pass: false, reason: "evidence / justification is required (min 8 chars)" };
  else checks.evidence = { pass: true, reason: "evidence provided" };

  const impactLow = impact.toLowerCase();
  if (!filled(impact, 8)) checks.impact = { pass: false, reason: "impact must state what will change (min 8 chars)" };
  else if (BANNED_IMPACT.some((b) => impactLow.includes(b))) checks.impact = { pass: false, reason: "impact violates overlay bounds" };
  else checks.impact = { pass: true, reason: "impact stated" };

  if (action !== "shell" && !SAFE_ACTIONS.includes(action)) {
    checks.integrity = { pass: false, reason: "unsigned / unregistered action: default deny" };
  } else {
    checks.integrity = { pass: true, reason: "action is a registered safe builtin" };
  }

  if (!actor) checks.responsibility = { pass: false, reason: "a named actor is required" };
  else checks.responsibility = { pass: true, reason: `actor '${actor}' is named (name is not a privilege)` };

  return { passed: GATES.every((g) => checks[g] && checks[g].pass), gates: checks, action, actor };
}

export function statusPayload() {
  return scopeMeta({
    ok: true,
    product: PRODUCT,
    overlay_name: "AZ-OS",
    interface: "AZ Interface",
    version: VERSION,
    halted: false,
    lumen: "running",
    builtins: SAFE_ACTIONS,
    shell_verbs: SHELL_VERBS,
    tokens: { active: 0, revoked: 0, issued: 0 },
    note: "Read-only status / principles. No remote exec on this route. session/exec/lattice stay proxy_fallback (product-Worker KV).",
  });
}

export function invitePayload() {
  return scopeMeta({
    ok: true,
    product: PRODUCT,
    invite: INVITE,
    download: "https://azos-download-tracker.vibelock.workers.dev/",
    source: "https://github.com/AzielEliab/azos",
    infection: false,
    note: "Propagation is invitation, not infection. Writes no files on the caller.",
  });
}

export function principlesPayload() {
  return scopeMeta({
    ok: true,
    product: PRODUCT,
    version: VERSION,
    principles: PRINCIPLES,
    gates: GATES,
  });
}

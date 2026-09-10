/**
 * ChainLock public surface — internal fabric + MCP chainlock_* tools.
 *
 * Not a Softwares-tab product. Not a FragGate catalog slug.
 * Author: Aziel Eliab only.
 */

import { append, groundedDoor, interact, recall, ROSTER, tip, verify, CL_VERSION, VAULT_NOTE } from "./chainlock/ops.js";
import { storeFor, VAULT_CHAINS_PATH } from "./chainlock/store.js";
import { seal, verify as verifyLockset, LS_VERSION } from "./lockset.js";
import { arch, pipe, thinPipe, AZPIPE_VERSION } from "./azpipe.js";

export {
  append,
  recall,
  tip,
  verify,
  interact,
  ROSTER,
  CL_VERSION,
  VAULT_CHAINS_PATH,
  VAULT_NOTE,
};

export const CHAINLOCK_MCP_TOOLS = Object.freeze([
  "chainlock_append",
  "chainlock_tip",
  "chainlock_recall",
  "chainlock_verify",
  "chainlock_seal",
]);

export function isChainlockTool(name) {
  const n = String(name || "");
  return n === "chainlock" || n.startsWith("chainlock_");
}

export function parseChainlockOp(name, args) {
  const n = String(name || "");
  if (n.startsWith("chainlock_")) return n.slice("chainlock_".length);
  return String((args && (args.op || args.verb)) || "status");
}

export async function runChainlockOp(name, args, env) {
  const op = parseChainlockOp(name, args);
  const src = args && typeof args === "object" ? args : {};
  const store = storeFor(env);

  if (op === "status" || op === "health") {
    return {
      ok: true,
      v: CL_VERSION,
      lockset: LS_VERSION,
      pipe: AZPIPE_VERSION,
      roster: ROSTER.slice(),
      vault: VAULT_NOTE,
      software_tab: false,
      author: "Aziel Eliab",
    };
  }
  if (op === "append") return append(store, src);
  if (op === "tip") return tip(store, src.c || src.chain);
  if (op === "recall") return recall(store, src);
  if (op === "verify") {
    const chains = await verify(store, src);
    const lattice = await verifyLockset(store, src);
    return { ...lattice, chains: chains.chains, chain_ok: chains.ok };
  }
  if (op === "seal") return seal(store, src);
  if (op === "interact") return interact(store, src);
  if (op === "door") return groundedDoor(await recall(store, src));
  if (op === "pipe") {
    if (src.arch) return arch();
    const envl = await pipe({
      dir: src.dir || "in",
      payload: src.payload !== undefined ? src.payload : src.json,
      claim: src.claim,
      env,
      fact: src.fact,
    });
    return { ok: envl.ok, envelope: envl, pipe: thinPipe(envl) };
  }
  if (op === "arch") return arch();
  return { ok: false, refuse: "unknown-op", op, live: CHAINLOCK_MCP_TOOLS.slice() };
}

export function chainlockMcpTools() {
  return [
    {
      name: "chainlock_append",
      title: "ChainLock append",
      description:
        "Append a fact-bearing stamp to a local ChainLock chain (CL-WP-0.4). Runtime fabric — not a Softwares-tab product. Hash-only cards refuse. UI=MCP. No Node Gate.",
      annotations: { title: "ChainLock append", readOnlyHint: false, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          c: { type: "string", description: "Chain name (genesis, identity, ssh, session, acts, evidence, recall, mesh, library, learn)" },
          subject: { type: "string", description: "Subject ≤80" },
          fact: { type: "string", description: "Fact ≤160 (required)" },
          k: { type: "string", description: "Kind" },
        },
        required: ["fact"],
      },
    },
    {
      name: "chainlock_tip",
      title: "ChainLock tip",
      description: "Read the live tip card of one ChainLock chain. Fabric module. Not a Softwares-tab product.",
      annotations: { title: "ChainLock tip", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { c: { type: "string", description: "Chain name" } },
      },
    },
    {
      name: "chainlock_recall",
      title: "ChainLock recall",
      description:
        "Grounded recall at depth 0–5 (CL-WP-0.4). Returns id+h+fh facts or refuse=no-stamp. Do not invent a fact.",
      annotations: { title: "ChainLock recall", readOnlyHint: true, openWorldHint: false },
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          depth: { type: "number", description: "0 tip … 5 genesis/budget" },
          q: { type: "string", description: "Optional query" },
          c: { type: "string", description: "Optional chain" },
        },
      },
    },
    {
      name: "chainlock_verify",
      title: "ChainLock / LOCKSET verify",
      description:
        "Fail-closed verify (broken prev, tip drift, missing GodLock cite). LOCKSET LS-WP-0.1. Cites godlock.uk; does not write the public ledger.",
      annotations: { title: "ChainLock / LOCKSET verify", readOnlyHint: true, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: true, properties: { c: { type: "string" } } },
    },
    {
      name: "chainlock_seal",
      title: "LOCKSET seal",
      description:
        "Seal live chain tips + TemporalLock receipt + GodLock cite (LS-WP-0.1). Operator posts lockset_sha256. Runtime does not write godlock.uk.",
      annotations: { title: "LOCKSET seal", readOnlyHint: false, openWorldHint: false },
      inputSchema: { type: "object", additionalProperties: true, properties: {} },
    },
  ];
}

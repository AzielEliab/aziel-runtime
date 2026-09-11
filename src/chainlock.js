/**
 * ChainLock public surface — internal fabric + MCP chainlock_* tools.
 *
 * Not a Softwares-tab product. Not a FragGate catalog slug.
 * Author: Aziel Eliab only.
 */

import { append, groundedDoor, interact, recall, ROSTER, tip, verify, CL_VERSION, VAULT_NOTE } from "./chainlock/ops.js";
import { adaptiveRecall } from "./memory.js";
import { storeFor, VAULT_CHAINS_PATH } from "./chainlock/store.js";
import { seal, verify as verifyLockset, LS_VERSION } from "./lockset.js";
import { arch, pipe, thinPipe, AZPIPE_VERSION } from "./azpipe.js";
import {
  CHAIN_ROSTER,
  FRAGGATE_OUTPUT_SCHEMA,
  HINT_ADDITIVE,
  HINT_READ,
  mcpAnnotations,
  tdqsDescription,
} from "./mcp-schema.js";

export {
  append,
  recall,
  adaptiveRecall,
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
      description: tdqsDescription({
        action:
          "Append a fact-bearing stamp to a local ChainLock chain (CL-WP-0.4). Runtime fabric — not a Softwares-tab product. UI=MCP. No Node Gate",
        when: "you have a concrete fact to stamp onto a named chain",
        notFor: "reading the tip, adaptive memory observation, or sealing LOCKSET",
        instead: "chainlock_tip, memory_observe, or chainlock_seal",
        effects:
          "Write: additive append. Not read-only and not idempotent. Hash-only cards refuse. Does not write godlock.uk",
        returns: "the new stamp (id, h, fh, chain) plus display envelope",
      }),
      annotations: mcpAnnotations("ChainLock append", HINT_ADDITIVE),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "fact is required (≤160). Hash-only cards without a fact refuse.",
        properties: {
          c: {
            type: "string",
            enum: [...CHAIN_ROSTER],
            description:
              "Optional chain name. One of genesis, identity, ssh, session, acts, evidence, recall, mesh, library, learn. Alias: chain.",
          },
          subject: {
            type: "string",
            description: "Optional subject clipped to 80 characters.",
            maxLength: 80,
          },
          fact: {
            type: "string",
            description: "Required fact text clipped to 160 characters. Hash-only / empty fact refuses.",
            maxLength: 160,
          },
          k: {
            type: "string",
            description: "Optional kind label for the stamp.",
          },
        },
        required: ["fact"],
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "chainlock_tip",
      title: "ChainLock tip",
      description: tdqsDescription({
        action: "Read the live tip card of one local ChainLock chain. Fabric module — not a Softwares-tab product",
        when: "you need the current tip of a named chain",
        notFor: "depth-0–5 grounded recall, LOCKSET verify, or adaptive memory explain",
        instead: "chainlock_recall, chainlock_verify, or memory_get",
        effects: "Read-only, non-destructive, idempotent. Does not invent a missing tip",
        returns: "the tip card or an empty/refuse when the chain has no stamp",
      }),
      annotations: mcpAnnotations("ChainLock tip", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        description: "c selects the chain. Omit for the default tip path.",
        properties: {
          c: {
            type: "string",
            enum: [...CHAIN_ROSTER],
            description: "Optional chain name from the ChainLock roster.",
          },
        },
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "chainlock_recall",
      title: "ChainLock recall",
      description: tdqsDescription({
        action: "Grounded ChainLock recall at depth 0–5 (CL-WP-0.4). Returns id+h+fh facts or refuse=no-stamp. Do not invent a fact",
        when: "you need stamped facts from the local vault, not a Bayesian ranking",
        notFor: "adaptive memory ranking or reading only the live tip",
        instead: "memory_recall or chainlock_tip",
        effects: "Read-only, non-destructive, idempotent. Depth above 5 is clipped to 5. refuse=no-stamp when empty — do not invent",
        returns: "grounded facts (id, h, fh) or refuse=no-stamp",
      }),
      annotations: mcpAnnotations("ChainLock recall", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "All fields optional. depth is 0 (tip) through 5 (genesis/budget).",
        properties: {
          depth: {
            type: "number",
            minimum: 0,
            maximum: 5,
            description: "Optional recall depth. 0 = tip only; 5 = genesis/budget maximum. Values outside 0–5 are clipped.",
          },
          q: {
            type: "string",
            description: "Optional query string to filter recalled cards. Does not invent matches.",
          },
          c: {
            type: "string",
            enum: [...CHAIN_ROSTER],
            description: "Optional chain name to recall from. Omit to use the default recall path.",
          },
        },
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "chainlock_verify",
      title: "ChainLock / LOCKSET verify",
      description: tdqsDescription({
        action:
          "Fail-closed verify of ChainLock chains and LOCKSET (LS-WP-0.1): broken prev, tip drift, missing GodLock cite",
        when: "you must prove local chain integrity before trusting a recall",
        notFor: "appending a stamp or sealing a new lockset",
        instead: "chainlock_append or chainlock_seal",
        effects:
          "Read-only, non-destructive, idempotent. Cites godlock.uk; does not write the public ledger. Fail-closed — do not repair silently",
        returns: "chain_ok, LOCKSET lattice, and per-chain verify notes",
      }),
      annotations: mcpAnnotations("ChainLock / LOCKSET verify", HINT_READ),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "Optional chain selector. Extra keys are ignored by verify.",
        properties: {
          c: {
            type: "string",
            enum: [...CHAIN_ROSTER],
            description: "Optional chain name to focus verify. Omit to verify the live vault / LOCKSET.",
          },
        },
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
    {
      name: "chainlock_seal",
      title: "LOCKSET seal",
      description: tdqsDescription({
        action:
          "Seal live chain tips + TemporalLock receipt + GodLock cite into a LOCKSET (LS-WP-0.1). Operator posts lockset_sha256",
        when: "the operator wants a new local lockset over current tips",
        notFor: "verify-only, appending one fact, or writing godlock.uk",
        instead: "chainlock_verify or chainlock_append",
        effects:
          "Write: stores the lockset locally. Not read-only. Runtime cites godlock.uk and does not write the public ledger. Empty vault refuses empty-vault",
        returns: "lockset document and lockset_sha256",
      }),
      annotations: mcpAnnotations("LOCKSET seal", HINT_ADDITIVE),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "No required arguments. Optional ts may be passed through as TemporalLock timestamp metadata.",
        properties: {
          ts: {
            type: "string",
            description: "Optional ISO-8601 timestamp for the TemporalLock block. Omit to use now. Does not backdate authority.",
          },
        },
      },
      outputSchema: FRAGGATE_OUTPUT_SCHEMA,
    },
  ];
}

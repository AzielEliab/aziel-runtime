/**
 * Short start path for agents and humans.
 * One door. confirm writes. dry_run previews. background stays Running until a receipt.
 * tools/list stays 36. Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

/** Human / docs sentence. */
export const START_HERE_LINE =
  "Start here: one door. confirm=true writes. dry_run=true previews and writes nothing. background=true on fraggate_call returns Running until a receipt hash exists. Done only with that hash. tools/list stays 36.";

/**
 * Prepended to MCP initialize instructions.
 * Must not contain the bare tokens this, Aziel, counters, leftover, or retired.
 */
export const START_HERE_MCP =
  "Start here. One door. Call fraggate_list, then fraggate_describe, then fraggate_call. confirm=true runs a write. dry_run=true previews and writes nothing. background=true returns Running until a receipt hash exists. Done only with that hash. tools/list stays 36. ";

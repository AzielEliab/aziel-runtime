/**
 * Short start path for agents and humans.
 * Tools just work. The door runs first. confirm writes. dry_run previews.
 * background stays Running until a receipt. tools/list stays 36.
 * Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

/** Human / docs sentence. */
export const START_HERE_LINE =
  "Start here: tools just work. The door runs first, then the tool. confirm=true writes. dry_run=true previews and writes nothing. background=true returns Running until a receipt hash exists. Done only with that hash. tools/list stays 36.";

/**
 * Prepended to MCP initialize instructions.
 * Must not contain the bare tokens this, Aziel, counters, leftover, or retired.
 */
export const START_HERE_MCP =
  "Start here. Tools just work. The door runs before the tool. confirm=true writes. dry_run=true previews and writes nothing. background=true returns Running until a receipt hash exists. Done only with that hash. tools/list stays 36. fraggate_list, fraggate_describe, and fraggate_call stay for diagnostics. ";

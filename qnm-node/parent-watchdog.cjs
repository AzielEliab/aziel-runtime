/**
 * MESH-ONBOARD-1.0 parent watchdog for the local node (follow-up to #357, AZBot LOW capped-run.mjs:29).
 * Preloaded by qnm-node/capped-run.mjs (node --require) into the node it starts. The wrapper's pid
 * is in CAPPED_RUN_PARENT_PID. If the wrapper goes away for any reason (SIGKILL, OOM kill), the node
 * is re-parented and process.ppid changes; the node then stops itself (SIGTERM, then exit after
 * 3 s), so it never keeps running untracked by node.pid. Uses no pid probing, so pid reuse cannot
 * fool it. Without CAPPED_RUN_PARENT_PID it does nothing.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
"use strict";
const want = Number(process.env.CAPPED_RUN_PARENT_PID || 0);
delete process.env.CAPPED_RUN_PARENT_PID;
if (Number.isInteger(want) && want > 1) {
  const check = () => {
    if (process.ppid === want) return;
    clearInterval(timer);
    setTimeout(() => process.exit(1), 3000).unref();
    try {
      process.kill(process.pid, "SIGTERM");
    } catch {
      process.exit(1);
    }
  };
  const timer = setInterval(check, 500);
  timer.unref();
  check();
}

/**
 * MESH-ONBOARD-1.0 capped stderr/stdout for the local node (AZBot LOW on #352: node.err uncapped).
 *   node qnm-node/capped-run.mjs --err-file <dir>/node.err --err-max-bytes 1048576 -- <script.mjs> [args...]
 * Runs <script.mjs> with this same Node, and sends the child's stdout and stderr to <err-file>
 * through cappedWriter: 0600, rotates to <err-file>.1 at the cap (default 1 MiB), never past it.
 * SIGTERM / SIGINT are forwarded to the child; this process exits when the child exits, with its
 * code, so the install script's pid file and kill -0 check keep working. The child runs in its own
 * session (no controlling terminal), so closing the terminal does not hang it up, as with nohup.
 * Fail closed: no --err-file or no script -> exit 2 without starting anything.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { spawn } from "node:child_process";
import { cappedWriter, LOG_DEFAULT_BYTES } from "../src/fed-mesh/capped-log.js";

const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
const own = sep === -1 ? argv : argv.slice(0, sep);
const rest = sep === -1 ? [] : argv.slice(sep + 1);
const opt = (name, fallback) => {
  const i = own.indexOf(name);
  return i === -1 || !own[i + 1] ? fallback : own[i + 1];
};
const errFile = opt("--err-file", "");
if (!errFile || rest.length === 0) {
  process.stderr.write("CAPPED-RUN-BAD-ARGS: --err-file <file> -- <script.mjs> [args...]\n");
  process.exit(2);
}
const write = cappedWriter(errFile, Number(opt("--err-max-bytes", String(LOG_DEFAULT_BYTES))));
const child = spawn(process.execPath, rest, { stdio: ["ignore", "pipe", "pipe"], detached: true });
child.stdout.on("data", write);
child.stderr.on("data", write);
child.on("error", (err) => {
  write(`capped-run: ${String(err && err.message ? err.message : err)}\n`);
  process.exit(1);
});
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    try {
      child.kill(sig);
    } catch {
      /* gone */
    }
  });
}
child.on("close", (code, signal) => process.exit(code === null ? (signal ? 1 : 0) : code));

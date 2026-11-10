/**
 * Official test entry. The fence is an absolute import, so a child that
 * changes directory still loads it. Unexpected outside hosts fail the run.
 * Author: Aziel Eliab.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(resolve(tmpdir(), "aziel-hermetic-"));
const blockLog = resolve(dir, "block.log");
const expectLog = resolve(dir, "expect.log");
writeFileSync(blockLog, "");
writeFileSync(expectLog, "");
const fence = pathToFileURL(resolve(root, "scripts/isolate-net.mjs")).href;

function hosts(file) {
  const text = readFileSync(file, "utf8");
  return text.split("\n").map((line) => line.trim().replace(/^dns:/, "").toLowerCase()).filter(Boolean);
}

const child = spawn("npm", ["run", "test:suite"], {
  cwd: root,
  env: {
    ...process.env,
    AZIEL_HERMETIC: "1",
    AZIEL_NET_BLOCK_LOG: blockLog,
    AZIEL_NET_EXPECT_LOG: expectLog,
    NODE_OPTIONS: `--import ${fence}`,
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  const blocked = hosts(blockLog);
  const expected = new Set(hosts(expectLog));
  const unexpected = [...new Set(blocked.filter((host) => !expected.has(host)))];
  if (unexpected.length) {
    console.error(`hermetic fence: ${unexpected.length} unexpected outside host(s): ${unexpected.join(", ")}`);
    process.exit(1);
  }
  if (signal) process.exit(1);
  process.exit(code == null ? 1 : code);
});

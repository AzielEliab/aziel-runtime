/**
 * Node install host for AUTO-UPDATE-1.0. Imported by the local node process only.
 * State file is written only when this host is constructed (AUTO_UPDATE=on).
 * Fetches the stable release envelope, then the updater verifies the pinned key, signature, and hash.
 * There is no binary swap in this process: healthCheck fails closed and the updater rolls back.
 * The floor does not rise. live:false. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchStableRelease } from "./release-fetch.js";
import { initialState } from "./updater.js";

export async function createNodeUpdateHost({ dataDir, product = "aziel-runtime", nodeId = "node" } = {}) {
  const dir = dataDir || ".";
  const statePath = join(dir, "auto-update-state.json");
  const receiptPath = join(dir, "auto-update-receipts.jsonl");
  await mkdir(dir, { recursive: true });
  const host = {
    enabled: true,
    nodeId,
    offline: false,
    product,
    _artifactUrl: null,
    now: () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    async load() {
      try {
        return JSON.parse(await readFile(statePath, "utf8"));
      } catch {
        return initialState(product, 0);
      }
    },
    async save(state) {
      const tmp = statePath + ".tmp";
      await writeFile(tmp, JSON.stringify(state));
      await rename(tmp, statePath);
    },
    async writeReceipt(row) {
      await writeFile(receiptPath, JSON.stringify(row) + "\n", { flag: "a" });
    },
    async fetchRelease() {
      const offer = await fetchStableRelease();
      host._artifactUrl = offer && offer.artifactUrl;
      return offer ? { manifest: offer.manifest, signature: offer.signature } : null;
    },
    async fetchArtifact() {
      if (!host._artifactUrl || typeof fetch !== "function") return null;
      const res = await fetch(host._artifactUrl, { headers: { "user-agent": "aziel-runtime" } });
      if (!res || res.ok !== true) return null;
      return new Uint8Array(await res.arrayBuffer());
    },
    async stage() {},
    async swap() {},
    async healthCheck() { return false; },
    async rollback() {},
  };
  return host;
}

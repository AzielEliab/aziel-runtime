/**
 * Node install host for AUTO-UPDATE-1.0. Imported by the local node process only.
 * State file is written only when this host is constructed (AUTO_UPDATE=on).
 * Fetches the stable release envelope, then the updater verifies the pinned key, signature, and hash.
 * loadAll/saveAll are the shared Softwares store (per-slug items, one tip chain).
 * fetchRelease(slug) / fetchArtifact(slug, manifest) only know the aziel-runtime release repo.
 * Peer hello and artifact pull use the open Track 2 session. Radio carriers stay absent.
 * There is no binary swap in this process: healthCheck fails closed and the updater rolls back.
 * The floor does not rise. Bytes are seeded only after health passes, which this process does not do.
 * live:false. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchStableRelease } from "./release-fetch.js";
import { initialState } from "./updater.js";
import {
  UPDATE_PEER_NO_ROUTE,
  answerUpdateMessage,
  bytesFromArtifactReply,
  carrierPresentOnTrack2,
  peerForSession,
  sessionForCarrier,
} from "./peer-path.js";

const STORE_SPEC = "AZ-AUTO-UPDATE-NODE-1.0";

function emptyStore() {
  return { spec: STORE_SPEC, items: {}, tips: null, paused: false };
}

export async function createNodeUpdateHost({ dataDir, product = "aziel-runtime", nodeId = "node", track2 = null } = {}) {
  const dir = dataDir || ".";
  const statePath = join(dir, "auto-update-state.json");
  const receiptPath = join(dir, "auto-update-receipts.jsonl");
  await mkdir(dir, { recursive: true });
  const urls = Object.create(null);
  const host = {
    enabled: true,
    nodeId,
    offline: false,
    product,
    track2,
    _stagedBytes: null,
    _servedBytes: null,
    now: () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    async readStore() {
      try {
        const parsed = JSON.parse(await readFile(statePath, "utf8"));
        if (parsed && parsed.items && typeof parsed.items === "object" && !Array.isArray(parsed.items)) {
          return { spec: STORE_SPEC, items: parsed.items, tips: parsed.tips || null, paused: parsed.paused === true };
        }
        if (parsed && typeof parsed.product === "string") {
          const { tips, ...item } = parsed;
          return { spec: STORE_SPEC, items: { [parsed.product]: item }, tips: tips || null, paused: parsed.paused === true };
        }
      } catch { /* first boot */ }
      return emptyStore();
    },
    async writeStore(store) {
      const body = store && store.items ? store : emptyStore();
      const tmp = statePath + ".tmp";
      await writeFile(tmp, JSON.stringify({ spec: STORE_SPEC, items: body.items, tips: body.tips || null, paused: body.paused === true }));
      await rename(tmp, statePath);
    },
    async load() {
      const store = await host.readStore();
      const item = store.items[host.product] ? structuredClone(store.items[host.product]) : initialState(host.product, 0);
      item.tips = store.tips || item.tips || null;
      if (store.paused === true) item.paused = true;
      return item;
    },
    async save(state) {
      const store = await host.readStore();
      store.tips = state && state.tips ? state.tips : store.tips;
      const { tips, _own_paused, ...rest } = state || {};
      if (store.paused === true && rest.paused === true && _own_paused !== true) rest.paused = false;
      store.items[host.product] = rest;
      const sha = rest.served_manifest && rest.served_manifest.manifest && rest.served_manifest.manifest.artifact && rest.served_manifest.manifest.artifact.sha256;
      if (rest.last_code === "UPDATE-OK" && sha && sha === host._stagedSha && host._stagedBytes instanceof Uint8Array) {
        host._servedBytes = host._stagedBytes;
      }
      await host.writeStore(store);
    },
    async loadAll() {
      return host.readStore();
    },
    async saveAll(all) {
      await host.writeStore(all || emptyStore());
    },
    async writeReceipt(row) {
      await writeFile(receiptPath, JSON.stringify(row) + "\n", { flag: "a" });
    },
    async fetchRelease(slug) {
      const name = typeof slug === "string" && slug ? slug : host.product;
      if (name !== "aziel-runtime") return null;
      const fetchImpl = typeof host.fetchImpl === "function" ? host.fetchImpl : undefined;
      const offer = await fetchStableRelease(fetchImpl ? { fetchImpl } : {});
      if (offer && offer.artifactUrl) urls[name] = offer.artifactUrl;
      else delete urls[name];
      return offer ? { manifest: offer.manifest, signature: offer.signature } : null;
    },
    async fetchArtifact(slugOrManifest, maybeManifest) {
      const manifest = maybeManifest && typeof maybeManifest === "object"
        ? maybeManifest
        : (slugOrManifest && typeof slugOrManifest === "object" ? slugOrManifest : null);
      const name = typeof slugOrManifest === "string" ? slugOrManifest : (manifest && manifest.product) || host.product;
      const url = urls[name];
      const fetchFn = typeof host.fetchImpl === "function" ? host.fetchImpl : globalThis.fetch;
      if (!url || typeof fetchFn !== "function") return null;
      const res = await fetchFn(url, { headers: { "user-agent": "aziel-runtime" } });
      if (!res || res.ok !== true || typeof res.arrayBuffer !== "function") return null;
      return new Uint8Array(await res.arrayBuffer());
    },
    async carrierPresent(id) {
      return carrierPresentOnTrack2(host.track2, id);
    },
    async peerHello(carrier) {
      const reply = await host._roundTrip(carrier, JSON.stringify({ v: 1, op: "update-hello", product: host.product }));
      if (!reply.ok) return { refused: true, code: reply.code || UPDATE_PEER_NO_ROUTE };
      return reply.body;
    },
    async peerFetch(carrier, manifest) {
      const sha = manifest && manifest.artifact && manifest.artifact.sha256;
      const reply = await host._roundTrip(carrier, JSON.stringify({ v: 1, op: "update-fetch", sha256: sha || null }));
      if (!reply.ok) return { refused: true, code: reply.code || UPDATE_PEER_NO_ROUTE };
      return bytesFromArtifactReply(reply.body);
    },
    async answerUpdate(text) {
      const state = await host.load();
      return answerUpdateMessage(state, host._servedBytes, text);
    },
    async _roundTrip(carrier, text) {
      const track2 = host.track2;
      const session = sessionForCarrier(track2, carrier);
      if (!track2 || !session) return { ok: false, code: UPDATE_PEER_NO_ROUTE };
      const sent = await track2.send(session.session_id, text);
      if (!sent || sent.ok !== true || !sent.envelope) return { ok: false, code: UPDATE_PEER_NO_ROUTE };
      const delivered = await host._deliver(session, sent.envelope);
      if (!delivered || delivered.ok !== true || !delivered.update_reply) return { ok: false, code: (delivered && delivered.code) || UPDATE_PEER_NO_ROUTE };
      const opened = await track2.recv(delivered.update_reply);
      if (!opened || opened.ok !== true || typeof opened.plaintext !== "string") return { ok: false, code: UPDATE_PEER_NO_ROUTE };
      try { return { ok: true, body: JSON.parse(opened.plaintext) }; }
      catch { return { ok: false, code: UPDATE_PEER_NO_ROUTE }; }
    },
    async _deliver(session, envelope) {
      if (typeof host.deliver === "function") return host.deliver(envelope);
      const peer = peerForSession(host.track2, session);
      const direct = peer && typeof peer.direct_url === "string" ? peer.direct_url : "";
      const fetchFn = globalThis.fetch;
      if (!direct || typeof fetchFn !== "function") return { ok: false, code: UPDATE_PEER_NO_ROUTE };
      let origin;
      try { origin = new URL(direct).origin; } catch { return { ok: false, code: UPDATE_PEER_NO_ROUTE }; }
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 5000);
      try {
        const res = await fetchFn(origin + "/v1/fed-mesh/peer", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", "user-agent": "aziel-runtime" },
          body: JSON.stringify(envelope),
          signal: ac.signal,
        });
        if (!res || res.ok !== true || typeof res.json !== "function") return { ok: false, code: UPDATE_PEER_NO_ROUTE };
        const body = await res.json().catch(() => null);
        if (!body || body.ok !== true || !body.update_reply) return { ok: false, code: UPDATE_PEER_NO_ROUTE };
        return { ok: true, update_reply: body.update_reply };
      } catch {
        return { ok: false, code: UPDATE_PEER_NO_ROUTE };
      } finally {
        clearTimeout(timer);
      }
    },
    async stage(a, b, c) {
      const bytes = a instanceof Uint8Array ? a : b;
      const manifest = a instanceof Uint8Array ? b : c;
      if (bytes instanceof Uint8Array) {
        host._stagedBytes = bytes;
        host._stagedSha = manifest && manifest.artifact ? manifest.artifact.sha256 : null;
      }
    },
    async swap() {},
    async healthCheck() { return false; },
    async rollback() {},
  };
  return host;
}

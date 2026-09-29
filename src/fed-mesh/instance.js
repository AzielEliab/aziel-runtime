/**
 * One local node: own key, own data directory, own port.
 * Talks to relays with the same envelopes as every other node.
 * L0: one relay URL, register + send + pull. That path stays the default.
 * L1: registerAll, selectRelay, sendDirect, and sendReachable run only when
 * the caller configures extra relays or a direct URL. They do not replace L0.
 * Author: Aziel Eliab only.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import { dirname, join } from "node:path";
import { classifyPeerUrl, natPunchRequest } from "./bearers.js";
import { actHash, openAct, sealAct, signAct } from "./client.js";
import { createIdentity } from "./identity.js";
import { FED_SPEC, ZERO_HASH } from "./spec.js";

async function loadJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function relayKey(url) {
  return String(url || "").replace(/\/$/, "");
}

function chainFor(node, relayUrl) {
  const key = relayKey(relayUrl);
  if (!node.chains[key]) {
    if (node.legacyUnbound && node.chain.seq > 0 && Object.keys(node.chains).length === 0) {
      node.chains[key] = { seq: node.chain.seq, prev: node.chain.prev };
      node.legacyUnbound = false;
    } else {
      node.chains[key] = { seq: 0, prev: ZERO_HASH };
    }
  }
  return node.chains[key];
}

function readChainFile(chainFile) {
  const chains = {};
  let directChain = { seq: 0, prev: ZERO_HASH };
  let chain = { seq: 0, prev: ZERO_HASH };
  let legacyUnbound = false;
  if (chainFile && typeof chainFile === "object") {
    if (chainFile.by_relay && typeof chainFile.by_relay === "object") {
      for (const [key, row] of Object.entries(chainFile.by_relay)) {
        if (row && Number.isInteger(row.seq) && typeof row.prev === "string") {
          chains[key] = { seq: row.seq, prev: row.prev };
        }
      }
    }
    if (chainFile.direct && Number.isInteger(chainFile.direct.seq)) {
      directChain = { seq: chainFile.direct.seq, prev: chainFile.direct.prev || ZERO_HASH };
    }
    if (Number.isInteger(chainFile.seq)) {
      chain = { seq: chainFile.seq, prev: chainFile.prev || ZERO_HASH };
      if (!chainFile.by_relay && chain.seq > 0) legacyUnbound = true;
    }
  }
  return { chains, directChain, chain, legacyUnbound };
}

export async function openInstance({ dataDir, relays = [] }) {
  await mkdir(dataDir, { recursive: true });
  const idPath = join(dataDir, "identity.json");
  let stored = await loadJson(idPath, null);
  let identity;
  if (stored && stored.seed_b64 && stored.enc_seed_b64) {
    identity = await createIdentity({
      seed: Buffer.from(stored.seed_b64, "base64url"),
      encSeed: Buffer.from(stored.enc_seed_b64, "base64url"),
    });
  } else {
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const encSeed = crypto.getRandomValues(new Uint8Array(32));
    identity = await createIdentity({ seed, encSeed });
    stored = {
      spec: FED_SPEC,
      handle: identity.handle,
      public_key: identity.public_key,
      enc_public_key: identity.enc_public_key,
      seed_b64: Buffer.from(seed).toString("base64url"),
      enc_seed_b64: Buffer.from(encSeed).toString("base64url"),
    };
    await writeFile(idPath, JSON.stringify(stored, null, 2));
  }
  const chainPath = join(dataDir, "chain.json");
  const loaded = readChainFile(await loadJson(chainPath, { seq: 0, prev: ZERO_HASH }));
  const directPath = join(dataDir, "direct-inbox.json");
  const node = {
    dataDir,
    identity,
    relays: relays.slice(),
    chain: loaded.chain,
    chains: loaded.chains,
    directChain: loaded.directChain,
    legacyUnbound: loaded.legacyUnbound,
    async persist() {
      await writeFile(
        chainPath,
        JSON.stringify({
          seq: node.chain.seq,
          prev: node.chain.prev,
          by_relay: node.chains,
          direct: node.directChain,
        }),
      );
    },
    async post(url, body) {
      let res;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(2000),
        });
      } catch (err) {
        return {
          ok: false,
          code: "FED-MESH-RELAY-DOWN",
          message: "Peer bearer did not answer. NAT hole-punch is not a fallback.",
          thrown: true,
          hole_punch: false,
          get_never_enables: true,
          detail: String(err && err.message ? err.message : err),
        };
      }
      const json = await res.json().catch(() => ({}));
      return { status: res.status, thrown: false, ...json };
    },
    async health(relayUrl) {
      const punch = natPunchRequest("health", { relay: relayUrl });
      if (punch) return punch;
      const classified = classifyPeerUrl(relayUrl, { role: "relay" });
      if (!classified.ok) return classified;
      try {
        const res = await fetch(classified.url, {
          method: "GET",
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(2000),
        });
        const json = await res.json().catch(() => ({}));
        const up = res.ok && json && json.ok === true && json.health === "up";
        return {
          ok: up,
          code: up ? "FED-MESH-OK" : "FED-MESH-RELAY-DOWN",
          message: up ? "Relay health check is up. GET never enables." : "Relay health check did not report health up.",
          status: res.status,
          health: json && json.health ? json.health : "down",
          mode: classified.mode,
          hole_punch: false,
          get_never_enables: true,
          public_icann: false,
          radio_phy: false,
          url: classified.url,
        };
      } catch (err) {
        return {
          ok: false,
          code: "FED-MESH-RELAY-DOWN",
          message: "Relay health check failed. GET never enables. NAT hole-punch is not a fallback.",
          health: "down",
          mode: classified.mode,
          hole_punch: false,
          get_never_enables: true,
          public_icann: false,
          radio_phy: false,
          url: classified.url,
          detail: String(err && err.message ? err.message : err),
        };
      }
    },
    async selectRelay(list = node.relays) {
      const relays = Array.isArray(list) ? list : [];
      const tried = [];
      if (!relays.length) {
        return {
          ok: false,
          code: "FED-MESH-NO-RELAY",
          message: "No relay is configured. NAT hole-punch is not a substitute.",
          tried,
          hole_punch: false,
          get_never_enables: true,
          public_icann: false,
          radio_phy: false,
        };
      }
      for (const url of relays) {
        const health = await node.health(url);
        tried.push({ url: String(url), ok: health.ok === true, code: health.code, mode: health.mode || null });
        if (health.ok) {
          return {
            ok: true,
            code: "FED-MESH-OK",
            url: health.url,
            mode: health.mode,
            health,
            tried,
            hole_punch: false,
            get_never_enables: true,
          };
        }
      }
      return {
        ok: false,
        code: "FED-MESH-NO-RELAY",
        message: "No configured relay answered GET /v1/mesh/relay. GET never enables. A missing public address is not a hole punch.",
        tried,
        hole_punch: false,
        get_never_enables: true,
        public_icann: false,
        radio_phy: false,
      };
    },
    async register(relayUrl, extra = {}) {
      const punch = natPunchRequest("register", { ...extra, relay: relayUrl });
      if (punch) return punch;
      const classified = classifyPeerUrl(relayUrl, { role: "relay" });
      if (!classified.ok) return classified;
      const bucket = chainFor(node, classified.url);
      const seq = bucket.seq + 1;
      const prev = bucket.prev;
      const body = await signAct(node.identity, "register", {
        enc_public_key: node.identity.enc_public_key,
        product: extra.product || "mesh",
        presence: extra.presence || "live",
        relays: extra.relays || node.relays,
        seq,
        prev,
      });
      const out = await node.post(`${classified.url}/register`, body);
      if (out.ok) {
        bucket.seq = seq;
        bucket.prev = out.statement_hash;
        node.chain = { seq, prev: out.statement_hash };
        await node.persist();
      }
      return { ...out, bearer: classified.mode, hole_punch: false, get_never_enables: true, url: classified.url };
    },
    async registerAll(extra = {}) {
      const relays = (extra.relays || node.relays).slice();
      const results = [];
      for (const url of relays) {
        const health = await node.health(url);
        if (!health.ok) {
          results.push({
            url: String(url),
            ok: false,
            code: health.code || "FED-MESH-RELAY-DOWN",
            message: health.message || "Relay health check failed.",
            health: health.health || "down",
            hole_punch: false,
            get_never_enables: true,
          });
          continue;
        }
        const out = await node.register(url, extra);
        results.push({ url: health.url || String(url), bearer: health.mode, ...out });
      }
      const registered = results.filter((row) => row.ok === true).length;
      return {
        ok: registered > 0,
        code: registered > 0 ? "FED-MESH-OK" : (results[0] && results[0].code) || "FED-MESH-NO-RELAY",
        results,
        registered,
        hole_punch: false,
        get_never_enables: true,
        public_icann: false,
        radio_phy: false,
      };
    },
    async send(relayUrl, { to, enc_public_key, plaintext }) {
      const punch = natPunchRequest("send", { relay: relayUrl });
      if (punch) return punch;
      const classified = classifyPeerUrl(relayUrl, { role: "relay" });
      if (!classified.ok) return classified;
      const bucket = chainFor(node, classified.url);
      const seq = bucket.seq + 1;
      const prev = bucket.prev;
      const body = await sealAct(node.identity, {
        to,
        recipientEncPublicKey: enc_public_key,
        seq,
        prev,
        plaintext,
      });
      if (!body) {
        return { ok: false, code: "FED-MESH-BAD-INPUT", message: "Envelope did not seal.", hole_punch: false };
      }
      const out = await node.post(`${classified.url}/post`, body);
      if (out.ok) {
        bucket.seq = seq;
        bucket.prev = out.statement_hash;
        node.chain = { seq, prev: out.statement_hash };
        await node.persist();
      }
      return { ...out, envelope: body, bearer: classified.mode, hole_punch: false, get_never_enables: true, url: classified.url };
    },
    async sendDirect(directUrl, { to, enc_public_key, plaintext } = {}) {
      const punch = natPunchRequest("direct", { direct: directUrl });
      if (punch) return punch;
      const classified = classifyPeerUrl(directUrl, { role: "direct" });
      if (!classified.ok) return classified;
      const seq = node.directChain.seq + 1;
      const prev = node.directChain.prev;
      const body = await sealAct(node.identity, {
        to,
        recipientEncPublicKey: enc_public_key,
        seq,
        prev,
        plaintext,
      });
      if (!body) {
        return { ok: false, code: "FED-MESH-BAD-INPUT", message: "Direct envelope did not seal.", hole_punch: false };
      }
      const out = await node.post(classified.url, body);
      if (out.ok) {
        node.directChain = { seq, prev: out.statement_hash || (await actHash(body)) };
        await node.persist();
      }
      return {
        ...out,
        envelope: body,
        bearer: classified.mode,
        lan: classified.lan === true,
        direct: true,
        fallback: false,
        hole_punch: false,
        get_never_enables: true,
        url: classified.url,
      };
    },
    async sendReachable({ to, enc_public_key, plaintext, directUrl, direct, relays } = {}) {
      const args = { to, enc_public_key, plaintext, directUrl: directUrl || direct, relays };
      const punch = natPunchRequest("send", args);
      if (punch) return punch;
      if (args.directUrl) {
        const classified = classifyPeerUrl(args.directUrl, { role: "direct" });
        if (!classified.ok) return classified;
        const sentDirect = await node.sendDirect(args.directUrl, args);
        if (sentDirect.ok) return { ...sentDirect, fallback: false };
        if (sentDirect.thrown !== true && sentDirect.code !== "FED-MESH-RELAY-DOWN") return sentDirect;
        const picked = await node.selectRelay(args.relays || node.relays);
        if (!picked.ok) return { ...picked, direct_error: sentDirect.code, fallback: false };
        const sent = await node.send(picked.url, args);
        return {
          ...sent,
          bearer: picked.mode,
          fallback: true,
          hole_punch: false,
          get_never_enables: true,
          direct_error: sentDirect.code,
        };
      }
      const picked = await node.selectRelay(args.relays || node.relays);
      if (!picked.ok) return picked;
      const sent = await node.send(picked.url, args);
      return { ...sent, bearer: picked.mode, fallback: false, hole_punch: false, get_never_enables: true };
    },
    async pull(relayUrl) {
      const classified = classifyPeerUrl(relayUrl, { role: "relay" });
      if (!classified.ok) return classified;
      const body = await signAct(node.identity, "pull", { ts: new Date().toISOString() });
      return node.post(`${classified.url}/pull`, body);
    },
    async deliver(relayUrl, ack) {
      const classified = classifyPeerUrl(relayUrl, { role: "relay" });
      if (!classified.ok) return classified;
      const bucket = chainFor(node, classified.url);
      const seq = bucket.seq + 1;
      const prev = bucket.prev;
      const body = await signAct(node.identity, "deliver", { seq, prev, ack });
      const out = await node.post(`${classified.url}/deliver`, body);
      if (out.ok) {
        bucket.seq = seq;
        bucket.prev = out.statement_hash;
        node.chain = { seq, prev: out.statement_hash };
        await node.persist();
      }
      return out;
    },
    async open(envelope) {
      return openAct(node.identity, envelope);
    },
  };

  async function onDirect(envelope) {
    if (!envelope || envelope.to !== identity.handle) {
      return { ok: false, code: "FED-MESH-BAD-HANDLE", message: "Direct delivery is for this handle." };
    }
    const text = await openAct(identity, envelope);
    if (text == null) return { ok: false, code: "FED-MESH-TAMPER", message: "Direct envelope did not open." };
    const inbox = await loadJson(directPath, []);
    inbox.push({ from: envelope.handle, text });
    await writeFile(directPath, JSON.stringify(inbox));
    return { ok: true, code: "FED-MESH-OK", direct: true };
  }

  node.directInbox = () => loadJson(directPath, []);
  node.onDirect = onDirect;
  return node;
}

export async function startInstance({ dataDir, port = 0, host = "127.0.0.1", relays = [] }) {
  const node = await openInstance({ dataDir, relays });
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    let body = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = {};
      }
    }
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let out = { ok: false, code: "FED-MESH-BAD-INPUT", message: "Unknown local path." };
    if (req.method === "GET" && url.pathname === "/health") {
      out = { ok: true, handle: node.identity.handle, spec: FED_SPEC, direct: true };
    } else if (req.method === "POST" && url.pathname === "/v1/fed-mesh/direct") {
      out = await node.onDirect(body);
    }
    res.writeHead(out.ok === false ? 400 : 200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  });
  await new Promise((resolve) => server.listen(port, host, resolve));
  const addr = server.address();
  const base = `http://${host}:${addr.port}`;
  return {
    ...node,
    handle: node.identity.handle,
    public_key: node.identity.public_key,
    enc_public_key: node.identity.enc_public_key,
    base,
    directUrl: `${base}/v1/fed-mesh/direct`,
    stop() {
      return new Promise((done) => server.close(() => done()));
    },
  };
}

export function instancePaths(dataDir) {
  return {
    identity: join(dataDir, "identity.json"),
    chain: join(dataDir, "chain.json"),
    parent: dirname(dataDir),
  };
}

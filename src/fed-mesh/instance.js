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
import { createKeystore, exportPublicIdentity, identityFromUnlocked, unlockKeystore } from "../security/keystore.js";
import { classifyPeerUrl, natPunchRequest, survivalMethods } from "./bearers.js";
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

async function readText(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

function refuseIdentity(result) {
  const err = new Error(result && result.message ? result.message : "Identity refused. Fail closed.");
  err.code = result && result.code ? result.code : "AZKS-REFUSE";
  return err;
}

/**
 * Default (no passphrase) keeps the FED-MESH L0 identity.json seed file so
 * existing nodes and tests keep their handles. That file is not AZKS-1.
 * A passphrase writes keystore.json and a public identity.json with no seeds.
 */
async function loadNodeIdentity(dataDir, passphrase, iterations) {
  const idPath = join(dataDir, "identity.json");
  const ksPath = join(dataDir, "keystore.json");
  const stored = await loadJson(idPath, null);
  const ksText = await readText(ksPath);
  const secret = String(passphrase || "");
  if (secret) {
    if (ksText) {
      let document;
      try {
        document = JSON.parse(ksText);
      } catch {
        throw refuseIdentity({ code: "AZKS-CORRUPT", message: "Keystore file is not JSON. Fail closed." });
      }
      const opened = await unlockKeystore(document, secret);
      if (!opened.ok) throw refuseIdentity(opened);
      const identity = await identityFromUnlocked(opened);
      if (!identity.ok) throw refuseIdentity(identity);
      return identity;
    }
    let signingSeed = null;
    let encryptionSeed = null;
    if (stored && stored.seed_b64 && stored.enc_seed_b64) {
      signingSeed = new Uint8Array(Buffer.from(stored.seed_b64, "base64url"));
      encryptionSeed = new Uint8Array(Buffer.from(stored.enc_seed_b64, "base64url"));
    }
    const created = await createKeystore({
      passphrase: secret,
      signingSeed,
      encryptionSeed,
      ...(Number.isInteger(iterations) ? { iterations } : {}),
    });
    if (signingSeed) signingSeed.fill(0);
    if (encryptionSeed) encryptionSeed.fill(0);
    if (!created.ok) throw refuseIdentity(created);
    await writeFile(ksPath, `${JSON.stringify(created.document, null, 2)}\n`);
    const pub = exportPublicIdentity(created);
    if (!pub.ok) throw refuseIdentity(pub);
    await writeFile(
      idPath,
      `${JSON.stringify(
        {
          spec: FED_SPEC,
          handle: pub.handle,
          public_key: pub.node_public_key,
          enc_public_key: pub.enc_public_key,
          keystore: "AZKS-1",
        },
        null,
        2,
      )}\n`,
    );
    const identity = await identityFromUnlocked(created);
    if (!identity.ok) throw refuseIdentity(identity);
    return identity;
  }
  if (ksText && !(stored && stored.seed_b64 && stored.enc_seed_b64)) {
    throw refuseIdentity({
      code: "AZKS-UNLOCK",
      message: "This node stores an encrypted keystore. A passphrase is required. Fail closed.",
    });
  }
  if (stored && stored.seed_b64 && stored.enc_seed_b64) {
    return createIdentity({
      seed: Buffer.from(stored.seed_b64, "base64url"),
      encSeed: Buffer.from(stored.enc_seed_b64, "base64url"),
    });
  }
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const encSeed = crypto.getRandomValues(new Uint8Array(32));
  const identity = await createIdentity({ seed, encSeed });
  await writeFile(
    idPath,
    `${JSON.stringify(
      {
        spec: FED_SPEC,
        handle: identity.handle,
        public_key: identity.public_key,
        enc_public_key: identity.enc_public_key,
        seed_b64: Buffer.from(seed).toString("base64url"),
        enc_seed_b64: Buffer.from(encSeed).toString("base64url"),
      },
      null,
      2,
    )}\n`,
  );
  return identity;
}

export async function openInstance({ dataDir, relays = [], passphrase = "", iterations } = {}) {
  await mkdir(dataDir, { recursive: true });
  const identity = await loadNodeIdentity(dataDir, passphrase, iterations);
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
  node.survival = () => survivalMethods({ relays: node.relays });
  return node;
}

function bracketHost(host) {
  const text = String(host || "").trim();
  if (text.startsWith("[") && text.endsWith("]")) return text;
  if (text.includes(":")) return `[${text}]`;
  return text;
}

export async function startInstance({ dataDir, port = 0, host = "127.0.0.1", advertise = "", relays = [], passphrase = "" }) {
  const node = await openInstance({ dataDir, relays, passphrase });
  const listenHost = String(host || "127.0.0.1").trim() || "127.0.0.1";
  const share = {
    listenHost,
    directUrl: null,
    directMode: null,
    directNote: "",
  };
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
      out = {
        ok: true,
        handle: node.identity.handle,
        spec: FED_SPEC,
        direct: true,
        listen_host: share.listenHost,
        direct_url: share.directUrl,
        direct_mode: share.directMode,
        awareness_socket: false,
        default_layer: "L0",
        survival: node.survival(),
        hole_punch: false,
        public_icann: false,
        aznet_replaces_internet: false,
      };
    } else if (req.method === "POST" && url.pathname === "/v1/fed-mesh/direct") {
      out = await node.onDirect(body);
    }
    res.writeHead(out.ok === false ? 400 : 200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  });
  await new Promise((resolve, reject) => {
    const onError = (err) => reject(err);
    server.once("error", onError);
    server.listen(port, listenHost, () => {
      server.removeListener("error", onError);
      resolve();
    });
  });
  const addr = server.address();
  const portNum = addr && typeof addr === "object" ? addr.port : port;
  const wildcard = listenHost === "0.0.0.0" || listenHost === "::" || listenHost === "[::]";
  const healthHost = wildcard ? "127.0.0.1" : bracketHost(listenHost);
  const base = `http://${healthHost}:${portNum}`;
  const advertised = String(advertise || "").trim();
  const shareHost = advertised || (wildcard ? "" : listenHost);
  if (shareHost) {
    const candidate = `http://${bracketHost(shareHost)}:${portNum}/v1/fed-mesh/direct`;
    const classified = classifyPeerUrl(candidate, { role: "direct" });
    if (classified.ok) {
      share.directUrl = classified.url;
      share.directMode = classified.mode;
      share.directNote = classified.note || "";
    } else {
      share.directUrl = null;
      share.directMode = null;
      share.directNote = classified.message || "That address is not a direct or LAN peer URL. 0.0.0.0 is a listen bind, not a peer URL.";
    }
  } else {
    share.directNote =
      "Listen bind is all interfaces. Pass --advertise with the LAN IP. 0.0.0.0 is not a peer URL. No STUN and no TURN. This socket is not open-world awareness.";
  }
  return {
    ...node,
    handle: node.identity.handle,
    public_key: node.identity.public_key,
    enc_public_key: node.identity.enc_public_key,
    listenHost,
    base,
    directUrl: share.directUrl,
    directMode: share.directMode,
    directNote: share.directNote,
    awarenessSocket: false,
    stop() {
      return new Promise((done) => server.close(() => done()));
    },
  };
}

export function instancePaths(dataDir) {
  return {
    identity: join(dataDir, "identity.json"),
    keystore: join(dataDir, "keystore.json"),
    chain: join(dataDir, "chain.json"),
    parent: dirname(dataDir),
  };
}

/**
 * One local node: own key, own data directory, own port.
 * Talks to relays with the same envelopes as every other node.
 * Author: Aziel Eliab only.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import { dirname, join } from "node:path";
import { openAct, sealAct, signAct } from "./client.js";
import { createIdentity } from "./identity.js";
import { FED_SPEC, ZERO_HASH } from "./spec.js";

async function loadJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
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
  const chain = await loadJson(chainPath, { seq: 0, prev: ZERO_HASH });
  const directPath = join(dataDir, "direct-inbox.json");
  const node = {
    dataDir,
    identity,
    relays: relays.slice(),
    chain,
    async persist() {
      await writeFile(chainPath, JSON.stringify(node.chain));
    },
    async post(url, body) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, ...json };
    },
    async register(relayUrl, extra = {}) {
      const seq = node.chain.seq + 1;
      const prev = node.chain.prev;
      const body = await signAct(node.identity, "register", {
        enc_public_key: node.identity.enc_public_key,
        product: extra.product || "mesh",
        presence: extra.presence || "live",
        relays: extra.relays || node.relays,
        seq,
        prev,
      });
      const out = await node.post(`${relayUrl.replace(/\/$/, "")}/register`, body);
      if (out.ok) {
        node.chain = { seq, prev: out.statement_hash };
        await node.persist();
      }
      return out;
    },
    async send(relayUrl, { to, enc_public_key, plaintext }) {
      const seq = node.chain.seq + 1;
      const prev = node.chain.prev;
      const body = await sealAct(node.identity, {
        to,
        recipientEncPublicKey: enc_public_key,
        seq,
        prev,
        plaintext,
      });
      const out = await node.post(`${relayUrl.replace(/\/$/, "")}/post`, body);
      if (out.ok) {
        node.chain = { seq, prev: out.statement_hash };
        await node.persist();
      }
      return { ...out, envelope: body };
    },
    async pull(relayUrl) {
      const body = await signAct(node.identity, "pull", { ts: new Date().toISOString() });
      return node.post(`${relayUrl.replace(/\/$/, "")}/pull`, body);
    },
    async deliver(relayUrl, ack) {
      const seq = node.chain.seq + 1;
      const prev = node.chain.prev;
      const body = await signAct(node.identity, "deliver", { seq, prev, ack });
      const out = await node.post(`${relayUrl.replace(/\/$/, "")}/deliver`, body);
      if (out.ok) {
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

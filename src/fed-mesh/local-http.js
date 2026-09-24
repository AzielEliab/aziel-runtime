/**
 * Loopback HTTP for tests and a local relay process.
 * Not imported by the Worker bundle. Author: Aziel Eliab only.
 */

import http from "node:http";
import { createRelayState, dispatchRelay } from "./relay.js";

export function startRelayServer({ host = "127.0.0.1", port = 0 } = {}) {
  const state = createRelayState(null);
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
    const out = await dispatchRelay(req.method, url.pathname, body, state, {
      handle: url.searchParams.get("handle") || "",
      ref: url.searchParams.get("ref") || "",
      hash: url.searchParams.get("hash") || "",
      name: url.searchParams.get("name") || "",
      subject_hash: url.searchParams.get("subject_hash") || "",
      fetchImpl: fetch,
    });
    const status = out.http_status || (out.ok === false ? 400 : 200);
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  });
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const addr = server.address();
      const base = `http://${host}:${addr.port}`;
      state.selfUrl = `${base}/v1/mesh/relay`;
      resolve({
        state,
        base,
        url: `${base}/v1/mesh/relay`,
        stop() {
          return new Promise((done) => server.close(() => done()));
        },
      });
    });
  });
}

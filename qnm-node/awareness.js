/**
 * Local open-world awareness listen.
 *
 * Binds 0.0.0.0 only. LIVE while this process is listening.
 * Not listening is live-when-configured. No mock LIVE.
 *
 * Not a loopback fence. Not Cap-7 public egress. Not packet forward.
 * Not a second internet. Not a FragGate slug. Not MCP.
 *
 * Author: Aziel Eliab only.
 */

import http from "node:http";
import { openWorldAwarenessCite, OPEN_WORLD_AWARENESS_BIND } from "../src/open-world-awareness.js";

export const AWARENESS_BIND = OPEN_WORLD_AWARENESS_BIND;
export const AWARENESS_ABSENT = "QNM-AWARENESS-ABSENT";

export function localAwarenessStatus({ listening = false, address = "" } = {}) {
  const bound = listening === true && address === AWARENESS_BIND;
  return openWorldAwarenessCite({ socketLive: bound });
}

function citeForAddress(address) {
  return localAwarenessStatus({ listening: true, address });
}

/**
 * Listen on 0.0.0.0. GET returns the stamp. Other methods do not forward.
 * host other than 0.0.0.0 is refused and does not listen.
 */
export function startOpenWorldAwareness({ port = 0, host = AWARENESS_BIND } = {}) {
  if (host !== AWARENESS_BIND) {
    return Promise.resolve({
      ok: false,
      code: "QNM-AWARENESS-BIND",
      bind: AWARENESS_BIND,
      listening: false,
      status: "live-when-configured",
      forced_loopback: false,
      loopback_isolation: false,
      packet_forward: false,
      public_egress_ip: false,
      message: "Open-world awareness binds 0.0.0.0. A loopback host is not this bind and is not the mesh fence.",
    });
  }
  const server = http.createServer((req, res) => {
    const addr = server.address();
    const address = addr && typeof addr === "object" ? addr.address : "";
    const cite = citeForAddress(address);
    const path = String(req.url || "/").split("?")[0];
    if (req.method !== "GET") {
      res.writeHead(405, { "content-type": "application/json", allow: "GET" });
      res.end(
        JSON.stringify({
          ok: false,
          code: "QNM-AWARENESS-READ",
          packet_forward: false,
          public_egress_ip: false,
          message: "Awareness is a read. This process does not forward packets.",
        }),
      );
      return;
    }
    if (path !== "/" && path !== "/awareness" && path !== "/health") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, code: AWARENESS_ABSENT, packet_forward: false }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, listening: cite.live === true, ...cite }));
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, AWARENESS_BIND, () => {
      const addr = server.address();
      const address = addr && typeof addr === "object" ? addr.address : "";
      resolve({
        ok: address === AWARENESS_BIND,
        bind: address,
        port: addr && typeof addr === "object" ? addr.port : 0,
        listening: address === AWARENESS_BIND,
        cite: citeForAddress(address),
        stop() {
          return new Promise((done) => server.close(() => done()));
        },
      });
    });
  });
}

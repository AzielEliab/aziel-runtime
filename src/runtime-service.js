/**
 * Local background listener, in the same spirit as FragGate service.
 * status reports Running or Quiet. GET does not call the door.
 * Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import http from "node:http";

export const SERVICE_HOST = "127.0.0.1";
export const SERVICE_PORT = 8766;

export function runningText(port) {
  return (
    `Running. Aziel Runtime is listening in the background.\n` +
    `Diagnostics: http://${SERVICE_HOST}:${port}/\n` +
    "This page does not call FragGate.\n"
  );
}

export function quietText(port) {
  return `Quiet. No listener is answering on ${SERVICE_HOST}:${port}.\n\nNext: aziel-runtime service\n`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (d) => chunks.push(d));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text.trim()) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export function probeListener(port = SERVICE_PORT) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: SERVICE_HOST, port, path: "/status", timeout: 400 }, (res) => {
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve(res.statusCode === 200 && body.startsWith("Running.") && !body.includes("Done."));
      });
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * onCall runs a door call. onBackground returns a Running view and schedules work.
 * onJob reads a job. GET / and GET /status never call those hooks.
 */
export function startRuntimeService({ port = SERVICE_PORT, onCall, onBackground, onJob } = {}) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${SERVICE_HOST}`);
    const bound = server.address();
    const boundPort = bound && bound.port ? bound.port : port;
    try {
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/status")) {
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        res.end(runningText(boundPort));
        return;
      }
      const job = url.pathname.match(/^\/job\/(job_[a-f0-9]{16})$/);
      if (req.method === "GET" && job) {
        const view = onJob ? await onJob(job[1]) : { code: "job_not_found", summary: "Quiet. No record of that job. Running is not claimed." };
        const status = view && view.code === "job_not_found" ? 404 : 200;
        res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(view));
        return;
      }
      if (req.method === "POST" && url.pathname === "/call") {
        const args = await readBody(req);
        if (args && (args.background === true || args.job_id)) {
          const view = onBackground ? await onBackground(args) : { ok: false, code: "FG-ERR", message: "Background is not wired." };
          const status = view && view.code === "job_not_found" ? 404 : view && view.ok === false ? 400 : 200;
          res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(view));
          return;
        }
        const body = onCall ? await onCall(args) : { ok: false, code: "FG-ERR" };
        const status = body && body.ok === false ? 400 : 200;
        res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(body));
        return;
      }
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Quiet. That path is not on this listener.\n");
    } catch (err) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Refused. ${err && err.message ? err.message : "The listener could not read that request."}\n`);
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, SERVICE_HOST, () => resolve(server));
  });
}

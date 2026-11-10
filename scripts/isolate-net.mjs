/**
 * Test-process network fence. Local addresses and this machine's own
 * interfaces stay open. Any other destination fails the socket and is logged.
 * A caught error is not a successful remote call.
 */
import { appendFileSync } from "node:fs";
import net from "node:net";
import dns from "node:dns";
import os from "node:os";

const logPath = process.env.AZIEL_NET_BLOCK_LOG || "/tmp/aziel-net-block.log";

function ownAddresses() {
  const set = new Set(["127.0.0.1", "::1", "0.0.0.0", "::", "localhost"]);
  for (const rows of Object.values(os.networkInterfaces())) {
    for (const row of rows || []) {
      if (row && row.address) set.add(row.address);
    }
  }
  return set;
}

const own = ownAddresses();

function allowed(host) {
  if (!host) return true;
  const name = String(host).replace(/^\[|\]$/g, "").split("%")[0];
  return own.has(name);
}

function remember(host) {
  appendFileSync(logPath, `${host}\n`);
}

const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function connect(options, ...rest) {
  let host = "";
  if (typeof options === "string" && !/^\d+$/.test(options)) host = options;
  else if (options && typeof options === "object") host = options.host || options.hostname || "";
  else if (typeof rest[0] === "string") host = rest[0];
  if (host && !allowed(host)) {
    remember(host);
    const error = new Error(`ISOLATED_NET_BLOCKED ${host}`);
    error.code = "ISOLATED_NET_BLOCKED";
    process.nextTick(() => this.emit("error", error));
    return this;
  }
  return originalConnect.call(this, options, ...rest);
};

const originalLookup = dns.lookup.bind(dns);
const originalPromiseLookup = dns.promises && dns.promises.lookup.bind(dns.promises);

function blockLookup(hostname, options, callback) {
  const host = String(hostname || "");
  const cb = typeof options === "function" ? options : callback;
  if (!allowed(host)) {
    remember(`dns:${host}`);
    const error = new Error(`ISOLATED_NET_BLOCKED ${host}`);
    error.code = "ISOLATED_NET_BLOCKED";
    if (typeof cb === "function") cb(error);
    return;
  }
  return originalLookup(host, typeof options === "function" ? {} : options, cb);
}

dns.lookup = blockLookup;
if (originalPromiseLookup) {
  dns.promises.lookup = async (hostname, options) => {
    if (!allowed(hostname)) {
      remember(`dns:${hostname}`);
      const error = new Error(`ISOLATED_NET_BLOCKED ${hostname}`);
      error.code = "ISOLATED_NET_BLOCKED";
      throw error;
    }
    return originalPromiseLookup(hostname, options);
  };
}

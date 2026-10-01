/**
 * Operator listen: open-world awareness on 0.0.0.0.
 *   node qnm-node/awareness.mjs
 *   node qnm-node/awareness.mjs --port 8790
 *
 * Stays up until the process stops. Not a public egress IP.
 * Author: Aziel Eliab only.
 */

import { startOpenWorldAwareness } from "./awareness.js";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return process.argv[i + 1];
}

const port = Number(arg("--port", "0")) || 0;
const node = await startOpenWorldAwareness({ port });
console.log(
  JSON.stringify({
    ok: node.ok === true,
    bind: node.bind,
    port: node.port,
    listening: node.listening === true,
    law: node.cite && node.cite.law,
    status: node.cite && node.cite.status,
    packet_forward: false,
    public_egress_ip: false,
    public_icann: false,
    not_a_second_internet: true,
    author: "Aziel Eliab",
  }),
);

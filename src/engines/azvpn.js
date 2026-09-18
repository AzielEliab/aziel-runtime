/**
 * azvpn local engine entry (src/engines/azvpn.js).
 * Application-layer concentrator. Kernel VPN stays SLOT. Author: Aziel Eliab.
 */
export { AZVPN_OPS, runAzvpn as run } from "./azvpn/ops.js";
export { ENGINE_VERSION, LIMITATION, VERSION, describeConcentrator, findAutoTunnel, openTunnel } from "./azvpn/engine.js";

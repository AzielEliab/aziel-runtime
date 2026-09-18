/**
 * BAN-SURVIVAL platform reachability — Windows, Mac, Linux, Android, iPhone.
 *
 * LIVE path on each OS is the same public Worker: browser / PWA / counted
 * Softwares download / MCP+OpenAPI. Not a native App Store binary.
 * Operator override 2026-09-18: all five are LIVE via those paths.
 *
 * Author: Aziel Eliab only.
 */

import { resolveCallingName } from "./calling-name.js";

const PRIMARY_WORKER_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";

export const PLATFORM_SPEC = "BAN-PLATFORMS-1.0";
export const PLATFORM_IDS = Object.freeze(["windows", "mac", "linux", "android", "ios"]);

const SHARED_PATHS = Object.freeze({
  browser: true,
  pwa: true,
  worker_fronts: true,
  mcp_openapi: true,
  softwares_download: true,
  native_app_store: false,
});

const SHARED_CLIENTS = Object.freeze({
  survival: true,
  calling_name: true,
  cap7_shuffle_in_process: true,
  cap7_public_worker_shuffle: "slot",
  dual_surface: Object.freeze({
    agents: "mcp_openapi",
    humans: "worker_ui_pwa_download",
  }),
});

function platformRow(id, label, ua_note) {
  return Object.freeze({
    id,
    label,
    live: true,
    ...SHARED_PATHS,
    ...SHARED_CLIENTS,
    ua_note,
    doors: Object.freeze([
      `${PRIMARY_WORKER_ORIGIN}/survival`,
      `${PRIMARY_WORKER_ORIGIN}/mcp`,
      `${PRIMARY_WORKER_ORIGIN}/openapi.json`,
      `${PRIMARY_WORKER_ORIGIN}/manifest.webmanifest`,
    ]),
    note:
      "LIVE via browser + installable PWA + Worker fronts + Softwares /download + MCP/OpenAPI. Not a native store app. Same FragGate door. Cap-7 in-process shuffle is LIVE; public workers.dev shuffle stays SLOT.",
  });
}

export const PLATFORM_MATRIX = Object.freeze({
  windows: platformRow("windows", "Windows", "Edge / Chrome / Firefox"),
  mac: platformRow("mac", "Mac", "Safari / Chrome / Firefox"),
  linux: platformRow("linux", "Linux", "Firefox / Chrome / Chromium"),
  android: platformRow("android", "Android", "Chrome / Firefox / installed PWA"),
  ios: platformRow("ios", "iPhone", "Safari / Add to Home Screen PWA"),
});

export function platformsCite(env = {}) {
  const calling = resolveCallingName(env);
  return {
    spec: PLATFORM_SPEC,
    all_live: true,
    native_app_store: false,
    calling_name: calling.calling_name,
    survival: "/survival",
    manifest: "/manifest.webmanifest",
    platforms: PLATFORM_IDS.map((id) => ({ ...PLATFORM_MATRIX[id] })),
    download_run: Object.freeze({
      suite_pack: "/download",
      update_manifest: "/v1/update/manifest",
      update_check: "/v1/update/check",
      pwa: "/manifest.webmanifest",
    }),
    note:
      "Windows, Mac, Linux, Android, and iPhone are LIVE on the public Worker (browser / PWA / download / MCP). Dual-surface: agents MCP/OpenAPI; humans Worker UI + PWA + counted /download. Not five native store binaries. Hubs pull /survival.",
  };
}

export function webManifest(origin, env = {}) {
  const base = String(origin || PRIMARY_WORKER_ORIGIN).replace(/\/$/, "");
  const calling = resolveCallingName(env);
  return {
    name: calling.calling_name,
    short_name: calling.calling_name,
    description: "Node-meshed MCP Softwares suite. FragGate door. Author Aziel Eliab only.",
    id: calling.calling_slug,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    lang: "en",
    icons: [
      {
        src: `${base}/sigil.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["utilities", "developer"],
    related_applications: [],
    prefer_related_applications: false,
    aziel: {
      identity: "Aziel Eliab",
      door: "fraggate",
      survival: `${base}/survival`,
      platforms: PLATFORM_IDS.slice(),
      native_app_store: false,
    },
  };
}

export function platformHeadLinks(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return `<link rel="manifest" href="${base}/manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Runtime">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="${base}/sigil.png">`;
}

export function isManifestPath(pathname) {
  const path = String(pathname || "/")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
  return path === "/manifest.webmanifest" || path === "/manifest.json" || path === "/site.webmanifest";
}

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
export const PLATFORM_PATHS = Object.freeze(["/platforms", "/v1/platforms"]);
export const LIVE_PLATFORM_PATHS = Object.freeze([
  "/survival",
  "/openapi.json",
  "/manifest.webmanifest",
  "/download",
  "/v1/software",
  "/v1/update/manifest",
  "/platforms",
]);
export const PLATFORM_REFUSE = Object.freeze({
  SLOT_OS: "BAN-NO-PLATFORM-SLOT",
});

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
  cap7_public_worker_shuffle: "live",
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
      "LIVE via browser + installable PWA + Worker fronts + Softwares /download + MCP/OpenAPI. Not a native store app. Same FragGate door. Cap-7 factory shuffle land is LIVE. Standard internet reaches AZ domains via hub HTTPS, not Cap-7 names.",
  });
}

export const PLATFORM_MATRIX = Object.freeze({
  windows: platformRow("windows", "Windows", "Edge / Chrome / Firefox"),
  mac: platformRow("mac", "Mac", "Safari / Chrome / Firefox"),
  linux: platformRow("linux", "Linux", "Firefox / Chrome / Chromium"),
  android: platformRow("android", "Android", "Chrome / Firefox / installed PWA"),
  ios: platformRow("ios", "iPhone", "Safari / Add to Home Screen PWA"),
});

export function judgePlatformSlot(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const id = String(src.platform || src.id || "")
    .trim()
    .toLowerCase();
  if (PLATFORM_IDS.includes(id) && (src.slot === true || src.live === false || src.status === "slot")) {
    return {
      accept: false,
      action: "refuse",
      reason: PLATFORM_REFUSE.SLOT_OS,
      live: true,
      note: "Do not mark Windows / Mac / Linux / Android / iPhone as SLOT. Build the path to LIVE.",
    };
  }
  return { accept: true, action: "ok", live: true };
}

export function platformsCite(env = {}) {
  const calling = resolveCallingName(env);
  return {
    spec: PLATFORM_SPEC,
    all_live: true,
    native_app_store: false,
    slot_os: [],
    worker_live: true,
    calling_name_live: true,
    calling_name: calling.calling_name,
    calling_name_rotated: calling.rotated === true,
    survival: "/survival",
    manifest: "/manifest.webmanifest",
    verified_paths: LIVE_PLATFORM_PATHS.slice(),
    platforms: PLATFORM_IDS.map((id) => ({ ...PLATFORM_MATRIX[id] })),
    download_run: Object.freeze({
      suite_pack: "/download",
      update_manifest: "/v1/update/manifest",
      update_check: "/v1/update/check",
      pwa: "/manifest.webmanifest",
    }),
    note:
      "Windows, Mac, Linux, Android, and iPhone are LIVE on the public Worker (browser / PWA / download / MCP). Dual-surface: agents MCP/OpenAPI; humans Worker UI + PWA + counted /download. Not five native store binaries. Do not mark any of these five as SLOT. Hubs pull /survival.",
  };
}

export function isPlatformPath(pathname) {
  const path = String(pathname || "/")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
  return PLATFORM_PATHS.includes(path);
}

export function platformsDoc(origin, env = {}) {
  const base = String(origin || PRIMARY_WORKER_ORIGIN).replace(/\/$/, "");
  return {
    ...platformsCite(env),
    origin: base,
    mcp: `${base}/mcp`,
    fraggate_call: `${base}/v1/fraggate/call`,
  };
}

export function dispatchPlatformsHttp(method, pathname, origin, env = {}) {
  if (!isPlatformPath(pathname)) return null;
  const verb = String(method || "GET").toUpperCase();
  if (verb === "GET" || verb === "HEAD") {
    return { status: 200, body: platformsDoc(origin, env) };
  }
  return {
    status: 405,
    body: { ok: false, code: "BAN-CITE-ONLY", note: "GET /platforms only." },
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

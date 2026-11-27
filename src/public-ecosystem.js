/**
 * Canonical live public ecosystem doors.
 * Ten sites verified live 2026-11-19, plus both Glama listings.
 * Download-tracker hosts are not doors. thefurnaceisntfree.com is not a door.
 * MirageGrid is mesh-only (public_icann false). Trades Runtime live_backends
 * and pilot_started stay false. No visible 15:20 chrome.
 * Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

export const IDENTITY_HUB_URL = "https://www.azieleliab.com/";
export const LIBRARY_HOME_URL = "https://www.azielcorpuslibrary.net/";
export const GODLOCK_HOME_URL = "https://godlock.uk/";
export const HEDIDNTJUMP_CANONICAL = "https://hedidntjump.com/";
export const HEDIDNTJUMP_SITEMAP = "https://hedidntjump.com/sitemap.xml";
export const HEDIDNTJUMP_CITE = "https://hedidntjump.com/cite.json";
export const HEDIDNTJUMP_LLMS = "https://hedidntjump.com/llms.txt";
export const FURNACE_CANONICAL = "https://furnaceisntfree.com/";
export const FURNACE_SITEMAP_CANONICAL = "https://furnaceisntfree.com/sitemap.xml";
export const FURNACE_CITE_CANONICAL = "https://furnaceisntfree.com/cite.json";
export const FURNACE_LLMS_CANONICAL = "https://furnaceisntfree.com/llms.txt";
/** Refused host. Never emit this as an href. */
export const FURNACE_NEVER_HOST = "thefurnaceisntfree.com";
export const UNSEAL_CANONICAL = "https://timetounsealthebook.net/";
export const UNSEAL_SITEMAP_CANONICAL = "https://timetounsealthebook.net/sitemap.xml";
export const UNSEAL_LLMS_CANONICAL = "https://timetounsealthebook.net/llms.txt";
export const WHITESTONE_DOOR_URL = "https://whitestone.vibelock.workers.dev/";
export const RUNTIME_DOOR_URL = "https://aziel-runtime.vibelock.workers.dev/";
export const TRADES_DOOR_URL = "https://trades-runtime.vibelock.workers.dev/";
export const TRADES_GLAMA_URL = "https://glama.ai/mcp/servers/AzielEliab/trades-runtime";
export const MIRAGEGRID_DOOR_URL = "https://miragegrid.vibelock.workers.dev/";
export const RUNTIME_GLAMA_URL = "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime";
export const RUNTIME_GITHUB_URL = "https://github.com/AzielEliab/aziel-runtime";

/**
 * Clickable sister doors. Order is the verified live set, then both Glama
 * listings, then the runtime git repo. Not Softwares catalog cards.
 */
export function ecosystemDoorLinks() {
  return [
    { id: "azieleliab", label: "Aziel Eliab", url: IDENTITY_HUB_URL },
    { id: "library", label: "Aziel Corpus Library", url: LIBRARY_HOME_URL },
    { id: "godlock", label: "GodLock", url: GODLOCK_HOME_URL },
    { id: "hedidntjump", label: "He Didn't Jump", url: HEDIDNTJUMP_CANONICAL },
    { id: "furnace", label: "Furnace Isn't Free", url: FURNACE_CANONICAL },
    { id: "unseal", label: "Time to Unseal the Book", url: UNSEAL_CANONICAL },
    { id: "whitestone", label: "Whitestone", url: WHITESTONE_DOOR_URL },
    { id: "aziel-runtime", label: "Aziel Runtime", url: RUNTIME_DOOR_URL },
    { id: "trades-runtime", label: "Trades Runtime", url: TRADES_DOOR_URL },
    { id: "miragegrid", label: "MirageGrid (mesh-only)", url: MIRAGEGRID_DOOR_URL },
    { id: "furnace-aziel", label: "Furnace Isn't Free · Aziel", url: "https://furnaceisntfree.com/aziel/" },
    { id: "unseal-aziel", label: "Time to Unseal the Book · Aziel", url: "https://timetounsealthebook.net/aziel" },
    { id: "glama-aziel-runtime", label: "Aziel Runtime on Glama", url: RUNTIME_GLAMA_URL },
    { id: "glama-trades-runtime", label: "Trades Runtime on Glama", url: TRADES_GLAMA_URL },
    { id: "aziel-runtime-github", label: "Aziel Runtime on GitHub", url: RUNTIME_GITHUB_URL },
  ];
}

/** Visible honesty under the Doors list. Not a second FragGate door. */
export function ecosystemDoorNotes() {
  return [
    "These ten sites are live public sister doors. They are not a second FragGate door.",
    "He Didn't Jump is the Marion Zioncheck archive and a handle, not a Live Node.",
    "Whitestone is the live pro se web app. A download-tracker host is not this door.",
    "Trades Runtime is a public MCP runtime. live_backends is false. pilot_started is false.",
    "MirageGrid is mesh-only. public_icann is false. It is not an ICANN registrar.",
    "Furnace Isn't Free uses furnaceisntfree.com.",
  ];
}

export function ecosystemHonestyLines() {
  return [
    "Canonical public doors are the ten live sites above. Download-tracker hosts are not doors.",
    `Furnace Isn't Free door is ${FURNACE_CANONICAL}. Do not link ${FURNACE_NEVER_HOST}.`,
    `He Didn't Jump is the Marion Zioncheck archive at ${HEDIDNTJUMP_CANONICAL}. It is a handle, not a Live Node.`,
    `Whitestone door is the live pro se web app ${WHITESTONE_DOOR_URL}. whitestone-download-tracker is the counted zip, not this door.`,
    `Trades Runtime is a public MCP runtime at ${TRADES_DOOR_URL}. live_backends false. pilot_started false. Not a Softwares-tab engine. Glama: ${TRADES_GLAMA_URL}`,
    `MirageGrid is mesh-only at ${MIRAGEGRID_DOOR_URL}. public_icann: false. It is not an ICANN registrar. miragegrid-download-tracker is not this door.`,
    `Aziel Runtime Glama: ${RUNTIME_GLAMA_URL}`,
    `Aziel Runtime door: ${RUNTIME_DOOR_URL}`,
  ];
}

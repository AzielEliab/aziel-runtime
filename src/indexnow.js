/**
 * Public IndexNow key file. The key is meant to be fetched; it is not a secret.
 * This Worker serves the file and does not ping IndexNow.
 * Author: Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

/** 32 hex chars. Body of both key URLs. */
export const INDEXNOW_KEY = "257f340c2c85b23b80d5f2512126039b";
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_WELL_KNOWN_PATH = "/.well-known/indexnow-key.txt";

export function indexNowKeyBody() {
  return `${INDEXNOW_KEY}\n`;
}

export function isIndexNowKeyPath(pathname) {
  return pathname === INDEXNOW_KEY_PATH || pathname === INDEXNOW_WELL_KNOWN_PATH;
}

export function indexNowLlmsLines(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return [
    "## IndexNow",
    "",
    `Key file: ${base}${INDEXNOW_KEY_PATH}`,
    `Well-known key: ${base}${INDEXNOW_WELL_KNOWN_PATH}`,
    "Content-Type: text/plain. The body is the key.",
    "This Worker serves the key file. It does not ping IndexNow, change DNS, or submit Search Console.",
    "",
  ];
}

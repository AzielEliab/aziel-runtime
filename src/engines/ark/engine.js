/**
 * The ARK hosted runtime (heuristics only).
 *
 * Not a kernel. Local deniable vault. This Worker never stores phrases
 * or vault blobs. No clamscan on Cloudflare. No unlock/encrypt/decrypt
 * that takes a passphrase.
 *
 * Mode E heuristics: PE/ELF/Mach-O, powershell -enc, curl|sh, wget|sh.
 * Behavior (autolock seconds, decoy counts) is not cryptography.
 */

export const LIMITATION =
  'Not a kernel, not a bootable OS, not a worm, not kernel isolation. "Rotating Kernel" means the rotating crypto/engine, not a Linux/Windows kernel. Local deniable vault. Forgotten phrase = permanent loss. Weak phrase = isolated vault compromise. Does not defeat live OS compromise while unlocked. Civilian software. HSM, kernel isolation, and classified OS are out of scope. Virus sweep is a local intake filter on files YOU put in YOUR vault, not a network AV product and not an exploit. A wrong phrase silently opens a different empty vault (deniability). Hosted API never logs phrases and never stores vaults.';

export const AUTOLOCK_SECONDS = {
  normal: 15 * 60,
  strong: 5 * 60,
  paranoid: 60,
};

export const DECOY_COUNTS = {
  normal: 0,
  strong: 2,
  paranoid: 8,
};

export function levels() {
  return {
    product: "ark",
    note: "Security levels affect behavior (auto-lock, decoys), not cryptography. AES-256-GCM + Argon2id + HKDF stay the same.",
    limitation: LIMITATION,
    levels: {
      normal: { autolock_seconds: AUTOLOCK_SECONDS.normal, decoys: DECOY_COUNTS.normal },
      strong: { autolock_seconds: AUTOLOCK_SECONDS.strong, decoys: DECOY_COUNTS.strong },
      paranoid: { autolock_seconds: AUTOLOCK_SECONDS.paranoid, decoys: DECOY_COUNTS.paranoid },
    },
  };
}

function asBytes(body) {
  if (body == null) return new Uint8Array();
  if (typeof body.b64 === "string" && body.b64.length) {
    try {
      const bin = atob(body.b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch {
      return new Uint8Array();
    }
  }
  if (typeof body.text === "string") {
    return new TextEncoder().encode(body.text);
  }
  return new Uint8Array();
}

function headLower(bytes, n) {
  const slice = bytes.slice(0, n);
  const out = new Uint8Array(slice.length);
  for (let i = 0; i < slice.length; i++) {
    const c = slice[i];
    out[i] = c >= 65 && c <= 90 ? c + 32 : c;
  }
  return out;
}

function contains(hay, needle) {
  if (needle.length > hay.length) return false;
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

const enc = new TextEncoder();

export function sweep(body) {
  const data = asBytes(body);
  const findings = [];
  const head = headLower(data, 8192);

  if (data.length > 2 && data[0] === 0x4d && data[1] === 0x5a) {
    findings.push({ kind: "heuristic", detail: "PE/MZ executable" });
  }
  if (data.length >= 4 && data[0] === 0x7f && data[1] === 0x45 && data[2] === 0x4c && data[3] === 0x46) {
    findings.push({ kind: "heuristic", detail: "ELF executable" });
  }
  if (data.length >= 4) {
    const b0 = data[0], b1 = data[1], b2 = data[2], b3 = data[3];
    const macho =
      (b0 === 0xcf && b1 === 0xfa && b2 === 0xed && b3 === 0xfe) ||
      (b0 === 0xfe && b1 === 0xed && b2 === 0xfa && b3 === 0xcf) ||
      (b0 === 0xca && b1 === 0xfe && b2 === 0xba && b3 === 0xbe);
    if (macho) findings.push({ kind: "heuristic", detail: "Mach-O or fat binary" });
  }
  if (contains(head, enc.encode("powershell")) && contains(head, enc.encode("-enc"))) {
    findings.push({ kind: "heuristic", detail: "PowerShell encoded command" });
  }
  const hasPipe = contains(head, enc.encode("|"));
  const hasSh = contains(head, enc.encode("sh")) || contains(head, enc.encode("bash"));
  if (contains(head, enc.encode("wget")) && hasPipe && hasSh) {
    findings.push({ kind: "heuristic", detail: "download-pipe-exec pattern" });
  }
  if (contains(head, enc.encode("curl")) && hasPipe && hasSh) {
    findings.push({ kind: "heuristic", detail: "download-pipe-exec pattern" });
  }
  if (contains(head, enc.encode("vba")) && contains(head, enc.encode("autoopen"))) {
    findings.push({ kind: "heuristic", detail: "macro autoopen indicator" });
  }

  return {
    flagged: findings.length > 0,
    findings,
    stored: false,
    note: "Mode E heuristics only. Payload is not stored. No clamscan on Cloudflare. Not a network AV product.",
    limitation: LIMITATION,
  };
}

/**
 * Operator surfaces shared by AZOS and aziel-runtime.
 * Scan and airgap reuse the AZMail guard. Lattice receipts are sealed
 * for AZAI to read. Human responses show present / chained / missing.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { MemoryStore } from "./chainlock/store.js";
import { append, tip } from "./chainlock/ops.js";
import { sha256Hex } from "./session-core.js";
import { inspectBeforeAirgap, probeScannerSync, scanMessageParts } from "./engines/azmail/guard.js";
import { carrierBase, kernelBase, mailSendBase } from "./bases.js";

export const OPERATOR_AUTHOR = "Aziel Eliab";
export const SEAL_SLUGS = new Set(["azmail", "azchat", "azbrowser", "azos", "azai", "veillock"]);

const CHAIN = "acts";
const CALLER = "operator-surfaces";

const OS_LINE = "Not an OS yet";
const BOOT_SPECS = Object.freeze([
  Object.freeze({
    kind: "kernel",
    name: "azos-kernel",
    purpose: "Kernel the machine can boot. Separate from the phone web app and the bootstrap wrap.",
  }),
  Object.freeze({
    kind: "userspace",
    name: "azos-userspace",
    purpose: "Userspace install the machine can boot. Separate from the phone web app and the bootstrap wrap.",
  }),
]);
const OS_MODES = new Set(["server", "bootstrap", "install"]);
const FILES = Object.freeze({
  phone: Object.freeze([
    file("azos-web-app.txt", "Phone web app. A browser tab is not the OS.", true, "AZOS web app\nAuthor: Aziel Eliab\nNot an OS yet\n"),
  ]),
});

const HUMAN_RE = /\b(captcha|are you a robot|i'm not a robot|recaptcha|hcaptcha|prove you are human|verify you are human|are you human)\b/i;
const BRIDGES = Object.freeze(["whatsapp", "facebook", "gmail", "outlook", "yahoo", "other"]);

let keyPromise = null;
let chainEnv = { __aziel_chainlock: new MemoryStore() };
const sealedStore = new Map();
const chronology = [];
let usageSeq = 0;
const simState = { lockout: false };
const engineState = {
  ollama_fallback_enabled: true,
  ollama_answering: false,
  active: null,
  switched_to: null,
};
let ollamaCache = { at: 0, value: null };

function file(name, purpose, required, text) {
  return { name, purpose, required, text };
}

function honesty() {
  return {
    author: OPERATOR_AUTHOR,
    field_1_0: false,
    alt_internet_live: false,
    packet_path_live: false,
  };
}

function applyHonesty(src) {
  const locks = honesty();
  if (src && src.alt_internet_earned === true && src.alt_internet_live === true) locks.alt_internet_live = true;
  if (src && src.packet_path_earned === true && src.packet_path_live === true) locks.packet_path_live = true;
  return locks;
}

function notAnOs(extra = {}) {
  return {
    ok: false,
    os_yet: false,
    bootable: false,
    is_os: false,
    browser_tab_is_os: false,
    phone_flash_is_os: false,
    web_app_is_os: false,
    wrap_is_os: false,
    sim_wiped: false,
    esim_wiped: false,
    complete: false,
    continue_enabled: false,
    code: "AZOS-NOT-OS",
    line: OS_LINE,
    ...extra,
    ...honesty(),
  };
}

function looksBootable(bytes, kind) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 512) return false;
  if (kind === "kernel" && bytes.byteLength > 0x206) {
    const hdr = String.fromCharCode(bytes[0x202], bytes[0x203], bytes[0x204], bytes[0x205]);
    return hdr === "HdrS";
  }
  if (kind === "userspace") {
    const mag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (mag === "hsqs" || mag === "sqsh") return true;
    const cpio = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
    return cpio === "070701";
  }
  return false;
}

async function readBootFile(name) {
  if (typeof process === "undefined" || !process.versions || !process.versions.node) return null;
  try {
    const { existsSync, readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = fileURLToPath(new URL(`./boot/${name}`, import.meta.url));
    if (!existsSync(path)) return null;
    return new Uint8Array(readFileSync(path));
  } catch {
    return null;
  }
}

async function packagedBoot() {
  const found = [];
  for (const spec of BOOT_SPECS) {
    const bytes = await readBootFile(spec.name);
    if (!bytes || !looksBootable(bytes, spec.kind)) continue;
    found.push({ ...spec, bytes, sha256: await sha256Hex(bytes) });
  }
  return found;
}

function bootRows(found) {
  const byKind = Object.fromEntries(found.map((row) => [row.kind, row]));
  const any = found.length > 0;
  return BOOT_SPECS.map((spec) => {
    const hit = byKind[spec.kind];
    return {
      name: spec.name,
      purpose: spec.purpose,
      kind: spec.kind,
      required: any ? Boolean(hit) : true,
      present: Boolean(hit),
      optional: any ? !hit : false,
      size: hit ? hit.bytes.byteLength : 0,
      sha256: hit ? hit.sha256 : null,
    };
  });
}

export function resetOperatorSurfaces() {
  keyPromise = null;
  chainEnv = { __aziel_chainlock: new MemoryStore() };
  sealedStore.clear();
  chronology.length = 0;
  usageSeq = 0;
  simState.lockout = false;
  engineState.ollama_fallback_enabled = true;
  engineState.ollama_answering = false;
  engineState.active = null;
  engineState.switched_to = null;
  ollamaCache = { at: 0, value: null };
}

async function azaiKey() {
  if (!keyPromise) {
    keyPromise = crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  return keyPromise;
}

function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function latticeView(row) {
  if (!row || !row.sealed_sha256) {
    return { present: false, chained: false, missing: true };
  }
  return {
    present: true,
    chained: row.chained === true,
    missing: false,
    sealed_sha256: row.sealed_sha256,
    stamp_sha256: row.stamp_sha256 || null,
    prev: row.prev || null,
  };
}

function watchesOthers(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  if (src.watch_other === true || src.target === "other" || src.camera_other === true) return true;
  if (src.off_machine === true || src.remote_private === true || src.private_other === true) return true;
  if (src.scope === "other-machine" || src.scope === "other-person") return true;
  return false;
}

export function guardianAudit(slug, op, payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const wantsOff = src.off === true || src.enabled === false || src.guardian === "off" || src.disable === true;
  if (watchesOthers(src)) {
    return {
      guardian: "On",
      enabled: true,
      can_disable: false,
      always_on: true,
      observed: false,
      watched_others: false,
      off_machine: false,
      camera_other: false,
      subject: "operator",
      machine: "this",
      score_is_source: false,
      code: "GUARDIAN-NOT-SURVEILLANCE",
    };
  }
  const scored = scoreGate({
    claim: `operator ${slug} ${op}`,
    source: "operator-request",
    score: 2,
  });
  return {
    guardian: "On",
    enabled: true,
    can_disable: false,
    always_on: true,
    observed: true,
    watched_others: false,
    off_machine: false,
    camera_other: false,
    subject: "operator",
    machine: "this",
    score_is_source: false,
    triad_blocked: scored.blocked === true,
    triad_code: scored.code || null,
    claim_allowed: scored.claim_allowed === true,
    code: wantsOff ? "GUARDIAN-ALWAYS-ON" : "GUARDIAN-ON",
  };
}

export function guardianStatus(payload) {
  const audit = guardianAudit("azos", "guardian", payload);
  const wantsOff = audit.code === "GUARDIAN-ALWAYS-ON";
  const refused = audit.code === "GUARDIAN-NOT-SURVEILLANCE" || wantsOff;
  return {
    ok: !refused,
    op: "guardian",
    ...audit,
    line: "Guardian: On",
    ...honesty(),
  };
}

export async function withReceipt(slug, op, body, env) {
  const src = body && typeof body === "object" ? { ...body } : { ok: false };
  const note = src._seal_note;
  delete src._seal_note;
  src.guardian = "On";
  src.guardian_enabled = true;
  src.guardian_can_disable = false;
  usageSeq += 1;
  const record = {
    slug: String(slug || ""),
    op: String(op || ""),
    ok: src.ok !== false,
    code: src.code || null,
    live: src.live === true,
    usage_seq: usageSeq,
    at: new Date().toISOString(),
    note: note == null ? `guardian on; operator ${slug}/${op}` : String(note),
    guardian: "On",
    guardian_can_disable: false,
    watched_others: false,
    score_is_source: false,
    author: OPERATOR_AUTHOR,
  };
  let sealedSha = null;
  try {
    const key = await azaiKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(record));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
    const packed = `${b64(iv)}.${b64(cipher)}`;
    sealedSha = await sha256Hex(packed);
    sealedStore.set(sealedSha, packed);
  } catch {
    return {
      ...src,
      ok: false,
      code: "RECEIPT-MISSING",
      error: "RECEIPT-MISSING",
      lattice_receipt: { present: false, chained: false, missing: true },
      ...applyHonesty(src),
    };
  }
  let chained = null;
  try {
    chained = await append(chainEnv, {
      c: CHAIN,
      caller: CALLER,
      k: "stamp",
      s: "sealed-receipt",
      f: `sealed ${sealedSha}`,
      id: sealedSha.slice(0, 40),
    });
  } catch {
    chained = { ok: false };
  }
  const view = {
    present: true,
    chained: Boolean(chained && chained.ok && chained.stamp && chained.stamp.stamp_sha256),
    missing: false,
    sealed_sha256: sealedSha,
    stamp_sha256: chained && chained.stamp ? chained.stamp.stamp_sha256 : null,
    prev: chained && chained.stamp ? chained.stamp.prev : null,
  };
  chronology.push({
    seq: record.usage_seq,
    sealed_sha256: sealedSha,
    slug: record.slug,
    op: record.op,
  });
  if (!view.chained) {
    return {
      ...src,
      ok: false,
      code: "RECEIPT-UNCHAINED",
      error: "RECEIPT-UNCHAINED",
      lattice_receipt: { present: true, chained: false, missing: false, sealed_sha256: sealedSha },
      ...applyHonesty(src),
    };
  }
  return { ...src, lattice_receipt: view, ...applyHonesty(src) };
}

export async function azaiReadReceipt(sealedSha) {
  const packed = sealedStore.get(String(sealedSha || ""));
  if (!packed) return null;
  const [ivB64, ctB64] = packed.split(".");
  if (!ivB64 || !ctB64) return null;
  const key = await azaiKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) },
    key,
    fromB64(ctB64),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

export async function latticeTip() {
  return tip(chainEnv, CHAIN, CALLER);
}

function scoreOf(rec) {
  if (rec && rec.ok === true && rec.live === true) return 3;
  if (rec && rec.ok === false && rec.code) return 2;
  if (rec && rec.ok === true) return 2;
  return 1;
}

export async function learnReceipts() {
  const order = chronology.map((row) => ({ ...row }));
  const ranking = [];
  for (const row of order) {
    const rec = await azaiReadReceipt(row.sealed_sha256);
    ranking.push({
      seq: row.seq,
      sealed_sha256: row.sealed_sha256,
      slug: row.slug,
      op: row.op,
      score: scoreOf(rec),
      score_is_source: false,
    });
  }
  ranking.sort((a, b) => b.score - a.score || a.seq - b.seq);
  return {
    ok: true,
    op: "receipt_learn",
    chronology: order,
    ranking,
    chronology_preserved: true,
    ranking_erases_chronology: false,
    score_is_source: false,
    ...honesty(),
  };
}

export function humanCheck(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const text = `${src.text || ""} ${src.html || ""} ${src.q || ""} ${src.prompt || ""}`;
  if (!HUMAN_RE.test(text)) {
    return { ok: true, op: "human_check", stopped: false, solver: false, code: "HUMAN-CHECK-CLEAR", ...honesty() };
  }
  return {
    ok: false,
    op: "human_check",
    stopped: true,
    solver: false,
    automated: false,
    handed_to_person: true,
    code: "HUMAN-CHECK",
    banner: "This site wants to check that you're a person. Please do this part yourself.",
    ...honesty(),
  };
}

function scanPublic(scan) {
  return {
    code: scan.code,
    verdict: scan.verdict,
    clean: scan.clean === true,
    live: scan.live === true,
    fixture_labeled: scan.fixture_labeled === true,
    scanner: scan.scanner || null,
    note: scan.note || "",
  };
}

export async function malwareSweep(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const text = src.text != null ? String(src.text) : src.body != null ? String(src.body) : "";
  const bytes = new TextEncoder().encode(text);
  const sha = await sha256Hex(bytes);
  const scan = await scanMessageParts({
    parts: [{ name: "part", kind: src.kind || "file", bytes, sha256: sha }],
    env,
  });
  return {
    ok: scan.ok === true,
    op: "malware_sweep",
    used: scan.clean === true,
    executed: false,
    ...scanPublic(scan),
    ...honesty(),
  };
}

export async function airgap(payload, env) {
  const scan = await inspectBeforeAirgap(payload || {}, env);
  const clean = scan.clean === true || (scan.scan && scan.scan.clean === true);
  const live = scan.live === true || (scan.scan && scan.scan.live === true);
  return {
    ok: scan.ok === true,
    op: "airgap",
    clean: clean === true,
    live: live === true,
    fixture_labeled: scan.fixture_labeled === true || (scan.scan && scan.scan.fixture_labeled === true) || false,
    code: scan.code || (scan.scan && scan.scan.code) || null,
    plaintext_crossed: false,
    executed: false,
    scanner: (scan.scan && scan.scan.scanner) || scan.scanner || null,
    note: scan.note || (scan.scan && scan.scan.note) || "",
    ...honesty(),
  };
}

export function bridgeStatus() {
  const bridges = {};
  for (const name of BRIDGES) {
    bridges[name] = {
      live: false,
      end_to_end: false,
      api_in_repo: false,
      code: "BRIDGE-NOT-LIVE",
    };
  }
  return {
    ok: true,
    op: "bridge_status",
    channel: "azchat",
    e2e_outside: false,
    bridges,
    ...honesty(),
  };
}

export function channelSeal(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  return {
    ok: true,
    op: "channel_seal",
    channel: "azchat",
    sealed_channel: true,
    room_id: src.room_id || null,
    e2e_outside: false,
    whatsapp_e2e: false,
    facebook_e2e: false,
    gmail_e2e: false,
    outlook_e2e: false,
    yahoo_e2e: false,
    bridges_live: false,
    ...honesty(),
  };
}

export function jeevesSite(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const asked = src.asked === true || src.ask === true;
  if (!asked) {
    return {
      ok: false,
      op: "jeeves_site",
      code: "JEEVES-NOT-ASKED",
      changed: false,
      deployed: false,
      jeeves_sovereign: false,
      ...honesty(),
    };
  }
  const instruction = String(src.text || src.instruction || "").slice(0, 2000);
  const safe = instruction.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AZOS</title></head><body><p>Jeeves is a helper, not the owner. This device and its choices belong to you. Jeeves will ask before it changes anything.</p><pre>${safe}</pre></body></html>`;
  return {
    ok: true,
    op: "jeeves_site",
    changed: true,
    deployed: false,
    jeeves_sovereign: false,
    html,
    ...honesty(),
  };
}

async function hashedFiles(mode) {
  const rows = FILES[mode] || [];
  const out = [];
  for (const row of rows) {
    const bytes = new TextEncoder().encode(row.text);
    out.push({
      name: row.name,
      purpose: row.purpose,
      required: row.required,
      optional: !row.required,
      size: bytes.byteLength,
      sha256: await sha256Hex(bytes),
    });
  }
  return out;
}

export function modeList() {
  return {
    ...notAnOs({
      ok: true,
      op: "mode_list",
      modes: [
        { id: "server", line: "Run AZOS as a service on a computer you already have." },
        { id: "bootstrap", line: "Start AZOS from a USB drive or SD card without changing your computer." },
        { id: "install", line: "Install AZOS as the main system on a device. This replaces what is there." },
      ],
    }),
  };
}

export async function bootPath() {
  const found = await packagedBoot();
  const built = await kernelBase();
  const files = bootRows(found);
  return notAnOs({
    op: "boot_path",
    files,
    kernel: found.some((row) => row.kind === "kernel"),
    userspace: found.some((row) => row.kind === "userspace"),
    kernel_base: found.some((row) => row.kind === "kernel"),
    userspace_base: built.userspace_base === true,
    base: built.base === true,
    booted: false,
    installed: false,
    stay_off: false,
    userspace_format: built.format,
    userspace_sha256: built.sha256,
    userspace_bytes: built.bytes,
  });
}

export async function internetBase(payload, env) {
  const cell = await cellular({}, env);
  const earned = cell.live === true && cell.code === "CELL-LIVE";
  return {
    ok: true,
    op: "internet_base",
    base: true,
    stay_off: false,
    installed: false,
    live: false,
    alt_internet_live: earned,
    packet_path_live: earned,
    alt_internet_earned: earned,
    packet_path_earned: earned,
    public_door: "FG-STUB",
    carriers: carrierBase(),
    cellular_status: cell.status || "Absent",
    field_1_0: false,
    line: earned ? "Internet base carried a real packet." : "Internet base is present. Not live.",
    author: OPERATOR_AUTHOR,
  };
}

export async function downloadList(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const mode = String(src.mode || "");
  if (mode === "phone") {
    const files = await hashedFiles(mode);
    const known = files.reduce((sum, row) => sum + row.size, 0);
    return notAnOs({
      op: "download_list",
      mode,
      files,
      total_bytes: known,
      total_line: `Total: ${known} bytes`,
      everything_bundle: false,
      line: "Not an OS yet. This is the phone web app, not the OS.",
    });
  }
  if (!OS_MODES.has(mode)) {
    return {
      ...notAnOs({
        op: "download_list",
        code: "AZOS-NO-LIST",
        line: "We could not load a trusted file list. Nothing has been downloaded.",
        files: [],
      }),
    };
  }
  const files = bootRows(await packagedBoot());
  const known = files.reduce((sum, row) => sum + row.size, 0);
  return notAnOs({
    op: "download_list",
    mode,
    files,
    total_bytes: known,
    total_line: `Total: ${known} bytes`,
    everything_bundle: false,
    image_present: files.some((row) => row.present),
    booted: false,
    installed: false,
    stay_off: false,
  });
}

export async function downloadCheck(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const mode = String(src.mode || "");
  if (mode === "phone") {
    return notAnOs({
      op: "download_check",
      mode,
      line: "Not an OS yet. This is the phone web app, not the OS.",
    });
  }
  if (!OS_MODES.has(mode)) {
    return notAnOs({ op: "download_check", mode, code: "AZOS-NO-LIST", line: OS_LINE });
  }
  const files = bootRows(await packagedBoot());
  const posted = src.files && typeof src.files === "object" ? src.files : {};
  const missing = [];
  const bad = [];
  for (const row of files) {
    if (!row.required) continue;
    if (!row.present || !row.sha256) {
      missing.push(row.name);
      continue;
    }
    const got = posted[row.name];
    if (got == null || got === "") missing.push(row.name);
    else if (String(got) !== row.sha256) bad.push(row.name);
  }
  const imagePresent = files.some((row) => row.present && row.sha256);
  const hashMatch = imagePresent && missing.length === 0 && bad.length === 0;
  return notAnOs({
    op: "download_check",
    mode,
    missing,
    bad_hash: bad,
    files,
    image_present: imagePresent,
    hash_match: hashMatch,
    booted: false,
    installed: false,
    stay_off: false,
    line: hashMatch ? "Not an OS yet. The image base matches. It has not booted." : OS_LINE,
  });
}

export function phonePath(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const phone = env && env.PHONE && env.PHONE.real === true && env.PHONE.mock !== true ? env.PHONE : null;
  const boot = phone && (phone.bootloader === "unlocked" || phone.bootloader === "locked") ? phone.bootloader : "unknown";
  const model = phone && phone.model ? String(phone.model) : null;
  const image = false;
  let path = "bootstrap";
  let line = "Not an OS yet. We couldn't detect your phone. We won't guess.";
  if (phone && boot === "unlocked") {
    line = "Not an OS yet. We don't have a tested AZOS image for this model yet.";
  } else if (phone && (boot === "locked" || boot === "unknown")) {
    line = "Not an OS yet. This phone can't be flashed easily. The bootstrap wrap keeps the phone's system. A flashed phone is not the OS.";
  }
  const flasher = env && env.FLASHER && env.FLASHER.real === true && env.FLASHER.mock !== true;
  const flashExecuted = path === "full_flash" && flasher === true;
  return {
    ok: true,
    op: "phone_path",
    path,
    model,
    bootloader: boot,
    matching_image: image,
    flash_executed: flashExecuted,
    erases: path === "full_flash",
    sim_wiped: false,
    esim_wiped: false,
    os_yet: false,
    is_os: false,
    browser_tab_is_os: false,
    phone_flash_is_os: false,
    web_app_is_os: false,
    wrap_is_os: false,
    line,
    wrap_line: "The bootstrap wrap is an app on top of the phone's system. It is not the OS.",
    ...honesty(),
  };
}

export function simLockout(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const control = Boolean(
    env && env.CELL_RADIO && env.CELL_RADIO.real === true && env.CELL_RADIO.mock !== true && env.CELL_RADIO.controls_sim === true,
  );
  if (src.on === true) {
    if (!control) {
      return {
        ok: false,
        op: "sim_lockout",
        code: "SIM-NOT-SUPPORTED",
        lockout: false,
        sim_erased: false,
        esim_erased: false,
        line: "Not supported on this phone",
        ...honesty(),
      };
    }
    simState.lockout = true;
    return {
      ok: true,
      op: "sim_lockout",
      lockout: true,
      sim_erased: false,
      esim_erased: false,
      line: "Cellular: Off. SIM locked out in Settings.",
      ...honesty(),
    };
  }
  if (src.on === false) {
    simState.lockout = false;
    return { ok: true, op: "sim_lockout", lockout: false, sim_erased: false, esim_erased: false, ...honesty() };
  }
  return {
    ok: true,
    op: "sim_lockout",
    lockout: simState.lockout,
    default_off: simState.lockout === false,
    sim_erased: false,
    esim_erased: false,
    ...honesty(),
  };
}

export async function cellular(payload, env) {
  if (simState.lockout) {
    return {
      ok: true,
      op: "cellular",
      live: false,
      status: "Off",
      line: "Cellular: Off. SIM locked out in Settings.",
      ...honesty(),
    };
  }
  const radio = env && env.CELL_RADIO && env.CELL_RADIO.real === true && env.CELL_RADIO.mock !== true && env.CELL_RADIO.present === true
    ? env.CELL_RADIO
    : null;
  if (!radio) {
    return {
      ok: false,
      op: "cellular",
      live: false,
      status: "Absent",
      code: "CELL-RADIO-ABSENT",
      line: "Cellular: Absent. This device has no cellular radio we can use.",
      ...honesty(),
    };
  }
  if (typeof radio.roundTrip !== "function") {
    return { ok: false, op: "cellular", live: false, status: "Unknown", code: "CELL-UNKNOWN", ...honesty() };
  }
  const trip = await radio.roundTrip();
  if (trip && trip.ok === true && trip.mock !== true) {
    return { ok: true, op: "cellular", live: true, status: "Live", code: "CELL-LIVE", ...honesty() };
  }
  return {
    ok: false,
    op: "cellular",
    live: false,
    status: "No service",
    code: "CELL-NO-SERVICE",
    line: "Cellular: No service.",
    ...honesty(),
  };
}

export async function ipMask(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const mode = String(src.mode || "server");
  const direct = src.direct !== false;
  const mask = env && env.MASK_PATH && env.MASK_PATH.real === true && env.MASK_PATH.mock !== true ? env.MASK_PATH : null;
  if (!mask || direct) {
    return {
      ok: true,
      op: "ip_mask",
      mode,
      masked: false,
      status: "Not masked",
      direct: true,
      line: "IP: Not masked. Sites and services can see your address.",
      ...honesty(),
    };
  }
  if (typeof mask.check !== "function") {
    return { ok: false, op: "ip_mask", mode, masked: false, status: "Unknown", code: "IP-UNKNOWN", line: "IP: Unknown", ...honesty() };
  }
  const check = await mask.check();
  if (check && check.ok === true && check.saw === "relay" && check.mock !== true) {
    return { ok: true, op: "ip_mask", mode, masked: true, status: "Masked", direct: false, line: "IP: Masked", ...honesty() };
  }
  return {
    ok: true,
    op: "ip_mask",
    mode,
    masked: false,
    status: "Not masked",
    direct: true,
    line: "IP: Not masked. Sites and services can see your address.",
    ...honesty(),
  };
}

export function azCall(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  if (src.place === true || src.call === true) {
    return {
      ok: false,
      op: "azcall",
      code: "AZCALL-NO-PATH",
      designed: true,
      live: false,
      call_path_live: false,
      fee: null,
      ...honesty(),
    };
  }
  return {
    ok: true,
    op: "azcall",
    designed: true,
    live: false,
    call_path_live: false,
    fee: null,
    number_changeable: "designed",
    code: "AZCALL-DESIGN-ONLY",
    note: "A changeable number with no fee is designed only. No call path is claimed.",
    ...honesty(),
  };
}

export function veilStatus(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  const control = env && env.VEIL_DEVICE && env.VEIL_DEVICE.real === true && env.VEIL_DEVICE.mock !== true ? env.VEIL_DEVICE : null;
  if (src.watch_other === true || src.target === "other") {
    return {
      ok: false,
      op: "veillock",
      code: "VEIL-NOT-SURVEILLANCE",
      camera: "Off",
      screen_share: "Off",
      protects: "user",
      ...honesty(),
    };
  }
  const wantCamera = src.camera === true && src.asked === true && src.task;
  const wantShare = src.screen_share === true && src.asked === true && src.task;
  if ((wantCamera || wantShare) && !control) {
    return {
      ok: false,
      op: "veillock",
      code: "VEIL-NOT-SUPPORTED",
      camera: "Not supported on this device",
      screen_share: "Not supported on this device",
      line: "Not supported on this device",
      ...honesty(),
    };
  }
  return {
    ok: true,
    op: "veillock",
    camera: wantCamera ? `Camera on for: ${String(src.task).slice(0, 80)}` : "Camera: Off",
    screen_share: wantShare ? `Screen shared for: ${String(src.task).slice(0, 80)}` : "Screen share: Off",
    protects: "user",
    surveillance: false,
    ...honesty(),
  };
}

export function probeMesh(env) {
  const src = env && env.MESH_INFERENCE;
  const real = Boolean(src && src.real === true && src.mock !== true);
  const nodes = real && Array.isArray(src.nodes)
    ? src.nodes.filter((n) => n && n.id && n.live === true && n.self !== true && n.mock !== true)
    : [];
  const ids = [...new Set(nodes.map((n) => String(n.id)))];
  const measured = real && src.measured === true && src.quick === true && src.accurate === true && typeof src.complete === "function";
  const strong = ids.length >= 2 && measured;
  return {
    mesh_share: ids.length >= 2 ? "present" : "absent",
    strong,
    one_process_is_mesh: false,
    node_count: ids.length,
    field_1_0: false,
  };
}

export async function probeOllama(env) {
  const bound = env && env.OLLAMA;
  if (bound && bound.real === true && bound.mock !== true && bound.present === true && bound.host) {
    return { present: true, host: String(bound.host), live: true };
  }
  const host = (env && env.OLLAMA_HOST) || (typeof process !== "undefined" && process.env && process.env.OLLAMA_HOST) || "http://127.0.0.1:11434";
  const now = Date.now();
  if (ollamaCache.value && ollamaCache.host === host && now - ollamaCache.at < 15000) return ollamaCache.value;
  let value = { present: false, host, live: false };
  try {
    const res = await fetch(`${String(host).replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(400) });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.models)) value = { present: true, host, live: true, models: data.models.map((m) => m && m.name).filter(Boolean) };
    }
  } catch {
    value = { present: false, host, live: false };
  }
  ollamaCache = { at: now, host, value };
  return value;
}

export function chooseEngine({ mesh, ollamaPresent, personReenable }) {
  if (personReenable === true) engineState.ollama_fallback_enabled = true;
  if (personReenable === false) engineState.ollama_fallback_enabled = false;
  if (mesh && mesh.strong) {
    if (personReenable !== true) engineState.ollama_fallback_enabled = false;
    engineState.ollama_answering = false;
    engineState.active = "mesh";
    engineState.switched_to = "mesh";
    return {
      engine: "mesh",
      ollama_answering: false,
      ollama_fallback_enabled: engineState.ollama_fallback_enabled,
      mesh_processing: false,
      mesh_share: "present",
      switched_to: "mesh",
      refused: false,
      field_1_0: false,
    };
  }
  if (engineState.ollama_fallback_enabled && ollamaPresent) {
    engineState.active = "ollama";
    engineState.ollama_answering = true;
    return {
      engine: "ollama",
      ollama_answering: true,
      ollama_fallback_enabled: true,
      mesh_processing: false,
      mesh_share: mesh ? mesh.mesh_share : "absent",
      switched_to: null,
      refused: false,
      one_process_is_mesh: false,
      field_1_0: false,
    };
  }
  engineState.ollama_answering = false;
  engineState.active = null;
  return {
    engine: null,
    refused: true,
    code: "AZAI-ENGINE-ABSENT",
    ollama_answering: false,
    mesh_processing: false,
    mesh_share: mesh ? mesh.mesh_share : "absent",
    one_process_is_mesh: false,
    field_1_0: false,
  };
}

async function ollamaGenerate(host, prompt) {
  try {
    const res = await fetch(`${String(host).replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "llama3.2", prompt, stream: false }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { ok: false, code: "OLLAMA-FAILED" };
    const data = await res.json();
    if (!data || typeof data.response !== "string" || !data.response) return { ok: false, code: "OLLAMA-FAILED" };
    return { ok: true, text: data.response };
  } catch {
    return { ok: false, code: "OLLAMA-FAILED" };
  }
}

async function meshGenerate(env, prompt) {
  const src = env && env.MESH_INFERENCE;
  if (!src || src.real !== true || src.mock === true || typeof src.complete !== "function") {
    return { ok: false, code: "AZAI-MESH-ABSENT" };
  }
  const out = await src.complete(prompt);
  if (!out || out.mock === true || out.ok !== true || typeof out.text !== "string") return { ok: false, code: "AZAI-MESH-FAILED" };
  return { ok: true, text: out.text };
}

export function scoreGate(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const claim = src.claim ? String(src.claim) : "";
  const hasSource = Boolean(src.source);
  const score = src.score == null || src.score === "" ? null : Number(src.score);
  if (!claim) return { ok: false, op: "score_gate", code: "AZAI-NO-CLAIM", unknown: true, ...honesty() };
  if (!hasSource) {
    return { ok: false, op: "score_gate", code: "AZAI-NO-SOURCE", blocked: true, unknown: true, score_is_source: false, ...honesty() };
  }
  if (score == null || Number.isNaN(score) || score < 1) {
    return { ok: false, op: "score_gate", code: "AZAI-SCORE-BLOCK", blocked: true, score_is_source: false, ...honesty() };
  }
  return { ok: true, op: "score_gate", blocked: false, score_is_source: false, claim_allowed: true, ...honesty() };
}

export function corpusNote(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const published = String(src.published || "");
  return {
    ok: true,
    op: "corpus_note",
    published,
    published_rewritten: false,
    note: src.note ? String(src.note).slice(0, 500) : null,
    ...honesty(),
  };
}

export function cap7Lookup(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const name = src.name ? String(src.name).slice(0, 80) : null;
  return {
    ok: true,
    op: "cap7_lookup",
    name,
    names_only: true,
    icann: false,
    public_egress: false,
    site_up: src.site_checked === true ? src.site_up === true : "unknown",
    name_found_is_site_up: false,
    ...honesty(),
  };
}

export async function crawl(payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  if (src.asked !== true) {
    return { ok: false, op: "crawl", code: "CRAWL-NOT-ASKED", fetched: [], ...honesty() };
  }
  const gate = humanCheck(src);
  if (gate.stopped) return { ...gate, op: "crawl", fetched: [] };
  const surface = String(src.surface || "internet");
  if (surface === "cap7") {
    return { ...cap7Lookup(src), op: "crawl", fetched: [], recorded: true };
  }
  if (surface === "corpus") {
    return { ...corpusNote(src), op: "crawl", fetched: [], recorded: true, published_rewritten: false };
  }
  const url = src.url ? String(src.url) : "";
  if (!url) return { ok: true, op: "crawl", tool: "absent", fetched: [], recorded: true, ...honesty() };
  if (typeof fetch !== "function") return { ok: false, op: "crawl", tool: "absent", fetched: [], code: "CRAWL-NO-FETCH", ...honesty() };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    const buf = new Uint8Array(await res.arrayBuffer());
    const sample = new TextDecoder().decode(buf.slice(0, 2000));
    if (HUMAN_RE.test(sample)) {
      return { ...humanCheck({ text: sample }), op: "crawl", fetched: [], recorded: true };
    }
    return {
      ok: true,
      op: "crawl",
      recorded: true,
      published_rewritten: false,
      fetched: [{ url, status: res.status, bytes: buf.byteLength, sha256: await sha256Hex(buf) }],
      ...honesty(),
    };
  } catch {
    return { ok: false, op: "crawl", code: "CRAWL-FAILED", failed_stays_failed: true, fetched: [], recorded: true, ...honesty() };
  }
}

export async function attachFiles(payload, env) {
  const { parseCarriedParts } = await import("./engines/azmail/guard.js");
  const parsed = await parseCarriedParts(payload || {});
  if (!parsed.ok) {
    return { ok: false, op: "attach", used: false, clean: false, executed: false, code: parsed.code || "AZAI-ATTACH", ...honesty() };
  }
  const scan = await scanMessageParts({ parts: parsed.scanParts, env });
  return {
    ok: scan.ok === true,
    op: "attach",
    used: scan.clean === true && scan.ok === true,
    executed: false,
    kinds: (parsed.scanParts || []).map((part) => part.kind),
    ...scanPublic(scan),
    ...honesty(),
  };
}

async function generateAnswer(choice, payload, env) {
  const prompt = String((payload && (payload.q || payload.text || payload.prompt)) || "").slice(0, 2000);
  if (!prompt) return { ok: false, code: "AZAI-NO-QUESTION" };
  if (choice.engine === "ollama") {
    const ollama = await probeOllama(env);
    const answer = await ollamaGenerate(ollama.host, prompt);
    return {
      ok: answer.ok === true,
      engine: "ollama",
      ollama_answering: answer.ok === true,
      mesh_processing: false,
      mesh_share: choice.mesh_share,
      text: answer.ok ? answer.text : null,
      code: answer.ok ? null : answer.code || "OLLAMA-FAILED",
      failed_stays_failed: answer.ok !== true,
      field_1_0: false,
    };
  }
  if (choice.engine === "mesh") {
    const answer = await meshGenerate(env, prompt);
    return {
      ok: answer.ok === true,
      engine: "mesh",
      ollama_answering: false,
      mesh_processing: answer.ok === true,
      switched_to: "mesh",
      text: answer.ok ? answer.text : null,
      code: answer.ok ? null : answer.code,
      failed_stays_failed: answer.ok !== true,
      field_1_0: false,
    };
  }
  return { ok: false, ...choice, text: null };
}

export async function azaiTurn(op, payload, env) {
  const src = payload && typeof payload === "object" ? payload : {};
  if (src.send === true || src.deliver === true || src.action === "send") {
    return { ok: false, op, code: "AGENT-NO-SEND", sent: false, drafted: true, ...honesty() };
  }
  const gate = humanCheck(src);
  if (gate.stopped) return { ...gate, op };
  const mesh = probeMesh(env);
  const person = src.ollama_fallback === true ? true : src.ollama_fallback === false ? false : undefined;
  let ollamaPresent = false;
  if (!mesh.strong && person !== false) {
    const probed = await probeOllama(env);
    ollamaPresent = probed.present === true;
  }
  const choice = chooseEngine({ mesh, ollamaPresent, personReenable: person });
  if (op === "engine_status") {
    return { ok: !choice.refused, op, ...choice, ollama_present: ollamaPresent, ...honesty() };
  }
  if (op === "score_gate") return { ...scoreGate(src), engine: choice.engine, mesh_processing: false, ollama_answering: false };
  if (op === "corpus_note") return { ...corpusNote(src), mesh_processing: false, ollama_answering: false };
  if (op === "cap7_lookup") return { ...cap7Lookup(src), mesh_processing: false, ollama_answering: false };
  if (op === "human_check") return gate;
  if (op === "receipt_learn") return learnReceipts();
  if (op === "receipt_status") {
    const row = chronology[chronology.length - 1];
    return { ok: true, op, lattice_receipt: latticeView(row ? { ...row, chained: true } : null), ...honesty() };
  }
  if (choice.refused) return { ok: false, op, ...choice, ...honesty() };
  const answer = await generateAnswer(choice, src, env);
  return {
    ...answer,
    op,
    agent: op === "agent",
    azclicker: op === "azclicker",
    sent: false,
    ollama_is_mesh: false,
    ...honesty(),
  };
}

export async function runFeature(slug, op, payload, env) {
  if (slug === "azchat" && op === "channel_seal") return channelSeal(payload);
  if (slug === "azchat" && op === "bridge_status") return bridgeStatus();
  if ((slug === "azchat" || slug === "azbrowser" || slug === "azmail" || slug === "azos") && op === "malware_sweep") {
    return malwareSweep(payload, env);
  }
  if ((slug === "azchat" || slug === "azbrowser" || slug === "azmail" || slug === "azos") && op === "airgap") {
    return airgap(payload, env);
  }
  if (slug === "azbrowser" && op === "jeeves_site") return jeevesSite(payload);
  if ((slug === "azbrowser" || slug === "azai" || slug === "azos") && op === "human_check") return humanCheck(payload);
  if (slug === "azos" && op === "mode_list") return modeList();
  if (slug === "azos" && op === "boot_path") return bootPath();
  if (slug === "azos" && op === "internet_base") return internetBase(payload, env);
  if (slug === "azos" && op === "guardian") return guardianStatus(payload);
  if (slug === "azmail" && op === "mail_send_base") return mailSendBase(payload, env);
  if (slug === "azos" && op === "download_list") return downloadList(payload);
  if (slug === "azos" && op === "download_check") return downloadCheck(payload);
  if (slug === "azos" && op === "phone_path") return phonePath(payload, env);
  if (slug === "azos" && op === "sim_lockout") return simLockout(payload, env);
  if (slug === "azos" && op === "cellular") return cellular(payload, env);
  if (slug === "azos" && op === "ip_mask") return ipMask(payload, env);
  if (slug === "azos" && op === "azcall") return azCall(payload);
  if ((slug === "azos" || slug === "veillock") && (op === "veillock" || op === "veil_status" || op === "camera" || op === "screen_share")) {
    return veilStatus(payload, env);
  }
  if (slug === "azai" && op === "attach") return attachFiles(payload, env);
  if (slug === "azai" && op === "crawl") return crawl(payload, env);
  if (
    slug === "azai" &&
    ["engine_status", "conversation", "agent", "azclicker", "score_gate", "corpus_note", "cap7_lookup", "receipt_learn", "receipt_status"].includes(op)
  ) {
    return azaiTurn(op, payload, env);
  }
  return null;
}

export function scannerProbe(env) {
  return probeScannerSync(env);
}

export { FILES as OPERATOR_MODE_FILES };

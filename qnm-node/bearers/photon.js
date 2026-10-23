/**
 * QNM-PHOTON-CARRIER-1.0: a real light carrier for the local qnm-node.
 *
 * The photon channel is LIVE only when this host has real light hardware:
 *   - an emitter: a controllable flash / torch LED (`/sys/class/leds/<name>/brightness`), and
 *   - a receiver: an IIO ambient-light sensor (`/sys/bus/iio/devices/iio:deviceN/in_illuminance*`).
 * A local qnsd process, a loopback socket, or a camera node alone is not light hardware.
 * Absent hardware refuses QNM-RADIO-ABSENT. No mock LIVE.
 *
 * A second receive path (`photonReceive({ rx: "v4l2" })`) sits beside the IIO receiver.
 * It reads real V4L2 frames (ffmpeg `-f v4l2`, gray, 16×16) and uses each frame's mean
 * luminance as one sample for the same Manchester decoder. No camera, no frame, or no
 * ffmpeg refuses QNM-RADIO-ABSENT. A device node is not a luminance reading and does not
 * mark the channel LIVE.
 *
 * Carrier: on-off keying, Manchester chips (1 -> on,off; 0 -> off,on), framed as
 *   preamble 0xAA 0xAA 0xAA 0xAA, sync 0x7E, length (u16 BE), payload, CRC-32 (u32 BE).
 * The sender drives the LED brightness file chip by chip. The receiver samples the light
 * sensor at the chip rate, thresholds at the midpoint of the observed min / max, and decodes.
 *
 * Local process law only. Not a FragGate slug, not MCP, never run from the Worker.
 * Author: Aziel Eliab only.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, accessSync, constants } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

export const PHOTON_SPEC = "QNM-PHOTON-CARRIER-1.0";
export const PHOTON_ABSENT = "QNM-RADIO-ABSENT";
export const PHOTON_PREAMBLE = Object.freeze([0xaa, 0xaa, 0xaa, 0xaa]);
export const PHOTON_SYNC = 0x7e;
export const PHOTON_MAX_PAYLOAD = 1024;
export const PHOTON_DEFAULT_CHIP_MS = 20;
export const PHOTON_CAMERA_EDGE = 16;
export const PHOTON_CAMERA_FRAME = PHOTON_CAMERA_EDGE * PHOTON_CAMERA_EDGE;
export const PHOTON_CAMERA_MAX_FRAMES = 2048;

const EMITTER_RE = /flash|torch/i;
const SENSOR_FILES = Object.freeze(["in_illuminance_input", "in_illuminance_raw", "in_intensity_both_raw", "in_intensity_clear_raw"]);

function sysRoot(root) {
  return root ? String(root) : "/";
}

function writable(path) {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** Find a controllable flash / torch LED. `root` lets tests point at a sysfs tree; default is the real `/`. */
export function findEmitter({ root } = {}) {
  const leds = join(sysRoot(root), "sys/class/leds");
  try {
    if (!existsSync(leds)) return null;
    for (const name of readdirSync(leds).sort()) {
      if (!EMITTER_RE.test(name)) continue;
      const brightness = join(leds, name, "brightness");
      if (!existsSync(brightness) || !writable(brightness)) continue;
      let max = 1;
      try {
        max = Number.parseInt(readFileSync(join(leds, name, "max_brightness"), "utf8").trim(), 10) || 1;
      } catch {
        max = 1;
      }
      return { name, brightness, max_brightness: max };
    }
  } catch {
    /* no sysfs */
  }
  return null;
}

/** Find an IIO ambient-light sensor channel that reads a number. */
export function findSensor({ root } = {}) {
  const iio = join(sysRoot(root), "sys/bus/iio/devices");
  try {
    if (!existsSync(iio)) return null;
    for (const dev of readdirSync(iio).sort()) {
      for (const file of SENSOR_FILES) {
        const path = join(iio, dev, file);
        if (!existsSync(path)) continue;
        const value = Number.parseFloat(readFileSync(path, "utf8").trim());
        if (Number.isFinite(value)) return { device: dev, path, channel: file };
      }
    }
  } catch {
    /* no iio */
  }
  return null;
}

/** Real light hardware probe. Present only with an emitter and a receiver. */
export function probeLightHardware({ root } = {}) {
  const emitter = findEmitter({ root });
  const sensor = findSensor({ root });
  const present = Boolean(emitter && sensor);
  return {
    present,
    kind: present ? `led:${emitter.name}+iio:${sensor.device}` : null,
    emitter: emitter ? emitter.name : null,
    sensor: sensor ? sensor.device : null,
    // A V4L2 node name is not a light reading. rx stays the IIO sensor.
    camera: root ? null : listCameraNodes()[0] || null,
    tx: Boolean(emitter),
    rx: Boolean(sensor),
  };
}

/** V4L2 device nodes on this host. The name is not a frame and not a luminance. */
export function listCameraNodes() {
  try {
    return readdirSync("/dev")
      .filter((name) => /^video\d+$/.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((name) => join("/dev", name));
  } catch {
    return [];
  }
}

/** Mean byte value of one gray frame. Empty or non-bytes is not a luminance. */
export function frameLuminance(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1) return null;
  let sum = 0;
  for (let i = 0; i < bytes.byteLength; i += 1) sum += bytes[i];
  const mean = sum / bytes.byteLength;
  return Number.isFinite(mean) ? mean : null;
}

/**
 * One luminance per gray frame. `frameBytes` is the scaled frame size (16×16).
 * A short or uneven buffer is refused (null). It is not padded and the tail is not dropped.
 */
export function framesToLuminance(bytes, frameBytes = PHOTON_CAMERA_FRAME) {
  if (!(bytes instanceof Uint8Array) || frameBytes < 1) return null;
  if (bytes.byteLength < frameBytes || bytes.byteLength % frameBytes !== 0) return null;
  const out = [];
  for (let i = 0; i < bytes.byteLength; i += frameBytes) {
    const luma = frameLuminance(bytes.subarray(i, i + frameBytes));
    if (luma === null) return null;
    out.push(luma);
  }
  return out;
}

function ffmpegFrames(device, frames) {
  return new Promise((resolve) => {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "v4l2",
      "-i",
      device,
      "-frames:v",
      String(frames),
      "-vf",
      `scale=${PHOTON_CAMERA_EDGE}:${PHOTON_CAMERA_EDGE}`,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "gray",
      "pipe:1",
    ];
    let child;
    try {
      child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      resolve(null);
      return;
    }
    const chunks = [];
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }, 20000);
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || !chunks.length) {
        resolve(null);
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

/**
 * Read `frames` gray V4L2 frames from a real camera. Returns bytes or null.
 * `spawnCapture` is the test seam (it must return real frame bytes, not a made-up luminance).
 * No device and no capture is null. Null is a refusal, not a dark frame.
 */
export async function readCameraFrames({ device, frames = 64, spawnCapture } = {}) {
  const n = Math.max(1, Math.floor(Number(frames) || 1));
  if (typeof spawnCapture === "function") {
    const got = await spawnCapture({ device, frames: n });
    if (got == null) return null;
    return got instanceof Uint8Array ? got : null;
  }
  const nodes = device ? [String(device)] : listCameraNodes();
  if (!nodes.length) return null;
  for (const node of nodes) {
    const bytes = await ffmpegFrames(node, n);
    if (bytes && bytes.byteLength) return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  return null;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function toBytes(payload) {
  if (payload instanceof Uint8Array) return payload;
  if (typeof payload === "string") return new TextEncoder().encode(payload);
  throw new TypeError("photon payload must be bytes or a string");
}

/** Frame bytes: preamble, sync, u16 length, payload, u32 CRC-32 of the payload. */
export function photonFrame(payload) {
  const body = toBytes(payload);
  if (body.byteLength > PHOTON_MAX_PAYLOAD) throw new RangeError(`photon payload over ${PHOTON_MAX_PAYLOAD} bytes`);
  const crc = crc32(body);
  return Uint8Array.from([
    ...PHOTON_PREAMBLE,
    PHOTON_SYNC,
    (body.byteLength >>> 8) & 0xff,
    body.byteLength & 0xff,
    ...body,
    (crc >>> 24) & 0xff,
    (crc >>> 16) & 0xff,
    (crc >>> 8) & 0xff,
    crc & 0xff,
  ]);
}

/** Manchester chips for a frame: 1 -> [1,0], 0 -> [0,1], MSB first. */
export function photonChips(payload) {
  const chips = [];
  for (const byte of photonFrame(payload)) {
    for (let bit = 7; bit >= 0; bit -= 1) {
      if ((byte >> bit) & 1) chips.push(1, 0);
      else chips.push(0, 1);
    }
  }
  return chips;
}

function chipsToBits(chips, offset) {
  const bits = [];
  for (let i = offset; i + 1 < chips.length; i += 2) {
    const a = chips[i];
    const b = chips[i + 1];
    if (a === 1 && b === 0) bits.push(1);
    else if (a === 0 && b === 1) bits.push(0);
    else bits.push(null);
  }
  return bits;
}

function bitsToByte(bits, at) {
  let v = 0;
  for (let k = 0; k < 8; k += 1) {
    const bit = bits[at + k];
    if (bit !== 0 && bit !== 1) return null;
    v = (v << 1) | bit;
  }
  return v;
}

/** Decode chips (0/1 per chip) into the first frame with a valid CRC. Returns bytes or null. */
export function decodeChips(chips) {
  for (let offset = 0; offset < 2; offset += 1) {
    const bits = chipsToBits(chips, offset);
    for (let start = 0; start + 8 * 3 <= bits.length; start += 1) {
      if (bitsToByte(bits, start) !== PHOTON_SYNC) continue;
      if (start < 8 || bitsToByte(bits, start - 8) !== 0xaa) continue;
      const hi = bitsToByte(bits, start + 8);
      const lo = bitsToByte(bits, start + 16);
      if (hi === null || lo === null) continue;
      const len = (hi << 8) | lo;
      if (len > PHOTON_MAX_PAYLOAD) continue;
      const need = start + 24 + 8 * (len + 4);
      if (need > bits.length) continue;
      const out = new Uint8Array(len);
      let bad = false;
      for (let i = 0; i < len; i += 1) {
        const b = bitsToByte(bits, start + 24 + 8 * i);
        if (b === null) {
          bad = true;
          break;
        }
        out[i] = b;
      }
      if (bad) continue;
      let crc = 0;
      for (let i = 0; i < 4; i += 1) {
        const b = bitsToByte(bits, start + 24 + 8 * (len + i));
        if (b === null) {
          bad = true;
          break;
        }
        crc = (crc * 256 + b) >>> 0;
      }
      if (bad || crc !== crc32(out)) continue;
      return out;
    }
  }
  return null;
}

/** Threshold light samples (one per chip) at the midpoint of the observed range. */
export function samplesToChips(samples) {
  const xs = samples.map(Number).filter(Number.isFinite);
  if (!xs.length) return [];
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  if (hi === lo) return [];
  const mid = (lo + hi) / 2;
  return xs.map((x) => (x > mid ? 1 : 0));
}

function absent(op, probe) {
  return {
    ok: false,
    spec: PHOTON_SPEC,
    op,
    state: "REFUSE",
    code: PHOTON_ABSENT,
    mock: false,
    tx: probe.tx,
    rx: probe.rx,
    note: "Photon light hardware is absent on this host (needs a flash or torch LED and an IIO light sensor). Refuse. No mock LIVE.",
  };
}

function cameraAbsent(note) {
  return {
    ok: false,
    spec: PHOTON_SPEC,
    op: "receive",
    rx: "v4l2",
    state: "REFUSE",
    code: PHOTON_ABSENT,
    mock: false,
    live: false,
    note,
  };
}

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send one framed payload by switching the real LED. Refuses when no emitter is present.
 * `write` and `sleep` default to the real file write and timer.
 */
export async function photonSend(payload, { root, chipMs = PHOTON_DEFAULT_CHIP_MS, write, sleep } = {}) {
  const emitter = findEmitter({ root });
  if (!emitter) return absent("send", probeLightHardware({ root }));
  const put = write || ((path, value) => writeFileSync(path, value));
  const wait = sleep || sleepMs;
  const chips = photonChips(payload);
  try {
    for (const chip of chips) {
      put(emitter.brightness, String(chip ? emitter.max_brightness : 0));
      await wait(chipMs);
    }
  } finally {
    put(emitter.brightness, "0");
  }
  return { ok: true, spec: PHOTON_SPEC, op: "send", state: "SENT", emitter: emitter.name, chips: chips.length, chip_ms: chipMs, mock: false };
}

/**
 * Receive one framed payload by sampling the real light sensor at the chip rate.
 * Refuses when no sensor is present. Returns ok:false PHOTON-NO-FRAME when nothing decodes.
 */
/**
 * Receive one framed payload from a V4L2 camera. Each captured frame's mean luminance
 * is one sample. Refuses when no camera yields a frame. Does not invent a frame and
 * does not mark the photon channel LIVE.
 */
function cameraReceived(camera, payload, samples) {
  return {
    ok: true,
    spec: PHOTON_SPEC,
    op: "receive",
    rx: "v4l2",
    state: "RECEIVED",
    live: false,
    sensor: camera,
    payload,
    samples,
    mock: false,
  };
}

function cameraNoFrame(camera, samples) {
  return {
    ok: false,
    spec: PHOTON_SPEC,
    op: "receive",
    rx: "v4l2",
    state: "NO-FRAME",
    code: "PHOTON-NO-FRAME",
    live: false,
    sensor: camera,
    samples,
    mock: false,
  };
}

export async function photonReceiveCamera({ device, maxChips = PHOTON_CAMERA_MAX_FRAMES, spawnCapture } = {}) {
  const cap = Math.max(1, Math.floor(Number(maxChips) || PHOTON_CAMERA_MAX_FRAMES));
  const camera = device ? String(device) : listCameraNodes()[0] || null;
  if (!camera && typeof spawnCapture !== "function") {
    return cameraAbsent("No V4L2 camera on this host. Refuse. No mock LIVE.");
  }
  // A test capture is one buffer of gray frames, not a second call that could repeat them.
  if (typeof spawnCapture === "function") {
    const bytes = await readCameraFrames({ device: camera, frames: cap, spawnCapture });
    if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1) return cameraAbsent("The camera did not yield a V4L2 frame. Refuse. No mock LIVE.");
    const lumas = framesToLuminance(bytes);
    if (!lumas) return cameraAbsent("The V4L2 frame was not a whole gray frame. Refuse. No mock LIVE.");
    const got = decodeChips(samplesToChips(lumas));
    if (got) return cameraReceived(camera, got, lumas.length);
    return cameraNoFrame(camera, lumas.length);
  }
  const samples = [];
  while (samples.length < cap) {
    const n = Math.min(64, cap - samples.length);
    const bytes = await readCameraFrames({ device: camera, frames: n });
    if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1) {
      if (!samples.length) return cameraAbsent("The camera did not yield a V4L2 frame. Refuse. No mock LIVE.");
      break;
    }
    const lumas = framesToLuminance(bytes);
    if (!lumas) {
      if (!samples.length) return cameraAbsent("The V4L2 frame was not a whole gray frame. Refuse. No mock LIVE.");
      break;
    }
    samples.push(...lumas);
    const got = decodeChips(samplesToChips(samples));
    if (got) return cameraReceived(camera, got, samples.length);
  }
  return cameraNoFrame(camera, samples.length);
}

export async function photonReceive({ root, chipMs = PHOTON_DEFAULT_CHIP_MS, maxChips = 2 * 8 * (PHOTON_MAX_PAYLOAD + 11), read, sleep, rx, device, spawnCapture } = {}) {
  if (rx === "v4l2") return photonReceiveCamera({ device, maxChips, spawnCapture });
  const sensor = findSensor({ root });
  if (!sensor) return absent("receive", probeLightHardware({ root }));
  const get = read || ((path) => readFileSync(path, "utf8"));
  const wait = sleep || sleepMs;
  const samples = [];
  for (let i = 0; i < maxChips; i += 1) {
    const value = Number.parseFloat(String(get(sensor.path)).trim());
    samples.push(value);
    if (samples.length % 64 === 0) {
      const got = decodeChips(samplesToChips(samples));
      if (got) return { ok: true, spec: PHOTON_SPEC, op: "receive", state: "RECEIVED", sensor: sensor.device, payload: got, samples: samples.length, mock: false };
    }
    await wait(chipMs);
  }
  const got = decodeChips(samplesToChips(samples));
  if (got) return { ok: true, spec: PHOTON_SPEC, op: "receive", state: "RECEIVED", sensor: sensor.device, payload: got, samples: samples.length, mock: false };
  return { ok: false, spec: PHOTON_SPEC, op: "receive", state: "NO-FRAME", code: "PHOTON-NO-FRAME", sensor: sensor.device, samples: samples.length, mock: false };
}

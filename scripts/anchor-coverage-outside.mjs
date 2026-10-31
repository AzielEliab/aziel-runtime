#!/usr/bin/env node
/**
 * Outside dead-man checker (RIB-061, AZRT-ANCHOR-COVERAGE-1.0).
 *
 * Runs outside the runtime. Reads a heartbeat file the Worker and the ChainLock
 * writer cannot write. Pages when the newest beat is missing or older than the deadline.
 * Does not import the chain writer, does not sign, does not claim LIVE.
 *
 *   node scripts/anchor-coverage-outside.mjs <heartbeat.json> [--deadline-ms 900000] [--now <ms>]
 *
 * Author: Aziel Eliab.
 */
import fs from "node:fs";
import { checkDeadman, COVERAGE_SPEC } from "../src/anchor-coverage.js";

export function shelfFromBeats(beats) {
  const rows = Array.isArray(beats) ? beats.filter((b) => b && Number.isFinite(Number(b.at))) : [];
  return {
    latest() {
      return rows.length ? rows[rows.length - 1] : null;
    },
  };
}

export function readHeartbeatFile(path) {
  const text = fs.readFileSync(path, "utf8");
  const parsed = JSON.parse(text);
  return shelfFromBeats(parsed && parsed.beats);
}

export function checkFile({ path, now = Date.now(), deadlineMs, read = readHeartbeatFile } = {}) {
  let shelf = null;
  let unreadable = null;
  try {
    shelf = read(path);
  } catch (err) {
    unreadable = String(err && err.message ? err.message : err).slice(0, 160);
  }
  const page = checkDeadman(shelf, { now, deadline_ms: deadlineMs });
  return {
    spec: COVERAGE_SPEC,
    live: false,
    signed: false,
    checker: "outside",
    cap7_is_icann: false,
    paid_sat: "HELD",
    ...(unreadable ? { unreadable } : {}),
    ...page,
  };
}

export function main(argv = process.argv.slice(2), now = Date.now()) {
  const path = argv.find((a) => !a.startsWith("--"));
  const deadlineIdx = argv.indexOf("--deadline-ms");
  const nowIdx = argv.indexOf("--now");
  const deadlineMs = deadlineIdx >= 0 ? Number(argv[deadlineIdx + 1]) : 15 * 60 * 1000;
  const at = nowIdx >= 0 ? Number(argv[nowIdx + 1]) : now;
  if (!path) return { exit: 1, body: { ok: false, code: "DEADMAN-NO-FILE", spec: COVERAGE_SPEC, live: false, checker: "outside" } };
  const body = checkFile({ path, now: at, deadlineMs });
  return { exit: body.page ? 2 : 0, body };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const out = main();
  console.log(JSON.stringify(out.body));
  process.exit(out.exit);
}

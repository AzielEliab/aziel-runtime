/**
 * 4dmap in-process ops. Author: Aziel Eliab.
 */
import { resetLatticeStore, runLatticeOp, wantsLibraryPin } from "./lattice.js";
import {
  AUTHOR,
  DOMAINS_ARE_DOORS,
  LAYER,
  LIMITATION,
  NAME,
  PRODUCT,
  SEQUENTIAL_GATE,
  SPEC,
  VERSION,
  fourdmapHealth,
  fourdmapSkill,
  cardNew,
  cardPin,
  cardSpan,
  cardJoin,
  cardWalk,
  cardList,
  verifyHash,
  frameStatus,
  axisDescribe,
  walkTrace,
  cardExport,
  cardImport,
  verifyChain,
  neighborCite,
  pin,
  span,
  stack,
  gap,
  fork,
  walk,
  lens,
  classMark,
  cohort,
  absence,
  cap,
  join,
  list,
  example,
} from "./engine.js";

export const FOURDMAP_OPS = [
  "health",
  "skill",
  "pin",
  "span",
  "stack",
  "gap",
  "fork",
  "walk",
  "lens",
  "class",
  "cohort",
  "absence",
  "cap",
  "join",
  "list",
  "example",
  "card_new",
  "card_pin",
  "card_span",
  "card_join",
  "card_walk",
  "card_list",
  "verify_hash",
  "frame_status",
  "axis_describe",
  "walk_trace",
  "card_export",
  "card_import",
  "verify_chain",
  "neighbor_cite",
  "memory_cite",
  "memory_observe",
  "library_pin",
  "plot",
  "possibility",
  "pattern_recall",
  "lattice_tip",
  "poison_refuse",
  "news_status",
  "news_pin",
  "news_open",
  "news_ingest",
  "news_sources",
  "news_weather",
  "news_black_swan",
  "news_feed",
  "news_item",
  "news_sky",
  "news_pins",
  "news_pin_open",
  "news_receipts",
  "news_verify",
  "news_globe",
];

/**
 * AZNEWS-LIVE-1.0 reads. When the AZNEWS Durable Object is bound, these ops read the
 * stored real data (and mint view receipts). Unbound, the legacy in-memory path answers.
 */
const LIVE_READS = {
  news_status: "status",
  news_sources: "sources",
  news_weather: "weather",
  news_feed: "feed",
  news_item: "item",
  news_sky: "sky",
  news_pins: "pins",
  news_pin_open: "pin",
  news_receipts: "receipts",
  news_verify: "verify",
  news_globe: "globe",
};

const LATTICE_OPS = new Set([
  "memory_cite",
  "memory_observe",
  "library_pin",
  "plot",
  "possibility",
  "pattern_recall",
  "lattice_tip",
  "poison_refuse",
  "news_status",
  "news_pin",
  "news_open",
  "news_ingest",
  "news_sources",
  "news_weather",
  "news_black_swan",
]);

function latticeEnvelope(op, body) {
  return {
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    true_engine_runtime: true,
    kv_increment: false,
    door: "fraggate",
    sequential_gate: SEQUENTIAL_GATE,
    domains_are_doors: DOMAINS_ARE_DOORS,
    not_a_door: true,
    layer: LAYER,
    author: AUTHOR,
    op,
    ...body,
  };
}

export function fourdmapHealthOp() {
  return fourdmapHealth();
}

export function fourdmapSkillOp() {
  return fourdmapSkill();
}

export function resetFourdmapLattice() {
  resetLatticeStore();
}

async function runLiveRead(op, payload, env) {
  const { aznewsCall } = await import("../../aznews-do.js");
  const body = { ...(payload || {}) };
  if (!body.via) body.via = "fraggate:4dmap." + op;
  const out = await aznewsCall(env, LIVE_READS[op], body);
  return latticeEnvelope(op, {
    ...out,
    live_store: "durable-object-sqlite",
    software_tab: false,
    mcp_tool: false,
    installed: false,
    field_1_0: false,
    alt_internet_live: false,
    mesh_node: false,
    page: "/aznews",
  });
}

export async function runFourdmap(op, payload, _scratch, env) {
  if (op === "health") return fourdmapHealth();
  if (LIVE_READS[op] && env && env.AZNEWS && !(payload && (payload.fixture === true || payload.observation))) {
    if (op === "news_sources" && payload && payload.fetch === true) {
      // fall through to the legacy single-outlet probe
    } else {
      return runLiveRead(op, payload, env);
    }
  }
  if (["news_feed", "news_item", "news_sky", "news_pins", "news_pin_open", "news_receipts", "news_verify", "news_globe"].includes(op)) {
    return latticeEnvelope(op, { ok: false, refused: true, code: "AZNEWS-STORE-UNBOUND", message: "The AZNEWS store is not bound in this isolate. Nothing was read." });
  }
  if (op === "skill") return fourdmapSkill();
  if (LATTICE_OPS.has(op) || (op === "pin" && wantsLibraryPin(payload))) {
    try {
      const ran = op === "pin" ? "library_pin" : op;
      return latticeEnvelope(ran, await runLatticeOp(ran, payload));
    } catch (err) {
      if (err && err.code) {
        return latticeEnvelope(op, {
          ok: false,
          refused: true,
          code: err.code,
          message: err.message || String(err),
        });
      }
      throw err;
    }
  }
  if (op === "pin") return pin(payload);
  if (op === "span") return span(payload);
  if (op === "stack") return stack(payload);
  if (op === "gap") return gap(payload);
  if (op === "fork") return fork(payload);
  if (op === "walk") return walk(payload);
  if (op === "lens") return lens(payload);
  if (op === "class") return classMark(payload);
  if (op === "cohort") return cohort(payload);
  if (op === "absence") return absence(payload);
  if (op === "cap") return cap(payload);
  if (op === "join") return join(payload);
  if (op === "list") return list(payload);
  if (op === "example") return example(payload);
  if (op === "card_new") return cardNew(payload);
  if (op === "card_pin") return cardPin(payload);
  if (op === "card_span") return cardSpan(payload);
  if (op === "card_join") return cardJoin(payload);
  if (op === "card_walk") return cardWalk(payload);
  if (op === "card_list") return cardList(payload);
  if (op === "verify_hash") return verifyHash(payload);
  if (op === "frame_status") return frameStatus(payload);
  if (op === "axis_describe") return axisDescribe(payload);
  if (op === "walk_trace") return walkTrace(payload);
  if (op === "card_export") return cardExport(payload);
  if (op === "card_import") return cardImport(payload);
  if (op === "verify_chain") return verifyChain(payload);
  if (op === "neighbor_cite") return neighborCite(payload);
  return { unsupported: true };
}

export { LIMITATION, VERSION, SPEC, AUTHOR };

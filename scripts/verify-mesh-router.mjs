/**
 * MESH-ADAPT-1.0 — natural-language route, reviewed-copy gallery, Softwares stay 42.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { listSoftwareEntries } from "../src/software-catalog.js";
import { routeMesh } from "../src/mesh-router.js";
import { orchestrate, resetInterfaceLedger } from "../src/interface-orchestrator.js";
import { resetReviewedCopies } from "../src/reviewed-copies.js";
import { SUITE_SOFTWARE_COUNT } from "../src/guide-reason.js";

const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const catalog = listSoftwareEntries(PRODUCTS, "https://aziel-runtime.example");
assert.equal(catalog.length, 42);
assert.equal(catalog.length, SUITE_SOFTWARE_COUNT);
assert.equal(catalog.some((card) => card.slug === "jeeves" || card.slug === "ask-jeeves"), false);
assert.equal(catalog.filter((card) => card.suite_help && card.suite_help.software_tab === false).length >= 0, true);
const corpus = catalog.find((card) => card.slug === "aziel-corpus");
assert.equal(corpus.suite_help.software_tab, false);

const health = routeMesh({ question: "Is FoldLock healthy?", catalog });
assert.equal(health.ok, true);
assert.equal(health.routed, true);
assert.equal(health.slug, "foldlock");
assert.equal(health.op, "health");
assert.equal(health.dispatch, true);
assert.equal(health.invented, false);
assert.equal(health.catalog_count, 42);
assert.equal(health.lens.order.join(" → "), "Service → Clarity → Peace");
assert.equal(health.display.action, "Run aziel runtime");
assert.match(health.display.title, /FoldLock/);
assert.equal(health.display.fields.map((field) => field.label).join(","), "Service,Clarity,Peace");
assert.doesNotMatch(health.display.summary, /fraggate_call/);

const ambiguous = routeMesh({ question: "foldlock and godlock", catalog });
assert.equal(ambiguous.dispatch, false);
assert.equal(ambiguous.clarify, true);
assert.equal(ambiguous.slug, null);
assert.ok(ambiguous.candidates.every((row) => catalog.some((card) => card.slug === row.slug)));

const jeeves = routeMesh({ question: "Ask Jeeves where to click", catalog });
assert.equal(jeeves.dispatch, false);
assert.equal(jeeves.ask_jeeves_is_software, false);
assert.match(jeeves.display.summary, /suite help/);
assert.equal(jeeves.slug, null);

const unknown = routeMesh({ question: "run notasoftwarexyz please", catalog });
assert.equal(unknown.dispatch, false);
assert.equal(unknown.candidates.some((row) => row.slug === "notasoftwarexyz"), false);

const blocked = routeMesh({ question: "dominate humanity", catalog });
assert.equal(blocked.ok, false);
assert.equal(blocked.code, "MR-LENS-REFUSE");
assert.equal(blocked.dispatch, false);

const preview = routeMesh({ question: "fold this note", catalog, dry_run: true });
assert.equal(preview.slug, "foldlock");
assert.equal(preview.op, "fold-preview");
assert.equal(preview.dispatch, false);
assert.equal(preview.dry_run, true);

const write = routeMesh({ question: "fold this note", catalog });
assert.equal(write.slug, "foldlock");
assert.equal(write.op, "fold-preview");
assert.equal(write.dispatch, false);
assert.equal(write.needs_confirm, true);
const confirmed = routeMesh({ question: "fold this note", catalog, confirm: true });
assert.equal(confirmed.dispatch, true);

resetReviewedCopies();
resetInterfaceLedger();
let dispatched = null;
const painted = await orchestrate(
  { call: "route", q: "Is FoldLock healthy?", session_id: "gallery-test" },
  {
    catalog,
    dispatch: async (args) => {
      dispatched = args;
      return { ok: true, code: "FG-OK", slug: args.slug, op: args.op, result: { png_b64: PNG, reviewed: true } };
    },
  },
);
assert.equal(dispatched.slug, "foldlock");
assert.equal(dispatched.op, "health");
assert.equal(painted.status, 200);
assert.equal(painted.body.executed, true);
assert.equal(painted.body.display.action, "Run aziel runtime");
assert.equal(painted.body.display.image.reviewed, true);
assert.equal(painted.body.display.image.mimeType, "image/png");
assert.equal(painted.body.display.image.data, PNG);
assert.equal(painted.body.reviewed_copies.length, 1);
assert.equal(painted.body.reviewed_copies[0].slug, "foldlock");
assert.equal(painted.body.reviewed_copies[0].reviewed, true);
assert.doesNotMatch(painted.body.display.summary, /fraggate_call/);

const again = await orchestrate({ call: "reviewed_copies", session_id: "gallery-test" }, { catalog });
assert.equal(again.body.reviewed_copies.length, 1);

let citedDispatch = 0;
const cited = await orchestrate(
  { call: "route", q: "Is FoldLock healthy?", session_id: "cite-test" },
  {
    catalog,
    dispatch: async (args) => {
      citedDispatch += 1;
      return {
        ok: true,
        code: "FG-OK",
        slug: args.slug,
        op: args.op,
        result: { image_url: "https://aziel-runtime.example/sigil.png" },
      };
    },
  },
);
assert.equal(citedDispatch, 1);
assert.equal(cited.body.display.image.reviewed, false);
assert.equal(cited.body.display.image.url, "https://aziel-runtime.example/sigil.png");
assert.equal(cited.body.reviewed_copies.length, 0);

const dry = await orchestrate(
  { call: "route", q: "Is FoldLock healthy?", dry_run: true, session_id: "gallery-test" },
  {
    catalog,
    dispatch: async () => {
      throw new Error("dry_run must not dispatch");
    },
  },
);
assert.equal(dry.body.dispatch, false);
assert.equal(dry.body.display.image, undefined);
assert.equal(dry.body.reviewed_copies.length, 1);

const ui = readFileSync(new URL("../src/human-ui.js", import.meta.url), "utf8");
const dashAt = ui.indexOf("function dashCardHtml");
const dashEnd = ui.indexOf("\nfunction ", dashAt + 1);
const dashBody = ui.slice(dashAt, dashEnd);
assert.doesNotMatch(dashBody, /reviewed-gallery|interface-chat|if-ask/);
assert.match(ui, /id="dash-softwares"/);
assert.match(ui, /id="interface-chat"/);
assert.match(ui, /id="reviewed-gallery"/);
assert.match(ui, /id="reviewed-copies"/);
assert.match(ui, /function appendFigure/);
assert.match(ui, /data:" \+ \(image\.mimeType/);
assert.ok(ui.indexOf('id="dash-softwares"') < ui.indexOf('id="interface-chat"'));

const jeevesUi = readFileSync(new URL("../src/about-aziel.js", import.meta.url), "utf8");
assert.match(jeevesUi, /id="jeeves-productions"/);
assert.match(jeevesUi, /software_tab/);
assert.match(jeevesUi, /not a Softwares card/);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const home = await (
  await handler(new Request(origin + "/workspace"), {})
).text();
assert.match(home, /id="dash-softwares"/);
assert.match(home, /id="interface-chat"/);
assert.match(home, /id="reviewed-gallery"/);
assert.match(home, /id="jeeves-productions"/);
assert.match(home, /No reviewed copies in this session yet/);
const desk = home.slice(home.indexOf('id="dash-softwares"'), home.indexOf('id="interface-panel"'));
assert.doesNotMatch(desk, /id="reviewed-gallery"|id="if-ask"/);

const mcp = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "runtime_run", arguments: { q: "Is FoldLock healthy?", dry_run: true } },
    }),
  }),
  {},
);
const mcpBody = await mcp.json();
assert.equal(mcpBody.result.isError, false);
const routed = mcpBody.result.structuredContent.result;
assert.equal(routed.slug, "foldlock");
assert.equal(routed.op, "health");
assert.equal(routed.dispatch, false);
assert.equal(mcpBody.result.structuredContent.display.action, "Run aziel runtime");
assert.equal(mcpBody.result.content.some((part) => part.type === "image"), false);

console.log("ok mesh router: foldlock/health, reviewed copy, Softwares 42, Ask Jeeves not a card");

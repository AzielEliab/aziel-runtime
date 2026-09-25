/**
 * Aziel Elroi Eliab shelf. Corpus is a sub-tab. Live pulls set flags
 * only after a real read. Receipt output stays a count sentence.
 * Author: Aziel Eliab. Tab name: Aziel Elroi Eliab.
 */
import assert from "node:assert/strict";
import { resetAuthorShelf, refreshAuthorShelf } from "../src/author-shelf.js";
import { orchestrate, resetInterfaceLedger } from "../src/interface-orchestrator.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

resetInterfaceLedger();
resetAuthorShelf();

const home = await (await handler(new Request(origin + "/workspace"), {})).text();
assert.match(home, /data-domain-tab="aziel-elroi-eliab"/);
assert.match(home, /id="author-shelf"/);
assert.match(home, /data-author-sub="corpus"/);
assert.match(home, /id="author-panel-corpus"/);
assert.match(home, /Ask Jeeves is suite help/);
assert.doesNotMatch(home, /data-domain-tab="corpus"/);
const software = await (await handler(new Request(origin + "/v1/software"), {})).json();
assert.equal(software.count, 42);
assert.equal(software.software.some((row) => row.slug === "jeeves"), false);
assert.ok(software.software.some((row) => row.slug === "aziel-corpus"));

const dark = await refreshAuthorShelf(async () => {
  throw new Error("down");
});
assert.equal(dark.invented, false);
assert.equal(dark.uploads_pushed, false);
assert.equal(dark.corpus_is_top_bar_domain, false);
assert.equal(dark.corpus_is_subtab, true);
assert.equal(dark.jeeves.software_tab, false);
assert.equal(dark.jeeves.softwares_card, false);
assert.equal(dark.jeeves.op, "jeeves");
assert.equal(dark.frozen, false);
assert.ok(dark.updated_at);
assert.equal(dark.corpus_searched, false);
const darkCorpus = dark.surfaces.find((row) => row.id === "corpus");
assert.equal(darkCorpus.reachable, false);
assert.equal(darkCorpus.items.length, 0);
assert.equal(darkCorpus.display_from, "local-cache");
assert.ok(darkCorpus.display_count > 0);
assert.ok(darkCorpus.display_items.every((item) => item.invented === false && item.record_id));
const darkIds = darkCorpus.display_items.map((item) => item.record_id).join(",");
const darkAgain = await refreshAuthorShelf(async () => {
  throw new Error("down");
});
const darkCorpusAgain = darkAgain.surfaces.find((row) => row.id === "corpus");
assert.equal(darkCorpusAgain.display_items.map((item) => item.record_id).join(","), darkIds);
assert.equal(darkAgain.frozen, false);
assert.ok(darkAgain.updated_at);

const titled = "Florence sample title";
const shelfFetch = async (url) => {
  const href = String(url);
  if (href.includes("library-index")) {
    return new Response(JSON.stringify({ records: [{ record_id: "AZDOC-1", title: titled, body: "secret body" }] }), { status: 200 });
  }
  if (href.includes("zenodo.org")) {
    return new Response(JSON.stringify({ hits: { hits: [{ id: "99", metadata: { title: "Paper" }, links: { html: "https://zenodo.org/records/99" } }] } }), { status: 200 });
  }
  return new Response(JSON.stringify({ cite: true }), { status: 200 });
};
const opened = await refreshAuthorShelf(shelfFetch);
assert.equal(opened.surfaces.find((row) => row.id === "zenodo").items[0].title, "Paper");
const live = await refreshAuthorShelf(shelfFetch, { query: "florence" });
const corpus = live.surfaces.find((row) => row.id === "corpus");
assert.equal(live.corpus_searched, true);
assert.equal(corpus.inventory_read, true);
assert.equal(corpus.items.length, 1);
assert.equal(corpus.items[0].record_id, "AZDOC-1");
assert.equal(corpus.items[0].body, undefined);
assert.equal(JSON.stringify(corpus.items).includes("secret body"), false);
const zenodo = live.surfaces.find((row) => row.id === "zenodo");
assert.equal(zenodo.reachable, true);
assert.equal(zenodo.inventory_read, true);
assert.equal(zenodo.items.length, 0);
assert.equal(live.shelves.papers.catalog_cites.every((row) => row.live === false && row.not_a_live_query === true), true);

const again = await refreshAuthorShelf(async (url) => {
  if (String(url).includes("library-index")) return new Response("no", { status: 503 });
  throw new Error("down");
});
const stale = again.surfaces.find((row) => row.id === "corpus");
assert.equal(stale.reachable, false);
assert.equal(stale.items.length, 0);
assert.equal(stale.display_from, "last-known");
assert.equal(stale.display_count, 1);
assert.equal(stale.display_items[0].record_id, "AZDOC-1");
assert.equal(stale.last_known.stale, true);
assert.equal(stale.last_known.item_count, 1);
assert.equal(stale.last_known.invented, false);
assert.equal(again.frozen, false);
assert.equal(again.corpus_searched, false);

async function freshLearn(input, opts) {
  resetInterfaceLedger();
  resetAuthorShelf();
  return orchestrate(input, opts);
}

let observed = 0;
const bare = await freshLearn(
  { call: "learner_learn", confirm: true },
  { observeImpl: async () => { observed += 1; return { ok: true }; } },
);
assert.equal(bare.body.memory.attempted, false);
assert.equal(bare.body.memory.reason, "no-operator-subject");
assert.equal(observed, 0);

const quiet = await freshLearn({ call: "learner_learn" });
assert.equal(quiet.body.pins_read, false);
assert.equal(quiet.body.mesh_read, false);
assert.equal(quiet.body.corpus_searched, false);
assert.equal(quiet.body.receipt.output.includes(titled), false);

const searched = await freshLearn(
  { call: "learner_learn", search_corpus: true, q: "florence" },
  {
    fetchImpl: async () => new Response(JSON.stringify({ records: [{ record_id: "AZDOC-1", title: titled, body: "secret body" }] }), { status: 200 }),
  },
);
assert.equal(searched.body.corpus_searched, true);
assert.equal(searched.body.pins_read, false);
assert.equal(searched.body.mesh_read, false);
assert.match(searched.body.receipt.output, /^Learner stored \d+ cited notes\./);
assert.equal(searched.body.receipt.output.includes(titled), false);
assert.equal(searched.body.receipt.output.includes("secret body"), false);
assert.equal(JSON.stringify(searched.body.notes).includes("secret body"), false);
assert.ok(searched.body.notes.some((note) => note.cites.some((cite) => cite.kind === "corpus" && cite.record_ids.includes("AZDOC-1"))));

const missed = await freshLearn(
  { call: "learner_learn", search_corpus: true },
  { fetchImpl: async () => { throw new Error("down"); } },
);
assert.equal(missed.body.corpus_searched, false);

const pins = await freshLearn(
  { call: "learner_learn", read_pins: true },
  {
    dispatch: async () => ({ ok: true, code: "FG-OK", result: { ok: true, cards: [{ card_id: "pin-9", mark: "full pin body" }] } }),
  },
);
assert.equal(pins.body.pins_read, true);
assert.equal(pins.body.receipt.output.includes("full pin body"), false);
assert.equal(JSON.stringify(pins.body.notes).includes("full pin body"), false);
assert.ok(pins.body.notes.some((note) => note.cites.some((cite) => cite.kind === "4dmap" && cite.pin_ids.includes("pin-9"))));

const pinsDown = await freshLearn(
  { call: "learner_learn", read_pins: true },
  { dispatch: async () => ({ ok: false, code: "FG-LAMB-REFUSE" }) },
);
assert.equal(pinsDown.body.pins_read, false);

const mesh = await freshLearn(
  { call: "learner_learn", read_mesh: true },
  { meshRead: async () => ({ ok: true, nodes: [{ node_id: "node-secret-1", product: "aznet" }] }) },
);
assert.equal(mesh.body.mesh_read, true);
assert.equal(mesh.body.receipt.output.includes("node-secret-1"), false);
assert.equal(JSON.stringify(mesh.body.notes).includes("node-secret-1"), false);
const meshCite = mesh.body.notes.find((note) => note.cites.some((cite) => cite.kind === "mesh"));
assert.equal(meshCite.cites.find((cite) => cite.kind === "mesh").count, 1);

resetInterfaceLedger();
const shelfCall = await orchestrate(
  { call: "author_shelf", q: "florence" },
  { fetchImpl: async () => new Response(JSON.stringify({ records: [{ record_id: "AZDOC-1", title: titled }] }), { status: 200 }) },
);
assert.equal(shelfCall.body.sealed, false);
assert.equal(shelfCall.body.writes_public_chain, false);
assert.match(shelfCall.body.receipt.output, /Author shelf refreshed/);
assert.equal(shelfCall.body.receipt.output.includes(titled), false);

const planned = await orchestrate({ call: "worker_plan", steps: [{ slug: "foldlock", op: "fold-preview" }] });
assert.equal(planned.status, 200);
const sealed = await orchestrate(
  { call: "seal", confirm: true, slug: "foldlock", op: "fold-preview" },
  { dispatch: async () => ({ ok: true, code: "FG-OK", result: { ok: true, handle_token: "spend-me" } }) },
);
assert.equal(sealed.body.tied_to_plan, true);
assert.equal(sealed.body.executed, true);
assert.equal(sealed.body.receipt.output.includes("spend-me"), false);

const simulated = await (await handler(new Request(origin + "/v1/author-shelf?simulate=unreachable"), {})).json();
assert.equal(simulated.simulated_down, true);
assert.equal(simulated.frozen, false);
const simulatedCorpus = simulated.surfaces.find((row) => row.id === "corpus");
assert.equal(simulatedCorpus.reachable, false);
assert.ok(simulatedCorpus.display_count > 0);
assert.equal(simulatedCorpus.invented, false);

const page = await handler(new Request(origin + "/v1/author-shelf", { method: "POST", body: "{}" }), {});
assert.equal(page.status, 405);
const refused = await page.json();
assert.equal(refused.uploads_pushed, false);

console.log("ok author shelf: Corpus is a sub-tab of Aziel Elroi Eliab; down sites still show last-known or local cache");

/**
 * CMD-PROMPT-1.0 — help lists every command prompt; softwares lists all 42.
 * Softwares desk chrome stays. GET /v1/software stays the catalog.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { listSoftwareEntries } from "../src/software-catalog.js";
import { SOFTWARE_COPY } from "../src/software-copy.js";
import { UI_DOMAINS } from "../src/ui-domains.js";
import { routeMesh } from "../src/mesh-router.js";
import { orchestrate, resetInterfaceLedger } from "../src/interface-orchestrator.js";
import { askJeevesHelp } from "../src/jeeves-desk.js";
import { guideIntent, SUITE_SOFTWARE_COUNT } from "../src/guide-reason.js";
import {
  COMMAND_PROMPTS,
  COMMAND_PROMPT_SPEC,
  matchCommand,
  softwareCommandRows,
} from "../src/command-prompts.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path) {
  return handler(new Request(origin + path, { headers: { accept: "application/json" } }), {});
}

const catalog = listSoftwareEntries(PRODUCTS, origin);
const catalogSlugs = new Set(catalog.map((card) => card.slug));
const rows = softwareCommandRows();
const domainSlugs = UI_DOMAINS.flatMap((domain) => domain.softwares);

assert.equal(COMMAND_PROMPT_SPEC, "CMD-PROMPT-1.0");
assert.equal(SUITE_SOFTWARE_COUNT, 42);
assert.equal(catalog.length, 42);
assert.equal(rows.length, 42);
assert.equal(domainSlugs.length, 42);
assert.deepEqual(rows.map((row) => row.slug).sort(), domainSlugs.slice().sort());
assert.deepEqual(rows.map((row) => row.slug).sort(), [...catalogSlugs].sort());
assert.equal(rows.some((row) => row.slug === "jeeves" || row.slug === "ask-jeeves" || row.slug === "trades-runtime"), false);
for (const row of rows) {
  assert.equal(catalogSlugs.has(row.slug), true, row.slug);
  assert.equal(row.one_line, SOFTWARE_COPY[row.slug].one_line, row.slug);
  assert.ok(row.name, row.slug);
  assert.ok(row.domain_label, row.slug);
}

assert.equal(matchCommand("help").id, "help");
assert.equal(matchCommand("?").id, "help");
assert.equal(matchCommand("commands").id, "help");
assert.equal(matchCommand("softwares").id, "softwares");
assert.equal(matchCommand("software").id, "softwares");
assert.equal(matchCommand("How do the domain tabs work?").id, "tabs");
assert.equal(matchCommand("Where is Florence?").intercept, false);
assert.equal(matchCommand("Is FoldLock healthy?"), null);
assert.equal(guideIntent("help"), "help");
assert.equal(guideIntent("softwares"), "softwares");
assert.equal(guideIntent("How do the domain tabs work?"), "domain_tabs");
assert.equal(guideIntent("Where is Florence?"), "custom");

const helpRoute = routeMesh({ question: "help", catalog });
assert.equal(helpRoute.dispatch, false);
assert.equal(helpRoute.slug, null);
assert.equal(helpRoute.invented, false);
assert.equal(helpRoute.suite_command, "help");
assert.equal(helpRoute.catalog_count, 42);
assert.equal(helpRoute.command_prompts.length, COMMAND_PROMPTS.length);
for (const prompt of COMMAND_PROMPTS) {
  assert.match(helpRoute.display.summary, new RegExp(`(?:^|\\n)${prompt.command}(?: \\(| —)`));
  assert.match(helpRoute.display.summary, new RegExp(prompt.does.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(helpRoute.display.summary, /A question that names one Software still routes/);
assert.match(helpRoute.display.summary, /not Ask Jeeves suite_help/);
assert.match(helpRoute.display.summary, /Aziel Digital Library card only/);
assert.match(helpRoute.display.summary, /do not include this list/);

const softRoute = routeMesh({ question: "softwares", catalog });
assert.equal(softRoute.dispatch, false);
assert.equal(softRoute.slug, null);
assert.equal(softRoute.invented, false);
assert.equal(softRoute.suite_command, "softwares");
assert.equal(softRoute.softwares.length, 42);
assert.equal(softRoute.ask_jeeves_is_software, false);
for (const row of softRoute.softwares) {
  assert.equal(catalogSlugs.has(row.slug), true);
  assert.match(softRoute.display.summary, new RegExp(`${row.slug}`));
  assert.match(softRoute.display.summary, new RegExp(row.one_line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.doesNotMatch(softRoute.display.summary, /\(jeeves\)|\(trades-runtime\)/);

const health = routeMesh({ question: "Is FoldLock healthy?", catalog });
assert.equal(health.slug, "foldlock");
assert.equal(health.op, "health");
assert.equal(health.dispatch, true);
assert.equal(health.invented, false);

const florence = routeMesh({ question: "Where is Florence?", catalog });
assert.equal(florence.slug, "aziel-corpus");
assert.equal(florence.invented, false);
assert.equal(florence.dispatch, true);

const named = routeMesh({ question: "4dmap", catalog });
assert.equal(named.slug, "4dmap");
assert.equal(named.invented, false);

const jeevesCmd = routeMesh({ question: "jeeves", catalog });
assert.equal(jeevesCmd.dispatch, false);
assert.equal(jeevesCmd.slug, null);
assert.equal(jeevesCmd.suite_command, "jeeves");
assert.equal(jeevesCmd.invented, false);
assert.match(jeevesCmd.display.summary, /Aziel Digital Library card only/);
assert.match(jeevesCmd.display.summary, /aziel-corpus/);
assert.match(jeevesCmd.display.summary, /software_tab false/);
assert.doesNotMatch(jeevesCmd.display.summary, /Common command prompts:/);

const intro = routeMesh({ question: "intro", catalog });
assert.equal(intro.suite_command, "intro");
assert.equal(intro.dispatch, false);
assert.match(intro.display.summary, /Ask Jeeves and AZAI Guide/);

const run = routeMesh({ question: "run", catalog });
assert.equal(run.dispatch, false);
assert.equal(run.slug, null);
assert.equal(run.suite_command, "run");
assert.match(run.display.summary, /fraggate/i);

const jeeves = await askJeevesHelp({ q: "help" }, {});
assert.equal(jeeves.software_count, 42);
assert.equal(jeeves.software_tab, false);
assert.equal(jeeves.suite_command, "help");
assert.equal(jeeves.command_prompts.length, COMMAND_PROMPTS.length);
assert.equal(jeeves.invented, false);
for (const prompt of COMMAND_PROMPTS) assert.match(jeeves.answer, new RegExp(prompt.command));

const listed = await askJeevesHelp({ q: "softwares" }, {});
assert.equal(listed.software_count, 42);
assert.equal(listed.software_tab, false);
assert.equal(listed.softwares.length, 42);
assert.equal(listed.invented, false);
for (const row of rows) assert.match(listed.answer, new RegExp(row.slug));

const tabs = await askJeevesHelp({ q: "How do the domain tabs work?" }, {});
assert.equal(tabs.topic, "domain_tabs");
assert.match(tabs.answer, /Library/);

resetInterfaceLedger();
const guided = await orchestrate({ call: "learner_guide", q: "softwares" });
assert.equal(guided.status, 200);
assert.equal(guided.body.software_count, 42);
assert.equal(guided.body.softwares.length, 42);
assert.equal(guided.body.dispatched_fraggate, false);

resetInterfaceLedger();
const asked = await orchestrate({ call: "route", q: "help", session_id: "cmd-prompts" });
assert.equal(asked.status, 200);
assert.equal(asked.body.dispatch, false);
assert.equal(asked.body.suite_command, "help");
assert.equal(asked.body.command_prompts.length, COMMAND_PROMPTS.length);
assert.equal(asked.body.executed, false);

const softwareRes = await get("/v1/software");
const software = await softwareRes.json();
assert.equal(software.count, 42);
assert.equal(software.command_prompts, undefined);
assert.equal(software.suite_command, undefined);
assert.equal(software.software.length, 42);
const library = software.software.find((card) => card.slug === "aziel-corpus");
assert.equal(library.name, "Aziel Digital Library");
assert.equal(library.suite_help.software_tab, false);
assert.equal(library.suite_help.slug, "jeeves");
assert.equal(library.suite_help.parent_slug, "aziel-corpus");
assert.equal(software.software.filter((card) => card.suite_help).length, 1);
assert.equal(software.software.some((card) => card.command_prompts || card.suite_command), false);

const mirrorRes = await get("/v1/fraggate/software");
const mirror = await mirrorRes.json();
assert.equal(mirror.count, 42);
assert.equal(mirror.software.length, 42);
assert.equal(mirror.command_prompts, undefined);
assert.equal(mirror.suite_command, undefined);
assert.equal(mirror.software.filter((card) => card.suite_help).map((card) => card.slug).join(","), "aziel-corpus");

assert.equal(PUBLIC_MCP_TOOLS.length, 36);

const helpTxt = await (await handler(new Request(origin + "/help.txt"), {})).text();
const llms = await (await handler(new Request(origin + "/llms.txt"), {})).text();
const skill = await (await handler(new Request(origin + "/v1/skill"), {})).text();
const fraggate = await (await handler(new Request(origin + "/help/fraggate.txt"), {})).text();
for (const text of [helpTxt, llms, skill]) {
  assert.match(text, /## Command prompts/);
  assert.match(text, /CMD-PROMPT-1\.0/);
  for (const prompt of COMMAND_PROMPTS) assert.match(text, new RegExp(`- ${prompt.command}(?: \\(| —)`));
}
assert.match(fraggate, /help lists every command prompt/);
assert.match(fraggate, /softwares lists every Software/);

const home = await (await handler(new Request(origin + "/"), {})).text();
assert.match(home, /id="suite-commands"/);
assert.match(home, /data-q="help"/);
assert.match(home, /data-q="softwares"/);
assert.match(home, /id="dash-softwares"/);
assert.ok(home.indexOf('id="dash-softwares"') < home.indexOf('id="interface-chat"'));
const desk = home.slice(home.indexOf('id="dash-softwares"'), home.indexOf('id="interface-panel"'));
assert.doesNotMatch(desk, /id="if-ask"|id="suite-commands"/);
const fold = home.slice(home.indexOf('data-dash-slug="foldlock"'), home.indexOf('data-dash-slug="foldlock"') + 1400);
assert.match(fold, /class="dash-card/);
assert.match(fold, /class="dash-run"/);
assert.doesNotMatch(fold, /suite-commands|command-prompts/);

console.log("ok command prompts: help lists the set, softwares lists 42, routes stay, desk frozen");

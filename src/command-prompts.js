/**
 * One command-prompt set for Ask Jeeves, AZAI Guide, the suite ask bar,
 * FragGate help, /llms.txt, and the runtime skill.
 *
 * help lists every prompt. softwares lists every Software on this build.
 * A question that names one Software still routes to that Software.
 * GET /v1/software stays the catalog. This module does not add a card.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { FIRST_CALL_PATH, START_HERE_LINE } from "./start-here.js";
import { SOFTWARE_COPY } from "./software-copy.js";
import { SOFTWARE_FAQ_NAMES } from "./softwares-faq.js";
import { UI_DOMAINS } from "./ui-domains.js";

export const COMMAND_PROMPT_SPEC = "CMD-PROMPT-1.0";

/**
 * intercept false: the short name still follows the existing route
 * (shelf search, or the Software itself when the ask bar names that slug).
 */
export const COMMAND_PROMPTS = Object.freeze([
  {
    id: "help",
    command: "help",
    aliases: ["commands", "?"],
    does: "List every common command prompt and the first-call path (Softwares, then FragGate, then library_lookup). This prompt is not Ask Jeeves suite_help.",
    intent: "help",
    starter: true,
    label: "help",
  },
  {
    id: "softwares",
    command: "softwares",
    aliases: ["software"],
    does: "List every Software on this build with name, slug, domain tab, and one-line.",
    intent: "softwares",
    starter: true,
    label: "softwares",
  },
  {
    id: "florence",
    command: "florence",
    aliases: [],
    q: "Where is Florence?",
    does: "Ask the shelf where Florence is.",
    intent: null,
    intercept: false,
    starter: true,
    label: "Library: Florence",
  },
  {
    id: "tabs",
    command: "tabs",
    aliases: ["domains"],
    q: "How do the domain tabs work?",
    does: "Explain the domain tabs and which Softwares sit on each.",
    intent: "domain_tabs",
    starter: true,
    label: "Domain tabs",
  },
  {
    id: "corpus",
    command: "corpus",
    aliases: [],
    q: "Where is the Corpus sub-tab?",
    does: "Explain the Corpus sub-tab under Aziel Elroi Eliab.",
    intent: "corpus_subtab",
    starter: true,
    label: "Corpus sub-tab",
  },
  {
    id: "receipts",
    command: "receipts",
    aliases: ["dry_run"],
    q: "How do receipts and dry_run work?",
    does: "Explain receipts, the confirm box, and dry_run.",
    intent: "receipts",
    starter: true,
    label: "Receipts",
  },
  {
    id: "run",
    command: "run",
    aliases: ["fraggate"],
    q: "How do I run a Softwares card?",
    does: "Explain how to run a Softwares card through FragGate.",
    intent: "fraggate",
    starter: true,
    label: "FragGate Run",
  },
  {
    id: "mesh",
    command: "mesh",
    aliases: [],
    does: "Point at mesh awareness. This command does not join a node.",
    intent: "mesh",
  },
  {
    id: "version",
    command: "version",
    aliases: ["build"],
    does: "Name this build and the Softwares count.",
    intent: "version",
  },
  {
    id: "version_id",
    command: "version_id",
    aliases: [],
    does: "Report the published Worker version id when this path has one.",
    intent: "version_id",
  },
  {
    id: "count",
    command: "count",
    aliases: [],
    does: "State the Softwares count. Ask Jeeves is not one of those cards.",
    intent: "software_count",
  },
  {
    id: "jeeves",
    command: "jeeves",
    aliases: [],
    does: "Explain Ask Jeeves suite help on the Aziel Digital Library card only.",
    intent: "jeeves",
  },
  {
    id: "intro",
    command: "intro",
    aliases: [],
    does: "Walk the first clicks. Ask Jeeves and AZAI Guide are the coaches.",
    intent: "intro",
  },
  {
    id: "guide",
    command: "guide",
    aliases: [],
    does: "Explain AZAI Guide. Guide does not write memory.",
    intent: "guide",
  },
  {
    id: "4dmap",
    command: "4dmap",
    aliases: [],
    does: "Point at 4DMap on the Forensics tab.",
    intent: "4dmap",
    intercept: false,
  },
  {
    id: "start",
    command: "start",
    aliases: ["start here"],
    does: "Show the start-here line.",
    intent: "start",
  },
  {
    id: "skill",
    command: "skill",
    aliases: [],
    does: "Point at the runtime skill markdown.",
    intent: "skill",
  },
  {
    id: "mcp",
    command: "mcp",
    aliases: [],
    does: "Point at the MCP surface. tools/list stays 36.",
    intent: "mcp",
  },
]);

function normalizeCommand(text) {
  let raw = String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!raw || /[\r\n]/.test(raw) || raw.length > 120) return "";
  if (raw === "?") return "help";
  return raw.replace(/[.?!]+$/g, "").trim();
}

export function matchCommand(text) {
  const n = normalizeCommand(text);
  if (!n) return null;
  for (const row of COMMAND_PROMPTS) {
    if (n === row.command) return row;
    for (const alias of row.aliases || []) {
      if (n === String(alias).toLowerCase()) return row;
    }
    if (row.q && n === normalizeCommand(row.q)) return row;
  }
  return null;
}

export function commandPromptViews() {
  return COMMAND_PROMPTS.map((row) => ({
    id: row.id,
    command: row.command,
    aliases: (row.aliases || []).slice(),
    does: row.does,
    starter: row.starter === true,
    answers_in_place: row.intercept !== false,
  }));
}

export function softwareCommandRows() {
  const rows = [];
  for (const domain of UI_DOMAINS) {
    for (const slug of domain.softwares) {
      const copy = SOFTWARE_COPY[slug];
      rows.push({
        slug,
        name: SOFTWARE_FAQ_NAMES[slug] || slug,
        domain: domain.id,
        domain_label: domain.label,
        one_line: copy && copy.one_line ? String(copy.one_line) : "",
      });
    }
  }
  return rows;
}

export function commandPromptAnswer() {
  const lines = COMMAND_PROMPTS.map((row) => {
    const alias = row.aliases && row.aliases.length ? ` (${row.aliases.join(", ")})` : "";
    return `${row.command}${alias} — ${row.does}`;
  });
  const count = softwareCommandRows().length;
  return [
    "Common command prompts:",
    ...lines,
    "A question that names one Software still routes to that Software. These commands answer in place.",
    FIRST_CALL_PATH,
    "That path is help text. It is not written onto Softwares desk cards and it is not a field on GET /v1/software.",
    `Softwares count is ${count}. This list is the command prompt set. It is not Ask Jeeves suite_help.`,
    "Ask Jeeves suite_help stays on the Aziel Digital Library card only (aziel-corpus, software_tab false). The jeeves prompt explains that card.",
    "MCP Softwares {} and GET /v1/software stay the 42-card catalog. They do not include this list. tools/list stays 36. Author Aziel Eliab only.",
  ].join("\n");
}

export function softwareCommandAnswer(rows) {
  const list = Array.isArray(rows) ? rows : softwareCommandRows();
  const lines = list.map((row) => {
    const purpose = row.one_line || "No catalog one_line is published for that slug.";
    return `${row.name} (${row.slug}) — ${row.domain_label} — ${purpose}`;
  });
  return [
    `Softwares on this build: ${list.length}. Ask Jeeves is not one of them.`,
    ...lines,
    "Open the domain tab, then the card. FragGate stays the single door.",
    "Next call is fraggate_call with the slug. library_lookup is for library papers and cites.",
    "MCP Softwares {} and GET /v1/software return these same cards and do not include command prompts. Author Aziel Eliab only.",
  ].join("\n");
}

export function startCommandAnswer() {
  return `${START_HERE_LINE} Author Aziel Eliab only.`;
}

export function skillCommandAnswer() {
  return "The runtime skill is how-to markdown at GET /v1/skill. It carries this same command-prompt set. Softwares cards stay on GET /v1/software. Author Aziel Eliab only.";
}

export function mcpCommandAnswer() {
  return "MCP is POST /mcp. tools/list stays 36. First call is Softwares (pick a slug), then fraggate_call. library_lookup is for library papers and cites. The door runs first. Diagnostics stay fraggate_list, fraggate_describe, and fraggate_call. Author Aziel Eliab only.";
}

export function jeevesCommandAnswer() {
  return [
    "Ask Jeeves is suite help on the Aziel Digital Library card only (slug aziel-corpus, software_tab false, FragGate op jeeves).",
    "That field is not the help command and it is not a Softwares card.",
    "help lists every command prompt. softwares lists every Software.",
    "Author Aziel Eliab only.",
  ].join(" ");
}

export function guideCommandAnswer(version) {
  const build = version ? ` ${version}` : "";
  return `AZAI Guide is the coach on the AI tab for this${build} build. Lamb Lens runs first (Service, then Clarity, then Peace), then the public shelf and the Library tab. Guide does not write memory. Learn still needs the confirm box. Ask Jeeves is the other coach and stays suite help, software_tab false. Author Aziel Eliab only.`;
}

/** Shared plain-text block for /help.txt, /llms.txt, and the runtime skill. */
export function commandPromptsBlock() {
  const lines = [
    "## Command prompts",
    "",
    `Spec: ${COMMAND_PROMPT_SPEC}`,
    "One set for Ask Jeeves, AZAI Guide, the suite ask bar, FragGate help, /llms.txt, and the runtime skill.",
    "help lists every command below. softwares lists every Software with a one-line identity.",
    FIRST_CALL_PATH,
    "That path is help text. It is not written onto Softwares desk cards and it is not a field on GET /v1/software.",
    "help is this command list. It is not Ask Jeeves suite_help.",
    "Ask Jeeves suite_help stays on the Aziel Digital Library card (aziel-corpus) only.",
    "A question that names one Software still routes to that Software.",
    "MCP Softwares {} and GET /v1/software stay the Softwares catalog. They do not include this list.",
    "",
  ];
  for (const row of COMMAND_PROMPTS) {
    const alias = row.aliases && row.aliases.length ? ` (${row.aliases.join(", ")})` : "";
    lines.push(`- ${row.command}${alias} — ${row.does}`);
  }
  lines.push("");
  return lines.join("\n");
}

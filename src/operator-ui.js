/**
 * Operator UI for AZOS and the runtime doors.
 * One primary action, quiet secondary paths, text inputs only where a person types.
 * Author: Aziel Eliab.
 */

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function form(slug, op, label, fields = "", kind = "quiet") {
  return `<form method="POST" action="/operator">
    <input type="hidden" name="slug" value="${esc(slug)}">
    <input type="hidden" name="op" value="${esc(op)}">
    ${fields}
    <button class="${kind === "primary" ? "primary" : "quiet"}" type="submit">${esc(label)}</button>
  </form>`;
}

function hidden(name, value) {
  return `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`;
}

function textField(name, label, value = "") {
  return `<label>${esc(label)} <input name="${esc(name)}" type="text" value="${esc(value)}" autocomplete="off"></label>`;
}

function fold(title, body) {
  return `<details class="fold"><summary>${esc(title)}</summary><div class="fold-body">${body}</div></details>`;
}

function statusText(result) {
  if (!result) return "Not an OS yet";
  if (Array.isArray(result.modes) && result.modes.length) {
    return result.modes.map((row) => row && row.line).filter(Boolean).join(" ");
  }
  if (result.line) return String(result.line);
  if (result.banner) return String(result.banner);
  if (result.code && result.ok === false) return String(result.code);
  if (result.engine) return String(result.engine);
  if (result.status) return String(result.status);
  if (result.ok === false) return "refused";
  return "ok";
}

function cellularWord(result) {
  if (result && result.op === "cellular" && result.status) return String(result.status);
  return "pending";
}

function ipWord(result) {
  if (result && result.op === "ip_mask" && result.status) return String(result.status);
  return "Not masked";
}

export function operatorPageHtml(origin, result) {
  const base = String(origin || "").replace(/\/$/, "");
  const lattice = result && result.lattice_receipt ? result.lattice_receipt : null;
  const receiptLine = !lattice
    ? "Receipt: missing"
    : lattice.missing
      ? "Receipt: missing"
      : lattice.chained
        ? "Receipt: present, chained"
        : lattice.present
          ? "Receipt: present, not chained"
          : "Receipt: missing";
  const status = esc(statusText(result));
  const cellular = esc(cellularWord(result));
  const ip = esc(ipWord(result));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AZOS</title>
  <style>
    :root {
      color-scheme: light dark;
      --paper: #f6f4ef;
      --ink: #1c1b19;
      --muted: #5e5a54;
      --line: #e3ddd3;
      --card: #fffcf8;
      --fill: #24312b;
      --fill-ink: #f7f4ee;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --paper: #141311;
        --ink: #f3efe8;
        --muted: #b7b0a6;
        --line: #2c2a26;
        --card: #1c1b18;
        --fill: #efe8dc;
        --fill-ink: #1c1b19;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font: 1.0625rem/1.6 "Segoe UI", system-ui, sans-serif;
    }
    main {
      max-width: 36rem;
      margin: 0 auto;
      padding: 1.75rem 1.25rem 3rem;
    }
    a.back {
      color: var(--muted);
      text-decoration: none;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    h1 {
      font-size: 2rem;
      font-weight: 560;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin: 0.25rem 0 0.75rem;
    }
    .lede, .honesty p, footer {
      margin: 0;
      color: var(--muted);
    }
    .lede { max-width: 34rem; }
    #status {
      margin: 1.5rem 0;
      padding: 1rem 1.1rem;
      background: var(--card);
      border-radius: 1rem;
    }
    #status .receipt { display: block; font-weight: 650; color: var(--ink); }
    #status .detail { display: block; margin-top: 0.35rem; }
    .honesty {
      display: grid;
      gap: 0.65rem;
      margin: 0 0 1.75rem;
    }
    .honesty p { font-size: 1rem; }
    .honesty strong { color: var(--ink); font-weight: 650; }
    form { margin: 0; }
    button {
      font: inherit;
      min-height: 44px;
      min-width: 44px;
      cursor: pointer;
    }
    button.primary {
      display: block;
      width: 100%;
      margin: 0 0 0.5rem;
      padding: 0.9rem 1.1rem;
      border: 0;
      border-radius: 0.9rem;
      background: var(--fill);
      color: var(--fill-ink);
      font-weight: 650;
    }
    button.quiet {
      display: block;
      width: 100%;
      margin: 0;
      padding: 0.55rem 0;
      border: 0;
      background: transparent;
      color: var(--ink);
      text-align: left;
    }
    label {
      display: block;
      margin: 0.85rem 0 0.35rem;
      color: var(--muted);
    }
    input[type="text"] {
      display: block;
      width: 100%;
      margin-top: 0.35rem;
      padding: 0.7rem 0.8rem;
      border: 1px solid var(--line);
      border-radius: 0.7rem;
      background: var(--card);
      color: var(--ink);
      font: inherit;
      min-height: 44px;
    }
    .fold { border-top: 1px solid var(--line); }
    .fold:last-of-type { border-bottom: 1px solid var(--line); }
    summary {
      min-height: 48px;
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: 650;
      list-style: none;
    }
    summary::-webkit-details-marker { display: none; }
    .fold-body { padding: 0 0 1rem; }
    .folds { margin-top: 1.75rem; }
    footer { margin-top: 2rem; font-size: 0.95rem; }
    @media (max-width: 22rem) {
      main { padding: 1.25rem 1rem 2.5rem; }
      h1 { font-size: 1.7rem; }
    }
  </style>
</head>
<body>
<main>
  <a class="back" href="${esc(base)}/">Back</a>
  <h1>AZOS</h1>
  <p class="lede">Jeeves is a helper, not the owner. This device and its choices belong to you. Jeeves will ask before it changes anything.</p>
  <p id="status" role="status"><span class="receipt">${receiptLine}</span><span class="detail">${status}</span></p>
  <section class="honesty" aria-label="Honest state">
    <p><strong>Not an OS yet</strong>. A browser tab is not the OS. The phone web app and the bootstrap wrap are not the OS.</p>
    <p>Guardian: <strong>On</strong>. It audits this operator's own requests on this machine. It cannot be turned off.</p>
    <p>Internet base: <strong>present, not live</strong></p>
    <p>Internet base is present. Not live.</p>
    <p>Mail send base: <strong>present</strong>. Public send stays refused.</p>
    <p>Kernel base: <strong>present, not booted</strong></p>
    <p>The kernel base is present. It has not booted a machine.</p>
    <p>The packet path is not live. The alternative internet is not live.</p>
    <p>Device-to-device packet carriers stay NOT-READY. WARN-5 stands.</p>
    <p>WireGuard, OpenVPN, L3, kernel UDP, and TUN-TAP stay SLOT.</p>
    <p>VeilLock stays local_only. Whitestone is worker-only and has no public door.</p>
    <p>Public smtp_send stays refused.</p>
    <p>IP: <strong>${ip}</strong></p>
    <p>Cellular: <strong>${cellular}</strong>. No radio reads as Absent.</p>
    <p>Scanner, mesh, flash, and camera: <strong>pending</strong></p>
    <p>Human check: <strong>Stop</strong>. This site wants to check that you're a person. Please do this part yourself.</p>
  </section>
  ${form("azos", "mode_list", "Get started", "", "primary")}
  ${form("azos", "mode_list", "What is AZOS?")}
  <div class="folds">
  ${fold("Boot", `
    <p>Not an OS yet. The kernel base is present. It has not booted a machine.</p>
    ${form("azos", "boot_path", "Boot path")}
    ${form("azos", "internet_base", "Internet base")}
  `)}
  ${fold("Guardian", `
    <p>Guardian: On. Always on. It does not watch other people.</p>
    ${form("azos", "guardian", "Guardian: On")}
  `)}
  ${fold("Pick a mode", `
    <p>Not an OS yet. These modes do not boot a machine from this repo.</p>
    ${form("azos", "download_list", "Server", hidden("mode", "server"))}
    ${form("azos", "download_list", "Bootstrap OS", hidden("mode", "bootstrap"))}
    ${form("azos", "download_list", "Full install", hidden("mode", "install"))}
    ${form("azos", "mode_list", "Next")}
    <p><a class="back" href="${esc(base)}/operator">Back</a></p>
  `)}
  ${fold("What will download", `
    ${form("azos", "download_list", "Download all", hidden("mode", "server"))}
    ${form("azos", "download_check", "Show details", hidden("mode", "server"))}
  `)}
  ${fold("Phone", `
    <p>The phone web app and the bootstrap wrap are not the OS. A flashed phone is not the OS.</p>
    ${form("azos", "phone_path", "Try again")}
    ${form("azos", "phone_path", "Pick my phone myself")}
    ${form("azos", "phone_path", "Use bootstrap app (keeps everything)")}
    ${form("azos", "phone_path", "Flash AZOS (erases phone)", textField("model", "Type the phone model to confirm"))}
    ${form("azos", "phone_path", "Erase and flash", textField("model", "Type the phone model to confirm"))}
  `)}
  ${fold("Cellular", `
    ${form("azos", "cellular", "Check all now")}
    ${form("azos", "cellular", "Check now")}
    ${form("azos", "sim_lockout", "Lock out SIM", hidden("on", "true"))}
    ${form("azos", "sim_lockout", "Cancel")}
    ${form("azos", "sim_lockout", "Use SIM again", hidden("on", "false"))}
  `)}
  ${fold("IP masking", `
    ${form("azos", "ip_mask", "Check now", hidden("mode", "server") + hidden("direct", "true"))}
    ${form("azos", "ip_mask", "Why?")}
  `)}
  ${fold("VeilLock", `
    ${form("azos", "veillock", "Turn off")}
    ${form("azos", "veillock", "Open phone settings")}
    ${form("veillock", "veil_status", "Camera: Off")}
    ${form("veillock", "screen_share", "Screen share: Off")}
  `)}
  ${fold("AZ Call", form("azos", "azcall", "AZ Call"))}
  ${fold("AZChat", `
    ${form("azchat", "channel_seal", "Seal AZChat channel")}
    ${form("azchat", "bridge_status", "Bridge status")}
    ${form("azchat", "malware_sweep", "Malware sweep", textField("text", "Text to scan"))}
    ${form("azchat", "airgap", "Airgap", textField("text", "Text to airgap"))}
  `)}
  ${fold("AZMail", `
    ${form("azmail", "health", "AZMail health")}
    ${form("azmail", "mail_send_base", "Mail send base", `${textField("to", "Recipient")}${hidden("confirm", "true")}${hidden("from", "operator@azmail.local")}${hidden("subject", "note")}${hidden("text", "hello")}`)}
    ${form("azmail", "malware_sweep", "Malware sweep")}
    ${form("azmail", "airgap", "Airgap", hidden("text", "hello"))}
  `)}
  ${fold("AZ Browser", `
    ${form("azbrowser", "airgap", "Airgap", hidden("text", "notes"))}
    ${form("azbrowser", "malware_sweep", "Malware sweep", hidden("text", "notes"))}
    ${form("azbrowser", "jeeves_site", "Ask", `${textField("text", "What should Jeeves change")}${hidden("asked", "true")}`)}
    ${form("azbrowser", "human_check", "I'm done, continue", textField("text", "Page text"))}
    ${form("azbrowser", "human_check", "Stop", hidden("text", "are you a robot"))}
  `)}
  ${fold("AZAI and AZclicker", `
    ${form("azai", "conversation", "Chat", textField("q", "Question"))}
    ${form("azai", "agent", "Agent", textField("q", "Task"))}
    ${form("azai", "azclicker", "AZclicker", textField("q", "Coding question"))}
    ${form("azai", "engine_status", "Engine status")}
    ${form("azai", "attach", "Attach file", textField("text", "File text"))}
    ${form("azai", "crawl", "Crawl", `${textField("url", "URL")}${hidden("asked", "true")}`)}
    ${form("azai", "receipt_learn", "Learn receipts")}
    ${form("azai", "human_check", "Stop", hidden("text", "captcha"))}
    ${form("azai", "score_gate", "Score check", `${textField("claim", "Claim")}${textField("source", "Source")}`)}
    ${form("azai", "cap7_lookup", "Cap-7 name", textField("name", "Cap-7 name"))}
    ${form("azai", "corpus_note", "Corpus note", `${textField("published", "Published text")}${textField("note", "Note beside it")}`)}
  `)}
  </div>
  <footer>Author: Aziel Eliab</footer>
</main>
</body>
</html>`;
}

export function operatorPayload(form) {
  const src = {};
  for (const [key, value] of form.entries()) {
    if (key === "slug" || key === "op") continue;
    if (value === "true") src[key] = true;
    else if (value === "false") src[key] = false;
    else src[key] = value;
  }
  return src;
}

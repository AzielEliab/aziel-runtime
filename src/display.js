/**
 * Display-ready result envelope for the agent software surface.
 *
 * Agents show display.action / display.title / display.summary / display.fields
 * in the AI client, then take the next input. Human framing is
 * "Run aziel runtime" plus the product verb title. Do not echo raw tool names.
 * Structured `result` stays for machines. Image cards come only from real
 * productions (png_b64 / jpeg_b64 / a cited image URL). dry_run does not
 * mint a reviewed image.
 * Receipts stay optional — session plumbing is invisible unless asked for.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const ADVANCED_PREFIX = "[advanced/internal]";

/** Human-visible run frame. Product verb titles stay on display.title. */
export const RUN_ACTION = "Run aziel runtime";

const IMAGE_BYTE_KEYS = ["png_b64", "residual_png_b64", "jpeg_b64", "jpg_b64", "webp_b64", "gif_b64"];

const IMAGE_URL_KEYS = {
  image_url: "",
  png_url: "image/png",
  jpeg_url: "image/jpeg",
  jpg_url: "image/jpeg",
  cited_image_url: "",
  image_href: "",
};

/** Request echoes and prose. Never treat these as a production image. */
const IMAGE_SKIP_WALK = new Set([
  "payload",
  "would",
  "args",
  "arguments",
  "input",
  "claim",
  "proposal",
  "ground",
  "display",
  "markdown",
  "skill",
  "html",
]);

const TITLE_OVERRIDES = {
  "godlock:score": "Score a GodLock submission",
  "godlock:submit": "Submit text to GodLock",
  "foldlock:fold-preview": "Fold text with FoldLock",
  "foldlock:unfold-preview": "Unfold a FoldLock preview",
  "foldlock:pack-verify": "Verify the FoldLock corpus tip",
  "decisiongate:check": "Run DecisionGATE on a proposal",
  "decisiongate:evaluate": "Run DecisionGATE on a proposal",
  "decisiongate:gates": "List DecisionGATE sequential gates",
  "decisiongate:verify": "Verify a DecisionGATE lineage",
  "decisiongate:doctor": "Check liveness of DecisionGATE",
  "azclce:score": "Score an AZ-CLCE triad",
  "azclce:classify": "Classify an AZ-CLCE triad",
  "azclce:gate": "Gate an AZ-CLCE triad",
  "azcoherence:health": "Check liveness of AZCoherence",
  "azcoherence:skill": "Read the AZCoherence skill",
  "azcoherence:doctor": "Check liveness of AZCoherence",
  "azcoherence:verify": "Verify an AZCoherence receipt",
  "azcoherence:review_triad": "Review a triad with AZCoherence",
  "azcoherence:alternate_score": "Score an alternate triad path",
  "azcoherence:coherence_check": "Check triad coherence with AZCoherence",
  "azcoherence:neutralize_hallucination": "Neutralize a scoring hallucination (advisory)",
  "azai:guide": "Ask AZAI Guide",
  "azai:learner_guide": "Ask AZAI Guide",
  "azai:ask": "Ask AZAI Guide",
  "azai:lamb-check": "Run an AZAI Lamb check",
  "azai:lamb_check": "Run an AZAI Lamb check",
  "azai:models": "List AZAI protocol-mirror models",
  "azai:skill": "Read how to use AZAI",
  "azai:doctor": "Check liveness of AZAI",
  "azai:health": "Check liveness of AZAI",
  "azos:invite": "Read the AZ-OS invite",
  "azos:principles": "Read AZ-OS principles",
  "codelock:gate-status": "Read CodeLock gate status",
  "vibelock:detect": "Detect VibeLock audio risk",
  "glossafilter:peers": "List Glossa Filter peers",
  "azbot:example": "Show an AZBot example route",
  "shadowlock:hook": "Take a ShadowLock ethics receipt",
  "miragegrid:verify-receipt": "Verify a MirageGrid receipt",
  "miragegrid:bridge": "Cite Cap-7 mesh-name metadata",
  "miragegrid:shuffle": "Land one Cap-7 site in the update shuffle",
  "miragegrid:nodes": "List MirageGrid nodes",
  "azieltether:tip": "Read the AzielTether chain tip",
  "azieltether:dual-chain": "Detect an AzielTether dual-chain",
  "azieltether:reconcile": "Reconcile AzielTether receipts",
  "azieltether:pulse": "Pulse AzielTether receipts",
  "azieltether:peer-preview": "Preview AzielTether peer hashes",
  "azmail:mailbox_open": "Open an AZMail isolate mailbox",
  "azmail:notice_post": "Post an AZMail worker notice",
  "azmail:mail_post": "Scan and seal AZMail, or send ordinary SMTP",
  "azmail:inbox_pull": "Pull the AZMail caller inbox",
  "azmail:ack": "Acknowledge an AZMail item",
  "azmail:verify_receipt": "Verify an AZMail receipt",
  "azmail:import_export": "Import or export AZMail JSON",
  "azmail:transport_status": "Read AZMail scan, airgap, and SMTP honesty",
  "aziel-corpus:review": "Review an Aziel Corpus sample or posted record",
  "aziel-corpus:score": "Score an Aziel Corpus record",
  "aziel-corpus:verify-backfill": "Verify Aziel Corpus sample hashes",
  "aziel-corpus:verify-geo": "Verify an Aziel Corpus sample place",
  "aziel-corpus:document-chain": "Hash-chain Aziel Corpus documents",
  "aziel-corpus:import_export": "Import or export Aziel Corpus JSON",
  "aziel-corpus:tip-pack": "Open the FoldLock Aziel Corpus tip",
  "azbrowser:sandbox_status": "Read AZBrowser sandbox / Browser Rendering status",
  "azbrowser:sandbox_render": "Attempt a binding-gated AZBrowser sandbox render",
  "azchat:handle_new": "Mint an AZChat handle",
  "azchat:handle_rotate": "Rotate an AZChat handle",
  "azchat:room_open": "Open an AZChat room",
  "azchat:room_post": "Post in an AZChat room",
  "azchat:room_pull": "Pull an AZChat room",
  "azchat:bus_send": "Send an AZChat bus frame",
  "azchat:bus_poll": "Poll the AZChat bus",
  "azchat:verify_receipt": "Verify an AZChat receipt",
  "azchat:import_export": "Import or export AZChat JSON",
  "whistlelock:hash_put": "Put WhistleLock bytes in the isolate hash store",
  "trajectorylock:hash_put": "Put TrajectoryLock media in the isolate hash store",
  "forgereceipts:receipt": "Build a ForgeReceipts receipt",
  "forgereceipts:verify": "Verify a ForgeReceipts receipt",
  "forgereceipts:import_export": "Import or export a ForgeReceipts receipt",
  "forgereceipts:doctor": "Check liveness of ForgeReceipts",
  "temporallock:genesis": "Start a TemporalLock chain",
  "temporallock:append": "Append a TemporalLock receipt",
  "temporallock:verify": "Verify a TemporalLock chain",
  "temporallock:timeslate": "Bind a TemporalLock timeslate",
  "temporallock:gate": "Gate a payload onto TemporalLock",
  "temporallock:import_export": "Import or export a TemporalLock chain",
  "temporallock:doctor": "Check liveness of TemporalLock",
  "zsolver:score": "Score ZionPattern Solver answers",
  "zsolver:patterns": "List ZionPattern Solver patterns",
  "ark:sweep": "Sweep with The ARK",
  "spectrallock:overlay": "Preview a SpectralLock overlay (wheel paint separate from the triad; inject ON/OFF)",
  "spectrallock:modes": "List SpectralLock overlay modes and the live pigment door",
  "spectrallock:targets": "List SpectralLock overlay targets",
  "spectrallock:pigment": "Restore lost pigment where pixels still carry the signal",
  "spectrallock:restore-pigment": "Restore lost pigment (alias of pigment)",
  "spectrallock:verify": "Verify a SpectralLock overlay hash",
  "spectrallock:doctor": "Check liveness of SpectralLock (wheel paint, live pigment restore, AMOE not a live product)",
  "employeelock:append-preview": "Preview an EmployeeLock log row",
  "employeelock:verify-canonical": "Verify EmployeeLock canonical JSON",
  "whistlelock:hash-preview": "Hash bytes in WhistleLock",
  "whistlelock:canon-preview": "Hash a WhistleLock ledger row",
  "trajectorylock:analyze": "Analyze a TrajectoryLock case",
  "trajectorylock:verify": "Verify a TrajectoryLock result hash",
  "trajectorylock:schema": "Read the TrajectoryLock case schema",
  "trajectorylock:import_export": "Import or export a TrajectoryLock case",
  "trajectorylock:doctor": "Check liveness of TrajectoryLock",
  "mialock:doe-match": "Rank M.I.A.Lock Doe leads",
  "mialock:queries": "Render M.I.A.Lock search queries",
  "azieltether:verify": "Verify AzielTether package receipts",
  "peacelock:doctor": "Check liveness of PeaceLock",
  "peacelock:open": "Open a PeaceLock lattice",
  "peacelock:seal": "Seal chosen silence or inaction",
  "peacelock:break": "Break a PeaceLock seal",
  "peacelock:show": "Show a PeaceLock lattice",
  "peacelock:verify": "Verify a PeaceLock lattice",
  "peacelock:stamp": "Stamp a PeaceLock file-hash envelope",
  "peacelock:upload_envelope": "Upload a PeaceLock file-hash envelope",
  "azmail:classify": "Classify text with AZMail airlock",
  "azmail:airlock_classify": "Classify text with AZMail airlock",
  "azmail:scrub": "Scrub text with AZMail airlock",
  "azmail:trust_score": "Score trust with AZMail airlock",
  "azmail:mesh_post": "Post to the AZMail anonymous mesh",
  "azmail:mesh_poll": "Poll the AZMail anonymous mesh",
  "azmail:mesh_listen": "Listen on the AZMail anonymous mesh",
  "azmail:mesh_enable": "Enable the AZMail mesh",
  "azmail:mesh_disable": "Disable the AZMail mesh",
  "azmail:keyword_alert_set": "Set AZMail keyword alerts",
  "azmail:keyword_alert_list": "List AZMail keyword alerts",
  "azmail:keyword_alert_check": "Check AZMail keyword alerts",
  "azbrowser:ethical_search": "Search ethically with AZBrowser Lamb Lens",
  "azbrowser:lamb_lens_search": "Search ethically with AZBrowser Lamb Lens",
  "azbrowser:navigate": "Navigate with AZBrowser (advisory metadata)",
  "azbrowser:airlock": "Airlock ingest with AZBrowser",
  "azbrowser:home": "Check liveness of AZBrowser",
  "azbrowser:airlock_ingest": "Airlock ingest with AZBrowser",
  "azbrowser:tab_open": "Open an AZBrowser tab",
  "azbrowser:tab_list": "List AZBrowser tabs",
  "azbrowser:receipt_list": "List AZBrowser receipts",
  "azbrowser:verify": "Verify an AZBrowser receipt",
  "azbrowser:receipt_verify": "Verify an AZBrowser receipt",
  "aznet:doctor": "Check liveness of AZNet",
  "aznet:pair": "Check AZNet pairing with AZBrowser",
  "aznet:pair_status": "Check AZNet pairing with AZBrowser",
  "aznet:garden_list": "List the AZNet garden of hash refs",
  "aznet:stamp": "Stamp an AZNet hash ref",
  "aznet:verify_hash": "Verify an AZNet hash ref",
  "aznet:memorial_list": "List the AZNet memorial ledger",
  "aznet:memorial_append": "Append a terminal AZNet memorial",
  "aznet:receipt_verify": "Verify an AZNet receipt chain",
  "aznet:name_claim": "Claim a FED-MESH .aziel name",
  "aznet:name_read": "Read a FED-MESH .aziel name",
  "aznet:name_resolve": "Resolve a FED-MESH .aziel name",
  "aznet:slot_read": "Read FED-MESH name slots",
  "aznet:witness": "Witness a FED-MESH name",
  "aznet:witness_read": "Read FED-MESH name witnesses",
  "azbrowser:vpn": "Auto-bind AZVPN from AZBrowser",
  "azvpn:describe": "Describe the AZVPN concentrator",
  "azvpn:open": "Open an AZVPN concentrator session",
  "azvpn:status": "Read an AZVPN concentrator session",
  "azvpn:list": "List AZVPN concentrator sessions",
  "azvpn:close": "Close an AZVPN concentrator session",
  "azvpn:send": "Send an AZVPN envelope",
  "azvpn:recv": "Receive AZVPN envelopes",
  "azvpn:pull": "Pull AZVPN envelopes",
  "azvpn:peers": "List AZVPN peers",
  "azvpn:attach": "Attach an AZVPN WebSocket ticket",
  "azvpn:limitation": "Read AZVPN REAL/SLOT honesty",
  "azvpn:doctor": "Check liveness of AZVPN",
  "azvpn:health": "Check liveness of AZVPN",
  "azvpn:skill": "Read the AZVPN skill",
  "azhub:list_modules": "List AZHub regions",
  "azhub:place": "Place a module in AZHub",
  "azhub:region_list": "List AZHub regions",
  "azhub:place_module": "Place a module in AZHub",
  "azhub:remove_module": "Remove a module from AZHub",
  "azhub:tether_declare": "Declare an AZHub tether",
  "azhub:tether_cut": "Cut an AZHub tether",
  "azhub:tether_list": "List AZHub tethers",
  "azhub:blank_key_status": "Read AZHub Blank Key status",
  "azinterface:genesis_boot": "Read AZInterface genesis status",
  "azinterface:hold": "Read AZInterface pre-locked page cycles",
  "azinterface:genesis_status": "Read AZInterface genesis status",
  "azinterface:site_state_get": "Read AZInterface site state",
  "azinterface:site_state_set": "Set AZInterface site state",
  "azinterface:integrity_check": "Check AZInterface integrity",
  "azinterface:witness_list": "List AZInterface witnesses",
  "azinterface:page_cycle_status": "Read AZInterface pre-locked page cycles",
  "azinterface:mesh_radios": "Read or confirm mesh radios",
  "aziel-corpus:search": "Search the Aziel Digital Library",
  "4dmap:pin": "Pin a 4DMap mark",
  "4dmap:span": "Span 4DMap cards or axes",
  "4dmap:stack": "Stack 4DMap cards on Γ",
  "4dmap:gap": "Record a 4DMap Δ gap",
  "4dmap:fork": "Fork a 4DMap card",
  "4dmap:walk": "Walk 4DMap cards",
  "4dmap:lens": "Lens 4DMap cards",
  "4dmap:class": "Class a 4DMap Π mark",
  "4dmap:cohort": "Cohort 4DMap cards",
  "4dmap:absence": "Read 4DMap absence",
  "4dmap:cap": "Cap 4DMap ZionPattern confidence",
  "4dmap:join": "Join 4DMap cards",
  "4dmap:list": "List 4DMap cards",
  "4dmap:example": "Show a synthetic 4DMap pin",
  "4dmap:card_new": "Open a 4DMap inspection card",
  "4dmap:card_pin": "Pin a mark on a 4DMap axis",
  "4dmap:card_span": "Span two 4DMap axes",
  "4dmap:card_join": "Join two 4DMap cards",
  "4dmap:card_walk": "Walk 4DMap cards",
  "4dmap:card_list": "List 4DMap cards",
  "4dmap:verify_hash": "Verify a 4DMap hash",
  "embryolock:health": "Read EmbryoLock health",
  "embryolock:skill": "Read EmbryoLock skill",
  "embryolock:doctor": "Cite EmbryoLock posture",
  "embryolock:verify_hash": "Verify the published EmbryoLock hash",
  "embryolock:verify-hash": "Verify the published EmbryoLock hash",
  "embryolock:policy": "Cite EmbryoLock policy",
  "embryolock:limitation": "Cite EmbryoLock limitations",
  "embryolock:cite": "Cite EmbryoLock policy",
  "embryolock:limitations": "Cite EmbryoLock limitations",
  "4dmap:frame_status": "Read the 4DMap inspection frame",
  "4dmap:axis_describe": "Describe a 4DMap axis",
  "4dmap:walk_trace": "Trace a 4DMap walk",
  "4dmap:card_export": "Export a 4DMap card",
  "4dmap:card_import": "Import a 4DMap card",
  "4dmap:verify_chain": "Verify a 4DMap hash chain",
  "4dmap:neighbor_cite": "Cite a 4DMap neighbor",
  "4dmap:frame": "Read the 4DMap inspection frame",
  "4dmap:axis": "Describe a 4DMap axis",
  "4dmap:trace": "Trace a 4DMap walk",
  "4dmap:export": "Export a 4DMap card",
  "4dmap:import": "Import a 4DMap card",
  "4dmap:neighbor": "Cite a 4DMap neighbor",
  "4dmap:memory_cite": "Cite a 4DMap card for AKM",
  "4dmap:memory_observe": "Build a 4DMap observation packet",
  "4dmap:library_pin": "Pin a 4DMap library frame",
  "4dmap:plot": "Plot 4DMap lattice pins",
  "4dmap:possibility": "Score a labeled 4DMap possibility",
  "4dmap:pattern_recall": "Recall 4DMap lattice patterns",
  "4dmap:lattice_tip": "Read 4DMap lattice tips",
  "4dmap:poison_refuse": "Refuse a 4DMap feature hash",
  "4dmap:news_status": "Read AZNews and the 4DMap join",
  "4dmap:news_pin": "Pin a news item on 4DMap",
  "4dmap:news_open": "Open a news item from 4DMap",
  "4dmap:news_ingest": "Store a news item on standalone AZNews",
  "4dmap:news_sources": "Read the AZNews source list",
  "4dmap:news_weather": "Read AZNews weather by region",
  "4dmap:news_black_swan": "Read or pin a cited black-swan event",
  "4dmap:news_feed": "Read the latest real AZNews headlines",
  "4dmap:news_item": "Open one stored AZNews item",
  "4dmap:news_sky": "Read the computed sky: zodiac, constellations, seasons",
  "4dmap:news_pins": "Read colored 4DMap pins and the last 10 added",
  "4dmap:news_pin_open": "Open one 4DMap pin",
  "4dmap:news_receipts": "Read AZNews pull and view receipts",
  "4dmap:news_verify": "Verify the AZNews dual lattice",
  "4dmap:news_globe": "Read everything the AZNews globe shows",
  "4dmap:ingest_pin": "Pin a 4DMap library frame",
  "4dmap:plot_pins": "Plot 4DMap lattice pins",
  "4dmap:score_hooks": "Score a labeled 4DMap possibility",
  "4dmap:possibility_cite": "Score a labeled 4DMap possibility",
  "4dmap:lattice_tips": "Read 4DMap lattice tips",
  "postking:new": "Start a Post-King Chess game",
  "postking:move": "Play a Post-King Chess move",
  "vibelock:analyze": "Analyze audio with VibeLock",
  "codelock:render": "Render source with CodeLock",
  "shadowlock:observe": "Observe a job list with ShadowLock",
  "miragegrid:assign": "Assign a MirageGrid node",
  "staticclock:advise": "Advise with StaticClock",
  "staticclock:advisory": "Advise with StaticClock",
  "staticclock:anchors": "List StaticClock anchors",
  "staticclock:click": "Append a StaticClock gear click",
  "staticclock:verify": "Verify a StaticClock click chain",
  "staticclock:timeslate": "Bind a StaticClock timeslate",
  "staticclock:import_export": "Import or export StaticClock clicks",
  "staticclock:doctor": "Check liveness of StaticClock",
  "chronolock:advisory": "Get a ChronoLock advisory",
  "chronolock:advise": "Get a ChronoLock advisory",
  "chronolock:anchors": "List ChronoLock anchors",
  "chronolock:window": "Read a ChronoLock Temporal Neutral Window",
  "chronolock:doctor": "Check liveness of ChronoLock",
  "azbot:route": "Route a request with AZBot",
};

const OP_VERBS = {
  analyze: "Analyze with",
  apps: "Show local steps for",
  render: "Render with",
  score: "Score with",
  submit: "Submit to",
  observe: "Observe with",
  genesis: "Start a chain in",
  append: "Append a receipt in",
  verify: "Verify with",
  receipt: "Build a receipt in",
  check: "Check with",
  patterns: "List patterns in",
  session: "Snapshot a session in",
  status: "Read status from",
  assign: "Assign a node in",
  advise: "Advise with",
  advisory: "Get an advisory from",
  anchors: "List anchors in",
  timeslate: "Bind a timeslate in",
  click: "Append a gear click in",
  window: "Read the advisory window in",
  gates: "List gates in",
  evaluate: "Evaluate with",
  targets: "List targets in",
  schema: "Read the schema of",
  import_export: "Import or export with",
  new: "Start a game in",
  move: "Play a move in",
  classify: "Classify with",
  gate: "Gate with",
  sweep: "Sweep with",
  levels: "List levels in",
  "lamb-check": "Run a Lamb check in",
  lamb_check: "Run a Lamb check in",
  modes: "List modes in",
  overlay: "Preview an overlay in",
  route: "Route with",
  "append-preview": "Preview a log row in",
  "verify-canonical": "Verify canonical JSON in",
  "fold-preview": "Fold text with",
  "unfold-preview": "Unfold a preview in",
  "pack-verify": "Verify the corpus tip in",
  "tip-pack": "Open the corpus tip in",
  "hash-preview": "Hash bytes in",
  "canon-preview": "Hash a ledger row in",
  example: "Show an example from",
  "search-options": "List search options in",
  queries: "Render search queries in",
  "doe-match": "Rank Doe leads in",
  coverage: "Show coverage in",
  map: "Show the casebook in",
  search: "Search",
  open: "Open a lattice in",
  seal: "Seal a receipt in",
  break: "Break a seal in",
  show: "Show a lattice in",
  stamp: "Stamp a file-hash in",
  upload_envelope: "Hash an envelope in",
  airlock_classify: "Classify with",
  scrub: "Scrub with",
  trust_score: "Score trust with",
  mesh_post: "Post anonymously on",
  mesh_poll: "Poll",
  mesh_listen: "Listen on",
  mesh_enable: "Enable the mesh in",
  mesh_disable: "Refuse suite disable in",
  mesh_status: "Read suite mesh status of",
  mesh_join: "Join the suite mesh from",
  mesh_heartbeat: "Heartbeat the suite mesh from",
  mesh_leave: "Leave the suite mesh from",
  mesh_nodes: "List live nodes on",
  mesh_broadcast: "Register a hash receipt on",
  status: "Read status of",
  enable: "Enable",
  disable: "Disable",
  join: "Join",
  heartbeat: "Heartbeat",
  leave: "Leave",
  nodes: "List nodes on",
  broadcast: "Register a hash receipt on",
  keyword_alert_set: "Set keyword alerts in",
  keyword_alert_list: "List keyword alerts in",
  keyword_alert_check: "Check keyword alerts in",
  ethical_search: "Search ethically with",
  lamb_lens_search: "Search ethically with",
  navigate: "Navigate with",
  airlock: "Airlock ingest in",
  home: "Check liveness of",
  doctor: "Check liveness of",
  pair: "Check pairing of",
  list_modules: "List regions in",
  place: "Place a module in",
  genesis_boot: "Read genesis status of",
  hold: "Read page cycles in",
  classify: "Classify with",
  airlock_ingest: "Airlock ingest in",
  tab_open: "Open a tab in",
  tab_list: "List tabs in",
  receipt_list: "List receipts in",
  pair_status: "Check pairing of",
  garden_list: "List the garden in",
  verify_hash: "Verify a hash in",
  pin: "Pin a mark in",
  span: "Span axes in",
  stack: "Stack cards in",
  gap: "Record a gap in",
  fork: "Fork a card in",
  walk: "Walk cards in",
  lens: "Lens cards in",
  class: "Class a mark in",
  cohort: "Cohort cards in",
  absence: "Read absence in",
  cap: "Cap confidence in",
  join: "Join cards in",
  list: "List cards in",
  example: "Show an example from",
  card_new: "Open an inspection card in",
  card_pin: "Pin a mark in",
  card_span: "Span axes in",
  card_join: "Join cards in",
  card_walk: "Walk cards in",
  card_list: "List cards in",
  memorial_list: "List memorials in",
  memorial_append: "Append a memorial in",
  receipt_verify: "Verify a receipt chain in",
  health: "Check liveness of",
  skill: "Read how to use",
  guide: "Ask",
  ask: "Ask",
  learner_guide: "Ask",
};

const PREFERRED_FIELD_KEYS = [
  "answer",
  "overall",
  "service",
  "clarity",
  "peace",
  "assertion",
  "score",
  "triple",
  "type",
  "ok",
  "pass",
  "gate",
  "ratio",
  "status",
  "hash",
  "sha256",
  "receipt_id",
  "id",
  "mode",
  "confidence",
  "verdict",
  "kind",
  "bytes_in",
  "bytes_out",
  "folded",
  "product",
  "version",
  "ran_in",
  "true_engine_runtime",
];

export function isAdvancedToolName(name, op) {
  const n = String(name || "");
  const action = String(op || "");
  if (n.startsWith("runtime_session_")) return true;
  if (n === "runtime_manifest") return true;
  if (n.endsWith("_health") || action === "health") return true;
  return false;
}

export function markAdvanced(description) {
  const text = String(description || "").trim();
  if (text.startsWith(ADVANCED_PREFIX)) return text;
  return `${ADVANCED_PREFIX} ${text}`;
}

export function productVerbTitle(product, op) {
  const slug = product && product.slug ? product.slug : "software";
  const name = product && product.name ? product.name : slug;
  const action = String(op || "").trim();
  const override = TITLE_OVERRIDES[`${slug}:${action}`];
  if (override) return override;
  const verb = OP_VERBS[action];
  if (verb) return `${verb} ${name}`;
  const pretty = action.replace(/-/g, " ").replace(/_/g, " ");
  return `${pretty} — ${name}`;
}

export function preferredProductVerb(product) {
  const ops = (product && product.ops) || [];
  const primary = ops.find((o) => o.op !== "health" && o.op !== "skill");
  const pick = primary || ops[0];
  if (!pick) return product && product.slug ? `${product.slug}_skill` : "runtime_run";
  return `${product.slug}_${pick.op}`;
}

export function productToolDescription(product, opSpec) {
  const action = opSpec && opSpec.op ? opSpec.op : "";
  const title = productVerbTitle(product, action);
  const one = (product && (product.oneLine || product.name)) || title;
  const advanced = action === "health";
  let desc;
  if (action === "health") {
    desc = `${title}. Prefer ${preferredProductVerb(product)} for using ${product.name} as software.`;
  } else if (action === "skill") {
    desc = `Read how to use ${product.name} like software in this chat. ${one}`;
  } else {
    desc = `${title}. Show the output to the user, then take the next input. ${one}`;
  }
  return advanced ? markAdvanced(desc) : desc;
}

export function productInputHint(product, opSpec) {
  const action = opSpec && opSpec.op ? opSpec.op : "this op";
  const name = product && product.name ? product.name : "this software";
  const example = product && product.example && typeof product.example === "object" ? product.example : null;
  const keys = example
    ? Object.keys(example).filter((k) => example[k] !== undefined && k !== "b64")
    : [];
  const pass = keys.length ? `Pass { ${keys.slice(0, 8).join(", ")} }.` : `Pass the fields ${name} needs for ${action}.`;
  const limit = product && product.banner ? shortClause(product.banner) : "";
  return limit ? `${pass} ${limit}` : pass;
}

export function displayEnvelope({ title, summary, fields, result, receipt, session_id, next, dryRun }) {
  const display = {
    action: RUN_ACTION,
    title: title || "Result",
    summary: summary == null ? "" : String(summary),
  };
  const image = imageFromProduction(result, { dryRun: dryRun === true });
  if (image) display.image = image;
  if (fields && fields.length) display.fields = fields;
  if (next) display.next = next;
  const out = {
    display,
    result: result === undefined ? null : result,
  };
  if (receipt !== undefined && receipt !== null) out.receipt = receipt;
  if (session_id) out.session_id = session_id;
  return out;
}

export function looksLikeEnvelope(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.display &&
      typeof value.display === "object" &&
      Object.prototype.hasOwnProperty.call(value, "result"),
  );
}

export function fieldsFromResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  const fields = [];
  const seen = new Set();
  for (const key of PREFERRED_FIELD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(result, key)) continue;
    if (!isDisplayable(result[key])) continue;
    fields.push({ label: labelize(key), value: stringifyField(result[key]) });
    seen.add(key);
  }
  for (const [key, value] of Object.entries(result)) {
    if (fields.length >= 8) break;
    if (seen.has(key)) continue;
    if (key === "markdown" || key === "skill" || key === "html" || key === "b64" || key.endsWith("_b64")) continue;
    if (!isDisplayable(value)) continue;
    fields.push({ label: labelize(key), value: stringifyField(value) });
  }
  return fields.length ? fields : undefined;
}

export function summaryFromResult(result, fallbackText, product) {
  if (result && typeof result === "object") {
    if (typeof result.count === "number" && Array.isArray(result.software)) {
      return result.git_sha_tracks_deployed_tip === true
        ? `Softwares ${result.count}. Deployed tip.`
        : `Softwares ${result.count}. deploy lag.`;
    }
    if (result.background === true) {
      const hash = result.receipt && result.receipt.hash;
      const honest = typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash) && !/^0{64}$/.test(hash);
      if (result.done === true && honest) return "Done. Receipt is ready.";
      if (result.status === "refused" || result.code === "job_not_found" || result.status === "quiet") {
        return result.message || result.summary || "Refused. No completion receipt.";
      }
      return "Running. No completion receipt yet.";
    }
    if (typeof result.answer === "string" && result.answer.trim()) return clip(result.answer, 360);
    if (typeof result.output === "string" && result.output.trim()) return clip(result.output, 360);
    if (result.overall && result.service && result.clarity && result.peace) {
      return clip(
        `Lamb Lens ${result.overall}: Service ${result.service}, Clarity ${result.clarity}, Peace ${result.peace}.`,
        360,
      );
    }
    if (typeof result.summary === "string" && result.summary.trim()) return clip(result.summary, 360);
    if (typeof result.note === "string" && result.note.trim()) return clip(result.note, 360);
    if (typeof result.markdown === "string" && result.markdown.trim()) return firstMarkdownLead(result.markdown);
    if (result.error) return clip(String(result.error), 360);
    if (result.ok === false) return product ? `${product.name} returned an error.` : "The software returned an error.";
    if (result.score != null) return `${product ? product.name + " score: " : "Score: "}${stringifyField(result.score)}`;
    if (result.triple != null) return `${product ? product.name + " triple: " : "Triple: "}${stringifyField(result.triple)}`;
    // limitation is honesty prose — never the primary summary when a useful result exists
    if (typeof result.limitation === "string" && result.limitation.trim() && result.ok !== true) {
      return clip(result.limitation, 360);
    }
    if (product && product.slug === "4dmap" && result.result && typeof result.result === "object" && !Array.isArray(result.result)) {
      const inner = result.result;
      if (typeof inner.summary === "string" && inner.summary.trim()) return clip(inner.summary, 360);
      if (typeof inner.note === "string" && inner.note.trim()) return clip(inner.note, 360);
    }
    if (result.ok === true && product) return `${product.name} finished. Show this output, then take the next input.`;
  }
  if (typeof fallbackText === "string" && fallbackText.trim() && !fallbackText.trim().startsWith("{")) {
    return firstMarkdownLead(fallbackText);
  }
  return product
    ? `${product.name} finished. Show this output to the user, then take the next input.`
    : "Finished. Show this output to the user, then take the next input.";
}

export function attachExecDisplay({ product, slug, op, parsedBody, receipt, session_id }) {
  const name = product && product.name ? product.name : slug || "Software";
  const title = product ? productVerbTitle(product, op) : `${op} — ${name}`;
  return displayEnvelope({
    title,
    summary: summaryFromResult(parsedBody, null, product || { name }),
    fields: fieldsFromResult(parsedBody),
    result: parsedBody,
    receipt,
    session_id,
    next: `Show this ${name} output to the user, then take the next input.`,
  });
}

export function wrapToolOutput({ name, text, status, product, op, extra }) {
  let parsed = null;
  if (typeof text === "string" && text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (looksLikeEnvelope(parsed)) return ensureRunFrame(parsed);
  if (parsed && parsed.exec && (parsed.receipt || (parsed.exec && parsed.exec.result !== undefined))) {
    const slug = (parsed.exec && parsed.exec.slug) || (product && product.slug);
    const action = (parsed.exec && parsed.exec.op) || op;
    return attachExecDisplay({
      product,
      slug,
      op: action,
      parsedBody: parsed.exec.result !== undefined ? parsed.exec.result : parsed.exec,
      receipt: parsed.receipt,
      session_id: (extra && extra.session_id) || (parsed.session && parsed.session.id),
    });
  }
  const skillLike =
    name === "runtime_skill" ||
    (typeof name === "string" && name.endsWith("_skill")) ||
    (typeof text === "string" && (text.startsWith("#") || text.startsWith("---")));
  if (skillLike && parsed === null) {
    return displayEnvelope({
      title: product ? `How to use ${product.name}` : "Aziel Eliab Runtime",
      summary: firstMarkdownLead(text),
      result: { markdown: text },
      next: product
        ? `Then open ${product.name} and take the next input.`
        : "Then open a product tool (or runtime_run) and take the next input.",
    });
  }
  const title = product
    ? productVerbTitle(product, op)
    : titleFromToolName(name);
  const running = parsed && parsed.background === true && parsed.done !== true;
  const next = running
    ? "Still running. Ask again with the same job_id. Done only when a receipt hash is present."
    : product
      ? `Show this ${product.name} output to the user, then take the next input.`
      : "Show this output to the user, then take the next input.";
  const view = displayViewForProduct(parsed, product);
  return displayEnvelope({
    title: status >= 400 ? `${title} (error)` : title,
    summary: summaryFromResult(view, text, product),
    fields: fieldsFromResult(view),
    result: parsed !== null ? parsed : { text: text == null ? "" : String(text) },
    receipt: extra && extra.receipt,
    session_id: extra && extra.session_id,
    next,
  });
}

/** AZAI MCP replies bury the useful Guide/Lamb body under result.result — lift it for display. */
function displayViewForProduct(parsed, product) {
  if (!parsed || typeof parsed !== "object") return parsed;
  const slug = product && product.slug ? product.slug : "";
  if (slug !== "azai") return parsed;
  const inner = parsed.result;
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return parsed;
  if (
    typeof inner.answer === "string" ||
    inner.overall != null ||
    inner.service != null ||
    typeof inner.output === "string" ||
    typeof inner.markdown === "string"
  ) {
    return inner;
  }
  return parsed;
}

/** Plain lines for a human. Machines keep the envelope on structuredContent. */
export function plainConsumerText(body, res) {
  if (body == null) return res && res.status != null ? "HTTP " + res.status : "No reply.";
  if (typeof body === "string") return body;
  if (typeof body !== "object") return String(body);
  if (body.code === "MESH-OK" && typeof body.live_nodes === "number") {
    const d2d = body.d2d_carriers && typeof body.d2d_carriers === "object" ? body.d2d_carriers : {};
    const software = body.software_nodes;
    const door = typeof d2d.worker_door === "string" && d2d.worker_door.indexOf("{") < 0 ? d2d.worker_door : "FG-STUB";
    const alt = body.alt_internet_live === true || d2d.alt_internet_live === true;
    const packet = body.packet_path_live === true || d2d.packet_path_live === true;
    const field = body.field_1_0 === true || d2d.field_1_0 === true;
    const second = body.second_device === true || d2d.second_device === true;
    const lines = [
      "The live count is " + body.live_nodes + ". That count is people and site viewers. It is not a live mesh node.",
      typeof software === "number"
        ? "Software workers on the roster: " + software + ". Those workers are not people."
        : "Software workers are not people.",
      "Reading this status does not turn radios on.",
      alt
        ? "An alternative internet is marked live (alt_internet_live is true)."
        : "An alternative internet is not live (alt_internet_live is false).",
      packet
        ? "A packet path is marked live (packet_path_live is true)."
        : "A packet path is not live (packet_path_live is false).",
      field ? "Field 1.0 is marked live (field_1_0 is true)." : "Field 1.0 is not live (field_1_0 is false).",
      second
        ? "A second device is marked present (second_device is true)."
        : "There is no second device (second_device is false).",
      "The public worker door stays " + door + ".",
    ];
    const missingLine = typeof d2d.not_live_sentence === "string" && d2d.not_live_sentence
      ? d2d.not_live_sentence
      : typeof body.not_live_sentence === "string"
        ? body.not_live_sentence
        : "";
    if (missingLine) lines.push(missingLine);
    if (body.vpn === true) lines.push("VPN on at boot.");
    else if (body.vpn === false) lines.push("VPN cite is off.");
    lines.push("Code: MESH-OK.");
    return lines.join("\n");
  }
  const lines = [];
  const http = res && res.status != null ? "HTTP " + res.status : "";
  const code = body.code || body.refuse || (body.error && typeof body.error === "object" && body.error.code) || "";
  const display = body.display && typeof body.display === "object" ? body.display : null;
  const title = display && display.title ? display.title : "";
  const head = [http, code, title].filter(Boolean).join(" · ");
  if (head) lines.push(head);
  if (
    body.visited === false ||
    body.advisory === true ||
    (body.note && /advisory|visited=false|sealed index/i.test(String(body.note)))
  ) {
    lines.push("Advisory citations. Not retrieved article evidence.");
  }
  if (display && display.action) lines.push(display.action);
  const inner = body.result && typeof body.result === "object" && !Array.isArray(body.result) ? body.result : null;
  const src = inner || body;
  if (display && display.summary) lines.push(display.summary);
  else if (typeof body.summary === "string" && body.summary.trim()) lines.push(body.summary);
  else if (typeof src.plain_status === "string" && src.plain_status.trim()) lines.push(src.plain_status);
  else if (typeof body.plain === "string" && body.plain.trim()) lines.push(body.plain);
  else if (typeof src.count === "number" && Array.isArray(src.software)) {
    lines.push(src.git_sha_tracks_deployed_tip === true ? "Softwares " + src.count + ". Deployed tip." : "Softwares " + src.count + ". deploy lag.");
  } else if (typeof src.note === "string" && src.note.trim()) lines.push(src.note);
  else if (typeof body.message === "string" && body.message.trim()) lines.push(body.message);
  else if (typeof body.error === "string" && body.error.trim()) lines.push(body.error);
  else if (body.ok === true || src.ok === true) lines.push("Finished.");
  else if (body.ok === false || src.ok === false) lines.push("Refused.");
  const answer = typeof body.answer === "string" && body.answer.trim()
    ? body.answer.trim()
    : typeof src.answer === "string" && src.answer.trim()
      ? src.answer.trim()
      : "";
  if (answer && lines.indexOf(answer) < 0) lines.push(answer);
  if (src.page_cycle && typeof src.page_cycle === "object" && src.page_cycle.current) {
    lines.push("Page cycle: " + src.page_cycle.current);
  }
  const vpnOn = src.vpn === true || body.vpn === true;
  const azvpn = src.product === "azvpn" || src.concentrator_slug === "azvpn" || body.slug === "azvpn" || src.default_vpn_backend === "azvpn";
  if (vpnOn && azvpn) lines.push("VPN on at boot.");
  if (src.deploy_lag) lines.push(String(src.deploy_lag));
  else if (body.deploy_lag) lines.push(String(body.deploy_lag));
  if (display && Array.isArray(display.fields)) {
    for (let i = 0; i < display.fields.length; i++) {
      const field = display.fields[i];
      if (!field || field.value == null) continue;
      lines.push(String(field.label || "Field") + ": " + String(field.value));
    }
  }
  if (display && display.next) lines.push(display.next);
  return lines.filter(Boolean).join("\n") || "Finished.";
}

export function formatDisplayText(envelope) {
  const d = (envelope && envelope.display) || {};
  const lines = [];
  if (d.action) lines.push(d.action, "");
  if (d.title) lines.push(d.title, "");
  if (d.summary) lines.push(d.summary, "");
  const caption = imageCaption(d.image);
  if (caption) lines.push(caption, "");
  if (Array.isArray(d.fields)) {
    for (const field of d.fields) {
      lines.push(`${field.label}: ${field.value}`);
    }
    if (d.fields.length) lines.push("");
  }
  if (d.next) lines.push(d.next, "");
  return lines.join("\n").trim() || "Finished.";
}

export function mcpContentText(name, envelope, rawText) {
  if (name === "runtime_skill" || (typeof name === "string" && name.endsWith("_skill"))) {
    const md = (envelope.result && envelope.result.markdown) || rawText || "";
    const action = (envelope.display && envelope.display.action) || RUN_ACTION;
    const title = (envelope.display && envelope.display.title) || "Skill";
    return `${action}\n\n${title}\n\n${md}`;
  }
  return formatDisplayText(envelope);
}

/**
 * Image card from a real production only.
 * Byte fields (png_b64 / jpeg_b64 and the same family) become display.image.data
 * when the bytes sniff as that image. A cited http(s) image URL is recorded
 * without inventing bytes. dry_run returns nothing — a preview is not sealed.
 * Request echoes (payload / would / args) are not productions.
 */
export function imageFromProduction(result, opts = {}) {
  if (!result || typeof result !== "object") return undefined;
  if (opts.dryRun === true || result.dry_run === true) return undefined;
  const found = { byte: null, url: null };
  walkProductionImage(result, 0, found);
  if (!found.byte && !found.url) return undefined;
  if (found.byte) {
    const image = {
      mimeType: found.byte.mimeType,
      data: found.byte.data,
      source: found.byte.source,
      reviewed: true,
    };
    if (found.url) image.url = found.url.url;
    return image;
  }
  const image = {
    url: found.url.url,
    source: found.url.source,
    reviewed: false,
  };
  if (found.url.mimeType) image.mimeType = found.url.mimeType;
  return image;
}

function ensureRunFrame(envelope) {
  if (!envelope || typeof envelope !== "object" || !envelope.display) return envelope;
  if (!envelope.display.action) envelope.display.action = RUN_ACTION;
  if (!envelope.display.image) {
    const image = imageFromProduction(envelope.result, { dryRun: envelope.dry_run === true });
    if (image) envelope.display.image = image;
  }
  return envelope;
}

function imageCaption(image) {
  if (!image || typeof image !== "object") return "";
  if (image.data && image.reviewed === true) return `Image: ${image.mimeType || "image"} (reviewed)`;
  if (image.url && !image.data) return `Image cite: ${image.url}`;
  if (image.data) return `Image: ${image.mimeType || "image"} (not sealed)`;
  return "";
}

function walkProductionImage(node, depth, found) {
  if (!node || typeof node !== "object" || depth > 6) return;
  if (Array.isArray(node)) {
    const limit = Math.min(node.length, 8);
    for (let i = 0; i < limit; i++) {
      walkProductionImage(node[i], depth + 1, found);
      if (found.byte && found.url) return;
    }
    return;
  }
  if (!found.byte) {
    for (const key of IMAGE_BYTE_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
      const bytes = imageBytes(node[key]);
      if (!bytes) continue;
      found.byte = { ...bytes, source: key };
      break;
    }
  }
  if (!found.url) {
    for (const [key, declared] of Object.entries(IMAGE_URL_KEYS)) {
      if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
      const url = citedImageUrl(node[key]);
      if (!url) continue;
      const mimeType = declared || mimeFromUrl(url);
      found.url = { url, source: key, ...(mimeType ? { mimeType } : {}) };
      break;
    }
  }
  if (found.byte && found.url) return;
  for (const [key, value] of Object.entries(node)) {
    if (IMAGE_SKIP_WALK.has(key)) continue;
    if (!value || typeof value !== "object") continue;
    walkProductionImage(value, depth + 1, found);
    if (found.byte && found.url) return;
  }
}

function imageBytes(value) {
  if (typeof value !== "string") return null;
  let raw = value.trim();
  if (!raw || raw === "null" || raw.length > 1500000) return null;
  const dataUrl = raw.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (dataUrl) raw = dataUrl[2].replace(/\s/g, "");
  else raw = raw.replace(/\s/g, "");
  if (raw.length < 64 || raw.length > 1500000) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return null;
  const sniffed = sniffImageMime(raw);
  if (!sniffed) return null;
  return { mimeType: sniffed, data: raw };
}

function sniffImageMime(b64) {
  if (b64.startsWith("iVBORw0KGgo")) return "image/png";
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("R0lGOD")) return "image/gif";
  if (b64.startsWith("UklGR")) return "image/webp";
  return null;
}

function citedImageUrl(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^https?:\/\//i.test(text) || text.length > 2000) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function mimeFromUrl(url) {
  let path = "";
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  return "";
}

function titleFromToolName(name) {
  const n = String(name || "Result");
  if (n === "runtime_run") return "Advanced: raw runtime_run";
  if (n === "runtime_skill") return "Aziel Eliab Runtime";
  if (n === "Softwares" || n === "runtime_software" || n === "softwares") return "Software catalog";
  if (n === "runtime_bundle") return "Product list";
  if (n === "runtime_pull") return "Opened product";
  if (n === "runtime_manifest") return "Runtime manifest";
  if (n === "fraggate_list") return "FragGate registry";
  if (n === "fraggate_describe") return "FragGate describe";
  if (n === "fraggate_verify") return "FragGate verify";
  if (n === "fraggate_call") return "FragGate call";
  if (n === "decisiongate_check") return "Run DecisionGATE on a proposal";
  if (n === "library_lookup") return "Search the Aziel Digital Library";
  if (n === "mesh_status") return "Suite mesh status";
  if (n === "mesh_enable") return "Enable the suite mesh";
  if (n === "mesh_disable") return "Suite disable is refused";
  if (n === "mesh_join") return "Join the suite mesh";
  if (n === "mesh_heartbeat") return "Suite mesh heartbeat";
  if (n === "mesh_leave") return "Leave the suite mesh";
  if (n === "mesh_nodes") return "Live suite mesh nodes";
  if (n === "mesh_broadcast") return "Communique hash receipt";
  return n.replace(/_/g, " ");
}

function firstMarkdownLead(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l !== "---" && !l.startsWith("name:") && !l.startsWith("description:"));
  const lead = lines.find((l) => !l.startsWith("#") && !l.startsWith(">") && !l.startsWith("-")) || lines[0] || "";
  return clip(lead.replace(/^#+\s*/, ""), 360);
}

function shortClause(text) {
  const one = String(text || "").split(/[.|\n]/)[0] || "";
  return clip(one.trim(), 180);
}

function isDisplayable(value) {
  const t = typeof value;
  if (t === "number" || t === "boolean") return true;
  if (t === "string") return value.length > 0 && value.length <= 240 && !value.includes("\n\n");
  return false;
}

function stringifyField(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function labelize(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/-/g, " ");
}

function clip(text, max) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

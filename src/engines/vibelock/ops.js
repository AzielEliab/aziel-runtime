/**
 * vibelock in-process ops. Author: Aziel Eliab.
 */
import { capabilityDoctor, capabilityHealth, capabilitySkill, ensureThisIs } from "../capability.js";
import { LIMITATION, MOTTO, VERSION, handleAnalyze } from "./engine.js";

const LIVE = ["health", "skill", "analyze", "detect", "doctor"];
const STUB = ["mic", "live_capture", "liveness_proof"];
export const VIBELOCK_OPS = LIVE.slice();

function envelope() {
  return {
    product: "vibelock",
    name: "VibeLock",
    version: VERSION,
    role: "media authenticity advisory",
    motto: MOTTO,
    axes: ["features", "pcm", "risk"],
    neighbors: ["spectrallock", "aziel-corpus"],
    live_ops: LIVE,
    stub_ops: STUB,
    limitation: ensureThisIs(LIMITATION, "THIS IS: media authenticity advisory on posted features. THIS IS NOT: a live microphone or courtroom proof."),
    extra: { live_mic: false },
  };
}

export function vibelockHealth() {
  return capabilityHealth(envelope());
}

export function vibelockSkill() {
  return capabilitySkill({
    ...envelope(),
    lead: "Designed to assess AI deepfake risk in audio and video. Physics and related signals are heuristic. Linguistics is experimental. Vibration is a measurement only with a body-coupled track. Hosted analyze and detect score posted features or limited PCM and refuse raw container bytes. Compressed files on the local package need ffmpeg. No accuracy percentage.",
  });
}

export function vibelockDoctor() {
  return capabilityDoctor({
    ...envelope(),
    doctor_note: "VibeLock doctor: analyze/detect on posted features. No live mic.",
  });
}

export async function runVibelock(op, payload, scratch) {
  if (op === "health") return vibelockHealth();
  if (op === "skill") return vibelockSkill();
  if (op === "doctor") return vibelockDoctor();
  if (op === "analyze" || op === "detect") {
    const out = await handleAnalyze(payload);
    return { ...out, true_engine_runtime: true, limitation: LIMITATION };
  }
  return { unsupported: true };
}

/**
 * Serve the in-repo glama.json document. No new UUID, DOI, or OAuth IdP.
 * Author: Aziel Eliab only. NO-LIE.
 */

import card from "../glama.json" with { type: "json" };

const GLAMA_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const DOI = /10\.\d{4,}\//;

export function glamaStaticDecision(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return withheld("in-repo glama.json is missing");
  }
  const text = JSON.stringify(source);
  if (GLAMA_UUID.test(text)) {
    return withheld("a UUID is present. No Glama UUID is invented or served.");
  }
  if (DOI.test(text)) {
    return withheld("a DOI is present. No DOI is invented or served.");
  }
  return { ok: true, status: 200, body: source };
}

function withheld(because) {
  return {
    ok: false,
    status: 404,
    body: {
      error: "glama.json withheld",
      code: "NO-LIE",
      note: `In-repo glama.json is not served because ${because}`,
    },
  };
}

export function glamaStaticCard() {
  return glamaStaticDecision(card);
}

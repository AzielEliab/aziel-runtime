/**
 * VECTOR — optional directional selection. Cite + stub refuse until armed.
 * Not a Softwares-tab product. Not a hop. RoseClock governs transitions.
 * Author: Aziel Eliab only.
 */

export const VECTOR_SPEC = "VECTOR-CITE";
export const VECTOR_ARMED = false;
export const VECTOR_SOFTWARE_TAB = false;
export const VECTOR_AUTHOR = "Aziel Eliab";

export function vectorCite() {
  return {
    name: "VECTOR",
    spec: VECTOR_SPEC,
    armed: VECTOR_ARMED,
    software_tab: false,
    door: false,
    optional: true,
    note: "Optional directional selection as needed with StaticClock. Cite only until armed. Not a Softwares-tab product. RoseClock governs the forward transition. Author: Aziel Eliab only.",
  };
}

export function vectorCall() {
  return {
    ok: false,
    refuse: "vector-unarmed",
    code: "VECTOR-UNARMED",
    ...vectorCite(),
    message: "VECTOR is cite + stub refuse until armed. Not a Softwares-tab product.",
  };
}

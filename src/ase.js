/**
 * ASE — optional perspective integrity. Cite + stub refuse until armed.
 * Not a Softwares-tab product. Not a door. Cannot override Lamb Lens.
 * Author: Aziel Eliab only.
 */

export const ASE_SPEC = "ASE-CITE";
export const ASE_ARMED = false;
export const ASE_SOFTWARE_TAB = false;
export const ASE_AUTHOR = "Aziel Eliab";

export function aseCite() {
  return {
    name: "ASE",
    spec: ASE_SPEC,
    armed: ASE_ARMED,
    software_tab: false,
    door: false,
    optional: true,
    note: "Optional perspective integrity. Cite only until armed. Not a Softwares-tab product. Cannot convert a score into truth. Author: Aziel Eliab only.",
  };
}

export function aseCall() {
  return {
    ok: false,
    refuse: "ase-unarmed",
    code: "ASE-UNARMED",
    ...aseCite(),
    message: "ASE is cite + stub refuse until armed. Not a Softwares-tab product.",
  };
}

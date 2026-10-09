/**
 * AZNews sky (AZNEWS-SKY-1.0). Computed from astronomy, never fetched horoscopes.
 *
 * Library: astronomy-engine 2.1.19 (MIT, Don Cross), vendored unmodified at src/vendor/astronomy-engine/.
 * - Tropical zodiac sign: Sun apparent ecliptic longitude of date, 30-degree signs
 *   from the March equinox (0 = Aries).
 * - Constellation: IAU boundaries (Roman 1987, B1875 frame) for the Sun's J2000
 *   equatorial position. The tropical sign and the constellation differ because
 *   of precession and unequal constellation widths (Oct 9: sign Libra, Sun in Virgo).
 * - Moon: phase angle, illuminated fraction, ecliptic longitude sign, constellation.
 * - Seasons: equinox and solstice instants for the year; season per hemisphere
 *   (astronomical definition: between the bracketing equinox/solstice).
 * - Visible tonight: for each anchor, the listed constellations whose reference
 *   point is above 10 degrees altitude at local solar midnight (UTC minus lon/15).
 *   Reference points are approximate constellation centres (J2000 RA hours, Dec deg).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import * as Astronomy from "../../vendor/astronomy-engine/astronomy.js";

export const SKY_SPEC = "AZNEWS-SKY-1.0";
export const SKY_LIBRARY = Object.freeze({ name: "astronomy-engine", version: "2.1.19", license: "MIT", url: "https://github.com/cosinekitty/astronomy" });
export const MIN_ALTITUDE_DEG = 10;

export const SIGNS = Object.freeze(["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]);

/** [name, RA hours J2000, Dec degrees J2000] approximate centres of major constellations. */
export const MAJOR_CONSTELLATIONS = Object.freeze([
  ["Andromeda", 0.8, 37],
  ["Aquarius", 22.3, -11],
  ["Aquila", 19.7, 3],
  ["Aries", 2.6, 21],
  ["Auriga", 6.0, 42],
  ["Bootes", 14.7, 31],
  ["Cancer", 8.6, 20],
  ["Canis Major", 6.8, -22],
  ["Capricornus", 21.0, -18],
  ["Carina", 8.7, -63],
  ["Cassiopeia", 1.0, 62],
  ["Centaurus", 13.1, -47],
  ["Cepheus", 22.0, 71],
  ["Cetus", 1.7, -7],
  ["Crux", 12.4, -60],
  ["Cygnus", 20.6, 44],
  ["Draco", 17.0, 66],
  ["Gemini", 7.1, 23],
  ["Hercules", 17.4, 27],
  ["Hydra", 11.6, -14],
  ["Leo", 10.7, 15],
  ["Libra", 15.2, -15],
  ["Lyra", 18.9, 37],
  ["Orion", 5.6, 5],
  ["Pegasus", 22.7, 20],
  ["Perseus", 3.2, 45],
  ["Pisces", 0.5, 13],
  ["Sagittarius", 19.1, -29],
  ["Scorpius", 16.9, -27],
  ["Taurus", 4.7, 15],
  ["Ursa Major", 11.3, 51],
  ["Ursa Minor", 15.0, 78],
  ["Virgo", 13.4, -4],
]);

function signOf(lon) {
  const l = ((lon % 360) + 360) % 360;
  const idx = Math.floor(l / 30);
  return { sign: SIGNS[idx], degree_in_sign: Number((l - idx * 30).toFixed(3)), ecliptic_longitude_deg: Number(l.toFixed(4)) };
}

function phaseName(angle) {
  const a = ((angle % 360) + 360) % 360;
  if (a < 22.5 || a >= 337.5) return "New Moon";
  if (a < 67.5) return "Waxing Crescent";
  if (a < 112.5) return "First Quarter";
  if (a < 157.5) return "Waxing Gibbous";
  if (a < 202.5) return "Full Moon";
  if (a < 247.5) return "Waning Gibbous";
  if (a < 292.5) return "Last Quarter";
  return "Waning Crescent";
}

function iso(t) {
  return t && t.date ? t.date.toISOString() : null;
}

function constellationOf(body, date) {
  const eq = Astronomy.Equator(body, date, new Astronomy.Observer(0, 0, 0), false, true);
  const c = Astronomy.Constellation(eq.ra, eq.dec);
  return { constellation: c.name, symbol: c.symbol, boundaries: "IAU (Roman 1987, B1875)" };
}

export function seasonsOf(date) {
  const year = date.getUTCFullYear();
  const s = Astronomy.Seasons(year);
  const marks = {
    march_equinox: iso(s.mar_equinox),
    june_solstice: iso(s.jun_solstice),
    september_equinox: iso(s.sep_equinox),
    december_solstice: iso(s.dec_solstice),
  };
  const t = date.getTime();
  const m = Date.parse(marks.march_equinox);
  const j = Date.parse(marks.june_solstice);
  const se = Date.parse(marks.september_equinox);
  const d = Date.parse(marks.december_solstice);
  let north;
  if (t < m) north = "Winter";
  else if (t < j) north = "Spring";
  else if (t < se) north = "Summer";
  else if (t < d) north = "Autumn";
  else north = "Winter";
  const southOf = { Winter: "Summer", Spring: "Autumn", Summer: "Winter", Autumn: "Spring" };
  const next = [
    ["march_equinox", m],
    ["june_solstice", j],
    ["september_equinox", se],
    ["december_solstice", d],
  ].find(([, at]) => at > t);
  return {
    year,
    ...marks,
    northern_hemisphere: north,
    southern_hemisphere: southOf[north],
    definition: "astronomical (equinox and solstice instants)",
    next_marker: next ? { name: next[0], at: new Date(next[1]).toISOString() } : { name: "march_equinox", at: iso(Astronomy.Seasons(year + 1).mar_equinox) },
  };
}

/** Local solar midnight nearest after `date` for longitude lon (UTC - lon/15 h). */
function localMidnight(date, lon) {
  const offsetH = lon / 15;
  const localMs = date.getTime() + offsetH * 3600000;
  const local = new Date(localMs);
  let mid = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 0, 0, 0) - offsetH * 3600000;
  if (mid - date.getTime() > 24 * 3600000) mid -= 24 * 3600000;
  return new Date(mid);
}

export function visibleTonight(anchor, date) {
  const at = localMidnight(date, anchor.lon);
  const observer = new Astronomy.Observer(anchor.lat, anchor.lon, 0);
  const visible = [];
  for (const [name, ra, dec] of MAJOR_CONSTELLATIONS) {
    const hor = Astronomy.Horizon(at, observer, ra, dec, null);
    if (hor.altitude >= MIN_ALTITUDE_DEG) visible.push({ name, altitude_deg: Number(hor.altitude.toFixed(1)), azimuth_deg: Number(hor.azimuth.toFixed(1)) });
  }
  visible.sort((a, b) => b.altitude_deg - a.altitude_deg);
  return { anchor_id: anchor.id, anchor_name: anchor.name, lat: anchor.lat, lon: anchor.lon, local_solar_midnight_utc: at.toISOString(), visible };
}

/** Sub-solar point: where the Sun stands at the zenith at `date`. */
export function subSolarPoint(date) {
  const eq = Astronomy.Equator(Astronomy.Body.Sun, date, new Astronomy.Observer(0, 0, 0), true, true);
  const gst = Astronomy.SiderealTime(date);
  let lon = (eq.ra - gst) * 15;
  lon = ((lon + 540) % 360) - 180;
  return { lat: Number(eq.dec.toFixed(4)), lon: Number(lon.toFixed(4)) };
}

export function skySnapshot(date, anchors = []) {
  const when = date instanceof Date ? date : new Date(date);
  const sunLon = Astronomy.SunPosition(when).elon;
  const moonLon = Astronomy.EclipticGeoMoon(when).lon;
  const phase = Astronomy.MoonPhase(when);
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, when);
  const sunSign = signOf(sunLon);
  const sunCon = constellationOf(Astronomy.Body.Sun, when);
  const moonSign = signOf(moonLon);
  const moonCon = constellationOf(Astronomy.Body.Moon, when);
  return {
    kind: "aznews-sky",
    spec: SKY_SPEC,
    computed_at: when.toISOString(),
    library: SKY_LIBRARY,
    sun: {
      tropical_sign: sunSign.sign,
      degree_in_sign: sunSign.degree_in_sign,
      ecliptic_longitude_deg: sunSign.ecliptic_longitude_deg,
      constellation: sunCon.constellation,
      constellation_symbol: sunCon.symbol,
      sign_differs_from_constellation: sunSign.sign !== sunCon.constellation,
      note: "The tropical sign is measured from the March equinox. The constellation is where the Sun actually sits among the IAU star fields. They differ because of precession and unequal constellation widths.",
    },
    moon: {
      phase_angle_deg: Number(phase.toFixed(3)),
      phase_name: phaseName(phase),
      illuminated_fraction: Number(illum.phase_fraction.toFixed(4)),
      tropical_sign: moonSign.sign,
      ecliptic_longitude_deg: moonSign.ecliptic_longitude_deg,
      constellation: moonCon.constellation,
      constellation_symbol: moonCon.symbol,
    },
    seasons: seasonsOf(when),
    sub_solar_point: subSolarPoint(when),
    visible_tonight: anchors.map((a) => visibleTonight(a, when)),
    visible_rule: `Listed major constellations whose reference point is at least ${MIN_ALTITUDE_DEG} degrees above the horizon at local solar midnight.`,
    source: "computed",
    fetched: false,
  };
}

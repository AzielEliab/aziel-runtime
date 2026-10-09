/**
 * AZNews global weather (AZNEWS-WEATHER-1.0).
 * Source: Open-Meteo forecast API "current" block (https://open-meteo.com/, free,
 * keyless; data CC BY 4.0; attribution "Weather data by Open-Meteo.com").
 * Anchors: one point per UN M49 geographic subregion (22 land points, a major
 * city in each) plus Antarctica and 7 ocean/polar points, so every continent
 * and every ocean has an observation. All 30 points go in ONE batched request.
 *
 * Severe-weather flags (threshold crossings on model values, not official warnings):
 *   thunderstorm     weather_code 95, 96, 99 (WMO)
 *   heavy_precip     weather_code 65, 67, 75, 82, 86, or precipitation >= 10 mm
 *   storm_gusts      wind_gusts_10m >= 90 km/h
 *   hurricane_gusts  wind_gusts_10m >= 118 km/h
 *   extreme_heat     temperature_2m >= 40 C
 *   extreme_cold     temperature_2m <= -30 C
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
export const WEATHER_SPEC = "AZNEWS-WEATHER-1.0";
export const OPEN_METEO = Object.freeze({
  name: "Open-Meteo",
  endpoint: "https://api.open-meteo.com/v1/forecast",
  cite: "https://open-meteo.com/",
  license: "CC BY 4.0 data; free non-commercial API",
  attribution: "Weather data by Open-Meteo.com",
  fields: ["temperature_2m", "relative_humidity_2m", "precipitation", "weather_code", "wind_speed_10m", "wind_gusts_10m"],
});

export const WEATHER_ANCHORS = Object.freeze(
  [
    ["northern-africa", "Northern Africa (Cairo)", "Africa", 30.0444, 31.2357],
    ["eastern-africa", "Eastern Africa (Nairobi)", "Africa", -1.2921, 36.8219],
    ["middle-africa", "Middle Africa (Kinshasa)", "Africa", -4.4419, 15.2663],
    ["southern-africa", "Southern Africa (Johannesburg)", "Africa", -26.2041, 28.0473],
    ["western-africa", "Western Africa (Lagos)", "Africa", 6.5244, 3.3792],
    ["caribbean", "Caribbean (Kingston)", "North America", 17.9712, -76.7936],
    ["central-america", "Central America (Guatemala City)", "North America", 14.6349, -90.5069],
    ["south-america", "South America (Brasilia)", "South America", -15.7939, -47.8828],
    ["northern-america", "Northern America (Washington)", "North America", 38.9072, -77.0369],
    ["central-asia", "Central Asia (Tashkent)", "Asia", 41.2995, 69.2401],
    ["eastern-asia", "Eastern Asia (Tokyo)", "Asia", 35.6762, 139.6503],
    ["south-eastern-asia", "South-eastern Asia (Singapore)", "Asia", 1.3521, 103.8198],
    ["southern-asia", "Southern Asia (New Delhi)", "Asia", 28.6139, 77.209],
    ["western-asia", "Western Asia (Ankara)", "Asia", 39.9334, 32.8597],
    ["eastern-europe", "Eastern Europe (Moscow)", "Europe", 55.7558, 37.6173],
    ["northern-europe", "Northern Europe (Stockholm)", "Europe", 59.3293, 18.0686],
    ["southern-europe", "Southern Europe (Rome)", "Europe", 41.9028, 12.4964],
    ["western-europe", "Western Europe (Paris)", "Europe", 48.8566, 2.3522],
    ["australia-new-zealand", "Australia and New Zealand (Canberra)", "Oceania", -35.2809, 149.13],
    ["melanesia", "Melanesia (Port Moresby)", "Oceania", -9.4438, 147.1803],
    ["micronesia", "Micronesia (Palikir)", "Oceania", 6.9248, 158.1611],
    ["polynesia", "Polynesia (Apia)", "Oceania", -13.8506, -171.7513],
    ["antarctica", "Antarctica (McMurdo Station)", "Antarctica", -77.8463, 166.6762],
    ["arctic-ocean", "Arctic Ocean (85N 0E)", "Arctic Ocean", 85, 0],
    ["north-atlantic", "North Atlantic Ocean (35N 40W)", "Atlantic Ocean", 35, -40],
    ["south-atlantic", "South Atlantic Ocean (25S 15W)", "Atlantic Ocean", -25, -15],
    ["north-pacific", "North Pacific Ocean (35N 150W)", "Pacific Ocean", 35, -150],
    ["south-pacific", "South Pacific Ocean (30S 120W)", "Pacific Ocean", -30, -120],
    ["indian-ocean", "Indian Ocean (20S 75E)", "Indian Ocean", -20, 75],
    ["southern-ocean", "Southern Ocean (60S 90E)", "Southern Ocean", -60, 90],
  ].map(([id, name, area, lat, lon]) => Object.freeze({ id, name, area, lat, lon })),
);

export function weatherBatchUrl(anchors = WEATHER_ANCHORS) {
  const p = new URLSearchParams({
    latitude: anchors.map((a) => a.lat).join(","),
    longitude: anchors.map((a) => a.lon).join(","),
    current: OPEN_METEO.fields.join(","),
    timezone: "UTC",
  });
  return `${OPEN_METEO.endpoint}?${p.toString()}`;
}

export function severeFlags(cur) {
  const flags = [];
  const code = cur.weather_code;
  if ([95, 96, 99].includes(code)) flags.push("thunderstorm");
  if ([65, 67, 75, 82, 86].includes(code) || (Number.isFinite(cur.precipitation) && cur.precipitation >= 10)) flags.push("heavy_precip");
  if (Number.isFinite(cur.wind_gusts_10m) && cur.wind_gusts_10m >= 90) flags.push("storm_gusts");
  if (Number.isFinite(cur.wind_gusts_10m) && cur.wind_gusts_10m >= 118) flags.push("hurricane_gusts");
  if (Number.isFinite(cur.temperature_2m) && cur.temperature_2m >= 40) flags.push("extreme_heat");
  if (Number.isFinite(cur.temperature_2m) && cur.temperature_2m <= -30) flags.push("extreme_cold");
  return flags;
}

const WMO = { 0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "rime fog", 51: "light drizzle", 53: "drizzle", 55: "dense drizzle", 56: "freezing drizzle", 57: "dense freezing drizzle", 61: "light rain", 63: "rain", 65: "heavy rain", 66: "freezing rain", 67: "heavy freezing rain", 71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains", 80: "light showers", 81: "showers", 82: "violent showers", 85: "snow showers", 86: "heavy snow showers", 95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with heavy hail" };

/** One row per anchor. A missing anchor is a gap row; nothing is filled in. */
export function parseWeatherBatch(body, anchors = WEATHER_ANCHORS) {
  const list = Array.isArray(body) ? body : body ? [body] : [];
  return anchors.map((anchor, i) => {
    const row = list[i];
    const cur = row && row.current;
    if (!cur || typeof cur.temperature_2m !== "number") {
      return { anchor, gap: true, reason: "Open-Meteo returned no current block for this point. Nothing was filled in." };
    }
    const reading = {};
    for (const f of OPEN_METEO.fields) reading[f] = typeof cur[f] === "number" ? cur[f] : null;
    return {
      anchor,
      gap: false,
      observed_at: cur.time ? new Date(`${cur.time}Z`).toISOString() : null,
      grid: { lat: row.latitude, lon: row.longitude, elevation_m: row.elevation ?? null },
      reading,
      conditions: WMO[reading.weather_code] || null,
      severe: severeFlags(reading),
    };
  });
}

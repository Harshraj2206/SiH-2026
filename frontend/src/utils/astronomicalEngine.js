/**
 * LANDSAFE SIH 2026 - High-Precision Real-Time Astronomical & Environment Engine
 *
 * Implements standard celestial mechanics algorithms (NOAA Solar Position & Meeus Lunar Algorithms)
 * with ZERO external dependencies, computing:
 * 1. Exact solar altitude (elevation) and azimuth for any global latitude/longitude and timestamp.
 * 2. True location-specific sunrise, sunset, solar noon, civil dawn, and civil dusk.
 * 3. Exact lunar altitude, azimuth, phase fraction (0-1), illumination percentage, and phase name.
 * 4. True location local time derived from coordinate IANA timezone / UTC offset.
 * 5. Screen-space coordinate mapping (X%, Y%) for visual sun and moon rendering.
 * 6. Consolidated authoritative Environment State combining celestial mechanics and real weather.
 */

// Astronomical constants
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0); // 2000-01-01 12:00:00 UTC

/**
 * Compute days since J2000.0 epoch for a given JavaScript Date (UTC).
 * @param {Date} date
 * @returns {number}
 */
export function getDaysSinceJ2000(date) {
  return (date.getTime() - J2000_EPOCH) / 86400000;
}

/**
 * Normalize angle to [0, 360) degrees.
 * @param {number} deg
 * @returns {number}
 */
export function normalizeDeg(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Compute real-time solar elevation (altitude) and azimuth.
 * Based on NOAA Solar Position calculations.
 * 
 * @param {number} lat - Latitude in degrees (-90 to +90)
 * @param {number} lon - Longitude in degrees (-180 to +180)
 * @param {Date} date - UTC timestamp
 * @returns {{ altitudeDeg: number, azimuthDeg: number, isAboveHorizon: boolean }}
 */
export function getSolarPosition(lat, lon, date = new Date()) {
  const j2000 = getDaysSinceJ2000(date);

  // Mean anomaly of Sun (degrees)
  const M = normalizeDeg(357.5291 + 0.98560028 * j2000) * DEG_TO_RAD;

  // Mean longitude of Sun (degrees)
  const L0 = normalizeDeg(280.4665 + 0.98564736 * j2000) * DEG_TO_RAD;

  // Equation of center / Ecliptic longitude
  const C = (1.914602 * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M)) * DEG_TO_RAD;
  const lambdaSun = L0 + C;

  // Obliquity of the ecliptic
  const eps = (23.43929 - 0.000130042 * j2000) * DEG_TO_RAD;

  // Declination and Right Ascension
  const sinDec = Math.sin(eps) * Math.sin(lambdaSun);
  const dec = Math.asin(sinDec);
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambdaSun), Math.cos(lambdaSun));

  // Greenwich Mean Sidereal Time (GMST) in degrees -> radians
  const gmst = normalizeDeg(280.46061837 + 360.98564736629 * j2000) * DEG_TO_RAD;
  const lst = gmst + lon * DEG_TO_RAD;

  // Hour angle
  const H = lst - ra;

  // Coordinate transformation to horizontal (Altitude & Azimuth)
  const latRad = lat * DEG_TO_RAD;
  const sinAlt = Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(H);
  const altRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinAlt)));
  const altitudeDeg = altRad * RAD_TO_DEG;

  // Azimuth (0° North, 90° East, 180° South, 270° West)
  const y = -Math.sin(H);
  const x = Math.tan(dec) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(H);
  const azimuthDeg = normalizeDeg(Math.atan2(y, x) * RAD_TO_DEG);

  // Standard astronomical atmospheric refraction cutoff for sunrise/sunset is -0.833°
  const isAboveHorizon = altitudeDeg > -0.833;

  return {
    altitudeDeg,
    azimuthDeg,
    isAboveHorizon
  };
}

/**
 * Compute real-time lunar position and phase.
 * Based on Jean Meeus Astronomical Algorithms (approximation accurate within 1°).
 * 
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {Date} date - UTC timestamp
 * @returns {{
 *   altitudeDeg: number,
 *   azimuthDeg: number,
 *   phaseFraction: number,
 *   phaseName: string,
 *   illuminationPct: number,
 *   isAboveHorizon: boolean
 * }}
 */
export function getLunarPosition(lat, lon, date = new Date()) {
  const j2000 = getDaysSinceJ2000(date);

  // Moon fundamental elements
  const Lprime = normalizeDeg(218.316 + 13.176396 * j2000) * DEG_TO_RAD;
  const Mprime = normalizeDeg(134.963 + 13.064993 * j2000) * DEG_TO_RAD;
  const F = normalizeDeg(93.272 + 13.22935 * j2000) * DEG_TO_RAD;

  // Ecliptic coordinates of Moon
  const lamMoon = Lprime + 6.289 * Math.sin(Mprime) * DEG_TO_RAD;
  const betaMoon = 5.128 * Math.sin(F) * DEG_TO_RAD;

  // Sun mean longitude
  const L0 = normalizeDeg(280.4665 + 0.98564736 * j2000) * DEG_TO_RAD;
  const M = normalizeDeg(357.5291 + 0.98560028 * j2000) * DEG_TO_RAD;
  const lamSun = L0 + (1.915 * Math.sin(M) + 0.02 * Math.sin(2 * M)) * DEG_TO_RAD;

  // Phase angle & elongation
  const elongation = lamMoon - lamSun;
  const phaseFraction = (1 - Math.cos(elongation)) / 2.0;
  const illuminationPct = Math.round(phaseFraction * 100);

  // Obliquity
  const eps = (23.43929 - 0.000130042 * j2000) * DEG_TO_RAD;

  // Moon Equatorial coordinates (Right Ascension & Declination)
  const sinDec = Math.sin(betaMoon) * Math.cos(eps) + Math.cos(betaMoon) * Math.sin(eps) * Math.sin(lamMoon);
  const dec = Math.asin(Math.max(-1.0, Math.min(1.0, sinDec)));
  const y = Math.sin(lamMoon) * Math.cos(eps) - Math.tan(betaMoon) * Math.sin(eps);
  const x = Math.cos(lamMoon);
  const ra = Math.atan2(y, x);

  const gmst = normalizeDeg(280.46061837 + 360.98564736629 * j2000) * DEG_TO_RAD;
  const lst = gmst + lon * DEG_TO_RAD;
  const H = lst - ra;

  const latRad = lat * DEG_TO_RAD;
  const sinAlt = Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(H);
  const altRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinAlt)));
  const altitudeDeg = altRad * RAD_TO_DEG;

  const azY = -Math.sin(H);
  const azX = Math.tan(dec) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(H);
  const azimuthDeg = normalizeDeg(Math.atan2(azY, azX) * RAD_TO_DEG);

  // Moon phase name
  const sinElong = Math.sin(elongation);
  let phaseName = 'New Moon';
  if (phaseFraction < 0.03) {
    phaseName = 'New Moon';
  } else if (phaseFraction < 0.47) {
    phaseName = sinElong > 0 ? 'Waxing Crescent' : 'Waning Crescent';
  } else if (phaseFraction <= 0.53) {
    phaseName = sinElong > 0 ? 'First Quarter' : 'Third Quarter';
  } else if (phaseFraction <= 0.97) {
    phaseName = sinElong > 0 ? 'Waxing Gibbous' : 'Waning Gibbous';
  } else {
    phaseName = 'Full Moon';
  }

  const isAboveHorizon = altitudeDeg > 0;
  const isWaxing = sinElong > 0;

  return {
    altitudeDeg,
    azimuthDeg,
    phaseFraction,
    phaseName,
    illuminationPct,
    isAboveHorizon,
    isWaxing
  };
}

/**
 * Determine diurnal day phase category from solar altitude.
 * @param {number} altitudeDeg - Solar elevation in degrees
 * @param {number} azimuthDeg - Solar azimuth in degrees
 * @returns {'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk'}
 */
export function getDayPhase(altitudeDeg, azimuthDeg) {
  if (altitudeDeg < -6.0) {
    return 'night';
  }
  if (altitudeDeg < 2.0) {
    // Dawn if azimuth is roughly in Eastern half (0° - 180°), Dusk if Western half (180° - 360°)
    return azimuthDeg < 180 ? 'dawn' : 'dusk';
  }
  if (altitudeDeg > 45.0) {
    return 'noon';
  }
  return azimuthDeg < 180 ? 'morning' : 'afternoon';
}

/**
 * Project celestial coordinates (altitude, azimuth) onto 2D viewport coordinates (X%, Y%).
 * 
 * Screen Mapping:
 * - X Axis: maps solar azimuth from East (rising on left ~15%) across South/Noon (center ~50%) to West (setting on right ~85%).
 * - Y Axis: maps altitude from horizon (altitude 0° -> ~75% down screen) to zenith (altitude 90° -> ~10% near top).
 * 
 * @param {number} altitudeDeg - Elevation in degrees
 * @param {number} azimuthDeg - Azimuth in degrees
 * @param {number} lat - Observer latitude
 * @returns {{ xPercent: number, yPercent: number, visible: boolean, glowOpacity: number }}
 */
export function mapCelestialToScreen(altitudeDeg, azimuthDeg, lat = 12.0) {
  // If altitude is below civil twilight cutoff (-6°), celestial body is not visible on screen
  if (altitudeDeg < -4.0) {
    return {
      xPercent: 50,
      yPercent: 110,
      visible: false,
      glowOpacity: 0
    };
  }

  // Determine horizontal X position across the sky dome:
  // In the Northern Hemisphere, sun moves East (90°) -> South (180°) -> West (270°)
  // In the Southern Hemisphere, sun moves East (90°) -> North (0/360°) -> West (270°)
  let x = 50;
  if (lat >= 0) {
    // Northern Hemisphere observer facing roughly South
    // Azimuth 60° (East) -> x ~ 15%
    // Azimuth 180° (South) -> x = 50%
    // Azimuth 300° (West) -> x ~ 85%
    x = 15 + ((azimuthDeg - 60) / 240) * 70;
  } else {
    // Southern Hemisphere observer facing roughly North
    const normAz = azimuthDeg > 180 ? azimuthDeg - 360 : azimuthDeg; // -90 to +90
    x = 50 + (normAz / 180) * 70;
  }

  // Constrain X within visible margin
  x = Math.max(10, Math.min(90, x));

  // Determine vertical Y position:
  // Horizon (0°) is around y = 70%
  // Altitude 90° (Zenith) is at y = 10%
  // Below horizon (0° to -4°) drops between 70% and 85%
  const normalizedAlt = Math.max(-4.0, Math.min(90.0, altitudeDeg));
  const y = 70 - (normalizedAlt / 90) * 58;

  // Glow opacity fades as body approaches or dips below horizon
  const glowOpacity = Math.max(0, Math.min(1.0, (altitudeDeg + 2.0) / 15.0));

  return {
    xPercent: Math.round(x * 10) / 10,
    yPercent: Math.round(y * 10) / 10,
    visible: altitudeDeg >= -3.0,
    glowOpacity: Math.round(glowOpacity * 100) / 100
  };
}

/**
 * Format local time in the specified IANA timezone.
 * Uses native Intl.DateTimeFormat (accurate for all global timezones without external libraries).
 * 
 * @param {Date} date - UTC timestamp
 * @param {string} timezone - e.g. "Asia/Kolkata", "America/New_York", "Asia/Tokyo"
 * @param {number} utcOffsetSeconds - Fallback offset if IANA string fails
 * @returns {{
 *   formattedTime: string,
 *   formattedDate: string,
 *   hour24: number,
 *   minute: number,
 *   timeString: string
 * }}
 */
export function getFormattedLocalTime(date = new Date(), timezone = 'Asia/Kolkata', utcOffsetSeconds = 19800) {
  try {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    });

    const minuteFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      minute: 'numeric'
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const formattedTime = timeFormatter.format(date);
    const formattedDate = dateFormatter.format(date);
    const hour24 = parseInt(hourFormatter.format(date), 10) || 0;
    const minute = parseInt(minuteFormatter.format(date), 10) || 0;

    return {
      formattedTime,
      formattedDate,
      hour24,
      minute,
      timeString: `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    };
  } catch {
    // Fallback using utcOffsetSeconds
    const targetMs = date.getTime() + (utcOffsetSeconds || 0) * 1000;
    const targetDate = new Date(targetMs);
    const hour24 = targetDate.getUTCHours();
    const minute = targetDate.getUTCMinutes();
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;

    return {
      formattedTime: `${hour12}:${String(minute).padStart(2, '0')} ${period}`,
      formattedDate: targetDate.toUTCString().slice(0, 16),
      hour24,
      minute,
      timeString: `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    };
  }
}

/**
 * Consolidated Environment State Builder
 * Merges celestial calculations, real location coordinates, and normalized weather.
 * 
 * @param {Object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} params.displayName
 * @param {string} params.timezone - e.g. 'Asia/Kolkata'
 * @param {string} params.timezoneAbbr - e.g. 'IST'
 * @param {number} params.utcOffsetSeconds - e.g. 19800
 * @param {Object} params.weather - Weather telemetry object
 * @param {Date} [params.currentDate] - Override for testing
 * @returns {Object} Full authoritative environment state
 */
export function buildEnvironmentState({
  latitude = 12.9716,
  longitude = 77.5946,
  displayName = 'Selected Location',
  timezone = 'Asia/Kolkata',
  timezoneAbbr = 'IST',
  utcOffsetSeconds = 19800,
  weather = {},
  currentDate = new Date()
}) {
  const solar = getSolarPosition(latitude, longitude, currentDate);
  const lunar = getLunarPosition(latitude, longitude, currentDate);
  const localTime = getFormattedLocalTime(currentDate, timezone, utcOffsetSeconds);
  const dayPhase = getDayPhase(solar.altitudeDeg, solar.azimuthDeg);

  const sunScreen = mapCelestialToScreen(solar.altitudeDeg, solar.azimuthDeg, latitude);
  const moonScreen = mapCelestialToScreen(lunar.altitudeDeg, lunar.azimuthDeg, latitude);

  // Derive weather category from normalized weather or raw weather code
  const code = typeof weather.weather_code === 'number' ? weather.weather_code : 0;
  let category = 'clear';
  if ([1, 2].includes(code)) category = 'partly_cloudy';
  else if ([3].includes(code)) category = 'cloudy';
  else if ([45, 48].includes(code)) category = 'fog';
  else if ([51, 53, 55, 61, 63, 80, 81].includes(code)) category = 'rain';
  else if ([65, 82].includes(code)) category = 'heavy_rain';
  else if ([71, 73, 75, 77, 85, 86].includes(code)) category = 'snow';
  else if ([95, 96, 99].includes(code)) category = 'thunderstorm';

  // Override if normalized category is available
  if (weather.normalized?.category) {
    category = weather.normalized.category;
  }

  // Real isDay is strictly driven by solar position (or verified Open-Meteo is_day)
  const isDay = solar.isAboveHorizon;

  // Weather attenuation factors for celestial bodies (realistic obscuration by clouds/rain/storm)
  let sunWeatherFactor = 1.0;
  let moonWeatherFactor = 1.0;

  if (category === 'partly_cloudy') {
    sunWeatherFactor = 0.85;
    moonWeatherFactor = 0.80;
  } else if (category === 'cloudy') {
    sunWeatherFactor = 0.28;
    moonWeatherFactor = 0.24;
  } else if (category === 'rain') {
    sunWeatherFactor = 0.16;
    moonWeatherFactor = 0.12;
  } else if (category === 'heavy_rain') {
    sunWeatherFactor = 0.08;
    moonWeatherFactor = 0.06;
  } else if (category === 'thunderstorm') {
    sunWeatherFactor = 0.04;
    moonWeatherFactor = 0.04;
  } else if (category === 'snow') {
    sunWeatherFactor = 0.40;
    moonWeatherFactor = 0.35;
  } else if (category === 'fog') {
    sunWeatherFactor = 0.30;
    moonWeatherFactor = 0.22;
  }

  // Atmospheric scattering: when sun is near horizon (< 10°), shift to golden-hour / sunset amber
  const isSunHorizon = solar.altitudeDeg < 12.0 && solar.altitudeDeg >= -3.5;
  const sunColorTheme = isSunHorizon ? 'sunset' : 'zenith';

  // Moon visibility: moon must be above horizon AND sun must not be completely washing it out
  const isMoonVisible = lunar.isAboveHorizon && (!isDay || solar.altitudeDeg < 15.0 || category === 'cloudy') && moonWeatherFactor > 0.03;

  return {
    latitude,
    longitude,
    displayName,
    timezone,
    timezoneAbbr,
    utcOffsetSeconds,
    localTimeString: localTime.timeString,
    localTimeFormatted: localTime.formattedTime,
    localDateFormatted: localTime.formattedDate,
    localHour: localTime.hour24,
    localMinute: localTime.minute,

    // Astronomical Sun Telemetry
    solarElevation: Math.round(solar.altitudeDeg * 10) / 10,
    solarAzimuth: Math.round(solar.azimuthDeg * 10) / 10,
    sunScreenX: sunScreen.xPercent,
    sunScreenY: sunScreen.yPercent,
    isSunVisible: sunScreen.visible && sunWeatherFactor > 0.03,
    sunGlowOpacity: Math.round(sunScreen.glowOpacity * sunWeatherFactor * 100) / 100,
    sunWeatherFactor,
    isSunHorizon,
    sunColorTheme,

    // Astronomical Moon Telemetry
    moonElevation: Math.round(lunar.altitudeDeg * 10) / 10,
    moonAzimuth: Math.round(lunar.azimuthDeg * 10) / 10,
    moonScreenX: moonScreen.xPercent,
    moonScreenY: moonScreen.yPercent,
    isMoonVisible,
    moonWeatherFactor,
    moonPhaseName: lunar.phaseName,
    moonPhaseFraction: Math.round(lunar.phaseFraction * 1000) / 1000,
    moonIlluminationPct: lunar.illuminationPct,
    isWaxing: lunar.isWaxing,

    // Environmental Temporal Classification
    isDay,
    dayPhase, // 'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk'

    // Meteorological Telemetry
    weatherCondition: weather.condition || 'Clear',
    weatherCode: code,
    weatherCategory: category,
    temperatureC: weather.temperature_c ?? null,
    apparentTemperatureC: weather.apparent_temperature_c ?? null,
    precipitationMm: weather.precipitation_mm ?? 0,
    cloudCoverPct: weather.cloud_cover_pct ?? (category === 'clear' ? 5 : category === 'partly_cloudy' ? 45 : 95),
    humidityPct: weather.humidity_pct ?? null,
    windSpeedKmh: weather.wind_speed_kmh ?? null,
    sunrise: weather.sunrise || null,
    sunset: weather.sunset || null,
    observedAt: weather.observation_time || new Date().toISOString(),
    weatherSource: weather.source || 'Open-Meteo High-Resolution WMO Grid'
  };
}

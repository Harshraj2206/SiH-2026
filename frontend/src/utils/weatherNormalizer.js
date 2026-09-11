/**
 * LANDSAFE SIH 2026 - Authoritative Unified Weather Normalizer
 * Pure, deterministic mapping from real WMO weather codes, live temperature, and current precipitation
 * to normalized weather states, icons, visual themes, localized labels, and astronomical day/night states.
 */

export const WEATHER_TYPES = {
  CLEAR_DAY: 'CLEAR_DAY',
  CLEAR_COLD: 'CLEAR_COLD',
  CLEAR_NIGHT: 'CLEAR_NIGHT',
  PARTLY_CLOUDY: 'PARTLY_CLOUDY',
  CLOUDY: 'CLOUDY',
  OVERCAST: 'OVERCAST',
  FOG: 'FOG',
  DRIZZLE: 'DRIZZLE',
  RAIN: 'RAIN',
  HEAVY_RAIN: 'HEAVY_RAIN',
  FREEZING_RAIN: 'FREEZING_RAIN',
  SNOW: 'SNOW',
  HEAVY_SNOW: 'HEAVY_SNOW',
  THUNDERSTORM: 'THUNDERSTORM',
  LOADING: 'LOADING',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Normalizes raw meteorological telemetry into a deterministic weather descriptor.
 * @param {Object} raw - Raw weather object or inspected zone data.
 * @returns {Object} Normalized weather descriptor with day/night awareness.
 */
export function normalizeWeather(raw) {
  if (!raw) {
    return {
      type: WEATHER_TYPES.UNKNOWN,
      category: 'unknown',
      label: 'Weather Unavailable',
      icon: '🌐',
      temp: null,
      tempFormatted: '—',
      rain24h: null,
      currentRain: null,
      humidity: null,
      isDay: true,
      theme: 'neutral',
      source: 'Authoritative Satellite Grid',
      observationTime: null
    };
  }

  if (raw.is_weather_loading) {
    return {
      type: WEATHER_TYPES.LOADING,
      category: 'loading',
      label: 'Updating Weather Telemetry...',
      icon: '⏳',
      temp: null,
      tempFormatted: '...',
      rain24h: null,
      currentRain: null,
      humidity: null,
      isDay: true,
      theme: 'loading',
      source: 'Querying Satellite Telemetry',
      observationTime: null
    };
  }

  const temp = typeof raw.temperature_c === 'number' ? raw.temperature_c : (typeof raw.temp === 'number' ? raw.temp : null);
  const tempFormatted = temp !== null ? `${Math.round(temp)}°C` : '—';
  const rawR24 = raw.rainfall_24h !== undefined ? raw.rainfall_24h : raw.precipitation_24h_mm;
  const rain24h = (rawR24 !== null && rawR24 !== undefined && !isNaN(rawR24)) ? Number(rawR24) : null;
  const rawRCur = raw.rain_current_mm !== undefined ? raw.rain_current_mm : (raw.precipitation_1h_mm !== undefined ? raw.precipitation_1h_mm : raw.rainfall_1h);
  const currentRain = (rawRCur !== null && rawRCur !== undefined && !isNaN(rawRCur)) ? Number(rawRCur) : null;
  const humidity = typeof raw.humidity_pct === 'number' ? raw.humidity_pct : (typeof raw.relative_humidity_pct === 'number' ? raw.relative_humidity_pct : null);
  const weatherCode = typeof raw.weather_code === 'number' ? raw.weather_code : (typeof raw.code === 'number' ? raw.code : null);
  const conditionStr = String(raw.condition || '').toLowerCase().trim();
  const isDay = raw.is_day !== undefined ? Boolean(raw.is_day) : true;
  const source = raw.weather_source || raw.source || 'Open-Meteo / WMO Satellite Grid';
  const observationTime = raw.observation_time || raw.inspected_at || null;

  // 1. Thunderstorm (WMO 95, 96, 99)
  if (
    weatherCode === 95 || weatherCode === 96 || weatherCode === 99 ||
    conditionStr.includes('thunder') || conditionStr.includes('storm')
  ) {
    return {
      type: WEATHER_TYPES.THUNDERSTORM,
      category: 'thunderstorm',
      label: isDay ? 'Thunderstorm' : 'Night Thunderstorm',
      icon: '⛈️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'thunderstorm' : 'thunderstorm_night',
      source,
      observationTime
    };
  }

  // 2. Snow / Sleet (WMO 71, 73, 75, 77, 85, 86)
  if (
    weatherCode === 71 || weatherCode === 73 || weatherCode === 75 ||
    weatherCode === 77 || weatherCode === 85 || weatherCode === 86 ||
    conditionStr.includes('snow') || conditionStr.includes('blizzard') || conditionStr.includes('sleet')
  ) {
    const isHeavy = weatherCode === 75 || weatherCode === 86 || conditionStr.includes('heavy') || conditionStr.includes('blizzard');
    return {
      type: isHeavy ? WEATHER_TYPES.HEAVY_SNOW : WEATHER_TYPES.SNOW,
      category: 'snow',
      label: isHeavy ? 'Heavy Snowfall' : (isDay ? 'Snowfall' : 'Night Snowfall'),
      icon: '❄️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'snow' : 'snow_night',
      source,
      observationTime
    };
  }

  // 3. Freezing Rain / Freezing Drizzle (WMO 56, 57, 66, 67)
  if (weatherCode === 56 || weatherCode === 57 || weatherCode === 66 || weatherCode === 67 || conditionStr.includes('freezing')) {
    return {
      type: WEATHER_TYPES.FREEZING_RAIN,
      category: 'snow',
      label: 'Freezing Rain',
      icon: '🌨️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'snow' : 'snow_night',
      source,
      observationTime
    };
  }

  // 4. Violent / Heavy Rain (WMO 65, 82)
  if (weatherCode === 65 || weatherCode === 82 || conditionStr.includes('violent rain') || conditionStr.includes('heavy rain')) {
    return {
      type: WEATHER_TYPES.HEAVY_RAIN,
      category: 'heavy_rain',
      label: isDay ? 'Heavy Rain' : 'Heavy Night Rain',
      icon: '🌧️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'rain' : 'rain_night',
      source,
      observationTime
    };
  }

  // 5. Rain / Rain Showers (WMO 61, 63, 80, 81)
  if (weatherCode === 61 || weatherCode === 63 || weatherCode === 80 || weatherCode === 81) {
    const isLight = weatherCode === 61 || weatherCode === 80;
    return {
      type: WEATHER_TYPES.RAIN,
      category: 'rain',
      label: isLight ? (isDay ? 'Light Rain Showers' : 'Light Night Showers') : (isDay ? 'Rain Showers' : 'Night Rain Showers'),
      icon: '🌧️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'rain' : 'rain_night',
      source,
      observationTime
    };
  }

  // 6. Drizzle (WMO 51, 53, 55)
  if (weatherCode === 51 || weatherCode === 53 || weatherCode === 55 || conditionStr.includes('drizzle')) {
    return {
      type: WEATHER_TYPES.DRIZZLE,
      category: 'rain',
      label: isDay ? 'Light Drizzle' : 'Night Drizzle',
      icon: '🌦️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'rain' : 'rain_night',
      source,
      observationTime
    };
  }

  // 7. Fog / Mist (WMO 45, 48)
  if (weatherCode === 45 || weatherCode === 48 || conditionStr.includes('fog') || conditionStr.includes('mist') || conditionStr.includes('haze')) {
    return {
      type: WEATHER_TYPES.FOG,
      category: 'fog',
      label: isDay ? 'Fog / Mist' : 'Night Mist',
      icon: '🌫️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'fog' : 'fog_night',
      source,
      observationTime
    };
  }

  // 8. Overcast (WMO 3)
  if (weatherCode === 3 || conditionStr.includes('overcast')) {
    return {
      type: WEATHER_TYPES.OVERCAST,
      category: 'cloudy',
      label: isDay ? 'Overcast Sky' : 'Overcast Night',
      icon: '☁️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'cloudy' : 'cloudy_night',
      source,
      observationTime
    };
  }

  // 9. Partly Cloudy (WMO 2)
  if (weatherCode === 2 || conditionStr.includes('partly')) {
    return {
      type: WEATHER_TYPES.PARTLY_CLOUDY,
      category: 'partly_cloudy',
      label: isDay ? 'Partly Cloudy' : 'Partly Cloudy Night',
      icon: isDay ? '⛅' : '☁️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'cloudy' : 'cloudy_night',
      source,
      observationTime
    };
  }

  // 10. Mainly Clear (WMO 1)
  if (weatherCode === 1 || conditionStr.includes('mainly clear')) {
    if (!isDay) {
      return {
        type: WEATHER_TYPES.CLEAR_NIGHT,
        category: 'clear',
        label: 'Mainly Clear Night',
        icon: '🌙',
        temp,
        tempFormatted,
        rain24h,
        currentRain,
        humidity,
        isDay: false,
        theme: 'clear_night',
        source,
        observationTime
      };
    }
    return {
      type: WEATHER_TYPES.CLEAR_DAY,
      category: 'clear',
      label: 'Mainly Clear Sky',
      icon: '🌤️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay: true,
      theme: 'sunny',
      source,
      observationTime
    };
  }

  // 11. Clear Sky (WMO 0)
  if (weatherCode === 0 || conditionStr.includes('clear') || conditionStr.includes('sunny')) {
    if (temp !== null && temp <= -10) {
      return {
        type: isDay ? WEATHER_TYPES.CLEAR_COLD : WEATHER_TYPES.CLEAR_NIGHT,
        category: 'clear',
        label: isDay ? 'Sub-Zero Clear' : 'Polar Clear Night',
        icon: isDay ? '☀️' : '🌙',
        temp,
        tempFormatted,
        rain24h,
        currentRain,
        humidity,
        isDay,
        theme: isDay ? 'clear_cold' : 'clear_night',
        source,
        observationTime
      };
    }

    if (!isDay) {
      return {
        type: WEATHER_TYPES.CLEAR_NIGHT,
        category: 'clear',
        label: 'Clear Night Sky',
        icon: '🌙',
        temp,
        tempFormatted,
        rain24h,
        currentRain,
        humidity,
        isDay: false,
        theme: 'clear_night',
        source,
        observationTime
      };
    }

    return {
      type: WEATHER_TYPES.CLEAR_DAY,
      category: 'clear',
      label: 'Clear Skies',
      icon: '☀️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay: true,
      theme: 'sunny',
      source,
      observationTime
    };
  }

  // 12. Fallback check for explicit string labels if weatherCode was null
  if (conditionStr.includes('rain') || conditionStr.includes('shower')) {
    return {
      type: WEATHER_TYPES.RAIN,
      category: 'rain',
      label: isDay ? 'Rain Showers' : 'Night Rain',
      icon: '🌧️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'rain' : 'rain_night',
      source,
      observationTime
    };
  }

  if (conditionStr.includes('cloud')) {
    return {
      type: WEATHER_TYPES.CLOUDY,
      category: 'cloudy',
      label: isDay ? 'Cloudy Sky' : 'Cloudy Night',
      icon: isDay ? '⛅' : '☁️',
      temp,
      tempFormatted,
      rain24h,
      currentRain,
      humidity,
      isDay,
      theme: isDay ? 'cloudy' : 'cloudy_night',
      source,
      observationTime
    };
  }

  // Safe default: Neutral / Unavailable - NEVER fake rain!
  return {
    type: WEATHER_TYPES.UNKNOWN,
    category: 'unknown',
    label: conditionStr ? (conditionStr.charAt(0).toUpperCase() + conditionStr.slice(1)) : 'Live Weather Standby',
    icon: isDay ? '⛅' : '🌙',
    temp,
    tempFormatted,
    rain24h,
    currentRain,
    humidity,
    isDay,
    theme: isDay ? 'neutral' : 'clear_night',
    source,
    observationTime
  };
}

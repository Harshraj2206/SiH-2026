/**
 * LANDSAFE SIH 2026 - Authoritative Unified Weather Normalizer
 * Pure, deterministic mapping from real WMO weather codes, temperature, and precipitation
 * to normalized weather states, icons, visual themes, and localized labels.
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
 * @returns {Object} Normalized weather descriptor.
 */
export function normalizeWeather(raw) {
  if (!raw) {
    return {
      type: WEATHER_TYPES.UNKNOWN,
      label: 'Weather Unavailable',
      icon: '🌐',
      temp: null,
      tempFormatted: '—',
      rain24h: 0,
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
      label: 'Updating Weather Telemetry...',
      icon: '⏳',
      temp: null,
      tempFormatted: '...',
      rain24h: 0,
      humidity: null,
      isDay: true,
      theme: 'loading',
      source: 'Querying Satellite Telemetry',
      observationTime: null
    };
  }

  const temp = typeof raw.temperature_c === 'number' ? raw.temperature_c : (typeof raw.temp === 'number' ? raw.temp : null);
  const tempFormatted = temp !== null ? `${Math.round(temp)}°C` : '—';
  const rain24h = Number(raw.rainfall_24h || raw.precipitation_24h_mm || raw.precipitation_1h_mm || 0);
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
      label: 'Thunderstorm',
      icon: '⛈️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay,
      theme: 'thunderstorm',
      source,
      observationTime
    };
  }

  // 2. Snow / Blizzard / Freezing Conditions (WMO 71, 73, 75, 77, 85, 86, 56, 57, 66, 67)
  if (
    weatherCode === 71 || weatherCode === 73 || weatherCode === 75 ||
    weatherCode === 77 || weatherCode === 85 || weatherCode === 86 ||
    conditionStr.includes('snow') || conditionStr.includes('blizzard') || conditionStr.includes('sleet')
  ) {
    const isHeavy = weatherCode === 75 || weatherCode === 86 || conditionStr.includes('heavy') || conditionStr.includes('blizzard');
    return {
      type: isHeavy ? WEATHER_TYPES.HEAVY_SNOW : WEATHER_TYPES.SNOW,
      label: isHeavy ? 'Heavy Snowfall / Blizzard' : 'Snowfall',
      icon: '❄️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay,
      theme: 'snow',
      source,
      observationTime
    };
  }

  // Freezing Rain / Freezing Drizzle
  if (weatherCode === 56 || weatherCode === 57 || weatherCode === 66 || weatherCode === 67 || conditionStr.includes('freezing')) {
    return {
      type: WEATHER_TYPES.FREEZING_RAIN,
      label: 'Freezing Rain & Ice',
      icon: '🌨️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay,
      theme: 'snow',
      source,
      observationTime
    };
  }

  // 3. Heavy Rain / Rain Showers (WMO 61, 63, 65, 80, 81, 82)
  if (
    weatherCode === 65 || weatherCode === 82 ||
    (rain24h > 35 && (weatherCode === 61 || weatherCode === 63 || weatherCode === 80 || weatherCode === 81))
  ) {
    return {
      type: WEATHER_TYPES.HEAVY_RAIN,
      label: 'Heavy Rain Showers',
      icon: '🌧️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay,
      theme: 'rain',
      source,
      observationTime
    };
  }

  if (
    weatherCode === 61 || weatherCode === 63 || weatherCode === 80 || weatherCode === 81 ||
    conditionStr.includes('rain') || conditionStr.includes('shower') || (rain24h > 5 && weatherCode !== 0 && weatherCode !== 1 && weatherCode !== 2)
  ) {
    return {
      type: WEATHER_TYPES.RAIN,
      label: 'Rain Showers',
      icon: '🌧️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay,
      theme: 'rain',
      source,
      observationTime
    };
  }

  // 4. Drizzle (WMO 51, 53, 55)
  if (weatherCode === 51 || weatherCode === 53 || weatherCode === 55 || conditionStr.includes('drizzle')) {
    return {
      type: WEATHER_TYPES.DRIZZLE,
      label: 'Light Drizzle',
      icon: '🌦️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay,
      theme: 'rain',
      source,
      observationTime
    };
  }

  // 5. Fog / Mist (WMO 45, 48)
  if (weatherCode === 45 || weatherCode === 48 || conditionStr.includes('fog') || conditionStr.includes('mist') || conditionStr.includes('haze')) {
    return {
      type: WEATHER_TYPES.FOG,
      label: 'Dense Fog / Mist',
      icon: '🌫️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay,
      theme: 'fog',
      source,
      observationTime
    };
  }

  // 6. Overcast (WMO 3)
  if (weatherCode === 3 || conditionStr.includes('overcast')) {
    return {
      type: WEATHER_TYPES.OVERCAST,
      label: 'Overcast Skies',
      icon: '☁️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay,
      theme: 'cloudy',
      source,
      observationTime
    };
  }

  // 7. Partly Cloudy / Cloudy (WMO 1, 2)
  if (weatherCode === 1 || weatherCode === 2 || conditionStr.includes('cloud')) {
    return {
      type: WEATHER_TYPES.PARTLY_CLOUDY,
      label: isDay ? 'Partly Cloudy' : 'Partly Cloudy Night',
      icon: isDay ? '⛅' : '☁️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay,
      theme: 'cloudy',
      source,
      observationTime
    };
  }

  // 8. Clear Sky (WMO 0)
  if (weatherCode === 0 || conditionStr.includes('clear') || conditionStr.includes('sunny')) {
    // Extreme cold clear (e.g. Antarctica daylight sub-zero clear)
    if (temp !== null && temp <= -10) {
      if (!isDay) {
        return {
          type: WEATHER_TYPES.CLEAR_NIGHT,
          label: 'Polar Clear Night',
          icon: '🌙',
          temp,
          tempFormatted,
          rain24h,
          humidity,
          isDay: false,
          theme: 'clear_cold',
          source,
          observationTime
        };
      }
      return {
        type: WEATHER_TYPES.CLEAR_COLD,
        label: 'Sub-Zero Clear Skies',
        icon: '☀️',
        temp,
        tempFormatted,
        rain24h,
        humidity,
        isDay: true,
        theme: 'clear_cold',
        source,
        observationTime
      };
    }

    if (!isDay) {
      return {
        type: WEATHER_TYPES.CLEAR_NIGHT,
        label: 'Clear Night',
        icon: '🌙',
        temp,
        tempFormatted,
        rain24h,
        humidity,
        isDay: false,
        theme: 'clear_night',
        source,
        observationTime
      };
    }

    return {
      type: WEATHER_TYPES.CLEAR_DAY,
      label: 'Clear Skies',
      icon: '☀️',
      temp,
      tempFormatted,
      rain24h,
      humidity,
      isDay: true,
      theme: 'sunny',
      source,
      observationTime
    };
  }

  // Fallback with real temperature
  return {
    type: WEATHER_TYPES.UNKNOWN,
    label: conditionStr ? (conditionStr.charAt(0).toUpperCase() + conditionStr.slice(1)) : 'Data Unavailable',
    icon: '⛅',
    temp,
    tempFormatted,
    rain24h,
    humidity,
    isDay,
    theme: 'neutral',
    source,
    observationTime
  };
}

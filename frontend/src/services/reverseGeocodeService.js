/**
 * LANDSAFE SIH 2026 - Reverse Geocoding Service
 * Authoritative reverse geocoding using OpenStreetMap Nominatim with memory caching
 * and deterministic, non-fake coordinate fallback formatting.
 */

const geocodeCache = new Map();

/**
 * Format coordinates as standard cardinal coordinate string.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Formatted coordinate string
 */
export function formatCoordinateFallback(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return 'Location Unavailable';
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Reverse geocode a latitude and longitude into a readable location string.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{displayName: string, city: string, state: string, country: string, fullAddress: string}>}
 */
export async function reverseGeocode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return {
      displayName: 'Location Unavailable',
      city: '',
      state: '',
      country: '',
      fullAddress: ''
    };
  }

  // Cache key rounded to ~110m resolution (3 decimals) to prevent excessive Nominatim queries
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const fallback = {
    displayName: formatCoordinateFallback(lat, lng),
    isFallback: true,
    city: '',
    state: '',
    country: '',
    fullAddress: ''
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&zoom=14&addressdetails=1&accept-language=en`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LandSafe-Emergency-Risk-Platform/1.0'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[ReverseGeocode] Nominatim returned HTTP ${response.status}`);
      return fallback;
    }

    const data = await response.json();
    if (!data || !data.address) {
      geocodeCache.set(cacheKey, fallback);
      return fallback;
    }

    const addr = data.address;
    const locality = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.hamlet || '';
    const city = addr.city || addr.town || addr.municipality || addr.county || addr.state_district || '';
    const state = addr.state || '';
    const country = addr.country || '';

    // Compose concise human-friendly primary label
    let displayName = '';
    if (locality && city && locality !== city) {
      displayName = `${locality}, ${city}`;
    } else if (city && state) {
      displayName = `${city}, ${state}`;
    } else if (city) {
      displayName = city;
    } else if (state) {
      displayName = `${state}, ${country || ''}`.trim().replace(/,$/, '');
    } else if (data.display_name) {
      // Pick first 2 components of display_name
      displayName = data.display_name.split(',').slice(0, 2).map(s => s.trim()).join(', ');
    } else {
      displayName = formatCoordinateFallback(lat, lng);
    }

    const result = {
      displayName,
      city: city || locality,
      state,
      country,
      fullAddress: data.display_name || displayName
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[ReverseGeocode] Error or timeout querying Nominatim:', err.message);
    return fallback;
  }
}

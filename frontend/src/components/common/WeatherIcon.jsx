import React from 'react';
import { Sun, Moon, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning, Loader2, Globe } from 'lucide-react';

// Line icon for a normalized weather theme (replaces the emoji icons)
const ICONS = {
  sunny: Sun,
  clear_cold: Sun,
  clear_night: Moon,
  cloudy: Cloud,
  cloudy_night: Cloud,
  rain: CloudRain,
  rain_night: CloudRain,
  snow: CloudSnow,
  snow_night: CloudSnow,
  fog: CloudFog,
  fog_night: CloudFog,
  thunderstorm: CloudLightning,
  thunderstorm_night: CloudLightning,
  loading: Loader2,
};

export const WeatherIcon = ({ theme, className = 'w-4 h-4' }) => {
  const Icon = ICONS[theme] || Globe;
  return <Icon className={className} strokeWidth={1.75} />;
};

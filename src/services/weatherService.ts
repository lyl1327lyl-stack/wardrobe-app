import { Weather } from '../types';

interface WttrResponse {
  current_condition: Array<{
    temp_C: string;
    humidity: string;
    weatherDesc: Array<{ value: string }>;
  }>;
  nearest_area?: Array<{
    areaName: Array<{ value: string }>;
  }>;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 小时

let cachedWeather: Weather | null = null;
let cachedAt: number = 0;

const WEATHER_MAP: Record<string, Weather['condition']> = {
  sunny: '晴',
  clear: '晴',
  cloudy: '多云',
  overcast: '阴',
  mist: '雾',
  fog: '雾',
  haze: '雾',
  rain: '雨',
  drizzle: '雨',
  shower: '雨',
  snow: '雪',
  sleet: '雪',
  blizzard: '雪',
};

function mapCondition(desc: string): Weather['condition'] {
  const lower = desc.toLowerCase();
  for (const [key, condition] of Object.entries(WEATHER_MAP)) {
    if (lower.includes(key)) return condition;
  }
  return '多云';
}

export async function getWeather(): Promise<Weather | null> {
  if (cachedWeather && Date.now() - cachedAt < CACHE_DURATION) {
    return cachedWeather;
  }

  try {
    const res = await fetch('https://wttr.in/?format=j1&lang=zh', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return cachedWeather;

    const data: WttrResponse = await res.json();
    const current = data.current_condition?.[0];
    if (!current) return cachedWeather;

    const city = data.nearest_area?.[0]?.areaName?.[0]?.value || '未知城市';

    cachedWeather = {
      temperature: Math.round(parseFloat(current.temp_C)),
      condition: mapCondition(current.weatherDesc?.[0]?.value || ''),
      humidity: parseInt(current.humidity, 10) || 0,
      city,
    };
    cachedAt = Date.now();
    return cachedWeather;
  } catch (error) {
    console.warn('Failed to fetch weather:', error);
    return cachedWeather; // 返回旧缓存，可能为 null
  }
}

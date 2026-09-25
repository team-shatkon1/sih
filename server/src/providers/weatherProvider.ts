export interface WeatherCurrentData {
  time?: string;
  temperature_2m?: number | null;
  apparent_temperature?: number | null;
  relative_humidity_2m?: number | null;
  precipitation?: number | null;
  cloud_cover?: number | null;
  surface_pressure?: number | null;
  wind_speed_10m?: number | null;
  wind_direction_10m?: number | null;
  wind_gusts_10m?: number | null;
  weather_code?: number | null;
}

export interface WeatherHourlyData {
  time: string[];
  temperature_2m?: (number | null)[];
  apparent_temperature?: (number | null)[];
  wind_speed_10m?: (number | null)[];
  wind_gusts_10m?: (number | null)[];
  wind_direction_10m?: (number | null)[];
  precipitation_probability?: (number | null)[];
  precipitation?: (number | null)[];
  surface_pressure?: (number | null)[];
  weather_code?: (number | null)[];
}

export interface WeatherDailyData {
  time: string[];
  weather_code?: (number | null)[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
}

export interface WeatherProviderResponse {
  current: WeatherCurrentData;
  hourly?: WeatherHourlyData;
  daily?: WeatherDailyData;
  units: Record<string, string>;
  source: string;
  timestamp: string;
  status: 'LIVE' | 'DEGRADED' | 'FALLBACK';
}

export class WeatherProvider {
  private static cache = new Map<string, { data: WeatherProviderResponse; expires: number }>();
  private static CACHE_TTL_MS = 10 * 60 * 1000;

  static async fetchWeatherData(latitude: number, longitude: number): Promise<WeatherProviderResponse> {
    const cacheKey = `${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code',
        hourly: 'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation_probability,precipitation,surface_pressure,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
        forecast_days: '7',
        timezone: 'auto'
      }).toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Weather provider HTTP ${response.status}`);
      }

      const json = await response.json() as {
        current?: WeatherCurrentData;
        hourly?: WeatherHourlyData;
        daily?: WeatherDailyData;
        current_units?: Record<string, string>;
      };

      const result: WeatherProviderResponse = {
        current: json.current ?? {},
        hourly: json.hourly,
        daily: json.daily,
        units: json.current_units ?? {
          temperature_2m: '°C',
          wind_speed_10m: 'km/h',
          wind_direction_10m: '°',
          precipitation: 'mm',
          relative_humidity_2m: '%',
          surface_pressure: 'hPa',
          cloud_cover: '%'
        },
        source: 'Open-Meteo Weather DWD/NOAA GFS',
        timestamp: json.current?.time ?? new Date().toISOString(),
        status: 'LIVE'
      };

      this.cache.set(cacheKey, { data: result, expires: Date.now() + this.CACHE_TTL_MS });
      return result;
    } catch (err) {
      const defaultUnits = {
        temperature_2m: '°C',
        wind_speed_10m: 'km/h',
        wind_direction_10m: '°',
        precipitation: 'mm',
        relative_humidity_2m: '%',
        surface_pressure: 'hPa',
        cloud_cover: '%'
      };

      const now = Date.now();
      const days = [0, 1, 2, 3, 4, 5, 6].map(d => new Date(now + d * 86400000).toISOString().split('T')[0]);

      return {
        current: {
          temperature_2m: 29.5,
          apparent_temperature: 33.2,
          wind_speed_10m: 16.2,
          wind_direction_10m: 260,
          wind_gusts_10m: 22.5,
          precipitation: 0.0,
          relative_humidity_2m: 76,
          surface_pressure: 1012,
          cloud_cover: 25,
          weather_code: 1,
          time: new Date().toISOString()
        },
        hourly: {
          time: [0, 3, 6, 9, 12, 18, 24, 36, 48].map(h => new Date(now + h * 3600000).toISOString()),
          temperature_2m: [29.5, 29.0, 28.0, 30.5, 31.0, 29.8, 29.2, 28.8, 28.5],
          apparent_temperature: [33.2, 32.5, 31.0, 34.2, 35.0, 33.5, 32.8, 32.0, 31.5],
          wind_speed_10m: [16.2, 17.0, 18.0, 20.0, 22.0, 18.5, 15.5, 14.5, 14.0],
          wind_gusts_10m: [22.5, 23.0, 25.0, 28.0, 30.0, 26.0, 21.0, 20.0, 19.0],
          wind_direction_10m: [260, 265, 270, 275, 270, 265, 260, 255, 250],
          precipitation_probability: [10, 15, 20, 25, 20, 15, 10, 10, 5],
          precipitation: [0.0, 0.0, 0.0, 0.1, 0.2, 0.0, 0.0, 0.0, 0.0],
          surface_pressure: [1012, 1012, 1011, 1011, 1012, 1013, 1013, 1014, 1014],
          weather_code: [1, 1, 2, 2, 3, 2, 1, 1, 1]
        },
        daily: {
          time: days,
          weather_code: [1, 2, 1, 3, 2, 1, 0],
          temperature_2m_max: [31.5, 31.0, 30.8, 29.5, 30.2, 31.0, 31.8],
          temperature_2m_min: [26.2, 26.0, 25.8, 25.0, 25.5, 26.0, 26.5],
          precipitation_probability_max: [20, 30, 25, 45, 35, 15, 10],
          wind_speed_10m_max: [22.0, 24.5, 21.0, 28.0, 23.0, 19.0, 18.0]
        },
        units: defaultUnits,
        source: 'Open-Meteo Weather (Degraded Fallback)',
        timestamp: new Date().toISOString(),
        status: 'DEGRADED'
      };
    }
  }
}


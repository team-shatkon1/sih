export interface MarineCurrentData {
  time?: string;
  wave_height?: number | null;
  wave_direction?: number | null;
  wave_period?: number | null;
  swell_wave_height?: number | null;
  sea_surface_temperature?: number | null;
  ocean_current_velocity?: number | null;
  ocean_current_direction?: number | null;
}

export interface MarineHourlyData {
  time: string[];
  wave_height?: (number | null)[];
  wave_period?: (number | null)[];
  sea_surface_temperature?: (number | null)[];
}

export interface MarineDailyData {
  time: string[];
  wave_height_max?: (number | null)[];
  wave_direction_dominant?: (number | null)[];
  wave_period_max?: (number | null)[];
}

export interface MarineProviderResponse {
  current: MarineCurrentData;
  hourly?: MarineHourlyData;
  daily?: MarineDailyData;
  units: Record<string, string>;
  source: string;
  timestamp: string;
  status: 'LIVE' | 'DEGRADED' | 'FALLBACK';
}

export class MarineProvider {
  private static cache = new Map<string, { data: MarineProviderResponse; expires: number }>();
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  static async fetchMarineData(latitude: number, longitude: number): Promise<MarineProviderResponse> {
    const cacheKey = `${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    try {
      const url = new URL('https://marine-api.open-meteo.com/v1/marine');
      url.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction',
        hourly: 'wave_height,wave_period,sea_surface_temperature',
        daily: 'wave_height_max,wave_direction_dominant,wave_period_max',
        forecast_days: '7',
        timezone: 'auto'
      }).toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Marine provider HTTP ${response.status}`);
      }

      const json = await response.json() as {
        current?: MarineCurrentData;
        hourly?: MarineHourlyData;
        daily?: MarineDailyData;
        current_units?: Record<string, string>;
      };

      const result: MarineProviderResponse = {
        current: json.current ?? {},
        hourly: json.hourly,
        daily: json.daily,
        units: json.current_units ?? {
          wave_height: 'm',
          wave_period: 's',
          wave_direction: '°',
          swell_wave_height: 'm',
          sea_surface_temperature: '°C',
          ocean_current_velocity: 'km/h',
          ocean_current_direction: '°'
        },
        source: 'Open-Meteo Marine Copernicus/ECMWF',
        timestamp: json.current?.time ?? new Date().toISOString(),
        status: 'LIVE'
      };

      this.cache.set(cacheKey, { data: result, expires: Date.now() + this.CACHE_TTL_MS });
      return result;
    } catch (err) {
      // Deterministic degraded model for when provider is unreachable or in land-locked point where marine grid lacks data
      const defaultUnits = {
        wave_height: 'm',
        wave_period: 's',
        wave_direction: '°',
        swell_wave_height: 'm',
        sea_surface_temperature: '°C',
        ocean_current_velocity: 'km/h',
        ocean_current_direction: '°'
      };

      const now = Date.now();
      const days = [0, 1, 2, 3, 4, 5, 6].map(d => new Date(now + d * 86400000).toISOString().split('T')[0]);

      return {
        current: {
          wave_height: 1.1,
          wave_period: 6.4,
          wave_direction: 245,
          swell_wave_height: 0.8,
          sea_surface_temperature: 28.3,
          ocean_current_velocity: 1.4,
          ocean_current_direction: 190,
          time: new Date().toISOString()
        },
        hourly: {
          time: [0, 3, 6, 9, 12, 18, 24, 36, 48].map(h => new Date(now + h * 3600000).toISOString()),
          wave_height: [1.1, 1.15, 1.2, 1.35, 1.4, 1.3, 1.2, 1.1, 1.05],
          wave_period: [6.4, 6.5, 6.6, 6.9, 7.0, 6.8, 6.6, 6.4, 6.2],
          sea_surface_temperature: [28.3, 28.3, 28.2, 28.4, 28.5, 28.4, 28.2, 28.1, 28.0]
        },
        daily: {
          time: days,
          wave_height_max: [1.2, 1.35, 1.4, 1.55, 1.4, 1.25, 1.15],
          wave_direction_dominant: [240, 245, 250, 255, 250, 245, 240],
          wave_period_max: [6.8, 7.0, 7.2, 7.5, 7.1, 6.9, 6.7]
        },
        units: defaultUnits,
        source: 'Open-Meteo Marine (Degraded Fallback)',
        timestamp: new Date().toISOString(),
        status: 'DEGRADED'
      };
    }
  }
}

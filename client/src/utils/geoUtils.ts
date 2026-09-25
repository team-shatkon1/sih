import { Coordinates } from '../types/orca.js';

/**
 * Strict geospatial clamping and normalization utility
 * Enforces -90 <= latitude <= 90 and -180 <= longitude <= 180.
 * Eliminates invalid coordinates like 32.187°N, -500.625°E.
 */
export function normalizeLongitude(lon: number): number {
  if (isNaN(lon)) return 0;
  // Wrap longitude into [-180, 180]
  let wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (wrapped === -180 && lon > 0) wrapped = 180;
  return Number(wrapped.toFixed(5));
}

export function clampLatitude(lat: number): number {
  if (isNaN(lat)) return 0;
  return Number(Math.max(-90, Math.min(90, lat)).toFixed(5));
}

export function validateAndClampCoordinates(coord: { latitude: number; longitude: number; name?: string; isMarine?: boolean }): Coordinates {
  const lat = clampLatitude(coord.latitude);
  const lon = normalizeLongitude(coord.longitude);
  return {
    latitude: lat,
    longitude: lon,
    name: coord.name,
    isMarine: coord.isMarine ?? true
  };
}

/**
 * Format coordinates into standard scientific marine notation.
 * e.g. 15.421° N, 73.812° E
 * Never produces negative signs with direction suffixes like -500.625°E.
 */
export function formatCoordinates(coord: Coordinates, decimals = 3): { latText: string; lonText: string; fullText: string } {
  const lat = clampLatitude(coord.latitude);
  const lon = normalizeLongitude(coord.longitude);

  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';

  const latText = `${Math.abs(lat).toFixed(decimals)}° ${latDir}`;
  const lonText = `${Math.abs(lon).toFixed(decimals)}° ${lonDir}`;

  return {
    latText,
    lonText,
    fullText: `${latText}, ${lonText}`
  };
}

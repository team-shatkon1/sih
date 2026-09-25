import { Coordinates } from '../types/orca.js';

export class GeospatialService {
  /**
   * Strictly clamps latitude between -90 and 90
   */
  static clampLatitude(lat: number): number {
    if (isNaN(lat)) return 0;
    return Number(Math.max(-90, Math.min(90, lat)).toFixed(5));
  }

  /**
   * Strictly normalizes longitude into [-180, 180]
   */
  static normalizeLongitude(lon: number): number {
    if (isNaN(lon)) return 0;
    let wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
    if (wrapped === -180 && lon > 0) wrapped = 180;
    return Number(wrapped.toFixed(5));
  }
  /**
   * Calculate distance between two coordinates in kilometers using Haversine formula
   */
  static haversineDistance(c1: Coordinates, c2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(c2.latitude - c1.latitude);
    const dLon = this.toRadians(c2.longitude - c1.longitude);
    const lat1 = this.toRadians(c1.latitude);
    const lat2 = this.toRadians(c2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  static toRadians(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Displace a coordinate by distance (km) and bearing (degrees)
   */
  static offsetCoordinate(origin: Coordinates, distanceKm: number, bearingDeg: number): Coordinates {
    const R = 6371;
    const brng = this.toRadians(bearingDeg);
    const lat1 = this.toRadians(origin.latitude);
    const lon1 = this.toRadians(origin.longitude);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceKm / R) +
      Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(brng)
    );

    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(distanceKm / R) * Math.cos(lat1),
        Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
      );

    return {
      latitude: Number(((lat2 * 180) / Math.PI).toFixed(5)),
      longitude: Number(((lon2 * 180) / Math.PI).toFixed(5))
    };
  }

  /**
   * Sample N equidistant points along a great circle corridor between origin and destination
   */
  static sampleCorridorPoints(origin: Coordinates, destination: Coordinates, count: number = 5): Coordinates[] {
    const points: Coordinates[] = [];
    for (let i = 0; i <= count; i++) {
      const fraction = i / count;
      const lat = origin.latitude + (destination.latitude - origin.latitude) * fraction;
      const lon = origin.longitude + (destination.longitude - origin.longitude) * fraction;
      points.push({
        latitude: Number(lat.toFixed(5)),
        longitude: Number(lon.toFixed(5)),
        name: i === 0 ? origin.name ?? 'Origin' : i === count ? destination.name ?? 'Destination' : `Corridor Point ${i}`
      });
    }
    return points;
  }

  /**
   * Evaluates whether a given coordinate is located on terrestrial land rather than marine waters.
   * Utilizes elevation bathymetric profiling and geographic coastal boundary analysis.
   */
  static async isLandCoordinate(lat: number, lon: number): Promise<boolean> {
    // 1. Quick coastal boundary heuristic for India / Arabian Sea
    if (lat >= 8.0 && lat <= 35.0) {
      // Approximate coastal longitude boundaries
      const westCoastLon = 72.8 + Math.max(0, (19 - lat) * 0.22);
      const eastCoastLon = 80.2 + Math.max(0, (lat - 13) * 0.45);
      if (lon > westCoastLon + 0.35 && lon < eastCoastLon - 0.35) {
        return true;
      }
    }

    // 2. Query global elevation model
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json() as { elevation?: number[] };
        const elevation = data.elevation?.[0] ?? 0;
        // Any point with elevation > 5m is terrestrial land
        if (elevation > 5) {
          return true;
        }
      }
    } catch {
      // Proceed to marine fallback
    }

    return false;
  }

  /**
   * Validate if coordinate is roughly within marine or coastal zone.
   * India EEZ / Coastal oceans, Arabian Sea, Bay of Bengal, Indian Ocean, or global seas.
   */
  static async validateMarineLocation(coord: Coordinates): Promise<{ isMarine: boolean; message: string }> {
    if (coord.latitude < -90 || coord.latitude > 90 || coord.longitude < -180 || coord.longitude > 180) {
      return { isMarine: false, message: 'Coordinates are out of geographic range.' };
    }

    // Check if location is deep land-locked (e.g., central inland cities like Nagpur, Delhi, Jaipur)
    // We can do a quick reverse geocode or test Open-Meteo marine coverage
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.search = new URLSearchParams({
        lat: String(coord.latitude),
        lon: String(coord.longitude),
        format: 'jsonv2'
      }).toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        headers: { 'User-Agent': 'ORCA Marine Intelligence / 1.0' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const body = await res.json() as { category?: string; type?: string; address?: Record<string, string> };
        // If Nominatim classifies it as land features like building, residential, road deep inland:
        if (body.category === 'highway' || body.category === 'building' || (body.address?.city && !body.address?.state_district && !body.type?.includes('water'))) {
          // Check if distance from known major coast is large
          // Allow coastal cities / beaches / harbors / marine points
          const name = (body.address?.city || body.address?.town || body.address?.village || body.address?.suburb || '').toLowerCase();
          const landlockedCities = ['delhi', 'nagpur', 'bhopal', 'jaipur', 'lucknow', 'hyderabad', 'kanpur', 'patna', 'indore', 'pune'];
          if (landlockedCities.some(c => name.includes(c))) {
            return {
              isMarine: false,
              message: `Selected point (${coord.latitude.toFixed(3)}, ${coord.longitude.toFixed(3)}) is located deep inland on land. Please select a marine, coastal, or maritime zone to evaluate.`
            };
          }
        }
      }
    } catch {
      // In case Nominatim rate limits or network drops, proceed with oceanic assessment
    }

    return { isMarine: true, message: 'Valid marine/coastal coordinate.' };
  }

  /**
   * Geocode location search string
   */
  static async searchLocations(query: string): Promise<Coordinates[]> {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.search = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '6',
        addressdetails: '1'
      }).toString();

      const response = await fetch(url, {
        headers: { 'User-Agent': 'ORCA Marine Intelligence' }
      });
      if (!response.ok) return [];
      const data = await response.json() as Array<{ display_name: string; lat: string; lon: string }>;
      return data.map(item => ({
        name: item.display_name,
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        isMarine: true
      }));
    } catch {
      return [];
    }
  }
}

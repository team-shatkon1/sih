import { CandidateZone, Coordinates } from '../types/orca.js';
import { GeospatialService } from './geospatialService.js';
import { RiskEngine } from './riskEngine.js';
import { SuitabilityEngine } from './suitabilityEngine.js';
import { MarineProvider } from '../providers/marineProvider.js';
import { WeatherProvider } from '../providers/weatherProvider.js';

export class CandidateZoneEngine {
  /**
   * Deterministically sample 4 candidate zones around the primary location
   * (e.g. Inshore North, Offshore West, Outer Swell Trench, South Coastal Corridor)
   */
  static async generateCandidateZones(center: Coordinates, radiusKm: number = 25): Promise<CandidateZone[]> {
    // Deterministic bearings and offsets for 4 strategic candidates
    const zoneConfigs = [
      { code: 'ZN-A', name: 'Alpha Coastal Corridor', bearing: 330, distFrac: 0.45 },
      { code: 'ZN-B', name: 'Bravo Offshore Ridge', bearing: 240, distFrac: 0.75 },
      { code: 'ZN-C', name: 'Charlie Deep Shelf', bearing: 285, distFrac: 1.10 },
      { code: 'ZN-D', name: 'Delta Southern Bay', bearing: 165, distFrac: 0.55 }
    ];

    const zones: CandidateZone[] = [];

    for (const cfg of zoneConfigs) {
      const dist = Math.round(radiusKm * cfg.distFrac * 10) / 10;
      const centroid = GeospatialService.offsetCoordinate(center, dist, cfg.bearing);
      centroid.name = `${cfg.name} (${dist} km)`;

      // Real environmental sampling for this spatial candidate
      const [marine, weather] = await Promise.all([
        MarineProvider.fetchMarineData(centroid.latitude, centroid.longitude),
        WeatherProvider.fetchWeatherData(centroid.latitude, centroid.longitude)
      ]);

      const wave = marine.current.wave_height ?? 1.1;
      const wind = weather.current.wind_speed_10m ?? 16.0;
      const current = marine.current.ocean_current_velocity ?? 1.3;
      const sst = marine.current.sea_surface_temperature ?? 28.2;
      const rain = weather.current.precipitation ?? 0.0;

      const riskAnalysis = RiskEngine.calculateRisk({
        waveHeight: wave,
        windSpeed: wind,
        currentVelocity: current,
        precipitation: rain,
        seaSurfaceTemperature: sst
      });

      const suitabilityAnalysis = SuitabilityEngine.calculateSuitability({
        waveHeight: wave,
        windSpeed: wind,
        currentVelocity: current,
        precipitation: rain,
        seaSurfaceTemperature: sst
      });

      // Bounding box (approx 0.03 deg ~ 3.5 km box around centroid)
      const latDelta = 0.035;
      const lonDelta = 0.035;
      const bounds = {
        north: Number((centroid.latitude + latDelta).toFixed(5)),
        south: Number((centroid.latitude - latDelta).toFixed(5)),
        east: Number((centroid.longitude + lonDelta).toFixed(5)),
        west: Number((centroid.longitude - lonDelta).toFixed(5))
      };

      // Construct "Why This Zone?" and "Why Not This Zone?" evidence deterministically
      const whyThisZone: string[] = [];
      const whyNotThisZone: string[] = [];

      if (suitabilityAnalysis.score >= 70) {
        whyThisZone.push(`High modeled maritime suitability (${suitabilityAnalysis.score}/100)`);
      }
      if (wave < 1.2) {
        whyThisZone.push(`Lower modeled wave exposure (${wave.toFixed(1)}m wave height)`);
      } else {
        whyNotThisZone.push(`Elevated wave height (${wave.toFixed(1)}m) creates swell turbulence`);
      }

      if (wind < 20) {
        whyThisZone.push(`Favorable operating wind conditions (${wind.toFixed(0)} km/h)`);
      } else if (wind > 28) {
        whyNotThisZone.push(`Higher wind stress (${wind.toFixed(0)} km/h) increases surface roughness`);
      }

      if (dist < 15) {
        whyThisZone.push(`Closer proximity to harbor/point (${dist} km transit)`);
      } else {
        whyNotThisZone.push(`Longer transit corridor required (${dist} km distance)`);
      }

      if (riskAnalysis.score >= 45) {
        whyNotThisZone.push(`Elevated risk score (${riskAnalysis.score}/100: ${riskAnalysis.primaryDrivers[0] ?? 'rough seas'})`);
      } else {
        whyThisZone.push(`Low composite environmental risk (${riskAnalysis.score}/100)`);
      }

      const confidence = Math.min(95, Math.max(65, 85 - Math.round(dist * 0.4)));

      zones.push({
        id: `zone-${cfg.code.toLowerCase()}`,
        code: cfg.code,
        name: cfg.name,
        centroid,
        bounds,
        distanceKm: dist,
        suitability: suitabilityAnalysis.score,
        risk: riskAnalysis.score,
        confidence,
        whyThisZone,
        whyNotThisZone,
        keyObservations: {
          waveHeight: wave,
          windSpeed: wind,
          currentSpeed: current,
          sst
        }
      });
    }

    // Sort by suitability descending
    return zones.sort((a, b) => b.suitability - a.suitability);
  }
}

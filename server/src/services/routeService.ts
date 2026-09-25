import { Coordinates, RiskLevel, RouteCorridorRequest, RouteResult, RouteSegment } from '../types/orca.js';
import { GeospatialService } from './geospatialService.js';
import { MarineProvider } from '../providers/marineProvider.js';
import { WeatherProvider } from '../providers/weatherProvider.js';
import { RiskEngine } from './riskEngine.js';

export class RouteService {
  /**
   * Analyzes an environmental corridor between origin and destination coordinates
   */
  static async analyzeCorridor(request: RouteCorridorRequest): Promise<RouteResult> {
    const totalDist = GeospatialService.haversineDistance(request.origin, request.destination);
    // Number of sampled checkpoints: at least 4, up to 6
    const sampleCount = Math.max(3, Math.min(5, Math.ceil(totalDist / 25)));
    const points = GeospatialService.sampleCorridorPoints(request.origin, request.destination, sampleCount);

    const segments: RouteSegment[] = [];
    let riskSum = 0;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const distFromStart = GeospatialService.haversineDistance(request.origin, pt);

      const [marine, weather] = await Promise.all([
        MarineProvider.fetchMarineData(pt.latitude, pt.longitude),
        WeatherProvider.fetchWeatherData(pt.latitude, pt.longitude)
      ]);

      const wave = marine.current.wave_height ?? 1.1;
      const wind = weather.current.wind_speed_10m ?? 16.0;
      const current = marine.current.ocean_current_velocity ?? 1.2;
      const rain = weather.current.precipitation ?? 0.0;

      const risk = RiskEngine.calculateRisk({
        waveHeight: wave,
        windSpeed: wind,
        currentVelocity: current,
        precipitation: rain
      });

      riskSum += risk.score;

      let advisory = 'Normal coastal sea state';
      if (risk.score > 55) {
        advisory = 'Elevated swell cross-currents expected; proceed with extra caution';
      } else if (risk.score > 35) {
        advisory = 'Moderate surface chop; secure gear';
      }

      segments.push({
        index: i + 1,
        centroid: pt,
        distanceFromOriginKm: distFromStart,
        riskScore: risk.score,
        riskLevel: risk.label,
        waveHeight: wave,
        windSpeed: wind,
        currentVelocity: current,
        advisory
      });
    }

    const overallRiskScore = Math.round(riskSum / segments.length);
    let overallRiskLevel: RiskLevel = 'LOW';
    if (overallRiskScore >= 55) overallRiskLevel = 'ELEVATED';
    else if (overallRiskScore >= 35) overallRiskLevel = 'MODERATE';

    return {
      corridorId: `corr-${Date.now()}`,
      origin: request.origin,
      destination: request.destination,
      totalDistanceKm: totalDist,
      overallRiskScore,
      overallRiskLevel,
      safeTransitWindow: 'Next 12–18 hours before expected diurnal wind escalation',
      segments
    };
  }
}

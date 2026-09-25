import { RiskAnalysis, RiskLevel } from '../types/orca.js';

export interface EnvironmentalInputs {
  waveHeight: number | null; // meters
  wavePeriod?: number | null; // seconds
  swellHeight?: number | null; // meters
  windSpeed: number | null; // km/h
  currentVelocity: number | null; // km/h
  precipitation: number | null; // mm
  seaSurfaceTemperature?: number | null; // °C
}

export class RiskEngine {
  // Centralized scientific weights (sum to 1.0)
  public static readonly WEIGHTS = {
    wave: 0.40,
    wind: 0.30,
    current: 0.15,
    precipitation: 0.15
  };

  /**
   * Pure deterministic multi-criteria risk evaluation
   */
  static calculateRisk(inputs: EnvironmentalInputs): RiskAnalysis {
    const wave = inputs.waveHeight ?? 1.0;
    const wind = inputs.windSpeed ?? 15.0;
    const current = inputs.currentVelocity ?? 1.2;
    const rain = inputs.precipitation ?? 0.0;

    // 1. Wave risk: non-linear response (0.5m = 10, 1.5m = 35, 2.5m = 65, 4m+ = 100)
    const waveRisk = Math.min(100, Math.max(0, Math.round(Math.pow(wave / 3.5, 1.3) * 100)));

    // 2. Wind risk: Beaufort-scaled response (15 km/h = 15, 30 km/h = 45, 50 km/h = 80, 65+ km/h = 100)
    const windRisk = Math.min(100, Math.max(0, Math.round(Math.pow(wind / 55, 1.2) * 100)));

    // 3. Current drift risk: (> 3.5 km/h creates heavy drift / steerage difficulty)
    const currentRisk = Math.min(100, Math.max(0, Math.round(Math.min(1, current / 4.0) * 100)));

    // 4. Precipitation & visibility risk (squall lines)
    const precipitationRisk = Math.min(100, Math.max(0, Math.round(Math.min(1, rain / 25.0) * 100)));

    // Weighted fusion
    const compositeScore = Math.round(
      waveRisk * this.WEIGHTS.wave +
      windRisk * this.WEIGHTS.wind +
      currentRisk * this.WEIGHTS.current +
      precipitationRisk * this.WEIGHTS.precipitation
    );

    const clampedScore = Math.min(100, Math.max(0, compositeScore));

    let label: RiskLevel = 'LOW';
    if (clampedScore >= 75) label = 'HIGH';
    else if (clampedScore >= 55) label = 'ELEVATED';
    else if (clampedScore >= 35) label = 'MODERATE';

    // Identify primary drivers
    const drivers: { name: string; score: number }[] = [
      { name: `Wave exposure (${wave.toFixed(1)}m)`, score: waveRisk },
      { name: `Wind stress (${wind.toFixed(0)} km/h)`, score: windRisk },
      { name: `Surface current (${current.toFixed(1)} km/h)`, score: currentRisk },
      { name: `Precipitation (${rain.toFixed(1)} mm)`, score: precipitationRisk }
    ].sort((a, b) => b.score - a.score);

    const primaryDrivers = drivers.filter(d => d.score >= 25).map(d => d.name);
    if (primaryDrivers.length === 0) {
      primaryDrivers.push('Calm baseline marine conditions');
    }

    return {
      score: clampedScore,
      label,
      primaryDrivers,
      breakdown: {
        waveRisk,
        windRisk,
        currentRisk,
        precipitationRisk
      }
    };
  }
}

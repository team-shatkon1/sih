import { SuitabilityAnalysis, SuitabilityLevel } from '../types/orca.js';
import { EnvironmentalInputs } from './riskEngine.js';

export class SuitabilityEngine {
  public static readonly WEIGHTS = {
    seaCondition: 0.40,
    windComfort: 0.30,
    thermalSafety: 0.15,
    navigationEase: 0.15
  };

  /**
   * Pure deterministic suitability scoring
   */
  static calculateSuitability(inputs: EnvironmentalInputs): SuitabilityAnalysis {
    const wave = inputs.waveHeight ?? 1.0;
    const wind = inputs.windSpeed ?? 15.0;
    const sst = inputs.seaSurfaceTemperature ?? 28.0;
    const current = inputs.currentVelocity ?? 1.2;
    const rain = inputs.precipitation ?? 0.0;

    // 1. Sea condition comfort (100 = < 0.8m, 0 = > 3.0m)
    const seaCondition = Math.max(0, Math.min(100, Math.round((1 - Math.max(0, wave - 0.5) / 2.5) * 100)));

    // 2. Wind comfort (100 = 8-20 km/h, degraded if > 35 km/h)
    const windComfort = Math.max(0, Math.min(100, Math.round((1 - Math.max(0, wind - 15) / 40) * 100)));

    // 3. Thermal safety / biological activity (26 - 29.5°C optimal for Indian coastal seas)
    const thermalDiff = Math.abs(sst - 28.0);
    const thermalSafety = Math.max(0, Math.min(100, Math.round((1 - thermalDiff / 8.0) * 100)));

    // 4. Navigation ease (low current + zero squalls)
    const currentPenalty = Math.min(60, (current / 3.0) * 60);
    const rainPenalty = Math.min(40, (rain / 15.0) * 40);
    const navigationEase = Math.max(0, Math.min(100, Math.round(100 - currentPenalty - rainPenalty)));

    const compositeScore = Math.round(
      seaCondition * this.WEIGHTS.seaCondition +
      windComfort * this.WEIGHTS.windComfort +
      thermalSafety * this.WEIGHTS.thermalSafety +
      navigationEase * this.WEIGHTS.navigationEase
    );

    const clampedScore = Math.min(100, Math.max(0, compositeScore));

    let label: SuitabilityLevel = 'POOR';
    if (clampedScore >= 80) label = 'EXCELLENT';
    else if (clampedScore >= 65) label = 'GOOD';
    else if (clampedScore >= 45) label = 'MODERATE';

    const factors: { name: string; score: number }[] = [
      { name: `Calm wave window (${wave.toFixed(1)}m)`, score: seaCondition },
      { name: `Favorable operating wind (${wind.toFixed(0)} km/h)`, score: windComfort },
      { name: `Thermal balance (${sst.toFixed(1)}°C)`, score: thermalSafety },
      { name: `Manageable ocean currents (${current.toFixed(1)} km/h)`, score: navigationEase }
    ].sort((a, b) => b.score - a.score);

    const primaryFactors = factors.filter(f => f.score >= 50).map(f => f.name);
    if (primaryFactors.length === 0) {
      primaryFactors.push('Marginal environmental conditions for marine activities');
    }

    return {
      score: clampedScore,
      label,
      primaryFactors,
      breakdown: {
        seaCondition,
        windComfort,
        thermalSafety,
        navigationEase
      }
    };
  }
}

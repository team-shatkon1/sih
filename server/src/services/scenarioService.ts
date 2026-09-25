import { EnvironmentalObservation, ScenarioParameterModifications, ScenarioResult } from '../types/orca.js';
import { RiskEngine } from './riskEngine.js';
import { SuitabilityEngine } from './suitabilityEngine.js';

export class ScenarioService {
  /**
   * Runs the exact same deterministic models with perturbed environmental variables
   */
  static runScenario(
    baselineObservations: EnvironmentalObservation[],
    mods: ScenarioParameterModifications
  ): ScenarioResult {
    const getVal = (key: string, fallback: number): number => {
      const obs = baselineObservations.find(o => o.key === key);
      return typeof obs?.value === 'number' ? obs.value : fallback;
    };

    const baseWave = getVal('wave_height', 1.1);
    const baseWind = getVal('wind_speed', 16.0);
    const baseCurrent = getVal('ocean_current', 1.3);
    const baseSST = getVal('sst', 28.3);
    const baseRain = getVal('precipitation', 0.0);

    const scenarioWave = Math.max(0, baseWave + (mods.waveDeltaMeters ?? 0));
    const scenarioWind = Math.max(0, baseWind + (mods.windDeltaKmh ?? 0));
    const scenarioCurrent = Math.max(0, baseCurrent + (mods.currentDeltaKmh ?? 0));

    // Calculate baseline
    const baseRisk = RiskEngine.calculateRisk({
      waveHeight: baseWave,
      windSpeed: baseWind,
      currentVelocity: baseCurrent,
      seaSurfaceTemperature: baseSST,
      precipitation: baseRain
    });
    const baseSuitability = SuitabilityEngine.calculateSuitability({
      waveHeight: baseWave,
      windSpeed: baseWind,
      currentVelocity: baseCurrent,
      seaSurfaceTemperature: baseSST,
      precipitation: baseRain
    });

    // Calculate scenario
    const scenarioRisk = RiskEngine.calculateRisk({
      waveHeight: scenarioWave,
      windSpeed: scenarioWind,
      currentVelocity: scenarioCurrent,
      seaSurfaceTemperature: baseSST,
      precipitation: baseRain
    });
    const scenarioSuitability = SuitabilityEngine.calculateSuitability({
      waveHeight: scenarioWave,
      windSpeed: scenarioWind,
      currentVelocity: scenarioCurrent,
      seaSurfaceTemperature: baseSST,
      precipitation: baseRain
    });

    const scoreChange = scenarioSuitability.score - baseSuitability.score;
    const riskChange = scenarioRisk.score - baseRisk.score;

    let primaryDriver = 'Baseline consistency';
    if (Math.abs(mods.waveDeltaMeters ?? 0) >= 0.5) {
      primaryDriver = `Wave height modification (${mods.waveDeltaMeters! > 0 ? '+' : ''}${mods.waveDeltaMeters}m)`;
    } else if (Math.abs(mods.windDeltaKmh ?? 0) >= 10) {
      primaryDriver = `Wind speed perturbation (${mods.windDeltaKmh! > 0 ? '+' : ''}${mods.windDeltaKmh} km/h)`;
    } else if (Math.abs(mods.currentDeltaKmh ?? 0) >= 0.8) {
      primaryDriver = `Ocean current variation (${mods.currentDeltaKmh! > 0 ? '+' : ''}${mods.currentDeltaKmh} km/h)`;
    }

    const modifiedObservations: EnvironmentalObservation[] = baselineObservations.map(o => {
      if (o.key === 'wave_height') {
        return { ...o, value: Number(scenarioWave.toFixed(2)), status: 'ESTIMATED' };
      }
      if (o.key === 'wind_speed') {
        return { ...o, value: Number(scenarioWind.toFixed(1)), status: 'ESTIMATED' };
      }
      if (o.key === 'ocean_current') {
        return { ...o, value: Number(scenarioCurrent.toFixed(1)), status: 'ESTIMATED' };
      }
      return o;
    });

    return {
      isScenario: true,
      baselineScore: baseSuitability.score,
      scenarioScore: scenarioSuitability.score,
      scoreChange,
      baselineRisk: baseRisk.score,
      scenarioRisk: scenarioRisk.score,
      riskChange,
      primaryDriver,
      explanation: `Under this simulated scenario, suitability changes by ${scoreChange > 0 ? '+' : ''}${scoreChange} points (from ${baseSuitability.score} to ${scenarioSuitability.score}), driven primarily by ${primaryDriver}. Modeled risk shifts by ${riskChange > 0 ? '+' : ''}${riskChange} points.`,
      modifiedObservations
    };
  }
}

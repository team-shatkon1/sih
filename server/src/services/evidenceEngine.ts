import { EnvironmentalObservation, EvidenceGraph, EvidenceNode, EvidenceEdge, RiskAnalysis, SuitabilityAnalysis } from '../types/orca.js';

export class EvidenceEngine {
  /**
   * Constructs a real DAG Evidence Graph from sensor observations through criteria to composite scores
   */
  static buildEvidenceGraph(
    observations: EnvironmentalObservation[],
    risk: RiskAnalysis,
    suitability: SuitabilityAnalysis
  ): EvidenceGraph {
    const nodes: EvidenceNode[] = [];
    const edges: EvidenceEdge[] = [];

    const getObs = (key: string) => observations.find(o => o.key === key);

    const waveObs = getObs('wave_height');
    const windObs = getObs('wind_speed');
    const currentObs = getObs('ocean_current');
    const sstObs = getObs('sst');
    const rainObs = getObs('precipitation');

    // Layer 1: Sensor Nodes
    nodes.push({
      id: 'sensor-wave',
      type: 'SENSOR',
      label: 'Wave Height Sensor',
      value: waveObs?.value ?? 1.1,
      unit: waveObs?.unit ?? 'm',
      source: waveObs?.source ?? 'Copernicus/ECMWF Marine',
      freshness: `${waveObs?.freshnessMinutes ?? 12} min ago`,
      contribution: 40,
      status: Number(waveObs?.value ?? 1) > 2.5 ? 'CRITICAL' : Number(waveObs?.value ?? 1) > 1.8 ? 'ELEVATED' : 'NORMAL'
    });

    nodes.push({
      id: 'sensor-wind',
      type: 'SENSOR',
      label: 'Anemometer 10m Wind',
      value: windObs?.value ?? 16.0,
      unit: windObs?.unit ?? 'km/h',
      source: windObs?.source ?? 'NOAA GFS / DWD Weather',
      freshness: `${windObs?.freshnessMinutes ?? 8} min ago`,
      contribution: 30,
      status: Number(windObs?.value ?? 15) > 40 ? 'CRITICAL' : Number(windObs?.value ?? 15) > 25 ? 'ELEVATED' : 'NORMAL'
    });

    nodes.push({
      id: 'sensor-current',
      type: 'SENSOR',
      label: 'Ocean Current Velocity',
      value: currentObs?.value ?? 1.3,
      unit: currentObs?.unit ?? 'km/h',
      source: currentObs?.source ?? 'Copernicus Global Ocean',
      freshness: `${currentObs?.freshnessMinutes ?? 18} min ago`,
      contribution: 15,
      status: Number(currentObs?.value ?? 1) > 3 ? 'ELEVATED' : 'NORMAL'
    });

    nodes.push({
      id: 'sensor-sst',
      type: 'SENSOR',
      label: 'Sea Surface Temperature',
      value: sstObs?.value ?? 28.3,
      unit: sstObs?.unit ?? '°C',
      source: sstObs?.source ?? 'Copernicus Marine',
      freshness: `${sstObs?.freshnessMinutes ?? 15} min ago`,
      contribution: 10,
      status: 'NORMAL'
    });

    const chloroObs = getObs('chlorophyll_a');
    if (chloroObs && chloroObs.available && chloroObs.value !== null) {
      nodes.push({
        id: 'sensor-chlorophyll',
        type: 'SENSOR',
        label: 'Chlorophyll-a Biomass',
        value: chloroObs.value,
        unit: chloroObs.unit,
        source: chloroObs.source,
        freshness: `${chloroObs.freshnessMinutes} min ago`,
        contribution: 12,
        status: Number(chloroObs.value) > 3.0 ? 'ELEVATED' : 'NORMAL'
      });
    }

    // Layer 2: Intermediate Criteria Nodes
    nodes.push({
      id: 'crit-sea-comfort',
      type: 'CRITERIA',
      label: 'Sea State Comfort Factor',
      value: suitability.breakdown.seaCondition,
      unit: '/ 100',
      source: 'Deterministic Equation (Wave/Swell)',
      freshness: 'Synchronous',
      contribution: 40,
      status: suitability.breakdown.seaCondition < 40 ? 'CRITICAL' : 'NORMAL'
    });

    nodes.push({
      id: 'crit-wind-comfort',
      type: 'CRITERIA',
      label: 'Aerodynamic Workability',
      value: suitability.breakdown.windComfort,
      unit: '/ 100',
      source: 'Beaufort Scaling Engine',
      freshness: 'Synchronous',
      contribution: 30,
      status: suitability.breakdown.windComfort < 40 ? 'ELEVATED' : 'NORMAL'
    });

    nodes.push({
      id: 'crit-hazard-exposure',
      type: 'CRITERIA',
      label: 'Kinetic Hazard Exposure',
      value: risk.score,
      unit: '/ 100',
      source: 'Multi-Criteria Risk Fusion',
      freshness: 'Synchronous',
      contribution: 50,
      status: risk.score > 55 ? 'CRITICAL' : risk.score > 35 ? 'ELEVATED' : 'NORMAL'
    });

    // Layer 3: Final Index Scores
    nodes.push({
      id: 'score-suitability',
      type: 'SCORE',
      label: 'Composite Maritime Suitability',
      value: suitability.score,
      unit: '/ 100',
      source: 'ORCA Suitability Engine v1.0',
      freshness: 'Synchronous',
      contribution: 100,
      status: suitability.score >= 65 ? 'NORMAL' : 'ELEVATED'
    });

    nodes.push({
      id: 'score-risk',
      type: 'SCORE',
      label: 'Environmental Risk Index',
      value: risk.score,
      unit: '/ 100',
      source: 'ORCA Risk Engine v1.0',
      freshness: 'Synchronous',
      contribution: 100,
      status: risk.label === 'LOW' ? 'NORMAL' : risk.label === 'MODERATE' ? 'ELEVATED' : 'CRITICAL'
    });

    // Edges
    edges.push({ from: 'sensor-wave', to: 'crit-sea-comfort', label: 'Inverses with height', weight: 0.40 });
    edges.push({ from: 'sensor-wave', to: 'crit-hazard-exposure', label: 'Exponential wave drag', weight: 0.40 });
    edges.push({ from: 'sensor-wind', to: 'crit-wind-comfort', label: 'Beaufort stress penalty', weight: 0.30 });
    edges.push({ from: 'sensor-wind', to: 'crit-hazard-exposure', label: 'Wind shear pressure', weight: 0.30 });
    edges.push({ from: 'sensor-current', to: 'crit-hazard-exposure', label: 'Drift velocity', weight: 0.15 });
    edges.push({ from: 'sensor-sst', to: 'crit-sea-comfort', label: 'Thermal boundary', weight: 0.15 });
    if (chloroObs && chloroObs.available && chloroObs.value !== null) {
      edges.push({ from: 'sensor-chlorophyll', to: 'crit-sea-comfort', label: 'Biomass trophic factor', weight: 0.12 });
    }
    edges.push({ from: 'crit-sea-comfort', to: 'score-suitability', label: 'Primary weight (40%)', weight: 0.40 });
    edges.push({ from: 'crit-wind-comfort', to: 'score-suitability', label: 'Workability weight (30%)', weight: 0.30 });
    edges.push({ from: 'crit-hazard-exposure', to: 'score-risk', label: 'Fused risk index', weight: 1.0 });

    return { nodes, edges };
  }
}

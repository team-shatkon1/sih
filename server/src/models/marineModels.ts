import { Coordinates, ContributorType, CouncilAgentType, CouncilAgentStatus, RiskLevel } from '../types/orca.js';

/**
 * ORCA Marine Intelligence Platform — Domain & Database Models
 * Compliance: ISRO SIH-26176 / Section 31 Database Models
 * Features:
 * - Full schemas with timestamps (createdAt, updatedAt)
 * - Source provenance, confidence rating
 * - Indexed lookups by location (spatial bucket), timestamp, and zoneId
 */

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarineObservation extends BaseEntity {
  source: string;
  timestamp: string;
  confidence: number; // 0 - 100
  provenance: string;
  location: Coordinates;
  seaSurfaceTemperature?: number;
  chlorophyllA?: number;
  salinityPsu?: number;
  dissolvedOxygenMgL?: number;
  waterClaritySecchiM?: number;
}

export interface EnvironmentalObservationModel extends BaseEntity {
  source: string;
  timestamp: string;
  confidence: number;
  provenance: string;
  location: Coordinates;
  variable: 'WAVE_HEIGHT' | 'WIND_SPEED' | 'CURRENT_VELOCITY' | 'SST' | 'CHLOROPHYLL' | 'AIR_TEMP' | 'ATM_PRESSURE';
  value: number;
  unit: string;
  qualityFlag: 'GOOD' | 'SUSPECT' | 'ESTIMATED';
  sensorId?: string;
}

export interface CandidateZoneModel extends BaseEntity {
  zoneId: string;
  name: string;
  location: Coordinates;
  radiusKm: number;
  score: number;
  suitability: 'HIGH' | 'MODERATE' | 'LOW';
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  sourceCoverage: number;
  timestamp: string;
  provenance: string;
  advantages: string[];
  disadvantages: string[];
}

export interface LocalKnowledgeObservationModel extends BaseEntity {
  location: Coordinates;
  observationType: 'FISH_ACTIVITY' | 'SEA_STATE' | 'UNUSUAL_CURRENT' | 'WEATHER_BEHAVIOR' | 'HAZARD_OBSTRUCTION';
  speciesOptional?: string;
  seaConditionOptional?: string;
  observedProductivity?: 'LOW' | 'MODERATE' | 'HIGH';
  observationText: string;
  observationTime: string;
  season: 'PRE_MONSOON' | 'MONSOON' | 'POST_MONSOON' | 'WINTER';
  contributorType: ContributorType;
  confidence: number;
  provenance: string;
  photoUrlOptional?: string;
  upvotes: number;
  verified: boolean;
  source: string;
}

export interface AgentResultModel extends BaseEntity {
  decisionId: string;
  agent: CouncilAgentType;
  agentName: string;
  status: CouncilAgentStatus;
  scoreContribution: number;
  confidence: number;
  findings: string[];
  source: string;
  timestamp: string;
  provenance: string;
  dataFreshness: string;
  limitations: string[];
}

export interface EvidenceModel extends BaseEntity {
  decisionId: string;
  agentId: CouncilAgentType;
  metric: string;
  value: number | string;
  unit: string;
  benchmark: string;
  contribution: number;
  status: 'POSITIVE' | 'NEUTRAL' | 'WARNING';
  source: string;
  timestamp: string;
  confidence: number;
  provenance: string;
}

export interface SourceModel extends BaseEntity {
  sourceName: string;
  provider: string;
  type: 'SATELLITE' | 'IN_SITU_BUOY' | 'NUMERICAL_FORECAST' | 'COMMUNITY_REPORT' | 'RADAR_COASTAL';
  active: boolean;
  lastSyncTimestamp: string;
  coverageArea: string;
  accuracyRating: number; // 0 - 1.0
  latencyMinutes: number;
  provenance: string;
}

export interface DecisionRunModel extends BaseEntity {
  decisionId: string;
  modelVersion: string;
  timestamp: string;
  location: Coordinates;
  zoneId?: string;
  finalScore: number;
  confidence: number;
  agreementLevel: string;
  verdict: 'FAVORABLE' | 'CONDITIONALLY_FAVORABLE' | 'CAUTION' | 'UNFAVORABLE';
  weights: Record<string, number>;
  thresholds: Record<string, any>;
  hasDisagreement: boolean;
  auditSignature: string;
  provenance: string;
}

export interface ScenarioRunModel extends BaseEntity {
  decisionId: string;
  scenarioId: string;
  location: Coordinates;
  timestamp: string;
  baselineScore: number;
  simulatedScore: number;
  scoreDelta: number;
  baselineRisk: number;
  simulatedRisk: number;
  riskDelta: number;
  modifications: {
    waveDeltaMeters?: number;
    windDeltaKmh?: number;
    currentDeltaKmh?: number;
    sstDeltaDegC?: number;
    chlorophyllDelta?: number;
  };
  primaryDriver: string;
  verdictChanged: boolean;
  provenance: string;
}

export interface DecisionFlipModel extends BaseEntity {
  decisionId: string;
  zoneAId: string;
  zoneBId: string;
  timestamp: string;
  initialScoreA: number;
  initialScoreB: number;
  flipped: boolean;
  flippingVariables: {
    variable: string;
    initialValue: number;
    thresholdValue: number;
    deltaNeeded: number;
    unit: string;
    impactScore: number;
  }[];
  explanation: string;
  provenance: string;
}

export interface DriftSimulationModel extends BaseEntity {
  simulationId: string;
  type: 'PLANKTON_LARVAE' | 'OIL_SLICK' | 'SEARCH_AND_RESCUE_DEBRIS';
  origin: Coordinates;
  durationHours: number;
  particleCount: number;
  timestamp: string;
  landfallProbability: number;
  searchRadiusKm: number;
  provenance: string;
}

export interface RouteAnalysisModel extends BaseEntity {
  corridorId: string;
  origin: Coordinates;
  destination: Coordinates;
  timestamp: string;
  totalDistanceKm: number;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  fuelEstimatedLiters?: number;
  co2SavedKg?: number;
  safeTransitWindow: string;
  provenance: string;
}

/**
 * In-Memory Indexed Store for ORCA Marine Entities
 * Supporting fast geospatial grid, timestamp range, and zoneId queries
 */
export class MarineModelRegistry {
  private localKnowledge = new Map<string, LocalKnowledgeObservationModel>();
  private decisionRuns = new Map<string, DecisionRunModel>();
  private candidateZones = new Map<string, CandidateZoneModel>();
  private spatialIndex = new Map<string, string[]>(); // geo-bucket -> IDs
  private zoneIdIndex = new Map<string, string[]>(); // zoneId -> IDs

  // Hash coordinates into 0.25-degree (~27km) grid bucket for spatial indexing
  public toGeoBucket(coord: Coordinates): string {
    const latBucket = Math.floor(coord.latitude * 4) / 4;
    const lonBucket = Math.floor(coord.longitude * 4) / 4;
    return `${latBucket.toFixed(2)}_${lonBucket.toFixed(2)}`;
  }

  public saveLocalKnowledge(obs: LocalKnowledgeObservationModel): void {
    this.localKnowledge.set(obs.id, obs);
    const bucket = this.toGeoBucket(obs.location);
    const existing = this.spatialIndex.get(bucket) || [];
    if (!existing.includes(obs.id)) {
      existing.push(obs.id);
      this.spatialIndex.set(bucket, existing);
    }
  }

  public findLocalKnowledgeNear(coord: Coordinates, maxDistanceKm: number = 60): LocalKnowledgeObservationModel[] {
    const results: LocalKnowledgeObservationModel[] = [];
    for (const obs of this.localKnowledge.values()) {
      const dLat = (obs.location.latitude - coord.latitude) * 111.32;
      const dLon = (obs.location.longitude - coord.longitude) * 111.32 * Math.cos((coord.latitude * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      if (dist <= maxDistanceKm) {
        results.push(obs);
      }
    }
    return results.sort((a, b) => new Date(b.observationTime).getTime() - new Date(a.observationTime).getTime());
  }

  public saveDecisionRun(run: DecisionRunModel): void {
    this.decisionRuns.set(run.decisionId, run);
    if (run.zoneId) {
      const list = this.zoneIdIndex.get(run.zoneId) || [];
      list.push(run.decisionId);
      this.zoneIdIndex.set(run.zoneId, list);
    }
  }

  public getDecisionRun(decisionId: string): DecisionRunModel | undefined {
    return this.decisionRuns.get(decisionId);
  }

  public getDecisionRunsByZone(zoneId: string): DecisionRunModel[] {
    const ids = this.zoneIdIndex.get(zoneId) || [];
    return ids.map((id) => this.decisionRuns.get(id)!).filter(Boolean);
  }

  public getAllLocalKnowledge(): LocalKnowledgeObservationModel[] {
    return Array.from(this.localKnowledge.values());
  }
}

export const marineRegistry = new MarineModelRegistry();

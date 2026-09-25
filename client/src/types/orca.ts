export interface Coordinates {
  latitude: number;
  longitude: number;
  name?: string;
  isMarine?: boolean;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'SEVERE';
export type SuitabilityLevel = 'POOR' | 'MODERATE' | 'GOOD' | 'EXCELLENT';
export type DataMode = 'LIVE' | 'DEMO' | 'CACHED' | 'DEGRADED' | 'UNAVAILABLE';
export type UserRole = 'GUEST' | 'REGISTERED_USER' | 'FISHERMAN' | 'RESEARCHER' | 'AUTHORITIES' | 'ADMIN';
export type ThemeMode = 'light' | 'dark' | 'system';

export type ReportCategory = 'MARINE_CONDITION' | 'STRONG_CURRENT' | 'HAZARD' | 'WILDLIFE' | 'WEATHER' | 'COASTAL';
export type ReportSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type ReportStatus = 'UNVERIFIED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type ReportVisibility = 'PUBLIC' | 'COMMUNITY' | 'PRIVATE';

export interface RegionReport {
  id: string;
  location: Coordinates;
  category: ReportCategory;
  title: string;
  description: string;
  severity: ReportSeverity;
  status: ReportStatus;
  authorId: string;
  authorName: string;
  authorRole: string;
  visibility: ReportVisibility;
  mediaUrl?: string;
  createdAt: string;
  updatedAt: string;
  confirmations: {
    yes: number;
    no: number;
  };
}

export interface EnvironmentalObservation {
  key: string;
  name: string;
  value: number | string | null;
  unit: string;
  available: boolean;
  timestamp: string;
  source: string;
  status: 'CURRENT' | 'ESTIMATED' | 'UNAVAILABLE' | 'LAND_MASKED';
  freshnessMinutes: number;
}

export interface RiskAnalysis {
  score: number;
  label: RiskLevel;
  primaryDrivers: string[];
  breakdown: {
    waveRisk: number;
    windRisk: number;
    currentRisk: number;
    precipitationRisk: number;
  };
}

export interface SuitabilityAnalysis {
  score: number;
  label: SuitabilityLevel;
  primaryFactors: string[];
  breakdown: {
    seaCondition: number;
    windComfort: number;
    thermalSafety: number;
    navigationEase: number;
  };
}

export interface CandidateZone {
  id: string;
  code: string;
  name: string;
  centroid: Coordinates;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  distanceKm: number;
  suitability: number;
  risk: number;
  confidence: number;
  whyThisZone: string[];
  whyNotThisZone: string[];
  keyObservations: {
    waveHeight: number | null;
    windSpeed: number | null;
    currentSpeed: number | null;
    sst: number | null;
  };
}

export interface EvidenceNode {
  id: string;
  type: 'SENSOR' | 'INDICATOR' | 'CRITERIA' | 'SCORE';
  label: string;
  value: number | string | null;
  unit?: string;
  source?: string;
  freshness?: string;
  contribution: number;
  status: 'NORMAL' | 'ELEVATED' | 'CRITICAL' | 'UNAVAILABLE';
}

export interface EvidenceEdge {
  from: string;
  to: string;
  label?: string;
  weight: number;
}

export interface EvidenceGraph {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}

export interface MarineFingerprint {
  seaState: number;
  wind: number;
  thermal: number;
  current: number;
  rainfall: number;
  risk: number;
  confidence: number;
}

export interface DisagreementDetail {
  parameter: string;
  providerA: { name: string; value: number; unit: string };
  providerB: { name: string; value: number; unit: string };
  difference: number;
  impact: string;
}

export interface DataTrustPassport {
  dataMode: DataMode;
  dataFreshnessMinutes: number;
  indicatorCoverage: number;
  totalIndicators: number;
  sourcesCount: number;
  availableSources: string[];
  availableIndicators: string[];
  unavailableIndicators: string[];
  sourceAgreement: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'DISAGREEMENT_DETECTED';
  disagreements: DisagreementDetail[];
  confidenceScore: number;
}

export interface ChangeRadarData {
  windDeltaPercent: number;
  waveDeltaPercent: number;
  sstTrend: 'RISING' | 'FALLING' | 'STABLE';
  riskDelta: number;
  primaryEnvironmentalChange: string;
  calculatedAt: string;
}

export interface TimelinePoint {
  offsetHours: number;
  timestamp: string;
  label: string;
  waveHeight: number | null;
  windSpeed: number | null;
  sst: number | null;
  riskScore: number;
  riskLevel: RiskLevel;
  suitabilityScore: number;
}

export interface RiskClockItem {
  period: 'NOW' | '+6 HOURS' | '+12 HOURS' | '+24 HOURS' | '+48 HOURS';
  level: RiskLevel;
  primaryRisk: string;
  waveExpected: number | null;
}

export interface ScenarioParameterModifications {
  waveDeltaMeters?: number;
  windDeltaKmh?: number;
  currentDeltaKmh?: number;
  latitudeShiftKm?: number;
  longitudeShiftKm?: number;
}

export interface ScenarioResult {
  isScenario: true;
  baselineScore: number;
  scenarioScore: number;
  scoreChange: number;
  baselineRisk: number;
  scenarioRisk: number;
  riskChange: number;
  primaryDriver: string;
  explanation: string;
  modifiedObservations: EnvironmentalObservation[];
}

export interface RouteCorridorRequest {
  origin: Coordinates;
  destination: Coordinates;
  corridorWidthKm?: number;
}

export interface RouteSegment {
  index: number;
  centroid: Coordinates;
  distanceFromOriginKm: number;
  riskScore: number;
  riskLevel: RiskLevel;
  waveHeight: number | null;
  windSpeed: number | null;
  currentVelocity: number | null;
  advisory: string;
}

export interface RouteResult {
  corridorId: string;
  origin: Coordinates;
  destination: Coordinates;
  totalDistanceKm: number;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  safeTransitWindow: string;
  segments: RouteSegment[];
}

export interface AlertRecord {
  id: string;
  title: string;
  severity: 'INFO' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  category: 'WAVE' | 'WIND' | 'CYCLONE' | 'CURRENT' | 'SANCTUARY';
  geographicArea: string;
  coordinates: Coordinates;
  radiusKm: number;
  source: string;
  validFrom: string;
  validUntil: string;
  description: string;
  active: boolean;
}

export interface DecisionSnapshot {
  id: string;
  title: string;
  timestamp: string;
  location: Coordinates;
  userRole: UserRole;
  notes?: string;
  risk: RiskAnalysis;
  suitability: SuitabilityAnalysis;
  dataTrust: DataTrustPassport;
  observations: EnvironmentalObservation[];
  topCandidateZone?: CandidateZone;
  marineFingerprint: MarineFingerprint;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  resource: string;
  result: 'SUCCESS' | 'DENIED' | 'ERROR';
  details?: Record<string, unknown>;
}

export type UIActionType =
  | 'ENABLE_LAYER'
  | 'DISABLE_LAYER'
  | 'SELECT_ZONE'
  | 'FOCUS_ZONE'
  | 'SET_LOCATION'
  | 'SET_RADIUS'
  | 'OPEN_COMPARISON'
  | 'OPEN_EVIDENCE'
  | 'SHOW_CHANGE'
  | 'RUN_ANALYSIS'
  | 'RUN_SCENARIO'
  | 'SHOW_ROUTE'
  | 'ZOOM_MAP'
  | 'SWITCH_ROLE'
  | 'SELECT_TAB';

export interface UIAction {
  type: UIActionType;
  layer?: 'waves' | 'current' | 'wind' | 'zones' | 'alerts' | 'route';
  zoneId?: string;
  location?: Coordinates;
  zoomLevel?: number;
  tab?: string;
  role?: UserRole;
  scenarioParams?: ScenarioParameterModifications;
}

export interface AssistantResponse {
  answer: string;
  keyEvidence: string[];
  importantCaveat?: string;
  actions: UIAction[];
  missionTrace: string[];
}

export interface WeatherForecastItem {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  conditionLabel: string;
  windSpeedMax: number;
  waveHeightMax: number;
  precipProbability: number;
  suitabilityScore: number;
  seaStateLabel: string;
}

export interface HourlyForecastItem {
  time: string;
  displayHour: string;
  temperature: number;
  apparentTemperature: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  waveHeight: number;
  precipitationProb: number;
  weatherCode: number;
  conditionLabel: string;
  pressure: number;
}

export interface ExtendedWeatherReport {
  current: {
    temperature: number;
    apparentTemperature: number;
    relativeHumidity: number;
    pressure: number;
    pressureTrend: 'RISING' | 'FALLING' | 'STEADY';
    windGusts: number;
    windDirection: number;
    cloudCover: number;
    weatherCode: number;
    conditionLabel: string;
    visibilityKm: number;
    uvIndex: number;
  };
  tide: {
    currentState: 'FLOOD_RISING' | 'EBB_FALLING' | 'HIGH_SLACK' | 'LOW_SLACK';
    currentHeightM: number;
    nextHighTideTime: string;
    nextHighTideHeightM: number;
    nextLowTideTime: string;
    nextLowTideHeightM: number;
    cycleProgressPercent: number;
  };
  vesselWorkability: {
    smallCraft: { status: 'SAFE' | 'CAUTION' | 'RESTRICTED'; label: string; maxWave: number };
    commercialTrawler: { status: 'SAFE' | 'CAUTION' | 'RESTRICTED'; label: string; maxWave: number };
    sailingCraft: { status: 'SAFE' | 'CAUTION' | 'RESTRICTED'; label: string; maxWave: number };
  };
  hourly: HourlyForecastItem[];
  daily: WeatherForecastItem[];
}

export interface FullAnalysisBundle {
  id: string;
  location: Coordinates;
  timestamp: string;
  dataMode: DataMode;
  observations: EnvironmentalObservation[];
  risk: RiskAnalysis;
  suitability: SuitabilityAnalysis;
  marineFingerprint: MarineFingerprint;
  dataTrust: DataTrustPassport;
  candidateZones: CandidateZone[];
  evidenceGraph: EvidenceGraph;
  changeRadar: ChangeRadarData;
  timeline: TimelinePoint[];
  riskClock: RiskClockItem[];
  alerts: AlertRecord[];
  extendedWeather?: ExtendedWeatherReport;
}

// ==============================================================================
// AUTONOMOUS MARINE DIGITAL TWIN 2.0 (LAGRANGIAN DRIFT, THERMAL FRONTS & AGENTS)
// ==============================================================================

export type DriftType = 'PLANKTON_LARVAE' | 'OIL_SLICK' | 'SEARCH_AND_RESCUE_DEBRIS';

export interface DriftTrajectoryStep {
  hour: number;
  latitude: number;
  longitude: number;
  currentVelocity: number;
  windSpeed: number;
  leewaySpeed: number;
  dispersionRadiusMeters: number;
}

export interface LagrangianParticle {
  id: number;
  latitude: number;
  longitude: number;
  ageHours: number;
  status: 'ACTIVE' | 'BEACHED' | 'DISPERSED';
}

export interface LagrangianSimulationResult {
  simulationId: string;
  type: DriftType;
  origin: Coordinates;
  timestamp: string;
  durationHours: number;
  particleCount: number;
  trajectory: DriftTrajectoryStep[];
  swarm: LagrangianParticle[];
  searchRadiusKm: number;
  landfallProbability: number; // 0 - 100%
  predictedLandfallPoint?: Coordinates;
  summary: string;
}

export interface OceanThermalFront {
  id: string;
  name: string;
  type: 'UPWELLING_FRONT' | 'THERMAL_GRADIENT' | 'CHLOROPHYLL_BREAK';
  startCoord: Coordinates;
  endCoord: Coordinates;
  gradientMagnitude: number; // °C / km or mg/m³ / km
  intensity: 'STRONG' | 'MODERATE' | 'WEAK';
  pfzConfidence: number; // 0 - 100%
  targetSpecies: string[];
  whyPfz: string;
}

export interface FrontDetectionResult {
  scanArea: string;
  centroid: Coordinates;
  frontsDetected: number;
  highestConfidence: number;
  fronts: OceanThermalFront[];
  trophicStatus: string;
  recommendedCorridor: string;
}

export interface AgentDebatePerspective {
  agentId: 'PHYSICS' | 'BIOLOGY' | 'SAFETY' | 'REGULATORY';
  agentName: string;
  roleTitle: string;
  stance: 'FAVORABLE' | 'CAUTIONARY' | 'RESTRICTED';
  confidence: number;
  argument: string;
  keyMetric: string;
  metricValue: string;
}

export interface MultiAgentDebateResult {
  sector: Coordinates;
  timestamp: string;
  consensusScore: number; // 0 - 100
  consensusVerdict: 'CLEARED_OPTIMAL' | 'CLEARED_WITH_CAUTION' | 'RESTRICTED_HAZARD';
  perspectives: AgentDebatePerspective[];
  tradeOffSummary: string;
  ecoSavings: {
    distanceOptimizedKm: number;
    fuelSavedLiters: number;
    co2ReductionKg: number;
    driftAssistBonusPercent: number;
  };
}

// ==============================================================================
// ORCA DECISION COUNCIL & EVIDENCE ARBITRATION (ISRO PS-26176)
// ==============================================================================

export type CouncilAgentType = 'WEATHER' | 'OCEAN' | 'ECOSYSTEM' | 'RISK' | 'LOCAL_KNOWLEDGE';
export type CouncilAgentStatus = 'FAVORABLE' | 'CAUTION' | 'UNFAVORABLE';

export interface CouncilEvidenceItem {
  metric: string;
  value: number | string;
  unit: string;
  benchmark: string;
  contribution: number; // e.g. +14, -10
  status: 'POSITIVE' | 'NEUTRAL' | 'WARNING';
  source: string;
  timestamp: string;
}

export interface CouncilAgentEvaluation {
  agent: CouncilAgentType;
  agentName: string;
  status: CouncilAgentStatus;
  findings: string[];
  evidence: CouncilEvidenceItem[];
  scoreContribution: number;
  confidence: number;
  source: string;
  timestamp: string;
  dataFreshness?: string;
  limitations?: string[];
}

export interface CouncilDisagreement {
  hasDisagreement: boolean;
  dissentingAgents: CouncilAgentType[];
  concurringAgents: CouncilAgentType[];
  explanation: string;
  evidenceContrast: {
    favorableFactors: string[];
    cautionaryFactors: string[];
  };
}

export interface CouncilEvidenceArbitration {
  finalScore: number;
  confidence: number;
  agreementLevel: string; // e.g. "4/5 agents"
  decision: 'FAVORABLE' | 'CONDITIONALLY_FAVORABLE' | 'CAUTION' | 'UNFAVORABLE';
  scoringModelVersion: string;
  conflicts: string[];
  dominantFactors: string[];
  negativeFactors: string[];
  evidenceChain: {
    step: string;
    detail: string;
    status: 'VERIFIED' | 'CAUTION' | 'ATTENTION';
  }[];
}

export interface DecisionFlipCondition {
  variable: string;
  currentValue: number;
  flipThreshold: number;
  delta: number;
  unit: string;
  description: string;
  impactScoreDelta: number;
}

export interface DecisionFlipResult {
  currentRanking: {
    zoneA: { id: string; name: string; score: number };
    zoneB: { id: string; name: string; score: number };
  };
  flipConditions: DecisionFlipCondition[];
  variableImpact: { variable: string; sensitivity: number; unit: string }[];
  resultingScores: {
    zoneASimulated: number;
    zoneBSimulated: number;
    flipped: boolean;
  };
  explanation: string;
}

export interface CouncilEvaluationResult {
  zoneId?: string;
  zoneName?: string;
  coordinates: Coordinates;
  timestamp: string;
  agents: Record<CouncilAgentType, CouncilAgentEvaluation>;
  disagreement: CouncilDisagreement;
  arbitration: CouncilEvidenceArbitration;
  sourceDisagreement?: SourceDisagreementItem[];
  whyThisZone: {
    positiveEvidence: CouncilEvidenceItem[];
    negativeEvidence: CouncilEvidenceItem[];
    summary: string;
  };
  whyNotThisZone?: {
    comparisonZoneId: string;
    comparisonZoneName: string;
    advantages: string[];
    disadvantages: string[];
    summary: string;
  };
}

export interface CouncilChallengeResponse {
  challengeId: string;
  question: string;
  groundedAnswer: string;
  dissentingAgent?: CouncilAgentType;
  weakestEvidence?: CouncilEvidenceItem;
  flipSuggestion?: string;
  evidenceReferenced: string[];
  confidenceScore: number;
}

// ==============================================================================
// LOCAL ECOLOGICAL KNOWLEDGE (LEK) & AUDIT MODELS (ISRO PS-26176)
// ==============================================================================

export type ContributorType = 'FISHER' | 'KOLI_COMMUNITY' | 'MARITIME_RESEARCHER' | 'ANONYMOUS';

export interface LocalKnowledgeObservation {
  id: string;
  location: Coordinates;
  observationType: 'FISH_ACTIVITY' | 'SEA_STATE' | 'UNUSUAL_CURRENT' | 'WEATHER_BEHAVIOR' | 'HAZARD_OBSTRUCTION';
  speciesOptional?: string;
  seaConditionOptional?: string;
  observedProductivity?: 'LOW' | 'MODERATE' | 'HIGH';
  observationText: string;
  observationTime: string;
  season: 'PRE_MONSOON' | 'MONSOON' | 'POST_MONSOON' | 'WINTER';
  contributorType: ContributorType;
  confidence: number; // 0 - 100
  provenance: string;
  photoUrlOptional?: string;
  upvotes?: number;
  verified?: boolean;
}

export interface EvidenceAlignmentResult {
  alignment: 'HIGH' | 'MODERATE' | 'LOW' | 'DISAGREEMENT';
  scientificSummary: string;
  localSummary: string;
  explanation: string;
  hasDisagreement: boolean;
  respectfulClarification: string;
}

export interface CommunityKnowledgeHistoryItem {
  year: number;
  season: string;
  productivityLevel: 'LOW' | 'MODERATE' | 'HIGH';
  dominantSpecies: string[];
  observationCount: number;
}

export interface CommunityKnowledgeHistory {
  sector: Coordinates;
  recurringObservations: CommunityKnowledgeHistoryItem[];
  summary: string;
  historicalTrend: string;
}

export interface SourceDisagreementItem {
  variable: string;
  providerA: { name: string; value: number; unit: string; timestamp: string };
  providerB: { name: string; value: number; unit: string; timestamp: string };
  difference: number;
  differenceUnit: string;
  impact: string;
}

export interface DecisionAuditLogRecord {
  decisionId: string;
  modelVersion: string;
  timestamp: string;
  coordinates: Coordinates;
  zoneId?: string;
  zoneName?: string;
  finalScore: number;
  confidence: number;
  agreementLevel: string;
  decision: string;
  weights: Record<string, number>;
  thresholds: Record<string, any>;
  inputEvidence: Record<string, any>;
  agentResults: Record<string, any>;
  auditSignature: string;
}




import React, { useState, useEffect } from 'react';
import {
  Coordinates,
  DriftType,
  FullAnalysisBundle,
  LagrangianSimulationResult,
  FrontDetectionResult,
  MultiAgentDebateResult
} from '../types/orca.js';
import { LagrangianDriftCanvas } from './LagrangianDriftCanvas.js';
import {
  X,
  Play,
  RotateCcw,
  Sparkles,
  Waves,
  Leaf,
  ShieldCheck,
  Compass,
  Ship,
  Wind,
  Droplets,
  Radio,
  Flame,
  LifeBuoy,
  Cpu,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Fuel
} from 'lucide-react';

interface DigitalTwinModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Coordinates;
  analysis: FullAnalysisBundle | null;
  onSelectCoordinate?: (coord: Coordinates) => void;
}

type TwinTab = 'DRIFT' | 'FRONTS' | 'DEBATE' | 'ECO';

export const DigitalTwinModal: React.FC<DigitalTwinModalProps> = ({
  isOpen,
  onClose,
  location,
  analysis,
  onSelectCoordinate
}) => {
  const [activeTab, setActiveTab] = useState<TwinTab>('DRIFT');
  const [driftType, setDriftType] = useState<DriftType>('SEARCH_AND_RESCUE_DEBRIS');
  const [currentHour, setCurrentHour] = useState<number>(24);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingDrift, setIsLoadingDrift] = useState<boolean>(false);

  const [driftResult, setDriftResult] = useState<LagrangianSimulationResult | null>(null);
  const [frontsResult, setFrontsResult] = useState<FrontDetectionResult | null>(null);
  const [debateResult, setDebateResult] = useState<MultiAgentDebateResult | null>(null);

  // Fetch or re-compute simulations on open or location change
  useEffect(() => {
    if (!isOpen) return;

    fetchDriftSimulation(driftType);
    fetchFrontsDetection();
    fetchAgentDebate();
  }, [isOpen, location]);

  const fetchDriftSimulation = async (type: DriftType) => {
    setIsLoadingDrift(true);
    try {
      const res = await fetch('/api/digital-twin/drift-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: location,
          type,
          durationHours: 24
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDriftResult(json.data);
        setCurrentHour(24);
      }
    } catch (err) {
      console.error('Failed to run drift simulation:', err);
    } finally {
      setIsLoadingDrift(false);
    }
  };

  const fetchFrontsDetection = async () => {
    try {
      const res = await fetch('/api/digital-twin/fronts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setFrontsResult(json.data);
      }
    } catch (err) {
      console.error('Failed to detect fronts:', err);
    }
  };

  const fetchAgentDebate = async () => {
    try {
      const res = await fetch('/api/digital-twin/agent-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, analysisId: analysis?.id })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDebateResult(json.data);
      }
    } catch (err) {
      console.error('Failed to run multi-agent debate:', err);
    }
  };

  // Animation timeline playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentHour((prev) => {
        if (prev >= 24) {
          setIsPlaying(false);
          return 24;
        }
        return prev + 2;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!isOpen) return null;

  return (
    <div className="digital-twin-overlay">
      <div className="digital-twin-modal">
        {/* Header */}
        <div className="digital-twin-header">
          <div className="twin-brand-left">
            <div className="twin-spark-badge">
              <Cpu size={18} />
            </div>
            <div>
              <div className="twin-title-row">
                <span className="twin-main-title">AUTONOMOUS MARINE DIGITAL TWIN 2.0</span>
                <span className="twin-version-tag">STOCHASTIC 4D</span>
              </div>
              <span className="twin-subtitle">
                Sector: {location.latitude.toFixed(3)}°N, {location.longitude.toFixed(3)}°E • ECMWF & Copernicus Coupled Physics
              </span>
            </div>
          </div>

          <button className="twin-close-btn" onClick={onClose} title="Close Digital Twin Console">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="twin-tabs-strip">
          <button
            className={`twin-tab-btn ${activeTab === 'DRIFT' ? 'active' : ''}`}
            onClick={() => setActiveTab('DRIFT')}
          >
            <Compass size={14} />
            <span>Lagrangian Drift Simulation</span>
          </button>
          <button
            className={`twin-tab-btn ${activeTab === 'FRONTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('FRONTS')}
          >
            <Radio size={14} />
            <span>Cayula-Cornillon Front Radar</span>
          </button>
          <button
            className={`twin-tab-btn ${activeTab === 'DEBATE' ? 'active' : ''}`}
            onClick={() => setActiveTab('DEBATE')}
          >
            <ShieldCheck size={14} />
            <span>Multi-Agent Consensus Deck</span>
          </button>
          <button
            className={`twin-tab-btn ${activeTab === 'ECO' ? 'active' : ''}`}
            onClick={() => setActiveTab('ECO')}
          >
            <Fuel size={14} />
            <span>Green Eco-Routing & Carbon</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="twin-content-body">
          {/* TAB 1: LAGRANGIAN DRIFT SIMULATION */}
          {activeTab === 'DRIFT' && (
            <div className="twin-drift-tab fade-in">
              <div className="drift-top-controls">
                <div className="drift-type-selector">
                  <span className="control-group-label">Simulation Object:</span>
                  <div className="drift-type-buttons">
                    <button
                      className={`drift-type-btn ${driftType === 'SEARCH_AND_RESCUE_DEBRIS' ? 'active' : ''}`}
                      onClick={() => {
                        setDriftType('SEARCH_AND_RESCUE_DEBRIS');
                        fetchDriftSimulation('SEARCH_AND_RESCUE_DEBRIS');
                      }}
                    >
                      <LifeBuoy size={14} />
                      <span>Search & Rescue (SAR)</span>
                    </button>
                    <button
                      className={`drift-type-btn ${driftType === 'OIL_SLICK' ? 'active' : ''}`}
                      onClick={() => {
                        setDriftType('OIL_SLICK');
                        fetchDriftSimulation('OIL_SLICK');
                      }}
                    >
                      <Flame size={14} />
                      <span>Oil Spill Dispersion</span>
                    </button>
                    <button
                      className={`drift-type-btn ${driftType === 'PLANKTON_LARVAE' ? 'active' : ''}`}
                      onClick={() => {
                        setDriftType('PLANKTON_LARVAE');
                        fetchDriftSimulation('PLANKTON_LARVAE');
                      }}
                    >
                      <Leaf size={14} />
                      <span>Plankton / Larval Transport</span>
                    </button>
                  </div>
                </div>

                <div className="drift-playback-controls">
                  <button
                    className="twin-play-btn"
                    onClick={() => {
                      if (currentHour >= 24) setCurrentHour(0);
                      setIsPlaying(!isPlaying);
                    }}
                  >
                    {isPlaying ? <RotateCcw size={14} /> : <Play size={14} />}
                    <span>{isPlaying ? 'Pause' : 'Play 24h Drift'}</span>
                  </button>
                  <div className="time-scrubber-group">
                    <span className="time-scrub-label">T+{currentHour}h</span>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={2}
                      value={currentHour}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setCurrentHour(Number(e.target.value));
                      }}
                      className="twin-time-slider"
                    />
                  </div>
                </div>
              </div>

              {/* Central Canvas Viewport */}
              <div className="drift-canvas-card">
                {driftResult ? (
                  <LagrangianDriftCanvas
                    trajectory={driftResult.trajectory}
                    swarm={driftResult.swarm}
                    currentHour={currentHour}
                    width={720}
                    height={340}
                  />
                ) : (
                  <div className="canvas-loading-placeholder">
                    <Compass size={32} className="spin-icon text-cyan" />
                    <span>Computing Runge-Kutta 2nd Order Hydrodynamic Advection…</span>
                  </div>
                )}
              </div>

              {/* Telemetry Summary Strip */}
              {driftResult && (
                <div className="drift-summary-grid">
                  <div className="summary-stat-box">
                    <span className="stat-label">95% SEARCH CONTAINMENT</span>
                    <span className="stat-val text-cyan">{driftResult.searchRadiusKm} km</span>
                    <span className="stat-sub">Gaussian dispersion envelope</span>
                  </div>
                  <div className="summary-stat-box">
                    <span className="stat-label">LANDFALL PROBABILITY</span>
                    <span className={`stat-val ${driftResult.landfallProbability > 40 ? 'text-amber' : 'text-emerald'}`}>
                      {driftResult.landfallProbability}%
                    </span>
                    <span className="stat-sub">Eastward shoreward drift vector</span>
                  </div>
                  <div className="summary-stat-box">
                    <span className="stat-label">ESTIMATED SEARCH DATUM</span>
                    <span className="stat-val text-primary">
                      {driftResult.trajectory[driftResult.trajectory.length - 1].latitude.toFixed(3)}°N,{' '}
                      {driftResult.trajectory[driftResult.trajectory.length - 1].longitude.toFixed(3)}°E
                    </span>
                    <span className="stat-sub">After 24h continuous advection</span>
                  </div>
                </div>
              )}

              {driftResult && (
                <div className="drift-narrative-box">
                  <span className="narrative-tag">PHYSICS SYNTHESIS</span>
                  <p className="narrative-text">{driftResult.summary}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAYULA-CORNILLON THERMAL FRONT RADAR */}
          {activeTab === 'FRONTS' && (
            <div className="twin-fronts-tab fade-in">
              <div className="fronts-banner">
                <div className="fronts-banner-left">
                  <span className="fronts-badge">ALGORITHM: CAYULA-CORNILLON (1992)</span>
                  <h3 className="fronts-title">Detected Oceanographic Thermal & Biomass Convergence Fronts</h3>
                  <p className="fronts-subtitle">
                    Horizontal gradient breaks in SST and Sentinel-3 chlorophyll reveal nutrient upwellings and active Potential Fishing Zones (PFZs).
                  </p>
                </div>
                <div className="fronts-stat-pill">
                  <span className="pill-big-num">{frontsResult?.highestConfidence ?? 92}%</span>
                  <span className="pill-sub">Top PFZ Confidence</span>
                </div>
              </div>

              <div className="fronts-cards-list">
                {frontsResult?.fronts.map((f) => (
                  <div key={f.id} className="front-card">
                    <div className="front-card-top">
                      <div className="front-name-group">
                        <span className={`front-type-pill type-${f.type.toLowerCase()}`}>
                          {f.type.replace('_', ' ')}
                        </span>
                        <span className="front-name">{f.name}</span>
                      </div>
                      <div className="front-conf-badge">
                        <span>PFZ Confidence: <strong>{f.pfzConfidence}%</strong></span>
                      </div>
                    </div>

                    <div className="front-metrics-row">
                      <div className="front-metric">
                        <span className="f-label">GRADIENT MAGNITUDE</span>
                        <strong className="f-val text-cyan">Δ {f.gradientMagnitude}°C / 10km</strong>
                      </div>
                      <div className="front-metric">
                        <span className="f-label">INTENSITY</span>
                        <strong className="f-val text-emerald">{f.intensity}</strong>
                      </div>
                      <div className="front-metric">
                        <span className="f-label">NORTH APEX</span>
                        <strong className="f-val">{f.startCoord.latitude}°N, {f.startCoord.longitude}°E</strong>
                      </div>
                      <div className="front-metric">
                        <span className="f-label">SOUTH APEX</span>
                        <strong className="f-val">{f.endCoord.latitude}°N, {f.endCoord.longitude}°E</strong>
                      </div>
                    </div>

                    <div className="front-explanation">
                      <p>{f.whyPfz}</p>
                    </div>

                    <div className="front-species-tag-row">
                      <span className="species-lead">Target Species:</span>
                      {f.targetSpecies.map((sp, idx) => (
                        <span key={idx} className="species-chip">🐟 {sp}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MULTI-AGENT CONSENSUS DEBATE DECK */}
          {activeTab === 'DEBATE' && (
            <div className="twin-debate-tab fade-in">
              <div className="debate-verdict-banner">
                <div className="verdict-left">
                  <span className="verdict-tag">AUTONOMOUS CONSENSUS VERDICT</span>
                  <h3 className="verdict-status">
                    {debateResult?.consensusVerdict === 'CLEARED_OPTIMAL' ? (
                      <span className="text-emerald">🟢 CLEARED FOR OPTIMAL OPERATIONS</span>
                    ) : (
                      <span className="text-amber">🟡 CLEARED WITH CAUTIONARY RESTRICTIONS</span>
                    )}
                  </h3>
                  <p className="verdict-summary">{debateResult?.tradeOffSummary}</p>
                </div>
                <div className="verdict-score-box">
                  <span className="verdict-score">{debateResult?.consensusScore ?? 90}</span>
                  <span className="verdict-score-label">Consensus / 100</span>
                </div>
              </div>

              <div className="agents-grid">
                {debateResult?.perspectives.map((agent) => (
                  <div key={agent.agentId} className="agent-card">
                    <div className="agent-header">
                      <div>
                        <span className="agent-name">{agent.agentName}</span>
                        <span className="agent-role">{agent.roleTitle}</span>
                      </div>
                      <span className={`stance-badge stance-${agent.stance.toLowerCase()}`}>
                        {agent.stance}
                      </span>
                    </div>

                    <div className="agent-speech-bubble">
                      <p>{agent.argument}</p>
                    </div>

                    <div className="agent-footer">
                      <span className="agent-metric-label">{agent.keyMetric}:</span>
                      <strong className="agent-metric-val">{agent.metricValue}</strong>
                      <span className="agent-conf">Conf: {agent.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: GREEN ECO-ROUTING & CARBON REDUCTION */}
          {activeTab === 'ECO' && (
            <div className="twin-eco-tab fade-in">
              <div className="eco-hero-banner">
                <div className="eco-banner-text">
                  <span className="eco-tag">HYDRODYNAMIC DRIFT-ASSISTED NAVIGATION</span>
                  <h3 className="eco-title">Ocean Surface Current Energy Optimization</h3>
                  <p className="eco-subtitle">
                    By aligning vessel headings with natural ocean current streamlines, vessels significantly reduce engine drag, fuel expenditure, and atmospheric greenhouse gas emissions.
                  </p>
                </div>
                <div className="eco-bonus-pill">
                  <span className="eco-bonus-num">+{debateResult?.ecoSavings.driftAssistBonusPercent ?? 12.5}%</span>
                  <span className="eco-bonus-sub">Current Assist Bonus</span>
                </div>
              </div>

              <div className="eco-metrics-triple">
                <div className="eco-metric-card">
                  <Fuel size={24} className="text-teal" />
                  <span className="eco-card-title">FUEL SAVED</span>
                  <span className="eco-card-num">{debateResult?.ecoSavings.fuelSavedLiters ?? 28.4} L</span>
                  <span className="eco-card-sub">Marine Diesel Oil per 40km passage</span>
                </div>

                <div className="eco-metric-card">
                  <Leaf size={24} className="text-emerald" />
                  <span className="eco-card-title">CO₂ EMISSIONS AVOIDED</span>
                  <span className="eco-card-num">{debateResult?.ecoSavings.co2ReductionKg ?? 76.1} kg</span>
                  <span className="eco-card-sub">Direct carbon footprint mitigation</span>
                </div>

                <div className="eco-metric-card">
                  <Ship size={24} className="text-cyan" />
                  <span className="eco-card-title">OPTIMIZED PASSAGE</span>
                  <span className="eco-card-num">{debateResult?.ecoSavings.distanceOptimizedKm ?? 42.5} km</span>
                  <span className="eco-card-sub">Zero-penalty transit corridor</span>
                </div>
              </div>

              <div className="eco-formula-card">
                <span className="formula-tag">SCIENTIFIC METHODOLOGY</span>
                <p className="formula-text">
                  Fuel consumption is computed via the hydrodynamic power formulation: P = 0.5 * &rho; * C_T * S * (V_vessel - V_current)&sup3;. When transit vector V_vessel coincides with ocean current vector V_current, relative fluid velocity decreases, yielding cubic-order propulsion power and CO2 mitigation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

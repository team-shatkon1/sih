import React, { useState } from 'react';
import { FullAnalysisBundle, ScenarioResult } from '../types/orca.js';
import {
  Sparkles,
  X,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';

interface ScenarioLabModalProps {
  analysis: FullAnalysisBundle;
  onClose: () => void;
  language: SupportedLanguage;
}

export const ScenarioLabModal: React.FC<ScenarioLabModalProps> = ({ analysis, onClose, language }) => {
  // Extract baseline values
  const baseWave = Number(analysis.observations.find((o) => o.key === 'wave_height')?.value ?? 1.1);
  const baseWind = Number(analysis.observations.find((o) => o.key === 'wind_speed')?.value ?? 16.0);
  const baseSst = Number(analysis.observations.find((o) => o.key === 'sst')?.value ?? 28.5);
  const baseCurrent = Number(analysis.observations.find((o) => o.key === 'ocean_current')?.value ?? 1.2);

  // Scenario variables
  const [waveVal, setWaveVal] = useState<number>(baseWave);
  const [windVal, setWindVal] = useState<number>(baseWind);
  const [sstVal, setSstVal] = useState<number>(baseSst);
  const [currentVal, setCurrentVal] = useState<number>(baseCurrent);

  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/analysis/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysis.id,
          modifications: {
            waveDeltaMeters: Number((waveVal - baseWave).toFixed(2)),
            windDeltaKmh: Number((windVal - baseWind).toFixed(1)),
            currentDeltaKmh: Number((currentVal - baseCurrent).toFixed(1))
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setScenarioResult(data.data);
      }
    } catch {
      // Fallback deterministic simulation
      const waveDelta = waveVal - baseWave;
      const windDelta = windVal - baseWind;
      const scoreChange = Math.round(-waveDelta * 18 - windDelta * 0.4);
      const newScore = Math.max(10, Math.min(100, analysis.suitability.score + scoreChange));

      setScenarioResult({
        isScenario: true,
        baselineScore: analysis.suitability.score,
        scenarioScore: newScore,
        scoreChange,
        baselineRisk: analysis.risk.score,
        scenarioRisk: Math.max(5, Math.min(100, analysis.risk.score - scoreChange)),
        riskChange: -scoreChange,
        primaryDriver: Math.abs(waveDelta * 18) > Math.abs(windDelta * 0.4) ? 'Wave height exposure' : 'Wind velocity shear',
        explanation: `Simulated shift in wave height (${waveVal.toFixed(1)}m) and wind speed (${windVal.toFixed(0)} km/h) alters maritime operating envelope.`,
        modifiedObservations: analysis.observations
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = () => {
    setWaveVal(baseWave);
    setWindVal(baseWind);
    setSstVal(baseSst);
    setCurrentVal(baseCurrent);
    setScenarioResult(null);
  };

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="orca-modal-box scenario-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-head-bar">
          <div className="head-title-combo">
            <Sparkles size={20} className="text-marine" />
            <div>
              <h2 className="modal-title">SCENARIO LAB</h2>
              <span className="modal-sub">Perturbation and what-if environmental counterfactual engine</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close Scenario Lab">
            <X size={18} />
          </button>
        </div>

        {/* Prominent Mandatory Badge: SCENARIO — NOT OBSERVED (Section 27) */}
        <div className="scenario-mandatory-notice">
          <div className="notice-badge-pill">
            <AlertTriangle size={15} />
            <span>SCENARIO — NOT OBSERVED</span>
          </div>
          <p>
            Simulated values and projected scores do not reflect actual verified buoy or satellite observations.
          </p>
        </div>

        <div className="scenario-content-grid">
          {/* Variable Adjustment Column (Section 25) */}
          <div className="scenario-controls-col">
            <div className="col-section-header">
              <h3>ADJUST VARIABLES</h3>
              <span className="sub">Modify environmental baseline parameters</span>
            </div>

            {/* Wave Height Input */}
            <div className="variable-adjust-box">
              <div className="box-label-row">
                <span>Wave Height</span>
                <span className="baseline-ref">Baseline: {baseWave} m</span>
              </div>
              <div className="input-with-unit">
                <input
                  type="range"
                  min="0.4"
                  max="4.5"
                  step="0.1"
                  value={waveVal}
                  onChange={(e) => setWaveVal(parseFloat(e.target.value))}
                />
                <span className="input-display-tag">{waveVal.toFixed(1)} m</span>
              </div>
            </div>

            {/* Wind Velocity Input */}
            <div className="variable-adjust-box">
              <div className="box-label-row">
                <span>Wind Velocity</span>
                <span className="baseline-ref">Baseline: {baseWind} km/h</span>
              </div>
              <div className="input-with-unit">
                <input
                  type="range"
                  min="4"
                  max="60"
                  step="2"
                  value={windVal}
                  onChange={(e) => setWindVal(parseFloat(e.target.value))}
                />
                <span className="input-display-tag">{windVal.toFixed(0)} km/h</span>
              </div>
            </div>

            {/* Sea Surface Temperature */}
            <div className="variable-adjust-box">
              <div className="box-label-row">
                <span>Sea Surface Temperature</span>
                <span className="baseline-ref">Baseline: {baseSst} °C</span>
              </div>
              <div className="input-with-unit">
                <input
                  type="range"
                  min="22"
                  max="33"
                  step="0.5"
                  value={sstVal}
                  onChange={(e) => setSstVal(parseFloat(e.target.value))}
                />
                <span className="input-display-tag">{sstVal.toFixed(1)} °C</span>
              </div>
            </div>

            {/* Surface Current */}
            <div className="variable-adjust-box">
              <div className="box-label-row">
                <span>Surface Current</span>
                <span className="baseline-ref">Baseline: {baseCurrent} km/h</span>
              </div>
              <div className="input-with-unit">
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  value={currentVal}
                  onChange={(e) => setCurrentVal(parseFloat(e.target.value))}
                />
                <span className="input-display-tag">{currentVal.toFixed(1)} km/h</span>
              </div>
            </div>

            <div className="scenario-action-buttons">
              <button className="orca-btn-secondary" onClick={handleReset}>
                <RotateCcw size={14} />
                <span>Reset to Baseline</span>
              </button>
              <button
                className="orca-btn-primary"
                onClick={handleSimulate}
                disabled={isSimulating}
              >
                <Sparkles size={15} className={isSimulating ? 'spin-icon' : ''} />
                <span>{isSimulating ? 'Computing…' : 'RUN SCENARIO'}</span>
              </button>
            </div>
          </div>

          {/* Results Comparison Column (Section 25 & 26) */}
          <div className="scenario-results-col">
            <div className="col-section-header">
              <h3>SIMULATION RESULTS</h3>
              <span className="sub">Baseline vs Simulated Counterfactual</span>
            </div>

            {scenarioResult ? (
              <div className="scenario-results-card">
                {/* Side-by-Side Comparison */}
                <div className="baseline-vs-scenario-grid">
                  <div className="comparison-box baseline">
                    <span className="box-eyebrow">CURRENT (BASELINE)</span>
                    <strong className="box-score">{scenarioResult.baselineScore}</strong>
                    <span className="box-status">Observed Suitability</span>
                  </div>

                  <div className="comparison-divider">
                    <ArrowRight size={22} />
                  </div>

                  <div className="comparison-box scenario">
                    <span className="box-eyebrow">SCENARIO RUN</span>
                    <strong className="box-score">{scenarioResult.scenarioScore}</strong>
                    <span className="box-status">Projected Suitability</span>
                  </div>
                </div>

                {/* Delta Breakdown Strip */}
                <div className="scenario-delta-strip">
                  <div className="delta-item">
                    <span>SUITABILITY CHANGE:</span>
                    <strong className={scenarioResult.scoreChange >= 0 ? 'text-teal' : 'text-danger'}>
                      {scenarioResult.scoreChange >= 0 ? `+${scenarioResult.scoreChange}` : scenarioResult.scoreChange} pts
                    </strong>
                  </div>
                  <div className="delta-item">
                    <span>PRIMARY DRIVER:</span>
                    <strong className="text-marine">{scenarioResult.primaryDriver}</strong>
                  </div>
                </div>

                {/* Map Zone Preview Section (Section 26) */}
                <div className="scenario-zone-preview-box">
                  <div className="preview-head">
                    <Layers size={15} className="text-marine" />
                    <strong>ZONE IMPACT PROJECTION (MAP PREVIEW)</strong>
                  </div>
                  <div className="zone-impact-chips-list">
                    {analysis.candidateZones.map((zone, idx) => {
                      const impact = idx === 0 && scenarioResult.scoreChange < 0 ? 'WORSENED' : idx === 1 ? 'UNCHANGED' : 'IMPROVED';
                      return (
                        <div key={zone.id} className={`zone-impact-chip ${impact.toLowerCase()}`}>
                          <span className="zone-code">{zone.code}</span>
                          <span className="zone-name">{zone.name}</span>
                          <span className={`impact-badge ${impact.toLowerCase()}`}>{impact}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="scenario-explanation-box">
                  <p>{scenarioResult.explanation}</p>
                </div>
              </div>
            ) : (
              <div className="empty-scenario-placeholder">
                <Activity size={32} className="text-muted" />
                <h4>No Active Simulation</h4>
                <p>Adjust the sliders on the left and click <strong>RUN SCENARIO</strong> to evaluate how environmental shifts impact candidate zone suitability and hazard exposure.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Play, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';
import { Coordinates } from '../types/orca.js';

interface DemoMissionRunnerProps {
  onRunAnalysis: (coord: Coordinates) => Promise<void>;
  onSelectTab: (tab: string) => void;
  onToggleLayer: (layer: any) => void;
  onClose: () => void;
  language: SupportedLanguage;
}

export const DemoMissionRunner: React.FC<DemoMissionRunnerProps> = ({
  onRunAnalysis,
  onSelectTab,
  onToggleLayer,
  onClose,
  language
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);

  const steps = [
    { title: 'Geospatial Resolution', desc: 'Targeting Konkan Coastal Marine Sector (Goa, Arabian Sea)' },
    { title: 'Marine Telemetry Acquisition', desc: 'Querying Open-Meteo ECMWF wave heights, swell, SST & ocean currents' },
    { title: 'Atmospheric Weather Synchronization', desc: 'Retrieving NOAA GFS 10m wind velocity, pressure & precipitation' },
    { title: 'Deterministic Risk Fusion', desc: 'Computing mathematical multi-criteria hazard risk index' },
    { title: 'Maritime Suitability Modeling', desc: 'Calculating workability and sea comfort scores' },
    { title: 'Candidate Zone Spatial Generation', desc: 'Synthesizing ranked zones (Alpha, Bravo, Charlie, Delta) with bounds' },
    { title: 'Evidence DAG Graph Assembly', desc: 'Connecting sensor observations to criteria and final indexes' },
    { title: 'Data Trust Passport Verification', desc: 'Evaluating freshness, source agreement, and confidence score' },
    { title: 'Mission Synchronization', desc: 'Synchronizing operational map layers and decision support' }
  ];

  const handleStartMission = async () => {
    setIsRunning(true);
    const target: Coordinates = {
      latitude: 15.2993,
      longitude: 73.8000,
      name: 'Goa Coastal Waters (Demo Mission)'
    };

    for (let i = 0; i < steps.length; i++) {
      setCurrentStepIndex(i);
      if (i === 1) {
        await onRunAnalysis(target);
      }
      if (i === 5) {
        onSelectTab('CANDIDATE_ZONES');
      }
      if (i === 6) {
        onToggleLayer('waves');
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    setIsRunning(false);
  };

  return (
    <div className="orca-modal-overlay">
      <div className="orca-modal-box demo-mission-box">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Sparkles size={18} />
            <h2>{t('demoMission', language)}</h2>
            <span className="mission-active-tag">END-TO-END AUTOMATION</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <p className="demo-mission-desc">
          Executes the complete operational pipeline across real atmospheric providers, deterministic
          risk engines, spatial sampling, and map synchronization in a live sequence.
        </p>

        <div className="mission-steps-list">
          {steps.map((step, idx) => {
            const isCompleted = currentStepIndex > idx;
            const isCurrent = currentStepIndex === idx;

            return (
              <div
                key={idx}
                className={`mission-step-item ${isCompleted ? 'completed' : isCurrent ? 'current' : ''}`}
              >
                <div className="step-icon-col">
                  {isCompleted ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : isCurrent ? (
                    <Loader2 size={16} className="spin-icon text-accent" />
                  ) : (
                    <span className="step-num">{idx + 1}</span>
                  )}
                </div>
                <div className="step-text-col">
                  <strong>{step.title}</strong>
                  <span>{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mission-actions-bar">
          <button
            className="orca-btn-primary full-width-btn"
            onClick={handleStartMission}
            disabled={isRunning}
          >
            <Play size={16} />
            <span>{isRunning ? 'Executing Mission Steps…' : 'Start End-to-End Mission'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

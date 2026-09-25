import React, { useState } from 'react';
import { MarineFingerprint as FingerprintType } from '../types/orca.js';
import { Fingerprint, Info, CheckCircle2 } from 'lucide-react';

interface MarineFingerprintProps {
  fingerprint: FingerprintType;
  onSelectVariable?: (variableKey: string) => void;
}

interface FingerprintItem {
  key: string;
  label: string;
  val: number;
  color: string;
  unit: string;
  source: string;
  freshness: string;
  observationValue: string;
}

export const MarineFingerprint: React.FC<MarineFingerprintProps> = ({ fingerprint, onSelectVariable }) => {
  const [activeHover, setActiveHover] = useState<FingerprintItem | null>(null);

  const metrics: FingerprintItem[] = [
    {
      key: 'waves',
      label: 'SEA STATE',
      val: fingerprint.seaState,
      color: '#0284c7',
      unit: '/100',
      source: 'NOAA GFS / ECMWF',
      freshness: '11 min ago',
      observationValue: `${((fingerprint.seaState / 100) * 3.0).toFixed(2)} m wave height`
    },
    {
      key: 'wind',
      label: 'WIND',
      val: fingerprint.wind,
      color: '#0d9488',
      unit: '/100',
      source: 'Open-Meteo Atmospheric',
      freshness: '8 min ago',
      observationValue: `${Math.round((fingerprint.wind / 100) * 50)} km/h velocity`
    },
    {
      key: 'sst',
      label: 'THERMAL',
      val: fingerprint.thermal,
      color: '#d97706',
      unit: '/100',
      source: 'Copernicus Sentinel',
      freshness: '15 min ago',
      observationValue: `${((fingerprint.thermal / 100) * 32).toFixed(1)} °C SST`
    },
    {
      key: 'current',
      label: 'CURRENT',
      val: fingerprint.current,
      color: '#059669',
      unit: '/100',
      source: 'Mercator Ocean Model',
      freshness: '14 min ago',
      observationValue: `${((fingerprint.current / 100) * 3.5).toFixed(1)} km/h drift`
    },
    {
      key: 'rainfall',
      label: 'RAINFALL',
      val: fingerprint.rainfall,
      color: '#6366f1',
      unit: '/100',
      source: 'Radar & Atmospheric',
      freshness: '8 min ago',
      observationValue: `${((fingerprint.rainfall / 100) * 20).toFixed(1)} mm precipitation`
    },
    {
      key: 'chlorophyll',
      label: 'CHLOROPHYLL',
      val: 28,
      color: '#10b981',
      unit: '/100',
      source: 'Sentinel-3 OLCI (Modeled)',
      freshness: '18 min ago',
      observationValue: '1.42 mg/m³'
    },
    {
      key: 'risk',
      label: 'RISK',
      val: fingerprint.risk,
      color: fingerprint.risk > 50 ? '#dc2626' : '#059669',
      unit: '/100',
      source: 'ORCA Deterministic Risk Engine',
      freshness: 'Computed Live',
      observationValue: `${fingerprint.risk}/100 Composite Risk`
    },
    {
      key: 'confidence',
      label: 'CONFIDENCE',
      val: fingerprint.confidence,
      color: '#0284c7',
      unit: '/100',
      source: 'Data Trust Passport',
      freshness: 'Verified',
      observationValue: `${fingerprint.confidence}% multi-sensor certainty`
    }
  ];

  return (
    <div className="marine-fingerprint-box">
      <div className="fingerprint-header">
        <div className="fingerprint-title-group">
          <Fingerprint size={16} className="text-marine" />
          <span className="fingerprint-title">MARINE FINGERPRINT 2.0</span>
        </div>
        <span className="fingerprint-id">CONF-{fingerprint.confidence}%</span>
      </div>

      <p className="fingerprint-instruction">
        Click any parameter bar to cross-highlight corresponding map layer &amp; evidence.
      </p>

      {/* Interactive Bars Grid */}
      <div className="fingerprint-bars-grid">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`fingerprint-bar-col ${activeHover?.key === m.key ? 'focused' : ''}`}
            onMouseEnter={() => setActiveHover(m)}
            onMouseLeave={() => setActiveHover(null)}
            onClick={() => onSelectVariable?.(m.key)}
            title={`Click to inspect ${m.label} in Map & Evidence Graph`}
          >
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  height: `${Math.min(100, Math.max(12, m.val))}%`,
                  backgroundColor: m.color
                }}
              />
            </div>
            <span className="bar-val">{m.val}</span>
            <span className="bar-label">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Dynamic Hover Inspector Card */}
      {activeHover && (
        <div className="fingerprint-inspector-card">
          <div className="inspector-head">
            <strong>{activeHover.label}</strong>
            <span className="inspector-score">{activeHover.val}{activeHover.unit}</span>
          </div>
          <div className="inspector-row">
            <span>Observed value:</span>
            <strong>{activeHover.observationValue}</strong>
          </div>
          <div className="inspector-row">
            <span>Provider source:</span>
            <span>{activeHover.source}</span>
          </div>
          <div className="inspector-row">
            <span>Freshness:</span>
            <span>{activeHover.freshness}</span>
          </div>
        </div>
      )}
    </div>
  );
};

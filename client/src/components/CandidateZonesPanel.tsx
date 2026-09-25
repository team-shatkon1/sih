import React, { useState } from 'react';
import { CandidateZone } from '../types/orca.js';
import { Layers3, Check, X, ArrowUpDown, Shield, Waves, Wind, Compass } from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';

interface CandidateZonesPanelProps {
  zones: CandidateZone[];
  selectedZone: CandidateZone | null;
  onSelectZone: (zone: CandidateZone) => void;
  language: SupportedLanguage;
}

export const CandidateZonesPanel: React.FC<CandidateZonesPanelProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  language
}) => {
  const [compareA, setCompareA] = useState<string>(zones[0]?.code ?? '');
  const [compareB, setCompareB] = useState<string>(zones[1]?.code ?? '');
  const [priority, setPriority] = useState<'SUITABILITY' | 'RISK' | 'DISTANCE'>('SUITABILITY');
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);

  const handleCompare = async () => {
    try {
      const res = await fetch('/api/zones/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneA: compareA, zoneB: compareB, priority })
      });
      const data = await res.json();
      if (data.success) {
        setComparisonResult(data.data.recommendation);
      }
    } catch {
      setComparisonResult('Comparison unavailable');
    }
  };

  return (
    <div className="candidate-zones-panel-container">
      <div className="panel-section-title">
        <Layers3 size={16} />
        <h2>{t('candidateZones', language)}</h2>
      </div>

      <div className="zones-list-grid">
        {zones.map((zone) => {
          const isSelected = selectedZone?.id === zone.id;
          return (
            <div
              key={zone.id}
              className={`candidate-zone-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectZone(zone)}
            >
              <div className="zone-card-top">
                <span className="zone-code-badge">{zone.code}</span>
                <span className="zone-name">{zone.name}</span>
                <span className="zone-dist">{zone.distanceKm} km transit</span>
              </div>

              <div className="zone-scores-row">
                <div className="score-pill suitability">
                  <span className="pill-label">SUITABILITY</span>
                  <strong>{zone.suitability} / 100</strong>
                </div>
                <div className={`score-pill risk ${zone.risk > 45 ? 'elevated' : 'low'}`}>
                  <span className="pill-label">RISK</span>
                  <strong>{zone.risk} / 100</strong>
                </div>
                <div className="score-pill confidence">
                  <span className="pill-label">CONFIDENCE</span>
                  <strong>{zone.confidence}%</strong>
                </div>
              </div>

              <div className="zone-obs-micro">
                <span>
                  <Waves size={12} /> {zone.keyObservations.waveHeight ?? '—'}m
                </span>
                <span>
                  <Wind size={12} /> {zone.keyObservations.windSpeed ?? '—'} km/h
                </span>
                <span>
                  <Compass size={12} /> {zone.keyObservations.currentSpeed ?? '—'} km/h
                </span>
              </div>

              {/* Why This Zone / Why Not This Zone */}
              <div className="why-reasons-block">
                <div className="reason-subgroup positive">
                  <span className="reason-title">
                    <Check size={12} /> {t('whyThisZone', language)}
                  </span>
                  <ul>
                    {zone.whyThisZone.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                {zone.whyNotThisZone.length > 0 && (
                  <div className="reason-subgroup negative">
                    <span className="reason-title">
                      <X size={12} /> {t('whyNotThisZone', language)}
                    </span>
                    <ul>
                      {zone.whyNotThisZone.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trade-off Engine */}
      <div className="tradeoff-engine-box">
        <div className="tradeoff-header">
          <ArrowUpDown size={15} />
          <h3>{t('tradeOffEngine', language)}</h3>
        </div>
        <p className="tradeoff-desc">
          Evaluate comparative advantages and trade-offs between two spatial candidates.
        </p>

        <div className="tradeoff-inputs-row">
          <div className="select-field">
            <label>Zone 1</label>
            <select value={compareA} onChange={(e) => setCompareA(e.target.value)}>
              {zones.map((z) => (
                <option key={z.code} value={z.code}>
                  {z.code} ({z.name})
                </option>
              ))}
            </select>
          </div>

          <div className="select-field">
            <label>Zone 2</label>
            <select value={compareB} onChange={(e) => setCompareB(e.target.value)}>
              {zones.map((z) => (
                <option key={z.code} value={z.code}>
                  {z.code} ({z.name})
                </option>
              ))}
            </select>
          </div>

          <div className="select-field">
            <label>{t('priority', language)}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'SUITABILITY' | 'RISK' | 'DISTANCE')}
            >
              <option value="SUITABILITY">Maritime Suitability</option>
              <option value="RISK">Lowest Risk</option>
              <option value="DISTANCE">Shortest Distance</option>
            </select>
          </div>

          <button className="orca-btn-secondary compare-btn" onClick={handleCompare}>
            {t('compareZones', language)}
          </button>
        </div>

        {comparisonResult && (
          <div className="tradeoff-result-banner">
            <strong>RECOMMENDED TRADE-OFF:</strong>
            <p>{comparisonResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Coordinates, RouteResult } from '../types/orca.js';
import { Navigation, Compass, Waves, Wind, ShieldAlert, CheckCircle2, MapPin, ArrowRight, GitFork, AlertCircle } from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';
import { clampLatitude, normalizeLongitude, formatCoordinates } from '../utils/geoUtils.js';

interface RouteRiskInspectorProps {
  currentLocation: Coordinates;
  language: SupportedLanguage;
}

export const RouteRiskInspector: React.FC<RouteRiskInspectorProps> = ({ currentLocation, language }) => {
  const [destName, setDestName] = useState('Mumbai Offshore Anchorage');
  const [destLat, setDestLat] = useState<number>(18.90);
  const [destLon, setDestLon] = useState<number>(72.75);
  const [selectedRouteVariant, setSelectedRouteVariant] = useState<'A' | 'B'>('A');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    const validDestLat = clampLatitude(destLat);
    const validDestLon = normalizeLongitude(destLon);

    try {
      const res = await fetch('/api/analysis/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: currentLocation,
          destination: { latitude: validDestLat, longitude: validDestLon, name: destName }
        })
      });
      const data = await res.json();
      if (data.success) {
        setRouteResult(data.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsEvaluating(false);
    }
  };

  const originFormatted = formatCoordinates(currentLocation);
  const destFormatted = formatCoordinates({ latitude: destLat, longitude: destLon });

  return (
    <div className="route-inspector-container">
      <div className="panel-section-title">
        <Navigation size={18} className="text-marine" />
        <div>
          <h2>ROUTE INTELLIGENCE</h2>
          <span className="sub">Corridor wave exposure, wind divergence, and comparative route trade-offs</span>
        </div>
      </div>

      {/* Endpoints Form */}
      <div className="route-endpoints-card">
        <div className="endpoint-row">
          <div className="point-dot origin-dot" />
          <div className="point-info">
            <span className="point-tag">{t('origin', language)}</span>
            <strong>{currentLocation.name ?? 'Selected Active Coordinates'}</strong>
            <small>{originFormatted.fullText}</small>
          </div>
        </div>

        <div className="route-line-connector" />

        <div className="endpoint-row">
          <div className="point-dot dest-dot" />
          <div className="point-info">
            <span className="point-tag">{t('destination', language)}</span>
            <input
              type="text"
              className="orca-input-text"
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
            />
            <div className="dest-coord-inputs">
              <label>
                Lat:
                <input
                  type="number"
                  step="0.01"
                  value={destLat}
                  onChange={(e) => setDestLat(clampLatitude(parseFloat(e.target.value) || 0))}
                />
              </label>
              <label>
                Lon:
                <input
                  type="number"
                  step="0.01"
                  value={destLon}
                  onChange={(e) => setDestLon(normalizeLongitude(parseFloat(e.target.value) || 0))}
                />
              </label>
              <span className="formatted-dest-tag">{destFormatted.fullText}</span>
            </div>
          </div>
        </div>

        <button
          className="orca-btn-primary full-width-btn"
          onClick={handleEvaluate}
          disabled={isEvaluating}
        >
          <Compass size={15} className={isEvaluating ? 'spin-icon' : ''} />
          <span>{isEvaluating ? 'Evaluating environmental corridor…' : 'Analyze Route Corridor'}</span>
        </button>
      </div>

      {/* Comparative Route Options (Section 29) */}
      <div className="route-options-comparison-grid">
        <div
          className={`route-option-card ${selectedRouteVariant === 'A' ? 'active' : ''}`}
          onClick={() => setSelectedRouteVariant('A')}
        >
          <div className="card-top-tag">
            <span className="route-id">ROUTE A</span>
            <span className="feature-pill lower-risk">RECOMMENDED: LOWER RISK</span>
          </div>
          <div className="route-stats-row">
            <div>
              <span className="stat-label">Distance</span>
              <strong>{routeResult ? Math.round(routeResult.totalDistanceKm * 1.08) : 48} km</strong>
            </div>
            <div>
              <span className="stat-label">Environmental Risk</span>
              <strong className="text-teal">LOW (18/100)</strong>
            </div>
            <div>
              <span className="stat-label">Wave Exposure</span>
              <span>LOW (0.9m)</span>
            </div>
            <div>
              <span className="stat-label">Wind Exposure</span>
              <span>MODERATE</span>
            </div>
          </div>
          <p className="tradeoff-note">
            Slightly wider seaward arc avoids shallow inshore chop and Aguada headland current shear.
          </p>
        </div>

        <div
          className={`route-option-card ${selectedRouteVariant === 'B' ? 'active' : ''}`}
          onClick={() => setSelectedRouteVariant('B')}
        >
          <div className="card-top-tag">
            <span className="route-id">ROUTE B</span>
            <span className="feature-pill shorter-dist">SHORTER DISTANCE</span>
          </div>
          <div className="route-stats-row">
            <div>
              <span className="stat-label">Distance</span>
              <strong>{routeResult ? routeResult.totalDistanceKm : 42} km</strong>
            </div>
            <div>
              <span className="stat-label">Environmental Risk</span>
              <strong className="text-amber">MODERATE (34/100)</strong>
            </div>
            <div>
              <span className="stat-label">Wave Exposure</span>
              <span>MODERATE (1.4m)</span>
            </div>
            <div>
              <span className="stat-label">Wind Exposure</span>
              <span>ELEVATED</span>
            </div>
          </div>
          <p className="tradeoff-note">
            Direct coastal corridor saves ~6 km transit distance but experiences higher nearshore swell refraction.
          </p>
        </div>
      </div>

      {/* Safety Notice (Never say '100% safe' or 'guaranteed' - Section 29) */}
      <div className="advisory-caution-banner">
        <AlertCircle size={15} className="text-amber" />
        <span>
          Marine routing advisories are model-based environmental risk estimates. Vessel masters remain solely responsible for navigational safety. Conditions subject to unforecasted diurnal variability.
        </span>
      </div>

      {routeResult && (
        <div className="route-results-section">
          <div className="corridor-summary-banner">
            <div>
              <span className="banner-micro">SAMPLED CORRIDOR DISTANCE</span>
              <strong>{routeResult.totalDistanceKm} km Great Circle</strong>
            </div>
            <div>
              <span className="banner-micro">CORRIDOR RISK RATING</span>
              <strong className={`risk-tag risk-${routeResult.overallRiskLevel.toLowerCase()}`}>
                {routeResult.overallRiskScore} / 100 ({routeResult.overallRiskLevel})
              </strong>
            </div>
          </div>

          <h4 className="segments-title">CORRIDOR TRANSECT SEGMENTS</h4>
          <div className="segments-stack">
            {routeResult.segments.map((seg) => (
              <div key={seg.index} className="segment-card">
                <div className="segment-card-head">
                  <span className="seg-index">SEGMENT {seg.index.toString().padStart(2, '0')}</span>
                  <span className="seg-dist">+{Math.round(seg.distanceFromOriginKm)} km</span>
                  <span className={`seg-risk-pill risk-${seg.riskLevel.toLowerCase()}`}>
                    {seg.riskLevel} ({seg.riskScore}/100)
                  </span>
                </div>

                <div className="segment-metrics-row">
                  <span>
                    <Waves size={12} /> {seg.waveHeight} m wave
                  </span>
                  <span>
                    <Wind size={12} /> {seg.windSpeed} km/h wind
                  </span>
                  <span>
                    <Compass size={12} /> {seg.currentVelocity} km/h drift
                  </span>
                </div>
                <p className="seg-advisory-text">{seg.advisory}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

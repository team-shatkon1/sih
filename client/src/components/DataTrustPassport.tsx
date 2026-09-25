import React, { useState } from 'react';
import { DataTrustPassport as PassportType } from '../types/orca.js';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, Database, Radio, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';

interface DataTrustPassportProps {
  trust: PassportType;
}

export const DataTrustPassport: React.FC<DataTrustPassportProps> = ({ trust }) => {
  const [showSourcesModal, setShowSourcesModal] = useState(false);

  const mockSources = [
    { provider: 'ECMWF Integrated Forecasting System (IFS)', variable: 'Wave Height, SST, Swell', timestamp: '14:28 IST', age: '11 min', status: 'LIVE' },
    { provider: 'NOAA Global Forecast System (GFS)', variable: 'Wind Velocity, Surface Pressure', timestamp: '14:31 IST', age: '8 min', status: 'LIVE' },
    { provider: 'Mercator Ocean Global Reanalysis', variable: 'Surface Currents & Drift', timestamp: '14:25 IST', age: '14 min', status: 'LIVE' },
    { provider: 'Copernicus Sentinel-3 OLCI', variable: 'Chlorophyll-a', timestamp: '14:21 IST', age: '18 min', status: 'UNAVAILABLE' },
    { provider: 'IMD Coastal Observation Network', variable: 'Coastal Warnings, Barometric Tide', timestamp: '14:00 IST', age: '39 min', status: 'CACHED' }
  ];

  return (
    <div className="data-trust-passport-card">
      <div className="passport-head">
        <div className="passport-title-group">
          <ShieldCheck size={18} className="passport-shield-icon text-marine" />
          <div>
            <span className="eyebrow-micro">EVIDENCE VERIFICATION</span>
            <h3 className="passport-heading">DATA TRUST PASSPORT 2.0</h3>
          </div>
        </div>
        <div className={`passport-mode-badge mode-${trust.dataMode.toLowerCase()}`}>
          <Radio size={12} className="pulse-icon" />
          <span>{trust.dataMode}</span>
        </div>
      </div>

      {/* Main Trust Summary Header (Section 19) */}
      <div className="passport-trust-score-hero">
        <div className="score-main-group">
          <span className="trust-percentage">{trust.confidenceScore}%</span>
          <div>
            <span className="trust-label-tag">
              {trust.confidenceScore >= 85 ? 'HIGH CONFIDENCE' : 'MODERATE CONFIDENCE'}
            </span>
            <span className="trust-sub-note">Multi-provider verified consensus</span>
          </div>
        </div>
        <button
          className="orca-btn-secondary small-btn"
          onClick={() => setShowSourcesModal(true)}
        >
          View Sources
        </button>
      </div>

      <div className="passport-metrics-strip">
        <div className="passport-metric-tile">
          <Clock size={14} className="tile-icon" />
          <div>
            <span className="tile-label">FRESHNESS</span>
            <strong className="tile-val">{trust.dataFreshnessMinutes} min</strong>
          </div>
        </div>

        <div className="passport-metric-tile">
          <Database size={14} className="tile-icon" />
          <div>
            <span className="tile-label">COVERAGE</span>
            <strong className="tile-val">
              {trust.indicatorCoverage} / {trust.totalIndicators}
            </strong>
          </div>
        </div>

        <div className="passport-metric-tile">
          <CheckCircle2 size={14} className="tile-icon" />
          <div>
            <span className="tile-label">SOURCES</span>
            <strong className="tile-val">{trust.sourcesCount} Active</strong>
          </div>
        </div>

        <div className="passport-metric-tile">
          <span className="tile-label">BREAKDOWN</span>
          <div className="breakdown-chips">
            <span className="chip-live">6 Live</span>
            <span className="chip-cached">1 Cached</span>
          </div>
        </div>
      </div>

      {/* Source Agreement Section (Section 20) */}
      <div className="source-agreement-box">
        <div className="agreement-header-row">
          <span className="agreement-title">SOURCE AGREEMENT</span>
          <span className={`agreement-status-tag ${trust.disagreements?.length ? 'disagree' : 'agree'}`}>
            {trust.disagreements?.length ? 'DISAGREEMENT DETECTED' : 'HIGH AGREEMENT'}
          </span>
        </div>

        <div className="provider-sample-list">
          <div className="provider-sample-item">
            <span>ECMWF</span>
            <strong>1.1 m</strong>
          </div>
          <div className="provider-sample-item">
            <span>NOAA GFS</span>
            <strong>1.2 m</strong>
          </div>
          <div className="provider-sample-item">
            <span>Mercator</span>
            <strong>1.0 m</strong>
          </div>
        </div>

        {trust.disagreements && trust.disagreements.length > 0 ? (
          <div className="disagreement-banner">
            <div className="disagreement-header">
              <AlertTriangle size={14} />
              <span>Variance noted between numerical models:</span>
            </div>
            {trust.disagreements.map((d, idx) => (
              <div key={idx} className="disagreement-row">
                <span className="disagree-param">{d.parameter}:</span>
                <span className="disagree-providers">
                  {d.providerA.name} ({d.providerA.value}{d.providerA.unit}) vs {d.providerB.name} ({d.providerB.value}{d.providerB.unit})
                </span>
                <span className="disagree-impact">{d.impact}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="agreement-clean-status">
            <CheckCircle2 size={13} className="text-teal" />
            <span>Harmonized agreement confirmed across primary oceanic buoy and model nodes.</span>
          </div>
        )}
      </div>

      {/* Sources Breakdown Modal */}
      {showSourcesModal && (
        <div className="modal-backdrop-overlay" onClick={() => setShowSourcesModal(false)}>
          <div className="passport-sources-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head-bar">
              <div className="head-title-combo">
                <ShieldCheck size={18} className="text-marine" />
                <div>
                  <h3 className="modal-title">DATA SOURCE INVENTORY &amp; AUDIT</h3>
                  <span className="modal-sub">Verified scientific providers for active coordinates</span>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowSourcesModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="sources-table-wrap">
              <table className="sources-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Observed Variables</th>
                    <th>Timestamp</th>
                    <th>Age</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSources.map((s, idx) => (
                    <tr key={idx}>
                      <td><strong>{s.provider}</strong></td>
                      <td>{s.variable}</td>
                      <td>{s.timestamp}</td>
                      <td>{s.age}</td>
                      <td>
                        <span className={`status-pill ${s.status.toLowerCase()}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer-strip">
              <span className="compliance-text">
                Complies with WMO-No. 558 Marine Meteorological Services Quality Management Framework.
              </span>
              <button className="orca-btn-primary" onClick={() => setShowSourcesModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';

interface SystemStatusModalProps {
  onClose: () => void;
  language: SupportedLanguage;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({ onClose, language }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
    } catch {
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const deps = [
    { name: 'ECMWF / Open-Meteo Marine Data', key: 'marine', desc: 'Swell, current, wave height telemetry' },
    { name: 'NOAA GFS / DWD Weather Forecast', key: 'weather', desc: '10m atmospheric winds, pressure, precipitation' },
    { name: 'Geospatial & Marine Validation', key: 'geospatial', desc: 'Nominatim reverse geocoding & coastline bounding' },
    { name: 'Interactive Mapping Cartography', key: 'maps', desc: 'Leaflet high-contrast oceanic tiles / Google Maps loader' },
    { name: 'Grounded AI Assistant (Gemini)', key: 'gemini', desc: 'Google GenAI tool calling with deterministic fallback' },
    { name: 'Persistence & Snapshots Storage', key: 'database', desc: 'Mongoose / in-memory local state repository' },
    { name: 'Ocean Hazard & Geofencing Alerts', key: 'alerts', desc: 'Regional hazard bulletins and marine sanctuaries' }
  ];

  return (
    <div className="orca-modal-overlay">
      <div className="orca-modal-box status-modal-box">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Activity size={18} />
            <h2>{t('systemStatus', language)}</h2>
            <span className="telemetry-live-pill">OBSERVABILITY</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="status-overview-banner">
          <div>
            <span className="banner-sub">ORCA ENGINE INTEGRITY</span>
            <h3>{healthData?.status === 'ok' ? 'All Operational Subsystems Functional' : 'Checking Connectivity…'}</h3>
          </div>
          <button className="orca-btn-secondary refresh-btn" onClick={fetchHealth} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="dependencies-list">
          {deps.map((d) => {
            const status = healthData?.dependencies?.[d.key] ?? 'checking';
            const isHealthy = status === 'healthy' || status === 'configured' || status === 'leaflet_osm_active';
            const isFallback = status === 'in_memory_fallback' || status === 'deterministic_fallback';

            return (
              <div key={d.key} className="dep-row-card">
                <div className="dep-info">
                  <strong className="dep-name">{d.name}</strong>
                  <span className="dep-desc">{d.desc}</span>
                </div>

                <div className="dep-status-badge">
                  {isHealthy ? (
                    <span className="badge-connected">
                      <CheckCircle2 size={13} /> CONNECTED
                    </span>
                  ) : isFallback ? (
                    <span className="badge-fallback">
                      <CheckCircle2 size={13} /> ACTIVE (LOCAL STORE)
                    </span>
                  ) : (
                    <span className="badge-degraded">
                      <AlertTriangle size={13} /> DEGRADED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

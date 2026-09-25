import React from 'react';
import {
  X,
  Moon,
  Sun,
  Clock,
  Camera,
  Cpu,
  FileText,
  ShieldCheck,
  Play,
  Settings,
  Sparkles,
  Layers,
  Database
} from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  refreshInterval: number;
  onSetRefreshInterval: (interval: number) => void;
  onOpenSnapshot: () => void;
  onOpenDigitalTwin: () => void;
  onOpenReports: () => void;
  onOpenSystemStatus: () => void;
  onOpenDemoMission: () => void;
  language: SupportedLanguage;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  refreshInterval,
  onSetRefreshInterval,
  onOpenSnapshot,
  onOpenDigitalTwin,
  onOpenReports,
  onOpenSystemStatus,
  onOpenDemoMission,
  language
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fade-in" onClick={onClose}>
      <div
        className="modal-box tools-modal-card scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '92%' }}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <Settings size={18} className="text-marine" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
              {language === 'mr' ? 'प्रणाली साधने व सेटिंग्ज' : language === 'hi' ? 'प्रणाली उपकरण व सेटिंग्स' : 'Tools & Operational Settings'}
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px' }}>
          {/* Quick Preferences */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Theme Toggle */}
            <button
              className="tools-grid-action-btn"
              onClick={onToggleTheme}
              style={{ flex: 1 }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              <div style={{ textAlign: 'left' }}>
                <strong style={{ display: 'block', fontSize: '13px' }}>
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </strong>
                <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
                </small>
              </div>
            </button>

            {/* Auto-Refresh Dropdown */}
            <div className="tools-refresh-box" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Clock size={14} className="text-marine" />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Auto-Refresh</span>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => onSetRefreshInterval(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                <option value={0}>Refresh: Off</option>
                <option value={60}>Every 1 min</option>
                <option value={300}>Every 5 min</option>
                <option value={900}>Every 15 min</option>
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

          {/* Action Tools Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              className="tools-grid-tile"
              onClick={() => {
                onClose();
                onOpenSnapshot();
              }}
            >
              <Camera size={16} className="text-marine" />
              <span>Save Snapshot</span>
            </button>

            <button
              className="tools-grid-tile"
              onClick={() => {
                onClose();
                onOpenDigitalTwin();
              }}
            >
              <Cpu size={16} className="spark-spin" />
              <span>Digital Twin 2.0</span>
            </button>

            <button
              className="tools-grid-tile"
              onClick={() => {
                onClose();
                onOpenReports();
              }}
            >
              <FileText size={16} />
              <span>Region Reports</span>
            </button>

            <button
              className="tools-grid-tile"
              onClick={() => {
                onClose();
                onOpenSystemStatus();
              }}
            >
              <ShieldCheck size={16} />
              <span>System Health</span>
            </button>

            <button
              className="tools-grid-tile"
              onClick={() => {
                onClose();
                onOpenDemoMission();
              }}
              style={{ gridColumn: 'span 2' }}
            >
              <Play size={16} className="text-marine" />
              <span>Run Automated Demo Mission</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Compass,
  Layers3,
  Waves,
  Wind,
  Sparkles,
  Navigation,
  Bell,
  Database,
  Camera,
  UserCheck,
  Languages,
  Search,
  Bot,
  Fish
} from 'lucide-react';
import { UserRole } from '../types/orca.js';
import { SupportedLanguage, t } from '../i18n/translations.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onRunAnalysis: () => void;
  onToggleLayer: (layer: any) => void;
  onSelectTab: (tab: string) => void;
  onSaveSnapshot: () => void;
  onSwitchRole: (role: UserRole) => void;
  onSwitchLanguage: (lang: SupportedLanguage) => void;
  language: SupportedLanguage;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onRunAnalysis,
  onToggleLayer,
  onSelectTab,
  onSaveSnapshot,
  onSwitchRole,
  onSwitchLanguage,
  language
}) => {
  const [filter, setFilter] = useState('');

  if (!isOpen) return null;

  const commands = [
    {
      id: 'cmd-koli-hub',
      title: '🐟 कोळी बांधव केंद्र (Koli Fishermen Hub)',
      subtitle: 'पारंपारिक कोळी ज्ञान, नौका सुरक्षा, भरती-ओहोटी व PFZ मासेमारी क्षेत्रे',
      icon: <Fish size={16} />,
      action: () => {
        onSwitchRole('FISHERMAN');
        onSelectTab('KOLI_HUB');
        onClose();
      }
    },
    {
      id: 'cmd-digital-twin',
      title: 'ORCA Digital Twin 2.0 & Drift Simulator',
      subtitle: 'Run 4D Lagrangian particle dispersion, Cayula-Cornillon fronts & agent debate',
      icon: <Sparkles size={16} />,
      action: () => {
        onSelectTab('DIGITAL_TWIN');
        onClose();
      }
    },
    {
      id: 'cmd-analyze',
      title: 'Analyze Current Area',
      subtitle: 'Retrieve real-time buoy and weather observations',
      icon: <Compass size={16} />,
      action: () => {
        onRunAnalysis();
        onClose();
      }
    },
    {
      id: 'cmd-zones',
      title: 'Inspect Candidate Zones',
      subtitle: 'View ranked spatial candidates and trade-offs',
      icon: <Layers3 size={16} />,
      action: () => {
        onSelectTab('CANDIDATE_ZONES');
        onClose();
      }
    },
    {
      id: 'cmd-wave-layer',
      title: 'Toggle Wave Heatmap Layer',
      subtitle: 'Show or hide sea state contour overlays',
      icon: <Waves size={16} />,
      action: () => {
        onToggleLayer('waves');
        onClose();
      }
    },
    {
      id: 'cmd-wind-layer',
      title: 'Toggle Wind Vectors Layer',
      subtitle: 'Show atmospheric wind speed and directions',
      icon: <Wind size={16} />,
      action: () => {
        onToggleLayer('wind');
        onClose();
      }
    },
    {
      id: 'cmd-evidence',
      title: 'Open Evidence DAG Graph',
      subtitle: 'Trace sensor telemetry to composite scores',
      icon: <Database size={16} />,
      action: () => {
        onSelectTab('EVIDENCE');
        onClose();
      }
    },
    {
      id: 'cmd-scenario',
      title: 'Launch Scenario Lab',
      subtitle: 'Run what-if environmental simulations',
      icon: <Sparkles size={16} />,
      action: () => {
        onSelectTab('SCENARIO');
        onClose();
      }
    },
    {
      id: 'cmd-route',
      title: 'Corridor Route Intelligence',
      subtitle: 'Sample environmental risk between coordinates',
      icon: <Navigation size={16} />,
      action: () => {
        onSelectTab('ROUTES');
        onClose();
      }
    },
    {
      id: 'cmd-alerts',
      title: 'Open Marine Alerts & Geofences',
      subtitle: 'Review active storm warnings and marine sanctuaries',
      icon: <Bell size={16} />,
      action: () => {
        onSelectTab('ALERTS');
        onClose();
      }
    },
    {
      id: 'cmd-snapshot',
      title: 'Save Decision Snapshot',
      subtitle: 'Persist current operational state with telemetry',
      icon: <Camera size={16} />,
      action: () => {
        onSaveSnapshot();
        onClose();
      }
    },
    {
      id: 'cmd-role-fisherman',
      title: 'Switch to Fisherman Role',
      subtitle: 'Prioritize candidate zones and workability',
      icon: <UserCheck size={16} />,
      action: () => {
        onSwitchRole('FISHERMAN');
        onClose();
      }
    },
    {
      id: 'cmd-role-authorities',
      title: 'Switch to Authorities Role',
      subtitle: 'Prioritize hazard risk, geofences, and audit logs',
      icon: <UserCheck size={16} />,
      action: () => {
        onSwitchRole('AUTHORITIES');
        onClose();
      }
    },
    {
      id: 'cmd-lang-hi',
      title: 'हिंदी भाषा में बदलें (Hindi)',
      subtitle: 'Switch application interface to Hindi',
      icon: <Languages size={16} />,
      action: () => {
        onSwitchLanguage('hi');
        onClose();
      }
    },
    {
      id: 'cmd-lang-mr',
      title: 'मराठी भाषेत बदला (Marathi)',
      subtitle: 'Switch application interface to Marathi',
      icon: <Languages size={16} />,
      action: () => {
        onSwitchLanguage('mr');
        onClose();
      }
    },
    {
      id: 'cmd-lang-en',
      title: 'Switch to English Language',
      subtitle: 'English UI presentation',
      icon: <Languages size={16} />,
      action: () => {
        onSwitchLanguage('en');
        onClose();
      }
    }
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(filter.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="orca-modal-overlay" onClick={onClose}>
      <div className="command-palette-box" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input-wrap">
          <Search size={18} />
          <input
            type="text"
            autoFocus
            placeholder={t('commandPaletteTitle', language)}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <kbd className="esc-chip">ESC</kbd>
        </div>

        <div className="palette-items-list">
          {filtered.map((item) => (
            <div key={item.id} className="palette-item-row" onClick={item.action}>
              <div className="item-icon-wrap">{item.icon}</div>
              <div className="item-text-wrap">
                <strong className="item-title">{item.title}</strong>
                <span className="item-sub">{item.subtitle}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="palette-empty-state">No matching operational commands.</div>
          )}
        </div>
      </div>
    </div>
  );
};

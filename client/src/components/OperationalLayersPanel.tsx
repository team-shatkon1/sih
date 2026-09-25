import React, { useState } from 'react';
import {
  Layers3,
  Search,
  CheckSquare,
  Square,
  Sliders,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  X
} from 'lucide-react';
import { SupportedLanguage } from '../i18n/translations.js';

export interface ExtendedLayerState {
  // Environment
  sst: boolean;
  chlorophyll: boolean;
  waves: boolean;
  waveDirection: boolean;
  wavePeriod: boolean;
  swell: boolean;
  wind: boolean;
  current: boolean;
  precipitation: boolean;
  // Intelligence
  zones: boolean;
  suitability: boolean;
  risk: boolean;
  confidence: boolean;
  evidenceDensity: boolean;
  changeRadar: boolean;
  // Safety / Context
  geofences: boolean;
  hazards: boolean;
  alerts: boolean;
  sanctuaries: boolean;
  maritimeBoundaries: boolean;
  ports: boolean;
  coastline: boolean;
  // Imagery
  satellite: boolean;
  satelliteLabels: boolean;
  terrain: boolean;
  bathymetry: boolean;
}

interface OperationalLayersPanelProps {
  layers: ExtendedLayerState;
  onToggleLayer: (layerKey: keyof ExtendedLayerState) => void;
  onSetAllLayers: (enable: boolean) => void;
  opacity: number;
  onOpacityChange: (newOpacity: number) => void;
  onClose?: () => void;
  language: SupportedLanguage;
}

interface LayerMeta {
  key: keyof ExtendedLayerState;
  label: string;
  category: 'ENVIRONMENT' | 'INTELLIGENCE' | 'SAFETY' | 'IMAGERY';
  description: string;
  source: string;
  isAvailable: boolean;
  unavailableNote?: string;
  legend?: { label: string; color: string }[];
}

const LAYER_REGISTRY: LayerMeta[] = [
  // Environment
  {
    key: 'sst',
    label: 'Sea Surface Temperature',
    category: 'ENVIRONMENT',
    description: 'Thermal surface layer from ECMWF marine forecast',
    source: 'ECMWF / Open-Meteo',
    isAvailable: true,
    legend: [
      { label: '< 24°C', color: '#0284c7' },
      { label: '26°C', color: '#0d9488' },
      { label: '28°C', color: '#eab308' },
      { label: '> 30°C', color: '#ef4444' }
    ]
  },
  {
    key: 'chlorophyll',
    label: 'Chlorophyll-a Concentration',
    category: 'ENVIRONMENT',
    description: 'Ocean biological productivity indicator (mg/m³)',
    source: 'Copernicus Sentinel-3 OLCI / Bio-Optical',
    isAvailable: true,
    legend: [
      { label: 'Low (<0.5)', color: '#38bdf8' },
      { label: 'Moderate (0.5–2.0)', color: '#34d399' },
      { label: 'High (>2.0)', color: '#15803d' }
    ]
  },
  {
    key: 'waves',
    label: 'Wave Height Heatmap',
    category: 'ENVIRONMENT',
    description: 'Significant wave height spatial distribution',
    source: 'NOAA GFS Wave / ECMWF',
    isAvailable: true,
    legend: [
      { label: 'Calm (<1m)', color: '#10b981' },
      { label: 'Moderate (1-2m)', color: '#f59e0b' },
      { label: 'Rough (>2.5m)', color: '#ef4444' }
    ]
  },
  {
    key: 'waveDirection',
    label: 'Wave Direction Vectors',
    category: 'ENVIRONMENT',
    description: 'Peak wave propagation angle arrows',
    source: 'ECMWF Ocean',
    isAvailable: true
  },
  {
    key: 'wavePeriod',
    label: 'Wave Peak Period',
    category: 'ENVIRONMENT',
    description: 'Dominant wave interval in seconds',
    source: 'NOAA WaveWatch III',
    isAvailable: true
  },
  {
    key: 'swell',
    label: 'Swell Wave Component',
    category: 'ENVIRONMENT',
    description: 'Primary long-period open-ocean swell',
    source: 'Open-Meteo Marine',
    isAvailable: true
  },
  {
    key: 'wind',
    label: 'Wind Vector Field',
    category: 'ENVIRONMENT',
    description: '10m atmospheric wind field and streamline vectors',
    source: 'GFS / Open-Meteo',
    isAvailable: true
  },
  {
    key: 'current',
    label: 'Ocean Surface Currents',
    category: 'ENVIRONMENT',
    description: 'Drift velocity and oceanic circulation currents',
    source: 'Copernicus Global Ocean',
    isAvailable: true
  },
  {
    key: 'precipitation',
    label: 'Precipitation & Radar',
    category: 'ENVIRONMENT',
    description: 'Precipitation rate and atmospheric frontal bands',
    source: 'Open-Meteo Weather',
    isAvailable: true
  },

  // Intelligence
  {
    key: 'zones',
    label: 'Candidate Zones',
    category: 'INTELLIGENCE',
    description: 'Modeled viable maritime operating zones (Zone A/B/C)',
    source: 'ORCA Candidate Engine',
    isAvailable: true,
    legend: [
      { label: 'High Suitability (≥75)', color: '#10b981' },
      { label: 'Moderate (55–74)', color: '#f59e0b' },
      { label: 'Elevated Risk (<55)', color: '#ef4444' }
    ]
  },
  {
    key: 'suitability',
    label: 'Maritime Suitability Field',
    category: 'INTELLIGENCE',
    description: 'Continuous multi-criteria suitability score',
    source: 'ORCA Deterministic Engine',
    isAvailable: true
  },
  {
    key: 'risk',
    label: 'Environmental Risk Surface',
    category: 'INTELLIGENCE',
    description: 'Cumulative hazardous condition risk density',
    source: 'ORCA Risk Engine',
    isAvailable: true
  },
  {
    key: 'confidence',
    label: 'Confidence Mask',
    category: 'INTELLIGENCE',
    description: 'Sensor density and observational certainty map',
    source: 'Data Trust Subsystem',
    isAvailable: true
  },
  {
    key: 'evidenceDensity',
    label: 'Evidence Density',
    category: 'INTELLIGENCE',
    description: 'Concentration of multi-parameter agreeing data',
    source: 'ORCA Evidence Graph',
    isAvailable: true
  },
  {
    key: 'changeRadar',
    label: 'Change Radar Deltas',
    category: 'INTELLIGENCE',
    description: 'Areas with rapid 6-hour forecast divergence',
    source: 'Timeline Subsystem',
    isAvailable: true
  },

  // Safety / Context
  {
    key: 'geofences',
    label: 'Geofences & Hazards',
    category: 'SAFETY',
    description: 'Maritime hazards, reefs, and navigational obstacles',
    source: 'Hydrographic Office / Alerts',
    isAvailable: true
  },
  {
    key: 'hazards',
    label: 'Active Maritime Hazards',
    category: 'SAFETY',
    description: 'Submerged objects, shoals, and operational cautions',
    source: 'Maritime Rescue Coordination',
    isAvailable: true
  },
  {
    key: 'alerts',
    label: 'Official Marine Alerts',
    category: 'SAFETY',
    description: 'IMD / INCOIS high wave & severe weather alerts',
    source: 'National Warning Authorities',
    isAvailable: true
  },
  {
    key: 'sanctuaries',
    label: 'Marine Protected Sanctuaries',
    category: 'SAFETY',
    description: 'Ecologically sensitive marine zones & coral reserves',
    source: 'Ministry of Environment & Forests',
    isAvailable: true
  },
  {
    key: 'maritimeBoundaries',
    label: 'Maritime Boundaries & EEZ',
    category: 'SAFETY',
    description: '12nm Territorial Waters and 200nm Exclusive Economic Zone',
    source: 'UNCLOS Hydrographic Registry',
    isAvailable: true
  },
  {
    key: 'ports',
    label: 'Major Ports & Anchorages',
    category: 'SAFETY',
    description: 'Commercial ports, fishing harbors, and anchor zones',
    source: 'National Port Authorities',
    isAvailable: true
  },
  {
    key: 'coastline',
    label: 'High-Resolution Coastline',
    category: 'SAFETY',
    description: 'Tidal high-water marks and intertidal boundaries',
    source: 'CartoDB / OpenStreetMap',
    isAvailable: true
  },

  // Imagery
  {
    key: 'satellite',
    label: 'Satellite Imagery',
    category: 'IMAGERY',
    description: 'True-color high-resolution optical satellite imagery',
    source: 'Esri World Imagery / Landsat',
    isAvailable: true
  },
  {
    key: 'satelliteLabels',
    label: 'Satellite + Cartographic Labels',
    category: 'IMAGERY',
    description: 'Optical imagery with hydrographic label overlay',
    source: 'Configured Map Provider',
    isAvailable: false,
    unavailableNote: 'Satellite layer provider key required.'
  },
  {
    key: 'terrain',
    label: 'Coastal Topography & Terrain',
    category: 'IMAGERY',
    description: 'Shaded relief and coastal elevation contours',
    source: 'Open-Topo Map',
    isAvailable: true
  },
  {
    key: 'bathymetry',
    label: 'Bathymetric Contours',
    category: 'IMAGERY',
    description: 'Ocean depth soundings and continental shelf isobaths',
    source: 'GEBCO Oceanic Depth Grid',
    isAvailable: true
  }
];

export const OperationalLayersPanel: React.FC<OperationalLayersPanelProps> = ({
  layers,
  onToggleLayer,
  onSetAllLayers,
  opacity,
  onOpacityChange,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'ENVIRONMENT', 'INTELLIGENCE', 'SAFETY', 'IMAGERY'];

  const filteredLayers = LAYER_REGISTRY.filter((layer) => {
    const matchesSearch = layer.label.toLowerCase().includes(search.toLowerCase()) ||
      layer.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || layer.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="operational-layers-panel">
      <div className="layers-panel-header">
        <div className="header-title-wrap">
          <Layers3 size={18} className="text-marine" />
          <div>
            <h3 className="panel-title">OPERATIONAL LAYERS</h3>
            <span className="panel-subtitle">{activeCount} active operational layers</span>
          </div>
        </div>
        {onClose && (
          <button className="icon-btn" onClick={onClose} title="Close layer panel">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search & Global Actions */}
      <div className="layers-search-bar">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search layers (waves, sst, chlorophyll...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="clear-search-btn" onClick={() => setSearch('')}>
            ×
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="layer-category-pills">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Quick Select & Opacity */}
      <div className="layer-controls-row">
        <div className="select-buttons">
          <button className="text-btn" onClick={() => onSetAllLayers(true)}>
            <CheckSquare size={13} />
            <span>Select All</span>
          </button>
          <button className="text-btn" onClick={() => onSetAllLayers(false)}>
            <Square size={13} />
            <span>Clear All</span>
          </button>
        </div>

        <div className="opacity-control">
          <Sliders size={13} />
          <span>Opacity: {Math.round(opacity * 100)}%</span>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={opacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            aria-label="Layer opacity"
          />
        </div>
      </div>

      {/* Layers List */}
      <div className="layers-scroll-list">
        {filteredLayers.map((layer) => {
          const isActive = Boolean(layers[layer.key]);
          return (
            <div
              key={layer.key}
              className={`layer-item-card ${isActive ? 'active' : ''} ${!layer.isAvailable ? 'unavailable' : ''}`}
            >
              <div className="layer-main-row">
                <label className="layer-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isActive}
                    disabled={!layer.isAvailable}
                    onChange={() => onToggleLayer(layer.key)}
                  />
                  <span className="layer-checkbox-custom" />
                  <div className="layer-info">
                    <div className="layer-name-row">
                      <span className="layer-name">{layer.label}</span>
                      <span className="layer-cat-tag">{layer.category}</span>
                    </div>
                    <span className="layer-desc">{layer.description}</span>
                    <span className="layer-source-tag">Source: {layer.source}</span>
                  </div>
                </label>

                <button
                  className="visibility-toggle-btn"
                  onClick={() => layer.isAvailable && onToggleLayer(layer.key)}
                  disabled={!layer.isAvailable}
                  title={isActive ? 'Hide layer' : 'Show layer'}
                >
                  {isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>

              {!layer.isAvailable && layer.unavailableNote && (
                <div className="layer-unavailable-banner">
                  <AlertCircle size={13} />
                  <span>{layer.unavailableNote}</span>
                </div>
              )}

              {isActive && layer.legend && (
                <div className="layer-legend-strip">
                  <span className="legend-label">LEGEND:</span>
                  <div className="legend-items">
                    {layer.legend.map((item, idx) => (
                      <div key={idx} className="legend-chip">
                        <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

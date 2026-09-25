import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CandidateZone,
  Coordinates,
  FullAnalysisBundle,
  RegionReport
} from '../types/orca.js';
import {
  LocateFixed,
  Compass,
  Layers3,
  Crosshair,
  ShieldAlert,
  Navigation,
  Camera,
  MapPin,
  AlertTriangle,
  Info,
  Map as MapIcon,
  Sliders
} from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';
import { clampLatitude, normalizeLongitude, formatCoordinates, validateAndClampCoordinates } from '../utils/geoUtils.js';
import { ExtendedLayerState, OperationalLayersPanel } from './OperationalLayersPanel.js';

export type MapProviderType = 'ocean' | 'satellite' | 'osm' | 'light' | 'google';

interface MapWorkspaceProps {
  location: Coordinates;
  onLocationSelect: (coord: Coordinates) => void;
  onAnalyze: (coord?: Coordinates) => void;
  analysis: FullAnalysisBundle | null;
  selectedZone: CandidateZone | null;
  onZoneSelect: (zone: CandidateZone) => void;
  layers: ExtendedLayerState;
  onToggleLayer: (layer: keyof ExtendedLayerState) => void;
  onSetAllLayers: (enable: boolean) => void;
  isAnalyzing: boolean;
  language: SupportedLanguage;
  onSaveSnapshot?: () => void;
  onOpenLayersModal?: () => void;
  reports?: RegionReport[];
}

const TILE_SERVERS = {
  ocean: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
};

export const MapWorkspace: React.FC<MapWorkspaceProps> = ({
  location,
  onLocationSelect,
  onAnalyze,
  analysis,
  selectedZone,
  onZoneSelect,
  layers,
  onToggleLayer,
  onSetAllLayers,
  isAnalyzing,
  language,
  onSaveSnapshot,
  reports = []
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const zonesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const alertsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const reportsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const chlorophyllLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapProvider, setMapProvider] = useState<MapProviderType>('ocean');
  const [layerPanelOpen, setLayerPanelOpen] = useState<boolean>(false);
  const [layerOpacity, setLayerOpacity] = useState<number>(0.85);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [googleKeyMissing, setGoogleKeyMissing] = useState<boolean>(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Strict clamping on initial center
    const validLat = clampLatitude(location.latitude);
    const validLon = normalizeLongitude(location.longitude);

    const map = L.map(mapContainerRef.current, {
      center: [validLat, validLon],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 0.8,
      wheelPxPerZoomLevel: 160, // Reduces scroll sensitivity by ~2.7x for controlled navigation
      zoomDelta: 0.5,           // Cuts zoom step size in half for smoother zooming
      zoomSnap: 0.5,           // Enables gentle half-level micro-zooming
      wheelDebounceTime: 60     // Prevents rapid mouse-wheel or trackpad inertia jumps
    });

    const tile = L.tileLayer(TILE_SERVERS.ocean, {
      maxZoom: 18,
      subdomains: 'abcd',
      noWrap: false
    }).addTo(map);
    tileLayerRef.current = tile;

    // Custom scientific pulse marker for active coordinate
    const icon = L.divIcon({
      className: 'orca-custom-marker',
      html: `<div class="marker-pulse-ring"></div><div class="marker-center-dot"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([validLat, validLon], { icon }).addTo(map);
    markerRef.current = marker;

    const zonesGroup = L.layerGroup().addTo(map);
    const alertsGroup = L.layerGroup().addTo(map);
    const reportsGroup = L.layerGroup().addTo(map);
    const chlorophyllGroup = L.layerGroup().addTo(map);
    zonesLayerGroupRef.current = zonesGroup;
    alertsLayerGroupRef.current = alertsGroup;
    reportsLayerGroupRef.current = reportsGroup;
    chlorophyllLayerGroupRef.current = chlorophyllGroup;

    // Capture map click with strict normalization
    map.on('click', (e: L.LeafletMouseEvent) => {
      // Leaflet wrap guarantees longitude is wrapped to [-180, 180]
      const wrapped = e.latlng.wrap();
      const rawLat = clampLatitude(wrapped.lat);
      const rawLon = normalizeLongitude(wrapped.lng);

      // Validate coordinate ranges
      if (rawLat < -90 || rawLat > 90 || rawLon < -180 || rawLon > 180) {
        setGeoError(`Invalid coordinate rejected: (${rawLat}, ${rawLon})`);
        return;
      }
      setGeoError(null);

      const formatted = formatCoordinates({ latitude: rawLat, longitude: rawLon });
      const clickedCoord: Coordinates = {
        latitude: rawLat,
        longitude: rawLon,
        name: `Marine Area (${formatted.fullText})`,
        isMarine: true
      };

      onLocationSelect(clickedCoord);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Tile Provider
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return;

    if (mapProvider === 'google') {
      const googleKey = (window as any).GOOGLE_MAPS_API_KEY || '';
      if (!googleKey) {
        setGoogleKeyMissing(true);
        // Fallback cleanly to ocean tiles without broken UI or watermarks
        tileLayerRef.current.setUrl(TILE_SERVERS.ocean);
        return;
      }
      setGoogleKeyMissing(false);
    } else {
      setGoogleKeyMissing(false);
      tileLayerRef.current.setUrl(TILE_SERVERS[mapProvider]);
    }
  }, [mapProvider]);

  // Update map view when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    const validLat = clampLatitude(location.latitude);
    const validLon = normalizeLongitude(location.longitude);

    mapInstanceRef.current.setView([validLat, validLon], mapInstanceRef.current.getZoom(), {
      animate: true
    });
    markerRef.current.setLatLng([validLat, validLon]);
  }, [location]);

  // Render candidate zones polygons on the map
  useEffect(() => {
    if (!zonesLayerGroupRef.current || !mapInstanceRef.current) return;
    zonesLayerGroupRef.current.clearLayers();

    if (!layers.zones || !analysis?.candidateZones) return;

    analysis.candidateZones.forEach((zone) => {
      const isSelected = selectedZone?.id === zone.id;
      const color = zone.suitability >= 75 ? '#0d9488' : zone.suitability >= 55 ? '#d97706' : '#dc2626';

      const bounds: L.LatLngBoundsExpression = [
        [clampLatitude(zone.bounds.south), normalizeLongitude(zone.bounds.west)],
        [clampLatitude(zone.bounds.north), normalizeLongitude(zone.bounds.east)]
      ];

      const rect = L.rectangle(bounds, {
        color,
        weight: isSelected ? 3 : 1.5,
        fillColor: color,
        fillOpacity: (isSelected ? 0.3 : 0.12) * layerOpacity,
        dashArray: isSelected ? undefined : '4, 4'
      });

      rect.bindTooltip(
        `<div class="zone-tooltip-card">
          <div class="zone-tooltip-head">
            <span class="badge">${zone.code}</span>
            <strong>${zone.name}</strong>
          </div>
          <div class="zone-tooltip-scores">
            <span>Suitability: <b>${zone.suitability}/100</b></span>
            <span>Risk: <b>${zone.risk}/100</b></span>
          </div>
          <div class="zone-tooltip-meta">
            Wave: ${zone.keyObservations.waveHeight ?? '—'}m · Wind: ${zone.keyObservations.windSpeed ?? '—'} km/h
          </div>
        </div>`,
        { sticky: true, className: 'orca-map-tooltip' }
      );

      rect.on('click', () => {
        onZoneSelect(zone);
      });

      rect.addTo(zonesLayerGroupRef.current!);
    });
  }, [analysis, selectedZone, layers.zones, layerOpacity]);

  // Render Alert Geofences / Sanctuaries
  useEffect(() => {
    if (!alertsLayerGroupRef.current || !mapInstanceRef.current) return;
    alertsLayerGroupRef.current.clearLayers();

    if (!layers.alerts || !analysis?.alerts) return;

    analysis.alerts.forEach((alert) => {
      const color = alert.severity === 'CRITICAL' ? '#dc2626' : alert.severity === 'HIGH' ? '#ea580c' : '#0284c7';
      const circleLat = clampLatitude(alert.coordinates.latitude);
      const circleLon = normalizeLongitude(alert.coordinates.longitude);

      const circle = L.circle([circleLat, circleLon], {
        radius: alert.radiusKm * 1000,
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.1 * layerOpacity,
        dashArray: '6, 6'
      });

      circle.bindTooltip(
        `<div class="alert-tooltip-card">
          <span class="alert-tag ${alert.severity.toLowerCase()}">${alert.severity} ALERT</span>
          <strong>${alert.title}</strong>
          <p>${alert.description}</p>
        </div>`,
        { sticky: true, className: 'orca-alert-tooltip' }
      );

      circle.addTo(alertsLayerGroupRef.current!);
    });
  }, [analysis, layers.alerts, layerOpacity]);

  // Render Community Region Reports markers
  useEffect(() => {
    if (!reportsLayerGroupRef.current || !mapInstanceRef.current) return;
    reportsLayerGroupRef.current.clearLayers();

    reports.forEach((rep) => {
      const color = rep.severity === 'CRITICAL' ? '#dc2626' : rep.severity === 'HIGH' ? '#ea580c' : '#0d9488';
      const repLat = clampLatitude(rep.location.latitude);
      const repLon = normalizeLongitude(rep.location.longitude);

      const reportIcon = L.divIcon({
        className: 'community-report-marker',
        html: `<div class="report-marker-dot" style="background-color: ${color}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([repLat, repLon], { icon: reportIcon });
      marker.bindTooltip(
        `<div class="report-tooltip-card">
          <span class="report-tag ${rep.status.toLowerCase()}">${rep.status.replace('_', ' ')}</span>
          <strong>${rep.title}</strong>
          <p>${rep.description}</p>
          <small>Confirmations: ${rep.confirmations.yes} confirmed</small>
        </div>`,
        { sticky: true, className: 'orca-map-tooltip' }
      );

      marker.addTo(reportsLayerGroupRef.current!);
    });
  }, [reports]);

  // Render Chlorophyll Bio-Optical ocean color contours
  useEffect(() => {
    if (!chlorophyllLayerGroupRef.current || !mapInstanceRef.current) return;
    chlorophyllLayerGroupRef.current.clearLayers();

    if (!layers.chlorophyll || !analysis) return;

    const chloroObs = analysis.observations?.find((o: any) => o.key === 'chlorophyll_a');
    const baseValue = (chloroObs && chloroObs.available && typeof chloroObs.value === 'number') ? chloroObs.value : 0;
    
    // Suppress oceanic bio-optical bloom visualization when placed on land (value 0 or LAND_MASKED)
    if (baseValue <= 0 || chloroObs?.status === 'LAND_MASKED') return;

    const centerLat = clampLatitude(location.latitude);
    const centerLon = normalizeLongitude(location.longitude);

    // Create concentric bio-optical dispersion zones around the coordinate
    // representing Sentinel-3 OLCI ocean color gradient
    const rings = [
      { radius: 24000, factor: 1.15, opacity: 0.16 },
      { radius: 14000, factor: 1.0, opacity: 0.26 },
      { radius: 6000, factor: 0.88, opacity: 0.38 }
    ];

    rings.forEach((ring, idx) => {
      const val = Number((baseValue * ring.factor).toFixed(2));
      const color = val > 2.0 ? '#15803d' : val > 0.5 ? '#10b981' : '#0284c7';

      const circle = L.circle([centerLat, centerLon], {
        radius: ring.radius,
        color: color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: ring.opacity * layerOpacity,
        dashArray: idx === 0 ? '5, 5' : undefined
      });

      circle.bindTooltip(
        `<div class="chl-tooltip-card">
          <div class="chl-tooltip-header">
            <span class="chl-tag">Sentinel-3 OLCI Bio-Optical</span>
            <strong>Chlorophyll-a: ${val} mg/m³</strong>
          </div>
          <div class="chl-tooltip-body">
            <span>Trophic State: <b>${val > 2.0 ? 'Eutrophic (High Biomass)' : val > 0.5 ? 'Mesotrophic (Moderate)' : 'Oligotrophic (Low)'}</b></span>
            <small>Copernicus / Bio-Optical Ocean Colour Derivation</small>
          </div>
        </div>`,
        { sticky: true, className: 'orca-map-tooltip' }
      );

      circle.addTo(chlorophyllLayerGroupRef.current!);
    });
  }, [analysis, layers.chlorophyll, layerOpacity, location]);

  // Geolocation Handler
  const handleUseMyLocation = () => {
    setGeoError(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = clampLatitude(pos.coords.latitude);
          const userLon = normalizeLongitude(pos.coords.longitude);

          if (userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
            setGeoError('Device returned invalid geographic coordinates.');
            return;
          }

          const userCoord: Coordinates = {
            latitude: userLat,
            longitude: userLon,
            name: `Device Location (${formatCoordinates({ latitude: userLat, longitude: userLon }).fullText})`,
            isMarine: true
          };

          onLocationSelect(userCoord);
          onAnalyze(userCoord);
        },
        (err) => {
          setGeoError(`Location permission denied (${err.message}). You can select points manually.`);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setGeoError('Geolocation is not supported by your browser.');
    }
  };

  const handleCenterMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([clampLatitude(location.latitude), normalizeLongitude(location.longitude)], 10, {
        animate: true
      });
    }
  };

  const formattedCoord = formatCoordinates(location);

  return (
    <div className="map-workspace-root">
      {/* Marine Point Header (Section 15) */}
      <div className="map-header-bar">
        <div className="marine-point-info">
          <span className="eyebrow-tag">MARINE AREA</span>
          <h1 className="location-heading">{location.name ?? 'Selected Marine Operating Area'}</h1>
          <div className="coord-subtitle">
            <span className="coord-chip-lat">{formattedCoord.latText}</span>
            <span className="coord-chip-lon">{formattedCoord.lonText}</span>
            <span className="dot-divider">·</span>
            <span className="depth-tag">Arabian Sea / Continental Shelf</span>
            <span className="dot-divider">·</span>
            <span className="datum-tag">WGS-84</span>
          </div>
        </div>

        <div className="map-header-actions">
          <button
            className="orca-btn-secondary"
            onClick={handleUseMyLocation}
            title="Locate via device GPS"
          >
            <LocateFixed size={15} />
            <span>{t('useMyLocation', language)}</span>
          </button>

          {onSaveSnapshot && (
            <button
              className="orca-btn-secondary"
              onClick={onSaveSnapshot}
              title="Save current decision snapshot"
            >
              <Camera size={15} />
              <span>Save Snapshot</span>
            </button>
          )}

          <button
            className="orca-btn-primary"
            onClick={() => onAnalyze()}
            disabled={isAnalyzing}
          >
            <Compass size={16} className={isAnalyzing ? 'spin-icon' : ''} />
            <span>{isAnalyzing ? t('analyzing', language) : 'Analyze Area'}</span>
          </button>
        </div>
      </div>

      {/* Geospatial Error Alert Banner */}
      {geoError && (
        <div className="geo-error-banner">
          <AlertTriangle size={15} />
          <span>{geoError}</span>
          <button className="clear-btn" onClick={() => setGeoError(null)}>×</button>
        </div>
      )}

      {/* Map Configuration Required Banner (Section 2) */}
      {googleKeyMissing && (
        <div className="map-config-required-banner">
          <Info size={15} />
          <div>
            <strong>MAP CONFIGURATION REQUIRED:</strong>
            <span> Google Maps API key (GOOGLE_MAPS_API_KEY) not set in environment. Switched to high-resolution open cartography.</span>
          </div>
          <button className="btn-link" onClick={() => setMapProvider('ocean')}>Dismiss</button>
        </div>
      )}

      <div className="map-canvas-wrapper">
        <div ref={mapContainerRef} className="leaflet-map-canvas" />

        {/* Floating map controls */}
        <div className="map-floating-controls">
          <button
            className="map-ctrl-btn"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Zoom in"
          >
            +
          </button>
          <button
            className="map-ctrl-btn"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Zoom out"
          >
            −
          </button>
          <button className="map-ctrl-btn" onClick={handleCenterMap} title="Recenter location">
            <Crosshair size={16} />
          </button>
        </div>

        {/* Floating Map Style Selector */}
        <div className="map-style-selector-pill">
          <MapIcon size={13} />
          <select
            value={mapProvider}
            onChange={(e) => setMapProvider(e.target.value as MapProviderType)}
            title="Select Cartographic Tile Provider"
          >
            <option value="ocean">🌊 ArcGIS World Ocean (Marine)</option>
            <option value="satellite">🛰️ Satellite Imagery (High Res)</option>
            <option value="osm">🗺️ OpenStreetMap Maritime</option>
            <option value="light">◻️ Light Scientific Canvas</option>
            <option value="google">Google Maps (Satellite / Road)</option>
          </select>
        </div>

        {/* Floating Operational Layers Trigger Button */}
        <div className="map-layer-trigger-container">
          <button
            className={`layers-drawer-toggle-btn ${layerPanelOpen ? 'active' : ''}`}
            onClick={() => setLayerPanelOpen((prev) => !prev)}
            title="Configure Operational Layers"
          >
            <Layers3 size={15} />
            <span>OPERATIONAL LAYERS</span>
            <span className="layer-count-badge">
              {Object.values(layers).filter(Boolean).length}
            </span>
          </button>
        </div>

        {/* Drawer for Operational Layers */}
        {layerPanelOpen && (
          <div className="floating-layers-drawer">
            <OperationalLayersPanel
              layers={layers}
              onToggleLayer={onToggleLayer}
              onSetAllLayers={onSetAllLayers}
              opacity={layerOpacity}
              onOpacityChange={setLayerOpacity}
              onClose={() => setLayerPanelOpen(false)}
              language={language}
            />
          </div>
        )}

        {/* Marine coordinate crosshair HUD (Section 1: Strict valid coordinates only) */}
        <div className="map-hud-coordinates">
          <span>LAT: {formattedCoord.latText}</span>
          <span>LON: {formattedCoord.lonText}</span>
          <span className="hud-datum">DATUM: WGS-84</span>
        </div>
      </div>
    </div>
  );
};

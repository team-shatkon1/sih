import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CandidateZone,
  Coordinates,
  DecisionSnapshot,
  FullAnalysisBundle,
  RegionReport,
  ThemeMode,
  UIAction,
  UserRole
} from '../types/orca.js';
import { SupportedLanguage } from '../i18n/translations.js';
import { OfflineService } from '../services/offlineService.js';
import { clampLatitude, normalizeLongitude, validateAndClampCoordinates } from '../utils/geoUtils.js';
import { ExtendedLayerState } from '../components/OperationalLayersPanel.js';
import { AuthService, UserProfile } from '../services/firebase.js';

export const DEFAULT_LOCATION: Coordinates = {
  latitude: 15.2993,
  longitude: 73.8000,
  name: 'Goa Coastal Waters, Arabian Sea',
  isMarine: true
};

export const DEFAULT_LAYERS: ExtendedLayerState = {
  sst: false,
  chlorophyll: false,
  waves: true,
  waveDirection: false,
  wavePeriod: false,
  swell: false,
  wind: false,
  current: false,
  precipitation: false,
  zones: true,
  suitability: false,
  risk: false,
  confidence: false,
  evidenceDensity: false,
  changeRadar: false,
  geofences: true,
  hazards: true,
  alerts: true,
  sanctuaries: false,
  maritimeBoundaries: false,
  ports: false,
  coastline: true,
  satellite: false,
  satelliteLabels: false,
  terrain: false,
  bathymetry: false
};

export function useOrcaState() {
  const [location, setLocationState] = useState<Coordinates>(DEFAULT_LOCATION);
  const [analysis, setAnalysis] = useState<FullAnalysisBundle | null>(null);
  const [selectedZone, setSelectedZone] = useState<CandidateZone | null>(null);
  const [layers, setLayers] = useState<ExtendedLayerState>(DEFAULT_LAYERS);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => AuthService.getCurrentProfile());
  const [role, setRoleState] = useState<UserRole>(() => AuthService.getCurrentProfile().role as UserRole);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [gatedNotice, setGatedNotice] = useState<string | null>(null);

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    const updated = AuthService.switchRole(newRole as any);
    setUserProfile(updated);
  }, []);

  const handleAuthSuccess = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    setRoleState(profile.role as UserRole);
    setGatedNotice(null);
  }, []);

  const requireAuth = useCallback((feature: 'SCENARIO_LAB' | 'SUBMIT_REPORT' | 'EXPORT_SNAPSHOT' | 'BROADCAST_ALERT', reason: string): boolean => {
    const isAllowed = AuthService.isFeatureAllowed(userProfile.role as any, feature);
    if (!isAllowed) {
      setGatedNotice(reason);
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  }, [userProfile.role]);

  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [activeTab, setActiveTab] = useState<string>('EXPLORE');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Select any coastal point on the map or search to retrieve live intelligence.');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [snapshots, setSnapshots] = useState<DecisionSnapshot[]>([]);
  const [reports, setReports] = useState<RegionReport[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);

  // Auto-refresh architecture (Section 7)
  const [refreshInterval, setRefreshInterval] = useState<number>(300); // Default 5 min
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [missionTrace, setMissionTrace] = useState<string[]>([
    'ORCA Marine Intelligence Subsystem Initialized',
    'Open-Meteo Marine & Weather Providers Ready',
    'Deterministic Risk & Suitability Engine Armed'
  ]);

  // Strict coordinate setter
  const setLocation = useCallback((coord: Coordinates) => {
    const clamped = validateAndClampCoordinates(coord);
    setLocationState(clamped);
  }, []);

  // Theme switcher
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  // Initial theme setup
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
  }, []);

  // Fetch Community Region Reports
  const refreshReports = useCallback(async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.success && data.data) {
        setReports(data.data);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Network & initial data listener
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setStatusMessage('Connection restored. Processing offline sync queue…');
      const synced = await OfflineService.processSyncQueue();
      if (synced > 0) {
        setStatusMessage(`Connection restored. Synchronized ${synced} queued actions.`);
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      setStatusMessage('Offline mode active. Displaying cached environmental observations.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for cached analysis if offline
    if (!navigator.onLine) {
      OfflineService.getCachedLatestAnalysis().then((cached) => {
        if (cached) {
          setAnalysis(cached);
          setLocation(cached.location);
          setStatusMessage('Loaded cached marine observations from IndexedDB.');
        }
      });
    }

    // Load saved snapshots
    fetch('/api/snapshots')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) setSnapshots(res.data);
      })
      .catch(() => {
        OfflineService.getOfflineSnapshots().then(setSnapshots);
      });

    // Load community reports
    refreshReports();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setLocation, refreshReports]);

  // Global keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Run full analysis with AbortController deduplication (Section 7)
  const runAnalysis = useCallback(async (targetCoord?: Coordinates) => {
    const coord = targetCoord ?? location;
    const validCoord = validateAndClampCoordinates(coord);

    // Cancel pending request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsAnalyzing(true);
    setErrorMessage(null);
    setStatusMessage('Querying live marine buoy & atmospheric models…');

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCoord),
        signal: abortControllerRef.current.signal
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to retrieve marine observations');
      }

      const bundle = data.data as FullAnalysisBundle;
      setAnalysis(bundle);
      setLocationState(bundle.location);
      if (bundle.candidateZones?.length > 0) {
        setSelectedZone(bundle.candidateZones[0]);
      }
      const now = new Date();
      setLastUpdated(now);
      if (refreshInterval > 0) {
        setNextUpdate(new Date(now.getTime() + refreshInterval * 1000));
      }

      setStatusMessage('Live observations normalized. Risk and suitability calculated deterministically.');
      setMissionTrace(prev => [
        `Analysis completed for ${bundle.location.name ?? 'Coordinates'} (${bundle.location.latitude.toFixed(3)}°N, ${bundle.location.longitude.toFixed(3)}°E)`,
        `Risk: ${bundle.risk.score}/100 (${bundle.risk.label}) | Suitability: ${bundle.suitability.score}/100 (${bundle.suitability.label})`,
        ...prev.slice(0, 10)
      ]);

      // Cache to IndexedDB
      OfflineService.cacheAnalysis(bundle);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Analysis service temporarily unavailable';
      setErrorMessage(msg);
      setStatusMessage(`Notice: ${msg}`);
      // Fallback to cached analysis if present
      const cached = await OfflineService.getCachedLatestAnalysis();
      if (cached) {
        setAnalysis(cached);
        setStatusMessage('Provider unreachable; displaying latest cached observation.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [location, refreshInterval]);

  // Real-time Auto-refresh timer (Section 7)
  useEffect(() => {
    if (refreshInterval <= 0) {
      setNextUpdate(null);
      return;
    }

    const timer = setInterval(() => {
      runAnalysis();
    }, refreshInterval * 1000);

    return () => clearInterval(timer);
  }, [refreshInterval, runAnalysis]);

  // Apply UI actions returned by Gemini or AI Console
  const applyUIAction = useCallback((action: UIAction) => {
    switch (action.type) {
      case 'ENABLE_LAYER':
        if (action.layer) {
          setLayers(prev => ({ ...prev, [action.layer!]: true }));
          setStatusMessage(`Map Layer Enabled: ${action.layer}`);
        }
        break;
      case 'DISABLE_LAYER':
        if (action.layer) {
          setLayers(prev => ({ ...prev, [action.layer!]: false }));
          setStatusMessage(`Map Layer Disabled: ${action.layer}`);
        }
        break;
      case 'FOCUS_ZONE':
      case 'SELECT_ZONE':
        if (action.zoneId && analysis?.candidateZones) {
          const found = analysis.candidateZones.find(z => z.id === action.zoneId || z.code.toLowerCase() === action.zoneId?.toLowerCase());
          if (found) {
            setSelectedZone(found);
            setActiveTab('CANDIDATE_ZONES');
            setStatusMessage(`Focused Candidate Zone: ${found.name}`);
          }
        }
        break;
      case 'SET_LOCATION':
        if (action.location) {
          setLocation(action.location);
          runAnalysis(action.location);
        }
        break;
      case 'OPEN_COMPARISON':
        setActiveTab('CANDIDATE_ZONES');
        break;
      case 'OPEN_EVIDENCE':
        setActiveTab('EVIDENCE');
        break;
      case 'SHOW_CHANGE':
        setActiveTab('TIMELINE');
        break;
      case 'RUN_ANALYSIS':
        runAnalysis();
        break;
      case 'RUN_SCENARIO':
        setActiveTab('SCENARIO');
        break;
      case 'SHOW_ROUTE':
        setActiveTab('ROUTES');
        break;
      case 'SWITCH_ROLE':
        if (action.role) setRole(action.role);
        break;
      case 'SELECT_TAB':
        if (action.tab) setActiveTab(action.tab);
        break;
    }
  }, [analysis, runAnalysis, setLocation]);

  return {
    location,
    setLocation,
    analysis,
    setAnalysis,
    selectedZone,
    setSelectedZone,
    layers,
    setLayers,
    toggleLayer: (layerName: keyof ExtendedLayerState) =>
      setLayers(prev => ({ ...prev, [layerName]: !prev[layerName] })),
    setAllLayers: (enable: boolean) => {
      const updated = { ...layers };
      (Object.keys(updated) as Array<keyof ExtendedLayerState>).forEach(k => {
        updated[k] = enable;
      });
      setLayers(updated);
    },
    role,
    setRole,
    userProfile,
    setUserProfile,
    isAuthModalOpen,
    setIsAuthModalOpen,
    gatedNotice,
    setGatedNotice,
    handleAuthSuccess,
    requireAuth,
    language,
    setLanguage,
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    isAnalyzing,
    runAnalysis,
    statusMessage,
    setStatusMessage,
    errorMessage,
    setErrorMessage,
    isOffline,
    snapshots,
    setSnapshots,
    reports,
    refreshReports,
    refreshInterval,
    setRefreshInterval,
    lastUpdated,
    nextUpdate,
    commandPaletteOpen,
    setCommandPaletteOpen,
    missionTrace,
    addMissionTrace: (item: string) => setMissionTrace(prev => [item, ...prev.slice(0, 15)]),
    applyUIAction
  };
}

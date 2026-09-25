import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  Bell,
  Bot,
  Camera,
  ChevronRight,
  CircleHelp,
  Clock,
  CloudSun,
  Compass,
  Crosshair,
  Database,
  ExternalLink,
  Layers3,
  LocateFixed,
  Map as MapIcon,
  Menu,
  MoreHorizontal,
  Navigation,
  Play,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Waves,
  Wind,
  FileText,
  Cpu,
  Fish
} from 'lucide-react';

import './styles.css';
import { SupportedLanguage, t } from './i18n/translations.js';
import { useOrcaState } from './state/orcaStore.js';
import { MapWorkspace } from './components/MapWorkspace.js';
import { MarineSituationPanel } from './components/MarineSituationPanel.js';
import { MarineFingerprint } from './components/MarineFingerprint.js';
import { DataTrustPassport } from './components/DataTrustPassport.js';
import { CandidateZonesPanel } from './components/CandidateZonesPanel.js';
import { TimelineChangeRadar } from './components/TimelineChangeRadar.js';
import { EvidenceGraphModal } from './components/EvidenceGraphModal.js';
import { ScenarioLabModal } from './components/ScenarioLabModal.js';
import { RouteRiskInspector } from './components/RouteRiskInspector.js';
import { RegionReportsModal } from './components/RegionReportsModal.js';
import { AIConsole } from './components/AIConsole.js';
import { CommandPalette } from './components/CommandPalette.js';
import { DecisionSnapshotModal } from './components/DecisionSnapshotModal.js';
import { SystemStatusModal } from './components/SystemStatusModal.js';
import { DemoMissionRunner } from './components/DemoMissionRunner.js';
import { AuthModal } from './components/AuthModal.js';
import { GeminiVoiceAssistant } from './components/GeminiVoiceAssistant.js';
import { DigitalTwinModal } from './components/DigitalTwinModal.js';
import { KoliFishermanHub } from './components/KoliFishermanHub.js';
import { LocalKnowledgeModal } from './components/LocalKnowledgeModal.js';
import { ToolsModal } from './components/ToolsModal.js';
import { Coordinates, UserRole } from './types/orca.js';

function OrcaApp() {
  const {
    location,
    setLocation,
    analysis,
    setAnalysis,
    selectedZone,
    setSelectedZone,
    layers,
    setLayers,
    toggleLayer,
    setAllLayers,
    role,
    setRole,
    userProfile,
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
    errorMessage,
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
    applyUIAction
  } = useOrcaState();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showGeminiLive, setShowGeminiLive] = useState(false);
  const [showDigitalTwinModal, setShowDigitalTwinModal] = useState(false);
  const [showLocalKnowledgeModal, setShowLocalKnowledgeModal] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Initial load: trigger analysis for default location if not yet analyzed
  useEffect(() => {
    if (!analysis) {
      runAnalysis(location);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const res = await fetch('/api/locations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      if (data.success && data.results?.length > 0) {
        const found = data.results[0];
        const newCoord: Coordinates = {
          latitude: found.latitude,
          longitude: found.longitude,
          name: found.name,
          isMarine: true
        };
        setLocation(newCoord);
        runAnalysis(newCoord);
      }
    } catch {
      // Ignore
    } finally {
      setIsSearching(false);
    }
  };

  // Determine if user has a verified non-guest Google sign-in
  const isGoogleAuthenticated = Boolean(
    userProfile && !userProfile.isAnonymous && userProfile.role !== 'GUEST'
  );

  // Require Google Sign-In for AI Chat and AI Voice Assistant
  const requireGoogleAuthForAI = (actionName: string): boolean => {
    if (!isGoogleAuthenticated) {
      setGatedNotice(
        `⚠️ Google साइन इन आवश्यक: ${actionName} वापरण्यासाठी कृपया Google ने साइन इन करा (Please sign in with Google to access ${actionName}).`
      );
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  // Require Researcher role for Advanced Lab
  const requireResearcherRole = (toolName: string): boolean => {
    const isResearcher = isGoogleAuthenticated && (role === 'RESEARCHER' || role === 'ADMIN');
    if (!isResearcher) {
      setGatedNotice(
        `🔬 फक्त संशोधकांसाठी (RESEARCHERS ONLY): ${toolName} हे साधन प्रगत संशोधक खात्यासाठी राखीव आहे. कृपया Researcher म्हणून Google साइन इन करा.`
      );
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  const handleOpenGeminiVoice = () => {
    if (requireGoogleAuthForAI('Gemini Live Voice Assistant')) {
      setShowGeminiLive(true);
    }
  };

  const handleToggleAIChat = () => {
    if (!isChatOpen) {
      if (!requireGoogleAuthForAI('Ask ORCA AI Console')) return;
    }
    setIsChatOpen((prev) => !prev);
  };

  const handleNavClick = (tabKey: string) => {
    if (tabKey === 'AI_ASSISTANT') {
      if (!requireGoogleAuthForAI('AI चॅट असिस्टंट (Ask ORCA)')) return;
    }
    setActiveTab(tabKey);
  };

  // Primary Core Navigation (Clean, Focused, Uncluttered)
  const primaryNavItems = [
    { key: 'EXPLORE', label: 'EXPLORE MAP', icon: MapIcon },
    { key: 'KOLI_HUB', label: '🐟 कोळी बांधव केंद्र', icon: Fish },
    { key: 'CANDIDATE_ZONES', label: 'FISHING ZONES (PFZ)', icon: Layers3 },
    { key: 'ROUTES', label: 'ROUTES & WEATHER', icon: Navigation },
    { key: 'AI_ASSISTANT', label: 'AI ASSISTANT', icon: Bot }
  ];

  // Secondary Research Tools (FOR RESEARCHERS ONLY)
  const advancedLabTools = [
    {
      key: 'DIGITAL_TWIN',
      label: 'Digital Twin 2.0',
      icon: Cpu,
      action: () => {
        if (requireResearcherRole('Digital Twin 2.0')) {
          setShowDigitalTwinModal(true);
        }
      }
    },
    {
      key: 'EVIDENCE',
      label: 'Evidence DAG',
      icon: Database,
      action: () => {
        if (requireResearcherRole('Evidence DAG')) {
          setShowEvidenceModal(true);
        }
      }
    },
    {
      key: 'SCENARIO',
      label: 'Scenario Lab',
      icon: Sparkles,
      action: () => {
        if (requireResearcherRole('Scenario Lab')) {
          setShowScenarioModal(true);
        }
      }
    },
    {
      key: 'REPORTS',
      label: 'Region Reports',
      icon: FileText,
      action: () => {
        if (requireResearcherRole('Region Reports')) {
          setShowReportsModal(true);
        }
      }
    }
  ];

  return (
    <div className="app-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-section" onClick={() => setActiveTab('EXPLORE')}>
          <img src="/orca-icon.jpeg" alt="ORCA Marine Logo" className="brand-orca-logo" />
          <div className="brand-text-wrap">
            <span className="brand-text">{t('appTitle', language)}</span>
            <span className="brand-sub">NATIONAL MARINE INTELLIGENCE</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <form className="global-search-form" onSubmit={handleSearch}>
          <Search size={15} />
          <input
            type="text"
            placeholder={t('searchPlaceholder', language)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">{isSearching ? t('searching', language) : t('search', language)}</button>
        </form>

        {/* Operational Controls & Status (Streamlined & Clean) */}
        <div className="top-actions-group">
          {/* Quick Fisherman & Koli Community Mode Toggle */}
          <button
            className={`koli-fisher-topbar-btn ${role === 'FISHERMAN' || activeTab === 'KOLI_HUB' ? 'active-mode' : ''}`}
            onClick={() => {
              if (role !== 'FISHERMAN') {
                setRole('FISHERMAN');
                if (language === 'en') {
                  setLanguage('mr');
                }
                setActiveTab('KOLI_HUB');
              } else {
                if (activeTab === 'KOLI_HUB') {
                  setActiveTab('EXPLORE');
                } else {
                  setActiveTab('KOLI_HUB');
                }
              }
            }}
            title="कोळी बांधव व मच्छिमार मोड (Fisherman & Koli Community Mode)"
          >
            <Fish size={14} className="koli-btn-icon" />
            <span>कोळी बांधव केंद्र</span>
            {(role === 'FISHERMAN' || activeTab === 'KOLI_HUB') && <span className="koli-active-dot" />}
          </button>

          {/* Gemini Live Voice Assistant Trigger */}
          <button
            className="gemini-live-topbar-btn"
            onClick={handleOpenGeminiVoice}
            title="Launch Google Gemini Live Voice Assistant"
          >
            <Sparkles size={14} className="spark-spin" />
            <span>Gemini Voice</span>
          </button>

          {/* Regional Language selector */}
          <div className="lang-selector-pill">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              title="Switch Regional Language"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी</option>
            </select>
          </div>

          {/* Tools & Settings Menu Modal Launcher */}
          <button
            className="topbar-tools-pill"
            onClick={() => setShowToolsModal(true)}
            title="Operational Tools & Settings (Theme, Auto-Refresh, Snapshots, Status)"
          >
            <Settings size={14} />
            <span>साधने (Tools)</span>
          </button>

          {/* User Profile / Firebase Auth Pill */}
          <button
            className="topbar-user-pill"
            onClick={() => setIsAuthModalOpen(true)}
            title="Account & Role Settings"
          >
            <span className={`user-role-badge ${role.toLowerCase()}`}>
              {role === 'GUEST' ? 'GUEST' : role}
            </span>
            <span className="user-name-text">
              {userProfile.displayName || 'Guest'}
            </span>
          </button>

          {/* Live / Offline mode indicator */}
          <div className={`live-data-badge ${isOffline ? 'offline' : ''}`}>
            <span className="live-dot" />
            <span>{isOffline ? 'OFFLINE' : 'LIVE'}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="workspace-grid">
        {/* Sidebar Nav */}
        <aside className="workspace-sidebar">
          <div>
            <span className="sidebar-nav-title">
              {language === 'mr' ? 'मुख्य विभाग' : 'MAIN DOMAINS'}
            </span>
            <div className="nav-buttons-list">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    className={`nav-item-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.key)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Systematic Secondary Section for Advanced Research Tools */}
            <div className="advanced-tools-subnav" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '6px', marginBottom: '4px' }}>
                <span className="sidebar-nav-title" style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                  {language === 'mr' ? 'प्रगत संशोधन साधने' : 'ADVANCED LAB'}
                </span>
                <span style={{ fontSize: '9px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--marine-accent)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                  FOR RESEARCHERS ONLY
                </span>
              </div>
              <div className="nav-buttons-list" style={{ marginTop: '6px' }}>
                {advancedLabTools.map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <button
                      key={tool.key}
                      className="nav-item-btn advanced-tool-btn"
                      onClick={tool.action}
                      style={{ fontSize: '12px', padding: '6px 10px', opacity: 0.85 }}
                    >
                      <ToolIcon size={14} />
                      <span>{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hide System Status and COMMANDS (Ctrl+K) for Koli Fishers Hub and Fisherman role */}
          {!(activeTab === 'KOLI_HUB' || role === 'FISHERMAN') && (
            <div className="sidebar-footer-links">
              <button
                className="nav-item-btn"
                onClick={() => setShowStatusModal(true)}
              >
                <Settings size={16} />
                <span>{t('systemStatus', language)}</span>
              </button>
              <button
                className="nav-item-btn"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <CircleHelp size={16} />
                <span>COMMANDS (<kbd>Ctrl+K</kbd>)</span>
              </button>
            </div>
          )}
        </aside>

        {/* Center Workspace (Interactive Map or Active Domain View) */}
        <main className="map-workspace-root">
          {activeTab === 'KOLI_HUB' ? (
            <KoliFishermanHub
              location={location}
              analysis={analysis}
              language={language}
              onSelectZone={(zone) => setSelectedZone(zone)}
              onOpenMap={() => setActiveTab('EXPLORE')}
              onOpenLocalKnowledge={() => setShowLocalKnowledgeModal(true)}
              onOpenVoiceAssistant={handleOpenGeminiVoice}
              onRefresh={() => runAnalysis(location)}
              isAnalyzing={isAnalyzing}
            />
          ) : activeTab === 'EXPLORE' || activeTab === 'ANALYSIS' ? (
            <MapWorkspace
              location={location}
              onLocationSelect={(coord) => setLocation(coord)}
              onAnalyze={(coord) => runAnalysis(coord ?? location)}
              analysis={analysis}
              selectedZone={selectedZone}
              onZoneSelect={(zone) => setSelectedZone(zone)}
              layers={layers}
              onToggleLayer={toggleLayer}
              onSetAllLayers={setAllLayers}
              isAnalyzing={isAnalyzing}
              language={language}
              onSaveSnapshot={() => setShowSnapshotModal(true)}
              reports={reports}
            />
          ) : activeTab === 'CANDIDATE_ZONES' && analysis ? (
            <CandidateZonesPanel
              zones={analysis.candidateZones}
              selectedZone={selectedZone}
              onSelectZone={(z) => setSelectedZone(z)}
              language={language}
            />
          ) : activeTab === 'TIMELINE' && analysis ? (
            <TimelineChangeRadar
              changeRadar={analysis.changeRadar}
              timeline={analysis.timeline}
              riskClock={analysis.riskClock}
              language={language}
            />
          ) : activeTab === 'ROUTES' ? (
            <RouteRiskInspector
              currentLocation={location}
              language={language}
            />
          ) : activeTab === 'AI_ASSISTANT' ? (
            <AIConsole
              location={location}
              analysis={analysis}
              onApplyAction={applyUIAction}
              language={language}
            />
          ) : (
            <MapWorkspace
              location={location}
              onLocationSelect={(coord) => setLocation(coord)}
              onAnalyze={(coord) => runAnalysis(coord ?? location)}
              analysis={analysis}
              selectedZone={selectedZone}
              onZoneSelect={(zone) => setSelectedZone(zone)}
              layers={layers}
              onToggleLayer={toggleLayer}
              onSetAllLayers={setAllLayers}
              isAnalyzing={isAnalyzing}
              language={language}
              onSaveSnapshot={() => setShowSnapshotModal(true)}
              reports={reports}
            />
          )}
        </main>

        {/* Right Marine Intelligence Rail (Simplified, Modular, No Multi-Scroll) */}
        <aside className="intelligence-panel-rail">
          <MarineSituationPanel
            analysis={analysis}
            onRefresh={() => runAnalysis(location)}
            isAnalyzing={isAnalyzing}
            language={language}
            onSelectVariable={(varKey) => {
              if (varKey === 'waves') toggleLayer('waves');
              if (varKey === 'current') toggleLayer('current');
              if (varKey === 'wind') toggleLayer('wind');
              if (varKey === 'sst') toggleLayer('sst');
              if (varKey === 'chlorophyll') toggleLayer('chlorophyll');
            }}
            onShowEvidenceModal={() => setShowEvidenceModal(true)}
          />
        </aside>
      </div>

      {/* Bottom Status Rail */}
      <footer className="bottom-rail">
        <div className="rail-status-pill">
          <Radio size={14} className={isAnalyzing ? 'spin-icon' : ''} />
          <span>{statusMessage}</span>
          {errorMessage && <span className="text-danger">({errorMessage})</span>}
          {lastUpdated && (
            <span className="last-sync-tag">
              Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>

        <div className="rail-right-actions">
          <button
            className="floating-gemini-voice-btn"
            onClick={handleOpenGeminiVoice}
            title="Launch Google Gemini Live Voice Assistant"
          >
            <Sparkles size={15} className="spark-spin" />
            <span>Gemini Voice</span>
          </button>
          <button
            className="floating-ai-btn"
            onClick={handleToggleAIChat}
            title="Chat with ORCA Intelligence Console"
          >
            <Bot size={15} />
            <span>Ask ORCA Console</span>
          </button>
          {!(activeTab === 'KOLI_HUB' || role === 'FISHERMAN') && (
            <button
              className="command-palette-trigger"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <span>COMMANDS</span>
              <kbd>Ctrl+K</kbd>
            </button>
          )}
        </div>
      </footer>

      {/* Floating AI Assistant Drawer */}
      {isChatOpen && (
        <div className="floating-ai-drawer">
          <AIConsole
            location={location}
            analysis={analysis}
            onApplyAction={applyUIAction}
            language={language}
            isFloating={true}
            onClose={() => setIsChatOpen(false)}
            onOpenGeminiLive={handleOpenGeminiVoice}
          />
        </div>
      )}

      {/* Google Gemini Live Voice Assistant */}
      <GeminiVoiceAssistant
        isOpen={showGeminiLive}
        onClose={() => setShowGeminiLive(false)}
        location={location}
        analysis={analysis}
        onApplyAction={applyUIAction}
        initialLanguage={language}
      />

      {/* Community Region Reports Modal */}
      {showReportsModal && (
        <RegionReportsModal
          currentLocation={location}
          userRole={role}
          onClose={() => setShowReportsModal(false)}
          onSelectReportOnMap={(coord) => {
            setLocation(coord);
            setActiveTab('EXPLORE');
          }}
          language={language}
        />
      )}

      {/* Evidence Graph Modal */}
      {showEvidenceModal && analysis && (
        <EvidenceGraphModal
          graph={analysis.evidenceGraph}
          onClose={() => setShowEvidenceModal(false)}
          language={language}
        />
      )}

      {/* Scenario Lab Modal */}
      {showScenarioModal && analysis && (
        <ScenarioLabModal
          analysis={analysis}
          onClose={() => setShowScenarioModal(false)}
          language={language}
        />
      )}

      {/* Decision Snapshots Modal */}
      {showSnapshotModal && analysis && (
        <DecisionSnapshotModal
          analysis={analysis}
          role={role}
          snapshots={snapshots}
          onSnapshotSaved={(s) => setSnapshots((prev) => [s, ...prev])}
          onClose={() => setShowSnapshotModal(false)}
          language={language}
        />
      )}

      {/* System Status Modal */}
      {showStatusModal && (
        <SystemStatusModal
          onClose={() => setShowStatusModal(false)}
          language={language}
        />
      )}

      {/* ORCA Autonomous Marine Digital Twin 2.0 Modal */}
      <DigitalTwinModal
        isOpen={showDigitalTwinModal}
        onClose={() => setShowDigitalTwinModal(false)}
        location={location}
        analysis={analysis}
      />

      {/* Demo Mission Runner Modal */}
      {showDemoModal && (
        <DemoMissionRunner
          onRunAnalysis={async (coord) => {
            setLocation(coord);
            await runAnalysis(coord);
          }}
          onSelectTab={(tab) => setActiveTab(tab)}
          onToggleLayer={(l) => toggleLayer(l as any)}
          onClose={() => setShowDemoModal(false)}
          language={language}
        />
      )}

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onRunAnalysis={() => runAnalysis(location)}
        onToggleLayer={(l) => toggleLayer(l as any)}
        onSelectTab={(tab) => {
          if (tab === 'DIGITAL_TWIN') {
            if (requireResearcherRole('Digital Twin 2.0')) setShowDigitalTwinModal(true);
          } else if (tab === 'REPORTS') {
            if (requireResearcherRole('Region Reports')) setShowReportsModal(true);
          } else if (tab === 'EVIDENCE') {
            if (requireResearcherRole('Evidence DAG')) setShowEvidenceModal(true);
          } else if (tab === 'SCENARIO') {
            if (requireResearcherRole('Scenario Lab')) setShowScenarioModal(true);
          } else if (tab === 'AI_ASSISTANT') {
            if (requireGoogleAuthForAI('AI Assistant')) setActiveTab('AI_ASSISTANT');
          } else {
            setActiveTab(tab);
          }
        }}
        onSaveSnapshot={() => {
          if (requireAuth('EXPORT_SNAPSHOT', 'Exporting hydrographic decision snapshots requires an account.')) {
            setShowSnapshotModal(true);
          }
        }}
        onSwitchRole={(r) => setRole(r)}
        onSwitchLanguage={(l) => setLanguage(l)}
        language={language}
      />

      {/* Firebase OAuth & Role-Based Sign-On Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        gatedFeatureNotice={gatedNotice}
      />

      {/* Local Fisher & Koli Community Knowledge Modal */}
      <LocalKnowledgeModal
        isOpen={showLocalKnowledgeModal}
        onClose={() => setShowLocalKnowledgeModal(false)}
        location={location}
        analysis={analysis}
      />

      {/* Clean Tools & Operational Settings Modal */}
      <ToolsModal
        isOpen={showToolsModal}
        onClose={() => setShowToolsModal(false)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        refreshInterval={refreshInterval}
        onSetRefreshInterval={setRefreshInterval}
        onOpenSnapshot={() => {
          if (requireAuth('EXPORT_SNAPSHOT', 'Exporting decision snapshots requires an account.')) {
            setShowSnapshotModal(true);
          }
        }}
        onOpenDigitalTwin={() => {
          if (requireResearcherRole('Digital Twin 2.0')) setShowDigitalTwinModal(true);
        }}
        onOpenReports={() => {
          if (requireResearcherRole('Region Reports')) setShowReportsModal(true);
        }}
        onOpenSystemStatus={() => setShowStatusModal(true)}
        onOpenDemoMission={() => setShowDemoModal(true)}
        language={language}
      />
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<OrcaApp />);
}

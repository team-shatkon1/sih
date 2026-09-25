import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertTriangle,
  History,
  ThumbsUp,
  MapPin,
  Calendar,
  Compass,
  Fish,
  Waves,
  Shield,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  Coordinates,
  LocalKnowledgeObservation,
  EvidenceAlignmentResult,
  CommunityKnowledgeHistory,
  FullAnalysisBundle
} from '../types/orca.js';

interface LocalKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Coordinates;
  analysis: FullAnalysisBundle | null;
}

export const LocalKnowledgeModal: React.FC<LocalKnowledgeModalProps> = ({
  isOpen,
  onClose,
  location,
  analysis
}) => {
  const [activeTab, setActiveTab] = useState<'ALIGNMENT' | 'SUBMIT' | 'HISTORY' | 'FEED'>('ALIGNMENT');
  const [observations, setObservations] = useState<LocalKnowledgeObservation[]>([]);
  const [alignment, setAlignment] = useState<EvidenceAlignmentResult | null>(null);
  const [history, setHistory] = useState<CommunityKnowledgeHistory | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Submission Form State
  const [observationText, setObservationText] = useState<string>('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [selectedSeaCondition, setSelectedSeaCondition] = useState<string>('');
  const [selectedProductivity, setSelectedProductivity] = useState<'LOW' | 'MODERATE' | 'HIGH'>('HIGH');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      fetchObservations();
      fetchHistory();
    }
  }, [isOpen, location.latitude, location.longitude]);

  // Re-calculate alignment when observations or analysis change
  useEffect(() => {
    if (isOpen) {
      calculateAlignment();
    }
  }, [isOpen, observations, analysis]);

  const fetchObservations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/marine/local-knowledge?latitude=${location.latitude}&longitude=${location.longitude}&radiusKm=60`);
      const data = await res.json();
      if (data.success && data.data) {
        setObservations(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch local knowledge:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/marine/local-knowledge/history?latitude=${location.latitude}&longitude=${location.longitude}`);
      const data = await res.json();
      if (data.success && data.data) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const calculateAlignment = async () => {
    const sst = Number(analysis?.observations.find(o => o.key === 'sst')?.value ?? 28.2);
    const chlorophyll = Number(analysis?.observations.find(o => o.key === 'chlorophyll_a')?.value ?? 1.8);
    const waveHeight = Number(analysis?.observations.find(o => o.key === 'wave_height')?.value ?? 1.2);
    const windSpeed = Number(analysis?.observations.find(o => o.key === 'wind_speed')?.value ?? 16.0);
    const suitabilityScore = analysis?.suitability.score ?? 78;

    try {
      const res = await fetch('/api/marine/local-knowledge/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: location,
          scientificData: {
            sst,
            chlorophyll,
            waveHeight,
            windSpeed,
            suitabilityScore
          }
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAlignment(data.data);
      }
    } catch (err) {
      console.error('Failed to compute alignment:', err);
    }
  };

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser. Please type your observation.');
      return;
    }

    if (isVoiceActive) {
      setIsVoiceActive(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'mr-IN'; // Marathi & Indian Coastal recognition
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsVoiceActive(true);
    recognition.onend = () => setIsVoiceActive(false);
    recognition.onerror = () => setIsVoiceActive(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setObservationText(prev => prev ? `${prev} ${transcript}` : transcript);
      setIsVoiceActive(false);
    };

    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observationText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/marine/local-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          observationText,
          speciesOptional: selectedSpecies || undefined,
          seaConditionOptional: selectedSeaCondition || undefined,
          observedProductivity: selectedProductivity,
          contributorType: isAnonymous ? 'ANONYMOUS' : 'FISHER',
          isVoice: isVoiceActive
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
        setObservationText('');
        fetchObservations();
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('FEED');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to submit local observation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="digital-twin-backdrop">
      <div className="digital-twin-modal" style={{ maxWidth: '940px' }}>
        {/* Header */}
        <div className="dt-modal-header">
          <div className="dt-title-cluster">
            <div className="dt-badge" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.4)' }}>
              <Sparkles size={13} />
              <span>COMMUNITY ECOLOGICAL KNOWLEDGE (LEK)</span>
            </div>
            <h2>Fisher & Koli Marine Knowledge Layer</h2>
            <p className="dt-subtitle">
              Heterogeneous fusion: High-resolution satellite Earth observation harmonized with generational coastal ecological intelligence.
            </p>
          </div>
          <button className="dt-close-btn" onClick={onClose} aria-label="Close LEK Console">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="dt-tabs-strip">
          <button
            className={`dt-tab-btn ${activeTab === 'ALIGNMENT' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALIGNMENT')}
          >
            <Shield size={14} />
            <span>Evidence Alignment</span>
          </button>
          <button
            className={`dt-tab-btn ${activeTab === 'SUBMIT' ? 'active' : ''}`}
            onClick={() => setActiveTab('SUBMIT')}
          >
            <Send size={14} />
            <span>Log Local Observation</span>
          </button>
          <button
            className={`dt-tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            <History size={14} />
            <span>Community History Memory</span>
          </button>
          <button
            className={`dt-tab-btn ${activeTab === 'FEED' ? 'active' : ''}`}
            onClick={() => setActiveTab('FEED')}
          >
            <Fish size={14} />
            <span>Nearby Logs ({observations.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="dt-modal-body">
          {/* TAB 1: EVIDENCE ALIGNMENT (SECTION 6) */}
          {activeTab === 'ALIGNMENT' && (
            <div className="lek-alignment-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Top Banner */}
              <div
                className="lek-banner-card"
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: alignment?.hasDisagreement
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(20, 184, 166, 0.08)',
                  border: `1px solid ${alignment?.hasDisagreement ? 'rgba(245, 158, 11, 0.3)' : 'rgba(20, 184, 166, 0.3)'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {alignment?.hasDisagreement ? (
                      <AlertTriangle size={18} className="text-amber" />
                    ) : (
                      <CheckCircle2 size={18} className="text-emerald" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', letterSpacing: '0.04em' }}>
                      {alignment?.hasDisagreement ? '⚠ LOCAL–MODEL DISAGREEMENT DETECTED' : 'ORCA EVIDENCE CONVERGENCE: HIGH'}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: alignment?.hasDisagreement ? '#f59e0b' : '#10b981',
                      color: '#030712'
                    }}
                  >
                    {alignment?.alignment ?? 'MODERATE'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {alignment?.explanation}
                </p>
                {alignment?.respectfulClarification && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#38bdf8', fontStyle: 'italic' }}>
                    💡 Note: {alignment.respectfulClarification}
                  </p>
                )}
              </div>

              {/* 3 Pillars of Evidence */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', marginBottom: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
                    <Compass size={14} />
                    <span>SCIENTIFIC EVIDENCE</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4, margin: 0 }}>
                    {alignment?.scientificSummary ?? 'SST, Chlorophyll, and wave hydrodynamic telemetry indicate nominal conditions.'}
                  </p>
                  <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#64748b' }}>
                    Sources: Copernicus Sentinel-3, Open-Meteo Waves
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(45, 212, 191, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2dd4bf', marginBottom: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
                    <Fish size={14} />
                    <span>LOCAL ECOLOGICAL KNOWLEDGE</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4, margin: 0 }}>
                    {alignment?.localSummary ?? 'Community marine registry confirms active pelagic feeding behavior.'}
                  </p>
                  <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#64748b' }}>
                    Sources: Verified Koli Samaj & Fisher Guild Logs
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', marginBottom: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
                    <Waves size={14} />
                    <span>CURRENT ENVIRONMENT</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    <div>Wave: <strong>{analysis?.observations.find(o => o.key === 'wave_height')?.value ?? '1.2'} m</strong></div>
                    <div>Wind: <strong>{analysis?.observations.find(o => o.key === 'wind_speed')?.value ?? '16.0'} km/h</strong></div>
                    <div>SST: <strong>{analysis?.observations.find(o => o.key === 'sst')?.value ?? '28.3'} °C</strong></div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#64748b' }}>
                    Station: In-Situ Buoy & Live Surface Drift
                  </div>
                </div>
              </div>

              {/* Protocol Principle Callout */}
              <div style={{ padding: '12px 14px', borderRadius: '6px', background: 'rgba(30, 41, 59, 0.4)', borderLeft: '3px solid #38bdf8', fontSize: '0.8rem', color: '#94a3b8' }}>
                <strong style={{ color: '#f1f5f9' }}>ORCA Anti-Override Protocol:</strong> When community observations differ from satellite models, neither is overridden. In-situ fishers observe microscale subsurface aggregations that satellite rasters cannot resolve, while satellite arrays capture regional synoptic risks. Both evidence layers retain independent provenance and confidence ratings.
              </div>
            </div>
          )}

          {/* TAB 2: SUBMIT OBSERVATION (SECTION 5) */}
          {activeTab === 'SUBMIT' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(45, 212, 191, 0.2)', fontSize: '0.82rem', color: '#94a3b8' }}>
                🎙️ <strong>Multi-Language Support:</strong> Submit in Marathi, Hindi, English, Hinglish, or mixed Romanized dialects. (e.g. <em>"Yaha pichle 3 din se surmai ka activity accha hai"</em> or <em>"मालवणजवळ बांगड्यांचे थवे दिसत आहेत"</em>).
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Observation Description (Voice or Text)
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    rows={3}
                    value={observationText}
                    onChange={(e) => setObservationText(e.target.value)}
                    placeholder="Describe sea state, fish behavior, water clarity, or unusual currents..."
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 12px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleVoiceToggle}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '12px',
                      background: isVoiceActive ? '#ef4444' : 'rgba(51, 65, 85, 0.6)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f8fafc',
                      cursor: 'pointer'
                    }}
                    title={isVoiceActive ? 'Stop Recording' : 'Start Voice Input'}
                  >
                    {isVoiceActive ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                </div>
              </div>

              {/* Species Tag Selection (Marathi & English) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  स्थानिक माशांचा प्रकार (Observed Fish Species)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['सुरमई (Surmai)', 'पापलेट (Pomfret)', 'बांगडा (Bangda)', 'कोळंबी (Kolambi)', 'बोंबील (Bombil)', 'हलवा (Black Pomfret)', 'रावस (Rawas)', 'तार्ली (Sardines)'].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSelectedSpecies(selectedSpecies === sp ? '' : sp)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '14px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        border: selectedSpecies === sp ? '1px solid #2dd4bf' : '1px solid rgba(51, 65, 85, 0.6)',
                        background: selectedSpecies === sp ? 'rgba(45, 212, 191, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                        color: selectedSpecies === sp ? '#2dd4bf' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sea Condition & Productivity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Observed Sea Condition
                  </label>
                  <select
                    value={selectedSeaCondition}
                    onChange={(e) => setSelectedSeaCondition(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.82rem'
                    }}
                  >
                    <option value="">Auto-detect from description</option>
                    <option value="Calm / Smooth Sea">Calm / Smooth Sea</option>
                    <option value="Moderate Swell">Moderate Swell</option>
                    <option value="Rough Swell / High Waves">Rough Swell / High Waves</option>
                    <option value="Strong Coastal Current">Strong Coastal Current</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Observed Marine Productivity
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['HIGH', 'MODERATE', 'LOW'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSelectedProductivity(level)}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: selectedProductivity === level ? '1px solid #38bdf8' : '1px solid rgba(51, 65, 85, 0.6)',
                          background: selectedProductivity === level ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                          color: selectedProductivity === level ? '#38bdf8' : '#64748b',
                          cursor: 'pointer'
                        }}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Anonymity Protection Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="anonymousCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <label htmlFor="anonymousCheck" style={{ fontSize: '0.78rem', color: '#94a3b8', cursor: 'pointer' }}>
                  Protect my personal identity (log anonymously as verified Koli / Artisanal Fisher)
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !observationText.trim()}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  background: submitSuccess ? '#10b981' : '#0ea5e9',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  marginTop: '6px'
                }}
              >
                {submitSuccess ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Observation Recorded & Indexed</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Submit Community Observation</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: COMMUNITY KNOWLEDGE HISTORY (SECTION 7) */}
          {activeTab === 'HISTORY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                  Recurring Community Observations (2024 - 2026)
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  {history?.summary ?? 'Recurring community observations establish consistent seasonal autumn pelagic patterns.'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history?.recurringObservations.map((rec) => (
                  <div
                    key={rec.year}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      background: 'rgba(30, 41, 59, 0.4)',
                      border: '1px solid rgba(51, 65, 85, 0.6)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f8fafc' }}>
                          Cycle {rec.year}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                          {rec.season.replace('_', ' ')}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', background: rec.productivityLevel === 'HIGH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: rec.productivityLevel === 'HIGH' ? '#34d399' : '#fbbf24' }}>
                          {rec.productivityLevel} Productivity
                        </span>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
                        Dominant Targets: {rec.dominantSpecies.join(', ')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                        {rec.observationCount}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Community Logs
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                * Trend analysis reflects community observation volume; never presented as guaranteed catch predictions.
              </div>
            </div>
          )}

          {/* TAB 4: NEARBY COMMUNITY FEED */}
          {activeTab === 'FEED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Showing verified observations within 60km of active coordinates
                </span>
                <button
                  onClick={fetchObservations}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <RefreshCw size={12} className={isLoading ? 'spin-icon' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {observations.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No observations recorded in this sector yet. Be the first to log a community sighting!
                </div>
              ) : (
                observations.map((obs) => (
                  <div
                    key={obs.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '6px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(51, 65, 85, 0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>
                          {obs.speciesOptional || 'Marine Activity'}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', background: obs.observedProductivity === 'HIGH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: obs.observedProductivity === 'HIGH' ? '#34d399' : '#fbbf24' }}>
                          {obs.observedProductivity}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {new Date(obs.observationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ margin: '2px 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                      "{obs.observationText}"
                    </p>

                    {obs.seaConditionOptional && (
                      <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                        Sea State: {obs.seaConditionOptional}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: '#64748b' }}>
                      <span>Provenance: {obs.provenance}</span>
                      <span>Confidence: {obs.confidence}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

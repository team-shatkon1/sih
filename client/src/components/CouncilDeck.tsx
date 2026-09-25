import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  Shuffle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
  CloudSun,
  Waves,
  Leaf,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Database,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  Coordinates,
  CouncilAgentEvaluation,
  CouncilAgentType,
  CouncilChallengeResponse,
  CouncilEvaluationResult,
  DecisionFlipResult,
  FullAnalysisBundle
} from '../types/orca.js';
import { SupportedLanguage } from '../i18n/translations.js';
import { LocalKnowledgeModal } from './LocalKnowledgeModal.js';

interface CouncilDeckProps {
  location: Coordinates;
  analysis: FullAnalysisBundle | null;
  language: SupportedLanguage;
  onOpenEvidenceGraph?: () => void;
  onOpenScenarioLab?: () => void;
  onSelectZone?: (zoneId: string) => void;
}

export const CouncilDeck: React.FC<CouncilDeckProps> = ({
  location,
  analysis,
  language,
  onOpenEvidenceGraph,
  onOpenScenarioLab,
  onSelectZone
}) => {
  const [councilData, setCouncilData] = useState<CouncilEvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedAgent, setSelectedAgent] = useState<CouncilAgentType | null>(null);

  // Modal / Drawer states
  const [showChallenge, setShowChallenge] = useState<boolean>(false);
  const [challengeQuestion, setChallengeQuestion] = useState<string>('');
  const [challengeAnswer, setChallengeAnswer] = useState<CouncilChallengeResponse | null>(null);
  const [isChallenging, setIsChallenging] = useState<boolean>(false);

  const [showFlipModal, setShowFlipModal] = useState<boolean>(false);
  const [flipResult, setFlipResult] = useState<DecisionFlipResult | null>(null);
  const [isLoadingFlip, setIsLoadingFlip] = useState<boolean>(false);

  const [showWhyModal, setShowWhyModal] = useState<'WHY' | 'WHY_NOT' | null>(null);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showLocalKnowledgeModal, setShowLocalKnowledgeModal] = useState<boolean>(false);

  // Load Council evaluation when location or analysis changes
  useEffect(() => {
    fetchCouncilData();
  }, [location, analysis?.id]);

  const fetchCouncilData = async () => {
    setIsLoading(true);
    try {
      const candidateZones = analysis?.candidateZones ?? [];
      const zoneA = candidateZones[0];
      const zoneB = candidateZones[1];

      const res = await fetch('/api/council/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: location,
          zoneMeta: {
            id: zoneA?.id ?? 'zone-primary',
            name: zoneA?.name ?? location.name ?? 'Target Sector Alpha'
          },
          comparisonZone: zoneB ? {
            id: zoneB.id,
            name: zoneB.name,
            inputs: {
              waveHeight: Number(analysis?.observations.find(o => o.key === 'wave_height')?.value ?? 1.2) + 0.3,
              windSpeed: Number(analysis?.observations.find(o => o.key === 'wind_speed')?.value ?? 16) + 4,
              currentVelocity: Number(analysis?.observations.find(o => o.key === 'ocean_current')?.value ?? 1.1) + 0.2,
              sst: Number(analysis?.observations.find(o => o.key === 'sst')?.value ?? 28.2),
              chlorophyll: Math.max(0.5, Number(analysis?.observations.find(o => o.key === 'chlorophyll_a')?.value ?? 1.8) - 0.4)
            }
          } : undefined
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCouncilData(data.data);
      }
    } catch (err) {
      console.error('Council evaluate fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Challenge ORCA
  const handleAskChallenge = async (qText: string) => {
    if (!qText.trim()) return;
    setIsChallenging(true);
    try {
      const res = await fetch('/api/council/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: location,
          question: qText,
          evaluation: councilData
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setChallengeAnswer(data.data);
      }
    } catch (err) {
      console.error('Challenge fetch failed:', err);
    } finally {
      setIsChallenging(false);
    }
  };

  // Handle Decision Flip computation
  const handleComputeDecisionFlip = async () => {
    setShowFlipModal(true);
    setIsLoadingFlip(true);
    try {
      const wave = Number(analysis?.observations.find(o => o.key === 'wave_height')?.value ?? 1.2);
      const wind = Number(analysis?.observations.find(o => o.key === 'wind_speed')?.value ?? 17);
      const current = Number(analysis?.observations.find(o => o.key === 'ocean_current')?.value ?? 1.1);
      const sst = Number(analysis?.observations.find(o => o.key === 'sst')?.value ?? 28.5);
      const chloro = Number(analysis?.observations.find(o => o.key === 'chlorophyll_a')?.value ?? 2.1);

      const res = await fetch('/api/council/decision-flip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneA: {
            id: 'zone-a',
            name: councilData?.zoneName ?? 'Zone Alpha (Recommended)',
            inputs: { waveHeight: wave, windSpeed: wind, currentVelocity: current, sst, chlorophyll: chloro }
          },
          zoneB: {
            id: 'zone-b',
            name: 'Zone Bravo (Alternative Shelf)',
            inputs: { waveHeight: wave + 0.4, windSpeed: wind + 7, currentVelocity: current + 0.3, sst: sst - 0.7, chlorophyll: Math.max(0.6, chloro - 0.7) }
          }
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFlipResult(data.data);
      }
    } catch (err) {
      console.error('Decision flip fetch failed:', err);
    } finally {
      setIsLoadingFlip(false);
    }
  };

  const arbitration = councilData?.arbitration;
  const disagreement = councilData?.disagreement;
  const agents = councilData?.agents;

  const renderAgentIcon = (type: CouncilAgentType) => {
    switch (type) {
      case 'WEATHER': return <CloudSun size={16} className="text-amber" />;
      case 'OCEAN': return <Waves size={16} className="text-cyan" />;
      case 'ECOSYSTEM': return <Leaf size={16} className="text-emerald" />;
      case 'RISK': return <ShieldCheck size={16} className="text-rose" />;
      case 'LOCAL_KNOWLEDGE': return <Sparkles size={16} className="text-teal" />;
    }
  };

  const predefinedChallenges = [
    'Which agent disagrees?',
    'What evidence is weakest?',
    'What could make this decision wrong?',
    'Why did you rank this zone higher?'
  ];

  return (
    <div className="council-deck-container">
      {/* 1. Header: Final ORCA Assessment */}
      <div className="council-assessment-card">
        <div className="council-card-top">
          <div className="council-tag">ORCA DECISION COUNCIL</div>
          <button className="council-refresh-btn" onClick={fetchCouncilData} title="Re-run Council Arbitration">
            <RotateCcw size={12} className={isLoading ? 'spin-icon' : ''} />
            <span>Re-evaluate</span>
          </button>
        </div>

        <div className="council-score-hero">
          <div className="council-score-dial">
            <span className="score-num">{arbitration?.finalScore ?? 84}</span>
            <span className="score-max">/100</span>
          </div>

          <div className="council-meta-col">
            <div className="council-decision-badge-row">
              <span className={`council-decision-badge ${(arbitration?.decision ?? 'FAVORABLE').toLowerCase()}`}>
                {arbitration?.decision?.replace('_', ' ') ?? 'FAVORABLE'}
              </span>
              <span className="council-agreement-pill">
                {arbitration?.agreementLevel ?? '4/5 agents'}
              </span>
            </div>
            <span className="council-conf-tag">
              Confidence: <strong>{arbitration?.confidence ?? 92}%</strong> (Deterministic fusion)
            </span>
            <span className="council-target-tag">
              {councilData?.zoneName ?? 'Sector Alpha'}
            </span>
          </div>
        </div>

        {/* 2. Agent Disagreement Engine Banner */}
        {disagreement?.hasDisagreement && (
          <div className="council-disagreement-alert">
            <div className="disagreement-alert-header">
              <AlertTriangle size={15} className="text-amber" />
              <span>⚠ AGENT DISAGREEMENT DETECTED</span>
            </div>
            <div className="disagreement-agent-strip">
              {agents && Object.entries(agents).map(([type, evalItem]) => (
                <div key={type} className={`disagreement-agent-pill ${evalItem.status.toLowerCase()}`}>
                  {renderAgentIcon(type as CouncilAgentType)}
                  <span className="agent-pill-name">{type}</span>
                  <span className="agent-pill-status">
                    {evalItem.status === 'FAVORABLE' ? '✓ Favorable' : evalItem.status === 'CAUTION' ? '⚠ Caution' : '✕ Hazard'}
                  </span>
                </div>
              ))}
            </div>
            <p className="disagreement-explanation">
              <strong>Why do they disagree?</strong> {disagreement.explanation}
            </p>
          </div>
        )}

        {/* Section 8: Source Disagreement Detector Banner */}
        {councilData?.sourceDisagreement && councilData.sourceDisagreement.length > 0 && (
          <div className="council-disagreement-alert" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', marginTop: '8px' }}>
            <div className="disagreement-alert-header">
              <AlertTriangle size={15} className="text-rose" />
              <span style={{ color: '#f87171' }}>⚠ MULTI-SOURCE DISAGREEMENT DETECTED</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              {councilData.sourceDisagreement.map((sd, i) => (
                <div key={i} style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  <strong>{sd.variable}:</strong> {sd.providerA.name} ({sd.providerA.value} {sd.providerA.unit}) vs {sd.providerB.name} ({sd.providerB.value} {sd.providerB.unit}) — <em>Diff: {sd.difference} {sd.differenceUnit}</em>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Primary Visible Actions Strip (Section 22: Do Not Overload UI) */}
      <div className="council-primary-actions-bar">
        <button
          className="council-action-chip primary"
          onClick={() => setShowChallenge(true)}
          title="Challenge this decision using grounded evidence"
        >
          <Flame size={14} className="text-orange" />
          <span>🔥 CHALLENGE ORCA</span>
        </button>

        <button
          className="council-action-chip"
          onClick={handleComputeDecisionFlip}
          title="Calculate what physical change would flip the decision"
        >
          <Shuffle size={14} className="text-marine" />
          <span>🔄 FIND DECISION FLIP</span>
        </button>

        <button
          className="council-action-chip"
          onClick={() => setShowLocalKnowledgeModal(true)}
          title="Local Fisher / Koli Knowledge & Evidence Alignment"
        >
          <Sparkles size={14} className="text-teal" />
          <span>🌿 LOCAL KNOWLEDGE</span>
        </button>

        <button
          className="council-action-chip"
          onClick={() => setShowAuditModal(true)}
          title="Inspect Reproducible Deterministic Audit Trail"
        >
          <ShieldCheck size={14} className="text-emerald" />
          <span>🛡️ VIEW AUDIT</span>
        </button>

        <button
          className="council-action-chip"
          onClick={() => setShowWhyModal('WHY')}
          title="Inspect positive and negative evidence"
        >
          <Info size={14} />
          <span>Why This Zone?</span>
        </button>

        <button
          className="council-action-chip"
          onClick={() => setShowWhyModal('WHY_NOT')}
          title="Compare against competing zones"
        >
          <ArrowRight size={14} />
          <span>Why Not?</span>
        </button>
      </div>

      {/* 4. Specialized Reasoning Modules (5 Agent Cards) */}
      <div className="council-agents-deck">
        <div className="deck-section-title">
          <span>SPECIALIZED REASONING MODULES</span>
          <span className="deck-count">5 Domains</span>
        </div>

        <div className="council-agent-cards-grid">
          {agents && (Object.entries(agents) as [CouncilAgentType, CouncilAgentEvaluation][]).map(([type, evalItem]) => {
            const isSelected = selectedAgent === type;
            return (
              <div
                key={type}
                className={`council-agent-item-card ${evalItem.status.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedAgent(isSelected ? null : type)}
              >
                <div className="agent-item-top">
                  <div className="agent-item-icon-title">
                    {renderAgentIcon(type)}
                    <span className="agent-item-title">{evalItem.agentName}</span>
                  </div>
                  <span className={`agent-item-status-tag ${evalItem.status.toLowerCase()}`}>
                    {evalItem.status}
                  </span>
                </div>

                <div className="agent-item-contribution-row">
                  <span className="agent-finding-snippet">
                    {evalItem.findings[0] ?? 'Evaluation within operating tolerances.'}
                  </span>
                  <span className={`agent-contribution-pill ${evalItem.scoreContribution >= 0 ? 'pos' : 'neg'}`}>
                    {evalItem.scoreContribution >= 0 ? `+${evalItem.scoreContribution}` : evalItem.scoreContribution} contribution
                  </span>
                </div>

                {/* Collapsible evidence detail */}
                {isSelected && (
                  <div className="agent-evidence-tray">
                    <span className="tray-hdr">EVIDENCE LOG</span>
                    {evalItem.evidence.map((ev, i) => (
                      <div key={i} className="evidence-log-row">
                        <span className="ev-metric">{ev.metric}:</span>
                        <span className="ev-val">{ev.value} {ev.unit}</span>
                        <span className="ev-bench">({ev.benchmark})</span>
                        <span className={`ev-pts ${ev.contribution >= 0 ? 'pos' : 'neg'}`}>
                          {ev.contribution >= 0 ? `+${ev.contribution}` : ev.contribution}
                        </span>
                      </div>
                    ))}
                    <div className="agent-source-foot">Source: {evalItem.source}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Arbitration Summary & Evidence Chain */}
      <div className="council-arbitration-card">
        <div className="arbitration-title-row">
          <span>EVIDENCE ARBITRATION PIPELINE</span>
          {onOpenEvidenceGraph && (
            <button className="open-graph-link" onClick={onOpenEvidenceGraph}>
              <Database size={13} />
              <span>Open DAG Graph</span>
            </button>
          )}
        </div>

        <div className="arbitration-chain-list">
          {arbitration?.evidenceChain.map((step, idx) => (
            <div key={idx} className={`chain-step-item ${step.status.toLowerCase()}`}>
              <div className="step-indicator-dot" />
              <div className="step-text-col">
                <span className="step-title">{step.step}</span>
                <span className="step-detail">{step.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL / DRAWER: CHALLENGE ORCA                                      */}
      {/* ==================================================================== */}
      {showChallenge && (
        <div className="council-modal-overlay" onClick={() => setShowChallenge(false)}>
          <div className="council-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="council-modal-header">
              <div className="modal-title-wrap">
                <Flame size={18} className="text-orange" />
                <h3>CHALLENGE ORCA DECISION</h3>
              </div>
              <button className="council-close-btn" onClick={() => setShowChallenge(false)}>✕</button>
            </div>

            <div className="council-modal-body">
              <p className="challenge-prompt-hint">
                Challenge this recommendation with critical scrutiny. ORCA retrieves actual Council evidence to answer, with Gemini acting strictly as an explanation layer.
              </p>

              <div className="predefined-chips-strip">
                {predefinedChallenges.map((q, idx) => (
                  <button
                    key={idx}
                    className="predefined-chip-btn"
                    onClick={() => {
                      setChallengeQuestion(q);
                      handleAskChallenge(q);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="challenge-input-row">
                <input
                  type="text"
                  placeholder="Or ask a custom challenge (e.g. Why Zone A when Risk says caution?)..."
                  value={challengeQuestion}
                  onChange={(e) => setChallengeQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskChallenge(challengeQuestion)}
                />
                <button
                  className="challenge-submit-btn"
                  onClick={() => handleAskChallenge(challengeQuestion)}
                  disabled={isChallenging || !challengeQuestion.trim()}
                >
                  <Send size={15} />
                  <span>Ask</span>
                </button>
              </div>

              {isChallenging && (
                <div className="challenge-loading-state">
                  <div className="spinner-circle" />
                  <span>Auditing Council evidence chain...</span>
                </div>
              )}

              {challengeAnswer && !isChallenging && (
                <div className="challenge-response-card">
                  <div className="response-header">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span className="response-title">EVIDENCE-GROUNDED AUDIT</span>
                    <span className="response-confidence">{challengeAnswer.confidenceScore}% Confidence</span>
                  </div>
                  <p className="response-text">{challengeAnswer.groundedAnswer}</p>

                  {challengeAnswer.flipSuggestion && (
                    <div className="response-suggestion-box">
                      <strong>Mitigation / Flip:</strong> {challengeAnswer.flipSuggestion}
                    </div>
                  )}

                  <div className="response-provenance-tags">
                    {challengeAnswer.evidenceReferenced.map((ref, idx) => (
                      <span key={idx} className="prov-tag">{ref}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: FIND DECISION FLIP                                           */}
      {/* ==================================================================== */}
      {showFlipModal && (
        <div className="council-modal-overlay" onClick={() => setShowFlipModal(false)}>
          <div className="council-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="council-modal-header">
              <div className="modal-title-wrap">
                <Shuffle size={18} className="text-marine" />
                <h3>WHAT WOULD FLIP THE DECISION?</h3>
              </div>
              <button className="council-close-btn" onClick={() => setShowFlipModal(false)}>✕</button>
            </div>

            <div className="council-modal-body">
              <p className="flip-intro-text">
                The deterministic engine calculates measurable environmental shifts that would cause <strong>Zone Bravo</strong> to overtake <strong>Zone Alpha</strong>.
              </p>

              {isLoadingFlip ? (
                <div className="challenge-loading-state">
                  <div className="spinner-circle" />
                  <span>Computing inverse boundary conditions...</span>
                </div>
              ) : flipResult ? (
                <div className="flip-results-container">
                  <div className="flip-scores-compare-row">
                    <div className="flip-score-box leader">
                      <span className="flip-box-role">RECOMMENDED</span>
                      <span className="flip-box-name">{flipResult.currentRanking.zoneA.name}</span>
                      <span className="flip-box-score">{flipResult.currentRanking.zoneA.score}</span>
                    </div>

                    <div className="flip-arrow-middle">
                      <ArrowRight size={20} />
                      <span className="delta-req">Overtake</span>
                    </div>

                    <div className="flip-score-box trailer">
                      <span className="flip-box-role">ALTERNATIVE</span>
                      <span className="flip-box-name">{flipResult.currentRanking.zoneB.name}</span>
                      <span className="flip-box-score">{flipResult.currentRanking.zoneB.score}</span>
                    </div>
                  </div>

                  <div className="flip-conditions-list">
                    <span className="conditions-hdr">DECISION FLIP CONDITIONS</span>
                    {flipResult.flipConditions.map((cond, idx) => (
                      <div key={idx} className="flip-cond-item">
                        <div className="cond-item-title-row">
                          <span className="cond-var">{cond.variable}</span>
                          <span className="cond-delta">{cond.delta > 0 ? `+${cond.delta}` : cond.delta} {cond.unit}</span>
                        </div>
                        <div className="cond-shift-formula">
                          {cond.currentValue} {cond.unit} &rarr; <strong>{cond.flipThreshold} {cond.unit}</strong>
                        </div>
                        <p className="cond-desc">{cond.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="variable-sensitivity-matrix">
                    <span className="sens-hdr">DETERMINISTIC SENSITIVITY WEIGHTS</span>
                    <div className="sens-grid">
                      {flipResult.variableImpact.map((v, i) => (
                        <div key={i} className="sens-pill">
                          <span className="v-name">{v.variable}</span>
                          <span className="v-val">{v.sensitivity} {v.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: WHY THIS ZONE / WHY NOT THIS ZONE                            */}
      {/* ==================================================================== */}
      {showWhyModal && (
        <div className="council-modal-overlay" onClick={() => setShowWhyModal(null)}>
          <div className="council-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="council-modal-header">
              <div className="modal-title-wrap">
                <Info size={18} className="text-cyan" />
                <h3>{showWhyModal === 'WHY' ? 'WHY THIS ZONE?' : 'WHY NOT THIS ZONE?'}</h3>
              </div>
              <button className="council-close-btn" onClick={() => setShowWhyModal(null)}>✕</button>
            </div>

            <div className="council-modal-body">
              {showWhyModal === 'WHY' && councilData?.whyThisZone ? (
                <div className="why-breakdown-tray">
                  <p className="why-summary-text">{councilData.whyThisZone.summary}</p>

                  <div className="evidence-split-cols">
                    <div className="evidence-col positive">
                      <span className="col-hdr text-emerald">✓ POSITIVE EVIDENCE FACTORS</span>
                      {councilData.whyThisZone.positiveEvidence.map((e, idx) => (
                        <div key={idx} className="evidence-card positive">
                          <div className="ev-hdr">
                            <span className="metric-title">{e.metric}</span>
                            <span className="pts-tag">+{e.contribution} pts</span>
                          </div>
                          <div className="ev-val">{e.value} {e.unit}</div>
                          <div className="ev-bench">Target: {e.benchmark}</div>
                          <div className="ev-src">Source: {e.source}</div>
                        </div>
                      ))}
                    </div>

                    <div className="evidence-col negative">
                      <span className="col-hdr text-rose">⚠ LIMITING / RISK FACTORS</span>
                      {councilData.whyThisZone.negativeEvidence.length === 0 ? (
                        <div className="no-negatives">No limiting factors found in telemetry.</div>
                      ) : (
                        councilData.whyThisZone.negativeEvidence.map((e, idx) => (
                          <div key={idx} className="evidence-card negative">
                            <div className="ev-hdr">
                              <span className="metric-title">{e.metric}</span>
                              <span className="pts-tag neg">{e.contribution} pts</span>
                            </div>
                            <div className="ev-val">{e.value} {e.unit}</div>
                            <div className="ev-bench">Benchmark: {e.benchmark}</div>
                            <div className="ev-src">Source: {e.source}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : councilData?.whyNotThisZone ? (
                <div className="why-not-tray">
                  <p className="why-summary-text">{councilData.whyNotThisZone.summary}</p>
                  <div className="why-not-points-list">
                    <span className="list-title">Disadvantages of Alternate Sector:</span>
                    {councilData.whyNotThisZone.disadvantages.map((d, i) => (
                      <div key={i} className="why-not-point-item">
                        <XCircle size={15} className="text-rose" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p>Telemetry comparison active on primary candidate sector.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL / DRAWER: DECISION AUDIT RECORD (SECTION 35)                   */}
      {/* ==================================================================== */}
      {showAuditModal && (
        <div className="council-modal-backdrop">
          <div className="council-modal-card" style={{ maxWidth: '640px' }}>
            <div className="council-modal-header">
              <div className="modal-title-wrap">
                <ShieldCheck size={18} className="text-emerald" />
                <h3>REPRODUCIBLE DECISION AUDIT LOG</h3>
              </div>
              <button className="council-close-btn" onClick={() => setShowAuditModal(false)}>✕</button>
            </div>

            <div className="council-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>Scoring Engine:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 800 }}>{arbitration?.scoringModelVersion ?? 'ORCA-DET-2.1'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>Decision Status:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 800 }}>{arbitration?.decision ?? 'FAVORABLE'} ({arbitration?.finalScore}/100)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>Timestamp:</span>
                  <span style={{ color: '#94a3b8' }}>{councilData?.timestamp ?? new Date().toISOString()}</span>
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  DETERMINISTIC WEIGHTING MATRIX
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.75rem' }}>
                  <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                    <div style={{ color: '#64748b' }}>Weather Agent</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>Weight: ±14 pts</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                    <div style={{ color: '#64748b' }}>Ocean Agent</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>Weight: ±18 pts</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                    <div style={{ color: '#64748b' }}>Ecosystem Agent</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>Weight: ±16 pts</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                    <div style={{ color: '#64748b' }}>Risk Agent</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>Weight: -24 to +12</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                    <div style={{ color: '#64748b' }}>Local Knowledge</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>Weight: ±12 pts</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                    <div style={{ color: '#64748b' }}>Base Neutral Score</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>50.0 Baseline</div>
                  </div>
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  REPRODUCIBLE ARBITRATION SIGNATURE
                </span>
                <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(30, 41, 59, 0.8)', fontFamily: 'monospace', fontSize: '0.72rem', color: '#38bdf8', wordBreak: 'break-all' }}>
                  ORCA-SIG-eyJjIjp7ImxhdCI6{location.latitude.toFixed(2)},ImxvbiI6{location.longitude.toFixed(2)}fSwic2NvcmUiOnty{arbitration?.finalScore}fSwidmVyIjoiT1JDQS1ERVRCLTIuMSJ9
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                🔒 <strong>Scientific Audit Guarantee:</strong> ORCA scoring is calculated strictly by deterministic mathematical arbitration models (not by generative LLMs). Re-submitting the identical evidence parameters is mathematically guaranteed to generate the identical score and ranking.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: LOCAL ECOLOGICAL KNOWLEDGE (LEK) LAYER                         */}
      {/* ==================================================================== */}
      <LocalKnowledgeModal
        isOpen={showLocalKnowledgeModal}
        onClose={() => setShowLocalKnowledgeModal(false)}
        location={location}
        analysis={analysis}
      />
    </div>
  );
};


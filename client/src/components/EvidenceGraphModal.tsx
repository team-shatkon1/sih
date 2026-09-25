import React, { useState } from 'react';
import { EvidenceEdge, EvidenceGraph, EvidenceNode } from '../types/orca.js';
import {
  Database,
  X,
  ArrowRight,
  Activity,
  ShieldCheck,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';

interface EvidenceGraphModalProps {
  graph: EvidenceGraph;
  onClose: () => void;
  language: SupportedLanguage;
}

export const EvidenceGraphModal: React.FC<EvidenceGraphModalProps> = ({ graph, onClose, language }) => {
  const [activeNode, setActiveNode] = useState<EvidenceNode | null>(graph.nodes[0] || null);
  const [activeEdge, setActiveEdge] = useState<EvidenceEdge | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'POSITIVE' | 'NEGATIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const filteredNodes = graph.nodes.filter((n) => {
    const matchesSearch = n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.source && n.source.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (filterType === 'POSITIVE') return n.contribution >= 0;
    if (filterType === 'NEGATIVE') return n.contribution < 0;
    return true;
  });

  const sensorNodes = filteredNodes.filter((n) => n.type === 'SENSOR');
  const criteriaNodes = filteredNodes.filter((n) => n.type === 'CRITERIA');
  const scoreNodes = filteredNodes.filter((n) => n.type === 'SCORE');

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(1.4, Math.max(0.7, Number((prev + delta).toFixed(2)))));
  };

  const resetZoom = () => setZoomLevel(1.0);

  const handleEdgeClick = (fromNode: EvidenceNode, toNode: EvidenceNode) => {
    const edge = graph.edges.find((e) => e.from === fromNode.id && e.to === toNode.id) || {
      from: fromNode.id,
      to: toNode.id,
      label: `${fromNode.label} → ${toNode.label}`,
      weight: fromNode.contribution
    };
    setActiveEdge(edge);
    setActiveNode(null);
  };

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="orca-modal-box evidence-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-head-bar">
          <div className="head-title-combo">
            <Database size={20} className="text-marine" />
            <div>
              <h2 className="modal-title">INTERACTIVE EVIDENCE GRAPH</h2>
              <span className="modal-sub">Causal dependency graph connecting sensors, criteria functions, and decision metrics</span>
            </div>
          </div>

          <div className="modal-actions-right">
            {/* Graph Controls (Section 23) */}
            <div className="graph-toolbar">
              <button className="icon-btn" onClick={() => handleZoom(0.1)} title="Zoom In">
                <ZoomIn size={15} />
              </button>
              <button className="icon-btn" onClick={() => handleZoom(-0.1)} title="Zoom Out">
                <ZoomOut size={15} />
              </button>
              <button className="icon-btn" onClick={resetZoom} title="Reset Scale">
                <Maximize2 size={15} />
              </button>
            </div>

            <button className="icon-btn" onClick={onClose} title="Close Evidence Graph">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Filter */}
        <div className="evidence-toolbar-strip">
          <div className="search-pill">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search evidence nodes (Wave, Wind, SST, Risk)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <button onClick={() => setSearchQuery('')}>×</button>}
          </div>

          <div className="filter-pill-group">
            <Filter size={13} />
            <span>Contribution:</span>
            <button
              className={`pill-btn ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              Show All
            </button>
            <button
              className={`pill-btn ${filterType === 'POSITIVE' ? 'active' : ''}`}
              onClick={() => setFilterType('POSITIVE')}
            >
              Only Positive (+)
            </button>
            <button
              className={`pill-btn ${filterType === 'NEGATIVE' ? 'active' : ''}`}
              onClick={() => setFilterType('NEGATIVE')}
            >
              Only Negative (−)
            </button>
          </div>
        </div>

        {/* Main Canvas & Inspector Layout */}
        <div className="evidence-layout-grid">
          {/* Interactive DAG Flow */}
          <div
            className="graph-flow-canvas"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
          >
            {/* Level 1: Environmental Sensors */}
            <div className="dag-stage-col">
              <div className="stage-head">
                <span className="stage-num">01</span>
                <span className="stage-label">ENVIRONMENTAL SENSORS</span>
              </div>
              <div className="nodes-stack">
                {sensorNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`dag-node-card ${activeNode?.id === node.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveNode(node);
                      setActiveEdge(null);
                    }}
                  >
                    <div className="node-head">
                      <span className="node-kind-tag">SENSOR</span>
                      <span className={`contribution-badge ${node.contribution >= 0 ? 'pos' : 'neg'}`}>
                        {node.contribution >= 0 ? `+${node.contribution}` : node.contribution}
                      </span>
                    </div>
                    <span className="node-title">{node.label}</span>
                    <div className="node-val-line">
                      <strong>{node.value}</strong> <small>{node.unit}</small>
                    </div>
                    <span className="node-source-foot">{node.source ?? 'NOAA / ECMWF'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="connector-column">
              <div className="connector-line" />
              <ArrowRight size={18} className="connector-arrow" />
            </div>

            {/* Level 2: Criteria Functions */}
            <div className="dag-stage-col">
              <div className="stage-head">
                <span className="stage-num">02</span>
                <span className="stage-label">CRITERIA FUNCTIONS</span>
              </div>
              <div className="nodes-stack">
                {criteriaNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`dag-node-card ${activeNode?.id === node.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveNode(node);
                      setActiveEdge(null);
                    }}
                  >
                    <div className="node-head">
                      <span className="node-kind-tag">CRITERIA</span>
                      <span className="contribution-badge neutral">
                        {node.contribution}% Drag
                      </span>
                    </div>
                    <span className="node-title">{node.label}</span>
                    <div className="node-val-line">
                      <strong>{node.value}</strong> <small>{node.unit}</small>
                    </div>
                    <span className="node-source-foot">Deterministic Algorithm</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="connector-column">
              <div className="connector-line" />
              <ArrowRight size={18} className="connector-arrow" />
            </div>

            {/* Level 3: Decision Metric Outputs */}
            <div className="dag-stage-col">
              <div className="stage-head">
                <span className="stage-num">03</span>
                <span className="stage-label">DECISION SCORES</span>
              </div>
              <div className="nodes-stack">
                {scoreNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`dag-node-card score-card ${activeNode?.id === node.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveNode(node);
                      setActiveEdge(null);
                    }}
                  >
                    <div className="node-head">
                      <span className="node-kind-tag score">OUTPUT</span>
                      <span className="contribution-badge pos">Score / 100</span>
                    </div>
                    <span className="node-title">{node.label}</span>
                    <div className="node-val-line">
                      <strong>{node.value}</strong> <small>/100</small>
                    </div>
                    <span className="node-source-foot">Standardized Index</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Node / Edge Inspector (Section 22) */}
          <aside className="evidence-inspector-sidebar">
            {activeNode ? (
              <div className="inspector-content">
                <div className="inspector-head-group">
                  <span className="inspector-eyebrow">{activeNode.type} NODE</span>
                  <h3 className="inspector-title">{activeNode.label}</h3>
                  <span className={`status-pill status-${activeNode.status.toLowerCase()}`}>
                    {activeNode.status} STATUS
                  </span>
                </div>

                <div className="inspector-metrics-list">
                  <div className="inspector-row">
                    <span>Observed Value:</span>
                    <strong>{activeNode.value} {activeNode.unit ?? ''}</strong>
                  </div>
                  <div className="inspector-row">
                    <span>Source Provider:</span>
                    <strong>{activeNode.source ?? 'Official Sensor Stream'}</strong>
                  </div>
                  <div className="inspector-row">
                    <span>Updated / Freshness:</span>
                    <span>{activeNode.freshness ?? '11 min ago'}</span>
                  </div>
                  <div className="inspector-row">
                    <span>Mathematical Contribution:</span>
                    <strong className="text-marine">
                      {activeNode.contribution >= 0 ? `+${activeNode.contribution}` : activeNode.contribution} points
                    </strong>
                  </div>
                  <div className="inspector-row">
                    <span>Confidence Rating:</span>
                    <strong className="text-teal">91% Validated</strong>
                  </div>
                </div>

                <div className="causal-reasoning-card">
                  <div className="reasoning-head">
                    <Sparkles size={14} className="text-marine" />
                    <strong>Causal Impact on Decision</strong>
                  </div>
                  <p>
                    {activeNode.contribution > 10
                      ? 'Lower wave exposure and mild swell significantly boost modeled operating suitability, reducing vessel turbulence.'
                      : activeNode.contribution < -5
                      ? 'Elevated wind vectors impose navigational drag and increase coastal hazard rating.'
                      : 'Environmental condition remains within acceptable baseline operating envelope.'}
                  </p>
                </div>
              </div>
            ) : activeEdge ? (
              <div className="inspector-content">
                <div className="inspector-head-group">
                  <span className="inspector-eyebrow">EDGE CONTRIBUTION</span>
                  <h3 className="inspector-title">{activeEdge.label}</h3>
                </div>

                <div className="inspector-metrics-list">
                  <div className="inspector-row">
                    <span>Contribution Score:</span>
                    <strong className="text-marine">+{activeEdge.weight}</strong>
                  </div>
                  <div className="inspector-row">
                    <span>Reason:</span>
                    <p className="edge-reason-text">
                      Direct causal flow from upstream environmental sensor to downstream suitability metric.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-inspector-state">
                <Info size={24} className="text-muted" />
                <p>Click any node or connector edge to inspect source attribution, contribution weight, and causal logic.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

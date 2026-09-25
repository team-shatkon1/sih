import React, { useState } from 'react';
import { DecisionSnapshot, FullAnalysisBundle, UserRole } from '../types/orca.js';
import { Camera, Download, Printer, X, ShieldCheck, Check } from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';
import { OfflineService } from '../services/offlineService.js';

interface DecisionSnapshotModalProps {
  analysis: FullAnalysisBundle;
  role: UserRole;
  snapshots: DecisionSnapshot[];
  onSnapshotSaved: (snap: DecisionSnapshot) => void;
  onClose: () => void;
  language: SupportedLanguage;
}

export const DecisionSnapshotModal: React.FC<DecisionSnapshotModalProps> = ({
  analysis,
  role,
  snapshots,
  onSnapshotSaved,
  onClose,
  language
}) => {
  const [title, setTitle] = useState(
    `Operational Assessment — ${analysis.location.name ?? 'Marine Sector'}`
  );
  const [notes, setNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    const newSnapshot: DecisionSnapshot = {
      id: `snap-${Date.now()}`,
      title,
      timestamp: new Date().toISOString(),
      location: analysis.location,
      userRole: role,
      notes,
      risk: analysis.risk,
      suitability: analysis.suitability,
      dataTrust: analysis.dataTrust,
      observations: analysis.observations,
      topCandidateZone: analysis.candidateZones[0],
      marineFingerprint: analysis.marineFingerprint
    };

    try {
      await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSnapshot)
      });
    } catch {
      // Offline fallback
      await OfflineService.saveOfflineSnapshot(newSnapshot);
    }

    onSnapshotSaved(newSnapshot);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportJson = (snap: DecisionSnapshot) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snap, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `orca-snapshot-${snap.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="orca-modal-overlay">
      <div className="orca-modal-box snapshot-modal-box">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Camera size={18} />
            <h2>{t('decisionSnapshots', language)}</h2>
            <span className="immutable-tag">AUDITABLE RECORD</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="snapshot-grid-content">
          {/* Create new snapshot */}
          <div className="create-snapshot-card">
            <h3>SAVE CURRENT ASSESSMENT</h3>
            <div className="field-group">
              <label>Snapshot Title</label>
              <input
                type="text"
                className="orca-input-text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label>Operational Field Notes / Log</label>
              <textarea
                className="orca-textarea"
                rows={3}
                placeholder="Add contextual observations, vessel dispatch decisions, or meteorological caveats…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="snapshot-telemetry-preview">
              <span>
                <b>Risk:</b> {analysis.risk.score}/100 ({analysis.risk.label})
              </span>
              <span>
                <b>Suitability:</b> {analysis.suitability.score}/100
              </span>
              <span>
                <b>Confidence:</b> {analysis.dataTrust.confidenceScore}%
              </span>
              <span>
                <b>Mode:</b> {analysis.dataMode}
              </span>
            </div>

            <div className="snapshot-actions-bar">
              <button className="orca-btn-primary" onClick={handleSave}>
                <Camera size={15} />
                <span>{savedSuccess ? 'Snapshot Recorded!' : t('saveSnapshot', language)}</span>
              </button>
              <button className="orca-btn-secondary" onClick={handlePrint}>
                <Printer size={15} />
                <span>{t('exportReport', language)}</span>
              </button>
            </div>
          </div>

          {/* Past snapshots list */}
          <div className="past-snapshots-col">
            <h3>SAVED DECISION SNAPSHOTS ({snapshots.length})</h3>
            <div className="past-snapshots-scroll">
              {snapshots.map((snap) => (
                <div key={snap.id} className="past-snap-item">
                  <div className="snap-item-head">
                    <strong>{snap.title}</strong>
                    <button
                      className="download-icon-btn"
                      onClick={() => handleExportJson(snap)}
                      title="Download JSON"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                  <span className="snap-time">
                    {new Date(snap.timestamp).toLocaleString()} · Role: {snap.userRole}
                  </span>
                  <div className="snap-scores-micro">
                    <span>Risk: {snap.risk.score}</span>
                    <span>Suitability: {snap.suitability.score}</span>
                    <span>Confidence: {snap.dataTrust.confidenceScore}%</span>
                  </div>
                  {snap.notes && <p className="snap-notes-excerpt">"{snap.notes}"</p>}
                </div>
              ))}
              {snapshots.length === 0 && (
                <div className="empty-snap-state">No saved decision snapshots yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  X,
  Upload,
  MapPin,
  Filter,
  ShieldAlert,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Coordinates, RegionReport, ReportCategory, ReportSeverity, UserRole } from '../types/orca.js';
import { SupportedLanguage } from '../i18n/translations.js';
import { formatCoordinates } from '../utils/geoUtils.js';

interface RegionReportsModalProps {
  currentLocation: Coordinates;
  userRole: UserRole;
  onClose: () => void;
  onSelectReportOnMap?: (location: Coordinates) => void;
  language: SupportedLanguage;
}

export const RegionReportsModal: React.FC<RegionReportsModalProps> = ({
  currentLocation,
  userRole,
  onClose,
  onSelectReportOnMap,
  language
}) => {
  const [reports, setReports] = useState<RegionReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<number>(24);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [votingId, setVotingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ReportCategory>('STRONG_CURRENT');
  const [severity, setSeverity] = useState<ReportSeverity>('MODERATE');
  const [description, setDescription] = useState('');
  const [customCoord, setCustomCoord] = useState<Coordinates>(currentLocation);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?timeframe=${timeframe}`);
      const data = await res.json();
      if (data.success && data.data) {
        setReports(data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [timeframe]);

  const handleVote = async (id: string, isAccurate: boolean) => {
    setVotingId(id);
    try {
      const res = await fetch(`/api/reports/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAccurate })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setReports((prev) => prev.map((r) => (r.id === id ? data.data : r)));
      }
    } catch {
      // Ignore
    } finally {
      setVotingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          severity,
          description,
          location: customCoord,
          authorRole: userRole,
          authorName: userRole === 'FISHERMAN' ? 'Local Coastal Fisher' : userRole === 'AUTHORITIES' ? 'Port Patrol Officer' : 'Community Observer',
          mediaUrl: photoPreview ?? undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitMessage('Observation report successfully submitted for verification.');
        setIsCreating(false);
        setTitle('');
        setDescription('');
        setPhotoPreview(null);
        fetchReports();
      }
    } catch {
      setSubmitMessage('Error submitting report. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="region-reports-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-head-bar">
          <div className="head-title-combo">
            <FileText size={20} className="text-marine" />
            <div>
              <h2 className="modal-title">COMMUNITY REGION REPORTS</h2>
              <span className="modal-sub">Local observations, navigational hazards &amp; crowd-sourced marine events</span>
            </div>
          </div>
          <div className="modal-actions-right">
            {!isCreating && (
              <button className="orca-btn-primary" onClick={() => setIsCreating(true)}>
                <PlusCircle size={15} />
                <span>Submit Report</span>
              </button>
            )}
            <button className="icon-btn" onClick={onClose} title="Close reports modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {submitMessage && (
          <div className="alert-notice-banner success">
            <CheckCircle2 size={16} />
            <span>{submitMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="modal-body-content">
          {isCreating ? (
            /* Creation Form */
            <form className="report-submit-form" onSubmit={handleSubmit}>
              <div className="form-header-row">
                <h3>Submit New Marine Observation</h3>
                <button type="button" className="text-btn" onClick={() => setIsCreating(false)}>
                  Cancel
                </button>
              </div>

              <div className="form-grid-two">
                <div className="form-group">
                  <label>Report Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Strong riptide observed off Aguada Point"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Observation Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ReportCategory)}
                  >
                    <option value="STRONG_CURRENT">Strong Current / Rip Tide</option>
                    <option value="HAZARD">Submerged Hazard / Obstacle</option>
                    <option value="MARINE_CONDITION">Rough Seas / Swell</option>
                    <option value="WILDLIFE">Marine Wildlife / Pod Sighting</option>
                    <option value="WEATHER">Localized Squall / Rain</option>
                    <option value="COASTAL">Coastal Shoreline Change</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-two">
                <div className="form-group">
                  <label>Severity Rating</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as ReportSeverity)}
                  >
                    <option value="LOW">Low (Informational / Advisory)</option>
                    <option value="MODERATE">Moderate (Caution Advised)</option>
                    <option value="HIGH">High (Immediate Navigation Hazard)</option>
                    <option value="CRITICAL">Critical (Life &amp; Vessel Danger)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Geographic Coordinates</label>
                  <div className="coord-input-static">
                    <MapPin size={14} className="text-marine" />
                    <span>{formatCoordinates(customCoord).fullText}</span>
                    <small>({customCoord.name ?? 'Selected Map Point'})</small>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Observation Details</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide precise details: approximate distance from shore, direction of flow, water depth, recommendations for other vessels."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Evidence Photo (Optional)</label>
                <div className="file-upload-strip">
                  <label className="file-picker-label">
                    <Upload size={14} />
                    <span>Choose Photo / Screenshot</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                  {photoPreview && (
                    <div className="photo-preview-thumb">
                      <img src={photoPreview} alt="Report preview" />
                      <button type="button" onClick={() => setPhotoPreview(null)}>×</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-submit-actions">
                <button type="button" className="orca-btn-secondary" onClick={() => setIsCreating(false)}>
                  Cancel
                </button>
                <button type="submit" className="orca-btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Publish Community Report'}
                </button>
              </div>
            </form>
          ) : (
            /* Reports List & Filter */
            <div className="reports-view-container">
              {/* Filter controls */}
              <div className="reports-filters-bar">
                <div className="filter-group">
                  <Filter size={14} />
                  <span>Timeframe:</span>
                  <select value={timeframe} onChange={(e) => setTimeframe(Number(e.target.value))}>
                    <option value={24}>Last 24 Hours</option>
                    <option value={168}>Last 7 Days</option>
                    <option value={720}>Last 30 Days</option>
                  </select>
                </div>

                <div className="filter-group">
                  <span>Status:</span>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All Reports</option>
                    <option value="VERIFIED">Verified Only</option>
                    <option value="UNVERIFIED">Under Review / Community</option>
                  </select>
                </div>

                <div className="reports-count-tag">
                  {filteredReports.length} reports logged
                </div>
              </div>

              {/* Reports Cards */}
              <div className="reports-cards-list">
                {loading ? (
                  <div className="empty-loading-state">Loading regional community reports…</div>
                ) : filteredReports.length === 0 ? (
                  <div className="empty-loading-state">
                    <CheckCircle2 size={24} className="text-teal" />
                    <p>No active hazard or incident reports logged in this timeframe.</p>
                  </div>
                ) : (
                  filteredReports.map((report) => {
                    const isVerified = report.status === 'VERIFIED';
                    return (
                      <div key={report.id} className="report-card-item">
                        <div className="report-card-header">
                          <div className="title-block">
                            <span className={`severity-tag sev-${report.severity.toLowerCase()}`}>
                              {report.severity}
                            </span>
                            <span className="category-tag">{report.category.replace('_', ' ')}</span>
                            <h4 className="report-title">{report.title}</h4>
                          </div>

                          <div className="status-badge-wrap">
                            {isVerified ? (
                              <span className="verified-badge">
                                <CheckCircle2 size={13} /> VERIFIED REPORT
                              </span>
                            ) : (
                              <span className="unverified-badge">
                                <Clock size={13} /> COMMUNITY OBSERVATION
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="report-description-text">{report.description}</p>

                        <div className="report-meta-row">
                          <div className="meta-left">
                            <span className="meta-location">
                              <MapPin size={12} /> {formatCoordinates(report.location).fullText}
                            </span>
                            <span className="meta-divider">·</span>
                            <span className="meta-time">
                              {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="meta-divider">·</span>
                            <span className="meta-author">Reported by {report.authorName} ({report.authorRole})</span>
                          </div>

                          {/* Community confirmation buttons */}
                          <div className="confirmation-voting-group">
                            <span className="vote-prompt">Still accurate?</span>
                            <button
                              className="vote-btn yes"
                              disabled={votingId === report.id}
                              onClick={() => handleVote(report.id, true)}
                              title="Confirm this observation is still accurate"
                            >
                              <ThumbsUp size={12} />
                              <span>{report.confirmations.yes}</span>
                            </button>
                            <button
                              className="vote-btn no"
                              disabled={votingId === report.id}
                              onClick={() => handleVote(report.id, false)}
                              title="Report this observation as outdated / cleared"
                            >
                              <ThumbsDown size={12} />
                              <span>{report.confirmations.no}</span>
                            </button>

                            {onSelectReportOnMap && (
                              <button
                                className="map-jump-btn"
                                onClick={() => {
                                  onSelectReportOnMap(report.location);
                                  onClose();
                                }}
                                title="Locate on Map"
                              >
                                <Eye size={13} />
                                <span>Map</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

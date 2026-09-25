import React from 'react';
import { ChangeRadarData, RiskClockItem, TimelinePoint } from '../types/orca.js';
import { Waves, Wind, TrendingUp, TrendingDown, Clock, ShieldCheck, Activity } from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';

interface TimelineChangeRadarProps {
  changeRadar: ChangeRadarData;
  timeline: TimelinePoint[];
  riskClock: RiskClockItem[];
  language: SupportedLanguage;
}

export const TimelineChangeRadar: React.FC<TimelineChangeRadarProps> = ({
  changeRadar,
  timeline,
  riskClock,
  language
}) => {
  return (
    <div className="timeline-radar-container">
      {/* Change Radar Section */}
      <div className="change-radar-block">
        <div className="section-head-radar">
          <Activity size={16} />
          <h3>{t('changeRadar', language)}</h3>
          <span className="live-tag-mini">6-HOUR TREND DELTA</span>
        </div>

        <div className="radar-metrics-row">
          <div className="radar-stat-tile">
            <span className="stat-label">
              <Wind size={13} /> WIND DELTA
            </span>
            <strong className={`stat-num ${changeRadar.windDeltaPercent > 0 ? 'rising' : 'falling'}`}>
              {changeRadar.windDeltaPercent > 0 ? '+' : ''}
              {changeRadar.windDeltaPercent}%
            </strong>
          </div>

          <div className="radar-stat-tile">
            <span className="stat-label">
              <Waves size={13} /> WAVE DELTA
            </span>
            <strong className={`stat-num ${changeRadar.waveDeltaPercent > 0 ? 'rising' : 'falling'}`}>
              {changeRadar.waveDeltaPercent > 0 ? '+' : ''}
              {changeRadar.waveDeltaPercent}%
            </strong>
          </div>

          <div className="radar-stat-tile">
            <span className="stat-label">SST TREND</span>
            <strong className="stat-num">{changeRadar.sstTrend}</strong>
          </div>

          <div className="radar-stat-tile">
            <span className="stat-label">RISK DELTA</span>
            <strong className={`stat-num ${changeRadar.riskDelta > 0 ? 'rising' : 'falling'}`}>
              {changeRadar.riskDelta > 0 ? '+' : ''}
              {changeRadar.riskDelta} pts
            </strong>
          </div>
        </div>

        <div className="radar-primary-summary">
          <strong>MAIN ENVIRONMENTAL CHANGE:</strong>
          <p>{changeRadar.primaryEnvironmentalChange}</p>
        </div>
      </div>

      {/* Risk Clock Section */}
      <div className="risk-clock-block">
        <div className="section-head-radar">
          <Clock size={16} />
          <h3>{t('riskClock', language)}</h3>
          <span className="outlook-tag">ENVIRONMENTAL OUTLOOK</span>
        </div>

        <div className="risk-clock-strip">
          {riskClock.map((item, idx) => {
            const isHigh = item.level === 'HIGH' || item.level === 'SEVERE';
            const isElevated = item.level === 'ELEVATED';
            return (
              <div
                key={idx}
                className={`clock-hour-cell ${isHigh ? 'state-high' : isElevated ? 'state-elevated' : 'state-low'}`}
              >
                <span className="cell-period">{item.period}</span>
                <span className="cell-badge">{item.level}</span>
                <span className="cell-detail">Wave: {item.waveExpected ?? '—'}m</span>
                <span className="cell-driver">{item.primaryRisk}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Progression */}
      <div className="timeline-progression-block">
        <div className="section-head-radar">
          <TrendingUp size={16} />
          <h3>{t('timeline', language)}</h3>
        </div>

        <div className="timeline-table-wrapper">
          <table className="orca-data-table">
            <thead>
              <tr>
                <th>OFFSET</th>
                <th>WAVE HEIGHT</th>
                <th>WIND VELOCITY</th>
                <th>SST</th>
                <th>MODELED RISK</th>
                <th>SUITABILITY</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((tp, idx) => (
                <tr key={idx} className={tp.offsetHours === 0 ? 'row-current' : ''}>
                  <td>
                    <strong>{tp.label}</strong>
                    {tp.offsetHours === 0 && <span className="now-pill">NOW</span>}
                  </td>
                  <td>{tp.waveHeight ?? '—'} m</td>
                  <td>{tp.windSpeed ?? '—'} km/h</td>
                  <td>{tp.sst ?? '—'} °C</td>
                  <td>
                    <span className={`table-risk-chip level-${tp.riskLevel.toLowerCase()}`}>
                      {tp.riskScore} ({tp.riskLevel})
                    </span>
                  </td>
                  <td>
                    <strong>{tp.suitabilityScore} / 100</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

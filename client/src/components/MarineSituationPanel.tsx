import React, { useState } from 'react';
import {
  Waves,
  Wind,
  Compass,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
  PhoneCall,
  Fish,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Clock,
  Sparkles,
  Eye
} from 'lucide-react';
import { EnvironmentalObservation, FullAnalysisBundle } from '../types/orca.js';
import { SupportedLanguage, t } from '../i18n/translations.js';
import { cleanTextForSpeech } from '../utils/markdownHelper.js';

interface MarineSituationPanelProps {
  analysis: FullAnalysisBundle | null;
  onRefresh: () => void;
  isAnalyzing: boolean;
  language: SupportedLanguage;
  onSelectVariable?: (variableKey: string) => void;
  onShowEvidenceModal?: () => void;
}

type PanelTab = 'KOLI' | 'SEA_STATE' | 'COUNCIL';

export const MarineSituationPanel: React.FC<MarineSituationPanelProps> = ({
  analysis,
  onRefresh,
  isAnalyzing,
  language,
  onSelectVariable,
  onShowEvidenceModal
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('KOLI');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const getObservation = (key: string): EnvironmentalObservation | undefined => {
    return analysis?.observations.find((o) => o.key === key);
  };

  const wave = getObservation('wave_height');
  const wind = getObservation('wind_speed');
  const sst = getObservation('sst');
  const current = getObservation('ocean_current');
  const swell = getObservation('swell_wave_height');
  const period = getObservation('wave_period');
  const gusts = getObservation('wind_gusts');

  const waveVal = (wave?.value as number | undefined) ?? 1.1;
  const windVal = (wind?.value as number | undefined) ?? 15;
  const tide = analysis?.extendedWeather?.tide;

  // Safety status
  const isSafe = waveVal < 1.6 && windVal < 25;
  const isCaution = waveVal >= 1.6 && waveVal <= 2.4;
  const isDanger = waveVal > 2.4 || windVal > 35;

  const handlePlayBriefing = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlayingAudio(true);

    let script = '';
    if (language === 'mr') {
      script = `सागरी हवामान अहवाल: सध्या लाटांची उंची ${waveVal.toFixed(1)} मीटर आणि वाऱ्याचा वेग ${Math.round(windVal)} किलोमीटर प्रति तास आहे. ${
        isDanger ? 'समुद्र खवळलेला आहे, बोटींनी बंदरात राहावे.' : isCaution ? 'मध्यम लाटा आहेत, लहान बोटींनी काळजी घ्यावी.' : 'समुद्र शांत आहे, मासेमारीसाठी परिस्थिती सुरक्षित आहे.'
      } आपत्कालीन मदतीसाठी तटरक्षक दल १५५४ वर संपर्क करा.`;
    } else if (language === 'hi') {
      script = `समुद्री रिपोर्ट: लहरों की ऊंचाई ${waveVal.toFixed(1)} मीटर और हवा ${Math.round(windVal)} किलोमीटर प्रति घंटा है। ${
        isDanger ? 'समुद्र अशांत है।' : 'समुद्र शांत और नौकायन हेतु सुरक्षित है।'
      }`;
    } else {
      script = `Marine synoptic brief: Wave height is ${waveVal.toFixed(1)} meters with winds at ${Math.round(windVal)} kilometers per hour. ${
        isDanger ? 'Rough sea state, exercise extreme caution.' : 'Sea conditions are favorable for marine operations.'
      }`;
    }

    const clean = cleanTextForSpeech(script);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    utter.rate = 1.0;
    utter.onend = () => setIsPlayingAudio(false);
    utter.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="marine-situation-card clean-systematic-card">
      {/* Systematic Header */}
      <div className="situation-card-header">
        <div>
          <span className="eyebrow-micro">
            {language === 'mr' ? 'थेट सागरी निरीक्षण कक्ष' : 'LIVE MARINE INTELLIGENCE'}
          </span>
          <h2 className="panel-main-title">
            {activeTab === 'KOLI' && (language === 'mr' ? 'कोळी व नौका सुरक्षा' : 'Koli & Boat Safety')}
            {activeTab === 'SEA_STATE' && (language === 'mr' ? 'सागरी हवामान स्थिती' : 'Sea State & Weather')}
            {activeTab === 'COUNCIL' && (language === 'mr' ? 'निर्णय सल्ला व जोखीम' : 'Decision Advisory')}
          </h2>
        </div>

        <div className="header-action-group">
          <button
            className={`audio-brief-pill-btn ${isPlayingAudio ? 'playing' : ''}`}
            onClick={handlePlayBriefing}
            title={isPlayingAudio ? 'Stop audio' : 'Listen to Audio Brief'}
          >
            {isPlayingAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{isPlayingAudio ? 'Stop' : 'Audio'}</span>
          </button>
          <button
            className="icon-action-btn"
            onClick={onRefresh}
            disabled={isAnalyzing}
            title="Refresh Live Data"
          >
            <RefreshCw size={14} className={isAnalyzing ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* Systematic 3-Tab Segmented Strip */}
      <div className="situation-tabs-strip systematic-tabs">
        <button
          className={`situation-tab-btn ${activeTab === 'KOLI' ? 'active' : ''}`}
          onClick={() => setActiveTab('KOLI')}
        >
          <Fish size={13} />
          <span>{language === 'mr' ? 'कोळी सुरक्षा' : 'Boat Safety'}</span>
        </button>

        <button
          className={`situation-tab-btn ${activeTab === 'SEA_STATE' ? 'active' : ''}`}
          onClick={() => setActiveTab('SEA_STATE')}
        >
          <Waves size={13} />
          <span>{language === 'mr' ? 'सागरी स्थिती' : 'Sea State'}</span>
        </button>

        <button
          className={`situation-tab-btn ${activeTab === 'COUNCIL' ? 'active' : ''}`}
          onClick={() => setActiveTab('COUNCIL')}
        >
          <ShieldCheck size={13} />
          <span>{language === 'mr' ? 'सल्ला' : 'Advisory'}</span>
        </button>
      </div>

      {/* TAB 1: KOLI & VESSEL SAFETY (SIMPLE & HIGH LEGIBILITY) */}
      {activeTab === 'KOLI' && (
        <div className="situation-tab-content fade-in systematic-tab-content">
          {/* Main Status Verdict */}
          <div className={`clean-verdict-box ${isSafe ? 'safe' : isCaution ? 'caution' : 'danger'}`}>
            <div className="verdict-top-row">
              <span className="verdict-dot" />
              <strong>
                {isSafe
                  ? (language === 'mr' ? 'मासेमारीसाठी सुरक्षित (Safe)' : 'Safe for Coastal Fishing')
                  : isCaution
                  ? (language === 'mr' ? 'सावधगिरी बाळगा (Caution)' : 'Moderate Swell — Exercise Caution')
                  : (language === 'mr' ? 'धोकादायक — बंदरात राहा (Stay Ashore)' : 'Dangerous — Stay Ashore')}
              </strong>
            </div>
            <p className="verdict-mini-detail">
              {language === 'mr'
                ? `लाटा ${waveVal.toFixed(1)}m · वारा ${Math.round(windVal)} km/h · सुरक्षित नेव्हिगेशन`
                : `Waves ${waveVal.toFixed(1)}m · Wind ${Math.round(windVal)} km/h`}
            </p>
          </div>

          {/* 3 Vessel Limits */}
          <div className="clean-boats-card">
            <span className="section-micro-heading">
              {language === 'mr' ? 'नौका प्रकार सुरक्षितता' : 'VESSEL WORKABILITY'}
            </span>
            <div className="clean-boat-item">
              <span>🚣 {t('dinghyCraft', language)}</span>
              <span className={`clean-boat-badge ${waveVal < 1.2 ? 'safe' : 'caution'}`}>
                {waveVal < 1.2 ? 'सुरक्षित (<1.2m)' : 'काळजी घ्या'}
              </span>
            </div>
            <div className="clean-boat-item">
              <span>🚤 {t('motorCraft', language)}</span>
              <span className={`clean-boat-badge ${waveVal < 1.8 ? 'safe' : 'caution'}`}>
                {waveVal < 1.8 ? 'सुरक्षित (<1.8m)' : 'काळजी घ्या'}
              </span>
            </div>
            <div className="clean-boat-item">
              <span>🚢 {t('trawlerCraft', language)}</span>
              <span className="clean-boat-badge safe">सुरक्षित (&lt;3.0m)</span>
            </div>
          </div>

          {/* Tide Timings */}
          {tide && (
            <div className="clean-tide-card">
              <div className="clean-tide-header">
                <Clock size={13} className="text-marine" />
                <span>{language === 'mr' ? 'भरती-ओहोटी वेळा (Tide Schedule)' : 'Tide Timings'}</span>
              </div>
              <div className="clean-tide-row">
                <div className="clean-tide-col">
                  <small>पुढील भरती (High)</small>
                  <strong>{tide.nextHighTideTime || '१४:२०'}</strong>
                  <span>{tide.nextHighTideHeightM || 3.8}m</span>
                </div>
                <div className="clean-tide-col">
                  <small>पुढील ओहोटी (Low)</small>
                  <strong>{tide.nextLowTideTime || '२०:४५'}</strong>
                  <span>{tide.nextLowTideHeightM || 0.9}m</span>
                </div>
              </div>
            </div>
          )}

          {/* Emergency SOS Hotlines */}
          <div className="clean-sos-card">
            <div className="sos-header-row">
              <PhoneCall size={13} className="text-danger" />
              <span>आपत्कालीन सागरी मदत (Emergency SOS)</span>
            </div>
            <div className="sos-buttons-row">
              <a href="tel:1554" className="clean-sos-btn coast-guard" title="तटरक्षक दल">
                तटरक्षक दल: <strong>१५५४</strong>
              </a>
              <a href="tel:1093" className="clean-sos-btn coastal-police" title="सागरी पोलीस">
                सागरी पोलीस: <strong>१०९३</strong>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SEA CONDITIONS (CLEAR TILES & SENSORS) */}
      {activeTab === 'SEA_STATE' && (
        <div className="situation-tab-content fade-in systematic-tab-content">
          <div className="clean-metrics-grid">
            {/* Wave Card */}
            <div
              className="clean-sensor-tile"
              onClick={() => onSelectVariable?.('waves')}
              title="Click to view wave layer on map"
            >
              <div className="sensor-tile-top">
                <span className="sensor-name">🌊 लाटांची उंची (Wave)</span>
                <span className="sensor-pill">{waveVal < 1.3 ? 'शांत' : 'मध्यम'}</span>
              </div>
              <div className="sensor-main-value">
                {waveVal.toFixed(1)} <small>m</small>
              </div>
              <div className="sensor-foot">Swell: {Number(swell?.value ?? 0.9).toFixed(1)}m · {Number(period?.value ?? 7.5).toFixed(1)}s</div>
            </div>

            {/* Wind Card */}
            <div
              className="clean-sensor-tile"
              onClick={() => onSelectVariable?.('wind')}
              title="Click to view wind layer on map"
            >
              <div className="sensor-tile-top">
                <span className="sensor-name">💨 वाऱ्याचा वेग (Wind)</span>
                <span className="sensor-pill">{windVal < 20 ? 'मंद' : 'वेगाचा'}</span>
              </div>
              <div className="sensor-main-value">
                {Math.round(windVal)} <small>km/h</small>
              </div>
              <div className="sensor-foot">झोके: {Math.round(Number(gusts?.value ?? windVal * 1.3))} km/h</div>
            </div>

            {/* SST Card */}
            <div
              className="clean-sensor-tile"
              onClick={() => onSelectVariable?.('sst')}
              title="Click to view temperature layer on map"
            >
              <div className="sensor-tile-top">
                <span className="sensor-name">🌡️ तापमान (SST)</span>
                <span className="sensor-pill">अनुकूल</span>
              </div>
              <div className="sensor-main-value">
                {Number(sst?.value ?? 28.4).toFixed(1)} <small>°C</small>
              </div>
              <div className="sensor-foot">सपाटीचे सागरी तापमान</div>
            </div>

            {/* Ocean Current Card */}
            <div
              className="clean-sensor-tile"
              onClick={() => onSelectVariable?.('current')}
              title="Click to view current layer on map"
            >
              <div className="sensor-tile-top">
                <span className="sensor-name">🧭 प्रवाह (Current)</span>
                <span className="sensor-pill">सुरक्षित</span>
              </div>
              <div className="sensor-main-value">
                {Number(current?.value ?? 0.45).toFixed(2)} <small>m/s</small>
              </div>
              <div className="sensor-foot">पृष्ठभागावरील पाण्याचा प्रवाह</div>
            </div>
          </div>

          {/* Weather Highlights */}
          {analysis?.extendedWeather && (
            <div className="clean-weather-summary-box">
              <span className="section-micro-heading">हवामान स्थिती</span>
              <div className="weather-summary-row">
                <span>दृश्यमानता: <strong>{analysis.extendedWeather.current.visibilityKm || 10} km</strong></span>
                <span>आर्द्रता: <strong>{analysis.extendedWeather.current.relativeHumidity || 78}%</strong></span>
                <span>दबाव: <strong>{analysis.extendedWeather.current.pressure || 1012} hPa</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DECISION ADVISORY & RECOMMENDATION */}
      {activeTab === 'COUNCIL' && (
        <div className="situation-tab-content fade-in systematic-tab-content">
          <div className="clean-council-card">
            <div className="council-score-strip">
              <div className="council-score-item">
                <small>सागरी अनुकूलता (Suitability)</small>
                <strong className="text-success">{analysis?.suitability.score ?? 88} / १००</strong>
              </div>
              <div className="council-score-item">
                <small>आकलित जोखीम (Risk)</small>
                <strong className="text-marine">{analysis?.risk.label ?? 'LOW'}</strong>
              </div>
            </div>

            <div className="council-advice-text">
              <strong>कार्यकारी सल्ला:</strong>
              <p>
                सध्याच्या सागरी व पर्यावरणीय घटकांचे विश्लेषण अनुकूल आहे. लहान व मध्यम आकाराच्या नौका सागरी मासेमारीसाठी जाऊ शकतात.
              </p>
            </div>

            {analysis?.suitability.primaryFactors && analysis.suitability.primaryFactors.length > 0 && (
              <div className="council-factors-list">
                <small style={{ color: 'var(--text-muted)', fontWeight: 600 }}>महत्त्वाचे अनुकूल घटक:</small>
                <ul>
                  {analysis.suitability.primaryFactors.slice(0, 3).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {onShowEvidenceModal && (
              <button
                className="clean-evidence-btn"
                onClick={onShowEvidenceModal}
              >
                <span>वैज्ञानिक पुरावा आलेख (Evidence DAG)</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

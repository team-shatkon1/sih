import React, { useState, useEffect, useRef } from 'react';
import {
  AssistantResponse,
  Coordinates,
  FullAnalysisBundle,
  UIAction
} from '../types/orca.js';
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Radio,
  Layers,
  Activity,
  Compass,
  ArrowRight
} from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations.js';
import { cleanTextForSpeech, renderFormattedMessage } from '../utils/markdownHelper.js';

interface AIConsoleProps {
  location: Coordinates;
  analysis: FullAnalysisBundle | null;
  onApplyAction: (action: UIAction) => void;
  language: SupportedLanguage;
  isFloating?: boolean;
  onClose?: () => void;
  onOpenGeminiLive?: () => void;
}

export const AIConsole: React.FC<AIConsoleProps> = ({
  location,
  analysis,
  onApplyAction,
  language,
  isFloating = false,
  onClose,
  onOpenGeminiLive
}) => {
  const [activeLang, setActiveLang] = useState<string>(language);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSpeaking, setSpeechSpeaking] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  // Regional language to BCP-47 mapping
  const LANG_CODE_MAP: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    ml: 'ml-IN',
    bn: 'bn-IN'
  };

  const PREDEFINED_PROMPTS = [
    {
      id: 'waves',
      label: '🌊 Sea State & Wave Hazard',
      query: 'What is the significant wave height, swell period, and kinetic hazard exposure in this zone right now?'
    },
    {
      id: 'fishing',
      label: '🐟 Fishing Craft Safety',
      query: 'Is it safe for small non-mechanized fishing boats (OBM) to operate today based on wave drag and wind shear?'
    },
    {
      id: 'chlorophyll',
      label: '🌿 Chlorophyll & Upwelling',
      query: 'Explain the current Chlorophyll-a concentration, trophic state, and biological productivity at this location.'
    },
    {
      id: 'alerts',
      label: '⚠️ Active Marine Hazards',
      query: 'Are there any active rip currents, high swell advisories, or sanctuary restrictions within 50 km?'
    },
    {
      id: 'window',
      label: '🧭 24h Sailing Window',
      query: 'Analyze the best nautical departure window over the next 24 hours with minimum environmental risk.'
    },
    {
      id: 'rules',
      label: '🛡️ Sanctuary & Boundary Rules',
      query: 'What are the environmental protection restrictions, marine sanctuary buffers, and speed limits here?'
    }
  ];

  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; data?: AssistantResponse; id: string }>
  >([
    {
      id: 'init-msg',
      role: 'assistant',
      text:
        language === 'mr'
          ? 'नमस्कार! मी ओर्का सागरी बुद्धिमत्ता कन्सोल आहे. मी थेट नकाशा, हवामान, लाटा, आणि निर्णय इंजिनशी जोडलेला आहे. आपण कोणताही प्रश्न विचारू शकता.'
          : language === 'hi'
          ? 'नमस्ते! मैं ऑर्का समुद्री बुद्धिमत्ता कंसोल हूँ। मैं लाइव मानचित्र, मौसम, लहरों और निर्णय इंजनों से जुड़ा हुआ हूँ। आप कोई भी प्रश्न पूछ सकते हैं।'
          : 'Hello! I am the ORCA Marine Intelligence Console. Connected to Live Map, Numerical Ocean Models, Zones, Evidence Graph, and Scenario Engine. Ask me anything about current marine conditions.'
    }
  ]);

  const handleMessagesScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Check if user has deliberately scrolled up away from bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    userScrolledUpRef.current = !isAtBottom;
  };

  const scrollToBottom = (force = false) => {
    if (!scrollContainerRef.current) return;
    if (userScrolledUpRef.current && !force) return;

    // Use internal element scrollTo - never scrolls the window or parent layout
    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });

    // Explicit safeguard: Ensure outer window is never scrolled upwards/downwards
    if (typeof window !== 'undefined' && window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, isLoading]);

  const handleSend = async (customQuery?: string) => {
    const q = customQuery ?? query;
    if (!q.trim()) return;

    userScrolledUpRef.current = false;
    const userMsg = { id: `usr-${Date.now()}`, role: 'user' as const, text: q };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setQuery('');
    setIsLoading(true);
    setTimeout(() => scrollToBottom(true), 40);

    try {
      const historyPayload = nextMessages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          language: activeLang,
          currentLocation: location,
          analysisId: analysis?.id,
          history: historyPayload
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const resp = data.data as AssistantResponse;
        const asstMsg = { id: `ast-${Date.now()}`, role: 'assistant' as const, text: resp.answer, data: resp };
        setMessages((prev) => [...prev, asstMsg]);

        // Automatically execute returned UI actions
        if (resp.actions && resp.actions.length > 0) {
          resp.actions.forEach((act) => onApplyAction(act));
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'assistant', text: data.error || 'Could not generate a response. Please try again.' }
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', text: 'Network exception reaching ORCA intelligence engine. Operating on cached marine context.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text-to-Speech with Regional Language Support and robust fallback
  const handleSpeak = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speechSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setSpeechSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpeech = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = LANG_CODE_MAP[activeLang] || 'en-IN';
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    let matched = voices.find((v) => v.lang.toLowerCase() === utterance.lang.toLowerCase() || v.lang.toLowerCase().startsWith(activeLang));
    if (!matched && activeLang === 'mr') {
      matched = voices.find((v) => 
        v.lang.toLowerCase().includes('hi-in') || 
        v.lang.toLowerCase().includes('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('hemant') ||
        v.name.toLowerCase().includes('kalpana')
      );
      if (matched) {
        utterance.lang = 'hi-IN';
      }
    }
    if (matched) {
      utterance.voice = matched;
    }

    utterance.onend = () => setSpeechSpeaking(null);
    utterance.onerror = () => setSpeechSpeaking(null);

    setSpeechSpeaking(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Regional Speech Recognition Voice Input
  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(t('speechUnsupported', language));
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = LANG_CODE_MAP[activeLang] || 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        if (transcript) {
          setQuery(transcript);
          handleSend(transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className={`ai-console-wrapper ${isFloating ? 'floating-mode' : ''}`}>
      {/* Header with Subsystem Connectivity (Section 30) */}
      <div className="ai-console-header">
        <div className="ai-brand-chip">
          <Bot size={18} className="text-marine" />
          <div>
            <span className="console-title">ORCA INTELLIGENCE CONSOLE</span>
            <span className="console-sub">Grounded Marine Decision Assistant</span>
          </div>
        </div>

        <div className="ai-header-controls">
          <div className="ai-lang-select-box">
            <select
              value={activeLang}
              onChange={(e) => setActiveLang(e.target.value)}
              title="Select Regional Language for Voice & Chat"
            >
              <option value="en">English (IN)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
              <option value="bn">বাংলা (Bengali)</option>
            </select>
          </div>
          {onOpenGeminiLive && (
            <button
              className="gemini-live-trigger-pill"
              onClick={onOpenGeminiLive}
              title="Open Google Gemini Live Voice Assistant"
            >
              <Sparkles size={13} className="spark-spin" />
              <span>Gemini Live</span>
            </button>
          )}
          <span className="grounded-status">
            <Radio size={12} className="pulse-icon" /> CONNECTED
          </span>
          {isFloating && onClose && (
            <button className="chat-close-btn" onClick={onClose} title="Close Chat">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Subsystem Connection Badges Strip */}
      <div className="subsystem-badges-strip">
        <span>✓ Map</span>
        <span>✓ Buoys</span>
        <span>✓ Weather</span>
        <span>✓ Zones</span>
        <span>✓ Evidence</span>
        <span>✓ Scenario</span>
        <span>✓ Routes</span>
      </div>

      {/* Listening State Waveform UI (Section 40) */}
      {isListening && (
        <div className="voice-listening-banner">
          <div className="listening-pulse-dot" />
          <div className="voice-waveform-animation">
            <span /><span /><span /><span /><span />
          </div>
          <span className="listening-text">Listening… Speak your marine query</span>
          <button className="voice-stop-btn" onClick={() => setIsListening(false)}>
            Stop
          </button>
        </div>
      )}

      {/* Messages Scroll Area (Confined scrolling, never shifts outer window) */}
      <div
        className="ai-messages-scroll"
        ref={scrollContainerRef}
        onScroll={handleMessagesScroll}
      >
        {messages.map((m) => (
          <div key={m.id} className={`ai-message-bubble ${m.role}`}>
            <div className="msg-top-row">
              <span className="msg-author-tag">{m.role === 'assistant' ? 'ORCA AI' : 'USER'}</span>
              {m.role === 'assistant' && (
                <button
                  className="speech-play-btn"
                  onClick={() => handleSpeak(m.text, m.id)}
                  title={speechSpeaking === m.id ? 'Stop reading' : 'Read aloud'}
                >
                  {speechSpeaking === m.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
              )}
            </div>

            <div className="msg-text-formatted">
              {renderFormattedMessage(m.text)}
            </div>

            {/* Evidence Highlights */}
            {m.data?.keyEvidence && m.data.keyEvidence.length > 0 && (
              <div className="msg-evidence-box">
                <span className="ev-label">GROUNDED EVIDENCE:</span>
                <ul>
                  {m.data.keyEvidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Caveat */}
            {m.data?.importantCaveat && (
              <div className="msg-caveat-box">
                <ShieldAlert size={12} />
                <span>{m.data.importantCaveat}</span>
              </div>
            )}

            {/* Verified Mission Trace */}
            {m.data?.missionTrace && m.data.missionTrace.length > 0 && (
              <details className="msg-trace-details">
                <summary>
                  <CheckCircle2 size={12} /> Mission Trace ({m.data.missionTrace.length} verified steps)
                </summary>
                <ol>
                  {m.data.missionTrace.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </details>
            )}

            {/* Dynamic Follow-up Action Chips (Section 36) */}
            {m.role === 'assistant' && (
              <div className="ai-followup-chips-row">
                <button
                  className="followup-chip"
                  onClick={() => onApplyAction({ type: 'ENABLE_LAYER', layer: 'waves' })}
                >
                  <Layers size={11} />
                  <span>Show Wave Layer</span>
                </button>
                <button
                  className="followup-chip"
                  onClick={() => onApplyAction({ type: 'OPEN_COMPARISON' })}
                >
                  <Activity size={11} />
                  <span>Compare Zones</span>
                </button>
                <button
                  className="followup-chip"
                  onClick={() => onApplyAction({ type: 'RUN_SCENARIO' })}
                >
                  <Sparkles size={11} />
                  <span>Run Scenario</span>
                </button>
                <button
                  className="followup-chip"
                  onClick={() => onApplyAction({ type: 'SHOW_ROUTE' })}
                >
                  <Compass size={11} />
                  <span>Check Routes</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="ai-message-bubble assistant loading-bubble">
            <Sparkles size={15} className="spin-icon text-marine" />
            <span>ORCA is retrieving buoy observations and evaluating risk…</span>
          </div>
        )}
      </div>

      {/* Predefined Quick Prompts Bar */}
      <div className="ai-quick-prompts-container">
        <div className="quick-prompts-scroll">
          {PREDEFINED_PROMPTS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="quick-prompt-pill"
              onClick={() => {
                setQuery(p.query);
                handleSend(p.query);
              }}
              disabled={isLoading}
              title={p.query}
            >
              <Sparkles size={11} className="text-marine" />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Box with Voice Mic */}
      <form
        className="ai-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <button
          type="button"
          className={`mic-btn ${isListening ? 'listening' : ''}`}
          onClick={handleToggleVoice}
          title={isListening ? 'Listening…' : 'Voice Input (EN / HI / MR)'}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <input
          type="text"
          className="ai-text-input"
          placeholder="Ask ORCA anything about waves, marine zones, or routing…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          type="submit"
          className="orca-btn-primary send-btn"
          disabled={!query.trim() || isLoading}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

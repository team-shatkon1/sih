import React, { useState, useEffect, useRef } from 'react';
import { Coordinates, FullAnalysisBundle, UIAction } from '../types/orca.js';
import { cleanTextForSpeech, renderFormattedMessage } from '../utils/markdownHelper.js';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Globe,
  ArrowRight,
  Square
} from 'lucide-react';

interface GeminiVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  location: Coordinates;
  analysis: FullAnalysisBundle | null;
  onApplyAction: (action: UIAction) => void;
  initialLanguage?: string;
}

type AssistantState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

const REGIONAL_LANGUAGES = [
  { code: 'en', bcp: 'en-IN', label: 'English (India)' },
  { code: 'hi', bcp: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'mr', bcp: 'mr-IN', label: 'मराठी (Marathi)' },
  { code: 'gu', bcp: 'gu-IN', label: 'ગુજરાતી (Gujarati)' },
  { code: 'ta', bcp: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'te', bcp: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'ml', bcp: 'ml-IN', label: 'മലയാളം (Malayalam)' },
  { code: 'bn', bcp: 'bn-IN', label: 'বাংলা (Bengali)' }
];

export const GeminiVoiceAssistant: React.FC<GeminiVoiceAssistantProps> = ({
  isOpen,
  onClose,
  location,
  analysis,
  onApplyAction,
  initialLanguage = 'en'
}) => {
  const [activeLang, setActiveLang] = useState<string>(initialLanguage);
  const [state, setState] = useState<AssistantState>('IDLE');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiResponseText, setAiResponseText] = useState<string>('');
  const [speechMuted, setSpeechMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('');

  const stateRef = useRef<AssistantState>('IDLE');
  const transcriptRef = useRef<string>('');
  const isProcessingRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeIntervalRef = useRef<any>(null);

  const currentLangMeta =
    REGIONAL_LANGUAGES.find((l) => l.code === activeLang) || REGIONAL_LANGUAGES[0];

  const updateState = (newState: AssistantState) => {
    stateRef.current = newState;
    setState(newState);
  };

  useEffect(() => {
    setActiveLang(initialLanguage);
  }, [initialLanguage]);

  useEffect(() => {
    if (isOpen) {
      // Clean greeting based on language
      setAiResponseText(
        activeLang === 'mr'
          ? 'नमस्कार! मी Google Gemini समर्थित ORCA सागरी व्हॉइस असिस्टंट आहे. समुद्राची परिस्थिती, लाटा किंवा मासेमारीबाबत कोणताही प्रश्न विचारा. खालील मायक्रोफोनवर टॅप करा किंवा प्रश्न टाइप करा.'
          : activeLang === 'hi'
          ? 'नमस्ते! मैं Google Gemini समर्थित ORCA समुद्री वॉयस असिस्टेंट हूँ। समुद्र की स्थिति, लहरों या मौसम के बारे में कुछ भी पूछें। नीचे माइक्रोफ़ोन पर टैप करें या अपना प्रश्न टाइप करें।'
          : 'Hello! I am the Google Gemini-powered ORCA Marine Voice Assistant. Tap the microphone or type below to ask about sea state, waves, chlorophyll, or safety.'
      );
      setErrorMessage(null);
      setUserTranscript('');
      updateState('IDLE');
    } else {
      stopAll();
    }
    return () => {
      stopAll();
    };
  }, [isOpen, activeLang]);

  const stopAll = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
    updateState('IDLE');
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Web Speech Recognition is not supported by your current browser. You can type your question in the box below.');
      return;
    }

    stopAll();
    setErrorMessage(null);
    setUserTranscript('');
    transcriptRef.current = '';
    isProcessingRef.current = false;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLangMeta.bcp;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        updateState('LISTENING');
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        const text = fullTranscript.trim();
        if (text) {
          setUserTranscript(text);
          transcriptRef.current = text;
        }

        const lastResult = event.results[event.results.length - 1];
        if (lastResult?.isFinal && text && !isProcessingRef.current) {
          isProcessingRef.current = true;
          try {
            recognition.stop();
          } catch {
            // Ignore
          }
          processVoiceQuery(text);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access was blocked by the browser. Please allow microphone permissions or type your question below.');
          } else {
            setErrorMessage(`Voice input notice: ${event.error}. You can also type below.`);
          }
        }
        updateState('IDLE');
      };

      recognition.onend = () => {
        if (stateRef.current === 'LISTENING') {
          if (transcriptRef.current.trim() && !isProcessingRef.current) {
            isProcessingRef.current = true;
            processVoiceQuery(transcriptRef.current.trim());
          } else {
            updateState('IDLE');
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setErrorMessage('Could not initialize microphone. Please check browser permissions or type your question below.');
      updateState('IDLE');
    }
  };

  const processVoiceQuery = async (queryText: string) => {
    if (!queryText.trim()) {
      updateState('IDLE');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    updateState('THINKING');
    setUserTranscript(queryText);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          language: activeLang,
          currentLocation: location,
          analysisId: analysis?.id
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const answer = data.data.answer || 'No response generated.';
        setAiResponseText(answer);

        // Execute any synthesized actions
        if (data.data.actions && data.data.actions.length > 0) {
          data.data.actions.forEach((act: UIAction) => onApplyAction(act));
        }

        // Speak aloud if audio is enabled
        if (!speechMuted) {
          speakResponse(answer);
        } else {
          updateState('IDLE');
        }
      } else {
        setAiResponseText('Could not retrieve intelligence. Please try speaking or typing again.');
        updateState('IDLE');
      }
    } catch {
      setAiResponseText('Network issue reaching ORCA intelligence engine. Operating on cached local context.');
      updateState('IDLE');
    }
  };

  const speakResponse = (text: string) => {
    if (!('speechSynthesis' in window)) {
      updateState('IDLE');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      updateState('SPEAKING');

      const cleanSpeech = cleanTextForSpeech(text);
      // Take first 3-4 sentences for voice output to keep speech crisp and responsive
      const sentences = cleanSpeech.split(/(?<=[.?!।\n])\s+/).filter(Boolean);
      const voiceSnippet = sentences.slice(0, 4).join(' ');

      const utterance = new SpeechSynthesisUtterance(voiceSnippet || cleanSpeech);
      utterance.lang = currentLangMeta.bcp;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Robust voice resolution: Handle lack of native Marathi voice on Windows
      const voices = window.speechSynthesis.getVoices();
      const targetBcp = currentLangMeta.bcp.toLowerCase();
      let matched = voices.find(
        (v) => v.lang.toLowerCase() === targetBcp || v.lang.toLowerCase().startsWith(currentLangMeta.code)
      );

      // If Marathi ('mr') has no native voice installed on user's OS,
      // fallback to Hindi ('hi-IN') which reads Devanagari script phonetically perfectly!
      if (!matched && currentLangMeta.code === 'mr') {
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

      // If still not matched, check for any Indian English voice
      if (!matched) {
        matched = voices.find((v) => v.lang.toLowerCase().includes('in'));
      }

      if (matched) {
        utterance.voice = matched;
      }

      utterance.onend = () => {
        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
        updateState('IDLE');
      };

      utterance.onerror = () => {
        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
        updateState('IDLE');
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      // Chrome Windows speech synthesis keep-alive
      if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = setInterval(() => {
        if (stateRef.current !== 'SPEAKING') {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
          return;
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 2500);
    } catch {
      updateState('IDLE');
    }
  };

  const handleInterruptSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
    updateState('IDLE');
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      const q = textInput.trim();
      setTextInput('');
      processVoiceQuery(q);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="gemini-voice-overlay">
      <div className="gemini-voice-modal">
        {/* Top Control Bar */}
        <div className="gemini-voice-topbar">
          <div className="gemini-branding">
            <div className="gemini-spark-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="gemini-title">GEMINI LIVE</span>
              <span className="gemini-sub">ORCA Marine Voice Intelligence</span>
            </div>
          </div>

          <div className="gemini-top-actions">
            {/* Regional Language Selector */}
            <div className="gemini-lang-pill">
              <Globe size={13} />
              <select
                value={activeLang}
                onChange={(e) => setActiveLang(e.target.value)}
                title="Select Regional Language"
              >
                {REGIONAL_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mute TTS Audio */}
            <button
              className={`gemini-action-btn ${speechMuted ? 'active' : ''}`}
              onClick={() => {
                const nextMute = !speechMuted;
                setSpeechMuted(nextMute);
                if (nextMute && state === 'SPEAKING') {
                  handleInterruptSpeaking();
                }
              }}
              title={speechMuted ? 'Unmute voice' : 'Mute voice audio'}
            >
              {speechMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            {/* Close Overlay */}
            <button className="gemini-action-btn close" onClick={onClose} title="Close Voice Mode">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Center Gemini Visualizer Stage */}
        <div className="gemini-visualizer-stage">
          <div
            className={`gemini-orb-wrapper clickable ${state.toLowerCase()}`}
            onClick={state === 'LISTENING' ? stopAll : startListening}
            title={state === 'LISTENING' ? 'Tap to Stop Listening' : 'Tap Orb to Speak'}
          >
            <div className="gemini-orb-core" />
            <div className="gemini-orb-ring ring-1" />
            <div className="gemini-orb-ring ring-2" />
            <div className="gemini-orb-ring ring-3" />
            <div className="gemini-waveform-bars">
              <span /><span /><span /><span /><span />
            </div>
          </div>

          {/* Status Chip */}
          <div className="gemini-status-pill">
            <span className={`status-dot ${state.toLowerCase()}`} />
            <span className="status-label">
              {state === 'LISTENING' && 'Listening to your voice…'}
              {state === 'THINKING' && 'Gemini is reasoning…'}
              {state === 'SPEAKING' && 'Gemini is speaking…'}
              {state === 'IDLE' && 'Ready — Tap orb or mic to speak'}
            </span>
          </div>

          {/* Live User Transcript */}
          {userTranscript && (
            <div className="gemini-user-speech-bubble">
              <span className="speech-quote">"{userTranscript}"</span>
            </div>
          )}

          {errorMessage && (
            <div className="gemini-error-toast">
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Response Scroll Card (Formatted, Zero Asterisks) */}
        <div className="gemini-response-card">
          <div className="gemini-response-scroll">
            {renderFormattedMessage(aiResponseText)}
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="gemini-chips-container">
          <button
            type="button"
            className="gemini-chip"
            onClick={() => processVoiceQuery(
              activeLang === 'mr'
                ? 'आज लहान बोटींसाठी समुद्रात जाणे सुरक्षित आहे का?'
                : activeLang === 'hi'
                ? 'क्या आज छोटी नौकाओं के लिए समुद्र में जाना सुरक्षित है?'
                : 'Is it safe for small fishing boats to sail today?'
            )}
            disabled={state === 'THINKING'}
          >
            🐟 {activeLang === 'mr' ? 'मासेमारी बोट सुरक्षा' : activeLang === 'hi' ? 'नौका सुरक्षा' : 'Fishing Boat Safety'}
          </button>
          <button
            type="button"
            className="gemini-chip"
            onClick={() => processVoiceQuery(
              activeLang === 'mr'
                ? 'सध्या क्लोरोफिल आणि फायटोप्लँक्टनची स्थिती काय आहे?'
                : activeLang === 'hi'
                ? 'वर्तमान में क्लोरोफिल और फाइटोप्लांकटन की स्थिति क्या है?'
                : 'Explain current Chlorophyll-a and phytoplankton bloom status.'
            )}
            disabled={state === 'THINKING'}
          >
            🌿 {activeLang === 'mr' ? 'क्लोरोफिल प्रमाण' : activeLang === 'hi' ? 'क्लोरोफिल स्थिति' : 'Chlorophyll Bloom'}
          </button>
          <button
            type="button"
            className="gemini-chip"
            onClick={() => processVoiceQuery(
              activeLang === 'mr'
                ? 'सध्या लाटांची उंची आणि धोका निर्देशांक किती आहे?'
                : activeLang === 'hi'
                ? 'वर्तमान में लहरों की ऊंचाई और जोखिम स्कोर कितना है?'
                : 'What is the wave height and swell risk right now?'
            )}
            disabled={state === 'THINKING'}
          >
            🌊 {activeLang === 'mr' ? 'लाटा व जोखीम' : activeLang === 'hi' ? 'लहरें व जोखिम' : 'Wave & Swell Risk'}
          </button>
        </div>

        {/* Text Input Fallback Bar */}
        <form onSubmit={handleTextSubmit} className="gemini-input-form">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              activeLang === 'mr'
                ? 'किंवा येथे प्रश्न टाइप करा...'
                : activeLang === 'hi'
                ? 'या यहाँ अपना समुद्री प्रश्न टाइप करें...'
                : 'Or type your question here...'
            }
            disabled={state === 'THINKING'}
          />
          <button
            type="submit"
            className="gemini-input-submit-btn"
            disabled={!textInput.trim() || state === 'THINKING'}
            title="Send Question"
          >
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Bottom Bar: Action Controls */}
        <div className="gemini-bottom-controls">
          {state === 'SPEAKING' ? (
            <button
              type="button"
              className="gemini-interrupt-btn"
              onClick={handleInterruptSpeaking}
            >
              <Square size={16} />
              <span>Stop Speaking</span>
            </button>
          ) : (
            <button
              type="button"
              className={`gemini-mic-hero-btn ${state === 'LISTENING' ? 'listening' : ''}`}
              onClick={state === 'LISTENING' ? stopAll : startListening}
              title={state === 'LISTENING' ? 'Stop Listening' : 'Tap to Speak'}
            >
              {state === 'LISTENING' ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

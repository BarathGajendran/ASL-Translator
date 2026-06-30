import React, { useState, useEffect } from 'react';
import { 
  Volume2, RotateCcw, Languages, Loader2, Copy, Check, 
  Download, Type, MessageSquare, Terminal, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PredictionCard = ({ 
  prediction, 
  resetSession, 
  selectSuggestion, 
  isConnected 
}) => {
  const { gesture, confidence, sentence, suggestions } = prediction;
  const [selectedLang, setSelectedLang] = useState('en');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // UI Customizations for readability
  const [copied, setCopied] = useState(false);
  const [textSize, setTextSize] = useState('text-xl'); // text-lg, text-xl, text-2xl, text-3xl, text-4xl
  const [subtitleMode, setSubtitleMode] = useState(false);
  const [actionLogs, setActionLogs] = useState([]);

  const confidencePercent = Math.round(confidence * 100);

  const getGestureDisplayName = (g) => {
    if (!g) return 'Waiting...';
    if (g === 'Waiting...') return 'Waiting...';
    if (g === 'space') return 'Space [ ]';
    if (g === 'delete') return 'Backspace [←]';
    return g.toUpperCase();
  };

  // 1. Live Action Logging
  useEffect(() => {
    if (gesture && gesture !== 'Waiting...') {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setActionLogs(prev => [
        { time, type: 'detect', msg: `Mesh Match: "${gesture.toUpperCase()}" (${confidencePercent}% conf)` },
        ...prev.slice(0, 3)
      ]);
    }
  }, [gesture, confidencePercent]);

  useEffect(() => {
    if (sentence) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setActionLogs(prev => [
        { time, type: 'confirm', msg: `Confirmed phrase: "${sentence}"` },
        ...prev.slice(0, 3)
      ]);
    }
  }, [sentence]);

  const handleSpeak = async (textToSpeak) => {
    if (!textToSpeak || isSpeaking) return;
    setIsSpeaking(true);
    
    // Log speech action
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionLogs(prev => [
      { time, type: 'speech', msg: `TTS Trigger: Vocalizing text in '${selectedLang}'` },
      ...prev.slice(0, 3)
    ]);

    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        const langMap = { 'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE' };
        utterance.lang = langMap[selectedLang] || 'en-US';
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn('SpeechSynthesis failed, falling back to API', err);
      }
    }

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, lang: selectedLang })
      });
      const data = await response.json();
      if (data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audio.play();
        audio.onended = () => setIsSpeaking(false);
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Error generating Speech: ', error);
      setIsSpeaking(false);
    }
  };

  // Copy to Clipboard Action
  const handleCopy = () => {
    if (!sentence) return;
    navigator.clipboard.writeText(sentence);
    setCopied(true);
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionLogs(prev => [
      { time, type: 'copy', msg: 'Copied sentence to clipboard.' },
      ...prev.slice(0, 3)
    ]);
    
    setTimeout(() => setCopied(false), 2000);
  };

  // Download plain text transcript
  const handleDownloadTxt = () => {
    if (!sentence) return;
    const element = document.createElement("a");
    const file = new Blob([`ASL Translation Transcript:\n\n${sentence}\n\nGenerated on: ${new Date().toLocaleString()}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `asl_translation_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    element.remove();

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionLogs(prev => [
      { time, type: 'download', msg: 'Downloaded plain-text file.' },
      ...prev.slice(0, 3)
    ]);
  };

  // Handle suggestion selected logs
  const handleSelectSuggestion = (sug) => {
    selectSuggestion(sug);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionLogs(prev => [
      { time, type: 'nlp', msg: `NLP Completion auto-injected: "${sug}"` },
      ...prev.slice(0, 3)
    ]);
  };

  // Font size cycles
  const textSizes = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'];
  const handleCycleTextSize = () => {
    const currentIndex = textSizes.indexOf(textSize);
    const nextIndex = (currentIndex + 1) % textSizes.length;
    setTextSize(textSizes[nextIndex]);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-card/30 p-6 shadow-glass flex flex-col justify-between h-full">
      {/* Background glow decorative bubble */}
      <div className="absolute -bottom-16 -right-16 -z-10 h-36 w-36 rounded-full bg-accent/10 blur-2xl"></div>

      <div>
        <div className="flex items-center justify-between mb-4 border-b border-dark-border/40 pb-3">
          <h3 className="text-lg font-semibold tracking-wide text-gray-100 flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-accent" />
            Live Translation Panel
          </h3>
          
          {/* Controls Bar for Everyone Else */}
          <div className="flex items-center gap-2">
            {/* Font size adjuster */}
            <button
              onClick={handleCycleTextSize}
              className="p-1.5 rounded-lg bg-dark-hover hover:bg-dark-border text-gray-400 hover:text-white border border-dark-border transition-all"
              title="Change Text Size"
            >
              <Type className="h-4 w-4" />
            </button>

            {/* Subtitle Presentation Mode */}
            <button
              onClick={() => setSubtitleMode(!subtitleMode)}
              className={`p-1.5 rounded-lg border transition-all ${
                subtitleMode 
                  ? 'bg-accent/20 border-accent text-accent-pink' 
                  : 'bg-dark-hover hover:bg-dark-border border-dark-border text-gray-400 hover:text-white'
              }`}
              title={subtitleMode ? "Disable Subtitles Overlay" : "Enable Subtitles Overlay"}
            >
              {subtitleMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>

            {/* Language Selector */}
            <select 
              value={selectedLang} 
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-dark-hover/80 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-dark-border focus:outline-none focus:border-primary"
            >
              <option value="en">English (US)</option>
              <option value="es">Español (ES)</option>
              <option value="fr">Français (FR)</option>
              <option value="de">Deutsch (DE)</option>
            </select>
          </div>
        </div>

        {/* Real-time active gesture display */}
        <div className="flex gap-4 items-center mb-6">
          <div className="flex-1 flex flex-col justify-center items-center h-28 rounded-xl bg-dark-bg/60 border border-dark-border/60 relative overflow-hidden">
            <span className="text-xs text-gray-500 uppercase tracking-widest absolute top-2">Current Sign</span>
            <AnimatePresence mode="wait">
              <motion.span 
                key={gesture}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-4xl font-bold tracking-tight text-white mt-2"
              >
                {getGestureDisplayName(gesture)}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center h-28 rounded-xl bg-dark-bg/60 border border-dark-border/60 relative p-4">
            <span className="text-xs text-gray-500 uppercase tracking-widest absolute top-2">Confidence</span>
            
            <span className="text-3xl font-bold text-primary-light mt-2">{confidencePercent}%</span>
            
            <div className="w-full bg-dark-border rounded-full h-2 mt-2">
              <div 
                className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, confidencePercent))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Real-time translated text block (with font-size configuration) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 uppercase tracking-widest font-medium flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Translated Sentence
            </label>
            {sentence && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 bg-dark-hover px-2 py-1 rounded border border-dark-border transition-all"
                  title="Copy to Clipboard"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 bg-dark-hover px-2 py-1 rounded border border-dark-border transition-all"
                  title="Download Plain-Text file"
                >
                  <Download className="h-3 w-3" />
                  TXT
                </button>
              </div>
            )}
          </div>
          <div className="relative rounded-xl border border-dark-border bg-black/40 p-4 min-h-[100px] max-h-[140px] overflow-y-auto transition-all">
            {sentence ? (
              <p className={`font-semibold leading-relaxed select-text transition-all duration-300 text-gray-100 ${textSize}`}>
                {sentence}
              </p>
            ) : (
              <p className="text-sm italic text-gray-500">Signs will translate into phrases here...</p>
            )}
          </div>
        </div>

        {/* Timeline Log Panel: "Read all actions easily" */}
        <div className="mb-5 rounded-xl border border-dark-border bg-dark-bg/40 p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2 border-b border-dark-border/40 pb-1">
            <Terminal className="h-3.5 w-3.5 text-primary-light" />
            Live Translation Action Feed
          </div>
          <div className="space-y-1.5 max-h-[90px] overflow-y-auto pr-1">
            {actionLogs.length > 0 ? (
              actionLogs.map((log, index) => (
                <div key={index} className="flex gap-2 text-[10px] font-mono leading-none items-center text-gray-400">
                  <span className="text-gray-600">[{log.time}]</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    log.type === 'confirm' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                    log.type === 'speech' ? 'bg-accent/15 text-accent-pink' :
                    log.type === 'nlp' ? 'bg-primary/10 text-primary-light' : 'bg-dark-hover text-gray-400'
                  }`}>
                    {log.type.toUpperCase()}
                  </span>
                  <span className="truncate text-gray-300 font-medium">{log.msg}</span>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-gray-600 italic">Waiting for gestures to trigger actions...</div>
            )}
          </div>
        </div>

        {/* Autocomplete Smart suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-5">
            <span className="text-xs text-gray-400 uppercase tracking-widest block mb-2 font-medium">Smart Suggestions</span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="inline-flex items-center gap-1 text-sm bg-primary/10 hover:bg-primary/20 text-primary-light border border-primary/25 rounded-lg px-3 py-1.5 transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-dark-border/40">
        <button
          onClick={() => handleSpeak(sentence)}
          disabled={!sentence || isSpeaking}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-pink disabled:bg-accent/40 disabled:text-gray-400 text-white py-3 font-semibold transition-all duration-300 shadow-[0_4px_12px_rgba(139,92,246,0.2)]"
        >
          {isSpeaking ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Speaking...
            </>
          ) : (
            <>
              <Volume2 className="h-5 w-5" />
              Speak Sentence
            </>
          )}
        </button>

        <button
          onClick={() => {
            resetSession();
            setActionLogs(prev => [
              { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'reset', msg: 'Session reset: text buffer cleared.' },
              ...prev.slice(0, 3)
            ]);
          }}
          disabled={!sentence}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-dark-hover border border-dark-border text-gray-400 hover:text-white px-4 py-3 font-medium transition-all duration-200"
          title="Reset Sentence"
        >
          <RotateCcw className="h-5 w-5" />
          Clear Text
        </button>
      </div>

      {/* Presentation/Subtitle Mode Overlay */}
      <AnimatePresence>
        {subtitleMode && sentence && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-5xl px-6 pointer-events-none"
          >
            <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl py-6 px-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
              <span className="text-[10px] text-accent-pink uppercase font-bold tracking-widest block mb-2 pointer-events-auto">Live Captions Mode</span>
              <p className="text-3xl md:text-5xl font-extrabold tracking-normal text-white leading-relaxed select-none">
                {sentence}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PredictionCard;

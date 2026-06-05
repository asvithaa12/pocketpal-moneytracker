import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { parseVoiceTranscript } from '../services/voiceParser';

export default function VoiceButton({ onResult, onError }) {
  const [state, setState] = useState('idle'); // idle | listening | processing
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const stateRef = useRef('idle'); // tracks state without closure staleness

  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const updateState = (s) => {
    stateRef.current = s;
    setState(s);
  };

  const startListening = useCallback(async () => {
    if (!isSupported) {
      onError?.('Voice input works best on Chrome');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => updateState('listening');
    recognition.onend = () => {
      // Use ref to avoid stale closure — only reset if still in listening state
      if (stateRef.current === 'listening') updateState('idle');
    };
    recognition.onerror = (e) => {
      updateState('idle');
      onError?.(`Mic error: ${e.error}`);
    };
    recognition.onresult = async (e) => {
      const raw = e.results[0][0].transcript;
      setTranscript(raw);
      updateState('processing');
      try {
        const result = await parseVoiceTranscript(raw);
        updateState('idle');
        if (result.error) {
          onResult?.({ raw, error: result.error });
        } else {
          onResult?.({ raw, parsed: result.parsed });
        }
      } catch (err) {
        updateState('idle');
        onResult?.({ raw, error: err.message || 'Parsing failed' });
      }
    };

    updateState('listening');
    recognition.start();
  }, [isSupported, onResult, onError]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    updateState('idle');
  };

  if (!isSupported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-btn p-3 text-sm text-amber-800 flex items-center gap-2">
        <MicOff size={16} />
        Voice input works best on Chrome or Edge
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={state === 'listening' ? stopListening : startListening}
        disabled={state === 'processing'}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-offset-2 ${
          state === 'listening'
            ? 'bg-red-500 mic-pulse text-white hover:bg-red-600 shadow-[0_8px_16px_rgba(239,68,68,0.3)] hover:shadow-[0_12px_24px_rgba(239,68,68,0.4)] focus:ring-red-300'
            : state === 'processing'
            ? 'bg-slate-200 text-slate-400'
            : 'bg-[#556B2F] text-white hover:bg-[#3D4A20] active:scale-95 shadow-[0_8px_16px_rgba(85,107,47,0.2)] hover:shadow-[0_12px_24px_rgba(85,107,47,0.3)] focus:ring-[#556B2F] focus:ring-opacity-30'
        }`}
        aria-label={state === 'listening' ? 'Stop recording' : 'Start voice input'}
      >
        {state === 'processing' ? (
          <Loader2 size={24} className="animate-spin" />
        ) : state === 'listening' ? (
          <MicOff size={24} />
        ) : (
          <Mic size={24} />
        )}
      </button>
      {state === 'listening' && (
        <p className="text-sm text-red-500 font-medium animate-pulse">Listening… tap to stop</p>
      )}
      {state === 'processing' && (
        <p className="text-sm text-slate-500">Processing with AI…</p>
      )}
      {transcript && state === 'idle' && (
        <p className="text-xs text-slate-400 italic text-center px-4">"{transcript}"</p>
      )}
    </div>
  );
}

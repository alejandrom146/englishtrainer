"use client";

import { useState } from "react";

function getSpeechRecognition(): { new (): SpeechRecognitionInstance } | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Textarea + botón de micrófono opcional. El mismo patrón que ya se usa en
 * Connector Challenge, extraído acá para reutilizarlo en Retell sin
 * duplicar la lógica de reconocimiento de voz.
 */
export function SpeechInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}) {
  const [listening, setListening] = useState(false);
  const [speechSupported] = useState(() => !!getSpeechRecognition());

  function toggleListening() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    if (listening) {
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-GB";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript;
      }
      onChange(value ? `${value} ${finalText}` : finalText);
    };

    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          placeholder ?? (speechSupported ? "Habla o escribe…" : "Escribe…")
        }
        rows={4}
        className="w-full rounded-card border border-ink-700 bg-ink-900 p-3 text-base text-mist-50 outline-none focus-visible:border-amber-400"
      />

      {speechSupported && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={toggleListening}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
              listening ? "bg-coral-400 text-ink-950" : "bg-amber-400 text-ink-950"
            }`}
            aria-label={listening ? "Detener grabación" : "Hablar"}
          >
            ●
          </button>
          <span className="text-xs text-mist-400">
            {listening ? "Escuchando… toca para detener" : "Toca para hablar"}
          </span>
        </div>
      )}
    </div>
  );
}

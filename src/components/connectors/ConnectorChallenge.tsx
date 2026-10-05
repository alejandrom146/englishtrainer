"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ConnectorPrompt {
  id: string;
  prompt_text: string;
}

interface AnalysisResult {
  connectors_used: { text: string; correct: boolean; natural: boolean }[];
  connectors_missed: { suggested: string; why: string }[];
  naturalness_score: number;
  overall_feedback: string;
}

// El reconocimiento de voz del navegador (Web Speech API) es gratuito y no
// pasa por nuestro backend — solo funciona bien en Chrome/Edge. Si el
// navegador no lo soporta, el usuario simplemente escribe su respuesta.
function getSpeechRecognition(): { new (): SpeechRecognitionInstance } | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function ConnectorChallenge({ prompt }: { prompt: ConnectorPrompt }) {
  const [responseText, setResponseText] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
  }, []);

  function toggleListening() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    if (listening) {
      recognitionRef.current?.stop();
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
      setResponseText((prev) => (prev ? `${prev} ${finalText}` : finalText));
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleSubmit() {
    setLoading(true);
    setResult(null);
    setError(null);

    const res = await fetch("/api/connectors/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_id: prompt.id, response_text: responseText }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.analysis) {
      setResult(data.analysis);
    } else {
      setError(data.error ?? "Algo salió mal. Intenta de nuevo.");
    }
  }

  function handleTryAnother() {
    setResponseText("");
    setResult(null);
    // El padre (page.tsx) se encarga de pedir un nuevo prompt.
    window.location.reload();
  }

  return (
    <Card className="mx-auto max-w-lg">
      <p className="text-xs uppercase tracking-wide text-mist-400">
        Connector Challenge
      </p>
      <p className="mt-3 text-lg text-mist-50">{prompt.prompt_text}</p>

      {!result && (
        <>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder={
              speechSupported
                ? "Habla o escribe tu respuesta aquí…"
                : "Escribe tu respuesta aquí…"
            }
            rows={4}
            className="mt-4 w-full rounded-card border border-ink-700 bg-ink-900 p-3 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />

          <div className="mt-3 flex items-center gap-3">
            {speechSupported && (
              <button
                onClick={toggleListening}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                  listening
                    ? "bg-coral-400 text-ink-950"
                    : "bg-amber-400 text-ink-950"
                }`}
                aria-label={listening ? "Detener grabación" : "Hablar"}
              >
                ●
              </button>
            )}
            <span className="text-xs text-mist-400">
              {listening ? "Escuchando… toca para detener" : "Toca para hablar"}
            </span>
          </div>

          {error && <p className="mt-3 text-sm text-coral-400">{error}</p>}

          <Button
            className="mt-5 w-full"
            disabled={loading || !responseText.trim()}
            onClick={handleSubmit}
          >
            {loading ? "Analizando…" : "Enviar respuesta"}
          </Button>
        </>
      )}

      {result && (
        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="text-xs text-mist-400">NATURALNESS SCORE</p>
            <p className="text-2xl font-semibold text-teal-400">
              {Math.round(result.naturalness_score)}
            </p>
          </div>

          {result.connectors_used.length > 0 && (
            <div>
              <p className="text-xs text-mist-400">CONECTORES USADOS</p>
              <ul className="mt-1 flex flex-col gap-1">
                {result.connectors_used.map((c, i) => (
                  <li key={i} className="text-sm text-mist-200">
                    <span
                      className={
                        c.correct && c.natural
                          ? "text-teal-400"
                          : "text-coral-400"
                      }
                    >
                      {c.text}
                    </span>{" "}
                    {c.correct && c.natural
                      ? "— usado correctamente"
                      : "— revisar uso"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.connectors_missed.length > 0 && (
            <div>
              <p className="text-xs text-mist-400">PODRÍAS HABER USADO</p>
              <ul className="mt-1 flex flex-col gap-1">
                {result.connectors_missed.map((c, i) => (
                  <li key={i} className="text-sm text-mist-200">
                    <span className="text-amber-400">{c.suggested}</span> —{" "}
                    {c.why}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs text-mist-400">FEEDBACK</p>
            <p className="mt-1 text-sm text-mist-200">
              {result.overall_feedback}
            </p>
          </div>

          <Button className="mt-2 w-full" onClick={handleTryAnother}>
            Probar otra pregunta
          </Button>
        </div>
      )}
    </Card>
  );
}

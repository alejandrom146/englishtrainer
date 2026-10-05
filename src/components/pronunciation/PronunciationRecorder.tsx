"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { blobToWavBase64 } from "@/lib/audio/wav";
import { getBestEnglishVoice } from "@/lib/audio/selectVoice";

export interface PronunciationCardData {
  id: string; // user_vocabulary.id
  state: string;
  vocabulary: {
    word: string;
    ipa: string | null;
    definition: string;
    audio_url: string | null;
  };
}

interface AnalysisResult {
  transcript_guess: string;
  score: number;
  feedback: string;
  problem_sounds: string[];
}

async function speak(text: string, audioUrl?: string | null) {
  if (typeof window === "undefined") return;

  // Si hay un audio real pre-generado (Gemini TTS) para esta palabra, se
  // usa ese — mucho más natural que la síntesis del navegador.
  if (audioUrl) {
    new Audio(audioUrl).play().catch(() => {
      /* si falla la reproducción del archivo, no rompe la pantalla */
    });
    return;
  }

  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = await getBestEnglishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-GB";
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function PronunciationRecorder({
  card,
  onNext,
}: {
  card: PronunciationCardData;
  onNext: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setMicError(null);
    setResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        await submitRecording(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setMicError(
        "No se pudo acceder al micrófono. Revisa los permisos del navegador."
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function submitRecording(blob: Blob) {
    setAnalyzing(true);
    try {
      const audioBase64 = await blobToWavBase64(blob);
      const res = await fetch("/api/pronunciation/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_vocabulary_id: card.id,
          audio_base64: audioBase64,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setResult(data.analysis);
      } else {
        setMicError(data.error ?? "No se pudo analizar tu pronunciación. Intenta de nuevo.");
      }
    } catch {
      setMicError("No se pudo procesar el audio. Intenta de nuevo.");
    }
    setAnalyzing(false);
  }

  return (
    <Card className="mx-auto max-w-md">
      <p className="text-xs uppercase tracking-wide text-mist-400">
        Pronunciation Lab
      </p>

      <h2 className="mt-3 text-3xl font-semibold text-mist-50">
        {card.vocabulary.word}
      </h2>
      {card.vocabulary.ipa && (
        <p className="mt-1 text-sm text-teal-400">/{card.vocabulary.ipa}/</p>
      )}
      <p className="mt-2 text-sm text-mist-400">{card.vocabulary.definition}</p>

      <button
        onClick={() => speak(card.vocabulary.word, card.vocabulary.audio_url)}
        className="mt-3 text-xs text-amber-400 underline"
      >
        🔊 Escuchar pronunciación de referencia
      </button>

      {!result && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={analyzing}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl transition-colors ${
              recording ? "bg-coral-400" : "bg-amber-400"
            } text-ink-950`}
          >
            🎙️
          </button>
          <p className="text-xs text-mist-400">
            {analyzing
              ? "Analizando…"
              : recording
              ? "Grabando… toca para detener"
              : "Toca para grabar tu intento"}
          </p>
          {micError && <p className="text-xs text-coral-400">{micError}</p>}
        </div>
      )}

      {result && (
        <div className="mt-6 flex flex-col gap-4">
          <div>
            <p className="text-xs text-mist-400">
              SCORE (estimado, no una medición exacta)
            </p>
            <p className="text-3xl font-semibold text-teal-400">
              {Math.round(result.score)}
            </p>
          </div>

          <p className="text-sm text-mist-200">{result.feedback}</p>

          {result.problem_sounds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.problem_sounds.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full bg-ink-900 px-3 py-1 text-xs text-coral-400"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-mist-400">
            Se escuchó: <span className="italic">“{result.transcript_guess}”</span>
          </p>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null);
              }}
            >
              Repetir
            </Button>
            <Button className="flex-1" onClick={onNext}>
              Siguiente palabra
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

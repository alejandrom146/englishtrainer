"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AudioControls } from "@/components/listening/AudioControls";
import type { WordDiffItem } from "@/lib/listening/dictationDiff";

export interface DictationExerciseData {
  id: string;
  audio_url: string | null;
  title: string;
  transcript: string; // la frase objetivo
  cefr_level: string | null;
}

interface DictationResultData {
  wordDiff: WordDiffItem[];
  listeningAccuracy: number;
  wordAccuracy: number;
  criticalErrors: number;
  minorErrors: number;
}

const ERROR_LABEL: Record<string, string> = {
  OMITTED_WORD: "Falta esta palabra",
  WRONG_WORD: "Palabra distinta",
  EXTRA_WORD: "Palabra de más",
  WRONG_TENSE: "Tiempo verbal",
  WRONG_PLURAL: "Singular/plural",
  WRONG_PREPOSITION: "Preposición",
  WRONG_ARTICLE: "Artículo",
  MISHEARD_CONTRACTION: "Contracción no reconocida",
  MISHEARD_SOUND: "Sonido confundido",
  SPELLING_ERROR: "Error de ortografía (la reconociste bien)",
};

export function DictationExercise({
  exercise,
  onNext,
}: {
  exercise: DictationExerciseData;
  onNext: () => void;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [audioState, setAudioState] = useState({ playCount: 0, speed: 1 });
  const [responseText, setResponseText] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DictationResultData | null>(null);

  async function handleCheck() {
    if (!responseText.trim()) return;
    setChecking(true);

    const res = await fetch("/api/listening/dictation/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_id: exercise.id,
        response_text: responseText,
        replays: audioState.playCount,
        speed_used: audioState.speed,
      }),
    });
    const data = await res.json();
    setChecking(false);

    if (data.result) setResult(data.result);
  }

  if (result) {
    return (
      <Card className="mx-auto max-w-lg">
        <p className="text-xs uppercase tracking-wide text-mist-400">
          Listening Accuracy
        </p>
        <p className="text-3xl font-semibold text-teal-400">
          {Math.round(result.listeningAccuracy)}
        </p>
        <p className="text-xs text-mist-400">
          Word accuracy: {Math.round(result.wordAccuracy)}% · {result.criticalErrors}{" "}
          error(es) importante(s) · {result.minorErrors} menor(es)
        </p>

        <div className="mt-4">
          <p className="text-xs text-mist-400">ORIGINAL</p>
          <p className="mt-1 text-sm text-mist-200">{exercise.transcript}</p>
        </div>

        <div className="mt-4">
          <p className="text-xs text-mist-400">YOUR ANSWER</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.wordDiff.map((w, i) => (
              <span
                key={i}
                className={`rounded px-1.5 py-0.5 text-sm ${
                  w.status === "correct"
                    ? "text-mist-200"
                    : "bg-coral-400/20 text-coral-400"
                }`}
                title={w.type ? ERROR_LABEL[w.type] : undefined}
              >
                {w.word}
                {w.status === "correct" ? " ✓" : " ❌"}
              </span>
            ))}
          </div>
        </div>

        {result.wordDiff.some((w) => w.status === "error") && (
          <div className="mt-4">
            <p className="text-xs text-mist-400">DETALLE</p>
            <ul className="mt-1 flex flex-col gap-1">
              {result.wordDiff
                .filter((w) => w.status === "error")
                .map((w, i) => (
                  <li key={i} className="text-sm text-mist-200">
                    <span className="text-coral-400">{w.word}</span> —{" "}
                    {w.type ? ERROR_LABEL[w.type] : ""}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <Button className="mt-5 w-full" onClick={onNext}>
          Siguiente frase
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <p className="text-xs uppercase tracking-wide text-mist-400">
        🎧 Write what you hear
      </p>
      {exercise.cefr_level && (
        <p className="text-xs text-mist-400">{exercise.cefr_level}</p>
      )}

      <div className="mt-6">
        <AudioControls
          segments={[{ text: exercise.transcript }]}
          audioUrl={exercise.audio_url}
          onFirstPlay={() => setHasPlayed(true)}
          onStateChange={setAudioState}
        />
      </div>

      {hasPlayed && (
        <div className="mt-6">
          <input
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCheck();
            }}
            placeholder="Escribe exactamente lo que escuchaste…"
            className="w-full rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />
          <Button
            className="mt-3 w-full"
            disabled={checking || !responseText.trim()}
            onClick={handleCheck}
          >
            {checking ? "Comprobando…" : "Comprobar"}
          </Button>
        </div>
      )}
    </Card>
  );
}

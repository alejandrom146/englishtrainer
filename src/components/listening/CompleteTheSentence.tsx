"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AudioControls } from "@/components/listening/AudioControls";
import type { WordDiffItem } from "@/lib/listening/dictationDiff";

export interface CompleteSentenceExerciseData {
  id: string;
  audio_url: string | null;
  cefr_level: string | null;
  transcript: string;
  prompt_prefix: string;
}

interface CompleteSentenceResultData {
  wordDiff: WordDiffItem[];
  listeningAccuracy: number;
  wordAccuracy: number;
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

export function CompleteTheSentence({
  exercise,
  onNext,
}: {
  exercise: CompleteSentenceExerciseData;
  onNext: () => void;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [audioState, setAudioState] = useState({ playCount: 0, speed: 1 });
  const [completion, setCompletion] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CompleteSentenceResultData | null>(null);

  async function handleCheck() {
    if (!completion.trim()) return;
    setChecking(true);

    const res = await fetch("/api/listening/complete-sentence/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_id: exercise.id,
        completion_text: completion,
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

        <div className="mt-4">
          <p className="text-xs text-mist-400">ORIGINAL</p>
          <p className="mt-1 text-sm text-mist-200">{exercise.transcript}</p>
        </div>

        <div className="mt-4">
          <p className="text-xs text-mist-400">TU RESPUESTA</p>
          <p className="mt-1 text-sm text-mist-400">
            <span className="text-mist-500">{exercise.prompt_prefix} </span>
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
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

        <Button className="mt-5 w-full" onClick={onNext}>
          Siguiente ejercicio
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <p className="text-xs uppercase tracking-wide text-mist-400">
        🎧 Complete the Sentence
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
          <p className="text-sm text-mist-50">
            {exercise.prompt_prefix}{" "}
            <span className="text-mist-400">…</span>
          </p>
          <input
            value={completion}
            onChange={(e) => setCompletion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCheck();
            }}
            placeholder="Completa lo que escuchaste…"
            className="mt-3 w-full rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />
          <Button
            className="mt-3 w-full"
            disabled={checking || !completion.trim()}
            onClick={handleCheck}
          >
            {checking ? "Comprobando…" : "Comprobar"}
          </Button>
        </div>
      )}
    </Card>
  );
}

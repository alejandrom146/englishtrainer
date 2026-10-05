"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AudioControls } from "@/components/listening/AudioControls";

export interface FillGapsExerciseData {
  id: string;
  audio_url: string | null;
  title: string;
  cefr_level: string | null;
  transcript: string; // se reproduce completa, aunque en pantalla se vean los huecos
  gap_template: string; // "I'll check that for you and ___ back to you shortly."
}

interface GapResult {
  given: string;
  correct: string;
  isCorrect: boolean;
}

export function FillTheGaps({
  exercise,
  onNext,
}: {
  exercise: FillGapsExerciseData;
  onNext: () => void;
}) {
  const parts = exercise.gap_template.split("___");
  const gapCount = parts.length - 1;

  const [hasPlayed, setHasPlayed] = useState(false);
  const [audioState, setAudioState] = useState({ playCount: 0, speed: 1 });
  const [answers, setAnswers] = useState<string[]>(() => Array(gapCount).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<GapResult[] | null>(null);
  const [score, setScore] = useState(0);

  const allFilled = answers.every((a) => a.trim().length > 0);

  async function handleSubmit() {
    if (!allFilled) return;
    setSubmitting(true);

    const res = await fetch("/api/listening/fill-gaps/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_id: exercise.id,
        answers,
        replays: audioState.playCount,
        speed_used: audioState.speed,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.results) {
      setResults(data.results);
      setScore(data.score);
    }
  }

  if (results) {
    return (
      <Card className="mx-auto max-w-lg">
        <p className="text-xs uppercase tracking-wide text-mist-400">Score</p>
        <p className="text-3xl font-semibold text-teal-400">
          {Math.round(score)}%
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {results.map((r, i) => (
            <p key={i} className="text-sm">
              <span className={r.isCorrect ? "text-teal-400" : "text-coral-400"}>
                {r.isCorrect ? "✓" : "❌"} {r.given || "(vacío)"}
              </span>
              {!r.isCorrect && (
                <span className="text-mist-400"> — correcta: {r.correct}</span>
              )}
            </p>
          ))}
        </div>

        <Button className="mt-6 w-full" onClick={onNext}>
          Siguiente ejercicio
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <p className="text-xs uppercase tracking-wide text-mist-400">
        🎧 Fill the Gaps
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
          <p className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm leading-relaxed text-mist-50">
            {parts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <span>{part}</span>
                {i < gapCount && (
                  <input
                    value={answers[i]}
                    onChange={(e) =>
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    className="w-24 rounded-card border border-ink-700 bg-ink-900 px-2 py-1 text-center text-base text-mist-50 outline-none focus-visible:border-amber-400"
                  />
                )}
              </span>
            ))}
          </p>

          <Button
            className="mt-5 w-full"
            disabled={submitting || !allFilled}
            onClick={handleSubmit}
          >
            {submitting ? "Comprobando…" : "Comprobar"}
          </Button>
        </div>
      )}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AudioControls } from "@/components/listening/AudioControls";

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

export interface MultipleChoiceExerciseData {
  id: string;
  audio_url: string | null;
  title: string;
  topic: string | null;
  cefr_level: string | null;
  duration_category: string | null;
  speakers: { speaker: string; text: string }[];
  questions: Question[];
}

interface QuestionResult {
  question: string;
  options: string[];
  correct_index: number;
  selected: number | null;
  correct: boolean;
  explanation: string | null;
}

export function MultipleChoiceListening({
  exercise,
  instruction,
  onNext,
}: {
  exercise: MultipleChoiceExerciseData;
  /** "Listen & Understand" hace preguntas de detalle; "Main Idea" pregunta la idea general — mismo componente, distinta consigna. */
  instruction: string;
  onNext: () => void;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [audioState, setAudioState] = useState({ playCount: 0, speed: 1 });
  const [selected, setSelected] = useState<(number | null)[]>(
    () => exercise.questions.map(() => null)
  );
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<QuestionResult[] | null>(null);
  const [score, setScore] = useState(0);

  const allAnswered = selected.every((s) => s !== null);

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);

    const res = await fetch("/api/listening/multiple-choice/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_id: exercise.id,
        answers: selected,
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

        <div className="mt-5 flex flex-col gap-4">
          {results.map((r, i) => (
            <div key={i}>
              <p className="text-sm text-mist-200">{r.question}</p>
              <p
                className={`mt-1 text-sm ${
                  r.correct ? "text-teal-400" : "text-coral-400"
                }`}
              >
                {r.correct ? "✓" : "❌"} Tu respuesta:{" "}
                {r.selected !== null ? r.options[r.selected] : "—"}
              </p>
              {!r.correct && (
                <p className="text-sm text-mist-400">
                  Correcta: {r.options[r.correct_index]}
                </p>
              )}
              {r.explanation && (
                <p className="mt-1 text-xs text-mist-400">{r.explanation}</p>
              )}
            </div>
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
        🎧 Listening
      </p>
      <div className="mt-1 flex gap-3 text-xs text-mist-400">
        {exercise.cefr_level && <span>{exercise.cefr_level}</span>}
        {exercise.topic && <span>{exercise.topic}</span>}
        {exercise.duration_category && <span>{exercise.duration_category}</span>}
      </div>

      <div className="mt-6">
        <AudioControls
          segments={exercise.speakers.map((l) => ({ text: l.text, speaker: l.speaker }))}
          audioUrl={exercise.audio_url}
          onFirstPlay={() => setHasPlayed(true)}
          onStateChange={setAudioState}
        />
      </div>

      {hasPlayed && (
        <div className="mt-6 flex flex-col gap-5">
          <p className="text-sm text-mist-200">{instruction}</p>
          {exercise.questions.map((q, qi) => (
            <div key={qi}>
              <p className="text-sm text-mist-50">{q.question}</p>
              <div className="mt-2 flex flex-col gap-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() =>
                      setSelected((prev) => {
                        const next = [...prev];
                        next[qi] = oi;
                        return next;
                      })
                    }
                    className={`rounded-card border px-3 py-2.5 text-left text-sm transition-colors ${
                      selected[qi] === oi
                        ? "border-amber-400 bg-ink-900 text-mist-50"
                        : "border-ink-700 text-mist-200"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Button disabled={submitting || !allAnswered} onClick={handleSubmit}>
            {submitting ? "Comprobando…" : "Comprobar"}
          </Button>
        </div>
      )}
    </Card>
  );
}

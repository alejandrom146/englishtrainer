"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AudioControls } from "@/components/listening/AudioControls";
import { SpeechInput } from "@/components/shared/SpeechInput";
import { difficultyNote, type DetectedDifficulty } from "@/lib/listening/patterns";

export interface ConversationExercise {
  id: string;
  audio_url: string | null;
  title: string;
  topic: string | null;
  cefr_level: string | null;
  duration_category: string | null;
  speakers: { speaker: string; text: string }[];
}

interface AnalysisResult {
  main_idea_score: number;
  details_score: number;
  overall_score: number;
  understood: string[];
  missed: string[];
  confused: string[];
}

export function ConversationListening({
  exercise,
  onNext,
}: {
  exercise: ConversationExercise;
  onNext: () => void;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [audioState, setAudioState] = useState({ playCount: 0, speed: 1 });
  const [responseText, setResponseText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [transcriptRevealed, setTranscriptRevealed] = useState(false);
  const [difficulties, setDifficulties] = useState<DetectedDifficulty[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (!responseText.trim()) return;
    setAnalyzing(true);
    setError(null);

    const res = await fetch("/api/listening/conversation/analyze", {
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
    setAnalyzing(false);

    if (data.analysis) {
      setResult(data.analysis);
      setDifficulties(data.detectedDifficulties ?? []);
    } else {
      setError(data.error ?? "No se pudo analizar tu respuesta. Intenta de nuevo.");
    }
  }

  if (result) {
    return (
      <Card className="mx-auto max-w-lg">
        <p className="text-xs uppercase tracking-wide text-mist-400">
          Tu comprensión
        </p>
        <p className="text-3xl font-semibold text-teal-400">
          {Math.round(result.overall_score)}
        </p>

        {result.understood.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-mist-400">LO ENTENDISTE BIEN</p>
            <ul className="mt-1 list-inside list-disc text-sm text-mist-200">
              {result.understood.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        )}

        {result.missed.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-mist-400">TE FALTÓ</p>
            <ul className="mt-1 list-inside list-disc text-sm text-mist-200">
              {result.missed.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {result.confused.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-mist-400">CONFUNDISTE</p>
            <ul className="mt-1 list-inside list-disc text-sm text-coral-400">
              {result.confused.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {!transcriptRevealed ? (
          <Button className="mt-5 w-full" onClick={() => setTranscriptRevealed(true)}>
            Ver transcripción
          </Button>
        ) : (
          <>
            <div className="mt-5 rounded-card bg-ink-900 p-3">
              <p className="text-xs text-mist-400">TRANSCRIPT</p>
              <div className="mt-2 flex flex-col gap-2">
                {exercise.speakers.map((line, i) => (
                  <p key={i} className="text-sm text-mist-200">
                    <span className="text-teal-400">👤 Person {line.speaker}:</span>{" "}
                    {line.text}
                  </p>
                ))}
              </div>
            </div>

            {difficulties.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-mist-400">LISTENING NOTES</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {difficulties.map((d, i) => (
                    <li key={i} className="text-sm text-mist-200">
                      <span className="text-amber-400">"{d.item}"</span>
                      <p className="text-xs text-mist-400">{difficultyNote(d)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button className="mt-5 w-full" onClick={onNext}>
              Siguiente ejercicio
            </Button>
          </>
        )}
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
        <div className="mt-6">
          <p className="text-sm text-mist-200">
            Tell me what you understood, in your own words.
          </p>
          <div className="mt-2">
            <SpeechInput
              value={responseText}
              onChange={setResponseText}
              placeholder="Responde en español, en inglés, o mezclando ambos…"
            />
          </div>
          <Button
            className="mt-3 w-full"
            disabled={analyzing || !responseText.trim()}
            onClick={handleCheck}
          >
            {analyzing ? "Analizando…" : "Check"}
          </Button>
          {error && <p className="mt-2 text-sm text-coral-400">{error}</p>}
        </div>
      )}
    </Card>
  );
}

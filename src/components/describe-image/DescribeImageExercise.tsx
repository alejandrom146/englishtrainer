"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface DescribeImageExerciseData {
  id: string;
  title: string;
  image_path: string;
  topic: string | null;
  cefr_level: string | null;
}

interface AttemptHistoryItem {
  attempt_number: number;
  overall_score: number | null;
}

interface Correction {
  original: string;
  correction: string;
  why: string;
}
interface VocabSuggestion {
  original: string;
  suggestion: string;
  why: string;
}

interface Analysis {
  content: { score: number; feedback: string };
  grammar: { score: number; feedback: string; corrections: Correction[] };
  vocabulary: { score: number; feedback: string; suggestions: VocabSuggestion[] };
  coherence: { score: number; feedback: string };
  connectors: { score: number; used: string[]; suggested: string[]; feedback: string };
  naturalness: { score: number; feedback: string };
  strengths: string[];
  improved_version: string;
  what_changed: string[];
  personalized_tip: string;
}

function ScoreRow({ label, score, max }: { label: string; score: number; max: number }) {
  return (
    <div className="flex items-center justify-between text-xs text-mist-400">
      <span>{label}</span>
      <span>
        {Math.round(score)}/{max}
      </span>
    </div>
  );
}

export function DescribeImageExercise({
  exercise,
  initialHistory,
}: {
  exercise: DescribeImageExerciseData;
  initialHistory: AttemptHistoryItem[];
}) {
  const [responseText, setResponseText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [overallScore, setOverallScore] = useState(0);
  const [history, setHistory] = useState<AttemptHistoryItem[]>(initialHistory);
  const [submittedText, setSubmittedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (!responseText.trim() || analyzing) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/describe-image/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise_id: exercise.id, response_text: responseText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Algo salió mal analizando tu respuesta.");
      } else {
        setAnalysis(data.analysis);
        setOverallScore(data.overallScore);
        setSubmittedText(responseText);
        setHistory((prev) => [
          ...prev,
          { attempt_number: data.attemptNumber, overall_score: data.overallScore },
        ]);
      }
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    }

    setAnalyzing(false);
  }

  function handleTryAgain() {
    setAnalysis(null);
    setResponseText("");
    setError(null);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Card className="overflow-hidden p-0">
        <div className="relative aspect-[3/2] w-full bg-ink-900">
          <Image
            src={exercise.image_path}
            alt="Describe the image"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 672px"
            priority
          />
        </div>
        {(exercise.topic || exercise.cefr_level) && (
          <div className="flex gap-3 px-4 py-2 text-xs text-mist-400">
            {exercise.cefr_level && <span>{exercise.cefr_level}</span>}
            {exercise.topic && <span>{exercise.topic}</span>}
          </div>
        )}
      </Card>

      {history.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-mist-400">
          {history.map((h) => (
            <span key={h.attempt_number} className="rounded-full bg-ink-800 px-3 py-1">
              Attempt {h.attempt_number}: {h.overall_score !== null ? Math.round(h.overall_score) : "—"}
            </span>
          ))}
        </div>
      )}

      {!analysis && (
        <Card>
          <p className="text-mist-50">Look at the image and describe what you see.</p>
          <p className="mt-1 text-sm text-mist-400">Try to write 4–6 sentences or more.</p>

          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Describe what you see in the image..."
            rows={7}
            className="mt-4 w-full rounded-card border border-ink-700 bg-ink-900 p-3 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />

          {error && <p className="mt-2 text-sm text-coral-400">{error}</p>}

          <Button
            className="mt-4 w-full"
            disabled={analyzing || !responseText.trim()}
            onClick={handleCheck}
          >
            {analyzing ? "Analyzing your answer…" : "Check my answer"}
          </Button>
        </Card>
      )}

      {analysis && (
        <>
          <Card className="text-center">
            <p className="text-xs text-mist-400">YOUR SCORE</p>
            <p className="text-4xl font-semibold text-teal-400">
              {Math.round(overallScore)}
              <span className="text-lg text-mist-400"> / 100</span>
            </p>
            <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-x-6 gap-y-1 text-left">
              <ScoreRow label="Content" score={analysis.content.score} max={25} />
              <ScoreRow label="Grammar" score={analysis.grammar.score} max={20} />
              <ScoreRow label="Vocabulary" score={analysis.vocabulary.score} max={20} />
              <ScoreRow label="Coherence" score={analysis.coherence.score} max={15} />
              <ScoreRow label="Connectors" score={analysis.connectors.score} max={10} />
              <ScoreRow label="Naturalness" score={analysis.naturalness.score} max={10} />
            </div>
          </Card>

          <Card>
            <p className="text-xs text-mist-400">WHAT YOU DID WELL</p>
            <ul className="mt-2 flex flex-col gap-1">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="text-sm text-teal-400">
                  ✓ {s}
                </li>
              ))}
            </ul>
          </Card>

          {analysis.grammar.corrections.length > 0 && (
            <Card>
              <p className="text-xs text-mist-400">GRAMMAR</p>
              <div className="mt-2 flex flex-col gap-3">
                {analysis.grammar.corrections.map((c, i) => (
                  <div key={i} className="text-sm">
                    <p className="text-coral-400">❌ {c.original}</p>
                    <p className="text-teal-400">✓ {c.correction}</p>
                    <p className="text-xs text-mist-400">{c.why}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-mist-400">{analysis.grammar.feedback}</p>
            </Card>
          )}

          {analysis.vocabulary.suggestions.length > 0 && (
            <Card>
              <p className="text-xs text-mist-400">VOCABULARY</p>
              <div className="mt-2 flex flex-col gap-3">
                {analysis.vocabulary.suggestions.map((v, i) => (
                  <div key={i} className="text-sm">
                    <p className="text-mist-200">
                      Instead of <span className="text-coral-400">&ldquo;{v.original}&rdquo;</span>, try{" "}
                      <span className="text-teal-400">&ldquo;{v.suggestion}&rdquo;</span>
                    </p>
                    <p className="text-xs text-mist-400">{v.why}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-mist-400">{analysis.vocabulary.feedback}</p>
            </Card>
          )}

          <Card>
            <p className="text-xs text-mist-400">CONNECTORS</p>
            {analysis.connectors.used.length > 0 && (
              <p className="mt-2 text-sm text-mist-200">
                You used: {analysis.connectors.used.join(", ")}
              </p>
            )}
            <p className="mt-1 text-sm text-mist-200">{analysis.connectors.feedback}</p>
            {analysis.connectors.suggested.length > 0 && (
              <p className="mt-2 text-sm text-amber-400">
                Try next: {analysis.connectors.suggested.join(", ")}
              </p>
            )}
          </Card>

          <Card>
            <p className="text-xs text-mist-400">COHERENCE</p>
            <p className="mt-2 text-sm text-mist-200">{analysis.coherence.feedback}</p>
          </Card>

          <Card>
            <p className="text-xs text-mist-400">YOUR ORIGINAL ANSWER</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-mist-400">{submittedText}</p>
          </Card>

          <Card>
            <p className="text-xs text-mist-400">IMPROVED VERSION</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-mist-50">
              {analysis.improved_version}
            </p>

            {analysis.what_changed.length > 0 && (
              <>
                <p className="mt-4 text-xs text-mist-400">WHAT CHANGED?</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {analysis.what_changed.map((w, i) => (
                    <li key={i} className="text-sm text-mist-200">
                      • {w}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card className="bg-ink-900">
            <p className="text-xs text-mist-400">CONNECTOR TO PRACTICE</p>
            <p className="mt-2 text-sm text-mist-200">{analysis.personalized_tip}</p>
          </Card>

          <Button onClick={handleTryAgain}>Try again</Button>
        </>
      )}
    </div>
  );
}

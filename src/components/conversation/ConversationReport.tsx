import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export interface ConversationFeedback {
  fluency_score: number;
  grammar_notes: { error: string; correction: string; explanation: string }[];
  vocabulary_notes: { used: string[]; missed: string[] };
  connectors_used: { text: string; correct: boolean; natural: boolean }[];
  connectors_missed: { suggested: string; why: string }[];
  strengths: string;
  improvements: string;
  next_recommendation: string;
}

export function ConversationReport({
  feedback,
}: {
  feedback: ConversationFeedback | null;
}) {
  if (!feedback) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="text-mist-50">Conversación finalizada.</p>
        <p className="mt-1 text-sm text-mist-400">
          Fue muy corta para generar un reporte — prueba a responder al
          menos una vez la próxima.
        </p>
        <Link href="/dashboard/conversation">
          <Button className="mt-4 w-full">Volver a conversaciones</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <p className="text-xs uppercase tracking-wide text-mist-400">
        Conversation Report
      </p>

      <div className="mt-3">
        <p className="text-xs text-mist-400">FLUENCY SCORE</p>
        <p className="text-3xl font-semibold text-teal-400">
          {Math.round(feedback.fluency_score)}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs text-mist-400">STRENGTHS</p>
        <p className="mt-1 text-sm text-mist-200">{feedback.strengths}</p>
      </div>

      <div className="mt-4">
        <p className="text-xs text-mist-400">IMPROVE</p>
        <p className="mt-1 text-sm text-mist-200">{feedback.improvements}</p>
      </div>

      {feedback.grammar_notes.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-mist-400">GRAMMAR</p>
          <ul className="mt-1 flex flex-col gap-2">
            {feedback.grammar_notes.map((g, i) => (
              <li key={i} className="text-sm text-mist-200">
                <span className="text-coral-400 line-through">
                  {g.error}
                </span>{" "}
                → <span className="text-teal-400">{g.correction}</span>
                <p className="text-xs text-mist-400">{g.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.vocabulary_notes.missed.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-mist-400">VOCABULARY TO TRY NEXT TIME</p>
          <p className="mt-1 text-sm text-mist-200">
            {feedback.vocabulary_notes.missed.join(", ")}
          </p>
        </div>
      )}

      {feedback.connectors_used.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-mist-400">CONNECTORS USED</p>
          <p className="mt-1 text-sm text-mist-200">
            {feedback.connectors_used.map((c) => c.text).join(", ")}
          </p>
        </div>
      )}

      {feedback.connectors_missed.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-mist-400">TRY NEXT TIME</p>
          <ul className="mt-1 flex flex-col gap-1">
            {feedback.connectors_missed.map((c, i) => (
              <li key={i} className="text-sm text-mist-200">
                <span className="text-amber-400">{c.suggested}</span> —{" "}
                {c.why}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 rounded-card bg-ink-900 p-3">
        <p className="text-xs text-mist-400">NEXT RECOMMENDATION</p>
        <p className="mt-1 text-sm text-mist-200">
          {feedback.next_recommendation}
        </p>
      </div>

      <Link href="/dashboard/conversation">
        <Button className="mt-5 w-full">Otra conversación</Button>
      </Link>
    </Card>
  );
}

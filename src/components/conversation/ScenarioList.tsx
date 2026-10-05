"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface Scenario {
  id: string;
  category: string;
  title: string;
  description: string | null;
  level: number | null;
  cefr_level: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  casual: "Casual",
  travel: "Travel",
  customer_service: "Customer Service",
  job_interview: "Job Interview",
};

export function ScenarioList({ scenarios }: { scenarios: Scenario[] }) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startConversation(
    scenarioId: string,
    mode: "practice" | "mock_interview"
  ) {
    setStartingId(scenarioId);
    setError(null);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario_id: scenarioId, mode }),
    });
    const data = await res.json();
    setStartingId(null);

    if (data.conversation) {
      router.push(`/dashboard/conversation/${data.conversation.id}`);
    } else {
      setError(data.error ?? "No se pudo iniciar la conversación. Intenta de nuevo.");
    }
  }

  const grouped = scenarios.reduce<Record<string, Scenario[]>>((acc, s) => {
    acc[s.category] = acc[s.category] ?? [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <>
      {error && (
        <p className="mb-4 text-sm text-coral-400" role="alert">
          {error}
        </p>
      )}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mt-8 first:mt-0">
          <p className="text-xs uppercase tracking-wide text-mist-400">
            {CATEGORY_LABEL[category] ?? category}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.map((s) => (
              <Card key={s.id} interactive>
                <p className="font-medium text-mist-50">
                  {s.title}
                  {s.level && (
                    <span className="ml-2 text-xs text-teal-400">
                      Level {s.level}
                    </span>
                  )}
                </p>
                {s.description && (
                  <p className="mt-1 text-sm text-mist-400">{s.description}</p>
                )}

                {s.category === "job_interview" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      disabled={startingId === s.id}
                      onClick={() => startConversation(s.id, "practice")}
                    >
                      Practice
                    </Button>
                    <Button
                      disabled={startingId === s.id}
                      onClick={() => startConversation(s.id, "mock_interview")}
                    >
                      Mock interview
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="mt-3"
                    disabled={startingId === s.id}
                    onClick={() => startConversation(s.id, "practice")}
                  >
                    {startingId === s.id ? "Empezando…" : "Start"}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

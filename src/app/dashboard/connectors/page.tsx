"use client";

import { useEffect, useState } from "react";
import { ConnectorChallenge } from "@/components/connectors/ConnectorChallenge";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";

interface ConnectorPrompt {
  id: string;
  prompt_text: string;
}

export default function ConnectorsPage() {
  const [prompt, setPrompt] = useState<ConnectorPrompt | null | undefined>(
    undefined
  );

  useEffect(() => {
    fetch("/api/connectors/prompt")
      .then((res) => res.json())
      .then((data) => setPrompt(data.prompt ?? null));
  }, []);

  return (
    <>
      <PageHeader title="Connector Challenge" />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {prompt === undefined && <CardSkeleton />}

        {prompt === null && (
          <Card className="mx-auto max-w-md text-center">
            <p className="text-mist-50">
              Todavía no hay preguntas cargadas para este reto.
            </p>
          </Card>
        )}

        {prompt && <ConnectorChallenge prompt={prompt} />}
      </main>
    </>
  );
}

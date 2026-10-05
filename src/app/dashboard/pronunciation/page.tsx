"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  PronunciationRecorder,
  type PronunciationCardData,
} from "@/components/pronunciation/PronunciationRecorder";

export default function PronunciationPage() {
  const [card, setCard] = useState<PronunciationCardData | null | undefined>(
    undefined
  );

  const loadNext = useCallback(async () => {
    setCard(undefined);
    const res = await fetch("/api/pronunciation/next");
    const data = await res.json();
    setCard(data.card ?? null);
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  return (
    <>
      <PageHeader title="Pronunciation Lab" />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {card === undefined && <CardSkeleton />}

        {card === null && (
          <Card className="mx-auto max-w-md text-center">
            <p className="text-mist-50">
              Todavía no tienes palabras para practicar pronunciación.
            </p>
            <p className="mt-2 text-sm text-mist-400">
              Practica algo de vocabulario primero — cuando recuerdes una
              palabra, aparecerá aquí.
            </p>
          </Card>
        )}

        {card && <PronunciationRecorder card={card} onNext={loadNext} />}
      </main>
    </>
  );
}

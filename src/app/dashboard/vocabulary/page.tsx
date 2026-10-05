"use client";

import { useEffect, useState, useCallback } from "react";
import {
  VocabularyCard,
  type VocabularyCardData,
} from "@/components/vocabulary/VocabularyCard";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";

type ReviewQuality = "again" | "hard" | "good" | "easy";

export default function VocabularyPracticePage() {
  const [card, setCard] = useState<VocabularyCardData | null | undefined>(
    undefined // undefined = cargando, null = no hay nada que practicar
  );
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const loadNext = useCallback(async () => {
    setRevealed(false);
    const res = await fetch("/api/vocabulary/next");
    const data = await res.json();
    setCard(data.card ?? null);
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  async function handleAnswer(quality: ReviewQuality) {
    if (!card) return;
    await fetch("/api/vocabulary/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_vocabulary_id: card.id, quality }),
    });
    setReviewedCount((n) => n + 1);
    loadNext();
  }

  return (
    <>
      <PageHeader title="Vocabulary" right={<span className="text-xs text-mist-400">{reviewedCount}</span>} />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {card === undefined && <CardSkeleton />}

        {card === null && (
          <Card className="mx-auto max-w-md text-center">
            <p className="text-lg font-medium text-mist-50">
              Por hoy no hay más vocabulario pendiente 🎉
            </p>
            <p className="mt-2 text-sm text-mist-400">
              Vuelve mañana para nuevas revisiones, o cuando carguemos más
              palabras al catálogo.
            </p>
          </Card>
        )}

        {card && (
          <VocabularyCard
            data={card}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onAnswer={handleAnswer}
          />
        )}
      </main>
    </>
  );
}

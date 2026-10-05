"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import {
  MultipleChoiceListening,
  type MultipleChoiceExerciseData,
} from "@/components/listening/MultipleChoiceListening";
import { ConversationListening } from "@/components/listening/ConversationListening";
import { DictationExercise } from "@/components/listening/DictationExercise";
import { FillTheGaps } from "@/components/listening/FillTheGaps";
import { CompleteTheSentence } from "@/components/listening/CompleteTheSentence";

const INSTRUCTIONS: Record<string, string> = {
  listen_understand: "Answer the questions about what you heard.",
  main_idea: "Choose the option that best describes what the conversation was about.",
};

export function ListeningExercisePlayer({ subtype }: { subtype: string }) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [exercise, setExercise] = useState<any | null | undefined>(undefined);

  useEffect(() => {
    setExercise(undefined);
    fetch(`/api/listening/next?subtype=${subtype}`)
      .then((res) => res.json())
      .then((data) => setExercise(data.exercise ?? null));
  }, [subtype]);

  function goBackToList() {
    router.push("/dashboard/listening");
  }

  if (exercise === undefined) return <CardSkeleton />;

  if (exercise === null) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="text-mist-50">Este ejercicio todavía no tiene contenido cargado.</p>
      </Card>
    );
  }

  switch (subtype) {
    case "listen_understand":
    case "main_idea":
      return (
        <MultipleChoiceListening
          exercise={exercise as MultipleChoiceExerciseData}
          instruction={INSTRUCTIONS[subtype]}
          onNext={goBackToList}
        />
      );
    case "retell":
      return <ConversationListening exercise={exercise} onNext={goBackToList} />;
    case "basic_dictation":
      return <DictationExercise exercise={exercise} onNext={goBackToList} />;
    case "fill_gaps":
      return <FillTheGaps exercise={exercise} onNext={goBackToList} />;
    case "complete_sentence":
      return <CompleteTheSentence exercise={exercise} onNext={goBackToList} />;
    default:
      return (
        <Card className="mx-auto max-w-md text-center">
          <p className="text-mist-50">Ejercicio no reconocido.</p>
        </Card>
      );
  }
}

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getBestEnglishVoice } from "@/lib/audio/selectVoice";

export interface VocabularyCardData {
  id: string; // user_vocabulary.id
  state: string;
  vocabulary: {
    word: string;
    ipa: string | null;
    part_of_speech: string | null;
    definition: string;
    example_sentence: string | null;
    audio_url: string | null;
  };
}

async function speak(text: string, audioUrl?: string | null) {
  if (typeof window === "undefined") return;

  if (audioUrl) {
    new Audio(audioUrl).play().catch(() => {});
    return;
  }

  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = await getBestEnglishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-GB";
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function VocabularyCard({
  data,
  revealed,
  onReveal,
  onAnswer,
}: {
  data: VocabularyCardData;
  revealed: boolean;
  onReveal: () => void;
  onAnswer: (quality: "again" | "hard" | "good" | "easy") => void;
}) {
  const { vocabulary } = data;

  return (
    <Card className="mx-auto max-w-md">
      <p className="text-xs uppercase tracking-wide text-mist-400">
        {data.state.replace("_", " ")}
      </p>

      <h2 className="mt-3 text-3xl font-semibold text-mist-50">
        {vocabulary.word}
      </h2>
      {vocabulary.ipa && (
        <p className="mt-1 text-sm text-teal-400">/{vocabulary.ipa}/</p>
      )}
      {vocabulary.part_of_speech && (
        <p className="text-xs text-mist-400">{vocabulary.part_of_speech}</p>
      )}
      <button
        onClick={() => speak(vocabulary.word, vocabulary.audio_url)}
        className="mt-2 text-xs text-amber-400 underline"
      >
        🔊 Escuchar
      </button>

      {!revealed ? (
        <Button className="mt-6 w-full" onClick={onReveal}>
          Mostrar significado
        </Button>
      ) : (
        <>
          <p className="mt-5 text-mist-200">{vocabulary.definition}</p>
          {vocabulary.example_sentence && (
            <p className="mt-3 rounded-card bg-ink-900 p-3 text-sm italic text-mist-400">
              &ldquo;{vocabulary.example_sentence}&rdquo;
            </p>
          )}

          <p className="mt-6 text-xs text-mist-400">
            ¿Qué tan bien la recordaste?
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <Button variant="ghost" onClick={() => onAnswer("again")}>
              Otra vez
            </Button>
            <Button variant="ghost" onClick={() => onAnswer("hard")}>
              Difícil
            </Button>
            <Button variant="ghost" onClick={() => onAnswer("good")}>
              Bien
            </Button>
            <Button variant="ghost" onClick={() => onAnswer("easy")}>
              Fácil
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

/**
 * Detecta qué partes de una transcripción probablemente dificultaron la
 * comprensión (contracciones, reductions habladas). Esto es texto contra
 * texto — no necesita IA, así que se hace con reglas simples y gratis.
 * Sirve para las "Listening Notes" (sección 10 del prompt del módulo).
 */

const CONTRACTIONS = [
  "I'm", "I've", "I'll", "I'd",
  "you're", "you've", "you'll", "you'd",
  "he's", "she's", "it's",
  "we're", "we've", "we'll", "we'd",
  "they're", "they've", "they'll", "they'd",
  "can't", "won't", "didn't", "doesn't", "don't",
  "isn't", "aren't", "wasn't", "weren't",
  "haven't", "hasn't", "hadn't",
  "couldn't", "wouldn't", "shouldn't",
  "that's", "there's", "here's", "let's",
];

const REDUCTIONS = [
  "going to", "want to", "have to", "got to",
  "kind of", "sort of", "a lot of", "out of",
];

export interface DetectedDifficulty {
  type: "contraction" | "reduction";
  item: string;
}

export function detectDifficulties(transcript: string): DetectedDifficulty[] {
  const found: DetectedDifficulty[] = [];
  const lowerTranscript = transcript.toLowerCase();

  for (const contraction of CONTRACTIONS) {
    // Límite de palabra simple: evita que "he's" matchee dentro de otra
    // palabra rara. No es un parser lingüístico, es una búsqueda de texto.
    const pattern = new RegExp(`\\b${escapeRegex(contraction.toLowerCase())}\\b`);
    if (pattern.test(lowerTranscript)) {
      found.push({ type: "contraction", item: contraction });
    }
  }

  for (const reduction of REDUCTIONS) {
    if (lowerTranscript.includes(reduction)) {
      found.push({ type: "reduction", item: reduction });
    }
  }

  return found;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Texto corto y humano para mostrar junto a cada dificultad detectada —
 * evita una explicación técnica larga, tal como pide la sección 10.
 */
export function difficultyNote(d: DetectedDifficulty): string {
  return d.type === "contraction"
    ? "Contracción — puede sonar como una sola sílaba rápida al hablar."
    : "Esta parte puede resultar difícil porque varias palabras se unen al hablar.";
}

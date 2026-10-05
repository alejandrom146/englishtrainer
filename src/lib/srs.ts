/**
 * Repetición espaciada tipo SM-2 simplificado.
 * Se usa tanto para `user_vocabulary` como (más adelante) `user_expressions`.
 *
 * `quality` es la autoevaluación del usuario al revisar una palabra:
 *  - 'again': no la recordó
 *  - 'hard':  la recordó, pero con esfuerzo
 *  - 'good':  la recordó con normalidad
 *  - 'easy':  la recordó sin ningún esfuerzo
 */

export type ReviewQuality = "again" | "hard" | "good" | "easy";

export type LearningState =
  | "new"
  | "recognition"
  | "understanding"
  | "pronunciation"
  | "recall"
  | "active_use"
  | "spontaneous_use"
  | "mastered";

export interface SrsCard {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  state: LearningState;
}

const QUALITY_SCORE: Record<ReviewQuality, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

// El módulo de vocabulario (tarjetas) solo puede llevar una palabra hasta
// 'recall'. Los estados siguientes (pronunciation, active_use,
// spontaneous_use, mastered) los actualizan otros módulos: Pronunciation
// Lab y Conversación, que sí observan uso real hablado.
const STATE_BY_REPETITIONS: LearningState[] = [
  "new",
  "recognition",
  "understanding",
  "recall",
];

function stateForRepetitions(
  repetitions: number,
  currentState: LearningState
): LearningState {
  // Nunca retrocede un estado alcanzado por otro módulo (pronunciation en
  // adelante) solo porque falló una revisión de vocabulario.
  const advancedStates: LearningState[] = [
    "pronunciation",
    "active_use",
    "spontaneous_use",
    "mastered",
  ];
  if (advancedStates.includes(currentState)) return currentState;

  const idx = Math.min(repetitions, STATE_BY_REPETITIONS.length - 1);
  return STATE_BY_REPETITIONS[idx];
}

export function reviewCard(card: SrsCard, quality: ReviewQuality): SrsCard {
  const q = QUALITY_SCORE[quality];

  if (q < 3) {
    // Fallo: se reinicia el intervalo de repetición, pero se conserva el
    // estado de aprendizaje ya alcanzado (no se "desaprende" la palabra).
    return {
      ease_factor: Math.max(1.3, card.ease_factor - 0.2),
      interval_days: 1,
      repetitions: 0,
      state: card.state,
    };
  }

  const repetitions = card.repetitions + 1;
  const easeFactor = Math.max(
    1.3,
    card.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  let intervalDays: number;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 6;
  else intervalDays = Math.round(card.interval_days * easeFactor);

  return {
    ease_factor: easeFactor,
    interval_days: intervalDays,
    repetitions,
    state: stateForRepetitions(repetitions, card.state),
  };
}

export function dueAtFromInterval(intervalDays: number): string {
  const due = new Date();
  due.setDate(due.getDate() + intervalDays);
  return due.toISOString();
}

// Orden de los estados, usado quado un módulo de producción activa
// (Connector Challenge, Conversación) quiere "subir" el estado de una
// expresión sin arriesgarse a bajarlo por error.
const STATE_ORDER: LearningState[] = [
  "new",
  "recognition",
  "understanding",
  "pronunciation",
  "recall",
  "active_use",
  "spontaneous_use",
  "mastered",
];

export function maxState(a: LearningState, b: LearningState): LearningState {
  return STATE_ORDER.indexOf(a) >= STATE_ORDER.indexOf(b) ? a : b;
}

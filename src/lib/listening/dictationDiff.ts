/**
 * Compara la frase original con lo que escribió el usuario y clasifica
 * cada diferencia. Es determinístico (sin IA) — un alineamiento tipo
 * Levenshtein a nivel de palabra, con algunas heurísticas encima para
 * distinguir tipos de error (sección 12-15 del prompt del módulo).
 *
 * Importante: estas heurísticas son aproximadas, no un análisis
 * lingüístico real. Documentado aquí para quien retome este archivo:
 * un "WRONG_TENSE" o "MISHEARD_SOUND" es una mejor suposición, no una
 * certeza — igual que el resto de la app prefiere una estimación honesta
 * a una falsa precisión (sección 13 del prompt maestro original).
 */

export type ErrorType =
  | "OMITTED_WORD"
  | "WRONG_WORD"
  | "EXTRA_WORD"
  | "WRONG_TENSE"
  | "WRONG_PLURAL"
  | "WRONG_PREPOSITION"
  | "WRONG_ARTICLE"
  | "MISHEARD_CONTRACTION"
  | "MISHEARD_SOUND"
  | "SPELLING_ERROR";

// Errores que cambian el CONTENIDO de lo que se entendió — pesan más.
const CRITICAL_TYPES: ErrorType[] = [
  "OMITTED_WORD",
  "WRONG_WORD",
  "EXTRA_WORD",
  "MISHEARD_CONTRACTION",
  "MISHEARD_SOUND",
];
// Errores más de "forma" — no deberían destundir el resultado (sección 15).
const MINOR_TYPES: ErrorType[] = [
  "WRONG_TENSE",
  "WRONG_PLURAL",
  "WRONG_PREPOSITION",
  "WRONG_ARTICLE",
  "SPELLING_ERROR",
];

export interface WordDiffItem {
  word: string; // la palabra original (o la del usuario, si fue insertada)
  status: "correct" | "error";
  type?: ErrorType;
}

export interface DictationResult {
  wordDiff: WordDiffItem[];
  listeningAccuracy: number;
  wordAccuracy: number;
  criticalErrors: number;
  minorErrors: number;
}

const ARTICLES = new Set(["a", "an", "the"]);
const PREPOSITIONS = new Set([
  "in", "on", "at", "for", "to", "with", "by", "from", "of", "about", "into",
]);

function tokenize(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"()]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function stripSuffix(word: string): string {
  return word.replace(/(ed|ing|s|es)$/, "");
}

function classifySubstitution(original: string, user: string): ErrorType {
  const dist = levenshtein(original, user);

  if (original.includes("'")) return "MISHEARD_CONTRACTION";

  if (ARTICLES.has(original) || ARTICLES.has(user)) return "WRONG_ARTICLE";
  if (PREPOSITIONS.has(original) && PREPOSITIONS.has(user)) return "WRONG_PREPOSITION";

  if (original.endsWith("s") && original.slice(0, -1) === user) return "WRONG_PLURAL";
  if (user.endsWith("s") && user.slice(0, -1) === original) return "WRONG_PLURAL";

  if (stripSuffix(original) === stripSuffix(user) && original !== user) {
    return "WRONG_TENSE";
  }

  // Distancia chica en una palabra larga → probablemente typo, no error de
  // oído (ej. "yers" en vez de "years": la reconoció, la escribió mal).
  if (dist <= 2 && Math.max(original.length, user.length) >= 5) {
    return "SPELLING_ERROR";
  }

  // Distancia chica en palabra corta, o palabra totalmente distinta →
  // probablemente confundió el sonido.
  if (dist <= 2) return "MISHEARD_SOUND";

  return "WRONG_WORD";
}

/**
 * Alinea dos listas de palabras con Levenshtein a nivel de palabra
 * (Wagner-Fischer con backtrace), y clasifica cada diferencia.
 */
export function compareDictation(
  originalText: string,
  userText: string
): DictationResult {
  const original = tokenize(originalText);
  const user = tokenize(userText);

  const n = original.length;
  const m = user.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (original[i - 1] === user[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  // Backtrace desde (n,m) hasta (0,0).
  type Op = { kind: "match" | "substitute" | "delete" | "insert"; o?: string; u?: string };
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && original[i - 1] === user[j - 1]) {
      ops.push({ kind: "match", o: original[i - 1] });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push({ kind: "substitute", o: original[i - 1], u: user[j - 1] });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ kind: "delete", o: original[i - 1] }); // el usuario omitió esta palabra
      i--;
    } else {
      ops.push({ kind: "insert", u: user[j - 1] }); // el usuario agregó una palabra de más
      j--;
    }
  }
  ops.reverse();

  const wordDiff: WordDiffItem[] = [];
  let criticalErrors = 0;
  let minorErrors = 0;

  for (const op of ops) {
    if (op.kind === "match") {
      wordDiff.push({ word: op.o!, status: "correct" });
    } else if (op.kind === "delete") {
      const type: ErrorType = op.o!.includes("'") ? "MISHEARD_CONTRACTION" : "OMITTED_WORD";
      wordDiff.push({ word: op.o!, status: "error", type });
      if (CRITICAL_TYPES.includes(type)) criticalErrors++; else minorErrors++;
    } else if (op.kind === "insert") {
      wordDiff.push({ word: op.u!, status: "error", type: "EXTRA_WORD" });
      criticalErrors++;
    } else {
      const type = classifySubstitution(op.o!, op.u!);
      wordDiff.push({ word: op.o!, status: "error", type });
      if (CRITICAL_TYPES.includes(type)) criticalErrors++; else minorErrors++;
    }
  }

  const wordAccuracy =
    original.length === 0
      ? 100
      : (ops.filter((o) => o.kind === "match").length / original.length) * 100;

  const listeningAccuracy = Math.max(
    0,
    100 - criticalErrors * 15 - minorErrors * 5
  );

  return { wordDiff, listeningAccuracy, wordAccuracy, criticalErrors, minorErrors };
}

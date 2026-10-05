/**
 * El navegador nunca elige la mejor voz disponible por sí solo — sin
 * especificarla, usa cualquiera que tenga asignada por default para ese
 * idioma, que suele ser la más robótica. Casi todos los navegadores
 * modernos (Chrome, Edge, Safari) también traen voces bastante más
 * naturales instaladas — este archivo las busca y elige la mejor.
 *
 * No cuesta nada (sigue siendo la síntesis de voz del propio navegador,
 * sin ningún servicio de por medio) — es puramente elegir mejor entre lo
 * que ya está disponible gratis.
 */

// Ordenados de mejor a peor calidad percibida. Coincide por substring,
// sin distinguir mayúsculas/minúsculas, contra el nombre de la voz que
// reporta cada navegador/SO.
const QUALITY_HINTS = [
  "natural", // voces "Online (Natural)" de Microsoft Edge — muy buenas
  "neural",
  "premium",
  "enhanced", // voces "Enhanced" de Safari/macOS
  "google", // voces de Google en Chrome (bastante naturales)
];

let cachedVoices: SpeechSynthesisVoice[] | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) {
    return Promise.resolve(existing);
  }

  // En varios navegadores (sobre todo Chrome) getVoices() devuelve vacío
  // hasta que dispara este evento la primera vez que se usan.
  return new Promise((resolve) => {
    const handle = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handle);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handle);
    // Salvaguarda: si el evento nunca dispara, no dejar la promesa colgada.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

/**
 * Devuelve la mejor voz en inglés disponible — prioriza British English
 * (en-GB, el estándar de la app) y, dentro de eso, las voces con mejor
 * calidad conocida. Si no hay ninguna en-GB, cae a cualquier voz en
 * inglés antes que dejarlo sin especificar.
 */
export async function getBestEnglishVoice(): Promise<SpeechSynthesisVoice | null> {
  const ranked = await getRankedEnglishVoices();
  return ranked[0] ?? null;
}

/**
 * Igual que `getBestEnglishVoice`, pero devuelve varias — se usa para
 * darle una voz distinta a cada hablante en una conversación (mucho más
 * natural que simular una segunda voz cambiando el pitch de la misma).
 */
export async function getRankedEnglishVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!cachedVoices) {
    cachedVoices = await loadVoices();
  }

  const englishVoices = cachedVoices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  if (englishVoices.length === 0) return [];

  function score(voice: SpeechSynthesisVoice): number {
    const name = voice.name.toLowerCase();
    const isBritish = voice.lang.toLowerCase() === "en-gb";
    const qualityIndex = QUALITY_HINTS.findIndex((hint) => name.includes(hint));
    const qualityScore = qualityIndex === -1 ? 0 : QUALITY_HINTS.length - qualityIndex;
    return (isBritish ? 100 : 0) + qualityScore * 10;
  }

  return [...englishVoices].sort((a, b) => score(b) - score(a));
}

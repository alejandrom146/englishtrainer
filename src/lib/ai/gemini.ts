/**
 * Cliente mínimo para Gemini (Google AI). Se eligió Gemini porque es la
 * clave que ya configuraste en AI_API_KEY, y su tier "flash-lite" es de los
 * más baratos del mercado — adecuado para tareas de análisis de texto y
 * audio corto como las de esta app.
 *
 * Usamos el alias "gemini-flash-lite-latest" en vez de fijar una versión
 * (ej. "gemini-2.5-flash-lite") porque Google retira modelos con el tiempo;
 * el alias apunta siempre al Flash-Lite vigente. Puedes fijar
 * GEMINI_MODEL en tu .env si alguna vez quieres forzar una versión
 * concreta.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GenerateJsonResult<T> {
  data: T;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
}

export interface GenerateTextResult {
  text: string;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Para respuestas conversacionales en texto plano (no JSON estructurado).
 * `history` sigue el formato de contents de Gemini: [{role: 'user'|'model', parts:[{text}]}]
 */
export async function generateText({
  systemInstruction,
  history,
}: {
  systemInstruction: string;
  history: { role: "user" | "model"; parts: { text: string }[] }[];
}): Promise<GenerateTextResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta AI_API_KEY en las variables de entorno");
  }

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200, // respuestas conversacionales cortas: controla el costo
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const responseBody = await res.json();
  const text = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini no devolvió contenido utilizable");
  }

  return {
    text,
    usage: {
      model: GEMINI_MODEL,
      inputTokens: responseBody?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: responseBody?.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

interface GenerateJsonOptions {
  systemInstruction: string;
  userContent: string;
  responseSchema: Record<string, unknown>;
}

/**
 * Para tareas de análisis que deben devolver JSON estructurado (Connector
 * Challenge, feedback de conversación).
 */
export async function generateJson<T>({
  systemInstruction,
  userContent,
  responseSchema,
}: GenerateJsonOptions): Promise<GenerateJsonResult<T>> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta AI_API_KEY en las variables de entorno");
  }

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.4,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const responseBody = await res.json();
  const text = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini no devolvió contenido utilizable");
  }

  return {
    data: JSON.parse(text) as T,
    usage: {
      model: GEMINI_MODEL,
      inputTokens: responseBody?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: responseBody?.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

/**
 * Igual que `generateJson`, pero el input es un audio corto (ej. un intento
 * de pronunciación) en vez de texto. Usado por el Pronunciation Lab.
 */
export async function generateJsonFromAudio<T>({
  systemInstruction,
  textPrompt,
  audioBase64,
  audioMimeType = "audio/wav",
  responseSchema,
}: {
  systemInstruction: string;
  textPrompt: string;
  audioBase64: string;
  audioMimeType?: string;
  responseSchema: Record<string, unknown>;
}): Promise<GenerateJsonResult<T>> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta AI_API_KEY en las variables de entorno");
  }

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: textPrompt },
            { inlineData: { mimeType: audioMimeType, data: audioBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const responseBody = await res.json();
  const text = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini no devolvió contenido utilizable");
  }

  return {
    data: JSON.parse(text) as T,
    usage: {
      model: GEMINI_MODEL,
      inputTokens: responseBody?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: responseBody?.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

/**
 * Igual que `generateJson`, pero el input incluye una imagen (además del
 * texto). Usado por "Describe the Image". El caller ya debe traer la
 * imagen codificada en base64 (para imágenes propias del catálogo, la
 * ruta las lee de /public y las codifica antes de llamar acá — ver
 * src/app/api/describe-image/analyze/route.ts).
 */
export async function generateJsonFromImage<T>({
  systemInstruction,
  textPrompt,
  imageBase64,
  imageMimeType = "image/png",
  responseSchema,
}: {
  systemInstruction: string;
  textPrompt: string;
  imageBase64: string;
  imageMimeType?: string;
  responseSchema: Record<string, unknown>;
}): Promise<GenerateJsonResult<T>> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta AI_API_KEY en las variables de entorno");
  }

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: textPrompt },
            { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.4,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const responseBody = await res.json();
  const text = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini no devolvió contenido utilizable");
  }

  return {
    data: JSON.parse(text) as T,
    usage: {
      model: GEMINI_MODEL,
      inputTokens: responseBody?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: responseBody?.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
const GEMINI_TTS_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`;

export interface SpeakerVoice {
  speaker: string; // debe matchear exacto el "Speaker: " que aparece en el texto
  voiceName: string;
}

/**
 * Genera audio real con Gemini TTS (no browser speechSynthesis) — se usa
 * SOLO desde el script de generación (scripts/generate-audio.mjs), una
 * vez por contenido, nunca en cada reproducción del usuario. Devuelve PCM
 * crudo en base64 (24kHz, mono, 16-bit) tal como lo entrega la API; el
 * script se encarga de envolverlo en un WAV.
 *
 * Para una sola voz, pasar un único elemento en `speakerVoices` y NO
 * prefijar el texto con "Speaker: " — para multi-hablante (conversaciones
 * de Listening), sí hay que prefijar cada línea con el mismo nombre que
 * aparece en `speakerVoices`.
 */
export async function generateSpeech(
  text: string,
  speakerVoices: SpeakerVoice[]
): Promise<{ base64Pcm: string; usage: { model: string; inputTokens: number; outputTokens: number } }> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta AI_API_KEY en las variables de entorno");
  }

  const speechConfig =
    speakerVoices.length > 1
      ? {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakerVoices.map((sv) => ({
              speaker: sv.speaker,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: sv.voiceName } },
            })),
          },
        }
      : {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerVoices[0].voiceName } },
        };

  const res = await fetch(GEMINI_TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini TTS error (${res.status}): ${errorText}`);
  }

  const responseBody = await res.json();
  const part = responseBody?.candidates?.[0]?.content?.parts?.[0];
  const base64Pcm = part?.inlineData?.data;

  if (!base64Pcm) {
    throw new Error("Gemini TTS no devolvió audio");
  }

  return {
    base64Pcm,
    usage: {
      model: GEMINI_TTS_MODEL,
      inputTokens: responseBody?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: responseBody?.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

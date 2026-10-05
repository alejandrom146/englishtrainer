#!/usr/bin/env node
/**
 * Genera audio real (Gemini TTS) para todo el contenido FIJO de la app —
 * ejercicios de Listening y palabras de vocabulario — y lo guarda como
 * archivos .wav en /public/audio, actualizando `audio_url` en Supabase.
 *
 * Se corre UNA VEZ (o cada vez que agregues contenido nuevo), no en cada
 * reproducción del usuario — así el costo de la API se paga una sola vez
 * por contenido, y después queda gratis para siempre (igual filosofía que
 * las imágenes de Describe the Image).
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, AI_API_KEY.
 *
 * Uso:
 *   node scripts/generate-audio.mjs                 # solo lo que falte
 *   node scripts/generate-audio.mjs --force          # regenera todo
 *   node scripts/generate-audio.mjs --only=listening # solo listening
 *   node scripts/generate-audio.mjs --only=vocabulary
 *   node scripts/generate-audio.mjs --limit=5        # máximo 5 llamadas (para probar el costo primero)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// --- .env.local (parser mínimo, sin agregar la dependencia "dotenv") ---
function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    console.error("No encontré .env.local en la raíz del proyecto.");
    process.exit(1);
  }
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_API_KEY = process.env.AI_API_KEY;
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
const TTS_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`;

for (const [name, val] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  AI_API_KEY: AI_API_KEY,
})) {
  if (!val) {
    console.error(`Falta ${name} en .env.local`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1]; // 'listening' | 'vocabulary'
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? Infinity);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Voces: ver docs/describe-image-prompts.md hermano — acá el catálogo
// completo está en la guía de Gemini TTS. Kore/Puck son voces claras y
// naturales, buen contraste entre sí para distinguir dos hablantes.
const SPEAKER_VOICE_MAP = { A: "Kore", B: "Puck" };
const DEFAULT_VOICE = "Kore";

let callCount = 0;
let charCount = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callTts(text, speakerVoices) {
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
      : { voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerVoices[0].voiceName } } };

  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": AI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini TTS error (${res.status}): ${await res.text()}`);
  }

  const body = await res.json();
  const base64Pcm = body?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Pcm) throw new Error("Gemini TTS no devolvió audio para: " + text.slice(0, 60));

  callCount++;
  charCount += text.length;
  return Buffer.from(base64Pcm, "base64");
}

// Envuelve PCM crudo (24kHz, mono, 16-bit — el formato que devuelve
// Gemini TTS) en un contenedor WAV reproducible por cualquier navegador.
function pcmToWav(pcmBuffer, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function processListening() {
  const { data: exercises, error } = await supabase.from("listening_exercises").select("*");
  if (error) throw error;

  const outDir = path.join(ROOT, "public", "audio", "listening");
  mkdirSync(outDir, { recursive: true });

  let done = 0;
  for (const ex of exercises) {
    if (callCount >= LIMIT) break;
    if (ex.audio_url && !FORCE) continue;

    const isMultiSpeaker = Array.isArray(ex.speakers) && ex.speakers.length > 0;
    const speakerNames = isMultiSpeaker
      ? [...new Set(ex.speakers.map((s) => s.speaker))]
      : [];

    const speakerVoices = isMultiSpeaker
      ? speakerNames.map((name, i) => ({
          speaker: name,
          voiceName: SPEAKER_VOICE_MAP[name] ?? [DEFAULT_VOICE, "Puck", "Charon"][i % 3],
        }))
      : [{ speaker: "narrator", voiceName: DEFAULT_VOICE }];

    console.log(`[listening] ${ex.title} (${isMultiSpeaker ? "multi-hablante" : "una voz"})...`);

    try {
      const pcm = await callTts(ex.transcript, speakerVoices);
      const wav = pcmToWav(pcm);
      const fileName = `${ex.id}.wav`;
      writeFileSync(path.join(outDir, fileName), wav);

      const { error: updateError } = await supabase
        .from("listening_exercises")
        .update({ audio_url: `/audio/listening/${fileName}` })
        .eq("id", ex.id);
      if (updateError) throw updateError;

      done++;
      await sleep(400); // margen simple contra rate limits del modelo preview
    } catch (err) {
      console.error(`  ERROR en "${ex.title}":`, err.message);
    }
  }
  console.log(`Listening: ${done} archivo(s) generado(s).`);
}

async function processVocabulary() {
  const { data: words, error } = await supabase.from("vocabulary").select("*");
  if (error) throw error;

  const outDir = path.join(ROOT, "public", "audio", "vocabulary");
  mkdirSync(outDir, { recursive: true });

  let done = 0;
  for (const w of words) {
    if (callCount >= LIMIT) break;
    if (w.audio_url && !FORCE) continue;

    console.log(`[vocabulary] ${w.word}...`);

    try {
      const pcm = await callTts(w.word, [{ speaker: "narrator", voiceName: DEFAULT_VOICE }]);
      const wav = pcmToWav(pcm);
      const fileName = `${w.id}.wav`;
      writeFileSync(path.join(outDir, fileName), wav);

      const { error: updateError } = await supabase
        .from("vocabulary")
        .update({ audio_url: `/audio/vocabulary/${fileName}` })
        .eq("id", w.id);
      if (updateError) throw updateError;

      done++;
      await sleep(400);
    } catch (err) {
      console.error(`  ERROR en "${w.word}":`, err.message);
    }
  }
  console.log(`Vocabulary: ${done} archivo(s) generado(s).`);
}

async function main() {
  console.log(`Modelo: ${TTS_MODEL}${FORCE ? " (forzando regeneración)" : ""}`);

  if (!ONLY || ONLY === "listening") await processListening();
  if (!ONLY || ONLY === "vocabulary") await processVocabulary();

  console.log(`\nListo. ${callCount} llamadas a Gemini TTS, ~${charCount} caracteres procesados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

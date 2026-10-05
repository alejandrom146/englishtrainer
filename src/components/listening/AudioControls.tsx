"use client";

import { useEffect, useRef, useState } from "react";
import { getAudioProvider, type PlaySegment } from "@/lib/audio/audioProvider";

const SPEEDS = [0.75, 1, 1.25];

export function AudioControls({
  segments,
  audioUrl,
  onFirstPlay,
  onStateChange,
}: {
  segments: PlaySegment[];
  /** Si hay un archivo de audio real pre-generado (Gemini TTS), se reproduce
   * ese en vez de sintetizar con la voz del navegador — mucho más natural. */
  audioUrl?: string | null;
  /** Se llama la primera vez que el usuario reproduce (para revelar el resto de la UI). */
  onFirstPlay?: () => void;
  /** Informa al padre cuántas veces reprodujo y a qué velocidad, para guardarlo con la respuesta. */
  onStateChange?: (state: { playCount: number; speed: number }) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playCount, setPlayCount] = useState(0);
  const providerRef = useRef(getAudioProvider());
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    onStateChange?.({ playCount, speed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playCount, speed]);

  useEffect(() => {
    if (audioUrl && typeof window !== "undefined") {
      audioElRef.current = new Audio(audioUrl);
    }
    return () => {
      audioElRef.current?.pause();
      audioElRef.current = null;
    };
  }, [audioUrl]);

  function play() {
    setPlaying(true);
    setPlayCount((c) => c + 1);
    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      onFirstPlay?.();
    }

    if (audioElRef.current) {
      const audio = audioElRef.current;
      audio.currentTime = 0;
      audio.playbackRate = speed;
      audio.onended = () => setPlaying(false);
      audio.play().catch(() => setPlaying(false));
      return;
    }

    // Sin audio pre-generado: cae a la síntesis de voz del navegador.
    providerRef.current.play(segments, speed, () => setPlaying(false));
  }

  function replay() {
    if (audioElRef.current) {
      audioElRef.current.pause();
    } else {
      providerRef.current.cancel();
    }
    play();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={playing ? replay : play}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-2xl text-ink-950"
      >
        {playing ? "⟳" : "▶"}
      </button>
      <p className="text-xs text-mist-400">
        {playing
          ? "Reproduciendo…"
          : playCount === 0
          ? "Toca para escuchar"
          : "Toca para repetir"}
      </p>

      <div className="flex gap-2">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSpeed(s);
              if (audioElRef.current) audioElRef.current.playbackRate = s;
            }}
            className={`rounded-full px-3 py-1 text-xs ${
              speed === s
                ? "bg-teal-400 text-ink-950"
                : "border border-ink-700 text-mist-400"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {playCount > 0 && (
        <p className="text-xs text-mist-400">Reproducciones: {playCount}</p>
      )}
    </div>
  );
}

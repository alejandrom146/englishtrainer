/**
 * AudioProvider: abstrae CÓMO se reproduce el audio de Listening. La
 * primera implementación usa la síntesis de voz del navegador (gratis, ya
 * usada en Conversación y Pronunciation Lab) — pero el resto del módulo
 * habla contra esta interfaz, no contra `speechSynthesis` directamente.
 * Cambiar a archivos MP3 pregrabados o un proveedor de TTS en la nube más
 * adelante (sección 22 del prompt del módulo) es reemplazar esta clase,
 * no reescribir Listening.
 */

import { getRankedEnglishVoices } from "@/lib/audio/selectVoice";

export interface PlaySegment {
  text: string;
  speaker?: string; // para conversaciones con más de un hablante
}

export interface AudioProvider {
  /** Reproduce uno o más segmentos en secuencia. */
  play(segments: PlaySegment[], rate: number, onEnd: () => void): void;
  pause(): void;
  resume(): void;
  cancel(): void;
}

class BrowserTtsProvider implements AudioProvider {
  private queue: PlaySegment[] = [];
  private rate = 1;
  private onEndCallback: (() => void) | null = null;
  private voicesBySpeaker = new Map<string, SpeechSynthesisVoice>();
  private defaultVoice: SpeechSynthesisVoice | null = null;

  async play(segments: PlaySegment[], rate: number, onEnd: () => void) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onEnd();
      return;
    }

    // Una voz distinta por hablante sí suena a dos personas — mucho más
    // natural que simular una segunda voz subiendo el pitch de la misma.
    if (this.voicesBySpeaker.size === 0) {
      const ranked = await getRankedEnglishVoices();
      this.defaultVoice = ranked[0] ?? null;
      const speakers = Array.from(new Set(segments.map((s) => s.speaker).filter(Boolean)));
      speakers.forEach((speaker, i) => {
        if (speaker && ranked[i]) this.voicesBySpeaker.set(speaker, ranked[i]);
      });
    }

    window.speechSynthesis.cancel();
    this.queue = [...segments];
    this.rate = rate;
    this.onEndCallback = onEnd;
    this.playNext();
  }

  private playNext() {
    const next = this.queue.shift();
    if (!next) {
      this.onEndCallback?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(next.text);
    const voice = (next.speaker && this.voicesBySpeaker.get(next.speaker)) || this.defaultVoice;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-GB";
    }
    utterance.rate = this.rate;
    utterance.onend = () => this.playNext();
    window.speechSynthesis.speak(utterance);
  }

  pause() {
    window.speechSynthesis?.pause();
  }

  resume() {
    window.speechSynthesis?.resume();
  }

  cancel() {
    window.speechSynthesis?.cancel();
    this.queue = [];
  }
}

export function getAudioProvider(): AudioProvider {
  return new BrowserTtsProvider();
}

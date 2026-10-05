// TypeScript no incluye los tipos de la Web Speech API por defecto.
// Esta es una declaración mínima, solo con lo que usamos en
// ConnectorChallenge.tsx. Soportado en Chrome/Edge; no está estandarizado
// en todos los navegadores.

declare global {
  interface SpeechRecognitionResultEvent extends Event {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: { [index: number]: { transcript: string } };
    };
  }

  interface SpeechRecognitionInstance extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }

  interface Window {
    SpeechRecognition?: { new (): SpeechRecognitionInstance };
    webkitSpeechRecognition?: { new (): SpeechRecognitionInstance };
  }
}

export {};

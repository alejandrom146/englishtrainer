"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getBestEnglishVoice } from "@/lib/audio/selectVoice";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function getSpeechRecognition(): { new (): SpeechRecognitionInstance } | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// Lee en voz alta la respuesta de la IA con la síntesis de voz del propio
// navegador — gratis, sin llamadas a ningún proveedor de TTS.
async function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
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

export function ConversationSession({
  conversationId,
  initialMessages,
  onExit,
}: {
  conversationId: string;
  initialMessages: ConversationMessage[];
  onExit: () => void;
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>(
    initialMessages
  );
  const [typedText, setTypedText] = useState("");
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported] = useState(() => !!getSpeechRecognition());
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || sending) return;
    setSending(true);
    setError(null);

    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content },
    ]);
    setTypedText("");

    const res = await fetch(`/api/conversations/${conversationId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    setSending(false);

    if (data.assistantMessage) {
      setMessages((prev) => [...prev, data.assistantMessage]);
      speak(data.assistantMessage.content);
    } else {
      setError(data.error ?? "No se pudo enviar el mensaje. Intenta de nuevo.");
    }
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      // Pequeño margen para que llegue el último resultado antes de enviar.
      setTimeout(() => {
        if (transcriptRef.current) sendMessage(transcriptRef.current);
      }, 300);
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    transcriptRef.current = "";
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-GB";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript;
      }
      transcriptRef.current = `${transcriptRef.current} ${finalText}`.trim();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleExit() {
    setEnding(true);
    await fetch(`/api/conversations/${conversationId}/end`, {
      method: "POST",
    }).then((res) => res.json());
    setEnding(false);
    onExit();
  }

  return (
    <div className="flex h-[60vh] flex-col sm:h-[70vh]">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-card border border-ink-700 bg-ink-900 p-3 sm:p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-card px-3 py-2 text-sm sm:max-w-[80%] ${
              m.role === "assistant"
                ? "bg-ink-800 text-mist-200"
                : "ml-auto bg-teal-400 text-ink-950"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:mt-4">
        {error && <p className="text-sm text-coral-400">{error}</p>}
        <div className="flex gap-2">
          <input
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage(typedText);
            }}
            placeholder="O escribe tu respuesta…"
            className="min-w-0 flex-1 rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />
          <Button
            variant="ghost"
            disabled={sending}
            onClick={() => sendMessage(typedText)}
          >
            Enviar
          </Button>
        </div>

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            {speechSupported ? (
              <button
                onClick={toggleListening}
                disabled={sending}
                className={`flex h-16 w-16 shrink-0 select-none items-center justify-center rounded-full text-2xl transition-colors ${
                  listening ? "bg-coral-400" : "bg-amber-400"
                } text-ink-950`}
              >
                🎙️
              </button>
            ) : (
              <p className="text-xs text-mist-400">
                Tu navegador no soporta reconocimiento de voz — usa el texto.
              </p>
            )}
            <span className="text-xs text-mist-400">
              {listening ? "Escuchando… toca para enviar" : "Toca para hablar"}
            </span>
          </div>

          <Button variant="ghost" disabled={ending} onClick={handleExit}>
            {ending ? "Cerrando…" : "Exit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

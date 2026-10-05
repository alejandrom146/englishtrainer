"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const LEVELS: { value: string; label: string; hint: string }[] = [
  { value: "A2", label: "A2", hint: "Entiendo frases simples y puedo presentarme." },
  { value: "B1", label: "B1", hint: "Puedo mantener una charla sencilla, pero me cuesta fluidez." },
  { value: "B2", label: "B2", hint: "Entiendo bastante y converso, pero quiero sonar más natural." },
  { value: "C1", label: "C1", hint: "Me manejo bien, busco pulir detalles y vocabulario." },
];

const MINUTE_OPTIONS = [15, 30, 45, 60];

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();

  const [name, setName] = useState(defaultName);
  const [level, setLevel] = useState("B2");
  const [variant, setVariant] = useState("british");
  const [minutes, setMinutes] = useState(35);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/settings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name,
        overall_level: level,
        target_variant: variant,
        daily_minutes_goal: minutes,
        onboarding_completed: true,
      }),
    });

    if (!res.ok) {
      setSaving(false);
      const data = await res.json();
      setError(data.error ?? "No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-teal-400">English Personal Trainer</p>
        <h1 className="mt-1 text-2xl font-semibold text-mist-50">
          Armemos tu perfil
        </h1>
        <p className="mt-1 text-sm text-mist-400">
          Un par de preguntas para adaptar la app desde el primer día.
        </p>
      </div>

      <Card>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-mist-200">¿Cómo te llamamos?</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />
        </label>
      </Card>

      <Card>
        <p className="text-sm text-mist-200">¿Cuál describe mejor tu nivel actual?</p>
        <div className="mt-3 flex flex-col gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLevel(l.value)}
              className={`rounded-card border px-3 py-2.5 text-left transition-colors ${
                level === l.value
                  ? "border-amber-400 bg-ink-900"
                  : "border-ink-700"
              }`}
            >
              <span className="text-sm text-mist-50">{l.label}</span>
              <p className="text-xs text-mist-400">{l.hint}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-mist-400">
          Es solo un punto de partida — la app se va a ir ajustando sola
          con tu progreso real.
        </p>
      </Card>

      <Card>
        <p className="text-sm text-mist-200">¿Qué variante de inglés preferís?</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setVariant("british")}
            className={`flex-1 rounded-card border px-3 py-2.5 text-sm ${
              variant === "british" ? "border-amber-400 bg-ink-900 text-mist-50" : "border-ink-700 text-mist-200"
            }`}
          >
            British 🇬🇧
          </button>
          <button
            onClick={() => setVariant("american")}
            className={`flex-1 rounded-card border px-3 py-2.5 text-sm ${
              variant === "american" ? "border-amber-400 bg-ink-900 text-mist-50" : "border-ink-700 text-mist-200"
            }`}
          >
            American 🇺🇸
          </button>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-mist-200">¿Cuánto tiempo querés practicar por día?</p>
        <div className="mt-3 flex gap-2">
          {MINUTE_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`flex-1 rounded-card border px-3 py-2.5 text-sm ${
                minutes === m ? "border-amber-400 bg-ink-900 text-mist-50" : "border-ink-700 text-mist-200"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-mist-400">
          Podés cambiarlo cuando quieras desde Settings.
        </p>
      </Card>

      {error && <p className="text-sm text-coral-400">{error}</p>}

      <Button disabled={saving} onClick={handleStart} className="w-full">
        {saving ? "Configurando…" : "Empezar"}
      </Button>
    </div>
  );
}

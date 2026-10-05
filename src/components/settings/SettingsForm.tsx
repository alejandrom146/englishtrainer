"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export interface ProfileData {
  display_name: string | null;
  overall_level: string;
  target_variant: string;
  daily_minutes_goal: number;
  ai_daily_limit_usd: number | null;
  ai_monthly_limit_usd: number | null;
}

export function SettingsForm({ initialProfile, email }: { initialProfile: ProfileData; email: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [level, setLevel] = useState(initialProfile.overall_level);
  const [variant, setVariant] = useState(initialProfile.target_variant);
  const [minutes, setMinutes] = useState(initialProfile.daily_minutes_goal);
  const [dailyLimit, setDailyLimit] = useState<string>(
    initialProfile.ai_daily_limit_usd?.toString() ?? ""
  );
  const [monthlyLimit, setMonthlyLimit] = useState<string>(
    initialProfile.ai_monthly_limit_usd?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/settings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName,
        overall_level: level,
        target_variant: variant,
        daily_minutes_goal: minutes,
        ai_daily_limit_usd: dailyLimit.trim() === "" ? null : Number(dailyLimit),
        ai_monthly_limit_usd: monthlyLimit.trim() === "" ? null : Number(monthlyLimit),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "No se pudo guardar.");
      return;
    }

    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="text-xs text-mist-400">CUENTA</p>
        <p className="mt-1 text-sm text-mist-200">{email}</p>
      </Card>

      <Card>
        <p className="text-xs text-mist-400">PERFIL</p>

        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="text-mist-200">Nombre</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />
        </label>

        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="text-mist-200">Nivel</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <span className="text-xs text-mist-400">
            Se usa para elegir el nivel de los ejercicios de Listening.
          </span>
        </label>

        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="text-mist-200">Variante de inglés</span>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className="rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          >
            <option value="british">British English</option>
            <option value="american">American English</option>
          </select>
        </label>

        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="text-mist-200">Minutos diarios objetivo</span>
          <input
            type="number"
            min={10}
            max={120}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />
          <span className="text-xs text-mist-400">
            El Daily Challenge arma la sesión alrededor de este número (varía
            un poco día a día).
          </span>
        </label>

        {error && <p className="mt-3 text-sm text-coral-400">{error}</p>}

        <Button className="mt-5 w-full" disabled={saving} onClick={handleSave}>
          {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar cambios"}
        </Button>
      </Card>

      <Card>
        <p className="text-xs text-mist-400">LÍMITES DE COSTO DE IA</p>
        <p className="mt-1 text-xs text-mist-400">
          Dejalo vacío para no tener límite. Si lo alcanzás, los módulos con
          IA (Connector Challenge, Conversación, Pronunciation Lab,
          Describe the Image, y parte de Listening) se bloquean hasta que
          lo subas o pase el período — los módulos 100% locales
          (Vocabulary, Dictation, Fill the Gaps, Complete the Sentence)
          nunca se ven afectados.
        </p>

        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="text-mist-200">Límite diario (USD)</span>
          <input
            type="number"
            min={0}
            step={0.5}
            placeholder="Sin límite"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            className="rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />
        </label>

        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="text-mist-200">Límite mensual (USD)</span>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="Sin límite"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            className="rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
          />
        </label>

        <Button className="mt-5 w-full" disabled={saving} onClick={handleSave}>
          {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar cambios"}
        </Button>
      </Card>

      <Button variant="ghost" disabled={signingOut} onClick={handleSignOut}>
        {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
      </Button>
    </div>
  );
}

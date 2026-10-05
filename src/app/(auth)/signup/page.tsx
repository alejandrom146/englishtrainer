"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 sm:px-6">
        <h1 className="text-2xl font-semibold text-mist-50">
          Revisa tu correo
        </h1>
        <p className="mt-3 text-sm text-mist-400">
          Te hemos enviado un enlace de confirmación a {email}.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 sm:px-6">
      <h1 className="text-2xl font-semibold text-mist-50">Crear cuenta</h1>
      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-mist-200">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-mist-200">Contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5 text-base text-mist-50 outline-none focus-visible:border-amber-400"
            />
          </label>

          {error && <p className="text-sm text-coral-400">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-mist-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-teal-400">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}

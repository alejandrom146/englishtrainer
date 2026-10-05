import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-5 py-10 sm:px-6 sm:py-16">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
        <div>
          <p className="text-sm font-medium text-teal-400">
            English Personal Trainer
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-mist-50 sm:text-4xl">
            Habla inglés con soltura, no solo respóndelo con la mente.
          </h1>
          <p className="mt-4 max-w-sm text-mist-400">
            Sesiones diarias de 30 a 45 minutos centradas en conversación
            real, conectores y pronunciación — pensadas para atención al
            cliente y entrevistas de trabajo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button>Crear cuenta</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
          </div>
        </div>

        {/* Hero: la interacción central de la app — hablar y ver la
            transcripción aparecer, no una métrica genérica. */}
        <Card className="bg-ink-900">
          <p className="text-xs text-mist-400">Customer Service · Level 4</p>
          <p className="mt-3 text-sm leading-relaxed text-mist-200">
            <span className="text-mist-400">AI:</span> What would you say to
            a customer whose order arrived late?
          </p>
          <p className="mt-3 rounded-card bg-ink-800 p-3 text-sm leading-relaxed text-mist-50">
            <span className="text-mist-400">You:</span> I completely
            understand your frustration — let me check what happened and
            find a solution for you.
          </p>
          <div className="mt-5 flex items-center gap-3 border-t border-ink-700 pt-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 text-ink-950">
              ●
            </span>
            <span className="text-xs text-mist-400">
              Hold to speak — "on the other hand" would sound even more
              natural here
            </span>
          </div>
        </Card>
      </div>
    </main>
  );
}

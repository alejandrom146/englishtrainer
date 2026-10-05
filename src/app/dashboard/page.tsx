import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSummary } from "@/lib/dashboardSummary";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DashboardStats } from "@/components/dashboard/DashboardStats";

const MODULES = [
  { href: "/dashboard/vocabulary", icon: "🗣️", label: "Vocabulary" },
  { href: "/dashboard/connectors", icon: "🔗", label: "Connectors" },
  { href: "/dashboard/pronunciation", icon: "🎙️", label: "Pronunciation" },
  { href: "/dashboard/conversation", icon: "💬", label: "Conversation" },
  { href: "/dashboard/listening", icon: "🎧", label: "Listening" },
  { href: "/dashboard/describe-image", icon: "🖼️", label: "Describe Image" },
];

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: onboarding } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (onboarding && !onboarding.onboarding_completed) {
      redirect("/onboarding");
    }
  }

  // Se calcula acá (Server Component) para que la primera pantalla ya
  // llegue con los datos reales — sin esperar un fetch extra del cliente.
  const summary = user ? await getDashboardSummary(supabase, user.id) : undefined;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <p className="text-sm text-mist-400">Hola de nuevo</p>
        <h1 className="truncate text-2xl font-semibold text-mist-50">
          {user?.email}
        </h1>
      </div>

      <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-2">
        <div>
          <Card>
            <p className="text-xs text-mist-400">TODAY&apos;S CHALLENGE</p>
            <p className="mt-2 text-lg font-medium text-mist-50">
              Tu sesión adaptativa de hoy
            </p>
            <p className="mt-1 text-sm text-mist-400">
              Entre 30 y 45 minutos repartidos entre los módulos, según qué
              necesitas practicar más.
            </p>
            <Link href="/dashboard/daily-challenge">
              <Button className="mt-4 w-full sm:w-auto">Ver reto de hoy</Button>
            </Link>
          </Card>

          <p className="mt-5 text-xs text-mist-400">O practica directamente:</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-3">
            {MODULES.map((m) => (
              <Link key={m.href} href={m.href}>
                <Card
                  interactive
                  className="flex flex-col items-center gap-1.5 p-3 text-center"
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span className="text-xs text-mist-200">{m.label}</span>
                </Card>
              </Link>
            ))}
          </div>

          <Link
            href="/dashboard/error-profile"
            className="mt-4 inline-block text-xs text-teal-400"
          >
            Ver mi Error Profile →
          </Link>
          <Link
            href="/dashboard/settings"
            className="mt-4 ml-4 inline-block text-xs text-mist-400"
          >
            ⚙️ Settings
          </Link>
          <Link
            href="/dashboard/ai-usage"
            className="mt-4 ml-4 inline-block text-xs text-mist-400"
          >
            💸 Consumo de IA
          </Link>
        </div>

        <DashboardStats initialSummary={summary} />
      </div>
    </main>
  );
}

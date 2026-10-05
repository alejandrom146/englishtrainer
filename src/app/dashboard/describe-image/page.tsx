import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { DescribeImageExercise } from "@/components/describe-image/DescribeImageExercise";

export default async function DescribeImagePage({
  searchParams,
}: {
  searchParams: { exercise_id?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseQuery = supabase
    .from("describe_image_exercises")
    .select("id, title, image_path, topic, cefr_level");

  const { data: exercises } = searchParams.exercise_id
    ? await baseQuery.eq("id", searchParams.exercise_id)
    : await baseQuery;

  // Sin pedido específico, elegimos una al azar entre las disponibles —
  // así no siempre es la misma imagen (sección 33 del prompt del módulo).
  const exercise = searchParams.exercise_id
    ? exercises?.[0]
    : exercises?.[Math.floor(Math.random() * (exercises?.length ?? 1))];

  const history = exercise
    ? (
        await supabase
          .from("user_describe_image_attempts")
          .select("attempt_number, overall_score")
          .eq("user_id", user?.id ?? "")
          .eq("exercise_id", exercise.id)
          .order("attempt_number", { ascending: true })
      ).data ?? []
    : [];

  return (
    <>
      <PageHeader
        title="Describe the Image"
        right={
          <Link href={`/dashboard/describe-image?r=${Date.now()}`} className="text-xs text-teal-400">
            Otra imagen
          </Link>
        }
      />
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        {!exercise && (
          <p className="text-center text-mist-400">
            Todavía no hay imágenes cargadas para este ejercicio.
          </p>
        )}
        {exercise && (
          <DescribeImageExercise exercise={exercise} initialHistory={history} />
        )}
      </main>
    </>
  );
}

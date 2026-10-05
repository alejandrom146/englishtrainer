"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

interface BlockWithStatus {
  type: string;
  minutes: number;
  label: string;
  href: string;
  done: boolean;
  progress: number;
}

interface DailyChallengeResponse {
  challenge: {
    planned_minutes: number;
    status: string;
    generated_reason: string;
  };
  blocks: BlockWithStatus[];
}

export default function DailyChallengePage() {
  const [data, setData] = useState<DailyChallengeResponse | null>(null);

  useEffect(() => {
    fetch("/api/daily-challenge/today")
      .then((res) => res.json())
      .then((d) => setData(d));
  }, []);

  return (
    <>
      <PageHeader title="Today's Challenge" />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {!data && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {data && (
          <>
            <Card>
              <p className="text-xs text-mist-400">
                🔥 {data.challenge.planned_minutes} MINUTES
              </p>
              <p className="mt-2 text-sm text-mist-200">
                {data.challenge.generated_reason}
              </p>
            </Card>

            <div className="mt-6 flex flex-col gap-3">
              {data.blocks.map((block) => (
                <Card
                  key={block.type}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        block.done
                          ? "bg-teal-400 text-ink-950"
                          : "border border-ink-700 text-mist-400"
                      }`}
                    >
                      {block.done ? "✓" : ""}
                    </span>
                    <div>
                      <p className="text-mist-50">{block.label}</p>
                      <p className="text-xs text-mist-400">{block.minutes} min</p>
                    </div>
                  </div>
                  <Link href={block.href}>
                    <Button variant={block.done ? "ghost" : "primary"}>
                      {block.done ? "Practicar más" : "Empezar"}
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>

            {data.challenge.status === "completed" && (
              <Card className="mt-6 text-center">
                <p className="text-mist-50">
                  🎉 Completaste el reto de hoy. ¡Buen trabajo!
                </p>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}

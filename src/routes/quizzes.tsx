import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StudentShell } from "@/components/StudentShell";

export const Route = createFileRoute("/quizzes")({
  head: () => ({
    meta: [
      { title: "الاختبارات | منصة المستر" },
      { name: "description", content: "بنك الأسئلة والاختبارات." },
      { property: "og:title", content: "الاختبارات | منصة المستر" },
      { property: "og:description", content: "بنك الأسئلة والاختبارات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuizzesPage,
});

function QuizzesPage() {
  const { data } = useQuery({
    queryKey: ["quizzes-public"],
    queryFn: async () => {
      const [quizzes, courses] = await Promise.all([
        supabase.rpc("get_quizzes_catalog"),
        supabase.from("courses").select("id, title"),
      ]);
      if (quizzes.error) throw quizzes.error;
      const titles = new Map((courses.data ?? []).map((c) => [c.id, c.title]));
      return (quizzes.data ?? []).map((q) => ({
        ...q,
        courseTitle: q.course_id ? (titles.get(q.course_id) ?? null) : null,
      }));
    },
  });

  return (
    <StudentShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-black">الاختبارات</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            امتحن نفسك على كل جزء دراسي بعد ما تخلصه.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {(data ?? []).map((q) => (
            <div key={q.id} className="soft-card rounded-2xl p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
                <ListChecks className="size-5" />
              </span>
              <h3 className="mt-3 font-black">{q.title}</h3>
              {q.courses && (
                <p className="mt-1 text-xs font-bold text-primary">
                  {(q.courses as { title: string }).title}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-card px-2 py-1 font-bold">
                  المدة: {q.duration_minutes} دقيقة
                </span>
                <span className="rounded-full bg-card px-2 py-1 font-bold">
                  الأسئلة: {(q.quiz_questions as unknown[])?.length ?? 0}
                </span>
                <span className="rounded-full bg-card px-2 py-1 font-bold">
                  النجاح: {q.pass_score}%
                </span>
              </div>
            </div>
          ))}
          {(data ?? []).length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">
              لا توجد اختبارات حاليًا.
            </p>
          )}
        </div>
      </div>
    </StudentShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileCheck2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StudentShell } from "@/components/StudentShell";

export const Route = createFileRoute("/assignments")({
  head: () => ({
    meta: [
      { title: "الواجبات | منصة المستر" },
      { name: "description", content: "واجبات بأسئلة اختيار من متعدد وصح وخطأ بتصحيح فوري." },
      { property: "og:title", content: "الواجبات | منصة المستر" },
      { property: "og:description", content: "واجبات بتصحيح فوري." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssignmentsPage,
});

type CatalogRow = {
  id: string;
  course_id: string | null;
  title: string;
  instructions: string | null;
  description: string | null;
  max_score: number;
  duration_minutes: number;
  pass_score: number;
  question_count: number;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function AssignmentsPage() {
  const { data } = useQuery({
    queryKey: ["assignments-public"],
    queryFn: async () => {
      const [catalog, courses] = await Promise.all([
        rpc("get_assignments_catalog"),
        supabase.from("courses").select("id, title"),
      ]);
      if (catalog.error) throw catalog.error;
      const titles = new Map((courses.data ?? []).map((course) => [course.id, course.title]));
      return ((catalog.data ?? []) as CatalogRow[]).map((row) => ({
        ...row,
        courseTitle: row.course_id ? (titles.get(row.course_id) ?? null) : null,
      }));
    },
  });

  return (
    <StudentShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-black">الواجبات</h1>
          <p className="mt-2 text-sm text-muted-foreground">حل أسئلة الواجب وشوف درجتك فورًا.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {(data ?? []).map((row) => (
            <Link key={row.id} to="/assignments/$assignmentId" params={{ assignmentId: row.id }} className="soft-card block rounded-2xl p-5 transition-colors hover:bg-primary/5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><FileCheck2 className="size-5" /></span>
              <h3 className="mt-3 font-black">{row.title}</h3>
              {row.courseTitle && <p className="mt-1 text-xs font-bold text-primary">{row.courseTitle}</p>}
              {(row.instructions || row.description) && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{row.instructions || row.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-card px-2 py-1 font-bold">الأسئلة: {row.question_count ?? 0}</span>
                <span className="rounded-full bg-card px-2 py-1 font-bold">المدة: {row.duration_minutes} دقيقة</span>
                <span className="rounded-full bg-card px-2 py-1 font-bold">الدرجة: {row.max_score}</span>
              </div>
            </Link>
          ))}
          {(data ?? []).length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">لا توجد واجبات حاليًا.</p>
          )}
        </div>
      </div>
    </StudentShell>
  );
}

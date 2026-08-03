import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileCheck2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StudentShell } from "@/components/StudentShell";

export const Route = createFileRoute("/assignments")({
  head: () => ({
    meta: [
      { title: "الواجبات | منصة المستر" },
      { name: "description", content: "الواجبات المطلوبة من الطلاب." },
      { property: "og:title", content: "الواجبات | منصة المستر" },
      { property: "og:description", content: "الواجبات المطلوبة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { data } = useQuery({
    queryKey: ["assignments-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("*, courses(title)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <StudentShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-black">الواجبات</h1>
          <p className="mt-2 text-sm text-muted-foreground">كل الواجبات المطلوبة من الطلاب.</p>
        </header>

        <div className="space-y-3">
          {(data ?? []).map((a) => (
            <Link key={a.id} to="/assignments/$assignmentId" params={{ assignmentId: a.id }} className="soft-card flex items-start gap-3 rounded-2xl p-4 hover:bg-primary/5 transition-colors">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <FileCheck2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-black">{a.title}</h3>
                {a.instructions && (
                  <p className="mt-1 text-sm text-muted-foreground">{a.instructions}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-card px-2 py-1 font-bold">
                    الدرجة: {a.max_score}
                  </span>
                  {a.courses && (
                    <span className="rounded-full bg-card px-2 py-1 font-bold text-primary">
                      {(a.courses as { title: string }).title}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(data ?? []).length === 0 && (
            <p className="text-center text-muted-foreground">لا توجد واجبات حاليًا.</p>
          )}
        </div>
      </div>
    </StudentShell>
  );
}

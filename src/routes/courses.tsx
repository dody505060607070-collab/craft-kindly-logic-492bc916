import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ListChecks, Lock, PlayCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentShell } from "@/components/StudentShell";
import { applyVariant, getSessionKey, pickVariant, recordVariantEvent, type CourseVariant } from "@/lib/ab";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "الدروس | منصة المستر" },
      { name: "description", content: "استعرض كل الدروس المتاحة على منصة المستر." },
      { property: "og:title", content: "الدروس | منصة المستر" },
      { property: "og:description", content: "دروس برمجة وذكاء اصطناعي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursesList,
});

function CoursesList() {
  const { user } = useAuth();
  const sessionKey = getSessionKey();
  const { data: courses } = useQuery({
    queryKey: ["public-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("sort_order");
      return data ?? [];
    },
  });
  const { data: variants } = useQuery({
    queryKey: ["public-variants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_variants")
        .select("*")
        .eq("is_active", true);
      return (data ?? []) as CourseVariant[];
    },
  });
  const { data: myEnrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      return new Set((data ?? []).map((e) => e.course_id));
    },
  });

  const variantByCourse = useMemo(() => {
    const map = new Map<string, CourseVariant | null>();
    for (const c of courses ?? []) {
      const list = (variants ?? []).filter((v) => v.course_id === c.id);
      map.set(c.id, pickVariant(c.id, list, sessionKey));
    }
    return map;
  }, [courses, variants, sessionKey]);

  useEffect(() => {
    if (!courses) return;
    for (const c of courses) {
      const v = variantByCourse.get(c.id) ?? null;
      recordVariantEvent(c.id, v?.id ?? null, "view", user?.id).catch(() => {});
    }
  }, [courses, variantByCourse, user?.id]);

  return (
    <StudentShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-black sm:text-4xl">الدروس</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            اختر الدرس اللي يناسبك، ولو مش مشترك اضغط "اشترك" لتفعيل الوصول للفيديوهات.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((raw) => {
            const v = variantByCourse.get(raw.id) ?? null;
            const c = applyVariant(raw, v);
            const enrolled = myEnrollments?.has(c.id);
            return (
              <article
                key={c.id}
                className="soft-card group flex flex-col overflow-hidden rounded-3xl"
              >
                <div className="relative h-40 bg-gradient-to-br from-primary/20 to-accent/20">
                  {c.cover_url ? (
                    <img
                      src={c.cover_url}
                      alt={c.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <BookOpen className="size-14 text-primary/50" />
                    </div>
                  )}
                  {c.is_free && (
                    <span className="absolute top-3 right-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white">
                      مجاني
                    </span>
                  )}
                  {v && (
                    <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                      {v.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {c.grade && (
                    <p className="text-xs font-bold text-primary">{c.grade}</p>
                  )}
                  <h3 className="mt-1 line-clamp-2 font-black">{c.title}</h3>
                  {c.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {c.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-sm font-black">
                      {c.is_free ? "مجاني" : `${c.price} ج.م`}
                    </span>
                    {enrolled || c.is_free ? (
                      <Link
                        to="/courses/$courseId"
                        params={{ courseId: c.id }}
                        onClick={() => recordVariantEvent(c.id, v?.id ?? null, "click", user?.id).catch(() => {})}
                        className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                      >
                        <PlayCircle className="size-4" /> ابدأ
                      </Link>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          to="/courses/$courseId"
                          params={{ courseId: c.id }}
                          onClick={() => recordVariantEvent(c.id, v?.id ?? null, "click", user?.id).catch(() => {})}
                          className="flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-xs font-bold hover:bg-primary/10"
                        >
                          <ListChecks className="size-3.5" /> المحتويات
                        </Link>
                        <Link
                          to="/subscribe/$courseId"
                          params={{ courseId: c.id }}
                          onClick={() => recordVariantEvent(c.id, v?.id ?? null, "enroll", user?.id).catch(() => {})}
                          className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                        >
                          <Lock className="size-3.5" /> اشترك
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {(courses ?? []).length === 0 && (
          <p className="mt-8 text-center text-muted-foreground">لا توجد دروس حاليًا.</p>
        )}
      </div>
    </StudentShell>
  );
}

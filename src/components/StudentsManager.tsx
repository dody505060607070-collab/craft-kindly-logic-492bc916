import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChevronDown, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  grade: string | null;
  is_active: boolean;
};

type Enrollment = { id: string; user_id: string; course_id: string; expires_at: string | null; progress: number };
type Course = { id: string; title: string };
type Submission = {
  id: string;
  user_id: string;
  grade: number | null;
  created_at: string;
  assignments: { title: string } | null;
};

const fmt = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("ar-EG") : "مفتوح";

/** إدارة مبسطة للطلاب: بحث + فتح/إلغاء اشتراك بشهر أو سنة + متابعة الواجبات. */
export function StudentsManager() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["students-manager"],
    queryFn: async () => {
      const [profiles, courses, enrollments, submissions] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, parent_phone, grade, is_active").order("created_at", { ascending: false }),
        supabase.from("courses").select("id, title").order("sort_order"),
        supabase.from("enrollments").select("id, user_id, course_id, expires_at, progress"),
        supabase
          .from("assignment_submissions")
          .select("id, user_id, grade, created_at, assignments(title)")
          .order("created_at", { ascending: false }),
      ]);
      if (profiles.error) throw profiles.error;
      return {
        profiles: (profiles.data ?? []) as Profile[],
        courses: (courses.data ?? []) as Course[],
        enrollments: (enrollments.data ?? []) as Enrollment[],
        submissions: (submissions.data ?? []) as unknown as Submission[],
      };
    },
  });

  const grant = useMutation({
    mutationFn: async ({ userId, courseId, days }: { userId: string; courseId: string; days: number }) => {
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("enrollments")
        .upsert({ user_id: userId, course_id: courseId, progress: 0, expires_at: expires }, { onConflict: "user_id,course_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تفعيل الاشتراك");
      qc.invalidateQueries({ queryKey: ["students-manager"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enrollments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إلغاء الاشتراك");
      qc.invalidateQueries({ queryKey: ["students-manager"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const q = term.trim();
    if (!q) return data?.profiles ?? [];
    return (data?.profiles ?? []).filter(
      (p) => p.full_name?.includes(q) || p.phone?.includes(q) || p.grade?.includes(q),
    );
  }, [data?.profiles, term]);

  if (isLoading) {
    return (
      <div className="glass grid place-items-center rounded-2xl py-14">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass flex items-center gap-2 rounded-2xl px-4 py-2.5">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="ابحث باسم الطالب أو رقمه…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {filtered.length === 0 && (
        <p className="glass rounded-2xl py-10 text-center text-sm text-muted-foreground">لا يوجد طلاب مطابقين.</p>
      )}

      {filtered.map((student) => {
        const studentEnrollments = (data?.enrollments ?? []).filter((e) => e.user_id === student.id);
        const studentSubs = (data?.submissions ?? []).filter((s) => s.user_id === student.id);
        const isOpen = openId === student.id;
        return (
          <div key={student.id} className="glass rounded-2xl p-4">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : student.id)}
              className="flex w-full items-center gap-3 text-right"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-black text-primary">
                {student.full_name?.slice(0, 1) || "ط"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">{student.full_name}</span>
                <span className="block text-xs text-muted-foreground">
                  {student.phone || "بدون رقم"} · {student.grade || "بدون صف"} · {studentEnrollments.length} اشتراك
                </span>
              </span>
              {!student.is_active && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-black text-destructive">موقوف</span>
              )}
              <ChevronDown className={`size-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
                <div>
                  <p className="mb-2 text-xs font-black text-muted-foreground">الاشتراكات الحالية</p>
                  {studentEnrollments.length === 0 && (
                    <p className="text-xs text-muted-foreground">لا يوجد اشتراك بعد.</p>
                  )}
                  <div className="space-y-2">
                    {studentEnrollments.map((enrollment) => {
                      const course = (data?.courses ?? []).find((c) => c.id === enrollment.course_id);
                      const expired = enrollment.expires_at && new Date(enrollment.expires_at) < new Date();
                      return (
                        <div key={enrollment.id} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs">
                          <span className="min-w-0 flex-1 truncate font-bold">{course?.title ?? enrollment.course_id}</span>
                          <span className={expired ? "text-destructive" : "text-muted-foreground"}>
                            ينتهي: {fmt(enrollment.expires_at)}
                          </span>
                          <button
                            type="button"
                            onClick={() => grant.mutate({ userId: student.id, courseId: enrollment.course_id, days: 30 })}
                            className="rounded-lg bg-card px-2 py-1 font-bold"
                          >
                            +شهر
                          </button>
                          <button
                            type="button"
                            onClick={() => grant.mutate({ userId: student.id, courseId: enrollment.course_id, days: 365 })}
                            className="rounded-lg bg-card px-2 py-1 font-bold"
                          >
                            +سنة
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("إلغاء اشتراك الطالب في هذا الكورس؟")) revoke.mutate(enrollment.id);
                            }}
                            className="rounded-lg bg-card p-1.5 text-destructive"
                            aria-label="إلغاء الاشتراك"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-black text-muted-foreground">فتح كورس جديد للطالب</p>
                  <div className="flex flex-wrap gap-2">
                    {(data?.courses ?? [])
                      .filter((course) => !studentEnrollments.some((e) => e.course_id === course.id))
                      .map((course) => (
                        <div key={course.id} className="flex items-center gap-1 rounded-xl bg-surface px-3 py-2 text-xs">
                          <CalendarCheck className="size-3.5 text-primary" />
                          <span className="font-bold">{course.title}</span>
                          <button
                            type="button"
                            onClick={() => grant.mutate({ userId: student.id, courseId: course.id, days: 30 })}
                            className="rounded-lg bg-primary/15 px-2 py-1 font-bold text-primary"
                          >
                            شهر
                          </button>
                          <button
                            type="button"
                            onClick={() => grant.mutate({ userId: student.id, courseId: course.id, days: 365 })}
                            className="rounded-lg bg-primary/15 px-2 py-1 font-bold text-primary"
                          >
                            سنة
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-black text-muted-foreground">واجبات الطالب</p>
                  {studentSubs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">لم يسلّم أي واجب بعد.</p>
                  ) : (
                    <div className="space-y-1">
                      {studentSubs.map((submission) => (
                        <div key={submission.id} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs">
                          <span className="min-w-0 flex-1 truncate font-bold">
                            {submission.assignments?.title ?? "واجب"}
                          </span>
                          <span className="text-muted-foreground">
                            {submission.grade === null ? "لم يُصحح" : `الدرجة: ${submission.grade}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

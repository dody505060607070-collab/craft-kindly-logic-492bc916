import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileCheck2, Loader2, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentShell } from "@/components/StudentShell";
import { toast } from "sonner";

export const Route = createFileRoute("/assignments/$assignmentId")({
  head: () => ({ meta: [
    { title: "حل الواجب | منصة المستر" },
    { name: "description", content: "اقرأ الواجب وأرسل إجابتك للمراجعة." },
    { property: "og:title", content: "حل الواجب | منصة المستر" },
    { property: "og:description", content: "اقرأ الواجب وأرسل إجابتك للمراجعة." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AssignmentDetailPage,
});

function AssignmentDetailPage() {
  const { assignmentId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*, courses(title)")
        .eq("id", assignmentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: submission } = useQuery({
    queryKey: ["assignment-submission", assignmentId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");
      const query = submission
        ? supabase.from("assignment_submissions").update({ content, updated_at: new Date().toISOString() }).eq("id", submission.id)
        : supabase.from("assignment_submissions").insert({ assignment_id: assignmentId, user_id: user.id, content });
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تسليم الواجب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["assignment-submission", assignmentId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "تعذر تسليم الواجب");
    },
  });

  if (isLoading) {
    return (
      <StudentShell>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </StudentShell>
    );
  }

  if (!assignment) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-4xl px-4 py-8 text-center">
          <AlertCircle className="mx-auto size-12 text-destructive opacity-50" />
          <h1 className="mt-4 text-2xl font-black">الواجب غير موجود</h1>
          <button onClick={() => navigate({ to: "/assignments" })} className="mt-4 text-primary font-bold underline">
            الرجوع لقائمة الواجبات
          </button>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <FileCheck2 className="size-6" />
            </span>
            <div>
              <h1 className="font-display text-3xl font-black">{assignment.title}</h1>
              {assignment.courses && (
                <p className="text-sm font-bold text-primary">{(assignment.courses as any).title}</p>
              )}
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="glass rounded-2xl p-6">
              <h2 className="mb-4 text-lg font-black">التعليمات</h2>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {assignment.instructions || "لا توجد تعليمات خاصة."}
              </div>
            </section>

            {submission && !content ? (
              <section className="glass rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-6">
                <div className="flex items-center gap-2 text-emerald-500 mb-4">
                  <CheckCircle2 className="size-5" />
                  <h2 className="text-lg font-black">تم التسليم</h2>
                </div>
                <div className="rounded-xl bg-card p-4 text-sm whitespace-pre-wrap">
                  {submission.content}
                </div>
                {submission.grade !== null && (
                  <div className="mt-4 rounded-xl bg-primary/10 p-4 border border-primary/20">
                    <p className="font-bold text-primary">الدرجة: {submission.grade} / {assignment.max_score}</p>
                    {submission.feedback && (
                      <p className="mt-2 text-sm text-muted-foreground">ملاحظات المستر: {submission.feedback}</p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setContent(submission.content || "");
                    // We allow editing if not graded yet
                    if (submission.grade === null) {
                       setContent(submission.content || "");
                      toast.info("يمكنك تعديل إجابتك الآن");
                    }
                  }}
                  disabled={submission.grade !== null}
                  className="mt-4 text-xs font-bold text-muted-foreground underline disabled:opacity-50"
                >
                  تعديل التسليم
                </button>
              </section>
             ) : user ? (
              <section className="glass rounded-2xl p-6">
                <h2 className="mb-4 text-lg font-black">تسليم الواجب</h2>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب إجابتك هنا..."
                  className="min-h-[200px] w-full rounded-xl border border-input bg-surface p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || !content.trim()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Send className="size-5" />
             ) : (
               <section className="glass rounded-2xl p-6 text-center">
                 <p className="font-bold">سجّل دخولك أولاً عشان تقدر تسلّم الواجب.</p>
                 <button onClick={() => navigate({ to: "/auth" })} className="mt-4 rounded-xl bg-primary px-5 py-2.5 font-black text-primary-foreground">تسجيل الدخول</button>
               </section>
             )}
                  تسليم الواجب
                </button>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <div className="soft-card rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-black">معلومات</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الدرجة القصوى</span>
                  <span className="font-bold">{assignment.max_score}</span>
                </div>
                {assignment.due_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">موعد التسليم</span>
                    <span className="font-bold text-destructive">
                      {new Date(assignment.due_at).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </StudentShell>
  );
}

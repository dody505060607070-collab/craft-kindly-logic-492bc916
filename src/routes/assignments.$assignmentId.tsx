import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { FileCheck2, Loader2, Send, AlertCircle, CheckCircle2, Timer, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { gradeEssayAnswers } from "@/lib/assessments.functions";
import { useAuth } from "@/lib/auth";
import { StudentShell } from "@/components/StudentShell";
import { toast } from "sonner";

export const Route = createFileRoute("/assignments/$assignmentId")({
  head: () => ({ meta: [
    { title: "حل الواجب | منصة المستر" },
    { name: "description", content: "حل أسئلة الواجب (اختيار من متعدد وصح وخطأ) وشوف درجتك فورًا." },
    { property: "og:title", content: "حل الواجب | منصة المستر" },
    { property: "og:description", content: "حل أسئلة الواجب وشوف درجتك فورًا." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AssignmentDetailPage,
});

type Question = { id: string; question: string; options: string[]; points: number; sort_order: number; kind: string };

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function AssignmentDetailPage() {
  const { assignmentId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [questionsFileUrl, setQuestionsFileUrl] = useState<string | null>(null);

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, instructions, description, due_at, max_score, duration_minutes, pass_score, questions_file_url, course_id, lesson_id, max_attempts, courses(title)")
        .eq("id", assignmentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["assignment-questions", assignmentId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await rpc("get_assignment_questions_for_student", { _assignment_id: assignmentId });
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["assignment-submissions", assignmentId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const submission = submissions[0];
  const submissionCount = submissions.length;
  const isMaxAttemptsReached = assignment ? (Number((assignment as any).max_attempts || 0) > 0 && submissionCount >= Number((assignment as any).max_attempts || 0)) : false;

  // signed url for the questions file (stored as storage:<path>)
  useEffect(() => {
    const raw = assignment?.questions_file_url;
    if (!raw) { setQuestionsFileUrl(null); return; }
    if (!raw.startsWith("storage:")) { setQuestionsFileUrl(raw); return; }
    let active = true;
    void supabase.storage
      .from("assessment-files")
      .createSignedUrl(raw.slice("storage:".length), 60 * 60)
      .then(({ data }) => { if (active) setQuestionsFileUrl(data?.signedUrl ?? null); });
    return () => { active = false; };
  }, [assignment?.questions_file_url]);

  const gradeEssays = useServerFn(gradeEssayAnswers);

  const submitChoices = useMutation({
    mutationFn: async (isAutoSubmit?: boolean) => {
      const answered = questions.filter((question) => {
        const value = answers[question.id];
        return typeof value === "number" ? true : typeof value === "string" && value.trim().length > 0;
      });
      if (!isAutoSubmit && answered.length !== questions.length) throw new Error("جاوب على كل الأسئلة الأول");
      const { data, error } = await rpc("submit_assignment_answers", { _assignment_id: assignmentId, _answers: answers });
      if (error) throw error;
      const row = (data as { submission_id: string; score: number; max_score: number; passed: boolean }[] | null)?.[0];
      if (!row) throw new Error("تعذر حفظ النتيجة");

      if (questions.some((question) => question.kind === "essay") && row.submission_id) {
        try {
          const graded = await gradeEssays({ data: { mode: "assignment" as const, recordId: row.submission_id } });
          return { score: Number(graded.totalScore ?? row.score), max_score: Number(graded.totalMax ?? row.max_score), passed: Boolean(graded.passed) };
        } catch {
          toast.message("تم التسليم — تصحيح الأسئلة المقالية هيظهر بعد شوية");
        }
      }
      return row;
    },
    onSuccess: (row) => {
      toast.success(`تم التسليم! درجتك: ${row.score} / ${row.max_score}`);
      setStarted(false);
      queryClient.invalidateQueries({ queryKey: ["assignment-submissions", assignmentId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "تعذر تسليم الواجب"),
  });

  const submitText = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["assignment-submissions", assignmentId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "تعذر تسليم الواجب"),
  });

  useEffect(() => {
    if (!started || timeLeft === null) return;
    if (timeLeft <= 0) { 
      toast.info("انتهى وقت الواجب، يتم التسليم تلقائياً...");
      submitChoices.mutate(true); 
      return; 
    }
    const timer = setTimeout(() => setTimeLeft((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, timeLeft]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  if (isLoading) {
    return (
      <StudentShell>
        <div className="flex h-[50vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
      </StudentShell>
    );
  }

  if (!assignment) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-4xl px-4 py-8 text-center">
          <AlertCircle className="mx-auto size-12 text-destructive opacity-50" />
          <h1 className="mt-4 text-2xl font-black">الواجب غير موجود</h1>
          <button onClick={() => navigate({ to: "/assignments" })} className="mt-4 font-bold text-primary underline">الرجوع لقائمة الواجبات</button>
        </div>
      </StudentShell>
    );
  }

  const hasQuestions = questions.length > 0;
  const current = questions[index];

  return (
    <StudentShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary"><FileCheck2 className="size-6" /></span>
            <div>
              <h1 className="font-display text-3xl font-black">{assignment.title}</h1>
              {assignment.courses && <p className="text-sm font-bold text-primary">{(assignment.courses as { title: string }).title}</p>}
            </div>
          </div>
          {started && timeLeft !== null && (
            <span className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 font-black text-destructive">
              <Timer className="size-4" /> {formatTime(timeLeft)}
            </span>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="glass rounded-2xl p-6">
              <h2 className="mb-3 text-lg font-black">التعليمات</h2>
              <p className="text-sm whitespace-pre-wrap">{assignment.instructions || assignment.description || "لا توجد تعليمات خاصة."}</p>
              {questionsFileUrl && (
                <a href={questionsFileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                  <FileText className="size-4" /> افتح ملف أسئلة الواجب
                </a>
              )}
            </section>

            {!user ? (
              <section className="glass rounded-2xl p-6 text-center">
                <p className="font-bold">سجّل دخولك أولاً عشان تقدر تحل الواجب.</p>
                <button onClick={() => navigate({ to: "/auth" })} className="mt-4 rounded-xl bg-primary px-5 py-2.5 font-black text-primary-foreground">تسجيل الدخول</button>
              </section>
            ) : submission && !started ? (
              <section className="glass rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-6">
                <div className="mb-4 flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="size-5" /><h2 className="text-lg font-black">تم التسليم</h2>
                </div>
                {submission.content && <div className="rounded-xl bg-card p-4 text-sm whitespace-pre-wrap">{submission.content}</div>}
                {submission.grade !== null && (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
                    <p className="font-black text-primary">الدرجة: {submission.grade} / {submission.max_score ?? assignment.max_score}</p>
                    {submission.passed !== null && (
                      <p className="mt-1 text-sm font-bold">{submission.passed ? "ناجح 🎉" : "محتاج مراجعة الدرس تاني"}</p>
                    )}
                    {submission.feedback && <p className="mt-2 text-sm text-muted-foreground">ملاحظات المستر: {submission.feedback}</p>}
                  </div>
                )}
                {hasQuestions && (
                  <button 
                    onClick={() => { setAnswers({}); setIndex(0); setStarted(true); setTimeLeft(assignment.duration_minutes ? assignment.duration_minutes * 60 : null); }} 
                    disabled={isMaxAttemptsReached}
                    className="mt-4 text-xs font-bold text-muted-foreground underline disabled:no-underline disabled:opacity-50"
                  >
                    {isMaxAttemptsReached ? "لا توجد محاولات متبقية" : "أعِد حل الواجب"}
                  </button>
                )}
              </section>
            ) : hasQuestions ? (
              started && current ? (
                <section className="glass rounded-2xl p-6">
                  <div className="mb-4 flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>سؤال {index + 1} من {questions.length}</span>
                    <span>{current.kind === "truefalse" ? "صح وخطأ" : current.kind === "essay" ? "مقالي" : "اختيار من متعدد"}</span>
                  </div>
                  <h2 className="text-lg font-black">{current.question}</h2>
                  {current.kind === "essay" ? (
                    <div className="mt-4">
                      <textarea
                        value={typeof answers[current.id] === "string" ? (answers[current.id] as string) : ""}
                        onChange={(event) => setAnswers((value) => ({ ...value, [current.id]: event.target.value }))}
                        rows={7}
                        className="w-full rounded-xl border border-input bg-surface p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="اكتب إجابتك بالتفصيل هنا…"
                      />
                      <p className="mt-2 text-xs text-muted-foreground">سؤال مقالي — التصحيح بالذكاء الاصطناعي بعد التسليم.</p>
                    </div>
                  ) : (
                  <div className="mt-4 space-y-2">
                    {(current.options ?? []).map((option, optionIndex) => (
                      <button
                        key={optionIndex}
                        type="button"
                        onClick={() => setAnswers((value) => ({ ...value, [current.id]: optionIndex }))}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right text-sm font-bold transition-colors ${answers[current.id] === optionIndex ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-surface"}`}
                      >
                        <span className="grid size-6 place-items-center rounded-full border border-current text-xs">{optionIndex + 1}</span>
                        {option}
                      </button>
                    ))}
                  </div>
                  )}
                  <div className="mt-6 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} className="flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-40">
                      <ChevronRight className="size-4" /> السابق
                    </button>
                    {index < questions.length - 1 ? (
                      <button type="button" onClick={() => setIndex((value) => value + 1)} className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground">
                        التالي <ChevronLeft className="size-4" />
                      </button>
                    ) : (
                      <button type="button" onClick={() => submitChoices.mutate(false)} disabled={submitChoices.isPending} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground disabled:opacity-50">
                        {submitChoices.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} سلّم الواجب
                      </button>
                    )}
                  </div>
                </section>
              ) : (
                <section className="glass rounded-2xl p-6 text-center">
                  <h2 className="text-lg font-black">الواجب فيه {questions.length} سؤال</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    المدة {assignment.duration_minutes} دقيقة — التصحيح فوري بعد التسليم.
                  </p>
                  <button
                    onClick={() => { setStarted(true); setIndex(0); setTimeLeft(assignment.duration_minutes ? assignment.duration_minutes * 60 : null); }}
                    disabled={isMaxAttemptsReached}
                    className="mt-4 rounded-xl bg-primary px-6 py-3 font-black text-primary-foreground disabled:opacity-50 disabled:grayscale"
                  >
                    {isMaxAttemptsReached ? "لقد استنفدت جميع محاولاتك لهذا الواجب" : "ابدأ حل الواجب"}
                  </button>
                </section>
              )
            ) : (
              <section className="glass rounded-2xl p-6">
                <h2 className="mb-4 text-lg font-black">تسليم الواجب</h2>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="اكتب إجابتك هنا..."
                  className="min-h-[200px] w-full rounded-xl border border-input bg-surface p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => submitText.mutate()}
                  disabled={submitText.isPending || !content.trim()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {submitText.isPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />} تسليم الواجب
                </button>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <div className="soft-card rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-black">معلومات</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">عدد الأسئلة</span><span className="font-bold">{questions.length || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المحاولات</span><span className="font-bold">{!(assignment as any).max_attempts || Number((assignment as any).max_attempts) === 0 ? "غير محدود" : `${submissionCount} / ${(assignment as any).max_attempts}`}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الدرجة القصوى</span><span className="font-bold">{assignment.max_score}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">درجة النجاح</span><span className="font-bold">{assignment.pass_score}%</span></div>
                {assignment.due_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">موعد التسليم</span>
                    <span className="font-bold text-destructive">{new Date(assignment.due_at).toLocaleDateString("ar-EG")}</span>
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

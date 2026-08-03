import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleCheck, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generateAssessmentQuestions } from "@/lib/assessments.functions";

type Kind = "mcq" | "truefalse" | "essay";
type Draft = { kind: Kind; question: string; options: string[]; correctIndex: number; modelAnswer?: string };

const emptyMcq = (): Draft => ({ kind: "mcq", question: "", options: ["", "", "", ""], correctIndex: 0 });
const emptyTf = (): Draft => ({ kind: "truefalse", question: "", options: ["صح", "خطأ"], correctIndex: 0 });
const emptyEssay = (): Draft => ({ kind: "essay", question: "", options: [], correctIndex: 0, modelAnswer: "" });

type AnyTable = {
  select: (q: string) => AnyTable;
  eq: (c: string, v: string) => AnyTable;
  order: (c: string, o?: { ascending?: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>;
  insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
};
const table = (name: string) => (supabase as unknown as { from: (t: string) => AnyTable }).from(name);

export function AssessmentBuilder({ mode }: { mode: "quiz" | "assignment" }) {
  const queryClient = useQueryClient();
  const generate = useServerFn(generateAssessmentQuestions);
  const parentTable = mode === "quiz" ? "quizzes" : "assignments";
  const questionsTable = mode === "quiz" ? "quiz_questions" : "assignment_questions";
  const parentKey = mode === "quiz" ? "quiz_id" : "assignment_id";
  const parentLabel = mode === "quiz" ? "الاختبار" : "الواجب";

  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [kind, setKind] = useState<"mcq" | "truefalse" | "essay" | "mixed">("mixed");
  const [count, setCount] = useState(5);
  const [extra, setExtra] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([emptyMcq()]);

  const { data: courses = [] } = useQuery({
    queryKey: ["builder-courses"],
    queryFn: async () => {
      const { data, error } = await table("courses").select("id,title").order("title");
      if (error) throw error;
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["builder-lessons", courseId],
    enabled: Boolean(courseId),
    queryFn: async () => {
      const { data, error } = await table("lessons").select("id,title,course_id").eq("course_id", courseId).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["builder-targets", parentTable],
    queryFn: async () => {
      const { data, error } = await table(parentTable).select("id,title,course_id,lesson_id").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; course_id: string | null; lesson_id: string | null }[];
    },
  });

  const visibleTargets = useMemo(
    () => targets.filter((item) => (!courseId || item.course_id === courseId) && (!lessonId || !item.lesson_id || item.lesson_id === lessonId)),
    [targets, courseId, lessonId],
  );

  const ai = useMutation({
    mutationFn: async () => {
      if (!lessonId && extra.trim().length < 20) throw new Error("اختر الدرس أو اكتب موضوع لا يقل عن 20 حرف");
      return generate({ data: { lessonId: lessonId || undefined, extra: extra.trim() || undefined, count, kind } });
    },
    onSuccess: (result) => {
      setDrafts(result.questions.map((item) => ({ kind: item.kind, question: item.question, options: item.options, correctIndex: item.correctIndex, modelAnswer: item.modelAnswer ?? "" })));
      toast.success("تم توليد الأسئلة — راجعها ثم احفظها");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!targetId) throw new Error(`اختر ${parentLabel} أولاً`);
      const valid = drafts.filter((draft) =>
        draft.kind === "essay"
          ? draft.question.trim().length > 0
          : draft.question.trim() && draft.options.length >= 2 && draft.options.every((option) => option.trim()),
      );
      if (valid.length !== drafts.length || !valid.length) throw new Error("اكتب السؤال وكل الاختيارات قبل الحفظ");
      const { error } = await table(questionsTable).insert(
        valid.map((draft, index) => ({
          [parentKey]: targetId,
          question: draft.question.trim(),
          options: draft.kind === "essay" ? [] : draft.options.map((option) => option.trim()),
          correct_index: draft.kind === "essay" ? 0 : draft.correctIndex,
          model_answer: draft.kind === "essay" ? (draft.modelAnswer ?? "").trim() || null : null,
          kind: draft.kind,
          points: 1,
          sort_order: index,
        })),
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم حفظ الأسئلة");
      setDrafts([emptyMcq()]);
      setExtra("");
      await queryClient.invalidateQueries({ queryKey: ["crud", questionsTable] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = (index: number, patch: Partial<Draft>) =>
    setDrafts((current) => current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));

  return (
    <section className="glass space-y-5 rounded-2xl p-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Sparkles className="size-5 text-accent" /> منشئ {parentLabel} بالذكاء الاصطناعي
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          اختر الكورس ثم الدرس (الفيديو) — الذكاء الاصطناعي هيقرأ محتوى الدرس والملفات المرفقة ويولّد أسئلة اختيار من متعدد أو صح وخطأ.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-muted-foreground">١. الكورس</span>
          <select value={courseId} onChange={(event) => { setCourseId(event.target.value); setLessonId(""); }} className="w-full rounded-xl border border-input bg-surface px-3 py-2.5">
            <option value="">— اختر الكورس —</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-muted-foreground">٢. الدرس / الفيديو</span>
          <select value={lessonId} onChange={(event) => setLessonId(event.target.value)} disabled={!courseId} className="w-full rounded-xl border border-input bg-surface px-3 py-2.5 disabled:opacity-50">
            <option value="">— اختر الدرس —</option>
            {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-muted-foreground">٣. {parentLabel} الذي ستُضاف له الأسئلة</span>
          <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="w-full rounded-xl border border-input bg-surface px-3 py-2.5">
            <option value="">— اختر —</option>
            {visibleTargets.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <label className="text-xs font-black text-muted-foreground" htmlFor="builder-extra">محتوى إضافي أو موضوع (اختياري لو اخترت درس)</label>
        <textarea id="builder-extra" value={extra} onChange={(event) => setExtra(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-input bg-background p-3 outline-none" placeholder="مثال: ركّز على المتغيرات والشروط في بايثون…" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold">
            نوع الأسئلة
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="mr-2 rounded-lg border border-input bg-background px-2 py-1.5">
              <option value="mixed">متنوع</option>
              <option value="mcq">اختيار من متعدد</option>
              <option value="truefalse">صح وخطأ</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            عدد الأسئلة
            <input type="number" min={1} max={20} value={count} onChange={(event) => setCount(Math.max(1, Math.min(20, Number(event.target.value))))} className="mr-2 w-16 rounded-lg border border-input bg-background px-2 py-1.5" />
          </label>
          <Button type="button" onClick={() => ai.mutate()} disabled={ai.isPending} className="gap-2">
            {ai.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} ولّد الأسئلة
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {drafts.map((draft, index) => (
          <article key={index} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black">
                السؤال {index + 1}
                <span className="mr-2 rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {draft.kind === "truefalse" ? "صح وخطأ" : "اختيار من متعدد"}
                </span>
              </h3>
              {drafts.length > 1 && (
                <Button type="button" size="icon" variant="ghost" aria-label="حذف السؤال" onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}>
                  <Trash2 className="text-destructive" />
                </Button>
              )}
            </div>
            <textarea value={draft.question} onChange={(event) => update(index, { question: event.target.value })} rows={2} className="mt-3 w-full rounded-xl border border-input bg-surface p-3 outline-none" placeholder="اكتب السؤال…" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {draft.options.map((option, optionIndex) => (
                <label key={optionIndex} className={`flex items-center gap-2 rounded-xl border p-2 ${draft.correctIndex === optionIndex ? "border-success bg-success/10" : "border-border"}`}>
                  <input type="radio" name={`correct-${mode}-${index}`} checked={draft.correctIndex === optionIndex} onChange={() => update(index, { correctIndex: optionIndex })} aria-label={`الإجابة الصحيحة رقم ${optionIndex + 1}`} />
                  <input
                    value={option}
                    readOnly={draft.kind === "truefalse"}
                    onChange={(event) => update(index, { options: draft.options.map((value, i) => (i === optionIndex ? event.target.value : value)) })}
                    className="min-w-0 flex-1 bg-transparent px-1 py-1 outline-none"
                    placeholder={`الاختيار ${optionIndex + 1}`}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><CircleCheck className="size-3" /> علّم الدائرة بجانب الإجابة الصحيحة.</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setDrafts((current) => [...current, emptyMcq()])}><Plus /> سؤال اختيار من متعدد</Button>
        <Button type="button" variant="outline" onClick={() => setDrafts((current) => [...current, emptyTf()])}><Plus /> سؤال صح وخطأ</Button>
        <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : null} حفظ كل الأسئلة
        </Button>
      </div>
    </section>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generatePracticeQuestions } from "@/lib/groq.functions";

type DraftQuestion = { question: string; options: string[]; correctIndex: number };
const emptyQuestion = (): DraftQuestion => ({ question: "", options: ["", "", "", ""], correctIndex: 0 });

export function QuizBuilder() {
  const queryClient = useQueryClient();
  const generate = useServerFn(generatePracticeQuestions);
  const [quizId, setQuizId] = useState("");
  const [source, setSource] = useState("");
  const [count, setCount] = useState(5);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([emptyQuestion()]);
  const { data: quizzes = [] } = useQuery({
    queryKey: ["quiz-builder-quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("id,title").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ai = useMutation({
    mutationFn: async () => {
      if (source.trim().length < 20) throw new Error("اكتب موضوع أو محتوى لا يقل عن 20 حرف");
      return generate({ data: { text: source.trim(), count } });
    },
    onSuccess: (result) => {
      const next = result.questions.map((item) => {
        const options = item.type === "truefalse" ? ["صح", "خطأ"] : (item.choices ?? []).map(String);
        const answer = String(item.answer).trim().toLowerCase();
        const correctIndex = item.type === "truefalse"
          ? (["true", "صح"].includes(answer) ? 0 : 1)
          : Math.max(0, options.findIndex((option) => option.trim().toLowerCase() === answer));
        return { question: item.prompt, options, correctIndex };
      }).filter((item) => item.question && item.options.length >= 2);
      if (!next.length) throw new Error("لم يتم توليد أسئلة صالحة، حاول مرة أخرى");
      setDrafts(next);
      toast.success("تم توليد الأسئلة — راجعها ثم احفظها");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!quizId) throw new Error("اختر الاختبار أولاً");
      const valid = drafts.filter((draft) => draft.question.trim() && draft.options.length >= 2 && draft.options.every((option) => option.trim()));
      if (valid.length !== drafts.length) throw new Error("اكتب السؤال وكل الاختيارات قبل الحفظ");
      const { error } = await supabase.from("quiz_questions").insert(valid.map((draft, index) => ({
        quiz_id: quizId,
        question: draft.question.trim(),
        options: draft.options.map((option) => option.trim()),
        correct_index: draft.correctIndex,
        points: 1,
        sort_order: index,
      })));
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم حفظ الأسئلة داخل الاختبار");
      setDrafts([emptyQuestion()]);
      setSource("");
      await queryClient.invalidateQueries({ queryKey: ["crud", "quiz_questions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateDraft = (index: number, update: Partial<DraftQuestion>) => setDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...update } : draft));

  return <section className="glass space-y-5 rounded-2xl p-5">
    <div><h2 className="flex items-center gap-2 text-xl font-black"><Sparkles className="size-5 text-accent" /> منشئ الاختبار السهل</h2><p className="mt-1 text-sm text-muted-foreground">اختر الاختبار، اكتب الأسئلة بنفسك أو ولّدها بالذكاء الاصطناعي، وحدد الإجابة الصحيحة ثم احفظ.</p></div>
    <label className="block"><span className="mb-1.5 block text-xs font-black text-muted-foreground">الاختبار الذي ستُضاف له الأسئلة</span><select value={quizId} onChange={(event) => setQuizId(event.target.value)} className="w-full rounded-xl border border-input bg-surface px-3 py-2.5"><option value="">— اختر الاختبار —</option>{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}</select></label>
    <div className="rounded-xl border border-border bg-surface p-4"><label className="text-xs font-black text-muted-foreground" htmlFor="quiz-source">موضوع الاختبار أو نص الدرس</label><textarea id="quiz-source" value={source} onChange={(event) => setSource(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-input bg-background p-3 outline-none" placeholder="مثال: أساسيات بايثون — المتغيرات وأنواع البيانات والشروط…" /><div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-xs font-bold">عدد الأسئلة <input type="number" min={3} max={15} value={count} onChange={(event) => setCount(Math.max(3, Math.min(15, Number(event.target.value))))} className="mr-2 w-16 rounded-lg border border-input bg-background px-2 py-1.5" /></label><Button type="button" onClick={() => ai.mutate()} disabled={ai.isPending} className="gap-2">{ai.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />} ولّد الأسئلة بالذكاء الاصطناعي</Button></div></div>
    <div className="space-y-4">{drafts.map((draft, index) => <article key={index} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-black">السؤال {index + 1}</h3>{drafts.length > 1 && <Button type="button" size="icon" variant="ghost" aria-label="حذف السؤال" onClick={() => setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index))}><Trash2 className="text-destructive" /></Button>}</div><textarea value={draft.question} onChange={(event) => updateDraft(index, { question: event.target.value })} rows={2} className="mt-3 w-full rounded-xl border border-input bg-surface p-3 outline-none" placeholder="اكتب السؤال…" /><div className="mt-3 grid gap-2 sm:grid-cols-2">{draft.options.map((option, optionIndex) => <label key={optionIndex} className={`flex items-center gap-2 rounded-xl border p-2 ${draft.correctIndex === optionIndex ? "border-success bg-success/10" : "border-border"}`}><input type="radio" name={`correct-${index}`} checked={draft.correctIndex === optionIndex} onChange={() => updateDraft(index, { correctIndex: optionIndex })} aria-label={`الإجابة الصحيحة رقم ${optionIndex + 1}`} /><input value={option} onChange={(event) => updateDraft(index, { options: draft.options.map((value, valueIndex) => valueIndex === optionIndex ? event.target.value : value) })} className="min-w-0 flex-1 bg-transparent px-1 py-1 outline-none" placeholder={`الاختيار ${optionIndex + 1}`} /></label>)}</div><p className="mt-2 text-[11px] text-muted-foreground">علّم الدائرة بجانب الإجابة الصحيحة.</p></article>)}</div>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setDrafts((current) => [...current, emptyQuestion()])}><Plus /> سؤال جديد</Button><Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Loader2 className="animate-spin" /> : null} حفظ كل الأسئلة</Button></div>
  </section>;
}
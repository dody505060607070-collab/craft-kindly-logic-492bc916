import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { gradeSubmissionWithAnswerKey } from "@/lib/assessments.functions";
import { CrudSection } from "@/components/CrudSection";
import { AssessmentBuilder } from "@/components/AssessmentBuilder";
import { AdminHelp } from "@/components/AdminHelp";
import { SectionHint } from "@/components/SectionHint";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/assignments")({
  head: () => ({
    meta: [
      { title: "الواجبات والتصحيح الذكي | لوحة تحكم المستر" },
      { name: "description", content: "إنشاء واجبات اختيار من متعدد وصح وخطأ بالذكاء الاصطناعي وتصحيح إجابات الطلاب تلقائيًا." },
      { property: "og:title", content: "الواجبات والتصحيح الذكي | منصة المستر" },
      { property: "og:description", content: "واجبات بأسئلة تُولّد من محتوى الدرس وتصحيح فوري." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssignmentsPage,
});

type SubmissionRow = {
  id: string;
  content: string | null;
  grade: number | null;
  feedback: string | null;
  auto_graded: boolean | null;
  assignment_id: string;
  user_id: string;
};

function AiReviewSubmissions() {
  const gradeFn = useServerFn(gradeSubmissionWithAnswerKey);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data = [], refetch } = useQuery({
    queryKey: ["admin-text-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("id, content, grade, feedback, auto_graded, assignment_id, user_id")
        .not("content", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SubmissionRow[];
    },
  });

  const run = async (id: string) => {
    setBusyId(id);
    try {
      const result = await gradeFn({ data: { submissionId: id } });
      toast.success(`تم التصحيح: ${result.score} / ${result.maxScore}${result.usedAnswerKey ? " (بملف الإجابة)" : ""}`);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر التصحيح الآن");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-black">
        <Sparkles className="size-5 text-accent" /> التصحيح الذكي بملف الإجابة
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        الذكاء الاصطناعي بيقرأ ملف/نص الإجابة الصحيحة اللي رفعته مع الواجب، ويقارنه بإجابة الطالب، ويحط الدرجة والملاحظات تلقائيًا.
      </p>
      <SectionHint title="إزاي تستخدمه">
        الأسئلة الاختيارية بتتصحّح لوحدها لحظيًا. الجدول ده للإجابات المكتوبة: اضغط "صحّح بالـ AI" جانب أي تسليم، والدرجة والملاحظات هتتحفظ للطالب فورًا.
      </SectionHint>
      <div className="space-y-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">لا توجد إجابات مكتوبة بعد.</p>}
        {data.map((row) => (
          <article key={row.id} className="rounded-xl border border-border bg-surface p-3">
            <p className="line-clamp-3 text-sm whitespace-pre-wrap">{row.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-card px-2 py-1 font-bold">
                الدرجة: {row.grade ?? "—"}
              </span>
              {row.auto_graded && <span className="rounded-full bg-primary/10 px-2 py-1 font-bold text-primary">صُحّح بالـ AI</span>}
              <Button type="button" size="sm" onClick={() => void run(row.id)} disabled={busyId === row.id} className="gap-2">
                {busyId === row.id ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} صحّح بالـ AI
              </Button>
            </div>
            {row.feedback && <p className="mt-2 text-xs text-muted-foreground">{row.feedback}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function AssignmentsPage() {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">الواجبات والتصحيح الذكي</h1>
          <p className="text-sm text-muted-foreground">واجبات بأسئلة اختيار من متعدد وصح وخطأ — تُولّد من محتوى الدرس وتتصحّح آليًا.</p>
        </div>
        <AdminHelp
          title="شرح صفحة الواجبات"
          intro="اختار الكورس والدرس، جهّز الأسئلة، واضغط إنشاء الواجب وحفظ الأسئلة. مش محتاج تعمل واجب منفصل أو تختاره الأول."
          items={[
            { title: "١. اعمل الواجب", body: "من منشئ الواجب اختار الكورس والدرس (الفيديو)، ولّد الأسئلة بالذكاء الاصطناعي أو اكتبها بإيدك، ثم اضغط إنشاء الواجب وحفظ الأسئلة." },
            { title: "٢. ملف الأسئلة", body: "ارفع ملف الأسئلة لو عندك — الطالب هيقدر يفتحه من صفحة الواجب." },
            { title: "٣. ملف الإجابة الصحيحة", body: "ارفع ملف أو اكتب نص الإجابة الصحيحة. ده سري تمامًا — الطالب مش بيشوفه، والـ AI بيستخدمه في التصحيح." },
            { title: "٤. أسئلة الواجب", body: "اختار الكورس والدرس فقط، ثم حدد نوع وعدد الأسئلة واضغط 'ولّد الأسئلة' أو اكتبها يدويًا. زر الحفظ ينشئ الواجب والأسئلة معًا." },
            { title: "٥. التصحيح", body: "الأسئلة الاختيارية بتتصحّح لحظيًا للطالب. الإجابات المكتوبة تصحّحها بزر 'صحّح بالـ AI'." },
          ]}
        />
      </div>

      <AssessmentBuilder mode="assignment" />

      <div>
        <SectionHint title="١. الواجبات">
          القسم ده اختياري لتعديل واجب اتعمل بالفعل، أو لإنشاء واجب من ملف فقط. إنشاء واجب بأسئلة مكتوبة أو مولّدة بالذكاء الاصطناعي يتم بالكامل من المنشئ الموجود فوق.
        </SectionHint>
        <CrudSection
          table="assignments"
          title="الواجبات"
          selectColumns="id, course_id, title, description, due_at, is_published, created_at, updated_at, instructions, max_score, lesson_id, questions_file_url, duration_minutes, pass_score, max_attempts"
          description="اربط الواجب بالكورس والدرس، وارفع ملف الأسئلة وملف الإجابة."
          fields={[
            { key: "title", label: "عنوان الواجب", required: true },
            { key: "instructions", label: "التعليمات", type: "textarea", hideInTable: true },
            { key: "course_id", label: "الكورس", relation: { table: "courses", label: "title" } },
            { key: "lesson_id", label: "الدرس / الفيديو", relation: { table: "lessons", label: "title" } },
            { key: "due_at", label: "موعد التسليم", type: "datetime" },
            { key: "duration_minutes", label: "المدة (دقيقة)", type: "number", default: 20 },
            { key: "max_attempts", label: "عدد المحاولات (0 = غير محدود)", type: "number", default: 0 },
            { key: "max_score", label: "الدرجة القصوى", type: "number", default: 10 },
            { key: "pass_score", label: "درجة النجاح %", type: "number", default: 50 },
            {
              key: "questions_file_url",
              label: "ملف الأسئلة (يشوفه الطالب)",
              hideInTable: true,
              upload: { bucket: "assessment-files", mode: "storage", prefix: "questions", accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg", label: "ارفع ملف الأسئلة" },
            },
            {
              key: "answer_key_url",
              label: "ملف الإجابة الصحيحة (سري — للـ AI فقط)",
              hideInTable: true,
              upload: { bucket: "assessment-files", mode: "storage", prefix: "answers", accept: ".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg", label: "ارفع ملف الإجابة" },
            },
            { key: "answer_key_text", label: "نص الإجابة النموذجية (للـ AI)", type: "textarea", hideInTable: true },
            { key: "is_published", label: "منشور", type: "bool", default: true },
          ]}
        />
      </div>

      <AiReviewSubmissions />

      <div>
        <SectionHint title="٢. أسئلة الواجبات (متقدم)">
          استخدم الجدول ده فقط لتعديل سؤال قديم. "نوع السؤال" = mcq (اختيار من متعدد) أو truefalse (صح وخطأ).
        </SectionHint>
        <CrudSection
          table="assignment_questions"
          title="أسئلة الواجبات"
          description="عدّل نص السؤال والاختيارات والإجابة الصحيحة."
          orderBy="sort_order"
          ascending
          fields={[
            { key: "assignment_id", label: "الواجب", required: true, relation: { table: "assignments", label: "title" } },
            { key: "question", label: "نص السؤال", type: "textarea", required: true },
            {
              key: "kind",
              label: "نوع السؤال",
              type: "select",
              default: "mcq",
              options: [
                { value: "mcq", label: "اختيار من متعدد" },
                { value: "truefalse", label: "صح وخطأ" },
              ],
            },
            { key: "options", label: 'الاختيارات (JSON مثل ["أ","ب"])', type: "textarea", hideInTable: true },
            { key: "correct_index", label: "رقم الاختيار الصحيح (يبدأ من 0)", type: "number", default: 0 },
            { key: "points", label: "الدرجة", type: "number", default: 1 },
            { key: "sort_order", label: "الترتيب", type: "number", default: 0 },
          ]}
        />
      </div>

      <div>
        <SectionHint title="٣. تسليمات الطلاب">
          كل تسليمات الطلاب: بتشوف الإجابة والدرجة (لو الواجب اختيارات بتكون متصحّحة تلقائيًا) وتقدر تعدّل الدرجة أو تكتب ملاحظات للطالب.
        </SectionHint>
        <CrudSection
          table="assignment_submissions"
          title="تسليمات الطلاب"
          description="راجع التسليمات وضع الدرجة والملاحظات."
          allowCreate={false}
          fields={[
            { key: "assignment_id", label: "الواجب", relation: { table: "assignments", label: "title" } },
            { key: "user_id", label: "معرّف الطالب" },
            { key: "content", label: "الإجابة المكتوبة", type: "textarea", hideInTable: true },
            { key: "grade", label: "الدرجة", type: "number" },
            { key: "max_score", label: "من", type: "number" },
            { key: "feedback", label: "الملاحظات", type: "textarea", hideInTable: true },
          ]}
        />
      </div>
    </div>
  );
}
